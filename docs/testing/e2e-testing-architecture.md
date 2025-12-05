# E2E Testing Architecture (Phase 5)

**Version:** 1.0
**Date:** 2025-12-04
**Status:** Architecture Design
**Priority:** High

## Executive Summary

This document defines the comprehensive End-to-End (E2E) testing architecture using Playwright for the describe-it application, covering critical user journeys, authentication flows, and multi-device testing strategies.

## Framework Decision: Playwright (Recommended)

### Playwright vs Cypress Comparison

| Feature | Playwright | Cypress | Winner |
|---------|-----------|---------|--------|
| **Multi-browser** | Chrome, Firefox, Safari, Edge | Chrome, Firefox, Edge (beta Safari) | Playwright |
| **Speed** | Faster (parallel, no overhead) | Slower (serial execution) | Playwright |
| **API Testing** | Native support | Requires plugins | Playwright |
| **Mobile Testing** | Native device emulation | Limited | Playwright |
| **Network Stubbing** | Built-in, powerful | Built-in | Tie |
| **Video/Screenshots** | Built-in | Built-in | Tie |
| **Debugger** | VS Code integration | Cypress Studio | Tie |
| **Learning Curve** | Moderate | Easy | Cypress |
| **CI/CD** | Excellent | Good | Playwright |
| **Maintenance** | Active (Microsoft) | Active (Cypress.io) | Tie |

### Recommendation: **Playwright**

**Rationale:**
1. **Already Configured:** Project has Playwright setup in `config/playwright.config.ts`
2. **Multi-Browser Support:** Critical for cross-browser testing
3. **Performance:** Parallel execution out of the box
4. **API Testing:** Can test API routes alongside UI
5. **Modern Architecture:** Better TypeScript support
6. **Cost:** Free and open-source

**When to Use Cypress:**
- Team already familiar with Cypress
- Need visual test builder (Cypress Studio)
- Prefer Mocha/Chai syntax

---

## Current E2E Infrastructure

### Existing Configuration

```typescript
// config/playwright.config.ts (Analyzed)
{
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  projects: [
    'chromium',
    'firefox',
    'webkit',
    'Mobile Chrome',
    'Mobile Safari',
    'Microsoft Edge',
    'Google Chrome',
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    timeout: 120000,
  },

  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
}
```

### Existing Test Files

```
tests/e2e/
├── auth-flows.spec.ts (23KB - Comprehensive auth tests)
├── app-flow.spec.ts (10KB - Main app flow)
├── complete-user-flow.spec.ts (12KB - End-to-end journey)
├── critical-user-journeys.spec.ts (15KB - Key scenarios)
├── helpers/
│   ├── auth-helpers.ts
│   └── test-config.ts
├── global-setup.ts
└── global-teardown.ts
```

**Status:** Good foundation, needs expansion and standardization.

---

## Test Architecture Design

### 1. Page Object Model (POM)

**Structure:**

```
tests/e2e/
├── pages/
│   ├── BasePage.ts              # Common page functionality
│   ├── HomePage.ts               # Home page actions
│   ├── AuthPage.ts               # Authentication modal
│   ├── VocabularyBuilderPage.ts # Vocabulary builder
│   ├── ImageSearchPage.ts        # Image search
│   ├── DescriptionsPage.ts       # Descriptions view
│   ├── ProgressPage.ts           # Progress tracking
│   └── SettingsPage.ts           # User settings
├── components/
│   ├── Header.ts                 # App header component
│   ├── Modal.ts                  # Modal dialogs
│   ├── VocabularyCard.ts         # Vocabulary item card
│   └── Toast.ts                  # Toast notifications
├── helpers/
│   ├── auth-helpers.ts           # Authentication utilities
│   ├── test-data.ts              # Test data generators
│   ├── assertions.ts             # Custom assertions
│   └── waiters.ts                # Custom wait conditions
└── specs/
    ├── auth/
    │   ├── signup.spec.ts
    │   ├── signin.spec.ts
    │   └── logout.spec.ts
    ├── vocabulary/
    │   ├── create.spec.ts
    │   ├── edit.spec.ts
    │   └── delete.spec.ts
    ├── images/
    │   └── search.spec.ts
    ├── descriptions/
    │   └── generate.spec.ts
    └── journeys/
        ├── first-time-user.spec.ts
        ├── returning-user.spec.ts
        └── power-user.spec.ts
```

### 2. Base Page Implementation

```typescript
// tests/e2e/pages/BasePage.ts
import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  protected readonly page: Page;
  protected readonly baseUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  /**
   * Navigate to page
   */
  async goto(path: string = ''): Promise<void> {
    await this.page.goto(`${this.baseUrl}${path}`, {
      waitUntil: 'domcontentloaded',
    });
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Take screenshot with descriptive name
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(
    selector: string,
    options?: { timeout?: number; state?: 'visible' | 'hidden' }
  ): Promise<Locator> {
    const locator = this.page.locator(selector);
    await locator.waitFor({
      state: options?.state || 'visible',
      timeout: options?.timeout || 10000,
    });
    return locator;
  }

  /**
   * Wait for API response
   */
  async waitForAPI(
    urlPattern: string | RegExp,
    options?: { timeout?: number; status?: number }
  ): Promise<void> {
    await this.page.waitForResponse(
      (response) => {
        const url = response.url();
        const matchesPattern =
          typeof urlPattern === 'string'
            ? url.includes(urlPattern)
            : urlPattern.test(url);

        if (!matchesPattern) return false;

        if (options?.status) {
          return response.status() === options.status;
        }

        return true;
      },
      { timeout: options?.timeout || 30000 }
    );
  }

  /**
   * Fill form field with validation
   */
  async fillField(
    selector: string,
    value: string,
    options?: { validate?: boolean }
  ): Promise<void> {
    const field = this.page.locator(selector);
    await field.fill(value);

    if (options?.validate) {
      const inputValue = await field.inputValue();
      expect(inputValue).toBe(value);
    }
  }

  /**
   * Click with retry logic
   */
  async clickWithRetry(
    selector: string,
    options?: { maxRetries?: number; delay?: number }
  ): Promise<void> {
    const maxRetries = options?.maxRetries || 3;
    const delay = options?.delay || 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.page.locator(selector).click({ timeout: 5000 });
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.page.waitForTimeout(delay);
      }
    }
  }

  /**
   * Check if element exists
   */
  async exists(selector: string): Promise<boolean> {
    try {
      await this.page.locator(selector).waitFor({
        state: 'visible',
        timeout: 2000,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get text content
   */
  async getText(selector: string): Promise<string> {
    const element = await this.waitForElement(selector);
    return (await element.textContent()) || '';
  }

  /**
   * Scroll element into view
   */
  async scrollIntoView(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Wait for toast notification
   */
  async waitForToast(
    message: string,
    options?: { timeout?: number; type?: 'success' | 'error' | 'info' }
  ): Promise<void> {
    const toastSelector = options?.type
      ? `[data-testid="toast-${options.type}"]`
      : '[data-testid^="toast-"]';

    const toast = await this.waitForElement(toastSelector, {
      timeout: options?.timeout,
    });

    const text = await toast.textContent();
    expect(text).toContain(message);
  }

  /**
   * Intercept and mock API calls
   */
  async mockAPI(
    urlPattern: string | RegExp,
    response: { status?: number; body: any }
  ): Promise<void> {
    await this.page.route(urlPattern, (route) => {
      route.fulfill({
        status: response.status || 200,
        contentType: 'application/json',
        body: JSON.stringify(response.body),
      });
    });
  }
}
```

### 3. Specific Page Implementation

```typescript
// tests/e2e/pages/VocabularyBuilderPage.ts
import { BasePage } from './BasePage';
import { expect } from '@playwright/test';
import type { VocabularyItem } from '@/types/unified';

export class VocabularyBuilderPage extends BasePage {
  // Selectors
  private readonly selectors = {
    addButton: '[data-testid="add-vocabulary-button"]',
    wordInput: '[data-testid="word-input"]',
    translationInput: '[data-testid="translation-input"]',
    difficultySelect: '[data-testid="difficulty-select"]',
    partOfSpeechSelect: '[data-testid="part-of-speech-select"]',
    exampleInput: '[data-testid="example-sentence-input"]',
    saveButton: '[data-testid="save-vocabulary-button"]',
    cancelButton: '[data-testid="cancel-vocabulary-button"]',
    vocabularyList: '[data-testid="vocabulary-list"]',
    vocabularyCard: (id: string) => `[data-testid="vocabulary-card-${id}"]`,
    editButton: (id: string) => `[data-testid="edit-vocabulary-${id}"]`,
    deleteButton: (id: string) => `[data-testid="delete-vocabulary-${id}"]`,
    searchInput: '[data-testid="vocabulary-search"]',
    filterButton: '[data-testid="filter-button"]',
  };

  /**
   * Navigate to vocabulary builder
   */
  async navigate(): Promise<void> {
    await this.goto('/vocabulary');
    await this.waitForElement(this.selectors.vocabularyList);
  }

  /**
   * Add new vocabulary item
   */
  async addVocabulary(item: Partial<VocabularyItem>): Promise<void> {
    // Open form
    await this.clickWithRetry(this.selectors.addButton);
    await this.waitForElement(this.selectors.wordInput);

    // Fill form
    if (item.word) {
      await this.fillField(this.selectors.wordInput, item.word, {
        validate: true,
      });
    }

    if (item.translation) {
      await this.fillField(this.selectors.translationInput, item.translation, {
        validate: true,
      });
    }

    if (item.difficulty) {
      await this.page.selectOption(
        this.selectors.difficultySelect,
        item.difficulty
      );
    }

    if (item.partOfSpeech) {
      await this.page.selectOption(
        this.selectors.partOfSpeechSelect,
        item.partOfSpeech
      );
    }

    if (item.exampleSentence) {
      await this.fillField(this.selectors.exampleInput, item.exampleSentence);
    }

    // Save and wait for API
    const responsePromise = this.waitForAPI('/api/vocabulary/save', {
      status: 200,
    });

    await this.clickWithRetry(this.selectors.saveButton);

    await responsePromise;

    // Wait for toast notification
    await this.waitForToast('Vocabulary saved successfully', {
      type: 'success',
    });
  }

  /**
   * Edit existing vocabulary item
   */
  async editVocabulary(
    id: string,
    updates: Partial<VocabularyItem>
  ): Promise<void> {
    // Click edit button
    await this.clickWithRetry(this.selectors.editButton(id));
    await this.waitForElement(this.selectors.wordInput);

    // Update fields
    if (updates.word !== undefined) {
      await this.fillField(this.selectors.wordInput, updates.word, {
        validate: true,
      });
    }

    if (updates.translation !== undefined) {
      await this.fillField(
        this.selectors.translationInput,
        updates.translation,
        { validate: true }
      );
    }

    // Save changes
    const responsePromise = this.waitForAPI(`/api/vocabulary/${id}`, {
      status: 200,
    });

    await this.clickWithRetry(this.selectors.saveButton);

    await responsePromise;

    await this.waitForToast('Vocabulary updated successfully', {
      type: 'success',
    });
  }

  /**
   * Delete vocabulary item
   */
  async deleteVocabulary(id: string): Promise<void> {
    // Click delete button
    await this.clickWithRetry(this.selectors.deleteButton(id));

    // Confirm deletion
    await this.page.getByRole('button', { name: /confirm/i }).click();

    // Wait for API
    await this.waitForAPI(`/api/vocabulary/${id}`, { status: 200 });

    // Verify removed from list
    const exists = await this.exists(this.selectors.vocabularyCard(id));
    expect(exists).toBe(false);
  }

  /**
   * Search vocabulary
   */
  async searchVocabulary(query: string): Promise<void> {
    await this.fillField(this.selectors.searchInput, query);
    await this.page.waitForTimeout(500); // Debounce delay
    await this.waitForElement(this.selectors.vocabularyList);
  }

  /**
   * Get vocabulary count
   */
  async getVocabularyCount(): Promise<number> {
    const cards = await this.page
      .locator('[data-testid^="vocabulary-card-"]')
      .count();
    return cards;
  }

  /**
   * Verify vocabulary exists
   */
  async verifyVocabularyExists(word: string): Promise<void> {
    const card = this.page.locator(
      `[data-testid^="vocabulary-card-"]:has-text("${word}")`
    );
    await expect(card).toBeVisible();
  }

  /**
   * Batch add vocabulary
   */
  async batchAddVocabulary(items: Partial<VocabularyItem>[]): Promise<void> {
    for (const item of items) {
      await this.addVocabulary(item);
      await this.page.waitForTimeout(500); // Small delay between additions
    }
  }
}
```

### 4. Authentication Helper

```typescript
// tests/e2e/helpers/auth-helpers.ts
import { Page } from '@playwright/test';
import { BasePage } from '../pages/BasePage';

export class AuthHelpers extends BasePage {
  /**
   * Sign up new user
   */
  async signUp(credentials: {
    email: string;
    password: string;
    confirmPassword?: string;
  }): Promise<void> {
    await this.goto('/');

    // Open auth modal
    await this.clickWithRetry('[data-testid="auth-button"]');
    await this.waitForElement('[data-testid="auth-modal"]');

    // Switch to signup tab
    await this.clickWithRetry('[data-testid="signup-tab"]');

    // Fill form
    await this.fillField('[data-testid="email-input"]', credentials.email);
    await this.fillField('[data-testid="password-input"]', credentials.password);

    if (credentials.confirmPassword) {
      await this.fillField(
        '[data-testid="confirm-password-input"]',
        credentials.confirmPassword
      );
    }

    // Submit
    const responsePromise = this.waitForAPI('/api/auth/signup', {
      status: 200,
    });

    await this.clickWithRetry('[data-testid="signup-button"]');

    await responsePromise;

    // Wait for redirect or success message
    await this.waitForToast('Account created successfully', {
      type: 'success',
    });
  }

  /**
   * Sign in existing user
   */
  async signIn(credentials: {
    email: string;
    password: string;
  }): Promise<void> {
    await this.goto('/');

    // Open auth modal
    await this.clickWithRetry('[data-testid="auth-button"]');
    await this.waitForElement('[data-testid="auth-modal"]');

    // Fill form
    await this.fillField('[data-testid="email-input"]', credentials.email);
    await this.fillField('[data-testid="password-input"]', credentials.password);

    // Submit
    const responsePromise = this.waitForAPI('/api/auth/signin', {
      status: 200,
    });

    await this.clickWithRetry('[data-testid="signin-button"]');

    await responsePromise;

    // Wait for redirect
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    await this.clickWithRetry('[data-testid="user-menu"]');
    await this.clickWithRetry('[data-testid="signout-button"]');

    await this.waitForAPI('/api/auth/signout', { status: 200 });

    // Verify redirected to home
    await this.page.waitForURL('**/', { timeout: 5000 });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await this.exists('[data-testid="user-menu"]');
  }

  /**
   * Setup authenticated session
   */
  async setupAuthenticatedSession(
    page: Page,
    credentials: { email: string; password: string }
  ): Promise<void> {
    // Use API to create session (faster than UI)
    const response = await page.request.post(
      `${this.baseUrl}/api/auth/signin`,
      {
        data: credentials,
      }
    );

    if (!response.ok()) {
      throw new Error('Failed to authenticate');
    }

    // Cookies are automatically set by Playwright
    await page.goto(`${this.baseUrl}/dashboard`);
  }
}
```

---

## Critical User Journeys

### 1. First-Time User Journey

```typescript
// tests/e2e/specs/journeys/first-time-user.spec.ts
import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../helpers/auth-helpers';
import { VocabularyBuilderPage } from '../../pages/VocabularyBuilderPage';
import { ImageSearchPage } from '../../pages/ImageSearchPage';
import { DescriptionsPage } from '../../pages/DescriptionsPage';

test.describe('First-Time User Journey', () => {
  test('should complete full onboarding and learning flow', async ({ page }) => {
    const auth = new AuthHelpers(page);
    const vocabulary = new VocabularyBuilderPage(page);
    const imageSearch = new ImageSearchPage(page);
    const descriptions = new DescriptionsPage(page);

    // Generate unique test user
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'SecurePassword123!',
    };

    await test.step('1. Sign up new account', async () => {
      await auth.signUp(testUser);
      await expect(page).toHaveURL(/.*dashboard/);
    });

    await test.step('2. Complete onboarding', async () => {
      // Select Spanish level
      await page.getByRole('button', { name: /beginner/i }).click();

      // Set learning goals
      await page.getByLabel('Words per day').fill('10');

      // Complete onboarding
      await page.getByRole('button', { name: /get started/i }).click();

      await page.waitForURL('**/vocabulary');
    });

    await test.step('3. Search for first image', async () => {
      await imageSearch.navigate();
      await imageSearch.search('mountain landscape');

      const results = await imageSearch.getResultCount();
      expect(results).toBeGreaterThan(0);

      await imageSearch.selectResult(0);
    });

    await test.step('4. Generate description', async () => {
      await descriptions.navigate();
      await descriptions.generateDescription({
        style: 'conversacional',
        language: 'es',
        maxLength: 300,
      });

      const description = await descriptions.getGeneratedDescription();
      expect(description.length).toBeGreaterThan(0);
    });

    await test.step('5. Extract and save vocabulary', async () => {
      await descriptions.extractVocabulary();

      const extractedCount = await descriptions.getExtractedVocabularyCount();
      expect(extractedCount).toBeGreaterThan(0);

      await descriptions.saveVocabularyToList();
    });

    await test.step('6. Review saved vocabulary', async () => {
      await vocabulary.navigate();

      const count = await vocabulary.getVocabularyCount();
      expect(count).toBeGreaterThan(0);

      await vocabulary.verifyVocabularyExists('montaña');
    });

    await test.step('7. Start first learning session', async () => {
      await page.goto('/learn/flashcards');

      // Complete flashcard session
      for (let i = 0; i < 5; i++) {
        await page.getByRole('button', { name: /show answer/i }).click();
        await page.getByRole('button', { name: /got it/i }).click();
      }

      // Verify progress
      await page.goto('/progress');

      const progress = await page
        .locator('[data-testid="today-progress"]')
        .textContent();

      expect(progress).toContain('5');
    });

    await test.step('8. Sign out', async () => {
      await auth.signOut();
      await expect(page).toHaveURL('/');
    });
  });
});
```

### 2. Returning User Journey

```typescript
// tests/e2e/specs/journeys/returning-user.spec.ts
test.describe('Returning User Journey', () => {
  test('should resume learning session and see progress', async ({ page }) => {
    const auth = new AuthHelpers(page);
    const existingUser = {
      email: 'returning-user@example.com',
      password: 'SecurePassword123!',
    };

    await test.step('1. Sign in', async () => {
      await auth.signIn(existingUser);
      await expect(page).toHaveURL(/.*dashboard/);
    });

    await test.step('2. Review today\'s progress', async () => {
      await page.goto('/dashboard');

      // Check daily statistics
      const wordsLearned = await page
        .locator('[data-testid="words-learned-today"]')
        .textContent();

      expect(wordsLearned).toBeDefined();

      // Check streak
      const streak = await page
        .locator('[data-testid="learning-streak"]')
        .textContent();

      expect(streak).toBeDefined();
    });

    await test.step('3. Continue learning', async () => {
      await page.getByRole('link', { name: /continue learning/i }).click();

      // Review due vocabulary items
      await page.waitForSelector('[data-testid="flashcard"]');

      const dueCount = await page
        .locator('[data-testid="due-count"]')
        .textContent();

      expect(parseInt(dueCount || '0')).toBeGreaterThan(0);
    });

    await test.step('4. Add more vocabulary', async () => {
      const vocabulary = new VocabularyBuilderPage(page);

      await vocabulary.navigate();
      await vocabulary.addVocabulary({
        word: 'nuevo',
        translation: 'new',
        difficulty: 'beginner',
        partOfSpeech: 'adjective',
      });

      await vocabulary.verifyVocabularyExists('nuevo');
    });

    await test.step('5. Export progress', async () => {
      await page.goto('/export');

      await page.getByRole('button', { name: /pdf/i }).click();
      await page.getByRole('button', { name: /download/i }).click();

      // Wait for download
      const download = await page.waitForEvent('download');

      expect(download.suggestedFilename()).toContain('.pdf');
    });
  });
});
```

---

## Authentication Strategy

### 1. Global Setup (Reusable Authentication)

```typescript
// tests/e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Create test users and authenticate
  const testUsers = [
    {
      email: 'e2e-test-user@example.com',
      password: 'SecureTestPassword123!',
      statePath: 'tests/.auth/user.json',
    },
    {
      email: 'e2e-admin-user@example.com',
      password: 'SecureAdminPassword123!',
      statePath: 'tests/.auth/admin.json',
    },
  ];

  for (const user of testUsers) {
    // Sign in
    await page.goto(`${baseURL}/`);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.fill('[data-testid="email-input"]', user.email);
    await page.fill('[data-testid="password-input"]', user.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for authentication
    await page.waitForURL('**/dashboard');

    // Save authentication state
    await context.storageState({ path: user.statePath });

    console.log(`Authenticated ${user.email}`);
  }

  await browser.close();
}

export default globalSetup;
```

### 2. Use Stored Authentication

```typescript
// tests/e2e/specs/vocabulary/create.spec.ts
import { test } from '@playwright/test';

test.use({ storageState: 'tests/.auth/user.json' });

test.describe('Vocabulary CRUD (Authenticated)', () => {
  test('should create new vocabulary item', async ({ page }) => {
    // Already authenticated!
    await page.goto('/vocabulary');

    // Test logic...
  });
});
```

---

## Cross-Device Testing

### 1. Mobile Device Configuration

```typescript
// tests/e2e/specs/mobile/vocabulary-mobile.spec.ts
import { test, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 12'],
  hasTouch: true,
});

test.describe('Vocabulary on Mobile', () => {
  test('should add vocabulary via mobile interface', async ({ page }) => {
    await page.goto('/vocabulary');

    // Mobile-specific interactions
    await page.tap('[data-testid="add-button"]');

    // Swipe gestures
    await page.locator('[data-testid="vocabulary-card"]').swipe('left');

    // Virtual keyboard interactions
    await page.fill('[data-testid="word-input"]', 'mobile word');
  });
});
```

### 2. Responsive Breakpoint Tests

```typescript
// tests/e2e/specs/responsive/layout.spec.ts
test.describe('Responsive Layout', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`should render correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');

      // Take screenshot for visual regression
      await page.screenshot({
        path: `test-results/screenshots/${viewport.name}-home.png`,
        fullPage: true,
      });

      // Test responsive behavior
      const header = page.locator('[data-testid="app-header"]');
      await expect(header).toBeVisible();

      if (viewport.name === 'Mobile') {
        // Mobile menu should be hamburger
        await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      } else {
        // Desktop menu should be full
        await expect(page.locator('[data-testid="desktop-menu"]')).toBeVisible();
      }
    });
  }
});
```

---

## Performance Testing

### 1. Web Vitals Measurement

```typescript
// tests/e2e/specs/performance/web-vitals.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Web Vitals Performance', () => {
  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    const metrics: Record<string, number> = {};

    // Capture performance metrics
    await page.goto('/');

    const webVitals = await page.evaluate(() => {
      return new Promise<Record<string, number>>((resolve) => {
        const metrics: Record<string, number> = {};
        let resolved = false;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              metrics.LCP = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              metrics.FID = (entry as any).processingStart - entry.startTime;
            }
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              metrics.CLS = (metrics.CLS || 0) + (entry as any).value;
            }
          }

          // Resolve after collecting metrics
          if (!resolved && metrics.LCP) {
            resolved = true;
            setTimeout(() => resolve(metrics), 1000);
          }
        });

        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

        // Fallback timeout
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(metrics);
          }
        }, 5000);
      });
    });

    // Assert Core Web Vitals
    expect(webVitals.LCP).toBeLessThan(2500); // 2.5s
    expect(webVitals.FID || 0).toBeLessThan(100); // 100ms
    expect(webVitals.CLS || 0).toBeLessThan(0.1); // 0.1
  });
});
```

### 2. Load Time Testing

```typescript
// tests/e2e/specs/performance/load-time.spec.ts
test.describe('Page Load Performance', () => {
  test('should load pages within acceptable time', async ({ page }) => {
    const pages = [
      { path: '/', name: 'Home', maxTime: 3000 },
      { path: '/vocabulary', name: 'Vocabulary', maxTime: 2000 },
      { path: '/dashboard', name: 'Dashboard', maxTime: 2500 },
    ];

    for (const { path, name, maxTime } of pages) {
      const startTime = Date.now();

      await page.goto(path, { waitUntil: 'networkidle' });

      const loadTime = Date.now() - startTime;

      console.log(`${name} page loaded in ${loadTime}ms`);
      expect(loadTime).toBeLessThan(maxTime);
    }
  });
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * *' # Daily at midnight

jobs:
  e2e-tests:
    timeout-minutes: 60
    runs-on: ubuntu-latest

    strategy:
      matrix:
        project: [chromium, firefox, webkit]
        shard: [1, 2, 3, 4]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps ${{ matrix.project }}

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npx playwright test --project=${{ matrix.project }} --shard=${{ matrix.shard }}/${{ strategy.job-total }}
        env:
          CI: true
          BASE_URL: http://localhost:3000
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-results-${{ matrix.project }}-${{ matrix.shard }}
          path: test-results/

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ matrix.project }}-${{ matrix.shard }}
          path: playwright-report/

  merge-reports:
    needs: e2e-tests
    if: always()
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Download all reports
        uses: actions/download-artifact@v4
        with:
          path: all-reports/

      - name: Merge Playwright reports
        run: npx playwright merge-reports --reporter html ./all-reports

      - name: Upload merged report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-merged
          path: playwright-report/
```

---

## Visual Regression Testing

### Snapshot Testing

```typescript
// tests/e2e/specs/visual/screenshots.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('should match home page screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('home-page.png', {
      fullPage: true,
      maxDiffPixels: 100, // Allow minor differences
    });
  });

  test('should match vocabulary builder layout', async ({ page }) => {
    await page.goto('/vocabulary');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('vocabulary-builder.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="timestamp"]')], // Mask dynamic content
    });
  });
});
```

---

## Test Data Management

### Fixture Builder

```typescript
// tests/e2e/helpers/test-data.ts
export class TestDataBuilder {
  static vocabularyItem(overrides?: Partial<VocabularyItem>) {
    return {
      word: 'test-word-' + Date.now(),
      translation: 'test translation',
      language: 'es',
      difficulty: 'beginner' as const,
      partOfSpeech: 'noun' as const,
      ...overrides,
    };
  }

  static user(overrides?: Partial<User>) {
    const timestamp = Date.now();
    return {
      email: `test-${timestamp}@example.com`,
      password: 'SecurePassword123!',
      username: `testuser${timestamp}`,
      ...overrides,
    };
  }

  static batchVocabulary(count: number) {
    return Array.from({ length: count }, (_, i) =>
      this.vocabularyItem({
        word: `word-${i}`,
        translation: `translation-${i}`,
      })
    );
  }
}
```

---

## Command Reference

```bash
# Run all E2E tests
npm run test:e2e

# Run specific browser
npm run test:e2e -- --project=chromium

# Run specific test file
npm run test:e2e -- auth-flows.spec.ts

# Run with UI mode
npm run test:e2e -- --ui

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Debug mode
npm run test:e2e -- --debug

# Update screenshots
npm run test:e2e -- --update-snapshots

# Run smoke tests only
npm run test:smoke

# Run on staging environment
npm run test:e2e:staging
```

---

## Timeline & Deliverables

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Page Objects | Complete POM structure |
| 2 | Critical Journeys | First-time & returning user flows |
| 3 | Feature Tests | CRUD operations for all features |
| 4 | Cross-Device | Mobile & responsive tests |
| 5 | Performance | Web vitals & load time tests |
| 6 | Visual Regression | Screenshot comparison tests |
| 7 | CI/CD | Full pipeline integration |
| 8 | Maintenance | Flaky test fixes & documentation |

**Goal:** 90%+ coverage of critical user paths with stable, fast E2E tests.

---

**Next Steps:** Begin implementation following integration test architecture and type safety migration plan.
