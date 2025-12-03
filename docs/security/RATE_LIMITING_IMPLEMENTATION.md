# Rate Limiting Implementation Plan

## Executive Summary

Implementation of rate limiting for 9 unprotected API endpoints using existing middleware at `src/lib/rate-limiting/middleware.ts`.

**Priority Order:**
1. Auth endpoints (highest abuse risk)
2. AI endpoints (highest cost)
3. Vector/embedding endpoints (computational cost)
4. Write/search endpoints (medium cost)

---

## Endpoint Classification & Rate Limits

### Tier 1: Authentication (Strict - Prevent Brute Force)
- **Config:** `RateLimitConfigs.auth`
- **Limits:** 5 requests per 15 minutes
- **Features:** Exponential backoff enabled

**Endpoints:**
- `/api/auth/signup` (POST) - User registration

### Tier 2: AI Operations (High Cost)
- **Config:** `RateLimitConfigs.descriptionFree` or custom
- **Limits:** 10 requests per minute (free tier)
- **Features:** Admin bypass enabled

**Endpoints:**
- `/api/qa/generate` (POST) - Q&A generation using Claude
- `/api/translate` (POST) - Translation using Claude/GPT

### Tier 3: Vector Operations (Computational Cost)
- **Config:** Custom config
- **Limits:** 30 requests per minute
- **Features:** Basic rate limiting

**Endpoints:**
- `/api/vector/search` (GET, POST) - Semantic search
- `/api/vector/embed` (POST) - Embedding generation

### Tier 4: Search & Read Operations
- **Config:** `RateLimitConfigs.general`
- **Limits:** 100 requests per minute
- **Features:** Skip successful requests

**Endpoints:**
- `/api/images/search` (GET) - Already has auth, needs rate limiting layer

### Tier 5: Write Operations
- **Config:** Custom config
- **Limits:** 20 requests per minute
- **Features:** Standard protection

**Endpoints:**
- `/api/vocabulary/save` (POST, GET) - Already has auth, needs rate limiting layer
- `/api/sessions` (GET, POST) - Already has auth, needs rate limiting layer
- `/api/progress` (GET, POST) - Already has auth, needs rate limiting layer

---

## Implementation Details by Endpoint

### 1. /api/auth/signup (CRITICAL)

**Current State:** No rate limiting
**Risk Level:** HIGH (brute force, spam accounts)

**Implementation:**
```typescript
// src/app/api/auth/signup/route.ts

import { RateLimitMiddleware } from '@/lib/rate-limiting/middleware';

// Wrap POST handler with auth rate limiting
export const POST = RateLimitMiddleware.auth(async (request: NextRequest) => {
  // Existing handler code remains unchanged
  // ... existing implementation
});
```

**Benefits:**
- 5 requests per 15 minutes
- Exponential backoff on repeated violations
- Security logging for potential attacks

---

### 2. /api/qa/generate (HIGH PRIORITY)

**Current State:** No rate limiting
**Risk Level:** HIGH (expensive AI calls)

**Implementation:**
```typescript
// src/app/api/qa/generate/route.ts

import { RateLimitMiddleware } from '@/lib/rate-limiting/middleware';

// Wrap POST handler with AI rate limiting
export const POST = RateLimitMiddleware.description(async (request: NextRequest) => {
  // Existing handler code remains unchanged
  // ... existing implementation
});

// GET endpoint doesn't need rate limiting (returns API info only)
export async function GET(request: NextRequest) {
  // ... existing GET implementation
}
```

**Benefits:**
- 10 requests per minute for free tier
- Can be upgraded to 100/min for paid tier
- Admin bypass for testing

---

### 3. /api/translate (HIGH PRIORITY)

**Current State:** No rate limiting
**Risk Level:** HIGH (AI/OpenAI API calls)

**Implementation:**
```typescript
// src/app/api/translate/route.ts

import { withRateLimit, RateLimitConfigs } from '@/lib/rate-limiting/middleware';

// Custom config for translation
const translationConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 15,
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
};

export const POST = withRateLimit(
  async (request: NextRequest) => {
    // Existing handler code remains unchanged
    // ... existing implementation
  },
  {
    config: translationConfig,
    message: 'Translation rate limit exceeded. Please slow down.',
    bypassAdmin: true,
  }
);

// GET endpoint (health check) - no rate limiting needed
export async function GET() {
  // ... existing GET implementation
}
```

**Benefits:**
- 15 requests per minute
- Skip failed requests (don't count errors against user)
- Admin bypass enabled

---

### 4. /api/vector/search (MEDIUM PRIORITY)

**Current State:** No rate limiting
**Risk Level:** MEDIUM (computational cost)

**Implementation:**
```typescript
// src/app/api/vector/search/route.ts

import { withRateLimit } from '@/lib/rate-limiting/middleware';

// Custom config for vector search
const vectorSearchConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
};

export const POST = withRateLimit(
  async (request: NextRequest) => {
    // Existing handler code remains unchanged
    // ... existing implementation
  },
  {
    config: vectorSearchConfig,
    message: 'Vector search rate limit exceeded.',
    bypassAdmin: true,
  }
);

export const GET = withRateLimit(
  async (request: NextRequest) => {
    // Existing handler code remains unchanged
    // ... existing implementation
  },
  {
    config: vectorSearchConfig,
    message: 'Vector search rate limit exceeded.',
    bypassAdmin: true,
  }
);

// OPTIONS endpoint - no rate limiting
export async function OPTIONS() {
  // ... existing OPTIONS implementation
}
```

**Benefits:**
- 30 requests per minute
- Applied to both GET and POST
- Skip failed requests

---

### 5. /api/vector/embed (MEDIUM PRIORITY)

**Current State:** No rate limiting
**Risk Level:** MEDIUM (embedding generation cost)

**Implementation:**
```typescript
// src/app/api/vector/embed/route.ts

import { withRateLimit } from '@/lib/rate-limiting/middleware';

// Custom config for embedding generation
const embeddingConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
};

export const POST = withRateLimit(
  async (request: NextRequest) => {
    // Existing handler code remains unchanged
    // ... existing implementation
  },
  {
    config: embeddingConfig,
    message: 'Embedding generation rate limit exceeded.',
    bypassAdmin: true,
  }
);

export const PUT = withRateLimit(
  async (request: NextRequest) => {
    // Existing handler code remains unchanged (similarity calculation)
    // ... existing implementation
  },
  {
    config: embeddingConfig,
    message: 'Similarity calculation rate limit exceeded.',
    bypassAdmin: true,
  }
);

// OPTIONS endpoint - no rate limiting
export async function OPTIONS() {
  // ... existing OPTIONS implementation
}
```

**Benefits:**
- 20 requests per minute
- Applied to both POST and PUT
- Protects expensive embedding operations

---

### 6. /api/images/search (ALREADY HAS AUTH)

**Current State:** Has `withBasicAuth` but no rate limiting
**Risk Level:** LOW (already protected by auth, but needs rate limiting layer)

**Implementation:**
```typescript
// src/app/api/images/search/route.ts

import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { withBasicAuth } from '@/lib/middleware/withAuth';

// Apply rate limiting BEFORE auth middleware
async function handleImageSearch(request: AuthenticatedRequest) {
  // Existing handler code remains unchanged
  // ... existing implementation
}

// Wrap with rate limiting first, then auth
const rateLimitedHandler = withRateLimit(
  handleImageSearch,
  {
    configName: 'general',
    message: 'Image search rate limit exceeded.',
    bypassAdmin: true,
  }
);

export const GET = withBasicAuth(rateLimitedHandler, {
  requiredFeatures: ['image_search'],
  errorMessages: {
    featureRequired:
      'Image search requires a valid subscription. Free tier includes basic image search.',
  },
});

// OPTIONS and HEAD remain unchanged
export async function OPTIONS(request: NextRequest) {
  // ... existing implementation
}

export async function HEAD(request: NextRequest) {
  // ... existing implementation
}
```

**Benefits:**
- 100 requests per minute
- Rate limiting applied before authentication
- Prevents auth bypass attempts

---

### 7. /api/vocabulary/save (ALREADY HAS AUTH)

**Current State:** Has `withBasicAuth` but no rate limiting
**Risk Level:** MEDIUM (write operations)

**Implementation:**
```typescript
// src/app/api/vocabulary/save/route.ts

import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { withBasicAuth } from '@/lib/middleware/withAuth';

// Custom config for vocabulary write operations
const vocabWriteConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
};

async function handleVocabularySave(request: AuthenticatedRequest) {
  // Existing handler code remains unchanged
  // ... existing implementation
}

async function handleVocabularyGet(request: AuthenticatedRequest) {
  // Existing handler code remains unchanged
  // ... existing implementation
}

// Wrap handlers with rate limiting before auth
const rateLimitedSave = withRateLimit(handleVocabularySave, {
  config: vocabWriteConfig,
  message: 'Vocabulary save rate limit exceeded.',
  bypassAdmin: true,
});

const rateLimitedGet = withRateLimit(handleVocabularyGet, {
  configName: 'general',
  message: 'Vocabulary retrieval rate limit exceeded.',
  bypassAdmin: true,
});

export const POST = withBasicAuth(rateLimitedSave, {
  requiredFeatures: ['vocabulary_save'],
  errorMessages: {
    featureRequired: 'Vocabulary saving requires a valid subscription.',
  },
});

export const GET = withBasicAuth(rateLimitedGet, {
  requiredFeatures: ['vocabulary_save'],
  errorMessages: {
    featureRequired: 'Vocabulary access requires a valid subscription.',
  },
});
```

**Benefits:**
- 20 requests/min for writes
- 100 requests/min for reads
- Protects database operations

---

### 8. /api/sessions (ALREADY HAS AUTH)

**Current State:** Has `withBasicAuth` but no rate limiting
**Risk Level:** MEDIUM (write operations)

**Implementation:**
```typescript
// src/app/api/sessions/route.ts

import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { withBasicAuth } from '@/lib/middleware/withAuth';

// Custom config for session operations
const sessionConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
};

async function handleGetSessions(request: AuthenticatedRequest) {
  // Existing handler code remains unchanged
  // ... existing implementation
}

async function handleCreateSession(request: AuthenticatedRequest) {
  // Existing handler code remains unchanged
  // ... existing implementation
}

// Wrap handlers with rate limiting
const rateLimitedGet = withRateLimit(handleGetSessions, {
  configName: 'general',
  message: 'Session retrieval rate limit exceeded.',
  bypassAdmin: true,
});

const rateLimitedPost = withRateLimit(handleCreateSession, {
  config: sessionConfig,
  message: 'Session creation rate limit exceeded.',
  bypassAdmin: true,
});

export const GET = withBasicAuth(rateLimitedGet, {
  requiredFeatures: ['vocabulary_save'],
});

export const POST = withBasicAuth(rateLimitedPost, {
  requiredFeatures: ['vocabulary_save'],
});
```

**Benefits:**
- 20 requests/min for session creation
- 100 requests/min for session retrieval
- Prevents session spam

---

### 9. /api/progress (ALREADY HAS AUTH)

**Current State:** Has `withBasicAuth` but no rate limiting
**Risk Level:** MEDIUM (write operations)

**Implementation:**
```typescript
// src/app/api/progress/route.ts

import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { withBasicAuth } from '@/lib/middleware/withAuth';

// Custom config for progress tracking
const progressConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // Higher limit for frequent progress updates
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
};

async function handleGetProgress(request: AuthenticatedRequest) {
  // Existing handler code remains unchanged
  // ... existing implementation
}

async function handleUpdateProgress(request: AuthenticatedRequest) {
  // Existing handler code remains unchanged
  // ... existing implementation
}

// Wrap handlers with rate limiting
const rateLimitedGet = withRateLimit(handleGetProgress, {
  configName: 'general',
  message: 'Progress retrieval rate limit exceeded.',
  bypassAdmin: true,
});

const rateLimitedPost = withRateLimit(handleUpdateProgress, {
  config: progressConfig,
  message: 'Progress update rate limit exceeded.',
  bypassAdmin: true,
});

export const GET = withBasicAuth(rateLimitedGet, {
  requiredFeatures: ['vocabulary_save'],
});

export const POST = withBasicAuth(rateLimitedPost, {
  requiredFeatures: ['vocabulary_save'],
});
```

**Benefits:**
- 30 requests/min for progress updates (higher for frequent tracking)
- 100 requests/min for progress retrieval
- Protects database operations

---

## Testing Strategy

### Unit Tests
```typescript
// tests/unit/rate-limiting/endpoints.test.ts

import { describe, it, expect } from '@jest/globals';
import { NextRequest } from 'next/server';

describe('Rate Limiting - Auth Endpoints', () => {
  it('should rate limit /api/auth/signup after 5 attempts', async () => {
    // Test implementation
  });

  it('should apply exponential backoff on repeated violations', async () => {
    // Test implementation
  });
});

describe('Rate Limiting - AI Endpoints', () => {
  it('should rate limit /api/qa/generate after 10 requests', async () => {
    // Test implementation
  });

  it('should bypass rate limit for admin users', async () => {
    // Test implementation
  });
});

describe('Rate Limiting - Vector Endpoints', () => {
  it('should rate limit /api/vector/search after 30 requests', async () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
// tests/integration/rate-limiting.test.ts

describe('Rate Limiting Integration', () => {
  it('should return 429 with Retry-After header', async () => {
    // Make requests until rate limited
    // Verify 429 response
    // Verify Retry-After header exists
  });

  it('should track rate limits per user ID and IP', async () => {
    // Test isolation between users
  });

  it('should reset rate limits after window expires', async () => {
    // Test time-based reset
  });
});
```

---

## Deployment Checklist

- [ ] Implement rate limiting for all 9 endpoints
- [ ] Add unit tests for each endpoint
- [ ] Add integration tests for rate limiting
- [ ] Test Redis fallback to memory
- [ ] Verify exponential backoff works
- [ ] Test admin bypass functionality
- [ ] Verify Retry-After headers
- [ ] Load test rate limiting
- [ ] Document rate limits in API docs
- [ ] Add monitoring for rate limit violations

---

## Monitoring & Alerts

### Metrics to Track
- Rate limit violations per endpoint
- Admin bypass usage
- Redis vs memory fallback usage
- Average response time with rate limiting
- Exponential backoff trigger frequency

### Alerts
- Alert when rate limit violations exceed 100/hour on auth endpoints
- Alert when Redis connection fails
- Alert when memory cache exceeds 1000 entries

---

## Performance Impact

### Expected Overhead
- Redis mode: ~2-5ms per request
- Memory mode: ~0.5-1ms per request
- Sliding window calculation: O(1) with Redis sorted sets

### Optimization Notes
- Rate limiter uses singleton pattern
- Memory cache auto-cleans every 60 seconds
- Redis operations use pipelining for efficiency

---

## Security Considerations

1. **IP Spoofing:** Use multiple headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP)
2. **User ID Extraction:** Support Bearer tokens, Basic auth, and custom headers
3. **Admin Bypass:** Require admin API key environment variable
4. **DDoS Protection:** Exponential backoff on auth endpoints
5. **Cache Poisoning:** Use unique keys per user+IP combination

---

## Future Enhancements

1. **Tier-Based Limits:** Implement different limits for free/paid users
2. **Dynamic Limits:** Adjust limits based on system load
3. **IP Whitelisting:** Allow specific IPs to bypass rate limiting
4. **Custom Rate Limit Rules:** Per-user rate limit overrides
5. **Distributed Rate Limiting:** Redis Cluster support for horizontal scaling
