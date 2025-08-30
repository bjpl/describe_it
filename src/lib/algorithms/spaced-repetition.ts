/**
 * Spaced Repetition Algorithm Implementation
 * Based on SuperMemo SM-2 algorithm with modifications for Spanish learning
 */

export interface SpacedRepetitionCard {
  id: string;
  phrase_id: string;
  user_id: string;
  
  // SuperMemo SM-2 parameters
  easiness_factor: number; // E-Factor (1.3 - 2.5)
  interval: number; // Days until next review
  repetitions: number; // Number of successful repetitions
  
  // Additional learning parameters
  quality_responses: number[]; // History of quality ratings (0-5)
  last_reviewed: Date | null;
  next_review: Date;
  
  // Learning context
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  study_streak: number;
  mistake_count: number;
  
  created_at: Date;
  updated_at: Date;
}

export interface ReviewResult {
  quality: number; // 0-5 quality rating
  response_time_ms?: number;
  was_correct: boolean;
  hints_used?: number;
}

export class SpacedRepetitionAlgorithm {
  // Default parameters based on research
  private static readonly DEFAULT_EASINESS_FACTOR = 2.5;
  private static readonly MIN_EASINESS_FACTOR = 1.3;
  private static readonly MAX_EASINESS_FACTOR = 2.5;
  private static readonly INITIAL_INTERVAL = 1;
  private static readonly SECOND_INTERVAL = 6;

  /**
   * Initialize a new spaced repetition card
   */
  static initializeCard(phraseId: string, userId: string, difficulty: 'beginner' | 'intermediate' | 'advanced', category: string): SpacedRepetitionCard {
    const now = new Date();
    
    // Adjust initial parameters based on difficulty
    let easinessFactor = this.DEFAULT_EASINESS_FACTOR;
    let initialInterval = this.INITIAL_INTERVAL;
    
    switch (difficulty) {
      case 'beginner':
        easinessFactor = 2.5;
        initialInterval = 1;
        break;
      case 'intermediate':
        easinessFactor = 2.3;
        initialInterval = 2;
        break;
      case 'advanced':
        easinessFactor = 2.1;
        initialInterval = 3;
        break;
    }

    return {
      id: `sr_${phraseId}_${userId}`,
      phrase_id: phraseId,
      user_id: userId,
      easiness_factor: easinessFactor,
      interval: initialInterval,
      repetitions: 0,
      quality_responses: [],
      last_reviewed: null,
      next_review: new Date(now.getTime() + initialInterval * 24 * 60 * 60 * 1000),
      difficulty_level: difficulty,
      category,
      study_streak: 0,
      mistake_count: 0,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Update card based on review result using modified SuperMemo SM-2 algorithm
   */
  static updateCard(card: SpacedRepetitionCard, result: ReviewResult): SpacedRepetitionCard {
    const updatedCard = { ...card };
    const now = new Date();

    // Update review history
    updatedCard.quality_responses.push(result.quality);
    updatedCard.last_reviewed = now;
    updatedCard.updated_at = now;

    // Keep only last 10 quality responses for performance
    if (updatedCard.quality_responses.length > 10) {
      updatedCard.quality_responses = updatedCard.quality_responses.slice(-10);
    }

    // Update mistake count and streak
    if (result.quality >= 3) {
      updatedCard.study_streak += 1;
      if (result.was_correct) {
        updatedCard.repetitions += 1;
      }
    } else {
      updatedCard.study_streak = 0;
      updatedCard.mistake_count += 1;
      updatedCard.repetitions = 0; // Reset repetitions on failure
    }

    // Calculate new easiness factor
    const oldEF = updatedCard.easiness_factor;
    const newEF = Math.max(
      this.MIN_EASINESS_FACTOR,
      Math.min(
        this.MAX_EASINESS_FACTOR,
        oldEF + (0.1 - (5 - result.quality) * (0.08 + (5 - result.quality) * 0.02))
      )
    );
    updatedCard.easiness_factor = Number(newEF.toFixed(2));

    // Calculate new interval
    let newInterval: number;
    
    if (result.quality < 3) {
      // Failed review - restart with short interval
      newInterval = 1;
    } else if (updatedCard.repetitions === 1) {
      newInterval = this.SECOND_INTERVAL;
    } else if (updatedCard.repetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(updatedCard.interval * updatedCard.easiness_factor);
    }

    // Apply response time adjustment
    if (result.response_time_ms) {
      const responseTimeFactor = this.calculateResponseTimeFactor(result.response_time_ms, updatedCard.difficulty_level);
      newInterval = Math.round(newInterval * responseTimeFactor);
    }

    // Apply category-specific adjustments
    newInterval = this.applyCategoryAdjustment(newInterval, updatedCard.category);

    // Apply difficulty-specific adjustments
    newInterval = this.applyDifficultyAdjustment(newInterval, updatedCard.difficulty_level);

    // Apply consistency bonus/penalty
    const consistencyFactor = this.calculateConsistencyFactor(updatedCard);
    newInterval = Math.round(newInterval * consistencyFactor);

    // Ensure minimum interval of 1 day
    updatedCard.interval = Math.max(1, newInterval);

    // Set next review date
    updatedCard.next_review = new Date(now.getTime() + updatedCard.interval * 24 * 60 * 60 * 1000);

    return updatedCard;
  }

  /**
   * Calculate response time factor (0.8 - 1.2)
   */
  private static calculateResponseTimeFactor(responseTimeMs: number, difficulty: 'beginner' | 'intermediate' | 'advanced'): number {
    // Expected response times by difficulty (in milliseconds)
    const expectedTimes = {
      beginner: 8000,    // 8 seconds
      intermediate: 6000, // 6 seconds
      advanced: 4000,    // 4 seconds
    };

    const expected = expectedTimes[difficulty];
    const ratio = responseTimeMs / expected;

    // Faster responses get slight bonus, slower get penalty
    if (ratio < 0.5) return 1.1;      // Very fast - small bonus
    if (ratio < 0.8) return 1.05;     // Fast - small bonus
    if (ratio < 1.2) return 1.0;      // Normal - no change
    if (ratio < 2.0) return 0.95;     // Slow - small penalty
    return 0.9;                       // Very slow - penalty
  }

  /**
   * Apply category-specific interval adjustments
   */
  private static applyCategoryAdjustment(interval: number, category: string): number {
    const adjustments = {
      vocabulary: 1.0,          // Standard
      expression: 0.9,          // Slightly harder to remember
      idiom: 0.8,              // More difficult
      phrase: 1.0,             // Standard
      grammar_pattern: 0.85,    // Requires more practice
      collocation: 0.9,        // Slightly harder
      verb_conjugation: 0.7,    // Much more practice needed
      cultural_reference: 0.95  // Context-dependent
    };

    const factor = adjustments[category as keyof typeof adjustments] || 1.0;
    return Math.round(interval * factor);
  }

  /**
   * Apply difficulty-specific adjustments
   */
  private static applyDifficultyAdjustment(interval: number, difficulty: 'beginner' | 'intermediate' | 'advanced'): number {
    const adjustments = {
      beginner: 1.1,      // Longer intervals - easier to remember
      intermediate: 1.0,   // Standard intervals
      advanced: 0.9,      // Shorter intervals - more complex
    };

    return Math.round(interval * adjustments[difficulty]);
  }

  /**
   * Calculate consistency factor based on recent performance
   */
  private static calculateConsistencyFactor(card: SpacedRepetitionCard): number {
    if (card.quality_responses.length < 3) return 1.0;

    const recentResponses = card.quality_responses.slice(-5); // Last 5 responses
    const average = recentResponses.reduce((sum, q) => sum + q, 0) / recentResponses.length;
    const variance = recentResponses.reduce((sum, q) => sum + Math.pow(q - average, 2), 0) / recentResponses.length;

    // High consistency (low variance) gets bonus
    // Low consistency (high variance) gets penalty
    if (variance < 0.5 && average >= 4) return 1.1;   // Very consistent and good
    if (variance < 1.0 && average >= 3) return 1.05;  // Consistent
    if (variance > 2.0) return 0.9;                   // Inconsistent
    
    return 1.0;
  }

  /**
   * Determine if a card is due for review
   */
  static isDue(card: SpacedRepetitionCard, now: Date = new Date()): boolean {
    return card.next_review <= now;
  }

  /**
   * Get cards due for review, sorted by priority
   */
  static sortCardsByPriority(cards: SpacedRepetitionCard[], now: Date = new Date()): SpacedRepetitionCard[] {
    return cards
      .filter(card => this.isDue(card, now))
      .sort((a, b) => {
        // Priority factors:
        // 1. How overdue (higher priority for more overdue)
        const overdueA = now.getTime() - a.next_review.getTime();
        const overdueB = now.getTime() - b.next_review.getTime();
        
        // 2. Mistake count (higher priority for more mistakes)
        const mistakeFactorA = a.mistake_count * 0.1;
        const mistakeFactorB = b.mistake_count * 0.1;
        
        // 3. Low easiness factor (harder cards get priority)
        const difficultyFactorA = (3.0 - a.easiness_factor) * 0.05;
        const difficultyFactorB = (3.0 - b.easiness_factor) * 0.05;
        
        const priorityA = overdueA + mistakeFactorA + difficultyFactorA;
        const priorityB = overdueB + mistakeFactorB + difficultyFactorB;
        
        return priorityB - priorityA; // Higher priority first
      });
  }

  /**
   * Calculate optimal daily review count based on user performance
   */
  static calculateOptimalDailyReviews(cards: SpacedRepetitionCard[], userLevel: 'beginner' | 'intermediate' | 'advanced'): number {
    const baseCounts = {
      beginner: 15,
      intermediate: 25,
      advanced: 35,
    };

    const dueCards = cards.filter(card => this.isDue(card));
    const baseCount = baseCounts[userLevel];
    
    // Adjust based on current backlog
    if (dueCards.length > baseCount * 1.5) {
      return Math.min(baseCount * 1.3, dueCards.length);
    } else if (dueCards.length < baseCount * 0.5) {
      return Math.max(baseCount * 0.7, dueCards.length);
    }
    
    return Math.min(baseCount, dueCards.length);
  }

  /**
   * Generate study statistics
   */
  static generateStatistics(cards: SpacedRepetitionCard[]): {
    total_cards: number;
    due_today: number;
    overdue: number;
    mastered: number; // Cards with high easiness factor and long intervals
    learning: number; // Cards still being learned
    average_easiness: number;
    average_interval: number;
    success_rate: number;
  } {
    const now = new Date();
    const dueToday = cards.filter(card => this.isDue(card, now));
    const overdue = cards.filter(card => 
      card.next_review < new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );
    const mastered = cards.filter(card => 
      card.easiness_factor >= 2.2 && card.interval >= 21 && card.repetitions >= 3
    );
    
    const totalResponses = cards.reduce((sum, card) => sum + card.quality_responses.length, 0);
    const successfulResponses = cards.reduce((sum, card) => 
      sum + card.quality_responses.filter(q => q >= 3).length, 0);

    return {
      total_cards: cards.length,
      due_today: dueToday.length,
      overdue: overdue.length,
      mastered: mastered.length,
      learning: cards.length - mastered.length,
      average_easiness: cards.length > 0 
        ? cards.reduce((sum, card) => sum + card.easiness_factor, 0) / cards.length 
        : 0,
      average_interval: cards.length > 0 
        ? cards.reduce((sum, card) => sum + card.interval, 0) / cards.length 
        : 0,
      success_rate: totalResponses > 0 ? successfulResponses / totalResponses : 0,
    };
  }
}

/**
 * Quality rating guidelines for UI:
 * 5 - Perfect response (immediate, confident)
 * 4 - Correct response with slight hesitation
 * 3 - Correct response with difficulty
 * 2 - Incorrect response but remembered with hint
 * 1 - Incorrect response, partial knowledge
 * 0 - Complete blackout, no knowledge
 */