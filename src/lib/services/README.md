# Services Directory

This directory contains service classes that handle business logic and data operations for the application.

## Available Services

### VocabularyService

The VocabularyService manages Spanish vocabulary items, lists, and related operations with database persistence.

**Location:** `vocabularyService.ts`

**Features:**
- CRUD operations for vocabulary items
- Vocabulary list management
- Full-text search
- Automatic fallback to sample data
- Type-safe operations

**Quick Start:**

```typescript
import { vocabularyService } from '@/lib/services/vocabularyService';

// Load all vocabulary
const items = await vocabularyService.getAllVocabularyItems();

// Search vocabulary
const results = await vocabularyService.searchVocabulary('casa');

// Add new word
const newWord = await vocabularyService.addVocabularyItem({
  spanish_text: 'libro',
  english_translation: 'book',
  category: 'education',
  difficulty_level: 1,
  part_of_speech: 'noun',
  frequency_score: 85,
});
```

**Documentation:**
- Full API: `/docs/api/VOCABULARY_SERVICE_API.md`
- Developer Guide: `/docs/development/VOCABULARY_SERVICE_GUIDE.md`
- Migration Guide: `/docs/migrations/VOCABULARY_SERVICE_MIGRATION.md`

### ProgressService

Manages user learning progress and statistics.

**Location:** `progressService.ts`

**Features:**
- Track learning progress
- Calculate statistics
- Update user achievements
- Generate progress reports

**Example:**

```typescript
import { progressService } from '@/lib/services/progressService';

// Update progress
await progressService.updateProgress(userId, itemId, {
  mastery_level: 75,
  times_reviewed: 5,
  times_correct: 4,
});

// Get user statistics
const stats = await progressService.getUserStats(userId);
```

## Service Architecture

### Design Patterns

All services follow these patterns:

1. **Singleton Pattern:** Single instance per service
2. **Async Operations:** All database operations are async
3. **Error Handling:** Graceful fallbacks and error logging
4. **Type Safety:** Full TypeScript support
5. **Separation of Concerns:** Business logic separated from UI

### Service Structure

```typescript
class ServiceName {
  // Private state
  private isConnectedToDatabase = false;

  // Public methods
  async testConnection(): Promise<boolean> { }
  async getItems(): Promise<Item[]> { }
  async addItem(data): Promise<Item | null> { }
  async updateItem(id, data): Promise<Item | null> { }
  async deleteItem(id): Promise<boolean> { }
}

// Export singleton instance
export const serviceName = new ServiceName();
export { ServiceName };
export default serviceName;
```

### Error Handling Pattern

```typescript
async getItems(): Promise<Item[]> {
  try {
    if (this.isConnectedToDatabase) {
      // Database operation
      const { data, error } = await database.query();
      if (error) throw error;
      return data;
    } else {
      // Fallback data
      return sampleData;
    }
  } catch (error) {
    logger.error("Error in getItems:", error);
    return sampleData; // Graceful fallback
  }
}
```

## Best Practices

### 1. Import Services

```typescript
// ✅ Good: Named import
import { vocabularyService } from '@/lib/services/vocabularyService';

// ✅ Good: Default import
import vocabularyService from '@/lib/services/vocabularyService';

// ❌ Bad: Direct class instantiation
import { VocabularyService } from '@/lib/services/vocabularyService';
const service = new VocabularyService(); // Don't do this
```

### 2. Error Handling

```typescript
// ✅ Good: Check return values
const item = await vocabularyService.addVocabularyItem(data);
if (!item) {
  showErrorMessage('Failed to add item');
  return;
}

// ✅ Good: Handle empty arrays
const items = await vocabularyService.getAllVocabularyItems();
if (items.length === 0) {
  showEmptyState();
  return;
}

// ❌ Bad: Assume success
const item = await vocabularyService.addVocabularyItem(data);
showSuccessMessage(); // May have failed
```

### 3. React Integration

```typescript
// ✅ Good: Proper async handling
function MyComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const items = await vocabularyService.getAllVocabularyItems();
      setData(items);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return <Spinner />;
  return <List items={data} />;
}

// ❌ Bad: Direct async in useEffect
useEffect(async () => {
  const items = await vocabularyService.getAllVocabularyItems();
  setData(items);
}, []); // useEffect cannot be async
```

### 4. Type Safety

```typescript
// ✅ Good: Proper typing
import type { VocabularyItem } from '@/types/database';

const [items, setItems] = useState<VocabularyItem[]>([]);

// ✅ Good: Type guards
function isVocabularyItem(obj: any): obj is VocabularyItem {
  return obj && typeof obj.spanish_text === 'string';
}

// ❌ Bad: Using 'any'
const items: any = await vocabularyService.getAllVocabularyItems();
```

## Creating New Services

### Template

```typescript
import { logger } from '@/lib/logger';
import type { YourType } from '@/types/database';

// Sample data for development/fallback
const sampleData: YourType[] = [
  // ... sample items
];

class YourService {
  private isConnectedToDatabase = false;

  async testConnection(): Promise<boolean> {
    try {
      // Test database connection
      this.isConnectedToDatabase = false; // Set based on actual test
      return this.isConnectedToDatabase;
    } catch (error) {
      logger.error("Database connection failed:", error);
      return false;
    }
  }

  async getItems(): Promise<YourType[]> {
    try {
      if (this.isConnectedToDatabase) {
        // Database query
        return [];
      } else {
        return sampleData;
      }
    } catch (error) {
      logger.error("Error fetching items:", error);
      return sampleData;
    }
  }

  // ... more methods
}

export const yourService = new YourService();
export { YourService };
export default yourService;
```

### Checklist

- [ ] Create service class with private state
- [ ] Implement testConnection() method
- [ ] Add CRUD methods as needed
- [ ] Include sample/fallback data
- [ ] Add error handling with logging
- [ ] Export singleton instance
- [ ] Create TypeScript interfaces
- [ ] Write comprehensive tests
- [ ] Document API methods
- [ ] Add usage examples

## Testing Services

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { vocabularyService } from './vocabularyService';

describe('VocabularyService', () => {
  beforeEach(() => {
    // Reset service state if needed
  });

  it('should return vocabulary items', async () => {
    const items = await vocabularyService.getAllVocabularyItems();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it('should search vocabulary', async () => {
    const results = await vocabularyService.searchVocabulary('casa');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].spanish_text).toContain('casa');
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import { vocabularyService } from './vocabularyService';

describe('VocabularyService Integration', () => {
  it('should complete CRUD workflow', async () => {
    // Create
    const newItem = await vocabularyService.addVocabularyItem({
      spanish_text: 'test',
      english_translation: 'test',
      category: 'test',
      difficulty_level: 1,
      part_of_speech: 'noun',
      frequency_score: 50,
    });
    expect(newItem).not.toBeNull();

    // Read
    const items = await vocabularyService.getAllVocabularyItems();
    expect(items.some(i => i.id === newItem?.id)).toBe(true);

    // Update
    const updated = await vocabularyService.updateVocabularyItem(
      newItem!.id,
      { difficulty_level: 2 }
    );
    expect(updated?.difficulty_level).toBe(2);

    // Delete
    const deleted = await vocabularyService.deleteVocabularyItem(newItem!.id);
    expect(deleted).toBe(true);
  });
});
```

## Performance Optimization

### Caching

```typescript
class VocabularyService {
  private cache = new Map<string, VocabularyItem[]>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  async getAllVocabularyItems(): Promise<VocabularyItem[]> {
    const cached = this.cache.get('all');
    if (cached) return cached;

    const items = await this.fetchFromDatabase();
    this.cache.set('all', items);

    setTimeout(() => this.cache.delete('all'), this.cacheExpiry);

    return items;
  }
}
```

### Batch Operations

```typescript
async addMultipleItems(items: Partial<VocabularyItem>[]): Promise<number> {
  const results = await Promise.all(
    items.map(item => this.addVocabularyItem(item))
  );
  return results.filter(r => r !== null).length;
}
```

## Resources

- **API Documentation:** `/docs/api/`
- **Migration Guides:** `/docs/migrations/`
- **Developer Guides:** `/docs/development/`
- **Type Definitions:** `/src/types/`
- **Database Utils:** `/src/lib/database/utils/`

---

**Last Updated:** 2025-10-03
**Maintained By:** Development Team
