# RuVector Integration Architecture
**System Architecture Design Document**
**Version:** 1.0.0
**Date:** 2025-12-01
**Status:** Design Phase

---

## Table of Contents
1. [Overview](#overview)
2. [API Route Architecture](#api-route-architecture)
3. [Store Integration Layer](#store-integration-layer)
4. [Search Enhancement Layer](#search-enhancement-layer)
5. [Algorithm Bridge](#algorithm-bridge)
6. [TypeScript Interfaces](#typescript-interfaces)
7. [Error Handling & Resilience](#error-handling--resilience)
8. [Performance Considerations](#performance-considerations)

---

## Overview

### System Context
RuVector provides semantic search, knowledge graphs, and GNN-based learning optimization. Integration requires a clean separation between:
- **Coordination Layer**: Vector services (embeddings, search, graph, learning, cache)
- **Execution Layer**: Next.js API routes, Zustand stores, UI components
- **Fallback Strategy**: SQL search when vector services unavailable

### Design Principles
1. **Graceful Degradation**: System remains functional without RuVector
2. **Feature Flag Control**: `featureFlags.useVectorSearch()` gates all vector features
3. **Type Safety**: Full TypeScript coverage with validation
4. **Separation of Concerns**: Clear boundaries between layers
5. **Performance**: Hybrid RRF fusion combines vector + SQL results

---

## API Route Architecture

### 1. Vector Search Endpoint
**Route:** `POST /api/vector/search`

```typescript
// File: src/app/api/vector/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { vectorSearchService } from '@/lib/vector';
import { featureFlags } from '@/lib/vector/config';
import { supabaseService } from '@/lib/api/supabase';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Request schema
const searchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  collection: z.enum(['vocabulary', 'images', 'descriptions']),
  limit: z.number().int().positive().max(100).optional(),
  threshold: z.number().min(0).max(1).optional(),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'contains']),
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
  })).optional(),
  userId: z.string().optional(),
  includeMetadata: z.boolean().optional(),
  enableHybrid: z.boolean().optional().default(true), // Enable RRF fusion
});

type SearchRequest = z.infer<typeof searchRequestSchema>;

// Response types
interface VectorSearchResponse {
  results: Array<{
    id: string;
    score: number;
    metadata: Record<string, unknown>;
  }>;
  source: 'vector' | 'sql' | 'hybrid';
  totalResults: number;
  processingTime: number;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Parse and validate request
    const body = await req.json();
    const params = searchRequestSchema.parse(body);

    // Check feature flag
    if (!featureFlags.useVectorSearch()) {
      return await fallbackToSQLSearch(params, startTime);
    }

    // Vector search
    try {
      const results = await vectorSearchService.search(
        params.query,
        params.collection,
        {
          limit: params.limit,
          threshold: params.threshold,
          filters: params.filters,
          includeMetadata: params.includeMetadata ?? true,
        }
      );

      // Hybrid fusion if enabled
      if (params.enableHybrid) {
        const sqlResults = await getSQLResults(params);
        const fusedResults = performRRFFusion(results, sqlResults);

        return NextResponse.json({
          results: fusedResults,
          source: 'hybrid',
          totalResults: fusedResults.length,
          processingTime: Date.now() - startTime,
        } as VectorSearchResponse);
      }

      return NextResponse.json({
        results,
        source: 'vector',
        totalResults: results.length,
        processingTime: Date.now() - startTime,
      } as VectorSearchResponse);

    } catch (vectorError) {
      logger.warn('[VectorSearch] Vector search failed, falling back to SQL', {
        error: vectorError
      });
      return await fallbackToSQLSearch(params, startTime);
    }

  } catch (error) {
    logger.error('[VectorSearch] Request failed', { error });
    return NextResponse.json(
      { error: 'Search request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Fallback to SQL search
async function fallbackToSQLSearch(
  params: SearchRequest,
  startTime: number
): Promise<NextResponse> {
  // Implementation based on collection type
  let results;
  switch (params.collection) {
    case 'vocabulary':
      results = await supabaseService.getClient()
        ?.from('phrases')
        .select('*')
        .textSearch('phrase', params.query)
        .limit(params.limit ?? 10);
      break;
    case 'images':
      results = await supabaseService.searchImages(params.query, params.limit ?? 10);
      break;
    case 'descriptions':
      results = await supabaseService.getClient()
        ?.from('descriptions')
        .select('*')
        .textSearch('content', params.query)
        .limit(params.limit ?? 10);
      break;
  }

  return NextResponse.json({
    results: results?.data?.map((item, idx) => ({
      id: item.id,
      score: 1 - (idx * 0.05), // Synthetic scores
      metadata: item,
    })) ?? [],
    source: 'sql',
    totalResults: results?.data?.length ?? 0,
    processingTime: Date.now() - startTime,
  } as VectorSearchResponse);
}

// SQL results for hybrid fusion
async function getSQLResults(params: SearchRequest) {
  // Similar to fallbackToSQLSearch but returns raw format for fusion
  // Implementation details...
  return [];
}

// Reciprocal Rank Fusion
function performRRFFusion(
  vectorResults: any[],
  sqlResults: any[],
  k: number = 60
) {
  const scoreMap = new Map<string, number>();

  // Vector results
  vectorResults.forEach((result, rank) => {
    const score = 1 / (k + rank + 1);
    scoreMap.set(result.id, (scoreMap.get(result.id) || 0) + score);
  });

  // SQL results
  sqlResults.forEach((result, rank) => {
    const score = 1 / (k + rank + 1);
    scoreMap.set(result.id, (scoreMap.get(result.id) || 0) + score);
  });

  // Sort by fused score
  return Array.from(scoreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => {
      const vectorMatch = vectorResults.find(r => r.id === id);
      const sqlMatch = sqlResults.find(r => r.id === id);
      return {
        id,
        score,
        metadata: vectorMatch?.metadata || sqlMatch?.metadata || {},
      };
    });
}
```

### 2. Embedding Generation Endpoint
**Route:** `POST /api/vector/embed`

```typescript
// File: src/app/api/vector/embed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { embeddingService } from '@/lib/vector';
import { z } from 'zod';

const embedRequestSchema = z.object({
  text: z.string().min(1).max(8000),
  model: z.enum(['claude-3-5-sonnet-20241022', 'text-embedding-ada-002']).optional(),
  dimensions: z.enum([1536, 768, 384]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = embedRequestSchema.parse(body);

    const result = await embeddingService.generateEmbedding(params.text, {
      model: params.model,
      dimensions: params.dimensions,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Embedding generation failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
```

### 3. GNN Predictions Endpoint
**Route:** `GET /api/vector/predictions/:userId/:vocabId`

```typescript
// File: src/app/api/vector/predictions/[userId]/[vocabId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { learningService } from '@/lib/vector';
import { featureFlags } from '@/lib/vector/config';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string; vocabId: string } }
) {
  try {
    if (!featureFlags.useGNNLearning()) {
      return NextResponse.json(
        { error: 'GNN learning is not enabled' },
        { status: 503 }
      );
    }

    const prediction = await learningService.getPrediction(
      params.userId,
      params.vocabId
    );

    return NextResponse.json({
      prediction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Prediction failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
```

### 4. Learning Interactions Endpoint
**Route:** `POST /api/vector/interactions`

```typescript
// File: src/app/api/vector/interactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { learningService } from '@/lib/vector';
import { z } from 'zod';

const interactionSchema = z.object({
  userId: z.string(),
  vocabularyId: z.string(),
  success: z.boolean(),
  responseTime: z.number().int().positive(),
  timestamp: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = interactionSchema.parse(body);

    await learningService.recordInteraction(
      params.userId,
      params.vocabularyId,
      params.success,
      params.responseTime
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to record interaction', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
```

### 5. Review Schedule Endpoint
**Route:** `GET /api/vector/schedule/:userId`

```typescript
// File: src/app/api/vector/schedule/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { learningService } from '@/lib/vector';
import { featureFlags } from '@/lib/vector/config';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    if (!featureFlags.useGNNLearning()) {
      return NextResponse.json(
        { error: 'GNN learning is not enabled' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const schedule = await learningService.getOptimalReviewSchedule(
      params.userId,
      limit
    );

    return NextResponse.json({
      schedule,
      totalItems: schedule.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get review schedule', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
```

### 6. Health Check Endpoint
**Route:** `GET /api/vector/health`

```typescript
// File: src/app/api/vector/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { vectorClient, isVectorClientReady } from '@/lib/vector';
import { featureFlags, getVectorConfig } from '@/lib/vector/config';
import {
  embeddingService,
  vectorSearchService,
  graphService,
  learningService
} from '@/lib/vector';

export async function GET(req: NextRequest) {
  const health = {
    status: 'unknown',
    timestamp: new Date().toISOString(),
    features: {
      vectorSearch: featureFlags.useVectorSearch(),
      semanticCache: featureFlags.useSemanticCache(),
      gnnLearning: featureFlags.useGNNLearning(),
      knowledgeGraph: featureFlags.useKnowledgeGraph(),
    },
    services: {
      vectorClient: false,
      embedding: false,
      search: false,
      graph: false,
      learning: false,
    },
    config: getVectorConfig(),
  };

  // Check vector client
  health.services.vectorClient = isVectorClientReady();

  // Test services if client is ready
  if (health.services.vectorClient) {
    try {
      // Test embedding
      await embeddingService.generateEmbedding('health check');
      health.services.embedding = true;
    } catch {}

    try {
      // Test search (assumes vocabulary collection exists)
      await vectorSearchService.search('test', 'vocabulary', { limit: 1 });
      health.services.search = true;
    } catch {}

    try {
      // Test graph
      await graphService.query('MATCH (n) RETURN n LIMIT 1');
      health.services.graph = true;
    } catch {}

    try {
      // Test learning (checks if service responds)
      await learningService.getPrediction('health-check-user', 'health-check-vocab');
      health.services.learning = true;
    } catch {}
  }

  // Determine overall status
  const allServicesHealthy = Object.values(health.services).every(s => s === true);
  health.status = allServicesHealthy ? 'healthy' : 'degraded';

  const statusCode = health.status === 'healthy' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
```

---

## Store Integration Layer

### Bridge Interface: `learningSessionStore` ↔ `learningService`

```typescript
// File: src/lib/integrations/vector-store-bridge.ts
import { useLearningSessionStore } from '@/lib/store/learningSessionStore';
import { learningService } from '@/lib/vector';
import { featureFlags } from '@/lib/vector/config';
import { logger } from '@/lib/logger';

/**
 * VectorStoreBridge
 * Syncs learning session activity with RuVector's GNN service
 */
export class VectorStoreBridge {
  private static instance: VectorStoreBridge | null = null;
  private syncQueue: Array<{
    userId: string;
    vocabularyId: string;
    success: boolean;
    responseTime: number;
    timestamp: Date;
  }> = [];
  private syncInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): VectorStoreBridge {
    if (!VectorStoreBridge.instance) {
      VectorStoreBridge.instance = new VectorStoreBridge();
    }
    return VectorStoreBridge.instance;
  }

  /**
   * Start background sync process
   * Flushes queue every 30 seconds
   */
  public startBackgroundSync(intervalMs: number = 30000): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      this.flushQueue().catch(error => {
        logger.error('[VectorStoreBridge] Background sync failed', { error });
      });
    }, intervalMs);

    logger.info('[VectorStoreBridge] Started background sync', { intervalMs });
  }

  /**
   * Stop background sync
   */
  public stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('[VectorStoreBridge] Stopped background sync');
    }
  }

  /**
   * Record learning activity
   * Queues interaction for batch sync with GNN
   */
  public recordActivity(
    userId: string,
    vocabularyId: string,
    correct: boolean,
    responseTimeMs: number
  ): void {
    // Always record in Zustand store
    useLearningSessionStore.getState().recordActivity({
      type: 'question_answered',
      correct,
      points: correct ? 10 : 0,
    });

    // Queue for GNN sync if enabled
    if (featureFlags.useGNNLearning()) {
      this.syncQueue.push({
        userId,
        vocabularyId,
        success: correct,
        responseTime: responseTimeMs,
        timestamp: new Date(),
      });

      logger.debug('[VectorStoreBridge] Queued activity for sync', {
        queueSize: this.syncQueue.length,
      });
    }
  }

  /**
   * Flush queued interactions to GNN service
   */
  public async flushQueue(): Promise<void> {
    if (this.syncQueue.length === 0) return;
    if (!featureFlags.useGNNLearning()) {
      this.syncQueue = [];
      return;
    }

    const batch = [...this.syncQueue];
    this.syncQueue = [];

    logger.info('[VectorStoreBridge] Flushing sync queue', {
      batchSize: batch.length
    });

    const results = await Promise.allSettled(
      batch.map(item =>
        learningService.recordInteraction(
          item.userId,
          item.vocabularyId,
          item.success,
          item.responseTime
        )
      )
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      logger.warn('[VectorStoreBridge] Some interactions failed to sync', {
        failures: failures.length,
        total: batch.length,
      });
    }
  }

  /**
   * Sync current stats with GNN predictions
   * Enriches store data with GNN insights
   */
  public async enrichStatsWithPredictions(
    userId: string,
    vocabularyIds: string[]
  ): Promise<Map<string, {
    nextReview: Date;
    predictedSuccess: number;
    confidence: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }>> {
    const enrichedStats = new Map();

    if (!featureFlags.useGNNLearning()) {
      return enrichedStats;
    }

    try {
      const predictions = await Promise.allSettled(
        vocabularyIds.map(vocabId =>
          learningService.getPrediction(userId, vocabId).then(pred => ({
            vocabId,
            pred
          }))
        )
      );

      predictions.forEach(result => {
        if (result.status === 'fulfilled') {
          const { vocabId, pred } = result.value;
          enrichedStats.set(vocabId, {
            nextReview: pred.nextReviewDate,
            predictedSuccess: pred.predictedSuccessRate,
            confidence: pred.confidence,
            difficulty: pred.recommendedDifficulty,
          });
        }
      });

      logger.info('[VectorStoreBridge] Enriched stats with GNN predictions', {
        requested: vocabularyIds.length,
        enriched: enrichedStats.size,
      });

    } catch (error) {
      logger.error('[VectorStoreBridge] Failed to enrich stats', { error });
    }

    return enrichedStats;
  }

  /**
   * Get optimal review schedule from GNN
   */
  public async getOptimalSchedule(
    userId: string,
    limit: number = 20
  ): Promise<Array<{
    vocabularyId: string;
    scheduledDate: Date;
    priority: number;
  }>> {
    if (!featureFlags.useGNNLearning()) {
      return [];
    }

    try {
      return await learningService.getOptimalReviewSchedule(userId, limit);
    } catch (error) {
      logger.error('[VectorStoreBridge] Failed to get review schedule', { error });
      return [];
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopBackgroundSync();
    this.syncQueue = [];
  }
}

// Singleton instance
export const vectorStoreBridge = VectorStoreBridge.getInstance();

// React hook for automatic sync
export function useVectorStoreSync(
  userId: string | null,
  enabled: boolean = true
) {
  React.useEffect(() => {
    if (!userId || !enabled) return;

    vectorStoreBridge.startBackgroundSync();

    return () => {
      vectorStoreBridge.flushQueue().catch(console.error);
    };
  }, [userId, enabled]);
}
```

---

## Search Enhancement Layer

### Hybrid Search Service

```typescript
// File: src/lib/services/hybrid-search.ts
import { vectorSearchService } from '@/lib/vector';
import { featureFlags } from '@/lib/vector/config';
import { supabaseService } from '@/lib/api/supabase';
import { logger } from '@/lib/logger';

export interface HybridSearchOptions {
  query: string;
  collection: 'vocabulary' | 'images' | 'descriptions';
  limit?: number;
  threshold?: number;
  userId?: string;
  useVector?: boolean; // Override feature flag
  useFusion?: boolean; // Enable RRF fusion
}

export interface HybridSearchResult<T = Record<string, unknown>> {
  id: string;
  score: number;
  metadata: T;
  source: 'vector' | 'sql' | 'hybrid';
}

class HybridSearchService {
  private static instance: HybridSearchService | null = null;

  private constructor() {}

  public static getInstance(): HybridSearchService {
    if (!HybridSearchService.instance) {
      HybridSearchService.instance = new HybridSearchService();
    }
    return HybridSearchService.instance;
  }

  /**
   * Hybrid search with automatic fallback
   */
  public async search<T = Record<string, unknown>>(
    options: HybridSearchOptions
  ): Promise<HybridSearchResult<T>[]> {
    const {
      query,
      collection,
      limit = 10,
      threshold = 0.7,
      useVector = featureFlags.useVectorSearch(),
      useFusion = true,
    } = options;

    // Vector search if enabled
    if (useVector) {
      try {
        const vectorResults = await this.performVectorSearch<T>(
          query,
          collection,
          limit,
          threshold
        );

        // Fusion with SQL if enabled
        if (useFusion) {
          const sqlResults = await this.performSQLSearch<T>(query, collection, limit);
          return this.performRRFFusion(vectorResults, sqlResults);
        }

        return vectorResults;
      } catch (error) {
        logger.warn('[HybridSearch] Vector search failed, falling back to SQL', {
          error
        });
      }
    }

    // Fallback to SQL
    return await this.performSQLSearch<T>(query, collection, limit);
  }

  private async performVectorSearch<T>(
    query: string,
    collection: string,
    limit: number,
    threshold: number
  ): Promise<HybridSearchResult<T>[]> {
    const results = await vectorSearchService.search<T>(
      query,
      collection,
      { limit, threshold, includeMetadata: true }
    );

    return results.map(r => ({
      id: r.id,
      score: r.score,
      metadata: r.metadata,
      source: 'vector' as const,
    }));
  }

  private async performSQLSearch<T>(
    query: string,
    collection: string,
    limit: number
  ): Promise<HybridSearchResult<T>[]> {
    let results: any[] = [];

    switch (collection) {
      case 'vocabulary':
        const phrases = await supabaseService.getClient()
          ?.from('phrases')
          .select('*')
          .textSearch('phrase', query)
          .limit(limit);
        results = phrases?.data || [];
        break;

      case 'images':
        results = await supabaseService.searchImages(query, limit);
        break;

      case 'descriptions':
        const descriptions = await supabaseService.getClient()
          ?.from('descriptions')
          .select('*')
          .textSearch('content', query)
          .limit(limit);
        results = descriptions?.data || [];
        break;
    }

    return results.map((item, idx) => ({
      id: item.id,
      score: 1 - (idx * 0.05), // Synthetic scores
      metadata: item as T,
      source: 'sql' as const,
    }));
  }

  /**
   * Reciprocal Rank Fusion
   * Combines vector and SQL results with balanced weighting
   */
  private performRRFFusion<T>(
    vectorResults: HybridSearchResult<T>[],
    sqlResults: HybridSearchResult<T>[],
    k: number = 60
  ): HybridSearchResult<T>[] {
    const scoreMap = new Map<string, { score: number; metadata: T }>();

    // Vector results (higher weight)
    vectorResults.forEach((result, rank) => {
      const score = 1 / (k + rank + 1);
      scoreMap.set(result.id, {
        score: (scoreMap.get(result.id)?.score || 0) + score * 1.2, // 1.2x weight
        metadata: result.metadata,
      });
    });

    // SQL results
    sqlResults.forEach((result, rank) => {
      const existing = scoreMap.get(result.id);
      const score = 1 / (k + rank + 1);
      scoreMap.set(result.id, {
        score: (existing?.score || 0) + score,
        metadata: existing?.metadata || result.metadata,
      });
    });

    // Sort by fused score
    return Array.from(scoreMap.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .map(([id, data]) => ({
        id,
        score: data.score,
        metadata: data.metadata,
        source: 'hybrid' as const,
      }));
  }
}

export const hybridSearchService = HybridSearchService.getInstance();
```

---

## Algorithm Bridge

### Enhanced Spaced Repetition Bridge

```typescript
// File: src/lib/integrations/spaced-repetition-integration.ts
import { SpacedRepetitionAlgorithm } from '@/lib/algorithms/spaced-repetition';
import { spacedRepetitionBridge } from '@/lib/vector';
import { featureFlags } from '@/lib/vector/config';
import { logger } from '@/lib/logger';
import type { ReviewCard } from '@/lib/algorithms/algorithm-interface';

/**
 * Converts ReviewCard to SpacedRepetitionCard format
 */
function reviewCardToSRCard(card: ReviewCard) {
  return {
    id: card.id,
    easeFactor: card.easeFactor,
    interval: card.interval,
    repetitions: card.reviewCount,
    nextReview: card.nextReviewDate,
    word: card.imageId, // Using imageId as word identifier
  };
}

/**
 * Converts SpacedRepetitionCard back to ReviewCard
 */
function srCardToReviewCard(srCard: any, originalCard: ReviewCard): ReviewCard {
  return {
    ...originalCard,
    easeFactor: srCard.easeFactor,
    interval: srCard.interval,
    nextReviewDate: srCard.nextReview,
    reviewCount: srCard.repetitions,
  };
}

/**
 * EnhancedSpacedRepetition
 * Integrates SM-2 algorithm with GNN predictions
 */
export class EnhancedSpacedRepetition {
  private sm2Algorithm: SpacedRepetitionAlgorithm;

  constructor() {
    this.sm2Algorithm = new SpacedRepetitionAlgorithm();
  }

  /**
   * Update card with GNN enhancement
   */
  public async updateCard(
    card: ReviewCard,
    quality: number,
    userId: string,
    responseTime: number
  ): Promise<ReviewCard> {
    // Standard SM-2 update
    const sm2Updated = this.sm2Algorithm.updateCard(card, quality);

    // GNN enhancement if enabled
    if (featureFlags.useGNNLearning()) {
      try {
        const srCard = reviewCardToSRCard(sm2Updated);
        const enhanced = await spacedRepetitionBridge.enhanceWithGNN(
          srCard,
          userId
        );

        // Record interaction for GNN learning
        await spacedRepetitionBridge.syncLearningData(userId, [{
          cardId: card.id,
          quality,
          responseTime,
          correct: quality >= 3,
          timestamp: new Date(),
        }]);

        // Apply GNN adjustments if confident
        if (enhanced.gnnEnhanced && enhanced.predictedSuccess !== undefined) {
          const adapted = await spacedRepetitionBridge.adaptDifficulty(
            enhanced,
            userId
          );
          return srCardToReviewCard(adapted, sm2Updated);
        }

        return srCardToReviewCard(enhanced, sm2Updated);
      } catch (error) {
        logger.warn('[EnhancedSpacedRepetition] GNN enhancement failed, using SM-2 only', {
          error
        });
      }
    }

    return sm2Updated;
  }

  /**
   * Get hybrid review schedule
   */
  public async getReviewSchedule(
    userId: string,
    cards: ReviewCard[]
  ): Promise<Array<{
    card: ReviewCard;
    scheduledDate: Date;
    confidenceScore: number;
    recommendedRelated: string[];
    source: 'sm2' | 'gnn' | 'hybrid';
  }>> {
    if (!featureFlags.useGNNLearning()) {
      // Pure SM-2 schedule
      return cards
        .filter(card => new Date() >= card.nextReviewDate)
        .sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime())
        .map(card => ({
          card,
          scheduledDate: card.nextReviewDate,
          confidenceScore: (card.easeFactor - 1.3) / 1.2,
          recommendedRelated: [],
          source: 'sm2' as const,
        }));
    }

    // Hybrid schedule with GNN
    const srCards = cards.map(reviewCardToSRCard);
    const hybridSchedule = await spacedRepetitionBridge.getHybridSchedule(
      userId,
      srCards
    );

    return hybridSchedule.map(item => ({
      card: cards.find(c => c.id === item.card.id)!,
      scheduledDate: item.scheduledDate,
      confidenceScore: item.confidenceScore,
      recommendedRelated: item.recommendedRelated,
      source: item.source,
    }));
  }

  /**
   * Get SM-2 algorithm instance
   */
  public getSM2Algorithm(): SpacedRepetitionAlgorithm {
    return this.sm2Algorithm;
  }
}

export const enhancedSpacedRepetition = new EnhancedSpacedRepetition();
```

---

## TypeScript Interfaces

### Complete Interface Definitions

```typescript
// File: src/types/vector-integration.ts

/**
 * API Request/Response Types
 */
export interface VectorSearchRequest {
  query: string;
  collection: 'vocabulary' | 'images' | 'descriptions';
  limit?: number;
  threshold?: number;
  filters?: VectorFilter[];
  userId?: string;
  includeMetadata?: boolean;
  enableHybrid?: boolean;
}

export interface VectorFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: string | number | boolean | string[];
}

export interface VectorSearchResponse {
  results: Array<{
    id: string;
    score: number;
    metadata: Record<string, unknown>;
  }>;
  source: 'vector' | 'sql' | 'hybrid';
  totalResults: number;
  processingTime: number;
}

/**
 * Store Integration Types
 */
export interface LearningActivitySync {
  userId: string;
  vocabularyId: string;
  success: boolean;
  responseTime: number;
  timestamp: Date;
}

export interface EnrichedLearningStats {
  nextReview: Date;
  predictedSuccess: number;
  confidence: number;
  difficulty: 'easy' | 'medium' | 'hard';
  suggestedRelated?: string[];
}

/**
 * Algorithm Bridge Types
 */
export interface HybridScheduleItem {
  card: ReviewCard;
  scheduledDate: Date;
  confidenceScore: number;
  recommendedRelated: string[];
  source: 'sm2' | 'gnn' | 'hybrid';
}

export interface SessionResult {
  cardId: string;
  quality: number;
  responseTime: number;
  correct: boolean;
  timestamp: Date;
}

/**
 * Service Health Types
 */
export interface VectorHealthStatus {
  status: 'healthy' | 'degraded' | 'unavailable';
  timestamp: string;
  features: {
    vectorSearch: boolean;
    semanticCache: boolean;
    gnnLearning: boolean;
    knowledgeGraph: boolean;
  };
  services: {
    vectorClient: boolean;
    embedding: boolean;
    search: boolean;
    graph: boolean;
    learning: boolean;
  };
  config: RuVectorConfig;
}
```

---

## Error Handling & Resilience

### Error Handling Strategy

```typescript
// File: src/lib/integrations/vector-error-handler.ts
import { logger } from '@/lib/logger';
import { VectorError, EmbeddingError, SearchError, GraphError } from '@/lib/vector/types';

export class VectorErrorHandler {
  /**
   * Handle vector service errors with automatic fallback
   */
  static async handleWithFallback<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      logger.warn(`[VectorErrorHandler] ${context} failed, using fallback`, {
        error
      });
      return await fallback();
    }
  }

  /**
   * Classify and log vector errors
   */
  static classifyError(error: unknown): {
    type: 'network' | 'validation' | 'service' | 'unknown';
    retryable: boolean;
    statusCode: number;
  } {
    if (error instanceof VectorError) {
      return {
        type: 'service',
        retryable: error.statusCode >= 500,
        statusCode: error.statusCode,
      };
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        type: 'network',
        retryable: true,
        statusCode: 503,
      };
    }

    return {
      type: 'unknown',
      retryable: false,
      statusCode: 500,
    };
  }

  /**
   * Circuit breaker for vector services
   */
  static createCircuitBreaker(
    failureThreshold: number = 5,
    resetTimeout: number = 60000
  ) {
    let failures = 0;
    let lastFailure: Date | null = null;
    let isOpen = false;

    return {
      async execute<T>(
        operation: () => Promise<T>,
        fallback: () => Promise<T>
      ): Promise<T> {
        // Check if circuit should reset
        if (
          isOpen &&
          lastFailure &&
          Date.now() - lastFailure.getTime() > resetTimeout
        ) {
          failures = 0;
          isOpen = false;
          logger.info('[CircuitBreaker] Reset circuit breaker');
        }

        // Execute fallback if circuit is open
        if (isOpen) {
          logger.debug('[CircuitBreaker] Circuit open, using fallback');
          return fallback();
        }

        try {
          const result = await operation();
          failures = 0; // Reset on success
          return result;
        } catch (error) {
          failures++;
          lastFailure = new Date();

          if (failures >= failureThreshold) {
            isOpen = true;
            logger.warn('[CircuitBreaker] Circuit breaker opened', {
              failures
            });
          }

          return fallback();
        }
      },

      getStatus() {
        return { isOpen, failures, lastFailure };
      },
    };
  }
}

// Global circuit breaker for vector services
export const vectorCircuitBreaker = VectorErrorHandler.createCircuitBreaker();
```

---

## Performance Considerations

### Optimization Strategies

1. **Batch Operations**
   - Embed multiple texts in single API call
   - Queue learning interactions for batch sync
   - Use Promise.allSettled for parallel operations

2. **Caching**
   - Semantic cache for repeated searches
   - In-memory cache for GNN predictions (5min TTL)
   - Browser localStorage for user preferences

3. **Lazy Loading**
   - Initialize vector client only when needed
   - Load GNN models on-demand
   - Defer non-critical predictions

4. **Connection Pooling**
   - Reuse HTTP connections
   - Keep WebSocket alive for real-time updates
   - Pool graph database connections

5. **Monitoring**
   - Track API latency metrics
   - Monitor cache hit rates
   - Alert on circuit breaker trips

---

## Next Steps

1. **Implementation Priority**
   - Phase 1: API routes (`/api/vector/*`)
   - Phase 2: Store bridge (`VectorStoreBridge`)
   - Phase 3: Hybrid search (`HybridSearchService`)
   - Phase 4: Algorithm integration (`EnhancedSpacedRepetition`)

2. **Testing Requirements**
   - Unit tests for each service
   - Integration tests for API routes
   - E2E tests for hybrid search
   - Performance benchmarks

3. **Documentation**
   - API endpoint documentation
   - Integration guide for developers
   - Migration guide from SQL-only
   - Troubleshooting guide

---

**Architecture Review Date:** 2025-12-01
**Next Review:** After Phase 1 implementation
**Reviewer:** System Architect
