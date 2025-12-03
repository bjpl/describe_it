# ADR-003: Route Handler Refactoring Architecture

**Status:** Proposed
**Date:** 2025-12-02
**Deciders:** System Architect, Implementation Team
**Technical Story:** Remediation Phase 1 - Decompose monolithic route handlers

---

## Context and Problem Statement

Analysis reveals **monolithic route handlers** with excessive line counts:

- `/src/app/api/translate/route.ts`: **402 lines**
- `/src/app/api/analytics/route.ts`: **399 lines**
- `/src/app/api/error-report/route.ts`: **378 lines**
- `/src/app/api/progress/route.ts`: **212 lines**
- `/src/app/api/sessions/route.ts`: **208 lines**

**Problems:**
- Violates Single Responsibility Principle
- Difficult to test (business logic mixed with HTTP handling)
- Hard to reuse logic across routes
- Slow to understand and modify
- No clear separation of concerns

**Decision Drivers:**
- Improve maintainability and testability
- Enable code reuse across API and non-API contexts
- Support future migration to app router actions
- Preserve existing API contracts (no breaking changes)

---

## Decision Outcome

**Chosen option:** "Controller-Service-Repository Pattern with Clean Architecture"

### Architecture Design

```
┌────────────────────────────────────────────────────────────┐
│                    API Route Layer                         │
│            /src/app/api/[route]/route.ts                   │
│                                                            │
│  - HTTP request/response handling                          │
│  - Request validation (Zod schemas)                        │
│  - Response formatting                                     │
│  - Error handling middleware                               │
│  - Rate limiting                                           │
│  - Authentication/Authorization                            │
└─────────────────────┬──────────────────────────────────────┘
                      │ delegates to
          ┌───────────▼───────────┐
          │   Controller Layer    │
          │  /src/controllers/    │
          │                       │
          │  - Business workflow  │
          │  - Orchestration      │
          │  - DTO mapping        │
          └────────┬──────────────┘
                   │ uses
     ┌─────────────┴─────────────┐
     │                           │
┌────▼─────┐            ┌────────▼───────┐
│ Service  │            │  Repository    │
│  Layer   │            │    Layer       │
│          │            │                │
│ Business │            │  Data access   │
│  logic   │◄───────────┤  Supabase      │
│          │  queries   │  Redis cache   │
└──────────┘            └────────────────┘
```

---

## Implementation Specification

### Example: Analytics Route Refactoring

#### Before (Monolithic - 399 lines)

```typescript
// /src/app/api/analytics/route.ts (BEFORE)
export async function POST(request: NextRequest) {
  try {
    // 50 lines of validation
    const body = await request.json();
    if (!body.event) throw new Error('Missing event');
    if (!body.userId) throw new Error('Missing userId');
    // ... more validation

    // 100 lines of business logic
    const analytics = await supabase
      .from('analytics')
      .select('*')
      .eq('user_id', body.userId);

    const aggregated = analytics.reduce((acc, item) => {
      // ... complex aggregation logic
    }, {});

    // 50 lines of data transformation
    const formatted = {
      daily: transformDailyData(aggregated),
      weekly: transformWeeklyData(aggregated),
      monthly: transformMonthlyData(aggregated),
    };

    // 30 lines of caching
    await redis.set(`analytics:${body.userId}`, JSON.stringify(formatted));

    // 20 lines of response formatting
    return NextResponse.json({
      success: true,
      data: formatted,
      meta: { /* ... */ },
    });

  } catch (error) {
    // 149 lines of error handling
    if (error instanceof ValidationError) { /* ... */ }
    if (error instanceof DatabaseError) { /* ... */ }
    // ... more error cases
  }
}
```

#### After (Clean Architecture)

##### 1. Route Layer (28 lines)

```typescript
// /src/app/api/analytics/route.ts (AFTER)
import { NextRequest, NextResponse } from 'next/server';
import { analyticsController } from '@/controllers/analytics.controller';
import { analyticsRequestSchema } from '@/schemas/analytics.schema';
import { withAuth } from '@/middleware/auth';
import { withRateLimit } from '@/middleware/rate-limit';
import { handleApiError } from '@/lib/errors/api-error-handler';

export const POST = withAuth(
  withRateLimit({ max: 100, window: '1m' })(
    async (request: NextRequest) => {
      try {
        const body = await request.json();
        const validated = analyticsRequestSchema.parse(body);

        const result = await analyticsController.getAnalytics(validated);

        return NextResponse.json({
          success: true,
          data: result,
          meta: { timestamp: new Date().toISOString() },
        });
      } catch (error) {
        return handleApiError(error, request);
      }
    }
  )
);
```

##### 2. Controller Layer (52 lines)

```typescript
// /src/controllers/analytics.controller.ts
import { analyticsService } from '@/services/analytics.service';
import { AnalyticsRequest, AnalyticsResponse } from '@/types/analytics';
import { logger } from '@/lib/logging';

export class AnalyticsController {
  constructor(private analyticsService: typeof analyticsService) {}

  async getAnalytics(request: AnalyticsRequest): Promise<AnalyticsResponse> {
    logger.info('Fetching analytics', { userId: request.userId });

    // Check cache first
    const cached = await this.analyticsService.getCachedAnalytics(request.userId);
    if (cached) {
      logger.debug('Analytics cache hit', { userId: request.userId });
      return cached;
    }

    // Fetch from database
    const analytics = await this.analyticsService.fetchAnalytics(request.userId);

    // Transform to response format
    const response = this.transformAnalytics(analytics);

    // Cache result
    await this.analyticsService.cacheAnalytics(request.userId, response);

    return response;
  }

  private transformAnalytics(analytics: RawAnalytics): AnalyticsResponse {
    return {
      daily: this.transformDailyData(analytics),
      weekly: this.transformWeeklyData(analytics),
      monthly: this.transformMonthlyData(analytics),
    };
  }

  private transformDailyData(analytics: RawAnalytics) {
    // Transformation logic
  }

  private transformWeeklyData(analytics: RawAnalytics) {
    // Transformation logic
  }

  private transformMonthlyData(analytics: RawAnalytics) {
    // Transformation logic
  }
}

export const analyticsController = new AnalyticsController(analyticsService);
```

##### 3. Service Layer (118 lines)

```typescript
// /src/services/analytics.service.ts
import { analyticsRepository } from '@/repositories/analytics.repository';
import { cacheService } from '@/services/cache.service';
import { AnalyticsData, AnalyticsResponse } from '@/types/analytics';
import { logger } from '@/lib/logging';

export class AnalyticsService {
  constructor(
    private repository: typeof analyticsRepository,
    private cache: typeof cacheService
  ) {}

  async fetchAnalytics(userId: string): Promise<AnalyticsData> {
    logger.info('Fetching analytics from database', { userId });

    // Fetch all analytics for user
    const rawData = await this.repository.findByUserId(userId);

    // Aggregate data
    const aggregated = this.aggregateAnalytics(rawData);

    return aggregated;
  }

  async getCachedAnalytics(userId: string): Promise<AnalyticsResponse | null> {
    const cacheKey = `analytics:${userId}`;
    return await this.cache.get<AnalyticsResponse>(cacheKey);
  }

  async cacheAnalytics(userId: string, data: AnalyticsResponse): Promise<void> {
    const cacheKey = `analytics:${userId}`;
    const ttl = 3600; // 1 hour
    await this.cache.set(cacheKey, data, ttl);
  }

  private aggregateAnalytics(rawData: any[]): AnalyticsData {
    return rawData.reduce((acc, item) => {
      // Complex aggregation logic moved here
      // Much easier to test in isolation
      return acc;
    }, {} as AnalyticsData);
  }

  // Additional business logic methods...
}

export const analyticsService = new AnalyticsService(
  analyticsRepository,
  cacheService
);
```

##### 4. Repository Layer (45 lines)

```typescript
// /src/repositories/analytics.repository.ts
import { supabaseService } from '@/lib/api/supabase';
import { AnalyticsRecord } from '@/types/analytics';
import { logger } from '@/lib/logging';

export class AnalyticsRepository {
  constructor(private supabase: typeof supabaseService) {}

  async findByUserId(userId: string): Promise<AnalyticsRecord[]> {
    logger.debug('Querying analytics by user ID', { userId });

    const { data, error } = await this.supabase
      .getClient()
      ?.from('analytics')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new DatabaseError('Failed to fetch analytics', error);
    }

    return data || [];
  }

  async create(record: Omit<AnalyticsRecord, 'id'>): Promise<AnalyticsRecord> {
    logger.debug('Creating analytics record', { userId: record.user_id });

    const { data, error } = await this.supabase
      .getClient()
      ?.from('analytics')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to create analytics record', error);
    }

    return data;
  }

  // Additional data access methods...
}

export const analyticsRepository = new AnalyticsRepository(supabaseService);
```

##### 5. Validation Schemas (24 lines)

```typescript
// /src/schemas/analytics.schema.ts
import { z } from 'zod';

export const analyticsRequestSchema = z.object({
  userId: z.string().uuid(),
  event: z.string().min(1).max(100),
  properties: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

export type AnalyticsRequest = z.infer<typeof analyticsRequestSchema>;

export const analyticsResponseSchema = z.object({
  daily: z.array(z.object({
    date: z.string(),
    count: z.number(),
    events: z.array(z.string()),
  })),
  weekly: z.array(z.object({
    week: z.string(),
    count: z.number(),
    topEvents: z.array(z.string()),
  })),
  monthly: z.array(z.object({
    month: z.string(),
    count: z.number(),
    trend: z.enum(['up', 'down', 'stable']),
  })),
});

export type AnalyticsResponse = z.infer<typeof analyticsResponseSchema>;
```

---

## Benefits of Refactoring

### Before vs. After Comparison

| Metric | Before (Monolithic) | After (Clean Architecture) |
|--------|---------------------|----------------------------|
| Route handler lines | 399 | 28 (-93%) |
| Testability | ❌ Hard (HTTP mocking required) | ✅ Easy (unit tests) |
| Reusability | ❌ Tied to API route | ✅ Used anywhere |
| Complexity | 🔴 High (Cyclomatic: 47) | 🟢 Low (Cyclomatic: 8) |
| Single Responsibility | ❌ Violated | ✅ Followed |
| Error handling | 😓 Duplicated | ✨ Centralized |

### Testing Improvements

```typescript
// BEFORE: Difficult to test (requires HTTP mocking)
describe('Analytics API', () => {
  test('returns analytics data', async () => {
    const request = new NextRequest('http://localhost:3000/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ userId: '123', event: 'page_view' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    // Hard to test business logic in isolation
  });
});

// AFTER: Easy to test (pure functions)
describe('AnalyticsService', () => {
  test('aggregates analytics correctly', () => {
    const rawData = [
      { user_id: '123', event: 'page_view', created_at: '2025-12-01' },
      { user_id: '123', event: 'button_click', created_at: '2025-12-01' },
    ];

    const result = analyticsService.aggregateAnalytics(rawData);

    expect(result.daily).toHaveLength(1);
    expect(result.daily[0].count).toBe(2);
    // Test business logic directly without HTTP layer
  });
});
```

---

## Migration Strategy

### Refactoring Priority

Routes to refactor first (highest impact):

1. **`/src/app/api/translate/route.ts`** (402 lines) - High complexity
2. **`/src/app/api/analytics/route.ts`** (399 lines) - Business critical
3. **`/src/app/api/error-report/route.ts`** (378 lines) - Error handling
4. **`/src/app/api/progress/route.ts`** (212 lines) - Learning logic
5. **`/src/app/api/sessions/route.ts`** (208 lines) - User tracking

### Phased Approach

```
Phase 1 (Week 1-2):
  - Create directory structure
  - Set up controller/service/repository pattern
  - Refactor translate route (most complex)
  - Write comprehensive tests

Phase 2 (Week 3-4):
  - Refactor analytics and error-report routes
  - Create shared middleware (auth, rate-limit)
  - Extract common validation schemas

Phase 3 (Week 5-6):
  - Refactor remaining large routes
  - Consolidate duplicate logic
  - Performance optimization

Phase 4 (Week 7):
  - Documentation updates
  - Team training on new patterns
  - Monitor performance metrics
```

### File Structure

```
src/
├── app/
│   └── api/
│       └── analytics/
│           └── route.ts (28 lines - HTTP only)
├── controllers/
│   └── analytics.controller.ts (52 lines - orchestration)
├── services/
│   ├── analytics.service.ts (118 lines - business logic)
│   └── cache.service.ts
├── repositories/
│   └── analytics.repository.ts (45 lines - data access)
├── schemas/
│   └── analytics.schema.ts (24 lines - validation)
└── types/
    └── analytics.ts (type definitions)
```

---

## Rate Limiting Architecture

### Current State

No centralized rate limiting found in `/src/middleware/rate-limit.ts` analysis.

### Proposed Solution

**File:** `/src/middleware/rate-limit.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/cache/redis-cache';

export interface RateLimitOptions {
  max: number;           // Max requests
  window: string;        // Time window (e.g., '1m', '1h', '1d')
  identifier?: (req: NextRequest) => string; // Custom identifier
}

export function withRateLimit(options: RateLimitOptions) {
  const { max, window, identifier = getDefaultIdentifier } = options;

  return function (handler: Function) {
    return async (request: NextRequest) => {
      const key = `rate-limit:${identifier(request)}`;
      const ttl = parseWindow(window);

      try {
        // Increment counter
        const current = await redis.incr(key);

        // Set TTL on first request
        if (current === 1) {
          await redis.expire(key, ttl);
        }

        // Check limit
        if (current > max) {
          return NextResponse.json(
            {
              error: 'Rate limit exceeded',
              message: `Maximum ${max} requests per ${window}`,
              retryAfter: await redis.ttl(key),
            },
            { status: 429 }
          );
        }

        // Add rate limit headers
        const response = await handler(request);
        response.headers.set('X-RateLimit-Limit', String(max));
        response.headers.set('X-RateLimit-Remaining', String(max - current));
        response.headers.set('X-RateLimit-Reset', String(Date.now() + ttl * 1000));

        return response;

      } catch (error) {
        // If rate limiting fails, allow request (fail-open)
        console.error('Rate limiting error:', error);
        return handler(request);
      }
    };
  };
}

function getDefaultIdentifier(request: NextRequest): string {
  // Use IP address as default
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

function parseWindow(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid window format: ${window}`);

  const [, amount, unit] = match;
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return parseInt(amount) * multipliers[unit as keyof typeof multipliers];
}
```

### Usage Example

```typescript
// /src/app/api/translate/route.ts
import { withRateLimit } from '@/middleware/rate-limit';
import { withAuth } from '@/middleware/auth';

export const POST = withAuth(
  withRateLimit({ max: 100, window: '1m' })(
    async (request: NextRequest) => {
      // Route logic here
    }
  )
);

// Different limits for authenticated vs. unauthenticated
export const GET = withRateLimit({
  max: 1000,
  window: '1h',
  identifier: (req) => req.headers.get('authorization') || getIP(req),
})(async (request: NextRequest) => {
  // Route logic here
});
```

---

## Consequences

### Positive

- **Testability:** Business logic can be unit tested without HTTP mocking
- **Reusability:** Services can be used in API routes, server actions, cron jobs, etc.
- **Maintainability:** Each layer has clear responsibility
- **Performance:** Better caching opportunities at service layer
- **Scalability:** Easy to swap implementations (e.g., different database)

### Negative

- **More files:** Increases file count (but reduces complexity per file)
- **Indirection:** More layers to navigate when debugging
- **Migration effort:** Requires refactoring existing routes

### Mitigation

- Create clear documentation with examples
- Use consistent naming conventions across all routes
- Provide templates for common patterns
- Gradual migration allows team to learn patterns

---

## Related Decisions

- ADR-002: Logger Consolidation
- ADR-004: Configuration Consolidation
- ADR-005: Type Safety Strategy

---

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Next.js Route Handlers Best Practices](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Dependency Injection Patterns](https://martinfowler.com/articles/injection.html)
