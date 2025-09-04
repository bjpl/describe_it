import { useState, useEffect, useCallback } from "react";

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

const STORAGE_KEYS = {
  PROGRESS_STATS: "describe_it_progress_stats",
  STREAK_INFO: "describe_it_streak_info",
  ANALYTICS: "describe_it_learning_analytics",
  SESSION_DATA: "describe_it_session_data",
  DAILY_PROGRESS: "describe_it_daily_progress",
};

// Helper to safely parse JSON from localStorage
function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Helper to save to localStorage
function setStorageItem(key: string, value: any): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
}

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

  useEffect(() => {
    // Load session data from localStorage
    const sessionData = getStorageItem(STORAGE_KEYS.SESSION_DATA, {
      total_sessions: 0,
      total_points: 0,
      accuracy_history: [],
      weekly_points: [],
      weekly_sessions: [],
    });

    const dailyProgress = getStorageItem(STORAGE_KEYS.DAILY_PROGRESS, {
      date: new Date().toDateString(),
      points: 0,
      sessions: 0,
      correct: 0,
      total: 0,
    });

    // Calculate this week's stats
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // If daily progress is from today, use it; otherwise reset
    const isToday = dailyProgress.date === today.toDateString();
    const todayPoints = isToday ? dailyProgress.points : 0;
    const todaySessions = isToday ? dailyProgress.sessions : 0;
    const todayAccuracy =
      dailyProgress.total > 0
        ? (dailyProgress.correct / dailyProgress.total) * 100
        : 0;

    // Calculate completion rate from accuracy history
    const completionRate =
      sessionData.accuracy_history.length > 0
        ? sessionData.accuracy_history.reduce(
            (a: number, b: number) => a + b,
            0,
          ) / sessionData.accuracy_history.length
        : 0;

    // Determine improvement trend
    const trend = calculateTrend(sessionData.accuracy_history || []);

    // Calculate achievements
    const achievements = calculateAchievements({
      total_sessions: sessionData.total_sessions,
      streak_current: getStorageItem(STORAGE_KEYS.STREAK_INFO, { current: 0 })
        .current,
      accuracy_rate: completionRate,
      vocabulary_mastered: (sessionData as any).vocabulary_mastered || 0,
    });

    // Calculate next milestones
    const nextMilestones: Record<string, any> = {};
    const pointsToNextLevel =
      Math.ceil(sessionData.total_points / 100 + 1) * 100;
    nextMilestones.next_level = `${pointsToNextLevel} points`;

    if (sessionData.total_sessions < 10) {
      nextMilestones.next_achievement = "10 sessions for Regular Learner";
    } else if (sessionData.total_sessions < 50) {
      nextMilestones.next_achievement = "50 sessions for Dedicated Student";
    } else if (sessionData.total_sessions < 100) {
      nextMilestones.next_achievement = "100 sessions for Century Club";
    }

    const progressStats: ProgressStats = {
      total_points: sessionData.total_points || 0,
      completion_rate: completionRate,
      improvement_trend: trend,
      this_week: {
        points: todayPoints,
        sessions: todaySessions,
        accuracy: todayAccuracy,
      },
      achievements,
      next_milestones: nextMilestones,
    };

    setData(progressStats);
    setIsLoading(false);
  }, []);

  return { data, isLoading };
}

export function useStreakInfo() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<StreakInfo | null>(null);

  useEffect(() => {
    const storedStreak = getStorageItem(STORAGE_KEYS.STREAK_INFO, {
      current: 0,
      longest: 0,
      last_activity: null,
      today_completed: false,
    });

    const today = new Date().toDateString();
    const lastActivity = storedStreak.last_activity;

    // Check if streak should be reset
    if (lastActivity) {
      const lastDate = new Date(lastActivity);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (
        lastDate.toDateString() !== today &&
        lastDate.toDateString() !== yesterday.toDateString()
      ) {
        // Streak broken - reset current but keep longest
        storedStreak.current = 0;
        storedStreak.today_completed = false;
      } else if (lastDate.toDateString() === today) {
        storedStreak.today_completed = true;
      }
    }

    const streakInfo: StreakInfo = {
      current: storedStreak.current,
      longest: Math.max(storedStreak.longest, storedStreak.current),
      today_completed: storedStreak.today_completed,
    };

    // Save updated streak info
    setStorageItem(STORAGE_KEYS.STREAK_INFO, {
      ...storedStreak,
      longest: streakInfo.longest,
    });

    setData(streakInfo);
    setIsLoading(false);
  }, []);

  return { data, isLoading };
}

export function useLearningAnalytics() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<LearningAnalytics | null>(null);

  useEffect(() => {
    // Load analytics from localStorage
    const analytics = getStorageItem(STORAGE_KEYS.ANALYTICS, {
      skill_scores: {
        vocabulary: [],
        grammar: [],
        comprehension: [],
        speaking: [],
      },
      recent_sessions: [],
      phrases_learned: [],
    });

    // Calculate skill breakdown (average of recent scores)
    const skillBreakdown: Record<string, number> = {};
    Object.entries(analytics.skill_scores).forEach(([skill, scores]) => {
      const recentScores = (scores as number[]).slice(-10); // Last 10 scores
      if (recentScores.length > 0) {
        skillBreakdown[skill] =
          recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      } else {
        skillBreakdown[skill] = 0;
      }
    });

    // Calculate recent activity (last 7 days)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentSessions = analytics.recent_sessions.filter(
      (session: any) => new Date(session.date).getTime() > weekAgo,
    );
    const recentPhrases = analytics.phrases_learned.filter(
      (phrase: any) => new Date(phrase.date).getTime() > weekAgo,
    );

    // Determine focus areas based on weakest skills
    const sortedSkills = Object.entries(skillBreakdown)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3);

    const focusAreas = sortedSkills.map(([skill, score]) => {
      if (skill === "vocabulary" && score < 70)
        return "Expand vocabulary practice";
      if (skill === "grammar" && score < 70) return "Grammar patterns review";
      if (skill === "comprehension" && score < 70)
        return "Reading comprehension exercises";
      if (skill === "speaking" && score < 70) return "Pronunciation practice";
      return `Improve ${skill}`;
    });

    const learningAnalytics: LearningAnalytics = {
      skill_breakdown: skillBreakdown,
      recent_activity: {
        sessions_last_week: recentSessions.length,
        descriptions_completed: recentSessions.reduce(
          (sum: number, s: any) => sum + (s.descriptions || 0),
          0,
        ),
        new_phrases_learned: recentPhrases.length,
      },
      recommendations: {
        focus_areas: focusAreas,
      },
    };

    setData(learningAnalytics);
    setIsLoading(false);
  }, []);

  return { data, isLoading };
}

export function useProgressSummary() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ProgressSummary | null>(null);

  useEffect(() => {
    const sessionData = getStorageItem(STORAGE_KEYS.SESSION_DATA, {
      total_sessions: 0,
      total_descriptions: 0,
      total_correct: 0,
      total_attempts: 0,
      vocabulary_mastered: 0,
    });

    const accuracyRate =
      sessionData.total_attempts > 0
        ? (sessionData.total_correct / sessionData.total_attempts) * 100
        : 0;

    const summary: ProgressSummary = {
      total_sessions: sessionData.total_sessions || 0,
      total_descriptions: sessionData.total_descriptions || 0,
      accuracy_rate: accuracyRate,
      vocabulary_mastered: (sessionData as any).vocabulary_mastered || 0,
    };

    setData(summary);
    setIsLoading(false);
  }, []);

  return { data, isLoading };
}

// Export function to update progress when user completes activities
export function updateProgress(
  type: "session" | "description" | "phrase" | "quiz",
  result?: any,
) {
  const sessionData = getStorageItem(STORAGE_KEYS.SESSION_DATA, {
    total_sessions: 0,
    total_points: 0,
    total_descriptions: 0,
    total_correct: 0,
    total_attempts: 0,
    vocabulary_mastered: 0,
    accuracy_history: [],
    weekly_points: [],
    weekly_sessions: [],
  });

  const dailyProgress = getStorageItem(STORAGE_KEYS.DAILY_PROGRESS, {
    date: new Date().toDateString(),
    points: 0,
    sessions: 0,
    correct: 0,
    total: 0,
  });

  const today = new Date().toDateString();

  // Reset daily progress if it's a new day
  if (dailyProgress.date !== today) {
    dailyProgress.date = today;
    dailyProgress.points = 0;
    dailyProgress.sessions = 0;
    dailyProgress.correct = 0;
    dailyProgress.total = 0;
  }

  switch (type) {
    case "session":
      sessionData.total_sessions += 1;
      sessionData.total_points += 10;
      dailyProgress.sessions += 1;
      dailyProgress.points += 10;

      // Update streak
      const streakInfo = getStorageItem(STORAGE_KEYS.STREAK_INFO, {
        current: 0,
        longest: 0,
        last_activity: null,
        today_completed: false,
      });

      if (!streakInfo.today_completed) {
        streakInfo.current += 1;
        streakInfo.longest = Math.max(streakInfo.longest, streakInfo.current);
        streakInfo.today_completed = true;
      }
      (streakInfo as any).last_activity = today;
      setStorageItem(STORAGE_KEYS.STREAK_INFO, streakInfo);
      break;

    case "description":
      sessionData.total_descriptions += 1;
      sessionData.total_points += 5;
      dailyProgress.points += 5;
      break;

    case "phrase":
      sessionData.vocabulary_mastered += 1;
      sessionData.total_points += 3;
      dailyProgress.points += 3;

      // Update analytics
      const analytics = getStorageItem(STORAGE_KEYS.ANALYTICS, {
        skill_scores: {
          vocabulary: [],
          grammar: [],
          comprehension: [],
          speaking: [],
        },
        recent_sessions: [],
        phrases_learned: [],
      });
      (analytics as any).phrases_learned.push({ date: new Date(), phrase: result });
      setStorageItem(STORAGE_KEYS.ANALYTICS, analytics);
      break;

    case "quiz":
      if (result) {
        sessionData.total_attempts += 1;
        dailyProgress.total += 1;
        if (result.correct) {
          sessionData.total_correct += 1;
          dailyProgress.correct += 1;
          sessionData.total_points += 2;
          dailyProgress.points += 2;
        }

        // Update accuracy history
        const accuracy = result.correct ? 100 : 0;
        (sessionData as any).accuracy_history.push(accuracy);
        if ((sessionData as any).accuracy_history.length > 100) {
          (sessionData as any).accuracy_history.shift(); // Keep only last 100
        }
      }
      break;
  }

  setStorageItem(STORAGE_KEYS.SESSION_DATA, sessionData);
  setStorageItem(STORAGE_KEYS.DAILY_PROGRESS, dailyProgress);
}
