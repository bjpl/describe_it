/**
 * Image Search Page Object
 *
 * Handles image search and selection functionality
 */

import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ImageSearchPage extends BasePage {
  // Selectors
  private readonly selectors = {
    searchInput: '[data-testid="image-search-input"], input[placeholder*="search" i]',
    searchButton: '[data-testid="image-search-button"], button:has-text("Search")',
    resultsGrid: '[data-testid="image-results-grid"], [class*="grid"]',
    imageResult: '[data-testid^="image-result-"], [class*="image-result"]',
    selectedImage: '[data-testid="selected-image"], [class*="selected"]',
    selectButton: '[data-testid="select-image-button"], button:has-text("Select")',
    uploadButton: '[data-testid="upload-image-button"], button:has-text("Upload")',
    fileInput: 'input[type="file"]',
    clearButton: '[data-testid="clear-search-button"], button:has-text("Clear")',
    loadingSpinner: '[data-testid="loading-spinner"], [class*="loading"]',
    errorMessage: '[data-testid="error-message"], [class*="error"]',
    noResults: '[data-testid="no-results"], [class*="no-results"]',
    pagination: '[data-testid="pagination"]',
    nextPage: '[data-testid="next-page"], button:has-text("Next")',
    prevPage: '[data-testid="prev-page"], button:has-text("Previous")',
    imagePreview: '[data-testid="image-preview"]',
    confirmButton: '[data-testid="confirm-image"], button:has-text("Confirm")',
  };

  /**
   * Navigate to image search page
   */
  async navigate(): Promise<void> {
    await this.goto('/images/search');
    await this.waitForElement(this.selectors.searchInput);
  }

  /**
   * Search for images
   */
  async search(query: string): Promise<void> {
    await this.fillField(this.selectors.searchInput, query, { clear: true });

    const searchPromise = this.waitForAPI('/api/images/search', {
      method: 'GET',
      timeout: 15000
    }).catch(() => {
      console.log('Image search API wait timeout');
    });

    await this.clickWithRetry(this.selectors.searchButton);
    await searchPromise;

    // Wait for results to load
    await this.wait(1000);
  }

  /**
   * Get number of search results
   */
  async getResultCount(): Promise<number> {
    // Wait for either results or no-results message
    await Promise.race([
      this.waitForElement(this.selectors.resultsGrid, { timeout: 5000 }),
      this.waitForElement(this.selectors.noResults, { timeout: 5000 })
    ]).catch(() => {
      console.log('No results grid or no-results message found');
    });

    return await this.getElementCount(this.selectors.imageResult);
  }

  /**
   * Select image by index
   */
  async selectResult(index: number): Promise<void> {
    const results = await this.page.locator(this.selectors.imageResult).all();

    if (index >= results.length) {
      throw new Error(`Result index ${index} out of bounds (total: ${results.length})`);
    }

    await results[index].click();
    await this.wait(300); // Allow selection animation
  }

  /**
   * Select image by alt text or similar attribute
   */
  async selectResultByText(searchText: string): Promise<void> {
    const result = this.page.locator(`${this.selectors.imageResult}:has-text("${searchText}")`).first();
    await result.click();
    await this.wait(300);
  }

  /**
   * Confirm selected image
   */
  async confirmSelection(): Promise<void> {
    await this.clickWithRetry(this.selectors.confirmButton);
    await this.wait(500);
  }

  /**
   * Upload image from file
   */
  async uploadImage(filePath: string): Promise<void> {
    await this.uploadFile(this.selectors.fileInput, filePath);

    const uploadPromise = this.waitForAPI('/api/images/upload', {
      method: 'POST',
      timeout: 15000
    }).catch(() => {
      console.log('Image upload API wait timeout');
    });

    await uploadPromise;
    await this.wait(1000);
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    await this.clickWithRetry(this.selectors.clearButton);
    await this.wait(300);
  }

  /**
   * Go to next page of results
   */
  async goToNextPage(): Promise<void> {
    await this.clickWithRetry(this.selectors.nextPage);
    await this.waitForNetworkIdle();
  }

  /**
   * Go to previous page of results
   */
  async goToPreviousPage(): Promise<void> {
    await this.clickWithRetry(this.selectors.prevPage);
    await this.waitForNetworkIdle();
  }

  /**
   * Verify search results are displayed
   */
  async verifyResultsDisplayed(): Promise<void> {
    const count = await this.getResultCount();
    expect(count).toBeGreaterThan(0);
  }

  /**
   * Verify no results message is shown
   */
  async verifyNoResults(): Promise<void> {
    await expect(this.page.locator(this.selectors.noResults)).toBeVisible();
  }

  /**
   * Verify image is selected
   */
  async verifyImageSelected(): Promise<void> {
    await expect(this.page.locator(this.selectors.selectedImage)).toBeVisible();
  }

  /**
   * Get selected image URL or source
   */
  async getSelectedImageUrl(): Promise<string | null> {
    const selectedImage = this.page.locator(this.selectors.selectedImage).first();
    return await selectedImage.getAttribute('src');
  }

  /**
   * Wait for search to complete
   */
  async waitForSearchComplete(): Promise<void> {
    // Wait for loading spinner to disappear
    await this.page.waitForSelector(this.selectors.loadingSpinner, {
      state: 'hidden',
      timeout: 15000
    }).catch(() => {
      console.log('Loading spinner wait timeout');
    });

    await this.waitForNetworkIdle();
  }

  /**
   * Verify error message is shown
   */
  async verifyErrorShown(expectedMessage?: string): Promise<void> {
    await expect(this.page.locator(this.selectors.errorMessage)).toBeVisible();

    if (expectedMessage) {
      const message = await this.getText(this.selectors.errorMessage);
      expect(message).toContain(expectedMessage);
    }
  }

  /**
   * Get all result image URLs
   */
  async getAllResultUrls(): Promise<string[]> {
    const results = await this.page.locator(this.selectors.imageResult).all();
    const urls: string[] = [];

    for (const result of results) {
      const img = result.locator('img').first();
      const src = await img.getAttribute('src');
      if (src) urls.push(src);
    }

    return urls;
  }

  /**
   * Verify pagination is visible
   */
  async verifyPaginationVisible(): Promise<void> {
    await expect(this.page.locator(this.selectors.pagination)).toBeVisible();
  }

  /**
   * Hover over image to preview
   */
  async hoverOverResult(index: number): Promise<void> {
    const results = await this.page.locator(this.selectors.imageResult).all();
    if (index < results.length) {
      await results[index].hover();
      await this.wait(300);
    }
  }
}
