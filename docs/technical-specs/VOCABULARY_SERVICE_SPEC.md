# VocabularyService Technical Specification

**Version:** 1.0.0
**Last Updated:** 2025-10-03
**Author:** System Architecture Designer
**Status:** Design Phase

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Design](#architecture-design)
3. [Service Interface](#service-interface)
4. [Data Flow](#data-flow)
5. [Database Integration](#database-integration)
6. [Error Handling](#error-handling)
7. [Performance Targets](#performance-targets)
8. [Security Considerations](#security-considerations)
9. [Testing Strategy](#testing-strategy)
10. [Migration & Rollout](#migration--rollout)

---

## 1. Overview

### 1.1 Purpose

The VocabularyService is a comprehensive service layer that manages all vocabulary-related operations in the Describe It application. It provides a unified, type-safe interface for CRUD operations, search, analytics, and bulk operations on vocabulary items.

### 1.2 Key Features

- Type-safe vocabulary operations with unified type system
- Database integration with Supabase
- Progress tracking synchronization
- Caching layer for improved performance
- Batch operations support
- Transaction handling for data integrity
- Comprehensive error handling and logging
- Export/Import capabilities

### 1.3 Dependencies

- **Database:** Supabase (PostgreSQL)
- **Type System:** Unified VocabularyItem types from `@/types/unified`
- **Logging:** Winston-based structured logging from `@/lib/logger`
- **Progress Service:** Integration with `@/lib/services/progressService`
- **Error Handling:** Retry mechanisms from `@/lib/utils/error-retry`
- **Supabase Client:** `@/lib/supabase/client`

---

## 2. Architecture Design

### 2.1 Class Structure

```typescript
export class VocabularyService {
  // ===========================
  // PRIVATE PROPERTIES
  // ===========================
  private cache: Map<string, CachedData>;
  private retryConfig: RetryConfig;
  private readonly logger: Logger;
  private readonly defaultTTL: number = 300000; // 5 minutes
  private readonly maxCacheSize: number = 1000;
  private readonly batchSize: number = 100;

  // ===========================
  // CONSTRUCTOR
  // ===========================
  constructor(options?: VocabularyServiceOptions);

  // ===========================
  // PUBLIC METHODS - READ OPERATIONS
  // ===========================

  /**
   * Get all vocabulary items for a user with optional filters
   * @param userId - User identifier
   * @param options - Query options (filters, pagination, sorting)
   * @returns Promise<VocabularyItem[]>
   * @throws ServiceError if database operation fails
   */
  async getAllVocabulary(
    userId: string,
    options?: QueryOptions
  ): Promise<VocabularyItem[]>;

  /**
   * Get vocabulary items by category
   * @param userId - User identifier
   * @param category - Category name
   * @param options - Additional query options
   * @returns Promise<VocabularyItem[]>
   */
  async getVocabularyByCategory(
    userId: string,
    category: string,
    options?: QueryOptions
  ): Promise<VocabularyItem[]>;

  /**
   * Search vocabulary items
   * @param userId - User identifier
   * @param query - Search query string
   * @param options - Search options (filters, fuzzy matching)
   * @returns Promise<VocabularyItem[]>
   */
  async searchVocabulary(
    userId: string,
    query: string,
    options?: SearchOptions
  ): Promise<VocabularyItem[]>;

  /**
   * Get single vocabulary item by ID
   * @param userId - User identifier
   * @param itemId - Vocabulary item ID
   * @returns Promise<VocabularyItem | null>
   */
  async getVocabularyById(
    userId: string,
    itemId: string
  ): Promise<VocabularyItem | null>;

  // ===========================
  // PUBLIC METHODS - WRITE OPERATIONS
  // ===========================

  /**
   * Add a single vocabulary item
   * @param userId - User identifier
   * @param item - New vocabulary item data
   * @returns Promise<VocabularyItem>
   * @throws ValidationError if item data is invalid
   * @throws ServiceError if database operation fails
   */
  async addVocabulary(
    userId: string,
    item: NewVocabularyItem
  ): Promise<VocabularyItem>;

  /**
   * Add multiple vocabulary items in a batch
   * @param userId - User identifier
   * @param items - Array of new vocabulary items
   * @returns Promise<BulkOperationResult<VocabularyItem>>
   */
  async addVocabularyList(
    userId: string,
    items: NewVocabularyItem[]
  ): Promise<BulkOperationResult<VocabularyItem>>;

  /**
   * Update vocabulary item
   * @param userId - User identifier
   * @param itemId - Vocabulary item ID
   * @param updates - Partial updates to apply
   * @returns Promise<VocabularyItem>
   * @throws NotFoundError if item doesn't exist
   * @throws ValidationError if updates are invalid
   */
  async updateVocabulary(
    userId: string,
    itemId: string,
    updates: Partial<VocabularyItem>
  ): Promise<VocabularyItem>;

  /**
   * Delete vocabulary item
   * @param userId - User identifier
   * @param itemId - Vocabulary item ID
   * @returns Promise<void>
   * @throws NotFoundError if item doesn't exist
   */
  async deleteVocabulary(
    userId: string,
    itemId: string
  ): Promise<void>;

  /**
   * Delete multiple vocabulary items
   * @param userId - User identifier
   * @param itemIds - Array of vocabulary item IDs
   * @returns Promise<BulkOperationResult<string>>
   */
  async deleteVocabularyBulk(
    userId: string,
    itemIds: string[]
  ): Promise<BulkOperationResult<string>>;

  // ===========================
  // PUBLIC METHODS - ANALYTICS
  // ===========================

  /**
   * Get vocabulary statistics for a user
   * @param userId - User identifier
   * @returns Promise<VocabularyStats>
   */
  async getVocabularyStats(userId: string): Promise<VocabularyStats>;

  /**
   * Get mastery progress for a user
   * @param userId - User identifier
   * @returns Promise<MasteryProgress>
   */
  async getMasteryProgress(userId: string): Promise<MasteryProgress>;

  /**
   * Get learning recommendations based on vocabulary
   * @param userId - User identifier
   * @returns Promise<LearningRecommendations>
   */
  async getLearningRecommendations(
    userId: string
  ): Promise<LearningRecommendations>;

  // ===========================
  // PUBLIC METHODS - EXPORT/IMPORT
  // ===========================

  /**
   * Export vocabulary to various formats
   * @param userId - User identifier
   * @param options - Export options (format, filters)
   * @returns Promise<ExportResult>
   */
  async exportVocabulary(
    userId: string,
    options: VocabularyExportOptions
  ): Promise<ExportResult>;

  /**
   * Import vocabulary from file
   * @param userId - User identifier
   * @param data - Import data
   * @param options - Import options
   * @returns Promise<VocabularyImportResult>
   */
  async importVocabulary(
    userId: string,
    data: string | object,
    options: VocabularyImportOptions
  ): Promise<VocabularyImportResult>;

  // ===========================
  // PRIVATE METHODS - CACHE MANAGEMENT
  // ===========================

  private getFromCache(key: string): any | null;
  private setCache(key: string, data: any, ttl?: number): void;
  private clearCacheByPattern(pattern: string): void;
  private invalidateUserCache(userId: string): void;
  private generateCacheKey(userId: string, ...parts: string[]): string;

  // ===========================
  // PRIVATE METHODS - DATABASE OPERATIONS
  // ===========================

  private async executeQuery<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T>;

  private async executeTransaction<T>(
    operations: (() => Promise<any>)[],
    transactionName: string
  ): Promise<T>;

  // ===========================
  // PRIVATE METHODS - VALIDATION
  // ===========================

  private validateVocabularyItem(item: any): ValidationResult;
  private validateUserId(userId: string): void;
  private sanitizeSearchQuery(query: string): string;

  // ===========================
  // PRIVATE METHODS - PROGRESS TRACKING
  // ===========================

  private async syncWithProgressService(
    userId: string,
    action: 'add' | 'update' | 'delete',
    items: VocabularyItem[]
  ): Promise<void>;

  // ===========================
  // PRIVATE METHODS - UTILITY
  // ===========================

  private generateId(): string;
  private hashString(str: string): string;
  private chunkArray<T>(array: T[], size: number): T[][];
}
```

### 2.2 Supporting Types

```typescript
// Service Configuration
export interface VocabularyServiceOptions {
  cacheEnabled?: boolean;
  cacheTTL?: number;
  maxCacheSize?: number;
  batchSize?: number;
  retryConfig?: Partial<RetryConfig>;
}

// Query Options
export interface QueryOptions {
  filters?: VocabularyFilters;
  limit?: number;
  offset?: number;
  sortBy?: keyof VocabularyItem;
  sortOrder?: 'asc' | 'desc';
  includeProgress?: boolean;
}

// Search Options
export interface SearchOptions extends QueryOptions {
  fuzzyMatch?: boolean;
  searchFields?: ('spanish_text' | 'english_translation' | 'category')[];
  minScore?: number;
}

// New Vocabulary Item (for creation)
export type NewVocabularyItem = Omit<
  VocabularyItem,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// Mastery Progress
export interface MasteryProgress {
  totalItems: number;
  masteredItems: number;
  learningItems: number;
  newItems: number;
  masteryPercentage: number;
  byCategory: Record<string, {
    total: number;
    mastered: number;
    percentage: number;
  }>;
  byDifficulty: Record<string, {
    total: number;
    mastered: number;
    percentage: number;
  }>;
  recentProgress: {
    date: string;
    itemsMastered: number;
    itemsLearned: number;
  }[];
}

// Learning Recommendations
export interface LearningRecommendations {
  recommendedItems: VocabularyItem[];
  reviewItems: VocabularyItem[];
  weakAreas: {
    category: string;
    accuracy: number;
    itemCount: number;
  }[];
  nextMilestone: {
    type: 'mastery' | 'quantity' | 'category';
    description: string;
    progress: number;
    target: number;
  };
}

// Export Result
export interface ExportResult {
  format: 'csv' | 'json' | 'anki';
  data: string | object;
  itemCount: number;
  timestamp: string;
}

// Cached Data
interface CachedData {
  data: any;
  timestamp: number;
  ttl: number;
}

// Validation Result
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}
```

---

## 3. Service Interface

### 3.1 Method Signatures (Detailed)

#### Read Operations

```typescript
// GET ALL VOCABULARY
async getAllVocabulary(
  userId: string,
  options?: {
    filters?: {
      category?: string;
      difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'all';
      partOfSpeech?: string;
      masteryLevel?: number;
      hasAudio?: boolean;
      dateRange?: { start: string; end: string };
    };
    limit?: number; // Default: 100
    offset?: number; // Default: 0
    sortBy?: 'created_at' | 'spanish_text' | 'difficulty_level' | 'mastery_level';
    sortOrder?: 'asc' | 'desc'; // Default: 'desc'
    includeProgress?: boolean; // Default: false
  }
): Promise<VocabularyItem[]>

// GET BY CATEGORY
async getVocabularyByCategory(
  userId: string,
  category: string,
  options?: QueryOptions
): Promise<VocabularyItem[]>

// SEARCH
async searchVocabulary(
  userId: string,
  query: string,
  options?: {
    fuzzyMatch?: boolean; // Default: true
    searchFields?: ('spanish_text' | 'english_translation' | 'category')[];
    minScore?: number; // 0-1, default: 0.6
    filters?: VocabularyFilters;
    limit?: number; // Default: 50
  }
): Promise<VocabularyItem[]>

// GET BY ID
async getVocabularyById(
  userId: string,
  itemId: string
): Promise<VocabularyItem | null>
```

#### Write Operations

```typescript
// ADD SINGLE ITEM
async addVocabulary(
  userId: string,
  item: {
    spanish_text: string; // Required
    english_translation: string; // Required
    category: string; // Required
    difficulty_level: number; // 1-10, Required
    part_of_speech: string; // Required
    frequency_score?: number;
    context_sentence_spanish?: string;
    context_sentence_english?: string;
    phonetic_pronunciation?: string;
    audio_url?: string;
    // ... other optional fields
  }
): Promise<VocabularyItem>

// ADD MULTIPLE ITEMS
async addVocabularyList(
  userId: string,
  items: NewVocabularyItem[]
): Promise<{
  success: boolean;
  processed: number;
  failed: number;
  results: {
    successful: VocabularyItem[];
    failed: {
      item: NewVocabularyItem;
      error: string;
      index: number;
    }[];
  };
  errors: string[];
  duration: number; // milliseconds
}>

// UPDATE ITEM
async updateVocabulary(
  userId: string,
  itemId: string,
  updates: Partial<VocabularyItem>
): Promise<VocabularyItem>

// DELETE ITEM
async deleteVocabulary(
  userId: string,
  itemId: string
): Promise<void>

// DELETE MULTIPLE ITEMS
async deleteVocabularyBulk(
  userId: string,
  itemIds: string[]
): Promise<BulkOperationResult<string>>
```

#### Analytics Operations

```typescript
// GET STATISTICS
async getVocabularyStats(
  userId: string
): Promise<{
  total: number;
  byCategory: Record<string, number>;
  byDifficulty: Record<'beginner' | 'intermediate' | 'advanced', number>;
  byPartOfSpeech: Record<string, number>;
  averageDifficulty: number;
  averageFrequency: number;
  masteryDistribution: Record<number, number>;
  withAudio: number;
  withContext: number;
}>

// GET MASTERY PROGRESS
async getMasteryProgress(
  userId: string
): Promise<MasteryProgress>

// GET LEARNING RECOMMENDATIONS
async getLearningRecommendations(
  userId: string
): Promise<LearningRecommendations>
```

---

## 4. Data Flow

### 4.1 Request → Service → Database Flow

```
┌─────────────┐
│   Client    │
│  Component  │
└──────┬──────┘
       │
       │ vocabularyService.getAllVocabulary(userId, options)
       ↓
┌─────────────────────┐
│ VocabularyService   │
│                     │
│ 1. Validate userId  │
│ 2. Check cache      │───→ Cache Hit? Return cached data
│ 3. Build query      │
│ 4. Execute query    │
└──────┬──────────────┘
       │
       │ Supabase Query
       ↓
┌─────────────────────┐
│   Supabase Client   │
│                     │
│ - Execute query     │
│ - Handle errors     │
│ - Return results    │
└──────┬──────────────┘
       │
       │ Database Results
       ↓
┌─────────────────────┐
│  VocabularyService  │
│                     │
│ 5. Transform data   │
│ 6. Cache results    │
│ 7. Log operation    │
│ 8. Return to client │
└──────┬──────────────┘
       │
       │ VocabularyItem[]
       ↓
┌─────────────┐
│   Client    │
│  Component  │
└─────────────┘
```

### 4.2 Write Operation Flow with Progress Sync

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ addVocabulary(userId, item)
       ↓
┌─────────────────────┐
│ VocabularyService   │
│                     │
│ 1. Validate item    │
│ 2. Start timer      │
│ 3. Insert to DB     │
└──────┬──────────────┘
       │
       │ Database Insert
       ↓
┌─────────────────────┐
│   Supabase Client   │
│                     │
│ - Insert record     │
│ - Return new item   │
└──────┬──────────────┘
       │
       │ VocabularyItem
       ↓
┌─────────────────────┐
│ VocabularyService   │
│                     │
│ 4. Clear cache      │
│ 5. Sync progress    │───┐
│ 6. Log operation    │   │
│ 7. Return item      │   │
└──────┬──────────────┘   │
       │                   │
       │                   │ syncWithProgressService()
       │                   ↓
       │            ┌─────────────────┐
       │            │ ProgressService │
       │            │                 │
       │            │ Update:         │
       │            │ - vocabularyCount
       │            │ - learning stats│
       │            └─────────────────┘
       │
       ↓
┌─────────────┐
│   Client    │
└─────────────┘
```

### 4.3 Batch Operation Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ addVocabularyList(userId, items[])
       ↓
┌─────────────────────┐
│ VocabularyService   │
│                     │
│ 1. Validate all     │
│ 2. Chunk into       │
│    batches (100)    │
└──────┬──────────────┘
       │
       │ Process batches sequentially
       ↓
┌─────────────────────┐
│  For each batch:    │
│                     │
│ 1. Begin transaction│
│ 2. Insert batch     │
│ 3. Commit/Rollback  │
│ 4. Track results    │
└──────┬──────────────┘
       │
       │ All batches complete
       ↓
┌─────────────────────┐
│ VocabularyService   │
│                     │
│ 3. Aggregate results│
│ 4. Clear cache      │
│ 5. Sync progress    │
│ 6. Return summary   │
└──────┬──────────────┘
       │
       │ BulkOperationResult
       ↓
┌─────────────┐
│   Client    │
└─────────────┘
```

---

## 5. Database Integration

### 5.1 Database Queries

#### Query 1: Get All Vocabulary

```sql
-- Base query with filters
SELECT *
FROM vocabulary_items
WHERE
  user_id = $1
  AND ($2::text IS NULL OR category = $2)
  AND ($3::int IS NULL OR difficulty_level >= $3)
  AND ($4::int IS NULL OR difficulty_level <= $4)
  AND ($5::text IS NULL OR part_of_speech = $5)
  AND ($6::boolean IS NULL OR ($6 = true AND audio_url IS NOT NULL))
  AND ($7::timestamp IS NULL OR created_at >= $7)
  AND ($8::timestamp IS NULL OR created_at <= $8)
ORDER BY $9 $10
LIMIT $11
OFFSET $12;
```

#### Query 2: Search Vocabulary

```sql
-- Full-text search with ranking
SELECT
  *,
  ts_rank(
    to_tsvector('spanish', spanish_text || ' ' || english_translation),
    plainto_tsquery('spanish', $2)
  ) as rank
FROM vocabulary_items
WHERE
  user_id = $1
  AND (
    to_tsvector('spanish', spanish_text || ' ' || english_translation) @@
    plainto_tsquery('spanish', $2)
    OR spanish_text ILIKE '%' || $2 || '%'
    OR english_translation ILIKE '%' || $2 || '%'
  )
ORDER BY rank DESC, spanish_text ASC
LIMIT $3;
```

#### Query 3: Insert Vocabulary

```sql
-- Single insert
INSERT INTO vocabulary_items (
  id,
  user_id,
  spanish_text,
  english_translation,
  category,
  difficulty_level,
  part_of_speech,
  frequency_score,
  context_sentence_spanish,
  context_sentence_english,
  phonetic_pronunciation,
  audio_url,
  created_at,
  updated_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
)
RETURNING *;
```

#### Query 4: Batch Insert

```sql
-- Batch insert with UNNEST
INSERT INTO vocabulary_items (
  id, user_id, spanish_text, english_translation, category,
  difficulty_level, part_of_speech, created_at, updated_at
)
SELECT * FROM UNNEST(
  $1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
  $6::int[], $7::text[], $8::timestamp[], $9::timestamp[]
)
RETURNING *;
```

#### Query 5: Update Vocabulary

```sql
-- Partial update
UPDATE vocabulary_items
SET
  spanish_text = COALESCE($3, spanish_text),
  english_translation = COALESCE($4, english_translation),
  category = COALESCE($5, category),
  difficulty_level = COALESCE($6, difficulty_level),
  mastery_level = COALESCE($7, mastery_level),
  updated_at = NOW()
WHERE
  id = $1
  AND user_id = $2
RETURNING *;
```

#### Query 6: Get Statistics

```sql
-- Aggregate statistics
SELECT
  COUNT(*) as total,
  jsonb_object_agg(category, category_count) as by_category,
  jsonb_object_agg(difficulty_range, difficulty_count) as by_difficulty,
  jsonb_object_agg(part_of_speech, pos_count) as by_part_of_speech,
  AVG(difficulty_level) as average_difficulty,
  AVG(frequency_score) as average_frequency,
  SUM(CASE WHEN audio_url IS NOT NULL THEN 1 ELSE 0 END) as with_audio,
  SUM(CASE WHEN context_sentence_spanish IS NOT NULL THEN 1 ELSE 0 END) as with_context
FROM (
  SELECT
    *,
    CASE
      WHEN difficulty_level <= 3 THEN 'beginner'
      WHEN difficulty_level <= 7 THEN 'intermediate'
      ELSE 'advanced'
    END as difficulty_range
  FROM vocabulary_items
  WHERE user_id = $1
) as vocab
GROUP BY category, difficulty_range, part_of_speech;
```

### 5.2 Database Indexes

```sql
-- Primary and foreign key indexes
CREATE INDEX idx_vocab_user_id ON vocabulary_items(user_id);
CREATE INDEX idx_vocab_category ON vocabulary_items(category);
CREATE INDEX idx_vocab_difficulty ON vocabulary_items(difficulty_level);
CREATE INDEX idx_vocab_created_at ON vocabulary_items(created_at DESC);

-- Full-text search indexes
CREATE INDEX idx_vocab_fts ON vocabulary_items
  USING GIN (to_tsvector('spanish', spanish_text || ' ' || english_translation));

-- Composite indexes for common queries
CREATE INDEX idx_vocab_user_category ON vocabulary_items(user_id, category);
CREATE INDEX idx_vocab_user_difficulty ON vocabulary_items(user_id, difficulty_level);
CREATE INDEX idx_vocab_user_mastery ON vocabulary_items(user_id, mastery_level);
```

### 5.3 Supabase Integration

```typescript
// Supabase Client Usage Pattern
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

// Type-safe query
const { data, error } = await supabase
  .from('vocabulary_items')
  .select('*')
  .eq('user_id', userId)
  .gte('difficulty_level', 1)
  .lte('difficulty_level', 10)
  .order('created_at', { ascending: false })
  .limit(100);

if (error) {
  throw new ServiceError('Failed to fetch vocabulary', { cause: error });
}

return data as VocabularyItem[];
```

---

## 6. Error Handling

### 6.1 Error Categories

```typescript
// Custom Error Classes
export class VocabularyServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VocabularyServiceError';
  }
}

export class ValidationError extends VocabularyServiceError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends VocabularyServiceError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends VocabularyServiceError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

export class CacheError extends VocabularyServiceError {
  constructor(message: string, details?: any) {
    super(message, 'CACHE_ERROR', details);
    this.name = 'CacheError';
  }
}
```

### 6.2 Error Codes

| Code | Description | HTTP Status | Retry | User Message |
|------|-------------|-------------|-------|--------------|
| `VALIDATION_ERROR` | Invalid input data | 400 | No | "Please check your input and try again" |
| `NOT_FOUND` | Resource not found | 404 | No | "Vocabulary item not found" |
| `DATABASE_ERROR` | Database operation failed | 500 | Yes | "Unable to save vocabulary. Please try again" |
| `CACHE_ERROR` | Cache operation failed | 500 | No | "Temporary error. Please refresh" |
| `UNAUTHORIZED` | User not authorized | 403 | No | "You don't have permission to access this" |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 | No | "Too many requests. Please wait" |
| `DUPLICATE_ENTRY` | Item already exists | 409 | No | "This vocabulary item already exists" |
| `BATCH_PARTIAL_FAILURE` | Some items failed in batch | 207 | No | "Some items couldn't be saved" |

### 6.3 Error Handling Strategy

```typescript
// Example error handling in service method
async addVocabulary(userId: string, item: NewVocabularyItem): Promise<VocabularyItem> {
  const startTime = Date.now();

  try {
    // 1. Validation
    this.validateUserId(userId);
    const validation = this.validateVocabularyItem(item);
    if (!validation.valid) {
      throw new ValidationError(
        'Invalid vocabulary item',
        { errors: validation.errors, item }
      );
    }

    // 2. Check for duplicates
    const existing = await this.checkDuplicate(userId, item);
    if (existing) {
      throw new VocabularyServiceError(
        'Vocabulary item already exists',
        'DUPLICATE_ENTRY',
        { existingId: existing.id }
      );
    }

    // 3. Database operation with retry
    const result = await withRetry(async () => {
      const { data, error } = await supabase
        .from('vocabulary_items')
        .insert([{ ...item, user_id: userId, id: this.generateId() }])
        .select()
        .single();

      if (error) {
        throw new DatabaseError('Failed to insert vocabulary item', { error });
      }

      return data;
    }, this.retryConfig);

    // 4. Cache invalidation
    this.invalidateUserCache(userId);

    // 5. Progress sync (non-blocking)
    this.syncWithProgressService(userId, 'add', [result])
      .catch(err => {
        this.logger.warn('Progress sync failed', { error: err, userId, itemId: result.id });
      });

    // 6. Logging
    this.logger.info('Vocabulary item added', {
      userId,
      itemId: result.id,
      category: result.category,
      duration: Date.now() - startTime
    });

    return result as VocabularyItem;

  } catch (error) {
    // Log error
    this.logger.error('Failed to add vocabulary item', error, {
      userId,
      item,
      duration: Date.now() - startTime
    });

    // Rethrow if already a service error
    if (error instanceof VocabularyServiceError) {
      throw error;
    }

    // Wrap unknown errors
    throw new VocabularyServiceError(
      'Unexpected error adding vocabulary item',
      'INTERNAL_ERROR',
      { originalError: error }
    );
  }
}
```

### 6.4 Retry Configuration

```typescript
private readonly retryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  shouldRetry: (error: Error) => {
    // Retry on transient errors
    const message = error.message.toLowerCase();
    return (
      message.includes('503') ||
      message.includes('502') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('connection refused')
    );
  },
  onRetry: (attempt: number, error: Error) => {
    this.logger.warn(`Retrying operation (attempt ${attempt})`, {
      error: error.message,
      attempt
    });
  }
};
```

---

## 7. Performance Targets

### 7.1 Response Time Targets

| Operation | Target (p50) | Target (p95) | Target (p99) |
|-----------|--------------|--------------|--------------|
| Get all vocabulary (100 items) | < 100ms | < 200ms | < 500ms |
| Get by ID (cached) | < 10ms | < 20ms | < 50ms |
| Get by ID (uncached) | < 50ms | < 100ms | < 200ms |
| Search vocabulary | < 150ms | < 300ms | < 600ms |
| Add single item | < 100ms | < 200ms | < 400ms |
| Add batch (100 items) | < 2s | < 4s | < 8s |
| Update item | < 80ms | < 150ms | < 300ms |
| Delete item | < 80ms | < 150ms | < 300ms |
| Get statistics | < 200ms | < 400ms | < 800ms |

### 7.2 Throughput Targets

- **Concurrent Users:** Support 100+ concurrent users
- **Requests per Second:** 500+ RPS sustained
- **Peak Load:** 1000+ RPS burst capacity

### 7.3 Cache Performance

- **Cache Hit Rate:** > 80% for read operations
- **Cache Miss Penalty:** < 2x uncached response time
- **Cache Eviction Rate:** < 10% of total cache entries per hour
- **Memory Usage:** < 100MB for cache (1000 entries max)

### 7.4 Database Performance

- **Connection Pool:** 10-20 connections
- **Query Timeout:** 5 seconds
- **Transaction Timeout:** 10 seconds
- **Batch Size:** 100 items per batch
- **Max Batch Operations:** 10 concurrent batches

### 7.5 Optimization Strategies

1. **Caching Layer**
   - In-memory cache for frequently accessed data
   - TTL-based expiration (5 minutes default)
   - Pattern-based cache invalidation
   - LRU eviction policy

2. **Database Optimization**
   - Proper indexing on frequently queried columns
   - Connection pooling
   - Prepared statements for common queries
   - Batch operations for bulk writes

3. **Query Optimization**
   - Limit result sets (default: 100 items)
   - Pagination for large datasets
   - Selective field fetching
   - Avoid N+1 queries

4. **Async Operations**
   - Non-blocking progress sync
   - Background cache warming
   - Async logging
   - Fire-and-forget analytics

---

## 8. Security Considerations

### 8.1 Authentication & Authorization

- **User Identification:** All operations require valid `userId`
- **Row-Level Security:** Enforce user ownership at database level
- **Session Validation:** Verify user session before operations
- **Permission Checks:** Validate user permissions for operations

### 8.2 Input Validation

```typescript
// Input sanitization
private validateVocabularyItem(item: any): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!item.spanish_text?.trim()) {
    errors.push('spanish_text is required');
  }
  if (!item.english_translation?.trim()) {
    errors.push('english_translation is required');
  }
  if (!item.category?.trim()) {
    errors.push('category is required');
  }

  // Type validation
  if (typeof item.difficulty_level !== 'number' ||
      item.difficulty_level < 1 ||
      item.difficulty_level > 10) {
    errors.push('difficulty_level must be between 1 and 10');
  }

  // String length limits
  if (item.spanish_text?.length > 500) {
    errors.push('spanish_text exceeds maximum length');
  }
  if (item.english_translation?.length > 1000) {
    errors.push('english_translation exceeds maximum length');
  }

  // XSS prevention
  const sanitized = {
    spanish_text: this.sanitizeHtml(item.spanish_text),
    english_translation: this.sanitizeHtml(item.english_translation),
    // ... other fields
  };

  return {
    valid: errors.length === 0,
    errors,
    sanitizedItem: sanitized
  };
}

private sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .trim();
}
```

### 8.3 SQL Injection Prevention

- Use parameterized queries exclusively
- Leverage Supabase's query builder
- Never concatenate user input into SQL
- Validate all inputs before database operations

### 8.4 Rate Limiting

```typescript
// Rate limiting configuration
private readonly rateLimits = {
  perUser: {
    read: 100, // requests per minute
    write: 30, // requests per minute
    search: 20 // requests per minute
  },
  perIP: {
    read: 200,
    write: 50,
    search: 40
  }
};
```

### 8.5 Data Privacy

- **Personal Data:** Vocabulary items are user-private
- **Encryption:** Data encrypted at rest and in transit
- **Audit Logging:** Log all data access and modifications
- **Data Retention:** Follow GDPR/CCPA requirements
- **Export/Delete:** Support data export and account deletion

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
describe('VocabularyService', () => {
  describe('getAllVocabulary', () => {
    it('should return all vocabulary items for a user', async () => {
      // Test implementation
    });

    it('should apply filters correctly', async () => {
      // Test implementation
    });

    it('should handle pagination', async () => {
      // Test implementation
    });

    it('should return cached data on subsequent calls', async () => {
      // Test implementation
    });

    it('should throw ValidationError for invalid userId', async () => {
      // Test implementation
    });
  });

  describe('addVocabulary', () => {
    it('should add a new vocabulary item', async () => {
      // Test implementation
    });

    it('should throw ValidationError for invalid data', async () => {
      // Test implementation
    });

    it('should throw DuplicateError for existing items', async () => {
      // Test implementation
    });

    it('should sync with progress service', async () => {
      // Test implementation
    });
  });

  describe('addVocabularyList', () => {
    it('should add multiple items in batch', async () => {
      // Test implementation
    });

    it('should handle partial failures gracefully', async () => {
      // Test implementation
    });

    it('should respect batch size limits', async () => {
      // Test implementation
    });
  });

  // ... more tests
});
```

### 9.2 Integration Tests

```typescript
describe('VocabularyService Integration', () => {
  let service: VocabularyService;
  let testUserId: string;

  beforeEach(async () => {
    service = new VocabularyService();
    testUserId = await createTestUser();
  });

  afterEach(async () => {
    await cleanupTestUser(testUserId);
  });

  it('should perform complete CRUD lifecycle', async () => {
    // Create
    const item = await service.addVocabulary(testUserId, mockItem);
    expect(item.id).toBeDefined();

    // Read
    const retrieved = await service.getVocabularyById(testUserId, item.id);
    expect(retrieved).toEqual(item);

    // Update
    const updated = await service.updateVocabulary(testUserId, item.id, {
      mastery_level: 80
    });
    expect(updated.mastery_level).toBe(80);

    // Delete
    await service.deleteVocabulary(testUserId, item.id);
    const deleted = await service.getVocabularyById(testUserId, item.id);
    expect(deleted).toBeNull();
  });
});
```

### 9.3 Performance Tests

```typescript
describe('VocabularyService Performance', () => {
  it('should handle 100 concurrent reads within target time', async () => {
    const startTime = Date.now();
    const promises = Array(100).fill(null).map(() =>
      service.getAllVocabulary(testUserId, { limit: 10 })
    );
    await Promise.all(promises);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(5000); // 5 seconds for 100 concurrent requests
  });

  it('should batch insert 1000 items within target time', async () => {
    const items = Array(1000).fill(null).map(() => createMockItem());
    const startTime = Date.now();

    const result = await service.addVocabularyList(testUserId, items);
    const duration = Date.now() - startTime;

    expect(result.processed).toBe(1000);
    expect(duration).toBeLessThan(30000); // 30 seconds
  });
});
```

### 9.4 Test Coverage Goals

- **Unit Test Coverage:** > 90%
- **Integration Test Coverage:** > 80%
- **Critical Path Coverage:** 100%
- **Error Path Coverage:** > 85%

---

## 10. Migration & Rollout

### 10.1 Migration Plan

#### Phase 1: Implementation (Week 1-2)
- Implement core VocabularyService class
- Add unit tests for all methods
- Create integration tests
- Document API usage

#### Phase 2: Integration (Week 3)
- Integrate with existing components
- Replace direct Supabase calls with service methods
- Add error handling and logging
- Performance testing

#### Phase 3: Testing (Week 4)
- End-to-end testing
- Performance benchmarking
- Security audit
- User acceptance testing

#### Phase 4: Rollout (Week 5)
- Feature flag deployment
- Gradual rollout to 10% → 50% → 100% users
- Monitor metrics and errors
- Optimize based on real-world usage

### 10.2 Backwards Compatibility

```typescript
// Legacy support wrapper
export class LegacyVocabularyAdapter {
  private service: VocabularyService;

  constructor() {
    this.service = new VocabularyService();
  }

  // Provide legacy method signatures
  async getVocab(userId: string): Promise<any[]> {
    const items = await this.service.getAllVocabulary(userId);
    return items.map(item => this.toLegacyFormat(item));
  }

  private toLegacyFormat(item: VocabularyItem): any {
    return {
      // Map new format to old format
      id: item.id,
      word: item.spanish_text,
      translation: item.english_translation,
      // ... other mappings
    };
  }
}
```

### 10.3 Monitoring & Metrics

```typescript
// Key metrics to track
const serviceMetrics = {
  operations: {
    total: 0,
    successful: 0,
    failed: 0,
    cached: 0
  },
  performance: {
    avgResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0
  },
  errors: {
    validationErrors: 0,
    databaseErrors: 0,
    cacheErrors: 0
  },
  cache: {
    hitRate: 0,
    missRate: 0,
    evictionRate: 0
  }
};
```

### 10.4 Rollback Plan

1. **Immediate Rollback:** Feature flag toggle (< 1 minute)
2. **Partial Rollback:** Route specific users to legacy system
3. **Data Rollback:** Database migrations are reversible
4. **Cache Flush:** Clear all service caches if needed

---

## Appendices

### A. Database Schema

```sql
-- vocabulary_items table (assumed structure)
CREATE TABLE vocabulary_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vocabulary_list_id TEXT REFERENCES vocabulary_lists(id) ON DELETE SET NULL,
  spanish_text TEXT NOT NULL,
  english_translation TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 10),
  part_of_speech TEXT NOT NULL,
  frequency_score INTEGER,
  context_sentence_spanish TEXT,
  context_sentence_english TEXT,
  phonetic_pronunciation TEXT,
  pronunciation_ipa TEXT,
  audio_url TEXT,
  gender TEXT,
  article TEXT,
  plural_form TEXT,
  conjugation_info JSONB,
  subcategory TEXT,
  syllable_count INTEGER,
  stress_pattern TEXT,
  usage_notes TEXT,
  commonality_rank INTEGER,
  register TEXT,
  synonyms TEXT[],
  antonyms TEXT[],
  related_words TEXT[],
  word_family TEXT[],
  memory_hints TEXT[],
  cultural_notes TEXT,
  false_friends TEXT[],
  associated_image_urls TEXT[],
  emoji_representation TEXT,
  user_notes TEXT,
  mastery_level INTEGER CHECK (mastery_level BETWEEN 0 AND 100),
  last_reviewed TIMESTAMP,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Row-level security policy
ALTER TABLE vocabulary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vocabulary"
  ON vocabulary_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vocabulary"
  ON vocabulary_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocabulary"
  ON vocabulary_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vocabulary"
  ON vocabulary_items FOR DELETE
  USING (auth.uid() = user_id);
```

### B. Example Usage

```typescript
// Example 1: Get all vocabulary
const items = await vocabularyService.getAllVocabulary(userId, {
  filters: {
    category: 'food',
    difficulty: 'beginner'
  },
  limit: 50,
  sortBy: 'created_at',
  sortOrder: 'desc'
});

// Example 2: Search vocabulary
const results = await vocabularyService.searchVocabulary(userId, 'comida', {
  fuzzyMatch: true,
  searchFields: ['spanish_text', 'category'],
  limit: 20
});

// Example 3: Add vocabulary item
const newItem = await vocabularyService.addVocabulary(userId, {
  spanish_text: 'la manzana',
  english_translation: 'the apple',
  category: 'food',
  difficulty_level: 2,
  part_of_speech: 'noun',
  context_sentence_spanish: 'Me gusta la manzana roja.'
});

// Example 4: Batch add
const result = await vocabularyService.addVocabularyList(userId, [
  { spanish_text: 'el perro', english_translation: 'the dog', ... },
  { spanish_text: 'el gato', english_translation: 'the cat', ... },
  // ... more items
]);

console.log(`Added ${result.results.successful.length} items`);
console.log(`Failed ${result.results.failed.length} items`);

// Example 5: Get statistics
const stats = await vocabularyService.getVocabularyStats(userId);
console.log(`Total words: ${stats.total}`);
console.log(`Mastered: ${stats.byDifficulty.beginner} beginner words`);
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-03 | System Architect | Initial design specification |

---

**End of Document**
