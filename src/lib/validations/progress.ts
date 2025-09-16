import { z } from "zod";

export const createProgressSchema = z.object({
  progress_type: z.enum([
    "daily",
    "weekly",
    "monthly",
    "skill",
    "vocabulary",
    "grammar",
    "achievement",
    "milestone",
    "session_summary",
    "audit_log",
  ]),
  progress_date: z.string().date().optional(),
  skill_category: z
    .enum([
      "reading_comprehension",
      "vocabulary_recognition",
      "grammar_understanding",
      "translation_accuracy",
      "cultural_awareness",
      "listening_comprehension",
    ])
    .optional(),
  current_level: z
    .enum(["beginner", "intermediate", "advanced", "expert"])
    .optional(),
  points_earned: z.number().min(0).default(0),
  sessions_completed: z.number().min(0).default(0),
  descriptions_completed: z.number().min(0).default(0),
  questions_answered: z.number().min(0).default(0),
  questions_correct: z.number().min(0).default(0),
  phrases_learned: z.number().min(0).default(0),
  phrases_mastered: z.number().min(0).default(0),
  time_spent_minutes: z.number().min(0).default(0),
  accuracy_percentage: z.number().min(0).max(100).default(0),
  consistency_score: z.number().min(0).max(100).default(0),
  improvement_rate: z.number().default(0),
  achievements_unlocked: z.array(z.string()).default([]),
  skill_breakdown: z.record(z.number()).optional(),
  performance_metrics: z.record(z.any()).optional(),
  goals_status: z.record(z.any()).optional(),
  weak_areas: z.array(z.string()).default([]),
  strong_areas: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
});

export const progressFiltersSchema = z.object({
  progress_type: z
    .enum([
      "daily",
      "weekly",
      "monthly",
      "skill",
      "vocabulary",
      "grammar",
      "achievement",
      "milestone",
      "session_summary",
      "audit_log",
    ])
    .optional(),
  skill_category: z
    .enum([
      "reading_comprehension",
      "vocabulary_recognition",
      "grammar_understanding",
      "translation_accuracy",
      "cultural_awareness",
      "listening_comprehension",
    ])
    .optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  limit: z.number().min(1).max(100).default(30),
  offset: z.number().min(0).default(0),
  sort_by: z
    .enum([
      "progress_date",
      "points_earned",
      "accuracy_percentage",
      "improvement_rate",
    ])
    .default("progress_date"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export const progressSummarySchema = z.object({
  days_back: z.number().min(1).max(365).default(30),
  include_predictions: z.boolean().default(false),
  group_by: z.enum(["day", "week", "month"]).default("day"),
});

export const updateGoalsSchema = z.object({
  daily_goal: z.number().min(1).max(1000).optional(),
  weekly_goal: z.number().min(1).max(7000).optional(),
  monthly_goal: z.number().min(1).max(30000).optional(),
  custom_goals: z
    .record(
      z.object({
        target: z.number().min(0),
        deadline: z.string().date().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
});

export const achievementSchema = z.object({
  achievement_id: z.string().min(1),
  achievement_name: z.string().min(1),
  description: z.string().optional(),
  points_awarded: z.number().min(0).default(0),
  category: z.enum([
    "streak",
    "accuracy",
    "vocabulary",
    "sessions",
    "time",
    "consistency",
    "milestone",
  ]),
  unlocked_at: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

export const streakUpdateSchema = z.object({
  action: z.enum(["increment", "reset", "extend"]),
  date: z.string().date().optional(),
  bonus_points: z.number().min(0).default(0),
});

export const performanceAnalyticsSchema = z.object({
  timeframe: z.enum(["week", "month", "quarter", "year"]).default("month"),
  metrics: z
    .array(
      z.enum([
        "accuracy",
        "consistency",
        "speed",
        "retention",
        "difficulty_progression",
      ]),
    )
    .default(["accuracy", "consistency"]),
  compare_to_previous: z.boolean().default(true),
  include_predictions: z.boolean().default(false),
});

export type CreateProgressRequest = z.infer<typeof createProgressSchema>;
export type ProgressFiltersRequest = z.infer<typeof progressFiltersSchema>;
export type ProgressSummaryRequest = z.infer<typeof progressSummarySchema>;
export type UpdateGoalsRequest = z.infer<typeof updateGoalsSchema>;
export type AchievementRequest = z.infer<typeof achievementSchema>;
export type StreakUpdateRequest = z.infer<typeof streakUpdateSchema>;
export type PerformanceAnalyticsRequest = z.infer<
  typeof performanceAnalyticsSchema
>;
