/**
 * Progress Page Object
 *
 * Handles progress tracking and statistics page
 */

import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface ProgressStats {
  wordsLearned: number;
  currentStreak: number;
  totalPracticeTime: number;
  accuracy: number;
}

export class ProgressPage extends BasePage {
  // Selectors
  private readonly selectors = {
    wordsLearnedToday: '[data-testid="words-learned-today"], [class*="words-today"]',
    totalWordsLearned: '[data-testid="total-words-learned"], [class*="total-words"]',
    currentStreak: '[data-testid="learning-streak"], [class*="streak"]',
    practiceTime: '[data-testid="practice-time"], [class*="practice-time"]',
    accuracyRate: '[data-testid="accuracy-rate"], [class*="accuracy"]',
    progressChart: '[data-testid="progress-chart"], [class*="chart"]',
    weeklyChart: '[data-testid="weekly-chart"]',
    monthlyChart: '[data-testid="monthly-chart"]',
    categoryBreakdown: '[data-testid="category-breakdown"]',
    difficultyBreakdown: '[data-testid="difficulty-breakdown"]',
    recentActivity: '[data-testid="recent-activity"]',
    achievementsList: '[data-testid="achievements-list"]',
    achievement: '[data-testid^="achievement-"]',
    exportButton: '[data-testid="export-progress"], button:has-text("Export")',
    shareButton: '[data-testid="share-progress"], button:has-text("Share")',
    timeRangeSelector: '[data-testid="time-range-selector"]',
    todayButton: '[data-testid="range-today"], button:has-text("Today")',
    weekButton: '[data-testid="range-week"], button:has-text("Week")',
    monthButton: '[data-testid="range-month"], button:has-text("Month")',
    allTimeButton: '[data-testid="range-all"], button:has-text("All Time")',
    masteredWords: '[data-testid="mastered-words"]',
    learningWords: '[data-testid="learning-words"]',
    reviewDue: '[data-testid="review-due"]',
    goalProgress: '[data-testid="goal-progress"]',
    dailyGoal: '[data-testid="daily-goal"]',
    weeklyGoal: '[data-testid="weekly-goal"]',
  };

  /**
   * Navigate to progress page
   */
  async navigate(): Promise<void> {
    await this.goto('/progress');
    await this.waitForNetworkIdle();
  }

  /**
   * Get today's words learned count
   */
  async getWordsLearnedToday(): Promise<number> {
    const text = await this.getText(this.selectors.wordsLearnedToday);
    return parseInt(text.replace(/\D/g, ''), 10) || 0;
  }

  /**
   * Get total words learned count
   */
  async getTotalWordsLearned(): Promise<number> {
    const text = await this.getText(this.selectors.totalWordsLearned);
    return parseInt(text.replace(/\D/g, ''), 10) || 0;
  }

  /**
   * Get current learning streak
   */
  async getCurrentStreak(): Promise<number> {
    const text = await this.getText(this.selectors.currentStreak);
    return parseInt(text.replace(/\D/g, ''), 10) || 0;
  }

  /**
   * Get total practice time (in minutes)
   */
  async getPracticeTime(): Promise<number> {
    const text = await this.getText(this.selectors.practiceTime);
    return parseInt(text.replace(/\D/g, ''), 10) || 0;
  }

  /**
   * Get accuracy rate (percentage)
   */
  async getAccuracyRate(): Promise<number> {
    const text = await this.getText(this.selectors.accuracyRate);
    return parseInt(text.replace(/\D/g, ''), 10) || 0;
  }

  /**
   * Get all progress stats
   */
  async getProgressStats(): Promise<ProgressStats> {
    return {
      wordsLearned: await this.getWordsLearnedToday(),
      currentStreak: await this.getCurrentStreak(),
      totalPracticeTime: await this.getPracticeTime(),
      accuracy: await this.getAccuracyRate(),
    };
  }

  /**
   * Change time range filter
   */
  async selectTimeRange(range: 'today' | 'week' | 'month' | 'all'): Promise<void> {
    let buttonSelector: string;

    switch (range) {
      case 'today':
        buttonSelector = this.selectors.todayButton;
        break;
      case 'week':
        buttonSelector = this.selectors.weekButton;
        break;
      case 'month':
        buttonSelector = this.selectors.monthButton;
        break;
      case 'all':
        buttonSelector = this.selectors.allTimeButton;
        break;
    }

    await this.clickWithRetry(buttonSelector);
    await this.waitForNetworkIdle();
  }

  /**
   * Verify progress chart is displayed
   */
  async verifyChartDisplayed(): Promise<void> {
    await expect(this.page.locator(this.selectors.progressChart)).toBeVisible();
  }

  /**
   * Verify weekly chart is displayed
   */
  async verifyWeeklyChartDisplayed(): Promise<void> {
    await expect(this.page.locator(this.selectors.weeklyChart)).toBeVisible();
  }

  /**
   * Get number of achievements earned
   */
  async getAchievementCount(): Promise<number> {
    return await this.getElementCount(this.selectors.achievement);
  }

  /**
   * Verify achievement is earned
   */
  async verifyAchievementEarned(achievementName: string): Promise<void> {
    const achievement = this.page.locator(`${this.selectors.achievement}:has-text("${achievementName}")`).first();
    await expect(achievement).toBeVisible();
  }

  /**
   * Export progress data
   */
  async exportProgress(format: 'pdf' | 'csv' | 'json' = 'pdf'): Promise<void> {
    await this.clickWithRetry(this.selectors.exportButton);
    await this.wait(300);

    // Select format if dropdown appears
    const formatButton = this.page.locator(`button:has-text("${format.toUpperCase()}")`).first();
    const exists = await formatButton.isVisible().catch(() => false);

    if (exists) {
      await formatButton.click();
    }

    // Wait for download to start
    await this.wait(1000);
  }

  /**
   * Share progress
   */
  async shareProgress(): Promise<void> {
    await this.clickWithRetry(this.selectors.shareButton);
    await this.wait(500);
  }

  /**
   * Get mastered words count
   */
  async getMasteredWordsCount(): Promise<number> {
    const text = await this.getText(this.selectors.masteredWords);
    return parseInt(text.replace(/\D/g, ''), 10) || 0;
  }

  /**
   * Get learning words count
   */
  async getLearningWordsCount(): Promise<number> {
    const text = await this.getText(this.selectors.learningWords);
    return parseInt(text.replace(/\D/g, ''), 10) || 0;
  }

  /**
   * Get review due count
   */
  async getReviewDueCount(): Promise<number> {
    const text = await this.getText(this.selectors.reviewDue);
    return parseInt(text.replace(/\D/g, ''), 10) || 0;
  }

  /**
   * Verify daily goal progress
   */
  async verifyDailyGoalProgress(expected: number): Promise<void> {
    const goalText = await this.getText(this.selectors.dailyGoal);
    const progress = parseInt(goalText.replace(/\D/g, ''), 10);
    expect(progress).toBeGreaterThanOrEqual(expected);
  }

  /**
   * Verify category breakdown is shown
   */
  async verifyCategoryBreakdownVisible(): Promise<void> {
    await expect(this.page.locator(this.selectors.categoryBreakdown)).toBeVisible();
  }

  /**
   * Verify difficulty breakdown is shown
   */
  async verifyDifficultyBreakdownVisible(): Promise<void> {
    await expect(this.page.locator(this.selectors.difficultyBreakdown)).toBeVisible();
  }

  /**
   * Verify recent activity is shown
   */
  async verifyRecentActivityVisible(): Promise<void> {
    await expect(this.page.locator(this.selectors.recentActivity)).toBeVisible();
  }

  /**
   * Get recent activity items
   */
  async getRecentActivityItems(): Promise<string[]> {
    const items = await this.page.locator(`${this.selectors.recentActivity} [data-testid^="activity-"]`).all();
    const activities: string[] = [];

    for (const item of items) {
      const text = await item.textContent();
      if (text) activities.push(text.trim());
    }

    return activities;
  }

  /**
   * Verify progress page is loaded with all sections
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.page.locator(this.selectors.wordsLearnedToday)).toBeVisible();
    await expect(this.page.locator(this.selectors.currentStreak)).toBeVisible();
    await expect(this.page.locator(this.selectors.progressChart)).toBeVisible();
  }

  /**
   * Verify progress has increased
   */
  async verifyProgressIncreased(previousStats: ProgressStats): Promise<void> {
    const currentStats = await this.getProgressStats();

    // At least one stat should have increased
    const hasIncreased =
      currentStats.wordsLearned > previousStats.wordsLearned ||
      currentStats.totalPracticeTime > previousStats.totalPracticeTime;

    expect(hasIncreased).toBe(true);
  }

  /**
   * Take screenshot of progress dashboard
   */
  async captureProgressDashboard(): Promise<void> {
    await this.screenshot('progress-dashboard', { fullPage: true });
  }
}
