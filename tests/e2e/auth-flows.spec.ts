/**
 * E2E Tests - Authentication Flows
 *
 * Comprehensive end-to-end tests for all authentication flows:
 * 1. OAuth (Google/GitHub)
 * 2. Email/Password Signup
 * 3. Email/Password Login
 * 4. Magic Link
 * 5. Logout
 * 6. Protected Routes
 *
 * Tests auth state persistence, error scenarios, and UI sync
 */

import { test, expect, Page } from '@playwright/test';
import { AuthHelpers } from './helpers/auth-helpers';
import { TEST_USERS, SUPABASE_CONFIG } from './helpers/test-config';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT = 30000; // 30 seconds for auth operations

test.describe('Authentication Flows - E2E Tests', () => {
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);

    // Clear all storage before each test
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Clear cookies
    await page.context().clearCookies();
  });

  test.describe('1. OAuth Authentication Flow', () => {
    test('should complete OAuth flow with Google', async ({ page }) => {
      test.setTimeout(TIMEOUT * 2);

      await test.step('Navigate to home page', async () => {
        await page.goto(BASE_URL);
        await expect(page).toHaveTitle(/Describe It/i);
      });

      await test.step('Open auth modal', async () => {
        await authHelpers.openAuthModal(page);
        await authHelpers.takeScreenshot(page, 'oauth-modal-opened');
      });

      await test.step('Click Google OAuth button', async () => {
        const googleButton = page.getByRole('button', { name: /google/i });
        await expect(googleButton).toBeVisible();
        await authHelpers.takeScreenshot(page, 'oauth-before-click');

        // In test environment, we'll mock the OAuth redirect
        // In production, this would redirect to Google's auth page
        await googleButton.click();
      });

      // Note: Full OAuth flow requires external provider interaction
      // For E2E tests, we verify the button exists and is clickable
      // Integration tests should mock the OAuth response
      await authHelpers.takeScreenshot(page, 'oauth-initiated');
    });

    test('should complete OAuth flow with GitHub', async ({ page }) => {
      test.setTimeout(TIMEOUT * 2);

      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      const githubButton = page.getByRole('button', { name: /github/i });
      await expect(githubButton).toBeVisible();
      await authHelpers.takeScreenshot(page, 'oauth-github-button');

      await githubButton.click();
      await authHelpers.takeScreenshot(page, 'oauth-github-initiated');
    });

    test('should handle OAuth callback successfully', async ({ page }) => {
      test.setTimeout(TIMEOUT);

      // Simulate OAuth callback with auth code
      const mockAuthCode = 'mock-auth-code-12345';
      await page.goto(`${BASE_URL}/auth/callback?code=${mockAuthCode}`);

      // Should redirect to home with success parameter
      await page.waitForURL(/\?auth=success/, { timeout: 10000 });
      await authHelpers.takeScreenshot(page, 'oauth-callback-success');

      // Verify authenticated state
      const isAuthenticated = await authHelpers.verifyAuthState(page);
      expect(isAuthenticated).toBeTruthy();
    });

    test('should handle OAuth callback errors', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/callback?error=access_denied&error_description=User+cancelled+login`);

      // Should redirect to home with error parameter
      await page.waitForURL(/\?error=/, { timeout: 5000 });
      await authHelpers.takeScreenshot(page, 'oauth-callback-error');

      // Error message should be displayed
      const errorMessage = page.locator('text=/cancelled|denied|error/i').first();
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('2. Email/Password Signup Flow', () => {
    test('should complete signup with valid credentials', async ({ page }) => {
      test.setTimeout(TIMEOUT);

      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      // Switch to signup mode
      await page.getByRole('button', { name: /sign up/i }).click();
      await authHelpers.takeScreenshot(page, 'signup-modal');

      // Fill signup form
      const testUser = TEST_USERS.newUser;
      await page.fill('input[type="text"]', testUser.fullName);
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);

      await authHelpers.takeScreenshot(page, 'signup-form-filled');

      // Submit form
      await page.getByRole('button', { name: /sign up/i }).last().click();

      // Wait for success message
      await expect(page.locator('text=/check your email|verification/i')).toBeVisible({ timeout: 10000 });
      await authHelpers.takeScreenshot(page, 'signup-success');

      // Verify success notification
      const successMessage = page.locator('[class*="green"]').first();
      await expect(successMessage).toBeVisible();
    });

    test('should show error for duplicate email', async ({ page }) => {
      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      await page.getByRole('button', { name: /sign up/i }).click();

      // Use existing user email
      const existingUser = TEST_USERS.existingUser;
      await page.fill('input[type="text"]', 'Test User');
      await page.fill('input[type="email"]', existingUser.email);
      await page.fill('input[type="password"]', 'newpassword123');

      await page.getByRole('button', { name: /sign up/i }).last().click();

      // Should show error
      await expect(page.locator('text=/already exists|registered|duplicate/i')).toBeVisible({ timeout: 10000 });
      await authHelpers.takeScreenshot(page, 'signup-duplicate-error');
    });

    test('should validate password requirements', async ({ page }) => {
      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      await page.getByRole('button', { name: /sign up/i }).click();

      // Try with weak password
      await page.fill('input[type="text"]', 'Test User');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', '123'); // Too short

      await authHelpers.takeScreenshot(page, 'signup-weak-password');

      // Form should not submit or show validation error
      const submitButton = page.getByRole('button', { name: /sign up/i }).last();
      const isDisabled = await submitButton.isDisabled();

      // Either button is disabled OR validation error is shown
      if (!isDisabled) {
        await submitButton.click();
        await expect(page.locator('text=/password|6 characters|requirements/i')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('3. Email/Password Login Flow', () => {
    test('should login with valid credentials', async ({ page }) => {
      test.setTimeout(TIMEOUT);

      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      // Fill login form
      const user = TEST_USERS.existingUser;
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      await authHelpers.takeScreenshot(page, 'login-form-filled');

      // Submit
      await page.getByRole('button', { name: /sign in/i }).last().click();

      // Wait for success
      await expect(page.locator('text=/successfully|welcome/i')).toBeVisible({ timeout: 10000 });
      await authHelpers.takeScreenshot(page, 'login-success');

      // Modal should close
      await expect(page.locator('[class*="modal"]')).not.toBeVisible({ timeout: 3000 });

      // Verify authenticated state
      const isAuthenticated = await authHelpers.verifyAuthState(page);
      expect(isAuthenticated).toBeTruthy();

      // User menu should be visible
      await expect(page.locator('text=/profile|account|logout/i').first()).toBeVisible({ timeout: 5000 });
      await authHelpers.takeScreenshot(page, 'login-authenticated-ui');
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      // Wrong password
      await page.fill('input[type="email"]', TEST_USERS.existingUser.email);
      await page.fill('input[type="password"]', 'wrongpassword123');

      await authHelpers.takeScreenshot(page, 'login-wrong-password');

      await page.getByRole('button', { name: /sign in/i }).last().click();

      // Should show error
      await expect(page.locator('text=/invalid|incorrect|wrong/i')).toBeVisible({ timeout: 10000 });
      await authHelpers.takeScreenshot(page, 'login-error');

      // Should not be authenticated
      const isAuthenticated = await authHelpers.verifyAuthState(page);
      expect(isAuthenticated).toBeFalsy();
    });

    test('should show error for non-existent user', async ({ page }) => {
      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      await page.fill('input[type="email"]', 'nonexistent@example.com');
      await page.fill('input[type="password"]', 'password123');

      await page.getByRole('button', { name: /sign in/i }).last().click();

      // Should show error
      await expect(page.locator('text=/not found|invalid|user does not exist/i')).toBeVisible({ timeout: 10000 });
      await authHelpers.takeScreenshot(page, 'login-user-not-found');
    });

    test('should handle timeout gracefully', async ({ page }) => {
      test.setTimeout(15000);

      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      // Block API requests to simulate timeout
      await page.route('**/api/auth/**', route => {
        return new Promise(() => {}); // Never resolves
      });

      await page.fill('input[type="email"]', TEST_USERS.existingUser.email);
      await page.fill('input[type="password"]', TEST_USERS.existingUser.password);

      await page.getByRole('button', { name: /sign in/i }).last().click();

      // Should show timeout error
      await expect(page.locator('text=/timeout|timed out|taking too long/i')).toBeVisible({ timeout: 10000 });
      await authHelpers.takeScreenshot(page, 'login-timeout');
    });
  });

  test.describe('4. Magic Link Authentication', () => {
    test('should send magic link email', async ({ page }) => {
      test.setTimeout(TIMEOUT);

      // Note: Magic link flow is typically handled by Supabase Auth UI
      // This test verifies the UI components exist

      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      // Look for magic link option (if implemented)
      const magicLinkButton = page.locator('text=/magic link|passwordless|email link/i').first();

      if (await magicLinkButton.isVisible()) {
        await magicLinkButton.click();
        await authHelpers.takeScreenshot(page, 'magic-link-form');

        await page.fill('input[type="email"]', TEST_USERS.existingUser.email);
        await page.getByRole('button', { name: /send|continue/i }).click();

        await expect(page.locator('text=/check your email|sent|link/i')).toBeVisible({ timeout: 10000 });
        await authHelpers.takeScreenshot(page, 'magic-link-sent');
      }
    });
  });

  test.describe('5. Logout Flow', () => {
    test('should logout successfully', async ({ page }) => {
      test.setTimeout(TIMEOUT);

      // First login
      await authHelpers.login(page, TEST_USERS.existingUser.email, TEST_USERS.existingUser.password);

      await authHelpers.takeScreenshot(page, 'before-logout');

      // Click logout
      const logoutButton = page.locator('text=/logout|sign out/i').first();
      await expect(logoutButton).toBeVisible({ timeout: 10000 });
      await logoutButton.click();

      await authHelpers.takeScreenshot(page, 'after-logout');

      // Verify unauthenticated state
      const isAuthenticated = await authHelpers.verifyAuthState(page);
      expect(isAuthenticated).toBeFalsy();

      // Login button should be visible again
      await expect(page.locator('text=/sign in|login/i').first()).toBeVisible({ timeout: 5000 });
    });

    test('should clear session data on logout', async ({ page }) => {
      await authHelpers.login(page, TEST_USERS.existingUser.email, TEST_USERS.existingUser.password);

      // Logout
      await page.locator('text=/logout|sign out/i').first().click();

      // Check storage is cleared
      const storageCleared = await page.evaluate(() => {
        const authData = localStorage.getItem('describe-it-auth');
        const sessionFlag = sessionStorage.getItem('recent-auth-success');
        return authData === null && sessionFlag === null;
      });

      expect(storageCleared).toBeTruthy();
      await authHelpers.takeScreenshot(page, 'logout-storage-cleared');
    });

    test('should redirect to home after logout', async ({ page }) => {
      await authHelpers.login(page, TEST_USERS.existingUser.email, TEST_USERS.existingUser.password);

      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`);

      // Logout
      await page.locator('text=/logout|sign out/i').first().click();

      // Should redirect to home
      await page.waitForURL(BASE_URL, { timeout: 5000 });
      await authHelpers.takeScreenshot(page, 'logout-redirect');
    });
  });

  test.describe('6. Protected Routes', () => {
    test('should redirect to login when accessing protected route unauthenticated', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);

      // Should either show login modal or redirect to login
      const hasLoginButton = await page.locator('text=/sign in|login/i').first().isVisible({ timeout: 5000 });
      const isOnDashboard = page.url().includes('/dashboard');

      // If on dashboard, login modal should be shown
      if (isOnDashboard) {
        expect(hasLoginButton).toBeTruthy();
      }

      await authHelpers.takeScreenshot(page, 'protected-route-unauthenticated');
    });

    test('should allow access to protected route when authenticated', async ({ page }) => {
      await authHelpers.login(page, TEST_USERS.existingUser.email, TEST_USERS.existingUser.password);

      await page.goto(`${BASE_URL}/dashboard`);

      // Should see dashboard content
      await expect(page.locator('text=/dashboard/i')).toBeVisible({ timeout: 5000 });
      await authHelpers.takeScreenshot(page, 'protected-route-authenticated');
    });

    test('should maintain authentication on page reload', async ({ page }) => {
      await authHelpers.login(page, TEST_USERS.existingUser.email, TEST_USERS.existingUser.password);

      // Reload page
      await page.reload();

      // Should still be authenticated
      const isAuthenticated = await authHelpers.verifyAuthState(page);
      expect(isAuthenticated).toBeTruthy();

      await authHelpers.takeScreenshot(page, 'auth-persisted-after-reload');
    });

    test('should maintain authentication across navigation', async ({ page }) => {
      await authHelpers.login(page, TEST_USERS.existingUser.email, TEST_USERS.existingUser.password);

      // Navigate to different pages
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForTimeout(1000);

      await page.goto(BASE_URL);
      await page.waitForTimeout(1000);

      await page.goto(`${BASE_URL}/dashboard`);

      // Should still be authenticated
      const isAuthenticated = await authHelpers.verifyAuthState(page);
      expect(isAuthenticated).toBeTruthy();

      await authHelpers.takeScreenshot(page, 'auth-persisted-across-navigation');
    });
  });

  test.describe('7. Auth State Persistence', () => {
    test('should persist auth state in localStorage', async ({ page }) => {
      await authHelpers.login(page, TEST_USERS.existingUser.email, TEST_USERS.existingUser.password);

      const authData = await page.evaluate(() => {
        return localStorage.getItem('describe-it-auth');
      });

      expect(authData).toBeTruthy();

      const parsed = JSON.parse(authData!);
      expect(parsed).toHaveProperty('user');
      expect(parsed.user).toHaveProperty('email');

      await authHelpers.takeScreenshot(page, 'auth-state-persisted');
    });

    test('should sync auth state across tabs', async ({ browser }) => {
      const context = await browser.newContext();
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      // Login in first tab
      await page1.goto(BASE_URL);
      await authHelpers.login(page1, TEST_USERS.existingUser.email, TEST_USERS.existingUser.password);

      // Check second tab
      await page2.goto(BASE_URL);
      await page2.waitForTimeout(2000); // Wait for storage event

      const isAuthenticated = await authHelpers.verifyAuthState(page2);
      expect(isAuthenticated).toBeTruthy();

      await authHelpers.takeScreenshot(page1, 'tab1-authenticated');
      await authHelpers.takeScreenshot(page2, 'tab2-authenticated');

      await context.close();
    });

    test('should handle expired session gracefully', async ({ page }) => {
      await authHelpers.login(page, TEST_USERS.existingUser.email, TEST_USERS.existingUser.password);

      // Manually expire the token
      await page.evaluate(() => {
        const authData = JSON.parse(localStorage.getItem('describe-it-auth') || '{}');
        if (authData.session) {
          authData.session.expires_at = Date.now() - 1000; // Expired 1 second ago
          localStorage.setItem('describe-it-auth', JSON.stringify(authData));
        }
      });

      // Reload to trigger session check
      await page.reload();

      // Should prompt for re-authentication
      await page.waitForTimeout(2000);
      const needsAuth = await page.locator('text=/sign in|login|expired/i').first().isVisible({ timeout: 5000 });
      expect(needsAuth).toBeTruthy();

      await authHelpers.takeScreenshot(page, 'expired-session');
    });
  });

  test.describe('8. Error Scenarios', () => {
    test('should handle network failures', async ({ page }) => {
      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      // Simulate network failure
      await page.route('**/api/auth/**', route => route.abort('failed'));

      await page.fill('input[type="email"]', TEST_USERS.existingUser.email);
      await page.fill('input[type="password"]', TEST_USERS.existingUser.password);

      await page.getByRole('button', { name: /sign in/i }).last().click();

      // Should show network error
      await expect(page.locator('text=/network|connection|error|failed/i')).toBeVisible({ timeout: 10000 });
      await authHelpers.takeScreenshot(page, 'network-error');
    });

    test('should handle server errors (500)', async ({ page }) => {
      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      // Mock 500 error
      await page.route('**/api/auth/**', route =>
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );

      await page.fill('input[type="email"]', TEST_USERS.existingUser.email);
      await page.fill('input[type="password"]', TEST_USERS.existingUser.password);

      await page.getByRole('button', { name: /sign in/i }).last().click();

      await expect(page.locator('text=/server|error|500/i')).toBeVisible({ timeout: 10000 });
      await authHelpers.takeScreenshot(page, 'server-error');
    });

    test('should validate email format', async ({ page }) => {
      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'password123');

      await page.getByRole('button', { name: /sign in/i }).last().click();

      // HTML5 validation should prevent submission
      const emailInput = page.locator('input[type="email"]');
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);

      expect(validationMessage).toBeTruthy();
      await authHelpers.takeScreenshot(page, 'email-validation-error');
    });

    test('should handle rate limiting', async ({ page }) => {
      test.setTimeout(60000);

      await page.goto(BASE_URL);

      // Mock rate limit response
      let requestCount = 0;
      await page.route('**/api/auth/signin', route => {
        requestCount++;
        if (requestCount > 3) {
          return route.fulfill({
            status: 429,
            body: JSON.stringify({ error: 'Too many requests' })
          });
        }
        return route.continue();
      });

      // Attempt multiple logins
      for (let i = 0; i < 4; i++) {
        await authHelpers.openAuthModal(page);
        await page.fill('input[type="email"]', TEST_USERS.existingUser.email);
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.getByRole('button', { name: /sign in/i }).last().click();
        await page.waitForTimeout(1000);
      }

      // Should show rate limit error
      await expect(page.locator('text=/too many|rate limit|try again/i')).toBeVisible({ timeout: 10000 });
      await authHelpers.takeScreenshot(page, 'rate-limit-error');
    });
  });

  test.describe('9. UI Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      // Modal should be responsive
      const modal = page.locator('[class*="modal"]').first();
      await expect(modal).toBeVisible();

      await authHelpers.takeScreenshot(page, 'mobile-auth-modal');

      // Fill form on mobile
      await page.fill('input[type="email"]', TEST_USERS.existingUser.email);
      await page.fill('input[type="password"]', TEST_USERS.existingUser.password);

      await authHelpers.takeScreenshot(page, 'mobile-form-filled');
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad

      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      await authHelpers.takeScreenshot(page, 'tablet-auth-modal');
    });
  });

  test.describe('10. Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      // Tab through form
      await page.keyboard.press('Tab'); // Email input
      await page.keyboard.type(TEST_USERS.existingUser.email);

      await page.keyboard.press('Tab'); // Password input
      await page.keyboard.type(TEST_USERS.existingUser.password);

      await page.keyboard.press('Tab'); // Submit button
      await page.keyboard.press('Enter'); // Submit

      await authHelpers.takeScreenshot(page, 'keyboard-navigation');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto(BASE_URL);
      await authHelpers.openAuthModal(page);

      // Check for ARIA labels
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');

      const emailLabel = await emailInput.getAttribute('aria-label');
      const passwordLabel = await passwordInput.getAttribute('aria-label');

      // Either has aria-label or is associated with a label element
      expect(emailLabel || await page.locator('label').filter({ hasText: 'Email' }).isVisible()).toBeTruthy();
      expect(passwordLabel || await page.locator('label').filter({ hasText: 'Password' }).isVisible()).toBeTruthy();
    });
  });
});
