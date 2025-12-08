/**
 * Vocabulary Page Object
 *
 * Handles vocabulary builder page interactions
 */

import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface VocabularyItemInput {
  word: string;
  translation: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  partOfSpeech?: string;
  exampleSentence?: string;
  category?: string;
}

export class VocabularyPage extends BasePage {
  // Selectors
  private readonly selectors = {
    addButton: '[data-testid="add-vocabulary-button"], button:has-text("Add"), button:has-text("New")',
    wordInput: '[data-testid="word-input"], input[placeholder*="word" i]',
    translationInput: '[data-testid="translation-input"], input[placeholder*="translation" i]',
    difficultySelect: '[data-testid="difficulty-select"], select:has(option:has-text("beginner"))',
    partOfSpeechSelect: '[data-testid="part-of-speech-select"], select:has(option:has-text("noun"))',
    categoryInput: '[data-testid="category-input"], input[placeholder*="category" i]',
    exampleInput: '[data-testid="example-sentence-input"], textarea[placeholder*="example" i]',
    saveButton: '[data-testid="save-vocabulary-button"], button:has-text("Save")',
    cancelButton: '[data-testid="cancel-vocabulary-button"], button:has-text("Cancel")',
    vocabularyList: '[data-testid="vocabulary-list"], [class*="vocabulary-list"]',
    vocabularyCard: '[data-testid^="vocabulary-card-"], [class*="vocabulary-card"]',
    editButton: (id: string) => `[data-testid="edit-vocabulary-${id}"], [data-vocab-id="${id}"] button:has-text("Edit")`,
    deleteButton: (id: string) => `[data-testid="delete-vocabulary-${id}"], [data-vocab-id="${id}"] button:has-text("Delete")`,
    searchInput: '[data-testid="vocabulary-search"], input[placeholder*="search" i]',
    filterButton: '[data-testid="filter-button"], button:has-text("Filter")',
    sortButton: '[data-testid="sort-button"], button:has-text("Sort")',
    emptyState: '[data-testid="empty-state"], [class*="empty"]',
    confirmDialog: '[data-testid="confirm-dialog"], [role="dialog"]',
    confirmButton: '[data-testid="confirm-button"], button:has-text("Confirm"), button:has-text("Delete")',
  };

  /**
   * Navigate to vocabulary page
   */
  async navigate(): Promise<void> {
    await this.goto('/vocabulary');
    await this.waitForNetworkIdle();
  }

  /**
   * Add new vocabulary item
   */
  async addVocabulary(item: VocabularyItemInput): Promise<void> {
    // Open add form
    await this.clickWithRetry(this.selectors.addButton);
    await this.wait(300); // Allow form to appear

    // Fill word
    await this.fillField(this.selectors.wordInput, item.word, { clear: true, validate: true });

    // Fill translation
    await this.fillField(this.selectors.translationInput, item.translation, { clear: true, validate: true });

    // Select difficulty if provided
    if (item.difficulty) {
      const difficultyExists = await this.exists(this.selectors.difficultySelect);
      if (difficultyExists) {
        await this.selectOption(this.selectors.difficultySelect, item.difficulty);
      }
    }

    // Select part of speech if provided
    if (item.partOfSpeech) {
      const posExists = await this.exists(this.selectors.partOfSpeechSelect);
      if (posExists) {
        await this.selectOption(this.selectors.partOfSpeechSelect, item.partOfSpeech);
      }
    }

    // Fill category if provided
    if (item.category) {
      const categoryExists = await this.exists(this.selectors.categoryInput);
      if (categoryExists) {
        await this.fillField(this.selectors.categoryInput, item.category);
      }
    }

    // Fill example sentence if provided
    if (item.exampleSentence) {
      const exampleExists = await this.exists(this.selectors.exampleInput);
      if (exampleExists) {
        await this.fillField(this.selectors.exampleInput, item.exampleSentence);
      }
    }

    // Save
    const savePromise = this.waitForAPI('/api/vocabulary', {
      method: 'POST',
      timeout: 10000
    }).catch(() => {
      console.log('Vocabulary save API wait timeout');
    });

    await this.clickWithRetry(this.selectors.saveButton);
    await savePromise;

    // Wait for success indication
    await this.wait(500);
  }

  /**
   * Edit existing vocabulary item
   */
  async editVocabulary(id: string, updates: Partial<VocabularyItemInput>): Promise<void> {
    // Click edit button
    await this.clickWithRetry(this.selectors.editButton(id));
    await this.wait(300);

    // Update fields
    if (updates.word !== undefined) {
      await this.fillField(this.selectors.wordInput, updates.word, { clear: true, validate: true });
    }

    if (updates.translation !== undefined) {
      await this.fillField(this.selectors.translationInput, updates.translation, { clear: true, validate: true });
    }

    if (updates.difficulty) {
      await this.selectOption(this.selectors.difficultySelect, updates.difficulty);
    }

    if (updates.partOfSpeech) {
      await this.selectOption(this.selectors.partOfSpeechSelect, updates.partOfSpeech);
    }

    if (updates.exampleSentence) {
      await this.fillField(this.selectors.exampleInput, updates.exampleSentence, { clear: true });
    }

    // Save changes
    const updatePromise = this.waitForAPI(`/api/vocabulary/${id}`, {
      method: 'PUT',
      timeout: 10000
    }).catch(() => {
      console.log('Vocabulary update API wait timeout');
    });

    await this.clickWithRetry(this.selectors.saveButton);
    await updatePromise;

    await this.wait(500);
  }

  /**
   * Delete vocabulary item
   */
  async deleteVocabulary(id: string): Promise<void> {
    // Click delete button
    await this.clickWithRetry(this.selectors.deleteButton(id));

    // Wait for confirm dialog
    await this.waitForElement(this.selectors.confirmDialog);

    // Confirm deletion
    const deletePromise = this.waitForAPI(`/api/vocabulary/${id}`, {
      method: 'DELETE',
      timeout: 10000
    }).catch(() => {
      console.log('Vocabulary delete API wait timeout');
    });

    await this.clickWithRetry(this.selectors.confirmButton);
    await deletePromise;

    await this.wait(500);
  }

  /**
   * Search vocabulary
   */
  async searchVocabulary(query: string): Promise<void> {
    await this.fillField(this.selectors.searchInput, query);
    await this.wait(500); // Debounce delay
    await this.waitForNetworkIdle();
  }

  /**
   * Get vocabulary count
   */
  async getVocabularyCount(): Promise<number> {
    return await this.getElementCount(this.selectors.vocabularyCard);
  }

  /**
   * Verify vocabulary exists by word
   */
  async verifyVocabularyExists(word: string): Promise<void> {
    const card = this.page.locator(`${this.selectors.vocabularyCard}:has-text("${word}")`).first();
    await expect(card).toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify vocabulary does not exist
   */
  async verifyVocabularyNotExists(word: string): Promise<void> {
    const card = this.page.locator(`${this.selectors.vocabularyCard}:has-text("${word}")`).first();
    await expect(card).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Batch add vocabulary items
   */
  async batchAddVocabulary(items: VocabularyItemInput[]): Promise<void> {
    for (const item of items) {
      await this.addVocabulary(item);
      await this.wait(300); // Small delay between additions
    }
  }

  /**
   * Get all vocabulary words on page
   */
  async getAllVocabularyWords(): Promise<string[]> {
    const cards = await this.page.locator(this.selectors.vocabularyCard).all();
    const words: string[] = [];

    for (const card of cards) {
      const text = await card.textContent();
      if (text) words.push(text.trim());
    }

    return words;
  }

  /**
   * Verify empty state is shown
   */
  async verifyEmptyState(): Promise<void> {
    await expect(this.page.locator(this.selectors.emptyState)).toBeVisible();
  }

  /**
   * Verify vocabulary list is loaded
   */
  async verifyVocabularyListLoaded(): Promise<void> {
    // Either vocabulary list or empty state should be visible
    const listVisible = await this.isVisible(this.selectors.vocabularyList);
    const emptyVisible = await this.isVisible(this.selectors.emptyState);

    expect(listVisible || emptyVisible).toBe(true);
  }

  /**
   * Filter by difficulty
   */
  async filterByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): Promise<void> {
    await this.clickWithRetry(this.selectors.filterButton);
    await this.wait(200);

    const difficultyOption = this.page.locator(`button:has-text("${difficulty}"), [value="${difficulty}"]`).first();
    await difficultyOption.click();

    await this.waitForNetworkIdle();
  }

  /**
   * Sort vocabulary list
   */
  async sortBy(option: 'alphabetical' | 'recent' | 'difficulty'): Promise<void> {
    await this.clickWithRetry(this.selectors.sortButton);
    await this.wait(200);

    const sortOption = this.page.locator(`button:has-text("${option}"), [value="${option}"]`).first();
    await sortOption.click();

    await this.wait(500);
  }

  /**
   * Cancel vocabulary form
   */
  async cancelForm(): Promise<void> {
    await this.clickWithRetry(this.selectors.cancelButton);
    await this.wait(300);
  }

  /**
   * Verify form is open
   */
  async verifyFormOpen(): Promise<void> {
    await expect(this.page.locator(this.selectors.wordInput)).toBeVisible();
  }

  /**
   * Verify form is closed
   */
  async verifyFormClosed(): Promise<void> {
    await expect(this.page.locator(this.selectors.wordInput)).not.toBeVisible();
  }
}
