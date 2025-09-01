// Base algorithm interfaces and types
export interface AlgorithmConfig {
  initialInterval: number;
  easeFactor: number;
  minInterval: number;
  maxInterval: number;
}

export interface AlgorithmMetrics {
  totalReviews: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageResponseTime: number;
  streakCount: number;
}

export interface LearningSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  cardsReviewed: number;
  correctAnswers: number;
  totalTimeSpent: number;
}

export interface ReviewCard {
  id: string;
  imageId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  interval: number;
  easeFactor: number;
  nextReviewDate: Date;
  reviewCount: number;
  successStreak: number;
}

export abstract class BaseAlgorithm {
  protected config: AlgorithmConfig;
  
  constructor(config: AlgorithmConfig) {
    this.config = config;
  }

  abstract calculateNextInterval(
    currentInterval: number,
    quality: number,
    easeFactor: number
  ): number;

  abstract updateEaseFactor(currentFactor: number, quality: number): number;
}