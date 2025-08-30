/**
 * React Query hooks for user progress tracking
 * Handles all progress-related data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseService } from '../lib/api/supabase';
import { 
  UserProgressInsert, 
  UserProgressUpdate,
  LearningAnalytics 
} from '../lib/validations/schemas';
import { useAuth } from './useSession';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const progressQueryKeys = {
  all: ['progress'] as const,
  user: (userId: string) => [...progressQueryKeys.all, 'user', userId] as const,
  summary: (userId: string, days?: number) => 
    [...progressQueryKeys.user(userId), 'summary', days] as const,
  history: (userId: string, type?: string, startDate?: string, endDate?: string) => 
    [...progressQueryKeys.user(userId), 'history', type, startDate, endDate] as const,
  analytics: (userId: string) => [...progressQueryKeys.user(userId), 'analytics'] as const,
};

// =============================================================================
// PROGRESS QUERIES
// =============================================================================

/**
 * Get user progress summary
 */
export const useProgressSummary = (daysBack: number = 30) => {
  const { userId } = useAuth();
  
  return useQuery({
    queryKey: progressQueryKeys.summary(userId!, daysBack),
    queryFn: () => supabaseService.getUserProgressSummary(userId!, daysBack),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

/**
 * Get user progress history with filtering
 */
export const useProgressHistory = (
  progressType?: string,
  startDate?: string,
  endDate?: string,
  skillCategory?: string
) => {
  const { userId } = useAuth();
  
  return useQuery({
    queryKey: progressQueryKeys.history(userId!, progressType, startDate, endDate),
    queryFn: () => supabaseService.getUserProgress(
      userId!, 
      progressType, 
      startDate, 
      endDate, 
      skillCategory
    ),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
};

/**
 * Get daily progress for the current week
 */
export const useWeeklyProgress = () => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6); // Last 7 days
  
  return useProgressHistory(
    'daily',
    startDate.toISOString().split('T')[0],
    new Date().toISOString().split('T')[0]
  );
};

/**
 * Get monthly progress for current year
 */
export const useMonthlyProgress = () => {
  const startDate = new Date();
  startDate.setMonth(0, 1); // January 1st
  
  return useProgressHistory(
    'monthly',
    startDate.toISOString().split('T')[0],
    new Date().toISOString().split('T')[0]
  );
};

/**
 * Get skill-specific progress
 */
export const useSkillProgress = (skillCategory: string) => {
  const { userId } = useAuth();
  
  return useQuery({
    queryKey: [...progressQueryKeys.user(userId!), 'skill', skillCategory],
    queryFn: () => supabaseService.getUserProgress(userId!, 'skill', undefined, undefined, skillCategory),
    enabled: !!userId && !!skillCategory,
    staleTime: 5 * 60 * 1000,
  });
};

// =============================================================================
// PROGRESS MUTATIONS
// =============================================================================

/**
 * Create or update progress entry
 */
export const useUpsertProgress = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: (data: UserProgressInsert) => supabaseService.upsertUserProgress(data),
    onSuccess: (data) => {
      // Invalidate relevant queries
      if (userId) {
        queryClient.invalidateQueries({ queryKey: progressQueryKeys.user(userId) });
      }
    },
    onError: (error) => {
      console.error('Failed to update progress:', error);
    },
  });
};

/**
 * Calculate and update daily progress
 */
export const useCalculateDailyProgress = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: ({ targetDate }: { targetDate?: string } = {}) => 
      supabaseService.calculateDailyProgress(userId!, targetDate),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: progressQueryKeys.user(userId) });
      }
    },
    onError: (error) => {
      console.error('Failed to calculate daily progress:', error);
    },
  });
};

// =============================================================================
// ANALYTICS HOOKS
// =============================================================================

/**
 * Get learning analytics
 */
export const useLearningAnalytics = () => {
  const { userId } = useAuth();
  const progressSummary = useProgressSummary(30);
  const weeklyProgress = useWeeklyProgress();
  const monthlyProgress = useMonthlyProgress();

  return useQuery({
    queryKey: progressQueryKeys.analytics(userId!),
    queryFn: async (): Promise<LearningAnalytics> => {
      const [summary, weekly, monthly] = await Promise.all([
        progressSummary.data,
        weeklyProgress.data,
        monthlyProgress.data,
      ]);

      if (!summary) {
        throw new Error('No progress summary available');
      }

      // Calculate analytics based on available data
      const recentWeekly = weekly?.slice(0, 7) || [];
      const totalSessions = recentWeekly.reduce((sum, day) => sum + (day.sessions_completed || 0), 0);
      const totalDescriptions = recentWeekly.reduce((sum, day) => sum + (day.descriptions_completed || 0), 0);
      const totalPhrases = recentWeekly.reduce((sum, day) => sum + (day.phrases_learned || 0), 0);

      return {
        user_id: userId!,
        overall_performance: {
          total_points: summary.total_points || 0,
          accuracy_rate: (summary.completion_rate || 0) / 100,
          consistency_score: recentWeekly.length / 7, // Days active in last week
          improvement_trend: summary.improvement_trend || 'stable',
        },
        skill_breakdown: {
          vocabulary: summary.top_skills?.vocabulary_recognition || 0,
          grammar: summary.top_skills?.grammar_understanding || 0,
          comprehension: summary.top_skills?.reading_comprehension || 0,
          translation: summary.top_skills?.translation_accuracy || 0,
        },
        recent_activity: {
          sessions_last_week: totalSessions,
          descriptions_completed: totalDescriptions,
          new_phrases_learned: totalPhrases,
        },
        recommendations: {
          focus_areas: summary.recent_achievements || [],
          suggested_difficulty: 'intermediate', // This could be calculated based on performance
          next_milestones: Object.keys(summary.next_milestones || {}),
        },
      };
    },
    enabled: !!userId && !!progressSummary.data,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Track session completion and update progress
 */
export const useTrackSessionCompletion = () => {
  const upsertProgress = useUpsertProgress();
  const calculateDaily = useCalculateDailyProgress();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (sessionData: {
      points_earned: number;
      descriptions_completed: number;
      questions_answered: number;
      questions_correct: number;
      phrases_learned: number;
      time_spent_minutes: number;
    }) => {
      if (!userId) throw new Error('User not authenticated');

      // First update the daily progress calculation
      await calculateDaily.mutateAsync();

      // Then add session-specific progress
      const progressData: UserProgressInsert = {
        user_id: userId,
        progress_type: 'session_summary',
        points_earned: sessionData.points_earned,
        descriptions_completed: sessionData.descriptions_completed,
        questions_answered: sessionData.questions_answered,
        questions_correct: sessionData.questions_correct,
        phrases_learned: sessionData.phrases_learned,
        time_spent_minutes: sessionData.time_spent_minutes,
        accuracy_percentage: sessionData.questions_answered > 0 
          ? (sessionData.questions_correct / sessionData.questions_answered) * 100 
          : 0,
        metadata: {
          session_completed_at: new Date().toISOString(),
          session_type: 'practice',
        },
      };

      return upsertProgress.mutateAsync(progressData);
    },
    onError: (error) => {
      console.error('Failed to track session completion:', error);
    },
  });
};

/**
 * Get progress statistics for dashboard
 */
export const useProgressStats = () => {
  const progressSummary = useProgressSummary(30);
  const weeklyProgress = useWeeklyProgress();
  
  return useQuery({
    queryKey: ['progress-stats', progressSummary.data, weeklyProgress.data],
    queryFn: () => {
      const summary = progressSummary.data;
      const weekly = weeklyProgress.data || [];

      if (!summary) return null;

      // Calculate weekly stats
      const thisWeekSessions = weekly.reduce((sum, day) => sum + (day.sessions_completed || 0), 0);
      const thisWeekPoints = weekly.reduce((sum, day) => sum + (day.points_earned || 0), 0);
      const thisWeekAccuracy = weekly.length > 0 
        ? weekly.reduce((sum, day) => sum + (day.accuracy_percentage || 0), 0) / weekly.length 
        : 0;

      return {
        total_points: summary.total_points || 0,
        current_streak: summary.current_streak || 0,
        completion_rate: summary.completion_rate || 0,
        improvement_trend: summary.improvement_trend || 'stable',
        this_week: {
          sessions: thisWeekSessions,
          points: thisWeekPoints,
          accuracy: Math.round(thisWeekAccuracy * 100) / 100,
        },
        achievements: summary.recent_achievements || [],
        next_milestones: summary.next_milestones || {},
      };
    },
    enabled: !!progressSummary.data,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get streak information
 */
export const useStreakInfo = () => {
  const { userId } = useAuth();
  const weeklyProgress = useWeeklyProgress();

  return useQuery({
    queryKey: ['streak-info', userId, weeklyProgress.data],
    queryFn: () => {
      const weekly = weeklyProgress.data || [];
      if (weekly.length === 0) return { current: 0, longest: 0, today_completed: false };

      // Calculate current streak (consecutive days with activity)
      let currentStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      
      // Sort by date descending
      const sortedWeekly = weekly.sort((a, b) => 
        new Date(b.progress_date).getTime() - new Date(a.progress_date).getTime()
      );

      // Check if today has activity
      const todayCompleted = sortedWeekly.some(day => 
        day.progress_date === today && (day.sessions_completed || 0) > 0
      );

      // Calculate current streak
      for (const day of sortedWeekly) {
        if ((day.sessions_completed || 0) > 0) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Calculate longest streak from available data
      let longestStreak = 0;
      let tempStreak = 0;
      
      for (const day of sortedWeekly.reverse()) {
        if ((day.sessions_completed || 0) > 0) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }

      return {
        current: currentStreak,
        longest: longestStreak,
        today_completed: todayCompleted,
      };
    },
    enabled: !!userId && !!weeklyProgress.data,
    staleTime: 2 * 60 * 1000,
  });
};