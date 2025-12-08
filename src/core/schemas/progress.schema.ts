/**
 * Progress Tracking API Schemas
 *
 * Zod schemas for progress tracking, achievements, and learning analytics
 * with runtime validation and TypeScript type inference
 */

import { z } from 'zod';
import { difficultyLevelSchema } from './vocabulary.schema';

// ============================================================================
// PROGRESS EVENTS
// ============================================================================

export const progressEventTypeSchema = z.enum([
  'vocabulary_learned',
  'vocabulary_reviewed',
  'vocabulary_mastered',
  'qa_answered',
  'qa_correct',
  'qa_incorrect',
  'phrase_learned',
  'phrase_reviewed',
  'phrase_mastered',
  'translation_completed',
  'description_generated',
  'session_started',
  'session_completed',
  'image_processed',
  'export_generated',
  'difficulty_adjusted',
  'goal_achieved',
]);

export type ProgressEventType = z.infer<typeof progressEventTypeSchema>;

export const progressEventDataSchema = z.object({
  vocabularyId: z.string().uuid().optional(),
  questionId: z.string().uuid().optional(),
  phraseId: z.string().uuid().optional(),
  imageUrl: z.string().url().optional(),
  difficulty: difficultyLevelSchema.optional(),
  category: z.string().max(100).optional(),
  score: z.number().min(0).max(100).optional(),
  timeSpent: z.number().int().nonnegative().optional(),
  attempts: z.number().int().positive().optional(),
  correct: z.boolean().optional(),
  confidence: z.number().min(0).max(1).optional(),
  masteryLevel: z.number().min(0).max(1).optional(),
  streak: z.number().int().nonnegative().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ProgressEventData = z.infer<typeof progressEventDataSchema>;

export const trackProgressRequestSchema = z.object({
  eventType: progressEventTypeSchema,
  eventData: progressEventDataSchema,
  sessionId: z.string().uuid().optional(),
  timestamp: z.string().datetime().optional(),
});

export type TrackProgressRequest = z.infer<typeof trackProgressRequestSchema>;

export const progressEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sessionId: z.string().uuid().nullable(),
  eventType: progressEventTypeSchema,
  eventData: progressEventDataSchema,
  timestamp: z.string().datetime(),
  dateKey: z.string(),
});

export type ProgressEvent = z.infer<typeof progressEventSchema>;

export const trackProgressResponseSchema = z.object({
  success: z.boolean(),
  data: progressEventSchema.nullable(),
  error: z.string().optional(),
});

export type TrackProgressResponse = z.infer<typeof trackProgressResponseSchema>;

// ============================================================================
// LEARNING PROGRESS (GET)
// ============================================================================

export const getLearningProgressQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  vocabulary_item_id: z.string().uuid().optional(),
});

export type GetLearningProgressQuery = z.infer<typeof getLearningProgressQuerySchema>;

export const learningProgressItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  vocabularyItemId: z.string().uuid(),
  masteryLevel: z.number().min(0).max(1),
  timesReviewed: z.number().int().nonnegative(),
  timesCorrect: z.number().int().nonnegative(),
  timesIncorrect: z.number().int().nonnegative(),
  lastReviewed: z.string().datetime().nullable(),
  lastReviewScore: z.number().min(0).max(100).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LearningProgressItem = z.infer<typeof learningProgressItemSchema>;

export const getLearningProgressResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(learningProgressItemSchema),
  pagination: z.object({
    total: z.number().int(),
    offset: z.number().int(),
    limit: z.number().int(),
    hasMore: z.boolean(),
  }),
  metadata: z.object({
    responseTime: z.string(),
    timestamp: z.string().datetime(),
    userId: z.string().uuid(),
  }),
  error: z.string().optional(),
});

export type GetLearningProgressResponse = z.infer<typeof getLearningProgressResponseSchema>;

// ============================================================================
// UPDATE LEARNING PROGRESS
// ============================================================================

export const updateLearningProgressRequestSchema = z.object({
  vocabulary_item_id: z.string().uuid(),
  mastery_level: z.number().min(0).max(1).optional(),
  times_reviewed: z.number().int().nonnegative().optional(),
  correct_count: z.number().int().nonnegative().optional(),
  incorrect_count: z.number().int().nonnegative().optional(),
  last_review_score: z.number().min(0).max(100).optional(),
});

export type UpdateLearningProgressRequest = z.infer<typeof updateLearningProgressRequestSchema>;

export const updateLearningProgressResponseSchema = z.object({
  success: z.boolean(),
  data: learningProgressItemSchema.nullable(),
  metadata: z.object({
    responseTime: z.string(),
    timestamp: z.string().datetime(),
    userId: z.string().uuid(),
  }),
  error: z.string().optional(),
});

export type UpdateLearningProgressResponse = z.infer<typeof updateLearningProgressResponseSchema>;

// ============================================================================
// PROGRESS SUMMARY
// ============================================================================

export const streakDataSchema = z.object({
  current: z.number().int().nonnegative(),
  longest: z.number().int().nonnegative(),
});

export type StreakData = z.infer<typeof streakDataSchema>;

export const scoreDataSchema = z.object({
  total: z.number(),
  count: z.number().int().nonnegative(),
  average: z.number().min(0).max(100),
});

export type ScoreData = z.infer<typeof scoreDataSchema>;

export const difficultyStatsSchema = z.object({
  beginner: z.number().int().nonnegative(),
  intermediate: z.number().int().nonnegative(),
  advanced: z.number().int().nonnegative(),
});

export type DifficultyStats = z.infer<typeof difficultyStatsSchema>;

export const achievementSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  unlockedAt: z.string().datetime(),
  eventType: progressEventTypeSchema,
  eventData: progressEventDataSchema,
});

export type Achievement = z.infer<typeof achievementSchema>;

export const userProgressSummarySchema = z.object({
  userId: z.string().uuid(),
  totalEvents: z.number().int().nonnegative(),
  firstActivity: z.string().datetime(),
  lastActivity: z.string().datetime(),
  streaks: streakDataSchema,
  categories: z.record(z.number().int().nonnegative()),
  difficulties: difficultyStatsSchema,
  achievements: z.array(achievementSchema),
  masteryScores: z.record(z.number().min(0).max(1)),
  timeSpent: z.number().int().nonnegative(),
  scores: scoreDataSchema,
});

export type UserProgressSummary = z.infer<typeof userProgressSummarySchema>;

export const getProgressSummaryResponseSchema = z.object({
  success: z.boolean(),
  data: userProgressSummarySchema.nullable(),
  error: z.string().optional(),
});

export type GetProgressSummaryResponse = z.infer<typeof getProgressSummaryResponseSchema>;

// ============================================================================
// PROGRESS ANALYTICS
// ============================================================================

export const progressAnalyticsQuerySchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  aggregation: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily'),
  eventTypes: z.string()
    .transform(val => val.split(','))
    .pipe(z.array(progressEventTypeSchema))
    .optional(),
  category: z.string().max(100).optional(),
  difficulty: difficultyLevelSchema.optional(),
});

export type ProgressAnalyticsQuery = z.infer<typeof progressAnalyticsQuerySchema>;

export const dailyProgressSchema = z.object({
  userId: z.string().uuid(),
  date: z.string(),
  events: z.record(z.number().int().nonnegative()),
  totalEvents: z.number().int().nonnegative(),
  timeSpent: z.number().int().nonnegative(),
  score: scoreDataSchema,
  categories: z.record(z.number().int().nonnegative()),
  difficulties: difficultyStatsSchema,
});

export type DailyProgress = z.infer<typeof dailyProgressSchema>;

export const getProgressAnalyticsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    summary: userProgressSummarySchema,
    aggregated: z.array(dailyProgressSchema),
  }).nullable(),
  metadata: z.object({
    userId: z.string().uuid(),
    filters: progressAnalyticsQuerySchema,
    responseTime: z.string(),
    timestamp: z.string().datetime(),
  }),
  error: z.string().optional(),
});

export type GetProgressAnalyticsResponse = z.infer<typeof getProgressAnalyticsResponseSchema>;

// ============================================================================
// STREAK TRACKING
// ============================================================================

export const getStreakResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    currentStreak: z.number().int().nonnegative(),
    longestStreak: z.number().int().nonnegative(),
    lastActivityDate: z.string().datetime().nullable(),
    streakActive: z.boolean(),
  }).nullable(),
  error: z.string().optional(),
});

export type GetStreakResponse = z.infer<typeof getStreakResponseSchema>;

// ============================================================================
// GOALS
// ============================================================================

export const goalTypeSchema = z.enum([
  'daily_vocabulary',
  'weekly_practice',
  'mastery_target',
  'streak_goal',
]);

export type GoalType = z.infer<typeof goalTypeSchema>;

export const createGoalRequestSchema = z.object({
  goalType: goalTypeSchema,
  targetValue: z.number().int().positive(),
  currentValue: z.number().int().nonnegative().optional().default(0),
  deadline: z.string().datetime().optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  difficulty: difficultyLevelSchema.optional(),
  active: z.boolean().optional().default(true),
});

export type CreateGoalRequest = z.infer<typeof createGoalRequestSchema>;

export const goalSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  goalType: goalTypeSchema,
  targetValue: z.number().int().positive(),
  currentValue: z.number().int().nonnegative(),
  deadline: z.string().datetime().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  difficulty: difficultyLevelSchema.nullable(),
  active: z.boolean(),
  lastUpdated: z.string().datetime().nullable(),
  completed: z.boolean().nullable(),
  completedAt: z.string().datetime().nullable(),
});

export type Goal = z.infer<typeof goalSchema>;

export const createGoalResponseSchema = z.object({
  success: z.boolean(),
  data: goalSchema.nullable(),
  error: z.string().optional(),
});

export type CreateGoalResponse = z.infer<typeof createGoalResponseSchema>;

export const getGoalsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    active: z.array(goalSchema),
    completed: z.array(goalSchema),
  }).nullable(),
  error: z.string().optional(),
});

export type GetGoalsResponse = z.infer<typeof getGoalsResponseSchema>;
