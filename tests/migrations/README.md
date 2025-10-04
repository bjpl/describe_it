# Database Migration Tests

Comprehensive test suite for database schema migrations, ensuring safety, correctness, and performance.

## Test Structure

### 1. Migration Execution Tests (`001_schema_migration.test.ts`)
Tests the successful execution of database migrations with the following coverage:

#### Core Features
- **Migration Execution**: Verifies migrations run without errors
- **Idempotency**: Ensures migrations can be run multiple times safely
- **Enum Types**: Validates all enum types are created correctly
- **Table Structure**: Confirms all tables have required columns
- **Indexes**: Verifies performance indexes are created
- **RLS Policies**: Tests Row Level Security is enabled
- **Functions & Triggers**: Validates stored procedures and triggers
- **Constraints**: Tests uniqueness, foreign keys, and check constraints
- **Data Integrity**: Ensures cascade deletes and nullify behavior
- **Performance**: Measures migration execution time
- **Type Safety**: Validates data type enforcement

#### Test Coverage
- 15+ test suites
- 40+ individual tests
- Coverage includes all tables, enums, functions, triggers, and policies

### 2. Migration Rollback Tests (`migration_rollback.test.ts`)
Tests the ability to safely rollback migrations:

#### Features Tested
- **Snapshot Creation**: Capture schema state before/after migration
- **Table Rollback**: Drop tables cleanly
- **Index Removal**: Remove all indexes
- **Function Cleanup**: Drop stored functions
- **Data Preservation**: Ensure existing data remains intact
- **Idempotent Rollback**: Multiple rollbacks don't fail
- **Partial Rollback**: Handle incomplete rollbacks gracefully
- **Full Cycle**: Migration → Rollback → Re-migration
- **Error Handling**: Gracefully handle non-existent objects

#### Test Coverage
- 8 test suites
- 20+ individual tests
- Complete rollback script validation

### 3. Schema Validation Tests (`schema_validation.test.ts`)
Validates schema integrity and business rules:

#### Validation Areas
- **Schema Completeness**: All required tables, enums, and indexes exist
- **Data Types**: UUID, JSONB, timestamps, integers validated
- **Constraints**: Email format, uniqueness, foreign keys, check constraints
- **Default Values**: Proper defaults applied
- **Cascade Behavior**: Delete cascades and SET NULL behavior
- **Index Performance**: Query performance with indexes
- **Data Integrity**: Referential integrity maintained
- **Concurrent Operations**: Safe under concurrent access
- **Error Recovery**: Transaction rollback on errors

#### Test Coverage
- 12 test suites
- 35+ individual tests
- Full constraint and integrity validation

### 4. Service Integration Tests (`service_integration.test.ts`)
Tests services interacting with the migrated schema:

#### Services Tested
- **User Service**: Create, update, retrieve user profiles
- **Session Service**: Create, complete, query learning sessions
- **Analytics Service**: Track events, query by time, aggregate summaries
- **System Alerts**: Create, resolve, filter alerts
- **Cross-Service**: Multi-table operations and relationships
- **Performance**: Bulk operations and query efficiency
- **Error Handling**: Graceful error handling

#### Test Coverage
- 8 test suites
- 25+ individual tests
- Full CRUD and relationship testing

## Test Utilities (`test-helpers.ts`)

Comprehensive helper functions for database testing:

### Database Operations
- `createTestDatabaseClient()` - Create Supabase test client
- `executeMigration()` - Run SQL migration files
- `captureSchemaSnapshot()` - Capture database schema state
- `cleanupTestDatabase()` - Clean up test data

### Validation Helpers
- `verifyTableExists()` - Check table existence and structure
- `verifyEnumExists()` - Validate enum types
- `verifyRLSEnabled()` - Check Row Level Security
- `verifyIndexExists()` - Confirm index creation
- `verifyFunctionExists()` - Validate stored functions
- `verifyTriggerExists()` - Check triggers

### Data Operations
- `insertTestData()` - Insert test records
- `queryTestData()` - Query test records
- `retryOperation()` - Retry with exponential backoff
- `waitFor()` - Async wait utility

### Mock Utilities
- `createMockSupabaseClient()` - Mock client for unit tests

## Running Tests

### Run All Migration Tests
```bash
npm run test tests/migrations/
```

### Run Specific Test Suite
```bash
# Migration execution
npm run test tests/migrations/001_schema_migration.test.ts

# Rollback tests
npm run test tests/migrations/migration_rollback.test.ts

# Schema validation
npm run test tests/migrations/schema_validation.test.ts

# Service integration
npm run test tests/migrations/service_integration.test.ts
```

### Run with Coverage
```bash
npm run test:coverage -- tests/migrations/
```

### Watch Mode
```bash
npm run test:watch tests/migrations/
```

## Test Environment Setup

### Prerequisites
1. Supabase instance (local or cloud)
2. Environment variables configured:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

### Database Setup
Tests expect migrations to be run against a clean database or will run them as part of the test suite.

### Cleanup
Tests clean up after themselves, but you can manually reset:
```bash
# Drop all test tables
npx supabase db reset
```

## Test Patterns

### Arrange-Act-Assert
All tests follow the AAA pattern:
```typescript
it('should create user with defaults', async () => {
  // Arrange
  const userData = { email: 'test@example.com' }

  // Act
  const { data, error } = await client
    .from('users')
    .insert(userData)

  // Assert
  expect(error).toBeNull()
  expect(data.spanish_level).toBe('beginner')
})
```

### Async/Await
All database operations use async/await:
```typescript
const { data } = await client.from('users').select()
```

### Error Handling
Explicit error checking:
```typescript
const { error } = await operation()
expect(error).toBeTruthy()
expect(error?.code).toBe('23505') // Unique violation
```

## Coverage Goals

- **Statements**: >85%
- **Branches**: >80%
- **Functions**: >85%
- **Lines**: >85%

## Performance Benchmarks

### Migration Execution
- Initial schema: <10 seconds
- Analytics tables: <5 seconds
- Total: <15 seconds

### Query Performance
- Indexed queries: <100ms
- Bulk inserts (100 records): <5 seconds
- Bulk inserts (1000 records): <10 seconds

## Best Practices

1. **Isolation**: Each test is independent
2. **Cleanup**: Tests clean up their data
3. **Deterministic**: Same results every run
4. **Fast**: Most tests complete in <1 second
5. **Descriptive**: Clear test names and assertions
6. **Comprehensive**: Cover happy paths and edge cases

## Troubleshooting

### Tests Timing Out
- Increase timeout in vitest.config.ts
- Check database connection
- Verify migrations are applied

### Connection Errors
- Verify Supabase URL and key
- Check network connectivity
- Ensure database is accessible

### Data Persistence Issues
- Check RLS policies
- Verify service role key has permissions
- Review cascade delete settings

## Integration with CI/CD

Tests are designed to run in CI environments:

```yaml
- name: Run Migration Tests
  run: |
    npm run test tests/migrations/
    npm run test:coverage -- tests/migrations/
```

## Further Documentation

- [Supabase Migrations](https://supabase.com/docs/guides/database/migrations)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](../../docs/testing/best-practices.md)
