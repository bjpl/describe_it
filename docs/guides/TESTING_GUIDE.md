# Testing Guide - Database-Integrated Application

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
```

## Test Organization

```
tests/
├── database/                      # Database layer tests
│   ├── database-service.test.ts  # Core database operations
│   ├── supabase-connection.test.ts  # Connection & RLS
│   └── data-integrity.test.ts    # Constraints & validation
│
├── integration/                   # End-to-end flow tests
│   ├── auth-flow.test.ts         # Signup → Login → Profile
│   ├── vocabulary-flow.test.ts   # Create → Add → Edit → Delete
│   ├── learning-flow.test.ts     # Search → Generate → Save → Review
│   └── progress-flow.test.ts     # Track → Dashboard → Export
│
└── api/                          # API endpoint tests
    ├── auth/
    │   └── signup.test.ts        # Updated with DB verification
    ├── vocabulary/
    │   └── save.test.ts          # Updated for DB storage
    └── descriptions/
        └── generate.test.ts      # Updated with save verification
```

## Writing Tests

### Database Service Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseService } from '@/lib/services/database';

describe('Feature Tests', () => {
  let dbService: DatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    dbService = new DatabaseService({
      supabaseUrl: 'https://test.supabase.co',
      anonKey: 'test-key',
      enableLogging: false,
    });
  });

  it('should test feature', async () => {
    // Arrange: Mock Supabase responses
    (mockSupabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: { id: '123' },
        error: null,
      }),
    });

    // Act: Execute database operation
    const result = await dbService.getUser('123');

    // Assert: Verify results
    expect(result.success).toBe(true);
    expect(result.data?.id).toBe('123');
  });
});
```

### Integration Flow Tests

```typescript
describe('User Flow', () => {
  it('should complete full user journey', async () => {
    // Step 1: Initial action
    const step1Result = await dbService.createUser({...});
    expect(step1Result.success).toBe(true);

    // Step 2: Follow-up action
    const step2Result = await dbService.createSession({
      user_id: step1Result.data!.id,
      ...
    });
    expect(step2Result.success).toBe(true);

    // Step 3: Cleanup
    await dbService.endSession(step2Result.data!.id, {...});
  });
});
```

## Mocking Patterns

### Mock Supabase Client

```typescript
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
  },
} as unknown as SupabaseClient;

vi.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabase,
}));
```

### Mock Database Responses

```typescript
// Success response
(mockSupabase.from as any).mockReturnValue({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({
    data: { id: '123', name: 'Test' },
    error: null,
  }),
});

// Error response
(mockSupabase.from as any).mockReturnValue({
  select: vi.fn().mockResolvedValue({
    data: null,
    error: {
      code: '23505',
      message: 'duplicate key violation',
    },
  }),
});

// Chained queries
(mockSupabase.from as any).mockReturnValue({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue({
    data: [...],
    error: null,
  }),
});
```

## Common Test Scenarios

### 1. CRUD Operations

```typescript
// Create
const created = await dbService.createUser({...});
expect(created.success).toBe(true);

// Read
const retrieved = await dbService.getUser(userId);
expect(retrieved.data).toBeDefined();

// Update
const updated = await dbService.updateUser(userId, {...});
expect(updated.data?.field).toBe(newValue);

// Delete
const deleted = await dbService.deleteUser(userId);
expect(deleted.success).toBe(true);
```

### 2. Error Handling

```typescript
// Validation errors
(mockSupabase.from as any).mockReturnValue({
  insert: vi.fn().mockResolvedValue({
    data: null,
    error: { code: '23514', message: 'check constraint' },
  }),
});

const result = await dbService.createUser({ email: 'invalid' });
expect(result.success).toBe(false);
expect(result.error?.code).toBe('23514');

// Network errors
(mockSupabase.from as any).mockReturnValue({
  select: vi.fn().mockRejectedValue(new Error('NetworkError')),
});

await expect(dbService.getUser('123')).rejects.toThrow('NetworkError');
```

### 3. Caching

```typescript
const selectSpy = vi.fn().mockReturnThis();
(mockSupabase.from as any).mockReturnValue({
  select: selectSpy,
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: {}, error: null }),
});

// First call - hits database
await dbService.getUser('123');
expect(selectSpy).toHaveBeenCalledTimes(1);

// Second call - uses cache
await dbService.getUser('123');
expect(selectSpy).toHaveBeenCalledTimes(1); // Not called again
```

### 4. Concurrent Operations

```typescript
const updates = Array.from({ length: 10 }, (_, i) =>
  dbService.updateUser(`user-${i}`, { theme: 'dark' })
);

const results = await Promise.all(updates);
expect(results.every(r => r.success)).toBe(true);
```

## Test Best Practices

### 1. Test Isolation

- Always use `beforeEach` to reset mocks
- Clear cache between tests
- Don't rely on test execution order

### 2. Descriptive Names

- Use "should" statements: `it('should create user with defaults')`
- Group related tests in `describe` blocks
- Be specific about what's being tested

### 3. Arrange-Act-Assert

```typescript
it('should update mastery level', async () => {
  // Arrange
  const userId = 'user-123';
  const itemId = 'item-123';
  mockDatabaseResponse({...});

  // Act
  const result = await dbService.updateLearningProgress(
    userId, itemId, { mastery_level: 75 }
  );

  // Assert
  expect(result.success).toBe(true);
  expect(result.data?.mastery_level).toBe(75);
});
```

### 4. Test Edge Cases

- Empty arrays
- Null values
- Boundary values (0, 100, max lengths)
- Invalid inputs
- Network failures
- Concurrent operations

### 5. Avoid Test Interdependence

```typescript
// ❌ Bad: Tests depend on each other
it('should create user', () => {
  testUser = await createUser(); // Global state
});

it('should update user', () => {
  await updateUser(testUser.id); // Depends on previous test
});

// ✅ Good: Each test is independent
it('should update user', () => {
  const userId = 'test-user-123';
  mockUser(userId);
  const result = await updateUser(userId);
  expect(result.success).toBe(true);
});
```

## Coverage Goals

- **Overall**: 80%+ code coverage
- **Database Service**: 95%+ coverage
- **Critical Paths**: 100% coverage (auth, payment, data integrity)
- **Error Paths**: 90%+ coverage

## Running Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View in browser
open coverage/index.html

# Coverage thresholds (vitest.config.ts)
{
  coverage: {
    lines: 80,
    functions: 80,
    branches: 75,
    statements: 80,
  }
}
```

## Continuous Integration

Tests run automatically on:

- Every commit (pre-commit hook)
- Pull requests
- Merges to main branch

CI configuration ensures:

- All tests pass
- Coverage thresholds met
- No TypeScript errors
- Linting passes

## Debugging Tests

### View Test Output

```bash
# Verbose mode
npm test -- --reporter=verbose

# Debug specific test
npm test -- --grep="should create user"

# Run in debug mode
node --inspect-brk ./node_modules/vitest/vitest.mjs
```

### Common Issues

1. **Mock not working**: Ensure mock is defined before import
2. **Async issues**: Use `await` and proper async/await syntax
3. **Cache issues**: Call `clearCache()` in `beforeEach`
4. **Type errors**: Use proper TypeScript types for mocks

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-testing-mistakes)
- [Database Testing Patterns](https://www.prisma.io/docs/guides/testing)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
