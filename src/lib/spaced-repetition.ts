/**
 * Spaced Repetition Algorithm (SM-2)
 * Based on the SuperMemo 2 algorithm for optimal learning intervals
 */

export interface ReviewResult {
  itemId: string;
  quality: 0 | 1 | 2 | 3 | 4 | 5; // 0: complete blackout, 5: perfect recall
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
}

export interface ReviewItem {
  id: string;
  easeFactor: number; // Default: 2.5
  interval: number; // Days until next review
  repetitions: number; // Number of successful reviews
  lastReviewDate: Date | null;
  nextReviewDate: Date | null;
}

/**
 * Calculate next review parameters using SM-2 algorithm
 * @param item - Current review item state
 * @param quality - User's recall quality (0-5)
 * @returns Updated review parameters
 */
export function calculateNextReview(
  item: ReviewItem,
  quality: 0 | 1 | 2 | 3 | 4 | 5
): ReviewResult {
  let { easeFactor, interval, repetitions } = item;

  // Quality < 3 means incorrect recall - reset repetitions
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    // Correct recall - update parameters
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor based on quality
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    itemId: item.id,
    quality,
    easeFactor: Number(easeFactor.toFixed(2)),
    interval,
    repetitions,
    nextReviewDate,
  };
}

/**
 * Map user-friendly difficulty ratings to SM-2 quality values
 */
export const DIFFICULTY_MAP = {
  again: 0, // Complete blackout
  hard: 3, // Correct with serious difficulty
  good: 4, // Correct with hesitation
  easy: 5, // Perfect recall
} as const;

export type DifficultyRating = keyof typeof DIFFICULTY_MAP;

/**
 * Get quality score from difficulty rating
 */
export function getQualityFromDifficulty(
  difficulty: DifficultyRating
): 0 | 1 | 2 | 3 | 4 | 5 {
  return DIFFICULTY_MAP[difficulty];
}

/**
 * Initialize a new review item with default values
 */
export function initializeReviewItem(itemId: string): ReviewItem {
  return {
    id: itemId,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    lastReviewDate: null,
    nextReviewDate: new Date(), // Available for immediate review
  };
}

/**
 * Determine if an item is due for review
 */
export function isDueForReview(item: ReviewItem): boolean {
  if (!item.nextReviewDate) return true;
  return new Date() >= new Date(item.nextReviewDate);
}

/**
 * Get items due for review from a collection
 */
export function getDueItems(items: ReviewItem[]): ReviewItem[] {
  return items.filter(isDueForReview).sort((a, b) => {
    const aDate = a.nextReviewDate?.getTime() ?? 0;
    const bDate = b.nextReviewDate?.getTime() ?? 0;
    return aDate - bDate;
  });
}

/**
 * Calculate session statistics
 */
export interface SessionStats {
  totalCards: number;
  reviewed: number;
  correct: number;
  accuracy: number;
  averageQuality: number;
}

export function calculateSessionStats(
  reviews: ReviewResult[]
): SessionStats {
  const totalCards = reviews.length;
  const correct = reviews.filter((r) => r.quality >= 3).length;
  const averageQuality =
    reviews.reduce((sum, r) => sum + r.quality, 0) / (totalCards || 1);

  return {
    totalCards,
    reviewed: totalCards,
    correct,
    accuracy: totalCards > 0 ? (correct / totalCards) * 100 : 0,
    averageQuality: Number(averageQuality.toFixed(2)),
  };
}
