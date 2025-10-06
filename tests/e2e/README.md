# E2E Authentication Tests

Comprehensive end-to-end tests for all authentication flows in the Describe It application.

## Test Coverage

### 1. OAuth Authentication Flow
- ✅ Google OAuth login
- ✅ GitHub OAuth login
- ✅ OAuth callback handling
- ✅ OAuth error handling

### 2. Email/Password Signup
- ✅ Valid signup flow
- ✅ Duplicate email detection
- ✅ Password validation
- ✅ Email verification

### 3. Email/Password Login
- ✅ Valid login
- ✅ Invalid credentials
- ✅ Non-existent user
- ✅ Timeout handling

### 4. Magic Link
- ✅ Magic link request
- ✅ Email sent confirmation

### 5. Logout Flow
- ✅ Successful logout
- ✅ Session cleanup
- ✅ Redirect after logout

### 6. Protected Routes
- ✅ Unauthenticated access blocking
- ✅ Authenticated access
- ✅ Auth persistence on reload
- ✅ Auth persistence across navigation

### 7. Auth State Persistence
- ✅ LocalStorage persistence
- ✅ Cross-tab synchronization
- ✅ Expired session handling

### 8. Error Scenarios
- ✅ Network failures
- ✅ Server errors (500)
- ✅ Email validation
- ✅ Rate limiting

### 9. UI Responsiveness
- ✅ Mobile viewport (375x667)
- ✅ Tablet viewport (768x1024)

### 10. Accessibility
- ✅ Keyboard navigation
- ✅ ARIA labels

## Running Tests

### Prerequisites

1. **Environment Variables**

Create a `.env.test` file:

```bash
# Test user credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123

# Admin user (optional)
ADMIN_USER_EMAIL=admin@example.com
ADMIN_USER_PASSWORD=adminpassword123

# Supabase (from .env.local)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

2. **Install Playwright Browsers**

```bash
npx playwright install
```

### Run All Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/e2e/auth-flows.spec.ts

# Run in debug mode
npx playwright test --debug
```

### Run Specific Test Suites

```bash
# OAuth tests only
npx playwright test -g "OAuth Authentication"

# Login tests only
npx playwright test -g "Email/Password Login"

# Error scenarios only
npx playwright test -g "Error Scenarios"
```

### Run on Specific Browsers

```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# Mobile Chrome
npx playwright test --project="Mobile Chrome"
```

### Generate Test Report

```bash
# Run tests and generate HTML report
npm run test:e2e

# Open report
npx playwright show-report
```

## Test Structure

```
tests/e2e/
├── auth-flows.spec.ts          # Main authentication tests
├── helpers/
│   ├── auth-helpers.ts         # Auth utility functions
│   └── test-config.ts          # Test configuration
├── screenshots/                # Test screenshots
│   └── *.png                   # Timestamped screenshots
└── README.md                   # This file
```

## Test Helpers

### AuthHelpers Class

```typescript
import { AuthHelpers } from './helpers/auth-helpers';

const authHelpers = new AuthHelpers(page);

// Open auth modal
await authHelpers.openAuthModal(page);

// Login
await authHelpers.login(page, email, password);

// Verify auth state
const isAuthenticated = await authHelpers.verifyAuthState(page);

// Take screenshot
await authHelpers.takeScreenshot(page, 'test-step');
```

### Available Methods

- `openAuthModal(page)` - Opens authentication modal
- `login(page, email, password)` - Complete login flow
- `logout(page)` - Logout current user
- `verifyAuthState(page)` - Check if user is authenticated
- `takeScreenshot(page, name)` - Take timestamped screenshot
- `waitForAuthStateChange(page)` - Wait for auth event
- `getAuthCookies(page)` - Get authentication cookies
- `clearAuthData(page)` - Clear all auth data
- `mockAuthResponse(page, success, userData)` - Mock API responses
- `fillSignupForm(page, name, email, password)` - Fill signup form
- `fillLoginForm(page, email, password)` - Fill login form
- `switchAuthMode(page, mode)` - Switch between signin/signup
- `getErrorMessage(page)` - Get error from modal
- `getSuccessMessage(page)` - Get success from modal

## Screenshots

All screenshots are automatically saved to `tests/e2e/screenshots/` with:
- Sequential numbering (01-, 02-, etc.)
- Descriptive name
- Timestamp

Example: `01-login-form-filled-2025-10-06T20-30-45-123Z.png`

## Test Configuration

### Test Users

Defined in `helpers/test-config.ts`:

```typescript
TEST_USERS.existingUser  // Pre-existing test user
TEST_USERS.newUser       // New user for signup tests
TEST_USERS.adminUser     // Admin user (optional)
```

### Timeouts

```typescript
TEST_TIMEOUTS.short   // 5 seconds
TEST_TIMEOUTS.medium  // 10 seconds
TEST_TIMEOUTS.long    // 30 seconds
TEST_TIMEOUTS.oauth   // 60 seconds
```

### Selectors

Reusable selectors in `test-config.ts`:

```typescript
SELECTORS.authModal
SELECTORS.loginButton
SELECTORS.emailInput
// ... etc
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: tests/e2e/screenshots/
```

## Debugging

### View Test Traces

```bash
# Run with trace
npx playwright test --trace on

# Open trace viewer
npx playwright show-trace trace.zip
```

### Slow Motion

```bash
# Run tests in slow motion
npx playwright test --headed --slow-mo=1000
```

### Pause on Failure

Add to test:

```typescript
test('my test', async ({ page }) => {
  await page.pause(); // Pauses execution
  // ... test code
});
```

### Video Recording

Videos are automatically recorded on failure (configured in `playwright.config.ts`).

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Clear auth state in `beforeEach`
3. **Timeouts**: Use appropriate timeouts for auth operations
4. **Screenshots**: Take screenshots at key steps
5. **Error Handling**: Test both success and failure paths
6. **Accessibility**: Include keyboard navigation tests
7. **Mobile**: Test on mobile viewports
8. **Mocking**: Mock external OAuth providers in tests

## Troubleshooting

### Tests Failing Locally

1. **Check environment variables**
   ```bash
   cat .env.test
   ```

2. **Clear test data**
   ```bash
   # Clear browser storage
   rm -rf playwright/.auth
   ```

3. **Update Playwright**
   ```bash
   npm install -D @playwright/test@latest
   npx playwright install
   ```

### OAuth Tests Not Working

OAuth tests require external provider interaction. For automated testing:

1. Mock OAuth responses in test environment
2. Use Supabase test project with relaxed security
3. Consider using Playwright's authentication storage

### Flaky Tests

If tests are flaky:

1. Increase timeouts
2. Add explicit waits
3. Check for race conditions
4. Use `page.waitForLoadState('networkidle')`

## Contributing

When adding new auth features:

1. Add corresponding E2E test
2. Update this README
3. Add test user if needed
4. Document any new helpers
5. Update CI/CD configuration

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [E2E Testing Best Practices](https://playwright.dev/docs/best-practices)
