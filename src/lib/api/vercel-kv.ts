import { kv } from '@vercel/kv';
import { CacheEntry } from '../../types/api';

class VercelKVCache {
  private defaultTTL: number = 3600; // 1 hour default
  private keyPrefix: string = 'describe_it:';

  constructor() {
    // Check if KV is properly configured
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.warn('Vercel KV not configured. Caching will be disabled.');
    }
  }

  /**
   * Generate a prefixed cache key
   */
  private getPrefixedKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Check if KV is available
   */
  private isAvailable(): boolean {
    return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  }

  /**
   * Set a value in the cache with TTL
   */
  async set<T = any>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
    if (!this.isAvailable()) {
      console.warn('KV not available, skipping cache set');
      return;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      const cacheEntry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: ttl * 1000, // Convert to milliseconds
        key: prefixedKey,
      };

      await kv.set(prefixedKey, cacheEntry, { ex: ttl });
    } catch (error) {
      console.error('Error setting cache value:', error);
      // Don't throw - caching failures should not break the application
    }
  }

  /**
   * Get a value from the cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      const cacheEntry = await kv.get<CacheEntry<T>>(prefixedKey);

      if (!cacheEntry) {
        return null;
      }

      // Check if entry has expired (additional safety check)
      const now = Date.now();
      const expiresAt = cacheEntry.timestamp + cacheEntry.ttl;

      if (now > expiresAt) {
        // Entry has expired, delete it
        await this.delete(key);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.error('Error getting cache value:', error);
      return null;
    }
  }

  /**
   * Delete a value from the cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      const result = await kv.del(prefixedKey);
      return result === 1;
    } catch (error) {
      console.error('Error deleting cache value:', error);
      return false;
    }
  }

  /**
   * Check if a key exists in the cache
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      const result = await kv.exists(prefixedKey);
      return result === 1;
    } catch (error) {
      console.error('Error checking cache key existence:', error);
      return false;
    }
  }

  /**
   * Get multiple values from the cache
   */
  async mget<T = any>(keys: string[]): Promise<Array<T | null>> {
    if (!this.isAvailable()) {
      return keys.map(() => null);
    }

    try {
      const prefixedKeys = keys.map(key => this.getPrefixedKey(key));
      const results = await kv.mget<Array<CacheEntry<T> | null>>(...prefixedKeys);

      return results.map((cacheEntry, index) => {
        if (!cacheEntry) {
          return null;
        }

        // Check if entry has expired
        const now = Date.now();
        const expiresAt = cacheEntry.timestamp + cacheEntry.ttl;

        if (now > expiresAt) {
          // Entry has expired, delete it (fire and forget)
          this.delete(keys[index]).catch(() => {});
          return null;
        }

        return cacheEntry.data;
      });
    } catch (error) {
      console.error('Error getting multiple cache values:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in the cache
   */
  async mset<T = any>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      // Set each entry individually since KV doesn't support mset with TTL
      const promises = entries.map(({ key, value, ttl = this.defaultTTL }) =>
        this.set(key, value, ttl)
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Error setting multiple cache values:', error);
    }
  }

  /**
   * Increment a numeric value in the cache
   */
  async increment(key: string, delta: number = 1): Promise<number | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      const result = await kv.incr(prefixedKey);
      
      // Set TTL if this is a new key
      if (result === 1) {
        await kv.expire(prefixedKey, this.defaultTTL);
      }
      
      return result;
    } catch (error) {
      console.error('Error incrementing cache value:', error);
      return null;
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string = '*'): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const prefixedPattern = this.getPrefixedKey(pattern);
      const keys = await kv.keys(prefixedPattern);
      
      // Remove the prefix from returned keys
      return keys.map(key => key.replace(this.keyPrefix, ''));
    } catch (error) {
      console.error('Error getting cache keys:', error);
      return [];
    }
  }

  /**
   * Clear all keys matching a pattern
   */
  async clear(pattern: string = '*'): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const prefixedKeys = keys.map(key => this.getPrefixedKey(key));
      const result = await kv.del(...prefixedKeys);
      return result;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    keysByPrefix: Record<string, number>;
    isAvailable: boolean;
  }> {
    const stats = {
      totalKeys: 0,
      keysByPrefix: {} as Record<string, number>,
      isAvailable: this.isAvailable(),
    };

    if (!this.isAvailable()) {
      return stats;
    }

    try {
      const allKeys = await this.keys('*');
      stats.totalKeys = allKeys.length;

      // Count keys by prefix
      allKeys.forEach(key => {
        const prefix = key.split(':')[0] || 'no-prefix';
        stats.keysByPrefix[prefix] = (stats.keysByPrefix[prefix] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return stats;
    }
  }

  /**
   * Cache with automatic refresh logic
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, fetch the data
    try {
      const data = await fetcher();
      
      // Cache the result (fire and forget to not slow down the response)
      this.set(key, data, ttl).catch(() => {});
      
      return data;
    } catch (error) {
      console.error('Error in cache fetcher:', error);
      throw error;
    }
  }

  /**
   * Cached function wrapper with memoization
   */
  memoize<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    keyGenerator: (...args: T) => string,
    ttl: number = this.defaultTTL
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const key = keyGenerator(...args);
      return this.getOrSet(key, () => fn(...args), ttl);
    };
  }

  /**
   * Health check for the cache
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const testKey = 'health_check';
      const testValue = 'ok';
      
      await this.set(testKey, testValue, 10); // 10 seconds TTL
      const retrieved = await this.get(testKey);
      await this.delete(testKey);
      
      return retrieved === testValue;
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }

  /**
   * Batch operations for better performance
   */
  async batch<T>(operations: Array<{
    type: 'get' | 'set' | 'delete';
    key: string;
    value?: T;
    ttl?: number;
  }>): Promise<Array<T | boolean | null>> {
    if (!this.isAvailable()) {
      return operations.map(() => null);
    }

    const promises = operations.map(async (op) => {
      switch (op.type) {
        case 'get':
          return this.get<T>(op.key);
        case 'set':
          if (op.value !== undefined) {
            await this.set(op.key, op.value, op.ttl);
            return true;
          }
          return false;
        case 'delete':
          return this.delete(op.key);
        default:
          return null;
      }
    });

    try {
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error in batch operations:', error);
      return operations.map(() => null);
    }
  }
}

// Export singleton instance
export const vercelKvCache = new VercelKVCache();