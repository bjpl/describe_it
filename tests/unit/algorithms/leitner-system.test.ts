import { describe, it, expect, beforeEach } from 'vitest';
import { LeitnerSystem } from '../../../src/lib/algorithms/leitner-system';
import { ReviewCard } from '../../../src/lib/algorithms/algorithm-interface';

describe('LeitnerSystem', () => {
  let system: LeitnerSystem;
  let baseCard: ReviewCard;

  beforeEach(() => {
    system = new LeitnerSystem();
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

  describe('moveCard - Correct Answers', () => {
    it('should advance card from box 0 (interval 1) to box 1 (interval 3)', () => {
      const card = { ...baseCard, interval: 1 };
      const result = system.moveCard(card, true);

      expect(result.interval).toBe(3);
    });

    it('should advance card from box 1 (interval 3) to box 2 (interval 7)', () => {
      const card = { ...baseCard, interval: 3 };
      const result = system.moveCard(card, true);

      expect(result.interval).toBe(7);
    });

    it('should advance card from box 2 (interval 7) to box 3 (interval 14)', () => {
      const card = { ...baseCard, interval: 7 };
      const result = system.moveCard(card, true);

      expect(result.interval).toBe(14);
    });

    it('should advance card from box 3 (interval 14) to box 4 (interval 30)', () => {
      const card = { ...baseCard, interval: 14 };
      const result = system.moveCard(card, true);

      expect(result.interval).toBe(30);
    });

    it('should keep card in final box (interval 30) when answered correctly', () => {
      const card = { ...baseCard, interval: 30 };
      const result = system.moveCard(card, true);

      expect(result.interval).toBe(30);
    });

    it('should increment successStreak on correct answer', () => {
      const card = { ...baseCard, successStreak: 2 };
      const result = system.moveCard(card, true);

      expect(result.successStreak).toBe(3);
    });

    it('should increment reviewCount on correct answer', () => {
      const card = { ...baseCard, reviewCount: 5 };
      const result = system.moveCard(card, true);

      expect(result.reviewCount).toBe(6);
    });

    it('should set nextReviewDate in the future based on interval', () => {
      const now = new Date();
      const result = system.moveCard(baseCard, true);

      expect(result.nextReviewDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should calculate correct nextReviewDate for box 1', () => {
      const result = system.moveCard(baseCard, true);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 3);

      // Allow 1 second tolerance
      expect(Math.abs(result.nextReviewDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });
  });

  describe('moveCard - Incorrect Answers', () => {
    it('should reset card to box 0 (interval 1) on incorrect answer', () => {
      const card = { ...baseCard, interval: 30 };
      const result = system.moveCard(card, false);

      expect(result.interval).toBe(1);
    });

    it('should reset successStreak to 0 on incorrect answer', () => {
      const card = { ...baseCard, successStreak: 5 };
      const result = system.moveCard(card, false);

      expect(result.successStreak).toBe(0);
    });

    it('should increment reviewCount even on incorrect answer', () => {
      const card = { ...baseCard, reviewCount: 3 };
      const result = system.moveCard(card, false);

      expect(result.reviewCount).toBe(4);
    });

    it('should reset card from box 1 to box 0', () => {
      const card = { ...baseCard, interval: 3 };
      const result = system.moveCard(card, false);

      expect(result.interval).toBe(1);
    });

    it('should reset card from box 2 to box 0', () => {
      const card = { ...baseCard, interval: 7 };
      const result = system.moveCard(card, false);

      expect(result.interval).toBe(1);
    });

    it('should reset card from box 3 to box 0', () => {
      const card = { ...baseCard, interval: 14 };
      const result = system.moveCard(card, false);

      expect(result.interval).toBe(1);
    });

    it('should reset card from box 4 to box 0', () => {
      const card = { ...baseCard, interval: 30 };
      const result = system.moveCard(card, false);

      expect(result.interval).toBe(1);
    });
  });

  describe('Box Progression Sequence', () => {
    it('should progress through all boxes with consecutive correct answers', () => {
      let card = baseCard;

      // Box 0 → Box 1
      card = system.moveCard(card, true);
      expect(card.interval).toBe(3);
      expect(card.successStreak).toBe(1);

      // Box 1 → Box 2
      card = system.moveCard(card, true);
      expect(card.interval).toBe(7);
      expect(card.successStreak).toBe(2);

      // Box 2 → Box 3
      card = system.moveCard(card, true);
      expect(card.interval).toBe(14);
      expect(card.successStreak).toBe(3);

      // Box 3 → Box 4
      card = system.moveCard(card, true);
      expect(card.interval).toBe(30);
      expect(card.successStreak).toBe(4);

      // Stay in Box 4
      card = system.moveCard(card, true);
      expect(card.interval).toBe(30);
      expect(card.successStreak).toBe(5);
    });

    it('should handle mixed correct and incorrect answers', () => {
      let card = baseCard;

      // Correct: Box 0 → Box 1
      card = system.moveCard(card, true);
      expect(card.interval).toBe(3);

      // Correct: Box 1 → Box 2
      card = system.moveCard(card, true);
      expect(card.interval).toBe(7);

      // Incorrect: Box 2 → Box 0
      card = system.moveCard(card, false);
      expect(card.interval).toBe(1);
      expect(card.successStreak).toBe(0);

      // Correct: Box 0 → Box 1
      card = system.moveCard(card, true);
      expect(card.interval).toBe(3);
      expect(card.successStreak).toBe(1);
    });

    it('should track reviewCount through multiple reviews', () => {
      let card = baseCard;

      for (let i = 0; i < 5; i++) {
        card = system.moveCard(card, true);
      }

      expect(card.reviewCount).toBe(5);
    });
  });

  describe('Card Properties Preservation', () => {
    it('should preserve card id', () => {
      const result = system.moveCard(baseCard, true);
      expect(result.id).toBe(baseCard.id);
    });

    it('should preserve imageId', () => {
      const result = system.moveCard(baseCard, true);
      expect(result.imageId).toBe(baseCard.imageId);
    });

    it('should preserve difficulty', () => {
      const result = system.moveCard(baseCard, true);
      expect(result.difficulty).toBe(baseCard.difficulty);
    });

    it('should preserve easeFactor', () => {
      const result = system.moveCard(baseCard, true);
      expect(result.easeFactor).toBe(baseCard.easeFactor);
    });
  });

  describe('Edge Cases', () => {
    // Interval 0 maps to box 0 (via findIndex: 1 >= 0 returns index 0)
    // Correct answer moves from box 0 to box 1 (interval 3)
    it('should handle card with interval 0', () => {
      const card = { ...baseCard, interval: 0 };
      const result = system.moveCard(card, true);

      expect(result.interval).toBe(3); // Moves from box 0 to box 1
    });

    it('should handle card with non-standard interval', () => {
      const card = { ...baseCard, interval: 5 }; // Between box 1 and 2
      const result = system.moveCard(card, true);

      // Should find the next higher box
      expect(result.interval).toBeGreaterThan(5);
    });

    it('should handle multiple failures from top box', () => {
      let card = { ...baseCard, interval: 30, successStreak: 10 };

      card = system.moveCard(card, false);
      expect(card.interval).toBe(1);
      expect(card.successStreak).toBe(0);

      card = system.moveCard(card, false);
      expect(card.interval).toBe(1);
      expect(card.successStreak).toBe(0);
    });

    it('should handle rapid succession of reviews', () => {
      let card = baseCard;

      // Simulate 10 quick correct reviews
      for (let i = 0; i < 10; i++) {
        card = system.moveCard(card, true);
      }

      expect(card.interval).toBe(30); // Should be in final box
      expect(card.reviewCount).toBe(10);
      expect(card.successStreak).toBe(10);
    });

    it('should correctly set nextReviewDate for each box', () => {
      let card = baseCard;
      const boxIntervals = [1, 3, 7, 14, 30];

      // Card starts at interval 1 (box 0), moves through boxes on each correct answer
      for (let i = 0; i < boxIntervals.length - 1; i++) {
        card = system.moveCard(card, true);
        const expectedInterval = boxIntervals[Math.min(i + 1, boxIntervals.length - 1)];
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + expectedInterval);

        // Allow 1 second tolerance
        expect(card.interval).toBe(expectedInterval);
        expect(Math.abs(card.nextReviewDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
      }
    });
  });
});
