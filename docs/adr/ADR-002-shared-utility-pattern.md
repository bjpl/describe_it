# ADR-002: Shared Utility Pattern

## Date
2025-01-28

## Status
Accepted

## Context

During the modularization effort, we identified significant code duplication across components:

1. **Storage Operations**: Multiple components implemented their own logic for:
   - Loading vocabulary from localStorage
   - Saving vocabulary to localStorage
   - Merging vocabulary entries
   - Error handling for storage operations

2. **Vocabulary Operations**: Common patterns repeated across components:
   - Filtering vocabulary entries
   - Sorting entries by category or frequency
   - Validating vocabulary structure
   - Transforming data formats

This duplication led to:
- Inconsistent behavior across components
- Higher maintenance burden (changes needed in multiple places)
- Increased bug surface area
- Difficult refactoring and updates
- Inconsistent error handling

## Decision

We decided to extract shared functionality into dedicated utility modules:

1. **storage-helpers.ts** - Centralized storage operations:
   - `loadVocabularyFromStorage()` - Load with error handling
   - `saveVocabularyToStorage()` - Save with validation
   - `mergeVocabularyEntries()` - Consistent merge logic
   - Storage error handling and recovery

2. **vocabulary-helpers.ts** - Common vocabulary operations:
   - `filterByCategory()` - Category-based filtering
   - `sortByFrequency()` - Frequency-based sorting
   - `validateVocabularyEntry()` - Entry validation
   - `transformToDisplayFormat()` - Data transformation

These utilities follow functional programming principles, are pure functions where possible, and include comprehensive error handling.

## Consequences

### Positive
- **Reduced Duplication**: Eliminated ~200-300 lines of duplicate code
- **Consistent Behavior**: Storage and vocabulary operations behave identically across the application
- **Centralized Error Handling**: Single source of truth for error handling strategies
- **Easier Testing**: Utility functions can be tested in isolation with comprehensive unit tests
- **Simplified Updates**: Changes to storage or vocabulary logic only need to be made in one place
- **Better Type Safety**: TypeScript interfaces enforce consistent data structures
- **Improved Maintainability**: Clear separation between business logic and presentation

### Negative
- **Additional Abstraction Layer**: Developers need to understand utility modules
- **Potential Over-Engineering**: Risk of creating utilities for rarely-used functionality
- **Import Overhead**: Components need to import utilities explicitly

### Mitigation Strategies
- Comprehensive documentation for each utility function
- Clear naming conventions that describe function purpose
- Keep utilities focused and avoid "kitchen sink" modules
- Regular review to identify utilities that should be inlined
- Unit tests serve as usage documentation
- Follow the "rule of three" - extract to utility after third duplication
