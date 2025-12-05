/**
 * Unified Cache Manager
 * Orchestrates multiple caching strategies with intelligent routing,
 * invalidation patterns, warming, and comprehensive metrics
 */

import { logger } from "@/lib/logger";
import { MemoryCacheStrategy, type CacheOptions } from "./strategies/memory-cache";
import { SessionCacheStrategy } from "./strategies/session-cache";
import {
  CacheKeys,
  CachePatterns,
  type CacheKeyType,
  toCacheKeyString,
} from "./cache-keys";
import { CacheMetrics, globalCacheMetrics } from "./cache-metrics";

export interface CacheManagerConfig {
  enableMemoryCache?: boolean;
  enableSessionCache?: boolean;
  enableRequestDedup?: boolean;
  enableComputed?: boolean;
  memoryCacheSize?: number;
  defaultTTL?: number;
  enableWarming?: boolean;
  enableMetrics?: boolean;
}

interface RequestDedupEntry {
  promise: Promise<any>;
  timestamp: number;
}

interface ComputedCacheEntry<T> {
  result: T;
  timestamp: number;
  ttl: number;
  args: any[];
}

/**
 * Unified cache manager with multiple strategies
 */
export class CacheManager {
  private memory: MemoryCacheStrategy;
  private session: SessionCacheStrategy;
  private metrics: CacheMetrics;
  private requestDedup = new Map<string, RequestDedupEntry>();
  private computedCache = new Map<string, ComputedCacheEntry<any>>();
  private config: Required<CacheManagerConfig>;

  constructor(config: CacheManagerConfig = {}) {
    this.config = {
      enableMemoryCache: config.enableMemoryCache ?? true,
      enableSessionCache: config.enableSessionCache ?? true,
      enableRequestDedup: config.enableRequestDedup ?? true,
      enableComputed: config.enableComputed ?? true,
      memoryCacheSize: config.memoryCacheSize ?? 1000,
      defaultTTL: config.defaultTTL ?? 3600,
      enableWarming: config.enableWarming ?? true,
      enableMetrics: config.enableMetrics ?? true,
    };

    // Initialize strategies
    this.memory = new MemoryCacheStrategy({
      maxSize: this.config.memoryCacheSize,
      defaultTTL: this.config.defaultTTL,
      evictionStrategy: "lru",
      onEvict: (key, value) => {
        logger.debug(`Cache eviction: ${key}`);
        this.metrics.recordEviction("memory");
      },
    });

    this.session = new SessionCacheStrategy({
      defaultSessionTTL: 3600,
      defaultItemTTL: 1800,
      maxSessionSize: 100,
      maxTotalSize: 10000,
    });

    this.metrics = this.config.enableMetrics ? globalCacheMetrics : new CacheMetrics();

    // Initialize strategy metrics
    if (this.config.enableMetrics) {
      this.metrics.initStrategy("memory", this.config.memoryCacheSize);
      this.metrics.initStrategy("session", 10000);
      this.metrics.initStrategy("request-dedup", 1000);
      this.metrics.initStrategy("computed", 500);
    }

    logger.info("Cache manager initialized", {
      memory: this.config.enableMemoryCache,
      session: this.config.enableSessionCache,
      dedup: this.config.enableRequestDedup,
      computed: this.config.enableComputed,
    });
  }

  /**
   * Get value from cache with automatic strategy selection
   */
  async get<T>(key: CacheKeyType, sessionId?: string): Promise<T | null> {
    const keyStr = typeof key === "string" ? key : key.build();
    const startTime = performance.now();

    try {
      // Try session cache first if sessionId provided
      if (sessionId && this.config.enableSessionCache) {
        const sessionValue = await this.session.get<T>(sessionId, keyStr);
        if (sessionValue !== null) {
          this.recordMetrics("session", "hit", startTime, keyStr);
          return sessionValue;
        }
      }

      // Try memory cache
      if (this.config.enableMemoryCache) {
        const memoryValue = await this.memory.get<T>(keyStr);
        if (memoryValue !== null) {
          this.recordMetrics("memory", "hit", startTime, keyStr);
          return memoryValue;
        }
      }

      this.recordMetrics("memory", "miss", startTime, keyStr);
      return null;
    } catch (error) {
      logger.error("Cache get error:", error);
      this.metrics.recordError(error as Error);
      return null;
    }
  }

  /**
   * Set value in cache with automatic strategy selection
   */
  async set<T>(
    key: CacheKeyType,
    value: T,
    options: CacheOptions & { sessionId?: string } = {}
  ): Promise<void> {
    const keyStr = typeof key === "string" ? key : key.build();
    const startTime = performance.now();

    try {
      // Store in session cache if sessionId provided
      if (options.sessionId && this.config.enableSessionCache) {
        await this.session.set(options.sessionId, keyStr, value, options);
      }

      // Always store in memory cache
      if (this.config.enableMemoryCache) {
        await this.memory.set(keyStr, value, options);
      }

      this.recordMetrics("memory", "set", startTime, keyStr);
    } catch (error) {
      logger.error("Cache set error:", error);
      this.metrics.recordError(error as Error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: CacheKeyType, sessionId?: string): Promise<boolean> {
    const keyStr = typeof key === "string" ? key : key.build();
    const startTime = performance.now();

    try {
      let deleted = false;

      if (sessionId && this.config.enableSessionCache) {
        deleted = (await this.session.delete(sessionId, keyStr)) || deleted;
      }

      if (this.config.enableMemoryCache) {
        deleted = (await this.memory.delete(keyStr)) || deleted;
      }

      this.recordMetrics("memory", "delete", startTime, keyStr);
      return deleted;
    } catch (error) {
      logger.error("Cache delete error:", error);
      this.metrics.recordError(error as Error);
      return false;
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      let count = 0;

      if (this.config.enableMemoryCache) {
        count += await this.memory.clear(pattern);
      }

      this.metrics.recordInvalidation(count);
      logger.info(`Invalidated ${count} cache entries matching: ${pattern}`);

      return count;
    } catch (error) {
      logger.error("Cache invalidation error:", error);
      this.metrics.recordError(error as Error);
      return 0;
    }
  }

  /**
   * Get or set with cache-aside pattern
   */
  async getOrSet<T>(
    key: CacheKeyType,
    fetcher: () => Promise<T>,
    options: CacheOptions & { sessionId?: string } = {}
  ): Promise<T> {
    const keyStr = typeof key === "string" ? key : key.build();

    // Try to get from cache
    const cached = await this.get<T>(key, options.sessionId);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    const value = await fetcher();
    await this.set(key, value, options);

    return value;
  }

  /**
   * Request deduplication - prevent concurrent identical requests
   */
  async deduplicate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 5
  ): Promise<T> {
    if (!this.config.enableRequestDedup) {
      return fetcher();
    }

    // Check for in-flight request
    const existing = this.requestDedup.get(key);
    if (existing) {
      const age = Date.now() - existing.timestamp;
      if (age < ttlSeconds * 1000) {
        logger.debug(`Request dedup hit: ${key}`);
        this.metrics.recordHit("request-dedup");
        return existing.promise;
      }
    }

    // Create new request
    this.metrics.recordMiss("request-dedup");
    const promise = fetcher();

    this.requestDedup.set(key, {
      promise,
      timestamp: Date.now(),
    });

    // Cleanup after completion
    promise
      .finally(() => {
        setTimeout(() => {
          this.requestDedup.delete(key);
        }, ttlSeconds * 1000);
      })
      .catch(() => {
        // Error handling done by caller
      });

    return promise;
  }

  /**
   * Memoize function calls with caching
   */
  memoize<TArgs extends any[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    options: {
      keyGenerator?: (...args: TArgs) => string;
      ttl?: number;
    } = {}
  ): (...args: TArgs) => Promise<TResult> {
    if (!this.config.enableComputed) {
      return fn;
    }

    const keyGenerator =
      options.keyGenerator ||
      ((...args: TArgs) => {
        const key = CacheKeys.computed(fn.name || "anonymous", args);
        return key.build();
      });

    return async (...args: TArgs): Promise<TResult> => {
      const key = keyGenerator(...args);
      const ttl = options.ttl ?? this.config.defaultTTL;

      // Check computed cache
      const cached = this.computedCache.get(key);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < cached.ttl * 1000) {
          // Verify args match
          if (JSON.stringify(cached.args) === JSON.stringify(args)) {
            this.metrics.recordHit("computed");
            return cached.result;
          }
        }
      }

      // Execute and cache
      this.metrics.recordMiss("computed");
      const result = await fn(...args);

      this.computedCache.set(key, {
        result,
        timestamp: Date.now(),
        ttl,
        args: [...args],
      });

      return result;
    };
  }

  /**
   * Cache warming - preload commonly accessed data
   */
  async warm(entries: Array<{ key: CacheKeyType; fetcher: () => Promise<any> }>): Promise<void> {
    if (!this.config.enableWarming) {
      logger.warn("Cache warming is disabled");
      return;
    }

    logger.info(`Warming cache with ${entries.length} entries...`);

    const results = await Promise.allSettled(
      entries.map(async ({ key, fetcher }) => {
        try {
          const value = await fetcher();
          await this.set(key, value);
        } catch (error) {
          logger.error(`Cache warming failed for key: ${key}`, error);
        }
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    logger.info(`Cache warming complete: ${succeeded}/${entries.length} succeeded`);
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics() {
    return this.metrics.getSnapshot();
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics() {
    return this.metrics.getAggregated();
  }

  /**
   * Get human-readable summary
   */
  getSummary(): string {
    return this.metrics.getSummary();
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics.reset();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    checks: Record<string, boolean>;
  }> {
    const checks: Record<string, boolean> = {};

    try {
      // Test memory cache
      const testKey = "__health__";
      const testValue = "ok";
      await this.memory.set(testKey, testValue);
      const retrieved = await this.memory.get(testKey);
      checks.memory = retrieved === testValue;
      await this.memory.delete(testKey);

      // Check metrics
      const snapshot = this.metrics.getSnapshot();
      checks.metrics = snapshot.health.status !== "unhealthy";

      const allHealthy = Object.values(checks).every((v) => v);
      const status = allHealthy ? "healthy" : "degraded";

      return { status, checks };
    } catch (error) {
      logger.error("Health check failed:", error);
      return {
        status: "unhealthy",
        checks,
      };
    }
  }

  /**
   * Cleanup expired entries across all strategies
   */
  async cleanup(): Promise<{ memory: number; session: any }> {
    const memory = await this.memory.cleanup();
    const session = await this.session.cleanup();

    // Cleanup computed cache
    const now = Date.now();
    let computedRemoved = 0;
    for (const [key, entry] of this.computedCache) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.computedCache.delete(key);
        computedRemoved++;
      }
    }

    // Cleanup request dedup
    let dedupRemoved = 0;
    for (const [key, entry] of this.requestDedup) {
      if (now - entry.timestamp > 5000) {
        // 5 second TTL
        this.requestDedup.delete(key);
        dedupRemoved++;
      }
    }

    logger.info("Cache cleanup complete", {
      memory,
      session,
      computed: computedRemoved,
      dedup: dedupRemoved,
    });

    return { memory, session };
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    await this.memory.clear();
    this.computedCache.clear();
    this.requestDedup.clear();
    logger.info("All caches cleared");
  }

  /**
   * Session-specific operations
   */
  session_ops = {
    create: (sessionId: string, userId?: string) => {
      this.session.createSession(sessionId, userId);
    },
    destroy: async (sessionId: string) => {
      await this.session.destroySession(sessionId);
    },
    extend: (sessionId: string, seconds: number) => {
      return this.session.extendSession(sessionId, seconds);
    },
    renew: (sessionId: string) => {
      return this.session.renewSession(sessionId);
    },
    getData: async (sessionId: string) => {
      return this.session.getSessionData(sessionId);
    },
  };

  // Private helper methods

  private recordMetrics(
    strategy: string,
    operation: "hit" | "miss" | "set" | "delete",
    startTime: number,
    key: string
  ): void {
    if (!this.config.enableMetrics) return;

    const duration = performance.now() - startTime;

    switch (operation) {
      case "hit":
        this.metrics.recordHit(strategy);
        this.metrics.recordGet(duration, key);
        break;
      case "miss":
        this.metrics.recordMiss(strategy);
        this.metrics.recordGet(duration, key);
        break;
      case "set":
        this.metrics.recordSet(duration, key);
        break;
      case "delete":
        this.metrics.recordDelete(duration, key);
        break;
    }

    // Update size periodically
    if (strategy === "memory") {
      this.metrics.updateSize(strategy, this.memory.size());
    }
  }
}

// Singleton instance for application-wide use
export const cacheManager = new CacheManager({
  enableMemoryCache: true,
  enableSessionCache: true,
  enableRequestDedup: true,
  enableComputed: true,
  memoryCacheSize: parseInt(process.env.CACHE_SIZE || "1000"),
  defaultTTL: parseInt(process.env.CACHE_TTL || "3600"),
  enableWarming: true,
  enableMetrics: true,
});

// Export convenience functions
export const cache = {
  get: <T>(key: CacheKeyType, sessionId?: string) => cacheManager.get<T>(key, sessionId),
  set: <T>(key: CacheKeyType, value: T, options?: CacheOptions & { sessionId?: string }) =>
    cacheManager.set(key, value, options),
  delete: (key: CacheKeyType, sessionId?: string) => cacheManager.delete(key, sessionId),
  invalidate: (pattern: string) => cacheManager.invalidatePattern(pattern),
  getOrSet: <T>(
    key: CacheKeyType,
    fetcher: () => Promise<T>,
    options?: CacheOptions & { sessionId?: string }
  ) => cacheManager.getOrSet(key, fetcher, options),
  deduplicate: <T>(key: string, fetcher: () => Promise<T>, ttl?: number) =>
    cacheManager.deduplicate(key, fetcher, ttl),
  memoize: <TArgs extends any[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    options?: { keyGenerator?: (...args: TArgs) => string; ttl?: number }
  ) => cacheManager.memoize(fn, options),
  warm: (entries: Array<{ key: CacheKeyType; fetcher: () => Promise<any> }>) =>
    cacheManager.warm(entries),
  metrics: () => cacheManager.getMetrics(),
  summary: () => cacheManager.getSummary(),
  health: () => cacheManager.healthCheck(),
  cleanup: () => cacheManager.cleanup(),
  clear: () => cacheManager.clear(),
};

// Export helper for creating cache keys
export { CacheKeys, CachePatterns };
