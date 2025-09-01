import { LearningSession, AlgorithmMetrics } from './algorithm-interface';

export class PerformanceAnalytics {
  calculateSessionMetrics(session: LearningSession): AlgorithmMetrics {
    // Mock implementation - in real app would calculate from session data
    return {
      totalReviews: session.cardsReviewed,
      correctAnswers: session.correctAnswers,
      incorrectAnswers: session.cardsReviewed - session.correctAnswers,
      averageResponseTime: session.totalTimeSpent / session.cardsReviewed,
      streakCount: 0 // Would be calculated from actual review data
    };
  }
  
  generateInsights(metrics: AlgorithmMetrics): {
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  } {
    const accuracy = metrics.correctAnswers / metrics.totalReviews;
    const insights = {
      strengths: [] as string[],
      improvements: [] as string[],
      recommendations: [] as string[]
    };
    
    if (accuracy > 0.8) {
      insights.strengths.push('High accuracy rate');
      insights.recommendations.push('Consider increasing difficulty');
    } else if (accuracy < 0.6) {
      insights.improvements.push('Accuracy could be improved');
      insights.recommendations.push('Focus on review sessions');
    }
    
    if (metrics.averageResponseTime < 2000) {
      insights.strengths.push('Quick response time');
    } else if (metrics.averageResponseTime > 5000) {
      insights.improvements.push('Response time is slow');
      insights.recommendations.push('Practice more frequently');
    }
    
    return insights;
  }
}