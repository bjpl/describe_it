import { NextRequest, NextResponse } from 'next/server';
import { withBasicAuth } from '@/lib/middleware/withAuth';
import type { AuthenticatedRequest } from '@/lib/middleware/auth';
import { DatabaseService } from '@/lib/supabase';
import { z } from 'zod';
import { apiLogger } from '@/lib/logger';
import { asLogContext } from '@/lib/utils/typeGuards';
import {
  getLearningProgressQuerySchema,
  updateLearningProgressRequestSchema,
  type GetLearningProgressQuery,
  type UpdateLearningProgressRequest,
  type GetLearningProgressResponse,
  type UpdateLearningProgressResponse,
} from '@/core/schemas/progress.schema';

// Use type-safe schemas from core/schemas
const querySchema = getLearningProgressQuerySchema;
const updateProgressSchema = updateLearningProgressRequestSchema;

export const runtime = 'nodejs';

/**
 * GET /api/progress - Get user learning progress
 */
async function handleGetProgress(request: AuthenticatedRequest) {
  const startTime = performance.now();
  const userId = request.user?.id;

  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters with type-safe schema
    const validatedQuery: GetLearningProgressQuery = querySchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      vocabulary_item_id: searchParams.get('vocabulary_item_id'),
    });

    const { limit, offset } = validatedQuery;

    const progress = await DatabaseService.getLearningProgress(userId, limit);

    // Apply offset manually (DatabaseService doesn't support offset)
    const paginatedProgress = progress.slice(offset, offset + limit);

    const responseTime = performance.now() - startTime;

    // Type-safe response
    const response: GetLearningProgressResponse = {
      success: true,
      data: paginatedProgress.map(item => ({
        id: item.id,
        userId: item.user_id,
        vocabularyItemId: item.vocabulary_item_id,
        masteryLevel: item.mastery_level || 0,
        timesReviewed: item.times_reviewed || 0,
        timesCorrect: item.times_correct || 0,
        timesIncorrect: (item.times_reviewed || 0) - (item.times_correct || 0),
        lastReviewed: item.last_reviewed || null,
        lastReviewScore: item.last_review_score || null,
        createdAt: item.created_at || new Date().toISOString(),
        updatedAt: item.updated_at || new Date().toISOString(),
      })),
      pagination: {
        total: progress.length,
        offset,
        limit,
        hasMore: offset + limit < progress.length,
      },
      metadata: {
        responseTime: `${responseTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        userId,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'X-Response-Time': `${responseTime.toFixed(2)}ms`,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    const responseTime = performance.now() - startTime;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.errors,
        },
        {
          status: 400,
          headers: {
            'X-Response-Time': `${responseTime.toFixed(2)}ms`,
          },
        }
      );
    }

    apiLogger.error('Failed to get learning progress:', asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve learning progress',
        message: 'An error occurred. Please try again.',
      },
      {
        status: 500,
        headers: {
          'Retry-After': '30',
          'X-Response-Time': `${responseTime.toFixed(2)}ms`,
        },
      }
    );
  }
}

/**
 * POST /api/progress - Update learning progress
 */
async function handleUpdateProgress(request: AuthenticatedRequest) {
  const startTime = performance.now();
  const userId = request.user?.id;

  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Parse and validate request with type-safe schema
    const validatedData: UpdateLearningProgressRequest = updateProgressSchema.parse(body);

    const updatedProgress = await DatabaseService.updateLearningProgress(
      userId,
      validatedData.vocabulary_item_id,
      {
        mastery_level: validatedData.mastery_level,
        times_reviewed: validatedData.times_reviewed,
        times_correct: validatedData.correct_count,
        last_reviewed: new Date().toISOString(),
      }
    );

    if (!updatedProgress) {
      throw new Error('Failed to update learning progress');
    }

    const responseTime = performance.now() - startTime;

    // Type-safe response
    const response: UpdateLearningProgressResponse = {
      success: true,
      data: {
        id: updatedProgress.id,
        userId: updatedProgress.user_id,
        vocabularyItemId: updatedProgress.vocabulary_item_id,
        masteryLevel: updatedProgress.mastery_level || 0,
        timesReviewed: updatedProgress.times_reviewed || 0,
        timesCorrect: updatedProgress.times_correct || 0,
        timesIncorrect:
          (updatedProgress.times_reviewed || 0) - (updatedProgress.times_correct || 0),
        lastReviewed: updatedProgress.last_reviewed || null,
        lastReviewScore: updatedProgress.last_review_score || null,
        createdAt: updatedProgress.created_at || new Date().toISOString(),
        updatedAt: updatedProgress.updated_at || new Date().toISOString(),
      },
      metadata: {
        responseTime: `${responseTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        userId,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-Response-Time': `${responseTime.toFixed(2)}ms`,
      },
    });
  } catch (error) {
    const responseTime = performance.now() - startTime;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: error.errors,
        },
        {
          status: 400,
          headers: {
            'X-Response-Time': `${responseTime.toFixed(2)}ms`,
          },
        }
      );
    }

    apiLogger.error('Failed to update learning progress:', asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update learning progress',
        message: 'An error occurred. Please try again.',
      },
      {
        status: 500,
        headers: {
          'Retry-After': '30',
          'X-Response-Time': `${responseTime.toFixed(2)}ms`,
        },
      }
    );
  }
}

// Export authenticated handlers
export const GET = withBasicAuth(handleGetProgress, {
  requiredFeatures: ['vocabulary_save'],
});

export const POST = withBasicAuth(handleUpdateProgress, {
  requiredFeatures: ['vocabulary_save'],
});
