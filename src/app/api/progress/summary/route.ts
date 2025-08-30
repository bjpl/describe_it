import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/api/supabase';
import { progressSummarySchema, type ProgressSummaryRequest } from '@/lib/validations/progress';
import { withAuthAndRateLimit, withCacheAndAuth, withValidation, type AuthenticatedRequest } from '@/lib/api/middleware';

// GET - Get user progress summary
async function getProgressSummaryHandler(req: AuthenticatedRequest, validData: ProgressSummaryRequest) {
  try {
    // Get progress summary using database function
    const summary = await supabaseService.getUserProgressSummary(req.user.id, validData.days_back);

    // Get additional analytics if predictions are requested
    let predictions = null;
    if (validData.include_predictions) {
      // Calculate simple predictions based on recent trends
      const recentProgress = await supabaseService.getUserProgress(
        req.user.id,
        'daily',
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      );

      if (recentProgress.length > 0) {
        const avgDailyPoints = recentProgress.reduce((sum, p) => sum + p.points_earned, 0) / recentProgress.length;
        const avgAccuracy = recentProgress.reduce((sum, p) => sum + p.accuracy_percentage, 0) / recentProgress.length;

        predictions = {
          projected_weekly_points: Math.round(avgDailyPoints * 7),
          projected_monthly_points: Math.round(avgDailyPoints * 30),
          accuracy_trend: avgAccuracy > 80 ? 'improving' : avgAccuracy > 60 ? 'stable' : 'needs_attention',
          estimated_level_up_days: summary ? Math.ceil((5000 - (summary.total_points || 0)) / Math.max(avgDailyPoints, 1)) : null,
        };
      }
    }

    // Calculate grouped progress data
    let groupedProgress = [];
    if (validData.group_by !== 'day') {
      // Get progress data for grouping
      const progressData = await supabaseService.getUserProgress(
        req.user.id,
        validData.group_by === 'week' ? 'weekly' : 'monthly',
        new Date(Date.now() - validData.days_back * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      );
      
      groupedProgress = progressData;
    }

    return NextResponse.json({
      data: {
        summary,
        predictions,
        grouped_progress: groupedProgress,
        request_params: validData,
      },
      message: 'Progress summary retrieved successfully'
    });

  } catch (error) {
    console.error('Get progress summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withCacheAndAuth(
  'progress',
  (req) => {
    const url = new URL(req.url);
    const params = Array.from(url.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return `progress_summary:${(req as AuthenticatedRequest).user.id}:${params}`;
  }
)(withValidation(progressSummarySchema, getProgressSummaryHandler));