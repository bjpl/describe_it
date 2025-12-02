/**
 * Embedding Generation API
 * Generate embeddings for text using Claude or fallback
 */

import { NextRequest, NextResponse } from 'next/server';
import { embeddingService } from '@/lib/vector/services/embedding';
import { featureFlags } from '@/lib/vector/config';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const embedSchema = z.object({
  text: z.string().min(1).max(10000),
  texts: z.array(z.string().min(1).max(10000)).optional(),
  model: z.enum(['claude-3-5-sonnet-20241022', 'text-embedding-ada-002']).optional(),
  dimensions: z.union([z.literal(1536), z.literal(768), z.literal(384)]).optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!featureFlags.useVectorSearch()) {
      return NextResponse.json(
        { error: 'Vector features are not enabled', code: 'FEATURE_DISABLED' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validation = embedSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { text, texts, model, dimensions } = validation.data;
    const options = { model, dimensions };

    let result;

    if (texts && texts.length > 0) {
      // Batch embedding
      const embeddings = await embeddingService.batchEmbeddings(texts, options);
      result = {
        embeddings: embeddings.map((e, idx) => ({
          text: texts[idx].substring(0, 100) + (texts[idx].length > 100 ? '...' : ''),
          vector: e.vector,
          dimensions: e.dimensions,
          tokenCount: e.tokenCount,
          cached: e.cached,
        })),
        model: embeddings[0]?.model,
        batchSize: texts.length,
      };
    } else {
      // Single embedding
      const embedding = await embeddingService.generateEmbedding(text, options);
      result = {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        vector: embedding.vector,
        dimensions: embedding.dimensions,
        model: embedding.model,
        tokenCount: embedding.tokenCount,
        cached: embedding.cached,
      };
    }

    const latency = Date.now() - startTime;

    logger.info('[EmbeddingAPI] Embedding generated', {
      textLength: text?.length || 0,
      batchSize: texts?.length || 1,
      dimensions: 'embeddings' in result ? result.embeddings[0]?.dimensions : result.dimensions,
      latencyMs: latency,
      cached: 'embeddings' in result ? result.embeddings[0]?.cached : result.cached,
    });

    return NextResponse.json({
      ...result,
      meta: {
        latencyMs: latency,
      },
    }, {
      headers: {
        'X-Response-Time': `${latency}ms`,
      },
    });
  } catch (error) {
    logger.error('[EmbeddingAPI] Embedding generation failed', { error });

    return NextResponse.json(
      {
        error: 'Embedding generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate similarity between two vectors
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const { vectorA, vectorB } = body as { vectorA?: number[]; vectorB?: number[] };

    if (!vectorA || !vectorB || !Array.isArray(vectorA) || !Array.isArray(vectorB)) {
      return NextResponse.json(
        { error: 'Both vectorA and vectorB must be provided as arrays' },
        { status: 400 }
      );
    }

    if (vectorA.length !== vectorB.length) {
      return NextResponse.json(
        { error: 'Vectors must have the same dimensions' },
        { status: 400 }
      );
    }

    const similarity = embeddingService.getSimilarity(vectorA, vectorB);

    return NextResponse.json({
      similarity,
      dimensionsA: vectorA.length,
      dimensionsB: vectorB.length,
    });
  } catch (error) {
    logger.error('[EmbeddingAPI] Similarity calculation failed', { error });

    return NextResponse.json(
      { error: 'Similarity calculation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
