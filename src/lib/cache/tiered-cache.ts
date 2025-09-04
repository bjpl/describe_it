/**
 * Tiered caching system with automatic fallback
 * Primary: Redis (when available)
 * Secondary: Vercel KV (when available)
 * Tertiary: In-memory cache
 * Quaternary: Session storage (client-side)
 */

import { redisCache } from "../api/redis-adapter";
import { vercelKvCache } from "../api/vercel-kv";
import { memoryCache } from "./memory-cache";

interface CacheConfig {
  enableRedis: boolean;
  enableKV: boolean;
  enableMemory: boolean;
  enableSession: boolean;
  redisTTL: number;
  kvTTL: number;
  memoryTTL: number;
  sessionTTL: number;
  writeThrough: boolean; // Write to all layers simultaneously
  readThrough: boolean; // Try all layers on miss
}

interface CacheMetrics {
  redisHits: number;
  kvHits: number;
  memoryHits: number;
  sessionHits: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  preferredProvider: "redis" | "kv" | "memory" | "session";
  redisHealthy: boolean;
  kvHealthy: boolean;
  memoryHealthy: boolean;
}

export class TieredCache {
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private keyPrefix: string = "tc:"; // tiered cache prefix

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      enableRedis: true,
      enableKV: true,
      enableMemory: true,
      enableSession: false, // Disabled by default on server
      redisTTL: 3600, // 1 hour
      kvTTL: 3600, // 1 hour
      memoryTTL: 1800, // 30 minutes
      sessionTTL: 900, // 15 minutes
      writeThrough: true,
      readThrough: true,
      ...config,
    };

    this.metrics = {
      redisHits: 0,
      kvHits: 0,
      memoryHits: 0,
      sessionHits: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
      preferredProvider: "memory",
      redisHealthy: false,
      kvHealthy: false,
      memoryHealthy: true,
    };

    this.initializeHealthChecks();
  }

  /**
   * Get value from cache with automatic fallback
   */
  async get<T = any>(key: string): Promise<T | null> {
    const prefixedKey = this.getPrefixedKey(key);

    // Try Redis first if available and healthy
    if (this.config.enableRedis && this.metrics.redisHealthy) {
      try {
        const redisResult = await redisCache.get<T>(prefixedKey);
        if (redisResult !== null) {
          this.metrics.redisHits++;
          this.metrics.totalHits++;
          this.updateHitRate();

          // Write-back to memory cache for faster subsequent access
          if (this.config.enableMemory) {
            memoryCache.set(prefixedKey, redisResult, this.config.memoryTTL);
          }

          return redisResult;
        }
      } catch (error) {
        console.warn("Redis cache error during get:", error);
        this.metrics.redisHealthy = false;
      }
    }

    // Try KV second if available and healthy
    if (this.config.enableKV && this.metrics.kvHealthy) {
      try {
        const kvResult = await vercelKvCache.get<T>(prefixedKey);
        if (kvResult !== null) {
          this.metrics.kvHits++;
          this.metrics.totalHits++;
          this.updateHitRate();

          // Write-back to Redis and memory cache for faster subsequent access
          if (this.config.enableRedis && this.metrics.redisHealthy) {
            redisCache.set(prefixedKey, kvResult, this.config.redisTTL);
          }
          if (this.config.enableMemory) {
            memoryCache.set(prefixedKey, kvResult, this.config.memoryTTL);
          }

          return kvResult;
        }
      } catch (error) {
        console.warn("KV cache error during get:", error);
        this.metrics.kvHealthy = false;
      }
    }

    // Try memory cache
    if (this.config.enableMemory) {
      const memoryResult = memoryCache.get(prefixedKey) as T | null;
      if (memoryResult !== null) {
        this.metrics.memoryHits++;
        this.metrics.totalHits++;
        this.updateHitRate();
        return memoryResult;
      }
    }

    // Try session storage (client-side only)
    if (this.config.enableSession && typeof window !== "undefined") {
      try {
        const sessionData = sessionStorage.getItem(prefixedKey);
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          const now = Date.now();

          if (now - parsed.timestamp < this.config.sessionTTL * 1000) {
            this.metrics.sessionHits++;
            this.metrics.totalHits++;
            this.updateHitRate();
            return parsed.data as T;
          } else {
            // Expired, remove it
            sessionStorage.removeItem(prefixedKey);
          }
        }
      } catch (error) {
        console.warn("Session cache error during get:", error);
      }
    }

    this.metrics.totalMisses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Set value in cache across all available layers
   */
  async set<T = any>(
    key: string,
    value: T,
    options?: {
      redisTTL?: number;
      kvTTL?: number;
      memoryTTL?: number;
      sessionTTL?: number;
    },
  ): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);
    const redisTTL = options?.redisTTL ?? this.config.redisTTL;
    const kvTTL = options?.kvTTL ?? this.config.kvTTL;
    const memoryTTL = options?.memoryTTL ?? this.config.memoryTTL;
    const sessionTTL = options?.sessionTTL ?? this.config.sessionTTL;

    const promises: Promise<void>[] = [];

    // Set in Redis first if available
    if (this.config.enableRedis && this.metrics.redisHealthy) {
      promises.push(
        redisCache.set(prefixedKey, value, redisTTL).catch((error) => {
          console.warn("Redis cache error during set:", error);
          this.metrics.redisHealthy = false;
        }),
      );
    }

    // Set in KV if available
    if (this.config.enableKV && this.metrics.kvHealthy) {
      promises.push(
        vercelKvCache.set(prefixedKey, value, kvTTL).catch((error) => {
          console.warn("KV cache error during set:", error);
          this.metrics.kvHealthy = false;
        }),
      );
    }

    // Set in memory cache
    if (this.config.enableMemory) {
      promises.push(
        Promise.resolve(memoryCache.set(prefixedKey, value, memoryTTL)),
      );
    }

    // Set in session storage (client-side only)
    if (this.config.enableSession && typeof window !== "undefined") {
      promises.push(
        Promise.resolve().then(() => {
          try {
            const sessionEntry = {
              data: value,
              timestamp: Date.now(),
            };
            sessionStorage.setItem(prefixedKey, JSON.stringify(sessionEntry));
          } catch (error) {
            console.warn("Session cache error during set:", error);
          }
        }),
      );
    }

    // Execute all sets in parallel or sequentially based on config
    if (this.config.writeThrough) {
      await Promise.all(promises);
    } else {
      // Fire and forget for better performance
      Promise.all(promises).catch((error) => {
        console.warn("Background cache set failed:", error);
      });
    }
  }

  /**
   * Delete from all cache layers
   */
  async delete(key: string): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(key);
    const results: boolean[] = [];

    // Delete from KV
    if (this.config.enableKV && this.metrics.kvHealthy) {
      try {
        const kvResult = await vercelKvCache.delete(prefixedKey);
        results.push(kvResult);
      } catch (error) {
        console.warn("KV cache error during delete:", error);
        results.push(false);
      }
    }

    // Delete from memory
    if (this.config.enableMemory) {
      results.push(memoryCache.delete(prefixedKey));
    }

    // Delete from session storage
    if (this.config.enableSession && typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(prefixedKey);
        results.push(true);
      } catch (error) {
        console.warn("Session cache error during delete:", error);
        results.push(false);
      }
    }

    return results.some((result) => result);
  }

  /**
   * Check if key exists in any cache layer
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Get or set pattern with automatic fallback
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      kvTTL?: number;
      memoryTTL?: number;
      sessionTTL?: number;
    },
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Batch get operations
   */
  async mget<T = any>(keys: string[]): Promise<Array<T | null>> {
    const promises = keys.map((key) => this.get<T>(key));
    return Promise.all(promises);
  }

  /**
   * Batch set operations
   */
  async mset<T = any>(
    entries: Array<{
      key: string;
      value: T;
      kvTTL?: number;
      memoryTTL?: number;
      sessionTTL?: number;
    }>,
  ): Promise<void> {
    const promises = entries.map((entry) =>
      this.set(entry.key, entry.value, {
        kvTTL: entry.kvTTL,
        memoryTTL: entry.memoryTTL,
        sessionTTL: entry.sessionTTL,
      }),
    );
    await Promise.all(promises);
  }

  /**
   * Clear cache with pattern support
   */
  async clear(pattern: string = "*"): Promise<number> {
    let totalCleared = 0;

    // Clear KV
    if (this.config.enableKV && this.metrics.kvHealthy) {
      try {
        const kvCleared = await vercelKvCache.clear(pattern);
        totalCleared += kvCleared;
      } catch (error) {
        console.warn("KV cache error during clear:", error);
      }
    }

    // Clear memory
    if (this.config.enableMemory) {
      const memoryCleared = memoryCache.clear(pattern);
      totalCleared += memoryCleared;
    }

    // Clear session storage (pattern-based)
    if (this.config.enableSession && typeof window !== "undefined") {
      try {
        let sessionCleared = 0;
        const regex = new RegExp(pattern.replace(/\*/g, ".*"));

        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(this.keyPrefix) && regex.test(key)) {
            sessionStorage.removeItem(key);
            sessionCleared++;
          }
        }
        totalCleared += sessionCleared;
      } catch (error) {
        console.warn("Session cache error during clear:", error);
      }
    }

    return totalCleared;
  }

  /**
   * Get cache metrics and health status
   */
  async getMetrics(): Promise<CacheMetrics & { stats: any }> {
    const memoryStats = memoryCache.getStats();
    let kvStats = null;

    if (this.config.enableKV && this.metrics.kvHealthy) {
      try {
        kvStats = await vercelKvCache.getStats();
      } catch (error) {
        console.warn("Could not get KV stats:", error);
      }
    }

    return {
      ...this.metrics,
      stats: {
        memory: memoryStats,
        kv: kvStats,
        session:
          typeof window !== "undefined"
            ? {
                available: true,
                usage: this.getSessionStorageUsage(),
              }
            : { available: false },
      },
    };
  }

  /**
   * Health check for all cache layers
   */
  async healthCheck(): Promise<{
    overall: boolean;
    redis: boolean;
    kv: boolean;
    memory: boolean;
    session: boolean;
  }> {
    const health = {
      overall: false,
      redis: false,
      kv: false,
      memory: false,
      session: false,
    };

    // Check Redis health
    if (this.config.enableRedis) {
      try {
        health.redis = await redisCache.healthCheck();
        this.metrics.redisHealthy = health.redis;
      } catch {
        health.redis = false;
        this.metrics.redisHealthy = false;
      }
    }

    // Check KV health
    if (this.config.enableKV) {
      try {
        health.kv = await vercelKvCache.healthCheck();
        this.metrics.kvHealthy = health.kv;
      } catch {
        health.kv = false;
        this.metrics.kvHealthy = false;
      }
    }

    // Check memory health
    if (this.config.enableMemory) {
      health.memory = memoryCache.healthCheck();
      this.metrics.memoryHealthy = health.memory;
    }

    // Check session storage health
    if (this.config.enableSession && typeof window !== "undefined") {
      try {
        const testKey = "__health_check__";
        sessionStorage.setItem(testKey, "test");
        health.session = sessionStorage.getItem(testKey) === "test";
        sessionStorage.removeItem(testKey);
      } catch {
        health.session = false;
      }
    }

    health.overall =
      health.redis || health.kv || health.memory || health.session;
    return health;
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      ...this.metrics,
      redisHits: 0,
      kvHits: 0,
      memoryHits: 0,
      sessionHits: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
    };
  }

  private getPrefixedKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private updateHitRate(): void {
    const total = this.metrics.totalHits + this.metrics.totalMisses;
    this.metrics.hitRate = total > 0 ? this.metrics.totalHits / total : 0;

    // Update preferred provider based on health and hits
    if (this.metrics.redisHealthy && this.metrics.redisHits > 0) {
      this.metrics.preferredProvider = "redis";
    } else if (this.metrics.kvHealthy && this.metrics.kvHits > 0) {
      this.metrics.preferredProvider = "kv";
    } else if (this.metrics.memoryHealthy) {
      this.metrics.preferredProvider = "memory";
    } else {
      this.metrics.preferredProvider = "session";
    }
  }

  private async initializeHealthChecks(): Promise<void> {
    // Initial health check
    await this.healthCheck();

    // Periodic health checks (every 5 minutes)
    if (typeof setInterval !== "undefined") {
      setInterval(
        async () => {
          await this.healthCheck();
        },
        5 * 60 * 1000,
      );
    }
  }

  private getSessionStorageUsage(): { used: number; available: number } {
    if (typeof window === "undefined") {
      return { used: 0, available: 0 };
    }

    try {
      let used = 0;
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(this.keyPrefix)) {
          used += (sessionStorage.getItem(key) || "").length * 2; // UTF-16
        }
      }

      // Rough estimate of available space (browsers typically allow 5-10MB)
      const available = 5 * 1024 * 1024; // 5MB estimate

      return { used, available };
    } catch {
      return { used: 0, available: 0 };
    }
  }
}

// Create different instances for different use cases
export const tieredCache = new TieredCache({
  enableKV: true,
  enableMemory: true,
  enableSession: false, // Server-side default
  kvTTL: 3600, // 1 hour for KV
  memoryTTL: 1800, // 30 minutes for memory
  sessionTTL: 900, // 15 minutes for session
  writeThrough: false, // Better performance with async writes
  readThrough: true,
});

// Specialized cache instances
export const imageCache = new TieredCache({
  enableKV: true,
  enableMemory: true,
  enableSession: true,
  kvTTL: 3600, // 1 hour
  memoryTTL: 1800, // 30 minutes
  sessionTTL: 1200, // 20 minutes
});

export const descriptionCache = new TieredCache({
  enableKV: true,
  enableMemory: true,
  enableSession: false,
  kvTTL: 86400, // 24 hours
  memoryTTL: 3600, // 1 hour
  sessionTTL: 1800, // 30 minutes
});

export const qaCache = new TieredCache({
  enableKV: true,
  enableMemory: true,
  enableSession: false,
  kvTTL: 43200, // 12 hours
  memoryTTL: 3600, // 1 hour
  sessionTTL: 1800, // 30 minutes
});

export const phrasesCache = new TieredCache({
  enableKV: true,
  enableMemory: true,
  enableSession: false,
  kvTTL: 43200, // 12 hours
  memoryTTL: 3600, // 1 hour
  sessionTTL: 1800, // 30 minutes
});

export default TieredCache;
