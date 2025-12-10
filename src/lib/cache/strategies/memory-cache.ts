/**
 * LRU Memory Cache Strategy
 * High-performance in-memory caching with LRU eviction
 */

import { logger } from "@/lib/logger";
import type { CacheKeyType, toCacheKeyString } from "../cache-keys";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  priority?: number; // Cache priority for eviction (higher = keep longer)
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  priority: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
}

export interface MemoryCacheConfig {
  maxSize: number; // Maximum number of entries
  defaultTTL: number; // Default TTL in seconds
  maxMemory?: number; // Maximum memory in bytes (optional)
  evictionStrategy?: "lru" | "lfu" | "priority"; // Eviction strategy
  onEvict?: (key: string, value: any) => void; // Callback on eviction
}

/**
 * LRU Memory Cache with advanced features
 */
export class MemoryCacheStrategy<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: Required<MemoryCacheConfig>;
  private currentMemory = 0;

  constructor(config: Partial<MemoryCacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize ?? 1000,
      defaultTTL: config.defaultTTL ?? 3600,
      maxMemory: config.maxMemory ?? 100 * 1024 * 1024, // 100MB default
      evictionStrategy: config.evictionStrategy ?? "lru",
      onEvict: config.onEvict ?? (() => {}),
    };
  }

  /**
   * Get value from cache
   */
  async get<V = T>(key: string): Promise<V | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.data as unknown as V;
  }

  /**
   * Set value in cache
   */
  async set<V = T>(key: string, value: V, options: CacheOptions = {}): Promise<void> {
    const now = Date.now();
    const ttl = options.ttl ?? this.config.defaultTTL;
    const priority = options.priority ?? 0;
    const size = this.estimateSize(value);

    // Check if we need to evict
    while (
      (this.cache.size >= this.config.maxSize ||
        this.currentMemory + size > this.config.maxMemory) &&
      this.cache.size > 0
    ) {
      this.evictOne();
    }

    // Remove old entry if exists to update memory count
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.currentMemory -= oldEntry.size;
    }

    const entry: CacheEntry<V> = {
      data: value,
      timestamp: now,
      ttl,
      priority,
      accessCount: 1,
      lastAccessed: now,
      size,
    };

    this.cache.set(key, entry as any);
    this.currentMemory += size;
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemory -= entry.size;
      this.config.onEvict(key, entry.data);
    }
    return this.cache.delete(key);
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check expiration
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear cache by pattern
   */
  async clear(pattern?: string): Promise<number> {
    if (!pattern || pattern === "*") {
      const size = this.cache.size;
      this.cache.clear();
      this.currentMemory = 0;
      return size;
    }

    const keys = await this.keys(pattern);
    await Promise.all(keys.map((key) => this.delete(key)));
    return keys.length;
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    const now = Date.now();
    const result: string[] = [];

    for (const [key, entry] of this.cache) {
      // Skip expired
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.delete(key);
        continue;
      }

      // Apply pattern
      if (pattern && pattern !== "*") {
        const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
        if (!regex.test(key)) continue;
      }

      result.push(key);
    }

    return result;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get memory usage
   */
  memoryUsage(): { current: number; max: number; percentage: number } {
    return {
      current: this.currentMemory,
      max: this.config.maxMemory,
      percentage: (this.currentMemory / this.config.maxMemory) * 100,
    };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let oldestTimestamp: number | null = null;
    let newestTimestamp: number | null = null;
    let totalAccesses = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp <= entry.ttl * 1000) {
        totalAccesses += entry.accessCount;
        if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
        }
        if (newestTimestamp === null || entry.timestamp > newestTimestamp) {
          newestTimestamp = entry.timestamp;
        }
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      memoryUsage: this.currentMemory,
      maxMemory: this.config.maxMemory,
      utilizationRate: this.cache.size / this.config.maxSize,
      memoryUtilizationRate: this.currentMemory / this.config.maxMemory,
      totalAccesses,
      avgAccessesPerEntry: this.cache.size > 0 ? totalAccesses / this.cache.size : 0,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp,
      evictionStrategy: this.config.evictionStrategy,
    };
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        keysToDelete.push(key);
      }
    }

    await Promise.all(keysToDelete.map((key) => this.delete(key)));

    if (keysToDelete.length > 0) {
      logger.debug(`Memory cache cleanup: removed ${keysToDelete.length} expired entries`);
    }

    return keysToDelete.length;
  }

  /**
   * Get top N most accessed items
   */
  getTopAccessed(n: number = 10): Array<{ key: string; accessCount: number }> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, accessCount: entry.accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, n);

    return entries;
  }

  /**
   * Prewarm cache with data
   */
  async prewarm(data: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<void> {
    await Promise.all(
      data.map(({ key, value, options }) => this.set(key, value, options))
    );
    logger.info(`Memory cache prewarmed with ${data.length} entries`);
  }

  // Private methods

  private evictOne(): void {
    let keyToEvict: string | null = null;

    switch (this.config.evictionStrategy) {
      case "lru":
        keyToEvict = this.findLRU();
        break;
      case "lfu":
        keyToEvict = this.findLFU();
        break;
      case "priority":
        keyToEvict = this.findLowestPriority();
        break;
    }

    if (keyToEvict) {
      const entry = this.cache.get(keyToEvict);
      if (entry) {
        this.config.onEvict(keyToEvict, entry.data);
      }
      this.delete(keyToEvict);
    }
  }

  private findLRU(): string | null {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldest = key;
      }
    }

    return oldest;
  }

  private findLFU(): string | null {
    let least: string | null = null;
    let leastCount = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount;
        least = key;
      }
    }

    return least;
  }

  private findLowestPriority(): string | null {
    let lowest: string | null = null;
    let lowestPriority = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.priority < lowestPriority) {
        lowestPriority = entry.priority;
        lowest = key;
      }
    }

    return lowest;
  }

  private estimateSize(value: any): number {
    try {
      // Rough estimate: stringify and count bytes
      const str = JSON.stringify(value);
      return str.length * 2; // UTF-16 uses 2 bytes per char
    } catch {
      // If can't stringify, use a default size
      return 1024; // 1KB default
    }
  }
}
