/**
 * Base Page Object
 *
 * Provides common functionality for all page objects following Playwright best practices:
 * - Explicit waits with locator strategies
 * - Retry logic for flaky operations
 * - Screenshot and debugging utilities
 * - API interaction helpers
 * - Mobile-friendly interactions
 */

import { Page, Locator, expect, Response } from '@playwright/test';

export abstract class BasePage {
  protected readonly page: Page;
  protected readonly baseUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  /**
   * Navigate to page with optional wait condition
   */
  async goto(path: string = '', options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<void> {
    await this.page.goto(`${this.baseUrl}${path}`, {
      waitUntil: options?.waitUntil || 'domcontentloaded',
      timeout: 30000,
    });
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(options?: { timeout?: number }): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: options?.timeout || 30000 });
  }

  /**
   * Take screenshot with descriptive name
   */
  async screenshot(name: string, options?: { fullPage?: boolean }): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: options?.fullPage ?? true,
    });
  }

  /**
   * Wait for element to be visible (preferred over raw selectors)
   */
  async waitForElement(
    selector: string,
    options?: { timeout?: number; state?: 'visible' | 'hidden' | 'attached' | 'detached' }
  ): Promise<Locator> {
    const locator = this.page.locator(selector);
    await locator.waitFor({
      state: options?.state || 'visible',
      timeout: options?.timeout || 10000,
    });
    return locator;
  }

  /**
   * Wait for API response with URL pattern matching
   */
  async waitForAPI(
    urlPattern: string | RegExp,
    options?: { timeout?: number; status?: number; method?: string }
  ): Promise<Response> {
    const response = await this.page.waitForResponse(
      (response) => {
        const url = response.url();
        const matchesPattern =
          typeof urlPattern === 'string'
            ? url.includes(urlPattern)
            : urlPattern.test(url);

        if (!matchesPattern) return false;

        if (options?.method && response.request().method() !== options.method) {
          return false;
        }

        if (options?.status && response.status() !== options.status) {
          return false;
        }

        return true;
      },
      { timeout: options?.timeout || 30000 }
    );

    return response;
  }

  /**
   * Fill form field with validation
   */
  async fillField(
    selector: string,
    value: string,
    options?: { validate?: boolean; clear?: boolean }
  ): Promise<void> {
    const field = this.page.locator(selector);

    if (options?.clear) {
      await field.clear();
    }

    await field.fill(value);

    if (options?.validate) {
      const inputValue = await field.inputValue();
      expect(inputValue).toBe(value);
    }
  }

  /**
   * Click with retry logic for stability
   */
  async clickWithRetry(
    selector: string,
    options?: { maxRetries?: number; delay?: number; force?: boolean }
  ): Promise<void> {
    const maxRetries = options?.maxRetries || 3;
    const delay = options?.delay || 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.page.locator(selector).click({
          timeout: 5000,
          force: options?.force
        });
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.page.waitForTimeout(delay);
      }
    }
  }

  /**
   * Check if element exists without throwing
   */
  async exists(selector: string, options?: { timeout?: number }): Promise<boolean> {
    try {
      await this.page.locator(selector).waitFor({
        state: 'visible',
        timeout: options?.timeout || 2000,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get text content safely
   */
  async getText(selector: string): Promise<string> {
    const element = await this.waitForElement(selector);
    return (await element.textContent()) || '';
  }

  /**
   * Get all text contents for multiple elements
   */
  async getAllTexts(selector: string): Promise<string[]> {
    const elements = await this.page.locator(selector).all();
    const texts: string[] = [];

    for (const element of elements) {
      const text = await element.textContent();
      if (text) texts.push(text);
    }

    return texts;
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
    message: string | RegExp,
    options?: { timeout?: number; type?: 'success' | 'error' | 'info' | 'warning' }
  ): Promise<void> {
    const toastSelector = options?.type
      ? `[data-testid="toast-${options.type}"], [class*="toast-${options.type}"]`
      : '[data-testid^="toast-"], [class*="toast"]';

    const toast = await this.waitForElement(toastSelector, {
      timeout: options?.timeout || 5000,
    });

    const text = await toast.textContent();

    if (typeof message === 'string') {
      expect(text).toContain(message);
    } else {
      expect(text).toMatch(message);
    }
  }

  /**
   * Intercept and mock API calls
   */
  async mockAPI(
    urlPattern: string | RegExp,
    response: { status?: number; body: any; headers?: Record<string, string> }
  ): Promise<void> {
    await this.page.route(urlPattern, (route) => {
      route.fulfill({
        status: response.status || 200,
        contentType: 'application/json',
        headers: response.headers,
        body: JSON.stringify(response.body),
      });
    });
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(options?: { timeout?: number }): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: options?.timeout || 30000 });
  }

  /**
   * Select from dropdown
   */
  async selectOption(selector: string, value: string | { label?: string; value?: string; index?: number }): Promise<void> {
    if (typeof value === 'string') {
      await this.page.selectOption(selector, value);
    } else if (value.label) {
      await this.page.selectOption(selector, { label: value.label });
    } else if (value.value) {
      await this.page.selectOption(selector, { value: value.value });
    } else if (value.index !== undefined) {
      await this.page.selectOption(selector, { index: value.index });
    }
  }

  /**
   * Upload file
   */
  async uploadFile(selector: string, filePath: string | string[]): Promise<void> {
    const fileInput = this.page.locator(selector);
    await fileInput.setInputFiles(filePath);
  }

  /**
   * Hover over element
   */
  async hover(selector: string): Promise<void> {
    await this.page.locator(selector).hover();
  }

  /**
   * Double click element
   */
  async doubleClick(selector: string): Promise<void> {
    await this.page.locator(selector).dblclick();
  }

  /**
   * Press key
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Type text with delay (for simulating human typing)
   */
  async typeText(selector: string, text: string, options?: { delay?: number }): Promise<void> {
    await this.page.locator(selector).type(text, { delay: options?.delay || 50 });
  }

  /**
   * Wait for URL to match pattern
   */
  async waitForURL(urlPattern: string | RegExp, options?: { timeout?: number }): Promise<void> {
    await this.page.waitForURL(urlPattern, { timeout: options?.timeout || 10000 });
  }

  /**
   * Get current URL
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * Go back in browser history
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
  }

  /**
   * Go forward in browser history
   */
  async goForward(): Promise<void> {
    await this.page.goForward();
  }

  /**
   * Reload page
   */
  async reload(options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<void> {
    await this.page.reload({ waitUntil: options?.waitUntil || 'domcontentloaded' });
  }

  /**
   * Get element count
   */
  async getElementCount(selector: string): Promise<number> {
    return await this.page.locator(selector).count();
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    try {
      return await this.page.locator(selector).isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  /**
   * Check if element is enabled
   */
  async isEnabled(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isEnabled();
  }

  /**
   * Check if checkbox/radio is checked
   */
  async isChecked(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isChecked();
  }

  /**
   * Get attribute value
   */
  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return await this.page.locator(selector).getAttribute(attribute);
  }

  /**
   * Execute JavaScript in page context
   */
  async evaluate<R>(pageFunction: (() => R) | string): Promise<R> {
    return await this.page.evaluate(pageFunction);
  }

  /**
   * Mobile-specific: Tap on element
   */
  async tap(selector: string): Promise<void> {
    await this.page.locator(selector).tap();
  }

  /**
   * Mobile-specific: Swipe gesture
   */
  async swipe(direction: 'up' | 'down' | 'left' | 'right', options?: { distance?: number }): Promise<void> {
    const viewport = this.page.viewportSize();
    if (!viewport) throw new Error('No viewport set');

    const distance = options?.distance || 200;

    let startX = viewport.width / 2;
    let startY = viewport.height / 2;
    let endX = startX;
    let endY = startY;

    switch (direction) {
      case 'up':
        startY = viewport.height - 100;
        endY = startY - distance;
        break;
      case 'down':
        startY = 100;
        endY = startY + distance;
        break;
      case 'left':
        startX = viewport.width - 100;
        endX = startX - distance;
        break;
      case 'right':
        startX = 100;
        endX = startX + distance;
        break;
    }

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, endY);
    await this.page.mouse.up();
  }

  /**
   * Wait for specific timeout
   */
  async wait(milliseconds: number): Promise<void> {
    await this.page.waitForTimeout(milliseconds);
  }

  /**
   * Clear local storage
   */
  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => localStorage.clear());
  }

  /**
   * Clear session storage
   */
  async clearSessionStorage(): Promise<void> {
    await this.page.evaluate(() => sessionStorage.clear());
  }

  /**
   * Set local storage item
   */
  async setLocalStorage(key: string, value: string): Promise<void> {
    await this.page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key, value }
    );
  }

  /**
   * Get local storage item
   */
  async getLocalStorage(key: string): Promise<string | null> {
    return await this.page.evaluate(
      (key) => localStorage.getItem(key),
      key
    );
  }
}
