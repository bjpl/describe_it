# Integration Tests

This directory contains integration tests for the describe-it application, organized by test type.

## Directory Structure

```
tests/integration/
├── api/                          # API endpoint integration tests
│   ├── health.integration.test.ts       # Health check endpoint tests
│   ├── auth.integration.test.ts         # Authentication flow tests
│   └── ...
├── database/                     # Database integration tests
│   ├── vocabulary.integration.test.ts   # Vocabulary CRUD operations
│   └── ...
└── README.md                     # This file
```

## Shared Test Utilities

All integration tests use shared utilities from `tests/shared/`:

- **Builders**: Fluent test data builders (UserBuilder, VocabularyBuilder)
- **Helpers**: Request builder, database helper utilities
- **Fixtures**: Reusable test data and cleanup utilities
- **Mocks**: Mock factories for Supabase and Claude API

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npm run test:integration tests/integration/api/health.integration.test.ts

# Run with coverage
npm run test:integration -- --coverage

# Run in watch mode
npm run test:integration -- --watch

# Run with UI
npm run test:integration -- --ui
```

## Writing Integration Tests

### Example: API Integration Test

```typescript
import { describe, it, expect } from 'vitest';
import { request } from '../../shared/helpers/request-builder';

describe('API Integration Test', () => {
  const api = request('http://localhost:3000');

  it('should return successful response', async () => {
    const response = await api.get('/api/health');

    await response.expectSuccess();
    await response.expectJson();

    const data = await response.getData();
    expect(data).toHaveProperty('status');
  });
});
```

### Example: Database Integration Test

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { buildUser, buildVocabulary } from '../../shared';
import { createDatabaseHelper, createCleanupManager } from '../../shared';

describe('Database Integration Test', () => {
  let client: any;
  let dbHelper: any;
  let cleanup: any;

  beforeEach(() => {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    dbHelper = createDatabaseHelper(client);
    cleanup = createCleanupManager(client);
  });

  afterEach(async () => {
    await cleanup.cleanup();
  });

  it('should create and retrieve data', async () => {
    const user = await buildUser()
      .withEmail('test@example.com')
      .create(client);

    cleanup.track('users', user.id);

    expect(user).toHaveProperty('id');
    expect(user.email).toBe('test@example.com');
  });
});
```

## Test Patterns

### 1. Arrange-Act-Assert (AAA)

```typescript
it('should create vocabulary item', async () => {
  // Arrange
  const user = await buildUser().create(client);

  // Act
  const vocab = await buildVocabulary()
    .withWord('casa')
    .forUser(user.id)
    .create(client);

  // Assert
  expect(vocab.word).toBe('casa');
});
```

### 2. Given-When-Then (BDD)

```typescript
describe('Vocabulary Creation', () => {
  it('should create item when given valid data', async () => {
    // Given valid user and vocabulary data
    const user = await buildUser().create(client);
    const vocabData = buildVocabulary().withWord('perro').build();

    // When creating vocabulary
    const vocab = await dbHelper.insert('vocabulary', vocabData);

    // Then vocabulary should be created
    expect(vocab).toBeTruthy();
    expect(vocab.word).toBe('perro');
  });
});
```

### 3. Test Data Builders

```typescript
// Use fluent builders for readable test data creation
const user = await buildUser()
  .withEmail('advanced@test.com')
  .advanced()
  .authenticated()
  .create(client);

const vocab = await buildVocabulary()
  .withWord('perspicaz')
  .withTranslation('perceptive')
  .advanced()
  .spanish()
  .asAdjective()
  .forUser(user.id)
  .create(client);
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data in `afterEach` hooks
3. **Environment Checks**: Skip database tests if not in appropriate environment
4. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
5. **Single Assertion Focus**: Each test should focus on one specific behavior
6. **Use Builders**: Use test data builders for consistency and readability
7. **Error Testing**: Test both success and error scenarios
8. **Performance**: Include performance tests for critical operations

## Environment Variables

Integration tests require the following environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional (for specific tests)
ANTHROPIC_API_KEY=your-anthropic-key
```

## Continuous Integration

Integration tests are automatically run in CI/CD pipeline:

- On pull requests to main/develop branches
- On commits to main/develop branches
- Nightly for comprehensive testing

## Troubleshooting

### Tests Timing Out

```typescript
// Increase timeout for slow operations
it('should handle large dataset', async () => {
  // ...
}, 30000); // 30 second timeout
```

### Database Connection Issues

```typescript
// Check environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
  return;
}
```

### Flaky Tests

- Use `retry` option in vitest.config.ts
- Add appropriate delays for async operations
- Ensure proper cleanup between tests

## References

- [Integration Test Architecture](../../docs/testing/integration-test-architecture.md)
- [Vitest Documentation](https://vitest.dev/)
- [Supabase Client Documentation](https://supabase.com/docs/reference/javascript)
