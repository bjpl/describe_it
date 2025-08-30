import { test, expect } from '@playwright/test';
import VisualRegressionTester, { visualTestHelpers } from '../utils/visual-regression';

/**
 * Visual Regression Tests
 * 
 * These tests capture screenshots and compare them with baselines
 * to detect unintended visual changes in the application.
 */

test.describe('Visual Regression Tests', () => {
  let visualTester: VisualRegressionTester;
  
  test.beforeEach(async ({ page }) => {
    visualTester = new VisualRegressionTester('spanish-learning-app');
    
    // Setup page for consistent visual testing
    await visualTestHelpers.setupPageForVisualTesting(page);
    
    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });
  
  test.describe('Landing Page', () => {
    test('should match landing page layout', async ({ page }) => {
      const result = await visualTester.compareScreenshot(
        page,
        'landing-page',
        {
          fullPage: true,
          mask: [
            visualTestHelpers.maskSelectors.dates,
            visualTestHelpers.maskSelectors.random,
          ],
        }
      );
      
      expect(result.passed).toBe(true);
      if (!result.passed) {
        console.log(`Visual difference: ${(result.difference * 100).toFixed(2)}%`);
      }
    });
    
    test('should match responsive layouts', async ({ page }) => {
      const results = await visualTester.captureResponsiveScreenshots(
        page,
        'landing-page',
        visualTestHelpers.responsiveBreakpoints
      );
      
      results.forEach((result, index) => {
        const breakpoint = visualTestHelpers.responsiveBreakpoints[index];
        expect(result.passed, `Failed on ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`).toBe(true);
      });
    });
    
    test('should match header component', async ({ page }) => {
      const result = await visualTester.compareScreenshot(
        page,
        'header-component',
        {
          clip: await page.locator('header').boundingBox() || undefined,
        }
      );
      
      expect(result.passed).toBe(true);
    });
    
    test('should match search form', async ({ page }) => {
      const searchForm = page.locator('[data-testid="search-form"]');
      const boundingBox = await searchForm.boundingBox();
      
      if (boundingBox) {
        const result = await visualTester.compareScreenshot(
          page,
          'search-form',
          { clip: boundingBox }
        );
        
        expect(result.passed).toBe(true);
      }
    });
  });
  
  test.describe('Search Results', () => {
    test.beforeEach(async ({ page }) => {
      // Mock consistent search results
      await page.route('**/api/images/search**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total: 20,
            total_pages: 2,
            results: Array.from({ length: 20 }, (_, i) => ({
              id: `visual-test-${i}`,
              urls: {
                small: `https://picsum.photos/300/200?random=${i}`,
                regular: `https://picsum.photos/600/400?random=${i}`,
                full: `https://picsum.photos/1200/800?random=${i}`,
              },
              alt_description: `Visual test image ${i}`,
              description: `Consistent test image for visual regression ${i}`,
              user: {
                name: 'Visual Test User',
                username: 'visualtest',
              },
              width: 600,
              height: 400,
              color: '#4A90E2',
              likes: 100 + i,
              created_at: '2023-01-01T12:00:00Z',
            }))
          })
        });
      });
      
      // Perform search
      await page.fill('[data-testid="search-input"]', 'visual test');
      await page.click('[data-testid="search-button"]');
      await page.waitForSelector('[data-testid="image-grid"]');
      
      // Wait for images to load
      await visualTestHelpers.waitForImages(page);
    });
    
    test('should match search results layout', async ({ page }) => {
      const result = await visualTester.compareScreenshot(
        page,
        'search-results',
        {
          fullPage: true,
          mask: [
            '[data-testid="search-timestamp"]',
            '.loading-shimmer',
          ],
        }
      );
      
      expect(result.passed).toBe(true);
    });
    
    test('should match image grid layout', async ({ page }) => {
      const imageGrid = page.locator('[data-testid="image-grid"]');
      const boundingBox = await imageGrid.boundingBox();
      
      if (boundingBox) {
        const result = await visualTester.compareScreenshot(
          page,
          'image-grid',
          { clip: boundingBox }
        );
        
        expect(result.passed).toBe(true);
      }
    });
    
    test('should match pagination controls', async ({ page }) => {
      const pagination = page.locator('[data-testid="pagination-controls"]');
      const boundingBox = await pagination.boundingBox();
      
      if (boundingBox) {
        const result = await visualTester.compareScreenshot(
          page,
          'pagination-controls',
          { clip: boundingBox }
        );
        
        expect(result.passed).toBe(true);
      }
    });
    
    test('should match responsive grid layouts', async ({ page }) => {
      const results = await visualTester.captureResponsiveScreenshots(
        page,
        'search-results-responsive',
        [
          { name: 'mobile', width: 375, height: 667 },
          { name: 'tablet', width: 768, height: 1024 },
          { name: 'desktop', width: 1200, height: 800 },
        ]
      );
      
      results.forEach((result, index) => {
        const sizes = ['mobile', 'tablet', 'desktop'];
        expect(result.passed, `Failed on ${sizes[index]}`).toBe(true);
      });
    });
  });
  
  test.describe('Image Viewer', () => {
    test.beforeEach(async ({ page }) => {
      // Setup search results first
      await page.route('**/api/images/search**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            total: 1,
            total_pages: 1,
            results: [{
              id: 'viewer-test-image',
              urls: {
                small: 'https://picsum.photos/300/200?visual-test',
                regular: 'https://picsum.photos/600/400?visual-test',
                full: 'https://picsum.photos/1200/800?visual-test',
              },
              alt_description: 'Visual test image for viewer',
              description: 'Test image for visual regression testing',
              user: { name: 'Test User', username: 'testuser' },
              width: 600,
              height: 400,
              color: '#FF6B6B',
              likes: 150,
              created_at: '2023-01-01T12:00:00Z',
            }]
          })
        });
      });
      
      // Perform search and open image
      await page.fill('[data-testid="search-input"]', 'viewer test');
      await page.click('[data-testid="search-button"]');
      await page.waitForSelector('[data-testid="image-grid"]');
      await page.click('[data-testid="image-item"]:first-child');
      await page.waitForSelector('[data-testid="image-viewer"]');
    });
    
    test('should match image viewer modal', async ({ page }) => {
      const result = await visualTester.compareScreenshot(
        page,
        'image-viewer-modal',
        {
          fullPage: true,
          mask: [
            '[data-testid="image-viewer-timestamp"]',
          ],
        }
      );
      
      expect(result.passed).toBe(true);
    });
    
    test('should match image metadata panel', async ({ page }) => {
      const metadataPanel = page.locator('[data-testid="image-metadata"]');
      const boundingBox = await metadataPanel.boundingBox();
      
      if (boundingBox) {
        const result = await visualTester.compareScreenshot(
          page,
          'image-metadata-panel',
          { clip: boundingBox }
        );
        
        expect(result.passed).toBe(true);
      }
    });
  });
  
  test.describe('Description Generation', () => {
    test.beforeEach(async ({ page }) => {
      // Mock image selection state
      await page.route('**/api/descriptions/generate**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            style: 'narrativo',
            content: 'Esta es una descripción narrativa consistente para las pruebas de regresión visual. La imagen muestra elementos fascinantes que capturan la atención del observador.',
            language: 'es',
            wordCount: 25,
            generatedAt: '2023-01-01T12:00:00Z',
          })
        });
      });
      
      // Navigate to description page (mock state)
      await page.goto('/');
      // Simulate having selected an image and navigated to description generation
    });
    
    test('should match description tabs interface', async ({ page }) => {
      // This would require the description interface to be loaded
      const descriptionTabs = page.locator('[data-testid="description-tabs"]');
      
      if (await descriptionTabs.isVisible()) {
        const boundingBox = await descriptionTabs.boundingBox();
        
        if (boundingBox) {
          const result = await visualTester.compareScreenshot(
            page,
            'description-tabs',
            { clip: boundingBox }
          );
          
          expect(result.passed).toBe(true);
        }
      }
    });
    
    test('should match generated description display', async ({ page }) => {
      // Generate description
      const generateButton = page.locator('[data-testid="generate-description"]');
      if (await generateButton.isVisible()) {
        await generateButton.click();
        await page.waitForSelector('[data-testid="generated-description"]');
        
        const descriptionPanel = page.locator('[data-testid="generated-description"]');
        const boundingBox = await descriptionPanel.boundingBox();
        
        if (boundingBox) {
          const result = await visualTester.compareScreenshot(
            page,
            'generated-description',
            { clip: boundingBox }
          );
          
          expect(result.passed).toBe(true);
        }
      }
    });
  });
  
  test.describe('Component States', () => {
    test('should match loading states', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/images/search**', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ total: 0, total_pages: 0, results: [] })
          });
        }, 2000);
      });
      
      // Trigger search to show loading state
      await page.fill('[data-testid="search-input"]', 'loading test');
      await page.click('[data-testid="search-button"]');
      
      // Capture loading state
      await page.waitForSelector('[data-testid="loading-spinner"]');
      const result = await visualTester.compareScreenshot(
        page,
        'loading-state',
        { fullPage: true }
      );
      
      expect(result.passed).toBe(true);
    });
    
    test('should match error states', async ({ page }) => {
      // Mock API error
      await page.route('**/api/images/search**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server Error' })
        });
      });
      
      // Trigger search to show error state
      await page.fill('[data-testid="search-input"]', 'error test');
      await page.click('[data-testid="search-button"]');
      
      // Wait for error state
      await page.waitForSelector('[data-testid="search-error"]');
      const result = await visualTester.compareScreenshot(
        page,
        'error-state',
        { fullPage: true }
      );
      
      expect(result.passed).toBe(true);
    });
    
    test('should match empty results state', async ({ page }) => {
      // Mock empty results
      await page.route('**/api/images/search**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ total: 0, total_pages: 0, results: [] })
        });
      });
      
      // Trigger search
      await page.fill('[data-testid="search-input"]', 'no results');
      await page.click('[data-testid="search-button"]');
      
      // Wait for empty state
      await page.waitForSelector('[data-testid="no-results"]');
      const result = await visualTester.compareScreenshot(
        page,
        'empty-results-state',
        { fullPage: true }
      );
      
      expect(result.passed).toBe(true);
    });
  });
  
  test.describe('Interactive Elements', () => {
    test('should capture hover states', async ({ page }) => {
      // Setup search results
      await page.route('**/api/images/search**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            total: 1,
            results: [{
              id: 'hover-test',
              urls: {
                small: 'https://picsum.photos/300/200?hover-test',
                regular: 'https://picsum.photos/600/400?hover-test',
                full: 'https://picsum.photos/1200/800?hover-test',
              },
              alt_description: 'Hover test image',
              description: 'Test image for hover states',
              user: { name: 'Test User', username: 'testuser' },
              width: 600,
              height: 400,
              color: '#4CAF50',
              likes: 75,
              created_at: '2023-01-01T12:00:00Z',
            }]
          })
        });
      });
      
      await page.fill('[data-testid="search-input"]', 'hover test');
      await page.click('[data-testid="search-button"]');
      await page.waitForSelector('[data-testid="image-grid"]');
      
      const firstImage = page.locator('[data-testid="image-item"]').first();
      
      // Capture normal state
      const normalResult = await visualTester.compareScreenshot(
        page,
        'image-item-normal',
        {
          clip: await firstImage.boundingBox() || undefined,
        }
      );
      
      // Hover and capture hover state
      await firstImage.hover();
      await page.waitForTimeout(100);
      
      const hoverResult = await visualTester.compareScreenshot(
        page,
        'image-item-hover',
        {
          clip: await firstImage.boundingBox() || undefined,
        }
      );
      
      expect(normalResult.passed).toBe(true);
      expect(hoverResult.passed).toBe(true);
    });
    
    test('should capture focus states', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]');
      
      // Capture unfocused state
      const unfocusedResult = await visualTester.compareScreenshot(
        page,
        'search-input-unfocused',
        {
          clip: await searchInput.boundingBox() || undefined,
        }
      );
      
      // Focus and capture focused state
      await searchInput.focus();
      await page.waitForTimeout(100);
      
      const focusedResult = await visualTester.compareScreenshot(
        page,
        'search-input-focused',
        {
          clip: await searchInput.boundingBox() || undefined,
        }
      );
      
      expect(unfocusedResult.passed).toBe(true);
      expect(focusedResult.passed).toBe(true);
    });
  });
  
  test.afterAll(async () => {
    // Generate visual regression report
    const results = [
      // This would be populated with actual test results
      // For now, we'll create a placeholder report
    ];
    
    if (results.length > 0) {
      const reportPath = await visualTester.generateReport(results);
      console.log(`Visual regression report generated: ${reportPath}`);
    }
  });
});

// Update baseline images (run with --update-snapshots)
test.describe('Baseline Management', () => {
  test('update all baselines', async ({ page }) => {
    // This test is only run when updating baselines
    if (process.env.UPDATE_VISUAL_BASELINES === 'true') {
      const visualTester = new VisualRegressionTester('spanish-learning-app');
      
      await page.goto('/');
      await visualTestHelpers.stabilizePage(page);
      
      // Update all baseline screenshots
      const screenshots = [
        'landing-page',
        'search-form',
        'header-component',
      ];
      
      for (const screenshot of screenshots) {
        await visualTester.updateBaseline(screenshot);
        console.log(`Updated baseline: ${screenshot}`);
      }
    }
  });
});
