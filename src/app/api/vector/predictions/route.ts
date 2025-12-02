/**
 * GNN Learning Predictions API
 * Get AI-powered learning predictions and confusion analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { learningService } from '@/lib/vector/services/learning';
import { featureFlags } from '@/lib/vector/config';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const predictionSchema = z.object({
  userId: z.string().min(1),
  vocabularyId: z.string().min(1),
});

const confusionSchema = z.object({
  userId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!featureFlags.useGNNLearning()) {
      return NextResponse.json(
        { error: 'GNN learning is not enabled', code: 'FEATURE_DISABLED' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validation = predictionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, vocabularyId } = validation.data;

    const prediction = await learningService.getPrediction(userId, vocabularyId);

    const latency = Date.now() - startTime;

    logger.info('[PredictionsAPI] Prediction generated', {
      userId,
      vocabularyId,
      predictedSuccess: prediction.predictedSuccessRate,
      confidence: prediction.confidence,
      latencyMs: latency,
    });

    return NextResponse.json({
      prediction: {
        nextReviewDate: prediction.nextReviewDate.toISOString(),
        predictedSuccessRate: prediction.predictedSuccessRate,
        confidence: prediction.confidence,
        recommendedDifficulty: prediction.recommendedDifficulty,
        suggestedRelatedWords: prediction.suggestedRelatedWords,
      },
      meta: {
        userId,
        vocabularyId,
        latencyMs: latency,
        gnnEnabled: featureFlags.useGNNLearning(),
      },
    }, {
      headers: {
        'X-Response-Time': `${latency}ms`,
      },
    });
  } catch (error) {
    logger.error('[PredictionsAPI] Prediction failed', { error });

    return NextResponse.json(
      {
        error: 'Prediction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET confusion pairs for a user
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!featureFlags.useGNNLearning()) {
      return NextResponse.json(
        { error: 'GNN learning is not enabled', code: 'FEATURE_DISABLED' },
        { status: 503 }
      );
    }

    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const confusionPairs = await learningService.getConfusionPairs(userId);

    const latency = Date.now() - startTime;

    logger.info('[PredictionsAPI] Confusion pairs retrieved', {
      userId,
      pairCount: confusionPairs.length,
      latencyMs: latency,
    });

    return NextResponse.json({
      confusionPairs,
      meta: {
        userId,
        count: confusionPairs.length,
        latencyMs: latency,
      },
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'X-Response-Time': `${latency}ms`,
      },
    });
  } catch (error) {
    logger.error('[PredictionsAPI] Confusion pairs retrieval failed', { error });

    return NextResponse.json(
      { error: 'Failed to retrieve confusion pairs', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
