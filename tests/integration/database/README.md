# Supabase Database Integration Tests

Comprehensive test suite for Supabase database integration with 90%+ coverage.

## Test Organization

### Test Files (155 Total Tests)

1. **supabase-client.test.ts** (20 tests)
   - Environment variable configuration
   - Client initialization
   - Server vs client-side clients
   - Connection pooling
   - Error handling for missing credentials

2. **crud-operations.test.ts** (40 tests)
   - SELECT queries (all, filtered, paginated)
   - INSERT operations (single, batch)
   - UPDATE operations (single, batch)
   - DELETE operations (single, batch)
   - UPSERT operations
   - Transaction-like operations

3. **realtime-subscriptions.test.ts** (25 tests)
   - Subscribe to table changes
   - INSERT event handling
   - UPDATE event handling
   - DELETE event handling
   - Unsubscribe functionality
   - Multiple concurrent subscriptions
   - Error handling
   - Rate limiting

4. **auth-integration.test.ts** (20 tests)
   - User signup via database
   - User login via database
   - Session management
   - User profile queries
   - Password management
   - Server-side authentication

5. **rls-policies.test.ts** (15 tests)
   - Authenticated user access
   - Anonymous user restrictions
   - Owner-only access policies
   - Policy enforcement

6. **database-functions.test.ts** (15 tests)
   - Custom PostgreSQL functions
   - Stored procedures
   - Triggers
   - Return value handling

7. **error-handling.test.ts** (20 tests)
   - Network errors
   - Query errors
   - Constraint violations
   - Timeout handling
   - Retry logic

## Running Tests

### Run All Database Tests
```bash
npm test tests/integration/database
```

### Run Specific Test File
```bash
npm test tests/integration/database/supabase-client.test.ts
npm test tests/integration/database/crud-operations.test.ts
npm test tests/integration/database/realtime-subscriptions.test.ts
npm test tests/integration/database/auth-integration.test.ts
npm test tests/integration/database/rls-policies.test.ts
npm test tests/integration/database/database-functions.test.ts
npm test tests/integration/database/error-handling.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage tests/integration/database
```

### Run in Watch Mode
```bash
npm test -- --watch tests/integration/database
```

## Environment Setup

Ensure the following environment variables are set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Test Database Requirements

### Required Tables
- `users` - User profiles
- `descriptions` - User-generated descriptions
- `images` - Image records
- `phrases` - Vocabulary phrases
- `questions` - Quiz questions
- `answers` - Quiz answers
- `sessions` - User sessions
- `learning_progress` - Learning statistics
- `vocabulary_lists` - Vocabulary collections
- `vocabulary_items` - Individual vocabulary entries

### Required Functions (Optional)
- `get_user_progress_summary` - Aggregate user progress
- `calculate_daily_progress` - Calculate daily statistics

### Row Level Security (RLS)
Tests assume RLS policies are enabled:
- Users can only read/write their own data
- Anonymous users have restricted access
- Authenticated users have appropriate permissions

## Test Coverage

### Coverage Goals
- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >90%
- **Lines**: >90%

### Coverage Areas

#### Client Configuration (20 tests)
- Environment validation
- Client initialization
- Server/client separation
- Connection pooling
- Error handling

#### CRUD Operations (40 tests)
- All query types (select, insert, update, delete, upsert)
- Filtering and pagination
- Batch operations
- Transaction semantics
- Error cases

#### Real-time Features (25 tests)
- Subscription lifecycle
- Event handling (INSERT, UPDATE, DELETE)
- Concurrent subscriptions
- Filtering and rate limiting
- Error recovery

#### Authentication (20 tests)
- Signup/login flows
- Session management
- Password operations
- Profile queries
- Server-side auth

#### Security (15 tests)
- RLS policy enforcement
- Owner-only access
- Anonymous restrictions
- Authorization checks

#### Database Functions (15 tests)
- Custom functions
- Stored procedures
- Triggers
- Return type handling

#### Error Handling (20 tests)
- Network failures
- Query errors
- Constraint violations
- Timeouts
- Retry logic

## Test Patterns

### Test Structure
```typescript
describe('Feature', () => {
  let testData: any;

  beforeAll(async () => {
    // Setup test data
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should test specific behavior', async () => {
    // Arrange
    const input = {...};

    // Act
    const result = await operation(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Cleanup Strategy
- Use `afterEach` for per-test cleanup
- Use `afterAll` for suite cleanup
- Track created IDs for deletion
- Sign out after auth tests

### Async Handling
```typescript
it('should handle async operations', async () => {
  const result = await asyncOperation();
  expect(result).toBeDefined();
});
```

### Error Testing
```typescript
it('should handle errors', async () => {
  await expect(
    operation(invalidInput)
  ).rejects.toThrow();
});
```

## Common Issues

### Environment Variables Not Found
**Solution**: Ensure `.env.local` is properly configured and loaded.

### RLS Policy Errors
**Solution**: Verify RLS policies are correctly set up in Supabase dashboard.

### Timeout Errors
**Solution**: Increase test timeout for slow operations:
```typescript
it('should complete slow operation', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Real-time Connection Issues
**Solution**: Ensure Supabase project has real-time enabled and check network connectivity.

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Mocking**: Mock external dependencies when appropriate
4. **Timeouts**: Set appropriate timeouts for async operations
5. **Assertions**: Use specific, meaningful assertions
6. **Error Testing**: Test both success and failure cases
7. **Documentation**: Comment complex test scenarios

## Debugging

### Enable Detailed Logging
```typescript
import { dbLogger } from '@/lib/logger';

// Logs are automatically enabled in test environment
```

### View Real-time Events
```typescript
const channel = supabase
  .channel('debug')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'descriptions' },
    (payload) => console.log('Change:', payload))
  .subscribe();
```

### Check Database State
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*');

console.log('Current state:', data);
```

## Performance Optimization

### Use Batching
```typescript
// Good: Batch operations
const results = await supabase
  .from('table')
  .insert(multipleRecords);

// Bad: Individual operations
for (const record of records) {
  await supabase.from('table').insert(record);
}
```

### Limit Query Results
```typescript
const { data } = await supabase
  .from('table')
  .select('*')
  .limit(100); // Always limit in tests
```

### Use Indexes
Ensure proper indexes exist for frequently queried columns.

## Continuous Integration

### GitHub Actions Example
```yaml
name: Database Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run database tests
        run: npm test tests/integration/database
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## Contributing

When adding new tests:
1. Follow existing patterns
2. Include both success and failure cases
3. Clean up test data
4. Update this README
5. Ensure coverage remains >90%

## License

MIT
