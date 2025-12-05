# Shared Test Utilities Design

**Version:** 1.0
**Date:** 2025-12-04
**Status:** Architecture Design
**Priority:** High

## Executive Summary

This document defines reusable test utilities, helpers, and infrastructure shared across unit, integration, and E2E test suites to maximize code reuse, reduce duplication, and ensure consistency.

---

## Directory Structure

```
tests/
├── shared/
│   ├── builders/
│   │   ├── user-builder.ts
│   │   ├── vocabulary-builder.ts
│   │   ├── session-builder.ts
│   │   └── index.ts
│   ├── fixtures/
│   │   ├── users.ts
│   │   ├── vocabulary.ts
│   │   ├── sessions.ts
│   │   ├── descriptions.ts
│   │   └── index.ts
│   ├── matchers/
│   │   ├── custom-matchers.ts
│   │   ├── api-matchers.ts
│   │   ├── dom-matchers.ts
│   │   └── index.ts
│   ├── mocks/
│   │   ├── supabase-mock.ts
│   │   ├── claude-mock.ts
│   │   ├── unsplash-mock.ts
│   │   ├── redis-mock.ts
│   │   └── index.ts
│   ├── helpers/
│   │   ├── async-helpers.ts
│   │   ├── date-helpers.ts
│   │   ├── string-helpers.ts
│   │   ├── validation-helpers.ts
│   │   └── index.ts
│   ├── setup/
│   │   ├── vitest-setup.ts
│   │   ├── playwright-setup.ts
│   │   ├── global-setup.ts
│   │   └── teardown.ts
│   └── utils/
│       ├── test-logger.ts
│       ├── performance-tracker.ts
│       ├── snapshot-helpers.ts
│       └── index.ts
├── unit/           # Unit test suites
├── integration/    # Integration test suites
├── e2e/           # E2E test suites
└── performance/   # Performance test suites
```

---

## 1. Builder Pattern for Test Data

### Base Builder

```typescript
// tests/shared/builders/base-builder.ts
export abstract class BaseBuilder<T> {
  protected data: Partial<T> = {};

  /**
   * Build the object with all defaults applied
   */
  abstract build(): T;

  /**
   * Create and persist to database (for integration tests)
   */
  abstract create?(client: any): Promise<T>;

  /**
   * Reset builder to initial state
   */
  reset(): this {
    this.data = {};
    return this;
  }

  /**
   * Apply custom overrides
   */
  with(overrides: Partial<T>): this {
    this.data = { ...this.data, ...overrides };
    return this;
  }

  /**
   * Conditionally apply overrides
   */
  withIf(condition: boolean, overrides: Partial<T>): this {
    if (condition) {
      this.with(overrides);
    }
    return this;
  }

  /**
   * Clone builder with current state
   */
  clone(): this {
    const cloned = Object.create(Object.getPrototypeOf(this));
    cloned.data = { ...this.data };
    return cloned;
  }
}
```

### User Builder

```typescript
// tests/shared/builders/user-builder.ts
import { BaseBuilder } from './base-builder';
import type { User } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

export class UserBuilder extends BaseBuilder<User> {
  constructor() {
    super();
    this.defaults();
  }

  private defaults(): this {
    const timestamp = faker.date.recent();

    this.data = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      username: faker.internet.userName(),
      full_name: faker.person.fullName(),
      spanish_level: 'beginner',
      is_authenticated: true,
      profile_completed: true,
      theme: 'light',
      language: 'en',
      default_description_style: 'conversacional',
      target_words_per_day: 10,
      preferred_difficulty: 'beginner',
      enable_notifications: true,
      created_at: timestamp.toISOString(),
      updated_at: timestamp.toISOString(),
    };

    return this;
  }

  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  withSpanishLevel(level: 'beginner' | 'intermediate' | 'advanced'): this {
    this.data.spanish_level = level;
    return this;
  }

  beginner(): this {
    return this.withSpanishLevel('beginner');
  }

  intermediate(): this {
    return this.withSpanishLevel('intermediate');
  }

  advanced(): this {
    return this.withSpanishLevel('advanced');
  }

  unauthenticated(): this {
    this.data.is_authenticated = false;
    return this;
  }

  incompleteProfile(): this {
    this.data.profile_completed = false;
    return this;
  }

  withTheme(theme: 'light' | 'dark'): this {
    this.data.theme = theme;
    return this;
  }

  withLanguage(language: 'en' | 'es'): this {
    this.data.language = language;
    return this;
  }

  build(): User {
    return this.data as User;
  }

  async create(client: SupabaseClient): Promise<User> {
    const user = this.build();

    const { data, error } = await client
      .from('users')
      .insert(user)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  }

  /**
   * Create batch of users
   */
  static batch(count: number): UserBuilder[] {
    return Array.from({ length: count }, () => new UserBuilder());
  }

  /**
   * Create user with realistic data distribution
   */
  static realistic(): UserBuilder {
    const builder = new UserBuilder();

    // Realistic distribution
    const rand = Math.random();
    if (rand < 0.5) {
      builder.beginner();
    } else if (rand < 0.8) {
      builder.intermediate();
    } else {
      builder.advanced();
    }

    return builder;
  }
}
```

### Vocabulary Builder

```typescript
// tests/shared/builders/vocabulary-builder.ts
import { BaseBuilder } from './base-builder';
import type { VocabularyItem } from '@/types/unified';
import { faker } from '@faker-js/faker';

export class VocabularyBuilder extends BaseBuilder<VocabularyItem> {
  constructor() {
    super();
    this.defaults();
  }

  private defaults(): this {
    const timestamp = faker.date.recent();

    this.data = {
      id: faker.string.uuid(),
      user_id: faker.string.uuid(),
      word: faker.word.noun(),
      translation: faker.word.noun(),
      language: 'es',
      difficulty: 'beginner',
      partOfSpeech: 'noun',
      exampleSentence: faker.lorem.sentence(),
      imageUrl: faker.image.url(),
      audioUrl: undefined,
      tags: [],
      category: 'general',
      masteryLevel: 0,
      timesReviewed: 0,
      timesCorrect: 0,
      lastReviewedAt: undefined,
      nextReviewDate: undefined,
      created_at: timestamp.toISOString(),
      updated_at: timestamp.toISOString(),
    };

    return this;
  }

  forUser(userId: string): this {
    this.data.user_id = userId;
    return this;
  }

  withWord(word: string): this {
    this.data.word = word;
    return this;
  }

  withTranslation(translation: string): this {
    this.data.translation = translation;
    return this;
  }

  withDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): this {
    this.data.difficulty = difficulty;
    return this;
  }

  beginner(): this {
    return this.withDifficulty('beginner');
  }

  intermediate(): this {
    return this.withDifficulty('intermediate');
  }

  advanced(): this {
    return this.withDifficulty('advanced');
  }

  noun(): this {
    this.data.partOfSpeech = 'noun';
    return this;
  }

  verb(): this {
    this.data.partOfSpeech = 'verb';
    return this;
  }

  adjective(): this {
    this.data.partOfSpeech = 'adjective';
    return this;
  }

  withMastery(level: number): this {
    this.data.masteryLevel = level;
    return this;
  }

  mastered(): this {
    this.data.masteryLevel = 100;
    this.data.timesReviewed = 10;
    this.data.timesCorrect = 10;
    return this;
  }

  withTags(tags: string[]): this {
    this.data.tags = tags;
    return this;
  }

  withExample(sentence: string): this {
    this.data.exampleSentence = sentence;
    return this;
  }

  build(): VocabularyItem {
    return this.data as VocabularyItem;
  }

  async create(client: any): Promise<VocabularyItem> {
    const item = this.build();

    const { data, error } = await client
      .from('vocabulary')
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Spanish vocabulary presets
   */
  static spanish = {
    basic(): VocabularyBuilder {
      return new VocabularyBuilder()
        .beginner()
        .withTags(['basic', 'common']);
    },

    food(): VocabularyBuilder {
      return new VocabularyBuilder()
        .withTags(['food', 'cooking'])
        .withWord('manzana')
        .withTranslation('apple');
    },

    travel(): VocabularyBuilder {
      return new VocabularyBuilder()
        .withTags(['travel', 'tourism'])
        .withWord('viaje')
        .withTranslation('trip');
    },
  };

  /**
   * Create vocabulary set
   */
  static set(type: 'beginner' | 'intermediate' | 'advanced', count: number = 10): VocabularyBuilder[] {
    return Array.from({ length: count }, () =>
      new VocabularyBuilder().withDifficulty(type)
    );
  }
}
```

---

## 2. Custom Vitest Matchers

```typescript
// tests/shared/matchers/custom-matchers.ts
import { expect } from 'vitest';
import type { MatcherResult } from 'vitest';

interface CustomMatchers<R = unknown> {
  toBeValidUUID(): R;
  toBeValidEmail(): R;
  toBeValidURL(): R;
  toBeWithinRange(min: number, max: number): R;
  toHaveBeenCalledWithMatch(matcher: (args: any[]) => boolean): R;
  toMatchSchema(schema: any): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// UUID matcher
expect.extend({
  toBeValidUUID(received: unknown): MatcherResult {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const pass =
      typeof received === 'string' && uuidRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid UUID`
          : `Expected ${received} to be a valid UUID`,
    };
  },
});

// Email matcher
expect.extend({
  toBeValidEmail(received: unknown): MatcherResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const pass =
      typeof received === 'string' && emailRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid email`
          : `Expected ${received} to be a valid email`,
    };
  },
});

// URL matcher
expect.extend({
  toBeValidURL(received: unknown): MatcherResult {
    let pass = false;

    if (typeof received === 'string') {
      try {
        new URL(received);
        pass = true;
      } catch {
        pass = false;
      }
    }

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid URL`
          : `Expected ${received} to be a valid URL`,
    };
  },
});

// Range matcher
expect.extend({
  toBeWithinRange(received: number, min: number, max: number): MatcherResult {
    const pass = received >= min && received <= max;

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be within range [${min}, ${max}]`
          : `Expected ${received} to be within range [${min}, ${max}]`,
    };
  },
});

// Schema matcher (using Zod)
expect.extend({
  toMatchSchema(received: unknown, schema: any): MatcherResult {
    try {
      schema.parse(received);
      return {
        pass: true,
        message: () => `Expected ${JSON.stringify(received)} not to match schema`,
      };
    } catch (error: any) {
      return {
        pass: false,
        message: () =>
          `Expected ${JSON.stringify(received)} to match schema. Errors: ${
            error.message
          }`,
      };
    }
  },
});
```

### API Response Matchers

```typescript
// tests/shared/matchers/api-matchers.ts
import { expect } from 'vitest';
import type { MatcherResult } from 'vitest';

interface APIMatchers<R = unknown> {
  toBeSuccessfulResponse(): R;
  toBeErrorResponse(): R;
  toHaveStatus(status: number): R;
  toHaveHeader(header: string, value?: string): R;
  toHaveValidationError(field: string): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends APIMatchers<T> {}
}

expect.extend({
  toBeSuccessfulResponse(received: any): MatcherResult {
    const pass =
      received &&
      typeof received === 'object' &&
      received.success === true &&
      'data' in received;

    return {
      pass,
      message: () =>
        pass
          ? 'Expected response not to be successful'
          : `Expected response to be successful, got: ${JSON.stringify(
              received
            )}`,
    };
  },

  toBeErrorResponse(received: any): MatcherResult {
    const pass =
      received &&
      typeof received === 'object' &&
      received.success === false &&
      'error' in received;

    return {
      pass,
      message: () =>
        pass
          ? 'Expected response not to be an error'
          : `Expected response to be an error, got: ${JSON.stringify(
              received
            )}`,
    };
  },

  toHaveStatus(received: any, expectedStatus: number): MatcherResult {
    const pass = received?.status === expectedStatus;

    return {
      pass,
      message: () =>
        pass
          ? `Expected status not to be ${expectedStatus}`
          : `Expected status ${expectedStatus}, got ${received?.status}`,
    };
  },

  toHaveHeader(received: any, header: string, value?: string): MatcherResult {
    const headerValue = received?.headers?.[header.toLowerCase()];
    const pass = value
      ? headerValue === value
      : headerValue !== undefined;

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to have header ${header}${
              value ? ` with value ${value}` : ''
            }`
          : `Expected to have header ${header}${
              value ? ` with value ${value}` : ''
            }, got ${headerValue}`,
    };
  },

  toHaveValidationError(received: any, field: string): MatcherResult {
    const errors = received?.error?.details;
    const pass =
      Array.isArray(errors) &&
      errors.some((err: any) => err.path?.includes(field));

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to have validation error for ${field}`
          : `Expected validation error for ${field}, got: ${JSON.stringify(
              errors
            )}`,
    };
  },
});
```

---

## 3. Mock Factories

### Supabase Mock Factory

```typescript
// tests/shared/mocks/supabase-mock.ts
import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseMockFactory {
  static create(): Partial<SupabaseClient> {
    return {
      from: vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),

      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: null,
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      } as any,

      storage: {
        from: vi.fn((bucket: string) => ({
          upload: vi.fn().mockResolvedValue({ data: null, error: null }),
          download: vi.fn().mockResolvedValue({ data: null, error: null }),
          remove: vi.fn().mockResolvedValue({ data: null, error: null }),
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
          getPublicUrl: vi.fn().mockReturnValue({
            data: { publicUrl: 'https://test.supabase.co/storage/test.jpg' },
          }),
        })),
      } as any,

      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),

      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn().mockReturnThis(),
      }),
    };
  }

  /**
   * Create mock with specific table responses
   */
  static withTableData<T>(
    table: string,
    data: T | T[]
  ): Partial<SupabaseClient> {
    const mock = this.create();

    (mock.from as any).mockImplementation((tableName: string) => {
      if (tableName === table) {
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: Array.isArray(data) ? data[0] : data,
            error: null,
          }),
          then: vi.fn().mockResolvedValue({
            data: Array.isArray(data) ? data : [data],
            error: null,
          }),
        };
      }

      return (mock.from as any)(tableName);
    });

    return mock;
  }

  /**
   * Create mock with authentication
   */
  static withAuth(user: any): Partial<SupabaseClient> {
    const mock = this.create();

    mock.auth = {
      ...mock.auth,
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
            user,
          },
        },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    } as any;

    return mock;
  }

  /**
   * Create mock with errors
   */
  static withError(error: any): Partial<SupabaseClient> {
    const mock = this.create();

    (mock.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error }),
      then: vi.fn().mockResolvedValue({ data: null, error }),
    });

    return mock;
  }
}
```

### Claude API Mock

```typescript
// tests/shared/mocks/claude-mock.ts
import { vi } from 'vitest';

export class ClaudeMockFactory {
  static create() {
    return {
      messages: {
        create: vi.fn().mockResolvedValue({
          id: 'msg_mock_' + Date.now(),
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Mock response from Claude',
            },
          ],
          model: 'claude-sonnet-4.5',
          stop_reason: 'end_turn',
          usage: {
            input_tokens: 100,
            output_tokens: 200,
          },
        }),

        stream: vi.fn().mockImplementation(async function* () {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Mock' },
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: ' stream' },
          };
        }),
      },
    };
  }

  /**
   * Create mock with specific response
   */
  static withResponse(text: string) {
    const mock = this.create();

    mock.messages.create = vi.fn().mockResolvedValue({
      id: 'msg_mock_' + Date.now(),
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text }],
      model: 'claude-sonnet-4.5',
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    return mock;
  }

  /**
   * Create mock that throws error
   */
  static withError(error: Error) {
    const mock = this.create();

    mock.messages.create = vi.fn().mockRejectedValue(error);

    return mock;
  }
}
```

---

## 4. Test Helpers

### Async Helpers

```typescript
// tests/shared/helpers/async-helpers.ts

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, message = 'Condition not met' } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`${message} (timeout: ${timeout}ms)`);
}

/**
 * Wait for async operation with retry
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: 'linear' | 'exponential';
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 1000, backoff = 'linear' } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const waitTime =
          backoff === 'exponential' ? delay * Math.pow(2, attempt - 1) : delay;

        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError!;
}

/**
 * Delay execution
 */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(message)), timeoutMs)
  );

  return Promise.race([promise, timeoutPromise]);
}
```

### Date Helpers

```typescript
// tests/shared/helpers/date-helpers.ts

/**
 * Create date in the past
 */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Create date in the future
 */
export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Format date for database
 */
export function toDBFormat(date: Date): string {
  return date.toISOString();
}

/**
 * Check if dates are same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Create date range
 */
export function dateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
```

---

## 5. Performance Tracking

```typescript
// tests/shared/utils/performance-tracker.ts
export class PerformanceTracker {
  private metrics: Map<string, number[]> = new Map();

  /**
   * Track single operation
   */
  async track<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();

    try {
      return await fn();
    } finally {
      const duration = Date.now() - start;

      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }

      this.metrics.get(name)!.push(duration);
    }
  }

  /**
   * Get statistics for operation
   */
  getStats(name: string) {
    const durations = this.metrics.get(name) || [];

    if (durations.length === 0) {
      return null;
    }

    const sorted = [...durations].sort((a, b) => a - b);

    return {
      count: durations.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: durations.reduce((a, b) => a + b, 0) / durations.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    const metrics: Record<string, any> = {};

    for (const [name, durations] of this.metrics) {
      metrics[name] = this.getStats(name);
    }

    return metrics;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
  }

  /**
   * Export to JSON
   */
  toJSON() {
    return JSON.stringify(this.getAllMetrics(), null, 2);
  }
}

// Global instance for tests
export const performanceTracker = new PerformanceTracker();
```

---

## 6. Snapshot Helpers

```typescript
// tests/shared/utils/snapshot-helpers.ts
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { mkdirSync } from 'fs';

export class SnapshotManager {
  private snapshotDir: string;

  constructor(testFilePath: string) {
    this.snapshotDir = join(dirname(testFilePath), '__snapshots__');
  }

  /**
   * Match snapshot
   */
  matchSnapshot(name: string, data: any): boolean {
    const snapshotPath = join(this.snapshotDir, `${name}.snapshot.json`);

    const serialized = this.serialize(data);

    if (!existsSync(snapshotPath)) {
      // Create new snapshot
      this.saveSnapshot(snapshotPath, serialized);
      return true;
    }

    const existing = readFileSync(snapshotPath, 'utf-8');

    return serialized === existing;
  }

  /**
   * Update snapshot
   */
  updateSnapshot(name: string, data: any): void {
    const snapshotPath = join(this.snapshotDir, `${name}.snapshot.json`);
    const serialized = this.serialize(data);

    this.saveSnapshot(snapshotPath, serialized);
  }

  private serialize(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  private saveSnapshot(path: string, data: string): void {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, data, 'utf-8');
  }
}
```

---

## 7. Test Logger

```typescript
// tests/shared/utils/test-logger.ts
export class TestLogger {
  private logs: Array<{ level: string; message: string; timestamp: number }> = [];

  log(level: string, message: string): void {
    this.logs.push({
      level,
      message,
      timestamp: Date.now(),
    });

    if (process.env.DEBUG_TESTS === 'true') {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  }

  info(message: string): void {
    this.log('info', message);
  }

  warn(message: string): void {
    this.log('warn', message);
  }

  error(message: string): void {
    this.log('error', message);
  }

  debug(message: string): void {
    this.log('debug', message);
  }

  getLogs(): typeof this.logs {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }

  export(): string {
    return this.logs
      .map((log) => `[${new Date(log.timestamp).toISOString()}] [${log.level}] ${log.message}`)
      .join('\n');
  }
}

// Global test logger
export const testLogger = new TestLogger();
```

---

## Usage Examples

### Unit Test with Builders and Matchers

```typescript
// tests/unit/services/vocabulary-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VocabularyService } from '@/lib/services/VocabularyService';
import { VocabularyBuilder } from 'tests/shared/builders/vocabulary-builder';
import { SupabaseMockFactory } from 'tests/shared/mocks/supabase-mock';
import 'tests/shared/matchers/custom-matchers';

describe('VocabularyService', () => {
  let service: VocabularyService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = SupabaseMockFactory.create();
    service = new VocabularyService(mockClient);
  });

  it('should create vocabulary item', async () => {
    const vocabularyItem = new VocabularyBuilder()
      .withWord('manzana')
      .withTranslation('apple')
      .beginner()
      .build();

    mockClient = SupabaseMockFactory.withTableData('vocabulary', vocabularyItem);
    service = new VocabularyService(mockClient);

    const result = await service.create(vocabularyItem);

    expect(result.data).toBeDefined();
    expect(result.data?.id).toBeValidUUID();
    expect(result.data?.word).toBe('manzana');
  });
});
```

### Integration Test with Helpers

```typescript
// tests/integration/api/vocabulary.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestServer } from '../setup/test-server';
import { VocabularyBuilder } from 'tests/shared/builders/vocabulary-builder';
import { waitFor, retryAsync } from 'tests/shared/helpers/async-helpers';
import 'tests/shared/matchers/api-matchers';

describe('Vocabulary API', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = new TestServer();
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should save vocabulary with retry', async () => {
    const item = new VocabularyBuilder().beginner().build();

    const response = await retryAsync(
      () =>
        fetch(`${server.baseUrl}/api/vocabulary/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        }),
      { maxAttempts: 3, delay: 1000 }
    );

    const data = await response.json();

    expect(data).toBeSuccessfulResponse();
    expect(data.data.id).toBeValidUUID();
  });
});
```

---

## Command Scripts

```json
// package.json additions
{
  "scripts": {
    "test:shared": "vitest run tests/shared/**/*.test.ts",
    "test:builders": "vitest run tests/shared/builders/**/*.test.ts",
    "test:matchers": "vitest run tests/shared/matchers/**/*.test.ts",
    "test:utils": "vitest run tests/shared/utils/**/*.test.ts"
  }
}
```

---

## Conclusion

This shared utilities architecture provides:

1. **Reusable Test Data**: Builder pattern for consistent test data generation
2. **Custom Matchers**: Domain-specific assertions for clearer tests
3. **Mock Factories**: Standardized mocks for external dependencies
4. **Helper Functions**: Async utilities, date helpers, performance tracking
5. **Logging & Debugging**: Test logger for debugging complex scenarios

**Benefits:**
- Reduced test duplication
- Consistent test patterns
- Easier maintenance
- Better developer experience
- Improved test reliability

**Next Step:** Implement these utilities and integrate with existing test suites.
