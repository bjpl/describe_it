# Rate Limiting Implementation Guide

## Overview

Production-grade rate limiting system implementing token bucket algorithm with multiple strategies for different endpoint types.

## Rate Limit Tiers

| Endpoint Type | Limit | Window | Block Duration |
|---------------|-------|--------|----------------|
| Description Generation | 10 requests | 1 minute | 5 minutes |
| Vocabulary Save | 30 requests | 1 minute | 5 minutes |
| Authentication | 5 requests | 1 minute | 10 minutes |
| General API | 100 requests | 1 minute | 3 minutes |

## Architecture

### Storage Backends

1. **Vercel KV (Primary)**
   - Atomic INCR operations for accurate counting
   - TTL support for automatic cleanup
   - Shared across all serverless instances

2. **In-Memory (Fallback)**
   - Local rate limiting when KV unavailable
   - Automatic cleanup of expired entries
   - Per-instance limits (less strict)

### Algorithm

**Token Bucket Implementation:**
- Requests consume tokens from bucket
- Bucket refills at fixed rate (window expiry)
- When bucket empty, requests are blocked
- Block duration enforced via separate key

## Configuration

### Environment Variables

```env
# Rate Limit Settings (optional overrides)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
SKIP_RATE_LIMIT=false  # Only for development
```

### Files Created

- `/src/middleware/rate-limit.ts` - Core rate limiting
- `/src/lib/rate-limit-integration.ts` - Integration helpers

## Usage Examples

### Basic Rate Limiting

```typescript
import { checkApiRateLimit } from '@/middleware/rate-limit';

export async function POST(req: NextRequest) {
  // Check rate limit
  const rateLimit = await checkApiRateLimit(req, 'description');

  if (!rateLimit.allowed) {
    return rateLimit.response; // Returns 429 with headers
  }

  // Process request...
}
```

### Using Wrapper Function

```typescript
import { withRateLimit } from '@/middleware/rate-limit';

const handler = async (req: NextRequest) => {
  // Your handler logic
  return NextResponse.json({ data: '...' });
};

export const POST = withRateLimit('description', handler);
```

### Manual Rate Limit Check

```typescript
import { rateLimit } from '@/middleware/rate-limit';

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimit(req, 'vocabulary');

  if (rateLimitResponse) {
    // Rate limit exceeded
    return rateLimitResponse;
  }

  // Continue with request
  const response = await processRequest(req);

  // Response will include rate limit headers
  return response;
}
```

## Response Headers

Rate-limited responses include these headers:

```
X-RateLimit-Limit: 10           # Maximum requests allowed
X-RateLimit-Remaining: 7        # Requests remaining in window
X-RateLimit-Reset: 1640995200   # Timestamp when limit resets
Retry-After: 300                # Seconds until retry (if blocked)
```

## Client Identification

Rate limits are tracked per client using:

1. **Authenticated Users**: `x-user-id` header (from auth)
2. **Unauthenticated**: IP address from `x-forwarded-for` or `x-real-ip`

```typescript
// Client ID format
user:123456789              // Authenticated user
ip:192.168.1.1             // Unauthenticated by IP
```

## Integration Examples

### Description Generation Route

```typescript
// /api/descriptions/generate/route.ts
import { applyDescriptionRateLimit } from '@/lib/rate-limit-integration';

export async function POST(req: NextRequest) {
  // Apply rate limit
  const rateLimitError = await applyDescriptionRateLimit(req);
  if (rateLimitError) return rateLimitError;

  // Process description generation
  const result = await generateDescription(req);
  return NextResponse.json(result);
}
```

### Vocabulary Save Route

```typescript
// /api/vocabulary/save/route.ts
import { withVocabularyRateLimit } from '@/lib/rate-limit-integration';

const saveHandler = async (req: NextRequest) => {
  const result = await saveVocabulary(req);
  return NextResponse.json(result);
};

export const POST = withVocabularyRateLimit(saveHandler);
```

### Auth Route

```typescript
// /api/auth/signup/route.ts
import { applyAuthRateLimit } from '@/lib/rate-limit-integration';

export async function POST(req: NextRequest) {
  const rateLimitError = await applyAuthRateLimit(req);
  if (rateLimitError) return rateLimitError;

  const result = await signupUser(req);
  return NextResponse.json(result);
}
```

## Admin Functions

### Reset User Rate Limit

```typescript
import { adminResetUserRateLimit } from '@/lib/rate-limit-integration';

// Reset all limits for a user (support/testing)
await adminResetUserRateLimit(userId);
```

### Get Rate Limit Status

```typescript
import { getUserRateLimitStatus } from '@/lib/rate-limit-integration';

const status = await getUserRateLimitStatus(userId);
console.log(status);
// {
//   description: { count: 5, limit: 10, remaining: 5, resetAt: 1640995200, blocked: false },
//   vocabulary: { count: 12, limit: 30, remaining: 18, resetAt: 1640995200, blocked: false },
//   general: { count: 45, limit: 100, remaining: 55, resetAt: 1640995200, blocked: false }
// }
```

## Tiered Rate Limiting

Different limits for different user tiers:

```typescript
import { applyTieredRateLimit } from '@/lib/rate-limit-integration';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  const userTier = user?.subscription_status || 'free';

  const rateLimitError = await applyTieredRateLimit(
    req,
    userTier,
    'description'
  );

  if (rateLimitError) return rateLimitError;

  // Process request
}
```

**Recommended Tier Limits:**

| Tier | Description | Vocabulary | General |
|------|-------------|-----------|---------|
| Free | 10/min | 30/min | 100/min |
| Pro | 30/min | 100/min | 300/min |
| Enterprise | Unlimited | Unlimited | Unlimited |

## Error Responses

### Rate Limit Exceeded (429)

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please slow down.",
  "retryAfter": 45
}
```

### Blocked (429)

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 300
}
```

## Best Practices

1. **Always add rate limiting to public endpoints**
2. **Use appropriate limits per endpoint type**
3. **Return clear error messages with retry information**
4. **Monitor rate limit violations**
5. **Implement tiered limits for paid users**
6. **Log blocked requests for abuse detection**
7. **Provide rate limit headers on all responses**

## Performance Impact

### Expected Behavior

- **Minimal overhead**: <5ms per request
- **Prevents abuse**: Blocks excessive requests
- **Fair usage**: Ensures resources for all users
- **Cost control**: Prevents API cost overruns

### Monitoring Metrics

- Rate limit hit rate (% of requests hitting limits)
- Blocked requests per user
- Average requests per user per endpoint
- Peak usage patterns

## Testing

### Development Mode

```env
# .env.local
SKIP_RATE_LIMIT=true  # Disable rate limiting in development
```

### Manual Testing

```bash
# Test rate limiting with curl
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/descriptions/generate \
    -H "Content-Type: application/json" \
    -d '{"imageUrl": "...", "style": "narrativo"}'
  echo "Request $i"
done
```

## Troubleshooting

### Rate Limits Not Working

1. Check Vercel KV configuration
2. Verify environment variables
3. Ensure user ID or IP is being captured
4. Review client identification logic

### Users Getting Blocked Incorrectly

1. Check if shared IP (corporate network)
2. Review rate limit thresholds
3. Verify block duration settings
4. Check for clock skew issues

### Rate Limits Too Strict/Loose

1. Analyze usage patterns
2. Adjust limits per endpoint
3. Consider user tier differentiation
4. Monitor abuse patterns

## Next Steps

1. **Integrate into existing routes**: Add to all public endpoints
2. **Monitor violations**: Track who's hitting limits
3. **Tune thresholds**: Adjust based on real usage
4. **Implement tiered limits**: Different limits for different tiers
5. **Add alerting**: Notify on unusual patterns
6. **Create admin dashboard**: View/manage rate limits
