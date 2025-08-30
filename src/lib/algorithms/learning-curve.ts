/**
 * Learning Curve Prediction Algorithms
 * Predicts user learning progress and optimizes study plans
 */

export interface LearningDataPoint {
  timestamp: Date;
  session_id: string;
  cards_studied: number;
  cards_correct: number;
  average_response_time: number;
  session_duration_minutes: number;
  difficulty_level: number;
  context: {
    time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
    day_of_week: number; // 0-6
    session_type: 'new' | 'review' | 'mixed';
    energy_level?: number; // 1-5 if available
  };
}

export interface LearningCurveModel {
  user_id: string;
  learning_rate: number; // How fast the user learns (0-1)
  retention_rate: number; // How well the user retains (0-1)
  fatigue_factor: number; // How quickly performance degrades in session (0-1)
  optimal_session_length: number; // Minutes
  peak_performance_time: string; // Hour of day (e.g., "14:00")
  learning_pattern: 'steady' | 'burst' | 'gradual' | 'plateau';
  predicted_mastery_days: number; // Days to reach 80% mastery
  confidence_interval: number; // 0-1, how confident we are in predictions
  last_updated: Date;
}

export interface LearningPrediction {
  next_week_performance: {
    expected_accuracy: number;
    expected_cards_per_session: number;
    optimal_daily_minutes: number;
  };
  mastery_timeline: {
    current_level: number; // 0-100%
    expected_in_week: number;
    expected_in_month: number;
    bottleneck_areas: string[];
  };
  optimization_suggestions: {
    timing: string[];
    session_structure: string[];
    difficulty_adjustments: string[];
  };
}

/**
 * Learning Curve Prediction Algorithm
 * Uses statistical analysis and machine learning principles
 */
export class LearningCurveAlgorithm {
  private static readonly MIN_DATA_POINTS = 5;
  private static readonly SMOOTHING_WINDOW = 7; // Days for moving average
  private static readonly FORGETTING_CURVE_HALF_LIFE = 7; // Days

  /**
   * Create initial learning curve model for new user
   */
  static createInitialModel(userId: string): LearningCurveModel {
    return {
      user_id: userId,
      learning_rate: 0.5, // Neutral starting point
      retention_rate: 0.8, // Optimistic but realistic
      fatigue_factor: 0.15, // Assumes 15% performance drop per 20 minutes
      optimal_session_length: 20,
      peak_performance_time: '14:00', // Early afternoon default
      learning_pattern: 'steady',
      predicted_mastery_days: 90, // Conservative estimate
      confidence_interval: 0.2, // Low confidence initially
      last_updated: new Date(),
    };
  }

  /**
   * Update learning curve model with new data
   */
  static updateModel(
    model: LearningCurveModel, 
    dataPoints: LearningDataPoint[]
  ): LearningCurveModel {
    if (dataPoints.length < this.MIN_DATA_POINTS) {
      return model; // Not enough data to update
    }

    const updatedModel = { ...model };
    
    // Calculate learning rate from accuracy progression
    updatedModel.learning_rate = this.calculateLearningRate(dataPoints);
    
    // Calculate retention rate from performance over time
    updatedModel.retention_rate = this.calculateRetentionRate(dataPoints);
    
    // Calculate fatigue factor from within-session performance
    updatedModel.fatigue_factor = this.calculateFatiguePattern(dataPoints);
    
    // Find optimal session length
    updatedModel.optimal_session_length = this.calculateOptimalSessionLength(dataPoints);
    
    // Find peak performance time
    updatedModel.peak_performance_time = this.findPeakPerformanceTime(dataPoints);
    
    // Classify learning pattern
    updatedModel.learning_pattern = this.classifyLearningPattern(dataPoints);
    
    // Predict mastery timeline
    updatedModel.predicted_mastery_days = this.predictMasteryDays(dataPoints, updatedModel);
    
    // Calculate confidence in predictions
    updatedModel.confidence_interval = this.calculateConfidenceInterval(dataPoints);
    
    updatedModel.last_updated = new Date();
    
    return updatedModel;
  }

  /**
   * Generate learning predictions
   */
  static generatePredictions(
    model: LearningCurveModel,
    dataPoints: LearningDataPoint[]
  ): LearningPrediction {
    const recentData = this.getRecentData(dataPoints, 14); // Last 2 weeks
    const currentAccuracy = this.getCurrentAccuracy(recentData);
    
    // Predict next week performance
    const weeklyProgress = model.learning_rate * 7; // Weekly improvement
    const expectedAccuracy = Math.min(0.95, currentAccuracy + weeklyProgress);
    const expectedCardsPerSession = this.predictCardsPerSession(model, recentData);
    
    // Calculate mastery timeline
    const currentMastery = currentAccuracy * 100;
    const weeklyMasteryGain = weeklyProgress * 100;
    const monthlyMasteryGain = weeklyMasteryGain * 4.3;
    
    // Identify bottleneck areas
    const bottlenecks = this.identifyBottlenecks(dataPoints, model);
    
    // Generate optimization suggestions
    const suggestions = this.generateOptimizationSuggestions(model, dataPoints);
    
    return {
      next_week_performance: {
        expected_accuracy: expectedAccuracy,
        expected_cards_per_session: expectedCardsPerSession,
        optimal_daily_minutes: model.optimal_session_length,
      },
      mastery_timeline: {
        current_level: currentMastery,
        expected_in_week: Math.min(100, currentMastery + weeklyMasteryGain),
        expected_in_month: Math.min(100, currentMastery + monthlyMasteryGain),
        bottleneck_areas: bottlenecks,
      },
      optimization_suggestions: suggestions,
    };
  }

  /**
   * Calculate learning rate from progression data
   */
  private static calculateLearningRate(dataPoints: LearningDataPoint[]): number {
    if (dataPoints.length < 2) return 0.5;
    
    const sortedPoints = [...dataPoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const accuracyProgression = sortedPoints.map(p => p.cards_correct / p.cards_studied);
    
    // Calculate slope of accuracy over time using linear regression
    const n = accuracyProgression.length;
    const sumX = n * (n - 1) / 2; // 0 + 1 + 2 + ... + (n-1)
    const sumY = accuracyProgression.reduce((sum, acc) => sum + acc, 0);
    const sumXY = accuracyProgression.reduce((sum, acc, i) => sum + (acc * i), 0);
    const sumXX = n * (n - 1) * (2 * n - 1) / 6; // Sum of squares
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Convert slope to daily learning rate (0-1 scale)
    return Math.max(0, Math.min(1, slope * 10)); // Amplify and bound
  }

  /**
   * Calculate retention rate from forgetting curve
   */
  private static calculateRetentionRate(dataPoints: LearningDataPoint[]): number {
    // Look for patterns in performance after breaks
    const sessionGaps = this.calculateSessionGaps(dataPoints);
    
    if (sessionGaps.length < 2) return 0.8; // Default
    
    // Simple exponential decay model
    const retentionScores = sessionGaps.map(gap => {
      const daysSince = gap.days_between;
      const performanceDrop = 1 - (gap.performance_after / gap.performance_before);
      
      // Fit to exponential decay: retention = e^(-days/half_life)
      return Math.exp(-daysSince / this.FORGETTING_CURVE_HALF_LIFE);
    });
    
    return retentionScores.reduce((sum, score) => sum + score, 0) / retentionScores.length;
  }

  /**
   * Calculate fatigue pattern within sessions
   */
  private static calculateFatiguePattern(dataPoints: LearningDataPoint[]): number {
    const longSessions = dataPoints.filter(p => p.session_duration_minutes >= 15);
    
    if (longSessions.length < 3) return 0.15; // Default
    
    // Look for correlation between session duration and accuracy
    const durations = longSessions.map(p => p.session_duration_minutes);
    const accuracies = longSessions.map(p => p.cards_correct / p.cards_studied);
    
    // Calculate correlation coefficient
    const correlation = this.calculateCorrelation(durations, accuracies);
    
    // Convert negative correlation to fatigue factor
    return Math.max(0, Math.min(0.5, -correlation * 0.3));
  }

  /**
   * Find optimal session length based on performance
   */
  private static calculateOptimalSessionLength(dataPoints: LearningDataPoint[]): number {
    // Group sessions by duration ranges and find peak performance
    const durationBuckets = new Map<number, { accuracy: number; count: number }>();
    
    dataPoints.forEach(point => {
      const bucket = Math.floor(point.session_duration_minutes / 5) * 5; // 5-minute buckets
      const accuracy = point.cards_correct / point.cards_studied;
      
      if (!durationBuckets.has(bucket)) {
        durationBuckets.set(bucket, { accuracy: 0, count: 0 });
      }
      
      const existing = durationBuckets.get(bucket)!;
      existing.accuracy = (existing.accuracy * existing.count + accuracy) / (existing.count + 1);
      existing.count++;
    });
    
    // Find duration with highest average accuracy (minimum 3 sessions)
    let bestDuration = 20;
    let bestAccuracy = 0;
    
    durationBuckets.forEach((data, duration) => {
      if (data.count >= 3 && data.accuracy > bestAccuracy) {
        bestAccuracy = data.accuracy;
        bestDuration = duration;
      }
    });
    
    return Math.max(10, Math.min(60, bestDuration));
  }

  /**
   * Find peak performance time of day
   */
  private static findPeakPerformanceTime(dataPoints: LearningDataPoint[]): string {
    const hourlyPerformance = new Map<number, { accuracy: number; count: number }>();
    
    dataPoints.forEach(point => {
      const hour = point.timestamp.getHours();
      const accuracy = point.cards_correct / point.cards_studied;
      
      if (!hourlyPerformance.has(hour)) {
        hourlyPerformance.set(hour, { accuracy: 0, count: 0 });
      }
      
      const existing = hourlyPerformance.get(hour)!;
      existing.accuracy = (existing.accuracy * existing.count + accuracy) / (existing.count + 1);
      existing.count++;
    });
    
    // Find hour with best performance (minimum 2 sessions)
    let bestHour = 14; // Default to 2 PM
    let bestAccuracy = 0;
    
    hourlyPerformance.forEach((data, hour) => {
      if (data.count >= 2 && data.accuracy > bestAccuracy) {
        bestAccuracy = data.accuracy;
        bestHour = hour;
      }
    });
    
    return `${bestHour.toString().padStart(2, '0')}:00`;
  }

  /**
   * Classify learning pattern
   */
  private static classifyLearningPattern(dataPoints: LearningDataPoint[]): LearningCurveModel['learning_pattern'] {
    if (dataPoints.length < 7) return 'steady';
    
    const sortedPoints = [...dataPoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const accuracies = sortedPoints.map(p => p.cards_correct / p.cards_studied);
    
    // Calculate moving average to smooth data
    const smoothed = this.calculateMovingAverage(accuracies, 3);
    
    // Analyze trend characteristics
    const trends = [];
    for (let i = 1; i < smoothed.length; i++) {
      trends.push(smoothed[i] - smoothed[i - 1]);
    }
    
    const avgTrend = trends.reduce((sum, t) => sum + t, 0) / trends.length;
    const trendVariability = this.calculateStandardDeviation(trends);
    
    // Classify based on trend and variability
    if (trendVariability > 0.1) return 'burst'; // High variability
    if (avgTrend > 0.02) return 'steady'; // Consistent improvement
    if (avgTrend > 0.005) return 'gradual'; // Slow but steady
    return 'plateau'; // Little to no improvement
  }

  /**
   * Predict days to mastery
   */
  private static predictMasteryDays(
    dataPoints: LearningDataPoint[], 
    model: LearningCurveModel
  ): number {
    const currentAccuracy = this.getCurrentAccuracy(dataPoints);
    const targetAccuracy = 0.8; // 80% accuracy = mastery
    
    if (currentAccuracy >= targetAccuracy) return 0;
    
    const accuracyGap = targetAccuracy - currentAccuracy;
    const dailyImprovement = model.learning_rate / 7; // Convert weekly to daily
    
    if (dailyImprovement <= 0) return 365; // Cap at 1 year if no improvement
    
    return Math.min(365, Math.ceil(accuracyGap / dailyImprovement));
  }

  /**
   * Helper functions
   */
  private static getRecentData(dataPoints: LearningDataPoint[], days: number): LearningDataPoint[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return dataPoints.filter(p => p.timestamp >= cutoff);
  }

  private static getCurrentAccuracy(dataPoints: LearningDataPoint[]): number {
    if (dataPoints.length === 0) return 0.5;
    
    const recent = this.getRecentData(dataPoints, 7);
    if (recent.length === 0) return 0.5;
    
    const totalCorrect = recent.reduce((sum, p) => sum + p.cards_correct, 0);
    const totalStudied = recent.reduce((sum, p) => sum + p.cards_studied, 0);
    
    return totalStudied > 0 ? totalCorrect / totalStudied : 0.5;
  }

  private static calculateSessionGaps(dataPoints: LearningDataPoint[]): Array<{
    days_between: number;
    performance_before: number;
    performance_after: number;
  }> {
    const sorted = [...dataPoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const gaps = [];
    
    for (let i = 1; i < sorted.length; i++) {
      const daysBetween = (sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysBetween >= 1) { // At least 1 day gap
        gaps.push({
          days_between: daysBetween,
          performance_before: sorted[i - 1].cards_correct / sorted[i - 1].cards_studied,
          performance_after: sorted[i].cards_correct / sorted[i].cards_studied,
        });
      }
    }
    
    return gaps;
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

  private static calculateMovingAverage(data: number[], windowSize: number): number[] {
    const result = [];
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
      const window = data.slice(start, end);
      const average = window.reduce((sum, val) => sum + val, 0) / window.length;
      result.push(average);
    }
    
    return result;
  }

  private static calculateStandardDeviation(data: number[]): number {
    if (data.length === 0) return 0;
    
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  private static predictCardsPerSession(
    model: LearningCurveModel, 
    recentData: LearningDataPoint[]
  ): number {
    if (recentData.length === 0) return 15;
    
    const avgCards = recentData.reduce((sum, p) => sum + p.cards_studied, 0) / recentData.length;
    
    // Adjust based on learning rate and fatigue
    const capacityMultiplier = 1 + (model.learning_rate - 0.5); // Better learners can handle more
    const fatigueMultiplier = 1 - model.fatigue_factor; // Less fatigue = more capacity
    
    return Math.round(avgCards * capacityMultiplier * fatigueMultiplier);
  }

  private static identifyBottlenecks(
    dataPoints: LearningDataPoint[], 
    model: LearningCurveModel
  ): string[] {
    const bottlenecks = [];
    
    // Check if learning rate is low
    if (model.learning_rate < 0.3) {
      bottlenecks.push('slow_learning');
    }
    
    // Check if retention is poor
    if (model.retention_rate < 0.6) {
      bottlenecks.push('poor_retention');
    }
    
    // Check if fatigue is high
    if (model.fatigue_factor > 0.3) {
      bottlenecks.push('session_fatigue');
    }
    
    // Check for inconsistent performance
    const recentAccuracies = this.getRecentData(dataPoints, 14)
      .map(p => p.cards_correct / p.cards_studied);
    
    if (recentAccuracies.length > 0) {
      const variability = this.calculateStandardDeviation(recentAccuracies);
      if (variability > 0.2) {
        bottlenecks.push('inconsistent_performance');
      }
    }
    
    return bottlenecks;
  }

  private static generateOptimizationSuggestions(
    model: LearningCurveModel,
    dataPoints: LearningDataPoint[]
  ): {
    timing: string[];
    session_structure: string[];
    difficulty_adjustments: string[];
  } {
    const timing = [];
    const sessionStructure = [];
    const difficultyAdjustments = [];
    
    // Timing suggestions
    const peakHour = parseInt(model.peak_performance_time.split(':')[0]);
    timing.push(`Study during peak hours around ${model.peak_performance_time}`);
    
    if (model.retention_rate < 0.7) {
      timing.push('Increase study frequency to improve retention');
    }
    
    // Session structure suggestions
    sessionStructure.push(`Optimal session length: ${model.optimal_session_length} minutes`);
    
    if (model.fatigue_factor > 0.2) {
      sessionStructure.push('Take breaks every 15 minutes to combat fatigue');
      sessionStructure.push('Consider shorter, more frequent sessions');
    }
    
    // Difficulty adjustments
    if (model.learning_rate < 0.3) {
      difficultyAdjustments.push('Focus on easier material to build confidence');
    } else if (model.learning_rate > 0.7) {
      difficultyAdjustments.push('Increase difficulty to maintain challenge');
    }
    
    return { timing, sessionStructure, difficultyAdjustments };
  }

  private static calculateConfidenceInterval(dataPoints: LearningDataPoint[]): number {
    // Confidence increases with more data and consistent patterns
    const dataScore = Math.min(1, dataPoints.length / 20); // Max at 20 data points
    
    if (dataPoints.length < 5) return 0.2;
    
    const accuracies = dataPoints.map(p => p.cards_correct / p.cards_studied);
    const consistency = 1 - this.calculateStandardDeviation(accuracies);
    
    return Math.max(0.2, Math.min(0.95, (dataScore + consistency) / 2));
  }
}