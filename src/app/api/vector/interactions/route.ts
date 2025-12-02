/**
 * Learning Interactions API
 * Record user learning interactions for GNN training
 */

import { NextRequest, NextResponse } from 'next/server';
import { learningService } from '@/lib/vector/services/learning';
import { graphService } from '@/lib/vector/services/graph';
import { featureFlags } from '@/lib/vector/config';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const interactionSchema = z.object({
  userId: z.string().min(1),
  vocabularyId: z.string().min(1),
  success: z.boolean(),
  responseTime: z.number().int().min(0).max(300000), // Max 5 minutes
  confusedWith: z.string().optional(), // Track if confused with another word
});

const batchInteractionSchema = z.object({
  userId: z.string().min(1),
  interactions: z.array(
    z.object({
      vocabularyId: z.string().min(1),
      success: z.boolean(),
      responseTime: z.number().int().min(0).max(300000),
      confusedWith: z.string().optional(),
    })
  ),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!featureFlags.useGNNLearning()) {
      // Still accept interactions but don't process with GNN
      logger.debug('[InteractionsAPI] GNN disabled, recording without GNN processing');
    }

    const body = await request.json();

    // Try batch first
    const batchValidation = batchInteractionSchema.safeParse(body);
    if (batchValidation.success) {
      const { userId, interactions } = batchValidation.data;

      let successCount = 0;
      let errorCount = 0;

      for (const interaction of interactions) {
        try {
          await learningService.recordInteraction(
            userId,
            interaction.vocabularyId,
            interaction.success,
            interaction.responseTime
          );

          if (interaction.confusedWith) {
            await graphService.recordConfusion(
              userId,
              interaction.vocabularyId,
              interaction.confusedWith
            );
          }

          successCount++;
        } catch (error) {
          errorCount++;
          logger.warn('[InteractionsAPI] Batch interaction failed', {
            vocabularyId: interaction.vocabularyId,
            error,
          });
        }
      }

      const latency = Date.now() - startTime;

      logger.info('[InteractionsAPI] Batch interactions recorded', {
        userId,
        total: interactions.length,
        success: successCount,
        errors: errorCount,
        latencyMs: latency,
      });

      return NextResponse.json(
        {
          recorded: successCount,
          errors: errorCount,
          total: interactions.length,
          meta: {
            userId,
            latencyMs: latency,
          },
        },
        {
          status: errorCount > 0 && successCount === 0 ? 500 : 200,
          headers: {
            'X-Response-Time': `${latency}ms`,
          },
        }
      );
    }

    // Single interaction
    const singleValidation = interactionSchema.safeParse(body);
    if (!singleValidation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: singleValidation.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, vocabularyId, success, responseTime, confusedWith } = singleValidation.data;

    await learningService.recordInteraction(userId, vocabularyId, success, responseTime);

    if (confusedWith) {
      await graphService.recordConfusion(userId, vocabularyId, confusedWith);
    }

    const latency = Date.now() - startTime;

    logger.info('[InteractionsAPI] Interaction recorded', {
      userId,
      vocabularyId,
      success,
      responseTime,
      hasConfusion: !!confusedWith,
      latencyMs: latency,
    });

    return NextResponse.json(
      {
        recorded: true,
        meta: {
          userId,
          vocabularyId,
          latencyMs: latency,
        },
      },
      {
        headers: {
          'X-Response-Time': `${latency}ms`,
        },
      }
    );
  } catch (error) {
    logger.error('[InteractionsAPI] Recording failed', { error });

    return NextResponse.json(
      {
        error: 'Failed to record interaction',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
