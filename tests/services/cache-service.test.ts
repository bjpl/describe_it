/**
 * Cache Service Comprehensive Tests
 * Tests src/lib/cache/enhanced-cache.ts and related cache implementations
 * Priority: HIGH - Performance critical component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Redis client
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  expire: vi.fn(),
  keys: vi.fn(),
  mget: vi.fn(),
  mset: vi.fn(),
  flushdb: vi.fn()
};

vi.mock('ioredis', () => ({
  default: vi.fn(() => mockRedis)
}));

vi.mock('../../src/lib/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('Cache Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Memory Cache', () => {
    it('should store and retrieve values from memory', async () => {
      const { MemoryCache } = await import('../../src/lib/cache/memory-cache');
      const cache = new MemoryCache({ maxSize: 100 });

      await cache.set('key1', 'value1');
      const value = await cache.get('key1');

      expect(value).toBe('value1');
    });

    it('should respect TTL for cached items', async () => {
      const { MemoryCache } = await import('../../src/lib/cache/memory-cache');
      const cache = new MemoryCache();

      await cache.set('key1', 'value1', { ttl: 100 }); // 100ms TTL

      // Immediately should exist
      expect(await cache.get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(await cache.get('key1')).toBeNull();
    });

    it('should evict oldest items when cache is full (LRU)', async () => {
      const { MemoryCache } = await import('../../src/lib/cache/memory-cache');
      const cache = new MemoryCache({ maxSize: 3 });

      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      await cache.set('key4', 'value4'); // Should evict key1

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key4')).toBe('value4');
    });

    it('should handle complex objects', async () => {
      const { MemoryCache } = await import('../../src/lib/cache/memory-cache');
      const cache = new MemoryCache();

      const complexObj = {
        id: 123,
        data: { nested: true },
        array: [1, 2, 3]
      };

      await cache.set('complex', complexObj);
      const retrieved = await cache.get('complex');

      expect(retrieved).toEqual(complexObj);
    });
  });

  describe('Redis Cache', () => {
    it('should store and retrieve from Redis', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ data: 'test' }));
      mockRedis.set.mockResolvedValue('OK');

      const { RedisCache } = await import('../../src/lib/cache/redis-cache');
      const cache = new RedisCache();

      await cache.set('key1', { data: 'test' });
      const value = await cache.get('key1');

      expect(mockRedis.set).toHaveBeenCalled();
      expect(value).toEqual({ data: 'test' });
    });

    it('should set TTL on Redis keys', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const { RedisCache } = await import('../../src/lib/cache/redis-cache');
      const cache = new RedisCache();

      await cache.set('key1', 'value1', { ttl: 3600 });

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'EX',
        3600
      );
    });

    it('should handle Redis connection failures gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const { RedisCache } = await import('../../src/lib/cache/redis-cache');
      const cache = new RedisCache();

      const value = await cache.get('key1');

      expect(value).toBeNull();
    });

    it('should batch operations with mget/mset', async () => {
      mockRedis.mget.mockResolvedValue([
        JSON.stringify('value1'),
        JSON.stringify('value2')
      ]);

      const { RedisCache } = await import('../../src/lib/cache/redis-cache');
      const cache = new RedisCache();

      const values = await cache.mget(['key1', 'key2']);

      expect(values).toEqual(['value1', 'value2']);
      expect(mockRedis.mget).toHaveBeenCalledWith(['key1', 'key2']);
    });
  });

  describe('Tiered Cache (Memory + Redis)', () => {
    it('should check memory cache first, then Redis', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify('redis-value'));

      const { TieredCache } = await import('../../src/lib/cache/tiered-cache');
      const cache = new TieredCache();

      // First get - should hit Redis and populate memory
      const value1 = await cache.get('key1');
      expect(mockRedis.get).toHaveBeenCalledTimes(1);

      // Second get - should hit memory cache
      const value2 = await cache.get('key1');
      expect(mockRedis.get).toHaveBeenCalledTimes(1); // Not called again

      expect(value1).toBe(value2);
    });

    it('should write to both memory and Redis on set', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const { TieredCache } = await import('../../src/lib/cache/tiered-cache');
      const cache = new TieredCache();

      await cache.set('key1', 'value1');

      expect(mockRedis.set).toHaveBeenCalled();

      // Verify memory cache was also updated
      const memValue = await cache.get('key1');
      expect(memValue).toBe('value1');
    });

    it('should invalidate both caches on delete', async () => {
      mockRedis.del.mockResolvedValue(1);

      const { TieredCache } = await import('../../src/lib/cache/tiered-cache');
      const cache = new TieredCache();

      await cache.set('key1', 'value1');
      await cache.delete('key1');

      const value = await cache.get('key1');
      expect(value).toBeNull();
      expect(mockRedis.del).toHaveBeenCalledWith('key1');
    });
  });

  describe('Enhanced Cache Features', () => {
    it('should support cache tags for bulk invalidation', async () => {
      const { EnhancedCache } = await import('../../src/lib/cache/enhanced-cache');
      const cache = new EnhancedCache();

      await cache.set('user:1', { name: 'User 1' }, { tags: ['user'] });
      await cache.set('user:2', { name: 'User 2' }, { tags: ['user'] });
      await cache.set('post:1', { title: 'Post 1' }, { tags: ['post'] });

      await cache.invalidateByTag('user');

      expect(await cache.get('user:1')).toBeNull();
      expect(await cache.get('user:2')).toBeNull();
      expect(await cache.get('post:1')).not.toBeNull();
    });

    it('should implement cache-aside pattern', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'fetched' });

      const { EnhancedCache } = await import('../../src/lib/cache/enhanced-cache');
      const cache = new EnhancedCache();

      // First call - should execute fetchFn
      const value1 = await cache.getOrSet('key1', fetchFn);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(value1).toEqual({ data: 'fetched' });

      // Second call - should use cache
      const value2 = await cache.getOrSet('key1', fetchFn);
      expect(fetchFn).toHaveBeenCalledTimes(1); // Not called again
      expect(value2).toEqual({ data: 'fetched' });
    });

    it('should prevent cache stampede with locking', async () => {
      const slowFetch = vi.fn(() =>
        new Promise(resolve => setTimeout(() => resolve('data'), 100))
      );

      const { EnhancedCache } = await import('../../src/lib/cache/enhanced-cache');
      const cache = new EnhancedCache();

      // Simulate concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        cache.getOrSet('slow-key', slowFetch)
      );

      await Promise.all(promises);

      // Should only call fetch once due to locking
      expect(slowFetch).toHaveBeenCalledTimes(1);
    });

    it('should track cache hit/miss statistics', async () => {
      const { EnhancedCache } = await import('../../src/lib/cache/enhanced-cache');
      const cache = new EnhancedCache({ enableStats: true });

      await cache.set('key1', 'value1');

      await cache.get('key1'); // Hit
      await cache.get('key2'); // Miss
      await cache.get('key1'); // Hit

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.666, 2);
    });
  });

  describe('Error Handling & Resilience', () => {
    it('should fallback to memory when Redis fails', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis down'));
      mockRedis.set.mockRejectedValue(new Error('Redis down'));

      const { TieredCache } = await import('../../src/lib/cache/tiered-cache');
      const cache = new TieredCache();

      await cache.set('key1', 'value1');
      const value = await cache.get('key1');

      expect(value).toBe('value1'); // Should work via memory cache
    });

    it('should handle serialization errors', async () => {
      const { EnhancedCache } = await import('../../src/lib/cache/enhanced-cache');
      const cache = new EnhancedCache();

      const circularObj: any = { name: 'circular' };
      circularObj.self = circularObj; // Circular reference

      await expect(cache.set('circular', circularObj)).rejects.toThrow();
    });

    it('should clear all caches on flush', async () => {
      mockRedis.flushdb.mockResolvedValue('OK');

      const { TieredCache } = await import('../../src/lib/cache/tiered-cache');
      const cache = new TieredCache();

      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.flush();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(mockRedis.flushdb).toHaveBeenCalled();
    });
  });
});
