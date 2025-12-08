/**
 * Test Fixtures
 *
 * Provides reusable test fixtures and data builders for E2E tests
 */

import { test as base, Page } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { VocabularyPage } from '../pages/VocabularyPage';
import { ImageSearchPage } from '../pages/ImageSearchPage';
import { ProgressPage } from '../pages/ProgressPage';
import { AuthHelper, UserCredentials } from './auth.helper';
import { APIHelper } from './api.helper';

// Extend base test with custom fixtures
// Note: The 'use' function below is Playwright's fixture system, not React hooks
/* eslint-disable react-hooks/rules-of-hooks */
type TestFixtures = {
  homePage: HomePage;
  loginPage: LoginPage;
  vocabularyPage: VocabularyPage;
  imageSearchPage: ImageSearchPage;
  progressPage: ProgressPage;
  authHelper: AuthHelper;
  apiHelper: APIHelper;
  authenticatedUser: UserCredentials;
};

export const test = base.extend<TestFixtures>({
  // Page Object fixtures
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  vocabularyPage: async ({ page }, use) => {
    await use(new VocabularyPage(page));
  },

  imageSearchPage: async ({ page }, use) => {
    await use(new ImageSearchPage(page));
  },

  progressPage: async ({ page }, use) => {
    await use(new ProgressPage(page));
  },

  // Helper fixtures
  authHelper: async ({ page }, use) => {
    await use(new AuthHelper(page));
  },

  apiHelper: async ({ page }, use) => {
    await use(new APIHelper(page));
  },

  // Authenticated user fixture (auto-login)
  authenticatedUser: async ({ page, authHelper }, use) => {
    const user = AuthHelper.createTestUser('e2e');

    // Sign up and authenticate
    await authHelper.signUpViaUI(user);
    await authHelper.waitForAuthComplete();

    // Provide user credentials to test
    await use(user);

    // Cleanup: sign out after test
    try {
      await authHelper.signOut();
    } catch (error) {
      console.log('Cleanup: Could not sign out user');
    }
  },
});

export { expect } from '@playwright/test';

/**
 * Test Data Builders
 */
export class TestDataBuilder {
  /**
   * Create vocabulary item data
   */
  static vocabularyItem(overrides?: Partial<any>) {
    return {
      word: `word-${Date.now()}`,
      translation: 'test translation',
      difficulty: 'beginner',
      partOfSpeech: 'noun',
      category: 'test',
      exampleSentence: 'This is an example sentence.',
      ...overrides,
    };
  }

  /**
   * Create multiple vocabulary items
   */
  static vocabularyItems(count: number, overrides?: Partial<any>) {
    return Array.from({ length: count }, (_, i) =>
      this.vocabularyItem({
        word: `word-${Date.now()}-${i}`,
        translation: `translation-${i}`,
        ...overrides,
      })
    );
  }

  /**
   * Create user credentials
   */
  static userCredentials(prefix: string = 'test'): UserCredentials {
    return {
      email: `${prefix}-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      fullName: `Test User ${Date.now()}`,
    };
  }

  /**
   * Create image search query
   */
  static imageSearchQuery(): string {
    const queries = [
      'mountain landscape',
      'beach sunset',
      'city skyline',
      'forest path',
      'ocean waves',
    ];
    return queries[Math.floor(Math.random() * queries.length)];
  }
}

/**
 * Test Tags
 *
 * Use these tags to categorize and filter tests
 */
export const TestTags = {
  SMOKE: '@smoke',
  CRITICAL: '@critical',
  AUTH: '@auth',
  VOCABULARY: '@vocabulary',
  IMAGES: '@images',
  PROGRESS: '@progress',
  MOBILE: '@mobile',
  SLOW: '@slow',
  API: '@api',
} as const;

/**
 * Test Timeouts
 */
export const TestTimeouts = {
  SHORT: 5000,
  MEDIUM: 10000,
  LONG: 30000,
  EXTRA_LONG: 60000,
} as const;

/**
 * Test Data Constants
 */
export const TestData = {
  DEFAULT_PASSWORD: 'TestPassword123!',
  TEST_USER_EMAIL: 'test@example.com',
  INVALID_EMAIL: 'invalid-email',
  WEAK_PASSWORD: '123',
  SEARCH_QUERIES: {
    MOUNTAIN: 'mountain landscape',
    BEACH: 'beach sunset',
    CITY: 'city skyline',
  },
  VOCABULARY_CATEGORIES: ['travel', 'food', 'business', 'casual', 'academic'],
  DIFFICULTY_LEVELS: ['beginner', 'intermediate', 'advanced'],
} as const;

/**
 * Wait Utilities
 */
export class WaitHelpers {
  /**
   * Wait for element with custom retry logic
   */
  static async waitForElementWithRetry(
    page: Page,
    selector: string,
    options: { maxRetries?: number; retryDelay?: number; timeout?: number } = {}
  ): Promise<void> {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    const timeout = options.timeout || 5000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.waitForSelector(selector, { timeout });
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await page.waitForTimeout(retryDelay);
      }
    }
  }

  /**
   * Wait for condition with timeout
   */
  static async waitForCondition(
    condition: () => Promise<boolean>,
    options: { timeout?: number; interval?: number } = {}
  ): Promise<void> {
    const timeout = options.timeout || 10000;
    const interval = options.interval || 500;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }
}

/**
 * Assertion Helpers
 */
export class AssertionHelpers {
  /**
   * Assert element text contains
   */
  static async assertTextContains(
    page: Page,
    selector: string,
    expectedText: string
  ): Promise<void> {
    const element = page.locator(selector);
    const text = await element.textContent();
    if (!text?.includes(expectedText)) {
      throw new Error(
        `Expected element "${selector}" to contain "${expectedText}", but got "${text}"`
      );
    }
  }

  /**
   * Assert element count
   */
  static async assertElementCount(
    page: Page,
    selector: string,
    expectedCount: number
  ): Promise<void> {
    const count = await page.locator(selector).count();
    if (count !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} elements matching "${selector}", but found ${count}`
      );
    }
  }

  /**
   * Assert URL contains
   */
  static async assertURLContains(page: Page, expectedPath: string): Promise<void> {
    const url = page.url();
    if (!url.includes(expectedPath)) {
      throw new Error(`Expected URL to contain "${expectedPath}", but got "${url}"`);
    }
  }
}
