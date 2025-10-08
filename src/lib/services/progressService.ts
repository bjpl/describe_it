/**
 * Progress Service - User progress tracking and analytics
 */

import { withRetry, RetryConfig } from "../utils/error-retry";
import { supabaseService } from "../api/supabase";
import { getEnvironment } from "../../config/env";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { logger } from '@/lib/logger';

interface UserProgress {
  userId: string;
  sessionId?: string;
  totalSessions: number;
  totalQuestions: number;
  correctAnswers: number;
  averageAccuracy: number;
  timeSpent: number; // in minutes
  streakDays: number;
  lastActivity: string;
  level: number;
  experiencePoints: number;
  badges: Badge[];
  achievements: Achievement[];
  createdAt: string;
  updatedAt: string;
}

interface SessionProgress {
  id: string;
  userId?: string;
  sessionType: "study" | "quiz" | "review" | "exploration";
  startTime: string;
  endTime?: string;
  duration?: number; // in seconds
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  topicsStudied: string[];
  imagesViewed: string[];
  vocabularyLearned: string[];
  difficultyLevel: "beginner" | "intermediate" | "advanced";
  experienceGained: number;
  metadata?: {
    deviceType?: "mobile" | "desktop" | "tablet";
    userAgent?: string;
    location?: string;
  };
}

interface LearningMetrics {
  dailyStats: DailyStats[];
  weeklyProgress: WeeklyProgress;
  monthlyTrends: MonthlyTrends;
  skillProgress: SkillProgress[];
  learningPatterns: LearningPattern[];
}

interface DailyStats {
  date: string;
  questionsAnswered: number;
  correctAnswers: number;
  timeSpent: number;
  vocabularyLearned: number;
  imagesExplored: number;
  accuracy: number;
  streakMaintained: boolean;
}

interface WeeklyProgress {
  weekStart: string;
  totalQuestions: number;
  averageAccuracy: number;
  totalTimeSpent: number;
  daysActive: number;
  topCategories: string[];
  improvementAreas: string[];
}

interface MonthlyTrends {
  monthStart: string;
  totalSessions: number;
  averageSessionTime: number;
  accuracyTrend: number[]; // daily accuracy for the month
  vocabularyGrowth: number[];
  strongestSkills: string[];
  areasForImprovement: string[];
}

interface SkillProgress {
  skillName: string;
  category: "vocabulary" | "comprehension" | "analysis" | "interpretation";
  currentLevel: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  lastPracticed: string;
  masteryLevel: number; // 0-1 scale
  nextMilestone: number;
  recommendedPractice: string[];
}

interface LearningPattern {
  type:
    | "peak_performance"
    | "difficulty_preference"
    | "learning_speed"
    | "retention_rate";
  description: string;
  data: any;
  confidence: number;
  recommendations: string[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  category: "streak" | "accuracy" | "vocabulary" | "exploration" | "milestone";
  earnedAt: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  progress: number; // 0-100
  target: number;
  isCompleted: boolean;
  completedAt?: string;
  reward?: {
    experiencePoints: number;
    badges?: string[];
  };
}

interface ProgressFilter {
  userId?: string;
  sessionType?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  difficultyLevel?: string[];
  limit?: number;
  offset?: number;
}

export class ProgressService {
  private cache = new Map<string, any>();
  private retryConfig: RetryConfig;
  private readonly defaultTTL = 300000; // 5 minutes
  private readonly maxCacheSize = 500;

  constructor() {
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 8000,
      backoffFactor: 2,
      shouldRetry: (error: Error) => {
        const message = error.message.toLowerCase();
        return (
          message.includes("503") ||
          message.includes("502") ||
          message.includes("timeout")
        );
      },
    };
  }

  /**
   * Start a new session
   */
  public async startSession(config: {
    userId?: string;
    sessionType: SessionProgress["sessionType"];
    difficultyLevel: SessionProgress["difficultyLevel"];
    metadata?: SessionProgress["metadata"];
  }): Promise<string> {
    const sessionId = this.generateId();
    const sessionData: SessionProgress = {
      id: sessionId,
      userId: config.userId,
      sessionType: config.sessionType,
      startTime: new Date().toISOString(),
      questionsAnswered: 0,
      correctAnswers: 0,
      accuracy: 0,
      topicsStudied: [],
      imagesViewed: [],
      vocabularyLearned: [],
      difficultyLevel: config.difficultyLevel,
      experienceGained: 0,
      metadata: config.metadata,
    };

    try {
      await this.saveSessionToDatabase(sessionData);
    } catch (error) {
      logger.warn("Failed to save session to database:", { error });
    }

    return sessionId;
  }

  /**
   * Update session progress
   */
  public async updateSessionProgress(
    sessionId: string,
    updates: {
      questionsAnswered?: number;
      correctAnswers?: number;
      topicsStudied?: string[];
      imagesViewed?: string[];
      vocabularyLearned?: string[];
    },
  ): Promise<void> {
    try {
      await withRetry(async () => {
        const client = supabaseService.getClient();
        if (client) {
          const accuracy =
            updates.questionsAnswered && updates.questionsAnswered > 0
              ? (updates.correctAnswers || 0) / updates.questionsAnswered
              : 0;

          const { error } = await client
            .from("session_progress")
            .update({
              ...updates,
              accuracy,
              updatedAt: new Date().toISOString(),
            })
            .eq("id", sessionId);

          if (error) throw error;
        }
      }, this.retryConfig);

      this.clearCacheByPattern(`session_${sessionId}`);
    } catch (error) {
      logger.warn("Failed to update session progress:", { error });
    }
  }

  /**
   * End a session
   */
  public async endSession(sessionId: string): Promise<SessionProgress | null> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) return null;

      const endTime = new Date().toISOString();
      const duration = session.startTime
        ? Math.floor(
            (new Date(endTime).getTime() -
              new Date(session.startTime).getTime()) /
              1000,
          )
        : 0;

      const experienceGained = this.calculateExperienceGained(session);

      const updatedSession = await withRetry(async () => {
        const client = supabaseService.getClient();
        if (client) {
          const { data, error } = await client
            .from("session_progress")
            .update({
              endTime,
              duration,
              experienceGained,
            })
            .eq("id", sessionId)
            .select()
            .single();

          if (error) throw error;
          return data;
        }
        return null;
      }, this.retryConfig);

      // Update user progress
      if (session.userId) {
        await this.updateUserProgress(session.userId, {
          sessionCompleted: true,
          experienceGained,
          questionsAnswered: session.questionsAnswered,
          correctAnswers: session.correctAnswers,
          timeSpent: Math.floor(duration / 60), // convert to minutes
        });
      }

      this.clearCacheByPattern("progress_");
      return updatedSession as unknown as SessionProgress | null;
    } catch (error) {
      logger.warn("Failed to end session:", { error });
      return null;
    }
  }

  /**
   * Get user progress
   */
  public async getUserProgress(userId: string): Promise<UserProgress | null> {
    const cacheKey = `user_progress_${userId}`;
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const result = await withRetry(async () => {
        const client = supabaseService.getClient();
        if (client) {
          // TODO: user_progress table doesn't exist - using learning_progress instead
          const { data, error } = await client
            .from("learning_progress")
            .select("*")
            .eq("user_id", userId)
            .single();

          if (error && error.code !== "PGRST116") throw error; // PGRST116 is "not found"
          return data;
        }
        return null;
      }, this.retryConfig);

      // If no progress exists, create initial progress
      if (!result) {
        const initialProgress = await this.createInitialProgress(userId);
        this.setCache(cacheKey, initialProgress);
        return initialProgress;
      }

      this.setCache(cacheKey, result);
      return result as unknown as UserProgress | null;
    } catch (error) {
      logger.warn("Failed to get user progress:", { error });
      return null;
    }
  }

  /**
   * Get learning metrics
   */
  public async getLearningMetrics(
    userId: string,
    timeframe: "week" | "month" | "all" = "week",
  ): Promise<LearningMetrics> {
    const cacheKey = `metrics_${userId}_${timeframe}`;
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const [dailyStats, sessions, userProgress] = await Promise.all([
        this.getDailyStats(userId, timeframe),
        this.getUserSessions(userId, {
          dateRange: this.getDateRange(timeframe),
        }),
        this.getUserProgress(userId),
      ]);

      const metrics: LearningMetrics = {
        dailyStats,
        weeklyProgress: await this.calculateWeeklyProgress(sessions),
        monthlyTrends: await this.calculateMonthlyTrends(sessions),
        skillProgress: await this.calculateSkillProgress(userId),
        learningPatterns: await this.identifyLearningPatterns(
          sessions,
          userProgress,
        ),
      };

      this.setCache(cacheKey, metrics, 600000); // 10 minutes
      return metrics;
    } catch (error) {
      logger.warn("Failed to get learning metrics:", { error });
      return {
        dailyStats: [],
        weeklyProgress: {
          weekStart: new Date().toISOString(),
          totalQuestions: 0,
          averageAccuracy: 0,
          totalTimeSpent: 0,
          daysActive: 0,
          topCategories: [],
          improvementAreas: [],
        },
        monthlyTrends: {
          monthStart: new Date().toISOString(),
          totalSessions: 0,
          averageSessionTime: 0,
          accuracyTrend: [],
          vocabularyGrowth: [],
          strongestSkills: [],
          areasForImprovement: [],
        },
        skillProgress: [],
        learningPatterns: [],
      };
    }
  }

  /**
   * Get user sessions
   */
  public async getUserSessions(
    userId: string,
    filter: ProgressFilter = {},
  ): Promise<SessionProgress[]> {
    const cacheKey = `sessions_${userId}_${this.hashString(safeStringify(filter))}`;
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const result = await withRetry(async () => {
        const client = supabaseService.getClient();
        if (client) {
          let query = client
            .from("session_progress")
            .select("*")
            .eq("userId", userId);

          if (filter.sessionType?.length) {
            query = query.in("sessionType", filter.sessionType);
          }

          if (filter.dateRange) {
            query = query.gte("startTime", filter.dateRange.start);
            query = query.lte("startTime", filter.dateRange.end);
          }

          if (filter.difficultyLevel?.length) {
            query = query.in("difficultyLevel", filter.difficultyLevel);
          }

          if (filter.offset) {
            query = query.range(
              filter.offset,
              filter.offset + (filter.limit || 50) - 1,
            );
          } else if (filter.limit) {
            query = query.limit(filter.limit);
          }

          const { data, error } = await query.order("startTime", {
            ascending: false,
          });

          if (error) throw error;
          return data || [];
        }
        return [];
      }, this.retryConfig);

      this.setCache(cacheKey, result);
      return result as unknown as SessionProgress[];
    } catch (error) {
      logger.warn("Failed to get user sessions:", { error });
      return [];
    }
  }

  /**
   * Award badge
   */
  public async awardBadge(userId: string, badgeId: string): Promise<boolean> {
    try {
      const userProgress = await this.getUserProgress(userId);
      if (!userProgress) return false;

      // Check if badge already exists
      const existingBadge = userProgress.badges.find((b) => b.id === badgeId);
      if (existingBadge) return false;

      const badge = this.getBadgeById(badgeId);
      if (!badge) return false;

      const updatedBadges = [
        ...userProgress.badges,
        { ...badge, earnedAt: new Date().toISOString() },
      ];

      await this.updateUserProgress(userId, {
        badges: updatedBadges,
        experienceGained:
          badge.rarity === "legendary"
            ? 500
            : badge.rarity === "epic"
              ? 200
              : 50,
      });

      this.clearCacheByPattern(`user_progress_${userId}`);
      return true;
    } catch (error) {
      logger.warn("Failed to award badge:", { error });
      return false;
    }
  }

  /**
   * Update achievement progress
   */
  public async updateAchievementProgress(
    userId: string,
    achievementId: string,
    progress: number,
  ): Promise<void> {
    try {
      const userProgress = await this.getUserProgress(userId);
      if (!userProgress) return;

      const updatedAchievements = userProgress.achievements.map(
        (achievement) => {
          if (achievement.id === achievementId) {
            const isNowCompleted =
              progress >= achievement.target && !achievement.isCompleted;
            return {
              ...achievement,
              progress: Math.min(progress, achievement.target),
              isCompleted: progress >= achievement.target,
              completedAt: isNowCompleted
                ? new Date().toISOString()
                : achievement.completedAt,
            };
          }
          return achievement;
        },
      );

      await this.updateUserProgress(userId, {
        achievements: updatedAchievements,
      });

      this.clearCacheByPattern(`user_progress_${userId}`);
    } catch (error) {
      logger.warn("Failed to update achievement progress:", { error });
    }
  }

  // Private helper methods
  private async createInitialProgress(userId: string): Promise<UserProgress> {
    const initialProgress: UserProgress = {
      userId,
      totalSessions: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      averageAccuracy: 0,
      timeSpent: 0,
      streakDays: 0,
      lastActivity: new Date().toISOString(),
      level: 1,
      experiencePoints: 0,
      badges: [],
      achievements: this.getInitialAchievements(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const client = supabaseService.getClient();
      if (client) {
        // TODO: user_progress table doesn't exist - using learning_progress instead
        await client.from("learning_progress").insert([initialProgress]);
      }
    } catch (error) {
      logger.warn("Failed to save initial progress:", { error });
    }

    return initialProgress;
  }

  private async updateUserProgress(
    userId: string,
    updates: {
      sessionCompleted?: boolean;
      experienceGained?: number;
      questionsAnswered?: number;
      correctAnswers?: number;
      timeSpent?: number;
      badges?: Badge[];
      achievements?: Achievement[];
    },
  ): Promise<void> {
    const currentProgress = await this.getUserProgress(userId);
    if (!currentProgress) return;

    const newTotalQuestions =
      currentProgress.totalQuestions + (updates.questionsAnswered || 0);
    const newCorrectAnswers =
      currentProgress.correctAnswers + (updates.correctAnswers || 0);
    const newAverageAccuracy =
      newTotalQuestions > 0 ? newCorrectAnswers / newTotalQuestions : 0;
    const newExperiencePoints =
      currentProgress.experiencePoints + (updates.experienceGained || 0);
    const newLevel = Math.floor(newExperiencePoints / 1000) + 1;

    const updatedProgress = {
      ...currentProgress,
      totalSessions: updates.sessionCompleted
        ? currentProgress.totalSessions + 1
        : currentProgress.totalSessions,
      totalQuestions: newTotalQuestions,
      correctAnswers: newCorrectAnswers,
      averageAccuracy: newAverageAccuracy,
      timeSpent: currentProgress.timeSpent + (updates.timeSpent || 0),
      experiencePoints: newExperiencePoints,
      level: newLevel,
      lastActivity: new Date().toISOString(),
      badges: updates.badges || currentProgress.badges,
      achievements: updates.achievements || currentProgress.achievements,
      updatedAt: new Date().toISOString(),
    };

    try {
      const client = supabaseService.getClient();
      if (client) {
        // TODO: user_progress table doesn't exist - using learning_progress instead
        await client
          .from("learning_progress")
          .update(updatedProgress)
          .eq("user_id", userId);
      }
    } catch (error) {
      logger.warn("Failed to update user progress:", { error });
    }
  }

  private async getSessionById(
    sessionId: string,
  ): Promise<SessionProgress | null> {
    try {
      const client = supabaseService.getClient();
      if (client) {
        const { data, error } = await client
          .from("session_progress")
          .select("*")
          .eq("id", sessionId)
          .single();

        if (error) return null;
        return data;
      }
    } catch (error) {
      logger.warn("Failed to get session:", { error });
    }
    return null;
  }

  private async saveSessionToDatabase(session: SessionProgress): Promise<void> {
    const client = supabaseService.getClient();
    if (client) {
      const { error } = await client
        .from("session_progress")
        .insert([session]);

      if (error) {
        logger.warn("Failed to save session to database:", error);
      }
    }
  }

  private calculateExperienceGained(session: SessionProgress): number {
    const basePoints = session.questionsAnswered * 10;
    const accuracyBonus = Math.floor(session.accuracy * 50);
    const difficultyMultiplier =
      {
        beginner: 1,
        intermediate: 1.5,
        advanced: 2,
      }[session.difficultyLevel] || 1;

    return Math.floor((basePoints + accuracyBonus) * difficultyMultiplier);
  }

  private async getDailyStats(
    userId: string,
    timeframe: string,
  ): Promise<DailyStats[]> {
    // Implementation would query database for daily statistics
    // This is a simplified version
    return [];
  }

  private async calculateWeeklyProgress(
    sessions: SessionProgress[],
  ): Promise<WeeklyProgress> {
    const weekStart = this.getWeekStart().toISOString();
    const weekSessions = sessions.filter((s) => s.startTime >= weekStart);

    return {
      weekStart,
      totalQuestions: weekSessions.reduce(
        (sum, s) => sum + s.questionsAnswered,
        0,
      ),
      averageAccuracy:
        weekSessions.length > 0
          ? weekSessions.reduce((sum, s) => sum + s.accuracy, 0) /
            weekSessions.length
          : 0,
      totalTimeSpent: weekSessions.reduce(
        (sum, s) => sum + (s.duration || 0),
        0,
      ),
      daysActive: new Set(weekSessions.map((s) => s.startTime.split("T")[0]))
        .size,
      topCategories: [],
      improvementAreas: [],
    };
  }

  private async calculateMonthlyTrends(
    sessions: SessionProgress[],
  ): Promise<MonthlyTrends> {
    const monthStart = this.getMonthStart().toISOString();
    const monthSessions = sessions.filter((s) => s.startTime >= monthStart);

    return {
      monthStart,
      totalSessions: monthSessions.length,
      averageSessionTime:
        monthSessions.length > 0
          ? monthSessions.reduce((sum, s) => sum + (s.duration || 0), 0) /
            monthSessions.length
          : 0,
      accuracyTrend: [],
      vocabularyGrowth: [],
      strongestSkills: [],
      areasForImprovement: [],
    };
  }

  private async calculateSkillProgress(
    userId: string,
  ): Promise<SkillProgress[]> {
    // Implementation would analyze user performance across different skill areas
    return [];
  }

  private async identifyLearningPatterns(
    sessions: SessionProgress[],
    userProgress: UserProgress | null,
  ): Promise<LearningPattern[]> {
    // Implementation would analyze patterns in learning behavior
    return [];
  }

  private getInitialAchievements(): Achievement[] {
    return [
      {
        id: "first_question",
        name: "First Question",
        description: "Answer your first question",
        category: "milestone",
        progress: 0,
        target: 1,
        isCompleted: false,
        reward: { experiencePoints: 50 },
      },
      {
        id: "vocabulary_collector",
        name: "Vocabulary Collector",
        description: "Learn 50 new vocabulary words",
        category: "vocabulary",
        progress: 0,
        target: 50,
        isCompleted: false,
        reward: { experiencePoints: 200 },
      },
    ];
  }

  private getBadgeById(badgeId: string): Badge | null {
    const badges: Badge[] = [
      {
        id: "accuracy_master",
        name: "Accuracy Master",
        description: "Achieve 90% accuracy in a session",
        category: "accuracy",
        earnedAt: "",
        rarity: "rare",
      },
      {
        id: "streak_champion",
        name: "Streak Champion",
        description: "Maintain a 7-day learning streak",
        category: "streak",
        earnedAt: "",
        rarity: "epic",
      },
    ];

    return badges.find((b) => b.id === badgeId) || null;
  }

  private getDateRange(timeframe: string): { start: string; end: string } {
    const now = new Date();
    const start = new Date();

    switch (timeframe) {
      case "week":
        start.setDate(now.getDate() - 7);
        break;
      case "month":
        start.setMonth(now.getMonth() - 1);
        break;
      default:
        start.setFullYear(2000); // All time
    }

    return {
      start: start.toISOString(),
      end: now.toISOString(),
    };
  }

  private getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    return new Date(now.setDate(diff));
  }

  private getMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Utility methods
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(
    key: string,
    data: any,
    ttl: number = this.defaultTTL,
  ): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private clearCacheByPattern(pattern: string): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private generateId(): string {
    return `prog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// Export singleton instance
export const progressService = new ProgressService();
export default progressService;
