# VocabularyService Developer Guide

A comprehensive guide for developers working with the VocabularyService.

## Table of Contents

- [Getting Started](#getting-started)
- [Architecture Overview](#architecture-overview)
- [Common Patterns](#common-patterns)
- [Code Examples](#code-examples)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)

## Getting Started

### Prerequisites

```bash
# Install dependencies
npm install @supabase/supabase-js

# Set up environment variables
cp .env.example .env.local
```

Required environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### Basic Setup

```typescript
import { vocabularyService } from '@/lib/services/vocabularyService';
import type { VocabularyItem } from '@/types/database';

// Test connection
const isConnected = await vocabularyService.testConnection();
console.log('Database status:', isConnected ? 'Connected' : 'Offline mode');

// Load vocabulary
const items = await vocabularyService.getAllVocabularyItems();
console.log(`Loaded ${items.length} vocabulary items`);
```

## Architecture Overview

### Service Layer Structure

```
┌─────────────────────────────────────┐
│      React Components               │
│  (UI Layer - presentational)        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     VocabularyService               │
│  (Business Logic Layer)             │
│  - Data validation                  │
│  - Error handling                   │
│  - Fallback logic                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    Supabase Client                  │
│  (Data Access Layer)                │
│  - Database queries                 │
│  - Authentication                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    PostgreSQL Database              │
│  (Data Storage Layer)               │
└─────────────────────────────────────┘
```

### Data Flow

```typescript
// 1. Component requests data
const VocabList = () => {
  const [items, setItems] = useState<VocabularyItem[]>([]);

  useEffect(() => {
    // 2. Service handles business logic
    const loadData = async () => {
      const data = await vocabularyService.getAllVocabularyItems();
      // 3. Service returns data (from DB or fallback)
      setItems(data);
    };
    loadData();
  }, []);

  // 4. Component renders data
  return <div>{items.map(renderItem)}</div>;
};
```

## Common Patterns

### Pattern 1: Loading Data in Components

```typescript
import { useEffect, useState } from 'react';
import { vocabularyService } from '@/lib/services/vocabularyService';
import type { VocabularyItem } from '@/types/database';

function VocabularyList() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true; // Prevent state updates after unmount

    const loadVocabulary = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await vocabularyService.getAllVocabularyItems();

        if (isMounted) {
          setItems(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadVocabulary();

    return () => {
      isMounted = false; // Cleanup
    };
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (items.length === 0) return <EmptyState />;

  return (
    <ul>
      {items.map(item => (
        <VocabularyCard key={item.id} item={item} />
      ))}
    </ul>
  );
}
```

### Pattern 2: Search with Debouncing

```typescript
import { useState, useEffect } from 'react';
import { vocabularyService } from '@/lib/services/vocabularyService';

function VocabularySearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VocabularyItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const searchTimer = setTimeout(async () => {
      setIsSearching(true);
      const matches = await vocabularyService.searchVocabulary(query);
      setResults(matches);
      setIsSearching(false);
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimer);
  }, [query]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search vocabulary..."
      />

      {isSearching && <Spinner />}

      <SearchResults results={results} query={query} />
    </div>
  );
}
```

### Pattern 3: CRUD Operations with Optimistic Updates

```typescript
import { useState } from 'react';
import { vocabularyService } from '@/lib/services/vocabularyService';

function VocabularyManager() {
  const [items, setItems] = useState<VocabularyItem[]>([]);

  // Add with optimistic update
  const addItem = async (newItemData: Partial<VocabularyItem>) => {
    // Optimistic ID
    const tempId = `temp-${Date.now()}`;
    const optimisticItem = { ...newItemData, id: tempId } as VocabularyItem;

    // Update UI immediately
    setItems(prev => [...prev, optimisticItem]);

    try {
      // Actual database operation
      const createdItem = await vocabularyService.addVocabularyItem(newItemData as any);

      if (createdItem) {
        // Replace optimistic item with real one
        setItems(prev => prev.map(item =>
          item.id === tempId ? createdItem : item
        ));
        showToast('Item added successfully');
      } else {
        throw new Error('Failed to add item');
      }
    } catch (error) {
      // Rollback on failure
      setItems(prev => prev.filter(item => item.id !== tempId));
      showToast('Failed to add item', 'error');
    }
  };

  // Delete with optimistic update
  const deleteItem = async (id: string) => {
    // Store for potential rollback
    const itemToDelete = items.find(item => item.id === id);

    // Update UI immediately
    setItems(prev => prev.filter(item => item.id !== id));

    try {
      const success = await vocabularyService.deleteVocabularyItem(id);

      if (!success) {
        throw new Error('Delete failed');
      }

      showToast('Item deleted');
    } catch (error) {
      // Rollback on failure
      if (itemToDelete) {
        setItems(prev => [...prev, itemToDelete]);
      }
      showToast('Failed to delete item', 'error');
    }
  };

  return (
    <div>
      <AddItemForm onAdd={addItem} />
      <ItemList items={items} onDelete={deleteItem} />
    </div>
  );
}
```

### Pattern 4: Filtering and Sorting

```typescript
import { useMemo, useState } from 'react';

function VocabularyFiltered() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [filters, setFilters] = useState({
    category: 'all',
    difficulty: 'all',
    sortBy: 'created_at' as 'created_at' | 'spanish_text' | 'difficulty_level',
    sortOrder: 'desc' as 'asc' | 'desc',
  });

  // Efficient filtering with useMemo
  const filteredItems = useMemo(() => {
    let filtered = [...items];

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    // Filter by difficulty
    if (filters.difficulty !== 'all') {
      const diff = parseInt(filters.difficulty);
      filtered = filtered.filter(item => item.difficulty_level === diff);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[filters.sortBy];
      const bVal = b[filters.sortBy];

      const comparison = aVal > bVal ? 1 : -1;
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [items, filters]);

  return (
    <div>
      <FilterControls filters={filters} onChange={setFilters} />
      <ItemList items={filteredItems} />
    </div>
  );
}
```

### Pattern 5: Pagination

```typescript
import { useState, useEffect } from 'react';

function VocabularyPaginated() {
  const [allItems, setAllItems] = useState<VocabularyItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const loadItems = async () => {
      const items = await vocabularyService.getAllVocabularyItems();
      setAllItems(items);
    };
    loadItems();
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(allItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = allItems.slice(startIndex, endIndex);

  return (
    <div>
      <ItemList items={currentItems} />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <div>
        Showing {startIndex + 1}-{Math.min(endIndex, allItems.length)} of {allItems.length}
      </div>
    </div>
  );
}
```

## Code Examples

### Example 1: Vocabulary Flashcards

```typescript
import { useState, useEffect } from 'react';
import { vocabularyService } from '@/lib/services/vocabularyService';

function FlashcardsApp() {
  const [cards, setCards] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    const loadCards = async () => {
      const items = await vocabularyService.getAllVocabularyItems();
      // Shuffle cards
      const shuffled = items.sort(() => Math.random() - 0.5);
      setCards(shuffled);
    };
    loadCards();
  }, []);

  const currentCard = cards[currentIndex];

  const nextCard = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  if (!currentCard) return <div>Loading...</div>;

  return (
    <div className="flashcard">
      <div className="question">
        {showAnswer ? currentCard.english_translation : currentCard.spanish_text}
      </div>

      <button onClick={() => setShowAnswer(!showAnswer)}>
        {showAnswer ? 'Show Question' : 'Show Answer'}
      </button>

      <button onClick={nextCard}>Next Card</button>

      <div className="progress">
        Card {currentIndex + 1} of {cards.length}
      </div>
    </div>
  );
}
```

### Example 2: Vocabulary Quiz

```typescript
import { useState, useEffect } from 'react';
import { vocabularyService } from '@/lib/services/vocabularyService';

function VocabularyQuiz() {
  const [questions, setQuestions] = useState<VocabularyItem[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  useEffect(() => {
    const loadQuiz = async () => {
      const items = await vocabularyService.getAllVocabularyItems();
      // Select 10 random items
      const selected = items.sort(() => Math.random() - 0.5).slice(0, 10);
      setQuestions(selected);

      // Generate wrong answers
      const wrongAnswers = selected.map(item => {
        const others = items.filter(i => i.id !== item.id);
        const wrong = others.sort(() => Math.random() - 0.5).slice(0, 3);
        return [...wrong, item].sort(() => Math.random() - 0.5);
      });

      setAnswers(wrongAnswers.flat());
    };
    loadQuiz();
  }, []);

  const checkAnswer = (selected: string) => {
    if (selected === questions[currentQ].english_translation) {
      setScore(score + 1);
    }

    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      // Quiz complete
      alert(`Quiz complete! Score: ${score}/${questions.length}`);
    }
  };

  const question = questions[currentQ];
  if (!question) return <div>Loading quiz...</div>;

  return (
    <div className="quiz">
      <h2>Question {currentQ + 1}/{questions.length}</h2>
      <p className="question">{question.spanish_text}</p>

      <div className="options">
        {answers.slice(currentQ * 4, currentQ * 4 + 4).map((answer, idx) => (
          <button key={idx} onClick={() => checkAnswer(answer)}>
            {answer}
          </button>
        ))}
      </div>

      <div className="score">Score: {score}</div>
    </div>
  );
}
```

### Example 3: Vocabulary List Manager

```typescript
import { useState, useEffect } from 'react';
import { vocabularyService } from '@/lib/services/vocabularyService';

function VocabularyListManager() {
  const [lists, setLists] = useState<VocabularyList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [listItems, setListItems] = useState<VocabularyItem[]>([]);

  useEffect(() => {
    const loadLists = async () => {
      const data = await vocabularyService.getVocabularyLists();
      setLists(data);
    };
    loadLists();
  }, []);

  useEffect(() => {
    if (!selectedList) return;

    const loadListItems = async () => {
      const items = await vocabularyService.getVocabularyItems(selectedList);
      setListItems(items);
    };
    loadListItems();
  }, [selectedList]);

  const createNewList = async (name: string, description: string) => {
    const newList = await vocabularyService.createVocabularyList({
      name,
      description,
    });

    if (newList) {
      setLists([...lists, newList]);
      setSelectedList(newList.id);
    }
  };

  return (
    <div className="list-manager">
      <div className="sidebar">
        <h3>Vocabulary Lists</h3>
        <button onClick={() => createNewList('New List', '')}>
          + New List
        </button>

        <ul>
          {lists.map(list => (
            <li
              key={list.id}
              className={selectedList === list.id ? 'active' : ''}
              onClick={() => setSelectedList(list.id)}
            >
              {list.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="content">
        {selectedList ? (
          <>
            <h2>{lists.find(l => l.id === selectedList)?.name}</h2>
            <ItemList items={listItems} />
          </>
        ) : (
          <div>Select a list to view items</div>
        )}
      </div>
    </div>
  );
}
```

## Performance Optimization

### 1. Implement Caching

```typescript
class VocabularyServiceWithCache extends VocabularyService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getAllVocabularyItems(): Promise<VocabularyItem[]> {
    const cached = this.getCached<VocabularyItem[]>('all');
    if (cached) return cached;

    const items = await super.getAllVocabularyItems();
    this.setCache('all', items);
    return items;
  }
}
```

### 2. Lazy Loading

```typescript
function VocabularyInfiniteScroll() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [displayCount, setDisplayCount] = useState(20);

  useEffect(() => {
    const loadItems = async () => {
      const allItems = await vocabularyService.getAllVocabularyItems();
      setItems(allItems);
    };
    loadItems();
  }, []);

  const loadMore = () => {
    setDisplayCount(prev => prev + 20);
  };

  const displayedItems = items.slice(0, displayCount);

  return (
    <div>
      <ItemList items={displayedItems} />

      {displayCount < items.length && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  );
}
```

### 3. Request Batching

```typescript
async function batchAddItems(items: Partial<VocabularyItem>[]) {
  const batchSize = 10;
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(item => vocabularyService.addVocabularyItem(item as any))
    );

    results.push(...batchResults);

    // Progress callback
    console.log(`Processed ${i + batch.length}/${items.length}`);
  }

  return results;
}
```

## Troubleshooting

### Issue: Slow Loading

**Problem:** Vocabulary takes too long to load

**Solutions:**
1. Implement pagination:
   ```typescript
   const items = allItems.slice(0, 20); // Load first 20
   ```

2. Add loading indicators:
   ```typescript
   {loading && <Spinner />}
   ```

3. Use React.memo for list items:
   ```typescript
   const VocabularyCard = React.memo(({ item }) => (
     <div>{item.spanish_text}</div>
   ));
   ```

### Issue: Stale Data

**Problem:** Data doesn't update after changes

**Solutions:**
1. Invalidate cache after mutations:
   ```typescript
   await vocabularyService.addVocabularyItem(data);
   // Reload data
   const fresh = await vocabularyService.getAllVocabularyItems();
   setItems(fresh);
   ```

2. Use refetch functions:
   ```typescript
   const [, refetch] = useState({});
   const reload = () => refetch({});
   ```

### Issue: Memory Leaks

**Problem:** Component updates after unmount

**Solution:**
```typescript
useEffect(() => {
  let isMounted = true;

  const load = async () => {
    const data = await service.getItems();
    if (isMounted) setItems(data);
  };
  load();

  return () => { isMounted = false; };
}, []);
```

## Advanced Usage

### Custom Hooks

```typescript
// useVocabulary.ts
export function useVocabulary() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vocabularyService.getAllVocabularyItems().then(data => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const add = async (item: Partial<VocabularyItem>) => {
    const newItem = await vocabularyService.addVocabularyItem(item as any);
    if (newItem) setItems([...items, newItem]);
    return newItem;
  };

  return { items, loading, add };
}

// Usage
function MyComponent() {
  const { items, loading, add } = useVocabulary();
  // ...
}
```

---

**Version:** 2.0.0
**Last Updated:** 2025-10-03
**Maintained By:** Development Team
