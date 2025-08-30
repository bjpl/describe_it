/**
 * Unified Algorithm Interface for Spaced Repetition Learning System
 * Provides a consistent API for all learning algorithms
 */

import { SpacedRepetitionAlgorithm, SpacedRepetitionCard } from './spaced-repetition';
import { LeitnerSystemAlgorithm, LeitnerCard } from './leitner-system';
import { AdaptiveDifficultyAlgorithm, AdaptiveDifficultyCard } from './adaptive-difficulty';
import { LearningCurveAlgorithm, LearningCurveModel, LearningDataPoint } from './learning-curve';
import { PerformanceAnalyticsAlgorithm, PerformanceMetrics } from './performance-analytics';

export type AlgorithmType = 'sm2' | 'leitner' | 'adaptive' | 'hybrid';
export type MasteryLevel = 'new' | 'learning' | 'young' | 'mature' | 'mastered';

/**
 * Unified card interface that works with all algorithms
 */
export interface UnifiedCard {
  // Common fields
  phrase_id: string;
  user_id: string;
  algorithm_type: AlgorithmType;
  created_at: Date;
  last_reviewed: Date | null;
  next_review_date: Date;
  mastery_level: MasteryLevel;
  
  // Algorithm-specific data
  sm2_data?: Partial<SpacedRepetitionCard>;
  leitner_data?: Partial<LeitnerCard>;
  adaptive_data?: Partial<AdaptiveDifficultyCard>;
  
  // Common metrics
  total_reviews: number;
  correct_reviews: number;
  streak_correct: number;
  streak_incorrect: number;
  average_response_time: number;
  confidence_score: number; // 0-1
}

/**
 * Unified review response interface
 */
export interface UnifiedReviewResponse {
  phrase_id: string;
  quality: number; // 0-5 scale
  response_time_ms: number;
  confidence_level: number; // 1-5 scale
  difficulty_rating: number; // 1-5 scale
  hint_used: boolean;
  attempt_count: number;
  context: {
    session_id: string;
    timestamp: Date;
    time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
    session_progress: number; // 0-1, how far into the session
  };
}

/**
 * Study session configuration
 */
export interface StudySessionConfig {
  algorithm_type: AlgorithmType;
  max_new_cards: number;
  max_review_cards: number;
  target_accuracy: number; // 0-1
  session_time_limit: number; // minutes
  difficulty_distribution: {
    easy: number; // percentage
    medium: number;
    hard: number;
  };
  adaptive_features: {
    dynamic_difficulty: boolean;
    fatigue_detection: boolean;
    performance_optimization: boolean;
  };
}

/**
 * Study session result
 */
export interface StudySessionResult {
  session_id: string;
  cards_studied: UnifiedCard[];
  responses: UnifiedReviewResponse[];
  session_stats: {
    duration_minutes: number;
    accuracy: number;
    average_response_time: number;
    cards_new: number;
    cards_review: number;
    cards_mastered: number;
    difficulty_distribution: Record<string, number>;
  };
  algorithm_recommendations: {
    next_session_config: Partial<StudySessionConfig>;
    focus_areas: string[];
    estimated_mastery_progress: number; // 0-1
  };
}

/**
 * Main Algorithm Interface
 * Provides unified access to all learning algorithms
 */
export class LearningAlgorithmInterface {
  private static instance: LearningAlgorithmInterface;
  private learningCurveModels: Map<string, LearningCurveModel> = new Map();
  
  private constructor() {}
  
  static getInstance(): LearningAlgorithmInterface {
    if (!this.instance) {
      this.instance = new LearningAlgorithmInterface();
    }
    return this.instance;
  }
  
  /**
   * Create a new card using the specified algorithm
   */
  createCard(
    phraseId: string, 
    userId: string, 
    algorithmType: AlgorithmType, 
    baseDifficulty: number = 3
  ): UnifiedCard {
    const now = new Date();
    const unifiedCard: UnifiedCard = {
      phrase_id: phraseId,
      user_id: userId,
      algorithm_type: algorithmType,
      created_at: now,
      last_reviewed: null,
      next_review_date: now,
      mastery_level: 'new',
      total_reviews: 0,
      correct_reviews: 0,
      streak_correct: 0,
      streak_incorrect: 0,
      average_response_time: 0,
      confidence_score: 0,
    };
    
    // Initialize algorithm-specific data
    switch (algorithmType) {
      case 'sm2':
        unifiedCard.sm2_data = SpacedRepetitionAlgorithm.createCard(phraseId, userId);
        break;
      case 'leitner':
        unifiedCard.leitner_data = LeitnerSystemAlgorithm.createCard(phraseId, userId);
        break;
      case 'adaptive':
        unifiedCard.adaptive_data = AdaptiveDifficultyAlgorithm.createCard(phraseId, userId, baseDifficulty);
        break;
      case 'hybrid':
        // Use SM-2 as base with adaptive enhancements
        unifiedCard.sm2_data = SpacedRepetitionAlgorithm.createCard(phraseId, userId);
        unifiedCard.adaptive_data = AdaptiveDifficultyAlgorithm.createCard(phraseId, userId, baseDifficulty);
        break;
    }
    
    return unifiedCard;
  }
  
  /**
   * Process a review response and update the card
   */
  processReview(card: UnifiedCard, response: UnifiedReviewResponse): UnifiedCard {
    const updatedCard = { ...card };
    
    // Update common metrics
    updatedCard.total_reviews++;
    updatedCard.last_reviewed = response.context.timestamp;
    
    const isCorrect = response.quality >= 3;
    if (isCorrect) {
      updatedCard.correct_reviews++;
      updatedCard.streak_correct++;
      updatedCard.streak_incorrect = 0;
    } else {
      updatedCard.streak_incorrect++;
      updatedCard.streak_correct = 0;
    }
    
    // Update average response time (exponential moving average)
    const alpha = 0.3; // Smoothing factor
    updatedCard.average_response_time = updatedCard.total_reviews === 1
      ? response.response_time_ms
      : alpha * response.response_time_ms + (1 - alpha) * updatedCard.average_response_time;
    
    // Update confidence score
    updatedCard.confidence_score = (response.confidence_level - 1) / 4; // Convert 1-5 to 0-1
    
    // Process with specific algorithm
    switch (card.algorithm_type) {
      case 'sm2':
        if (updatedCard.sm2_data) {
          const sm2Card = { ...updatedCard.sm2_data } as SpacedRepetitionCard;
          const processedSM2 = SpacedRepetitionAlgorithm.processReview(sm2Card, response.quality);
          updatedCard.sm2_data = processedSM2;
          updatedCard.next_review_date = processedSM2.next_review_date;
        }
        break;
        
      case 'leitner':
        if (updatedCard.leitner_data) {
          const leitnerCard = { ...updatedCard.leitner_data } as LeitnerCard;
          const processedLeitner = LeitnerSystemAlgorithm.processReview(leitnerCard, isCorrect);
          updatedCard.leitner_data = processedLeitner;
          updatedCard.next_review_date = processedLeitner.next_review_date;
        }
        break;
        
      case 'adaptive':
        if (updatedCard.adaptive_data) {
          const adaptiveCard = { ...updatedCard.adaptive_data } as AdaptiveDifficultyCard;
          const performancePoint = {
            timestamp: response.context.timestamp,
            quality: response.quality,
            response_time_ms: response.response_time_ms,
            confidence_level: response.confidence_level,
            attempt_count: response.attempt_count,
            context_factors: [response.context.time_of_day, `session_progress_${Math.round(response.context.session_progress * 100)}`],
          };
          const processedAdaptive = AdaptiveDifficultyAlgorithm.adaptDifficulty(adaptiveCard, performancePoint);
          updatedCard.adaptive_data = processedAdaptive;
          // Calculate next review date based on adaptive factors
          updatedCard.next_review_date = this.calculateAdaptiveNextReview(processedAdaptive);
        }
        break;
        
      case 'hybrid':
        // Process with both SM-2 and adaptive
        if (updatedCard.sm2_data && updatedCard.adaptive_data) {
          // Process SM-2
          const sm2Card = { ...updatedCard.sm2_data } as SpacedRepetitionCard;
          const processedSM2 = SpacedRepetitionAlgorithm.processReview(sm2Card, response.quality);
          updatedCard.sm2_data = processedSM2;
          
          // Process Adaptive
          const adaptiveCard = { ...updatedCard.adaptive_data } as AdaptiveDifficultyCard;
          const performancePoint = {
            timestamp: response.context.timestamp,
            quality: response.quality,
            response_time_ms: response.response_time_ms,
            confidence_level: response.confidence_level,
            attempt_count: response.attempt_count,
            context_factors: [response.context.time_of_day],
          };
          const processedAdaptive = AdaptiveDifficultyAlgorithm.adaptDifficulty(adaptiveCard, performancePoint);
          updatedCard.adaptive_data = processedAdaptive;
          
          // Combine intervals from both algorithms
          const sm2Interval = (processedSM2.next_review_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          const adaptiveMultiplier = processedAdaptive.adaptation_factor;\n          const combinedInterval = Math.round(sm2Interval * adaptiveMultiplier);\n          \n          updatedCard.next_review_date = new Date();\n          updatedCard.next_review_date.setDate(updatedCard.next_review_date.getDate() + combinedInterval);\n        }\n        break;\n    }\n    \n    // Update mastery level\n    updatedCard.mastery_level = this.calculateMasteryLevel(updatedCard);\n    \n    return updatedCard;\n  }\n  \n  /**\n   * Get cards due for review\n   */\n  getCardsDue(cards: UnifiedCard[], algorithm?: AlgorithmType): UnifiedCard[] {\n    const now = new Date();\n    let dueCards = cards.filter(card => {\n      if (algorithm && card.algorithm_type !== algorithm) return false;\n      return card.next_review_date <= now;\n    });\n    \n    // Sort by priority (overdue cards first, then by mastery level)\n    return dueCards.sort((a, b) => {\n      const overdueDaysA = (now.getTime() - a.next_review_date.getTime()) / (1000 * 60 * 60 * 24);\n      const overdueDaysB = (now.getTime() - b.next_review_date.getTime()) / (1000 * 60 * 60 * 24);\n      \n      // Most overdue first\n      if (Math.abs(overdueDaysA - overdueDaysB) > 1) {\n        return overdueDaysB - overdueDaysA;\n      }\n      \n      // Then by mastery level (new cards last)\n      const masteryPriority = { new: 4, learning: 1, young: 2, mature: 3, mastered: 5 };\n      return masteryPriority[a.mastery_level] - masteryPriority[b.mastery_level];\n    });\n  }\n  \n  /**\n   * Generate optimized study session\n   */\n  generateStudySession(\n    cards: UnifiedCard[], \n    config: StudySessionConfig\n  ): {\n    session_cards: UnifiedCard[];\n    session_plan: {\n      new_cards: UnifiedCard[];\n      review_cards: UnifiedCard[];\n      reinforcement_cards: UnifiedCard[];\n    };\n    estimated_duration: number;\n  } {\n    // Get cards due for review\n    const dueCards = this.getCardsDue(cards, config.algorithm_type);\n    \n    // Get new cards (not yet studied)\n    const newCards = cards\n      .filter(card => {\n        if (config.algorithm_type && card.algorithm_type !== config.algorithm_type) return false;\n        return card.total_reviews === 0;\n      })\n      .slice(0, config.max_new_cards);\n    \n    // Get review cards (limit to max)\n    const reviewCards = dueCards.slice(0, config.max_review_cards);\n    \n    // Get reinforcement cards (struggling cards)\n    const reinforcementCards = cards\n      .filter(card => {\n        if (config.algorithm_type && card.algorithm_type !== config.algorithm_type) return false;\n        return card.streak_incorrect >= 2 || (card.total_reviews > 0 && card.correct_reviews / card.total_reviews < 0.5);\n      })\n      .slice(0, Math.floor(config.max_review_cards * 0.3)); // Up to 30% of review quota\n    \n    // Combine and shuffle for optimal learning\n    const sessionCards = this.optimizeCardOrder([\n      ...newCards,\n      ...reviewCards,\n      ...reinforcementCards\n    ], config);\n    \n    // Estimate session duration\n    const avgTimePerCard = cards.length > 0 \n      ? cards.reduce((sum, c) => sum + c.average_response_time, 0) / cards.length / 1000 / 60 // Convert to minutes\n      : 1.5; // Default 1.5 minutes per card\n    \n    const estimatedDuration = Math.round(sessionCards.length * avgTimePerCard * 1.2); // Add 20% buffer\n    \n    return {\n      session_cards: sessionCards,\n      session_plan: {\n        new_cards: newCards,\n        review_cards: reviewCards,\n        reinforcement_cards: reinforcementCards,\n      },\n      estimated_duration: estimatedDuration,\n    };\n  }\n  \n  /**\n   * Update learning curve model with session data\n   */\n  updateLearningCurve(userId: string, sessionData: StudySessionResult): void {\n    if (!this.learningCurveModels.has(userId)) {\n      this.learningCurveModels.set(userId, LearningCurveAlgorithm.createInitialModel(userId));\n    }\n    \n    const currentModel = this.learningCurveModels.get(userId)!;\n    \n    // Convert session result to learning data point\n    const dataPoint: LearningDataPoint = {\n      timestamp: new Date(),\n      session_id: sessionData.session_id,\n      cards_studied: sessionData.session_stats.cards_new + sessionData.session_stats.cards_review,\n      cards_correct: Math.round(sessionData.session_stats.accuracy * (sessionData.session_stats.cards_new + sessionData.session_stats.cards_review)),\n      average_response_time: sessionData.session_stats.average_response_time,\n      session_duration_minutes: sessionData.session_stats.duration_minutes,\n      difficulty_level: this.calculateSessionDifficulty(sessionData),\n      context: {\n        time_of_day: this.getTimeOfDay(new Date()),\n        day_of_week: new Date().getDay(),\n        session_type: sessionData.session_stats.cards_new > sessionData.session_stats.cards_review ? 'new' : \n                     sessionData.session_stats.cards_review > 0 ? 'mixed' : 'review',\n      },\n    };\n    \n    // Update model (in a real implementation, this would accumulate multiple data points)\n    const updatedModel = LearningCurveAlgorithm.updateModel(currentModel, [dataPoint]);\n    this.learningCurveModels.set(userId, updatedModel);\n  }\n  \n  /**\n   * Get comprehensive performance analytics\n   */\n  getPerformanceAnalytics(\n    userId: string,\n    sessions: StudySessionResult[],\n    timePeriod: { start: Date; end: Date; type: 'weekly' | 'monthly' | 'custom' }\n  ): {\n    metrics: PerformanceMetrics;\n    insights: any; // Would be PerformanceInsights from the analytics algorithm\n    predictions: any; // Learning curve predictions\n  } {\n    // Convert session results to the format expected by analytics\n    const analyticsData = sessions.map(session => ({\n      date: new Date(session.session_id), // Assuming session_id contains timestamp\n      cards_studied: session.session_stats.cards_new + session.session_stats.cards_review,\n      cards_correct: Math.round(session.session_stats.accuracy * (session.session_stats.cards_new + session.session_stats.cards_review)),\n      average_response_time: session.session_stats.average_response_time,\n      session_duration: session.session_stats.duration_minutes,\n      difficulty_breakdown: this.parseDifficultyBreakdown(session.session_stats.difficulty_distribution),\n      category_breakdown: {}, // Would need to be populated from actual data\n    }));\n    \n    // Calculate performance metrics\n    const metrics = PerformanceAnalyticsAlgorithm.calculatePerformanceMetrics(\n      userId,\n      analyticsData,\n      {\n        start_date: timePeriod.start,\n        end_date: timePeriod.end,\n        period_type: timePeriod.type === 'weekly' ? 'weekly' : 'monthly',\n      }\n    );\n    \n    // Generate insights\n    const insights = PerformanceAnalyticsAlgorithm.generateInsights(metrics, [], []);\n    \n    // Get learning curve predictions\n    const learningModel = this.learningCurveModels.get(userId);\n    const predictions = learningModel \n      ? LearningCurveAlgorithm.generatePredictions(learningModel, [])\n      : null;\n    \n    return { metrics, insights, predictions };\n  }\n  \n  /**\n   * Get algorithm-specific recommendations\n   */\n  getRecommendations(\n    userId: string, \n    cards: UnifiedCard[], \n    recentSessions: StudySessionResult[]\n  ): {\n    algorithm_switch: { suggested: AlgorithmType; reason: string } | null;\n    session_optimization: {\n      optimal_session_length: number;\n      recommended_frequency: number;\n      best_time_slots: string[];\n    };\n    difficulty_adjustments: {\n      cards_to_simplify: string[];\n      cards_to_advance: string[];\n    };\n    focus_areas: string[];\n  } {\n    const performance = this.analyzeOverallPerformance(cards, recentSessions);\n    \n    // Determine if algorithm switch is beneficial\n    const algorithmSwitch = this.evaluateAlgorithmSwitch(performance, cards);\n    \n    // Get session optimization recommendations\n    const learningModel = this.learningCurveModels.get(userId);\n    const sessionOptimization = learningModel ? {\n      optimal_session_length: learningModel.optimal_session_length,\n      recommended_frequency: Math.ceil(7 / (learningModel.optimal_session_length / 20)), // Sessions per week\n      best_time_slots: [learningModel.peak_performance_time],\n    } : {\n      optimal_session_length: 20,\n      recommended_frequency: 5,\n      best_time_slots: ['14:00'],\n    };\n    \n    // Identify cards needing difficulty adjustment\n    const difficultyAdjustments = this.identifyDifficultyAdjustments(cards);\n    \n    // Identify focus areas\n    const focusAreas = this.identifyFocusAreas(performance, cards);\n    \n    return {\n      algorithm_switch: algorithmSwitch,\n      session_optimization: sessionOptimization,\n      difficulty_adjustments: difficultyAdjustments,\n      focus_areas: focusAreas,\n    };\n  }\n  \n  /**\n   * Private helper methods\n   */\n  private calculateAdaptiveNextReview(card: AdaptiveDifficultyCard): Date {\n    const baseInterval = Math.max(1, card.learning_velocity * 7); // Days\n    const adjustedInterval = baseInterval * card.adaptation_factor;\n    \n    const nextReview = new Date();\n    nextReview.setDate(nextReview.getDate() + Math.round(adjustedInterval));\n    \n    return nextReview;\n  }\n  \n  private calculateMasteryLevel(card: UnifiedCard): MasteryLevel {\n    if (card.total_reviews === 0) return 'new';\n    \n    const accuracy = card.correct_reviews / card.total_reviews;\n    const interval = card.next_review_date.getTime() - Date.now();\n    const dayInterval = interval / (1000 * 60 * 60 * 24);\n    \n    if (card.total_reviews < 3) return 'learning';\n    if (dayInterval < 7 || accuracy < 0.8) return 'young';\n    if (dayInterval < 30 || accuracy < 0.9) return 'mature';\n    return 'mastered';\n  }\n  \n  private optimizeCardOrder(cards: UnifiedCard[], config: StudySessionConfig): UnifiedCard[] {\n    // Implement interleaving and spacing for optimal learning\n    const newCards = cards.filter(c => c.total_reviews === 0);\n    const reviewCards = cards.filter(c => c.total_reviews > 0);\n    \n    // Interleave new and review cards\n    const optimized: UnifiedCard[] = [];\n    const maxLength = Math.max(newCards.length, reviewCards.length);\n    \n    for (let i = 0; i < maxLength; i++) {\n      if (i < reviewCards.length) optimized.push(reviewCards[i]);\n      if (i < newCards.length) optimized.push(newCards[i]);\n    }\n    \n    return optimized;\n  }\n  \n  private calculateSessionDifficulty(sessionData: StudySessionResult): number {\n    // Calculate weighted difficulty based on card distribution\n    const dist = sessionData.session_stats.difficulty_distribution;\n    return (dist.easy || 0) * 2 + (dist.medium || 0) * 3 + (dist.hard || 0) * 4;\n  }\n  \n  private getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {\n    const hour = date.getHours();\n    if (hour < 6) return 'night';\n    if (hour < 12) return 'morning';\n    if (hour < 18) return 'afternoon';\n    if (hour < 22) return 'evening';\n    return 'night';\n  }\n  \n  private parseDifficultyBreakdown(distribution: Record<string, number>): Record<string, { studied: number; correct: number }> {\n    // This would need actual implementation based on your data structure\n    return {};\n  }\n  \n  private analyzeOverallPerformance(cards: UnifiedCard[], sessions: StudySessionResult[]) {\n    const totalCards = cards.length;\n    const totalCorrect = cards.reduce((sum, c) => sum + c.correct_reviews, 0);\n    const totalReviews = cards.reduce((sum, c) => sum + c.total_reviews, 0);\n    \n    return {\n      overall_accuracy: totalReviews > 0 ? totalCorrect / totalReviews : 0,\n      cards_mastered: cards.filter(c => c.mastery_level === 'mastered').length,\n      average_response_time: cards.length > 0 \n        ? cards.reduce((sum, c) => sum + c.average_response_time, 0) / cards.length \n        : 0,\n      consistency: this.calculateConsistency(sessions),\n    };\n  }\n  \n  private evaluateAlgorithmSwitch(\n    performance: any, \n    cards: UnifiedCard[]\n  ): { suggested: AlgorithmType; reason: string } | null {\n    const currentAlgorithms = new Set(cards.map(c => c.algorithm_type));\n    \n    // Simple heuristics for algorithm recommendations\n    if (performance.overall_accuracy < 0.6 && !currentAlgorithms.has('leitner')) {\n      return {\n        suggested: 'leitner',\n        reason: 'Leitner system may help with retention issues by providing more structured repetition'\n      };\n    }\n    \n    if (performance.consistency < 0.5 && !currentAlgorithms.has('adaptive')) {\n      return {\n        suggested: 'adaptive',\n        reason: 'Adaptive algorithm can better accommodate inconsistent study patterns'\n      };\n    }\n    \n    return null;\n  }\n  \n  private identifyDifficultyAdjustments(cards: UnifiedCard[]): {\n    cards_to_simplify: string[];\n    cards_to_advance: string[];\n  } {\n    const toSimplify = cards\n      .filter(c => c.total_reviews >= 3 && c.correct_reviews / c.total_reviews < 0.6)\n      .map(c => c.phrase_id);\n    \n    const toAdvance = cards\n      .filter(c => c.total_reviews >= 5 && c.correct_reviews / c.total_reviews > 0.9 && c.streak_correct >= 3)\n      .map(c => c.phrase_id);\n    \n    return {\n      cards_to_simplify: toSimplify.slice(0, 10), // Limit to top 10\n      cards_to_advance: toAdvance.slice(0, 10),\n    };\n  }\n  \n  private identifyFocusAreas(performance: any, cards: UnifiedCard[]): string[] {\n    const focusAreas: string[] = [];\n    \n    if (performance.overall_accuracy < 0.7) {\n      focusAreas.push('accuracy_improvement');\n    }\n    \n    if (performance.average_response_time > 8000) {\n      focusAreas.push('response_speed');\n    }\n    \n    const strugglingCards = cards.filter(c => c.streak_incorrect >= 2).length;\n    if (strugglingCards > cards.length * 0.2) {\n      focusAreas.push('difficult_content');\n    }\n    \n    const newCards = cards.filter(c => c.total_reviews === 0).length;\n    if (newCards > cards.length * 0.5) {\n      focusAreas.push('new_material');\n    }\n    \n    return focusAreas;\n  }\n  \n  private calculateConsistency(sessions: StudySessionResult[]): number {\n    if (sessions.length < 7) return 0;\n    \n    // Calculate how regularly the user studies (simplified)\n    const sessionDates = sessions.map(s => new Date(s.session_id).toDateString());\n    const uniqueDates = new Set(sessionDates);\n    \n    const daySpan = 7; // Look at last week\n    return uniqueDates.size / daySpan;\n  }\n}\n\n/**\n * Export singleton instance\n */\nexport const algorithmInterface = LearningAlgorithmInterface.getInstance();