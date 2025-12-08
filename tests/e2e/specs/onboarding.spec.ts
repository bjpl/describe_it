/**
 * Onboarding User Journey E2E Test
 *
 * Tests the complete first-time user experience from signup to first learning session
 *
 * @smoke - Critical path test
 * @critical - First-time user experience
 */

import { test, expect, TestTags, TestDataBuilder } from '../helpers/fixtures';

test.describe('First-Time User Onboarding @smoke @critical', () => {
  test('should complete full onboarding flow from signup to first vocabulary', async ({
    page,
    homePage,
    loginPage,
    vocabularyPage,
    authHelper,
  }) => {
    // Generate unique test user
    const testUser = TestDataBuilder.userCredentials('onboarding');

    await test.step('1. Navigate to home page', async () => {
      await homePage.navigate();
      await homePage.verifyPageLoaded();
    });

    await test.step('2. Open authentication modal', async () => {
      await homePage.clickAuthButton();
      await loginPage.verifyModalOpen();
    });

    await test.step('3. Sign up new account', async () => {
      await loginPage.signUp(
        testUser.fullName!,
        testUser.email,
        testUser.password
      );

      // Wait for authentication to complete
      await authHelper.waitForAuthComplete();

      // Verify user is authenticated
      const isAuthenticated = await authHelper.isAuthenticated();
      expect(isAuthenticated).toBe(true);
    });

    await test.step('4. Navigate to vocabulary builder', async () => {
      await vocabularyPage.navigate();
      await vocabularyPage.verifyVocabularyListLoaded();
    });

    await test.step('5. Add first vocabulary item', async () => {
      const firstWord = {
        word: 'hola',
        translation: 'hello',
        difficulty: 'beginner' as const,
        partOfSpeech: 'interjection',
        exampleSentence: 'Hola, ¿cómo estás?',
      };

      await vocabularyPage.addVocabulary(firstWord);
      await vocabularyPage.verifyVocabularyExists(firstWord.word);
    });

    await test.step('6. Verify vocabulary was saved', async () => {
      const count = await vocabularyPage.getVocabularyCount();
      expect(count).toBeGreaterThan(0);
    });

    await test.step('7. Sign out', async () => {
      await authHelper.signOut();
      const isAuthenticated = await authHelper.isAuthenticated();
      expect(isAuthenticated).toBe(false);
    });
  });

  test('should handle onboarding with multiple vocabulary items @smoke', async ({
    page,
    homePage,
    loginPage,
    vocabularyPage,
    authHelper,
  }) => {
    const testUser = TestDataBuilder.userCredentials('onboarding-multi');

    await test.step('1. Sign up and authenticate', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
      await loginPage.signUp(testUser.fullName!, testUser.email, testUser.password);
      await authHelper.waitForAuthComplete();
    });

    await test.step('2. Add multiple vocabulary items', async () => {
      await vocabularyPage.navigate();

      const vocabularyItems = [
        { word: 'buenos días', translation: 'good morning', difficulty: 'beginner' as const },
        { word: 'buenas noches', translation: 'good night', difficulty: 'beginner' as const },
        { word: 'gracias', translation: 'thank you', difficulty: 'beginner' as const },
      ];

      for (const item of vocabularyItems) {
        await vocabularyPage.addVocabulary(item);
      }

      const count = await vocabularyPage.getVocabularyCount();
      expect(count).toBe(vocabularyItems.length);
    });

    await test.step('3. Verify all items are visible', async () => {
      await vocabularyPage.verifyVocabularyExists('buenos días');
      await vocabularyPage.verifyVocabularyExists('buenas noches');
      await vocabularyPage.verifyVocabularyExists('gracias');
    });
  });

  test('should show empty state for new user', async ({
    homePage,
    loginPage,
    vocabularyPage,
    authHelper,
  }) => {
    const testUser = TestDataBuilder.userCredentials('empty-state');

    await test.step('1. Sign up new user', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
      await loginPage.signUp(testUser.fullName!, testUser.email, testUser.password);
      await authHelper.waitForAuthComplete();
    });

    await test.step('2. Navigate to vocabulary and verify empty state', async () => {
      await vocabularyPage.navigate();

      // New user should see empty state or zero vocabulary items
      const count = await vocabularyPage.getVocabularyCount();
      expect(count).toBe(0);
    });
  });

  test('should allow user to cancel vocabulary creation', async ({
    homePage,
    loginPage,
    vocabularyPage,
    authHelper,
  }) => {
    const testUser = TestDataBuilder.userCredentials('cancel-test');

    await test.step('1. Authenticate user', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
      await loginPage.signUp(testUser.fullName!, testUser.email, testUser.password);
      await authHelper.waitForAuthComplete();
    });

    await test.step('2. Open vocabulary form and cancel', async () => {
      await vocabularyPage.navigate();

      // Try to add vocabulary but cancel
      await page.locator('[data-testid="add-vocabulary-button"], button:has-text("Add")').first().click();
      await page.waitForTimeout(300);

      // Verify form is open
      const wordInput = page.locator('[data-testid="word-input"], input[placeholder*="word" i]');
      await expect(wordInput).toBeVisible();

      // Cancel the form
      await vocabularyPage.cancelForm();

      // Verify form is closed
      await expect(wordInput).not.toBeVisible();
    });

    await test.step('3. Verify no vocabulary was added', async () => {
      const count = await vocabularyPage.getVocabularyCount();
      expect(count).toBe(0);
    });
  });

  test('should validate required fields in vocabulary form', async ({
    page,
    homePage,
    loginPage,
    vocabularyPage,
    authHelper,
  }) => {
    const testUser = TestDataBuilder.userCredentials('validation-test');

    await test.step('1. Authenticate user', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
      await loginPage.signUp(testUser.fullName!, testUser.email, testUser.password);
      await authHelper.waitForAuthComplete();
    });

    await test.step('2. Try to save empty vocabulary form', async () => {
      await vocabularyPage.navigate();

      // Open form
      await page.locator('[data-testid="add-vocabulary-button"], button:has-text("Add")').first().click();
      await page.waitForTimeout(300);

      // Try to save without filling required fields
      const saveButton = page.locator('[data-testid="save-vocabulary-button"], button:has-text("Save")').first();
      await saveButton.click();

      // Form should still be visible (validation failed)
      const wordInput = page.locator('[data-testid="word-input"], input[placeholder*="word" i]');
      const isVisible = await wordInput.isVisible({ timeout: 2000 });

      // Either form is still visible or we see validation error
      // (behavior depends on implementation)
      expect(isVisible).toBe(true);
    });
  });
});

test.describe('User Authentication Edge Cases', () => {
  test('should show error for invalid credentials @auth', async ({
    homePage,
    loginPage,
  }) => {
    await test.step('1. Navigate and open auth modal', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
    });

    await test.step('2. Attempt login with invalid credentials', async () => {
      await loginPage.switchToSignIn();

      await loginPage.signIn('nonexistent@example.com', 'wrongpassword');

      // Wait a moment for error to appear
      await loginPage.page.waitForTimeout(2000);

      // Error message may be shown or modal stays open
      const modalVisible = await loginPage.isVisible('[data-testid="auth-modal"], [role="dialog"]');

      // If modal is still visible, authentication failed (expected)
      expect(modalVisible).toBe(true);
    });
  });

  test('should prevent duplicate email registration @auth', async ({
    page,
    homePage,
    loginPage,
    authHelper,
  }) => {
    const testUser = TestDataBuilder.userCredentials('duplicate-test');

    await test.step('1. Create first account', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
      await loginPage.signUp(testUser.fullName!, testUser.email, testUser.password);
      await authHelper.waitForAuthComplete().catch(() => {
        console.log('First signup timeout, continuing...');
      });
    });

    await test.step('2. Sign out', async () => {
      const isAuth = await authHelper.isAuthenticated();
      if (isAuth) {
        await authHelper.signOut();
      }
    });

    await test.step('3. Try to sign up with same email', async () => {
      await homePage.navigate();
      await homePage.clickAuthButton();
      await loginPage.signUp(testUser.fullName!, testUser.email, testUser.password);

      // Wait for error or modal to remain open
      await page.waitForTimeout(2000);

      // Modal should still be visible (signup failed)
      const modalVisible = await loginPage.isVisible('[data-testid="auth-modal"], [role="dialog"]');
      expect(modalVisible).toBe(true);
    });
  });
});
