import { useState, useEffect, useCallback } from "react";
import { logger } from '@/lib/logger';
import { APIClient } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';

interface ProgressStats {
  total_points: number;
  completion_rate: number;
  improvement_trend: "improving" | "stable" | "declining";
  this_week: {
    points: number;
    sessions: number;
    accuracy: number;
  };
  achievements: string[];
  next_milestones: Record<string, any>;
}

interface StreakInfo {
  current: number;
  longest: number;
  today_completed: boolean;
}

interface LearningAnalytics {
  skill_breakdown: Record<string, number>;
  recent_activity: {
    sessions_last_week: number;
    descriptions_completed: number;
    new_phrases_learned: number;
  };
  recommendations: {
    focus_areas: string[];
  };
}

interface ProgressSummary {
  total_sessions: number;
  total_descriptions: number;
  accuracy_rate: number;
  vocabulary_mastered: number;
}

// Removed localStorage helpers - now using database API

// Calculate trend based on historical data
function calculateTrend(
  history: number[],
): "improving" | "stable" | "declining" {
  if (history.length < 2) return "stable";

  const recent = history.slice(-7);
  const previous = history.slice(-14, -7);

  if (previous.length === 0) return "stable";

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

  const difference = recentAvg - previousAvg;
  const threshold = previousAvg * 0.1; // 10% change threshold

  if (difference > threshold) return "improving";
  if (difference < -threshold) return "declining";
  return "stable";
}

// Get achievements based on progress
function calculateAchievements(stats: any): string[] {
  const achievements: string[] = [];

  if (stats.total_sessions >= 1) achievements.push("First Session");
  if (stats.total_sessions >= 10) achievements.push("Regular Learner");
  if (stats.total_sessions >= 50) achievements.push("Dedicated Student");
  if (stats.total_sessions >= 100) achievements.push("Century Club");

  if (stats.streak_current >= 3) achievements.push("3 Day Streak");
  if (stats.streak_current >= 7) achievements.push("Week Warrior");
  if (stats.streak_current >= 30) achievements.push("Monthly Master");

  if (stats.accuracy_rate >= 80) achievements.push("Accuracy Expert");
  if (stats.accuracy_rate >= 90) achievements.push("Precision Master");

  if (stats.vocabulary_mastered >= 50) achievements.push("Vocabulary Builder");
  if (stats.vocabulary_mastered >= 100) achievements.push("Word Wizard");
  if (stats.vocabulary_mastered >= 500) achievements.push("Lexicon Legend");

  return achievements;
}

export function useProgressStats() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ProgressStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchProgressStats = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await APIClient.getProgressStats(user.id);

        if (response.error) {
          throw new Error(response.error.message);
        }

        if (response.data) {
          const progressStats: ProgressStats = {
            total_points: response.data.total_points || 0,
            completion_rate: response.data.completion_rate || 0,
            improvement_trend: response.data.improvement_trend || "stable",
            this_week: {
              points: response.data.this_week?.points || 0,
              sessions: response.data.this_week?.sessions || 0,
              accuracy: response.data.this_week?.accuracy || 0,
            },
            achievements: response.data.achievements || [],
            next_milestones: response.data.next_milestones || {},
          };

          setData(progressStats);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load progress stats';
        logger.error('Failed to fetch progress stats:', err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgressStats();
  }, [user?.id]);

  return { data, isLoading, error };
}

export function useStreakInfo() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<StreakInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStreakInfo = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await APIClient.getStreakInfo(user.id);

        if (response.error) {
          throw new Error(response.error.message);
        }

        if (response.data) {
          setData({
            current: response.data.current,
            longest: response.data.longest,
            today_completed: response.data.today_completed,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load streak info';
        logger.error('Failed to fetch streak info:', err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreakInfo();
  }, [user?.id]);

  return { data, isLoading, error };
}

export function useLearningAnalytics() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<LearningAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLearningAnalytics = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await APIClient.getLearningAnalytics(user.id);

        if (response.error) {
          throw new Error(response.error.message);
        }

        if (response.data) {
          setData({
            skill_breakdown: response.data.skill_breakdown || {},
            recent_activity: {
              sessions_last_week: response.data.recent_activity?.sessions_last_week || 0,
              descriptions_completed: response.data.recent_activity?.descriptions_completed || 0,
              new_phrases_learned: response.data.recent_activity?.new_phrases_learned || 0,
            },
            recommendations: {
              focus_areas: response.data.recommendations?.focus_areas || [],
            },
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load learning analytics';
        logger.error('Failed to fetch learning analytics:', err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLearningAnalytics();
  }, [user?.id]);

  return { data, isLoading, error };
}

export function useProgressSummary() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchProgressSummary = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await APIClient.getProgressStats(user.id);

        if (response.error) {
          throw new Error(response.error.message);
        }

        if (response.data) {
          const summary: ProgressSummary = {
            total_sessions: response.data.total_sessions || 0,
            total_descriptions: response.data.total_descriptions || 0,
            accuracy_rate: response.data.accuracy_rate || 0,
            vocabulary_mastered: response.data.vocabulary_mastered || 0,
          };

          setData(summary);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load progress summary';
        logger.error('Failed to fetch progress summary:', err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgressSummary();
  }, [user?.id]);

  return { data, isLoading, error };
}

// Export function to update progress when user completes activities
export async function updateProgress(
  type: "session" | "description" | "phrase" | "quiz",
  result?: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await APIClient.updateProgressStats(type, result);

    if (response.error) {
      throw new Error(response.error.message);
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to update progress';
    logger.error('Failed to update progress:', err);
    return { success: false, error: errorMessage };
  }
}
