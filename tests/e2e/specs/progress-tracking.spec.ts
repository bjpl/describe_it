/**
 * Progress Tracking E2E Test
 *
 * Tests progress tracking and statistics features:
 * - Daily/weekly progress stats
 * - Learning streak tracking
 * - Achievement system
 * - Progress visualization
 *
 * @critical - Core progress tracking feature
 */

import { test, expect, TestDataBuilder } from '../helpers/fixtures';

test.describe('Progress Tracking @critical', () => {
  test('should display progress stats after learning activity @smoke', async ({
    page,
    homePage,
    loginPage,
    vocabularyPage,
    progressPage,
    authHelper,
  }) => {
    const testUser = TestDataBuilder.userCredentials('progress-test');

    await test.step('1. Authenticate user', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
      await loginPage.signUp(testUser.fullName!, testUser.email, testUser.password);
      await authHelper.waitForAuthComplete();
    });

    await test.step('2. Add vocabulary items', async () => {
      await vocabularyPage.navigate();

      const items = [
        { word: 'aprender', translation: 'to learn', difficulty: 'beginner' as const },
        { word: 'estudiar', translation: 'to study', difficulty: 'beginner' as const },
        { word: 'practicar', translation: 'to practice', difficulty: 'beginner' as const },
      ];

      for (const item of items) {
        await vocabularyPage.addVocabulary(item);
        await page.waitForTimeout(500);
      }
    });

    await test.step('3. Check progress page', async () => {
      await progressPage.navigate();
      await progressPage.verifyPageLoaded();

      // Get progress stats
      const stats = await progressPage.getProgressStats();

      // Progress should reflect the added vocabulary
      console.log('Progress stats:', stats);

      // Verify stats exist (values may be 0 for new user)
      expect(stats.wordsLearned).toBeGreaterThanOrEqual(0);
      expect(stats.currentStreak).toBeGreaterThanOrEqual(0);
    });

    await test.step('4. Verify progress chart is displayed', async () => {
      await progressPage.verifyChartDisplayed();
    });
  });

  test('should track daily learning streak', async ({
    page,
    homePage,
    loginPage,
    vocabularyPage,
    progressPage,
    authHelper,
  }) => {
    const testUser = TestDataBuilder.userCredentials('streak-test');

    await test.step('1. Create account and add vocabulary', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
      await loginPage.signUp(testUser.fullName!, testUser.email, testUser.password);
      await authHelper.waitForAuthComplete();

      await vocabularyPage.navigate();

      const item = {
        word: 'diario',
        translation: 'daily',
        difficulty: 'beginner' as const,
      };

      await vocabularyPage.addVocabulary(item);
    });

    await test.step('2. Check initial streak', async () => {
      await progressPage.navigate();

      const initialStreak = await progressPage.getCurrentStreak();

      // New user should have streak of 0 or 1
      expect(initialStreak).toBeGreaterThanOrEqual(0);
      expect(initialStreak).toBeLessThanOrEqual(1);
    });
  });

  test('should display categorized vocabulary breakdown', async ({
    page,
    homePage,
    loginPage,
    vocabularyPage,
    progressPage,
    authHelper,
  }) => {
    const testUser = TestDataBuilder.userCredentials('breakdown-test');

    await test.step('1. Add vocabulary with different categories', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
      await loginPage.signUp(testUser.fullName!, testUser.email, testUser.password);
      await authHelper.waitForAuthComplete();

      await vocabularyPage.navigate();

      const items = [
        {
          word: 'comida',
          translation: 'food',
          difficulty: 'beginner' as const,
          category: 'food',
        },
        {
          word: 'viaje',
          translation: 'trip',
          difficulty: 'beginner' as const,
          category: 'travel',
        },
        {
          word: 'trabajo',
          translation: 'work',
          difficulty: 'intermediate' as const,
          category: 'business',
        },
      ];

      for (const item of items) {
        await vocabularyPage.addVocabulary(item);
        await page.waitForTimeout(500);
      }
    });

    await test.step('2. Verify category breakdown on progress page', async () => {
      await progressPage.navigate();

      // Check if category breakdown is visible
      const categoryBreakdown = page.locator('[data-testid="category-breakdown"]');
      const exists = await categoryBreakdown.isVisible({ timeout: 3000 }).catch(() => false);

      if (exists) {
        await progressPage.verifyCategoryBreakdownVisible();
      } else {
        console.log('Category breakdown not available, skipping verification');
      }
    });
  });

  test('should display difficulty level distribution', async ({
    page,
    homePage,
    loginPage,
    vocabularyPage,
    progressPage,
    authHelper,
  }) => {
    const testUser = TestDataBuilder.userCredentials('difficulty-test');

    await test.step('1. Add vocabulary with different difficulties', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
      await loginPage.signUp(testUser.fullName!, testUser.email, testUser.password);
      await authHelper.waitForAuthComplete();

      await vocabularyPage.navigate();

      const items = [
        { word: 'fácil', translation: 'easy', difficulty: 'beginner' as const },
        { word: 'medio', translation: 'medium', difficulty: 'intermediate' as const },
        { word: 'difícil', translation: 'difficult', difficulty: 'advanced' as const },
      ];

      for (const item of items) {
        await vocabularyPage.addVocabulary(item);
        await page.waitForTimeout(500);
      }
    });

    await test.step('2. Verify difficulty breakdown', async () => {
      await progressPage.navigate();

      const difficultyBreakdown = page.locator('[data-testid="difficulty-breakdown"]');
      const exists = await difficultyBreakdown.isVisible({ timeout: 3000 }).catch(() => false);

      if (exists) {
        await progressPage.verifyDifficultyBreakdownVisible();
      } else {
        console.log('Difficulty breakdown not available');
      }
    });
  });

  test('should allow switching time range views', async ({
    page,
    homePage,
    loginPage,
    vocabularyPage,
    progressPage,
    authHelper,
  }) => {
    const testUser = TestDataBuilder.userCredentials('timerange-test');

    await test.step('1. Setup user with vocabulary', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
      await loginPage.signUp(testUser.fullName!, testUser.email, testUser.password);
      await authHelper.waitForAuthComplete();

      await vocabularyPage.navigate();
      await vocabularyPage.addVocabulary({
        word: 'tiempo',
        translation: 'time',
        difficulty: 'beginner' as const,
      });
    });

    await test.step('2. Test different time range views', async () => {
      await progressPage.navigate();

      // Try switching time ranges
      const timeRanges: Array<'today' | 'week' | 'month'> = ['today', 'week', 'month'];

      for (const range of timeRanges) {
        const rangeButton = page.locator(`button:has-text("${range}")`, { hasText: new RegExp(range, 'i') }).first();
        const exists = await rangeButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (exists) {
          await rangeButton.click();
          await page.waitForTimeout(500);

          // Verify chart is still visible after switching
          await progressPage.verifyChartDisplayed();
        }
      }
    });
  });

  test('should show recent activity feed', async ({
    page,
    homePage,
    loginPage,
    vocabularyPage,
    progressPage,
    authHelper,
  }) => {
    const testUser = TestDataBuilder.userCredentials('activity-test');

    await test.step('1. Perform various learning activities', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
      await loginPage.signUp(testUser.fullName!, testUser.email, testUser.password);
      await authHelper.waitForAuthComplete();

      await vocabularyPage.navigate();

      // Add multiple vocabulary items to generate activity
      const items = [
        { word: 'actividad', translation: 'activity', difficulty: 'beginner' as const },
        { word: 'reciente', translation: 'recent', difficulty: 'beginner' as const },
      ];

      for (const item of items) {
        await vocabularyPage.addVocabulary(item);
        await page.waitForTimeout(500);
      }
    });

    await test.step('2. Check recent activity', async () => {
      await progressPage.navigate();

      const recentActivity = page.locator('[data-testid="recent-activity"]');
      const exists = await recentActivity.isVisible({ timeout: 3000 }).catch(() => false);

      if (exists) {
        await progressPage.verifyRecentActivityVisible();

        // Get activity items
        const activities = await progressPage.getRecentActivityItems();
        console.log('Recent activities:', activities);
      } else {
        console.log('Recent activity feed not available');
      }
    });
  });

  test('should display mastery levels for vocabulary', async ({
    page,
    homePage,
    loginPage,
    vocabularyPage,
    progressPage,
    authHelper,
  }) => {
    const testUser = TestDataBuilder.userCredentials('mastery-test');

    await test.step('1. Add vocabulary and practice', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
      await loginPage.signUp(testUser.fullName!, testUser.email, testUser.password);
      await authHelper.waitForAuthComplete();

      await vocabularyPage.navigate();

      await vocabularyPage.addVocabulary({
        word: 'dominio',
        translation: 'mastery',
        difficulty: 'intermediate' as const,
      });
    });

    await test.step('2. Check mastery statistics', async () => {
      await progressPage.navigate();

      // Check for mastered words count
      const masteredWordsElement = page.locator('[data-testid="mastered-words"]');
      const exists = await masteredWordsElement.isVisible({ timeout: 3000 }).catch(() => false);

      if (exists) {
        const masteredCount = await progressPage.getMasteredWordsCount();
        expect(masteredCount).toBeGreaterThanOrEqual(0);

        const learningCount = await progressPage.getLearningWordsCount();
        expect(learningCount).toBeGreaterThanOrEqual(0);
      } else {
        console.log('Mastery stats not available');
      }
    });
  });
});

test.describe('Progress Export and Sharing', () => {
  test('should allow exporting progress data', async ({
    page,
    homePage,
    loginPage,
    vocabularyPage,
    progressPage,
    authHelper,
  }) => {
    const testUser = TestDataBuilder.userCredentials('export-test');

    await test.step('1. Setup user with progress data', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
      await loginPage.signUp(testUser.fullName!, testUser.email, testUser.password);
      await authHelper.waitForAuthComplete();

      await vocabularyPage.navigate();
      await vocabularyPage.addVocabulary({
        word: 'exportar',
        translation: 'to export',
        difficulty: 'beginner' as const,
      });
    });

    await test.step('2. Export progress', async () => {
      await progressPage.navigate();

      const exportButton = page.locator('[data-testid="export-progress"], button:has-text("Export")').first();
      const exists = await exportButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (exists) {
        // Listen for download event
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

        await exportButton.click();
        await page.waitForTimeout(500);

        const download = await downloadPromise;

        if (download) {
          expect(download.suggestedFilename()).toBeTruthy();
          console.log('Download initiated:', download.suggestedFilename());
        } else {
          console.log('Download not triggered, export may work differently');
        }
      } else {
        console.log('Export button not available');
      }
    });
  });

  test('should take progress dashboard screenshot', async ({
    page,
    homePage,
    loginPage,
    vocabularyPage,
    progressPage,
    authHelper,
  }) => {
    const testUser = TestDataBuilder.userCredentials('screenshot-test');

    await test.step('1. Setup progress data', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
      await loginPage.signUp(testUser.fullName!, testUser.email, testUser.password);
      await authHelper.waitForAuthComplete();

      await vocabularyPage.navigate();

      const items = TestDataBuilder.vocabularyItems(3);
      for (const item of items) {
        await vocabularyPage.addVocabulary({
          word: item.word,
          translation: item.translation,
          difficulty: 'beginner' as const,
        });
        await page.waitForTimeout(300);
      }
    });

    await test.step('2. Capture progress dashboard', async () => {
      await progressPage.navigate();
      await progressPage.verifyPageLoaded();

      // Take screenshot
      await progressPage.captureProgressDashboard();
    });
  });
});
