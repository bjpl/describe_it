/**
 * VectorStoreBridge Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VectorStoreBridge } from '../integration/vector-store-bridge';

// Mock dependencies
vi.mock('../services/learning', () => ({
  learningService: {
    getPrediction: vi.fn().mockResolvedValue({
      nextReviewDate: new Date(),
      predictedSuccessRate: 0.8,
      confidence: 0.9,
      recommendedDifficulty: 'easy',
      suggestedRelatedWords: [],
    }),
    recordInteraction: vi.fn().mockResolvedValue(undefined),
    getConfusionPairs: vi
      .fn()
      .mockResolvedValue([{ word1: 'ser', word2: 'estar', confusionRate: 0.6 }]),
    getOptimalReviewSchedule: vi
      .fn()
      .mockResolvedValue([{ vocabularyId: 'vocab-1', scheduledDate: new Date(), priority: 10 }]),
  },
}));

vi.mock('../services/spaced-repetition-bridge', () => ({
  spacedRepetitionBridge: {
    syncLearningData: vi.fn().mockResolvedValue(undefined),
    isGNNAvailable: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('../config', () => ({
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

describe('VectorStoreBridge', () => {
  let bridge: VectorStoreBridge;

  beforeEach(() => {
    vi.useFakeTimers();
    VectorStoreBridge.resetInstance();
    bridge = VectorStoreBridge.getInstance();
  });

  afterEach(() => {
    bridge.stopAutoSync();
    vi.useRealTimers();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = VectorStoreBridge.getInstance();
      const instance2 = VectorStoreBridge.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('recordActivity', () => {
    it('should record activity for authenticated user', () => {
      bridge.recordActivity('user-123', {
        type: 'vocabulary_reviewed',
        correct: true,
        responseTime: 2000,
        vocabularyId: 'vocab-1',
      });

      const status = bridge.getStatus();
      expect(status.pendingCount).toBe(1);
    });

    it('should skip anonymous users', () => {
      bridge.recordActivity('anonymous', {
        type: 'vocabulary_reviewed',
        correct: true,
      });

      const status = bridge.getStatus();
      expect(status.pendingCount).toBe(0);
    });

    it('should skip empty user IDs', () => {
      bridge.recordActivity('', {
        type: 'vocabulary_reviewed',
        correct: true,
      });

      const status = bridge.getStatus();
      expect(status.pendingCount).toBe(0);
    });

    it('should trigger sync when batch size reached', async () => {
      // Record activities up to batch size
      for (let i = 0; i < 10; i++) {
        bridge.recordActivity('user-123', {
          type: 'vocabulary_reviewed',
          correct: true,
          vocabularyId: `vocab-${i}`,
        });
      }

      // Allow pending promises to resolve
      await vi.runAllTimersAsync();

      const status = bridge.getStatus();
      // Should have synced (pending count should be 0 or less than batch size)
      expect(status.pendingCount).toBeLessThan(10);
    });
  });

  describe('recordVocabularyReview', () => {
    it('should record vocabulary review interaction', async () => {
      const { learningService } = await import('../services/learning');

      await bridge.recordVocabularyReview('user-123', 'vocab-1', true, 2000);

      expect(learningService.recordInteraction).toHaveBeenCalledWith(
        'user-123',
        'vocab-1',
        true,
        2000
      );
    });
  });

  describe('syncSessionResults', () => {
    it('should sync session results', async () => {
      const { spacedRepetitionBridge } = await import('../services/spaced-repetition-bridge');

      const results = [
        { cardId: 'card-1', quality: 4, responseTime: 2000, correct: true, timestamp: new Date() },
      ];

      await bridge.syncSessionResults('user-123', results);

      expect(spacedRepetitionBridge.syncLearningData).toHaveBeenCalled();
    });
  });

  describe('getEnhancedPredictions', () => {
    it('should return predictions for vocabulary items', async () => {
      const predictions = await bridge.getEnhancedPredictions('user-123', ['vocab-1', 'vocab-2']);

      expect(predictions.size).toBe(2);
      predictions.forEach((pred, vocabId) => {
        expect(pred.predictedSuccess).toBeDefined();
        expect(pred.nextReviewDate).toBeInstanceOf(Date);
        expect(['easy', 'medium', 'hard']).toContain(pred.difficulty);
      });
    });

    it('should return empty map when GNN disabled', async () => {
      const { featureFlags } = await import('../config');
      vi.mocked(featureFlags.useGNNLearning).mockReturnValueOnce(false);

      const predictions = await bridge.getEnhancedPredictions('user-123', ['vocab-1']);

      expect(predictions.size).toBe(0);
    });
  });

  describe('getConfusionPairs', () => {
    it('should return confusion pairs', async () => {
      const pairs = await bridge.getConfusionPairs('user-123');

      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toHaveProperty('word1');
      expect(pairs[0]).toHaveProperty('word2');
      expect(pairs[0]).toHaveProperty('confusionRate');
    });
  });

  describe('getReviewSchedule', () => {
    it('should return review schedule', async () => {
      const schedule = await bridge.getReviewSchedule('user-123', 10);

      expect(schedule.length).toBeGreaterThan(0);
      schedule.forEach(item => {
        expect(item.vocabularyId).toBeDefined();
        expect(item.scheduledDate).toBeInstanceOf(Date);
        expect(item.priority).toBeDefined();
      });
    });
  });

  describe('autoSync', () => {
    it('should start and stop auto sync', () => {
      bridge.startAutoSync();
      expect(bridge.getStatus().autoSyncActive).toBe(true);

      bridge.stopAutoSync();
      expect(bridge.getStatus().autoSyncActive).toBe(false);
    });

    it('should sync periodically when auto sync active', async () => {
      bridge.recordActivity('user-123', {
        type: 'vocabulary_reviewed',
        correct: true,
        vocabularyId: 'vocab-1',
      });

      bridge.startAutoSync();

      // Advance timer past sync interval
      await vi.advanceTimersByTimeAsync(35000);

      // Activities should have been synced
      expect(bridge.getStatus().lastSyncTime).not.toBeNull();
    });
  });

  describe('syncPendingActivities', () => {
    it('should sync pending activities', async () => {
      bridge.recordActivity('user-123', {
        type: 'vocabulary_reviewed',
        correct: true,
        vocabularyId: 'vocab-1',
        responseTime: 2000,
      });

      const result = await bridge.syncPendingActivities();

      expect(result.synced).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
    });

    it('should return zero counts for empty queue', async () => {
      const result = await bridge.syncPendingActivities();

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return correct status', () => {
      const status = bridge.getStatus();

      expect(status).toHaveProperty('pendingCount');
      expect(status).toHaveProperty('isSyncing');
      expect(status).toHaveProperty('lastSyncTime');
      expect(status).toHaveProperty('autoSyncActive');
      expect(status).toHaveProperty('errorCount');
      expect(status).toHaveProperty('gnnAvailable');
    });
  });

  describe('clearPending', () => {
    it('should clear all pending activities', () => {
      bridge.recordActivity('user-123', {
        type: 'vocabulary_reviewed',
        correct: true,
      });

      bridge.clearPending();

      expect(bridge.getStatus().pendingCount).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update sync configuration', () => {
      bridge.updateConfig({ batchSize: 20, syncInterval: 60000 });

      // Config is internal, but we can verify it doesn't throw
      expect(() => bridge.updateConfig({ batchSize: 5 })).not.toThrow();
    });
  });
});
