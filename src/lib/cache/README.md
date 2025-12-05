# Unified Cache System

A comprehensive, production-ready caching layer with multiple strategies, invalidation patterns, metrics tracking, and cache warming capabilities.

## Features

- **Multiple Strategies**: Memory cache (LRU), session cache, request deduplication, computed cache
- **Type-Safe Keys**: Centralized cache key management with pattern matching
- **Comprehensive Metrics**: Hit/miss rates, performance tracking, health monitoring
- **Cache Warming**: Preload commonly accessed data
- **Invalidation Patterns**: Wildcard-based bulk invalidation
- **Request Deduplication**: Prevent concurrent identical requests
- **Memoization**: Function-level caching with automatic key generation
- **Session Management**: Per-user session-scoped data

## Quick Start

```typescript
import { cache, CacheKeys } from "@/lib/cache";

// Simple get/set
await cache.set("mykey", { data: "value" }, { ttl: 3600 });
const value = await cache.get("mykey");

// Using type-safe keys
const imageKey = CacheKeys.image("img_123");
await cache.set(imageKey, imageData, { ttl: 3600 });
const image = await cache.get(imageKey);

// Get-or-set pattern
const result = await cache.getOrSet(
  CacheKeys.description("img_123"),
  async () => {
    return await fetchDescription("img_123");
  },
  { ttl: 7200 }
);
```

## Cache Strategies

### 1. Memory Cache (LRU)

High-performance in-memory cache with Least Recently Used eviction.

```typescript
import { cache, CacheKeys } from "@/lib/cache";

// Store in memory
await cache.set(
  CacheKeys.image("img_123"),
  imageData,
  { ttl: 3600, priority: 5 }
);

// Retrieve from memory
const data = await cache.get(CacheKeys.image("img_123"));
```

**Configuration**:
- Max size: 1000 entries (configurable)
- Eviction: LRU, LFU, or Priority-based
- Memory limit: 100MB default
- Automatic cleanup of expired entries

### 2. Session Cache

Session-scoped cache for user-specific data.

```typescript
import { cacheManager } from "@/lib/cache";

// Create session
cacheManager.session_ops.create("session_123", "user_456");

// Store session data
await cache.set(
  "preferences",
  userPreferences,
  { sessionId: "session_123", ttl: 1800 }
);

// Get session data
const prefs = await cache.get("preferences", "session_123");

// Destroy session (clears all session data)
await cacheManager.session_ops.destroy("session_123");
```

### 3. Request Deduplication

Prevent concurrent identical requests.

```typescript
import { cache } from "@/lib/cache";

// Multiple concurrent calls will share the same promise
const result = await cache.deduplicate(
  "api_call_xyz",
  async () => {
    return await expensiveAPICall();
  },
  5 // TTL in seconds
);
```

### 4. Computed/Memoization Cache

Automatic function memoization.

```typescript
import { cache } from "@/lib/cache";

const computeExpensiveValue = async (a: number, b: number) => {
  // Expensive computation
  return a * b + Math.random();
};

// Wrap function with memoization
const memoized = cache.memoize(computeExpensiveValue, {
  ttl: 3600,
  keyGenerator: (a, b) => `compute:${a}:${b}`,
});

// First call: executes function
const result1 = await memoized(5, 10);

// Second call: returns cached result
const result2 = await memoized(5, 10);
```

## Cache Keys

### Type-Safe Key Generation

```typescript
import { CacheKeys } from "@/lib/cache";

// Image cache key
const imageKey = CacheKeys.image("img_123");
// Result: "img:img_123"

// Description with user context
const descKey = CacheKeys.description("img_123", { userId: "user_456" })
  .withUser();
// Result: "desc:img_123:u:user_456"

// Q&A with session
const qaKey = CacheKeys.qa("img_123", "What is this?", { sessionId: "sess_789" })
  .withSession();
// Result: "qa:img_123:<hashed_question>:s:sess_789"

// Search with filters
const searchKey = CacheKeys.search("cat photos", { color: "orange" });
// Result: "search:<hashed_query>:<hashed_filters>"

// API response
const apiKey = CacheKeys.api("/api/images", { page: 1, limit: 10 });
// Result: "api:_api_images:<hashed_params>"

// Computed value
const computedKey = CacheKeys.computed("fibonacci", [10]);
// Result: "compute:fibonacci:<hashed_args>"
```

### Cache Patterns for Invalidation

```typescript
import { cache, CachePatterns } from "@/lib/cache";

// Invalidate all images
await cache.invalidate(CachePatterns.allImages());

// Invalidate all user data
await cache.invalidate(CachePatterns.allByUser("user_456"));

// Invalidate all session data
await cache.invalidate(CachePatterns.allBySession("sess_789"));

// Invalidate by prefix
await cache.invalidate(CachePatterns.allByPrefix("desc"));

// Custom pattern with wildcards
await cache.invalidate("img:*:u:user_456:*");
```

## Cache Warming

Preload commonly accessed data on application startup.

```typescript
import { cache, CacheKeys } from "@/lib/cache";

await cache.warm([
  {
    key: CacheKeys.image("popular_1"),
    fetcher: async () => await fetchImage("popular_1"),
  },
  {
    key: CacheKeys.image("popular_2"),
    fetcher: async () => await fetchImage("popular_2"),
  },
  {
    key: CacheKeys.description("popular_1"),
    fetcher: async () => await fetchDescription("popular_1"),
  },
]);
```

## Metrics and Monitoring

### Get Metrics

```typescript
import { cache } from "@/lib/cache";

// Get comprehensive metrics
const metrics = await cache.metrics();
console.log(metrics);
/* Output:
{
  timestamp: 1701234567890,
  strategies: {
    memory: {
      hits: 1250,
      misses: 150,
      hitRate: 0.893,
      evictions: 20,
      size: 950,
      maxSize: 1000,
      ...
    },
    session: { ... },
    "request-dedup": { ... },
    computed: { ... }
  },
  operations: {
    gets: 1400,
    sets: 200,
    deletes: 50,
    invalidations: 5,
    errors: 0
  },
  performance: {
    avgGetTime: 0.35,
    avgSetTime: 0.12,
    p95GetTime: 1.2,
    p99GetTime: 2.5
  },
  health: {
    status: "healthy",
    issues: [],
    uptime: 3600000
  }
}
*/

// Get human-readable summary
console.log(await cache.summary());
/* Output:
Cache Metrics Summary
====================

Overall Hit Rate: 89.30%
Total Requests: 1,400
Hits: 1,250 | Misses: 150

Performance:
  Avg GET: 0.35ms
  Avg SET: 0.12ms
  P95 GET: 1.20ms
  P99 GET: 2.50ms

Operations:
  Gets: 1,400
  Sets: 200
  Deletes: 50
  Invalidations: 5
  Errors: 0

Memory:
  Usage: 97.50 MB / 100.00 MB
  Utilization: 97.5%

Health: healthy
Uptime: 1h 0m
*/
```

### Health Check

```typescript
import { cache } from "@/lib/cache";

const health = await cache.health();
console.log(health);
/* Output:
{
  status: "healthy",
  checks: {
    memory: true,
    metrics: true
  }
}
*/
```

## Advanced Usage

### Custom Cache Manager

```typescript
import { CacheManager } from "@/lib/cache";

const customCache = new CacheManager({
  enableMemoryCache: true,
  enableSessionCache: true,
  enableRequestDedup: true,
  enableComputed: true,
  memoryCacheSize: 5000,
  defaultTTL: 7200,
  enableWarming: true,
  enableMetrics: true,
});
```

### Programmatic Cache Control

```typescript
import { cacheManager } from "@/lib/cache";

// Cleanup expired entries
await cacheManager.cleanup();

// Clear all caches
await cacheManager.clear();

// Reset metrics
cacheManager.resetMetrics();

// Get detailed stats
const stats = cacheManager.getMetrics();
```

## Environment Variables

```bash
# Memory cache settings
CACHE_SIZE=1000                    # Max cache entries
CACHE_TTL=3600                     # Default TTL in seconds
CACHE_MEMORY_LIMIT=104857600       # Memory limit in bytes (100MB)

# Session cache settings
SESSION_CACHE_TTL=3600             # Session TTL in seconds
SESSION_ITEM_TTL=1800              # Session item TTL in seconds
MAX_SESSION_CACHE_SIZE=100         # Max items per session
MAX_TOTAL_SESSION_CACHE=10000      # Max total session items

# Feature flags
ENABLE_CACHE_WARMING=true          # Enable cache warming
ENABLE_CACHE_METRICS=true          # Enable metrics tracking
```

## Best Practices

1. **Use type-safe keys**: Prefer `CacheKeys.*` over raw strings
2. **Set appropriate TTLs**: Match TTL to data freshness requirements
3. **Monitor metrics**: Regularly check hit rates and performance
4. **Implement warming**: Preload critical data on startup
5. **Use patterns for invalidation**: Leverage wildcards for bulk operations
6. **Handle cache misses gracefully**: Always have a fallback
7. **Avoid over-caching**: Don't cache frequently changing data
8. **Use session cache for user data**: Isolate per-user information
9. **Deduplicate expensive operations**: Prevent stampeding requests
10. **Cleanup regularly**: Run periodic cleanup to free memory

## Migration from Legacy Cache

```typescript
// Old (legacy)
import { memoryCache } from "@/lib/cache";
memoryCache.set("key", value, 3600);
const data = memoryCache.get("key");

// New (unified)
import { cache, CacheKeys } from "@/lib/cache";
await cache.set(CacheKeys.custom("key"), value, { ttl: 3600 });
const data = await cache.get(CacheKeys.custom("key"));
```

## Performance Characteristics

- **Memory Cache**: O(1) get/set, LRU eviction
- **Session Cache**: O(1) per-session operations
- **Request Dedup**: O(1) lookup, automatic cleanup
- **Computed Cache**: O(1) lookup, configurable TTL
- **Key Generation**: O(n) where n = key segments (typically < 10)
- **Pattern Matching**: O(m) where m = total keys (use sparingly)

## Troubleshooting

### High Memory Usage
```typescript
const metrics = await cache.metrics();
console.log(metrics.memoryUsage);

// Reduce cache size or increase eviction
const cache = new CacheManager({ memoryCacheSize: 500 });
```

### Low Hit Rate
```typescript
const summary = await cache.summary();
// Check if TTL is too short or cache size too small
```

### Performance Issues
```typescript
const metrics = await cache.metrics();
console.log(metrics.performance);
// Check p95/p99 times, adjust cache strategies
```
