# E2E Testing Quick Start Guide

Quick reference for running and working with E2E tests in the describe-it project.

---

## 🚀 Quick Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run smoke tests (fastest, critical paths only)
npm run test:smoke

# Run specific test file
npm run test:e2e -- onboarding.spec.ts

# Run with UI mode (interactive)
npm run test:e2e -- --ui

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific browser only
npm run test:e2e -- --project=chromium

# Debug mode
npm run test:e2e -- --debug
```

---

## 🏷️ Test Tags

Filter tests by tags using `--grep`:

```bash
# Critical path tests
npm run test:e2e -- --grep @critical

# Smoke tests
npm run test:smoke
# Same as: npm run test:e2e -- --grep @smoke

# Authentication tests
npm run test:e2e -- --grep @auth

# Vocabulary feature tests
npm run test:e2e -- --grep @vocabulary

# Progress tracking tests
npm run test:e2e -- --grep @progress

# Image search tests
npm run test:e2e -- --grep @images

# Mobile tests
npm run test:e2e -- --grep @mobile

# Exclude slow tests
npm run test:e2e -- --grep-invert @slow
```

---

## 📁 Project Structure

```
tests/e2e/
├── pages/              # Page Object Model
│   ├── BasePage.ts
│   ├── HomePage.ts
│   ├── LoginPage.ts
│   ├── VocabularyPage.ts
│   ├── ImageSearchPage.ts
│   └── ProgressPage.ts
├── helpers/            # Test utilities
│   ├── auth.helper.ts
│   ├── api.helper.ts
│   └── fixtures.ts
└── specs/              # Test files
    ├── onboarding.spec.ts
    ├── learning-session.spec.ts
    └── progress-tracking.spec.ts
```

---

## ✍️ Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '../helpers/fixtures';

test.describe('Feature Name @tag', () => {
  test('should perform specific action', async ({ page, homePage, loginPage }) => {
    await test.step('1. Setup', async () => {
      await homePage.navigate();
    });

    await test.step('2. Action', async () => {
      await homePage.clickAuthButton();
    });

    await test.step('3. Verify', async () => {
      await loginPage.verifyModalOpen();
    });
  });
});
```

### Using Page Objects

```typescript
// Good: Use page objects
await vocabularyPage.addVocabulary({
  word: 'hola',
  translation: 'hello',
  difficulty: 'beginner',
});

// Bad: Direct page interaction
await page.fill('[data-testid="word-input"]', 'hola');
await page.fill('[data-testid="translation-input"]', 'hello');
await page.click('[data-testid="save-button"]');
```

### Using Fixtures

```typescript
test('authenticated user test', async ({
  authenticatedUser, // Auto-creates and logs in user
  vocabularyPage,
}) => {
  // User is already authenticated
  await vocabularyPage.navigate();
  // ... test logic
});
```

---

## 🐛 Debugging

### View Test Report

```bash
# After test run, open HTML report
npx playwright show-report
```

### Debug Specific Test

```bash
# Debug mode with inspector
npm run test:e2e -- --debug onboarding.spec.ts

# Pause on specific line in test
await page.pause();
```

### View Trace

```bash
# Generate trace
npm run test:e2e -- --trace on

# View trace file
npx playwright show-trace trace.zip
```

### Screenshots

Screenshots are automatically saved on test failure:

- Location: `test-results/screenshots/`
- Manual screenshot: `await page.screenshot({ path: 'screenshot.png' })`

---

## 🔧 Configuration

### Environment Variables

```bash
# Change base URL
BASE_URL=http://localhost:3001 npm run test:e2e

# Run on staging
npm run test:e2e:staging
```

### Browser Selection

```bash
# Single browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit

# Mobile
npm run test:e2e -- --project="Mobile Chrome"
npm run test:e2e -- --project="Mobile Safari"
```

---

## 📊 Test Data

### Creating Test Users

```typescript
import { TestDataBuilder } from '../helpers/fixtures';

const user = TestDataBuilder.userCredentials('prefix');
// Returns: { email, password, fullName }
```

### Creating Test Vocabulary

```typescript
const vocabulary = TestDataBuilder.vocabularyItem({
  word: 'custom word',
  translation: 'custom translation',
});

const multipleItems = TestDataBuilder.vocabularyItems(5);
```

---

## 🎯 Best Practices

### DO ✅

- Use page objects for all interactions
- Use test.step() for clear test structure
- Add tags to tests (@smoke, @critical)
- Use explicit waits (await page.waitForSelector)
- Create unique test users for each test
- Clean up test data after tests
- Use descriptive test names

### DON'T ❌

- Use hardcoded selectors in tests
- Use arbitrary timeouts (page.waitForTimeout)
- Share state between tests
- Use test.only in committed code
- Skip tests without good reason
- Ignore test failures

---

## 🔍 Common Selectors

```typescript
// Preferred: data-testid
'[data-testid="element-name"]';

// Fallback: role + text
page.getByRole('button', { name: /submit/i });

// Text content
('button:has-text("Submit")');

// Avoid: XPath and complex CSS
```

---

## 📈 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run E2E Tests
  run: npm run test:e2e
  env:
    CI: true
    BASE_URL: ${{ secrets.STAGING_URL }}

- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: test-results/
```

---

## 🆘 Troubleshooting

### Test Timeout

**Problem:** Test exceeds 60s timeout
**Solution:**

```typescript
test('long running test', async ({ page }) => {
  test.setTimeout(120000); // Increase to 2 minutes
  // ... test logic
});
```

### Element Not Found

**Problem:** `Element not found` error
**Solution:**

1. Verify selector exists: `await page.locator(selector).count()`
2. Add explicit wait: `await page.waitForSelector(selector)`
3. Check if element is in viewport: `await element.scrollIntoViewIfNeeded()`

### Flaky Tests

**Problem:** Test passes sometimes, fails sometimes
**Solution:**

1. Add explicit waits for API: `await apiHelper.waitForAPI('/api/endpoint')`
2. Wait for network idle: `await page.waitForLoadState('networkidle')`
3. Use retry logic: BasePage methods have built-in retries
4. Increase timeouts in config

### Authentication Fails

**Problem:** Cannot authenticate in tests
**Solution:**

1. Use API auth for speed: `authHelper.signInViaAPI(credentials)`
2. Check credentials are correct
3. Verify API endpoint is running
4. Use mock auth for isolated testing

---

## 📚 Further Reading

- **Playwright Docs:** https://playwright.dev
- **E2E Architecture:** `/docs/testing/e2e-testing-architecture.md`
- **Implementation Summary:** `/docs/testing/E2E_IMPLEMENTATION_SUMMARY.md`
- **GOAP Plan:** `/docs/testing/GOAP_IMPLEMENTATION_PLAN.md`

---

**Last Updated:** December 8, 2025
