# Integration Tests

This directory contains integration tests that test the full API flow with real server endpoints.

## Requirements

Integration tests in this directory require:

1. **Next.js Development Server Running**
   ```bash
   npm run dev
   ```
   Server must be accessible at `http://localhost:3000`

2. **Environment Variables**
   ```bash
   # Required for Claude API integration tests
   ANTHROPIC_API_KEY=sk-ant-your-key-here

   # Optional: Custom test API URL
   TEST_API_URL=http://localhost:3000
   ```

3. **Network Connectivity**
   - Tests make real HTTP requests
   - Tests may call external APIs (Claude, Unsplash)
   - Requires active internet connection

## Running Integration Tests

### Option 1: Manual (Recommended for Development)

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Wait for server to start, then run tests
npm run test:integration
```

### Option 2: One Command (Requires npm-run-all)

```bash
# Install if needed
npm install --save-dev npm-run-all

# Add to package.json scripts:
# "test:integration:full": "run-p dev test:integration"

npm run test:integration:full
```

### Option 3: Skip Integration Tests

```bash
# Run only unit tests (no server required)
npm run test:unit
```

## Test Files

### Claude API Integration (`claude-api.test.ts`)
- **Tests**: 39 tests
- **Requires**: ANTHROPIC_API_KEY, running server
- **Coverage**:
  - `/api/descriptions/generate` - Image description generation
  - `/api/qa/generate` - Q&A pair generation
  - `/api/translate` - Translation service
  - `/api/vocabulary/extract` - Vocabulary extraction

### API Endpoints (`api-endpoints.test.ts`)
- **Tests**: Various endpoint tests
- **Requires**: Running server
- **Coverage**: All API routes

### Database Integration (`database/*.test.ts`)
- **Tests**: Supabase integration
- **Requires**: SUPABASE_URL, SUPABASE_ANON_KEY
- **Coverage**: Auth, CRUD, RLS policies, real-time subscriptions

## Common Issues

### Issue: `fetch failed - ECONNREFUSED`
**Cause**: Server not running
**Solution**: Start dev server with `npm run dev`

### Issue: `Claude client not initialized - missing API key`
**Cause**: ANTHROPIC_API_KEY not set
**Solution**: Add to `.env.local`:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Issue: Tests timeout
**Cause**: API calls taking too long
**Solution**: Increase timeout or check network connectivity

## CI/CD Considerations

For CI/CD pipelines:

1. **Unit Tests Only** (Fast, no dependencies):
   ```bash
   npm run test:unit
   ```

2. **Integration Tests** (Slow, requires setup):
   ```bash
   # Start server in background
   npm run dev &
   SERVER_PID=$!

   # Wait for server
   sleep 10

   # Run tests
   npm run test:integration

   # Cleanup
   kill $SERVER_PID
   ```

3. **Mock External APIs** (Recommended for CI):
   Use MSW (Mock Service Worker) to intercept HTTP requests in CI environment.

## Test Organization

```
tests/
├── unit/               # No server required ✅
│   ├── lib/
│   ├── services/
│   └── utils/
├── integration/        # Server required ⚠️
│   ├── api/           # API endpoint tests
│   ├── database/      # Supabase tests
│   └── persistence/   # Storage tests
└── e2e/               # Playwright E2E tests 🎭
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Reset database state between tests
3. **Timeouts**: Set appropriate timeouts (30s default)
4. **Mocking**: Mock external APIs when possible
5. **Environment**: Use test-specific environment variables

## Debugging Integration Tests

```bash
# Run specific test file with verbose output
npm run test -- tests/integration/claude-api.test.ts --reporter=verbose

# Run single test
npm run test -- tests/integration/claude-api.test.ts -t "should generate narrative description"

# Debug mode
npm run test -- --inspect-brk tests/integration/claude-api.test.ts
```

## Performance

Integration tests are slower than unit tests:
- Unit tests: ~100ms per test
- Integration tests: ~500-3000ms per test (API calls)
- E2E tests: ~5000ms+ per test (browser automation)

**Recommendation**: Run unit tests frequently, integration tests before commits, E2E tests before deployment.

---

For more information, see:
- [Testing Strategy Guide](../../docs/testing-strategy.md)
- [API Documentation](../../docs/api/README.md)
- [Development Setup](../../README.md)
