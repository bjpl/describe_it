/**
 * GET /api/progress/streak - Get user streak information
 * Returns current streak, longest streak, and daily activity data
 */

import { NextRequest, NextResponse } from "next/server";
import { withBasicAuth } from "@/lib/middleware/withAuth";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";
import { DatabaseService } from "@/lib/supabase";
import { apiLogger } from "@/lib/logger";
import { asLogContext } from "@/lib/utils/typeGuards";

export const runtime = "nodejs";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  today_completed: boolean;
  streak_history: Array<{
    date: string;
    sessions: number;
    points_earned: number;
  }>;
  last_activity_date: string | null;
  next_milestone: {
    target_days: number;
    days_remaining: number;
  };
}

/**
 * Calculate streak information from user sessions
 */
async function calculateStreakData(userId: string): Promise<StreakData> {
  try {
    // Get user data
    const user = await DatabaseService.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get all sessions
    const sessions = await DatabaseService.getUserSessions(userId, 1000);

    // Sort sessions by date (newest first)
    const sortedSessions = sessions.sort((a, b) =>
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );

    // Check if today has any completed sessions
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCompleted = sortedSessions.some(session => {
      const sessionDate = new Date(session.started_at);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime() && session.status === 'completed';
    });

    // Build streak history (last 30 days)
    const streakHistory: Array<{
      date: string;
      sessions: number;
      points_earned: number;
    }> = [];

    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const daySessions = sortedSessions.filter(session => {
        const sessionDate = new Date(session.started_at);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === date.getTime() && session.status === 'completed';
      });

      const pointsEarned = daySessions.reduce((sum, session) => {
        // Estimate points based on score and time
        const scorePoints = (session.score || 0) / 10;
        const timeBonus = Math.min((session.time_spent || 0) / 60, 10); // Max 10 bonus points
        return sum + scorePoints + timeBonus;
      }, 0);

      streakHistory.push({
        date: date.toISOString().split('T')[0],
        sessions: daySessions.length,
        points_earned: Math.round(pointsEarned)
      });
    }

    // Calculate current streak (consecutive days with sessions)
    let currentStreak = 0;
    const checkDate = todayCompleted ? new Date() : new Date(Date.now() - 86400000); // Start from yesterday if today not completed

    for (let i = 0; i < 365; i++) {
      const date = new Date(checkDate);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const hasActivity = sortedSessions.some(session => {
        const sessionDate = new Date(session.started_at);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === date.getTime() && session.status === 'completed';
      });

      if (hasActivity) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Use database values if available and higher (for backward compatibility)
    currentStreak = Math.max(currentStreak, user.current_streak);
    const longestStreak = Math.max(currentStreak, user.longest_streak);

    // Calculate next milestone
    const milestones = [7, 14, 30, 60, 100, 365];
    const nextMilestone = milestones.find(m => m > currentStreak) || milestones[milestones.length - 1];

    return {
      current_streak: currentStreak,
      longest_streak: longestStreak,
      today_completed: todayCompleted,
      streak_history: streakHistory,
      last_activity_date: user.last_active_at || null,
      next_milestone: {
        target_days: nextMilestone,
        days_remaining: nextMilestone - currentStreak
      }
    };
  } catch (error) {
    apiLogger.error("Error calculating streak data:", asLogContext(error));
    throw error;
  }
}

/**
 * GET handler for streak endpoint
 */
async function handleGetStreak(request: AuthenticatedRequest) {
  const startTime = performance.now();
  const userId = request.user?.id;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const streakData = await calculateStreakData(userId);
    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: streakData,
        metadata: {
          responseTime: `${responseTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
          userId
        }
      },
      {
        headers: {
          "X-Response-Time": `${responseTime.toFixed(2)}ms`,
          "Cache-Control": "private, max-age=60" // Cache for 1 minute
        }
      }
    );
  } catch (error) {
    const responseTime = performance.now() - startTime;
    apiLogger.error("Failed to get streak data:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve streak information",
        message: "An error occurred while calculating your streak. Please try again."
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
export const GET = withBasicAuth(handleGetStreak, {
  requiredFeatures: ["vocabulary_save"],
  errorMessages: {
    featureRequired: "Streak tracking requires a valid subscription."
  }
});
