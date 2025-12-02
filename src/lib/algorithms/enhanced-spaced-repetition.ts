/**
 * Enhanced Spaced Repetition Algorithm
 * Wraps SM-2 with GNN-powered predictions from RuVector
 */

import { SpacedRepetitionAlgorithm, SpacedRepetitionUtils } from './spaced-repetition';
import { BaseAlgorithm, AlgorithmConfig, ReviewCard } from './algorithm-interface';
import { spacedRepetitionBridge } from '@/lib/vector/services/spaced-repetition-bridge';
import { vectorStoreBridge } from '@/lib/vector/integration/vector-store-bridge';
import { featureFlags } from '@/lib/vector/config';
import { logger } from '@/lib/logger';

export interface EnhancedReviewCard extends ReviewCard {
  gnnEnhanced?: boolean;
  predictedSuccess?: number;
  suggestedRelatedWords?: string[];
  confidenceScore?: number;
}

export interface EnhancedAlgorithmConfig extends AlgorithmConfig {
  gnnWeight?: number;
  sm2Weight?: number;
  minConfidenceThreshold?: number;
  enableGNNFallback?: boolean;
}

export class EnhancedSpacedRepetitionAlgorithm extends BaseAlgorithm {
  private sm2Algorithm: SpacedRepetitionAlgorithm;
  private gnnWeight: number;
  private sm2Weight: number;
  private minConfidenceThreshold: number;
  private enableGNNFallback: boolean;

  constructor(config?: Partial<EnhancedAlgorithmConfig>) {
    const defaultConfig: EnhancedAlgorithmConfig = {
      initialInterval: 1,
      easeFactor: 2.5,
      minInterval: 1,
      maxInterval: 365,
      gnnWeight: 0.4,
      sm2Weight: 0.6,
      minConfidenceThreshold: 0.3,
      enableGNNFallback: true,
      ...config,
    };

    super(defaultConfig);
    this.sm2Algorithm = new SpacedRepetitionAlgorithm(defaultConfig);
    this.gnnWeight = defaultConfig.gnnWeight ?? 0.4;
    this.sm2Weight = defaultConfig.sm2Weight ?? 0.6;
    this.minConfidenceThreshold = defaultConfig.minConfidenceThreshold ?? 0.3;
    this.enableGNNFallback = defaultConfig.enableGNNFallback ?? true;
  }

  /**
   * Standard SM-2 interval calculation (used as fallback)
   */
  calculateNextInterval(currentInterval: number, quality: number, easeFactor: number): number {
    return this.sm2Algorithm.calculateNextInterval(currentInterval, quality, easeFactor);
  }

  /**
   * Standard SM-2 ease factor update
   */
  updateEaseFactor(currentFactor: number, quality: number): number {
    return this.sm2Algorithm.updateEaseFactor(currentFactor, quality);
  }

  /**
   * Update card using SM-2 (synchronous fallback)
   */
  updateCard(card: ReviewCard, quality: number): ReviewCard {
    return this.sm2Algorithm.updateCard(card, quality);
  }

  /**
   * Enhanced card update with GNN predictions
   */
  async updateCardEnhanced(
    card: ReviewCard,
    quality: number,
    userId: string,
    responseTime?: number
  ): Promise<EnhancedReviewCard> {
    // First, apply standard SM-2 update
    const sm2Updated = this.sm2Algorithm.updateCard(card, quality);

    // Record the interaction for GNN learning
    if (responseTime !== undefined) {
      vectorStoreBridge.recordActivity(userId, {
        type: 'vocabulary_reviewed',
        correct: quality >= 3,
        responseTime,
        vocabularyId: card.id,
      });
    }

    // If GNN is not available, return SM-2 result
    if (!featureFlags.useGNNLearning() || !spacedRepetitionBridge.isGNNAvailable()) {
      return {
        ...sm2Updated,
        gnnEnhanced: false,
      };
    }

    try {
      // Get GNN-enhanced predictions
      const bridgeCard = {
        id: card.id,
        easeFactor: sm2Updated.easeFactor,
        interval: sm2Updated.interval,
        repetitions: sm2Updated.reviewCount,
        nextReview: sm2Updated.nextReviewDate,
        word: (card as any).word || card.id,
      };

      const adaptedCard = await spacedRepetitionBridge.adaptDifficulty(bridgeCard, userId);
      const enhanced = await spacedRepetitionBridge.enhanceWithGNN(bridgeCard, userId);

      // Blend SM-2 and GNN results
      const blendedInterval = this.blendIntervals(
        sm2Updated.interval,
        adaptedCard.interval,
        enhanced.predictedSuccess ?? 0.5
      );

      const blendedEaseFactor = this.blendEaseFactors(
        sm2Updated.easeFactor,
        adaptedCard.easeFactor,
        enhanced.predictedSuccess ?? 0.5
      );

      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + blendedInterval);

      logger.debug('[EnhancedSR] Card updated with GNN enhancement', {
        cardId: card.id,
        sm2Interval: sm2Updated.interval,
        gnnInterval: adaptedCard.interval,
        blendedInterval,
        predictedSuccess: enhanced.predictedSuccess,
      });

      return {
        ...sm2Updated,
        interval: blendedInterval,
        easeFactor: blendedEaseFactor,
        nextReviewDate,
        gnnEnhanced: true,
        predictedSuccess: enhanced.predictedSuccess,
        confidenceScore: enhanced.predictedSuccess,
      };
    } catch (error) {
      logger.warn('[EnhancedSR] GNN enhancement failed, using SM-2 fallback', { error });

      if (this.enableGNNFallback) {
        return {
          ...sm2Updated,
          gnnEnhanced: false,
        };
      }
      throw error;
    }
  }

  /**
   * Get optimized review schedule for a user
   */
  async getOptimizedSchedule(
    userId: string,
    cards: ReviewCard[],
    limit?: number
  ): Promise<Array<EnhancedReviewCard & { priority: number; source: 'sm2' | 'gnn' | 'hybrid' }>> {
    // Convert cards to bridge format
    const bridgeCards = cards.map(card => ({
      id: card.id,
      easeFactor: card.easeFactor,
      interval: card.interval,
      repetitions: card.reviewCount,
      nextReview: card.nextReviewDate,
      word: (card as any).word || card.id,
    }));

    try {
      const schedule = await spacedRepetitionBridge.getHybridSchedule(userId, bridgeCards);

      return schedule.slice(0, limit).map((item, index) => {
        const originalCard = cards.find(c => c.id === item.card.id);
        return {
          ...(originalCard || SpacedRepetitionUtils.createCard(item.card.id, item.card.word || '')),
          nextReviewDate: item.scheduledDate,
          gnnEnhanced: item.source !== 'sm2',
          predictedSuccess: item.confidenceScore,
          suggestedRelatedWords: item.recommendedRelated,
          confidenceScore: item.confidenceScore,
          priority: schedule.length - index, // Higher priority for earlier items
          source: item.source,
        };
      });
    } catch (error) {
      logger.warn('[EnhancedSR] Failed to get optimized schedule, using basic sorting', { error });

      // Fallback: sort by due date
      return cards
        .filter(card => SpacedRepetitionUtils.isCardDue(card))
        .sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime())
        .slice(0, limit)
        .map((card, index) => ({
          ...card,
          gnnEnhanced: false,
          priority: cards.length - index,
          source: 'sm2' as const,
        }));
    }
  }

  /**
   * Get confusion pairs for focused practice
   */
  async getConfusionPairs(userId: string): Promise<
    Array<{
      word1: string;
      word2: string;
      confusionRate: number;
    }>
  > {
    return vectorStoreBridge.getConfusionPairs(userId);
  }

  /**
   * Sync session results to GNN
   */
  async syncSessionResults(
    userId: string,
    results: Array<{
      cardId: string;
      quality: number;
      responseTime: number;
      correct: boolean;
    }>
  ): Promise<void> {
    await vectorStoreBridge.syncSessionResults(
      userId,
      results.map(r => ({
        ...r,
        timestamp: new Date(),
      }))
    );
  }

  /**
   * Blend SM-2 and GNN intervals
   */
  private blendIntervals(sm2Interval: number, gnnInterval: number, confidence: number): number {
    // Adjust weights based on confidence
    const dynamicGNNWeight = this.gnnWeight * (0.5 + confidence * 0.5);
    const dynamicSM2Weight = 1 - dynamicGNNWeight;

    const blended = Math.round(sm2Interval * dynamicSM2Weight + gnnInterval * dynamicGNNWeight);

    return Math.max(this.config.minInterval, Math.min(blended, this.config.maxInterval));
  }

  /**
   * Blend SM-2 and GNN ease factors
   */
  private blendEaseFactors(sm2EF: number, gnnEF: number, confidence: number): number {
    const dynamicGNNWeight = this.gnnWeight * (0.5 + confidence * 0.5);
    const dynamicSM2Weight = 1 - dynamicGNNWeight;

    const blended = sm2EF * dynamicSM2Weight + gnnEF * dynamicGNNWeight;

    // Clamp to valid range
    return Math.max(1.3, Math.min(2.5, blended));
  }

  /**
   * Get algorithm status
   */
  getStatus(): {
    gnnEnabled: boolean;
    gnnAvailable: boolean;
    weights: { sm2: number; gnn: number };
    minConfidenceThreshold: number;
  } {
    return {
      gnnEnabled: featureFlags.useGNNLearning(),
      gnnAvailable: spacedRepetitionBridge.isGNNAvailable(),
      weights: { sm2: this.sm2Weight, gnn: this.gnnWeight },
      minConfidenceThreshold: this.minConfidenceThreshold,
    };
  }
}

/**
 * Enhanced utilities
 */
export const EnhancedSpacedRepetitionUtils = {
  ...SpacedRepetitionUtils,

  /**
   * Create an enhanced card with GNN fields
   */
  createEnhancedCard: (id: string, content: string): EnhancedReviewCard => ({
    ...SpacedRepetitionUtils.createCard(id, content),
    gnnEnhanced: false,
  }),

  /**
   * Check if a card has been enhanced by GNN
   */
  isGNNEnhanced: (card: EnhancedReviewCard): boolean => {
    return card.gnnEnhanced === true;
  },

  /**
   * Get predicted success description
   */
  getPredictedSuccessDescription: (card: EnhancedReviewCard): string => {
    if (!card.predictedSuccess) return 'Unknown';
    if (card.predictedSuccess >= 0.8) return 'High';
    if (card.predictedSuccess >= 0.5) return 'Medium';
    return 'Low';
  },

  /**
   * Sort cards by GNN-predicted priority
   */
  sortByPriority: (cards: EnhancedReviewCard[]): EnhancedReviewCard[] => {
    return [...cards].sort((a, b) => {
      // First by due status
      const aDue = SpacedRepetitionUtils.isCardDue(a);
      const bDue = SpacedRepetitionUtils.isCardDue(b);
      if (aDue !== bDue) return aDue ? -1 : 1;

      // Then by predicted success (lower success = higher priority)
      const aSuccess = a.predictedSuccess ?? 0.5;
      const bSuccess = b.predictedSuccess ?? 0.5;
      return aSuccess - bSuccess;
    });
  },
};

// Export singleton instance
export const enhancedSpacedRepetition = new EnhancedSpacedRepetitionAlgorithm();
