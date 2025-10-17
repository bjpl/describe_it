# Test Environment Setup Guide

Complete guide for configuring the test environment to run integration and E2E tests successfully.

## 🎯 Overview

This project requires proper test environment configuration to run:
- **Integration Tests** - API and database integration tests
- **E2E Tests** - End-to-end browser tests with Playwright
- **Staging Tests** - Tests against staging environment

## ✅ Prerequisites

- Node.js 18+ installed
- npm packages installed (`npm install`)
- Test environment file created (`.env.test` or `.env.test.local`)

## 📋 Quick Setup Checklist

- [ ] Create test Supabase project
- [ ] Configure Supabase credentials in `.env.test.local`
- [ ] Set up Anthropic API key
- [ ] Run database migrations on test instance
- [ ] Verify test configuration
- [ ] Run test suite

---

## 🔧 Step-by-Step Setup

### Step 1: Create Test Supabase Project

**Why:** Tests need a separate database to avoid polluting development/production data.

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Configure:
   - **Name:** `describe-it-test`
   - **Database Password:** Generate strong password (save it!)
   - **Region:** Choose closest region for faster tests
   - **Plan:** Free tier works for testing
4. Wait for project creation (~2 minutes)

### Step 2: Get Supabase Credentials

1. **Project URL:**
   - Dashboard → Settings → API
   - Copy **Project URL** (e.g., `https://abcdefgh.supabase.co`)

2. **Anon (Public) Key:**
   - Same page → API Settings → **Project API keys**
   - Copy **anon/public** key

3. **Service Role Key:**
   - Same page → **service_role** key
   - ⚠️ **KEEP SECRET** - Has admin access

### Step 3: Configure Test Environment

Create `.env.test.local` (gitignored) with real credentials:

```bash
# Copy from .env.test template
cp .env.test .env.test.local

# Edit .env.test.local with your credentials
```

**Required Configuration:**

```env
# Test Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Anthropic API (Required for AI tests)
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

### Step 4: Set Up Anthropic API Key

**For Real API Testing:**

1. Go to [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Click **"Create Key"**
3. Name: `Test API Key`
4. Copy key and add to `.env.test.local`
5. **Set Usage Limits** (recommended):
   - Daily limit: $5
   - Monthly limit: $50
   - Prevents runaway test costs

**For Mocked Testing (Unit Tests):**

Keep the placeholder key and implement API mocking (see Mocking section below).

### Step 5: Run Database Migrations

Apply schema to test database:

```bash
# Method 1: Using Supabase CLI (recommended)
npx supabase link --project-ref your-test-project-ref
npx supabase db push

# Method 2: Manual SQL migration
# Copy SQL from migrations/ and run in Supabase SQL Editor
```

**Verify Schema:**

```sql
-- Run in Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Should see: users, sessions, descriptions, questions, etc.
```

### Step 6: Seed Test Data (Optional)

```bash
# Seed basic test data
npm run db:seed:test

# Or use Supabase SQL Editor to insert test records
```

### Step 7: Verify Configuration

```bash
# Test Supabase connection
npm run test:db:connection

# Or manually verify:
curl https://your-test-project.supabase.co/rest/v1/ \
  -H "apikey: your-anon-key"
```

---

## 🧪 Running Tests

### Integration Tests

```bash
# All integration tests
npm run test:integration

# Specific test file
npm run test:integration tests/integration/api/descriptions.test.ts

# Watch mode
npm run test:integration -- --watch
```

### E2E Tests (Playwright)

```bash
# All E2E tests
npm run test:e2e

# Staging environment
npm run test:e2e:staging

# Headed mode (see browser)
npm run test:e2e -- --headed

# Specific test
npm run test:e2e tests/e2e/auth.spec.ts
```

### Smoke Tests

```bash
# Quick smoke tests (critical paths only)
npm run test:smoke
```

---

## 🔍 Troubleshooting

### Issue: "fetch failed" - AuthRetryableFetchError

**Symptoms:**
```
AuthRetryableFetchError: fetch failed
  at _handleRequest (node_modules/@supabase/auth-js/...)
```

**Solutions:**
1. ✅ Verify Supabase URL is correct
2. ✅ Check anon key is valid
3. ✅ Ensure test project is not paused
4. ✅ Check network connectivity
5. ✅ Verify you're using `.env.test.local` not `.env.test`

### Issue: "expected 400 to be 200" (AI API tests)

**Symptoms:**
```
Error: expected 400 to be 200
  at tests/integration/api/descriptions.test.ts
```

**Solutions:**
1. ✅ Set valid `ANTHROPIC_API_KEY` in `.env.test.local`
2. ✅ Check API key hasn't exceeded rate limits
3. ✅ Verify API key has correct permissions
4. ✅ Check Anthropic service status
5. ✅ Add delay between tests if hitting rate limits

### Issue: JSX Syntax Errors

**Symptoms:**
```
ERROR: Expected ">" but found "client"
Transform failed with 1 error
```

**Solutions:**
1. ✅ Rename `.ts` files with JSX to `.tsx`
2. ✅ Or update `vitest.config.ts` to support JSX in `.ts` files
3. ✅ See [JSX Configuration](#jsx-configuration) below

### Issue: Database Connection Timeout

**Symptoms:**
```
Error: Connection timeout
  at DatabaseService.connect()
```

**Solutions:**
1. ✅ Verify `DATABASE_URL` points to test database
2. ✅ Check test database is running
3. ✅ Increase `DATABASE_TIMEOUT` in `.env.test.local`
4. ✅ Verify database accepts connections from your IP

---

## 🎭 API Mocking (Optional)

For tests that don't need real API calls:

### Mock Anthropic API

```typescript
// tests/utils/mocks/anthropic.ts
import { vi } from 'vitest';

export const mockAnthropicAPI = () => {
  vi.mock('@anthropic-ai/sdk', () => ({
    default: vi.fn(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ text: 'Mocked response' }]
        })
      }
    }))
  }));
};
```

### Mock Supabase

```typescript
// tests/utils/mocks/supabase.ts
import { vi } from 'vitest';

export const mockSupabase = () => {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: mockData,
          error: null
        }))
      }))
    }))
  };
};
```

---

## ⚙️ JSX Configuration

If you get JSX syntax errors, update `vitest.config.ts`:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react'
  },
  test: {
    environment: 'jsdom',
    // ... rest of config
  }
});
```

---

## 🔐 Security Best Practices

### DO:
- ✅ Use separate test Supabase project
- ✅ Use test API keys with usage limits
- ✅ Store real credentials in `.env.test.local` (gitignored)
- ✅ Rotate test keys regularly
- ✅ Clean up test data after runs
- ✅ Monitor test API usage and costs

### DON'T:
- ❌ Never use production credentials for testing
- ❌ Never commit `.env.test.local` to git
- ❌ Never test on production database
- ❌ Never use production API keys without limits
- ❌ Never store real credentials in `.env.test` (committed file)

---

## 📊 Test Data Management

### Create Test Users

```sql
-- Run in Supabase SQL Editor
INSERT INTO auth.users (email, encrypted_password)
VALUES
  ('test1@example.com', crypt('testpass123', gen_salt('bf'))),
  ('test2@example.com', crypt('testpass123', gen_salt('bf')));
```

### Clean Up Test Data

```bash
# After each test run
npm run test:cleanup

# Or manually
npm run db:reset:test
```

### Test Data Fixtures

```typescript
// tests/fixtures/users.ts
export const testUsers = {
  regular: {
    email: 'test@example.com',
    password: 'Test123!@#'
  },
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!@#'
  }
};
```

---

## 🚀 CI/CD Configuration

For GitHub Actions or other CI:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}
      ANTHROPIC_API_KEY: ${{ secrets.TEST_ANTHROPIC_KEY }}

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration
```

**GitHub Secrets to add:**
- `TEST_SUPABASE_URL`
- `TEST_SUPABASE_ANON_KEY`
- `TEST_SUPABASE_SERVICE_KEY`
- `TEST_ANTHROPIC_KEY`

---

## 📝 Environment Files Reference

| File | Purpose | Committed? | Used For |
|------|---------|------------|----------|
| `.env.example` | Template | ✅ Yes | Documentation |
| `.env.test` | Test defaults | ✅ Yes | CI/CD, Mocks |
| `.env.test.local` | Real test creds | ❌ No | Local testing |
| `.env.local` | Dev credentials | ❌ No | Development |

---

## 🔗 Quick Links

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Anthropic Console](https://console.anthropic.com/)
- [Test Report](./TEST_REPORT.md)
- [Known Issues](./KNOWN_ISSUES.md)

---

## 💡 Tips

1. **Faster Tests:** Set `ENABLE_DEMO_MODE=false` for real API testing
2. **Debugging:** Set `LOG_LEVEL=debug` in `.env.test.local`
3. **Rate Limits:** Add `TEST_API_DELAY=100` to slow down requests
4. **Isolation:** Use `beforeEach` to reset state between tests
5. **Parallel Tests:** Set `maxConcurrency` in Vitest config

---

## ✅ Validation Checklist

After setup, verify:

```bash
# 1. Check environment variables loaded
npm run test:env

# 2. Test Supabase connection
npm run test:db:connection

# 3. Run smoke tests
npm run test:smoke

# 4. Run full integration suite
npm run test:integration

# 5. Check test coverage
npm run test:coverage
```

All tests should pass! 🎉

---

**Last Updated:** 2025-10-07
**Maintained By:** Development Team
