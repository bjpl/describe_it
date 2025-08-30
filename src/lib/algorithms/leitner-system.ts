/**
 * Leitner System Implementation
 * A simple spaced repetition method using boxes/levels
 */

export interface LeitnerCard {
  phrase_id: string;
  user_id: string;
  box_level: number; // 1-7, representing review intervals
  last_reviewed: Date | null;
  next_review_date: Date;
  correct_count: number;
  incorrect_count: number;
  created_at: Date;
}

export interface LeitnerBox {
  level: number;
  interval_days: number;
  cards: LeitnerCard[];
  next_review_date: Date;
}

/**
 * Leitner System Algorithm
 * Cards move between boxes based on correct/incorrect responses
 */
export class LeitnerSystemAlgorithm {
  // Standard Leitner box intervals (in days)
  private static readonly BOX_INTERVALS = [1, 2, 4, 8, 16, 32, 64];
  private static readonly MAX_BOX_LEVEL = 7;

  /**
   * Create a new Leitner card (starts in box 1)
   */
  static createCard(phraseId: string, userId: string): LeitnerCard {
    const now = new Date();
    return {
      phrase_id: phraseId,
      user_id: userId,
      box_level: 1,
      last_reviewed: null,
      next_review_date: now, // Due immediately
      correct_count: 0,
      incorrect_count: 0,
      created_at: now,
    };
  }

  /**
   * Process review response and move card between boxes
   */
  static processReview(card: LeitnerCard, isCorrect: boolean): LeitnerCard {
    const updatedCard = { ...card };
    const now = new Date();
    updatedCard.last_reviewed = now;

    if (isCorrect) {
      updatedCard.correct_count += 1;
      // Move to next box (up to maximum)
      updatedCard.box_level = Math.min(this.MAX_BOX_LEVEL, card.box_level + 1);
    } else {
      updatedCard.incorrect_count += 1;
      // Move back to box 1
      updatedCard.box_level = 1;
    }

    // Calculate next review date based on new box level
    const interval = this.BOX_INTERVALS[updatedCard.box_level - 1];
    updatedCard.next_review_date = new Date();
    updatedCard.next_review_date.setDate(now.getDate() + interval);

    return updatedCard;
  }

  /**
   * Get cards due for review
   */
  static getCardsDue(cards: LeitnerCard[]): LeitnerCard[] {
    const now = new Date();
    return cards
      .filter(card => card.next_review_date <= now)
      .sort((a, b) => {
        // Prioritize by box level (lower levels first) then by overdue time
        if (a.box_level !== b.box_level) {
          return a.box_level - b.box_level;
        }
        return a.next_review_date.getTime() - b.next_review_date.getTime();
      });
  }

  /**
   * Organize cards into boxes
   */
  static organizeIntoBoxes(cards: LeitnerCard[]): LeitnerBox[] {
    const boxes: LeitnerBox[] = [];

    for (let level = 1; level <= this.MAX_BOX_LEVEL; level++) {
      const levelCards = cards.filter(card => card.box_level === level);
      const interval = this.BOX_INTERVALS[level - 1];
      
      // Find the next review date for this box
      const nextReview = levelCards.length > 0 
        ? new Date(Math.min(...levelCards.map(c => c.next_review_date.getTime())))
        : new Date();

      boxes.push({
        level,
        interval_days: interval,
        cards: levelCards,
        next_review_date: nextReview,
      });
    }

    return boxes;
  }

  /**
   * Calculate retention statistics for Leitner system
   */
  static calculateRetentionStats(cards: LeitnerCard[]) {
    if (cards.length === 0) {
      return {
        total_cards: 0,
        cards_by_box: Array(this.MAX_BOX_LEVEL).fill(0),
        average_box_level: 0,
        success_rate: 0,
        cards_mastered: 0, // Box 6 or 7
        cards_learning: 0,  // Box 2-5
        cards_new: 0,       // Box 1
      };
    }

    const cardsByBox = Array(this.MAX_BOX_LEVEL).fill(0);
    let totalBoxLevel = 0;
    let totalCorrect = 0;
    let totalAttempts = 0;

    cards.forEach(card => {
      cardsByBox[card.box_level - 1]++;
      totalBoxLevel += card.box_level;
      totalCorrect += card.correct_count;
      totalAttempts += card.correct_count + card.incorrect_count;
    });

    const cardsMastered = cardsByBox[5] + cardsByBox[6]; // Box 6-7
    const cardsLearning = cardsByBox[1] + cardsByBox[2] + cardsByBox[3] + cardsByBox[4]; // Box 2-5
    const cardsNew = cardsByBox[0]; // Box 1

    return {
      total_cards: cards.length,
      cards_by_box: cardsByBox,
      average_box_level: totalBoxLevel / cards.length,
      success_rate: totalAttempts > 0 ? totalCorrect / totalAttempts : 0,
      cards_mastered: cardsMastered,
      cards_learning: cardsLearning,
      cards_new: cardsNew,
    };
  }

  /**
   * Get study recommendations for Leitner system
   */
  static getStudyRecommendations(cards: LeitnerCard[]): {
    priority_boxes: number[];
    daily_review_target: number;
    focus_areas: string[];
  } {
    const boxes = this.organizeIntoBoxes(cards);
    const now = new Date();
    
    // Find boxes with overdue cards
    const overdueBoxes = boxes.filter(box => 
      box.cards.some(card => card.next_review_date <= now)
    ).map(box => box.level);

    // Recommendations based on card distribution
    const stats = this.calculateRetentionStats(cards);
    const focusAreas: string[] = [];
    
    if (stats.cards_new > stats.total_cards * 0.5) {
      focusAreas.push('new_cards');
    }
    if (stats.success_rate < 0.8) {
      focusAreas.push('retention');
    }
    if (overdueBoxes.includes(1)) {
      focusAreas.push('struggling_cards');
    }
    if (stats.cards_mastered < stats.total_cards * 0.3) {
      focusAreas.push('build_mastery');
    }

    // Dynamic daily target based on card distribution
    let dailyTarget = 20;
    if (overdueBoxes.length > 3) {
      dailyTarget = Math.min(50, dailyTarget + 15);
    }
    if (stats.success_rate > 0.9) {
      dailyTarget = Math.min(30, dailyTarget + 10);
    }

    return {
      priority_boxes: overdueBoxes,
      daily_review_target: dailyTarget,
      focus_areas: focusAreas,
    };
  }
}

/**
 * Utility functions for Leitner system
 */
export const LeitnerUtils = {
  /**
   * Get box description
   */
  getBoxDescription(level: number): string {
    const descriptions = [
      'New & Struggling',    // Box 1
      'Learning',            // Box 2
      'Developing',          // Box 3
      'Familiar',           // Box 4
      'Confident',          // Box 5
      'Mastered',           // Box 6
      'Fully Learned',      // Box 7
    ];
    return descriptions[level - 1] || 'Unknown';
  },

  /**
   * Get interval description
   */
  getIntervalDescription(level: number): string {
    const intervals = LeitnerSystemAlgorithm['BOX_INTERVALS'];
    const days = intervals[level - 1];
    
    if (days === 1) return 'Daily';
    if (days < 7) return `Every ${days} days`;
    if (days < 30) return `Every ${Math.round(days / 7)} weeks`;
    return `Every ${Math.round(days / 30)} months`;
  },

  /**
   * Get mastery percentage based on box level
   */
  getMasteryPercentage(level: number): number {
    return Math.min(100, Math.round((level / 7) * 100));
  },

  /**
   * Convert quality score to correct/incorrect for Leitner system
   */
  qualityToCorrect(quality: number): boolean {
    return quality >= 3; // 3+ is considered correct
  },
};