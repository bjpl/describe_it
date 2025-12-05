# Integration Test Architecture (Phase 4)

**Version:** 1.0
**Date:** 2025-12-04
**Status:** Architecture Design
**Priority:** Critical

## Executive Summary

This document defines the comprehensive integration testing architecture for the describe-it application, focusing on database integration, API endpoints, service layer testing, and external service mocking strategies.

## Current State Analysis

### Existing Infrastructure
- **Framework:** Vitest 3.2.4 with jsdom environment
- **Test Count:** 226 total tests (96 repository, 130 service)
- **Failures:** 1,533 (primarily vector config issues)
- **Coverage:** Moderate (needs improvement)
- **Setup:** Global mocks in `tests/setup.ts`

### Technology Stack
- Next.js 15.5 + React 19 + TypeScript 5.9
- Supabase (PostgreSQL backend)
- Anthropic Claude SDK
- Redis (optional caching)
- RuVector (vector operations)

## 1. Test Database Strategy

### Option A: Testcontainers (Recommended)

**Approach:** Use Docker containers for isolated PostgreSQL instances per test suite.

#### Implementation Structure

```typescript
// tests/integration/database/setup/testcontainers.ts
import { GenericContainer, Wait } from 'testcontainers';
import { createClient } from '@supabase/supabase-js';

export class TestDatabaseManager {
  private container: StartedTestContainer | null = null;
  private client: SupabaseClient | null = null;

  async start(): Promise<TestDatabaseConfig> {
    // Start PostgreSQL container
    this.container = await new GenericContainer('postgres:15-alpine')
      .withEnvironment({
        POSTGRES_DB: 'describe_it_test',
        POSTGRES_USER: 'test_user',
        POSTGRES_PASSWORD: 'test_password',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready'))
      .start();

    const port = this.container.getMappedPort(5432);
    const host = this.container.getHost();

    // Run migrations
    await this.runMigrations(host, port);

    // Create Supabase client
    this.client = createClient(
      `http://${host}:${port}`,
      'test-anon-key'
    );

    return {
      host,
      port,
      client: this.client,
      connectionString: `postgresql://test_user:test_password@${host}:${port}/describe_it_test`,
    };
  }

  async runMigrations(host: string, port: number): Promise<void> {
    // Execute SQL migrations from supabase/migrations/
    const migrationFiles = await glob('supabase/migrations/*.sql');

    for (const file of migrationFiles.sort()) {
      const sql = await readFile(file, 'utf-8');
      await this.executeSQL(host, port, sql);
    }
  }

  async executeSQL(host: string, port: number, sql: string): Promise<void> {
    const client = new Client({
      host,
      port,
      user: 'test_user',
      password: 'test_password',
      database: 'describe_it_test',
    });

    await client.connect();
    await client.query(sql);
    await client.end();
  }

  async cleanup(): Promise<void> {
    await this.client?.auth.signOut();
    await this.container?.stop();
  }

  async reset(): Promise<void> {
    // Truncate all tables
    const tables = [
      'users',
      'vocabulary',
      'learning_sessions',
      'user_progress',
      'descriptions',
      'questions_answers',
      'export_history',
    ];

    for (const table of tables) {
      await this.client?.from(table).delete().neq('id', '');
    }
  }
}
```

**Benefits:**
- True isolation between test suites
- Exact production database parity
- No shared state issues
- Parallel test execution safe

**Drawbacks:**
- Slower startup (15-30s per container)
- Requires Docker runtime
- Higher resource usage

**Cost:** ~30-45s overhead per test suite

---

### Option B: Shared Test Database with Transaction Rollback

**Approach:** Single test database with automatic transaction rollback per test.

#### Implementation Structure

```typescript
// tests/integration/database/setup/shared-database.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export class SharedTestDatabase {
  private client: SupabaseClient;
  private transactions: Map<string, string> = new Map();

  constructor() {
    this.client = createClient(
      process.env.TEST_SUPABASE_URL!,
      process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async beginTest(testId: string): Promise<TestDatabaseContext> {
    // Start transaction
    const { data: tx } = await this.client.rpc('begin_transaction', {
      isolation_level: 'READ COMMITTED',
    });

    this.transactions.set(testId, tx.transaction_id);

    return {
      client: this.client,
      testId,
      cleanup: () => this.rollbackTest(testId),
    };
  }

  async rollbackTest(testId: string): Promise<void> {
    const txId = this.transactions.get(testId);
    if (txId) {
      await this.client.rpc('rollback_transaction', {
        transaction_id: txId,
      });
      this.transactions.delete(testId);
    }
  }

  async seed(fixtures: DatabaseFixtures): Promise<void> {
    // Insert test data
    await this.client.from('users').insert(fixtures.users);
    await this.client.from('vocabulary').insert(fixtures.vocabulary);
    // ... other tables
  }

  async truncateAll(): Promise<void> {
    // Only for cleanup between test runs
    const tables = [
      'export_history',
      'questions_answers',
      'descriptions',
      'user_progress',
      'learning_sessions',
      'vocabulary',
      'users',
    ];

    for (const table of tables) {
      await this.client.from(table).delete().neq('id', '');
    }
  }
}
```

**Benefits:**
- Fast (no container startup)
- Lower resource usage
- Simple setup

**Drawbacks:**
- Requires careful transaction management
- Risk of test pollution if rollback fails
- Serial execution recommended

**Cost:** ~2-5s overhead per test suite

---

### Option C: In-Memory SQLite with PGLite

**Approach:** Use PGLite (PostgreSQL in WebAssembly) for ultra-fast tests.

```typescript
// tests/integration/database/setup/pglite.ts
import { PGlite } from '@electric-sql/pglite';

export class PGLiteTestDatabase {
  private db: PGlite;

  async initialize(): Promise<void> {
    this.db = new PGlite('memory://');

    // Run schema migrations
    await this.runMigrations();
  }

  async runMigrations(): Promise<void> {
    const schema = await readFile('supabase/schema.sql', 'utf-8');
    await this.db.exec(schema);
  }

  async seed(fixtures: any): Promise<void> {
    // Fast in-memory inserts
    for (const [table, rows] of Object.entries(fixtures)) {
      for (const row of rows) {
        await this.insert(table, row);
      }
    }
  }

  async reset(): Promise<void> {
    // Drop and recreate - extremely fast
    await this.db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await this.runMigrations();
  }
}
```

**Benefits:**
- Extremely fast (<1s per suite)
- Perfect isolation
- No Docker required

**Drawbacks:**
- Not 100% PostgreSQL compatible
- Some features may behave differently
- Less confidence in production parity

**Cost:** <1s overhead per test suite

---

## Recommended Approach: Hybrid Strategy

**Development:** Option C (PGLite) for rapid TDD feedback
**CI/CD:** Option A (Testcontainers) for production confidence
**Quick Checks:** Option B (Shared DB) for smoke tests

### Configuration

```typescript
// tests/integration/database/config.ts
export const getDatabaseStrategy = (): DatabaseStrategy => {
  if (process.env.CI === 'true') {
    return 'testcontainers';
  }

  if (process.env.INTEGRATION_FAST === 'true') {
    return 'pglite';
  }

  return 'shared';
};

export interface DatabaseStrategy {
  type: 'testcontainers' | 'shared' | 'pglite';
  manager: TestDatabaseManager | SharedTestDatabase | PGLiteTestDatabase;
}
```

---

## 2. API Integration Test Patterns

### Test Structure

```
tests/integration/
├── api/
│   ├── setup/
│   │   ├── test-server.ts          # Next.js server management
│   │   ├── request-builder.ts      # Fluent API for requests
│   │   └── response-matchers.ts    # Custom Vitest matchers
│   ├── auth/
│   │   ├── signup.integration.test.ts
│   │   ├── signin.integration.test.ts
│   │   └── token-refresh.integration.test.ts
│   ├── vocabulary/
│   │   ├── save.integration.test.ts
│   │   ├── fetch.integration.test.ts
│   │   └── delete.integration.test.ts
│   ├── descriptions/
│   │   └── generate.integration.test.ts
│   ├── questions/
│   │   └── generate.integration.test.ts
│   └── images/
│       └── search.integration.test.ts
└── services/
    ├── database-service.integration.test.ts
    ├── claude-service.integration.test.ts
    └── cache-service.integration.test.ts
```

### Test Server Management

```typescript
// tests/integration/api/setup/test-server.ts
import { createServer } from 'http';
import next from 'next';
import getPort from 'get-port';

export class TestServer {
  private app: any;
  private server: Server;
  private baseUrl: string;

  async start(): Promise<string> {
    const port = await getPort({ port: [3001, 3002, 3003, 3004] });

    this.app = next({
      dev: false,
      dir: process.cwd(),
      port,
    });

    await this.app.prepare();

    const handle = this.app.getRequestHandler();
    this.server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    });

    await new Promise<void>((resolve) => {
      this.server.listen(port, () => {
        this.baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    return this.baseUrl;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });
    await this.app.close();
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
```

### Request Builder Pattern

```typescript
// tests/integration/api/setup/request-builder.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export class APIRequestBuilder {
  private axios: AxiosInstance;
  private headers: Record<string, string> = {};
  private body: any;

  constructor(baseURL: string) {
    this.axios = axios.create({
      baseURL,
      validateStatus: () => true, // Don't throw on any status
    });
  }

  auth(token: string): this {
    this.headers['Authorization'] = `Bearer ${token}`;
    return this;
  }

  withApiKey(key: string): this {
    this.headers['X-API-Key'] = key;
    return this;
  }

  json(data: any): this {
    this.body = data;
    this.headers['Content-Type'] = 'application/json';
    return this;
  }

  async get(path: string): Promise<TestResponse> {
    const response = await this.axios.get(path, { headers: this.headers });
    return new TestResponse(response);
  }

  async post(path: string): Promise<TestResponse> {
    const response = await this.axios.post(path, this.body, {
      headers: this.headers,
    });
    return new TestResponse(response);
  }

  async put(path: string): Promise<TestResponse> {
    const response = await this.axios.put(path, this.body, {
      headers: this.headers,
    });
    return new TestResponse(response);
  }

  async delete(path: string): Promise<TestResponse> {
    const response = await this.axios.delete(path, {
      headers: this.headers,
    });
    return new TestResponse(response);
  }
}

export class TestResponse {
  constructor(private response: AxiosResponse) {}

  get status(): number {
    return this.response.status;
  }

  get data(): any {
    return this.response.data;
  }

  get headers(): Record<string, string> {
    return this.response.headers as Record<string, string>;
  }

  expectStatus(expected: number): this {
    expect(this.status).toBe(expected);
    return this;
  }

  expectSuccess(): this {
    expect(this.status).toBeGreaterThanOrEqual(200);
    expect(this.status).toBeLessThan(300);
    return this;
  }

  expectError(): this {
    expect(this.status).toBeGreaterThanOrEqual(400);
    return this;
  }

  expectJson(): this {
    expect(this.headers['content-type']).toContain('application/json');
    return this;
  }

  expectProperty(key: string): this {
    expect(this.data).toHaveProperty(key);
    return this;
  }

  expectSchema(schema: z.ZodSchema): this {
    expect(() => schema.parse(this.data)).not.toThrow();
    return this;
  }
}
```

### Example Integration Test

```typescript
// tests/integration/api/vocabulary/save.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestServer } from '../setup/test-server';
import { TestDatabaseManager } from '../../database/setup/testcontainers';
import { APIRequestBuilder } from '../setup/request-builder';
import { createTestUser, createAuthToken } from '../setup/fixtures';

describe('POST /api/vocabulary/save - Integration', () => {
  let server: TestServer;
  let db: TestDatabaseManager;
  let api: APIRequestBuilder;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Start infrastructure
    db = new TestDatabaseManager();
    await db.start();

    server = new TestServer();
    const baseUrl = await server.start();

    api = new APIRequestBuilder(baseUrl);

    // Create test user
    const user = await createTestUser(db.client);
    userId = user.id;
    authToken = await createAuthToken(user);
  }, 120000); // 2 minute timeout for container startup

  afterAll(async () => {
    await server.stop();
    await db.cleanup();
  });

  beforeEach(async () => {
    await db.reset();
  });

  describe('Success Cases', () => {
    it('should save vocabulary item with valid data', async () => {
      const vocabularyItem = {
        word: 'manzana',
        translation: 'apple',
        language: 'es',
        difficulty: 'beginner',
        partOfSpeech: 'noun',
        exampleSentence: 'Me gusta la manzana',
      };

      const response = await api
        .auth(authToken)
        .json(vocabularyItem)
        .post('/api/vocabulary/save');

      response
        .expectStatus(200)
        .expectSuccess()
        .expectJson()
        .expectProperty('success')
        .expectProperty('data')
        .expectProperty('data.id');

      expect(response.data.data.word).toBe('manzana');
      expect(response.data.data.user_id).toBe(userId);
    });

    it('should save batch of vocabulary items', async () => {
      const batch = [
        { word: 'perro', translation: 'dog', language: 'es' },
        { word: 'gato', translation: 'cat', language: 'es' },
        { word: 'casa', translation: 'house', language: 'es' },
      ];

      const response = await api
        .auth(authToken)
        .json({ items: batch })
        .post('/api/vocabulary/save/batch');

      response
        .expectStatus(200)
        .expectProperty('data')
        .expectProperty('data.created');

      expect(response.data.data.created).toBe(3);
    });
  });

  describe('Validation Cases', () => {
    it('should reject vocabulary without word', async () => {
      const invalid = {
        translation: 'apple',
        language: 'es',
      };

      const response = await api
        .auth(authToken)
        .json(invalid)
        .post('/api/vocabulary/save');

      response
        .expectStatus(400)
        .expectProperty('error');

      expect(response.data.error).toContain('word');
    });

    it('should reject vocabulary with invalid language', async () => {
      const invalid = {
        word: 'manzana',
        translation: 'apple',
        language: 'invalid',
      };

      const response = await api
        .auth(authToken)
        .json(invalid)
        .post('/api/vocabulary/save');

      response.expectStatus(400);
      expect(response.data.error).toContain('language');
    });
  });

  describe('Authentication Cases', () => {
    it('should reject request without auth token', async () => {
      const response = await api
        .json({ word: 'test', translation: 'test' })
        .post('/api/vocabulary/save');

      response.expectStatus(401);
    });

    it('should reject request with invalid auth token', async () => {
      const response = await api
        .auth('invalid-token')
        .json({ word: 'test', translation: 'test' })
        .post('/api/vocabulary/save');

      response.expectStatus(401);
    });
  });

  describe('Database Integration', () => {
    it('should persist vocabulary to database', async () => {
      const item = {
        word: 'libro',
        translation: 'book',
        language: 'es',
      };

      await api
        .auth(authToken)
        .json(item)
        .post('/api/vocabulary/save');

      // Verify in database
      const { data } = await db.client
        .from('vocabulary')
        .select('*')
        .eq('word', 'libro')
        .single();

      expect(data).toBeDefined();
      expect(data.word).toBe('libro');
      expect(data.user_id).toBe(userId);
    });

    it('should handle duplicate vocabulary gracefully', async () => {
      const item = {
        word: 'duplicate',
        translation: 'duplicate',
        language: 'es',
      };

      // Insert first time
      await api.auth(authToken).json(item).post('/api/vocabulary/save');

      // Insert again
      const response = await api
        .auth(authToken)
        .json(item)
        .post('/api/vocabulary/save');

      // Should update existing or return existing
      response.expectSuccess();
    });
  });

  describe('Performance', () => {
    it('should handle large batch efficiently', async () => {
      const largeBatch = Array.from({ length: 100 }, (_, i) => ({
        word: `word${i}`,
        translation: `translation${i}`,
        language: 'es',
      }));

      const start = Date.now();

      const response = await api
        .auth(authToken)
        .json({ items: largeBatch })
        .post('/api/vocabulary/save/batch');

      const duration = Date.now() - start;

      response.expectSuccess();
      expect(duration).toBeLessThan(5000); // 5 seconds max
      expect(response.data.data.created).toBe(100);
    });
  });
});
```

---

## 3. Test Data Fixtures

### Fixture Structure

```
tests/fixtures/
├── users.ts              # User test data
├── vocabulary.ts         # Vocabulary items
├── sessions.ts           # Learning sessions
├── descriptions.ts       # Generated descriptions
├── questions.ts          # Q&A data
└── builders/
    ├── user-builder.ts   # Fluent builder pattern
    ├── vocabulary-builder.ts
    └── session-builder.ts
```

### Fixture Implementation

```typescript
// tests/fixtures/builders/user-builder.ts
export class UserBuilder {
  private data: Partial<User> = {
    email: 'test@example.com',
    username: 'testuser',
    spanish_level: 'beginner',
    is_authenticated: true,
    profile_completed: true,
  };

  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  withSpanishLevel(level: 'beginner' | 'intermediate' | 'advanced'): this {
    this.data.spanish_level = level;
    return this;
  }

  advanced(): this {
    this.data.spanish_level = 'advanced';
    return this;
  }

  unauthenticated(): this {
    this.data.is_authenticated = false;
    return this;
  }

  async create(db: SupabaseClient): Promise<User> {
    const { data, error } = await db
      .from('users')
      .insert(this.data)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  build(): Partial<User> {
    return { ...this.data };
  }
}

// Usage in tests:
const user = await new UserBuilder()
  .withEmail('advanced@test.com')
  .advanced()
  .create(db);
```

---

## 4. Cleanup Strategies

### Automatic Cleanup Hooks

```typescript
// tests/integration/setup/cleanup-hooks.ts
import { afterEach, beforeEach } from 'vitest';

export const useTestCleanup = (db: TestDatabaseManager) => {
  const cleanup = new TestCleanupManager(db);

  beforeEach(async () => {
    await cleanup.prepare();
  });

  afterEach(async () => {
    await cleanup.execute();
  });

  return cleanup;
};

class TestCleanupManager {
  private createdIds: Map<string, string[]> = new Map();

  constructor(private db: TestDatabaseManager) {}

  track(table: string, id: string): void {
    if (!this.createdIds.has(table)) {
      this.createdIds.set(table, []);
    }
    this.createdIds.get(table)!.push(id);
  }

  async execute(): Promise<void> {
    // Delete in reverse dependency order
    const tables = [
      'export_history',
      'questions_answers',
      'descriptions',
      'user_progress',
      'learning_sessions',
      'vocabulary',
      'users',
    ];

    for (const table of tables) {
      const ids = this.createdIds.get(table) || [];
      if (ids.length > 0) {
        await this.db.client
          .from(table)
          .delete()
          .in('id', ids);
      }
    }

    this.createdIds.clear();
  }

  async prepare(): Promise<void> {
    // Reset state before test
    this.createdIds.clear();
  }
}
```

---

## 5. External Service Mocking

### Claude API Mock

```typescript
// tests/integration/mocks/claude-mock.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const claudeMockServer = setupServer(
  rest.post('https://api.anthropic.com/v1/messages', (req, res, ctx) => {
    const body = req.body as any;

    // Simulate Claude response
    return res(
      ctx.status(200),
      ctx.json({
        id: 'msg_mock_' + Date.now(),
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: generateMockDescription(body.messages),
          },
        ],
        model: 'claude-sonnet-4.5',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 100,
          output_tokens: 200,
        },
      })
    );
  })
);

function generateMockDescription(messages: any[]): string {
  // Simple mock logic
  return 'A beautiful landscape with mountains and clear skies.';
}

// Usage in tests:
beforeAll(() => claudeMockServer.listen());
afterEach(() => claudeMockServer.resetHandlers());
afterAll(() => claudeMockServer.close());
```

### Unsplash API Mock

```typescript
// tests/integration/mocks/unsplash-mock.ts
export const unsplashMockServer = setupServer(
  rest.get('https://api.unsplash.com/search/photos', (req, res, ctx) => {
    const query = req.url.searchParams.get('query');

    return res(
      ctx.status(200),
      ctx.json({
        results: [
          {
            id: 'mock-image-1',
            urls: {
              regular: 'https://picsum.photos/800/600?seed=1',
              small: 'https://picsum.photos/400/300?seed=1',
            },
            alt_description: `Mock image for ${query}`,
            user: {
              name: 'Test Photographer',
            },
          },
        ],
        total: 1,
        total_pages: 1,
      })
    );
  })
);
```

---

## 6. CI/CD Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  integration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run db:deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run integration tests
        run: npm run test:integration
        env:
          CI: true
          TEST_SUPABASE_URL: http://localhost:8000
          TEST_SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: test-results/
```

---

## 7. Performance Benchmarks

### Target Metrics

| Test Type | Target Duration | Max Duration |
|-----------|----------------|--------------|
| Single API test | <500ms | 2s |
| Database operation | <100ms | 500ms |
| Full test suite | <5 minutes | 10 minutes |
| Parallel execution | 3-4x speedup | Required |

### Monitoring

```typescript
// tests/integration/performance/monitor.ts
export class TestPerformanceMonitor {
  private metrics: TestMetric[] = [];

  start(testName: string): TestTimer {
    return new TestTimer(testName, (metric) => {
      this.metrics.push(metric);
    });
  }

  report(): PerformanceReport {
    return {
      totalTests: this.metrics.length,
      averageDuration: average(this.metrics.map((m) => m.duration)),
      slowestTests: this.metrics
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10),
      failedTests: this.metrics.filter((m) => m.failed),
    };
  }
}
```

---

## 8. Migration Plan

### Phase 1: Infrastructure (Week 1)
1. Set up Testcontainers
2. Implement request builder
3. Create fixture builders
4. Configure CI/CD

### Phase 2: Critical Tests (Week 2)
1. Authentication flows
2. Vocabulary CRUD
3. Session management
4. Database integrity

### Phase 3: Comprehensive Coverage (Week 3)
1. All API endpoints
2. Service layer tests
3. External service mocks
4. Performance benchmarks

### Phase 4: Optimization (Week 4)
1. Parallel execution
2. Caching strategies
3. Flaky test fixes
4. Documentation

---

## Appendix: Command Reference

```bash
# Run all integration tests
npm run test:integration

# Run specific test suite
npm run test:integration -- tests/integration/api/vocabulary

# Run with database strategy
INTEGRATION_FAST=true npm run test:integration

# Run with coverage
npm run test:integration -- --coverage

# Run with UI
npm run test:integration -- --ui

# Watch mode
npm run test:integration -- --watch
```

---

**Next Steps:** See `type-safety-migration-plan.md` for Phase 5 architecture.
