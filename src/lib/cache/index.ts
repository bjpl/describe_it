/**
 * Cache system exports
 * Centralized access to all caching functionality
 */

// ========================================
// UNIFIED CACHE SYSTEM (Recommended)
// ========================================

// Primary unified cache manager with all strategies
export { CacheManager, cacheManager, cache } from "./cache-manager";

// Cache key management
export { CacheKeys, CachePatterns, CacheKey } from "./cache-keys";
export type { CacheKeyType, CacheKeyOptions, CacheKeyPrefix } from "./cache-keys";

// Cache metrics
export { CacheMetrics, globalCacheMetrics } from "./cache-metrics";
export type {
  CacheMetricsSnapshot,
  CacheHitMissMetrics,
  CacheStrategyMetrics,
  CacheOperationMetrics,
  CachePerformanceMetrics,
} from "./cache-metrics";

// Individual strategies (for advanced use cases)
export { MemoryCacheStrategy } from "./strategies/memory-cache";
export { SessionCacheStrategy, sessionCache } from "./strategies/session-cache";
export type { CacheOptions } from "./strategies/memory-cache";

// ========================================
// LEGACY CACHE IMPLEMENTATIONS
// ========================================

// Core cache implementations (legacy)
export { memoryCache, MemoryCache } from "./memory-cache";
export {
  tieredCache,
  imageCache,
  descriptionCache,
  qaCache,
  phrasesCache,
  TieredCache,
} from "./tiered-cache";

// Default export (legacy)
export { TieredCache as default } from "./tiered-cache";

// Testing utilities
export {
  runCacheTests,
  runCachePerformanceTest,
  quickHealthCheck,
} from "./test-cache";

// Cache configuration constants
export const CACHE_CONSTANTS = {
  TTL: {
    IMAGE_SEARCH: parseInt(process.env.IMAGE_SEARCH_CACHE_TTL || "3600"), // 1 hour
    DESCRIPTIONS: parseInt(process.env.DESCRIPTION_CACHE_TTL || "86400"), // 24 hours
    QA_PAIRS: parseInt(process.env.QA_CACHE_TTL || "43200"), // 12 hours
    PHRASES: parseInt(process.env.PHRASES_CACHE_TTL || "43200"), // 12 hours
    DEFAULT: parseInt(process.env.DEFAULT_CACHE_TTL || "3600"), // 1 hour
  },
  LIMITS: {
    MAX_MEMORY_SIZE: parseInt(process.env.MAX_CACHE_SIZE || "1000"),
    MAX_KEY_LENGTH: 250,
    MAX_VALUE_SIZE: 1024 * 1024, // 1MB
  },
  SETTINGS: {
    WRITE_THROUGH: process.env.CACHE_WRITE_THROUGH === "true",
    READ_THROUGH: process.env.CACHE_READ_THROUGH !== "false",
    MEMORY_FALLBACK: process.env.ENABLE_MEMORY_CACHE_FALLBACK !== "false",
    SESSION_CACHE: process.env.ENABLE_SESSION_CACHE === "true",
  },
};

// Helper function to generate cache keys
export function generateCacheKey(
  prefix: string,
  ...parts: (string | number)[]
): string {
  return `${prefix}:${parts.join(":")}`;
}

// Helper function to get cache TTL for different content types
export function getCacheTTL(
  contentType: "images" | "descriptions" | "qa" | "phrases" | "default",
): number {
  switch (contentType) {
    case "images":
      return CACHE_CONSTANTS.TTL.IMAGE_SEARCH;
    case "descriptions":
      return CACHE_CONSTANTS.TTL.DESCRIPTIONS;
    case "qa":
      return CACHE_CONSTANTS.TTL.QA_PAIRS;
    case "phrases":
      return CACHE_CONSTANTS.TTL.PHRASES;
    default:
      return CACHE_CONSTANTS.TTL.DEFAULT;
  }
}

// Cache metrics aggregator (legacy compatibility)
export async function getAllCacheMetrics() {
  const { memoryCache } = await import("./memory-cache");
  const { tieredCache, imageCache, descriptionCache, qaCache, phrasesCache } =
    await import("./tiered-cache");

  const [
    memoryStats,
    tieredMetrics,
    imageMetrics,
    descMetrics,
    qaMetrics,
    phraseMetrics,
  ] = await Promise.all([
    Promise.resolve(memoryCache.getStats()),
    tieredCache.getMetrics(),
    imageCache.getMetrics(),
    descriptionCache.getMetrics(),
    qaCache.getMetrics(),
    phrasesCache.getMetrics(),
  ]);

  const allMetrics = [
    tieredMetrics,
    imageMetrics,
    descMetrics,
    qaMetrics,
    phraseMetrics,
  ];
  const totalHitRate =
    allMetrics.reduce((sum, m) => sum + (m.hitRate || 0), 0) /
    allMetrics.length;

  return {
    memory: memoryStats,
    tiered: tieredMetrics,
    specialized: {
      images: imageMetrics,
      descriptions: descMetrics,
      qa: qaMetrics,
      phrases: phraseMetrics,
    },
    summary: {
      totalHitRate,
      preferredProvider: tieredMetrics.preferredProvider || "memory",
      healthStatus: allMetrics.some((m) => m.hitRate !== undefined),
    },
  };
}
