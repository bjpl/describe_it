/**
 * Authentication E2E Test Helpers
 *
 * Utilities for authentication testing:
 * - Login/logout helpers
 * - Auth state verification
 * - Screenshot utilities
 * - Wait helpers
 */

import { Page, expect } from '@playwright/test';
import path from 'path';

export class AuthHelpers {
  private screenshotCounter = 0;

  constructor(private page: Page) {}

  /**
   * Open the authentication modal
   */
  async openAuthModal(page: Page): Promise<void> {
    // Look for login/signin button
    const loginButton = page.locator('text=/sign in|login|get started/i').first();
    await expect(loginButton).toBeVisible({ timeout: 10000 });
    await loginButton.click();

    // Wait for modal to appear
    await page.waitForSelector('[class*="modal"]', { timeout: 5000 });
  }

  /**
   * Login with email and password
   */
  async login(page: Page, email: string, password: string): Promise<void> {
    await page.goto('/');
    await this.openAuthModal(page);

    // Fill form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    // Submit
    await page.getByRole('button', { name: /sign in/i }).last().click();

    // Wait for success
    await page.waitForTimeout(2000); // Allow time for auth to complete

    // Verify modal closed
    await expect(page.locator('[class*="modal"]')).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Logout
   */
  async logout(page: Page): Promise<void> {
    const logoutButton = page.locator('text=/logout|sign out/i').first();
    await expect(logoutButton).toBeVisible({ timeout: 10000 });
    await logoutButton.click();

    // Wait for logout to complete
    await page.waitForTimeout(1000);
  }

  /**
   * Verify authentication state
   */
  async verifyAuthState(page: Page): Promise<boolean> {
    const authData = await page.evaluate(() => {
      const data = localStorage.getItem('describe-it-auth');
      return data ? JSON.parse(data) : null;
    });

    if (!authData) return false;

    // Check for user and session
    const hasUser = authData.user && authData.user.email;
    const hasSession = authData.session && authData.session.access_token;

    return !!(hasUser || hasSession);
  }

  /**
   * Take screenshot with descriptive name
   */
  async takeScreenshot(page: Page, name: string): Promise<void> {
    this.screenshotCounter++;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${this.screenshotCounter.toString().padStart(2, '0')}-${name}-${timestamp}.png`;

    await page.screenshot({
      path: path.join('tests', 'e2e', 'screenshots', filename),
      fullPage: true
    });
  }

  /**
   * Wait for auth state change event
   */
  async waitForAuthStateChange(page: Page, timeout = 5000): Promise<void> {
    await page.evaluate((timeoutMs) => {
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          window.removeEventListener('auth-state-changed', handler);
          reject(new Error('Timeout waiting for auth state change'));
        }, timeoutMs);

        const handler = () => {
          clearTimeout(timer);
          window.removeEventListener('auth-state-changed', handler);
          resolve();
        };

        window.addEventListener('auth-state-changed', handler);
      });
    }, timeout);
  }

  /**
   * Get authentication cookies
   */
  async getAuthCookies(page: Page): Promise<any[]> {
    const cookies = await page.context().cookies();
    return cookies.filter(cookie =>
      cookie.name.includes('sb-') ||
      cookie.name.includes('auth') ||
      cookie.name.includes('session')
    );
  }

  /**
   * Clear authentication data
   */
  async clearAuthData(page: Page): Promise<void> {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.context().clearCookies();
  }

  /**
   * Mock Supabase auth response
   */
  async mockAuthResponse(page: Page, success: boolean, userData?: any): Promise<void> {
    await page.route('**/api/auth/**', async route => {
      if (success) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            user: userData || {
              id: 'mock-user-id',
              email: 'test@example.com',
              user_metadata: { full_name: 'Test User' }
            },
            session: {
              access_token: 'mock-access-token',
              refresh_token: 'mock-refresh-token',
              expires_at: Date.now() + 3600000
            }
          })
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Invalid credentials'
          })
        });
      }
    });
  }

  /**
   * Wait for element with custom timeout
   */
  async waitForElement(page: Page, selector: string, timeout = 10000): Promise<void> {
    await page.waitForSelector(selector, { timeout });
  }

  /**
   * Check if user menu is visible (authenticated state indicator)
   */
  async isUserMenuVisible(page: Page): Promise<boolean> {
    try {
      const userMenu = page.locator('text=/profile|account|logout|dashboard/i').first();
      return await userMenu.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  /**
   * Fill signup form
   */
  async fillSignupForm(page: Page, fullName: string, email: string, password: string): Promise<void> {
    await page.fill('input[type="text"]', fullName);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
  }

  /**
   * Fill login form
   */
  async fillLoginForm(page: Page, email: string, password: string): Promise<void> {
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
  }

  /**
   * Switch between signin and signup modes
   */
  async switchAuthMode(page: Page, mode: 'signin' | 'signup'): Promise<void> {
    const buttonText = mode === 'signup' ? /sign up/i : /sign in/i;
    const switchButton = page.getByRole('button', { name: buttonText });

    // Only click if we need to switch
    const isVisible = await switchButton.isVisible();
    if (isVisible) {
      await switchButton.click();
      await page.waitForTimeout(500); // Allow mode switch animation
    }
  }

  /**
   * Get error message from modal
   */
  async getErrorMessage(page: Page): Promise<string | null> {
    try {
      const errorElement = page.locator('[class*="red"]').first();
      const isVisible = await errorElement.isVisible({ timeout: 2000 });
      if (isVisible) {
        return await errorElement.textContent();
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Get success message from modal
   */
  async getSuccessMessage(page: Page): Promise<string | null> {
    try {
      const successElement = page.locator('[class*="green"]').first();
      const isVisible = await successElement.isVisible({ timeout: 2000 });
      if (isVisible) {
        return await successElement.textContent();
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Wait for modal to close
   */
  async waitForModalClose(page: Page, timeout = 5000): Promise<void> {
    await expect(page.locator('[class*="modal"]')).not.toBeVisible({ timeout });
  }

  /**
   * Check if submit button is loading
   */
  async isSubmitButtonLoading(page: Page): Promise<boolean> {
    try {
      const loadingIndicator = page.locator('svg.animate-spin');
      return await loadingIndicator.isVisible({ timeout: 1000 });
    } catch {
      return false;
    }
  }
}
