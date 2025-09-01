/**
 * High-performance in-memory cache with LRU eviction
 * Supports TTL, automatic cleanup, and memory management
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  totalItems: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  memoryEstimate: number; // rough estimate in bytes
}

export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>(); // key -> access timestamp
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    cleanups: 0
  };

  constructor(maxSize: number = 1000, defaultTTL: number = 3600000) { // 1 hour default TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    
    // Start periodic cleanup every 5 minutes
    this.startCleanupTimer();
  }

  /**
   * Set a value in the cache with optional TTL
   */
  set(key: string, value: T, ttlSeconds?: number): void {
    const now = Date.now();
    const ttl = (ttlSeconds ?? (this.defaultTTL / 1000)) * 1000; // convert to ms
    
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: now,
      ttl,
      accessCount: 1,
      lastAccessed: now
    };

    // If key exists, just update it
    if (this.cache.has(key)) {
      this.cache.set(key, entry);
      this.accessOrder.set(key, now);
      this.stats.sets++;
      return;
    }

    // Check if we need to evict
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, now);
    this.stats.sets++;
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.accessOrder.set(key, now);
    this.stats.hits++;
    
    return entry.data;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    this.accessOrder.delete(key);
    
    if (existed) {
      this.stats.deletes++;
    }
    
    return existed;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get multiple values at once
   */
  mget(keys: string[]): Array<T | null> {
    return keys.map(key => this.get(key));
  }

  /**
   * Set multiple values at once
   */
  mset(entries: Array<{ key: string; value: T; ttl?: number }>): void {
    entries.forEach(({ key, value, ttl }) => {
      this.set(key, value, ttl);
    });
  }

  /**
   * Get all keys (non-expired only)
   */
  keys(pattern?: string): string[] {
    const now = Date.now();
    const validKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      // Skip expired entries
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
        continue;
      }

      // Apply pattern filter if provided
      if (pattern && pattern !== '*') {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        if (!regex.test(key)) {
          continue;
        }
      }

      validKeys.push(key);
    }

    return validKeys;
  }

  /**
   * Clear all entries or entries matching a pattern
   */
  clear(pattern?: string): number {
    if (!pattern || pattern === '*') {
      const size = this.cache.size;
      this.cache.clear();
      this.accessOrder.clear();
      return size;
    }

    const keysToDelete = this.keys(pattern);
    keysToDelete.forEach(key => this.delete(key));
    return keysToDelete.length;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const now = Date.now();
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;
    let memoryEstimate = 0;

    // Calculate stats from valid entries only
    const validEntries: CacheEntry<T>[] = [];
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp <= entry.ttl) {
        validEntries.push(entry);
        
        if (oldestEntry === null || entry.timestamp < oldestEntry) {
          oldestEntry = entry.timestamp;
        }
        if (newestEntry === null || entry.timestamp > newestEntry) {
          newestEntry = entry.timestamp;
        }

        // Rough memory estimate (very approximate)
        memoryEstimate += JSON.stringify(entry.data).length * 2; // UTF-16
        memoryEstimate += key.length * 2;
        memoryEstimate += 100; // overhead per entry
      }
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      size: validEntries.length,
      maxSize: this.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      totalItems: this.cache.size,
      oldestEntry,
      newestEntry,
      memoryEstimate
    };
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<R = T>(
    key: string,
    fetcher: () => Promise<R>,
    ttlSeconds?: number
  ): Promise<R> {
    const cached = this.get(key) as R | null;
    
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value as unknown as T, ttlSeconds);
    return value;
  }

  /**
   * Increment a numeric value
   */
  increment(key: string, delta: number = 1, ttlSeconds?: number): number {
    const current = this.get(key);
    const newValue = (typeof current === 'number' ? current : 0) + delta;
    this.set(key, newValue as unknown as T, ttlSeconds);
    return newValue;
  }

  /**
   * Set with callback on expiration
   */
  setWithCallback(
    key: string, 
    value: T, 
    ttlSeconds: number,
    onExpire: (key: string, value: T) => void
  ): void {
    this.set(key, value, ttlSeconds);
    
    setTimeout(() => {
      const entry = this.cache.get(key);
      if (entry && entry.data === value) {
        onExpire(key, value);
        this.delete(key);
      }
    }, ttlSeconds * 1000);
  }

  /**
   * Batch operations for performance
   */
  batch<R>(operations: Array<{
    type: 'get' | 'set' | 'delete';
    key: string;
    value?: T;
    ttl?: number;
  }>): Array<R | boolean | null> {
    return operations.map(op => {
      switch (op.type) {
        case 'get':
          return this.get(op.key) as R;
        case 'set':
          if (op.value !== undefined) {
            this.set(op.key, op.value, op.ttl);
            return true;
          }
          return false;
        case 'delete':
          return this.delete(op.key);
        default:
          return null;
      }
    });
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    try {
      const testKey = '__health_check__';
      const testValue = 'ok' as T;
      
      this.set(testKey, testValue, 10);
      const retrieved = this.get(testKey);
      this.delete(testKey);
      
      return retrieved === testValue;
    } catch {
      return false;
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.size === 0) {
      return;
    }

    // Find the key with the oldest access time
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
    this.stats.cleanups++;
    
    if (keysToDelete.length > 0) {
      console.log(`Memory cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup timer
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get detailed entry information for debugging
   */
  inspect(key: string): CacheEntry<T> | null {
    return this.cache.get(key) || null;
  }

  /**
   * Export cache data for persistence
   */
  export(): Record<string, { data: T; ttl: number; timestamp: number }> {
    const exported: Record<string, { data: T; ttl: number; timestamp: number }> = {};
    
    for (const [key, entry] of this.cache) {
      exported[key] = {
        data: entry.data,
        ttl: entry.ttl,
        timestamp: entry.timestamp
      };
    }

    return exported;
  }

  /**
   * Import cache data from persistence
   */
  import(data: Record<string, { data: T; ttl: number; timestamp: number }>): number {
    let importedCount = 0;
    const now = Date.now();

    for (const [key, entry] of Object.entries(data)) {
      // Skip expired entries
      if (now - entry.timestamp > entry.ttl) {
        continue;
      }

      const remainingTTL = Math.max(0, entry.ttl - (now - entry.timestamp));
      this.set(key, entry.data, remainingTTL / 1000);
      importedCount++;
    }

    return importedCount;
  }
}

// Export singleton instance for app-wide usage
export const memoryCache = new MemoryCache(
  parseInt(process.env.MAX_CACHE_SIZE || '1000'),
  parseInt(process.env.DEFAULT_CACHE_TTL || '3600')
);

// Graceful shutdown cleanup
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    memoryCache.stop();
  });
}

export default MemoryCache;