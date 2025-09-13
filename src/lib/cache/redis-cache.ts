import { createHash } from 'crypto';
import { Redis } from 'ioredis';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTTL: number;
  maxRetries: number;
  retryDelayOnFailover: number;
  enableOfflineQueue: boolean;
  lazyConnect: boolean;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  tags?: string[];
}

export interface CacheStats {
  totalKeys: number;
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  operations: {
    gets: number;
    sets: number;
    deletes: number;
    hits: number;
    misses: number;
  };
}

export class RedisCache {
  private redis: Redis;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats: CacheStats = {
    totalKeys: 0,
    hitRate: 0,
    missRate: 0,
    memoryUsage: 0,
    operations: {
      gets: 0,
      sets: 0,
      deletes: 0,
      hits: 0,
      misses: 0,
    },
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: 'describe_it:',
      defaultTTL: 3600, // 1 hour
      maxRetries: 3,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      lazyConnect: true,
      ...config,
    };

    this.redis = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      keyPrefix: this.config.keyPrefix,
      maxRetriesPerRequest: this.config.maxRetries,
      retryDelayOnFailover: this.config.retryDelayOnFailover,
      enableOfflineQueue: this.config.enableOfflineQueue,
      lazyConnect: this.config.lazyConnect,
    });

    this.setupEventHandlers();
    this.startMemoryCleanup();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('Redis cache connected');
    });

    this.redis.on('error', (error) => {
      console.error('Redis cache error:', error);
    });

    this.redis.on('ready', () => {
      console.log('Redis cache ready');
    });

    this.redis.on('close', () => {
      console.log('Redis cache connection closed');
    });
  }

  private startMemoryCleanup(): void {
    // Clean up expired memory cache entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.memoryCache.entries()) {
        if (now - entry.timestamp > entry.ttl * 1000) {
          this.memoryCache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  generateImageHash(imageUrl: string, additionalData?: any): string {
    const hash = createHash('sha256');
    hash.update(imageUrl);
    
    if (additionalData) {
      hash.update(safeStringify(additionalData));
    }
    
    return hash.digest('hex');
  }

  generateKey(namespace: string, identifier: string): string {
    return `${namespace}:${identifier}`;
  }

  async get<T>(key: string, useMemoryCache: boolean = true): Promise<T | null> {
    this.stats.operations.gets++;

    try {
      // Check memory cache first if enabled
      if (useMemoryCache && this.memoryCache.has(key)) {
        const entry = this.memoryCache.get(key)!;
        const now = Date.now();
        
        if (now - entry.timestamp < entry.ttl * 1000) {
          entry.hits++;
          this.stats.operations.hits++;
          return entry.data as T;
        } else {
          this.memoryCache.delete(key);
        }
      }

      // Check Redis cache
      const result = await this.redis.get(key);
      
      if (result) {
        const entry: CacheEntry<T> = JSON.parse(result);
        
        // Update memory cache if enabled
        if (useMemoryCache) {
          this.memoryCache.set(key, {
            ...entry,
            hits: entry.hits + 1,
          });
        }

        this.stats.operations.hits++;
        return entry.data;
      }

      this.stats.operations.misses++;
      return null;

    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.operations.misses++;
      return null;
    }
  }

  async set<T>(
    key: string,
    data: T,
    ttl: number = this.config.defaultTTL,
    tags: string[] = [],
    useMemoryCache: boolean = true
  ): Promise<boolean> {
    this.stats.operations.sets++;

    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        hits: 0,
        tags,
      };

      // Set in Redis with expiration
      await this.redis.setex(key, ttl, JSON.stringify(entry));

      // Set in memory cache if enabled
      if (useMemoryCache) {
        this.memoryCache.set(key, entry);
      }

      // Update tag index for cache invalidation
      if (tags.length > 0) {
        await this.updateTagIndex(key, tags);
      }

      return true;

    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    this.stats.operations.deletes++;

    try {
      // Remove from memory cache
      this.memoryCache.delete(key);

      // Remove from Redis
      const result = await this.redis.del(key);
      
      return result > 0;

    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    let deletedCount = 0;

    try {
      for (const tag of tags) {
        const tagKey = `tags:${tag}`;
        const keys = await this.redis.smembers(tagKey);
        
        if (keys.length > 0) {
          // Delete all keys with this tag
          const pipeline = this.redis.pipeline();
          keys.forEach(key => {
            pipeline.del(key);
            this.memoryCache.delete(key);
          });
          
          // Remove the tag index
          pipeline.del(tagKey);
          
          const results = await pipeline.exec();
          deletedCount += results?.filter(([err, result]) => !err && result === 1).length || 0;
        }
      }

      return deletedCount;

    } catch (error) {
      console.error('Cache invalidate by tags error:', error);
      return 0;
    }
  }

  private async updateTagIndex(key: string, tags: string[]): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      tags.forEach(tag => {
        const tagKey = `tags:${tag}`;
        pipeline.sadd(tagKey, key);
        pipeline.expire(tagKey, this.config.defaultTTL);
      });
      
      await pipeline.exec();

    } catch (error) {
      console.error('Tag index update error:', error);
    }
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.config.defaultTTL,
    tags: string[] = []
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, ttl, tags);
    
    return data;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const results = await this.redis.mget(...keys);
      
      return results.map(result => {
        if (result) {
          try {
            const entry: CacheEntry<T> = JSON.parse(result);
            return entry.data;
          } catch {
            return null;
          }
        }
        return null;
      });

    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset<T>(entries: Array<{ key: string; data: T; ttl?: number; tags?: string[] }>): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      
      entries.forEach(({ key, data, ttl = this.config.defaultTTL, tags = [] }) => {
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          ttl,
          hits: 0,
          tags,
        };
        
        pipeline.setex(key, ttl, JSON.stringify(entry));
        
        // Update tag indexes
        if (tags.length > 0) {
          tags.forEach(tag => {
            const tagKey = `tags:${tag}`;
            pipeline.sadd(tagKey, key);
            pipeline.expire(tagKey, ttl);
          });
        }
      });
      
      await pipeline.exec();
      return true;

    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;

      const totalOperations = this.stats.operations.hits + this.stats.operations.misses;
      
      return {
        ...this.stats,
        totalKeys: await this.redis.dbsize(),
        hitRate: totalOperations > 0 ? this.stats.operations.hits / totalOperations : 0,
        missRate: totalOperations > 0 ? this.stats.operations.misses / totalOperations : 0,
        memoryUsage,
      };

    } catch (error) {
      console.error('Cache stats error:', error);
      return this.stats;
    }
  }

  async flush(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      this.memoryCache.clear();
      
      // Reset stats
      this.stats.operations = {
        gets: 0,
        sets: 0,
        deletes: 0,
        hits: 0,
        misses: 0,
      };
      
      return true;

    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

// Singleton cache instance
let cacheInstance: RedisCache | null = null;

export function getCache(config?: Partial<CacheConfig>): RedisCache {
  if (!cacheInstance) {
    cacheInstance = new RedisCache(config);
  }
  return cacheInstance;
}

// Cache warming utilities
export class CacheWarmer {
  private cache: RedisCache;

  constructor(cache: RedisCache) {
    this.cache = cache;
  }

  async warmImageDescriptions(imageUrls: string[], fetcher: (url: string) => Promise<any>): Promise<void> {
    const promises = imageUrls.map(async (url) => {
      const hash = this.cache.generateImageHash(url);
      const key = this.cache.generateKey('image_description', hash);
      
      const cached = await this.cache.get(key);
      if (!cached) {
        try {
          const description = await fetcher(url);
          await this.cache.set(key, description, 3600, ['image_descriptions']);
        } catch (error) {
          console.warn('Cache warming failed for', url, error);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  async warmPopularContent(contentIds: string[], fetcher: (id: string) => Promise<any>): Promise<void> {
    const promises = contentIds.map(async (id) => {
      const key = this.cache.generateKey('popular_content', id);
      
      const cached = await this.cache.get(key);
      if (!cached) {
        try {
          const content = await fetcher(id);
          await this.cache.set(key, content, 7200, ['popular_content']); // 2 hours TTL
        } catch (error) {
          console.warn('Cache warming failed for content', id, error);
        }
      }
    });

    await Promise.allSettled(promises);
  }
}

export function createCacheWarmer(cache?: RedisCache): CacheWarmer {
  return new CacheWarmer(cache || getCache());
}