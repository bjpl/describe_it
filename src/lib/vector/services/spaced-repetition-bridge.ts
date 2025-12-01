/**
 * SpacedRepetitionBridge
 * Bridges GNN learning predictions with SM-2 spaced repetition algorithm
 */

import { learningService } from './learning';
import { graphService } from './graph';
import { getVectorConfig, featureFlags } from '../config';
import type { GNNPrediction } from '../types';
import { logger } from '@/lib/logger';

interface SpacedRepetitionCard {
  id: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  word?: string;
}

interface HybridScheduleResult {
  card: SpacedRepetitionCard;
  scheduledDate: Date;
  confidenceScore: number;
  recommendedRelated: string[];
  source: 'sm2' | 'gnn' | 'hybrid';
}

interface SessionResult {
  cardId: string;
  quality: number;
  responseTime: number;
  correct: boolean;
  timestamp: Date;
}

interface BridgeConfig {
  gnnWeight: number;
  sm2Weight: number;
  minConfidenceThreshold: number;
}

const DEFAULT_CONFIG: BridgeConfig = {
  gnnWeight: 0.4,
  sm2Weight: 0.6,
  minConfidenceThreshold: 0.3,
};

class SpacedRepetitionBridge {
  private static instance: SpacedRepetitionBridge | null = null;
  private config: BridgeConfig;
  private gnnAvailable: boolean = true;

  private constructor(config: Partial<BridgeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public static getInstance(config?: Partial<BridgeConfig>): SpacedRepetitionBridge {
    if (!SpacedRepetitionBridge.instance) {
      SpacedRepetitionBridge.instance = new SpacedRepetitionBridge(config);
    }
    return SpacedRepetitionBridge.instance;
  }

  public static resetInstance(): void {
    SpacedRepetitionBridge.instance = null;
  }

  public async enhanceWithGNN(
    card: SpacedRepetitionCard,
    userId: string
  ): Promise<SpacedRepetitionCard & { gnnEnhanced: boolean; predictedSuccess?: number }> {
    if (!featureFlags.useGNNLearning() || !this.gnnAvailable) {
      return { ...card, gnnEnhanced: false };
    }

    try {
      const prediction = await learningService.getPrediction(userId, card.id);

      return {
        ...card,
        gnnEnhanced: true,
        predictedSuccess: prediction.predictedSuccessRate,
      };
    } catch (error) {
      logger.error('[SpacedRepetitionBridge] GNN enhancement failed', { error });
      this.gnnAvailable = false;
      return { ...card, gnnEnhanced: false };
    }
  }

  public async getHybridSchedule(
    userId: string,
    cards: SpacedRepetitionCard[]
  ): Promise<HybridScheduleResult[]> {
    const results: HybridScheduleResult[] = [];

    for (const card of cards) {
      try {
        if (!featureFlags.useGNNLearning() || !this.gnnAvailable) {
          results.push(this.createSM2Schedule(card));
          continue;
        }

        const prediction = await learningService.getPrediction(userId, card.id);
        results.push(this.mergeSchedules(card, prediction));
      } catch (error) {
        logger.error('[SpacedRepetitionBridge] Hybrid scheduling failed', {
          error,
          cardId: card.id,
        });
        results.push(this.createSM2Schedule(card));
      }
    }

    return results.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  public async adaptDifficulty(
    card: SpacedRepetitionCard,
    userId: string
  ): Promise<SpacedRepetitionCard> {
    if (!featureFlags.useGNNLearning() || !this.gnnAvailable) {
      return card;
    }

    try {
      const prediction = await learningService.getPrediction(userId, card.id);

      const adjustedEaseFactor = this.calculateAdjustedEaseFactor(
        card.easeFactor,
        prediction.predictedSuccessRate
      );

      const adjustedInterval = this.calculateHybridInterval(
        card.interval,
        this.daysUntil(prediction.nextReviewDate),
        prediction.predictedSuccessRate
      );

      return { ...card, easeFactor: adjustedEaseFactor, interval: adjustedInterval };
    } catch (error) {
      logger.error('[SpacedRepetitionBridge] Difficulty adaptation failed', { error });
      return card;
    }
  }

  public async syncLearningData(userId: string, sessionResults: SessionResult[]): Promise<void> {
    if (!featureFlags.useGNNLearning() || !this.gnnAvailable) {
      return;
    }

    try {
      for (const result of sessionResults) {
        await learningService.recordInteraction(
          userId,
          result.cardId,
          result.correct,
          result.responseTime
        );
      }

      logger.info('[SpacedRepetitionBridge] Synced learning data', {
        userId,
        sessionSize: sessionResults.length,
        accuracy: sessionResults.filter(r => r.correct).length / sessionResults.length,
      });
    } catch (error) {
      logger.error('[SpacedRepetitionBridge] Failed to sync learning data', { error });
      this.gnnAvailable = false;
    }
  }

  public updateConfig(config: Partial<BridgeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): BridgeConfig {
    return { ...this.config };
  }

  public isGNNAvailable(): boolean {
    return this.gnnAvailable && featureFlags.useGNNLearning();
  }

  public resetGNNAvailability(): void {
    this.gnnAvailable = true;
  }

  private createSM2Schedule(card: SpacedRepetitionCard): HybridScheduleResult {
    return {
      card,
      scheduledDate: new Date(card.nextReview),
      confidenceScore: this.sm2ToConfidence(card.easeFactor),
      recommendedRelated: [],
      source: 'sm2',
    };
  }

  private mergeSchedules(
    card: SpacedRepetitionCard,
    prediction: GNNPrediction
  ): HybridScheduleResult {
    const sm2Interval = card.interval || 1;
    const gnnInterval = this.daysUntil(prediction.nextReviewDate);
    const successRate = prediction.predictedSuccessRate;

    const hybridInterval = Math.round(
      sm2Interval * this.config.sm2Weight + gnnInterval * this.config.gnnWeight
    );

    const confidenceAdjustment = successRate < this.config.minConfidenceThreshold ? 0.5 : 1;
    const finalInterval = Math.max(1, Math.round(hybridInterval * confidenceAdjustment));

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + finalInterval);

    return {
      card,
      scheduledDate,
      confidenceScore: successRate,
      recommendedRelated: prediction.suggestedRelatedWords,
      source: 'hybrid',
    };
  }

  private calculateAdjustedEaseFactor(currentEF: number, predictedSuccess: number): number {
    const adjustment = (predictedSuccess - 0.5) * 0.2;
    return Math.max(1.3, Math.min(2.5, currentEF + adjustment));
  }

  private calculateHybridInterval(
    sm2Interval: number,
    gnnInterval: number,
    confidence: number
  ): number {
    const dynamicGNNWeight = this.config.gnnWeight * (0.5 + confidence * 0.5);
    const dynamicSM2Weight = 1 - dynamicGNNWeight;
    return Math.max(1, Math.round(sm2Interval * dynamicSM2Weight + gnnInterval * dynamicGNNWeight));
  }

  private sm2ToConfidence(easeFactor: number): number {
    return Math.max(0, Math.min(1, (easeFactor - 1.3) / 1.2));
  }

  private daysUntil(date: Date): number {
    const now = new Date();
    return Math.max(1, Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }
}

export const spacedRepetitionBridge = SpacedRepetitionBridge.getInstance();
export { SpacedRepetitionBridge };
