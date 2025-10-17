# Caching Implementation Guide

## Overview

This document describes the production-grade caching system implemented for the Describe It application.

## Cache Architecture

### Cache Backends

1. **Vercel KV (Primary)**
   - Redis-compatible key-value store
   - Persistent, shared across all serverless instances
   - Automatic scaling and management

2. **In-Memory (Fallback)**
   - LRU cache with configurable max size
   - Automatic eviction of oldest entries
   - Used when Vercel KV is unavailable

### Cache Layers

```
Request → Memory Cache → Vercel KV → Database
           ↓ hit          ↓ hit       ↓ miss
        Response      Response      Fetch & Cache
```

## Cache TTL Strategies

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| User Progress | 5 minutes | Frequently updated, needs freshness |
| Vocabulary Lists | 10 minutes | Moderate update frequency |
| Static Content | 1 hour | Rarely changes |
| Descriptions | 30 minutes | Generated content, semi-static |
| Sessions | 15 minutes | Security-sensitive |

## Configuration

### Environment Variables

```env
# Vercel KV Configuration
KV_REST_API_URL=your-kv-rest-api-url
KV_REST_API_TOKEN=your-kv-rest-api-token

# Cache Settings
MAX_CACHE_SIZE=1000
DEFAULT_CACHE_TTL=3600
CACHE_WRITE_THROUGH=true
ENABLE_MEMORY_CACHE_FALLBACK=true
ENABLE_REDIS_CACHE=false
```

### Files Created

- `/src/lib/cache.ts` - Core cache implementation
- `/src/lib/cache-integration.ts` - Integration examples
- `/src/middleware/cache-headers.ts` - HTTP cache headers

## Usage Examples

### Basic Caching

```typescript
import { CacheManager, CacheTTL } from '@/lib/cache';

const userCache = new CacheManager('users');

// Get or set pattern
const userData = await userCache.getOrSet(
  async () => {
    // Fetch from database
    return await db.getUser(userId);
  },
  CacheTTL.USER_PROGRESS,
  userId
);
```

### Cache Invalidation

```typescript
import { CacheInvalidation } from '@/lib/cache';

// Invalidate user progress
await CacheInvalidation.invalidateUserProgress(userId);

// Invalidate specific vocabulary list
await CacheInvalidation.invalidateVocabularyList(userId, listId);

// Invalidate all user data
await CacheInvalidation.invalidateUserVocabulary(userId);
```

### HTTP Cache Headers

```typescript
import { addCacheHeaders, CacheControl } from '@/middleware/cache-headers';

const response = NextResponse.json(data);
addCacheHeaders(response, {
  cacheControl: CacheControl.PRIVATE_MEDIUM,
  etag: generateETag(data),
  staleWhileRevalidate: 300,
});
```

### Conditional Requests (304 Not Modified)

```typescript
import { handleConditionalGet, generateETag } from '@/middleware/cache-headers';

const etag = generateETag(data);

// Check if client has latest version
const notModified = handleConditionalGet(req, { etag });
if (notModified) {
  return notModified; // Returns 304
}

// Return full response with ETag
const response = NextResponse.json(data);
response.headers.set('ETag', etag);
```

## Integration with Existing Routes

### Description Generation

```typescript
// Before generating, check cache
const cached = await descriptionCache.get(imageUrl, style, language);
if (cached) {
  return NextResponse.json({ data: cached });
}

// After generating, cache result
await descriptionCache.set(description, CacheTTL.DESCRIPTION, imageUrl, style, language);
```

### Vocabulary Save

```typescript
// After saving, invalidate cache
await CacheInvalidation.invalidateVocabularyList(userId, listId);
```

### User Progress

```typescript
// Get with caching
const progress = await getCachedUserProgress(userId);

// Update and invalidate
await updateProgress(userId, data);
await CacheInvalidation.invalidateUserProgress(userId);
```

## Cache Warming

Pre-load commonly accessed data on user login:

```typescript
import { warmUserCaches } from '@/lib/cache-integration';

// On successful login
await warmUserCaches(userId);
```

## Cache Statistics

Monitor cache performance:

```typescript
import { getCacheStats } from '@/lib/cache';

const stats = await getCacheStats();
console.log(stats);
// {
//   provider: 'vercel-kv',
//   hits: 150,
//   misses: 50,
//   hitRate: 0.75,
//   memoryCache: { ... }
// }
```

## Best Practices

1. **Always set appropriate TTL**: Match TTL to data update frequency
2. **Invalidate on writes**: Clear cache when data changes
3. **Use namespaces**: Group related cache keys
4. **Monitor hit rates**: Aim for >70% hit rate
5. **Handle cache failures**: Always have fallback to database
6. **Use weak ETags for dynamic content**: Allow functional equivalence
7. **Implement stale-while-revalidate**: Serve stale while fetching fresh

## Performance Impact

### Expected Improvements

- **API Response Time**: 50-80% reduction for cached requests
- **Database Load**: 60-70% reduction
- **Cost Savings**: Reduced database query costs
- **User Experience**: Faster page loads, better perceived performance

### Monitoring Metrics

- Cache hit rate
- Average response time (cached vs uncached)
- Cache size and memory usage
- Eviction rate

## Troubleshooting

### Cache Not Working

1. Check Vercel KV configuration
2. Verify environment variables are set
3. Check memory cache fallback is enabled
4. Review cache key construction

### High Cache Misses

1. Review TTL settings (may be too short)
2. Check invalidation patterns (may be too aggressive)
3. Verify cache key consistency
4. Monitor cache size limits

### Stale Data Issues

1. Reduce TTL for affected data type
2. Implement eager invalidation on updates
3. Use cache versioning for critical data
4. Consider using must-revalidate header

## Next Steps

1. **Implement in API routes**: Add caching to high-traffic endpoints
2. **Monitor metrics**: Track cache hit rates and response times
3. **Tune TTL values**: Adjust based on real-world usage patterns
4. **Add cache warming**: Pre-load data for better UX
5. **Implement tiered caching**: Different strategies for different user tiers
