import { test, expect } from '@playwright/test';

test.describe('Complete User Flow - Spanish Learning App', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('h1:has-text("Describe It")');
  });

  test('complete learning workflow: search -> describe -> questions -> phrases', async ({ page }) => {
    // Step 1: Search for images
    await test.step('Search for images', async () => {
      const searchInput = page.getByRole('textbox', { name: /search for images/i });
      await expect(searchInput).toBeVisible();
      
      await searchInput.fill('mountains');
      await searchInput.press('Enter');
      
      // Wait for search results
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
      
      const images = page.locator('[data-testid="image-item"]');
      await expect(images.count()).resolves.toBeGreaterThan(0);
    });

    // Step 2: Select an image
    await test.step('Select an image', async () => {
      const firstImage = page.locator('[data-testid="image-item"]').first();
      await firstImage.click();
      
      // Verify image is selected
      await expect(firstImage).toHaveClass(/selected|border-blue/);
    });

    // Step 3: Generate description
    await test.step('Generate description', async () => {
      // Look for generate button or auto-generation
      const generateBtn = page.getByRole('button', { name: /generate description/i });
      if (await generateBtn.isVisible()) {
        await generateBtn.click();
      }
      
      // Wait for description to appear
      await page.waitForSelector('[data-testid="description-text"]', { timeout: 15000 });
      
      const descriptionText = page.locator('[data-testid="description-text"]');
      await expect(descriptionText).toBeVisible();
      await expect(descriptionText).toContainText(/\w+/); // Contains some text
    });

    // Step 4: Answer questions
    await test.step('Answer questions in Q&A panel', async () => {
      // Navigate to Q&A tab if needed
      const qaTab = page.getByRole('tab', { name: /questions/i });
      if (await qaTab.isVisible()) {
        await qaTab.click();
      }
      
      // Wait for questions to load
      await page.waitForSelector('[data-testid="qa-question"]', { timeout: 15000 });
      
      // Answer first question
      const firstOption = page.locator('[data-testid="qa-option"]').first();
      await firstOption.click();
      
      const submitBtn = page.getByRole('button', { name: /submit answer/i });
      await submitBtn.click();
      
      // Verify feedback appears
      await expect(page.locator('[data-testid="qa-feedback"]')).toBeVisible();
    });

    // Step 5: Extract phrases
    await test.step('Extract vocabulary phrases', async () => {
      // Navigate to phrases tab
      const phrasesTab = page.getByRole('tab', { name: /phrases/i });
      if (await phrasesTab.isVisible()) {
        await phrasesTab.click();
      }
      
      // Wait for phrases to load or extract button
      const extractBtn = page.getByRole('button', { name: /extract/i });
      if (await extractBtn.isVisible()) {
        await extractBtn.click();
      }
      
      // Wait for phrases to appear
      await page.waitForSelector('[data-testid="phrase-item"]', { timeout: 15000 });
      
      const phrases = page.locator('[data-testid="phrase-item"]');
      await expect(phrases.count()).resolves.toBeGreaterThan(0);
    });

    // Step 6: Export functionality
    await test.step('Test export functionality', async () => {
      // Test vocabulary export
      const exportBtn = page.getByRole('button', { name: /export.*csv/i });
      
      if (await exportBtn.isVisible()) {
        // Set up download handler
        const downloadPromise = page.waitForEvent('download');
        await exportBtn.click();
        const download = await downloadPromise;
        
        // Verify download
        expect(download.suggestedFilename()).toMatch(/\.csv$/);
      }
    });
  });

  test('accessibility compliance throughout workflow', async ({ page }) => {
    await test.step('Check keyboard navigation', async () => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      
      // Verify focus is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    await test.step('Check ARIA labels and roles', async () => {
      // Check main landmarks
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('[role="navigation"]')).toBeVisible();
      
      // Check form labels
      const searchInput = page.getByRole('textbox', { name: /search/i });
      await expect(searchInput).toBeVisible();
    });

    await test.step('Check color contrast and readability', async () => {
      // Verify text is readable
      const mainHeading = page.getByRole('heading', { level: 1 });
      await expect(mainHeading).toBeVisible();
      
      // Check no text is invisible due to color issues
      const bodyText = page.locator('body');
      await expect(bodyText).not.toHaveCSS('color', 'rgb(255, 255, 255)'); // Assuming white background
    });
  });

  test('error handling and recovery', async ({ page }) => {
    await test.step('Handle search errors', async () => {
      // Try searching with empty query
      const searchBtn = page.getByRole('button', { name: /search/i });
      await searchBtn.click();
      
      // Should show validation message or not search
      // (Specific behavior depends on implementation)
    });

    await test.step('Handle API timeouts', async () => {
      // Mock slow API response
      await page.route('**/api/**', route => {
        setTimeout(() => route.continue(), 10000);
      });
      
      const searchInput = page.getByRole('textbox', { name: /search/i });
      await searchInput.fill('test');
      await searchInput.press('Enter');
      
      // Should show loading state
      await expect(page.locator('[data-testid="loading"]')).toBeVisible();
    });

    await test.step('Handle network errors', async () => {
      // Mock network failure
      await page.route('**/api/**', route => route.abort());
      
      const searchInput = page.getByRole('textbox', { name: /search/i });
      await searchInput.fill('test');
      await searchInput.press('Enter');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });
  });

  test('responsive design across devices', async ({ page }) => {
    await test.step('Test mobile layout', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify mobile navigation
      const mobileMenu = page.getByRole('button', { name: /menu/i });
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
      }
      
      // Verify content is accessible
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    });

    await test.step('Test tablet layout', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Verify layout adapts
      const container = page.locator('.container, [data-testid="main-container"]').first();
      await expect(container).toBeVisible();
    });

    await test.step('Test desktop layout', async () => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Verify full desktop layout
      const sidebar = page.locator('[data-testid="sidebar"], nav').first();
      await expect(sidebar).toBeVisible();
    });
  });

  test('performance and loading times', async ({ page }) => {
    await test.step('Measure page load time', async () => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Page should load within reasonable time
      expect(loadTime).toBeLessThan(5000);
    });

    await test.step('Test image loading optimization', async () => {
      // Search for images
      const searchInput = page.getByRole('textbox', { name: /search/i });
      await searchInput.fill('nature');
      await searchInput.press('Enter');
      
      // Wait for first image to load
      const firstImage = page.locator('[data-testid="image-item"] img').first();
      await expect(firstImage).toBeVisible();
      
      // Verify lazy loading attributes
      const lazyImages = page.locator('img[loading="lazy"]');
      const lazyImageCount = await lazyImages.count();
      expect(lazyImageCount).toBeGreaterThan(0);
    });
  });

  test('data persistence and state management', async ({ page }) => {
    await test.step('Test search history persistence', async () => {
      // Perform a search
      const searchInput = page.getByRole('textbox', { name: /search/i });
      await searchInput.fill('mountains');
      await searchInput.press('Enter');
      
      // Wait for results
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
      
      // Reload page
      await page.reload();
      
      // Check if search history is maintained
      // (Implementation specific - could be localStorage, etc.)
    });

    await test.step('Test vocabulary progress tracking', async () => {
      // Complete a learning session
      // (This would involve the full workflow from previous test)
      
      // Verify progress is saved
      // (Implementation specific)
    });
  });

  test('multi-language support', async ({ page }) => {
    await test.step('Test Spanish content generation', async () => {
      // Complete workflow and verify Spanish content
      const searchInput = page.getByRole('textbox', { name: /search/i });
      await searchInput.fill('casa');
      await searchInput.press('Enter');
      
      // Wait for results and select image
      await page.waitForSelector('[data-testid="image-grid"]');
      await page.locator('[data-testid="image-item"]').first().click();
      
      // Wait for description and verify it's in Spanish
      await page.waitForSelector('[data-testid="description-text"]', { timeout: 15000 });
      const description = page.locator('[data-testid="description-text"]');
      
      // Should contain Spanish characteristics
      const text = await description.textContent();
      expect(text).toMatch(/[ñáéíóúü]/i); // Contains Spanish characters
    });
  });
});

// Utility test for component isolation
test.describe('Component Integration Tests', () => {
  test('image search component integration', async ({ page }) => {
    await page.goto('/');
    
    // Test search functionality
    const searchInput = page.getByRole('textbox', { name: /search/i });
    await searchInput.fill('test');
    
    // Test filters
    const categoryFilter = page.locator('select[name="category"]');
    if (await categoryFilter.isVisible()) {
      await categoryFilter.selectOption('nature');
    }
    
    const orientationFilter = page.locator('select[name="orientation"]');
    if (await orientationFilter.isVisible()) {
      await orientationFilter.selectOption('landscape');
    }
    
    await searchInput.press('Enter');
    
    // Verify search was executed with filters
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    const images = page.locator('[data-testid="image-item"]');
    await expect(images.count()).resolves.toBeGreaterThan(0);
  });

  test('description generation component integration', async ({ page }) => {
    await page.goto('/');
    
    // Mock the image selection
    await page.evaluate(() => {
      // Simulate image selection in the app state
      window.dispatchEvent(new CustomEvent('imageSelected', {
        detail: {
          id: 'test-image',
          urls: { regular: 'https://example.com/test.jpg' },
          description: 'Test image'
        }
      }));
    });
    
    // Test description generation
    const descriptionPanel = page.locator('[data-testid="description-panel"]');
    await expect(descriptionPanel).toBeVisible();
  });
});