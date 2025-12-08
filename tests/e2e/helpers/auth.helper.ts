/**
 * Authentication Helper
 *
 * Provides authentication utilities for E2E tests:
 * - User signup/signin
 * - Session management
 * - Auth state verification
 * - Fast authentication via API
 */

import { Page, BrowserContext } from '@playwright/test';

export interface UserCredentials {
  email: string;
  password: string;
  fullName?: string;
}

export class AuthHelper {
  constructor(
    private page: Page,
    private baseUrl: string = process.env.BASE_URL || 'http://localhost:3000'
  ) {}

  /**
   * Sign up new user via UI
   */
  async signUpViaUI(credentials: UserCredentials): Promise<void> {
    await this.page.goto(this.baseUrl);

    // Open auth modal
    const authButton = this.page.locator('[data-testid="auth-button"], button:has-text("Sign In")').first();
    await authButton.click();

    // Switch to signup
    const signUpTab = this.page.locator('[data-testid="signup-tab"], button:has-text("Sign Up")').first();
    const exists = await signUpTab.isVisible().catch(() => false);
    if (exists) {
      await signUpTab.click();
      await this.page.waitForTimeout(300);
    }

    // Fill form
    if (credentials.fullName) {
      const fullNameInput = this.page.locator('input[type="text"]').first();
      const visible = await fullNameInput.isVisible().catch(() => false);
      if (visible) {
        await fullNameInput.fill(credentials.fullName);
      }
    }

    await this.page.fill('input[type="email"]', credentials.email);
    await this.page.fill('input[type="password"]', credentials.password);

    // Submit
    const signUpButton = this.page.locator('[data-testid="signup-button"], button:has-text("Sign Up"):not([data-testid*="tab"])').first();
    await signUpButton.click();

    // Wait for success
    await this.page.waitForTimeout(2000);
  }

  /**
   * Sign in existing user via UI
   */
  async signInViaUI(credentials: UserCredentials): Promise<void> {
    await this.page.goto(this.baseUrl);

    // Open auth modal
    const authButton = this.page.locator('[data-testid="auth-button"], button:has-text("Sign In")').first();
    await authButton.click();

    // Fill form
    await this.page.fill('input[type="email"]', credentials.email);
    await this.page.fill('input[type="password"]', credentials.password);

    // Submit
    const signInButton = this.page.locator('[data-testid="signin-button"], button:has-text("Sign In"):not([data-testid*="tab"])').first();
    await signInButton.click();

    // Wait for auth to complete
    await this.page.waitForTimeout(2000);
  }

  /**
   * Sign in via API (faster for test setup)
   */
  async signInViaAPI(credentials: UserCredentials): Promise<void> {
    const response = await this.page.request.post(`${this.baseUrl}/api/auth/signin`, {
      data: {
        email: credentials.email,
        password: credentials.password,
      },
    });

    if (!response.ok()) {
      throw new Error(`Authentication failed: ${response.status()} ${await response.text()}`);
    }

    // Cookies are automatically set by Playwright
    await this.page.goto(`${this.baseUrl}/dashboard`);
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    // Look for user menu or logout button
    const userMenu = this.page.locator('[data-testid="user-menu"]').first();
    const userMenuExists = await userMenu.isVisible().catch(() => false);

    if (userMenuExists) {
      await userMenu.click();
      await this.page.waitForTimeout(300);
    }

    const logoutButton = this.page.locator('[data-testid="signout-button"], button:has-text("Sign Out"), button:has-text("Logout")').first();
    await logoutButton.click();

    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    // Check for user menu presence
    const userMenu = this.page.locator('[data-testid="user-menu"]');
    return await userMenu.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Get authentication state from local storage
   */
  async getAuthState(): Promise<any> {
    return await this.page.evaluate(() => {
      const authData = localStorage.getItem('describe-it-auth');
      return authData ? JSON.parse(authData) : null;
    });
  }

  /**
   * Set authentication state in local storage
   */
  async setAuthState(authData: any): Promise<void> {
    await this.page.evaluate(
      (data) => {
        localStorage.setItem('describe-it-auth', JSON.stringify(data));
      },
      authData
    );
  }

  /**
   * Clear authentication data
   */
  async clearAuthData(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await this.page.context().clearCookies();
  }

  /**
   * Create test user with unique credentials
   */
  static createTestUser(prefix: string = 'test'): UserCredentials {
    const timestamp = Date.now();
    return {
      email: `${prefix}-${timestamp}@example.com`,
      password: 'TestPassword123!',
      fullName: `Test User ${timestamp}`,
    };
  }

  /**
   * Setup authenticated session (for test fixtures)
   */
  static async setupAuthenticatedSession(
    page: Page,
    credentials: UserCredentials,
    baseUrl: string = process.env.BASE_URL || 'http://localhost:3000'
  ): Promise<void> {
    const helper = new AuthHelper(page, baseUrl);
    await helper.signInViaAPI(credentials);
  }

  /**
   * Save authentication state to file
   */
  static async saveAuthState(context: BrowserContext, path: string): Promise<void> {
    await context.storageState({ path });
  }

  /**
   * Wait for authentication to complete
   */
  async waitForAuthComplete(timeout: number = 10000): Promise<void> {
    // Wait for either modal to close or dashboard to load
    await Promise.race([
      this.page.waitForURL('**/dashboard', { timeout }),
      this.page.waitForSelector('[data-testid="user-menu"]', { timeout }),
    ]);
  }

  /**
   * Verify user is on authenticated page
   */
  async verifyAuthenticatedPage(): Promise<void> {
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      throw new Error('User is not authenticated');
    }
  }

  /**
   * Get auth cookies
   */
  async getAuthCookies(): Promise<any[]> {
    const cookies = await this.page.context().cookies();
    return cookies.filter(cookie =>
      cookie.name.includes('sb-') ||
      cookie.name.includes('auth') ||
      cookie.name.includes('session')
    );
  }

  /**
   * Mock authentication response (for testing auth flows)
   */
  async mockAuthResponse(success: boolean, userData?: any): Promise<void> {
    await this.page.route('**/api/auth/**', async route => {
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
   * Wait for auth modal to close
   */
  async waitForModalClose(timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector('[data-testid="auth-modal"], [role="dialog"]', {
      state: 'hidden',
      timeout
    });
  }
}
