/**
 * LearningService
 * GNN-based learning pattern analysis and spaced repetition optimization
 */

import { vectorClient } from '../client';
import { graphService } from './graph';
import { embeddingService } from './embedding';
import { getVectorConfig } from '../config';
import type { LearningPattern, GNNPrediction, ILearningService } from '../types';
import { GraphError } from '../types';
import { logger } from '@/lib/logger';

class LearningService implements ILearningService {
  private static instance: LearningService | null = null;
  private config = getVectorConfig();
  private readonly SPACED_REPETITION_BASE = 1.5;
  private readonly MIN_INTERVAL = 1;
  private readonly MAX_INTERVAL = 180;

  private constructor() {}

  public static getInstance(): LearningService {
    if (!LearningService.instance) {
      LearningService.instance = new LearningService();
    }
    return LearningService.instance;
  }

  public static resetInstance(): void {
    LearningService.instance = null;
  }

  public async recordInteraction(
    userId: string,
    vocabularyId: string,
    success: boolean,
    responseTime: number
  ): Promise<void> {
    try {
      let userNode = await graphService.getNode(userId);
      if (!userNode) {
        userNode = await graphService.addNode({
          id: userId,
          type: 'user',
          properties: { userId },
        });
      }

      const vocabNode = await graphService.getNode(vocabularyId);
      if (!vocabNode) {
        logger.warn('[LearningService] Vocabulary node not found', { vocabularyId });
        return;
      }

      const pattern = await this.getOrCreatePattern(userId, vocabularyId);
      const updatedPattern = this.updatePattern(pattern, success, responseTime);
      await this.storePattern(updatedPattern);
      await this.updateLearnedEdge(userId, vocabularyId, updatedPattern);

      logger.info('[LearningService] Recorded interaction', {
        userId,
        vocabularyId,
        success,
        successRate: updatedPattern.successRate,
      });
    } catch (error) {
      logger.error('[LearningService] Failed to record interaction', {
        error,
        userId,
        vocabularyId,
      });
      throw new GraphError('Failed to record interaction', { error });
    }
  }

  public async getPrediction(userId: string, vocabularyId: string): Promise<GNNPrediction> {
    try {
      const pattern = await this.getOrCreatePattern(userId, vocabularyId);

      if (this.config.gnn.enabled) {
        return await this.getGNNPrediction(userId, vocabularyId, pattern);
      } else {
        return this.getRuleBasedPrediction(pattern);
      }
    } catch (error) {
      logger.error('[LearningService] Failed to get prediction', { error, userId, vocabularyId });
      return this.getDefaultPrediction();
    }
  }

  public async getConfusionPairs(
    userId: string
  ): Promise<Array<{ word1: string; word2: string; confusionRate: number }>> {
    try {
      const result = await graphService.query(
        `MATCH (u:user)-[:learned]->(w1:vocabulary)-[c:confused_with]-(w2:vocabulary)
         WHERE u.id = $userId AND c.userId = $userId
         RETURN w1, w2, c
         ORDER BY c.weight DESC
         LIMIT 20`,
        { userId }
      );

      return result.edges
        .map((edge, idx) => {
          const word1Node = result.nodes.find(n => n.id === edge.source);
          const word2Node = result.nodes.find(n => n.id === edge.target);
          return {
            word1: (word1Node?.properties?.word as string) || '',
            word2: (word2Node?.properties?.word as string) || '',
            confusionRate: edge.weight || 0,
          };
        })
        .filter(pair => pair.word1 && pair.word2);
    } catch (error) {
      logger.error('[LearningService] Failed to get confusion pairs', { error, userId });
      return [];
    }
  }

  public async getOptimalReviewSchedule(
    userId: string,
    limit: number = 20
  ): Promise<Array<{ vocabularyId: string; scheduledDate: Date; priority: number }>> {
    try {
      const result = await graphService.query(
        `MATCH (u:user)-[l:learned]->(v:vocabulary)
         WHERE u.id = $userId
         RETURN v, l`,
        { userId }
      );

      const schedule: Array<{ vocabularyId: string; scheduledDate: Date; priority: number }> = [];

      for (const edge of result.edges) {
        const vocabularyId = edge.target;
        const nextReview = edge.metadata?.nextReview
          ? new Date(edge.metadata.nextReview as string)
          : new Date();
        const successRate = (edge.metadata?.successRate as number) || 0.5;

        const now = new Date();
        const daysSinceReview = Math.max(
          0,
          (now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24)
        );
        const priority = (1 - successRate) * 100 + daysSinceReview * 10;

        schedule.push({ vocabularyId, scheduledDate: nextReview, priority });
      }

      return schedule.sort((a, b) => b.priority - a.priority).slice(0, limit);
    } catch (error) {
      logger.error('[LearningService] Failed to get review schedule', { error, userId });
      return [];
    }
  }

  private async getGNNPrediction(
    userId: string,
    vocabularyId: string,
    pattern: LearningPattern
  ): Promise<GNNPrediction> {
    try {
      const neighbors = await graphService.getNeighbors(vocabularyId, 2, [
        'synonym',
        'translation',
        'related',
      ]);

      const neighborPatterns = await Promise.all(
        neighbors.nodes
          .filter(n => n.type === 'vocabulary')
          .slice(0, 10)
          .map(async node => {
            try {
              return await this.getOrCreatePattern(userId, node.id);
            } catch {
              return null;
            }
          })
      );

      const validNeighborPatterns = neighborPatterns.filter(
        (p): p is LearningPattern => p !== null
      );

      const userProfile = this.generateUserProfile(pattern, validNeighborPatterns);
      const profileEmbedding = await embeddingService.generateEmbedding(
        JSON.stringify(userProfile)
      );

      const predictedSuccessRate = this.simulateGNNPrediction(
        pattern,
        validNeighborPatterns,
        profileEmbedding.vector
      );
      const nextReviewInterval = this.calculateOptimalInterval(
        pattern.successRate,
        predictedSuccessRate,
        pattern.optimalInterval
      );
      const recommendedDifficulty = this.determineDifficulty(predictedSuccessRate);
      const suggestedRelatedWords = neighbors.nodes
        .filter(n => n.type === 'vocabulary' && n.id !== vocabularyId)
        .slice(0, 5)
        .map(n => n.properties.word as string)
        .filter(Boolean);

      return {
        nextReviewDate: new Date(Date.now() + nextReviewInterval * 24 * 60 * 60 * 1000),
        predictedSuccessRate,
        confidence: this.calculateConfidence(pattern, validNeighborPatterns.length),
        recommendedDifficulty,
        suggestedRelatedWords,
      };
    } catch (error) {
      logger.error('[LearningService] GNN prediction failed, using fallback', { error });
      return this.getRuleBasedPrediction(pattern);
    }
  }

  private simulateGNNPrediction(
    pattern: LearningPattern,
    neighborPatterns: LearningPattern[],
    _userEmbedding: number[]
  ): number {
    if (neighborPatterns.length === 0) return pattern.successRate;

    let weightedSum = pattern.successRate * 0.6;
    let totalWeight = 0.6;

    for (const neighbor of neighborPatterns) {
      const influence = 0.4 / neighborPatterns.length;
      weightedSum += neighbor.successRate * influence;
      totalWeight += influence;
    }

    const daysSinceUpdate = (Date.now() - pattern.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    const temporalFactor = Math.exp(-daysSinceUpdate / 30);

    return Math.max(0, Math.min(1, (weightedSum / totalWeight) * temporalFactor));
  }

  private getRuleBasedPrediction(pattern: LearningPattern): GNNPrediction {
    const nextReviewInterval = this.calculateOptimalInterval(
      pattern.successRate,
      pattern.successRate,
      pattern.optimalInterval
    );

    return {
      nextReviewDate: new Date(Date.now() + nextReviewInterval * 24 * 60 * 60 * 1000),
      predictedSuccessRate: pattern.successRate,
      confidence: 0.7,
      recommendedDifficulty: this.determineDifficulty(pattern.successRate),
      suggestedRelatedWords: [],
    };
  }

  private getDefaultPrediction(): GNNPrediction {
    return {
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      predictedSuccessRate: 0.5,
      confidence: 0.5,
      recommendedDifficulty: 'medium',
      suggestedRelatedWords: [],
    };
  }

  private async getOrCreatePattern(userId: string, vocabularyId: string): Promise<LearningPattern> {
    const result = await graphService.query(
      `MATCH (u:user)-[l:learned]->(v:vocabulary)
       WHERE u.id = $userId AND v.id = $vocabularyId
       RETURN l`,
      { userId, vocabularyId }
    );

    if (result.edges.length > 0) {
      const edge = result.edges[0];
      return {
        userId,
        vocabularyId,
        successRate: (edge.metadata?.successRate as number) || 0.5,
        averageResponseTime: (edge.metadata?.avgResponseTime as number) || 5000,
        confusionPairs: (edge.metadata?.confusionPairs as string[]) || [],
        optimalInterval: (edge.metadata?.optimalInterval as number) || this.MIN_INTERVAL,
        lastUpdated: new Date((edge.metadata?.lastUpdated as string) || Date.now()),
      };
    }

    return {
      userId,
      vocabularyId,
      successRate: 0.5,
      averageResponseTime: 5000,
      confusionPairs: [],
      optimalInterval: this.MIN_INTERVAL,
      lastUpdated: new Date(),
    };
  }

  private updatePattern(
    pattern: LearningPattern,
    success: boolean,
    responseTime: number
  ): LearningPattern {
    const alpha = 0.3;
    const newSuccessRate = pattern.successRate * (1 - alpha) + (success ? 1 : 0) * alpha;
    const newAvgResponseTime = pattern.averageResponseTime * 0.7 + responseTime * 0.3;
    const newInterval = this.calculateNextInterval(
      pattern.optimalInterval,
      success,
      newSuccessRate
    );

    return {
      ...pattern,
      successRate: newSuccessRate,
      averageResponseTime: newAvgResponseTime,
      optimalInterval: newInterval,
      lastUpdated: new Date(),
    };
  }

  private async storePattern(pattern: LearningPattern): Promise<void> {
    await graphService.query(
      `MATCH (u:user), (v:vocabulary)
       WHERE u.id = $userId AND v.id = $vocabularyId
       MERGE (u)-[l:learned]->(v)
       SET l.successRate = $successRate, l.avgResponseTime = $avgResponseTime,
           l.confusionPairs = $confusionPairs, l.optimalInterval = $optimalInterval, l.lastUpdated = $lastUpdated
       RETURN l`,
      {
        userId: pattern.userId,
        vocabularyId: pattern.vocabularyId,
        successRate: pattern.successRate,
        avgResponseTime: pattern.averageResponseTime,
        confusionPairs: pattern.confusionPairs,
        optimalInterval: pattern.optimalInterval,
        lastUpdated: pattern.lastUpdated.toISOString(),
      }
    );
  }

  private async updateLearnedEdge(
    userId: string,
    vocabularyId: string,
    pattern: LearningPattern
  ): Promise<void> {
    const nextReview = new Date(Date.now() + pattern.optimalInterval * 24 * 60 * 60 * 1000);
    await graphService.query(
      `MATCH (u:user)-[l:learned]->(v:vocabulary)
       WHERE u.id = $userId AND v.id = $vocabularyId
       SET l.weight = $weight, l.nextReview = $nextReview
       RETURN l`,
      { userId, vocabularyId, weight: pattern.successRate, nextReview: nextReview.toISOString() }
    );
  }

  private calculateNextInterval(
    currentInterval: number,
    success: boolean,
    successRate: number
  ): number {
    if (success) {
      const newInterval = currentInterval * this.SPACED_REPETITION_BASE * (1 + successRate * 0.5);
      return Math.min(newInterval, this.MAX_INTERVAL);
    }
    return this.MIN_INTERVAL;
  }

  private calculateOptimalInterval(
    currentSuccessRate: number,
    predictedSuccessRate: number,
    currentInterval: number
  ): number {
    const combinedRate = (currentSuccessRate + predictedSuccessRate) / 2;
    const scaleFactor = 0.5 + combinedRate * 2;
    const newInterval = currentInterval * scaleFactor;
    return Math.max(this.MIN_INTERVAL, Math.min(newInterval, this.MAX_INTERVAL));
  }

  private determineDifficulty(successRate: number): 'easy' | 'medium' | 'hard' {
    if (successRate >= 0.8) return 'easy';
    if (successRate >= 0.5) return 'medium';
    return 'hard';
  }

  private calculateConfidence(pattern: LearningPattern, neighborCount: number): number {
    const daysSinceUpdate = (Date.now() - pattern.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.exp(-daysSinceUpdate / 7);
    const neighborFactor = Math.min(neighborCount / 10, 1);
    return Math.max(0, Math.min(1, 0.5 + recencyFactor * 0.3 + neighborFactor * 0.2));
  }

  private generateUserProfile(
    pattern: LearningPattern,
    neighborPatterns: LearningPattern[]
  ): Record<string, unknown> {
    return {
      successRate: pattern.successRate,
      avgResponseTime: pattern.averageResponseTime,
      optimalInterval: pattern.optimalInterval,
      neighborCount: neighborPatterns.length,
      avgNeighborSuccess:
        neighborPatterns.length > 0
          ? neighborPatterns.reduce((sum, p) => sum + p.successRate, 0) / neighborPatterns.length
          : 0.5,
    };
  }
}

export const learningService = LearningService.getInstance();
export { LearningService };
