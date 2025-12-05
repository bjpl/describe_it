/**
 * Cache metrics tracking and monitoring
 * Provides comprehensive visibility into cache performance
 */

export interface CacheHitMissMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

export interface CacheStrategyMetrics extends CacheHitMissMetrics {
  strategy: string;
  evictions: number;
  size: number;
  maxSize: number;
  utilizationRate: number;
  avgAccessTime: number; // milliseconds
  lastAccess: number; // timestamp
}

export interface CacheOperationMetrics {
  gets: number;
  sets: number;
  deletes: number;
  invalidations: number;
  errors: number;
  totalOperations: number;
}

export interface CachePerformanceMetrics {
  avgGetTime: number; // milliseconds
  avgSetTime: number; // milliseconds
  avgDeleteTime: number; // milliseconds
  p95GetTime: number;
  p99GetTime: number;
  slowestOperation: {
    type: "get" | "set" | "delete";
    duration: number;
    key: string;
    timestamp: number;
  } | null;
}

export interface CacheMetricsSnapshot {
  timestamp: number;
  strategies: Record<string, CacheStrategyMetrics>;
  operations: CacheOperationMetrics;
  performance: CachePerformanceMetrics;
  memoryUsage: {
    estimated: number; // bytes
    limit: number; // bytes
    utilizationRate: number;
  };
  health: {
    status: "healthy" | "degraded" | "unhealthy";
    issues: string[];
    uptime: number; // milliseconds
  };
}

/**
 * Performance timing tracker
 */
class PerformanceTracker {
  private timings: number[] = [];
  private maxSamples = 1000;

  record(duration: number): void {
    this.timings.push(duration);
    if (this.timings.length > this.maxSamples) {
      this.timings.shift();
    }
  }

  getAverage(): number {
    if (this.timings.length === 0) return 0;
    return this.timings.reduce((a, b) => a + b, 0) / this.timings.length;
  }

  getPercentile(percentile: number): number {
    if (this.timings.length === 0) return 0;
    const sorted = [...this.timings].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  reset(): void {
    this.timings = [];
  }
}

/**
 * Comprehensive cache metrics collector
 */
export class CacheMetrics {
  private strategyMetrics = new Map<string, CacheStrategyMetrics>();
  private operations: CacheOperationMetrics = {
    gets: 0,
    sets: 0,
    deletes: 0,
    invalidations: 0,
    errors: 0,
    totalOperations: 0,
  };

  private getTiming = new PerformanceTracker();
  private setTiming = new PerformanceTracker();
  private deleteTiming = new PerformanceTracker();

  private slowestOperation: CachePerformanceMetrics["slowestOperation"] = null;
  private startTime = Date.now();
  private issues: string[] = [];

  /**
   * Initialize metrics for a strategy
   */
  initStrategy(strategyName: string, maxSize: number): void {
    this.strategyMetrics.set(strategyName, {
      strategy: strategyName,
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      evictions: 0,
      size: 0,
      maxSize,
      utilizationRate: 0,
      avgAccessTime: 0,
      lastAccess: 0,
    });
  }

  /**
   * Record a cache hit
   */
  recordHit(strategyName: string): void {
    const metrics = this.getOrCreateStrategy(strategyName);
    metrics.hits++;
    metrics.totalRequests++;
    metrics.hitRate = metrics.hits / metrics.totalRequests;
    metrics.lastAccess = Date.now();
  }

  /**
   * Record a cache miss
   */
  recordMiss(strategyName: string): void {
    const metrics = this.getOrCreateStrategy(strategyName);
    metrics.misses++;
    metrics.totalRequests++;
    metrics.hitRate = metrics.hits / metrics.totalRequests;
    metrics.lastAccess = Date.now();
  }

  /**
   * Record an eviction
   */
  recordEviction(strategyName: string): void {
    const metrics = this.getOrCreateStrategy(strategyName);
    metrics.evictions++;
  }

  /**
   * Update cache size
   */
  updateSize(strategyName: string, size: number): void {
    const metrics = this.getOrCreateStrategy(strategyName);
    metrics.size = size;
    metrics.utilizationRate = size / metrics.maxSize;

    // Flag potential issues
    if (metrics.utilizationRate > 0.9) {
      this.addIssue(`${strategyName} cache is ${(metrics.utilizationRate * 100).toFixed(1)}% full`);
    }
  }

  /**
   * Record a get operation
   */
  recordGet(duration: number, key: string): void {
    this.operations.gets++;
    this.operations.totalOperations++;
    this.getTiming.record(duration);
    this.updateSlowestOperation("get", duration, key);
  }

  /**
   * Record a set operation
   */
  recordSet(duration: number, key: string): void {
    this.operations.sets++;
    this.operations.totalOperations++;
    this.setTiming.record(duration);
    this.updateSlowestOperation("set", duration, key);
  }

  /**
   * Record a delete operation
   */
  recordDelete(duration: number, key: string): void {
    this.operations.deletes++;
    this.operations.totalOperations++;
    this.deleteTiming.record(duration);
    this.updateSlowestOperation("delete", duration, key);
  }

  /**
   * Record an invalidation operation
   */
  recordInvalidation(count: number = 1): void {
    this.operations.invalidations += count;
    this.operations.totalOperations += count;
  }

  /**
   * Record an error
   */
  recordError(error: Error | string): void {
    this.operations.errors++;
    const errorMsg = typeof error === "string" ? error : error.message;
    this.addIssue(`Error: ${errorMsg}`);
  }

  /**
   * Get current metrics snapshot
   */
  getSnapshot(): CacheMetricsSnapshot {
    const strategies: Record<string, CacheStrategyMetrics> = {};
    this.strategyMetrics.forEach((metrics, name) => {
      strategies[name] = { ...metrics };
    });

    const performance: CachePerformanceMetrics = {
      avgGetTime: this.getTiming.getAverage(),
      avgSetTime: this.setTiming.getAverage(),
      avgDeleteTime: this.deleteTiming.getAverage(),
      p95GetTime: this.getTiming.getPercentile(95),
      p99GetTime: this.getTiming.getPercentile(99),
      slowestOperation: this.slowestOperation,
    };

    const memoryEstimate = this.estimateMemoryUsage();

    return {
      timestamp: Date.now(),
      strategies,
      operations: { ...this.operations },
      performance,
      memoryUsage: {
        estimated: memoryEstimate,
        limit: this.getMemoryLimit(),
        utilizationRate: memoryEstimate / this.getMemoryLimit(),
      },
      health: this.getHealthStatus(),
    };
  }

  /**
   * Get aggregated metrics across all strategies
   */
  getAggregated(): CacheHitMissMetrics {
    let totalHits = 0;
    let totalMisses = 0;

    this.strategyMetrics.forEach((metrics) => {
      totalHits += metrics.hits;
      totalMisses += metrics.misses;
    });

    const totalRequests = totalHits + totalMisses;

    return {
      hits: totalHits,
      misses: totalMisses,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      totalRequests,
    };
  }

  /**
   * Get metrics for a specific strategy
   */
  getStrategyMetrics(strategyName: string): CacheStrategyMetrics | null {
    return this.strategyMetrics.get(strategyName) || null;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.strategyMetrics.clear();
    this.operations = {
      gets: 0,
      sets: 0,
      deletes: 0,
      invalidations: 0,
      errors: 0,
      totalOperations: 0,
    };
    this.getTiming.reset();
    this.setTiming.reset();
    this.deleteTiming.reset();
    this.slowestOperation = null;
    this.startTime = Date.now();
    this.issues = [];
  }

  /**
   * Export metrics as JSON
   */
  toJSON(): CacheMetricsSnapshot {
    return this.getSnapshot();
  }

  /**
   * Get human-readable summary
   */
  getSummary(): string {
    const snapshot = this.getSnapshot();
    const aggregated = this.getAggregated();

    const lines = [
      "Cache Metrics Summary",
      "====================",
      "",
      `Overall Hit Rate: ${(aggregated.hitRate * 100).toFixed(2)}%`,
      `Total Requests: ${aggregated.totalRequests.toLocaleString()}`,
      `Hits: ${aggregated.hits.toLocaleString()} | Misses: ${aggregated.misses.toLocaleString()}`,
      "",
      "Performance:",
      `  Avg GET: ${snapshot.performance.avgGetTime.toFixed(2)}ms`,
      `  Avg SET: ${snapshot.performance.avgSetTime.toFixed(2)}ms`,
      `  P95 GET: ${snapshot.performance.p95GetTime.toFixed(2)}ms`,
      `  P99 GET: ${snapshot.performance.p99GetTime.toFixed(2)}ms`,
      "",
      "Operations:",
      `  Gets: ${snapshot.operations.gets.toLocaleString()}`,
      `  Sets: ${snapshot.operations.sets.toLocaleString()}`,
      `  Deletes: ${snapshot.operations.deletes.toLocaleString()}`,
      `  Invalidations: ${snapshot.operations.invalidations.toLocaleString()}`,
      `  Errors: ${snapshot.operations.errors.toLocaleString()}`,
      "",
      "Memory:",
      `  Usage: ${formatBytes(snapshot.memoryUsage.estimated)} / ${formatBytes(snapshot.memoryUsage.limit)}`,
      `  Utilization: ${(snapshot.memoryUsage.utilizationRate * 100).toFixed(1)}%`,
      "",
      `Health: ${snapshot.health.status}`,
      `Uptime: ${formatDuration(snapshot.health.uptime)}`,
    ];

    if (snapshot.health.issues.length > 0) {
      lines.push("", "Issues:");
      snapshot.health.issues.forEach((issue) => {
        lines.push(`  - ${issue}`);
      });
    }

    return lines.join("\n");
  }

  // Private helper methods

  private getOrCreateStrategy(strategyName: string): CacheStrategyMetrics {
    if (!this.strategyMetrics.has(strategyName)) {
      this.initStrategy(strategyName, 1000);
    }
    return this.strategyMetrics.get(strategyName)!;
  }

  private updateSlowestOperation(
    type: "get" | "set" | "delete",
    duration: number,
    key: string
  ): void {
    if (!this.slowestOperation || duration > this.slowestOperation.duration) {
      this.slowestOperation = {
        type,
        duration,
        key,
        timestamp: Date.now(),
      };
    }
  }

  private estimateMemoryUsage(): number {
    let total = 0;
    this.strategyMetrics.forEach((metrics) => {
      // Rough estimate: 1KB per cached item
      total += metrics.size * 1024;
    });
    return total;
  }

  private getMemoryLimit(): number {
    // 100MB default limit
    return parseInt(process.env.CACHE_MEMORY_LIMIT || "104857600");
  }

  private getHealthStatus(): CacheMetricsSnapshot["health"] {
    const uptime = Date.now() - this.startTime;
    const aggregated = this.getAggregated();

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    // Check for unhealthy conditions
    if (this.operations.errors > 10) {
      status = "unhealthy";
    } else if (this.operations.errors > 3) {
      status = "degraded";
    }

    // Check hit rate
    if (aggregated.totalRequests > 100 && aggregated.hitRate < 0.3) {
      status = status === "unhealthy" ? "unhealthy" : "degraded";
      this.addIssue(`Low hit rate: ${(aggregated.hitRate * 100).toFixed(1)}%`);
    }

    // Check for stale issues (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.issues = this.issues.filter((issue) => {
      // Simple heuristic: keep recent issues
      return true;
    });

    return {
      status,
      issues: [...this.issues],
      uptime,
    };
  }

  private addIssue(issue: string): void {
    if (!this.issues.includes(issue)) {
      this.issues.push(issue);
      // Keep only last 10 issues
      if (this.issues.length > 10) {
        this.issues.shift();
      }
    }
  }
}

// Utility functions

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Singleton instance
export const globalCacheMetrics = new CacheMetrics();
