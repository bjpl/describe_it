/**
 * Home Page Object
 *
 * Represents the landing/home page of the application
 */

import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  // Selectors
  private readonly selectors = {
    authButton: '[data-testid="auth-button"], button:has-text("Sign In"), button:has-text("Get Started")',
    heroTitle: 'h1, [data-testid="hero-title"]',
    heroSubtitle: '[data-testid="hero-subtitle"]',
    featuresSection: '[data-testid="features-section"]',
    getStartedButton: '[data-testid="get-started-button"], button:has-text("Get Started")',
    learnMoreButton: '[data-testid="learn-more-button"], button:has-text("Learn More")',
    navigation: '[data-testid="navigation"], nav',
    footer: '[data-testid="footer"], footer',
    logo: '[data-testid="logo"]',
  };

  /**
   * Navigate to home page
   */
  async navigate(): Promise<void> {
    await this.goto('/');
    await this.waitForElement(this.selectors.heroTitle);
  }

  /**
   * Click authentication button to open modal
   */
  async clickAuthButton(): Promise<void> {
    await this.clickWithRetry(this.selectors.authButton);
    await this.wait(500); // Allow modal animation
  }

  /**
   * Click Get Started button
   */
  async clickGetStarted(): Promise<void> {
    await this.clickWithRetry(this.selectors.getStartedButton);
  }

  /**
   * Click Learn More button
   */
  async clickLearnMore(): Promise<void> {
    await this.scrollIntoView(this.selectors.learnMoreButton);
    await this.clickWithRetry(this.selectors.learnMoreButton);
  }

  /**
   * Get hero title text
   */
  async getHeroTitle(): Promise<string> {
    return await this.getText(this.selectors.heroTitle);
  }

  /**
   * Get hero subtitle text
   */
  async getHeroSubtitle(): Promise<string> {
    return await this.getText(this.selectors.heroSubtitle);
  }

  /**
   * Verify page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.page.locator(this.selectors.heroTitle)).toBeVisible();
    await expect(this.page.locator(this.selectors.navigation)).toBeVisible();
  }

  /**
   * Verify features section is visible
   */
  async verifyFeaturesVisible(): Promise<void> {
    await this.scrollIntoView(this.selectors.featuresSection);
    await expect(this.page.locator(this.selectors.featuresSection)).toBeVisible();
  }

  /**
   * Navigate to specific section via navigation
   */
  async navigateTo(section: 'vocabulary' | 'progress' | 'settings'): Promise<void> {
    const navLink = this.page.locator(`nav a:has-text("${section}")`).first();
    await navLink.click();
  }

  /**
   * Check if user is authenticated (user menu visible)
   */
  async isAuthenticated(): Promise<boolean> {
    return await this.exists('[data-testid="user-menu"]');
  }

  /**
   * Verify home page elements for smoke test
   * @smoke
   */
  async verifySmokeTest(): Promise<void> {
    await this.verifyPageLoaded();

    // Check critical elements
    const criticalElements = [
      this.selectors.logo,
      this.selectors.authButton,
      this.selectors.heroTitle,
      this.selectors.navigation,
    ];

    for (const selector of criticalElements) {
      const exists = await this.exists(selector);
      expect(exists).toBeTruthy();
    }
  }
}
