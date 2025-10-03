import { NextRequest, NextResponse } from "next/server";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { z } from "zod";
import { descriptionCache } from "@/lib/cache";
import { withBasicAuth } from "@/lib/middleware/withAuth";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";
import { apiLogger } from '@/lib/logger';

// Input validation schemas
const progressEventSchema = z.object({
  userId: z.string().optional().default("anonymous"),
  sessionId: z.string().optional(),
  eventType: z.enum([
    "vocabulary_learned",
    "vocabulary_reviewed",
    "vocabulary_mastered",
    "qa_answered",
    "qa_correct",
    "qa_incorrect",
    "phrase_learned",
    "phrase_reviewed",
    "phrase_mastered",
    "translation_completed",
    "description_generated",
    "session_started",
    "session_completed",
    "image_processed",
    "export_generated",
    "difficulty_adjusted",
    "goal_achieved",
  ]),
  eventData: z.object({
    vocabularyId: z.string().optional(),
    questionId: z.string().optional(),
    phraseId: z.string().optional(),
    imageUrl: z.string().optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    category: z.string().optional(),
    score: z.number().min(0).max(1).optional(),
    timeSpent: z.number().min(0).optional(), // in seconds
    attempts: z.number().min(1).optional(),
    correct: z.boolean().optional(),
    confidence: z.number().min(0).max(1).optional(),
    masteryLevel: z.number().min(0).max(1).optional(),
    streak: z.number().min(0).optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
  }),
  timestamp: z.string().optional(),
});

const progressQuerySchema = z.object({
  userId: z.string().optional().default("anonymous"),
  sessionId: z.string().optional(),
  eventType: z.array(z.string()).optional(),
  category: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
  aggregation: z.enum(["daily", "weekly", "monthly"]).optional(),
});

const goalSchema = z.object({
  userId: z.string().optional().default("anonymous"),
  goalType: z.enum([
    "daily_vocabulary",
    "weekly_practice",
    "mastery_target",
    "streak_goal",
  ]),
  targetValue: z.number().min(1),
  currentValue: z.number().min(0).optional().default(0),
  deadline: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  active: z.boolean().optional().default(true),
});

export const runtime = "nodejs";

// Progress tracking service
class ProgressTracker {
  private cachePrefix = "progress";
  private userPrefix = (userId: string) => `${this.cachePrefix}:user:${userId}`;
  private sessionPrefix = (sessionId: string) =>
    `${this.cachePrefix}:session:${sessionId}`;

  async trackEvent(
    userId: string,
    eventType: string,
    eventData: any,
    sessionId?: string,
    timestamp?: string,
  ) {
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const eventTime = timestamp || new Date().toISOString();

    const progressEvent = {
      id: eventId,
      userId,
      sessionId,
      eventType,
      eventData,
      timestamp: eventTime,
      dateKey: eventTime.split("T")[0], // YYYY-MM-DD for daily aggregation
    };

    // Store individual event
    const eventKey = `${this.userPrefix(userId)}:events:${eventId}`;
    await descriptionCache.set(eventKey, progressEvent, {
      kvTTL: 86400 * 90, // 90 days
      memoryTTL: 3600, // 1 hour
      sessionTTL: 1800, // 30 minutes
    });

    // Update user progress summary
    await this.updateUserProgress(userId, eventType, eventData, eventTime);

    // Update session progress if sessionId provided
    if (sessionId) {
      await this.updateSessionProgress(
        sessionId,
        eventType,
        eventData,
        eventTime,
      );
    }

    // Update daily aggregation
    await this.updateDailyAggregation(userId, eventTime, eventType, eventData);

    // Check and update goals
    await this.checkGoalProgress(userId, eventType, eventData);

    return progressEvent;
  }

  async updateUserProgress(
    userId: string,
    eventType: string,
    eventData: any,
    timestamp: string,
  ) {
    const progressKey = `${this.userPrefix(userId)}:summary`;

    try {
      const progress = (await descriptionCache.get(progressKey)) || {
        userId,
        totalEvents: 0,
        firstActivity: timestamp,
        lastActivity: timestamp,
        streaks: { current: 0, longest: 0 },
        categories: {},
        difficulties: { beginner: 0, intermediate: 0, advanced: 0 },
        achievements: [],
        masteryScores: {},
        timeSpent: 0,
        scores: { total: 0, count: 0, average: 0 },
      };

      progress.totalEvents++;
      progress.lastActivity = timestamp;
      progress.timeSpent += eventData.timeSpent || 0;

      // Update category stats
      if (eventData.category) {
        progress.categories[eventData.category] =
          (progress.categories[eventData.category] || 0) + 1;
      }

      // Update difficulty stats
      if (eventData.difficulty) {
        progress.difficulties[eventData.difficulty]++;
      }

      // Update scores
      if (typeof eventData.score === "number") {
        progress.scores.total += eventData.score;
        progress.scores.count++;
        progress.scores.average = progress.scores.total / progress.scores.count;
      }

      // Update mastery levels
      if (
        eventData.vocabularyId &&
        typeof eventData.masteryLevel === "number"
      ) {
        progress.masteryScores[eventData.vocabularyId] = eventData.masteryLevel;
      }

      // Update streaks for certain event types
      if (
        ["vocabulary_learned", "qa_correct", "phrase_mastered"].includes(
          eventType,
        )
      ) {
        const today = timestamp.split("T")[0];
        const lastActivityDate = progress.lastActivity.split("T")[0];

        if (
          today === lastActivityDate ||
          this.isConsecutiveDay(lastActivityDate, today)
        ) {
          progress.streaks.current++;
          progress.streaks.longest = Math.max(
            progress.streaks.current,
            progress.streaks.longest,
          );
        } else {
          progress.streaks.current = 1;
        }
      }

      // Check for achievements
      this.checkAchievements(progress, eventType, eventData);

      await descriptionCache.set(progressKey, progress, {
        kvTTL: 86400 * 90, // 90 days
        memoryTTL: 3600, // 1 hour
        sessionTTL: 1800, // 30 minutes
      });
    } catch (error) {
      apiLogger.warn("Failed to update user progress:", error);
    }
  }

  async updateSessionProgress(
    sessionId: string,
    eventType: string,
    eventData: any,
    timestamp: string,
  ) {
    const sessionKey = `${this.sessionPrefix(sessionId)}:progress`;

    try {
      const session = (await descriptionCache.get(sessionKey)) || {
        sessionId,
        startTime: timestamp,
        lastActivity: timestamp,
        events: [],
        stats: {
          totalEvents: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          vocabularyLearned: 0,
          phrasesLearned: 0,
          timeSpent: 0,
          averageScore: 0,
          completionRate: 0,
        },
      };

      session.lastActivity = timestamp;
      session.events.push({
        eventType,
        eventData,
        timestamp,
      });
      session.stats.totalEvents++;
      session.stats.timeSpent += eventData.timeSpent || 0;

      // Update specific stats based on event type
      switch (eventType) {
        case "qa_correct":
          session.stats.correctAnswers++;
          break;
        case "qa_incorrect":
          session.stats.incorrectAnswers++;
          break;
        case "vocabulary_learned":
          session.stats.vocabularyLearned++;
          break;
        case "phrase_learned":
          session.stats.phrasesLearned++;
          break;
      }

      // Calculate completion rate
      const totalAnswers =
        session.stats.correctAnswers + session.stats.incorrectAnswers;
      if (totalAnswers > 0) {
        session.stats.completionRate =
          session.stats.correctAnswers / totalAnswers;
      }

      await descriptionCache.set(sessionKey, session, {
        kvTTL: 86400 * 7, // 7 days
        memoryTTL: 3600, // 1 hour
        sessionTTL: 7200, // 2 hours
      });
    } catch (error) {
      apiLogger.warn("Failed to update session progress:", error);
    }
  }

  async updateDailyAggregation(
    userId: string,
    timestamp: string,
    eventType: string,
    eventData: any,
  ) {
    const dateKey = timestamp.split("T")[0];
    const dailyKey = `${this.userPrefix(userId)}:daily:${dateKey}`;

    try {
      const daily = (await descriptionCache.get(dailyKey)) || {
        userId,
        date: dateKey,
        events: {},
        totalEvents: 0,
        timeSpent: 0,
        score: { total: 0, count: 0, average: 0 },
        categories: {},
        difficulties: { beginner: 0, intermediate: 0, advanced: 0 },
      };

      daily.totalEvents++;
      daily.events[eventType] = (daily.events[eventType] || 0) + 1;
      daily.timeSpent += eventData.timeSpent || 0;

      if (typeof eventData.score === "number") {
        daily.score.total += eventData.score;
        daily.score.count++;
        daily.score.average = daily.score.total / daily.score.count;
      }

      if (eventData.category) {
        daily.categories[eventData.category] =
          (daily.categories[eventData.category] || 0) + 1;
      }

      if (eventData.difficulty) {
        daily.difficulties[eventData.difficulty]++;
      }

      await descriptionCache.set(dailyKey, daily, {
        kvTTL: 86400 * 90, // 90 days
        memoryTTL: 3600, // 1 hour
        sessionTTL: 1800, // 30 minutes
      });
    } catch (error) {
      apiLogger.warn("Failed to update daily aggregation:", error);
    }
  }

  async checkGoalProgress(userId: string, eventType: string, eventData: any) {
    const goalsKey = `${this.userPrefix(userId)}:goals`;

    try {
      const goals = (await descriptionCache.get(goalsKey)) || {
        active: [],
        completed: [],
      };

      for (const goal of goals.active) {
        let increment = 0;

        switch (goal.goalType) {
          case "daily_vocabulary":
            if (eventType === "vocabulary_learned") increment = 1;
            break;
          case "weekly_practice":
            if (
              ["vocabulary_learned", "qa_answered", "phrase_learned"].includes(
                eventType,
              )
            )
              increment = 1;
            break;
          case "mastery_target":
            if (
              eventType === "vocabulary_mastered" ||
              eventType === "phrase_mastered"
            )
              increment = 1;
            break;
          case "streak_goal":
            if (["vocabulary_learned", "qa_correct"].includes(eventType))
              increment = 1;
            break;
        }

        if (increment > 0) {
          goal.currentValue += increment;
          goal.lastUpdated = new Date().toISOString();

          if (goal.currentValue >= goal.targetValue) {
            goal.completed = true;
            goal.completedAt = new Date().toISOString();
            goals.completed.push(goal);
            goals.active = goals.active.filter((g: any) => g.id !== goal.id);
          }
        }
      }

      await descriptionCache.set(goalsKey, goals, {
        kvTTL: 86400 * 90, // 90 days
        memoryTTL: 3600, // 1 hour
        sessionTTL: 1800, // 30 minutes
      });
    } catch (error) {
      apiLogger.warn("Failed to check goal progress:", error);
    }
  }

  checkAchievements(progress: any, eventType: string, eventData: any) {
    const achievements = [
      {
        id: "first_word",
        condition: () => progress.totalEvents === 1,
        title: "First Steps",
      },
      {
        id: "vocab_100",
        condition: () => progress.categories.vocabulary >= 100,
        title: "Vocabulary Master",
      },
      {
        id: "streak_7",
        condition: () => progress.streaks.current >= 7,
        title: "Week Warrior",
      },
      {
        id: "streak_30",
        condition: () => progress.streaks.current >= 30,
        title: "Monthly Master",
      },
      {
        id: "perfect_score",
        condition: () => progress.scores.average >= 0.95,
        title: "Perfectionist",
      },
    ];

    achievements.forEach((achievement) => {
      if (
        achievement.condition() &&
        !progress.achievements.find((a: any) => a.id === achievement.id)
      ) {
        progress.achievements.push({
          ...achievement,
          unlockedAt: new Date().toISOString(),
          eventType,
          eventData,
        });
      }
    });
  }

  isConsecutiveDay(date1: string, date2: string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  async getProgress(userId: string, filters: any = {}) {
    const progressKey = `${this.userPrefix(userId)}:summary`;
    const progress = (await descriptionCache.get(progressKey)) || {};

    if (filters.aggregation) {
      const aggregatedData = await this.getAggregatedProgress(userId, filters);
      return { ...progress, aggregated: aggregatedData };
    }

    return progress;
  }

  async getAggregatedProgress(userId: string, filters: any) {
    const { aggregation, dateFrom, dateTo } = filters;
    const data = [];

    // For daily aggregation, get daily records
    if (aggregation === "daily") {
      const startDate = new Date(dateFrom || Date.now() - 86400000 * 30); // Default 30 days
      const endDate = new Date(dateTo || Date.now());

      for (
        let date = startDate;
        date <= endDate;
        date.setDate(date.getDate() + 1)
      ) {
        const dateKey = date.toISOString().split("T")[0];
        const dailyKey = `${this.userPrefix(userId)}:daily:${dateKey}`;
        const daily = await descriptionCache.get(dailyKey);

        if (daily) {
          data.push(daily);
        }
      }
    }

    return data;
  }
}

const progressTracker = new ProgressTracker();

// POST endpoint - Track progress event
async function handleProgressTrack(request: AuthenticatedRequest) {
  const startTime = performance.now();
  const authenticatedUserId = request.user?.id;
  const userTier = request.user?.subscription_status || 'free';

  // Enforce user ID from auth context
  if (!authenticatedUserId) {
    return NextResponse.json(
      {
        success: false,
        error: "User ID required",
        message: "Authentication required to track progress",
      },
      { status: 401 }
    );
  }

  try {
    const requestText = await request.text();
    const body = safeParse(requestText);
    
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    };
    
    // Override any userId in the request body with authenticated user ID
    body.userId = authenticatedUserId;
    
    const { userId, sessionId, eventType, eventData, timestamp } =
      progressEventSchema.parse(body);

    const event = await progressTracker.trackEvent(
      userId,
      eventType,
      eventData,
      sessionId,
      timestamp,
    );

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: event,
        metadata: {
          userId,
          sessionId,
          eventType,
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 201,
        headers: {
          "X-Response-Time": `${responseTime}ms`,
          Location: `/api/progress/events/${event.id}`,
        },
      },
    );
  } catch (error) {
    const responseTime = performance.now() - startTime;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: error.errors,
          timestamp: new Date().toISOString(),
        },
        {
          status: 400,
          headers: {
            "X-Response-Time": `${responseTime}ms`,
          },
        },
      );
    }

    apiLogger.error("Progress tracking error:", error);

    return NextResponse.json(
      {
        error: "Failed to track progress",
        message:
          "An error occurred while tracking your progress. Please try again.",
        timestamp: new Date().toISOString(),
        retry: true,
      },
      {
        status: 500,
        headers: {
          "Retry-After": "30",
          "X-Response-Time": `${responseTime}ms`,
        },
      },
    );
  }
}

// GET endpoint - Retrieve progress
async function handleProgressGet(request: AuthenticatedRequest) {
  const startTime = performance.now();
  const authenticatedUserId = request.user?.id;
  const userTier = request.user?.subscription_status || 'free';

  // Enforce user ID from auth context
  if (!authenticatedUserId) {
    return NextResponse.json(
      {
        success: false,
        error: "User ID required",
        message: "Authentication required to retrieve progress",
      },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = progressQuerySchema.parse({
      userId: authenticatedUserId, // Use authenticated user ID
      sessionId: searchParams.get("sessionId") || undefined,
      eventType: searchParams.getAll("eventType"),
      category: searchParams.get("category") || undefined,
      difficulty: searchParams.get("difficulty") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      aggregation: searchParams.get("aggregation") || undefined,
    });

    const progress = await progressTracker.getProgress(filters.userId, filters);

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: progress,
        metadata: {
          userId: filters.userId,
          filters: filters,
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers: {
          "X-Response-Time": `${responseTime}ms`,
          "Cache-Control": "private, max-age=300",
        },
      },
    );
  } catch (error) {
    const responseTime = performance.now() - startTime;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: error.errors,
          timestamp: new Date().toISOString(),
        },
        {
          status: 400,
          headers: {
            "X-Response-Time": `${responseTime}ms`,
          },
        },
      );
    }

    apiLogger.error("Progress retrieval error:", error);

    return NextResponse.json(
      {
        error: "Failed to retrieve progress",
        message:
          "An error occurred while retrieving your progress. Please try again.",
        timestamp: new Date().toISOString(),
        retry: true,
      },
      {
        status: 500,
        headers: {
          "Retry-After": "30",
          "X-Response-Time": `${responseTime}ms`,
        },
      },
    );
  }
}


// Export authenticated handlers
export const POST = withBasicAuth(
  handleProgressTrack,
  {
    requiredFeatures: ['progress_tracking'],
    errorMessages: {
      featureRequired: 'Progress tracking requires a valid subscription. Free tier includes basic progress tracking.',
    },
  }
);

export const GET = withBasicAuth(
  handleProgressGet,
  {
    requiredFeatures: ['progress_tracking'],
    errorMessages: {
      featureRequired: 'Progress data access requires a valid subscription. Free tier includes basic progress access.',
    },
  }
);
