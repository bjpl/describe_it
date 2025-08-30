/**
 * Performance Analytics Algorithms
 * Advanced analytics for learning performance tracking and optimization
 */

export interface PerformanceMetrics {
  user_id: string;
  time_period: {
    start_date: Date;
    end_date: Date;
    period_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  };
  accuracy_metrics: {
    overall_accuracy: number;
    accuracy_trend: number; // Change over time
    accuracy_by_difficulty: Record<string, number>;
    accuracy_by_category: Record<string, number>;
    accuracy_consistency: number; // 0-1, higher = more consistent
  };
  speed_metrics: {
    average_response_time: number; // milliseconds
    response_time_trend: number; // Change over time
    speed_accuracy_correlation: number; // -1 to 1
    optimal_response_time: number; // Sweet spot for accuracy
  };
  learning_metrics: {
    cards_learned: number;
    cards_mastered: number;
    learning_velocity: number; // Cards per day
    retention_strength: number; // 0-1
    forgetting_rate: number; // How fast user forgets
  };
  engagement_metrics: {
    total_study_time: number; // minutes
    average_session_length: number; // minutes
    session_frequency: number; // sessions per week
    streak_days: number;
    consistency_score: number; // 0-1
  };
  efficiency_metrics: {
    time_per_card: number; // minutes
    effort_to_mastery_ratio: number; // Lower is better
    optimal_difficulty_distribution: Record<string, number>;
    learning_efficiency_score: number; // 0-100
  };
}

export interface PerformanceInsights {
  strengths: string[];
  weaknesses: string[];
  recommendations: {
    immediate: string[];
    short_term: string[];
    long_term: string[];
  };
  goal_tracking: {
    current_goals: Goal[];
    achievement_probability: Record<string, number>;
    suggested_adjustments: Record<string, string>;
  };
  comparative_analysis: {
    percentile_ranking: number; // vs other users
    similar_learner_comparison: {
      faster_learners: ComparisonPoint[];
      similar_pace: ComparisonPoint[];
    };
  };
}

export interface Goal {
  id: string;
  type: 'accuracy' | 'speed' | 'volume' | 'consistency' | 'mastery';
  target_value: number;
  current_value: number;
  deadline: Date;
  progress_percentage: number;
  is_on_track: boolean;
}

export interface ComparisonPoint {
  metric: string;
  user_value: number;
  comparison_value: number;
  difference_percentage: number;
}

export interface LearningEfficiencyAnalysis {
  time_allocation: {
    new_cards: number; // percentage
    review_cards: number; // percentage
    reinforcement: number; // percentage
    optimal_distribution: Record<string, number>;
  };
  difficulty_progression: {
    current_distribution: Record<string, number>;
    optimal_distribution: Record<string, number>;
    progression_speed: 'too_fast' | 'optimal' | 'too_slow';
  };
  session_optimization: {
    ideal_session_count: number; // per week
    ideal_session_length: number; // minutes
    best_time_slots: string[];
    break_patterns: string[];
  };
}

/**
 * Performance Analytics Algorithm
 * Provides comprehensive learning analytics and optimization insights
 */
export class PerformanceAnalyticsAlgorithm {
  private static readonly PERCENTILE_BUCKETS = [10, 25, 50, 75, 90, 95, 99];
  private static readonly MIN_SESSIONS_FOR_TRENDS = 5;
  private static readonly CONSISTENCY_WINDOW_DAYS = 14;

  /**
   * Calculate comprehensive performance metrics
   */
  static calculatePerformanceMetrics(
    userId: string,
    sessions: Array<{
      date: Date;
      cards_studied: number;
      cards_correct: number;
      average_response_time: number;
      session_duration: number;
      difficulty_breakdown: Record<string, { studied: number; correct: number }>;
      category_breakdown: Record<string, { studied: number; correct: number }>;
    }>,
    timePeriod: PerformanceMetrics['time_period']
  ): PerformanceMetrics {
    if (sessions.length === 0) {
      return this.getEmptyMetrics(userId, timePeriod);
    }

    // Filter sessions to time period
    const filteredSessions = sessions.filter(s => 
      s.date >= timePeriod.start_date && s.date <= timePeriod.end_date
    );

    return {
      user_id: userId,
      time_period: timePeriod,
      accuracy_metrics: this.calculateAccuracyMetrics(filteredSessions),
      speed_metrics: this.calculateSpeedMetrics(filteredSessions),
      learning_metrics: this.calculateLearningMetrics(filteredSessions),
      engagement_metrics: this.calculateEngagementMetrics(filteredSessions),
      efficiency_metrics: this.calculateEfficiencyMetrics(filteredSessions),
    };
  }

  /**
   * Generate performance insights and recommendations
   */
  static generateInsights(
    metrics: PerformanceMetrics,
    historicalMetrics: PerformanceMetrics[],
    userGoals: Goal[] = []
  ): PerformanceInsights {
    const strengths = this.identifyStrengths(metrics, historicalMetrics);
    const weaknesses = this.identifyWeaknesses(metrics, historicalMetrics);
    const recommendations = this.generateRecommendations(metrics, weaknesses);
    const goalTracking = this.analyzeGoalProgress(metrics, userGoals);
    const comparativeAnalysis = this.generateComparativeAnalysis(metrics);

    return {
      strengths,
      weaknesses,
      recommendations,
      goal_tracking: goalTracking,
      comparative_analysis: comparativeAnalysis,
    };
  }

  /**
   * Analyze learning efficiency and optimization opportunities
   */
  static analyzeLearningEfficiency(
    metrics: PerformanceMetrics,
    cardData: Array<{
      type: 'new' | 'review' | 'reinforcement';
      difficulty: string;
      time_spent: number;
      success: boolean;
    }>
  ): LearningEfficiencyAnalysis {
    // Calculate current time allocation
    const totalTime = cardData.reduce((sum, card) => sum + card.time_spent, 0);
    const timeAllocation = {
      new_cards: (cardData.filter(c => c.type === 'new').reduce((sum, c) => sum + c.time_spent, 0) / totalTime) * 100,
      review_cards: (cardData.filter(c => c.type === 'review').reduce((sum, c) => sum + c.time_spent, 0) / totalTime) * 100,
      reinforcement: (cardData.filter(c => c.type === 'reinforcement').reduce((sum, c) => sum + c.time_spent, 0) / totalTime) * 100,
      optimal_distribution: {
        new_cards: 40, // Research-based optimal distribution
        review_cards: 45,
        reinforcement: 15,
      },
    };

    // Analyze difficulty progression
    const difficultyDistribution = this.calculateDifficultyDistribution(cardData);
    const progressionSpeed = this.assessProgressionSpeed(metrics, difficultyDistribution);

    // Generate session optimization recommendations
    const sessionOptimization = this.optimizeSessionStructure(metrics, cardData);

    return {
      time_allocation: timeAllocation,
      difficulty_progression: {
        current_distribution: difficultyDistribution,
        optimal_distribution: {
          beginner: 30,
          intermediate: 40,
          advanced: 20,
          expert: 10,
        },
        progression_speed: progressionSpeed,
      },
      session_optimization: sessionOptimization,
    };
  }

  /**
   * Private helper methods
   */
  private static calculateAccuracyMetrics(sessions: any[]): PerformanceMetrics['accuracy_metrics'] {
    const totalStudied = sessions.reduce((sum, s) => sum + s.cards_studied, 0);
    const totalCorrect = sessions.reduce((sum, s) => sum + s.cards_correct, 0);
    
    const overallAccuracy = totalStudied > 0 ? totalCorrect / totalStudied : 0;
    
    // Calculate trend (accuracy change over time)
    const accuracyTrend = this.calculateTrend(sessions.map(s => s.cards_correct / s.cards_studied));
    
    // Accuracy by difficulty
    const accuracyByDifficulty: Record<string, number> = {};
    sessions.forEach(s => {
      Object.entries(s.difficulty_breakdown || {}).forEach(([diff, data]: [string, any]) => {
        if (!accuracyByDifficulty[diff]) accuracyByDifficulty[diff] = 0;
        accuracyByDifficulty[diff] += data.correct / data.studied;
      });
    });
    
    // Average the accuracy by difficulty
    Object.keys(accuracyByDifficulty).forEach(key => {
      accuracyByDifficulty[key] /= sessions.length;
    });

    // Similar for category
    const accuracyByCategory: Record<string, number> = {};
    sessions.forEach(s => {
      Object.entries(s.category_breakdown || {}).forEach(([cat, data]: [string, any]) => {
        if (!accuracyByCategory[cat]) accuracyByCategory[cat] = 0;
        accuracyByCategory[cat] += data.correct / data.studied;
      });
    });
    
    Object.keys(accuracyByCategory).forEach(key => {
      accuracyByCategory[key] /= sessions.length;
    });

    // Consistency (lower standard deviation = higher consistency)
    const accuracies = sessions.map(s => s.cards_correct / s.cards_studied);
    const accuracyConsistency = 1 - this.calculateStandardDeviation(accuracies);

    return {
      overall_accuracy: overallAccuracy,
      accuracy_trend: accuracyTrend,
      accuracy_by_difficulty: accuracyByDifficulty,
      accuracy_by_category: accuracyByCategory,
      accuracy_consistency: Math.max(0, accuracyConsistency),
    };
  }

  private static calculateSpeedMetrics(sessions: any[]): PerformanceMetrics['speed_metrics'] {
    const responseTimes = sessions.map(s => s.average_response_time).filter(t => t > 0);
    
    if (responseTimes.length === 0) {
      return {
        average_response_time: 0,
        response_time_trend: 0,
        speed_accuracy_correlation: 0,
        optimal_response_time: 3000,
      };
    }

    const averageResponseTime = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
    const responseTimeTrend = this.calculateTrend(responseTimes);
    
    // Calculate correlation between speed and accuracy
    const accuracies = sessions.map(s => s.cards_correct / s.cards_studied);
    const speedAccuracyCorrelation = this.calculateCorrelation(responseTimes, accuracies);
    
    // Find optimal response time (where accuracy is highest)
    const optimalResponseTime = this.findOptimalResponseTime(sessions);

    return {
      average_response_time: averageResponseTime,
      response_time_trend: responseTimeTrend,
      speed_accuracy_correlation: speedAccuracyCorrelation,
      optimal_response_time: optimalResponseTime,
    };
  }

  private static calculateLearningMetrics(sessions: any[]): PerformanceMetrics['learning_metrics'] {
    const totalCardsStudied = sessions.reduce((sum, s) => sum + s.cards_studied, 0);
    const totalCardsCorrect = sessions.reduce((sum, s) => sum + s.cards_correct, 0);
    
    // Estimate cards learned (simplified)
    const cardsLearned = Math.round(totalCardsCorrect * 0.8); // 80% correct = learned
    const cardsMastered = Math.round(totalCardsCorrect * 0.6); // 60% of correct = mastered
    
    // Learning velocity (cards per day)
    const daySpan = this.getDaySpan(sessions);
    const learningVelocity = daySpan > 0 ? cardsLearned / daySpan : 0;
    
    // Retention strength (based on review performance)
    const retentionStrength = totalCardsStudied > 0 ? totalCardsCorrect / totalCardsStudied : 0;
    
    // Forgetting rate (simplified calculation)
    const forgettingRate = Math.max(0, 1 - retentionStrength);

    return {
      cards_learned: cardsLearned,
      cards_mastered: cardsMastered,
      learning_velocity: learningVelocity,
      retention_strength: retentionStrength,
      forgetting_rate: forgettingRate,
    };
  }

  private static calculateEngagementMetrics(sessions: any[]): PerformanceMetrics['engagement_metrics'] {
    const totalStudyTime = sessions.reduce((sum, s) => sum + s.session_duration, 0);
    const averageSessionLength = sessions.length > 0 ? totalStudyTime / sessions.length : 0;
    
    // Calculate session frequency
    const daySpan = this.getDaySpan(sessions);
    const sessionFrequency = daySpan > 0 ? (sessions.length / daySpan) * 7 : 0; // Per week
    
    // Calculate streak (simplified)
    const streakDays = this.calculateStreakDays(sessions);
    
    // Consistency score based on regular study pattern
    const consistencyScore = this.calculateConsistencyScore(sessions);

    return {
      total_study_time: totalStudyTime,
      average_session_length: averageSessionLength,
      session_frequency: sessionFrequency,
      streak_days: streakDays,
      consistency_score: consistencyScore,
    };
  }

  private static calculateEfficiencyMetrics(sessions: any[]): PerformanceMetrics['efficiency_metrics'] {
    const totalStudyTime = sessions.reduce((sum, s) => sum + s.session_duration, 0);
    const totalCards = sessions.reduce((sum, s) => sum + s.cards_studied, 0);
    
    const timePerCard = totalCards > 0 ? totalStudyTime / totalCards : 0;
    
    // Effort to mastery ratio (lower is better)
    const totalCorrect = sessions.reduce((sum, s) => sum + s.cards_correct, 0);
    const effortToMasteryRatio = totalCorrect > 0 ? totalStudyTime / totalCorrect : 1;
    
    // Optimal difficulty distribution (based on performance)
    const optimalDifficultyDistribution = this.calculateOptimalDifficultyDistribution(sessions);
    
    // Learning efficiency score (0-100)
    const learningEfficiencyScore = this.calculateLearningEfficiencyScore(sessions);

    return {
      time_per_card: timePerCard,
      effort_to_mastery_ratio: effortToMasteryRatio,
      optimal_difficulty_distribution: optimalDifficultyDistribution,
      learning_efficiency_score: learningEfficiencyScore,
    };
  }

  private static getEmptyMetrics(userId: string, timePeriod: PerformanceMetrics['time_period']): PerformanceMetrics {
    return {
      user_id: userId,
      time_period: timePeriod,
      accuracy_metrics: {
        overall_accuracy: 0,
        accuracy_trend: 0,
        accuracy_by_difficulty: {},
        accuracy_by_category: {},
        accuracy_consistency: 0,
      },
      speed_metrics: {
        average_response_time: 0,
        response_time_trend: 0,
        speed_accuracy_correlation: 0,
        optimal_response_time: 3000,
      },
      learning_metrics: {
        cards_learned: 0,
        cards_mastered: 0,
        learning_velocity: 0,
        retention_strength: 0,
        forgetting_rate: 0,
      },
      engagement_metrics: {
        total_study_time: 0,
        average_session_length: 0,
        session_frequency: 0,
        streak_days: 0,
        consistency_score: 0,
      },
      efficiency_metrics: {
        time_per_card: 0,
        effort_to_mastery_ratio: 1,
        optimal_difficulty_distribution: {},
        learning_efficiency_score: 0,
      },
    };
  }

  private static calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Simple linear regression slope
    const n = values.length;
    const sumX = n * (n - 1) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (val * i), 0);
    const sumXX = n * (n - 1) * (2 * n - 1) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private static calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  private static calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;
    
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private static getDaySpan(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    
    const dates = sessions.map(s => s.date.getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    
    return Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));
  }

  private static findOptimalResponseTime(sessions: any[]): number {
    // Group sessions by response time ranges and find best accuracy
    const timeRanges = new Map<number, { accuracy: number; count: number }>();
    
    sessions.forEach(session => {
      const timeRange = Math.floor(session.average_response_time / 1000) * 1000; // 1-second buckets
      const accuracy = session.cards_correct / session.cards_studied;
      
      if (!timeRanges.has(timeRange)) {
        timeRanges.set(timeRange, { accuracy: 0, count: 0 });
      }
      
      const existing = timeRanges.get(timeRange)!;
      existing.accuracy = (existing.accuracy * existing.count + accuracy) / (existing.count + 1);
      existing.count++;
    });
    
    // Find time range with highest accuracy (minimum 2 sessions)
    let optimalTime = 3000; // Default 3 seconds
    let bestAccuracy = 0;
    
    timeRanges.forEach((data, time) => {
      if (data.count >= 2 && data.accuracy > bestAccuracy) {
        bestAccuracy = data.accuracy;
        optimalTime = time;
      }
    });
    
    return optimalTime;
  }

  private static calculateStreakDays(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    
    const sortedDates = sessions
      .map(s => s.date.toDateString())
      .filter((date, index, arr) => arr.indexOf(date) === index) // Unique dates
      .sort();
    
    let currentStreak = 1;
    let maxStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i]);
      const prevDate = new Date(sortedDates[i - 1]);
      const dayDiff = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return maxStreak;
  }

  private static calculateConsistencyScore(sessions: any[]): number {
    if (sessions.length < 7) return 0; // Need at least a week of data
    
    // Calculate how regularly the user studies
    const studyDays = new Set(sessions.map(s => s.date.toDateString())).size;
    const totalDays = this.getDaySpan(sessions);
    const studyFrequency = studyDays / totalDays;
    
    // Calculate session length consistency
    const sessionLengths = sessions.map(s => s.session_duration);
    const avgLength = sessionLengths.reduce((sum, l) => sum + l, 0) / sessionLengths.length;
    const lengthVariability = this.calculateStandardDeviation(sessionLengths) / avgLength;
    
    // Combine frequency and length consistency
    const frequencyScore = Math.min(1, studyFrequency * 1.5); // Bonus for high frequency
    const lengthScore = Math.max(0, 1 - lengthVariability); // Lower variability = better
    
    return (frequencyScore + lengthScore) / 2;
  }

  private static calculateOptimalDifficultyDistribution(sessions: any[]): Record<string, number> {
    // Analyze performance by difficulty to suggest optimal distribution
    const difficultyPerformance = new Map<string, { accuracy: number; efficiency: number }>();
    
    sessions.forEach(session => {
      Object.entries(session.difficulty_breakdown || {}).forEach(([diff, data]: [string, any]) => {
        if (!difficultyPerformance.has(diff)) {
          difficultyPerformance.set(diff, { accuracy: 0, efficiency: 0 });
        }
        
        const accuracy = data.correct / data.studied;
        const efficiency = data.studied / session.session_duration; // Cards per minute
        
        const existing = difficultyPerformance.get(diff)!;
        existing.accuracy = (existing.accuracy + accuracy) / 2;
        existing.efficiency = (existing.efficiency + efficiency) / 2;
      });
    });
    
    // Convert to optimal distribution percentages
    const optimal: Record<string, number> = {};
    const total = Array.from(difficultyPerformance.values())
      .reduce((sum, perf) => sum + perf.accuracy * perf.efficiency, 0);
    
    difficultyPerformance.forEach((perf, diff) => {
      optimal[diff] = total > 0 ? (perf.accuracy * perf.efficiency / total) * 100 : 25;
    });
    
    return optimal;
  }

  private static calculateLearningEfficiencyScore(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    
    const totalStudied = sessions.reduce((sum, s) => sum + s.cards_studied, 0);
    const totalCorrect = sessions.reduce((sum, s) => sum + s.cards_correct, 0);
    const totalTime = sessions.reduce((sum, s) => sum + s.session_duration, 0);
    
    // Base score on accuracy and speed
    const accuracy = totalStudied > 0 ? totalCorrect / totalStudied : 0;
    const speed = totalTime > 0 ? totalStudied / (totalTime / 60) : 0; // Cards per minute
    
    // Normalize and combine (accuracy is more important)
    const accuracyScore = accuracy * 70;
    const speedScore = Math.min(30, speed * 10); // Cap speed contribution
    
    return Math.round(accuracyScore + speedScore);
  }

  private static identifyStrengths(
    metrics: PerformanceMetrics, 
    historicalMetrics: PerformanceMetrics[]
  ): string[] {
    const strengths = [];
    
    if (metrics.accuracy_metrics.overall_accuracy > 0.8) {
      strengths.push('High overall accuracy');
    }
    
    if (metrics.engagement_metrics.consistency_score > 0.7) {
      strengths.push('Consistent study habits');
    }
    
    if (metrics.speed_metrics.response_time_trend < 0) {
      strengths.push('Improving response speed');
    }
    
    if (metrics.learning_metrics.learning_velocity > 5) {
      strengths.push('Fast learning pace');
    }
    
    if (metrics.efficiency_metrics.learning_efficiency_score > 75) {
      strengths.push('Efficient learning approach');
    }
    
    return strengths;
  }

  private static identifyWeaknesses(
    metrics: PerformanceMetrics, 
    historicalMetrics: PerformanceMetrics[]
  ): string[] {
    const weaknesses = [];
    
    if (metrics.accuracy_metrics.overall_accuracy < 0.6) {
      weaknesses.push('Low accuracy needs improvement');
    }
    
    if (metrics.engagement_metrics.consistency_score < 0.4) {
      weaknesses.push('Inconsistent study schedule');
    }
    
    if (metrics.learning_metrics.retention_strength < 0.5) {
      weaknesses.push('Poor retention of learned material');
    }
    
    if (metrics.speed_metrics.average_response_time > 8000) {
      weaknesses.push('Slow response times');
    }
    
    if (metrics.efficiency_metrics.learning_efficiency_score < 40) {
      weaknesses.push('Inefficient learning approach');
    }
    
    return weaknesses;
  }

  private static generateRecommendations(
    metrics: PerformanceMetrics, 
    weaknesses: string[]
  ): PerformanceInsights['recommendations'] {
    const immediate = [];
    const shortTerm = [];
    const longTerm = [];
    
    // Generate recommendations based on weaknesses and metrics
    if (weaknesses.includes('Low accuracy needs improvement')) {
      immediate.push('Focus on easier difficulty levels to build confidence');
      shortTerm.push('Review fundamental concepts before advancing');
    }
    
    if (weaknesses.includes('Inconsistent study schedule')) {
      immediate.push('Set a daily study reminder');
      shortTerm.push('Create a consistent study routine');
    }
    
    if (weaknesses.includes('Poor retention of learned material')) {
      immediate.push('Increase review frequency for learned cards');
      longTerm.push('Implement active recall techniques');
    }
    
    if (metrics.engagement_metrics.average_session_length > 45) {
      immediate.push('Break long sessions into shorter, focused periods');
    }
    
    if (metrics.speed_metrics.average_response_time > 8000) {
      shortTerm.push('Practice speed drills to improve response time');
    }
    
    // Always include general optimization suggestions
    longTerm.push('Track progress weekly to identify improvement areas');
    longTerm.push('Gradually increase difficulty as accuracy improves');
    
    return { immediate, short_term: shortTerm, long_term: longTerm };
  }

  private static analyzeGoalProgress(
    metrics: PerformanceMetrics, 
    userGoals: Goal[]
  ): PerformanceInsights['goal_tracking'] {
    const goalTracking = {
      current_goals: userGoals,
      achievement_probability: {} as Record<string, number>,
      suggested_adjustments: {} as Record<string, string>,
    };
    
    userGoals.forEach(goal => {
      let probability = 0;
      let adjustment = '';
      
      switch (goal.type) {
        case 'accuracy':
          probability = this.calculateAccuracyGoalProbability(metrics, goal);
          if (probability < 0.7) {
            adjustment = 'Reduce difficulty or increase practice time';
          }
          break;
        case 'speed':
          probability = this.calculateSpeedGoalProbability(metrics, goal);
          if (probability < 0.7) {
            adjustment = 'Focus on speed drills and familiar content';
          }
          break;
        // Add other goal types as needed
      }
      
      goalTracking.achievement_probability[goal.id] = probability;
      if (adjustment) {
        goalTracking.suggested_adjustments[goal.id] = adjustment;
      }
    });
    
    return goalTracking;
  }

  private static generateComparativeAnalysis(metrics: PerformanceMetrics): PerformanceInsights['comparative_analysis'] {
    // This would typically compare against a database of user metrics
    // For now, we'll use general benchmarks
    
    const benchmarks = {
      accuracy: 0.75,
      speed: 4000, // 4 seconds
      consistency: 0.6,
      efficiency: 60,
    };
    
    let percentileScore = 50; // Start at median
    
    if (metrics.accuracy_metrics.overall_accuracy > benchmarks.accuracy) percentileScore += 10;
    if (metrics.speed_metrics.average_response_time < benchmarks.speed) percentileScore += 10;
    if (metrics.engagement_metrics.consistency_score > benchmarks.consistency) percentileScore += 10;
    if (metrics.efficiency_metrics.learning_efficiency_score > benchmarks.efficiency) percentileScore += 10;
    
    return {
      percentile_ranking: Math.min(95, percentileScore),
      similar_learner_comparison: {
        faster_learners: [
          { metric: 'Response Time', user_value: metrics.speed_metrics.average_response_time, comparison_value: 3000, difference_percentage: -25 },
        ],
        similar_pace: [
          { metric: 'Session Length', user_value: metrics.engagement_metrics.average_session_length, comparison_value: 22, difference_percentage: 5 },
        ],
      },
    };
  }

  private static calculateAccuracyGoalProbability(metrics: PerformanceMetrics, goal: Goal): number {
    const currentAccuracy = metrics.accuracy_metrics.overall_accuracy;
    const trend = metrics.accuracy_metrics.accuracy_trend;
    const timeLeft = (goal.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24); // Days
    
    const projectedAccuracy = currentAccuracy + (trend * timeLeft);
    
    if (projectedAccuracy >= goal.target_value) return 0.9;
    if (projectedAccuracy >= goal.target_value * 0.9) return 0.7;
    if (projectedAccuracy >= goal.target_value * 0.8) return 0.5;
    return 0.3;
  }

  private static calculateSpeedGoalProbability(metrics: PerformanceMetrics, goal: Goal): number {
    const currentSpeed = metrics.speed_metrics.average_response_time;
    const trend = metrics.speed_metrics.response_time_trend;
    const timeLeft = (goal.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24); // Days
    
    const projectedSpeed = currentSpeed + (trend * timeLeft);
    
    if (goal.target_value >= projectedSpeed) return 0.9; // Target is slower (easier to achieve)
    if (goal.target_value >= projectedSpeed * 1.1) return 0.7;
    if (goal.target_value >= projectedSpeed * 1.2) return 0.5;
    return 0.3;
  }

  private static calculateDifficultyDistribution(cardData: any[]): Record<string, number> {
    const total = cardData.length;
    const distribution: Record<string, number> = {};
    
    cardData.forEach(card => {
      distribution[card.difficulty] = (distribution[card.difficulty] || 0) + 1;
    });
    
    Object.keys(distribution).forEach(key => {
      distribution[key] = (distribution[key] / total) * 100;
    });
    
    return distribution;
  }

  private static assessProgressionSpeed(
    metrics: PerformanceMetrics, 
    difficultyDistribution: Record<string, number>
  ): 'too_fast' | 'optimal' | 'too_slow' {
    const accuracy = metrics.accuracy_metrics.overall_accuracy;
    const hardCardPercentage = (difficultyDistribution.advanced || 0) + (difficultyDistribution.expert || 0);
    
    if (accuracy < 0.7 && hardCardPercentage > 40) return 'too_fast';
    if (accuracy > 0.9 && hardCardPercentage < 20) return 'too_slow';
    return 'optimal';
  }

  private static optimizeSessionStructure(
    metrics: PerformanceMetrics, 
    cardData: any[]
  ): LearningEfficiencyAnalysis['session_optimization'] {
    const currentSessionLength = metrics.engagement_metrics.average_session_length;
    const currentFrequency = metrics.engagement_metrics.session_frequency;
    
    // Calculate ideal based on performance
    let idealLength = 20; // Base
    if (metrics.accuracy_metrics.overall_accuracy > 0.8) idealLength += 10;
    if (metrics.engagement_metrics.consistency_score > 0.7) idealLength += 5;
    
    const idealFrequency = Math.max(3, Math.min(7, currentFrequency + 1));
    
    return {
      ideal_session_count: idealFrequency,
      ideal_session_length: idealLength,
      best_time_slots: ['09:00-10:00', '14:00-15:00', '19:00-20:00'], // General optimal times
      break_patterns: ['5-minute break every 15 minutes', 'Longer break after 30 minutes'],
    };
  }
}