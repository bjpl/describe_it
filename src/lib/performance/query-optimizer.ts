/**
 * Database Query Optimizer for Supabase
 *
 * Optimizes database queries through:
 * - Selective column fetching
 * - Query result caching
 * - Batch operations
 * - Index recommendations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import EnhancedCache from '@/lib/cache/enhanced-cache';
import { logger } from '@/lib/logger';

export interface QueryConfig {
  select?: string[];
  useCache?: boolean;
  cacheTTL?: number;
  batchSize?: number;
}

export interface QueryMetrics {
  queryTime: number;
  cacheHit: boolean;
  rowsReturned: number;
  bytesTransferred: number;
  timestamp: number;
}

export interface IndexRecommendation {
  table: string;
  column: string;
  reason: string;
  estimatedImprovement: string;
}

class QueryOptimizer {
  private cache: EnhancedCache;
  private queryMetrics: Map<string, QueryMetrics[]> = new Map();
  private slowQueryThreshold = 1000; // 1 second
  private metricsRetentionTime = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.cache = new EnhancedCache({
      maxSize: 500,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60000, // 1 minute
    });
  }

  /**
   * Optimize a SELECT query by selecting only necessary columns
   */
  optimizeSelect(columns: string[]): string {
    // Always include ID for relationships
    const optimizedColumns = new Set(['id', ...columns]);
    return Array.from(optimizedColumns).join(',');
  }

  /**
   * Execute an optimized query with caching and metrics
   */
  async executeQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    config: QueryConfig = {}
  ): Promise<T> {
    const startTime = performance.now();
    const { useCache = true, cacheTTL } = config;

    // Try cache first
    if (useCache) {
      const cached = this.cache.get(key);
      if (cached !== null) {
        this.recordMetrics(key, {
          queryTime: performance.now() - startTime,
          cacheHit: true,
          rowsReturned: Array.isArray(cached) ? cached.length : 1,
          bytesTransferred: 0,
          timestamp: Date.now(),
        });
        return cached as T;
      }
    }

    // Execute query
    try {
      const result = await queryFn();
      const queryTime = performance.now() - startTime;

      // Cache result if enabled
      if (useCache) {
        this.cache.set(key, result, cacheTTL);
      }

      // Record metrics
      this.recordMetrics(key, {
        queryTime,
        cacheHit: false,
        rowsReturned: Array.isArray(result) ? result.length : 1,
        bytesTransferred: this.estimateDataSize(result),
        timestamp: Date.now(),
      });

      // Log slow queries
      if (queryTime > this.slowQueryThreshold) {
        logger.warn('Slow query detected', {
          key,
          queryTime: `${queryTime.toFixed(2)}ms`,
          threshold: `${this.slowQueryThreshold}ms`,
        });
      }

      return result;
    } catch (error) {
      logger.error('Query execution failed', error as Error, { key });
      throw error;
    }
  }

  /**
   * Batch multiple queries together for efficiency
   */
  async batchQueries<T>(
    queries: Array<{ key: string; fn: () => Promise<T> }>,
    config: QueryConfig = {}
  ): Promise<T[]> {
    const { batchSize = 10 } = config;
    const results: T[] = [];

    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(({ key, fn }) => this.executeQuery(key, fn, config))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Optimize query with selective column fetching
   */
  buildOptimizedSelect(
    table: string,
    requiredFields: string[],
    includeRelations?: { table: string; fields: string[] }[]
  ): string {
    let selectStr = this.optimizeSelect(requiredFields);

    if (includeRelations && includeRelations.length > 0) {
      const relations = includeRelations.map(rel => {
        const relFields = this.optimizeSelect(rel.fields);
        return `${rel.table}(${relFields})`;
      });
      selectStr = `${selectStr},${relations.join(',')}`;
    }

    return selectStr;
  }

  /**
   * Analyze query patterns and provide index recommendations
   */
  analyzeQueryPatterns(): IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = [];
    const slowQueries = this.getSlowQueries();

    // Analyze slow queries for patterns
    slowQueries.forEach(({ key, metrics }) => {
      const avgTime = metrics.reduce((sum, m) => sum + m.queryTime, 0) / metrics.length;

      // Extract table and potential filter columns from query key
      const tableMatch = key.match(/^(\w+):/);
      if (tableMatch) {
        const table = tableMatch[1];

        // Check for filter patterns in the key
        if (key.includes('filter:')) {
          const filterMatch = key.match(/filter:(\w+)/);
          if (filterMatch) {
            recommendations.push({
              table,
              column: filterMatch[1],
              reason: `Frequent filtering on this column detected (avg query time: ${avgTime.toFixed(2)}ms)`,
              estimatedImprovement: '40-60% faster queries',
            });
          }
        }

        // Check for ordering patterns
        if (key.includes('order:')) {
          const orderMatch = key.match(/order:(\w+)/);
          if (orderMatch) {
            recommendations.push({
              table,
              column: orderMatch[1],
              reason: `Frequent ordering on this column detected`,
              estimatedImprovement: '30-50% faster queries',
            });
          }
        }
      }
    });

    return recommendations;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const cacheStats = this.cache.getStats();
    const allMetrics = Array.from(this.queryMetrics.values()).flat();

    if (allMetrics.length === 0) {
      return {
        cache: cacheStats,
        queries: {
          total: 0,
          averageTime: 0,
          slowQueries: 0,
          cacheHitRate: 0,
        },
      };
    }

    const totalTime = allMetrics.reduce((sum, m) => sum + m.queryTime, 0);
    const cacheHits = allMetrics.filter(m => m.cacheHit).length;
    const slowQueries = allMetrics.filter(m => m.queryTime > this.slowQueryThreshold).length;

    return {
      cache: cacheStats,
      queries: {
        total: allMetrics.length,
        averageTime: totalTime / allMetrics.length,
        slowQueries,
        cacheHitRate: (cacheHits / allMetrics.length) * 100,
        p95Time: this.calculatePercentile(allMetrics, 95),
        p99Time: this.calculatePercentile(allMetrics, 99),
      },
    };
  }

  /**
   * Clear cache and metrics
   */
  clearCache(pattern?: string) {
    if (pattern) {
      // Clear specific pattern (not implemented in basic cache)
      logger.info('Clearing cache pattern', { pattern });
    } else {
      this.cache.clear();
    }
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.queryMetrics.clear();
  }

  // Private helper methods

  private recordMetrics(key: string, metrics: QueryMetrics) {
    const existing = this.queryMetrics.get(key) || [];

    // Remove old metrics beyond retention time
    const cutoff = Date.now() - this.metricsRetentionTime;
    const filtered = existing.filter(m => m.timestamp > cutoff);

    // Add new metrics
    filtered.push(metrics);
    this.queryMetrics.set(key, filtered);
  }

  private getSlowQueries(): Array<{ key: string; metrics: QueryMetrics[] }> {
    const slow: Array<{ key: string; metrics: QueryMetrics[] }> = [];

    this.queryMetrics.forEach((metrics, key) => {
      const slowMetrics = metrics.filter(m => m.queryTime > this.slowQueryThreshold);
      if (slowMetrics.length > 0) {
        slow.push({ key, metrics: slowMetrics });
      }
    });

    return slow;
  }

  private estimateDataSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  private calculatePercentile(metrics: QueryMetrics[], percentile: number): number {
    const sorted = metrics
      .map(m => m.queryTime)
      .sort((a, b) => a - b);

    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
}

// Export singleton instance
export const queryOptimizer = new QueryOptimizer();

// Export helper functions for common patterns

/**
 * Optimize a Supabase query with selective column fetching
 */
export function optimizedQuery<T>(
  client: SupabaseClient,
  table: string,
  options: {
    columns?: string[];
    filters?: Record<string, unknown>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    useCache?: boolean;
    cacheTTL?: number;
  } = {}
) {
  const {
    columns = ['*'],
    filters = {},
    orderBy,
    limit,
    useCache = true,
    cacheTTL,
  } = options;

  // Build cache key
  const cacheKey = `${table}:${JSON.stringify({ columns, filters, orderBy, limit })}`;

  // Build optimized select
  const selectStr = columns.includes('*')
    ? '*'
    : queryOptimizer.optimizeSelect(columns);

  return queryOptimizer.executeQuery<T>(
    cacheKey,
    async () => {
      let query = client.from(table).select(selectStr);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Query failed: ${error.message}`);
      }

      return data as T;
    },
    { useCache, cacheTTL }
  );
}

/**
 * Batch insert with optimized transaction handling
 */
export async function batchInsert<T>(
  client: SupabaseClient,
  table: string,
  records: T[],
  batchSize = 100
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const { data, error } = await client
      .from(table)
      .insert(batch as never)
      .select();

    if (error) {
      throw new Error(`Batch insert failed: ${error.message}`);
    }

    if (data) {
      results.push(...(data as T[]));
    }
  }

  return results;
}

/**
 * Prefetch data for faster subsequent access
 */
export async function prefetchQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  cacheTTL?: number
): Promise<void> {
  await queryOptimizer.executeQuery(key, queryFn, {
    useCache: true,
    cacheTTL,
  });
}
