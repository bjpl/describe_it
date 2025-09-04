import { CacheEntry } from '../../types/api';
import { memoryCache } from '../cache/memory-cache';

// Redis is optional - only import if available
let Redis: any = null;
try {
  Redis = require('ioredis');
} catch (error) {
  console.log('ioredis not installed. Using memory cache only.');
}

class RedisAdapter {
  private client: any | null = null;
  private defaultTTL: number = 3600; // 1 hour default
  private keyPrefix: string = 'describe_it:';
  private useMemoryFallback: boolean = true;
  private redisHealthy: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    if (!Redis) {
      console.warn('Redis module not available. Using memory cache only.');
      return;
    }

    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.warn('Redis URL not configured. Using memory cache only.');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        connectTimeout: 10000,
        lazyConnect: false,
      });

      this.client.on('connect', () => {
        console.log('Redis connected successfully');
        this.redisHealthy = true;
      });

      this.client.on('error', (err) => {
        console.error('Redis connection error:', err.message);
        this.redisHealthy = false;
      });

      this.client.on('close', () => {
        console.log('Redis connection closed');
        this.redisHealthy = false;
      });

      // Test connection
      await this.client.ping();
      this.redisHealthy = true;
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.redisHealthy = false;
    }
  }

  private getPrefixedKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async set<T = any>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);

    // Always set in memory cache for fallback
    if (this.useMemoryFallback) {
      memoryCache.set(prefixedKey, value, ttl);
    }

    if (!this.client || !this.redisHealthy) {
      return;
    }

    try {
      const cacheEntry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: ttl * 1000,
        key: prefixedKey,
      };

      await this.client.setex(prefixedKey, ttl, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Redis set error:', error);
      this.redisHealthy = false;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    const prefixedKey = this.getPrefixedKey(key);

    // Try memory cache first
    if (this.useMemoryFallback) {
      const memoryResult = memoryCache.get(prefixedKey) as T | null;
      if (memoryResult !== null) {
        return memoryResult;
      }
    }

    if (!this.client || !this.redisHealthy) {
      return null;
    }

    try {
      const result = await this.client.get(prefixedKey);
      if (!result) return null;

      const cacheEntry = JSON.parse(result) as CacheEntry<T>;
      
      // Check expiration
      const now = Date.now();
      const expiresAt = cacheEntry.timestamp + cacheEntry.ttl;
      
      if (now > expiresAt) {
        await this.delete(key);
        return null;
      }

      // Store in memory cache
      if (this.useMemoryFallback) {
        const remainingTTL = Math.max(0, (expiresAt - now) / 1000);
        memoryCache.set(prefixedKey, cacheEntry.data, remainingTTL);
      }

      return cacheEntry.data;
    } catch (error) {
      console.error('Redis get error:', error);
      this.redisHealthy = false;
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(key);

    if (this.useMemoryFallback) {
      memoryCache.delete(prefixedKey);
    }

    if (!this.client || !this.redisHealthy) {
      return false;
    }

    try {
      const result = await this.client.del(prefixedKey);
      return result === 1;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(key);

    if (!this.client || !this.redisHealthy) {
      return this.useMemoryFallback ? memoryCache.has(prefixedKey) : false;
    }

    try {
      const result = await this.client.exists(prefixedKey);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async mget<T = any>(keys: string[]): Promise<Array<T | null>> {
    if (!this.client || !this.redisHealthy) {
      return keys.map(key => 
        this.useMemoryFallback ? memoryCache.get(this.getPrefixedKey(key)) as T | null : null
      );
    }

    try {
      const prefixedKeys = keys.map(key => this.getPrefixedKey(key));
      const results = await this.client.mget(...prefixedKeys);
      
      return results.map((result, index) => {
        if (!result) return null;
        
        try {
          const cacheEntry = JSON.parse(result) as CacheEntry<T>;
          const now = Date.now();
          const expiresAt = cacheEntry.timestamp + cacheEntry.ttl;
          
          if (now > expiresAt) {
            this.delete(keys[index]).catch(() => {});
            return null;
          }
          
          return cacheEntry.data;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('Redis mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset<T = any>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    const pipeline = this.client?.pipeline();
    
    for (const { key, value, ttl = this.defaultTTL } of entries) {
      const prefixedKey = this.getPrefixedKey(key);
      
      if (this.useMemoryFallback) {
        memoryCache.set(prefixedKey, value, ttl);
      }
      
      if (pipeline && this.redisHealthy) {
        const cacheEntry: CacheEntry<T> = {
          data: value,
          timestamp: Date.now(),
          ttl: ttl * 1000,
          key: prefixedKey,
        };
        pipeline.setex(prefixedKey, ttl, JSON.stringify(cacheEntry));
      }
    }
    
    if (pipeline && this.redisHealthy) {
      try {
        await pipeline.exec();
      } catch (error) {
        console.error('Redis mset error:', error);
        this.redisHealthy = false;
      }
    }
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    if (!this.client || !this.redisHealthy) {
      if (this.useMemoryFallback) {
        const allKeys = memoryCache.keys(this.keyPrefix + pattern);
        return allKeys.map(key => key.replace(this.keyPrefix, ''));
      }
      return [];
    }

    try {
      const prefixedPattern = this.getPrefixedKey(pattern);
      const keys = await this.client.keys(prefixedPattern);
      return keys.map(key => key.replace(this.keyPrefix, ''));
    } catch (error) {
      console.error('Redis keys error:', error);
      return [];
    }
  }

  async clear(pattern: string = '*'): Promise<number> {
    const keys = await this.keys(pattern);
    
    if (keys.length === 0) {
      return 0;
    }

    if (this.useMemoryFallback) {
      keys.forEach(key => memoryCache.delete(this.getPrefixedKey(key)));
    }

    if (!this.client || !this.redisHealthy) {
      return keys.length;
    }

    try {
      const prefixedKeys = keys.map(key => this.getPrefixedKey(key));
      const result = await this.client.del(...prefixedKeys);
      return result;
    } catch (error) {
      console.error('Redis clear error:', error);
      return 0;
    }
  }

  async getStats(): Promise<{
    totalKeys: number;
    keysByPrefix: Record<string, number>;
    isAvailable: boolean;
  }> {
    const stats = {
      totalKeys: 0,
      keysByPrefix: {} as Record<string, number>,
      isAvailable: this.redisHealthy,
    };

    if (!this.client || !this.redisHealthy) {
      if (this.useMemoryFallback) {
        const memStats = memoryCache.getStats();
        stats.totalKeys = memStats.size;
      }
      return stats;
    }

    try {
      const allKeys = await this.keys('*');
      stats.totalKeys = allKeys.length;

      allKeys.forEach(key => {
        const prefix = key.split(':')[0] || 'no-prefix';
        stats.keysByPrefix[prefix] = (stats.keysByPrefix[prefix] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Redis getStats error:', error);
      return stats;
    }
  }

  async getOrSet<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, ttl);
    return data;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.ping();
      this.redisHealthy = true;
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      this.redisHealthy = false;
      return false;
    }
  }
}

export const redisCache = new RedisAdapter();