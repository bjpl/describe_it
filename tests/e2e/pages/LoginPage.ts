/**
 * Login/Authentication Page Object
 *
 * Handles authentication modal interactions for login and signup
 */

import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // Selectors
  private readonly selectors = {
    modal: '[data-testid="auth-modal"], [role="dialog"], [class*="modal"]',
    emailInput: 'input[type="email"], [data-testid="email-input"]',
    passwordInput: 'input[type="password"], [data-testid="password-input"]',
    confirmPasswordInput: '[data-testid="confirm-password-input"]',
    fullNameInput: 'input[type="text"], [data-testid="full-name-input"]',
    signInButton: '[data-testid="signin-button"], button:has-text("Sign In"):not([data-testid*="tab"])',
    signUpButton: '[data-testid="signup-button"], button:has-text("Sign Up"):not([data-testid*="tab"])',
    signInTab: '[data-testid="signin-tab"], button:has-text("Sign In")[data-testid*="tab"]',
    signUpTab: '[data-testid="signup-tab"], button:has-text("Sign Up")[data-testid*="tab"]',
    closeButton: '[data-testid="close-modal"], button[aria-label="Close"]',
    errorMessage: '[data-testid="error-message"], [class*="error"], [class*="red"]',
    successMessage: '[data-testid="success-message"], [class*="success"], [class*="green"]',
    loadingSpinner: 'svg.animate-spin, [data-testid="loading-spinner"]',
    forgotPasswordLink: 'a:has-text("Forgot Password"), [data-testid="forgot-password"]',
    socialLoginButtons: '[data-testid^="social-login-"]',
  };

  /**
   * Open authentication modal
   */
  async openModal(): Promise<void> {
    const authButton = this.page.locator('[data-testid="auth-button"], button:has-text("Sign In")').first();
    await authButton.click();
    await this.waitForElement(this.selectors.modal);
  }

  /**
   * Close authentication modal
   */
  async closeModal(): Promise<void> {
    await this.clickWithRetry(this.selectors.closeButton);
    await this.page.waitForSelector(this.selectors.modal, { state: 'hidden', timeout: 5000 });
  }

  /**
   * Switch to Sign In mode
   */
  async switchToSignIn(): Promise<void> {
    const signInTab = this.page.locator(this.selectors.signInTab);
    const isVisible = await signInTab.isVisible().catch(() => false);

    if (isVisible) {
      await signInTab.click();
      await this.wait(300); // Allow tab switch animation
    }
  }

  /**
   * Switch to Sign Up mode
   */
  async switchToSignUp(): Promise<void> {
    const signUpTab = this.page.locator(this.selectors.signUpTab);
    const isVisible = await signUpTab.isVisible().catch(() => false);

    if (isVisible) {
      await signUpTab.click();
      await this.wait(300); // Allow tab switch animation
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<void> {
    await this.switchToSignIn();

    await this.fillField(this.selectors.emailInput, email, { clear: true });
    await this.fillField(this.selectors.passwordInput, password, { clear: true });

    const responsePromise = this.waitForAPI('/api/auth/signin', {
      timeout: 10000,
      method: 'POST'
    });

    await this.clickWithRetry(this.selectors.signInButton);

    try {
      await responsePromise;
    } catch (error) {
      // Continue even if API wait fails - modal might close anyway
      console.log('Sign in API wait timeout, continuing...');
    }
  }

  /**
   * Sign up with new account
   */
  async signUp(fullName: string, email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.switchToSignUp();

    // Fill full name if field exists
    const fullNameExists = await this.exists(this.selectors.fullNameInput);
    if (fullNameExists) {
      await this.fillField(this.selectors.fullNameInput, fullName, { clear: true });
    }

    await this.fillField(this.selectors.emailInput, email, { clear: true });
    await this.fillField(this.selectors.passwordInput, password, { clear: true });

    // Fill confirm password if field exists
    const confirmPasswordExists = await this.exists(this.selectors.confirmPasswordInput);
    if (confirmPasswordExists) {
      await this.fillField(this.selectors.confirmPasswordInput, confirmPassword || password, { clear: true });
    }

    const responsePromise = this.waitForAPI('/api/auth/signup', {
      timeout: 10000,
      method: 'POST'
    });

    await this.clickWithRetry(this.selectors.signUpButton);

    try {
      await responsePromise;
    } catch (error) {
      console.log('Sign up API wait timeout, continuing...');
    }
  }

  /**
   * Get error message if present
   */
  async getErrorMessage(): Promise<string | null> {
    const exists = await this.exists(this.selectors.errorMessage);
    if (!exists) return null;

    return await this.getText(this.selectors.errorMessage);
  }

  /**
   * Get success message if present
   */
  async getSuccessMessage(): Promise<string | null> {
    const exists = await this.exists(this.selectors.successMessage);
    if (!exists) return null;

    return await this.getText(this.selectors.successMessage);
  }

  /**
   * Wait for modal to close after successful auth
   */
  async waitForModalClose(timeout = 5000): Promise<void> {
    await this.page.waitForSelector(this.selectors.modal, {
      state: 'hidden',
      timeout
    });
  }

  /**
   * Check if submit button is loading
   */
  async isLoading(): Promise<boolean> {
    return await this.exists(this.selectors.loadingSpinner, { timeout: 1000 });
  }

  /**
   * Verify modal is open
   */
  async verifyModalOpen(): Promise<void> {
    await expect(this.page.locator(this.selectors.modal)).toBeVisible();
  }

  /**
   * Verify modal is closed
   */
  async verifyModalClosed(): Promise<void> {
    await expect(this.page.locator(this.selectors.modal)).not.toBeVisible();
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword(): Promise<void> {
    await this.clickWithRetry(this.selectors.forgotPasswordLink);
  }

  /**
   * Wait for authentication to complete
   */
  async waitForAuthComplete(timeout = 10000): Promise<void> {
    // Wait for either modal to close or success message
    await Promise.race([
      this.page.waitForSelector(this.selectors.modal, { state: 'hidden', timeout }),
      this.waitForElement(this.selectors.successMessage, { timeout }),
    ]);
  }

  /**
   * Verify authentication succeeded (redirected or modal closed)
   */
  async verifyAuthSuccess(): Promise<void> {
    // Modal should be closed
    const modalVisible = await this.isVisible(this.selectors.modal);
    expect(modalVisible).toBe(false);

    // Should see user menu or be redirected
    const hasUserMenu = await this.exists('[data-testid="user-menu"]', { timeout: 5000 });
    expect(hasUserMenu).toBe(true);
  }
}
