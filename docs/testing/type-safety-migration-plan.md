# Type Safety Migration Plan (Phase 5)

**Version:** 1.0
**Date:** 2025-12-04
**Status:** Architecture Design
**Priority:** High

## Executive Summary

This document provides a comprehensive strategy for eliminating 612 `any` type usages across 152 files in the describe-it codebase, organized by priority and risk level.

## Current State Analysis

### Type Usage Statistics

```typescript
Total 'any' occurrences: 612
Files affected: 152
Categorization:
  - API Boundaries: ~180 (29%)
  - Service Layer: ~150 (25%)
  - UI Components: ~120 (20%)
  - Utility Functions: ~90 (15%)
  - Test Files: ~72 (11%)
```

### High-Impact Files (Top 20)

| File | Count | Priority | Risk |
|------|-------|----------|------|
| `src/lib/export/exportManager.ts` | 17 | Critical | High |
| `src/lib/export/rawDataExporter.ts` | 13 | Critical | High |
| `src/lib/database/utils/index.ts` | 12 | Critical | High |
| `src/app/api/export/generate/route.ts` | 31 | Critical | High |
| `src/app/api/progress/track/route.ts` | 12 | High | Medium |
| `src/lib/services/database.ts` | 11 | Critical | High |
| `src/lib/api/optimizedSupabase.ts` | 11 | High | High |
| `src/lib/monitoring/hooks.ts` | 11 | Medium | Low |
| `src/lib/store/undoRedoStore.ts` | 14 | Medium | Medium |
| `src/lib/store/debugStore.ts` | 11 | Low | Low |

---

## Migration Strategy

### Phase 1: API Boundaries (Week 1-2)

**Priority:** CRITICAL
**Target:** 180 occurrences in API routes and handlers
**Goal:** Type-safe API contracts with runtime validation

#### 1.1 API Request/Response Types

**Current Problem:**
```typescript
// src/app/api/export/generate/route.ts
export async function POST(request: Request) {
  const body = await request.json(); // any
  const result = await processExport(body); // any
  return Response.json(result); // any
}
```

**Solution:**
```typescript
// src/types/api/export.types.ts
import { z } from 'zod';

// Zod schemas for runtime validation
export const ExportRequestSchema = z.object({
  format: z.enum(['pdf', 'csv', 'json', 'docx']),
  vocabularyIds: z.array(z.string().uuid()).optional(),
  includeProgress: z.boolean().default(false),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  filters: z.object({
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    category: z.string().optional(),
  }).optional(),
});

export type ExportRequest = z.infer<typeof ExportRequestSchema>;

export const ExportResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    exportId: z.string().uuid(),
    format: z.string(),
    fileUrl: z.string().url(),
    fileSize: z.number(),
    itemCount: z.number(),
    generatedAt: z.string().datetime(),
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }).optional(),
});

export type ExportResponse = z.infer<typeof ExportResponseSchema>;

// Type-safe route handler
export async function POST(request: Request): Promise<Response> {
  try {
    const rawBody = await request.json();

    // Runtime validation with type inference
    const body = ExportRequestSchema.parse(rawBody);

    const result = await processExport(body);

    // Type-safe response
    const response: ExportResponse = {
      success: true,
      data: result,
    };

    return Response.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        } satisfies ExportResponse,
        { status: 400 }
      );
    }

    // Handle other errors...
  }
}
```

#### 1.2 Shared Type Utilities

```typescript
// src/types/api/common.types.ts
import { z } from 'zod';

// Common API patterns
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().optional(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const SortingSchema = z.object({
  field: z.string(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type Sorting = z.infer<typeof SortingSchema>;

// Generic API response wrapper
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: APIMetadata;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string; // Only in development
}

export interface APIMetadata {
  requestId: string;
  timestamp: string;
  version: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Type guard helpers
export function isAPIError(obj: unknown): obj is APIError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    'message' in obj
  );
}

export function assertAPIResponse<T>(
  response: unknown,
  dataSchema: z.ZodSchema<T>
): asserts response is APIResponse<T> {
  if (typeof response !== 'object' || response === null) {
    throw new TypeError('Invalid API response');
  }

  const res = response as APIResponse<T>;

  if (res.success && res.data !== undefined) {
    dataSchema.parse(res.data);
  }
}
```

#### 1.3 API Route Template

```typescript
// src/lib/api/route-handler.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import type { APIResponse } from '@/types/api/common.types';

export interface RouteConfig<TInput, TOutput> {
  inputSchema: z.ZodSchema<TInput>;
  outputSchema?: z.ZodSchema<TOutput>;
  requireAuth?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export function createRouteHandler<TInput, TOutput>(
  config: RouteConfig<TInput, TOutput>,
  handler: (input: TInput, context: RouteContext) => Promise<TOutput>
) {
  return async (request: NextRequest): Promise<NextResponse<APIResponse<TOutput>>> => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // 1. Parse and validate input
      const rawBody = await request.json();
      const input = config.inputSchema.parse(rawBody);

      // 2. Check authentication
      if (config.requireAuth) {
        const user = await authenticateRequest(request);
        if (!user) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
              },
            },
            { status: 401 }
          );
        }
      }

      // 3. Rate limiting
      if (config.rateLimit) {
        const rateLimitOk = await checkRateLimit(request, config.rateLimit);
        if (!rateLimitOk) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests',
              },
            },
            { status: 429 }
          );
        }
      }

      // 4. Execute handler
      const context: RouteContext = {
        requestId,
        request,
      };

      const output = await handler(input, context);

      // 5. Validate output (optional)
      if (config.outputSchema) {
        config.outputSchema.parse(output);
      }

      // 6. Log success
      const duration = Date.now() - startTime;
      logger.info('Route handler success', {
        requestId,
        duration,
        path: request.nextUrl.pathname,
      });

      return NextResponse.json({
        success: true,
        data: output,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      // Handle validation errors
      if (error instanceof z.ZodError) {
        logger.warn('Validation error', { requestId, error: error.errors });

        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: error.errors,
            },
            metadata: {
              requestId,
              timestamp: new Date().toISOString(),
              version: '1.0',
            },
          },
          { status: 400 }
        );
      }

      // Handle other errors
      logger.error('Route handler error', {
        requestId,
        duration,
        error,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            ...(process.env.NODE_ENV === 'development' && {
              stack: error instanceof Error ? error.stack : undefined,
            }),
          },
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            version: '1.0',
          },
        },
        { status: 500 }
      );
    }
  };
}

// Usage example:
export const POST = createRouteHandler(
  {
    inputSchema: ExportRequestSchema,
    outputSchema: ExportDataSchema,
    requireAuth: true,
    rateLimit: {
      maxRequests: 10,
      windowMs: 60000, // 1 minute
    },
  },
  async (input, context) => {
    // Type-safe handler implementation
    return await exportService.generate(input);
  }
);
```

---

### Phase 2: Service Layer (Week 3-4)

**Priority:** HIGH
**Target:** 150 occurrences in service classes
**Goal:** Type-safe business logic with strict contracts

#### 2.1 Database Service Types

```typescript
// src/lib/services/types/database.types.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.generated';

// Type-safe database client
export type TypedSupabaseClient = SupabaseClient<Database>;

// Result type for database operations
export type DatabaseResult<T> = {
  data: T;
  error: null;
} | {
  data: null;
  error: DatabaseError;
};

export interface DatabaseError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  hint?: string;
}

// Query builder types
export interface QueryOptions<T> {
  select?: (keyof T)[];
  limit?: number;
  offset?: number;
  orderBy?: {
    field: keyof T;
    ascending: boolean;
  };
  filter?: Partial<Record<keyof T, unknown>>;
}

export interface BatchOperationResult<T> {
  inserted: T[];
  updated: T[];
  errors: Array<{
    index: number;
    error: DatabaseError;
  }>;
}
```

#### 2.2 Service Base Class

```typescript
// src/lib/services/base/BaseService.ts
export abstract class BaseService<TEntity, TCreateInput, TUpdateInput> {
  constructor(
    protected readonly client: TypedSupabaseClient,
    protected readonly tableName: string
  ) {}

  async findById(id: string): Promise<DatabaseResult<TEntity>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: this.mapError(error) };
      }

      return { data: data as TEntity, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'An unexpected error occurred',
        },
      };
    }
  }

  async create(input: TCreateInput): Promise<DatabaseResult<TEntity>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .insert(input as never)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.mapError(error) };
      }

      return { data: data as TEntity, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'An unexpected error occurred',
        },
      };
    }
  }

  async update(
    id: string,
    input: Partial<TUpdateInput>
  ): Promise<DatabaseResult<TEntity>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .update(input as never)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.mapError(error) };
      }

      return { data: data as TEntity, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'An unexpected error occurred',
        },
      };
    }
  }

  async delete(id: string): Promise<DatabaseResult<void>> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        return { data: null, error: this.mapError(error) };
      }

      return { data: undefined as never, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'An unexpected error occurred',
        },
      };
    }
  }

  protected mapError(error: unknown): DatabaseError {
    if (typeof error === 'object' && error !== null) {
      const pgError = error as { code?: string; message?: string; hint?: string };
      return {
        code: pgError.code || 'UNKNOWN_ERROR',
        message: pgError.message || 'An error occurred',
        hint: pgError.hint,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
    };
  }
}
```

#### 2.3 Concrete Service Implementation

```typescript
// src/lib/services/VocabularyService.ts
import { BaseService } from './base/BaseService';
import type { VocabularyItem } from '@/types/unified';

interface VocabularyCreateInput {
  word: string;
  translation: string;
  language: string;
  difficulty?: DifficultyLevel;
  partOfSpeech?: PartOfSpeech;
  exampleSentence?: string;
  imageUrl?: string;
  audioUrl?: string;
  tags?: string[];
}

interface VocabularyUpdateInput extends Partial<VocabularyCreateInput> {}

export class VocabularyService extends BaseService<
  VocabularyItem,
  VocabularyCreateInput,
  VocabularyUpdateInput
> {
  constructor(client: TypedSupabaseClient) {
    super(client, 'vocabulary');
  }

  async findByWord(
    word: string,
    userId: string
  ): Promise<DatabaseResult<VocabularyItem>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('word', word)
        .eq('user_id', userId)
        .single();

      if (error) {
        return { data: null, error: this.mapError(error) };
      }

      return { data: data as VocabularyItem, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'An unexpected error occurred',
        },
      };
    }
  }

  async batchCreate(
    items: VocabularyCreateInput[],
    userId: string
  ): Promise<BatchOperationResult<VocabularyItem>> {
    const result: BatchOperationResult<VocabularyItem> = {
      inserted: [],
      updated: [],
      errors: [],
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        const { data, error } = await this.client
          .from(this.tableName)
          .insert({ ...item, user_id: userId } as never)
          .select()
          .single();

        if (error) {
          result.errors.push({
            index: i,
            error: this.mapError(error),
          });
        } else {
          result.inserted.push(data as VocabularyItem);
        }
      } catch (error) {
        result.errors.push({
          index: i,
          error: {
            code: 'UNEXPECTED_ERROR',
            message: 'An unexpected error occurred',
          },
        });
      }
    }

    return result;
  }

  async searchByDifficulty(
    difficulty: DifficultyLevel,
    userId: string,
    options: QueryOptions<VocabularyItem> = {}
  ): Promise<DatabaseResult<VocabularyItem[]>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*')
        .eq('difficulty', difficulty)
        .eq('user_id', userId);

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
      }

      if (options.orderBy) {
        query = query.order(
          options.orderBy.field as string,
          { ascending: options.orderBy.ascending }
        );
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: this.mapError(error) };
      }

      return { data: data as VocabularyItem[], error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'An unexpected error occurred',
        },
      };
    }
  }
}
```

---

### Phase 3: UI Components (Week 5)

**Priority:** MEDIUM
**Target:** 120 occurrences in React components
**Goal:** Type-safe props and state management

#### 3.1 Component Prop Types

```typescript
// src/components/VocabularyBuilder/types.ts
import type { VocabularyItem } from '@/types/unified';
import type { ReactNode } from 'react';

export interface VocabularyBuilderProps {
  initialItems?: VocabularyItem[];
  onSave?: (items: VocabularyItem[]) => void | Promise<void>;
  onCancel?: () => void;
  maxItems?: number;
  allowBatchImport?: boolean;
  className?: string;
  children?: ReactNode;
}

export interface VocabularyItemCardProps {
  item: VocabularyItem;
  onEdit?: (item: VocabularyItem) => void;
  onDelete?: (itemId: string) => void;
  onSelect?: (itemId: string, selected: boolean) => void;
  isSelected?: boolean;
  isEditable?: boolean;
  showActions?: boolean;
}

export interface VocabularyFormProps {
  initialData?: Partial<VocabularyItem>;
  onSubmit: (data: VocabularyFormData) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  errors?: VocabularyFormErrors;
}

export interface VocabularyFormData {
  word: string;
  translation: string;
  language: string;
  difficulty: DifficultyLevel;
  partOfSpeech?: PartOfSpeech;
  exampleSentence?: string;
  imageUrl?: string;
  audioUrl?: string;
  tags: string[];
}

export interface VocabularyFormErrors {
  word?: string;
  translation?: string;
  language?: string;
  difficulty?: string;
  partOfSpeech?: string;
  exampleSentence?: string;
  general?: string;
}
```

#### 3.2 Type-Safe Component

```typescript
// src/components/VocabularyBuilder/VocabularyItemCard.tsx
import { memo, useCallback } from 'react';
import type { VocabularyItemCardProps } from './types';

export const VocabularyItemCard = memo<VocabularyItemCardProps>(
  function VocabularyItemCard({
    item,
    onEdit,
    onDelete,
    onSelect,
    isSelected = false,
    isEditable = true,
    showActions = true,
  }) {
    const handleEdit = useCallback(() => {
      onEdit?.(item);
    }, [item, onEdit]);

    const handleDelete = useCallback(() => {
      onDelete?.(item.id);
    }, [item.id, onDelete]);

    const handleSelect = useCallback(
      (checked: boolean) => {
        onSelect?.(item.id, checked);
      },
      [item.id, onSelect]
    );

    return (
      <div className={`vocabulary-card ${isSelected ? 'selected' : ''}`}>
        <div className="vocabulary-card__content">
          <h3>{item.word}</h3>
          <p>{item.translation}</p>
          <span className="difficulty">{item.difficulty}</span>
        </div>

        {showActions && (
          <div className="vocabulary-card__actions">
            {isEditable && (
              <button onClick={handleEdit}>Edit</button>
            )}
            <button onClick={handleDelete}>Delete</button>
          </div>
        )}
      </div>
    );
  }
);
```

#### 3.3 Store Type Safety

```typescript
// src/lib/store/vocabularyStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { VocabularyItem } from '@/types/unified';

interface VocabularyState {
  items: VocabularyItem[];
  selectedIds: Set<string>;
  filters: VocabularyFilters;
  isLoading: boolean;
  error: string | null;
}

interface VocabularyFilters {
  difficulty?: DifficultyLevel;
  language?: string;
  tags?: string[];
  searchQuery?: string;
}

interface VocabularyActions {
  // Item operations
  addItem: (item: VocabularyItem) => void;
  updateItem: (id: string, updates: Partial<VocabularyItem>) => void;
  deleteItem: (id: string) => void;
  batchAddItems: (items: VocabularyItem[]) => void;

  // Selection
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Filters
  setFilters: (filters: Partial<VocabularyFilters>) => void;
  clearFilters: () => void;

  // State management
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Persistence
  reset: () => void;
}

type VocabularyStore = VocabularyState & VocabularyActions;

const initialState: VocabularyState = {
  items: [],
  selectedIds: new Set(),
  filters: {},
  isLoading: false,
  error: null,
};

export const useVocabularyStore = create<VocabularyStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        addItem: (item) =>
          set((state) => ({
            items: [...state.items, item],
          })),

        updateItem: (id, updates) =>
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, ...updates } : item
            ),
          })),

        deleteItem: (id) =>
          set((state) => ({
            items: state.items.filter((item) => item.id !== id),
            selectedIds: new Set(
              Array.from(state.selectedIds).filter((selectedId) => selectedId !== id)
            ),
          })),

        batchAddItems: (items) =>
          set((state) => ({
            items: [...state.items, ...items],
          })),

        selectItem: (id) =>
          set((state) => ({
            selectedIds: new Set([...state.selectedIds, id]),
          })),

        deselectItem: (id) =>
          set((state) => {
            const newSet = new Set(state.selectedIds);
            newSet.delete(id);
            return { selectedIds: newSet };
          }),

        selectAll: () =>
          set((state) => ({
            selectedIds: new Set(state.items.map((item) => item.id)),
          })),

        clearSelection: () =>
          set(() => ({
            selectedIds: new Set(),
          })),

        setFilters: (filters) =>
          set((state) => ({
            filters: { ...state.filters, ...filters },
          })),

        clearFilters: () =>
          set(() => ({
            filters: {},
          })),

        setLoading: (isLoading) => set(() => ({ isLoading })),

        setError: (error) => set(() => ({ error })),

        reset: () => set(initialState),
      }),
      {
        name: 'vocabulary-store',
        partialize: (state) => ({
          items: state.items,
          filters: state.filters,
        }),
      }
    )
  )
);
```

---

### Phase 4: Utility Functions (Week 6)

**Priority:** LOW-MEDIUM
**Target:** 90 occurrences in utility functions
**Goal:** Generic type-safe utilities

#### 4.1 Type-Safe JSON Utilities

```typescript
// src/lib/utils/json-safe.ts
import { z } from 'zod';

/**
 * Type-safe JSON parse with validation
 */
export function safeParse<T>(
  json: string,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const parsed = JSON.parse(json);
    const validated = schema.parse(parsed);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Type-safe JSON stringify with fallback
 */
export function safeStringify<T>(
  data: T,
  fallback: string = '{}'
): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error('JSON stringify error:', error);
    return fallback;
  }
}

/**
 * Deep clone with type preservation
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}
```

#### 4.2 Type Guards

```typescript
// src/lib/utils/type-guards.ts

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Check if value is a valid UUID
 */
export function isUUID(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * Check if value is a valid URL
 */
export function isValidURL(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if object has specific property with type guard
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}

/**
 * Assert exhaustive switch/if handling
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
```

---

## Implementation Guidelines

### 1. Gradual Migration Process

```typescript
// Step 1: Add type alongside any
function processData(data: any): any {
  // TODO: Replace with proper types
  return data;
}

// Step 2: Add specific types
interface ProcessedData {
  id: string;
  value: number;
}

function processData(data: any): ProcessedData {
  // Still accepting any, but returning typed
  return {
    id: String(data.id),
    value: Number(data.value),
  };
}

// Step 3: Add input type
function processData(data: RawData): ProcessedData {
  // Fully typed!
  return {
    id: data.id,
    value: data.value,
  };
}
```

### 2. Unknown Over Any

```typescript
// Bad
function handleError(error: any) {
  console.error(error.message);
}

// Good
function handleError(error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### 3. Generic Constraints

```typescript
// Bad
function getProperty<T>(obj: T, key: string): any {
  return obj[key]; // Type unsafe
}

// Good
function getProperty<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  key: K
): T[K] {
  return obj[key]; // Type safe
}
```

---

## Testing Strategy

### 1. Type Test Files

```typescript
// src/__type-tests__/api.types.test.ts
import { expectType, expectError } from 'tsd';
import type { ExportRequest, ExportResponse } from '@/types/api/export.types';

// Test valid types
expectType<ExportRequest>({
  format: 'pdf',
  vocabularyIds: ['uuid-1', 'uuid-2'],
  includeProgress: true,
});

// Test invalid types should error
expectError<ExportRequest>({
  format: 'invalid', // Should error
});

expectError<ExportRequest>({
  format: 'pdf',
  vocabularyIds: [123], // Should error - not strings
});

// Test response types
const response: ExportResponse = {
  success: true,
  data: {
    exportId: 'uuid',
    format: 'pdf',
    fileUrl: 'https://example.com/file.pdf',
    fileSize: 1024,
    itemCount: 10,
    generatedAt: new Date().toISOString(),
  },
};

expectType<ExportResponse>(response);
```

### 2. Runtime Validation Tests

```typescript
// tests/unit/validation/export-schema.test.ts
import { describe, it, expect } from 'vitest';
import { ExportRequestSchema } from '@/types/api/export.types';

describe('ExportRequestSchema', () => {
  it('should validate correct export request', () => {
    const valid = {
      format: 'pdf',
      vocabularyIds: ['uuid-1'],
      includeProgress: true,
    };

    expect(() => ExportRequestSchema.parse(valid)).not.toThrow();
  });

  it('should reject invalid format', () => {
    const invalid = {
      format: 'invalid',
    };

    expect(() => ExportRequestSchema.parse(invalid)).toThrow();
  });

  it('should apply defaults', () => {
    const minimal = {
      format: 'pdf',
    };

    const result = ExportRequestSchema.parse(minimal);

    expect(result.includeProgress).toBe(false);
  });
});
```

---

## Migration Tracking

### Progress Dashboard

```typescript
// scripts/type-safety-progress.ts
import { globby } from 'globby';
import { readFile } from 'fs/promises';

interface TypeSafetyMetrics {
  totalFiles: number;
  filesWithAny: number;
  totalAnyCount: number;
  filesByCategory: Record<string, number>;
  progress: number;
}

async function analyzeTypeSafety(): Promise<TypeSafetyMetrics> {
  const files = await globby(['src/**/*.ts', 'src/**/*.tsx'], {
    ignore: ['**/*.test.ts', '**/*.test.tsx', '**/__type-tests__/**'],
  });

  let totalAnyCount = 0;
  let filesWithAny = 0;
  const filesByCategory: Record<string, number> = {
    api: 0,
    services: 0,
    components: 0,
    utils: 0,
  };

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const anyMatches = content.match(/:\s*any\b/g) || [];
    const anyCount = anyMatches.length;

    if (anyCount > 0) {
      totalAnyCount += anyCount;
      filesWithAny++;

      // Categorize
      if (file.includes('/api/')) filesByCategory.api += anyCount;
      else if (file.includes('/services/')) filesByCategory.services += anyCount;
      else if (file.includes('/components/')) filesByCategory.components += anyCount;
      else filesByCategory.utils += anyCount;
    }
  }

  const progress = ((files.length - filesWithAny) / files.length) * 100;

  return {
    totalFiles: files.length,
    filesWithAny,
    totalAnyCount,
    filesByCategory,
    progress,
  };
}

// Run and display
analyzeTypeSafety().then((metrics) => {
  console.log('Type Safety Metrics:');
  console.log(`Total files: ${metrics.totalFiles}`);
  console.log(`Files with 'any': ${metrics.filesWithAny}`);
  console.log(`Total 'any' count: ${metrics.totalAnyCount}`);
  console.log(`Progress: ${metrics.progress.toFixed(2)}%`);
  console.log('\nBy category:');
  console.log(metrics.filesByCategory);
});
```

---

## Timeline & Milestones

| Week | Phase | Target | Deliverable |
|------|-------|--------|-------------|
| 1-2 | API Boundaries | 180 any → 0 | Type-safe API routes |
| 3-4 | Service Layer | 150 any → 0 | Type-safe services |
| 5 | UI Components | 120 any → 0 | Type-safe components |
| 6 | Utilities | 90 any → 0 | Type-safe utilities |
| 7 | Testing | 72 any → 0 | Test type coverage |
| 8 | Review & Cleanup | All remaining | 100% type safety |

**Final Goal:** Zero `any` types in production code (excluding type definitions where `any` is semantically correct).

---

**Next Steps:** See `e2e-testing-architecture.md` for E2E testing framework.
