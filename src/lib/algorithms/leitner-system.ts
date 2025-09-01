import { ReviewCard } from './algorithm-interface';

export class LeitnerSystem {
  private readonly boxIntervals = [1, 3, 7, 14, 30];
  
  moveCard(card: ReviewCard, isCorrect: boolean): ReviewCard {
    const currentBox = this.getBoxNumber(card.interval);
    let newBox: number;
    
    if (isCorrect) {
      newBox = Math.min(currentBox + 1, this.boxIntervals.length - 1);
    } else {
      newBox = 0; // Back to box 1
    }
    
    const newInterval = this.boxIntervals[newBox];
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
    
    return {
      ...card,
      interval: newInterval,
      nextReviewDate,
      reviewCount: card.reviewCount + 1,
      successStreak: isCorrect ? card.successStreak + 1 : 0
    };
  }
  
  private getBoxNumber(interval: number): number {
    return this.boxIntervals.findIndex(boxInterval => boxInterval >= interval) || 0;
  }
}