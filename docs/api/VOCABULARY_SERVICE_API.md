# VocabularyService API Documentation

Complete API reference for the VocabularyService class and related database operations.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Initialization](#initialization)
- [Core Methods](#core-methods)
- [Response Types](#response-types)
- [Error Handling](#error-handling)
- [Performance Characteristics](#performance-characteristics)
- [Examples](#examples)

## Overview

The VocabularyService provides a comprehensive API for managing Spanish vocabulary items, lists, and user progress. It abstracts database operations and provides a clean, type-safe interface.

**Key Features:**
- CRUD operations for vocabulary items
- Vocabulary list management
- Full-text search capabilities
- Database fallback to sample data
- Type-safe operations with TypeScript

## Installation

```bash
npm install @supabase/supabase-js
```

## Initialization

```typescript
import { vocabularyService } from '@/lib/services/vocabularyService';

// Service is automatically initialized
// Test database connection
const isConnected = await vocabularyService.testConnection();
console.log('Database connected:', isConnected);
```

## Core Methods

### `testConnection()`

Tests the database connection.

**Signature:**
```typescript
async testConnection(): Promise<boolean>
```

**Returns:** `true` if database is connected, `false` otherwise

**Example:**
```typescript
const isConnected = await vocabularyService.testConnection();
if (!isConnected) {
  console.warn('Using offline mode with sample data');
}
```

---

### `getAllVocabularyItems()`

Retrieves all vocabulary items from the database.

**Signature:**
```typescript
async getAllVocabularyItems(): Promise<VocabularyItem[]>
```

**Returns:** Array of vocabulary items (empty array on error)

**Response Type:**
```typescript
interface VocabularyItem {
  id: string;
  spanish_text: string;
  english_translation: string;
  category: string;
  difficulty_level: number;           // 1-5
  part_of_speech: string;             // noun, verb, adjective, etc.
  frequency_score: number;            // 0-100
  context_sentence_spanish?: string;
  context_sentence_english?: string;
  created_at: string;                 // ISO 8601
}
```

**Example:**
```typescript
const allItems = await vocabularyService.getAllVocabularyItems();
console.log(`Loaded ${allItems.length} vocabulary items`);

// Filter by difficulty
const beginnerItems = allItems.filter(item => item.difficulty_level <= 2);
```

**Performance:**
- Database: ~100-500ms for 1000 items
- Fallback: <10ms (sample data)

---

### `getVocabularyItems(listId)`

Retrieves vocabulary items for a specific list.

**Signature:**
```typescript
async getVocabularyItems(listId: string): Promise<VocabularyItem[]>
```

**Parameters:**
- `listId` (string, required): ID of the vocabulary list

**Returns:** Array of vocabulary items in the list

**Example:**
```typescript
const basicSpanish = await vocabularyService.getVocabularyItems('list-123');
console.log(`List contains ${basicSpanish.length} words`);
```

**Error Handling:**
```typescript
const items = await vocabularyService.getVocabularyItems('invalid-id');
// Returns empty array if list not found
if (items.length === 0) {
  console.log('List not found or empty');
}
```

---

### `getVocabularyLists()`

Retrieves all vocabulary lists.

**Signature:**
```typescript
async getVocabularyLists(): Promise<VocabularyList[]>
```

**Returns:** Array of vocabulary lists

**Response Type:**
```typescript
interface VocabularyList {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
```

**Example:**
```typescript
const lists = await vocabularyService.getVocabularyLists();

lists.forEach(list => {
  console.log(`${list.name}: ${list.description}`);
});
```

---

### `searchVocabulary(query)`

Performs full-text search across vocabulary items.

**Signature:**
```typescript
async searchVocabulary(query: string): Promise<VocabularyItem[]>
```

**Parameters:**
- `query` (string, required): Search term (case-insensitive)

**Returns:** Array of matching vocabulary items

**Search Fields:**
- spanish_text
- english_translation
- category

**Example:**
```typescript
// Search for a word
const results = await vocabularyService.searchVocabulary('casa');

// Search by category
const animals = await vocabularyService.searchVocabulary('animals');

// Search by translation
const houses = await vocabularyService.searchVocabulary('house');

console.log(`Found ${results.length} matches for "${query}"`);
```

**Performance:**
- Database with index: ~50-200ms
- Fallback (in-memory): <5ms

---

### `addVocabularyItem(itemData)`

Adds a new vocabulary item to the database.

**Signature:**
```typescript
async addVocabularyItem(
  itemData: Omit<VocabularyItem, 'id' | 'created_at'>
): Promise<VocabularyItem | null>
```

**Parameters:**
```typescript
{
  spanish_text: string;              // Required
  english_translation: string;       // Required
  category: string;                  // Required
  difficulty_level: number;          // Required: 1-5
  part_of_speech: string;           // Required
  frequency_score: number;          // Required: 0-100
  context_sentence_spanish?: string; // Optional
  context_sentence_english?: string; // Optional
}
```

**Returns:** Created vocabulary item or `null` on error

**Example:**
```typescript
const newWord = await vocabularyService.addVocabularyItem({
  spanish_text: 'biblioteca',
  english_translation: 'library',
  category: 'education',
  difficulty_level: 2,
  part_of_speech: 'noun',
  frequency_score: 70,
  context_sentence_spanish: 'Voy a la biblioteca cada día.',
  context_sentence_english: 'I go to the library every day.',
});

if (newWord) {
  console.log('Word added successfully:', newWord.id);
} else {
  console.error('Failed to add word');
}
```

**Validation:**
- spanish_text: 1-100 characters
- english_translation: 1-200 characters
- difficulty_level: 1-5
- frequency_score: 0-100

---

### `createVocabularyList(listData)`

Creates a new vocabulary list.

**Signature:**
```typescript
async createVocabularyList(
  listData: Omit<VocabularyList, 'id' | 'created_at' | 'updated_at'>
): Promise<VocabularyList | null>
```

**Parameters:**
```typescript
{
  name: string;           // Required
  description?: string;   // Optional
}
```

**Returns:** Created vocabulary list or `null` on error

**Example:**
```typescript
const newList = await vocabularyService.createVocabularyList({
  name: 'Travel Vocabulary',
  description: 'Essential words for traveling in Spanish-speaking countries',
});

if (newList) {
  console.log('List created:', newList.id);
}
```

---

### `updateVocabularyItem(id, updates)`

Updates an existing vocabulary item.

**Signature:**
```typescript
async updateVocabularyItem(
  id: string,
  updates: Partial<VocabularyItem>
): Promise<VocabularyItem | null>
```

**Parameters:**
- `id` (string, required): Item ID
- `updates` (object, required): Partial item data to update

**Returns:** Updated vocabulary item or `null` on error

**Example:**
```typescript
const updated = await vocabularyService.updateVocabularyItem('item-123', {
  difficulty_level: 3,
  context_sentence_spanish: 'Nueva oración de ejemplo.',
});

if (updated) {
  console.log('Updated successfully');
} else {
  console.error('Update failed - item not found or database error');
}
```

---

### `deleteVocabularyItem(id)`

Deletes a vocabulary item.

**Signature:**
```typescript
async deleteVocabularyItem(id: string): Promise<boolean>
```

**Parameters:**
- `id` (string, required): Item ID to delete

**Returns:** `true` if deleted successfully, `false` otherwise

**Example:**
```typescript
const deleted = await vocabularyService.deleteVocabularyItem('item-123');

if (deleted) {
  console.log('Item deleted successfully');
} else {
  console.error('Failed to delete item');
}
```

## Response Types

### VocabularyItem

```typescript
interface VocabularyItem {
  id: string;
  spanish_text: string;
  english_translation: string;
  category: string;
  difficulty_level: number;           // 1-5
  part_of_speech: string;             // noun, verb, adjective, adverb, other
  frequency_score: number;            // 0-100
  context_sentence_spanish?: string;
  context_sentence_english?: string;
  created_at: string;                 // ISO 8601 timestamp
}
```

### VocabularyList

```typescript
interface VocabularyList {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
```

## Error Handling

The VocabularyService uses graceful error handling with fallbacks:

### Pattern 1: Return Empty Array

```typescript
const items = await vocabularyService.getAllVocabularyItems();
// Always returns array (empty on error)
// No need for null checks
```

### Pattern 2: Return Null

```typescript
const item = await vocabularyService.addVocabularyItem(data);
// Returns null on error
if (!item) {
  // Handle error
}
```

### Pattern 3: Return Boolean

```typescript
const success = await vocabularyService.deleteVocabularyItem(id);
// Returns false on error
if (!success) {
  // Handle error
}
```

### Logging

All errors are automatically logged via the logger:

```typescript
import { logger } from '@/lib/logger';

// Internal error logging (automatic)
logger.error("Error fetching vocabulary items:", error);
```

### Best Practices

```typescript
// ✅ Good: Check for empty results
const items = await vocabularyService.getAllVocabularyItems();
if (items.length === 0) {
  showEmptyState();
} else {
  renderItems(items);
}

// ✅ Good: Check for null returns
const newItem = await vocabularyService.addVocabularyItem(data);
if (newItem) {
  showSuccessMessage();
} else {
  showErrorMessage('Failed to add item');
}

// ❌ Bad: Assuming success
const items = await vocabularyService.getAllVocabularyItems();
items.forEach(item => render(item)); // May be empty array
```

## Performance Characteristics

### Database Operations

| Operation | Avg Latency | Notes |
|-----------|------------|-------|
| `getAllVocabularyItems()` | 100-500ms | Depends on dataset size |
| `getVocabularyItems(listId)` | 50-200ms | Indexed query |
| `getVocabularyLists()` | 50-150ms | Small dataset |
| `searchVocabulary(query)` | 50-300ms | Full-text search |
| `addVocabularyItem()` | 100-250ms | Insert + return |
| `updateVocabularyItem()` | 100-250ms | Update + return |
| `deleteVocabularyItem()` | 50-150ms | Delete operation |

### Fallback Mode (Sample Data)

| Operation | Avg Latency | Notes |
|-----------|------------|-------|
| All operations | <10ms | In-memory operations |

### Optimization Tips

1. **Batch Operations:** For bulk inserts, collect items and insert in batches
2. **Caching:** Cache frequently accessed lists client-side
3. **Pagination:** For large datasets, implement pagination
4. **Indexes:** Ensure database indexes on commonly queried fields

## Examples

### Basic Usage

```typescript
import { vocabularyService } from '@/lib/services/vocabularyService';

// Load all vocabulary
const vocab = await vocabularyService.getAllVocabularyItems();

// Search for specific words
const searchResults = await vocabularyService.searchVocabulary('comida');

// Add a new word
const newWord = await vocabularyService.addVocabularyItem({
  spanish_text: 'manzana',
  english_translation: 'apple',
  category: 'food_drink',
  difficulty_level: 1,
  part_of_speech: 'noun',
  frequency_score: 90,
});
```

### React Component Example

```typescript
import { useEffect, useState } from 'react';
import { vocabularyService } from '@/lib/services/vocabularyService';
import type { VocabularyItem } from '@/types/database';

function VocabularyList() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVocabulary = async () => {
      try {
        setLoading(true);
        const data = await vocabularyService.getAllVocabularyItems();
        setItems(data);
        setError(null);
      } catch (err) {
        setError('Failed to load vocabulary');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadVocabulary();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          <strong>{item.spanish_text}</strong> - {item.english_translation}
        </li>
      ))}
    </ul>
  );
}
```

### Search Implementation

```typescript
import { useState } from 'react';
import { vocabularyService } from '@/lib/services/vocabularyService';

function VocabularySearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VocabularyItem[]>([]);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);

    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    const matches = await vocabularyService.searchVocabulary(searchQuery);
    setResults(matches);
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search vocabulary..."
      />

      <div>
        {results.length} result{results.length !== 1 ? 's' : ''}
      </div>

      <ul>
        {results.map(item => (
          <li key={item.id}>{item.spanish_text} - {item.english_translation}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Bulk Import

```typescript
async function importVocabulary(items: Partial<VocabularyItem>[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const item of items) {
    const result = await vocabularyService.addVocabularyItem(item as any);

    if (result) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push(`Failed to import: ${item.spanish_text}`);
    }
  }

  return results;
}
```

---

**Version:** 2.0.0
**Last Updated:** 2025-10-03
**Status:** Active
