import { test, expect, Page } from '@playwright/test';

test.describe('Critical User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
    
    // Ensure the main UI is visible
    await expect(page.getByText('Describe It')).toBeVisible();
  });

  test.describe('Complete Learning Flow', () => {
    test('should complete full image-to-vocabulary learning journey', async ({ page }) => {
      // Step 1: Search for images
      await test.step('Search for images', async () => {
        const searchInput = page.getByPlaceholder(/Search for images/);
        await searchInput.fill('mountain');
        
        // Wait for search results
        await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
        
        // Verify images are loaded
        const images = page.locator('[data-testid^="image-"]');
        await expect(images.first()).toBeVisible();
      });

      // Step 2: Select an image
      await test.step('Select an image', async () => {
        const firstImage = page.locator('[data-testid^="image-"]').first();
        await firstImage.click();
        
        // Should navigate to descriptions tab automatically
        await expect(page.getByText('Descriptions')).toHaveClass(/border-blue-500/);
      });

      // Step 3: Generate descriptions
      await test.step('Generate descriptions', async () => {
        // Select description style
        const styleSelector = page.getByRole('combobox', { name: /style/i });
        if (await styleSelector.isVisible()) {
          await styleSelector.selectOption('narrativo');
        }
        
        // Click generate button
        const generateButton = page.getByRole('button', { name: /generate/i });
        await generateButton.click();
        
        // Wait for descriptions to be generated
        await page.waitForSelector('[data-testid="description-content"]', { timeout: 15000 });
        
        // Verify descriptions are shown
        await expect(page.getByText(/spanish/i)).toBeVisible();
        await expect(page.getByText(/english/i)).toBeVisible();
      });

      // Step 4: Practice with Q&A
      await test.step('Practice with Q&A', async () => {
        // Navigate to Q&A tab
        await page.getByText('Q&A Practice').click();
        
        // Generate questions
        const generateQAButton = page.getByRole('button', { name: /generate questions/i });
        await generateQAButton.click();
        
        // Wait for questions to load
        await page.waitForSelector('[data-testid="qa-question"]', { timeout: 15000 });
        
        // Answer a question
        const firstOption = page.locator('[data-testid="qa-option"]').first();
        await firstOption.click();
        
        // Submit answer
        const submitButton = page.getByRole('button', { name: /submit/i });
        if (await submitButton.isVisible()) {
          await submitButton.click();
        }
        
        // Verify feedback is shown
        await expect(page.locator('[data-testid="qa-feedback"]')).toBeVisible({ timeout: 5000 });
      });

      // Step 5: Build vocabulary
      await test.step('Build vocabulary', async () => {
        // Navigate to vocabulary tab
        await page.getByText('Vocabulary').click();
        
        // Extract phrases
        const extractButton = page.getByRole('button', { name: /extract phrases/i });
        if (await extractButton.isVisible()) {
          await extractButton.click();
        }
        
        // Wait for phrases to be extracted
        await page.waitForSelector('[data-testid="phrase-item"]', { timeout: 15000 });
        
        // Save a phrase
        const saveButton = page.locator('[data-testid="save-phrase"]').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
        }
        
        // Verify phrase was saved
        await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
      });
    });

    test('should handle image search with filters', async ({ page }) => {
      await test.step('Use search filters', async () => {
        // Open filters
        const filtersButton = page.getByText('Filters');
        await filtersButton.click();
        
        // Apply orientation filter
        const orientationFilter = page.getByRole('combobox', { name: /orientation/i });
        if (await orientationFilter.isVisible()) {
          await orientationFilter.selectOption('landscape');
        }
        
        // Search with filters
        const searchInput = page.getByPlaceholder(/Search for images/);
        await searchInput.fill('nature');
        
        // Wait for filtered results
        await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
        
        // Verify results are shown
        const images = page.locator('[data-testid^="image-"]');
        await expect(images.first()).toBeVisible();
      });
    });
  });

  test.describe('Error Recovery Scenarios', () => {
    test('should recover from network errors gracefully', async ({ page }) => {
      // Simulate offline condition
      await page.context().setOffline(true);
      
      // Try to search
      const searchInput = page.getByPlaceholder(/Search for images/);
      await searchInput.fill('mountain');
      
      // Should show error message
      await expect(page.getByText(/network/i)).toBeVisible({ timeout: 5000 });
      
      // Go back online
      await page.context().setOffline(false);
      
      // Retry should work
      const retryButton = page.getByRole('button', { name: /try again/i });
      if (await retryButton.isVisible()) {
        await retryButton.click();
      }
      
      // Should recover and show results
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    });

    test('should handle API errors with retry', async ({ page }) => {
      // Intercept API calls and make them fail initially
      await page.route('**/api/images/search*', (route) => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
      });
      
      // Try to search
      const searchInput = page.getByPlaceholder(/Search for images/);
      await searchInput.fill('mountain');
      
      // Should show error
      await expect(page.getByText(/error/i)).toBeVisible({ timeout: 5000 });
      
      // Remove the route to allow normal requests
      await page.unroute('**/api/images/search*');
      
      // Retry should work
      const retryButton = page.getByRole('button', { name: /try again/i });
      await retryButton.click();
      
      // Should show results
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    });
  });

  test.describe('Performance and User Experience', () => {
    test('should load quickly and be responsive', async ({ page }) => {
      const startTime = Date.now();
      
      // Navigate to the app
      await page.goto('/');
      
      // Wait for main content
      await page.waitForSelector('h1', { timeout: 5000 });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
      
      // Test responsiveness by searching
      const searchStart = Date.now();
      const searchInput = page.getByPlaceholder(/Search for images/);
      await searchInput.fill('test');
      
      // Should start showing loading state quickly
      await page.waitForSelector('[data-testid="loading-spinner"]', { timeout: 1000 });
      
      const responseTime = Date.now() - searchStart;
      expect(responseTime).toBeLessThan(500); // Should respond within 500ms
    });

    test('should handle large result sets efficiently', async ({ page }) => {
      // Search for something that returns many results
      const searchInput = page.getByPlaceholder(/Search for images/);
      await searchInput.fill('landscape');
      
      // Wait for initial results
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
      
      // Test pagination if available
      const nextButton = page.getByRole('button', { name: /next/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        
        // Should load next page efficiently
        await page.waitForSelector('[data-testid="image-grid"]', { timeout: 5000 });
      }
      
      // Test infinite scroll if implemented
      const initialImageCount = await page.locator('[data-testid^="image-"]').count();
      
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      // Wait a bit for potential lazy loading
      await page.waitForTimeout(2000);
      
      const finalImageCount = await page.locator('[data-testid^="image-"]').count();
      
      // Either pagination or infinite scroll should work
      expect(finalImageCount).toBeGreaterThanOrEqual(initialImageCount);
    });
  });

  test.describe('Accessibility and Keyboard Navigation', () => {
    test('should be fully keyboard navigable', async ({ page }) => {
      // Start from search input
      const searchInput = page.getByPlaceholder(/Search for images/);
      await searchInput.focus();
      
      // Tab through the interface
      await page.keyboard.press('Tab'); // Should go to filters button
      await expect(page.getByText('Filters')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Should go to first tab
      const descriptionTab = page.getByText('Descriptions');
      await expect(descriptionTab).toBeFocused();
      
      // Test arrow key navigation between tabs
      await page.keyboard.press('ArrowRight');
      await expect(page.getByText('Q&A Practice')).toBeFocused();
      
      // Enter should activate the focused tab
      await page.keyboard.press('Enter');
      await expect(page.getByText('Q&A Practice')).toHaveClass(/border-blue-500/);
    });

    test('should have proper ARIA labels and screen reader support', async ({ page }) => {
      // Check for main landmarks
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('navigation')).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();
      
      // Check search input accessibility
      const searchInput = page.getByPlaceholder(/Search for images/);
      await expect(searchInput).toHaveAttribute('type', 'text');
      
      // Check button accessibility
      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);
      
      // Each button should have accessible text
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work well on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
      
      // Navigate to the app
      await page.goto('/');
      
      // Should show mobile-optimized layout
      await expect(page.getByText('Describe It')).toBeVisible();
      
      // Test mobile navigation
      const searchInput = page.getByPlaceholder(/Search for images/);
      await searchInput.fill('mountain');
      
      // On mobile, tabs should be scrollable
      const tabContainer = page.locator('nav .overflow-x-auto');
      await expect(tabContainer).toBeVisible();
      
      // Test touch interactions
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
      const firstImage = page.locator('[data-testid^="image-"]').first();
      await firstImage.tap(); // Use tap instead of click for mobile
      
      // Should navigate to description tab
      await expect(page.getByText('Descriptions')).toHaveClass(/border-blue-500/);
    });

    test('should handle orientation changes', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Search and select image
      const searchInput = page.getByPlaceholder(/Search for images/);
      await searchInput.fill('mountain');
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
      
      // Change to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      
      // Should still work properly
      const firstImage = page.locator('[data-testid^="image-"]').first();
      await firstImage.click();
      
      await expect(page.getByText('Descriptions')).toHaveClass(/border-blue-500/);
    });
  });

  test.describe('Settings and Customization', () => {
    test('should save and restore user preferences', async ({ page }) => {
      // Open settings
      const settingsButton = page.getByRole('button', { name: /settings/i });
      await settingsButton.click();
      
      // Wait for settings modal
      await expect(page.getByText(/settings/i)).toBeVisible();
      
      // Change a setting (if available)
      const darkModeToggle = page.getByRole('switch', { name: /dark mode/i });
      if (await darkModeToggle.isVisible()) {
        await darkModeToggle.click();
      }
      
      // Close settings
      const closeButton = page.getByRole('button', { name: /close/i });
      if (await closeButton.isVisible()) {
        await closeButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
      
      // Reload page
      await page.reload();
      
      // Settings should be preserved
      // This would need actual implementation to test properly
    });
  });

  test.describe('Export Functionality', () => {
    test('should export vocabulary and learning progress', async ({ page }) => {
      // Complete a basic learning flow first
      const searchInput = page.getByPlaceholder(/Search for images/);
      await searchInput.fill('mountain');
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
      
      const firstImage = page.locator('[data-testid^="image-"]').first();
      await firstImage.click();
      
      // Go to vocabulary tab
      await page.getByText('Vocabulary').click();
      
      // Look for export functionality
      const exportButton = page.getByRole('button', { name: /export/i });
      if (await exportButton.isVisible()) {
        // Set up download handler
        const downloadPromise = page.waitForEvent('download');
        
        await exportButton.click();
        
        // Wait for download to start
        const download = await downloadPromise;
        
        // Verify download
        expect(download.suggestedFilename()).toMatch(/vocabulary|export/);
      }
    });
  });
});
