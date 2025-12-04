/**
 * Query caching layer for API requests
 * Provides intelligent caching with request deduplication
 */

import { tieredCache } from './tiered-cache';
import { logger } from '@/lib/logger';

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

interface CacheOptions {
  ttl?: number;
  revalidate?: boolean;
  skipCache?: boolean;
}

/**
 * Query cache with request deduplication
 * Prevents duplicate concurrent requests for the same resource
 */
export class QueryCache {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private requestCount = 0;
  private cacheHits = 0;
  private dedupHits = 0;

  /**
   * Execute a function with caching and deduplication
   */
  async fetch<T>(key: string, fetcher: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    const { ttl = 3600, revalidate = false, skipCache = false } = options;

    this.requestCount++;

    // Check cache first (unless skipped or revalidating)
    if (!skipCache && !revalidate) {
      const cached = await tieredCache.get<T>(key);
      if (cached !== null) {
        this.cacheHits++;
        logger.debug('Cache hit', { key, hitRate: this.getHitRate() });
        return cached;
      }
    }

    // Check for pending request (deduplication)
    const pending = this.pendingRequests.get(key);
    if (pending) {
      const age = Date.now() - pending.timestamp;
      // Only deduplicate if request is recent (< 30 seconds)
      if (age < 30000) {
        this.dedupHits++;
        logger.debug('Request deduplication hit', { key, age });
        return pending.promise;
      } else {
        // Stale pending request, remove it
        this.pendingRequests.delete(key);
      }
    }

    // Execute the fetcher
    const promise = fetcher().then(
      async result => {
        // Store in cache
        if (!skipCache) {
          await tieredCache.set(key, result, { redisTTL: ttl });
        }
        // Remove from pending
        this.pendingRequests.delete(key);
        return result;
      },
      error => {
        // Remove from pending on error
        this.pendingRequests.delete(key);
        throw error;
      }
    );

    // Store pending request for deduplication
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Invalidate cached data for a key or pattern
   */
  async invalidate(pattern: string): Promise<number> {
    logger.debug('Invalidating cache', { pattern });
    return tieredCache.clear(pattern);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      cacheHits: this.cacheHits,
      dedupHits: this.dedupHits,
      hitRate: this.getHitRate(),
      dedupRate: this.getDedupRate(),
      pendingRequests: this.pendingRequests.size,
    };
  }

  /**
   * Get cache hit rate
   */
  private getHitRate(): number {
    return this.requestCount > 0 ? this.cacheHits / this.requestCount : 0;
  }

  /**
   * Get deduplication hit rate
   */
  private getDedupRate(): number {
    return this.requestCount > 0 ? this.dedupHits / this.requestCount : 0;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.requestCount = 0;
    this.cacheHits = 0;
    this.dedupHits = 0;
  }

  /**
   * Clear all pending requests
   */
  clearPending(): void {
    this.pendingRequests.clear();
  }
}

// Create singleton instance
export const queryCache = new QueryCache();

/**
 * Generate cache key from request parameters
 */
export function generateCacheKey(endpoint: string, params?: Record<string, any>): string {
  if (!params) {
    return `query:${endpoint}`;
  }

  // Sort params for consistent keys
  const sortedParams = Object.keys(params)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = params[key];
        return acc;
      },
      {} as Record<string, any>
    );

  const paramString = JSON.stringify(sortedParams);
  return `query:${endpoint}:${paramString}`;
}
