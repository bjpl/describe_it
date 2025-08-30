/**
 * Adaptive Difficulty Adjustment System
 * Dynamically adjusts learning parameters based on user performance
 */

export interface AdaptiveDifficultyCard {
  phrase_id: string;
  user_id: string;
  base_difficulty: number; // 1-5 inherent difficulty
  user_difficulty: number; // 1-5 difficulty for this user
  performance_history: PerformancePoint[];
  adaptation_factor: number; // multiplier for interval adjustments
  learning_velocity: number; // how fast user learns this card
  interference_score: number; // how much this card interferes with others
  last_adaptation: Date;
  stability_score: number; // how stable the user's performance is
}

export interface PerformancePoint {
  timestamp: Date;
  quality: number; // 0-5
  response_time_ms: number;
  confidence_level: number; // 1-5
  attempt_count: number;
  context_factors: string[]; // time_of_day, session_length, etc.
}

export interface AdaptationMetrics {
  difficulty_trend: 'easier' | 'stable' | 'harder';
  confidence_trend: 'increasing' | 'stable' | 'decreasing';
  time_trend: 'faster' | 'stable' | 'slower';
  recommended_action: 'advance' | 'maintain' | 'reinforce' | 'simplify';
}

/**
 * Adaptive Difficulty Algorithm
 * Uses machine learning principles to adapt to individual learning patterns
 */
export class AdaptiveDifficultyAlgorithm {
  private static readonly HISTORY_WINDOW = 10; // Consider last N reviews
  private static readonly ADAPTATION_THRESHOLD = 0.3; // Minimum change to trigger adaptation
  private static readonly STABILITY_WINDOW = 5; // Reviews to consider for stability

  /**
   * Create new adaptive difficulty card
   */
  static createCard(phraseId: string, userId: string, baseDifficulty: number): AdaptiveDifficultyCard {
    return {
      phrase_id: phraseId,
      user_id: userId,
      base_difficulty: Math.max(1, Math.min(5, baseDifficulty)),
      user_difficulty: baseDifficulty, // Start with base difficulty
      performance_history: [],
      adaptation_factor: 1.0,
      learning_velocity: 0.5, // Neutral starting point
      interference_score: 0.0,
      last_adaptation: new Date(),
      stability_score: 0.0,
    };
  }

  /**
   * Process performance and adapt difficulty
   */
  static adaptDifficulty(
    card: AdaptiveDifficultyCard, 
    performance: PerformancePoint
  ): AdaptiveDifficultyCard {
    const updatedCard = { ...card };
    
    // Add performance to history
    updatedCard.performance_history = [
      performance,
      ...card.performance_history.slice(0, this.HISTORY_WINDOW - 1)
    ];

    // Calculate adaptation metrics
    const metrics = this.calculateAdaptationMetrics(updatedCard.performance_history);
    
    // Adapt user difficulty based on performance
    const difficultyChange = this.calculateDifficultyAdjustment(metrics, performance);
    updatedCard.user_difficulty = Math.max(1, Math.min(5, 
      card.user_difficulty + difficultyChange
    ));

    // Update adaptation factor for interval calculations
    updatedCard.adaptation_factor = this.calculateAdaptationFactor(metrics);
    
    // Calculate learning velocity
    updatedCard.learning_velocity = this.calculateLearningVelocity(
      updatedCard.performance_history
    );

    // Calculate stability score
    updatedCard.stability_score = this.calculateStabilityScore(
      updatedCard.performance_history
    );

    // Update interference score (how this card affects others)
    updatedCard.interference_score = this.calculateInterferenceScore(
      performance, card.base_difficulty
    );

    updatedCard.last_adaptation = new Date();

    return updatedCard;
  }

  /**
   * Calculate adaptation metrics from performance history
   */
  private static calculateAdaptationMetrics(history: PerformancePoint[]): AdaptationMetrics {
    if (history.length < 2) {
      return {
        difficulty_trend: 'stable',
        confidence_trend: 'stable',
        time_trend: 'stable',
        recommended_action: 'maintain',
      };
    }

    const recent = history.slice(0, Math.min(5, history.length));
    const older = history.slice(5, Math.min(10, history.length));

    // Calculate trends
    const recentAvgQuality = recent.reduce((sum, p) => sum + p.quality, 0) / recent.length;
    const olderAvgQuality = older.length > 0 
      ? older.reduce((sum, p) => sum + p.quality, 0) / older.length 
      : recentAvgQuality;

    const recentAvgConfidence = recent.reduce((sum, p) => sum + p.confidence_level, 0) / recent.length;
    const olderAvgConfidence = older.length > 0
      ? older.reduce((sum, p) => sum + p.confidence_level, 0) / older.length
      : recentAvgConfidence;

    const recentAvgTime = recent.reduce((sum, p) => sum + p.response_time_ms, 0) / recent.length;
    const olderAvgTime = older.length > 0
      ? older.reduce((sum, p) => sum + p.response_time_ms, 0) / older.length
      : recentAvgTime;

    // Determine trends
    const qualityDiff = recentAvgQuality - olderAvgQuality;
    const confidenceDiff = recentAvgConfidence - olderAvgConfidence;
    const timeDiff = recentAvgTime - olderAvgTime;

    const difficulty_trend = Math.abs(qualityDiff) > 0.5 
      ? (qualityDiff > 0 ? 'easier' : 'harder') 
      : 'stable';

    const confidence_trend = Math.abs(confidenceDiff) > 0.3
      ? (confidenceDiff > 0 ? 'increasing' : 'decreasing')
      : 'stable';

    const time_trend = Math.abs(timeDiff) > 1000 // 1 second difference
      ? (timeDiff < 0 ? 'faster' : 'slower')
      : 'stable';

    // Determine recommended action
    let recommended_action: AdaptationMetrics['recommended_action'] = 'maintain';
    
    if (recentAvgQuality >= 4 && confidence_trend === 'increasing' && time_trend !== 'slower') {
      recommended_action = 'advance';
    } else if (recentAvgQuality < 3 || confidence_trend === 'decreasing') {
      recommended_action = 'reinforce';
    } else if (recentAvgQuality < 2) {
      recommended_action = 'simplify';
    }

    return {
      difficulty_trend,
      confidence_trend,
      time_trend,
      recommended_action,
    };
  }

  /**
   * Calculate difficulty adjustment based on performance
   */
  private static calculateDifficultyAdjustment(
    metrics: AdaptationMetrics, 
    performance: PerformancePoint
  ): number {
    let adjustment = 0;

    // Base adjustment on quality and confidence
    if (performance.quality >= 4 && performance.confidence_level >= 4) {
      adjustment -= 0.1; // Make slightly easier (user is doing well)
    } else if (performance.quality <= 2 || performance.confidence_level <= 2) {
      adjustment += 0.2; // Make harder classification (user is struggling)
    }

    // Adjust based on response time
    if (performance.response_time_ms > 10000) { // 10+ seconds
      adjustment += 0.1;
    } else if (performance.response_time_ms < 2000) { // < 2 seconds
      adjustment -= 0.05;
    }

    // Apply trend-based adjustments
    switch (metrics.recommended_action) {
      case 'advance':
        adjustment -= 0.15;
        break;
      case 'reinforce':
        adjustment += 0.1;
        break;
      case 'simplify':
        adjustment += 0.25;
        break;
    }

    return Math.max(-0.5, Math.min(0.5, adjustment)); // Limit adjustment range
  }

  /**
   * Calculate adaptation factor for interval adjustments
   */
  private static calculateAdaptationFactor(metrics: AdaptationMetrics): number {
    let factor = 1.0;

    switch (metrics.recommended_action) {
      case 'advance':
        factor = 1.3; // Increase intervals
        break;
      case 'reinforce':
        factor = 0.7; // Decrease intervals
        break;
      case 'simplify':
        factor = 0.5; // Significantly decrease intervals
        break;
      default:
        factor = 1.0;
    }

    // Adjust for confidence trend
    if (metrics.confidence_trend === 'increasing') {
      factor *= 1.1;
    } else if (metrics.confidence_trend === 'decreasing') {
      factor *= 0.9;
    }

    return Math.max(0.3, Math.min(2.0, factor)); // Reasonable bounds
  }

  /**
   * Calculate learning velocity
   */
  private static calculateLearningVelocity(history: PerformancePoint[]): number {
    if (history.length < 3) return 0.5; // Neutral

    // Look at quality improvement over time
    const recent = history.slice(0, 3);
    const older = history.slice(-3);

    const recentAvg = recent.reduce((sum, p) => sum + p.quality, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.quality, 0) / older.length;

    const improvement = recentAvg - olderAvg;
    
    // Convert to 0-1 scale where 0.5 is neutral
    return Math.max(0, Math.min(1, 0.5 + (improvement * 0.1)));
  }

  /**
   * Calculate stability score
   */
  private static calculateStabilityScore(history: PerformancePoint[]): number {
    if (history.length < this.STABILITY_WINDOW) return 0;

    const recentHistory = history.slice(0, this.STABILITY_WINDOW);
    const qualities = recentHistory.map(p => p.quality);
    
    // Calculate coefficient of variation (lower = more stable)
    const mean = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
    const variance = qualities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / qualities.length;
    const stdDev = Math.sqrt(variance);
    
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
    
    // Convert to stability score (0-1, higher = more stable)
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  /**
   * Calculate interference score
   */
  private static calculateInterferenceScore(
    performance: PerformancePoint, 
    baseDifficulty: number
  ): number {
    // Simple heuristic: harder cards that take longer create more interference
    const timeWeight = Math.min(1, performance.response_time_ms / 10000); // Normalize to 10s
    const difficultyWeight = baseDifficulty / 5;
    const qualityWeight = 1 - (performance.quality / 5); // Lower quality = more interference
    
    return (timeWeight + difficultyWeight + qualityWeight) / 3;
  }

  /**
   * Get personalized study recommendations
   */
  static getPersonalizedRecommendations(
    cards: AdaptiveDifficultyCard[]
  ): {
    optimal_session_length: number;
    recommended_card_order: string[];
    difficulty_distribution: { easy: number; medium: number; hard: number };
    break_recommendations: string[];
  } {
    if (cards.length === 0) {
      return {
        optimal_session_length: 15,
        recommended_card_order: [],
        difficulty_distribution: { easy: 0, medium: 0, hard: 0 },
        break_recommendations: [],
      };
    }

    // Calculate average learning velocity and stability
    const avgVelocity = cards.reduce((sum, c) => sum + c.learning_velocity, 0) / cards.length;
    const avgStability = cards.reduce((sum, c) => sum + c.stability_score, 0) / cards.length;

    // Determine optimal session length
    let sessionLength = 20; // Base minutes
    if (avgVelocity > 0.7) sessionLength += 10; // User learning fast
    if (avgStability < 0.3) sessionLength -= 5; // User inconsistent
    sessionLength = Math.max(10, Math.min(45, sessionLength));

    // Order cards by priority (struggling cards first, then by interference)
    const orderedCards = cards
      .sort((a, b) => {
        const aStruggling = a.user_difficulty > a.base_difficulty ? 1 : 0;
        const bStruggling = b.user_difficulty > b.base_difficulty ? 1 : 0;
        
        if (aStruggling !== bStruggling) {
          return bStruggling - aStruggling; // Struggling cards first
        }
        
        return b.interference_score - a.interference_score; // High interference first
      })
      .map(c => c.phrase_id);

    // Calculate difficulty distribution
    const totalCards = cards.length;
    const difficultyDistribution = {
      easy: Math.round((cards.filter(c => c.user_difficulty <= 2).length / totalCards) * 100),
      medium: Math.round((cards.filter(c => c.user_difficulty > 2 && c.user_difficulty <= 3.5).length / totalCards) * 100),
      hard: Math.round((cards.filter(c => c.user_difficulty > 3.5).length / totalCards) * 100),
    };

    // Generate break recommendations
    const breakRecommendations: string[] = [];
    if (avgStability < 0.4) {
      breakRecommendations.push('Take frequent short breaks to maintain focus');
    }
    if (avgVelocity < 0.3) {
      breakRecommendations.push('Consider reviewing fundamentals before new material');
    }
    if (cards.some(c => c.interference_score > 0.7)) {
      breakRecommendations.push('Space out similar or confusing concepts');
    }

    return {
      optimal_session_length: sessionLength,
      recommended_card_order: orderedCards,
      difficulty_distribution: difficultyDistribution,
      break_recommendations: breakRecommendations,
    };
  }
}