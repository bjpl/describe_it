import { LearningSession } from './algorithm-interface';

export class LearningCurveAnalyzer {
  analyzeProgress(sessions: LearningSession[]): {
    trend: 'improving' | 'stable' | 'declining';
    confidenceScore: number;
    projectedMastery: Date;
  } {
    if (sessions.length < 2) {
      return {
        trend: 'stable',
        confidenceScore: 0.5,
        projectedMastery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      };
    }
    
    const recentSessions = sessions.slice(-5);
    const accuracyTrend = this.calculateAccuracyTrend(recentSessions);
    
    let trend: 'improving' | 'stable' | 'declining';
    if (accuracyTrend > 0.1) {
      trend = 'improving';
    } else if (accuracyTrend < -0.1) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }
    
    const confidenceScore = Math.min(sessions.length / 20, 1); // More sessions = higher confidence
    const projectedMastery = this.calculateMasteryDate(sessions);
    
    return {
      trend,
      confidenceScore,
      projectedMastery
    };
  }
  
  private calculateAccuracyTrend(sessions: LearningSession[]): number {
    if (sessions.length < 2) return 0;
    
    const firstHalf = sessions.slice(0, Math.ceil(sessions.length / 2));
    const secondHalf = sessions.slice(Math.ceil(sessions.length / 2));
    
    const firstHalfAccuracy = this.calculateAverageAccuracy(firstHalf);
    const secondHalfAccuracy = this.calculateAverageAccuracy(secondHalf);
    
    return secondHalfAccuracy - firstHalfAccuracy;
  }
  
  private calculateAverageAccuracy(sessions: LearningSession[]): number {
    if (sessions.length === 0) return 0;
    
    const totalAccuracy = sessions.reduce((sum, session) => {
      return sum + (session.correctAnswers / session.cardsReviewed);
    }, 0);
    
    return totalAccuracy / sessions.length;
  }
  
  private calculateMasteryDate(sessions: LearningSession[]): Date {
    const averageAccuracy = this.calculateAverageAccuracy(sessions);
    const targetAccuracy = 0.9;
    
    if (averageAccuracy >= targetAccuracy) {
      return new Date(); // Already mastered
    }
    
    // Simple projection based on current progress
    const daysNeeded = Math.max(7, (targetAccuracy - averageAccuracy) * 100);
    return new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000);
  }
}