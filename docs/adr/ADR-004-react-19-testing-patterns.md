# ADR-004: React 19 Testing Patterns

## Date
2025-01-28

## Status
Accepted

## Context

After upgrading to React 19, we encountered systematic test failures due to breaking changes in async behavior and strict mode:

1. **Async Pattern Changes**:
   - React 19 introduced stricter async rendering
   - `act()` warnings appeared in previously passing tests
   - State updates no longer synchronous in tests
   - Hook results became undefined in certain conditions

2. **Strict Mode Issues**:
   - Double invocation of effects in development
   - Cleanup functions required for all effects
   - State initialization timing changed
   - Memory leaks in test environments

3. **Testing Library Updates**:
   - `@testing-library/react-hooks` deprecated
   - New patterns required for React 19 compatibility
   - Breaking changes in `renderHook` API
   - Different async handling requirements

4. **Specific Failures**:
   - `result.current` occasionally undefined
   - State updates not reflected in tests
   - Async expectations timing out
   - Cleanup not executing properly

## Decision

We adopted new testing patterns specifically designed for React 19 compatibility:

### 1. Use waitFor() for All Async Expectations
```typescript
// ❌ Old Pattern (React 18)
const { result } = renderHook(() => useVocabulary());
expect(result.current.vocabulary).toHaveLength(5);

// ✅ New Pattern (React 19)
const { result } = renderHook(() => useVocabulary());
await waitFor(() => {
  expect(result.current?.vocabulary).toHaveLength(5);
});
```

### 2. Optional Chaining for result.current
```typescript
// ❌ Old Pattern
expect(result.current.loading).toBe(false);

// ✅ New Pattern
expect(result.current?.loading).toBe(false);
```

### 3. Proper act() Wrapping for State Updates
```typescript
// ✅ Correct Pattern
await act(async () => {
  result.current?.addVocabulary(newEntry);
});

await waitFor(() => {
  expect(result.current?.vocabulary).toContain(newEntry);
});
```

### 4. Cleanup in beforeEach/afterEach
```typescript
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup();
});
```

## Consequences

### Positive
- **React 19 Compatibility**: All tests pass with React 19
- **More Robust Tests**: Better handling of async state updates
- **Future-Proof**: Aligned with React's async rendering model
- **Fewer Flaky Tests**: Explicit waits reduce race conditions
- **Better Error Messages**: Optional chaining prevents undefined errors
- **Strict Mode Compatible**: Tests work in both development and production modes

### Negative
- **Verbose Test Code**: More boilerplate with waitFor() and optional chaining
- **Slower Test Execution**: Async waits add time to test runs
- **Learning Curve**: Developers need to understand new patterns
- **Migration Effort**: Required updating all existing tests

### Performance Impact
- Test suite execution time increased by ~15-20%
- Trade-off accepted for reliability and React 19 compatibility
- Mitigated by running tests in parallel where possible

### Breaking Changes Addressed
1. **renderHook from @testing-library/react**:
   - Migrated from `@testing-library/react-hooks` (deprecated)
   - New import: `import { renderHook } from '@testing-library/react'`

2. **Async State Updates**:
   - All state expectations now wrapped in `waitFor()`
   - Ensures React has completed all pending updates

3. **Optional Chaining**:
   - `result.current?.property` prevents undefined access
   - Handles timing where current is temporarily undefined

4. **Cleanup Patterns**:
   - Explicit cleanup in afterEach
   - Prevents state leakage between tests

### Migration Guide
```typescript
// Before (React 18)
import { renderHook } from '@testing-library/react-hooks';

test('old pattern', () => {
  const { result } = renderHook(() => useMyHook());
  expect(result.current.value).toBe(expected);
});

// After (React 19)
import { renderHook, waitFor } from '@testing-library/react';

test('new pattern', async () => {
  const { result } = renderHook(() => useMyHook());
  await waitFor(() => {
    expect(result.current?.value).toBe(expected);
  });
});
```

### Testing Standards
All tests must now:
1. Import `waitFor` from `@testing-library/react`
2. Use `await waitFor()` for all async expectations
3. Use optional chaining for `result.current` access
4. Properly wrap state updates in `act()`
5. Include cleanup in afterEach hooks

### Tooling Updates
- ESLint rules added to enforce new patterns
- Test templates updated for new developers
- CI/CD configured to fail on act() warnings
- Documentation updated with React 19 examples
