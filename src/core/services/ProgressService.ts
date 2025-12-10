/**
 * ProgressService - Business Logic for Progress Tracking
 *
 * Handles progress event tracking, aggregation, and goal management.
 */

import { descriptionCache } from '@/lib/cache';
import { apiLogger } from '@/lib/logger';
import { asLogContext } from '@/lib/utils/typeGuards';
import type {
  ProgressEvent,
  ProgressEventType,
  UserProgress,
  SessionProgress,
  DailyProgress,
  Goal,
  GoalCollection,
} from '../types/progress';

export interface ProgressEventData {
  vocabularyId?: string;
  questionId?: string;
  phraseId?: string;
  imageUrl?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  score?: number;
  timeSpent?: number;
  attempts?: number;
  correct?: boolean;
  confidence?: number;
  masteryLevel?: number;
  streak?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ProgressFilters {
  userId: string;
  sessionId?: string;
  eventType?: string[];
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  aggregation?: 'daily' | 'weekly' | 'monthly';
}

/**
 * Service for tracking user progress and achievements
 */
export class ProgressService {
  private cachePrefix = 'progress';

  private userPrefix(userId: string): string {
    return `${this.cachePrefix}:user:${userId}`;
  }

  private sessionPrefix(sessionId: string): string {
    return `${this.cachePrefix}:session:${sessionId}`;
  }

  /**
   * Track a progress event
   */
  async trackEvent(
    userId: string,
    eventType: ProgressEventType,
    eventData: ProgressEventData,
    sessionId?: string,
    timestamp?: string
  ): Promise<ProgressEvent> {
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const eventTime = timestamp || new Date().toISOString();

    const progressEvent: ProgressEvent = {
      id: eventId,
      userId,
      sessionId,
      eventType,
      eventData,
      timestamp: eventTime,
      dateKey: eventTime.split('T')[0],
    };

    // Store individual event
    await descriptionCache.set(
      progressEvent,
      86400 * 90,
      `${this.userPrefix(userId)}:events:${eventId}`
    );

    // Update aggregations in parallel
    await Promise.all([
      this.updateUserProgress(userId, eventType, eventData, eventTime),
      sessionId
        ? this.updateSessionProgress(sessionId, eventType, eventData, eventTime)
        : Promise.resolve(),
      this.updateDailyAggregation(userId, eventTime, eventType, eventData),
      this.checkGoalProgress(userId, eventType, eventData),
    ]);

    return progressEvent;
  }

  /**
   * Update user progress summary
   */
  private async updateUserProgress(
    userId: string,
    eventType: ProgressEventType,
    eventData: ProgressEventData,
    timestamp: string
  ): Promise<void> {
    const progressKey = `${this.userPrefix(userId)}:summary`;

    try {
      const progress = (await descriptionCache.get<UserProgress>(progressKey)) || {
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
      if (typeof eventData.score === 'number') {
        progress.scores.total += eventData.score;
        progress.scores.count++;
        progress.scores.average = progress.scores.total / progress.scores.count;
      }

      // Update mastery levels
      if (eventData.vocabularyId && typeof eventData.masteryLevel === 'number') {
        progress.masteryScores[eventData.vocabularyId] = eventData.masteryLevel;
      }

      // Update streaks for certain event types
      if (
        ['vocabulary_learned', 'qa_correct', 'phrase_mastered'].includes(eventType)
      ) {
        const today = timestamp.split('T')[0];
        const lastActivityDate = progress.lastActivity.split('T')[0];

        if (
          today === lastActivityDate ||
          this.isConsecutiveDay(lastActivityDate, today)
        ) {
          progress.streaks.current++;
          progress.streaks.longest = Math.max(
            progress.streaks.current,
            progress.streaks.longest
          );
        } else {
          progress.streaks.current = 1;
        }
      }

      // Check for achievements
      this.checkAchievements(progress, eventType, eventData);

      await descriptionCache.set(progress, 86400 * 90, progressKey);
    } catch (error) {
      apiLogger.warn('Failed to update user progress:', asLogContext(error));
    }
  }

  /**
   * Update session progress
   */
  private async updateSessionProgress(
    sessionId: string,
    eventType: ProgressEventType,
    eventData: ProgressEventData,
    timestamp: string
  ): Promise<void> {
    const sessionKey = `${this.sessionPrefix(sessionId)}:progress`;

    try {
      const session = (await descriptionCache.get<SessionProgress>(sessionKey)) || {
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
        case 'qa_correct':
          session.stats.correctAnswers++;
          break;
        case 'qa_incorrect':
          session.stats.incorrectAnswers++;
          break;
        case 'vocabulary_learned':
          session.stats.vocabularyLearned++;
          break;
        case 'phrase_learned':
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

      await descriptionCache.set(session, 86400 * 7, sessionKey);
    } catch (error) {
      apiLogger.warn('Failed to update session progress:', asLogContext(error));
    }
  }

  /**
   * Update daily aggregation
   */
  private async updateDailyAggregation(
    userId: string,
    timestamp: string,
    eventType: ProgressEventType,
    eventData: ProgressEventData
  ): Promise<void> {
    const dateKey = timestamp.split('T')[0];
    const dailyKey = `${this.userPrefix(userId)}:daily:${dateKey}`;

    try {
      const daily = (await descriptionCache.get<DailyProgress>(dailyKey)) || {
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

      if (typeof eventData.score === 'number') {
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

      await descriptionCache.set(daily, 86400 * 90, dailyKey);
    } catch (error) {
      apiLogger.warn('Failed to update daily aggregation:', asLogContext(error));
    }
  }

  /**
   * Check and update goal progress
   */
  private async checkGoalProgress(
    userId: string,
    eventType: ProgressEventType,
    eventData: ProgressEventData
  ): Promise<void> {
    const goalsKey = `${this.userPrefix(userId)}:goals`;

    try {
      const goals = (await descriptionCache.get<GoalCollection>(goalsKey)) || {
        active: [],
        completed: [],
      };

      for (const goal of goals.active) {
        let increment = 0;

        switch (goal.goalType) {
          case 'daily_vocabulary':
            if (eventType === 'vocabulary_learned') increment = 1;
            break;
          case 'weekly_practice':
            if (
              ['vocabulary_learned', 'qa_answered', 'phrase_learned'].includes(
                eventType
              )
            )
              increment = 1;
            break;
          case 'mastery_target':
            if (
              eventType === 'vocabulary_mastered' ||
              eventType === 'phrase_mastered'
            )
              increment = 1;
            break;
          case 'streak_goal':
            if (['vocabulary_learned', 'qa_correct'].includes(eventType))
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
            goals.active = goals.active.filter(g => g.id !== goal.id);
          }
        }
      }

      await descriptionCache.set(goals, 86400 * 90, goalsKey);
    } catch (error) {
      apiLogger.warn('Failed to check goal progress:', asLogContext(error));
    }
  }

  /**
   * Check for achievements
   */
  private checkAchievements(
    progress: UserProgress,
    eventType: ProgressEventType,
    eventData: ProgressEventData
  ): void {
    const achievements = [
      {
        id: 'first_word',
        condition: () => progress.totalEvents === 1,
        title: 'First Steps',
      },
      {
        id: 'vocab_100',
        condition: () => (progress.categories.vocabulary || 0) >= 100,
        title: 'Vocabulary Master',
      },
      {
        id: 'streak_7',
        condition: () => progress.streaks.current >= 7,
        title: 'Week Warrior',
      },
      {
        id: 'streak_30',
        condition: () => progress.streaks.current >= 30,
        title: 'Monthly Master',
      },
      {
        id: 'perfect_score',
        condition: () => progress.scores.average >= 0.95,
        title: 'Perfectionist',
      },
    ];

    achievements.forEach(achievement => {
      if (
        achievement.condition() &&
        !progress.achievements.find(a => a.id === achievement.id)
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

  /**
   * Check if two dates are consecutive days
   */
  private isConsecutiveDay(date1: string, date2: string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  /**
   * Get user progress with optional aggregation
   */
  async getProgress(userId: string, filters?: Omit<ProgressFilters, 'userId'>) {
    const progressKey = `${this.userPrefix(userId)}:summary`;
    const progress = (await descriptionCache.get(progressKey)) || {};

    if (filters?.aggregation) {
      const fullFilters: ProgressFilters = { ...filters, userId };
      const aggregatedData = await this.getAggregatedProgress(userId, fullFilters);
      return { ...progress, aggregated: aggregatedData };
    }

    return progress;
  }

  /**
   * Get aggregated progress data
   */
  private async getAggregatedProgress(
    userId: string,
    filters: ProgressFilters
  ): Promise<DailyProgress[]> {
    const { aggregation, dateFrom, dateTo } = filters;
    const data: DailyProgress[] = [];

    // For daily aggregation, get daily records
    if (aggregation === 'daily') {
      const startDate = new Date(dateFrom || Date.now() - 86400000 * 30);
      const endDate = new Date(dateTo || Date.now());

      for (
        let date = new Date(startDate);
        date <= endDate;
        date.setDate(date.getDate() + 1)
      ) {
        const dateKey = date.toISOString().split('T')[0];
        const dailyKey = `${this.userPrefix(userId)}:daily:${dateKey}`;
        const daily = await descriptionCache.get<DailyProgress>(dailyKey);

        if (daily) {
          data.push(daily);
        }
      }
    }

    return data;
  }
}
