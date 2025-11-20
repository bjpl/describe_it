/**
 * Cache Wrapper with Multiple Backend Support
 * Supports: Vercel KV (primary), Redis, In-Memory (fallback)
 */

import { kv } from '@vercel/kv';
import { logger } from '@/lib/logger';

// Cache configuration from environment
const ENABLE_REDIS = process.env.ENABLE_REDIS_CACHE === 'true';
const ENABLE_MEMORY_FALLBACK = process.env.ENABLE_MEMORY_CACHE_FALLBACK !== 'false';
const MAX_CACHE_SIZE = parseInt(process.env.MAX_CACHE_SIZE || '1000', 10);
const DEFAULT_TTL = parseInt(process.env.DEFAULT_CACHE_TTL || '3600', 10);

// Cache TTL strategies (in seconds)
export const CacheTTL = {
  USER_PROGRESS: 5 * 60, // 5 minutes
  VOCABULARY_LIST: 10 * 60, // 10 minutes
  STATIC_CONTENT: 60 * 60, // 1 hour
  DESCRIPTION: 30 * 60, // 30 minutes
  SESSION: 15 * 60, // 15 minutes
  SHORT: 2 * 60, // 2 minutes
  DEFAULT: DEFAULT_TTL, // From env
} as const;

// In-memory cache fallback
class MemoryCache {
  private cache = new Map<string, { value: unknown; expires: number }>();
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const item = this.cache.get(key);

    if (!item) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return item.value as T;
  }

  async set(key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits / (this.hits + this.misses) || 0,
    };
  }
}

// Initialize memory cache
const memoryCache = new MemoryCache();

/**
 * Cache key builder with namespace support
 */
export function buildCacheKey(namespace: string, ...parts: (string | number)[]): string {
  return `${namespace}:${parts.join(':')}`;
}

/**
 * Universal cache interface
 */
export interface CacheInterface {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
  clear(): Promise<void>;
  getStats?(): Promise<Record<string, unknown>> | Record<string, unknown>;
}

/**
 * Vercel KV cache wrapper
 */
class VercelKVCache implements CacheInterface {
  private hits = 0;
  private misses = 0;

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = await kv.get<T>(key);
      if (value !== null) {
        this.hits++;
      } else {
        this.misses++;
      }
      return value;
    } catch (error) {
      logger.error('[Cache] Vercel KV get error:', error);
      // Fallback to memory cache
      if (ENABLE_MEMORY_FALLBACK) {
        return memoryCache.get<T>(key);
      }
      return null;
    }
  }

  async set(key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
    try {
      await kv.set(key, value, { ex: ttl });
      // Also set in memory cache for faster access
      if (ENABLE_MEMORY_FALLBACK) {
        await memoryCache.set(key, value, ttl);
      }
    } catch (error) {
      logger.error('[Cache] Vercel KV set error:', error);
      // Fallback to memory cache
      if (ENABLE_MEMORY_FALLBACK) {
        await memoryCache.set(key, value, ttl);
      }
    }
  }

  async del(key: string): Promise<void> {
    try {
      await kv.del(key);
      if (ENABLE_MEMORY_FALLBACK) {
        await memoryCache.del(key);
      }
    } catch (error) {
      logger.error('[Cache] Vercel KV del error:', error);
      if (ENABLE_MEMORY_FALLBACK) {
        await memoryCache.del(key);
      }
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      // Vercel KV doesn't support pattern deletion, so we'll need to scan
      // For now, log a warning and rely on TTL expiration
      logger.warn('[Cache] Pattern deletion not fully supported on Vercel KV:', { pattern });

      if (ENABLE_MEMORY_FALLBACK) {
        await memoryCache.delPattern(pattern);
      }
    } catch (error) {
      logger.error('[Cache] Vercel KV delPattern error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      // Vercel KV doesn't have a clear all method
      logger.warn('[Cache] Clear all not supported on Vercel KV');
      if (ENABLE_MEMORY_FALLBACK) {
        await memoryCache.clear();
      }
    } catch (error) {
      logger.error('[Cache] Vercel KV clear error:', error);
    }
  }

  getStats() {
    return {
      provider: 'vercel-kv',
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits / (this.hits + this.misses) || 0,
      memoryCache: ENABLE_MEMORY_FALLBACK ? memoryCache.getStats() : null,
    };
  }
}

/**
 * Get the appropriate cache backend
 */
function getCacheBackend(): CacheInterface {
  // Check if Vercel KV is configured
  const hasVercelKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

  if (hasVercelKV) {
    return new VercelKVCache();
  }

  // Fallback to memory cache
  logger.warn('[Cache] Using in-memory cache fallback');
  return memoryCache;
}

// Export singleton cache instance
export const cache = getCacheBackend();

/**
 * Cache wrapper with automatic key building
 */
export class CacheManager {
  constructor(private namespace: string) {}

  async get<T = unknown>(...keyParts: (string | number)[]): Promise<T | null> {
    const key = buildCacheKey(this.namespace, ...keyParts);
    return cache.get<T>(key);
  }

  async set(value: unknown, ttl: number, ...keyParts: (string | number)[]): Promise<void> {
    const key = buildCacheKey(this.namespace, ...keyParts);
    await cache.set(key, value, ttl);
  }

  async del(...keyParts: (string | number)[]): Promise<void> {
    const key = buildCacheKey(this.namespace, ...keyParts);
    await cache.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const fullPattern = buildCacheKey(this.namespace, pattern);
    await cache.delPattern(fullPattern);
  }

  async invalidate(...keyParts: (string | number)[]): Promise<void> {
    await this.del(...keyParts);
  }

  async getOrSet<T = unknown>(
    fetcher: () => Promise<T>,
    ttl: number,
    ...keyParts: (string | number)[]
  ): Promise<T> {
    const key = buildCacheKey(this.namespace, ...keyParts);

    // Try to get from cache
    const cached = await cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    const value = await fetcher();
    await cache.set(key, value, ttl);
    return value;
  }
}

/**
 * Pre-configured cache managers for different data types
 */
export const progressCache = new CacheManager('progress');
export const vocabularyCache = new CacheManager('vocabulary');
export const descriptionCache = new CacheManager('description');
export const sessionCache = new CacheManager('session');

/**
 * Cache warming - preload common data
 */
export async function warmCache(userId: string): Promise<void> {
  // This would be called on login to preload user data
  // Implementation depends on your data fetching logic
  logger.info('Warming cache for user', { userId, operation: 'cache-warm' });
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<Record<string, unknown>> {
  if (cache.getStats) {
    return cache.getStats();
  }
  return { provider: 'unknown' };
}

/**
 * Cache invalidation patterns
 */
export const CacheInvalidation = {
  // Invalidate all user progress
  async invalidateUserProgress(userId: string): Promise<void> {
    await progressCache.delPattern(`${userId}:*`);
  },

  // Invalidate specific vocabulary list
  async invalidateVocabularyList(userId: string, listId: string): Promise<void> {
    await vocabularyCache.del(userId, 'list', listId);
    await vocabularyCache.delPattern(`${userId}:lists:*`);
  },

  // Invalidate all vocabulary for user
  async invalidateUserVocabulary(userId: string): Promise<void> {
    await vocabularyCache.delPattern(`${userId}:*`);
  },

  // Invalidate user session
  async invalidateSession(userId: string): Promise<void> {
    await sessionCache.delPattern(`${userId}:*`);
  },
} as const;

/**
 * Cache middleware wrapper for API routes
 */
export function withCache<T>(
  key: string | ((...args: unknown[]) => string),
  ttl: number,
  handler: (...args: unknown[]) => Promise<T>
) {
  return async (...args: unknown[]): Promise<T> => {
    const cacheKey = typeof key === 'function' ? key(...args) : key;

    // Try cache first
    const cached = await cache.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Execute handler
    const result = await handler(...args);

    // Cache result
    await cache.set(cacheKey, result, ttl);

    return result;
  };
}
