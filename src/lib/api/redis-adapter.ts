import { CacheEntry } from '../../types/api';
import { apiLogger } from '@/lib/logger';

// Simple in-memory cache implementation
class MemoryCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private maxSize = 1000;

  set(key: string, value: any, ttlSeconds: number): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    const expires = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data: value, expires });
  }

  get(key: string): any {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  keys(pattern: string): string[] {
    const keys: string[] = [];
    for (const key of this.cache.keys()) {
      if (pattern === '*' || key.includes(pattern.replace('*', ''))) {
        keys.push(key);
      }
    }
    return keys;
  }

  getStats() {
    return { size: this.cache.size };
  }

  clear(): void {
    this.cache.clear();
  }
}

const memoryCache = new MemoryCache();

// Simplified cache adapter using memory only
class RedisAdapter {
  private defaultTTL: number = 3600; // 1 hour default
  private keyPrefix: string = 'describe_it:';

  constructor() {
    apiLogger.info('Using memory-only cache adapter');
  }

  private getPrefixedKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async set<T = any>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);
    memoryCache.set(prefixedKey, value, ttl);
  }

  async get<T = any>(key: string): Promise<T | null> {
    const prefixedKey = this.getPrefixedKey(key);
    return memoryCache.get(prefixedKey) as T | null;
  }

  async delete(key: string): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(key);
    memoryCache.delete(prefixedKey);
    return true;
  }

  async exists(key: string): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(key);
    return memoryCache.has(prefixedKey);
  }

  async mget<T = any>(keys: string[]): Promise<Array<T | null>> {
    return keys.map(key => memoryCache.get(this.getPrefixedKey(key)) as T | null);
  }

  async mset<T = any>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    for (const { key, value, ttl = this.defaultTTL } of entries) {
      const prefixedKey = this.getPrefixedKey(key);
      memoryCache.set(prefixedKey, value, ttl);
    }
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    const allKeys = memoryCache.keys(this.keyPrefix + pattern);
    return allKeys.map(key => key.replace(this.keyPrefix, ''));
  }

  async clear(pattern: string = '*'): Promise<number> {
    const keys = await this.keys(pattern);
    keys.forEach(key => memoryCache.delete(this.getPrefixedKey(key)));
    return keys.length;
  }

  async getStats(): Promise<{
    totalKeys: number;
    keysByPrefix: Record<string, number>;
    isAvailable: boolean;
  }> {
    const memStats = memoryCache.getStats();
    const allKeys = await this.keys('*');
    const keysByPrefix: Record<string, number> = {};

    allKeys.forEach(key => {
      const prefix = key.split(':')[0] || 'no-prefix';
      keysByPrefix[prefix] = (keysByPrefix[prefix] || 0) + 1;
    });

    return {
      totalKeys: memStats.size,
      keysByPrefix,
      isAvailable: true,
    };
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
    return true; // Memory cache is always available
  }
}

export const redisCache = new RedisAdapter();