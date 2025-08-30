import { test, expect } from '@playwright/test';

test.describe('Description Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Mock successful image search
    await page.route('**/api/images/search**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 1,
          total_pages: 1,
          results: [{
            id: 'test-image-1',
            urls: { 
              small: 'https://example.com/test-small.jpg',
              regular: 'https://example.com/test-regular.jpg',
              full: 'https://example.com/test-full.jpg'
            },
            alt_description: 'Test mountain landscape',
            description: 'A beautiful mountain landscape',
            user: { name: 'Test Photographer', username: 'testphoto' },
            width: 1200,
            height: 800,
            color: '#3A5F4F',
            likes: 150,
            created_at: '2023-01-01T00:00:00Z'
          }]
        })
      });
    });
    
    // Mock description generation
    await page.route('**/api/descriptions/generate', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          style: 'narrativo',
          text: 'Esta es una magnífica imagen que muestra un paisaje montañoso con características únicas. Las montañas se alzan majestuosas contra un cielo despejado, creando una composición visual impresionante que evoca sensaciones de tranquilidad y admiración por la naturaleza.',
          language: 'es',
          wordCount: 42,
          generatedAt: '2023-01-01T12:00:00Z'
        })
      });
    });
  });

  test('should complete full description generation workflow', async ({ page }) => {
    // Search for an image
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    
    // Wait for search results
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    
    // Click on the first image
    const firstImage = page.locator('[data-testid="image-grid"] img').first();
    await firstImage.click();
    
    // Should open image viewer/description interface
    await expect(page.locator('[data-testid="image-viewer"]')).toBeVisible();
    
    // Should show description generation options
    await expect(page.locator('[data-testid="description-tabs"]')).toBeVisible();
    
    // Click on generate description button
    const generateButton = page.locator('button', { hasText: /generate.*description/i });
    await generateButton.click();
    
    // Should show description style options
    await expect(page.locator('[data-testid="description-styles"]')).toBeVisible();
    
    // Select narrative style
    await page.locator('button', { hasText: /narrativo/i }).click();
    
    // Should show loading state
    await expect(page.locator('text=Generating description')).toBeVisible();
    
    // Should show generated description
    await expect(page.locator('[data-testid="generated-description"]')).toBeVisible();
    await expect(page.locator('text=Esta es una magnífica imagen')).toBeVisible();
  });

  test('should generate descriptions in different styles', async ({ page }) => {
    // Search and select image
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    
    // Test different description styles
    const styles = ['narrativo', 'poetico', 'academico', 'conversacional', 'infantil'];
    
    for (const style of styles) {
      // Mock specific style response
      await page.route('**/api/descriptions/generate', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            style,
            text: `Esta es una descripción en estilo ${style} de la imagen montañosa.`,
            language: 'es',
            wordCount: 12,
            generatedAt: new Date().toISOString()
          })
        });
      });
      
      // Click generate description
      const generateButton = page.locator('button', { hasText: /generate.*description/i });
      await generateButton.click();
      
      // Select style
      await page.locator(`button`, { hasText: new RegExp(style, 'i') }).click();
      
      // Wait for generation
      await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
      
      // Verify style-specific content
      await expect(page.locator(`text=estilo ${style}`)).toBeVisible();
    }
  });

  test('should handle description generation errors', async ({ page }) => {
    // Mock error response
    await page.route('**/api/descriptions/generate', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to generate description' })
      });
    });
    
    // Search and select image
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    
    // Try to generate description
    const generateButton = page.locator('button', { hasText: /generate.*description/i });
    await generateButton.click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    
    // Should show error message
    await expect(page.locator('text=Error generating description')).toBeVisible();
    await expect(page.locator('button', { hasText: /try again/i })).toBeVisible();
  });

  test('should allow regenerating descriptions', async ({ page }) => {
    // Search and select image
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    
    // Generate initial description
    const generateButton = page.locator('button', { hasText: /generate.*description/i });
    await generateButton.click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    
    // Mock regeneration response
    await page.route('**/api/descriptions/generate', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          style: 'narrativo',
          text: 'Esta es una nueva descripción regenerada con contenido actualizado y diferentes perspectivas sobre el paisaje montañoso.',
          language: 'es',
          wordCount: 20,
          generatedAt: new Date().toISOString()
        })
      });
    });
    
    // Click regenerate button
    const regenerateButton = page.locator('button', { hasText: /regenerate/i });
    await regenerateButton.click();
    
    // Should show new description
    await expect(page.locator('text=nueva descripción regenerada')).toBeVisible();
  });

  test('should support different languages', async ({ page }) => {
    // Mock English description
    await page.route('**/api/descriptions/generate', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          style: 'narrativo',
          text: 'This is a magnificent image showing a mountainous landscape with unique characteristics.',
          language: 'en',
          wordCount: 14,
          generatedAt: new Date().toISOString()
        })
      });
    });
    
    // Search and select image
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    
    // Select English language
    const languageSelector = page.locator('[data-testid="language-selector"]');
    await languageSelector.selectOption('en');
    
    // Generate description
    const generateButton = page.locator('button', { hasText: /generate.*description/i });
    await generateButton.click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    
    // Should show English description
    await expect(page.locator('text=This is a magnificent image')).toBeVisible();
  });

  test('should save descriptions for authenticated users', async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('user-session', JSON.stringify({
        id: 'user123',
        email: 'user@example.com',
        name: 'Test User'
      }));
    });
    
    // Search and select image
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    
    // Generate description
    const generateButton = page.locator('button', { hasText: /generate.*description/i });
    await generateButton.click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    
    // Should show save/saved indicator
    await expect(page.locator('text=Description saved')).toBeVisible();
  });

  test('should show description history for returning users', async ({ page }) => {
    // Mock existing descriptions
    await page.route('**/api/descriptions**', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'desc-1',
              style: 'narrativo',
              text: 'Descripción anterior del paisaje montañoso...',
              createdAt: '2023-01-01T10:00:00Z'
            },
            {
              id: 'desc-2',
              style: 'poetico',
              text: 'Poética visión de las montañas que se alzan...',
              createdAt: '2023-01-01T11:00:00Z'
            }
          ])
        });
      } else {
        route.continue();
      }
    });
    
    // Search and select image
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    
    // Should show description history
    await expect(page.locator('[data-testid="description-history"]')).toBeVisible();
    await expect(page.locator('text=Descripción anterior del paisaje')).toBeVisible();
    await expect(page.locator('text=Poética visión de las montañas')).toBeVisible();
  });

  test('should allow deleting descriptions', async ({ page }) => {
    // Mock existing description
    await page.route('**/api/descriptions**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'desc-1',
            style: 'narrativo',
            text: 'Descripción a eliminar...',
            createdAt: '2023-01-01T10:00:00Z'
          }
        ])
      });
    });
    
    // Search and select image
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    
    // Click delete button on description
    const deleteButton = page.locator('[data-testid="delete-description"]');
    await deleteButton.click();
    
    // Confirm deletion
    await page.locator('button', { hasText: /confirm|delete/i }).click();
    
    // Description should be removed
    await expect(page.locator('text=Descripción a eliminar')).not.toBeVisible();
  });

  test('should be accessible via keyboard navigation', async ({ page }) => {
    // Search and select image with keyboard
    await page.keyboard.press('Tab'); // Focus search input
    await page.keyboard.type('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    
    // Navigate to first image and select with Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Should open image viewer
    await expect(page.locator('[data-testid="image-viewer"]')).toBeVisible();
    
    // Navigate to generate button with Tab and activate with Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Generate description
    
    // Navigate through style options
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Select first style
    
    // Should generate description
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
  });

  test('should handle custom prompts', async ({ page }) => {
    // Search and select image
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    
    // Open advanced options
    const advancedButton = page.locator('button', { hasText: /advanced.*options/i });
    await advancedButton.click();
    
    // Enter custom prompt
    const customPromptInput = page.locator('[data-testid="custom-prompt"]');
    await customPromptInput.fill('Focus on the geological formations and their historical significance');
    
    // Generate description
    const generateButton = page.locator('button', { hasText: /generate.*description/i });
    await generateButton.click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    
    // Should include custom prompt in the description
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
  });
});