# Core Types Documentation

This directory contains the consolidated type system for the application. All types have been organized into a logical hierarchy to eliminate duplication and provide a single source of truth.

## Structure

```
core/types/
├── entities.ts    # Domain entities (User, Description, VocabularyItem, etc.)
├── dto.ts         # Data Transfer Objects (Request/Response types)
├── api.ts         # API infrastructure types (ApiResponse, Pagination, etc.)
└── index.ts       # Barrel export and type utilities
```

## Usage

### Importing Types

Always import from the core types module:

```typescript
// ✅ Correct
import { User, Description, VocabularyItem } from '@/core/types';
import type { ApiResponse, PaginatedResponse } from '@/core/types';

// ❌ Incorrect - Don't import from old locations
import { User } from '@/types/database';
import { Description } from '@/types/index';
```

### Type Categories

#### 1. Entities (`entities.ts`)

Core domain entities representing business objects:

- **User & Settings**: `User`, `UserSettings`
- **Content**: `ImageEntity`, `Description`, `VocabularyItem`, `Phrase`
- **Learning**: `StudySession`, `UserProgress`, `QASession`
- **Analytics**: `LearningAnalytics`, `ExportHistory`

#### 2. DTOs (`dto.ts`)

Data transfer objects for API communication:

- **Requests**: `DescriptionRequest`, `VocabularySearchRequest`, etc.
- **Responses**: `DescriptionResponse`, `VocabularySearchResponse`, etc.
- **Statistics**: `VocabularyStatsDTO`, `StudyStatsDTO`
- **Bulk Operations**: `BulkOperationRequest`, `BulkOperationResponse`

#### 3. API Types (`api.ts`)

Generic API infrastructure:

- **Response Wrappers**: `ApiResponse<T>`, `PaginatedResponse<T>`
- **Errors**: `ApiError`, `ValidationError`, `ApiErrorCode`
- **Utilities**: `PaginationInfo`, `SortOptions`, `FilterOptions`
- **Auth**: `AuthTokens`, `AuthRequest`, `AuthResponse`

## Type Utilities

The consolidated types export several utility types:

```typescript
// Make insert-safe (removes auto-generated fields)
type UserInsert = DatabaseInsert<User>;

// Make update-safe (all fields optional except id)
type UserUpdate = DatabaseUpdate<User>;

// Require specific fields
type RequiredEmail = RequireFields<User, 'email'>;

// Make specific fields optional
type OptionalAvatar = OptionalFields<User, 'avatar_url'>;

// Deep partial
type PartialSettings = DeepPartial<UserSettings>;
```

## Migration Guide

### Step 1: Update Imports

Find and replace old imports:

```bash
# Find files using old imports
git grep -l '@/types/database'
git grep -l '@/types/index'
git grep -l '@/types/unified'

# Replace with new import
# From: import { User } from '@/types/database';
# To:   import { User } from '@/core/types';
```

### Step 2: Update Type References

Some types have been renamed for clarity:

| Old Name | New Name | Location |
|----------|----------|----------|
| `Image` | `ImageEntity` | entities.ts |
| `VocabularyItem` (UI) | Use conversion functions | - |
| `DatabaseResponse<T>` | `ApiResponse<T>` | api.ts |

### Step 3: Use Type Guards

Replace manual type checks with type guards:

```typescript
// ✅ Use type guards
if (isDifficultyLevel(value)) {
  // TypeScript knows value is DifficultyLevel
}

// ❌ Manual check
if (['beginner', 'intermediate', 'advanced'].includes(value)) {
  // No type safety
}
```

## Constants

Type-safe constants are exported:

```typescript
import { DIFFICULTY_LEVELS, DESCRIPTION_STYLES } from '@/core/types';

// Type-safe iteration
DIFFICULTY_LEVELS.forEach(level => {
  // level is typed as DifficultyLevel
});
```

## Best Practices

1. **Always use the consolidated types**: Don't create duplicate type definitions
2. **Use type utilities**: Leverage `DatabaseInsert`, `DatabaseUpdate`, etc.
3. **Type guards for runtime checks**: Use exported type guards
4. **Prefer type imports**: Use `import type` for type-only imports
5. **Document custom types**: Add JSDoc comments for complex types

## Examples

### Creating a new API endpoint

```typescript
import type {
  ApiResponse,
  VocabularySearchRequest,
  VocabularySearchResponse
} from '@/core/types';

export async function searchVocabulary(
  request: VocabularySearchRequest
): Promise<ApiResponse<VocabularySearchResponse>> {
  // Implementation
}
```

### Working with database operations

```typescript
import type { User, DatabaseInsert, DatabaseUpdate } from '@/core/types';

// Insert
const newUser: DatabaseInsert<User> = {
  email: 'user@example.com',
  learning_level: 'beginner',
  // id, created_at, updated_at are auto-generated
};

// Update
const updateUser: DatabaseUpdate<User> = {
  id: 'user-123',
  learning_level: 'intermediate',
  // Only changed fields needed
};
```

### Type-safe filtering

```typescript
import type { VocabularyItem } from '@/core/types';
import { isDifficultyLevel, isPartOfSpeech } from '@/core/types';

function filterVocabulary(items: VocabularyItem[], filters: unknown) {
  return items.filter(item => {
    if (filters.difficulty && isDifficultyLevel(filters.difficulty)) {
      // Type-safe access to difficulty
    }
  });
}
```

## Migration Status

- [x] Create consolidated type files
- [ ] Update imports in components
- [ ] Update imports in lib files
- [ ] Update imports in API routes
- [ ] Remove old type files
- [ ] Update documentation
