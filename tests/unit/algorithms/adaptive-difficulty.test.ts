import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveDifficultyAlgorithm } from '../../../src/lib/algorithms/adaptive-difficulty';
import { AlgorithmMetrics } from '../../../src/lib/algorithms/algorithm-interface';

describe('AdaptiveDifficultyAlgorithm', () => {
  let algorithm: AdaptiveDifficultyAlgorithm;

  beforeEach(() => {
    algorithm = new AdaptiveDifficultyAlgorithm();
  });

  describe('calculateDifficulty', () => {
    describe('Hard Difficulty', () => {
      it('should return "hard" for high accuracy (>80%) and fast response (<3s)', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 10,
          correctAnswers: 9,
          incorrectAnswers: 1,
          averageResponseTime: 2000, // 2 seconds
          streakCount: 5,
        };

        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('hard');
      });

      it('should return "hard" for 90% accuracy and 1 second response', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 20,
          correctAnswers: 18,
          incorrectAnswers: 2,
          averageResponseTime: 1000,
          streakCount: 8,
        };

        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('hard');
      });

      it('should return "hard" for 100% accuracy and 2.5 second response', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 15,
          correctAnswers: 15,
          incorrectAnswers: 0,
          averageResponseTime: 2500,
          streakCount: 15,
        };

        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('hard');
      });

      it('should return "hard" for exactly 80.1% accuracy and 2999ms response', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 1000,
          correctAnswers: 801,
          incorrectAnswers: 199,
          averageResponseTime: 2999,
          streakCount: 10,
        };

        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('hard');
      });
    });

    describe('Medium Difficulty', () => {
      it('should return "medium" for 70% accuracy and 4 second response', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 10,
          correctAnswers: 7,
          incorrectAnswers: 3,
          averageResponseTime: 4000,
          streakCount: 2,
        };

        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('medium');
      });

      it('should return "medium" for 80% accuracy but slow response (>3s)', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 20,
          correctAnswers: 16,
          incorrectAnswers: 4,
          averageResponseTime: 3500,
          streakCount: 4,
        };

        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('medium');
      });

      // Note: Algorithm uses accuracy > 0.6, so exactly 60% returns "easy"
      // Testing slightly above 60% (60.4%) to hit medium range
      it('should return "medium" for slightly above 60% accuracy (60.4%) and 4.5 second response', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 125,
          correctAnswers: 76, // 76/126 = 60.32% > 60%
          incorrectAnswers: 50,
          averageResponseTime: 4500,
          streakCount: 3,
        };

        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('medium');
      });

      it('should return "medium" for 65% accuracy and fast response', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 20,
          correctAnswers: 13,
          incorrectAnswers: 7,
          averageResponseTime: 2000,
          streakCount: 2,
        };

        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('medium');
      });

      it('should return "medium" for exactly 80% accuracy and exactly 3000ms response', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 50,
          correctAnswers: 40,
          incorrectAnswers: 10,
          averageResponseTime: 3000,
          streakCount: 5,
        };

        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('medium');
      });
    });

    describe('Easy Difficulty', () => {
      it('should return "easy" for low accuracy (<60%)', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 10,
          correctAnswers: 5,
          incorrectAnswers: 5,
          averageResponseTime: 6000,
          streakCount: 0,
        };

        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('easy');
      });

      it('should return "easy" for 50% accuracy', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 20,
          correctAnswers: 10,
          incorrectAnswers: 10,
          averageResponseTime: 5000,
          streakCount: 1,
        };

        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('easy');
      });

      it('should return "easy" for very low accuracy and very slow response', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 15,
          correctAnswers: 3,
          incorrectAnswers: 12,
          averageResponseTime: 10000,
          streakCount: 0,
        };

        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('easy');
      });

      it('should return "easy" for 0% accuracy', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 5,
          correctAnswers: 0,
          incorrectAnswers: 5,
          averageResponseTime: 8000,
          streakCount: 0,
        };

        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('easy');
      });

      it('should return "easy" for slow response even with decent accuracy', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 20,
          correctAnswers: 12,
          incorrectAnswers: 8,
          averageResponseTime: 7000, // Very slow
          streakCount: 2,
        };

        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('easy');
      });
    });

    describe('Boundary Cases', () => {
      it('should handle exactly 80% accuracy threshold', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 10,
          correctAnswers: 8,
          incorrectAnswers: 2,
          averageResponseTime: 2500,
          streakCount: 3,
        };

        // 80% is not > 80%, so should not be hard
        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('medium');
      });

      it('should handle exactly 60% accuracy threshold', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 10,
          correctAnswers: 6,
          incorrectAnswers: 4,
          averageResponseTime: 4000,
          streakCount: 1,
        };

        // 60% is not > 60%, so should be easy
        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('easy');
      });

      it('should handle exactly 3000ms response time threshold', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 10,
          correctAnswers: 9,
          incorrectAnswers: 1,
          averageResponseTime: 3000, // Exactly at threshold
          streakCount: 4,
        };

        // 3000ms is not < 3000ms, so should be medium
        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('medium');
      });

      it('should handle exactly 5000ms response time threshold', () => {
        const metrics: AlgorithmMetrics = {
          totalReviews: 10,
          correctAnswers: 7,
          incorrectAnswers: 3,
          averageResponseTime: 5000, // Exactly at threshold
          streakCount: 2,
        };

        // 5000ms is not < 5000ms, so accuracy matters
        const result = algorithm.calculateDifficulty(metrics);
        expect(result).toBe('easy'); // 70% > 60% but 5000ms not < 5000ms
      });
    });
  });

  describe('adjustContent', () => {
    describe('Easy Level', () => {
      it('should return beginner settings for easy difficulty', () => {
        const result = algorithm.adjustContent('easy');

        expect(result.vocabularyLevel).toBe('beginner');
        expect(result.questionComplexity).toBe('simple');
        expect(result.hintAvailable).toBe(true);
      });

      it('should enable hints for easy difficulty', () => {
        const result = algorithm.adjustContent('easy');
        expect(result.hintAvailable).toBe(true);
      });
    });

    describe('Medium Level', () => {
      it('should return intermediate settings for medium difficulty', () => {
        const result = algorithm.adjustContent('medium');

        expect(result.vocabularyLevel).toBe('intermediate');
        expect(result.questionComplexity).toBe('moderate');
        expect(result.hintAvailable).toBe(false);
      });

      it('should disable hints for medium difficulty', () => {
        const result = algorithm.adjustContent('medium');
        expect(result.hintAvailable).toBe(false);
      });
    });

    describe('Hard Level', () => {
      it('should return advanced settings for hard difficulty', () => {
        const result = algorithm.adjustContent('hard');

        expect(result.vocabularyLevel).toBe('advanced');
        expect(result.questionComplexity).toBe('complex');
        expect(result.hintAvailable).toBe(false);
      });

      it('should disable hints for hard difficulty', () => {
        const result = algorithm.adjustContent('hard');
        expect(result.hintAvailable).toBe(false);
      });
    });

    describe('Settings Consistency', () => {
      it('should return consistent settings for the same difficulty', () => {
        const result1 = algorithm.adjustContent('medium');
        const result2 = algorithm.adjustContent('medium');

        expect(result1).toEqual(result2);
      });

      it('should return different settings for different difficulties', () => {
        const easy = algorithm.adjustContent('easy');
        const medium = algorithm.adjustContent('medium');
        const hard = algorithm.adjustContent('hard');

        expect(easy.vocabularyLevel).not.toBe(medium.vocabularyLevel);
        expect(medium.vocabularyLevel).not.toBe(hard.vocabularyLevel);
        expect(easy.questionComplexity).not.toBe(hard.questionComplexity);
      });

      it('should have progressive complexity levels', () => {
        const easy = algorithm.adjustContent('easy');
        const medium = algorithm.adjustContent('medium');
        const hard = algorithm.adjustContent('hard');

        expect(easy.vocabularyLevel).toBe('beginner');
        expect(medium.vocabularyLevel).toBe('intermediate');
        expect(hard.vocabularyLevel).toBe('advanced');
      });
    });
  });

  describe('Integration - calculateDifficulty with adjustContent', () => {
    it('should recommend appropriate content for struggling user', () => {
      const metrics: AlgorithmMetrics = {
        totalReviews: 20,
        correctAnswers: 8,
        incorrectAnswers: 12,
        averageResponseTime: 7000,
        streakCount: 0,
      };

      const difficulty = algorithm.calculateDifficulty(metrics);
      const content = algorithm.adjustContent(difficulty);

      expect(difficulty).toBe('easy');
      expect(content.hintAvailable).toBe(true);
      expect(content.vocabularyLevel).toBe('beginner');
    });

    it('should recommend appropriate content for proficient user', () => {
      const metrics: AlgorithmMetrics = {
        totalReviews: 50,
        correctAnswers: 45,
        incorrectAnswers: 5,
        averageResponseTime: 1500,
        streakCount: 12,
      };

      const difficulty = algorithm.calculateDifficulty(metrics);
      const content = algorithm.adjustContent(difficulty);

      expect(difficulty).toBe('hard');
      expect(content.hintAvailable).toBe(false);
      expect(content.vocabularyLevel).toBe('advanced');
    });

    it('should recommend appropriate content for average user', () => {
      const metrics: AlgorithmMetrics = {
        totalReviews: 30,
        correctAnswers: 21,
        incorrectAnswers: 9,
        averageResponseTime: 4000,
        streakCount: 3,
      };

      const difficulty = algorithm.calculateDifficulty(metrics);
      const content = algorithm.adjustContent(difficulty);

      expect(difficulty).toBe('medium');
      expect(content.hintAvailable).toBe(false);
      expect(content.vocabularyLevel).toBe('intermediate');
    });
  });
});
