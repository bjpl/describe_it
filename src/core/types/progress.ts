/**
 * Progress Tracking Types
 *
 * Type definitions for user progress, achievements, and learning metrics
 */

import type { DifficultyLevel } from './entities';

// ============================================================================
// PROGRESS EVENTS
// ============================================================================

export type ProgressEventType =
  | 'vocabulary_learned'
  | 'vocabulary_reviewed'
  | 'vocabulary_mastered'
  | 'qa_answered'
  | 'qa_correct'
  | 'qa_incorrect'
  | 'phrase_learned'
  | 'phrase_reviewed'
  | 'phrase_mastered'
  | 'translation_completed'
  | 'description_generated'
  | 'session_started'
  | 'session_completed'
  | 'image_processed'
  | 'export_generated'
  | 'difficulty_adjusted'
  | 'goal_achieved';

export interface ProgressEventData {
  vocabularyId?: string;
  questionId?: string;
  phraseId?: string;
  imageUrl?: string;
  difficulty?: DifficultyLevel;
  category?: string;
  score?: number;
  timeSpent?: number;
  attempts?: number;
  correct?: boolean;
  confidence?: number;
  masteryLevel?: number;
  streak?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ProgressEvent {
  id: string;
  userId: string;
  sessionId?: string;
  eventType: ProgressEventType;
  eventData: ProgressEventData;
  timestamp: string;
  dateKey: string;
}

export interface ProgressEventRequest {
  userId: string;
  sessionId?: string;
  eventType: ProgressEventType;
  eventData: ProgressEventData;
  timestamp?: string;
}

// ============================================================================
// USER PROGRESS SUMMARY
// ============================================================================

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
  eventType: ProgressEventType;
  eventData: ProgressEventData;
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

// ============================================================================
// SESSION PROGRESS
// ============================================================================

export interface SessionEvent {
  eventType: ProgressEventType;
  eventData: ProgressEventData;
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

// ============================================================================
// DAILY AGGREGATION
// ============================================================================

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

// ============================================================================
// GOALS
// ============================================================================

export type GoalType =
  | 'daily_vocabulary'
  | 'weekly_practice'
  | 'mastery_target'
  | 'streak_goal';

export interface Goal {
  id: string;
  userId: string;
  goalType: GoalType;
  targetValue: number;
  currentValue: number;
  deadline?: string;
  description?: string;
  category?: string;
  difficulty?: DifficultyLevel;
  active: boolean;
  lastUpdated?: string;
  completed?: boolean;
  completedAt?: string;
}

export interface GoalCollection {
  active: Goal[];
  completed: Goal[];
}

export interface GoalRequest {
  userId: string;
  goalType: GoalType;
  targetValue: number;
  currentValue?: number;
  deadline?: string;
  description?: string;
  category?: string;
  difficulty?: DifficultyLevel;
  active?: boolean;
}

// ============================================================================
// PROGRESS QUERIES
// ============================================================================

export type AggregationPeriod = 'daily' | 'weekly' | 'monthly';

export interface ProgressQueryFilters {
  userId: string;
  sessionId?: string;
  eventType?: string[];
  category?: string;
  difficulty?: DifficultyLevel;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  aggregation?: AggregationPeriod;
}

export interface ProgressQueryResponse {
  success: boolean;
  data: UserProgress & {
    aggregated?: DailyProgress[];
  };
  metadata: {
    userId: string;
    filters: ProgressQueryFilters;
    responseTime: string;
    timestamp: string;
  };
}

// ============================================================================
// ACHIEVEMENT DEFINITIONS
// ============================================================================

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  condition: (progress: UserProgress) => boolean;
  icon?: string;
  points?: number;
}
