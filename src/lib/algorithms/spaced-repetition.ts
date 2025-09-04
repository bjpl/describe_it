import {
  BaseAlgorithm,
  AlgorithmConfig,
  ReviewCard,
} from "./algorithm-interface";

export class SpacedRepetitionAlgorithm extends BaseAlgorithm {
  constructor(config?: Partial<AlgorithmConfig>) {
    const defaultConfig: AlgorithmConfig = {
      initialInterval: 1,
      easeFactor: 2.5,
      minInterval: 1,
      maxInterval: 365,
      ...config,
    };
    super(defaultConfig);
  }

  calculateNextInterval(
    currentInterval: number,
    quality: number,
    easeFactor: number,
  ): number {
    if (quality < 3) {
      return this.config.minInterval;
    }

    let nextInterval: number;
    if (currentInterval === 1) {
      nextInterval = 6;
    } else if (currentInterval === 6) {
      nextInterval = this.config.initialInterval;
    } else {
      nextInterval = Math.round(currentInterval * easeFactor);
    }

    return Math.min(
      Math.max(nextInterval, this.config.minInterval),
      this.config.maxInterval,
    );
  }

  updateEaseFactor(currentFactor: number, quality: number): number {
    const newFactor =
      currentFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    return Math.max(newFactor, 1.3);
  }

  updateCard(card: ReviewCard, quality: number): ReviewCard {
    const newEaseFactor = this.updateEaseFactor(card.easeFactor, quality);
    const newInterval = this.calculateNextInterval(
      card.interval,
      quality,
      newEaseFactor,
    );

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
      ...card,
      interval: newInterval,
      easeFactor: newEaseFactor,
      nextReviewDate,
      reviewCount: card.reviewCount + 1,
      successStreak: quality >= 3 ? card.successStreak + 1 : 0,
    };
  }
}

export const SpacedRepetitionUtils = {
  createCard: (id: string, content: string): ReviewCard => ({
    id,
    content,
    interval: 1,
    easeFactor: 2.5,
    nextReviewDate: new Date(),
    reviewCount: 0,
    successStreak: 0
  }),
  
  isCardDue: (card: ReviewCard): boolean => {
    return new Date() >= card.nextReviewDate;
  },
  
  getDueCards: (cards: ReviewCard[]): ReviewCard[] => {
    return cards.filter(card => SpacedRepetitionUtils.isCardDue(card));
  }
};
