# TanStack Query (React Query) Tests

Comprehensive test suite for TanStack Query data fetching and caching strategies.

## Test Coverage: 70+ Tests

### Test Files

1. **use-optimized-query.test.tsx** (35 tests)
   - Basic query functionality
   - Query key management
   - Retry logic
   - Loading states
   - Mutation operations
   - Error handling

2. **use-vocabulary-query.test.tsx** (25 tests)
   - Data fetching
   - Filtering (search, category, difficulty, part of speech)
   - Statistics calculation
   - CRUD operations (add, update, remove, bulk operations)
   - Utility functions
   - Export functionality

3. **use-descriptions-query.test.tsx** (20 tests)
   - Description generation
   - Retry logic
   - Regenerate descriptions
   - Delete operations
   - Clear functionality
   - Error handling (network, timeout, validation)
   - Cleanup

4. **cache-management.test.tsx** (15 tests)
   - Basic caching
   - Cache invalidation
   - Manual cache updates
   - Prefetching
   - Cache hydration
   - Stale-while-revalidate
   - Cache persistence
   - Remove queries
   - Get cached data

5. **use-progress-query.test.tsx** (15 tests)
   - Progress stats loading
   - Streak tracking
   - Learning analytics
   - Progress summary
   - Progress updates

## Running Tests

```bash
# Run all query tests
npm test tests/state/queries

# Run specific test file
npm test tests/state/queries/use-optimized-query.test.tsx

# Run with coverage
npm test -- --coverage tests/state/queries

# Watch mode
npm test -- --watch tests/state/queries
```

## Test Patterns

### Basic Query Test
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

it('should fetch data', async () => {
  const { result } = renderHook(
    () => useOptimizedQuery(['key'], queryFn),
    { wrapper: createWrapper() }
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeDefined();
});
```

### Mutation Test
```typescript
it('should execute mutation', async () => {
  const { result } = renderHook(
    () => useOptimizedMutation(mutationFn),
    { wrapper: createWrapper() }
  );

  result.current.mutate({ data: 'test' });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeDefined();
});
```

### Cache Invalidation Test
```typescript
it('should invalidate queries', async () => {
  const { result } = renderHook(
    () => {
      const query = useOptimizedQuery(['key'], queryFn);
      const client = useQueryClient();
      return { query, client };
    },
    { wrapper: createWrapper() }
  );

  await act(async () => {
    await result.current.client.invalidateQueries({ queryKey: ['key'] });
  });

  expect(queryFn).toHaveBeenCalledTimes(2);
});
```

## Coverage Requirements

- Statements: >90%
- Branches: >85%
- Functions: >90%
- Lines: >90%

## Key Features Tested

### Query Hooks
- [x] useQuery basic usage
- [x] Query key management
- [x] Stale time configuration
- [x] Cache time settings
- [x] Refetch on window focus
- [x] Retry logic
- [x] Error handling
- [x] Loading states
- [x] Success states

### Mutation Hooks
- [x] useMutation basic usage
- [x] Optimistic updates
- [x] Rollback on error
- [x] Cache invalidation
- [x] onSuccess callbacks
- [x] onError callbacks
- [x] Multiple mutations

### Cache Management
- [x] Query cache updates
- [x] Manual cache invalidation
- [x] Cache persistence
- [x] Cache prefetching
- [x] Cache hydration
- [x] Stale-while-revalidate
- [x] Remove queries
- [x] Get cached data

### Error Handling
- [x] Network errors
- [x] Timeout errors
- [x] Validation errors
- [x] Retry with backoff
- [x] Error recovery

## Test Utilities

All test files use:
- `@testing-library/react` for hook rendering
- `vitest` for test framework
- `@tanstack/react-query` v5.90.2
- Custom `createWrapper` helper for QueryClientProvider

## Notes

- All tests use `retry: false` for faster execution
- Mock fetch is used for API calls
- Tests clean up after themselves
- Coverage includes edge cases and error scenarios
