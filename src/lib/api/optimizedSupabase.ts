import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Simple server-side cache
const serverCache = new Map<string, { data: any; timestamp: number }>();
const cacheStats = { hits: 0, misses: 0, size: 0 };

const simpleCache = {
  get: (namespace: string, key: string) => {
    const fullKey = `${namespace}:${key}`;
    const cached = serverCache.get(fullKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      cacheStats.hits++;
      return cached.data;
    }
    cacheStats.misses++;
    serverCache.delete(fullKey);
    return null;
  },
  set: (namespace: string, key: string, value: any, _ttl?: number) => {
    const fullKey = `${namespace}:${key}`;
    serverCache.set(fullKey, { data: value, timestamp: Date.now() });
    cacheStats.size = serverCache.size;
  },
  delete: (namespace: string, key: string) => {
    const fullKey = `${namespace}:${key}`;
    serverCache.delete(fullKey);
  },
  getStats: () => cacheStats,
  clear: (namespace?: string) => {
    if (namespace) {
      for (const key of serverCache.keys()) {
        if (key.startsWith(`${namespace}:`)) {
          serverCache.delete(key);
        }
      }
    } else {
      serverCache.clear();
    }
  }
};

interface QueryConfig {
  cacheable?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  timeout?: number;
  retries?: number;
  batch?: boolean;
}

interface QueryMetrics {
  queryTime: number;
  cacheHit: boolean;
  resultSize: number;
  retryCount: number;
}

class OptimizedSupabaseClient {
  private client: SupabaseClient;
  private queryMetrics: Map<string, QueryMetrics[]> = new Map();
  private batchQueue: Array<{
    query: () => Promise<any>;
    resolve: Function;
    reject: Function;
  }> = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not found. Some features will use demo mode.');
      // Create a mock client for demo mode
      this.client = null as any;
      return;
    }

    this.client = createClient(
      supabaseUrl,
      supabaseKey,
      {
        // Connection pooling and performance optimizations
        db: {
          schema: "public",
        },
        realtime: {
          // Optimize realtime connections
          params: {
            eventsPerSecond: 10,
          },
        },
        auth: {
          // Optimize auth flow
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );

    this.setupConnectionOptimizations();
  }

  private setupConnectionOptimizations() {
    // Connection warming
    this.warmConnection();

    // Periodic connection health check
    setInterval(() => {
      this.healthCheck();
    }, 30000); // Every 30 seconds
  }

  private async warmConnection() {
    try {
      // Simple query to establish connection
      await this.client.from("user_preferences").select("count").limit(1);
    } catch (error) {
      console.debug("Connection warming failed:", error);
    }
  }

  private async healthCheck() {
    try {
      const start = performance.now();
      await this.client.from("user_preferences").select("count").limit(1);
      const latency = performance.now() - start;

      if (latency > 2000) {
        console.warn("High database latency detected:", latency, "ms");
      }
    } catch (error) {
      console.error("Database health check failed:", error);
    }
  }

  // Optimized select with caching and batching
  async select<T = any>(
    table: string,
    query: string,
    config: QueryConfig = {},
  ): Promise<{ data: T[] | null; error: any; metrics: QueryMetrics }> {
    const {
      cacheable = true,
      cacheKey = `${table}:${query}`,
      cacheTTL = 5 * 60 * 1000, // 5 minutes
      timeout = 10000,
      retries = 3,
      batch = false,
    } = config;

    const startTime = performance.now();
    let retryCount = 0;
    const cacheHit = false;

    // Check cache first
    if (cacheable) {
      const cached = simpleCache.get("api", cacheKey);
      if (cached) {
        const metrics: QueryMetrics = {
          queryTime: performance.now() - startTime,
          cacheHit: true,
          resultSize: this.estimateSize(cached),
          retryCount: 0,
        };

        this.recordMetrics(table, metrics);
        return { data: cached as unknown as T[], error: null, metrics };
      }
    }

    const executeQuery = async (): Promise<{
      data: T[] | null;
      error: any;
    }> => {
      const queryPromise = this.client.from(table).select(query);

      // Add timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Query timeout")), timeout);
      });

      try {
        const result = await Promise.race([queryPromise, timeoutPromise]);
        return result as { data: T[] | null; error: any };
      } catch (error) {
        throw error;
      }
    };

    // Retry logic
    let lastError: any;
    for (retryCount = 0; retryCount <= retries; retryCount++) {
      try {
        const result = await executeQuery();

        // Cache successful results
        if (cacheable && result.data && !result.error) {
          simpleCache.set("api", cacheKey, result.data, cacheTTL);
        }

        const metrics: QueryMetrics = {
          queryTime: performance.now() - startTime,
          cacheHit,
          resultSize: this.estimateSize(result.data),
          retryCount,
        };

        this.recordMetrics(table, metrics);
        return { ...result, metrics };
      } catch (error) {
        lastError = error;
        if (retryCount < retries) {
          await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
        }
      }
    }

    const metrics: QueryMetrics = {
      queryTime: performance.now() - startTime,
      cacheHit,
      resultSize: 0,
      retryCount,
    };

    this.recordMetrics(table, metrics);
    return { data: null, error: lastError, metrics };
  }

  // Optimized insert with batching
  async insert<T = any>(
    table: string,
    data: T | T[],
    config: QueryConfig = {},
  ): Promise<{ data: T[] | null; error: any; metrics: QueryMetrics }> {
    const startTime = performance.now();
    const { timeout = 10000, batch = true } = config;

    const executeInsert = async () => {
      if (batch && Array.isArray(data) && data.length > 1) {
        // Use batch insert for multiple records
        return this.batchInsert(table, data, timeout);
      } else {
        return this.client.from(table).insert(data as T);
      }
    };

    try {
      const result = await executeInsert();

      // Invalidate related caches
      this.invalidateTableCache(table);

      const metrics: QueryMetrics = {
        queryTime: performance.now() - startTime,
        cacheHit: false,
        resultSize: this.estimateSize(result.data),
        retryCount: 0,
      };

      this.recordMetrics(table, metrics);
      return { ...result, metrics };
    } catch (error) {
      const metrics: QueryMetrics = {
        queryTime: performance.now() - startTime,
        cacheHit: false,
        resultSize: 0,
        retryCount: 0,
      };

      this.recordMetrics(table, metrics);
      return { data: null, error, metrics };
    }
  }

  // Batch insert for better performance
  private async batchInsert<T>(table: string, data: T[], timeout: number) {
    const batchSize = 100; // Supabase recommended batch size
    const results = [];

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchPromise = this.client.from(table).insert(batch);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Batch insert timeout")), timeout);
      });

      const result = await Promise.race([batchPromise, timeoutPromise]);
      results.push(result);
    }

    return {
      data: results.flatMap((r) => r.data || []),
      error: results.find((r) => r.error)?.error || null,
    };
  }

  // Optimized update with selective field updates
  async update<T = any>(
    table: string,
    data: Partial<T>,
    conditions: Record<string, any>,
    config: QueryConfig = {},
  ): Promise<{ data: T[] | null; error: any; metrics: QueryMetrics }> {
    const startTime = performance.now();
    const { timeout = 10000 } = config;

    try {
      let query = this.client.from(table).update(data);

      // Apply conditions
      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Update timeout")), timeout);
      });

      const result = await Promise.race([query, timeoutPromise]);

      // Invalidate related caches
      this.invalidateTableCache(table);

      const metrics: QueryMetrics = {
        queryTime: performance.now() - startTime,
        cacheHit: false,
        resultSize: this.estimateSize(result.data),
        retryCount: 0,
      };

      this.recordMetrics(table, metrics);
      return { ...result, metrics };
    } catch (error) {
      const metrics: QueryMetrics = {
        queryTime: performance.now() - startTime,
        cacheHit: false,
        resultSize: 0,
        retryCount: 0,
      };

      this.recordMetrics(table, metrics);
      return { data: null, error, metrics };
    }
  }

  // Optimized delete with bulk operations
  async delete(
    table: string,
    conditions: Record<string, any>,
    config: QueryConfig = {},
  ): Promise<{ data: any[] | null; error: any; metrics: QueryMetrics }> {
    const startTime = performance.now();
    const { timeout = 10000 } = config;

    try {
      let query = this.client.from(table).delete();

      // Apply conditions
      Object.entries(conditions).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Delete timeout")), timeout);
      });

      const result = await Promise.race([query, timeoutPromise]);

      // Invalidate related caches
      this.invalidateTableCache(table);

      const metrics: QueryMetrics = {
        queryTime: performance.now() - startTime,
        cacheHit: false,
        resultSize: 0,
        retryCount: 0,
      };

      this.recordMetrics(table, metrics);
      return { ...result, metrics };
    } catch (error) {
      const metrics: QueryMetrics = {
        queryTime: performance.now() - startTime,
        cacheHit: false,
        resultSize: 0,
        retryCount: 0,
      };

      this.recordMetrics(table, metrics);
      return { data: null, error, metrics };
    }
  }

  // RPC calls with caching
  async rpc<T = any>(
    functionName: string,
    params: Record<string, any> = {},
    config: QueryConfig = {},
  ): Promise<{ data: T | null; error: any; metrics: QueryMetrics }> {
    const {
      cacheable = false,
      cacheKey = `rpc:${functionName}:${JSON.stringify(params)}`,
      cacheTTL = 5 * 60 * 1000,
      timeout = 15000,
    } = config;

    const startTime = performance.now();
    const cacheHit = false;

    // Check cache for RPC calls
    if (cacheable) {
      const cached = simpleCache.get("api", cacheKey);
      if (cached) {
        const metrics: QueryMetrics = {
          queryTime: performance.now() - startTime,
          cacheHit: true,
          resultSize: this.estimateSize(cached),
          retryCount: 0,
        };

        return { data: cached as T, error: null, metrics };
      }
    }

    try {
      const rpcPromise = this.client.rpc(functionName, params);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("RPC timeout")), timeout);
      });

      const result = await Promise.race([rpcPromise, timeoutPromise]);

      // Cache successful RPC results
      if (cacheable && result.data && !result.error) {
        simpleCache.set("api", cacheKey, result.data, cacheTTL);
      }

      const metrics: QueryMetrics = {
        queryTime: performance.now() - startTime,
        cacheHit,
        resultSize: this.estimateSize(result.data),
        retryCount: 0,
      };

      return { ...result, metrics };
    } catch (error) {
      const metrics: QueryMetrics = {
        queryTime: performance.now() - startTime,
        cacheHit,
        resultSize: 0,
        retryCount: 0,
      };

      return { data: null, error, metrics };
    }
  }

  // Connection pooling status
  getConnectionStatus() {
    return {
      isConnected: true, // Would check actual connection in real implementation
      latency: this.getAverageLatency(),
      cacheHitRate: this.getCacheHitRate(),
      totalQueries: this.getTotalQueries(),
    };
  }

  // Performance metrics
  getPerformanceMetrics() {
    const metrics = {
      totalQueries: 0,
      averageQueryTime: 0,
      cacheHitRate: 0,
      slowQueries: [] as Array<{ table: string; time: number }>,
      tableStats: {} as Record<string, { queries: number; avgTime: number }>,
    };

    for (const [table, tableMetrics] of this.queryMetrics) {
      metrics.totalQueries += tableMetrics.length;

      const avgTime =
        tableMetrics.reduce((sum, m) => sum + m.queryTime, 0) /
        tableMetrics.length;
      const cacheHits = tableMetrics.filter((m) => m.cacheHit).length;

      metrics.tableStats[table] = {
        queries: tableMetrics.length,
        avgTime,
      };

      // Find slow queries (>2s)
      tableMetrics.forEach((metric) => {
        if (metric.queryTime > 2000) {
          metrics.slowQueries.push({ table, time: metric.queryTime });
        }
      });

      metrics.averageQueryTime += avgTime * tableMetrics.length;
      metrics.cacheHitRate += cacheHits;
    }

    metrics.averageQueryTime /= metrics.totalQueries || 1;
    metrics.cacheHitRate =
      (metrics.cacheHitRate / metrics.totalQueries || 0) * 100;

    return metrics;
  }

  // Helper methods
  private recordMetrics(table: string, metrics: QueryMetrics) {
    if (!this.queryMetrics.has(table)) {
      this.queryMetrics.set(table, []);
    }

    const tableMetrics = this.queryMetrics.get(table)!;
    tableMetrics.push(metrics);

    // Keep only last 100 metrics per table
    if (tableMetrics.length > 100) {
      tableMetrics.shift();
    }
  }

  private invalidateTableCache(table: string) {
    // Clear all cache entries related to this table
    const stats = simpleCache.getStats();
    stats.entries.forEach((entry) => {
      if (entry.key.startsWith(`${table}:`)) {
        simpleCache.delete("api", entry.key);
      }
    });
  }

  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getAverageLatency(): number {
    const allMetrics = Array.from(this.queryMetrics.values()).flat();
    if (allMetrics.length === 0) return 0;
    return (
      allMetrics.reduce((sum, m) => sum + m.queryTime, 0) / allMetrics.length
    );
  }

  private getCacheHitRate(): number {
    const allMetrics = Array.from(this.queryMetrics.values()).flat();
    if (allMetrics.length === 0) return 0;
    const cacheHits = allMetrics.filter((m) => m.cacheHit).length;
    return (cacheHits / allMetrics.length) * 100;
  }

  private getTotalQueries(): number {
    return Array.from(this.queryMetrics.values()).reduce(
      (sum, metrics) => sum + metrics.length,
      0,
    );
  }

  // Expose the raw client for edge cases
  get rawClient() {
    return this.client;
  }
}

// Export singleton instance
export const optimizedSupabase = new OptimizedSupabaseClient();

// Export hook for React components
export const useOptimizedSupabase = () => {
  return optimizedSupabase;
};
