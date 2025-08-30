import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/api/supabase';
import { performanceAnalyticsSchema, type PerformanceAnalyticsRequest } from '@/lib/validations/progress';
import { withAuthAndRateLimit, withCacheAndAuth, withValidation, type AuthenticatedRequest } from '@/lib/api/middleware';

// GET - Get comprehensive user analytics
async function getAnalyticsHandler(req: AuthenticatedRequest, validData: PerformanceAnalyticsRequest) {
  try {
    const { timeframe, metrics, compare_to_previous, include_predictions } = validData;
    
    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date | null = null;

    switch (timeframe) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (compare_to_previous) {
          previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        }
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (compare_to_previous) {
          previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        }
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        if (compare_to_previous) {
          previousStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        }
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        if (compare_to_previous) {
          previousStartDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
        }
        break;
    }

    // Get user progress data for the timeframe
    const currentPeriodProgress = await supabaseService.getUserProgress(
      req.user.id,
      undefined, // all types
      startDate.toISOString().split('T')[0],
      now.toISOString().split('T')[0]
    );

    let previousPeriodProgress = null;
    if (compare_to_previous && previousStartDate) {
      previousPeriodProgress = await supabaseService.getUserProgress(
        req.user.id,
        undefined,
        previousStartDate.toISOString().split('T')[0],
        startDate.toISOString().split('T')[0]
      );
    }

    // Get session data for performance metrics
    const sessions = await supabaseService.getUserSessions(req.user.id, 1000, 0);
    const currentPeriodSessions = sessions.filter(s => 
      new Date(s.started_at) >= startDate && new Date(s.started_at) <= now
    );

    let previousPeriodSessions = [];
    if (compare_to_previous && previousStartDate) {
      previousPeriodSessions = sessions.filter(s => 
        new Date(s.started_at) >= previousStartDate && new Date(s.started_at) < startDate
      );
    }

    // Get vocabulary stats
    const { data: vocabularyStats } = await supabaseService.getClient()
      .rpc('get_user_vocabulary_stats', {
        user_uuid: req.user.id
      });

    const vocabStats = vocabularyStats?.[0] || {
      total_phrases: 0,
      selected_phrases: 0,
      mastered_phrases: 0,
      mastery_percentage: 0
    };

    // Get question performance stats
    const { data: questionStats } = await supabaseService.getClient()
      .rpc('get_user_question_stats', {
        user_uuid: req.user.id,
        days_back: timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : timeframe === 'quarter' ? 90 : 365
      });

    const qStats = questionStats?.[0] || {
      total_questions: 0,
      correct_answers: 0,
      accuracy_percentage: 0,
      avg_response_time: 0
    };

    // Calculate analytics based on requested metrics
    const analytics: any = {
      timeframe,
      period_start: startDate.toISOString(),
      period_end: now.toISOString(),
    };

    // Accuracy metrics
    if (metrics.includes('accuracy')) {
      const currentAccuracy = currentPeriodSessions.length > 0 
        ? currentPeriodSessions.reduce((sum, s) => sum + s.accuracy_percentage, 0) / currentPeriodSessions.length
        : 0;

      analytics.accuracy = {
        current_period: Math.round(currentAccuracy * 100) / 100,
        overall: Math.round(qStats.accuracy_percentage * 100) / 100,
      };

      if (compare_to_previous && previousPeriodSessions.length > 0) {
        const previousAccuracy = previousPeriodSessions.reduce((sum, s) => sum + s.accuracy_percentage, 0) / previousPeriodSessions.length;
        analytics.accuracy.previous_period = Math.round(previousAccuracy * 100) / 100;
        analytics.accuracy.change = Math.round((currentAccuracy - previousAccuracy) * 100) / 100;
        analytics.accuracy.improvement = analytics.accuracy.change > 0;
      }
    }

    // Consistency metrics
    if (metrics.includes('consistency')) {
      const currentDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const activeDays = new Set(currentPeriodSessions.map(s => s.started_at.split('T')[0])).size;
      const consistency = activeDays / currentDays;

      analytics.consistency = {
        active_days: activeDays,
        total_days: currentDays,
        consistency_percentage: Math.round(consistency * 100),
      };

      if (compare_to_previous && previousPeriodSessions.length > 0) {
        const previousDays = Math.ceil((startDate.getTime() - (previousStartDate?.getTime() || 0)) / (1000 * 60 * 60 * 24));
        const previousActiveDays = new Set(previousPeriodSessions.map(s => s.started_at.split('T')[0])).size;
        const previousConsistency = previousActiveDays / previousDays;
        
        analytics.consistency.previous_period = Math.round(previousConsistency * 100);
        analytics.consistency.change = Math.round((consistency - previousConsistency) * 100);
      }
    }

    // Speed metrics (response time and session duration)
    if (metrics.includes('speed')) {
      const avgSessionDuration = currentPeriodSessions.length > 0
        ? currentPeriodSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / currentPeriodSessions.length
        : 0;

      analytics.speed = {
        avg_session_duration_minutes: Math.round(avgSessionDuration * 100) / 100,
        avg_response_time_seconds: Math.round(qStats.avg_response_time * 100) / 100,
      };

      if (compare_to_previous && previousPeriodSessions.length > 0) {
        const previousAvgDuration = previousPeriodSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / previousPeriodSessions.length;
        analytics.speed.previous_duration = Math.round(previousAvgDuration * 100) / 100;
        analytics.speed.duration_change = Math.round((avgSessionDuration - previousAvgDuration) * 100) / 100;
      }
    }

    // Retention metrics (vocabulary mastery)
    if (metrics.includes('retention')) {
      analytics.retention = {
        vocabulary_mastery_percentage: Math.round(vocabStats.mastery_percentage * 100) / 100,
        total_phrases: vocabStats.total_phrases,
        mastered_phrases: vocabStats.mastered_phrases,
        phrases_learning: vocabStats.selected_phrases - vocabStats.mastered_phrases,
      };
    }

    // Difficulty progression
    if (metrics.includes('difficulty_progression')) {
      const { data: recentPhrases } = await supabaseService.getClient()
        .from('phrases')
        .select('difficulty_level, created_at')
        .eq('user_id', req.user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      const difficultyProgression = {
        beginner: 0,
        intermediate: 0,
        advanced: 0,
      };

      recentPhrases?.forEach(phrase => {
        difficultyProgression[phrase.difficulty_level as keyof typeof difficultyProgression]++;
      });

      analytics.difficulty_progression = difficultyProgression;
    }

    // Predictions (if requested)
    if (include_predictions && currentPeriodProgress.length > 0) {
      const recentPoints = currentPeriodProgress.reduce((sum, p) => sum + p.points_earned, 0);
      const daysInPeriod = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const avgDailyPoints = recentPoints / daysInPeriod;

      analytics.predictions = {
        projected_next_week_points: Math.round(avgDailyPoints * 7),
        projected_next_month_points: Math.round(avgDailyPoints * 30),
        estimated_mastery_timeline: vocabStats.selected_phrases > vocabStats.mastered_phrases 
          ? Math.ceil((vocabStats.selected_phrases - vocabStats.mastered_phrases) / Math.max(1, avgDailyPoints / 10))
          : 0,
      };
    }

    // Overall summary
    analytics.summary = {
      total_sessions: currentPeriodSessions.length,
      total_points: currentPeriodProgress.reduce((sum, p) => sum + p.points_earned, 0),
      total_time_minutes: currentPeriodSessions.reduce((sum, s) => sum + s.duration_minutes, 0),
      phrases_studied: currentPeriodSessions.reduce((sum, s) => sum + s.phrases_selected, 0),
      questions_answered: currentPeriodSessions.reduce((sum, s) => sum + s.questions_answered, 0),
    };

    return NextResponse.json({
      data: analytics,
      message: 'Analytics retrieved successfully'
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withCacheAndAuth(
  'analytics',
  (req) => {
    const url = new URL(req.url);
    const params = Array.from(url.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return `analytics:${(req as AuthenticatedRequest).user.id}:${params}`;
  }
)(withValidation(performanceAnalyticsSchema, getAnalyticsHandler));