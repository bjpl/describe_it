/**
 * VectorStoreBridge
 * Bridges Zustand learningSessionStore with RuVector GNN learning services
 * Provides seamless integration for learning data synchronization
 */

import { learningService } from '../services/learning';
import { spacedRepetitionBridge } from '../services/spaced-repetition-bridge';
import { featureFlags } from '../config';
import { logger } from '@/lib/logger';

interface ActivityRecord {
  type:
    | 'image_viewed'
    | 'description_completed'
    | 'question_answered'
    | 'phrase_selected'
    | 'vocabulary_reviewed';
  correct?: boolean;
  points?: number;
  responseTime?: number;
  vocabularyId?: string;
  confusedWith?: string;
  timestamp?: Date;
}

interface SessionResult {
  cardId: string;
  quality: number;
  responseTime: number;
  correct: boolean;
  timestamp: Date;
}

interface SyncConfig {
  batchSize: number;
  syncInterval: number;
  retryAttempts: number;
  retryDelay: number;
}

const DEFAULT_SYNC_CONFIG: SyncConfig = {
  batchSize: 10,
  syncInterval: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000,
};

class VectorStoreBridge {
  private static instance: VectorStoreBridge | null = null;
  private pendingActivities: Array<ActivityRecord & { userId: string }> = [];
  private syncTimer: NodeJS.Timeout | null = null;
  private config: SyncConfig;
  private isSyncing: boolean = false;
  private lastSyncTime: Date | null = null;
  private errorCount: number = 0;

  private constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
  }

  public static getInstance(config?: Partial<SyncConfig>): VectorStoreBridge {
    if (!VectorStoreBridge.instance) {
      VectorStoreBridge.instance = new VectorStoreBridge(config);
    }
    return VectorStoreBridge.instance;
  }

  public static resetInstance(): void {
    if (VectorStoreBridge.instance) {
      VectorStoreBridge.instance.stopAutoSync();
    }
    VectorStoreBridge.instance = null;
  }

  /**
   * Record a learning activity to be synced with GNN
   */
  public recordActivity(userId: string, activity: ActivityRecord): void {
    if (!userId || userId === 'anonymous') {
      logger.debug('[VectorStoreBridge] Skipping anonymous user activity');
      return;
    }

    this.pendingActivities.push({
      ...activity,
      userId,
      timestamp: activity.timestamp || new Date(),
    });

    logger.debug('[VectorStoreBridge] Activity recorded', {
      userId,
      type: activity.type,
      pendingCount: this.pendingActivities.length,
    });

    // Auto-sync if batch size reached
    if (this.pendingActivities.length >= this.config.batchSize) {
      this.syncPendingActivities();
    }
  }

  /**
   * Record vocabulary review interaction
   */
  public async recordVocabularyReview(
    userId: string,
    vocabularyId: string,
    correct: boolean,
    responseTime: number,
    confusedWith?: string
  ): Promise<void> {
    if (!featureFlags.useGNNLearning()) {
      logger.debug('[VectorStoreBridge] GNN learning disabled, skipping');
      return;
    }

    try {
      await learningService.recordInteraction(userId, vocabularyId, correct, responseTime);

      logger.info('[VectorStoreBridge] Vocabulary review recorded', {
        userId,
        vocabularyId,
        correct,
        responseTime,
      });
    } catch (error) {
      logger.error('[VectorStoreBridge] Failed to record vocabulary review', { error });

      // Queue for retry
      this.recordActivity(userId, {
        type: 'vocabulary_reviewed',
        correct,
        responseTime,
        vocabularyId,
        confusedWith,
      });
    }
  }

  /**
   * Sync learning session results with GNN
   */
  public async syncSessionResults(userId: string, results: SessionResult[]): Promise<void> {
    if (!featureFlags.useGNNLearning()) {
      return;
    }

    try {
      await spacedRepetitionBridge.syncLearningData(userId, results);

      logger.info('[VectorStoreBridge] Session results synced', {
        userId,
        resultCount: results.length,
        correctCount: results.filter(r => r.correct).length,
      });
    } catch (error) {
      logger.error('[VectorStoreBridge] Failed to sync session results', { error });
    }
  }

  /**
   * Get GNN-enhanced predictions for vocabulary
   */
  public async getEnhancedPredictions(
    userId: string,
    vocabularyIds: string[]
  ): Promise<
    Map<
      string,
      {
        predictedSuccess: number;
        nextReviewDate: Date;
        difficulty: 'easy' | 'medium' | 'hard';
      }
    >
  > {
    const predictions = new Map();

    if (!featureFlags.useGNNLearning()) {
      return predictions;
    }

    try {
      await Promise.all(
        vocabularyIds.map(async vocabId => {
          const prediction = await learningService.getPrediction(userId, vocabId);
          predictions.set(vocabId, {
            predictedSuccess: prediction.predictedSuccessRate,
            nextReviewDate: prediction.nextReviewDate,
            difficulty: prediction.recommendedDifficulty,
          });
        })
      );

      logger.debug('[VectorStoreBridge] Predictions retrieved', {
        userId,
        vocabularyCount: vocabularyIds.length,
      });
    } catch (error) {
      logger.error('[VectorStoreBridge] Failed to get predictions', { error });
    }

    return predictions;
  }

  /**
   * Get confusion pairs for a user
   */
  public async getConfusionPairs(userId: string): Promise<
    Array<{
      word1: string;
      word2: string;
      confusionRate: number;
    }>
  > {
    if (!featureFlags.useGNNLearning()) {
      return [];
    }

    try {
      return await learningService.getConfusionPairs(userId);
    } catch (error) {
      logger.error('[VectorStoreBridge] Failed to get confusion pairs', { error });
      return [];
    }
  }

  /**
   * Get optimal review schedule
   */
  public async getReviewSchedule(
    userId: string,
    limit: number = 20
  ): Promise<
    Array<{
      vocabularyId: string;
      scheduledDate: Date;
      priority: number;
    }>
  > {
    if (!featureFlags.useGNNLearning()) {
      return [];
    }

    try {
      return await learningService.getOptimalReviewSchedule(userId, limit);
    } catch (error) {
      logger.error('[VectorStoreBridge] Failed to get review schedule', { error });
      return [];
    }
  }

  /**
   * Start automatic background syncing
   */
  public startAutoSync(): void {
    if (this.syncTimer) {
      return;
    }

    this.syncTimer = setInterval(() => {
      if (this.pendingActivities.length > 0) {
        this.syncPendingActivities();
      }
    }, this.config.syncInterval);

    logger.info('[VectorStoreBridge] Auto-sync started', {
      interval: this.config.syncInterval,
    });
  }

  /**
   * Stop automatic background syncing
   */
  public stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;

      logger.info('[VectorStoreBridge] Auto-sync stopped');
    }
  }

  /**
   * Manually trigger sync of pending activities
   */
  public async syncPendingActivities(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing || this.pendingActivities.length === 0) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      const activitiesToSync = [...this.pendingActivities];
      this.pendingActivities = [];

      // Group by user
      const byUser = new Map<string, typeof activitiesToSync>();
      for (const activity of activitiesToSync) {
        const existing = byUser.get(activity.userId) || [];
        existing.push(activity);
        byUser.set(activity.userId, existing);
      }

      // Process each user's activities
      for (const [userId, activities] of byUser) {
        for (const activity of activities) {
          try {
            if (activity.type === 'vocabulary_reviewed' && activity.vocabularyId) {
              await learningService.recordInteraction(
                userId,
                activity.vocabularyId,
                activity.correct ?? false,
                activity.responseTime ?? 0
              );
              synced++;
            } else if (activity.type === 'question_answered' && activity.vocabularyId) {
              await learningService.recordInteraction(
                userId,
                activity.vocabularyId,
                activity.correct ?? false,
                activity.responseTime ?? 0
              );
              synced++;
            }
          } catch (error) {
            logger.warn('[VectorStoreBridge] Failed to sync activity', {
              userId,
              type: activity.type,
              error,
            });
            failed++;

            // Re-queue for retry if under limit
            if (this.errorCount < this.config.retryAttempts) {
              this.pendingActivities.push(activity);
            }
          }
        }
      }

      this.lastSyncTime = new Date();
      this.errorCount = failed > 0 ? this.errorCount + 1 : 0;

      logger.info('[VectorStoreBridge] Sync completed', {
        synced,
        failed,
        remaining: this.pendingActivities.length,
      });
    } finally {
      this.isSyncing = false;
    }

    return { synced, failed };
  }

  /**
   * Get bridge status
   */
  public getStatus(): {
    pendingCount: number;
    isSyncing: boolean;
    lastSyncTime: Date | null;
    autoSyncActive: boolean;
    errorCount: number;
    gnnAvailable: boolean;
  } {
    return {
      pendingCount: this.pendingActivities.length,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      autoSyncActive: this.syncTimer !== null,
      errorCount: this.errorCount,
      gnnAvailable: spacedRepetitionBridge.isGNNAvailable(),
    };
  }

  /**
   * Clear all pending activities
   */
  public clearPending(): void {
    this.pendingActivities = [];
    this.errorCount = 0;
  }

  /**
   * Update sync configuration
   */
  public updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart auto-sync with new interval if active
    if (this.syncTimer) {
      this.stopAutoSync();
      this.startAutoSync();
    }
  }
}

export const vectorStoreBridge = VectorStoreBridge.getInstance();
export { VectorStoreBridge };
