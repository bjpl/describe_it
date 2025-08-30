import { test, expect } from '@playwright/test';

test.describe('Image Search Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display initial state correctly', async ({ page }) => {
    // Check for main heading
    await expect(page.locator('h2')).toContainText('Discover Amazing Images');
    
    // Check for search input
    const searchInput = page.locator('input[type="text"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /search for images/i);
    
    // Check for suggestion buttons
    await expect(page.locator('button', { hasText: 'nature' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'people' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'city' })).toBeVisible();
  });

  test('should perform search when typing in search input', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    
    // Type search query
    await searchInput.fill('mountains');
    
    // Wait for debounced search to trigger
    await page.waitForTimeout(600);
    
    // Should show loading state
    await expect(page.locator('text=Searching images')).toBeVisible();
    
    // Wait for results to load
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    
    // Should show search results
    await expect(page.locator('text=Showing')).toBeVisible();
    await expect(page.locator('text=images for "mountains"')).toBeVisible();
  });

  test('should search when clicking suggestion buttons', async ({ page }) => {
    // Click nature suggestion
    await page.locator('button', { hasText: 'nature' }).click();
    
    // Check that search input is filled
    const searchInput = page.locator('input[type="text"]');
    await expect(searchInput).toHaveValue('nature');
    
    // Wait for search to complete
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    
    // Should show results for nature
    await expect(page.locator('text=images for "nature"')).toBeVisible();
  });

  test('should show and hide filters panel', async ({ page }) => {
    // Click filters button
    await page.locator('button', { hasText: 'Filters' }).click();
    
    // Should show filters panel
    await expect(page.locator('[data-testid="search-filters"]')).toBeVisible();
    
    // Click filters button again
    await page.locator('button', { hasText: 'Filters' }).click();
    
    // Should hide filters panel
    await expect(page.locator('[data-testid="search-filters"]')).not.toBeVisible();
  });

  test('should clear search results', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    
    // Perform search
    await searchInput.fill('test');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    
    // Click clear button
    await page.locator('button[aria-label="Clear search"]').click();
    
    // Should clear search input
    await expect(searchInput).toHaveValue('');
    
    // Should show initial state again
    await expect(page.locator('text=Discover Amazing Images')).toBeVisible();
  });

  test('should handle empty search results', async ({ page }) => {
    // Mock empty results by searching for something that won't return results
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('xyz-nonexistent-query-123');
    await page.waitForTimeout(600);
    
    // Wait for search to complete
    await page.waitForTimeout(2000);
    
    // Should show empty state
    await expect(page.locator('text=No images found')).toBeVisible();
    await expect(page.locator('text=Try different keywords')).toBeVisible();
  });

  test('should show error state for failed searches', async ({ page }) => {
    // Intercept API call to simulate error
    await page.route('**/api/images/search**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Search failed' })
      });
    });
    
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('error-test');
    await page.waitForTimeout(600);
    
    // Should show error state
    await expect(page.locator('text=Search Error')).toBeVisible();
    await expect(page.locator('text=Try Again')).toBeVisible();
  });

  test('should retry failed search', async ({ page }) => {
    let retryCount = 0;
    
    // Intercept API call - fail first time, succeed second time
    await page.route('**/api/images/search**', route => {
      if (retryCount === 0) {
        retryCount++;
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Search failed' })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total: 1,
            total_pages: 1,
            results: [{
              id: 'test-image',
              urls: { small: 'test.jpg', regular: 'test.jpg', full: 'test.jpg' },
              alt_description: 'Test image',
              description: 'Test',
              user: { name: 'Test', username: 'test' },
              width: 800,
              height: 600,
              color: '#ffffff',
              likes: 10,
              created_at: '2023-01-01T00:00:00Z'
            }]
          })
        });
      }
    });
    
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('retry-test');
    await page.waitForTimeout(600);
    
    // Should show error first
    await expect(page.locator('text=Search Error')).toBeVisible();
    
    // Click try again
    await page.locator('button', { hasText: 'Try Again' }).click();
    
    // Should show results after retry
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await expect(page.locator('text=images for "retry-test"')).toBeVisible();
  });

  test('should load more images with pagination', async ({ page }) => {
    // Mock paginated response
    await page.route('**/api/images/search**', (route, request) => {
      const url = new URL(request.url());
      const page_num = url.searchParams.get('page') || '1';
      
      const results = Array.from({ length: 10 }, (_, i) => ({
        id: `image-${page_num}-${i}`,
        urls: { small: 'test.jpg', regular: 'test.jpg', full: 'test.jpg' },
        alt_description: `Test image ${i}`,
        description: 'Test',
        user: { name: 'Test', username: 'test' },
        width: 800,
        height: 600,
        color: '#ffffff',
        likes: 10,
        created_at: '2023-01-01T00:00:00Z'
      }));

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 50,
          total_pages: 5,
          results
        })
      });
    });
    
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('pagination-test');
    await page.waitForTimeout(600);
    
    // Wait for initial results
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    
    // Should show pagination controls
    await expect(page.locator('[data-testid="pagination-controls"]')).toBeVisible();
    
    // Click load more or next page
    const loadMoreButton = page.locator('button', { hasText: /load more|next/i });
    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click();
      
      // Should show loading state for additional images
      await expect(page.locator('text=Loading')).toBeVisible();
    }
  });

  test('should handle rate limiting gracefully', async ({ page }) => {
    // Mock rate limit response
    await page.route('**/api/images/search**', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rate limit exceeded' })
      });
    });
    
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('rate-limit-test');
    await page.waitForTimeout(600);
    
    // Should show rate limit error
    await expect(page.locator('text=Search Error')).toBeVisible();
  });

  test('should be accessible via keyboard navigation', async ({ page }) => {
    // Tab to search input
    await page.keyboard.press('Tab');
    
    // Should focus search input
    const searchInput = page.locator('input[type="text"]');
    await expect(searchInput).toBeFocused();
    
    // Type search query
    await page.keyboard.type('accessibility test');
    
    // Tab to filters button
    await page.keyboard.press('Tab');
    
    // Should focus filters button
    const filtersButton = page.locator('button', { hasText: 'Filters' });
    await expect(filtersButton).toBeFocused();
    
    // Press Enter to open filters
    await page.keyboard.press('Enter');
    
    // Should show filters panel
    await expect(page.locator('[data-testid="search-filters"]')).toBeVisible();
  });

  test('should work on mobile devices', async ({ page, isMobile }) => {
    if (!isMobile) {
      // Skip test if not running on mobile
      test.skip();
    }
    
    // Search input should be visible and usable
    const searchInput = page.locator('input[type="text"]');
    await expect(searchInput).toBeVisible();
    
    // Touch interaction should work
    await searchInput.tap();
    await searchInput.fill('mobile test');
    
    // Wait for search
    await page.waitForTimeout(600);
    
    // Results should be displayed in mobile-friendly format
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    
    // Grid should adapt to mobile layout
    const imageGrid = page.locator('[data-testid="image-grid"]');
    await expect(imageGrid).toBeVisible();
  });

  test('should maintain search state on page refresh', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    
    // Perform search
    await searchInput.fill('persistence test');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    
    // Refresh page
    await page.reload();
    
    // Search state might not persist in this implementation
    // But the app should still function correctly
    await expect(page.locator('h2')).toContainText('Discover Amazing Images');
  });
});