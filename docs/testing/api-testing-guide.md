# API Testing Guide

## Overview

This guide documents the comprehensive API testing approach for the Describe It application. We aim for 80%+ test coverage across all API routes with a focus on reliability, security, and performance.

## Test Structure

### Directory Organization

```
tests/api/
├── auth/                    # Authentication endpoints
│   ├── signin.test.ts
│   └── signup.test.ts
├── descriptions/            # Description generation
│   └── generate.test.ts
├── images/                  # Image search
│   └── search.test.ts
├── questions/               # Q&A generation
│   └── generate.test.ts
├── phrases/                 # Phrase extraction
│   └── extract.test.ts
├── export/                  # Data export
│   └── generate.test.ts
├── vocabulary/              # Vocabulary management
│   └── save.test.ts
├── monitoring/              # Health & monitoring
│   └── health.test.ts
├── test-utils.ts           # Base test utilities
└── api-test-helpers.ts     # API-specific helpers
```

## Test Categories

### 1. Authentication Tests (`/api/auth/*`)

**Coverage Areas:**
- User sign-in/sign-up flows
- Token generation and validation
- Session management
- Password validation
- Rate limiting
- Security headers

**Key Tests:**
```typescript
describe('/api/auth/signin', () => {
  it('should sign in user with valid credentials')
  it('should reject invalid credentials')
  it('should handle rate limiting')
  it('should validate security headers')
  it('should sanitize error messages')
})
```

**Security Focus:**
- No user enumeration via error messages
- Proper password hashing
- JWT token security
- CSRF protection
- Rate limiting per IP

### 2. Description Generation Tests (`/api/descriptions/*`)

**Coverage Areas:**
- Multi-language description generation
- Parallel processing (2 languages simultaneously)
- Image URL validation and proxying
- Custom prompt handling
- Style parameter validation
- Fallback mechanisms

**Key Tests:**
```typescript
describe('/api/descriptions/generate', () => {
  it('should generate descriptions in multiple languages')
  it('should handle base64 images')
  it('should proxy external URLs')
  it('should validate image size limits')
  it('should provide fallback descriptions on error')
})
```

**Performance Requirements:**
- Complete generation in < 15 seconds (parallel)
- Handle images up to 20MB
- Graceful degradation on API failures

### 3. Image Search Tests (`/api/images/*`)

**Coverage Areas:**
- Unsplash API integration
- Query validation
- Pagination
- Filtering (orientation, color, order)
- Caching strategy
- ETag support
- CORS handling
- Demo mode fallback

**Key Tests:**
```typescript
describe('/api/images/search', () => {
  it('should search images with valid query')
  it('should cache search results')
  it('should return 304 for matching ETags')
  it('should handle CORS preflight')
  it('should provide demo fallback on timeout')
})
```

**Cache Strategy:**
- 5-minute cache duration
- ETag-based validation
- Stale-while-revalidate
- Maximum 100 cache entries

### 4. Q&A Generation Tests (`/api/qa/*`)

**Coverage Areas:**
- Question generation from descriptions
- Difficulty level handling
- Answer validation
- Fallback questions

**Key Tests:**
```typescript
describe('/api/qa/generate', () => {
  it('should generate questions from description')
  it('should handle different difficulty levels')
  it('should provide fallback questions')
})
```

### 5. Export Tests (`/api/export/*`)

**Coverage Areas:**
- PDF generation
- JSON export
- CSV export
- Large dataset handling

**Key Tests:**
```typescript
describe('/api/export/generate', () => {
  it('should export as PDF')
  it('should export as JSON')
  it('should handle large datasets')
})
```

## Testing Utilities

### Base Utilities (`test-utils.ts`)

```typescript
// Create mock requests
const request = createMockRequest('/api/endpoint', {
  method: 'POST',
  body: { data: 'test' },
  headers: { 'Authorization': 'Bearer token' }
})

// Response assertions
await expectResponse(response)
  .expectStatus(200)
  .expectHeader('Content-Type', 'application/json')
  .expectValidHealthResponse()
```

### API-Specific Helpers (`api-test-helpers.ts`)

```typescript
// Authenticated requests
const request = createAuthenticatedRequest('/api/endpoint', {
  user: { id: 'user-123', email: 'test@example.com' }
})

// Response assertions
await expectAPIResponse(response)
  .expectSuccess(200)
  .expectSecurityHeaders()
  .expectCacheHeaders(300)
```

### Mock Data Generators

```typescript
const description = apiMockData.description({
  style: 'poetico',
  language: 'spanish'
})

const user = apiMockData.user({
  subscription_status: 'pro'
})
```

## Test Patterns

### 1. Success Cases

```typescript
it('should handle valid request', async () => {
  mockService.method.mockResolvedValue({ data: 'success' })

  const request = createMockRequest('/api/endpoint', {
    method: 'POST',
    body: { valid: 'data' }
  })

  const response = await POST(request)
  const json = await expectAPIResponse(response)
    .expectSuccess(200)

  expect(json.data).toBe('success')
})
```

### 2. Validation Errors

```typescript
it('should reject invalid input', async () => {
  const request = createMockRequest('/api/endpoint', {
    method: 'POST',
    body: { invalid: '' }
  })

  const response = await POST(request)
  await expectAPIResponse(response)
    .expectValidationError('invalid')
})
```

### 3. Error Handling

```typescript
it('should handle service errors gracefully', async () => {
  mockService.method.mockRejectedValue(new Error('Service down'))

  const request = createMockRequest('/api/endpoint')
  const response = await GET(request)

  await expectAPIResponse(response)
    .expectError(500, 'Service temporarily unavailable')
})
```

### 4. Security Tests

```typescript
it('should validate security headers', async () => {
  const request = createMockRequest('/api/endpoint')
  const response = await GET(request)

  expectAPIResponse(response)
    .expectSecurityHeaders()
})

it('should prevent injection attacks', async () => {
  const request = createMockRequest('/api/endpoint', {
    body: { query: "'; DROP TABLE users; --" }
  })

  const response = await POST(request)
  // Verify query is sanitized
})
```

### 5. Performance Tests

```typescript
it('should respond within acceptable time', async () => {
  const timer = new APIPerformanceTimer()

  const request = createMockRequest('/api/endpoint')
  await GET(request)

  timer.expectResponseTime(1000) // < 1 second
})
```

## Mock Strategy

### External Services

```typescript
// OpenAI
vi.mock('@/lib/api/openai-server', () => ({
  generateVisionDescription: vi.fn()
}))

// Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn()
    }
  }))
}))

// Unsplash
vi.mock('@/lib/api/unsplash', () => ({
  unsplashService: {
    searchImages: vi.fn(),
    getRateLimitInfo: vi.fn()
  }
}))
```

### Environment Variables

```typescript
beforeEach(() => {
  process.env.OPENAI_API_KEY = 'sk-test-key'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
})

afterEach(() => {
  delete process.env.OPENAI_API_KEY
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
})
```

## Coverage Goals

### Target Coverage
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

### Current Status (Week 3-4)
- **Total Tests**: 113 passing
- **API Routes Covered**: 37+
- **Test Files**: 13
- **Coverage Report**: `npm run test:coverage`

### Priority Coverage Areas
1. **Critical Paths** (100%):
   - Authentication flows
   - Payment processing
   - User data handling

2. **High Priority** (90%+):
   - Description generation
   - Image search
   - Export functionality

3. **Medium Priority** (80%+):
   - Q&A generation
   - Phrase extraction
   - Vocabulary management

## Running Tests

### All API Tests
```bash
npm run test:run tests/api
```

### Specific Test Suite
```bash
npm run test:run tests/api/auth/signin.test.ts
```

### With Coverage
```bash
npm run test:coverage -- tests/api
```

### Watch Mode
```bash
npm run test:watch tests/api
```

### CI Mode
```bash
npm run test:run -- --reporter=json --outputFile=test-results.json
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run API tests
        run: npm run test:run tests/api
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}

      - name: Generate coverage
        run: npm run test:coverage -- tests/api

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

### Test Thresholds

```json
{
  "coverage": {
    "thresholds": {
      "global": {
        "statements": 80,
        "branches": 75,
        "functions": 80,
        "lines": 80
      }
    }
  }
}
```

## Best Practices

### 1. Test Naming
```typescript
// ✅ Good: Descriptive, action-oriented
it('should reject empty email addresses')
it('should generate descriptions in parallel')

// ❌ Bad: Vague, unclear expectations
it('tests email')
it('works correctly')
```

### 2. Test Independence
```typescript
// ✅ Good: Each test is isolated
beforeEach(() => {
  vi.clearAllMocks()
  setupTestEnvironment()
})

// ❌ Bad: Tests depend on execution order
let sharedState = {}
it('test 1', () => { sharedState.data = 'test' })
it('test 2', () => { expect(sharedState.data).toBe('test') })
```

### 3. Arrange-Act-Assert
```typescript
it('should authenticate user', async () => {
  // Arrange
  const mockUser = { id: 'user-123', email: 'test@example.com' }
  mockAuth.signIn.mockResolvedValue({ user: mockUser })

  // Act
  const request = createMockRequest('/api/auth/signin', {
    body: { email: 'test@example.com', password: 'password' }
  })
  const response = await POST(request)

  // Assert
  expect(response.status).toBe(200)
  const json = await response.json()
  expect(json.user).toEqual(mockUser)
})
```

### 4. Mock Granularity
```typescript
// ✅ Good: Mock at the right level
vi.mock('@/lib/api/openai-server', () => ({
  generateVisionDescription: vi.fn()
}))

// ❌ Bad: Over-mocking internal implementation
vi.mock('@/lib/api/openai-server', () => ({
  OpenAI: vi.fn(() => ({
    chat: { completions: { create: vi.fn() } }
  }))
}))
```

### 5. Error Testing
```typescript
// ✅ Good: Test specific error scenarios
it('should handle rate limiting', async () => {
  mockService.method.mockRejectedValue({ status: 429 })
  // ... test rate limit response
})

it('should handle network errors', async () => {
  mockService.method.mockRejectedValue(new Error('Network error'))
  // ... test network error response
})

// ❌ Bad: Generic error testing
it('should handle errors', async () => {
  mockService.method.mockRejectedValue(new Error())
  // ... not specific enough
})
```

## Troubleshooting

### Common Issues

**1. Module Resolution Errors**
```
Error: Cannot find package '@/lib/...'
```
**Solution**: Check `tsconfig.json` and `vitest.config.ts` path aliases match

**2. Environment Variable Issues**
```
Error: Missing OPENAI_API_KEY
```
**Solution**: Set up test environment in `beforeEach`:
```typescript
beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-key'
})
```

**3. Async Test Timeouts**
```
Error: Test timeout
```
**Solution**: Increase timeout or mock long-running operations:
```typescript
it('long test', async () => {
  // ...
}, 10000) // 10 second timeout
```

**4. Mock Persistence Between Tests**
```
Error: Mock called unexpected number of times
```
**Solution**: Clear mocks in `beforeEach`:
```typescript
beforeEach(() => {
  vi.clearAllMocks()
})
```

## Performance Benchmarks

### API Response Time Targets

| Endpoint | Target | Max Acceptable |
|----------|--------|----------------|
| `/api/health` | < 100ms | 500ms |
| `/api/images/search` | < 500ms | 2000ms |
| `/api/descriptions/generate` | < 15s | 30s |
| `/api/qa/generate` | < 2s | 5s |
| `/api/auth/signin` | < 500ms | 1000ms |
| `/api/export/generate` | < 5s | 10s |

### Load Testing

```bash
# Run performance tests
npm run test:perf

# Generate benchmark report
npm run perf:benchmark
```

## Maintenance

### Weekly Tasks
- Review test coverage reports
- Update test fixtures with new data structures
- Refactor duplicate test code
- Add tests for new features

### Monthly Tasks
- Performance regression testing
- Security audit of test patterns
- Update mock data to match production
- Review and update documentation

### Before Each Release
- Run full test suite
- Generate coverage report
- Check for flaky tests
- Update test documentation

## Resources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [MSW (Mock Service Worker)](https://mswjs.io/)

### Internal
- `/tests/api/test-utils.ts` - Base utilities
- `/tests/api/api-test-helpers.ts` - API helpers
- `/config/vitest.config.ts` - Test configuration

### Team Contacts
- **Testing Lead**: API Team
- **Coverage Goal**: 80%+ by Week 4
- **CI/CD Integration**: DevOps Team

## Changelog

### Week 3-4 (Current)
- ✅ Created comprehensive test infrastructure
- ✅ Implemented 113 API tests across 13 test files
- ✅ Added authentication, description, and image search tests
- ✅ Created reusable test utilities and helpers
- ⏳ Pending: CI integration
- ⏳ Pending: Full coverage report documentation

### Future Improvements
- Add integration tests with real Supabase instance
- Implement E2E API workflow tests
- Add contract testing
- Performance regression testing
- Load testing with k6 or Artillery
