import { z } from 'zod';

export const createSessionSchema = z.object({
  session_type: z.enum(['practice', 'review', 'challenge', 'free_play']).default('practice'),
  device_info: z.object({
    userAgent: z.string().optional(),
    platform: z.string().optional(),
    language: z.string().optional(),
    viewport: z.object({
      width: z.number(),
      height: z.number(),
    }).optional(),
  }).optional(),
});

export const updateSessionSchema = z.object({
  status: z.enum(['active', 'completed', 'abandoned', 'paused']).optional(),
  completed_at: z.string().datetime().optional(),
  duration_minutes: z.number().min(0).optional(),
  images_viewed: z.number().min(0).optional(),
  descriptions_completed: z.number().min(0).optional(),
  questions_answered: z.number().min(0).optional(),
  questions_correct: z.number().min(0).optional(),
  phrases_selected: z.number().min(0).optional(),
  points_earned: z.number().min(0).optional(),
  accuracy_percentage: z.number().min(0).max(100).optional(),
  session_data: z.record(z.any()).optional(),
});

export const sessionFiltersSchema = z.object({
  session_type: z.enum(['practice', 'review', 'challenge', 'free_play']).optional(),
  status: z.enum(['active', 'completed', 'abandoned', 'paused']).optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sort_by: z.enum(['started_at', 'completed_at', 'duration_minutes', 'points_earned', 'accuracy_percentage']).default('started_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const sessionStatsSchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year', 'all']).default('week'),
  timezone: z.string().default('UTC'),
});

export const completeSessionSchema = z.object({
  session_id: z.string().uuid(),
  final_stats: z.object({
    duration_minutes: z.number().min(0),
    images_viewed: z.number().min(0),
    descriptions_completed: z.number().min(0),
    questions_answered: z.number().min(0),
    questions_correct: z.number().min(0),
    phrases_selected: z.number().min(0),
    points_earned: z.number().min(0),
    accuracy_percentage: z.number().min(0).max(100),
  }),
  session_data: z.record(z.any()).optional(),
});

export const pauseSessionSchema = z.object({
  session_id: z.string().uuid(),
  pause_reason: z.enum(['user_request', 'inactivity', 'system', 'error']).optional(),
  current_progress: z.record(z.any()).optional(),
});

export const resumeSessionSchema = z.object({
  session_id: z.string().uuid(),
  resume_data: z.record(z.any()).optional(),
});

export type CreateSessionRequest = z.infer<typeof createSessionSchema>;
export type UpdateSessionRequest = z.infer<typeof updateSessionSchema>;
export type SessionFiltersRequest = z.infer<typeof sessionFiltersSchema>;
export type SessionStatsRequest = z.infer<typeof sessionStatsSchema>;
export type CompleteSessionRequest = z.infer<typeof completeSessionSchema>;
export type PauseSessionRequest = z.infer<typeof pauseSessionSchema>;
export type ResumeSessionRequest = z.infer<typeof resumeSessionSchema>;