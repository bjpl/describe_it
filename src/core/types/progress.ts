/**
 * Progress Tracking Types
 *
 * Type definitions for progress tracking, goals, and achievements.
 */

export interface ProgressEvent {
  id: string;
  userId: string;
  sessionId?: string;
  eventType: string;
  eventData: any;
  timestamp: string;
  dateKey: string;
}

export interface StreakData {
  current: number;
  longest: number;
}

export interface ScoreData {
  total: number;
  count: number;
  average: number;
}

export interface DifficultyStats {
  beginner: number;
  intermediate: number;
  advanced: number;
}

export interface Achievement {
  id: string;
  title: string;
  unlockedAt: string;
  eventType: string;
  eventData: any;
}

export interface UserProgress {
  userId: string;
  totalEvents: number;
  firstActivity: string;
  lastActivity: string;
  streaks: StreakData;
  categories: Record<string, number>;
  difficulties: DifficultyStats;
  achievements: Achievement[];
  masteryScores: Record<string, number>;
  timeSpent: number;
  scores: ScoreData;
}

export interface SessionEvent {
  eventType: string;
  eventData: any;
  timestamp: string;
}

export interface SessionStats {
  totalEvents: number;
  correctAnswers: number;
  incorrectAnswers: number;
  vocabularyLearned: number;
  phrasesLearned: number;
  timeSpent: number;
  averageScore: number;
  completionRate: number;
}

export interface SessionProgress {
  sessionId: string;
  startTime: string;
  lastActivity: string;
  events: SessionEvent[];
  stats: SessionStats;
}

export interface DailyProgress {
  userId: string;
  date: string;
  events: Record<string, number>;
  totalEvents: number;
  timeSpent: number;
  score: ScoreData;
  categories: Record<string, number>;
  difficulties: DifficultyStats;
}

export interface Goal {
  id: string;
  goalType: string;
  targetValue: number;
  currentValue: number;
  lastUpdated?: string;
  completed?: boolean;
  completedAt?: string;
}

export interface GoalCollection {
  active: Goal[];
  completed: Goal[];
}
