import { AlgorithmMetrics } from './algorithm-interface';

export class AdaptiveDifficultyAlgorithm {
  calculateDifficulty(metrics: AlgorithmMetrics): 'easy' | 'medium' | 'hard' {
    const accuracy = metrics.correctAnswers / (metrics.correctAnswers + metrics.incorrectAnswers);
    const avgResponseTime = metrics.averageResponseTime;
    
    if (accuracy > 0.8 && avgResponseTime < 3000) {
      return 'hard';
    } else if (accuracy > 0.6 && avgResponseTime < 5000) {
      return 'medium';
    } else {
      return 'easy';
    }
  }
  
  adjustContent(difficulty: 'easy' | 'medium' | 'hard'): {
    vocabularyLevel: string;
    questionComplexity: string;
    hintAvailable: boolean;
  } {
    switch (difficulty) {
      case 'easy':
        return {
          vocabularyLevel: 'beginner',
          questionComplexity: 'simple',
          hintAvailable: true
        };
      case 'medium':
        return {
          vocabularyLevel: 'intermediate',
          questionComplexity: 'moderate',
          hintAvailable: false
        };
      case 'hard':
        return {
          vocabularyLevel: 'advanced',
          questionComplexity: 'complex',
          hintAvailable: false
        };
    }
  }
}