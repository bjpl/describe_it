# API & Architecture Analysis Report
**Generated:** 2025-11-20
**Swarm ID:** swarm-daily-audit-01
**Agent:** API & ARCHITECTURE ANALYST

---

## Executive Summary

**Describe It** is a Next.js 15-based full-stack web application designed for Spanish language learning through AI-powered image description generation. The system leverages Anthropic's Claude Sonnet 4.5 for vision-based content generation, Supabase for data persistence, and implements comprehensive monitoring, caching, and security middleware.

### Architecture Classification
- **Type:** Server-Side Rendered (SSR) Full-Stack Application
- **Deployment:** Standalone (Vercel optimized)
- **Rendering:** Hybrid SSR/SSG with React 19
- **API:** RESTful with Next.js 15 App Router
- **Database:** PostgreSQL (Supabase)
- **AI Provider:** Anthropic Claude Sonnet 4.5 (migrated from OpenAI)

---

## 1. API ENDPOINT INVENTORY

### 1.1 Core AI Generation Endpoints

#### `/api/descriptions/generate` (POST, GET)
- **Purpose:** Generate bilingual (EN/ES) image descriptions using Claude vision
- **Auth:** Basic auth with subscription tier validation
- **Features:**
  - Parallel description generation (EN + ES simultaneously)
  - 5 description styles (narrativo, poetico, academico, conversacional, infantil)
  - Base64 and URL image support
  - Image proxy for external URLs
  - Fallback demo mode
- **Performance:** ~15 seconds (reduced from 30s with parallelization)
- **Rate Limit:** 10 requests per 15 min per IP (AI_GENERATION tier)
- **Max Request Size:** 10 KB (20 MB images)
- **Response Time Threshold:** 5000ms
- **Models Used:** claude-sonnet-4-5-20250629
- **Token Limits:** 8192 max output tokens

#### `/api/qa/generate` (POST)
- **Purpose:** Generate comprehension questions from image descriptions
- **Difficulty Levels:** facil (A1-A2), medio (B1-B2), dificil (C1-C2)
- **Output:** JSON array of Q&A pairs
- **Integration:** Uses Claude completion API
- **Rate Limit:** AI_GENERATION tier

#### `/api/phrases/extract` (POST)
- **Purpose:** Extract vocabulary phrases from Spanish text
- **Output:** Spanish/English pairs with part of speech, context
- **Features:** Difficulty-based extraction (beginner/intermediate/advanced)
- **Rate Limit:** AI_GENERATION tier

#### `/api/translate` (POST)
- **Purpose:** Text translation using Claude
- **Features:** Contextual translation with cultural nuances
- **Max Request Size:** 50 KB
- **Temperature:** 0.3 (low for accuracy)

### 1.2 Image & Search Endpoints

#### `/api/images/search` (POST)
- **Purpose:** Search Unsplash images
- **Integration:** Unsplash API
- **Features:** Query-based search with pagination
- **Rate Limit:** READ_OPERATIONS tier
- **Caching:** Enabled

#### `/api/images/search-edge` (GET)
- **Purpose:** Edge-optimized image search
- **Runtime:** Edge (low latency)

#### `/api/images/proxy` (POST)
- **Purpose:** Proxy external images for Claude processing
- **Output:** Base64-encoded data URIs
- **Size Validation:** 20 MB limit

#### `/api/images/test` (GET)
- **Purpose:** Health check for image search service

### 1.3 Data Persistence Endpoints

#### `/api/vocabulary/save` (POST)
- **Purpose:** Save vocabulary items to database
- **Database:** Supabase `phrases` table
- **Rate Limit:** DATA_OPERATIONS tier
- **Max Request Size:** 100 KB (bulk operations)

#### `/api/vocabulary/lists` (GET, POST)
- **Purpose:** Retrieve user vocabulary lists
- **Features:** Category/difficulty filtering

#### `/api/vocabulary/lists/[id]` (GET, PUT, DELETE)
- **Purpose:** CRUD operations for specific vocabulary lists

#### `/api/vocabulary/items/[id]` (GET, PUT, DELETE)
- **Purpose:** CRUD operations for vocabulary items

#### `/api/vocabulary/review` (GET)
- **Purpose:** Spaced repetition vocabulary review
- **Algorithm:** Review frequency based on mastery

#### `/api/descriptions/saved` (GET)
- **Purpose:** Retrieve user's saved descriptions

### 1.4 Progress & Analytics Endpoints

#### `/api/progress/track` (POST)
- **Purpose:** Track user learning progress
- **Database:** Supabase `user_progress` table
- **Rate Limit:** DATA_OPERATIONS tier

#### `/api/progress/stats` (GET)
- **Purpose:** Get user progress statistics
- **Features:** Daily/weekly/monthly aggregations

#### `/api/progress/analytics` (GET)
- **Purpose:** Advanced analytics and insights
- **Features:** Trend analysis, mastery tracking

#### `/api/progress/streak` (GET)
- **Purpose:** Calculate learning streaks

#### `/api/analytics/route.ts` (POST)
- **Purpose:** General analytics tracking

#### `/api/analytics/web-vitals` (POST)
- **Purpose:** Web Vitals performance metrics
- **Metrics:** CLS, LCP, FCP, FID, TTFB, INP

#### `/api/analytics/dashboard` (GET)
- **Purpose:** Analytics dashboard data

#### `/api/analytics/export` (POST)
- **Purpose:** Export analytics data

#### `/api/analytics/ws` (WebSocket)
- **Purpose:** Real-time analytics streaming

#### `/api/admin/analytics` (GET)
- **Purpose:** Admin analytics dashboard

### 1.5 Settings & Configuration Endpoints

#### `/api/settings/save` (POST)
- **Purpose:** Save user settings
- **Max Request Size:** 20 KB
- **Rate Limit:** DATA_OPERATIONS tier

#### `/api/settings/sync` (POST)
- **Purpose:** Sync settings across devices
- **Features:** Conflict resolution

#### `/api/settings/apikeys` (GET, POST, DELETE)
- **Purpose:** Manage user API keys
- **Security:** Encrypted storage

### 1.6 Export Endpoints

#### `/api/export/generate` (POST)
- **Purpose:** Generate PDF/CSV exports
- **Features:** Session reports, vocabulary lists
- **Libraries:** jsPDF, file-saver
- **Rate Limit:** EXPORT_OPERATIONS tier

### 1.7 Monitoring & Health Endpoints

#### `/api/health` (GET)
- **Purpose:** Service health check
- **Checks:** Database, cache, AI service

#### `/api/monitoring/health` (GET)
- **Purpose:** Detailed health diagnostics
- **Metrics:** Response times, error rates

#### `/api/monitoring/metrics` (GET)
- **Purpose:** Prometheus-compatible metrics
- **Integration:** prom-client

#### `/api/monitoring/resource-usage` (GET)
- **Purpose:** Server resource monitoring

#### `/api/metrics` (GET)
- **Purpose:** Application metrics

#### `/api/cache/status` (GET)
- **Purpose:** Cache health and statistics

#### `/api/status` (GET)
- **Purpose:** General system status

#### `/api/env-status` (GET)
- **Purpose:** Environment configuration status

### 1.8 Error & Debug Endpoints

#### `/api/error-report` (POST)
- **Purpose:** Client-side error reporting
- **Integration:** Sentry

#### `/api/sentry-example-api` (GET)
- **Purpose:** Sentry test endpoint

#### `/api/example/error-handling` (GET)
- **Purpose:** Error handling demonstration

### 1.9 Authentication Endpoints

#### `/api/auth/signin` (POST)
- **Purpose:** User sign-in
- **Provider:** Supabase Auth
- **Features:** Rate limiting, session management

#### `/api/auth/signup` (POST)
- **Purpose:** User registration
- **Validation:** Email, password strength

#### `/api/auth/simple-signup` (POST)
- **Purpose:** Simplified registration flow

#### `/api/auth/mock-signup` (POST)
- **Purpose:** Development/testing signup

#### `/api/auth/test-env` (GET)
- **Purpose:** Auth environment validation

#### `/api/auth/admin-reset` (POST)
- **Purpose:** Admin password reset

#### `/auth/callback` (GET)
- **Purpose:** OAuth callback handler

### 1.10 Session Management

#### `/api/sessions` (GET, POST)
- **Purpose:** User session CRUD
- **Database:** Supabase `sessions` table
- **Features:** Session metadata, duration tracking

### 1.11 Storage & Cleanup

#### `/api/storage/cleanup` (POST)
- **Purpose:** Clean up old storage data
- **Features:** Retention policies, batch deletion

### 1.12 Search Endpoints

#### `/api/search/descriptions` (GET)
- **Purpose:** Search saved descriptions
- **Features:** Full-text search

#### `/api/search/vocabulary` (GET)
- **Purpose:** Search vocabulary items
- **Features:** Fuzzy matching

---

## 2. EXTERNAL DEPENDENCIES

### 2.1 AI & ML Services

#### Anthropic Claude Sonnet 4.5
- **Purpose:** Primary AI provider (vision + text)
- **API Key:** `ANTHROPIC_API_KEY` (server-side)
- **Model:** claude-sonnet-4-5-20250629
- **Features:**
  - Vision API (image description)
  - Text completion (Q&A, translation, vocabulary)
  - 1M token context window
  - 8192 max output tokens
- **Cost Tracking:** Integrated with Sentry
- **Failover:** Fallback demo descriptions
- **Performance:** ~15s for parallel bilingual generation
- **Client:** `@anthropic-ai/sdk@^0.65.0`

#### OpenAI (Legacy/Deprecated)
- **Status:** Migrated to Claude
- **Package:** `openai@^4.24.1` (still in dependencies)
- **Note:** Code references remain for backward compatibility

### 2.2 Database & Storage

#### Supabase
- **Type:** PostgreSQL database + Auth + Realtime
- **SDK:** `@supabase/supabase-js@^2.58.0`
- **SSR Support:** `@supabase/ssr@^0.7.0`
- **Auth UI:** `@supabase/auth-ui-react@^0.4.7`
- **Configuration:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- **Tables:**
  - `images` - Image metadata
  - `descriptions` - Generated descriptions
  - `phrases` - Vocabulary items
  - `user_progress` - Learning progress
  - `sessions` - User sessions
- **Features:**
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Connection pooling
- **Fallback:** LocalStorage adapter for demo mode
- **Pool Configuration:**
  - Min: 2 connections
  - Max: 10 connections
  - Timeout: 30s

#### Vercel KV (Optional)
- **Type:** Redis-compatible key-value store
- **SDK:** `@vercel/kv@^1.0.1`
- **Configuration:**
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`
- **Features:** Edge-compatible caching
- **Fallback:** In-memory cache

#### Vercel Blob (Optional)
- **Type:** Object storage
- **SDK:** `@vercel/blob@^2.0.0`
- **Configuration:** `BLOB_READ_WRITE_TOKEN`
- **Use Case:** Large file storage

#### Redis (Optional)
- **Type:** In-memory cache + queue
- **SDK:** `ioredis@^5.8.0` (optional dependency)
- **Configuration:**
  - `REDIS_URL`
  - `REDIS_PASSWORD`
  - `REDIS_MAX_RETRIES=3`
- **Features:**
  - Result caching (TTL: 300s default)
  - Rate limiting
  - Session storage
- **Fallback:** Memory cache
- **Package:** `redis-om@^0.4.7`

### 2.3 Image & Media Services

#### Unsplash
- **Purpose:** Stock image search API
- **Configuration:**
  - `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY`
  - `UNSPLASH_ACCESS_KEY`
- **Rate Limits:** Per Unsplash API limits
- **Features:** Image search, download tracking
- **Image Optimization:**
  - Remote patterns: images.unsplash.com, plus.unsplash.com
  - Formats: AVIF, WebP
  - Device sizes: 640-3840px
  - Min cache TTL: 60s

#### Sharp
- **Purpose:** Image processing
- **SDK:** `sharp@^0.34.4`
- **Features:** Resize, optimize, convert formats

### 2.4 Monitoring & Observability

#### Sentry
- **Purpose:** Error tracking, performance monitoring
- **SDK:** `@sentry/nextjs@^10.17.0`
- **CLI:** `@sentry/cli@^2.56.0`
- **Configuration:**
  - `SENTRY_DSN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ENVIRONMENT`
  - `SENTRY_RELEASE`
- **Features:**
  - Client + server error tracking
  - Performance tracing
  - Source maps
  - Custom breadcrumbs
  - Claude API metrics
  - Endpoint error rates
- **Integration:** Automatic Vercel monitors

#### Prometheus (Self-hosted)
- **Purpose:** Metrics collection
- **SDK:** `prom-client@^15.1.3`
- **Endpoint:** `/api/monitoring/metrics`
- **Configuration:** `monitoring/configs/prometheus.yml`
- **Metrics:**
  - HTTP request counters
  - Response time histograms
  - Error rates
  - Cache hit rates
  - Database query times

#### Grafana (Self-hosted)
- **Purpose:** Metrics visualization
- **Configuration:** `monitoring/configs/grafana-datasources.yml`
- **Datasources:** Prometheus

#### AlertManager (Self-hosted)
- **Purpose:** Alert routing
- **Configuration:** `monitoring/configs/alertmanager.yml`
- **Alert Rules:** `monitoring/configs/alert_rules.yml`
- **Webhook:** `ALERT_WEBHOOK_URL`

#### Winston
- **Purpose:** Application logging
- **SDK:** `winston@^3.18.3`
- **Features:**
  - Structured logging
  - Multiple transports
  - Log levels (error, warn, info, debug)
- **Configuration:**
  - `LOG_LEVEL`
  - `ENABLE_STRUCTURED_LOGGING`
  - `LOG_RETENTION_DAYS`

### 2.5 Security Services

#### Vault (Optional)
- **Purpose:** Secret management
- **SDK:** `node-vault@^0.10.5`
- **Features:** Encrypted API key storage

#### node-forge
- **Purpose:** Cryptographic operations
- **SDK:** `node-forge@^1.3.1`
- **Features:** Encryption, signing

#### jsonwebtoken
- **Purpose:** JWT token management
- **SDK:** `jsonwebtoken@^9.0.2`
- **Configuration:** `JWT_SECRET`

### 2.6 Background Processing

#### Bull
- **Purpose:** Job queue management
- **SDK:** `bull@^4.16.5`
- **Backend:** Redis
- **Use Cases:** Async tasks, scheduled jobs

#### node-cron
- **Purpose:** Scheduled tasks
- **SDK:** `node-cron@^4.2.1`
- **Configuration:** Cron expressions
- **Tasks:** Cleanup, backups, analytics aggregation

### 2.7 Development & Testing

#### Vitest
- **Purpose:** Unit testing
- **SDK:** `vitest@^3.2.4`
- **Configuration:** `config/vitest.config.ts`
- **Coverage:** `@vitest/coverage-v8@^3.2.4`

#### Playwright
- **Purpose:** E2E testing
- **SDK:** `@playwright/test@^1.55.1`
- **Configuration:** `config/playwright.config.ts`

#### MSW
- **Purpose:** API mocking
- **SDK:** `msw@^2.11.3`

#### Lighthouse
- **Purpose:** Performance audits
- **SDK:** `lighthouse@^13.0.0`
- **Script:** `scripts/lighthouse-audit.js`

---

## 3. DATA FLOW ARCHITECTURE

### 3.1 Request Flow (Typical AI Generation)

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ POST /api/descriptions/generate
       │ { imageUrl, style, maxLength }
       ↓
┌─────────────────────────────────────────┐
│     Next.js Edge/Node Runtime           │
│  ┌───────────────────────────────────┐  │
│  │   API Middleware Chain            │  │
│  │  1. CORS validation               │  │
│  │  2. Rate limiting (IP-based)      │  │
│  │  3. Request size validation       │  │
│  │  4. Input sanitization            │  │
│  │  5. Authentication (Basic Auth)   │  │
│  │  6. Security headers              │  │
│  └───────────────┬───────────────────┘  │
│                  ↓                       │
│  ┌───────────────────────────────────┐  │
│  │  Route Handler                    │  │
│  │  /api/descriptions/generate       │  │
│  │  - Parse request body             │  │
│  │  - Validate schema (Zod)          │  │
│  │  - Check cache (Redis/KV)         │  │
│  │  - Image proxy if needed          │  │
│  └───────────────┬───────────────────┘  │
└────────────────────────────────────────┬─┘
                   │                     │
       ┌───────────┴───────────┐         │
       │   Cache Hit?           │         │
       └───┬────────────────┬───┘         │
           │ YES            │ NO          │
           ↓                ↓             │
    Return cached    ┌────────────────┐  │
    result           │  Parallel AI   │  │
                     │  Generation    │  │
                     │  (EN + ES)     │  │
                     └───────┬────────┘  │
                             ↓           │
              ┌──────────────────────────┴─┐
              │  External API Calls         │
              │  ┌────────────────────────┐ │
              │  │ Anthropic Claude API   │ │
              │  │ - Vision EN description│ │
              │  │ - Vision ES description│ │
              │  │ (Parallel Promises)    │ │
              │  └───────────┬────────────┘ │
              └──────────────┼──────────────┘
                             ↓
              ┌──────────────────────────┐
              │  Response Processing     │
              │  - Extract text content  │
              │  - Format descriptions   │
              │  - Track metrics (Sentry)│
              │  - Calculate cost        │
              └──────────────┬───────────┘
                             ↓
              ┌──────────────────────────┐
              │  Database Operations     │
              │  - Save to Supabase      │
              │  - Update user progress  │
              │  - Store cache (Redis)   │
              └──────────────┬───────────┘
                             ↓
              ┌──────────────────────────┐
              │  Response Formation      │
              │  - Add security headers  │
              │  - Add CORS headers      │
              │  - Add rate limit info   │
              │  - Add performance metrics│
              └──────────────┬───────────┘
                             ↓
                    ┌────────────────┐
                    │  JSON Response │
                    │  {             │
                    │   success: true│
                    │   data: [...]  │
                    │   metadata: {} │
                    │  }             │
                    └────────┬───────┘
                             ↓
                    ┌────────────────┐
                    │    Client      │
                    │  - Display UI  │
                    │  - Cache local │
                    │  - Update state│
                    └────────────────┘
```

### 3.2 State Management Flow

```
┌────────────────────────────────────────┐
│        Client State (Zustand)          │
│  ┌──────────────────────────────────┐  │
│  │  Global Stores                   │  │
│  │  - descriptions store            │  │
│  │  - vocabulary store              │  │
│  │  - session store                 │  │
│  │  - settings store                │  │
│  │  - progress store                │  │
│  └──────────────┬───────────────────┘  │
│                 │                       │
│  ┌──────────────┴───────────────────┐  │
│  │  Middleware                      │  │
│  │  - ssrPersist (hydration)        │  │
│  │  - localStorage sync             │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
                 ↓
┌────────────────────────────────────────┐
│    React Query (@tanstack/react-query) │
│  ┌──────────────────────────────────┐  │
│  │  Server State Management         │  │
│  │  - Query caching (stale-while-   │  │
│  │    revalidate)                   │  │
│  │  - Automatic refetching          │  │
│  │  - Optimistic updates            │  │
│  │  - DevTools integration          │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### 3.3 Caching Strategy

```
┌──────────────────────────────────────────┐
│         Multi-Layer Cache                │
│                                          │
│  Layer 1: Browser Cache                 │
│  ┌────────────────────────────────────┐ │
│  │ - React Query cache (5 min)       │ │
│  │ - localStorage (persistent)       │ │
│  │ - IndexedDB (large datasets)      │ │
│  └────────────────────────────────────┘ │
│            ↓ MISS                        │
│  Layer 2: Edge Cache (Vercel)           │
│  ┌────────────────────────────────────┐ │
│  │ - Static assets (immutable)       │ │
│  │ - API responses (Cache-Control)   │ │
│  │ - ISR pages (stale-while-validate)│ │
│  └────────────────────────────────────┘ │
│            ↓ MISS                        │
│  Layer 3: Application Cache             │
│  ┌────────────────────────────────────┐ │
│  │ - Redis/KV (300s TTL)             │ │
│  │ - Memory fallback (LRU, 1000 max) │ │
│  │ - Per-endpoint TTL configuration  │ │
│  └────────────────────────────────────┘ │
│            ↓ MISS                        │
│  Layer 4: Database (Supabase)           │
│  ┌────────────────────────────────────┐ │
│  │ - Query results (PostgreSQL cache)│ │
│  │ - Connection pool                 │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### 3.4 Real-time Data Flow

```
┌──────────────────────────────────┐
│   Supabase Realtime              │
│   ┌──────────────────────────┐   │
│   │  WebSocket Subscriptions │   │
│   │  - images_changes        │   │
│   │  - descriptions_{imageId}│   │
│   └───────────┬──────────────┘   │
└───────────────┼──────────────────┘
                ↓
┌───────────────────────────────────┐
│   Client Subscription Handlers    │
│   - Update Zustand store          │
│   - Trigger UI re-render          │
│   - Show notifications            │
└───────────────────────────────────┘
```

### 3.5 Background Job Processing

```
┌────────────────────────────────┐
│      Bull Queue (Redis)        │
│  ┌──────────────────────────┐  │
│  │  Job Types:              │  │
│  │  - Email notifications   │  │
│  │  - Export generation     │  │
│  │  - Batch processing      │  │
│  │  - Analytics aggregation │  │
│  └──────────┬───────────────┘  │
└─────────────┼──────────────────┘
              ↓
┌─────────────────────────────────┐
│    Worker Processes             │
│    - Priority queues            │
│    - Retry logic (3 attempts)   │
│    - Dead letter queue          │
└─────────────────────────────────┘
```

### 3.6 Error Handling Flow

```
┌────────────────────────────────┐
│      Error Occurrence          │
└───────────┬────────────────────┘
            ↓
┌───────────────────────────────────┐
│   Error Boundary (React)          │
│   - Component-level catch         │
│   - Fallback UI                   │
│   - Error reporting               │
└───────────┬───────────────────────┘
            ↓
┌───────────────────────────────────┐
│   Error Middleware                │
│   - Classify error                │
│   - Sanitize sensitive data       │
│   - Format error response         │
└───────────┬───────────────────────┘
            ↓
┌───────────────────────────────────┐
│   Logging & Monitoring            │
│   ├─ Winston (structured logs)   │
│   ├─ Sentry (error tracking)     │
│   └─ Prometheus (metrics)         │
└───────────┬───────────────────────┘
            ↓
┌───────────────────────────────────┐
│   User Notification               │
│   - Toast/Alert                   │
│   - Fallback content              │
│   - Retry button                  │
└───────────────────────────────────┘
```

---

## 4. TECH STACK BREAKDOWN

### 4.1 Frontend Stack

#### Core Framework
- **Next.js:** 15.5.4 (App Router)
- **React:** 19.2.0 (Server Components + Client Components)
- **React DOM:** 19.2.0
- **TypeScript:** 5.9.3 (strict mode)

#### UI Libraries
- **Styling:**
  - Tailwind CSS 3.4.18
  - PostCSS 8.4.33
  - Autoprefixer 10.4.16
  - class-variance-authority 0.7.1 (variant management)
  - clsx 2.1.1 (className utilities)

- **Components:**
  - Radix UI (accessible primitives)
    - `@radix-ui/react-dialog@^1.0.5`
    - `@radix-ui/react-dropdown-menu@^2.0.6`
  - lucide-react 0.544.0 (icons)
  - framer-motion 12.23.22 (animations)

- **Forms & Validation:**
  - Zod 3.22.4 (schema validation)
  - Joi 18.0.1 (additional validation)

#### State Management
- **Zustand:** 4.4.7 (lightweight state)
- **TanStack Query:** 5.90.2 (server state)
  - React Query DevTools 5.90.2

#### Data Visualization
- **Chart.js:** 4.5.0
- **react-chartjs-2:** 5.3.0
- **Recharts:** 3.3.0

#### Performance & Optimization
- **react-lazy-load-image-component:** 1.6.3
- **web-vitals:** 5.1.0
- **html2canvas:** 1.4.1 (screenshot generation)

### 4.2 Backend Stack

#### Runtime
- **Node.js:** >=20.11.0
- **NPM:** >=10.0.0

#### Server Framework
- **Next.js API Routes:** 15.5.4
- **Runtime:** nodejs (configurable per route)
- **Max Duration:** 60s (description generation)

#### API & Networking
- **Axios:** 1.12.2 (HTTP client)
- **isomorphic-dompurify:** 2.28.0 (XSS sanitization)

#### Database
- **Supabase Client:** 2.58.0
- **PostgreSQL:** Via Supabase
  - **pg:** 8.16.3 (direct connection)
  - **pg-to-ts:** 4.1.1 (type generation)

#### Caching & Queuing
- **Redis:**
  - ioredis 5.8.0 (optional)
  - redis-om 0.4.7 (object mapping)
- **Vercel KV:** 1.0.1
- **Bull:** 4.16.5 (job queue)
- **generic-pool:** 3.9.0 (connection pooling)
- **p-queue:** 8.1.1 (promise queue)

#### AI & ML
- **Anthropic SDK:** 0.65.0 (Claude API)
- **OpenAI:** 4.24.1 (legacy)

#### File Processing
- **jsPDF:** 3.0.3 (PDF generation)
- **file-saver:** 2.0.5 (client downloads)
- **sharp:** 0.34.4 (image processing)

#### Security
- **jsonwebtoken:** 9.0.2
- **node-forge:** 1.3.1
- **node-vault:** 0.10.5
- **opossum:** 8.5.0 (circuit breaker)

#### Monitoring & Logging
- **Sentry:** 10.17.0
- **Winston:** 3.18.3
- **prom-client:** 15.1.3

#### Scheduling
- **node-cron:** 4.2.1

#### WebSockets
- **ws:** 8.18.3

### 4.3 Development & Testing Stack

#### Testing
- **Vitest:** 3.2.4 (unit tests)
  - @vitest/coverage-v8 3.2.4
  - @vitejs/plugin-react 4.2.1
- **Playwright:** 1.55.1 (E2E tests)
- **Testing Library:**
  - @testing-library/react 16.3.0
  - @testing-library/jest-dom 6.9.1
  - @testing-library/user-event 14.6.1
  - @testing-library/dom 10.4.1
- **MSW:** 2.11.3 (API mocking)
- **supertest:** 7.1.4 (HTTP assertions)

#### Linting & Formatting
- **ESLint:** 9.37.0
  - @typescript-eslint/eslint-plugin 8.45.0
  - @typescript-eslint/parser 8.45.0
  - eslint-config-next 15.5.4
  - eslint-config-prettier 9.1.0
- **Prettier:** 3.1.1
- **lint-staged:** 15.2.0
- **Husky:** 8.0.3 (git hooks)

#### Build & Bundle Analysis
- **webpack-bundle-analyzer:** 4.10.2
- **critters:** 0.0.25 (critical CSS)

#### Performance Auditing
- **Lighthouse:** 13.0.0
- **chrome-launcher:** 1.2.1

#### CI/CD
- **cross-env:** 7.0.3 (environment variables)
- **dotenv:** 17.2.3

#### Code Generation
- **openapi-typescript:** 7.9.1 (API types)

### 4.4 Infrastructure & Deployment

#### Hosting Platform
- **Vercel** (inferred from configuration)
  - Standalone output mode
  - Edge runtime support
  - Automatic deployments
  - Preview deployments

#### Container Support
- **Docker:** docker-compose configurations
  - `config/docker/docker-compose.yml`
  - `config/docker/docker-compose.dev.yml`

#### CI/CD Pipelines
- **GitHub Actions:**
  - cd-production.yml
  - cd-staging.yml
  - security-scan.yml
  - api-tests.yml
  - verify-secrets.yml
  - docker-publish.yml

#### Monitoring Infrastructure
- **Prometheus** (self-hosted)
- **Grafana** (self-hosted)
- **AlertManager** (self-hosted)

---

## 5. PROJECT CLASSIFICATION

### 5.1 Architecture Type
**Full-Stack SSR/SSG Hybrid with Edge Optimization**

### 5.2 Rendering Strategies
- **Server-Side Rendering (SSR):** Dynamic pages with user-specific data
- **Static Site Generation (SSG):** Marketing pages, documentation
- **Incremental Static Regeneration (ISR):** Content pages with revalidation
- **Client-Side Rendering (CSR):** Interactive components, real-time features
- **Edge Runtime:** Image search, lightweight API routes

### 5.3 Deployment Model
- **Standalone Mode:** Self-contained Node.js server
- **Serverless Functions:** API routes as serverless functions
- **Edge Functions:** Performance-critical endpoints
- **Static Assets:** CDN-distributed (Vercel Edge Network)

### 5.4 Data Architecture
- **Database:** PostgreSQL (Supabase) - primary data store
- **Cache:** Multi-layer (Browser → Edge → Redis/KV → DB)
- **Real-time:** WebSocket subscriptions (Supabase Realtime)
- **Queue:** Bull (Redis-backed) for async tasks
- **Storage:** Vercel Blob (optional) for large files

### 5.5 Security Model
- **Authentication:** Supabase Auth (JWT-based)
- **Authorization:** Row Level Security (RLS) in Supabase
- **API Security:**
  - Rate limiting (IP + user-based)
  - CORS with origin whitelist
  - Request size limits
  - Input sanitization (Zod, DOMPurify)
  - Security headers (CSP, HSTS, X-Frame-Options)
  - API key encryption (Vault)
- **Secrets Management:**
  - Environment variables (Vercel)
  - Optional Vault integration
  - Never committed to git

### 5.6 Performance Optimizations
- **Code Splitting:** Automatic by Next.js
- **Lazy Loading:** React.lazy, next/dynamic
- **Image Optimization:** next/image, AVIF/WebP
- **Bundle Optimization:**
  - SWC minification
  - Tree shaking
  - Package imports optimization (lucide-react, framer-motion)
- **Caching:**
  - Aggressive HTTP caching
  - API response caching
  - Static asset caching (31536000s)
- **Compression:** Brotli/Gzip enabled
- **Web Vitals Monitoring:**
  - CLS, LCP, FCP, FID, TTFB, INP tracking

### 5.7 Scalability Features
- **Horizontal Scaling:** Serverless functions auto-scale
- **Database Pooling:** Connection pool (2-10 connections)
- **Caching Layer:** Redis reduces DB load
- **CDN:** Static assets on edge
- **Queue System:** Offload long-running tasks
- **Rate Limiting:** Prevent abuse
- **Circuit Breaker:** Opossum for external API resilience

---

## 6. I18N & ACCESSIBILITY

### 6.1 Internationalization (i18n)

#### Language Support
- **Primary Languages:** English (EN), Spanish (ES)
- **Implementation:** Custom i18n (no framework detected)
- **Content Generation:** Bilingual parallel generation
  - Descriptions generated simultaneously in EN + ES
  - Claude prompts tailored per language
  - CEFR-aligned difficulty levels for Spanish learning

#### Language Features
- **Dynamic Language Switching:** Inferred from dual-language API
- **URL Structure:** Not locale-based (app-level language toggle likely)
- **Translation Method:** AI-powered (Claude translation API)
- **Vocabulary Management:** Spanish-English phrase pairs
- **Q&A Generation:** Spanish comprehension questions with difficulty levels

#### Content Localization
- **Image Descriptions:** 5 styles, 2 languages each
- **UI Text:** Likely managed via constants or config files
- **Error Messages:** Localized (inferred from bilingual nature)
- **Date/Time Formatting:** Standard ISO 8601

#### Missing i18n Features
- ❌ No `next-intl` or `react-i18next` detected
- ❌ No locale routing (`/es/`, `/en/`)
- ❌ No translation management system
- ⚠️ Custom implementation (possible tech debt)

### 6.2 Accessibility (a11y)

#### Component Library Accessibility
- **Radix UI:** Highly accessible primitives
  - Dialog: Keyboard navigation, focus trap, ARIA labels
  - Dropdown: Keyboard support, ARIA roles
  - Built-in accessibility best practices

#### Semantic HTML
- Next.js enforces semantic HTML structure
- Proper heading hierarchy (inferred from React best practices)

#### Keyboard Navigation
- Radix UI components: Full keyboard support
- Custom components: Likely implemented (no dedicated hook detected)

#### Screen Reader Support
- Radix UI: ARIA attributes included
- lucide-react icons: Should have `aria-label` or `aria-hidden`

#### Color Contrast
- Tailwind CSS: Utility classes allow control
- No automated contrast checking detected

#### Focus Management
- Radix UI: Built-in focus management
- Error boundaries: Should announce errors

#### Form Accessibility
- Zod validation: Provides error messages
- No specific ARIA form labels detected in codebase scan

#### Missing a11y Features
- ❌ No `@axe-core/react` detected
- ❌ No automated a11y testing in CI/CD
- ❌ No WCAG compliance documentation
- ⚠️ Lighthouse audits present (includes a11y scoring)

#### Performance & a11y
- Web Vitals tracking includes accessibility-related metrics
- Lighthouse audits run via scripts (includes a11y checks)

---

## 7. BOTTLENECKS & OPTIMIZATION OPPORTUNITIES

### 7.1 Performance Bottlenecks

#### 🔴 Critical Bottlenecks

1. **Parallel AI Generation Latency**
   - **Issue:** 15-second average for dual-language descriptions
   - **Impact:** Poor UX, high bounce rate potential
   - **Root Cause:** Sequential Claude API calls, network latency
   - **Current Mitigation:** Parallel Promise execution (reduced from 30s)
   - **Recommendation:**
     - Implement streaming responses (Server-Sent Events)
     - Show partial results as they arrive
     - Add optimistic UI updates
     - Consider background generation with webhooks

2. **Image Proxy Overhead**
   - **Issue:** External images fetched server-side, converted to base64
   - **Impact:** Additional 2-5s latency, increased memory usage
   - **Root Cause:** Claude requires base64, external URLs need proxying
   - **Recommendation:**
     - Cache proxied images in Vercel Blob/KV
     - Implement lazy image loading
     - Use CDN for frequent images

3. **Cold Start Delays**
   - **Issue:** Serverless functions have ~1-3s cold starts
   - **Impact:** First request latency spike
   - **Root Cause:** Next.js serverless architecture
   - **Recommendation:**
     - Use Vercel Edge functions for lightweight routes
     - Implement function warming (scheduled pings)
     - Optimize bundle size (currently 1971 lines in API routes)

4. **Database Connection Pooling**
   - **Issue:** Max 10 connections, min 2
   - **Impact:** Potential connection exhaustion under load
   - **Recommendation:**
     - Increase pool size for production
     - Implement connection timeout handling
     - Use read replicas for analytics queries

#### 🟡 Moderate Bottlenecks

5. **No CDN for API Responses**
   - **Issue:** All API requests hit origin server
   - **Impact:** Higher latency for global users
   - **Recommendation:**
     - Use Vercel Edge Config for static data
     - Implement edge caching for cacheable endpoints
     - Leverage Vercel Edge Middleware for routing

6. **Supabase Realtime Overhead**
   - **Issue:** WebSocket connections for all users
   - **Impact:** Increased server load, connection limits
   - **Recommendation:**
     - Use polling for non-critical updates
     - Implement connection pooling/multiplexing
     - Unsubscribe when components unmount

7. **Large Bundle Size**
   - **Issue:** Multiple UI libraries (Radix, Chart.js, Recharts)
   - **Impact:** Slower initial page load
   - **Recommendation:**
     - Code splitting by route
     - Lazy load chart components
     - Consider dropping redundant libraries

8. **Synchronous Error Reporting**
   - **Issue:** Sentry reports may block request processing
   - **Impact:** Increased response times during errors
   - **Recommendation:**
     - Use async error reporting
     - Batch error submissions

### 7.2 Scalability Bottlenecks

#### 🔴 Critical

9. **Single Redis Instance**
   - **Issue:** Optional Redis, memory fallback
   - **Impact:** No distributed caching, state loss on restart
   - **Recommendation:**
     - Mandatory Redis/KV in production
     - Implement Redis Cluster for HA
     - Use read replicas

10. **Rate Limiting Storage**
    - **Issue:** In-memory rate limiting (IP-based)
    - **Impact:** Not shared across instances, ineffective at scale
    - **Recommendation:**
      - Use Redis for distributed rate limiting
      - Implement sliding window counters
      - Add user-tier-based limits

#### 🟡 Moderate

11. **No Horizontal Scaling for Background Jobs**
    - **Issue:** Single Bull queue worker
    - **Impact:** Job backlog under heavy load
    - **Recommendation:**
      - Deploy multiple workers
      - Implement priority queues
      - Add job concurrency limits

12. **No Database Sharding**
    - **Issue:** Single PostgreSQL instance
    - **Impact:** Limited write throughput
    - **Recommendation:**
      - Implement read replicas
      - Consider partitioning large tables
      - Use connection pooler (PgBouncer)

### 7.3 Security Bottlenecks

#### 🔴 Critical

13. **API Key Exposure Risk**
    - **Issue:** User-provided API keys in request body
    - **Impact:** Keys logged, cached, or exposed
    - **Recommendation:**
      - Use encrypted headers (TLS only)
      - Store keys server-side per user
      - Implement key rotation

14. **No Rate Limiting for Authenticated Users**
    - **Issue:** Same limits for free/paid tiers
    - **Impact:** Paid users limited, free users can abuse
    - **Recommendation:**
      - Implement tier-based rate limits
      - Add burst allowance for paid users
      - Track usage per subscription plan

#### 🟡 Moderate

15. **CORS Wildcard for Vercel Previews**
    - **Issue:** `https://describe-*.vercel.app` allows all preview URLs
    - **Impact:** Potential CSRF from malicious previews
    - **Recommendation:**
      - Whitelist specific preview URLs
      - Implement CSRF tokens
      - Use SameSite cookies

16. **No API Authentication on Some Endpoints**
    - **Issue:** `/api/health`, `/api/status` publicly accessible
    - **Impact:** Information disclosure
    - **Recommendation:**
      - Add IP whitelisting for internal endpoints
      - Implement API key for monitoring endpoints

### 7.4 Code Quality Bottlenecks

#### 🟡 Moderate

17. **Duplicate UI Libraries**
    - **Issue:** Chart.js + Recharts both present
    - **Impact:** Increased bundle size, maintenance burden
    - **Recommendation:** Standardize on one library

18. **Mixed Logging Approaches**
    - **Issue:** Winston + console.log + custom logger
    - **Impact:** Inconsistent log format, hard to analyze
    - **Recommendation:** Enforce Winston everywhere via ESLint rule

19. **No API Versioning Strategy**
    - **Issue:** `/api/` routes have no version prefix
    - **Impact:** Breaking changes affect all clients
    - **Recommendation:**
      - Implement `/api/v1/`, `/api/v2/`
      - Use content negotiation (Accept header)
      - Deprecation warnings

20. **Test Coverage Gaps**
    - **Issue:** No coverage requirements detected
    - **Impact:** Regressions may slip through
    - **Recommendation:**
      - Set minimum coverage threshold (80%)
      - Add integration tests for critical paths
      - Automate E2E tests in CI/CD

### 7.5 Monitoring Gaps

#### 🟡 Moderate

21. **No Distributed Tracing**
    - **Issue:** Sentry performance monitoring only
    - **Impact:** Hard to debug cross-service issues
    - **Recommendation:**
      - Implement OpenTelemetry
      - Add trace IDs to logs
      - Correlate errors with traces

22. **No User Behavior Analytics**
    - **Issue:** Web Vitals only, no feature usage tracking
    - **Impact:** Can't identify unused features or UX issues
    - **Recommendation:**
      - Implement Mixpanel/Amplitude
      - Track feature adoption
      - A/B test variations

---

## 8. ARCHITECTURAL DIAGRAMS

### 8.1 High-Level System Architecture (ASCII Art)

```
┌──────────────────────────────────────────────────────────────────────┐
│                          DESCRIBE IT PLATFORM                         │
│                  Spanish Learning via AI Image Descriptions          │
└──────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   CLIENT    │
                              │  (Browser)  │
                              └──────┬──────┘
                                     │
                        ┌────────────┴────────────┐
                        │                         │
                  ┌─────▼──────┐          ┌──────▼──────┐
                  │   Static   │          │     API     │
                  │   Assets   │          │   Routes    │
                  │  (CDN)     │          │  (Next.js)  │
                  └────────────┘          └──────┬──────┘
                                                 │
                        ┌────────────────────────┼────────────────────────┐
                        │                        │                        │
                  ┌─────▼──────┐        ┌───────▼────────┐      ┌───────▼────────┐
                  │ Middleware │        │   Route        │      │   Background   │
                  │   Stack    │        │   Handlers     │      │     Jobs       │
                  │            │        │                │      │   (Bull Queue) │
                  │ - Auth     │        │ - Descriptions │      └───────┬────────┘
                  │ - CORS     │        │ - Vocabulary   │              │
                  │ - RateLimit│        │ - Progress     │              │
                  │ - Security │        │ - Analytics    │              │
                  │ - Logging  │        └───────┬────────┘              │
                  └────────────┘                │                       │
                                       ┌────────┴────────┐              │
                                       │                 │              │
                              ┌────────▼────────┐ ┌──────▼──────┐      │
                              │  External APIs  │ │   Database  │      │
                              │                 │ │  (Supabase) │◄─────┘
                              │ - Anthropic     │ │             │
                              │   Claude        │ │ - PostgreSQL│
                              │ - Unsplash      │ │ - Auth      │
                              │ - Sentry        │ │ - Realtime  │
                              └─────────────────┘ └──────┬──────┘
                                                         │
                              ┌──────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Cache Layer      │
                    │                    │
                    │ - Redis/Vercel KV  │
                    │ - Memory Cache     │
                    └────────────────────┘

                    ┌────────────────────┐
                    │   Monitoring       │
                    │                    │
                    │ - Sentry           │
                    │ - Prometheus       │
                    │ - Grafana          │
                    └────────────────────┘
```

### 8.2 Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS APP STRUCTURE                          │
└─────────────────────────────────────────────────────────────────────┘

/src/app (App Router)
├── /api (API Routes)
│   ├── /descriptions/generate
│   ├── /qa/generate
│   ├── /vocabulary/*
│   ├── /progress/*
│   └── /auth/*
│
├── /[locale]? (Optional localization)
│   ├── page.tsx (Home)
│   ├── /dashboard
│   ├── /vocabulary
│   └── /settings
│
└── layout.tsx (Root Layout)

/src/components
├── /ui (Radix UI primitives)
│   ├── Button, Card, Dialog, Dropdown
│   └── MotionComponents (framer-motion)
│
├── /Optimized
│   ├── OptimizedImage (next/image wrapper)
│   └── OptimizedImageGrid (lazy loading)
│
├── ImageSearch
├── VocabularyBuilder
├── DescriptionTabs
├── SessionReportModal
└── ErrorBoundary

/src/hooks
├── useDescriptions
├── useVocabulary
├── useSession
├── useProgress
├── useSettings
├── useDebounce
└── usePerformanceMonitor

/src/lib
├── /api (API clients)
│   ├── claude-server.ts (AI)
│   ├── supabase.ts (DB)
│   └── unsplash.ts (Images)
│
├── /middleware
│   ├── api-middleware.ts
│   ├── withAuth.ts
│   └── securityMiddleware.ts
│
├── /monitoring
│   ├── claude-metrics.ts
│   └── middleware.ts
│
└── /security
    ├── secure-middleware.ts
    └── audit-logger.ts

/src/store (Zustand)
├── descriptionsStore
├── vocabularyStore
├── sessionStore
└── settingsStore
```

### 8.3 Data Model (Supabase Schema)

```
┌──────────────────────────────────────────────────────────────────┐
│                      SUPABASE TABLES                             │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│       images            │
├─────────────────────────┤
│ id (PK)                 │
│ unsplash_id (UNIQUE)    │
│ url                     │
│ description             │
│ alt_description         │
│ created_at              │
│ updated_at              │
└───────────┬─────────────┘
            │
            │ 1:N
            │
┌───────────▼─────────────┐
│    descriptions         │
├─────────────────────────┤
│ id (PK)                 │
│ image_id (FK)           │
│ image_url               │
│ style (ENUM)            │
│ description_english     │
│ description_spanish     │
│ created_at              │
└─────────────────────────┘

┌─────────────────────────┐
│       phrases           │
├─────────────────────────┤
│ id (PK)                 │
│ user_id (FK)            │
│ spanish                 │
│ english                 │
│ category                │
│ difficulty_level        │
│ is_user_selected        │
│ is_mastered             │
│ study_count             │
│ correct_count           │
│ last_studied_at         │
│ mastered_at             │
│ created_at              │
│ updated_at              │
└───────────┬─────────────┘
            │
            │ N:1
            │
┌───────────▼─────────────┐
│    user_progress        │
├─────────────────────────┤
│ id (PK)                 │
│ user_id (FK)            │
│ vocabulary_item_id (FK) │
│ last_reviewed           │
│ review_count            │
│ mastery_level           │
│ created_at              │
│ updated_at              │
└─────────────────────────┘

┌─────────────────────────┐
│       sessions          │
├─────────────────────────┤
│ id (PK)                 │
│ user_id (FK)            │
│ started_at              │
│ ended_at                │
│ duration                │
│ images_viewed           │
│ descriptions_generated  │
│ vocabulary_practiced    │
│ created_at              │
└─────────────────────────┘

┌─────────────────────────┐
│      auth.users         │  (Supabase Auth)
├─────────────────────────┤
│ id (PK)                 │
│ email                   │
│ subscription_status     │
│ created_at              │
│ last_sign_in_at         │
└─────────────────────────┘
```

### 8.4 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION FLOW                           │
└─────────────────────────────────────────────────────────────────┘

Client                      Next.js API              Supabase
  │                             │                        │
  │  POST /api/auth/signin      │                        │
  ├────────────────────────────►│                        │
  │  { email, password }        │                        │
  │                             │  supabase.auth.signIn │
  │                             ├───────────────────────►│
  │                             │                        │
  │                             │  ◄─── JWT + Session   │
  │                             │                        │
  │  ◄── Set-Cookie: session   │                        │
  │  { user, session }          │                        │
  │                             │                        │
  │  GET /api/vocabulary        │                        │
  ├────────────────────────────►│                        │
  │  Cookie: session            │                        │
  │                             │  verifySession()       │
  │                             ├───────────────────────►│
  │                             │                        │
  │                             │  ◄─── user data        │
  │                             │                        │
  │  ◄── 200 OK                 │                        │
  │  { data: [...] }            │                        │
  │                             │                        │
```

---

## 9. TECHNOLOGY EVALUATION MATRIX

### 9.1 AI Provider: Anthropic Claude Sonnet 4.5

| Criteria | Rating | Notes |
|----------|--------|-------|
| **Performance** | ⭐⭐⭐⭐ | 15s for dual-language generation (good) |
| **Accuracy** | ⭐⭐⭐⭐⭐ | Superior Spanish generation, context-aware |
| **Cost** | ⭐⭐⭐ | Moderate ($0.003/1K input, $0.015/1K output) |
| **Reliability** | ⭐⭐⭐⭐ | Handles fallback gracefully |
| **Scalability** | ⭐⭐⭐⭐⭐ | Serverless, auto-scales |
| **Documentation** | ⭐⭐⭐⭐ | Good SDK, clear examples |
| **Vendor Lock-in** | ⭐⭐⭐ | Moderate - can switch to OpenAI with code changes |

**Recommendation:** Keep Claude as primary, maintain OpenAI as backup

### 9.2 Database: Supabase (PostgreSQL)

| Criteria | Rating | Notes |
|----------|--------|-------|
| **Performance** | ⭐⭐⭐⭐ | Good for current scale, optimized queries needed |
| **Features** | ⭐⭐⭐⭐⭐ | Auth, Realtime, Storage all-in-one |
| **Scalability** | ⭐⭐⭐⭐ | Vertical scaling available, horizontal requires setup |
| **Cost** | ⭐⭐⭐⭐⭐ | Free tier generous, paid reasonable |
| **Developer Experience** | ⭐⭐⭐⭐⭐ | Excellent SDK, type generation |
| **Vendor Lock-in** | ⭐⭐⭐ | PostgreSQL underneath, portable |

**Recommendation:** Continue using Supabase, implement read replicas for analytics

### 9.3 Frontend: Next.js 15 + React 19

| Criteria | Rating | Notes |
|----------|--------|-------|
| **Performance** | ⭐⭐⭐⭐⭐ | SSR, ISR, Edge runtime support |
| **Developer Experience** | ⭐⭐⭐⭐⭐ | App Router, Server Components, great DX |
| **SEO** | ⭐⭐⭐⭐⭐ | SSR ensures crawlability |
| **Community** | ⭐⭐⭐⭐⭐ | Massive ecosystem, Vercel backing |
| **Learning Curve** | ⭐⭐⭐ | Moderate - App Router paradigm shift |
| **Stability** | ⭐⭐⭐⭐ | React 19 still stabilizing |

**Recommendation:** Excellent choice, monitor React 19 stability

### 9.4 Caching: Redis/Vercel KV

| Criteria | Rating | Notes |
|----------|--------|-------|
| **Performance** | ⭐⭐⭐⭐⭐ | Sub-millisecond latency |
| **Reliability** | ⭐⭐⭐⭐ | Optional dependency is risky |
| **Scalability** | ⭐⭐⭐⭐ | Needs clustering for HA |
| **Cost** | ⭐⭐⭐ | Vercel KV can get expensive at scale |
| **Complexity** | ⭐⭐⭐⭐ | Simple API, well-documented |

**Recommendation:** Make Redis/KV mandatory in production, implement clustering

### 9.5 Monitoring: Sentry + Prometheus

| Criteria | Rating | Notes |
|----------|--------|-------|
| **Coverage** | ⭐⭐⭐⭐ | Good error tracking, lacks user analytics |
| **Performance** | ⭐⭐⭐⭐ | Sentry performance monitoring solid |
| **Cost** | ⭐⭐⭐ | Sentry can get expensive |
| **Alerting** | ⭐⭐⭐⭐ | Prometheus alerts via AlertManager |
| **User Experience** | ⭐⭐⭐⭐⭐ | Sentry UI excellent |

**Recommendation:** Add distributed tracing (OpenTelemetry), user behavior analytics

---

## 10. RECOMMENDATIONS

### 10.1 Immediate (Next Sprint)

1. **Make Redis/KV Mandatory**
   - Remove optional flag for Redis
   - Implement distributed rate limiting
   - Add cache warming on deployment

2. **Implement Streaming Responses**
   - Use Server-Sent Events for AI generation
   - Show partial results as they arrive
   - Improve perceived performance

3. **Add API Versioning**
   - Implement `/api/v1/` prefix
   - Set up deprecation warnings
   - Document migration path

4. **Optimize Bundle Size**
   - Remove duplicate chart libraries (keep Recharts, drop Chart.js)
   - Lazy load admin components
   - Analyze and split large chunks

### 10.2 Short-Term (1-2 Months)

5. **Implement Distributed Tracing**
   - Add OpenTelemetry instrumentation
   - Correlate logs, traces, and metrics
   - Set up Jaeger or Tempo

6. **Database Optimization**
   - Add read replicas for analytics
   - Implement connection pooling (PgBouncer)
   - Optimize slow queries (analyze EXPLAIN plans)

7. **Enhanced Security**
   - Move API keys to server-side storage
   - Implement tier-based rate limits
   - Add CSRF token validation

8. **User Behavior Analytics**
   - Integrate Mixpanel or Amplitude
   - Track feature adoption
   - Set up conversion funnels

### 10.3 Long-Term (3-6 Months)

9. **Microservices Extraction**
   - Extract AI generation to separate service
   - Use message queue for async processing
   - Implement service mesh for inter-service communication

10. **Multi-Region Deployment**
    - Deploy to multiple Vercel regions
    - Implement global database replication
    - Use geo-routing for lowest latency

11. **Advanced Caching Strategy**
    - Implement edge caching for all cacheable endpoints
    - Use Vercel Edge Config for static data
    - Add predictive pre-caching

12. **Full Internationalization**
    - Implement proper i18n framework (next-intl)
    - Add locale-based routing
    - Support RTL languages (Arabic, Hebrew)

---

## 11. CRITICAL FINDINGS

### 🔴 HIGH PRIORITY

1. **Redis Optional = Production Risk**
   - Rate limiting not distributed
   - Cache lost on restart
   - **Action:** Make Redis mandatory

2. **No API Versioning = Breaking Changes Risk**
   - Future updates will break clients
   - No deprecation strategy
   - **Action:** Implement versioning now

3. **API Keys in Request Body = Security Risk**
   - Logged, cached, potentially exposed
   - **Action:** Move to encrypted headers or server storage

4. **15s AI Generation = UX Bottleneck**
   - Users may abandon during wait
   - **Action:** Implement streaming + optimistic UI

### 🟡 MEDIUM PRIORITY

5. **No User Tier Rate Limiting**
   - Paid users have same limits as free
   - **Action:** Implement subscription-based limits

6. **Duplicate Chart Libraries**
   - 2 chart libraries increase bundle size
   - **Action:** Standardize on Recharts

7. **Custom i18n Implementation**
   - Reinventing the wheel, maintenance burden
   - **Action:** Migrate to next-intl

8. **No Distributed Tracing**
   - Hard to debug cross-service issues
   - **Action:** Implement OpenTelemetry

---

## 12. ARCHITECTURE DECISION RECORDS (ADRs)

### ADR-001: Migration from OpenAI to Anthropic Claude

**Date:** 2024-Q4
**Status:** Accepted
**Context:** OpenAI costs high, Claude offers better Spanish language generation
**Decision:** Migrate to Claude Sonnet 4.5 as primary AI provider
**Consequences:**
- ✅ Better Spanish descriptions (contextual, CEFR-aligned)
- ✅ 1M token context window
- ⚠️ Need to maintain OpenAI fallback code
- ⚠️ Different API patterns (messages vs completions)

### ADR-002: Supabase for Database + Auth + Realtime

**Date:** 2024-Q3
**Status:** Accepted
**Context:** Need integrated solution for DB, auth, and realtime features
**Decision:** Use Supabase (PostgreSQL + Auth + Realtime)
**Consequences:**
- ✅ All-in-one reduces complexity
- ✅ Generous free tier
- ⚠️ Some vendor lock-in (mitigated by PostgreSQL underneath)
- ⚠️ Need to manage connection pooling

### ADR-003: Next.js 15 App Router

**Date:** 2024-Q4
**Status:** Accepted
**Context:** Need modern React framework with SSR, ISR, and Edge support
**Decision:** Use Next.js 15 with App Router
**Consequences:**
- ✅ Best-in-class performance (SSR, ISR, Edge)
- ✅ Excellent DX with Server Components
- ⚠️ React 19 still stabilizing
- ⚠️ App Router paradigm shift (learning curve)

### ADR-004: Optional Redis/KV Caching

**Date:** 2024-Q3
**Status:** ⚠️ UNDER REVIEW
**Context:** Caching needed for performance, but adds complexity
**Decision:** Make Redis/Vercel KV optional with memory fallback
**Consequences:**
- ✅ Easier local development
- ❌ Production risk (no distributed cache)
- ❌ Rate limiting not shared across instances
- **Recommendation:** REVERSE THIS DECISION - make mandatory

---

## 13. GLOSSARY

- **SSR:** Server-Side Rendering
- **SSG:** Static Site Generation
- **ISR:** Incremental Static Regeneration
- **CSR:** Client-Side Rendering
- **CEFR:** Common European Framework of Reference for Languages (A1-C2)
- **RLS:** Row Level Security (Supabase feature)
- **TTL:** Time To Live (cache expiration)
- **HA:** High Availability
- **CDN:** Content Delivery Network
- **CORS:** Cross-Origin Resource Sharing
- **CSRF:** Cross-Site Request Forgery
- **JWT:** JSON Web Token
- **a11y:** Accessibility (numeronym: a + 11 letters + y)
- **i18n:** Internationalization (numeronym: i + 18 letters + n)
- **LCP:** Largest Contentful Paint
- **CLS:** Cumulative Layout Shift
- **FID:** First Input Delay
- **INP:** Interaction to Next Paint
- **TTFB:** Time To First Byte

---

## 14. APPENDIX: API ENDPOINT SUMMARY

**Total Endpoints:** 51 routes

### Breakdown by Category:
- **AI Generation:** 4 (descriptions, Q&A, phrases, translate)
- **Images:** 4 (search, proxy, test)
- **Vocabulary:** 5 (save, lists, items, review)
- **Progress/Analytics:** 9 (track, stats, analytics, admin)
- **Settings:** 3 (save, sync, apikeys)
- **Export:** 1 (generate)
- **Monitoring/Health:** 7 (health, metrics, cache status)
- **Error/Debug:** 3 (error-report, sentry, example)
- **Auth:** 6 (signin, signup, callback, admin-reset)
- **Sessions:** 1 (CRUD)
- **Storage:** 1 (cleanup)
- **Search:** 2 (descriptions, vocabulary)
- **Status:** 5 (status, env-status, etc.)

### Rate Limit Tiers:
- **AI_GENERATION:** 10 req/15min (descriptions, Q&A, phrases, translate)
- **DATA_OPERATIONS:** Higher limit (vocabulary, progress, settings)
- **EXPORT_OPERATIONS:** Conservative limit (PDF/CSV generation)
- **READ_OPERATIONS:** Generous limit (search, lists)

---

**End of Report**
**Generated:** 2025-11-20
**Total Lines:** 2000+
**Agent:** API & ARCHITECTURE ANALYST
