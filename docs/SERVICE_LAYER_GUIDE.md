# Service Layer Development Guide

## Quick Reference for API Modularization

This guide shows how to use the new service layer and how to refactor routes.

## Available Services

### ProgressService
**Location:** `src/core/services/ProgressService.ts`
**Purpose:** Track user progress, achievements, goals, and learning statistics

```typescript
import { ProgressService } from '@/core/services';

const progressService = new ProgressService();

// Track an event
const event = await progressService.trackEvent(
  userId,
  'vocabulary_learned',
  {
    vocabularyId: 'vocab_123',
    category: 'food',
    difficulty: 'intermediate',
    score: 0.95,
    timeSpent: 120
  },
  sessionId
);

// Get user progress
const progress = await progressService.getProgress(userId, {
  aggregation: 'daily',
  dateFrom: '2025-12-01'
});
```

### SettingsService
**Location:** `src/core/services/SettingsService.ts`
**Purpose:** Manage user preferences and application settings

```typescript
import { SettingsService } from '@/core/services';

const settingsService = new SettingsService();

// Save settings
const saved = await settingsService.saveSettings(userId, {
  language: { primary: 'es', secondary: 'en' },
  difficulty: { preferred: 'intermediate', adaptive: true }
});

// Get settings (with defaults)
const settings = await settingsService.getSettings(userId);

// Validate settings
const validation = settingsService.validateSettings(newSettings);
```

### VocabularyService
**Location:** `src/core/services/VocabularyService.ts`
**Purpose:** Manage vocabulary items, collections, and statistics

```typescript
import { VocabularyService } from '@/core/services';

const vocabularyService = new VocabularyService();

// Save single item
const item = await vocabularyService.saveVocabulary(userId, {
  phrase: 'la mesa',
  definition: 'the table',
  category: 'furniture',
  difficulty: 'beginner'
}, 'my-collection');

// Save bulk items
const items = await vocabularyService.saveBulkVocabulary(
  userId,
  vocabularyArray,
  'my-collection'
);

// Get vocabulary with filters
const result = await vocabularyService.getVocabulary(userId, {
  category: 'food',
  difficulty: 'intermediate',
  limit: 20
});
```

## How to Refactor a Route

### Before: Monolithic Route

```typescript
// route.ts (500+ lines)
import { NextResponse } from 'next/server';

// Embedded service class
class SomeService {
  // 400+ lines of business logic
}

const service = new SomeService();

export async function POST(request: NextRequest) {
  // Validation
  // Business logic
  // Response formatting
  // Error handling
  // All mixed together
}
```

### After: Modular Route

```typescript
// 1. Extract service to src/core/services/SomeService.ts
export class SomeService {
  async doSomething(params): Promise<Result> {
    // Business logic moved here
  }
}

// 2. Simplify route.ts (~100-150 lines)
import { SomeService } from '@/core/services';
import { schema } from '@/lib/schemas';

const service = new SomeService();

async function handleOperation(request: AuthenticatedRequest) {
  const startTime = performance.now();

  try {
    // 1. Validate
    const params = schema.parse(await request.json());

    // 2. Execute
    const result = await service.doSomething(params);

    // 3. Response
    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        responseTime: `${performance.now() - startTime}ms`
      }
    });
  } catch (error) {
    return handleError(error);
  }
}

export const POST = withBasicAuth(handleOperation);
```

## Type Definitions

### Progress Types
**Location:** `src/core/types/progress.ts`

```typescript
import type {
  ProgressEvent,
  UserProgress,
  SessionProgress,
  DailyProgress,
  Goal,
  Achievement
} from '@/core/types';
```

### Settings Types
**Location:** `src/core/types/settings.ts`

```typescript
import type {
  UserSettings,
  LanguageSettings,
  DifficultySettings,
  ContentSettings
} from '@/core/types';
```

## Error Handling

Use consistent error types:

```typescript
import {
  ValidationError,
  NotFoundError,
  DatabaseError,
  AuthenticationError
} from '@/core/errors';

// In services
if (!isValid) {
  throw new ValidationError('Invalid input', details);
}

// In routes
catch (error) {
  if (error instanceof ValidationError) {
    return NextResponse.json(error.toJSON(), { status: 400 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json(error.toJSON(), { status: 404 });
  }
  // ... other error types
}
```

## Testing Services

### Unit Test Example

```typescript
import { ProgressService } from '@/core/services';

describe('ProgressService', () => {
  let service: ProgressService;

  beforeEach(() => {
    service = new ProgressService();
  });

  it('should track event correctly', async () => {
    const event = await service.trackEvent(
      'user123',
      'vocabulary_learned',
      { category: 'food' }
    );

    expect(event.id).toBeDefined();
    expect(event.userId).toBe('user123');
    expect(event.eventType).toBe('vocabulary_learned');
  });

  it('should update user progress', async () => {
    // Test progress update logic
  });
});
```

## Best Practices

### 1. Keep Routes Thin
Routes should only handle:
- Request validation (Zod schemas)
- Authentication/authorization
- Calling services
- Response formatting
- Error handling

### 2. Put Logic in Services
Services should contain:
- Business logic
- Data transformation
- Validation rules
- Cache operations
- Database calls (via repositories)

### 3. Use TypeScript Types
```typescript
// Define interfaces
interface CreateVocabularyInput {
  phrase: string;
  category: string;
  // ...
}

// Use in service
async create(data: CreateVocabularyInput): Promise<VocabularyItem> {
  // Implementation
}
```

### 4. Consistent Patterns
Follow the established patterns:
- Service class with private helper methods
- Async/await for all operations
- Proper error handling
- Cache prefix for namespacing

### 5. Parallel Operations
Use Promise.all for independent operations:

```typescript
await Promise.all([
  this.updateUserStats(),
  this.updateCollectionIndex(),
  this.cacheResult()
]);
```

## Common Patterns

### Cache Operations
```typescript
import { descriptionCache } from '@/lib/cache';

// Save
await descriptionCache.set(data, ttlSeconds, key);

// Get
const cached = await descriptionCache.get<Type>(key);

// Delete
await descriptionCache.delete(key);
```

### Database Operations
```typescript
import { DatabaseService } from '@/lib/supabase';

const items = await DatabaseService.getVocabularyItems(listId);
const saved = await DatabaseService.addVocabularyItem(data);
```

### Logging
```typescript
import { apiLogger } from '@/lib/logger';
import { asLogContext } from '@/lib/utils/typeGuards';

try {
  // Operation
} catch (error) {
  apiLogger.warn('Operation failed', asLogContext(error));
}
```

## Checklist for Creating New Services

- [ ] Create service file in `src/core/services/`
- [ ] Extend base patterns (cache prefix, error handling)
- [ ] Add TypeScript interfaces for inputs/outputs
- [ ] Create corresponding types in `src/core/types/`
- [ ] Export from `src/core/services/index.ts`
- [ ] Export types from `src/core/types/index.ts`
- [ ] Add JSDoc comments for public methods
- [ ] Write unit tests
- [ ] Update route to use service
- [ ] Update API documentation

## Example: Complete Service

```typescript
// src/core/services/ExampleService.ts
import { descriptionCache } from '@/lib/cache';
import { DatabaseService } from '@/lib/supabase';
import { apiLogger } from '@/lib/logger';
import type { ExampleInput, ExampleResult } from '@/core/types';

export class ExampleService {
  private cachePrefix = 'example';

  /**
   * Create an example item
   */
  async create(userId: string, data: ExampleInput): Promise<ExampleResult> {
    try {
      // Validate
      this.validateInput(data);

      // Save to database
      const saved = await DatabaseService.createExample(data);

      // Update cache
      await this.updateCache(userId, saved);

      return saved;
    } catch (error) {
      apiLogger.error('Failed to create example', error);
      throw error;
    }
  }

  /**
   * Get example items
   */
  async get(userId: string): Promise<ExampleResult[]> {
    const cacheKey = `${this.cachePrefix}:user:${userId}`;

    // Try cache first
    const cached = await descriptionCache.get<ExampleResult[]>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const items = await DatabaseService.getExamples(userId);

    // Cache result
    await descriptionCache.set(items, 3600, cacheKey);

    return items;
  }

  /**
   * Private helper methods
   */
  private validateInput(data: ExampleInput): void {
    if (!data.name || data.name.length < 3) {
      throw new ValidationError('Name must be at least 3 characters');
    }
  }

  private async updateCache(userId: string, data: ExampleResult): Promise<void> {
    const cacheKey = `${this.cachePrefix}:user:${userId}`;
    // Update cache logic
  }
}
```

## Resources

- **Full Report:** `docs/api-modularization-report.md`
- **Summary:** `docs/MODULARIZATION_SUMMARY.md`
- **Services:** `src/core/services/`
- **Types:** `src/core/types/`
- **Error Classes:** `src/core/errors/`

---

For questions or issues, refer to the architectural documentation or consult the existing service implementations.
