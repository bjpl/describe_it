import { test, expect } from '@playwright/test';

test.describe('Q&A Generation Flow', () => {
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
          text: 'Esta magnífica imagen muestra un paisaje montañoso con características únicas. Las montañas majestuosas se alzan contra el cielo azul, creando una composición visual impresionante que evoca tranquilidad y admiración por la naturaleza.',
          language: 'es',
          wordCount: 35,
          generatedAt: '2023-01-01T12:00:00Z'
        })
      });
    });

    // Mock Q&A generation
    await page.route('**/api/qa/generate', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          questions: [
            {
              question: '¿Qué elementos naturales puedes observar en esta imagen?',
              answer: 'En la imagen se pueden observar montañas majestuosas y un cielo azul que crean una composición visual impresionante.',
              difficulty: 'facil',
              category: 'descripción'
            },
            {
              question: '¿Qué sensaciones evoca el paisaje mostrado en la imagen?',
              answer: 'El paisaje evoca sensaciones de tranquilidad y admiración por la belleza natural de las montañas.',
              difficulty: 'medio',
              category: 'interpretación'
            },
            {
              question: '¿Cómo describirías la composición visual de esta fotografía?',
              answer: 'La composición visual es impresionante, con montañas que se alzan contra el cielo creando un contraste armonioso.',
              difficulty: 'dificil',
              category: 'análisis'
            },
            {
              question: '¿Qué características únicas tiene este paisaje montañoso?',
              answer: 'Las características únicas incluyen la majestuosidad de las montañas y su contraste con el cielo azul.',
              difficulty: 'medio',
              category: 'descripción'
            },
            {
              question: '¿Qué tipo de emociones puede despertar en el observador esta imagen?',
              answer: 'Esta imagen puede despertar emociones de tranquilidad, admiración y conexión con la naturaleza.',
              difficulty: 'dificil',
              category: 'interpretación'
            }
          ]
        })
      });
    });
  });

  test('should generate questions from description', async ({ page }) => {
    // Search, select image, and generate description
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });

    // Click generate questions button
    const generateQAButton = page.locator('button', { hasText: /generate.*questions/i });
    await generateQAButton.click();

    // Should show Q&A panel
    await expect(page.locator('[data-testid="qa-panel"]')).toBeVisible();
    
    // Should show loading state
    await expect(page.locator('text=Generating questions')).toBeVisible();

    // Should show generated questions
    await expect(page.locator('[data-testid="qa-questions"]')).toBeVisible();
    await expect(page.locator('text=¿Qué elementos naturales puedes observar')).toBeVisible();
  });

  test('should display questions organized by difficulty', async ({ page }) => {
    // Setup and generate Q&A
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /generate.*questions/i }).click();
    await page.waitForSelector('[data-testid="qa-panel"]', { timeout: 10000 });

    // Should show difficulty indicators
    await expect(page.locator('[data-testid="difficulty-easy"]')).toBeVisible();
    await expect(page.locator('[data-testid="difficulty-medium"]')).toBeVisible();
    await expect(page.locator('[data-testid="difficulty-hard"]')).toBeVisible();

    // Should show questions with appropriate difficulty styling
    const easyQuestions = page.locator('[data-testid="question-easy"]');
    const mediumQuestions = page.locator('[data-testid="question-medium"]');
    const hardQuestions = page.locator('[data-testid="question-hard"]');

    await expect(easyQuestions).toHaveCount(1);
    await expect(mediumQuestions).toHaveCount(2);
    await expect(hardQuestions).toHaveCount(2);
  });

  test('should show/hide answers for questions', async ({ page }) => {
    // Setup and generate Q&A
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /generate.*questions/i }).click();
    await page.waitForSelector('[data-testid="qa-panel"]', { timeout: 10000 });

    // Click show answer button for first question
    const firstQuestion = page.locator('[data-testid="qa-item"]').first();
    const showAnswerButton = firstQuestion.locator('button', { hasText: /show.*answer/i });
    await showAnswerButton.click();

    // Should show the answer
    await expect(firstQuestion.locator('[data-testid="qa-answer"]')).toBeVisible();
    await expect(firstQuestion.locator('text=En la imagen se pueden observar')).toBeVisible();

    // Button should change to "Hide Answer"
    await expect(firstQuestion.locator('button', { hasText: /hide.*answer/i })).toBeVisible();

    // Click hide answer button
    await firstQuestion.locator('button', { hasText: /hide.*answer/i }).click();

    // Should hide the answer
    await expect(firstQuestion.locator('[data-testid="qa-answer"]')).not.toBeVisible();
  });

  test('should filter questions by difficulty', async ({ page }) => {
    // Setup and generate Q&A
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /generate.*questions/i }).click();
    await page.waitForSelector('[data-testid="qa-panel"]', { timeout: 10000 });

    // Click on Easy difficulty filter
    await page.locator('[data-testid="filter-easy"]').click();

    // Should show only easy questions
    await expect(page.locator('[data-testid="question-easy"]')).toBeVisible();
    await expect(page.locator('[data-testid="question-medium"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="question-hard"]')).not.toBeVisible();

    // Click on Hard difficulty filter
    await page.locator('[data-testid="filter-hard"]').click();

    // Should show only hard questions
    await expect(page.locator('[data-testid="question-hard"]')).toBeVisible();
    await expect(page.locator('[data-testid="question-easy"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="question-medium"]')).not.toBeVisible();

    // Click "All" to show all questions
    await page.locator('[data-testid="filter-all"]').click();

    // Should show all questions again
    await expect(page.locator('[data-testid="question-easy"]')).toBeVisible();
    await expect(page.locator('[data-testid="question-medium"]')).toBeVisible();
    await expect(page.locator('[data-testid="question-hard"]')).toBeVisible();
  });

  test('should filter questions by category', async ({ page }) => {
    // Setup and generate Q&A
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /generate.*questions/i }).click();
    await page.waitForSelector('[data-testid="qa-panel"]', { timeout: 10000 });

    // Filter by description category
    const categoryFilter = page.locator('[data-testid="category-filter"]');
    await categoryFilter.selectOption('descripción');

    // Should show only description questions
    await expect(page.locator('[data-testid="category-descripción"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-interpretación"]')).not.toBeVisible();

    // Filter by interpretation category
    await categoryFilter.selectOption('interpretación');

    // Should show only interpretation questions
    await expect(page.locator('[data-testid="category-interpretación"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-descripción"]')).not.toBeVisible();
  });

  test('should allow practicing with questions', async ({ page }) => {
    // Setup and generate Q&A
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /generate.*questions/i }).click();
    await page.waitForSelector('[data-testid="qa-panel"]', { timeout: 10000 });

    // Start practice mode
    const practiceButton = page.locator('button', { hasText: /start.*practice/i });
    await practiceButton.click();

    // Should show practice interface
    await expect(page.locator('[data-testid="practice-mode"]')).toBeVisible();
    
    // Should show first question
    await expect(page.locator('[data-testid="current-question"]')).toBeVisible();
    
    // Should show answer input
    const answerInput = page.locator('[data-testid="answer-input"]');
    await expect(answerInput).toBeVisible();

    // Type an answer
    await answerInput.fill('Las montañas y el cielo azul son los elementos principales.');

    // Submit answer
    await page.locator('button', { hasText: /submit.*answer/i }).click();

    // Should show feedback
    await expect(page.locator('[data-testid="answer-feedback"]')).toBeVisible();

    // Should show correct answer
    await expect(page.locator('[data-testid="correct-answer"]')).toBeVisible();

    // Continue to next question
    await page.locator('button', { hasText: /next.*question/i }).click();

    // Should show next question
    await expect(page.locator('[data-testid="current-question"]')).toBeVisible();
  });

  test('should track practice progress', async ({ page }) => {
    // Setup and generate Q&A
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /generate.*questions/i }).click();
    await page.waitForSelector('[data-testid="qa-panel"]', { timeout: 10000 });

    // Start practice mode
    await page.locator('button', { hasText: /start.*practice/i }).click();
    await expect(page.locator('[data-testid="practice-mode"]')).toBeVisible();

    // Should show progress indicator
    await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible();
    await expect(page.locator('text=Question 1 of 5')).toBeVisible();

    // Answer first question and continue
    const answerInput = page.locator('[data-testid="answer-input"]');
    await answerInput.fill('Test answer');
    await page.locator('button', { hasText: /submit.*answer/i }).click();
    await page.locator('button', { hasText: /next.*question/i }).click();

    // Progress should update
    await expect(page.locator('text=Question 2 of 5')).toBeVisible();

    // Should show progress bar
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toBeVisible();
  });

  test('should show practice completion summary', async ({ page }) => {
    // Setup and generate Q&A
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /generate.*questions/i }).click();
    await page.waitForSelector('[data-testid="qa-panel"]', { timeout: 10000 });

    // Start practice mode
    await page.locator('button', { hasText: /start.*practice/i }).click();
    
    // Quick completion simulation - answer all questions
    for (let i = 0; i < 5; i++) {
      const answerInput = page.locator('[data-testid="answer-input"]');
      await answerInput.fill(`Test answer ${i + 1}`);
      await page.locator('button', { hasText: /submit.*answer/i }).click();
      
      if (i < 4) {
        await page.locator('button', { hasText: /next.*question/i }).click();
      } else {
        await page.locator('button', { hasText: /finish.*practice/i }).click();
      }
    }

    // Should show completion summary
    await expect(page.locator('[data-testid="practice-summary"]')).toBeVisible();
    await expect(page.locator('text=Practice Complete!')).toBeVisible();
    
    // Should show score/stats
    await expect(page.locator('[data-testid="practice-score"]')).toBeVisible();
    
    // Should show options to continue
    await expect(page.locator('button', { hasText: /practice.*again/i })).toBeVisible();
    await expect(page.locator('button', { hasText: /new.*image/i })).toBeVisible();
  });

  test('should generate different question counts', async ({ page }) => {
    // Setup description first
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });

    // Mock different question count
    await page.route('**/api/qa/generate', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          questions: [
            {
              question: '¿Qué elementos naturales puedes observar en esta imagen?',
              answer: 'En la imagen se pueden observar montañas majestuosas y un cielo azul.',
              difficulty: 'facil',
              category: 'descripción'
            },
            {
              question: '¿Qué sensaciones evoca el paisaje mostrado en la imagen?',
              answer: 'El paisaje evoca sensaciones de tranquilidad y admiración.',
              difficulty: 'medio',
              category: 'interpretación'
            },
            {
              question: '¿Cómo describirías la composición visual de esta fotografía?',
              answer: 'La composición visual es impresionante con gran contraste.',
              difficulty: 'dificil',
              category: 'análisis'
            }
          ]
        })
      });
    });

    // Open Q&A settings
    const qaSettingsButton = page.locator('button', { hasText: /qa.*settings/i });
    await qaSettingsButton.click();

    // Set question count to 3
    const questionCountInput = page.locator('[data-testid="question-count"]');
    await questionCountInput.fill('3');

    // Generate questions
    await page.locator('button', { hasText: /generate.*questions/i }).click();
    await page.waitForSelector('[data-testid="qa-panel"]', { timeout: 10000 });

    // Should show 3 questions
    const questions = page.locator('[data-testid="qa-item"]');
    await expect(questions).toHaveCount(3);
  });

  test('should handle Q&A generation errors', async ({ page }) => {
    // Mock error response
    await page.route('**/api/qa/generate', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to generate questions' })
      });
    });

    // Setup and try to generate Q&A
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /generate.*questions/i }).click();

    // Should show error message
    await expect(page.locator('text=Failed to generate questions')).toBeVisible();
    await expect(page.locator('button', { hasText: /try again/i })).toBeVisible();
  });

  test('should be accessible via keyboard navigation', async ({ page }) => {
    // Setup and generate Q&A
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /generate.*questions/i }).click();
    await page.waitForSelector('[data-testid="qa-panel"]', { timeout: 10000 });

    // Navigate with keyboard
    await page.keyboard.press('Tab'); // Focus first question
    await page.keyboard.press('Tab'); // Focus show answer button
    await page.keyboard.press('Enter'); // Show answer

    // Should show answer
    const firstQuestion = page.locator('[data-testid="qa-item"]').first();
    await expect(firstQuestion.locator('[data-testid="qa-answer"]')).toBeVisible();

    // Continue tabbing through elements
    await page.keyboard.press('Tab'); // Focus hide answer button
    await page.keyboard.press('Tab'); // Focus next question or control
  });

  test('should export Q&A for study', async ({ page }) => {
    // Setup and generate Q&A
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
    await page.locator('[data-testid="image-grid"] img').first().click();
    await page.locator('button', { hasText: /generate.*description/i }).click();
    await page.locator('button', { hasText: /narrativo/i }).click();
    await page.waitForSelector('[data-testid="generated-description"]', { timeout: 10000 });
    await page.locator('button', { hasText: /generate.*questions/i }).click();
    await page.waitForSelector('[data-testid="qa-panel"]', { timeout: 10000 });

    // Click export button
    const exportButton = page.locator('button', { hasText: /export.*questions/i });
    await exportButton.click();

    // Should show export options
    await expect(page.locator('[data-testid="export-options"]')).toBeVisible();
    
    // Select PDF format
    await page.locator('button', { hasText: /pdf/i }).click();

    // Should trigger download (can't actually test file download in Playwright easily)
    // But we can verify the download was initiated
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button', { hasText: /download/i }).click();
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('questions');
  });
});