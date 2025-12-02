/**
 * SpacedRepetitionBridge Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpacedRepetitionBridge } from '../services/spaced-repetition-bridge';

// Mock dependencies
vi.mock('../services/learning', () => ({
  learningService: {
    getPrediction: vi.fn().mockResolvedValue({
      nextReviewDate: new Date(Date.now() + 86400000), // Tomorrow
      predictedSuccessRate: 0.75,
      confidence: 0.8,
      recommendedDifficulty: 'medium',
      suggestedRelatedWords: ['word1', 'word2'],
    }),
    recordInteraction: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/graph', () => ({
  graphService: {
    getNode: vi.fn().mockResolvedValue(null),
    addNode: vi.fn().mockResolvedValue({ id: 'test' }),
  },
}));

vi.mock('../config', () => ({
  getVectorConfig: vi.fn().mockReturnValue({
    gnn: { enabled: true },
  }),
  featureFlags: {
    useGNNLearning: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('SpacedRepetitionBridge', () => {
  let bridge: SpacedRepetitionBridge;

  const mockCard = {
    id: 'card-1',
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date(),
    word: 'test',
  };

  beforeEach(() => {
    SpacedRepetitionBridge.resetInstance();
    bridge = SpacedRepetitionBridge.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SpacedRepetitionBridge.getInstance();
      const instance2 = SpacedRepetitionBridge.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should accept custom config', () => {
      SpacedRepetitionBridge.resetInstance();
      const customBridge = SpacedRepetitionBridge.getInstance({
        gnnWeight: 0.5,
        sm2Weight: 0.5,
      });
      const config = customBridge.getConfig();
      expect(config.gnnWeight).toBe(0.5);
      expect(config.sm2Weight).toBe(0.5);
    });
  });

  describe('enhanceWithGNN', () => {
    it('should enhance card with GNN predictions', async () => {
      const result = await bridge.enhanceWithGNN(mockCard, 'user-1');

      expect(result.gnnEnhanced).toBe(true);
      expect(result.predictedSuccess).toBeDefined();
      expect(typeof result.predictedSuccess).toBe('number');
    });

    it('should return non-enhanced card when GNN unavailable', async () => {
      // Simulate GNN becoming unavailable
      const { featureFlags } = await import('../config');
      vi.mocked(featureFlags.useGNNLearning).mockReturnValueOnce(false);

      SpacedRepetitionBridge.resetInstance();
      const freshBridge = SpacedRepetitionBridge.getInstance();
      const result = await freshBridge.enhanceWithGNN(mockCard, 'user-1');

      expect(result.gnnEnhanced).toBe(false);
    });
  });

  describe('getHybridSchedule', () => {
    it('should return hybrid schedule for cards', async () => {
      const cards = [mockCard, { ...mockCard, id: 'card-2' }];
      const schedule = await bridge.getHybridSchedule('user-1', cards);

      expect(schedule).toHaveLength(2);
      schedule.forEach(item => {
        expect(item.card).toBeDefined();
        expect(item.scheduledDate).toBeInstanceOf(Date);
        expect(item.confidenceScore).toBeDefined();
        expect(['sm2', 'gnn', 'hybrid']).toContain(item.source);
      });
    });

    it('should sort schedule by date', async () => {
      const cards = [
        { ...mockCard, id: 'card-1', nextReview: new Date(Date.now() + 86400000 * 5) },
        { ...mockCard, id: 'card-2', nextReview: new Date(Date.now() + 86400000 * 1) },
        { ...mockCard, id: 'card-3', nextReview: new Date(Date.now() + 86400000 * 3) },
      ];

      const schedule = await bridge.getHybridSchedule('user-1', cards);

      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i].scheduledDate.getTime()).toBeGreaterThanOrEqual(
          schedule[i - 1].scheduledDate.getTime()
        );
      }
    });
  });

  describe('adaptDifficulty', () => {
    it('should adapt card difficulty based on predictions', async () => {
      const result = await bridge.adaptDifficulty(mockCard, 'user-1');

      expect(result.easeFactor).toBeDefined();
      expect(result.interval).toBeDefined();
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
      expect(result.easeFactor).toBeLessThanOrEqual(2.5);
    });

    it('should return original card when GNN disabled', async () => {
      const { featureFlags } = await import('../config');
      vi.mocked(featureFlags.useGNNLearning).mockReturnValueOnce(false);

      SpacedRepetitionBridge.resetInstance();
      const freshBridge = SpacedRepetitionBridge.getInstance();
      const result = await freshBridge.adaptDifficulty(mockCard, 'user-1');

      expect(result).toEqual(mockCard);
    });
  });

  describe('syncLearningData', () => {
    it('should sync session results without errors', async () => {
      const results = [
        { cardId: 'card-1', quality: 4, responseTime: 2000, correct: true, timestamp: new Date() },
        { cardId: 'card-2', quality: 2, responseTime: 5000, correct: false, timestamp: new Date() },
      ];

      await expect(bridge.syncLearningData('user-1', results)).resolves.not.toThrow();
    });
  });

  describe('configuration', () => {
    it('should update config correctly', () => {
      bridge.updateConfig({ gnnWeight: 0.7, sm2Weight: 0.3 });
      const config = bridge.getConfig();

      expect(config.gnnWeight).toBe(0.7);
      expect(config.sm2Weight).toBe(0.3);
    });

    it('should report GNN availability', () => {
      expect(typeof bridge.isGNNAvailable()).toBe('boolean');
    });

    it('should reset GNN availability', () => {
      bridge.resetGNNAvailability();
      expect(bridge.isGNNAvailable()).toBe(true);
    });
  });
});
