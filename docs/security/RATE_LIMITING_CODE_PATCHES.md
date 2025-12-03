# Rate Limiting Code Patches

## Quick Reference

All patches follow this pattern:
1. Import rate limiting middleware
2. Wrap existing handler functions
3. No changes to handler logic
4. Apply rate limiting before or alongside auth

---

## 1. /api/auth/signup (HIGHEST PRIORITY)

### File: `src/app/api/auth/signup/route.ts`

**BEFORE (Lines 1-25):**
```typescript
/**
 * Server-side proxy for Supabase authentication
 * Bypasses CORS by making requests from the server
 */

import { NextRequest, NextResponse } from 'next/server';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { createClient } from '@supabase/supabase-js';
import {
  authSignupSchema,
  authSigninSchema,
  validateSecurityHeaders,
  validateRequestSize,
  createErrorResponse,
  createSuccessResponse
} from '@/lib/schemas/api-validation';
import { z } from 'zod';
import { authLogger, createRequestLogger, apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const logger = createRequestLogger('auth-signup', request);
  logger.auth('Sign-up endpoint called', true);

  try {
    // Existing handler code...
```

**AFTER:**
```typescript
/**
 * Server-side proxy for Supabase authentication
 * Bypasses CORS by making requests from the server
 */

import { NextRequest, NextResponse } from 'next/server';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { createClient } from '@supabase/supabase-js';
import {
  authSignupSchema,
  authSigninSchema,
  validateSecurityHeaders,
  validateRequestSize,
  createErrorResponse,
  createSuccessResponse
} from '@/lib/schemas/api-validation';
import { z } from 'zod';
import { authLogger, createRequestLogger, apiLogger } from '@/lib/logger';
import { RateLimitMiddleware } from '@/lib/rate-limiting/middleware';

// Internal handler function (unchanged logic)
async function handleSignup(request: NextRequest) {
  const logger = createRequestLogger('auth-signup', request);
  logger.auth('Sign-up endpoint called', true);

  try {
    // ALL EXISTING CODE REMAINS EXACTLY THE SAME
    // (Security validation, Supabase client, signup logic, etc.)
```

**AFTER (End of file, replace export):**
```typescript
// Wrap with rate limiting (5 requests per 15 minutes + exponential backoff)
export const POST = RateLimitMiddleware.auth(handleSignup);
```

**Change Summary:**
- Extract existing POST logic into `handleSignup` function
- Import `RateLimitMiddleware`
- Export rate-limited wrapped function
- No changes to actual handler logic

---

## 2. /api/qa/generate (HIGH PRIORITY)

### File: `src/app/api/qa/generate/route.ts`

**BEFORE (Lines 1-10):**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { safeParse, safeStringify } from '@/lib/utils/json-safe';
// MIGRATED TO CLAUDE: Using Anthropic Claude Sonnet 4.5
import { generateClaudeQA } from '@/lib/api/claude-server';
import { QAGeneration } from '@/types/api';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const requestText = await request.text();
```

**AFTER:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { safeParse, safeStringify } from '@/lib/utils/json-safe';
// MIGRATED TO CLAUDE: Using Anthropic Claude Sonnet 4.5
import { generateClaudeQA } from '@/lib/api/claude-server';
import { QAGeneration } from '@/types/api';
import { logger } from '@/lib/logger';
import { RateLimitMiddleware } from '@/lib/rate-limiting/middleware';

// Internal handler function
async function handleQAGeneration(request: NextRequest) {
  try {
    const requestText = await request.text();
    // ALL EXISTING CODE REMAINS THE SAME
```

**AFTER (End of file, replace export):**
```typescript
// Wrap POST with AI rate limiting (10 requests per minute)
export const POST = RateLimitMiddleware.description(handleQAGeneration);

// GET endpoint unchanged (returns API info only)
export async function GET(request: NextRequest) {
  // Existing GET implementation remains unchanged
  return NextResponse.json(
    {
      endpoint: '/api/qa/generate',
      method: 'POST',
      description: 'Generate Q&A pairs from image descriptions',
      // ... rest of existing GET response
    },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
```

---

## 3. /api/translate (HIGH PRIORITY)

### File: `src/app/api/translate/route.ts`

**BEFORE (Lines 1-25):**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { logger, logApiCall, logApiResponse } from "@/lib/logger";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

interface TranslationRequest {
  text: string;
  context?: string;
  targetLanguage: string;
  sourceLanguage: string;
}

interface TranslationResponse {
  translation: string;
  confidence: number;
  detectedLanguage?: string;
}

/**
 * Translation API Endpoint - Agent Gamma-3 Integration
 * Provides automatic translation for vocabulary phrases
 */
export async function POST(request: NextRequest) {
  try {
    const requestText = await request.text();
```

**AFTER:**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { logger, logApiCall, logApiResponse } from "@/lib/logger";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { withRateLimit } from '@/lib/rate-limiting/middleware';

interface TranslationRequest {
  text: string;
  context?: string;
  targetLanguage: string;
  sourceLanguage: string;
}

interface TranslationResponse {
  translation: string;
  confidence: number;
  detectedLanguage?: string;
}

// Custom rate limit configuration for translation (15 requests per minute)
const translationConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 15,
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
};

/**
 * Translation API Endpoint - Agent Gamma-3 Integration
 * Provides automatic translation for vocabulary phrases
 */
async function handleTranslation(request: NextRequest) {
  try {
    const requestText = await request.text();
    // ALL EXISTING CODE REMAINS THE SAME
```

**AFTER (End of file, replace export):**
```typescript
// Wrap POST with rate limiting
export const POST = withRateLimit(handleTranslation, {
  config: translationConfig,
  message: 'Translation rate limit exceeded. Please slow down.',
  bypassAdmin: true,
});

// GET endpoint unchanged (health check)
export async function GET() {
  return NextResponse.json({
    status: "ok",
    supportedLanguages: [
      // ... existing language list
    ],
    features: [
      "vocabulary_translation",
      "contextual_translation",
      "phrase_translation",
      "openai_integration",
    ],
    agent: "gamma-3-translation-service",
  });
}
```

---

## 4. /api/vector/search (MEDIUM PRIORITY)

### File: `src/app/api/vector/search/route.ts`

**BEFORE (Lines 1-30):**
```typescript
/**
 * Vector Search API
 * Semantic search across vocabulary, descriptions, and translations
 */

import { NextRequest, NextResponse } from 'next/server';
import { vectorSearchService } from '@/lib/vector/services/search';
import { featureFlags } from '@/lib/vector/config';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  collection: z
    .enum(['vocabulary', 'descriptions', 'images', 'learning_patterns'])
    .default('vocabulary'),
  limit: z.number().int().min(1).max(100).default(20),
  threshold: z.number().min(0).max(1).default(0.7),
  targetLanguage: z.string().optional(),
  includeVectors: z.boolean().default(false),
  hybridSearch: z.boolean().default(false),
  sqlQuery: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
```

**AFTER:**
```typescript
/**
 * Vector Search API
 * Semantic search across vocabulary, descriptions, and translations
 */

import { NextRequest, NextResponse } from 'next/server';
import { vectorSearchService } from '@/lib/vector/services/search';
import { featureFlags } from '@/lib/vector/config';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { withRateLimit } from '@/lib/rate-limiting/middleware';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Custom rate limit configuration for vector search (30 requests per minute)
const vectorSearchConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
};

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  collection: z
    .enum(['vocabulary', 'descriptions', 'images', 'learning_patterns'])
    .default('vocabulary'),
  limit: z.number().int().min(1).max(100).default(20),
  threshold: z.number().min(0).max(1).default(0.7),
  targetLanguage: z.string().optional(),
  includeVectors: z.boolean().default(false),
  hybridSearch: z.boolean().default(false),
  sqlQuery: z.string().optional(),
});

// Internal POST handler
async function handleVectorSearchPost(request: NextRequest) {
  const startTime = Date.now();
  // ALL EXISTING CODE REMAINS THE SAME
```

**AFTER (End of file, replace exports):**
```typescript
// Internal GET handler
async function handleVectorSearchGet(request: NextRequest) {
  const startTime = Date.now();
  // ALL EXISTING CODE FROM ORIGINAL GET FUNCTION
}

// Wrap both handlers with rate limiting
export const POST = withRateLimit(handleVectorSearchPost, {
  config: vectorSearchConfig,
  message: 'Vector search rate limit exceeded.',
  bypassAdmin: true,
});

export const GET = withRateLimit(handleVectorSearchGet, {
  config: vectorSearchConfig,
  message: 'Vector search rate limit exceeded.',
  bypassAdmin: true,
});

// OPTIONS endpoint unchanged
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

---

## 5. /api/vector/embed (MEDIUM PRIORITY)

### File: `src/app/api/vector/embed/route.ts`

**BEFORE (Lines 1-25):**
```typescript
/**
 * Embedding Generation API
 * Generate embeddings for text using Claude or fallback
 */

import { NextRequest, NextResponse } from 'next/server';
import { embeddingService } from '@/lib/vector/services/embedding';
import { featureFlags } from '@/lib/vector/config';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const embedSchema = z.object({
  text: z.string().min(1).max(10000),
  texts: z.array(z.string().min(1).max(10000)).optional(),
  model: z.enum(['claude-3-5-sonnet-20241022', 'text-embedding-ada-002']).optional(),
  dimensions: z.union([z.literal(1536), z.literal(768), z.literal(384)]).optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
```

**AFTER:**
```typescript
/**
 * Embedding Generation API
 * Generate embeddings for text using Claude or fallback
 */

import { NextRequest, NextResponse } from 'next/server';
import { embeddingService } from '@/lib/vector/services/embedding';
import { featureFlags } from '@/lib/vector/config';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { withRateLimit } from '@/lib/rate-limiting/middleware';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Custom rate limit configuration for embedding generation (20 requests per minute)
const embeddingConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
};

const embedSchema = z.object({
  text: z.string().min(1).max(10000),
  texts: z.array(z.string().min(1).max(10000)).optional(),
  model: z.enum(['claude-3-5-sonnet-20241022', 'text-embedding-ada-002']).optional(),
  dimensions: z.union([z.literal(1536), z.literal(768), z.literal(384)]).optional(),
});

// Internal POST handler
async function handleEmbeddingPost(request: NextRequest) {
  const startTime = Date.now();
  // ALL EXISTING CODE REMAINS THE SAME
```

**AFTER (End of file, replace exports):**
```typescript
// Internal PUT handler (similarity calculation)
async function handleEmbeddingPut(request: NextRequest) {
  try {
    const body = await request.json();
    // ALL EXISTING CODE FROM ORIGINAL PUT FUNCTION
  }
}

// Wrap both handlers with rate limiting
export const POST = withRateLimit(handleEmbeddingPost, {
  config: embeddingConfig,
  message: 'Embedding generation rate limit exceeded.',
  bypassAdmin: true,
});

export const PUT = withRateLimit(handleEmbeddingPut, {
  config: embeddingConfig,
  message: 'Similarity calculation rate limit exceeded.',
  bypassAdmin: true,
});

// OPTIONS endpoint unchanged
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

---

## Endpoints with Existing Auth (Apply Rate Limiting Layer)

For endpoints that already have `withBasicAuth`, we need to compose middlewares properly.

---

## 6. /api/vocabulary/save

### File: `src/app/api/vocabulary/save/route.ts`

**Key Changes:**
1. Import rate limiting middleware
2. Define custom config for write operations
3. Wrap handlers before passing to auth

**Code Pattern:**
```typescript
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { withBasicAuth } from '@/lib/middleware/withAuth';
import type { AuthenticatedRequest } from '@/lib/middleware/auth';

// Custom config for vocabulary write operations
const vocabWriteConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
};

// Existing handler functions (unchanged)
async function handleVocabularySave(request: AuthenticatedRequest) {
  // ALL EXISTING CODE REMAINS THE SAME
}

async function handleVocabularyGet(request: AuthenticatedRequest) {
  // ALL EXISTING CODE REMAINS THE SAME
}

// Compose middlewares: Rate limiting → Auth
export const POST = withBasicAuth(
  withRateLimit(handleVocabularySave, {
    config: vocabWriteConfig,
    message: 'Vocabulary save rate limit exceeded.',
    bypassAdmin: true,
  }),
  {
    requiredFeatures: ['vocabulary_save'],
    errorMessages: {
      featureRequired: 'Vocabulary saving requires a valid subscription.',
    },
  }
);

export const GET = withBasicAuth(
  withRateLimit(handleVocabularyGet, {
    configName: 'general',
    message: 'Vocabulary retrieval rate limit exceeded.',
    bypassAdmin: true,
  }),
  {
    requiredFeatures: ['vocabulary_save'],
    errorMessages: {
      featureRequired: 'Vocabulary access requires a valid subscription.',
    },
  }
);
```

---

## 7. /api/sessions

### File: `src/app/api/sessions/route.ts`

**Same pattern as above:**

```typescript
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { withBasicAuth } from '@/lib/middleware/withAuth';
import type { AuthenticatedRequest } from '@/lib/middleware/auth';

// Custom config for session operations
const sessionConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
};

// Existing handlers (unchanged)
async function handleGetSessions(request: AuthenticatedRequest) {
  // ALL EXISTING CODE REMAINS THE SAME
}

async function handleCreateSession(request: AuthenticatedRequest) {
  // ALL EXISTING CODE REMAINS THE SAME
}

// Compose middlewares
export const GET = withBasicAuth(
  withRateLimit(handleGetSessions, {
    configName: 'general',
    message: 'Session retrieval rate limit exceeded.',
    bypassAdmin: true,
  }),
  {
    requiredFeatures: ['vocabulary_save'],
  }
);

export const POST = withBasicAuth(
  withRateLimit(handleCreateSession, {
    config: sessionConfig,
    message: 'Session creation rate limit exceeded.',
    bypassAdmin: true,
  }),
  {
    requiredFeatures: ['vocabulary_save'],
  }
);
```

---

## 8. /api/progress

### File: `src/app/api/progress/route.ts`

**Same pattern:**

```typescript
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { withBasicAuth } from '@/lib/middleware/withAuth';
import type { AuthenticatedRequest } from '@/lib/middleware/auth';

// Custom config for progress tracking (higher limit for frequent updates)
const progressConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // Higher limit for frequent progress tracking
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
};

// Existing handlers (unchanged)
async function handleGetProgress(request: AuthenticatedRequest) {
  // ALL EXISTING CODE REMAINS THE SAME
}

async function handleUpdateProgress(request: AuthenticatedRequest) {
  // ALL EXISTING CODE REMAINS THE SAME
}

// Compose middlewares
export const GET = withBasicAuth(
  withRateLimit(handleGetProgress, {
    configName: 'general',
    message: 'Progress retrieval rate limit exceeded.',
    bypassAdmin: true,
  }),
  {
    requiredFeatures: ['vocabulary_save'],
  }
);

export const POST = withBasicAuth(
  withRateLimit(handleUpdateProgress, {
    config: progressConfig,
    message: 'Progress update rate limit exceeded.',
    bypassAdmin: true,
  }),
  {
    requiredFeatures: ['vocabulary_save'],
  }
);
```

---

## 9. /api/images/search

### File: `src/app/api/images/search/route.ts`

**Note:** This endpoint already has complex auth logic. We need to be careful with the composition.

**Key Changes:**
1. Import rate limiting
2. Wrap the handler function before passing to auth

```typescript
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { withBasicAuth } from '@/lib/middleware/withAuth';

// Existing handleImageSearch function (unchanged)
async function handleImageSearch(request: AuthenticatedRequest) {
  // ALL EXISTING CODE REMAINS THE SAME (500+ lines)
}

// Compose middlewares: Rate limiting → Auth
export const GET = withBasicAuth(
  withRateLimit(handleImageSearch, {
    configName: 'general',
    message: 'Image search rate limit exceeded.',
    bypassAdmin: true,
  }),
  {
    requiredFeatures: ['image_search'],
    errorMessages: {
      featureRequired:
        'Image search requires a valid subscription. Free tier includes basic image search.',
    },
  }
);

// OPTIONS and HEAD remain unchanged
export async function OPTIONS(request: NextRequest) {
  // Existing implementation unchanged
}

export async function HEAD(request: NextRequest) {
  // Existing implementation unchanged
}
```

---

## Summary of Changes

### Pattern 1: Endpoints WITHOUT Auth
1. Import: `import { RateLimitMiddleware or withRateLimit } from '@/lib/rate-limiting/middleware';`
2. Extract handler: `async function handleXYZ(request: NextRequest) { ... }`
3. Wrap export: `export const POST = RateLimitMiddleware.auth(handleXYZ);`

### Pattern 2: Endpoints WITH Auth
1. Import both middlewares
2. Keep existing handler functions unchanged
3. Compose: `export const POST = withBasicAuth(withRateLimit(handler, rateLimitOpts), authOpts);`

### No Handler Logic Changes
- All existing request processing logic remains EXACTLY the same
- Only the export wrappers change
- Rate limiting is applied transparently

---

## Testing Each Endpoint

```bash
# Test rate limiting works
for i in {1..6}; do curl -X POST http://localhost:3000/api/auth/signup; done

# Should return 429 on 6th request with Retry-After header
```

Expected response on rate limit:
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 5,
    "remaining": 0,
    "resetTime": "2025-12-02T23:30:00.000Z",
    "retryAfter": 900
  },
  "timestamp": "2025-12-02T23:15:00.000Z"
}
```

Response headers:
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1733183400
Retry-After: 900
```
