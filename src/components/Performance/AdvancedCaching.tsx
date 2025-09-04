"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Trash2, RefreshCw, HardDrive, Zap } from "lucide-react";

interface CacheEntry {
  key: string;
  size: number;
  createdAt: number;
  lastAccessed: number;
  hitCount: number;
  type: "api" | "image" | "static" | "computed";
  ttl?: number;
}

interface CacheStats {
  totalSize: number;
  totalEntries: number;
  hitRate: number;
  missRate: number;
  entries: CacheEntry[];
  typeStats: Record<string, { count: number; size: number }>;
}

interface AdvancedCachingProps {
  enabled?: boolean;
  onCacheAction?: (action: string, key?: string) => void;
}

// Enhanced cache manager with multiple strategies
class AdvancedCacheManager {
  private caches = new Map<string, Map<string, CacheEntry>>();
  private stats = new Map<string, { hits: number; misses: number }>();
  private maxSize = 50 * 1024 * 1024; // 50MB default
  private maxEntries = 1000;

  constructor() {
    this.initializeCaches();
    this.startCleanupInterval();
  }

  private initializeCaches() {
    this.caches.set("api", new Map());
    this.caches.set("image", new Map());
    this.caches.set("static", new Map());
    this.caches.set("computed", new Map());

    this.stats.set("api", { hits: 0, misses: 0 });
    this.stats.set("image", { hits: 0, misses: 0 });
    this.stats.set("static", { hits: 0, misses: 0 });
    this.stats.set("computed", { hits: 0, misses: 0 });
  }

  // LRU (Least Recently Used) strategy
  private evictLRU(cacheType: string) {
    const cache = this.caches.get(cacheType);
    if (!cache) return;

    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Remove oldest 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      cache.delete(entries[i][0]);
    }
  }

  // Time-based expiration
  private evictExpired() {
    const now = Date.now();

    for (const [cacheType, cache] of this.caches) {
      for (const [key, entry] of cache) {
        if (entry.ttl && now - entry.createdAt > entry.ttl) {
          cache.delete(key);
        }
      }
    }
  }

  // Size-based eviction
  private checkSizeLimit() {
    const totalSize = this.getTotalSize();
    const totalEntries = this.getTotalEntries();

    if (totalSize > this.maxSize || totalEntries > this.maxEntries) {
      // Evict from largest cache first
      const cacheSizes = Array.from(this.caches.entries()).map(
        ([type, cache]) => ({
          type,
          size: Array.from(cache.values()).reduce(
            (sum, entry) => sum + entry.size,
            0,
          ),
        }),
      );

      cacheSizes.sort((a, b) => b.size - a.size);
      this.evictLRU(cacheSizes[0].type);
    }
  }

  set(cacheType: string, key: string, data: any, ttl?: number): void {
    const cache = this.caches.get(cacheType);
    if (!cache) return;

    const size = this.estimateSize(data);
    const entry: CacheEntry = {
      key,
      size,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      hitCount: 0,
      type: cacheType as any,
      ttl,
    };

    cache.set(key, entry);
    this.checkSizeLimit();
  }

  get(cacheType: string, key: string): CacheEntry | null {
    const cache = this.caches.get(cacheType);
    const stats = this.stats.get(cacheType);

    if (!cache || !stats) return null;

    const entry = cache.get(key);
    if (entry) {
      // Check expiration
      if (entry.ttl && Date.now() - entry.createdAt > entry.ttl) {
        cache.delete(key);
        stats.misses++;
        return null;
      }

      // Update access stats
      entry.lastAccessed = Date.now();
      entry.hitCount++;
      stats.hits++;
      return entry;
    }

    stats.misses++;
    return null;
  }

  delete(cacheType: string, key: string): boolean {
    const cache = this.caches.get(cacheType);
    return cache?.delete(key) || false;
  }

  clear(cacheType?: string): void {
    if (cacheType) {
      this.caches.get(cacheType)?.clear();
      this.stats.set(cacheType, { hits: 0, misses: 0 });
    } else {
      this.caches.forEach((cache) => cache.clear());
      this.stats.forEach((_, key) =>
        this.stats.set(key, { hits: 0, misses: 0 }),
      );
    }
  }

  getStats(): CacheStats {
    const entries: CacheEntry[] = [];
    const typeStats: Record<string, { count: number; size: number }> = {};
    let totalHits = 0;
    let totalMisses = 0;

    for (const [cacheType, cache] of this.caches) {
      const cacheEntries = Array.from(cache.values());
      entries.push(...cacheEntries);

      const stats = this.stats.get(cacheType) || { hits: 0, misses: 0 };
      totalHits += stats.hits;
      totalMisses += stats.misses;

      typeStats[cacheType] = {
        count: cacheEntries.length,
        size: cacheEntries.reduce((sum, entry) => sum + entry.size, 0),
      };
    }

    const totalRequests = totalHits + totalMisses;

    return {
      totalSize: this.getTotalSize(),
      totalEntries: entries.length,
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? (totalMisses / totalRequests) * 100 : 0,
      entries,
      typeStats,
    };
  }

  private getTotalSize(): number {
    let total = 0;
    for (const cache of this.caches.values()) {
      for (const entry of cache.values()) {
        total += entry.size;
      }
    }
    return total;
  }

  private getTotalEntries(): number {
    let total = 0;
    for (const cache of this.caches.values()) {
      total += cache.size;
    }
    return total;
  }

  private estimateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 1024; // Default 1KB if estimation fails
    }
  }

  private startCleanupInterval() {
    setInterval(() => {
      this.evictExpired();
      this.checkSizeLimit();
    }, 60000); // Every minute
  }
}

// Global cache manager instance
const cacheManager = new AdvancedCacheManager();

export const AdvancedCaching: React.FC<AdvancedCachingProps> = ({
  enabled = true,
  onCacheAction,
}) => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"size" | "age" | "hits">("size");

  useEffect(() => {
    if (!enabled) return;

    const updateStats = () => {
      setStats(cacheManager.getStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, [enabled]);

  const filteredEntries = useMemo(() => {
    if (!stats) return [];

    let entries =
      selectedType === "all"
        ? stats.entries
        : stats.entries.filter((entry) => entry.type === selectedType);

    return entries.sort((a, b) => {
      switch (sortBy) {
        case "size":
          return b.size - a.size;
        case "age":
          return b.createdAt - a.createdAt;
        case "hits":
          return b.hitCount - a.hitCount;
        default:
          return 0;
      }
    });
  }, [stats, selectedType, sortBy]);

  const formatSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatAge = (timestamp: number) => {
    const age = Date.now() - timestamp;
    const minutes = Math.floor(age / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  const handleClearCache = (type?: string) => {
    cacheManager.clear(type);
    setStats(cacheManager.getStats());
    onCacheAction?.("clear", type);
  };

  const handleDeleteEntry = (cacheType: string, key: string) => {
    cacheManager.delete(cacheType, key);
    setStats(cacheManager.getStats());
    onCacheAction?.("delete", key);
  };

  if (!enabled || !stats) return null;

  return (
    <div className="fixed top-4 left-4 z-40">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        {/* Header */}
        <div className="p-3 bg-gradient-to-r from-green-500 to-teal-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span className="text-sm font-medium">Advanced Cache</span>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              {showDetails ? "−" : "+"}
            </button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="opacity-80">Size</div>
              <div className="font-medium">{formatSize(stats.totalSize)}</div>
            </div>
            <div>
              <div className="opacity-80">Entries</div>
              <div className="font-medium">{stats.totalEntries}</div>
            </div>
            <div>
              <div className="opacity-80">Hit Rate</div>
              <div className="font-medium">{stats.hitRate.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Detailed View */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 max-w-md">
                {/* Cache Type Stats */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Cache Types</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(stats.typeStats).map(
                      ([type, typeStats]) => (
                        <div
                          key={type}
                          className={`p-2 rounded cursor-pointer transition-colors ${
                            selectedType === type
                              ? "bg-green-100 dark:bg-green-900"
                              : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                          }`}
                          onClick={() =>
                            setSelectedType(
                              selectedType === type ? "all" : type,
                            )
                          }
                        >
                          <div className="font-medium text-sm capitalize">
                            {type}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {typeStats.count} items •{" "}
                            {formatSize(typeStats.size)}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 mb-4">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                  >
                    <option value="size">Sort by Size</option>
                    <option value="age">Sort by Age</option>
                    <option value="hits">Sort by Hits</option>
                  </select>
                  <button
                    onClick={() => handleClearCache()}
                    className="bg-red-500 hover:bg-red-600 text-white p-1 rounded transition-colors"
                    title="Clear all caches"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Cache Entries */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredEntries.slice(0, 20).map((entry) => (
                    <div
                      key={`${entry.type}-${entry.key}`}
                      className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-medium truncate"
                            title={entry.key}
                          >
                            {entry.key.length > 30
                              ? `...${entry.key.slice(-27)}`
                              : entry.key}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                            <span
                              className={`px-1 rounded ${
                                entry.type === "api"
                                  ? "bg-blue-100 text-blue-700"
                                  : entry.type === "image"
                                    ? "bg-purple-100 text-purple-700"
                                    : entry.type === "static"
                                      ? "bg-gray-100 text-gray-700"
                                      : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {entry.type}
                            </span>
                            <span>{formatSize(entry.size)}</span>
                            <span>{formatAge(entry.createdAt)}</span>
                            <span>{entry.hitCount} hits</span>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleDeleteEntry(entry.type, entry.key)
                          }
                          className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredEntries.length > 20 && (
                    <div className="text-center text-xs text-gray-500 py-2">
                      ... and {filteredEntries.length - 20} more entries
                    </div>
                  )}

                  {filteredEntries.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No cache entries found
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
                <div className="flex gap-2">
                  <button
                    onClick={() => setStats(cacheManager.getStats())}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 inline mr-1" />
                    Refresh
                  </button>
                  <button
                    onClick={() =>
                      handleClearCache(
                        selectedType === "all" ? undefined : selectedType,
                      )
                    }
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    <Trash2 className="w-3 h-3 inline mr-1" />
                    Clear {selectedType === "all" ? "All" : selectedType}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// Export cache manager for use in other components
export { cacheManager };

// Hook for using the cache manager
export const useAdvancedCache = (
  cacheType: "api" | "image" | "static" | "computed",
) => {
  const set = (key: string, data: any, ttl?: number) => {
    cacheManager.set(cacheType, key, data, ttl);
  };

  const get = (key: string) => {
    return cacheManager.get(cacheType, key);
  };

  const remove = (key: string) => {
    return cacheManager.delete(cacheType, key);
  };

  const clear = () => {
    cacheManager.clear(cacheType);
  };

  return { set, get, remove, clear };
};
