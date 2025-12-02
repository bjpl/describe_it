/**
 * Vector Services Health Check API
 * Monitor RuVector client and all vector service status
 */

import { NextRequest, NextResponse } from 'next/server';
import { vectorClient } from '@/lib/vector/client';
import { featureFlags, getVectorConfig } from '@/lib/vector/config';
import { embeddingService } from '@/lib/vector/services/embedding';
import { spacedRepetitionBridge } from '@/lib/vector/services/spaced-repetition-bridge';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disabled';
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const detailed = request.nextUrl.searchParams.get('detailed') === 'true';

  try {
    const services: ServiceStatus[] = [];
    const config = getVectorConfig();

    // Check Vector Client
    const clientStatus: ServiceStatus = {
      name: 'VectorClient',
      status: vectorClient.isReady() ? 'healthy' : 'unhealthy',
      details: {
        connected: vectorClient.isReady(),
        mockMode: !vectorClient.isReady(),
      },
    };
    services.push(clientStatus);

    // Check Feature Flags
    const featureFlagStatus: ServiceStatus = {
      name: 'FeatureFlags',
      status: 'healthy',
      details: {
        vectorSearch: featureFlags.useVectorSearch(),
        semanticCache: featureFlags.useSemanticCache(),
        gnnLearning: featureFlags.useGNNLearning(),
        knowledgeGraph: featureFlags.useKnowledgeGraph(),
      },
    };
    services.push(featureFlagStatus);

    // Check Embedding Service
    if (featureFlags.useVectorSearch()) {
      const embedStart = Date.now();
      try {
        const testResult = await embeddingService.generateEmbedding('health check');
        services.push({
          name: 'EmbeddingService',
          status: testResult.vector.length > 0 ? 'healthy' : 'degraded',
          latencyMs: Date.now() - embedStart,
          details: detailed ? {
            dimensions: testResult.dimensions,
            model: testResult.model,
            cached: testResult.cached,
          } : undefined,
        });
      } catch (error) {
        services.push({
          name: 'EmbeddingService',
          status: 'unhealthy',
          latencyMs: Date.now() - embedStart,
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    } else {
      services.push({
        name: 'EmbeddingService',
        status: 'disabled',
        details: { reason: 'Vector search feature flag is off' },
      });
    }

    // Check GNN Learning / Spaced Repetition Bridge
    if (featureFlags.useGNNLearning()) {
      services.push({
        name: 'GNNLearning',
        status: spacedRepetitionBridge.isGNNAvailable() ? 'healthy' : 'degraded',
        details: detailed ? {
          gnnAvailable: spacedRepetitionBridge.isGNNAvailable(),
          bridgeConfig: spacedRepetitionBridge.getConfig(),
        } : {
          gnnAvailable: spacedRepetitionBridge.isGNNAvailable(),
        },
      });
    } else {
      services.push({
        name: 'GNNLearning',
        status: 'disabled',
        details: { reason: 'GNN learning feature flag is off' },
      });
    }

    // Check Semantic Cache
    if (featureFlags.useSemanticCache()) {
      services.push({
        name: 'SemanticCache',
        status: 'healthy',
        details: detailed ? {
          enabled: config.cache.enabled,
          ttlSeconds: config.cache.ttlSeconds,
          maxSize: config.cache.maxSize,
          similarityThreshold: config.cache.similarityThreshold,
        } : undefined,
      });
    } else {
      services.push({
        name: 'SemanticCache',
        status: 'disabled',
        details: { reason: 'Semantic cache feature flag is off' },
      });
    }

    // Check Knowledge Graph
    if (featureFlags.useKnowledgeGraph()) {
      services.push({
        name: 'KnowledgeGraph',
        status: vectorClient.isReady() ? 'healthy' : 'degraded',
        details: {
          graphEnabled: config.gnn.enabled,
          trainingInterval: config.gnn.trainingInterval,
        },
      });
    } else {
      services.push({
        name: 'KnowledgeGraph',
        status: 'disabled',
        details: { reason: 'Knowledge graph feature flag is off' },
      });
    }

    // Calculate overall status
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    const healthyCount = services.filter(s => s.status === 'healthy').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const latency = Date.now() - startTime;

    logger.info('[VectorHealthAPI] Health check completed', {
      overallStatus,
      healthyCount,
      degradedCount,
      unhealthyCount,
      latencyMs: latency,
    });

    return NextResponse.json({
      status: overallStatus,
      services,
      summary: {
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
        disabled: services.filter(s => s.status === 'disabled').length,
        total: services.length,
      },
      config: detailed ? {
        collections: config.collections,
        embedding: config.embedding,
        search: config.search,
      } : undefined,
      meta: {
        timestamp: new Date().toISOString(),
        latencyMs: latency,
        version: '1.0.0',
      },
    }, {
      status: overallStatus === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${latency}ms`,
        'X-Health-Status': overallStatus,
      },
    });
  } catch (error) {
    logger.error('[VectorHealthAPI] Health check failed', { error });

    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      meta: {
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime,
      },
    }, {
      status: 503,
      headers: {
        'X-Health-Status': 'unhealthy',
      },
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
