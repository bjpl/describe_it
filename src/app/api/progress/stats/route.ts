/**
 * GET /api/progress/stats - Get user progress statistics
 * Returns overall stats including points, completion rate, and achievements
 */

import { NextRequest, NextResponse } from "next/server";
import { withBasicAuth } from "@/lib/middleware/withAuth";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";
import { DatabaseService } from "@/lib/supabase";
import { apiLogger } from "@/lib/logger";
import { asLogContext } from "@/lib/utils/typeGuards";

export const runtime = "nodejs";

interface ProgressStats {
  total_points: number;
  completion_rate: number;
  this_week: {
    sessions_completed: number;
    phrases_learned: number;
    time_spent_minutes: number;
    accuracy: number;
  };
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    unlocked_at: string;
    icon: string;
  }>;
  improvement_trend: "improving" | "stable" | "declining";
  next_milestones: Array<{
    name: string;
    description: string;
    progress: number;
    target: number;
  }>;
}

/**
 * Calculate user progress statistics from database
 */
async function calculateProgressStats(userId: string): Promise<ProgressStats> {
  try {
    // Get user data
    const user = await DatabaseService.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get recent sessions (last 7 days)
    const allSessions = await DatabaseService.getUserSessions(userId, 100);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const thisWeekSessions = allSessions.filter(session =>
      new Date(session.started_at) >= oneWeekAgo && session.status === 'completed'
    );

    // Get learning progress
    const learningProgress = await DatabaseService.getLearningProgress(userId, 1000);

    // Calculate weekly stats
    const weeklyStats = {
      sessions_completed: thisWeekSessions.length,
      phrases_learned: learningProgress.filter(p =>
        new Date(p.created_at) >= oneWeekAgo
      ).length,
      time_spent_minutes: Math.round(
        thisWeekSessions.reduce((sum, s) => sum + (s.time_spent || 0), 0) / 60
      ),
      accuracy: thisWeekSessions.length > 0
        ? Math.round(
            thisWeekSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) /
            thisWeekSessions.length
          )
        : 0
    };

    // Calculate completion rate (mastered phrases / total phrases)
    const masteredCount = learningProgress.filter(p => p.mastery_level >= 0.8).length;
    const completionRate = learningProgress.length > 0
      ? Math.round((masteredCount / learningProgress.length) * 100)
      : 0;

    // Calculate improvement trend
    const recentSessions = allSessions.slice(0, 5);
    const olderSessions = allSessions.slice(5, 10);
    const recentAvgAccuracy = recentSessions.length > 0
      ? recentSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / recentSessions.length
      : 0;
    const olderAvgAccuracy = olderSessions.length > 0
      ? olderSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / olderSessions.length
      : 0;

    let improvementTrend: "improving" | "stable" | "declining" = "stable";
    if (recentAvgAccuracy > olderAvgAccuracy + 5) {
      improvementTrend = "improving";
    } else if (recentAvgAccuracy < olderAvgAccuracy - 5) {
      improvementTrend = "declining";
    }

    // Generate achievements
    const achievements = [];

    if (user.current_streak >= 7) {
      achievements.push({
        id: "streak_7",
        name: "Week Warrior",
        description: "Maintained a 7-day learning streak",
        unlocked_at: user.last_active_at || user.created_at,
        icon: "🔥"
      });
    }

    if (user.total_points >= 1000) {
      achievements.push({
        id: "points_1000",
        name: "Point Master",
        description: "Earned 1000 total points",
        unlocked_at: user.last_active_at || user.created_at,
        icon: "⭐"
      });
    }

    if (masteredCount >= 50) {
      achievements.push({
        id: "phrases_50",
        name: "Vocabulary Builder",
        description: "Mastered 50 phrases",
        unlocked_at: user.last_active_at || user.created_at,
        icon: "📚"
      });
    }

    // Generate next milestones
    const nextMilestones = [
      {
        name: "Next Achievement Level",
        description: "Reach 5000 total points",
        progress: user.total_points,
        target: 5000
      },
      {
        name: "Vocabulary Master",
        description: "Master 100 phrases",
        progress: masteredCount,
        target: 100
      },
      {
        name: "Consistency Champion",
        description: "Maintain a 30-day streak",
        progress: user.current_streak,
        target: 30
      }
    ];

    return {
      total_points: user.total_points,
      completion_rate: completionRate,
      this_week: weeklyStats,
      achievements,
      improvement_trend: improvementTrend,
      next_milestones: nextMilestones
    };
  } catch (error) {
    apiLogger.error("Error calculating progress stats:", asLogContext(error));
    throw error;
  }
}

/**
 * GET handler for progress stats endpoint
 */
async function handleGetStats(request: AuthenticatedRequest) {
  const startTime = performance.now();
  const userId = request.user?.id;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const stats = await calculateProgressStats(userId);
    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: stats,
        metadata: {
          responseTime: `${responseTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
          userId
        }
      },
      {
        headers: {
          "X-Response-Time": `${responseTime.toFixed(2)}ms`,
          "Cache-Control": "private, max-age=300" // Cache for 5 minutes
        }
      }
    );
  } catch (error) {
    const responseTime = performance.now() - startTime;
    apiLogger.error("Failed to get progress stats:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve progress statistics",
        message: "An error occurred while calculating your progress. Please try again."
      },
      {
        status: 500,
        headers: {
          "Retry-After": "30",
          "X-Response-Time": `${responseTime.toFixed(2)}ms`
        }
      }
    );
  }
}

// Export authenticated handler
export const GET = withBasicAuth(handleGetStats, {
  requiredFeatures: ["vocabulary_save"],
  errorMessages: {
    featureRequired: "Progress statistics require a valid subscription."
  }
});
