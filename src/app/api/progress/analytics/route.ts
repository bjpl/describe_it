/**
 * GET /api/progress/analytics - Get detailed learning analytics
 * Returns skill breakdown, recent activity, and personalized recommendations
 */

import { NextRequest, NextResponse } from "next/server";
import { withBasicAuth } from "@/lib/middleware/withAuth";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";
import { DatabaseService } from "@/lib/supabase";
import { apiLogger } from "@/lib/logger";
import { asLogContext } from "@/lib/utils/typeGuards";

export const runtime = "nodejs";

interface LearningAnalytics {
  skill_breakdown: {
    vocabulary: {
      total: number;
      mastered: number;
      learning: number;
      new: number;
    };
    grammar: {
      accuracy_rate: number;
      common_errors: string[];
    };
    comprehension: {
      average_score: number;
      improvement_rate: number;
    };
    pronunciation: {
      confidence_level: number;
      areas_to_improve: string[];
    };
  };
  recent_activity: Array<{
    date: string;
    type: "practice" | "flashcards" | "quiz" | "matching" | "writing";
    duration_minutes: number;
    score: number;
    items_learned: number;
  }>;
  recommendations: {
    focus_areas: string[];
    suggested_difficulty: "beginner" | "intermediate" | "advanced";
    daily_goal_suggestion: number;
    study_time_optimal: string;
    next_topics: string[];
  };
  performance_trends: {
    weekly_average: number;
    monthly_average: number;
    best_time_of_day: string;
    best_session_type: string;
  };
}

/**
 * Calculate detailed learning analytics
 */
async function calculateAnalytics(userId: string): Promise<LearningAnalytics> {
  try {
    // Get user data
    const user = await DatabaseService.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get learning progress
    const learningProgress = await DatabaseService.getLearningProgress(userId, 1000);

    // Get recent sessions (last 30 days)
    const sessions = await DatabaseService.getUserSessions(userId, 100);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSessions = sessions.filter(s =>
      new Date(s.started_at) >= thirtyDaysAgo && s.status === 'completed'
    );

    // Calculate vocabulary breakdown
    const masteredCount = learningProgress.filter(p => p.mastery_level >= 0.8).length;
    const learningCount = learningProgress.filter(p =>
      p.mastery_level >= 0.3 && p.mastery_level < 0.8
    ).length;
    const newCount = learningProgress.filter(p => p.mastery_level < 0.3).length;

    // Calculate skill metrics
    const skillBreakdown = {
      vocabulary: {
        total: learningProgress.length,
        mastered: masteredCount,
        learning: learningCount,
        new: newCount
      },
      grammar: {
        accuracy_rate: recentSessions.length > 0
          ? Math.round(
              recentSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) /
              recentSessions.length
            )
          : 0,
        common_errors: ["Verb conjugation", "Gender agreement", "Article usage"] // Placeholder
      },
      comprehension: {
        average_score: recentSessions.length > 0
          ? Math.round(
              recentSessions.reduce((sum, s) => sum + (s.score || 0), 0) /
              recentSessions.length
            )
          : 0,
        improvement_rate: calculateImprovementRate(sessions)
      },
      pronunciation: {
        confidence_level: 75, // Placeholder - would need audio session data
        areas_to_improve: ["Rolled 'r' sound", "Vowel clarity"]
      }
    };

    // Build recent activity
    const recentActivity = recentSessions.slice(0, 20).map(session => ({
      date: new Date(session.started_at).toISOString().split('T')[0],
      type: session.session_type,
      duration_minutes: Math.round((session.time_spent || 0) / 60),
      score: session.score || 0,
      items_learned: session.vocabulary_items?.length || 0
    }));

    // Calculate performance trends
    const weeklyAverage = calculateWeeklyAverage(sessions);
    const monthlyAverage = calculateMonthlyAverage(sessions);
    const bestTimeOfDay = determineBestTimeOfDay(sessions);
    const bestSessionType = determineBestSessionType(sessions);

    // Generate recommendations
    const recommendations = generateRecommendations(
      user,
      learningProgress,
      recentSessions,
      skillBreakdown
    );

    return {
      skill_breakdown: skillBreakdown,
      recent_activity: recentActivity,
      recommendations,
      performance_trends: {
        weekly_average: weeklyAverage,
        monthly_average: monthlyAverage,
        best_time_of_day: bestTimeOfDay,
        best_session_type: bestSessionType
      }
    };
  } catch (error) {
    apiLogger.error("Error calculating analytics:", asLogContext(error));
    throw error;
  }
}

/**
 * Helper function to calculate improvement rate
 */
function calculateImprovementRate(sessions: any[]): number {
  if (sessions.length < 2) return 0;

  const recent = sessions.slice(0, 5);
  const older = sessions.slice(5, 10);

  const recentAvg = recent.reduce((sum, s) => sum + (s.score || 0), 0) / recent.length;
  const olderAvg = older.length > 0
    ? older.reduce((sum, s) => sum + (s.score || 0), 0) / older.length
    : recentAvg;

  return Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
}

/**
 * Helper function to calculate weekly average
 */
function calculateWeeklyAverage(sessions: any[]): number {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const weekSessions = sessions.filter(s =>
    new Date(s.started_at) >= oneWeekAgo && s.status === 'completed'
  );

  if (weekSessions.length === 0) return 0;
  return Math.round(
    weekSessions.reduce((sum, s) => sum + (s.score || 0), 0) / weekSessions.length
  );
}

/**
 * Helper function to calculate monthly average
 */
function calculateMonthlyAverage(sessions: any[]): number {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const monthSessions = sessions.filter(s =>
    new Date(s.started_at) >= oneMonthAgo && s.status === 'completed'
  );

  if (monthSessions.length === 0) return 0;
  return Math.round(
    monthSessions.reduce((sum, s) => sum + (s.score || 0), 0) / monthSessions.length
  );
}

/**
 * Helper function to determine best time of day
 */
function determineBestTimeOfDay(sessions: any[]): string {
  const timeScores: Record<string, { total: number; count: number }> = {
    morning: { total: 0, count: 0 },
    afternoon: { total: 0, count: 0 },
    evening: { total: 0, count: 0 }
  };

  sessions.forEach(session => {
    const hour = new Date(session.started_at).getHours();
    let period = 'morning';
    if (hour >= 12 && hour < 17) period = 'afternoon';
    else if (hour >= 17) period = 'evening';

    timeScores[period].total += session.score || 0;
    timeScores[period].count += 1;
  });

  let bestTime = 'morning';
  let bestAverage = 0;

  Object.entries(timeScores).forEach(([time, data]) => {
    if (data.count > 0) {
      const avg = data.total / data.count;
      if (avg > bestAverage) {
        bestAverage = avg;
        bestTime = time;
      }
    }
  });

  return bestTime;
}

/**
 * Helper function to determine best session type
 */
function determineBestSessionType(sessions: any[]): string {
  const typeScores: Record<string, { total: number; count: number }> = {};

  sessions.forEach(session => {
    const type = session.session_type || 'practice';
    if (!typeScores[type]) {
      typeScores[type] = { total: 0, count: 0 };
    }
    typeScores[type].total += session.score || 0;
    typeScores[type].count += 1;
  });

  let bestType = 'practice';
  let bestAverage = 0;

  Object.entries(typeScores).forEach(([type, data]) => {
    const avg = data.total / data.count;
    if (avg > bestAverage) {
      bestAverage = avg;
      bestType = type;
    }
  });

  return bestType;
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(
  user: any,
  learningProgress: any[],
  recentSessions: any[],
  skillBreakdown: any
): LearningAnalytics['recommendations'] {
  const focusAreas: string[] = [];

  // Analyze weak areas
  if (skillBreakdown.vocabulary.new > skillBreakdown.vocabulary.mastered) {
    focusAreas.push("Consolidate new vocabulary before learning more");
  }

  if (skillBreakdown.grammar.accuracy_rate < 70) {
    focusAreas.push("Practice grammar exercises");
  }

  if (skillBreakdown.comprehension.improvement_rate < 0) {
    focusAreas.push("Review foundational concepts");
  }

  // Determine suggested difficulty
  let suggestedDifficulty: "beginner" | "intermediate" | "advanced" = user.learning_level;
  const avgAccuracy = recentSessions.length > 0
    ? recentSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / recentSessions.length
    : 0;

  if (avgAccuracy > 85 && user.learning_level !== 'advanced') {
    suggestedDifficulty = user.learning_level === 'beginner' ? 'intermediate' : 'advanced';
  } else if (avgAccuracy < 60) {
    suggestedDifficulty = user.learning_level === 'advanced' ? 'intermediate' : 'beginner';
  }

  // Calculate daily goal suggestion
  const avgDailyItems = recentSessions.length > 0
    ? Math.round(
        recentSessions.reduce((sum, s) => sum + (s.vocabulary_items?.length || 0), 0) / 30
      )
    : 5;
  const dailyGoalSuggestion = Math.max(5, Math.min(20, avgDailyItems + 2));

  return {
    focus_areas: focusAreas,
    suggested_difficulty: suggestedDifficulty,
    daily_goal_suggestion: dailyGoalSuggestion,
    study_time_optimal: "15-20 minutes per session",
    next_topics: [
      "Common verbs conjugation",
      "Travel vocabulary",
      "Everyday expressions"
    ]
  };
}

/**
 * GET handler for analytics endpoint
 */
async function handleGetAnalytics(request: AuthenticatedRequest) {
  const startTime = performance.now();
  const userId = request.user?.id;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const analytics = await calculateAnalytics(userId);
    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: analytics,
        metadata: {
          responseTime: `${responseTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
          userId
        }
      },
      {
        headers: {
          "X-Response-Time": `${responseTime.toFixed(2)}ms`,
          "Cache-Control": "private, max-age=600" // Cache for 10 minutes
        }
      }
    );
  } catch (error) {
    const responseTime = performance.now() - startTime;
    apiLogger.error("Failed to get learning analytics:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve learning analytics",
        message: "An error occurred while analyzing your progress. Please try again."
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
export const GET = withBasicAuth(handleGetAnalytics, {
  requiredFeatures: ["vocabulary_save"],
  errorMessages: {
    featureRequired: "Learning analytics require a valid subscription."
  }
});
