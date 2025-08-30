import { test, expect } from '@playwright/test';

test.describe('Phrase Extraction Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Mock image search and description generation
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

    await page.route('**/api/descriptions/generate', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          style: 'narrativo',
          text: 'Esta magnífica imagen muestra un paisaje montañoso con características únicas. Las montañas majestuosas se alzan contra el cielo azul, creando una composición visual impresionante que evoca tranquilidad y admiración.',
          language: 'es',
          wordCount: 32,
          generatedAt: '2023-01-01T12:00:00Z'
        })
      });
    });

    // Mock phrase extraction
    await page.route('**/api/phrases/extract', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          phrases: [
            {
              id: 'phrase-1',
              text: 'paisaje montañoso',
              category: 'nouns',
              translation: 'mountainous landscape',
              difficulty: 'intermediate'
            },
            {
              id: 'phrase-2',
              text: 'montañas majestuosas',
              category: 'nouns',
              translation: 'majestic mountains',
              difficulty: 'intermediate'
            },
            {
              id: 'phrase-3',
              text: 'cielo azul',
              category: 'nouns',
              translation: 'blue sky',
              difficulty: 'beginner'
            },
            {
              id: 'phrase-4',
              text: 'se alzan',
              category: 'verbs',
              translation: 'rise up',
              difficulty: 'intermediate'
            },
            {
              id: 'phrase-5',
              text: 'impresionante',
              category: 'adjectives',
              translation: 'impressive',
              difficulty: 'beginner'
            },
            {
              id: 'phrase-6',
              text: 'evoca tranquilidad',
              category: 'phrases',
              translation: 'evokes tranquility',
              difficulty: 'advanced'
            }
          ]
        })
      });
    });
  });

  test('should extract phrases from generated description', async ({ page }) => {
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

    // Click extract phrases button
    const extractButton = page.locator('button', { hasText: /extract.*phrases/i });
    await extractButton.click();

    // Should show phrase extraction panel
    await expect(page.locator('[data-testid="phrase-extractor"]')).toBeVisible();
    
    // Should show loading state
    await expect(page.locator('text=Extracting phrases')).toBeVisible();

    // Should show extracted phrases
    await expect(page.locator('[data-testid="extracted-phrases"]')).toBeVisible();
    await expect(page.locator('text=paisaje montañoso')).toBeVisible();
    await expect(page.locator('text=mountainous landscape')).toBeVisible();
  });

  test('should organize phrases by category', async ({ page }) => {
    // Setup and extract phrases
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /extract.*phrases/i }).click();
    await page.waitForSelector('[data-testid="phrase-extractor"]', { timeout: 10000 });

    // Should show category sections
    await expect(page.locator('[data-testid="category-nouns"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-verbs"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-adjectives"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-phrases"]')).toBeVisible();

    // Should show phrases in correct categories
    const nounsSection = page.locator('[data-testid="category-nouns"]');
    await expect(nounsSection.locator('text=paisaje montañoso')).toBeVisible();
    await expect(nounsSection.locator('text=cielo azul')).toBeVisible();

    const verbsSection = page.locator('[data-testid="category-verbs"]');
    await expect(verbsSection.locator('text=se alzan')).toBeVisible();

    const adjectivesSection = page.locator('[data-testid="category-adjectives"]');
    await expect(adjectivesSection.locator('text=impresionante')).toBeVisible();

    const phrasesSection = page.locator('[data-testid="category-phrases"]');
    await expect(phrasesSection.locator('text=evoca tranquilidad')).toBeVisible();
  });

  test('should filter phrases by category', async ({ page }) => {
    // Setup and extract phrases
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /extract.*phrases/i }).click();
    await page.waitForSelector('[data-testid="phrase-extractor"]', { timeout: 10000 });

    // Click on Nouns filter
    await page.locator('button', { hasText: 'Nouns' }).click();

    // Should show only nouns
    await expect(page.locator('text=paisaje montañoso')).toBeVisible();
    await expect(page.locator('text=cielo azul')).toBeVisible();
    
    // Should hide other categories
    await expect(page.locator('text=se alzan')).not.toBeVisible();
    await expect(page.locator('text=impresionante')).not.toBeVisible();

    // Click on Verbs filter
    await page.locator('button', { hasText: 'Verbs' }).click();

    // Should show only verbs
    await expect(page.locator('text=se alzan')).toBeVisible();
    
    // Should hide other categories
    await expect(page.locator('text=paisaje montañoso')).not.toBeVisible();
  });

  test('should filter phrases by difficulty', async ({ page }) => {
    // Setup and extract phrases
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /extract.*phrases/i }).click();
    await page.waitForSelector('[data-testid="phrase-extractor"]', { timeout: 10000 });

    // Click on Beginner difficulty filter
    await page.locator('button', { hasText: 'Beginner' }).click();

    // Should show only beginner phrases
    await expect(page.locator('text=cielo azul')).toBeVisible();
    await expect(page.locator('text=impresionante')).toBeVisible();
    
    // Should hide advanced phrases
    await expect(page.locator('text=evoca tranquilidad')).not.toBeVisible();

    // Click on Advanced difficulty filter
    await page.locator('button', { hasText: 'Advanced' }).click();

    // Should show only advanced phrases
    await expect(page.locator('text=evoca tranquilidad')).toBeVisible();
    
    // Should hide beginner phrases
    await expect(page.locator('text=cielo azul')).not.toBeVisible();
  });

  test('should search phrases by text', async ({ page }) => {
    // Setup and extract phrases
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /extract.*phrases/i }).click();
    await page.waitForSelector('[data-testid="phrase-extractor"]', { timeout: 10000 });

    // Search for specific phrase
    const phraseSearchInput = page.locator('[data-testid="phrase-search"]');
    await phraseSearchInput.fill('montañ');

    // Should show matching phrases
    await expect(page.locator('text=paisaje montañoso')).toBeVisible();
    await expect(page.locator('text=montañas majestuosas')).toBeVisible();
    
    // Should hide non-matching phrases
    await expect(page.locator('text=cielo azul')).not.toBeVisible();
  });

  test('should add phrases to phrase bank', async ({ page }) => {
    // Setup and extract phrases
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /extract.*phrases/i }).click();
    await page.waitForSelector('[data-testid="phrase-extractor"]', { timeout: 10000 });

    // Click add to bank button for first phrase
    const firstPhraseCard = page.locator('[data-testid="phrase-card"]').first();
    const addButton = firstPhraseCard.locator('button', { hasText: /add.*bank/i });
    await addButton.click();

    // Should change to "In bank" state
    await expect(firstPhraseCard.locator('text=In bank')).toBeVisible();
    
    // Should show remove button
    await expect(firstPhraseCard.locator('button', { hasText: /remove/i })).toBeVisible();

    // Check phrase bank counter
    await expect(page.locator('text=1 selected')).toBeVisible();
  });

  test('should remove phrases from phrase bank', async ({ page }) => {
    // Setup and extract phrases, add one to bank
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /extract.*phrases/i }).click();
    await page.waitForSelector('[data-testid="phrase-extractor"]', { timeout: 10000 });
    
    const firstPhraseCard = page.locator('[data-testid="phrase-card"]').first();
    await firstPhraseCard.locator('button', { hasText: /add.*bank/i }).click();
    await expect(page.locator('text=1 selected')).toBeVisible();

    // Click remove button
    const removeButton = firstPhraseCard.locator('button', { hasText: /remove/i });
    await removeButton.click();

    // Should change back to "Add to Bank" state
    await expect(firstPhraseCard.locator('button', { hasText: /add.*bank/i })).toBeVisible();
    
    // Should update counter
    await expect(page.locator('text=0 selected')).toBeVisible();
  });

  test('should show only unselected phrases when filtered', async ({ page }) => {
    // Setup and extract phrases, add some to bank
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /extract.*phrases/i }).click();
    await page.waitForSelector('[data-testid="phrase-extractor"]', { timeout: 10000 });
    
    // Add first two phrases to bank
    const phraseCards = page.locator('[data-testid="phrase-card"]');
    await phraseCards.nth(0).locator('button', { hasText: /add.*bank/i }).click();
    await phraseCards.nth(1).locator('button', { hasText: /add.*bank/i }).click();
    await expect(page.locator('text=2 selected')).toBeVisible();

    // Toggle "Show only unselected"
    await page.locator('input[type="checkbox"]#show-unselected').check();

    // Should show only unselected phrases
    await expect(phraseCards).toHaveCount(4); // 6 total - 2 selected = 4 visible
  });

  test('should sort phrases by different criteria', async ({ page }) => {
    // Setup and extract phrases
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /extract.*phrases/i }).click();
    await page.waitForSelector('[data-testid="phrase-extractor"]', { timeout: 10000 });

    // Test alphabetical sorting (default)
    const sortSelect = page.locator('[data-testid="sort-select"]');
    await expect(sortSelect).toHaveValue('alphabetical');

    // Change to difficulty sorting
    await sortSelect.selectOption('difficulty');
    
    // Verify sort order changed (would need to check actual order)
    await expect(sortSelect).toHaveValue('difficulty');

    // Change to category sorting
    await sortSelect.selectOption('category');
    await expect(sortSelect).toHaveValue('category');
  });

  test('should play pronunciation for phrases', async ({ page }) => {
    // Mock Web Speech API
    await page.addInitScript(() => {
      window.speechSynthesis = {
        speak: (utterance) => {
          window.testSpeechCalled = true;
          window.lastSpokenText = utterance.text;
        },
        cancel: () => {},
        pause: () => {},
        resume: () => {},
        getVoices: () => [],
      };
      window.SpeechSynthesisUtterance = function(text) {
        this.text = text;
        this.lang = '';
        this.voice = null;
        this.volume = 1;
        this.rate = 1;
        this.pitch = 1;
      };
    });

    // Setup and extract phrases
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /extract.*phrases/i }).click();
    await page.waitForSelector('[data-testid="phrase-extractor"]', { timeout: 10000 });

    // Click pronunciation button for Spanish phrase
    const firstPhraseCard = page.locator('[data-testid="phrase-card"]').first();
    const spanishPronunciationButton = firstPhraseCard.locator('[data-testid="spanish-pronunciation"]');
    await spanishPronunciationButton.click();

    // Check that speech synthesis was called
    const speechCalled = await page.evaluate(() => window.testSpeechCalled);
    expect(speechCalled).toBe(true);

    // Click pronunciation button for English translation
    const englishPronunciationButton = firstPhraseCard.locator('[data-testid="english-pronunciation"]');
    await englishPronunciationButton.click();

    const lastSpokenText = await page.evaluate(() => window.lastSpokenText);
    expect(lastSpokenText).toBeTruthy();
  });

  test('should handle phrase extraction errors', async ({ page }) => {
    // Mock error response
    await page.route('**/api/phrases/extract', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to extract phrases' })
      });
    });

    // Setup and try to extract phrases
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /extract.*phrases/i }).click();

    // Should show error message
    await expect(page.locator('text=Failed to extract phrases')).toBeVisible();
    await expect(page.locator('button', { hasText: /try again/i })).toBeVisible();
  });

  test('should be accessible via keyboard navigation', async ({ page }) => {
    // Setup and extract phrases
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /extract.*phrases/i }).click();
    await page.waitForSelector('[data-testid="phrase-extractor"]', { timeout: 10000 });

    // Navigate with Tab key
    await page.keyboard.press('Tab'); // Search input
    await page.keyboard.press('Tab'); // Sort select
    await page.keyboard.press('Tab'); // Show unselected checkbox
    await page.keyboard.press('Tab'); // First category filter
    await page.keyboard.press('Enter'); // Toggle filter

    // Should apply filter
    await expect(page.locator('button', { hasText: 'Nouns' })).toHaveClass(/selected|active/);
  });
});