# Zustand Store Tests

Comprehensive test suite for all Zustand state management stores in the application.

## Overview

This directory contains 80+ tests covering all Zustand stores with 90%+ coverage. Each store has dedicated test files that validate state management, actions, persistence, and edge cases.

## Test Files

### Core Stores

1. **appStore.test.ts** (20 tests)
   - Initial state verification
   - Current image management
   - Sidebar state toggling
   - Active tab management
   - Fullscreen mode
   - User preferences updates
   - Search history with deduplication
   - Loading states
   - Error handling
   - Optimized selectors

2. **formStore.test.ts** (15 tests)
   - Form creation and destruction
   - Field value updates
   - Field validation (sync and async)
   - Form submission with validation
   - Submit state management
   - Form reset
   - History and undo/redo
   - Validation rules (minLength, maxLength, email, pattern)

3. **sessionStore.test.ts** (10 tests)
   - Session initialization
   - Anonymous session creation
   - Activity tracking
   - Search history with limits
   - Authentication state management
   - Session end and duration
   - Activity summary generation
   - Case-insensitive query tracking

4. **uiStore.test.ts** (15 tests)
   - Modal management (open, close, priority sorting)
   - Navigation state (sidebar, breadcrumbs, routes)
   - Theme management (dark/light/auto)
   - Color scheme and font size
   - Accessibility (reduce motion, high contrast)
   - Panel management (right, bottom)
   - Loading states (global and keyed)
   - Notification queue with auto-removal
   - Focus trap management
   - Keyboard shortcuts
   - Layout modes

### Advanced Stores

5. **apiKeysStore.test.ts** (10 tests)
   - API key CRUD operations
   - Key encryption/decryption
   - Key validation (OpenAI, Unsplash)
   - Active key management
   - Usage tracking and rate limits
   - Key rotation
   - Bulk operations (export, import, clear)
   - Error handling

6. **learningSessionStore.test.ts** (10 tests)
   - Session lifecycle (start, pause, resume, end)
   - Anonymous and authenticated sessions
   - Statistics tracking (images, descriptions, questions)
   - Points and progress calculation
   - Preferences and settings updates
   - Daily goal progress
   - UI state management
   - Session persistence and export
   - Data import with validation

### Debug and History Stores

7. **debugStore.test.ts** (8 tests)
   - Debug mode enable/disable
   - Store registration and monitoring
   - Action logging with size limits
   - Performance metrics tracking
   - State snapshots
   - Log search functionality
   - Export/import debug data
   - State diff calculation
   - Replay functionality

8. **undoRedoStore.test.ts** (8 tests)
   - Store registration with tracking strategies
   - History recording and limits
   - Undo/redo operations (global and per-store)
   - Branch management (create, switch, delete, merge)
   - Tracking strategies (full, selective, none)
   - Jump to specific history entry
   - Action grouping
   - State compression

## Running Tests

```bash
# Run all store tests
npm test tests/state/stores

# Run specific store tests
npm test tests/state/stores/appStore.test.ts

# Run with coverage
npm run test:coverage -- tests/state/stores

# Watch mode
npm test -- --watch tests/state/stores
```

## Test Patterns

### Basic Store Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from '@/lib/store/yourStore';

describe('YourStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useStore.setState(initialState);
  });

  describe('Feature Category', () => {
    it('should perform specific action', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.someAction();
      });

      expect(result.current.someValue).toBe(expectedValue);
    });
  });
});
```

### Async Operation Testing

```typescript
it('should handle async operations', async () => {
  const { result } = renderHook(() => useStore());

  await act(async () => {
    await result.current.asyncAction();
  });

  expect(result.current.isLoading).toBe(false);
  expect(result.current.data).toBeDefined();
});
```

### State Persistence Testing

```typescript
it('should persist state correctly', () => {
  const { result } = renderHook(() => useStore());

  act(() => {
    result.current.updateValue('test');
  });

  // Verify persisted state
  const persistedState = useStore.getState();
  expect(persistedState.value).toBe('test');
});
```

## Coverage Goals

- **Overall Coverage**: 90%+
- **Lines**: 90%+
- **Branches**: 85%+
- **Functions**: 90%+
- **Statements**: 90%+

## Test Categories

### ✓ State Management
- Initial state verification
- State updates and mutations
- State reset and clearing

### ✓ Actions
- Action dispatch
- Side effects
- Async actions
- Action composition

### ✓ Selectors
- Optimized selectors
- Derived state
- Memoization

### ✓ Persistence
- State hydration
- localStorage sync
- Session storage
- Cross-tab sync

### ✓ Error Handling
- Validation errors
- API errors
- Network failures
- Edge cases

### ✓ Performance
- Render optimization
- Memory management
- Large dataset handling
- Concurrent updates

## Dependencies

- **vitest**: Testing framework
- **@testing-library/react**: React testing utilities
- **@testing-library/react-hooks**: Hook testing utilities

## Best Practices

1. **Reset State**: Always reset store state in `beforeEach`
2. **Use act()**: Wrap state updates in `act()` for React
3. **Test Behavior**: Focus on behavior, not implementation
4. **Mock External**: Mock API calls, timers, and external services
5. **Descriptive Names**: Use clear, descriptive test names
6. **Group Tests**: Organize tests by feature/category
7. **Edge Cases**: Test boundary conditions and error scenarios
8. **Async Handling**: Use `async/await` with `act()` for async operations

## Continuous Integration

Tests run automatically on:
- Pre-commit hooks
- Pull request creation
- Main branch merge
- Nightly builds

## Troubleshooting

### Common Issues

**Issue**: Tests fail intermittently
- **Solution**: Ensure proper cleanup in `beforeEach` and `afterEach`

**Issue**: Async tests timeout
- **Solution**: Increase timeout or use `waitFor` from @testing-library/react

**Issue**: State not updating
- **Solution**: Verify `act()` wraps all state updates

**Issue**: Mock not working
- **Solution**: Clear mocks in `beforeEach` with `vi.clearAllMocks()`

## Contributing

When adding new tests:

1. Follow existing test structure
2. Add tests for new features
3. Maintain 90%+ coverage
4. Update this README if adding new test files
5. Ensure all tests pass before committing

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Zustand Testing Guide](https://github.com/pmndrs/zustand#testing)
