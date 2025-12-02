/**
 * Vector Search API
 * Semantic search across vocabulary, descriptions, and translations
 */

import { NextRequest, NextResponse } from 'next/server';
import { vectorSearchService } from '@/lib/vector/services/search';
import { featureFlags } from '@/lib/vector/config';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  collection: z.enum(['vocabulary', 'descriptions', 'images', 'learning_patterns']).default('vocabulary'),
  limit: z.number().int().min(1).max(100).default(20),
  threshold: z.number().min(0).max(1).default(0.7),
  targetLanguage: z.string().optional(),
  includeVectors: z.boolean().default(false),
  hybridSearch: z.boolean().default(false),
  sqlQuery: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!featureFlags.useVectorSearch()) {
      return NextResponse.json(
        { error: 'Vector search is not enabled', code: 'FEATURE_DISABLED' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validation = searchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { query, collection, limit, threshold, targetLanguage, includeVectors, hybridSearch, sqlQuery } = validation.data;

    let results;

    if (collection === 'vocabulary' && targetLanguage) {
      results = await vectorSearchService.searchVocabulary(query, {
        limit,
        threshold,
        targetLanguage,
        includeVectors,
      });
    } else if (hybridSearch && sqlQuery) {
      results = await vectorSearchService.hybridSearch(query, collection, {
        limit,
        threshold,
        includeVectors,
        sqlQuery,
      });
    } else {
      results = await vectorSearchService.search(query, collection, {
        limit,
        threshold,
        includeVectors,
      });
    }

    const latency = Date.now() - startTime;

    logger.info('[VectorSearchAPI] Search completed', {
      query: query.substring(0, 50),
      collection,
      resultCount: results.length,
      latencyMs: latency,
    });

    return NextResponse.json({
      results,
      meta: {
        query,
        collection,
        count: results.length,
        latencyMs: latency,
        hybridSearch,
      },
    }, {
      headers: {
        'X-Response-Time': `${latency}ms`,
        'X-Result-Count': String(results.length),
      },
    });
  } catch (error) {
    logger.error('[VectorSearchAPI] Search failed', { error });

    return NextResponse.json(
      {
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!featureFlags.useVectorSearch()) {
      return NextResponse.json(
        { error: 'Vector search is not enabled', code: 'FEATURE_DISABLED' },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || searchParams.get('query');
    const collection = searchParams.get('collection') || 'vocabulary';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const threshold = parseFloat(searchParams.get('threshold') || '0.7');
    const targetLanguage = searchParams.get('lang') || undefined;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const results = collection === 'vocabulary' && targetLanguage
      ? await vectorSearchService.searchVocabulary(query, { limit, threshold, targetLanguage })
      : await vectorSearchService.search(query, collection, { limit, threshold });

    const latency = Date.now() - startTime;

    return NextResponse.json({
      results,
      meta: {
        query,
        collection,
        count: results.length,
        latencyMs: latency,
      },
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'X-Response-Time': `${latency}ms`,
      },
    });
  } catch (error) {
    logger.error('[VectorSearchAPI] GET search failed', { error });

    return NextResponse.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
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
