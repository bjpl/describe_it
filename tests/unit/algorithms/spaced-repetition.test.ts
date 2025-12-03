import { describe, it, expect, beforeEach } from 'vitest';
import { SpacedRepetitionAlgorithm, SpacedRepetitionUtils } from '../../../src/lib/algorithms/spaced-repetition';
import { ReviewCard } from '../../../src/lib/algorithms/algorithm-interface';

describe('SpacedRepetitionAlgorithm', () => {
  let algorithm: SpacedRepetitionAlgorithm;
  let baseCard: ReviewCard;

  beforeEach(() => {
    algorithm = new SpacedRepetitionAlgorithm();
    baseCard = {
      id: 'test-card-1',
      imageId: 'img-1',
      difficulty: 'medium',
      interval: 1,
      easeFactor: 2.5,
      nextReviewDate: new Date(),
      reviewCount: 0,
      successStreak: 0,
    };
  });

  describe('calculateNextInterval', () => {
    it('should return minInterval when quality < 3', () => {
      const result = algorithm.calculateNextInterval(10, 2, 2.5);
      expect(result).toBe(1); // minInterval default is 1
    });

    it('should return minInterval when quality is 0', () => {
      const result = algorithm.calculateNextInterval(30, 0, 2.5);
      expect(result).toBe(1);
    });

    it('should return minInterval when quality is 1', () => {
      const result = algorithm.calculateNextInterval(20, 1, 2.5);
      expect(result).toBe(1);
    });

    it('should return minInterval when quality is 2', () => {
      const result = algorithm.calculateNextInterval(15, 2, 2.5);
      expect(result).toBe(1);
    });

    it('should return 6 when current interval is 1 and quality >= 3', () => {
      const result = algorithm.calculateNextInterval(1, 3, 2.5);
      expect(result).toBe(6);
    });

    it('should return initialInterval when current interval is 6 and quality >= 3', () => {
      const result = algorithm.calculateNextInterval(6, 4, 2.5);
      expect(result).toBe(1); // initialInterval default is 1
    });

    it('should multiply interval by easeFactor when interval > 6 and quality >= 3', () => {
      const result = algorithm.calculateNextInterval(10, 4, 2.5);
      expect(result).toBe(25); // Math.round(10 * 2.5) = 25
    });

    it('should respect maxInterval limit', () => {
      const result = algorithm.calculateNextInterval(200, 5, 2.5);
      expect(result).toBeLessThanOrEqual(365); // maxInterval default is 365
    });

    it('should return maxInterval when calculated interval exceeds it', () => {
      const result = algorithm.calculateNextInterval(300, 5, 3.0);
      expect(result).toBe(365);
    });

    it('should handle quality = 3 (minimum passing)', () => {
      const result = algorithm.calculateNextInterval(10, 3, 2.5);
      expect(result).toBe(25);
    });

    it('should handle quality = 4', () => {
      const result = algorithm.calculateNextInterval(10, 4, 2.5);
      expect(result).toBe(25);
    });

    it('should handle quality = 5 (perfect)', () => {
      const result = algorithm.calculateNextInterval(10, 5, 2.5);
      expect(result).toBe(25);
    });

    it('should respect minInterval even with high easeFactor', () => {
      const customAlgo = new SpacedRepetitionAlgorithm({ minInterval: 5 });
      const result = customAlgo.calculateNextInterval(10, 0, 2.5);
      expect(result).toBe(5);
    });

    it('should handle very small intervals', () => {
      const result = algorithm.calculateNextInterval(1, 5, 2.5);
      expect(result).toBe(6);
    });

    it('should handle large intervals with high ease factor', () => {
      const result = algorithm.calculateNextInterval(100, 5, 3.0);
      expect(result).toBe(300);
    });
  });

  describe('updateEaseFactor', () => {
    it('should decrease ease factor with quality < 3', () => {
      const result = algorithm.updateEaseFactor(2.5, 2);
      expect(result).toBeLessThan(2.5);
    });

    // SM-2 formula: quality 4 results in no change (0.1 - 1*0.10 = 0)
    it('should maintain ease factor with quality = 4', () => {
      const result = algorithm.updateEaseFactor(2.5, 4);
      expect(result).toBe(2.5); // No change for quality 4 in SM-2
    });

    // SM-2 formula: quality 3 results in -0.14 decrease (0.1 - 2*0.12 = -0.14)
    it('should slightly decrease ease factor with quality = 3', () => {
      const result = algorithm.updateEaseFactor(2.5, 3);
      expect(result).toBeCloseTo(2.36, 2); // 2.5 - 0.14 = 2.36
    });

    it('should never go below minimum ease factor of 1.3', () => {
      const result = algorithm.updateEaseFactor(1.4, 0);
      expect(result).toBeGreaterThanOrEqual(1.3);
    });

    it('should enforce minimum ease factor even with repeated failures', () => {
      let easeFactor = 2.5;
      for (let i = 0; i < 10; i++) {
        easeFactor = algorithm.updateEaseFactor(easeFactor, 0);
      }
      expect(easeFactor).toBe(1.3);
    });

    it('should increase ease factor significantly with quality = 5', () => {
      const result = algorithm.updateEaseFactor(2.5, 5);
      expect(result).toBeGreaterThan(2.5);
      expect(result).toBeCloseTo(2.6, 1);
    });

    it('should handle quality = 0 (complete failure)', () => {
      const result = algorithm.updateEaseFactor(2.5, 0);
      expect(result).toBeLessThan(2.5);
      expect(result).toBeGreaterThanOrEqual(1.3);
    });

    // SM-2: quality 4 maintains ease factor (no change)
    it('should maintain ease factor with quality = 4', () => {
      const result = algorithm.updateEaseFactor(2.5, 4);
      expect(result).toBe(2.5);
    });

    it('should allow ease factor to grow over multiple perfect reviews', () => {
      let easeFactor = 2.5;
      for (let i = 0; i < 5; i++) {
        easeFactor = algorithm.updateEaseFactor(easeFactor, 5);
      }
      expect(easeFactor).toBeGreaterThan(3.0);
    });

    it('should handle edge case with minimum ease factor and quality 0', () => {
      const result = algorithm.updateEaseFactor(1.3, 0);
      expect(result).toBe(1.3);
    });
  });

  describe('updateCard', () => {
    it('should update all card properties correctly on success', () => {
      const result = algorithm.updateCard(baseCard, 4);

      expect(result.interval).toBe(6); // First interval should be 6
      expect(result.reviewCount).toBe(1);
      expect(result.successStreak).toBe(1);
      expect(result.easeFactor).toBe(2.5); // Quality 4 maintains ease factor in SM-2
      expect(result.nextReviewDate).toBeInstanceOf(Date);
    });

    it('should reset successStreak on failure (quality < 3)', () => {
      const cardWithStreak = { ...baseCard, successStreak: 5 };
      const result = algorithm.updateCard(cardWithStreak, 2);

      expect(result.successStreak).toBe(0);
    });

    it('should increment successStreak on success', () => {
      const cardWithStreak = { ...baseCard, successStreak: 3 };
      const result = algorithm.updateCard(cardWithStreak, 4);

      expect(result.successStreak).toBe(4);
    });

    it('should increment reviewCount', () => {
      const result = algorithm.updateCard(baseCard, 4);
      expect(result.reviewCount).toBe(1);

      const secondReview = algorithm.updateCard(result, 5);
      expect(secondReview.reviewCount).toBe(2);
    });

    it('should set nextReviewDate in the future', () => {
      const now = new Date();
      const result = algorithm.updateCard(baseCard, 4);

      expect(result.nextReviewDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should handle quality = 0 correctly', () => {
      const result = algorithm.updateCard(baseCard, 0);

      expect(result.interval).toBe(1);
      expect(result.successStreak).toBe(0);
      expect(result.easeFactor).toBeLessThan(2.5);
    });

    it('should handle quality = 5 correctly', () => {
      const result = algorithm.updateCard(baseCard, 5);

      expect(result.interval).toBe(6);
      expect(result.successStreak).toBe(1);
      expect(result.easeFactor).toBeGreaterThan(2.5);
    });

    it('should preserve card id and imageId', () => {
      const result = algorithm.updateCard(baseCard, 4);

      expect(result.id).toBe(baseCard.id);
      expect(result.imageId).toBe(baseCard.imageId);
    });

    it('should handle multiple sequential reviews correctly', () => {
      let card = baseCard;

      // First review - quality 4
      card = algorithm.updateCard(card, 4);
      expect(card.successStreak).toBe(1);
      expect(card.reviewCount).toBe(1);

      // Second review - quality 5
      card = algorithm.updateCard(card, 5);
      expect(card.successStreak).toBe(2);
      expect(card.reviewCount).toBe(2);

      // Third review - quality 2 (failure)
      card = algorithm.updateCard(card, 2);
      expect(card.successStreak).toBe(0);
      expect(card.reviewCount).toBe(3);
    });

    it('should calculate correct nextReviewDate based on interval', () => {
      const result = algorithm.updateCard(baseCard, 4);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + result.interval);

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(result.nextReviewDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });
  });

  describe('Custom Configuration', () => {
    it('should respect custom minInterval', () => {
      const customAlgo = new SpacedRepetitionAlgorithm({ minInterval: 3 });
      const result = customAlgo.calculateNextInterval(10, 0, 2.5);
      expect(result).toBe(3);
    });

    it('should respect custom maxInterval', () => {
      const customAlgo = new SpacedRepetitionAlgorithm({ maxInterval: 180 });
      const result = customAlgo.calculateNextInterval(200, 5, 3.0);
      expect(result).toBe(180);
    });

    it('should respect custom initialInterval', () => {
      const customAlgo = new SpacedRepetitionAlgorithm({ initialInterval: 2 });
      const result = customAlgo.calculateNextInterval(6, 4, 2.5);
      expect(result).toBe(2);
    });

    // SM-2: quality 4 maintains ease factor regardless of custom config
    // Only quality 5 increases ease factor
    it('should respect custom easeFactor with quality 5', () => {
      const customAlgo = new SpacedRepetitionAlgorithm({ easeFactor: 3.0 });
      const card = { ...baseCard };
      const result = customAlgo.updateCard(card, 5);
      expect(result.easeFactor).toBeGreaterThan(2.5); // Quality 5 increases
    });
  });
});

describe('SpacedRepetitionUtils', () => {
  describe('createCard', () => {
    it('should create a card with correct default values', () => {
      const card = SpacedRepetitionUtils.createCard('card-1', 'content-1');

      expect(card.id).toBe('card-1');
      expect(card.imageId).toBe('card-1');
      expect(card.difficulty).toBe('medium');
      expect(card.interval).toBe(1);
      expect(card.easeFactor).toBe(2.5);
      expect(card.reviewCount).toBe(0);
      expect(card.successStreak).toBe(0);
      expect(card.nextReviewDate).toBeInstanceOf(Date);
    });
  });

  describe('isCardDue', () => {
    it('should return true for cards due now', () => {
      const card = SpacedRepetitionUtils.createCard('card-1', 'content');
      const result = SpacedRepetitionUtils.isCardDue(card);
      expect(result).toBe(true);
    });

    it('should return false for cards due in the future', () => {
      const card = SpacedRepetitionUtils.createCard('card-1', 'content');
      card.nextReviewDate = new Date(Date.now() + 86400000); // Tomorrow
      const result = SpacedRepetitionUtils.isCardDue(card);
      expect(result).toBe(false);
    });

    it('should return true for cards due in the past', () => {
      const card = SpacedRepetitionUtils.createCard('card-1', 'content');
      card.nextReviewDate = new Date(Date.now() - 86400000); // Yesterday
      const result = SpacedRepetitionUtils.isCardDue(card);
      expect(result).toBe(true);
    });
  });

  describe('getDueCards', () => {
    it('should return only due cards', () => {
      const card1 = SpacedRepetitionUtils.createCard('card-1', 'content');
      const card2 = SpacedRepetitionUtils.createCard('card-2', 'content');
      const card3 = SpacedRepetitionUtils.createCard('card-3', 'content');

      card2.nextReviewDate = new Date(Date.now() + 86400000); // Future
      card3.nextReviewDate = new Date(Date.now() - 86400000); // Past

      const result = SpacedRepetitionUtils.getDueCards([card1, card2, card3]);
      expect(result).toHaveLength(2);
      expect(result).toContain(card1);
      expect(result).toContain(card3);
    });

    it('should return empty array when no cards are due', () => {
      const card1 = SpacedRepetitionUtils.createCard('card-1', 'content');
      const card2 = SpacedRepetitionUtils.createCard('card-2', 'content');

      card1.nextReviewDate = new Date(Date.now() + 86400000);
      card2.nextReviewDate = new Date(Date.now() + 172800000);

      const result = SpacedRepetitionUtils.getDueCards([card1, card2]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getMasteryLevel', () => {
    it('should return "Beginner" for new cards', () => {
      const card = SpacedRepetitionUtils.createCard('card-1', 'content');
      expect(SpacedRepetitionUtils.getMasteryLevel(card)).toBe('Beginner');
    });

    it('should return "Intermediate" for successStreak >= 2', () => {
      const card = SpacedRepetitionUtils.createCard('card-1', 'content');
      card.successStreak = 3;
      expect(SpacedRepetitionUtils.getMasteryLevel(card)).toBe('Intermediate');
    });

    it('should return "Advanced" for successStreak >= 5', () => {
      const card = SpacedRepetitionUtils.createCard('card-1', 'content');
      card.successStreak = 7;
      expect(SpacedRepetitionUtils.getMasteryLevel(card)).toBe('Advanced');
    });

    it('should return "Master" for successStreak >= 10', () => {
      const card = SpacedRepetitionUtils.createCard('card-1', 'content');
      card.successStreak = 15;
      expect(SpacedRepetitionUtils.getMasteryLevel(card)).toBe('Master');
    });

    it('should handle null card', () => {
      expect(SpacedRepetitionUtils.getMasteryLevel(null)).toBe('Beginner');
    });
  });

  describe('getDifficultyDescription', () => {
    it('should return difficulty as string', () => {
      expect(SpacedRepetitionUtils.getDifficultyDescription('easy')).toBe('easy');
      expect(SpacedRepetitionUtils.getDifficultyDescription('medium')).toBe('medium');
      expect(SpacedRepetitionUtils.getDifficultyDescription('hard')).toBe('hard');
    });

    it('should return "Easy" for null/undefined', () => {
      expect(SpacedRepetitionUtils.getDifficultyDescription(null)).toBe('Easy');
      expect(SpacedRepetitionUtils.getDifficultyDescription(undefined)).toBe('Easy');
    });
  });

  describe('getNextReviewDescription', () => {
    it('should return formatted date string', () => {
      const date = new Date('2025-12-15');
      const result = SpacedRepetitionUtils.getNextReviewDescription(date);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should return "Soon" for null/undefined', () => {
      expect(SpacedRepetitionUtils.getNextReviewDescription(null)).toBe('Soon');
      expect(SpacedRepetitionUtils.getNextReviewDescription(undefined)).toBe('Soon');
    });
  });
});
