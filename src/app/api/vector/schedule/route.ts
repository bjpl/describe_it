/**
 * Review Schedule API
 * Get optimal review schedule with GNN-enhanced predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { learningService } from '@/lib/vector/services/learning';
import { spacedRepetitionBridge } from '@/lib/vector/services/spaced-repetition-bridge';
import { featureFlags } from '@/lib/vector/config';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const scheduleSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(20),
  includeGNNEnhancement: z.boolean().default(true),
});

const hybridScheduleSchema = z.object({
  userId: z.string().min(1),
  cards: z.array(
    z.object({
      id: z.string(),
      easeFactor: z.number().min(1.3).max(2.5),
      interval: z.number().int().min(0),
      repetitions: z.number().int().min(0),
      nextReview: z.string().datetime(),
      word: z.string().optional(),
    })
  ),
});

/**
 * GET optimal review schedule for a user
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    if (!userId) {
      return NextResponse.json({ error: 'userId query parameter is required' }, { status: 400 });
    }

    const schedule = await learningService.getOptimalReviewSchedule(userId, limit);

    const latency = Date.now() - startTime;

    logger.info('[ScheduleAPI] Schedule retrieved', {
      userId,
      itemCount: schedule.length,
      latencyMs: latency,
    });

    return NextResponse.json(
      {
        schedule: schedule.map(item => ({
          vocabularyId: item.vocabularyId,
          scheduledDate: item.scheduledDate.toISOString(),
          priority: item.priority,
        })),
        meta: {
          userId,
          count: schedule.length,
          latencyMs: latency,
          gnnEnabled: featureFlags.useGNNLearning(),
        },
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=60',
          'X-Response-Time': `${latency}ms`,
        },
      }
    );
  } catch (error) {
    logger.error('[ScheduleAPI] Schedule retrieval failed', { error });

    return NextResponse.json(
      {
        error: 'Failed to retrieve schedule',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST hybrid schedule with SM-2 + GNN enhancement
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const validation = hybridScheduleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, cards } = validation.data;

    // Convert string dates to Date objects
    const processedCards = cards.map(card => ({
      ...card,
      nextReview: new Date(card.nextReview),
    }));

    const hybridSchedule = await spacedRepetitionBridge.getHybridSchedule(userId, processedCards);

    const latency = Date.now() - startTime;

    logger.info('[ScheduleAPI] Hybrid schedule generated', {
      userId,
      cardCount: cards.length,
      gnnAvailable: spacedRepetitionBridge.isGNNAvailable(),
      latencyMs: latency,
    });

    return NextResponse.json(
      {
        schedule: hybridSchedule.map(item => ({
          cardId: item.card.id,
          word: item.card.word,
          scheduledDate: item.scheduledDate.toISOString(),
          confidenceScore: item.confidenceScore,
          recommendedRelated: item.recommendedRelated,
          source: item.source,
        })),
        meta: {
          userId,
          count: hybridSchedule.length,
          latencyMs: latency,
          gnnAvailable: spacedRepetitionBridge.isGNNAvailable(),
          bridgeConfig: spacedRepetitionBridge.getConfig(),
        },
      },
      {
        headers: {
          'X-Response-Time': `${latency}ms`,
          'X-GNN-Available': String(spacedRepetitionBridge.isGNNAvailable()),
        },
      }
    );
  } catch (error) {
    logger.error('[ScheduleAPI] Hybrid schedule generation failed', { error });

    return NextResponse.json(
      {
        error: 'Failed to generate hybrid schedule',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT to adapt card difficulty based on GNN predictions
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    const { userId, card } = body as {
      userId?: string;
      card?: {
        id: string;
        easeFactor: number;
        interval: number;
        repetitions: number;
        nextReview: string;
        word?: string;
      };
    };

    if (!userId || !card) {
      return NextResponse.json({ error: 'userId and card are required' }, { status: 400 });
    }

    const processedCard = {
      ...card,
      nextReview: new Date(card.nextReview),
    };

    const adaptedCard = await spacedRepetitionBridge.adaptDifficulty(processedCard, userId);

    const latency = Date.now() - startTime;

    return NextResponse.json(
      {
        adaptedCard: {
          ...adaptedCard,
          nextReview: adaptedCard.nextReview.toISOString(),
        },
        changes: {
          easeFactorDelta: adaptedCard.easeFactor - card.easeFactor,
          intervalDelta: adaptedCard.interval - card.interval,
        },
        meta: {
          userId,
          cardId: card.id,
          latencyMs: latency,
          gnnAvailable: spacedRepetitionBridge.isGNNAvailable(),
        },
      },
      {
        headers: {
          'X-Response-Time': `${latency}ms`,
        },
      }
    );
  } catch (error) {
    logger.error('[ScheduleAPI] Difficulty adaptation failed', { error });

    return NextResponse.json(
      {
        error: 'Failed to adapt difficulty',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
