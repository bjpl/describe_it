/**
 * Spaced Repetition Algorithm Implementation
 * Based on the SM-2 algorithm with optimizations for vocabulary learning
 */

export interface ReviewItem {
  id: string;
  phrase: string;
  definition: string;
  difficulty: number; // 1.3 to 2.5 (SM-2 easiness factor)
  interval: number; // days until next review
  repetition: number; // number of successful repetitions
  lastReviewed?: Date;
  nextReview?: Date;
  quality?: number; // last quality score (0-5)
}

export interface ReviewSession {
  items: ReviewItem[];
  startTime: Date;
  endTime?: Date;
  totalReviews: number;
  correctReviews: number;
}

export interface StudyStatistics {
  totalReviews: number;
  correctReviews: number;
  averageQuality: number;
  studyStreak: number;
  masteredItems: number;
  itemsToReview: number;
  estimatedTime: number; // minutes
}

export class SpacedRepetitionSystem {
  private static readonly MIN_EASINESS = 1.3;
  private static readonly MAX_EASINESS = 2.5;
  private static readonly DEFAULT_EASINESS = 2.5;
  private static readonly INITIAL_INTERVAL = 1;

  /**
   * Calculate next review parameters based on quality response
   * @param item The item being reviewed
   * @param quality Quality of response (0-5): 0=complete blackout, 5=perfect
   * @returns Updated review item
   */
  static calculateNextReview(item: ReviewItem, quality: number): ReviewItem {
    const clampedQuality = Math.max(0, Math.min(5, quality));

    let easiness = item.difficulty;
    let interval = item.interval;
    let repetition = item.repetition;

    // Update easiness factor
    easiness =
      easiness +
      (0.1 - (5 - clampedQuality) * (0.08 + (5 - clampedQuality) * 0.02));
    easiness = Math.max(this.MIN_EASINESS, easiness);

    if (clampedQuality < 3) {
      // Incorrect response - reset repetition and set short interval
      repetition = 0;
      interval = this.INITIAL_INTERVAL;
    } else {
      // Correct response - increase repetition and calculate new interval
      if (repetition === 0) {
        interval = this.INITIAL_INTERVAL;
        repetition = 1;
      } else if (repetition === 1) {
        interval = 6;
        repetition = 2;
      } else {
        interval = Math.round(interval * easiness);
        repetition = repetition + 1;
      }
    }

    const now = new Date();
    const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    return {
      ...item,
      difficulty: easiness,
      interval,
      repetition,
      lastReviewed: now,
      nextReview,
      quality: clampedQuality,
    };
  }

  /**
   * Get items that are due for review
   * @param items All review items
   * @param maxItems Maximum number of items to return
   * @returns Items due for review, sorted by priority
   */
  static getItemsDueForReview(
    items: ReviewItem[],
    maxItems: number = 20,
  ): ReviewItem[] {
    const now = new Date();

    const dueItems = items.filter((item) => {
      if (!item.nextReview) return true; // New items
      return item.nextReview <= now;
    });

    // Sort by priority: overdue items first, then by difficulty (harder first)
    return dueItems
      .sort((a, b) => {
        const aOverdue = a.nextReview
          ? Math.max(0, now.getTime() - a.nextReview.getTime())
          : 0;
        const bOverdue = b.nextReview
          ? Math.max(0, now.getTime() - b.nextReview.getTime())
          : 0;

        if (aOverdue !== bOverdue) {
          return bOverdue - aOverdue; // More overdue first
        }

        // If equally overdue, prioritize by difficulty (lower easiness = harder)
        return a.difficulty - b.difficulty;
      })
      .slice(0, maxItems);
  }

  /**
   * Create a new review item
   * @param id Unique identifier
   * @param phrase The phrase to learn
   * @param definition The definition/translation
   * @returns New review item
   */
  static createReviewItem(
    id: string,
    phrase: string,
    definition: string,
  ): ReviewItem {
    return {
      id,
      phrase,
      definition,
      difficulty: this.DEFAULT_EASINESS,
      interval: this.INITIAL_INTERVAL,
      repetition: 0,
      nextReview: new Date(), // Available immediately
    };
  }

  /**
   * Calculate study statistics
   * @param items All review items
   * @returns Comprehensive statistics
   */
  static calculateStatistics(items: ReviewItem[]): StudyStatistics {
    const now = new Date();

    const reviewedItems = items.filter((item) => item.lastReviewed);
    const totalReviews = reviewedItems.reduce(
      (sum, item) => sum + (item.repetition || 0),
      0,
    );
    const correctReviews = reviewedItems.reduce((sum, item) => {
      if (item.quality !== undefined && item.quality >= 3) {
        return sum + (item.repetition || 0);
      }
      return sum;
    }, 0);

    const averageQuality =
      reviewedItems.length > 0
        ? reviewedItems.reduce((sum, item) => sum + (item.quality || 0), 0) /
          reviewedItems.length
        : 0;

    // Calculate study streak (consecutive days with reviews)
    let studyStreak = 0;
    const sortedReviews = reviewedItems.sort(
      (a, b) =>
        (b.lastReviewed?.getTime() || 0) - (a.lastReviewed?.getTime() || 0),
    );

    let currentDate = new Date();
    for (const item of sortedReviews) {
      if (!item.lastReviewed) break;

      const daysDiff = Math.floor(
        (currentDate.getTime() - item.lastReviewed.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysDiff <= 1) {
        studyStreak = Math.max(
          studyStreak,
          daysDiff === 0 ? 1 : studyStreak + 1,
        );
        currentDate = item.lastReviewed;
      } else {
        break;
      }
    }

    // Mastered items (repetition >= 3 and difficulty > 2.0)
    const masteredItems = items.filter(
      (item) => item.repetition >= 3 && item.difficulty > 2.0,
    ).length;

    // Items due for review
    const itemsToReview = items.filter((item) => {
      if (!item.nextReview) return true;
      return item.nextReview <= now;
    }).length;

    // Estimated time (2 minutes per item on average)
    const estimatedTime = Math.round(itemsToReview * 2);

    return {
      totalReviews,
      correctReviews,
      averageQuality,
      studyStreak,
      masteredItems,
      itemsToReview,
      estimatedTime,
    };
  }

  /**
   * Convert quality response to SM-2 quality score
   * @param correct Whether the answer was correct
   * @param confidence Confidence level (optional)
   * @returns Quality score 0-5
   */
  static responseToQuality(
    correct: boolean,
    confidence: "low" | "medium" | "high" = "medium",
  ): number {
    if (!correct) {
      return confidence === "high" ? 2 : confidence === "medium" ? 1 : 0;
    } else {
      return confidence === "high" ? 5 : confidence === "medium" ? 4 : 3;
    }
  }

  /**
   * Get optimal batch size for review session
   * @param totalDue Total items due for review
   * @param availableTime Available time in minutes
   * @returns Optimal batch size
   */
  static getOptimalBatchSize(
    totalDue: number,
    availableTime: number = 30,
  ): number {
    const itemsPerMinute = 0.5; // Conservative estimate
    const maxByTime = Math.floor(availableTime * itemsPerMinute);
    const maxByFocus = 25; // Maximum for maintaining focus
    const minBatch = 5; // Minimum useful batch

    return Math.max(minBatch, Math.min(maxByTime, maxByFocus, totalDue));
  }

  /**
   * Schedule review items for optimal distribution
   * @param items Items to schedule
   * @param daysAhead Number of days to look ahead
   * @returns Scheduled items by date
   */
  static scheduleReviews(
    items: ReviewItem[],
    daysAhead: number = 7,
  ): Map<string, ReviewItem[]> {
    const schedule = new Map<string, ReviewItem[]>();
    const now = new Date();

    for (let i = 0; i < daysAhead; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split("T")[0];

      const itemsForDate = items.filter((item) => {
        if (!item.nextReview) return i === 0; // New items today
        const itemDate = item.nextReview.toISOString().split("T")[0];
        return itemDate === dateKey;
      });

      if (itemsForDate.length > 0) {
        schedule.set(dateKey, itemsForDate);
      }
    }

    return schedule;
  }
}

export default SpacedRepetitionSystem;
