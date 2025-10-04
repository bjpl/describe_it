import { test, expect, Page } from '@playwright/test';

// Test configuration
test.describe.configure({ mode: 'serial' });

test.describe('Spanish Learning App - User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Set up mock responses for APIs
    await page.route('**/api/images/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              id: 'test-image-1',
              urls: {
                regular: 'https://picsum.photos/800/600?seed=test1',
                small: 'https://picsum.photos/400/300?seed=test1',
              },
              alt_description: 'A beautiful test landscape',
              description: 'Test image for e2e testing',
            },
            {
              id: 'test-image-2',
              urls: {
                regular: 'https://picsum.photos/800/600?seed=test2',
                small: 'https://picsum.photos/400/300?seed=test2',
              },
              alt_description: 'Another test image',
              description: 'Second test image',
            },
          ],
          total: 2,
          totalPages: 1,
          currentPage: 1,
          hasNextPage: false,
        }),
      });
    });

    await page.route('**/api/descriptions/generate', async (route) => {
      const request = route.request();
      const postData = request.postData();
      const data = JSON.parse(postData || '{}');
      
      const response = {
        success: true,
        data: {
          text: data.language === 'en' 
            ? 'This is a beautifully generated English description of the image with rich detail and educational content.'
            : 'Esta es una hermosa descripción en español generada de la imagen con rico detalle y contenido educativo.',
        },
        metadata: {
          style: data.style,
          language: data.language,
        },
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });

    await page.route('**/api/qa/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            questions: [
              {
                id: '1',
                question: '¿Qué colores principales puedes ver en esta imagen?',
                type: 'multiple-choice',
                options: ['Azul y verde', 'Rojo y amarillo', 'Negro y blanco', 'Rosa y morado'],
                correctAnswer: 0,
                explanation: 'Los colores principales son azul y verde, típicos de paisajes naturales.',
                difficulty: 'beginner',
              },
              {
                id: '2',
                question: 'Describe what you see in this image in Spanish',
                type: 'open-ended',
                correctAnswer: 'Various acceptable answers describing the image',
                explanation: 'Practice describing images to improve vocabulary and expression.',
                difficulty: 'intermediate',
              },
            ],
          },
        }),
      });
    });

    await page.route('**/api/phrases/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            vocabulary: [
              { spanish: 'hermoso', english: 'beautiful', category: 'adjectives', difficulty: 'beginner' },
              { spanish: 'paisaje', english: 'landscape', category: 'nouns', difficulty: 'beginner' },
              { spanish: 'natural', english: 'natural', category: 'adjectives', difficulty: 'beginner' },
            ],
            phrases: [
              { spanish: 'un paisaje hermoso', english: 'a beautiful landscape', difficulty: 'beginner' },
              { spanish: 'colores vibrantes', english: 'vibrant colors', difficulty: 'intermediate' },
            ],
            grammar: [
              { rule: 'Adjective agreement', example: 'paisaje hermoso (masculine)', difficulty: 'intermediate' },
            ],
          },
        }),
      });
    });

    await page.goto('http://localhost:3000');
  });

  test('Complete user flow: Search → Description → Q&A → Phrases', async ({ page }) => {
    // Step 1: Search for images
    await page.fill('input[placeholder="Search for images..."]', 'beautiful landscape');
    await page.click('button:has-text("Search")');
    
    // Wait for loading to complete
    await expect(page.locator('text=Searching...')).toBeVisible();
    await expect(page.locator('text=Search Results')).toBeVisible();
    
    // Verify images loaded
    await expect(page.locator('img[alt*="test"]').first()).toBeVisible();

    // Step 2: Generate descriptions
    await page.click('button:has-text("Generate Description")');
    await expect(page.locator('text=Generating...')).toBeVisible();
    
    // Wait for descriptions to appear
    await expect(page.locator('text=This is a beautifully generated English description')).toBeVisible();
    await expect(page.locator('text=Esta es una hermosa descripción en español')).toBeVisible();

    // Step 3: Navigate to Q&A tab
    await page.click('[role="tab"]:has-text("Q&A")');
    
    // Wait for Q&A content to load
    await expect(page.locator('text=¿Qué colores principales puedes ver')).toBeVisible();
    
    // Interact with Q&A
    await page.click('text=Azul y verde');
    await page.click('button:has-text("Check Answer")');
    await expect(page.locator('text=¡Correcto!')).toBeVisible();

    // Step 4: Navigate to Phrases tab
    await page.click('[role="tab"]:has-text("Phrases")');
    
    // Verify vocabulary loaded
    await expect(page.locator('text=hermoso')).toBeVisible();
    await expect(page.locator('text=beautiful')).toBeVisible();
    await expect(page.locator('text=paisaje')).toBeVisible();
  });

  test('Style selector changes affect descriptions', async ({ page }) => {
    // Search for image first
    await page.fill('input[placeholder="Search for images..."]', 'mountain');
    await page.click('button:has-text("Search")');
    await expect(page.locator('text=Search Results')).toBeVisible();

    // Generate with default style (conversacional)
    await page.click('button:has-text("Generate Description")');
    await expect(page.locator('text=Esta es una hermosa descripción')).toBeVisible();

    // Change style to poético
    await page.selectOption('select', 'poetico');
    
    // Descriptions should be cleared when style changes
    await expect(page.locator('text=Esta es una hermosa descripción')).not.toBeVisible();
    
    // Generate new descriptions with different style
    await page.click('button:has-text("Generate Description")');
    await expect(page.locator('text=Esta es una hermosa descripción')).toBeVisible();
  });

  test('Dark mode functionality', async ({ page }) => {
    // Initially should be in light mode
    await expect(page.locator('html')).not.toHaveClass('dark');

    // Open settings modal
    await page.click('button[title="Settings"]');
    await expect(page.locator('text=Settings')).toBeVisible();

    // Toggle dark mode
    await page.click('button[role="switch"]');
    
    // Should switch to dark mode
    await expect(page.locator('html')).toHaveClass('dark');
    
    // Close settings
    await page.click('button:has-text("Close")');
    
    // Dark mode should persist
    await expect(page.locator('html')).toHaveClass('dark');
  });

  test('Error handling - Network failures', async ({ page }) => {
    // Mock network failure for image search
    await page.route('**/api/images/search*', async (route) => {
      await route.abort('failed');
    });

    await page.fill('input[placeholder="Search for images..."]', 'test query');
    await page.click('button:has-text("Search")');

    // Should show error message
    await expect(page.locator('text=Failed to search images')).toBeVisible();
  });

  test('Error handling - Empty search results', async ({ page }) => {
    // Mock empty results
    await page.route('**/api/images/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [],
          total: 0,
          totalPages: 1,
          currentPage: 1,
          hasNextPage: false,
        }),
      });
    });

    await page.fill('input[placeholder="Search for images..."]', 'nonexistent');
    await page.click('button:has-text("Search")');

    await expect(page.locator('text=No images found')).toBeVisible();
  });

  test('Loading states consistency', async ({ page }) => {
    // Search loading
    await page.fill('input[placeholder="Search for images..."]', 'test');
    await page.click('button:has-text("Search")');
    
    // Should show loading spinner and text
    await expect(page.locator('text=Searching...')).toBeVisible();
    await expect(page.locator('button:has-text("Search")')).toBeDisabled();

    // Wait for completion
    await expect(page.locator('text=Search Results')).toBeVisible();
    await expect(page.locator('button:has-text("Search")')).not.toBeDisabled();

    // Description generation loading
    await page.click('button:has-text("Generate Description")');
    await expect(page.locator('text=Generating...')).toBeVisible();
    await expect(page.locator('button:has-text("Generate Description")')).toBeDisabled();
  });

  test('Export functionality', async ({ page }) => {
    // Export button should be disabled initially
    await expect(page.locator('button[title*="Generate descriptions first"]')).toBeDisabled();

    // Search and generate descriptions
    await page.fill('input[placeholder="Search for images..."]', 'test');
    await page.click('button:has-text("Search")');
    await expect(page.locator('text=Search Results')).toBeVisible();

    await page.click('button:has-text("Generate Description")');
    await expect(page.locator('text=Esta es una hermosa descripción')).toBeVisible();

    // Export button should now be enabled
    await expect(page.locator('button[title*="Export data"]')).not.toBeDisabled();

    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    await page.click('button[title*="Export data"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/describe-it-export-.*\.json/);
  });
});

test.describe('Responsive Design Tests', () => {
  test('Mobile layout adaptation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');

    // Header should be responsive
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('h1:has-text("Describe It")')).toBeVisible();

    // Layout should stack vertically on mobile
    const mainContainer = page.locator('main > div');
    await expect(mainContainer).toHaveClass(/grid-cols-1/);
  });

  test('Tablet layout adaptation', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:3000');

    // Should still show mobile-like layout on tablet
    const mainContainer = page.locator('main > div');
    await expect(mainContainer).toHaveClass(/grid-cols-1/);
  });

  test('Desktop layout', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000');

    // Should show desktop layout with sidebar
    const mainContainer = page.locator('main > div');
    await expect(mainContainer).toHaveClass(/lg:grid-cols-3/);
  });
});

test.describe('Performance and Edge Cases', () => {
  test('Rapid button clicking', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Fill search input
    await page.fill('input[placeholder="Search for images..."]', 'test');

    // Rapidly click search button
    const searchButton = page.locator('button:has-text("Search")');
    await searchButton.click();
    await searchButton.click();
    await searchButton.click();

    // Should handle gracefully (button disabled during loading)
    await expect(searchButton).toBeDisabled();
    
    // Eventually should complete and re-enable
    await expect(page.locator('text=Search Results')).toBeVisible();
    await expect(searchButton).not.toBeDisabled();
  });

  test('Special characters in search input', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const specialQuery = 'café & résumé!@#$%^&*()[]{}';
    await page.fill('input[placeholder="Search for images..."]', specialQuery);
    await page.click('button:has-text("Search")');

    // Should handle special characters without breaking
    await expect(page.locator('text=Search Results')).toBeVisible();
  });

  test('Very long search query', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const longQuery = 'a'.repeat(200);
    await page.fill('input[placeholder="Search for images..."]', longQuery);
    await page.click('button:has-text("Search")');

    // Should handle long queries appropriately
    await expect(page.locator('text=Search Results')).toBeVisible();
  });

  test('Browser refresh during operation', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Start search
    await page.fill('input[placeholder="Search for images..."]', 'test');
    await page.click('button:has-text("Search")');

    // Refresh page during loading
    await page.reload();

    // Should return to initial state
    await expect(page.locator('input[placeholder="Search for images..."]')).toHaveValue('');
    await expect(page.locator('button:has-text("Search")')).not.toBeDisabled();
  });

  test('Multiple concurrent API calls', async ({ page }) => {
    let apiCallCount = 0;
    
    await page.route('**/api/descriptions/generate', async (route) => {
      apiCallCount++;
      // Add delay to simulate slow API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const request = route.request();
      const postData = request.postData();
      const data = JSON.parse(postData || '{}');
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            text: data.language === 'en' ? 'English description' : 'Descripción en español',
          },
        }),
      });
    });

    await page.goto('http://localhost:3000');

    // Search for images
    await page.fill('input[placeholder="Search for images..."]', 'test');
    await page.click('button:has-text("Search")');
    await expect(page.locator('text=Search Results')).toBeVisible();

    // Generate descriptions (should make 2 concurrent calls)
    await page.click('button:has-text("Generate Description")');
    
    // Wait for both descriptions to appear
    await expect(page.locator('text=English description')).toBeVisible();
    await expect(page.locator('text=Descripción en español')).toBeVisible();

    // Should have made 2 concurrent API calls
    expect(apiCallCount).toBe(2);
  });
});

test.describe('Accessibility Tests', () => {
  test('Keyboard navigation', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Tab through main interactive elements
    await page.keyboard.press('Tab'); // Search input
    await expect(page.locator('input[placeholder="Search for images..."]')).toBeFocused();

    await page.keyboard.press('Tab'); // Search button
    await expect(page.locator('button:has-text("Search")')).toBeFocused();

    await page.keyboard.press('Tab'); // Export button
    await expect(page.locator('button[title*="Export"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Settings button
    await expect(page.locator('button[title="Settings"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Info button
    await expect(page.locator('button[title="About"]')).toBeFocused();
  });

  test('ARIA labels and roles', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Check for proper ARIA labels
    await expect(page.locator('input[aria-label="Search for images"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Search for images"]')).toBeVisible();
    
    // Check tab roles
    await expect(page.locator('[role="tab"]')).toHaveCount(3);
    await expect(page.locator('[role="tablist"]')).toBeVisible();
  });

  test('Screen reader compatibility', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Check for heading hierarchy
    await expect(page.locator('h1')).toHaveText('Describe It');
    await expect(page.locator('h2')).toHaveCount(1); // Image Descriptions
    
    // Check for proper labeling of interactive elements
    const searchInput = page.locator('input[placeholder="Search for images..."]');
    await expect(searchInput).toHaveAttribute('aria-label', 'Search for images');
  });
});