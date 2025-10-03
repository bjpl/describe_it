# VocabularySearch Component

A comprehensive, feature-rich search component for vocabulary management with bilingual support, advanced filtering, and performance optimizations.

## Features

- ✅ **Bilingual Search**: Search Spanish and English simultaneously
- ✅ **Accent-Insensitive**: café = cafe
- ✅ **Case-Insensitive**: CAFÉ = café
- ✅ **Real-time Results**: Debounced search (300ms default)
- ✅ **Advanced Filtering**: Category, Part of Speech, Difficulty, Date Range
- ✅ **Keyboard Navigation**: Arrow keys + Enter
- ✅ **Search Caching**: Performance optimization
- ✅ **Saved Searches**: Save and load frequent searches
- ✅ **Accessibility**: Full ARIA support
- ✅ **Result Highlighting**: Visual match indicators
- ✅ **Request Cancellation**: Prevents race conditions

## Installation

```bash
npm install lucide-react
```

## Basic Usage

```typescript
import { VocabularySearch, VocabularyWord } from '@/components/Vocabulary';

const words: VocabularyWord[] = [
  {
    id: '1',
    spanish: 'café',
    english: 'coffee',
    category: 'food',
    partOfSpeech: 'noun',
    difficulty: 'beginner',
    createdAt: new Date(),
  },
  // ... more words
];

function MyComponent() {
  const handleSearch = (query: string, filters: SearchFilters) => {
    console.log('Searching for:', query, 'with filters:', filters);
  };

  const handleSelectWord = (word: VocabularyWord) => {
    console.log('Selected:', word);
  };

  return (
    <VocabularySearch
      words={words}
      onSearch={handleSearch}
      onSelectWord={handleSelectWord}
    />
  );
}
```

## Advanced Usage with All Features

```typescript
import { VocabularySearch, SavedSearch } from '@/components/Vocabulary';
import { useState } from 'react';

function AdvancedVocabularyApp() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  const handleSaveSearch = (search: SavedSearch) => {
    setSavedSearches([...savedSearches, search]);
    // Optionally persist to localStorage or database
  };

  const handleLoadSearch = (search: SavedSearch) => {
    console.log('Loading saved search:', search);
  };

  return (
    <VocabularySearch
      words={vocabularyList}
      onSearch={handleSearch}
      onSelectWord={handleSelectWord}
      placeholder="Search for Spanish or English words..."
      minSearchLength={3}
      debounceDelay={500}
      showAdvanced={true}
      savedSearches={savedSearches}
      onSaveSearch={handleSaveSearch}
      onLoadSearch={handleLoadSearch}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `words` | `VocabularyWord[]` | Required | Array of vocabulary words to search |
| `onSearch` | `(query: string, filters: SearchFilters) => void` | Required | Callback fired when search is performed |
| `onSelectWord` | `(word: VocabularyWord) => void` | Optional | Callback fired when a result is selected |
| `placeholder` | `string` | "Search Spanish or English..." | Input placeholder text |
| `minSearchLength` | `number` | 2 | Minimum characters before search starts |
| `debounceDelay` | `number` | 300 | Debounce delay in milliseconds |
| `showAdvanced` | `boolean` | false | Show advanced filter toggle |
| `savedSearches` | `SavedSearch[]` | [] | Array of saved searches |
| `onSaveSearch` | `(search: SavedSearch) => void` | Optional | Callback when search is saved |
| `onLoadSearch` | `(search: SavedSearch) => void` | Optional | Callback when saved search is loaded |

## Types

```typescript
interface VocabularyWord {
  id: string;
  spanish: string;
  english: string;
  category: string;
  partOfSpeech: "noun" | "verb" | "adjective" | "adverb" | "other";
  difficulty: "beginner" | "intermediate" | "advanced";
  createdAt: Date;
  examples?: string[];
}

interface SearchFilters {
  category?: string;
  partOfSpeech?: string;
  difficulty?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  timestamp: Date;
}
```

## Keyboard Navigation

- **ArrowDown**: Navigate to next result
- **ArrowUp**: Navigate to previous result
- **Enter**: Select highlighted result
- **Escape**: Close results panel

## Advanced Filtering

The component supports multiple filter criteria that can be combined:

1. **Category**: Filter by word category (food, travel, business, culture)
2. **Part of Speech**: Filter by grammatical type (noun, verb, adjective, adverb, other)
3. **Difficulty**: Filter by difficulty level (beginner, intermediate, advanced)
4. **Date Range**: Filter by creation date (future enhancement)

## Performance Features

### Debouncing
Reduces API calls by waiting for user to finish typing (configurable delay)

### Search Caching
Caches search results to avoid re-processing identical queries

### Request Cancellation
Automatically cancels in-flight requests when new search starts

### Memoization
Uses React.useMemo and React.useCallback to prevent unnecessary re-renders

## Accessibility

- Full ARIA support with proper roles and attributes
- Keyboard navigation support
- Screen reader friendly
- Focus management
- Semantic HTML

## Styling

The component uses Tailwind CSS classes and supports dark mode:

```typescript
// Light mode
className="bg-white dark:bg-gray-800"

// Dark mode support
className="text-gray-900 dark:text-gray-100"
```

## Examples

### Search by Spanish Word
```typescript
// User types "café" → finds "café (coffee)"
```

### Search by English Translation
```typescript
// User types "coffee" → finds "café (coffee)"
```

### Accent-Insensitive Search
```typescript
// User types "cafe" → finds "café (coffee)"
```

### Multiple Filters
```typescript
// Category: food
// Part of Speech: verb
// Query: "com"
// Results: "comer (to eat)"
```

## Test Coverage

The component has 70+ comprehensive tests covering:
- 15 Search Input tests
- 20 Search Functionality tests
- 15 Search Results tests
- 12 Advanced Search tests
- 8 Performance tests

See `/tests/components/Vocabulary/VocabularySearch.test.tsx` for details.

## Contributing

When adding features:
1. Add corresponding tests
2. Update type definitions
3. Maintain accessibility
4. Document new props
5. Follow existing patterns

## License

Part of the Describe It project.
