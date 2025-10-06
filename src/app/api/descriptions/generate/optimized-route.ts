import { NextRequest, NextResponse } from 'next/server';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import OpenAI from 'openai';
import { z } from 'zod';

// Import logger and type guards
import { apiLogger } from '@/lib/logger';
import { asLogContext } from '@/lib/utils/typeGuards';

// Import our performance optimizations
import {
  poolManager,
  getCache,
  VisionDescriptionBatchProcessor,
  createCircuitBreaker,
  getPerformanceMonitor,
  withPerformanceTracking,
  withCaching,
  withResilience,
} from '@/lib/performance';

// Request validation schema
const requestSchema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string().optional().default('Describe this image in detail.'),
  model: z.string().optional().default('gpt-4-vision-preview'),
  maxTokens: z.number().optional().default(500),
  apiKey: z.string().min(1),
});

// Global instances for connection pooling and batching
const batchProcessors = new Map<string, VisionDescriptionBatchProcessor>();
const monitor = getPerformanceMonitor();
const cache = getCache();

// Circuit breaker for OpenAI API calls
const protectedVisionCall = withResilience(
  'openai-vision-api',
  async (client: OpenAI, options: any) => {
    return client.chat.completions.create(options);
  },
  {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    errorThresholdPercentage: 50,
    slowCallThresholdMs: 10000,
  }
);

// Cached image description with automatic cache key generation
const getCachedDescription = withCaching(
  async (imageUrl: string, prompt: string, model: string) => {
    // This will be called only on cache miss
    throw new Error('Cache miss - should not be called directly');
  },
  {
    keyGenerator: (imageUrl: string, prompt: string, model: string) => {
      const hash = cache.generateImageHash(imageUrl + prompt + model);
      return cache.generateKey('vision_description', hash);
    },
    ttl: 3600, // 1 hour
    tags: ['vision_descriptions', 'ai_generated'],
  }
);

// Get or create batch processor for an API key
function getBatchProcessor(apiKey: string): VisionDescriptionBatchProcessor {
  if (!batchProcessors.has(apiKey)) {
    const pool = poolManager.getPool(apiKey);
    const processor = new VisionDescriptionBatchProcessor(pool, {
      batchSize: 3, // Smaller batches for vision API
      maxBatchWaitMs: 300, // Slightly longer wait for better batching
      maxConcurrentBatches: 2,
      retryAttempts: 2,
    });
    
    batchProcessors.set(apiKey, processor);
    
    // Clean up processor after period of inactivity
    setTimeout(() => {
      if (batchProcessors.get(apiKey) === processor) {
        processor.drain().then(() => {
          batchProcessors.delete(apiKey);
        });
      }
    }, 300000); // 5 minutes
  }
  
  return batchProcessors.get(apiKey)!;
}

async function generateDescription(request: {
  imageUrl: string;
  prompt: string;
  model: string;
  maxTokens: number;
  apiKey: string;
}): Promise<{
  description: string;
  confidence: number;
  cached: boolean;
  processingTime: number;
  metadata: {
    model: string;
    tokens: number;
    batchId?: string;
  };
}> {
  const startTime = Date.now();

  // Generate cache key
  const cacheKey = cache.generateKey(
    'vision_description',
    cache.generateImageHash(request.imageUrl + request.prompt + request.model)
  );

  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached && typeof cached === 'object' && 'description' in cached && 'confidence' in cached && 'metadata' in cached) {
    monitor.incrementCounter('cache.hits', { type: 'vision_description' });
    return {
      ...(cached as { description: string; confidence: number; metadata: { model: string; tokens: number; batchId?: string } }),
      cached: true,
      processingTime: Date.now() - startTime,
    };
  }
  
  monitor.incrementCounter('cache.misses', { type: 'vision_description' });
  
  // Use batch processor for API call
  const batchProcessor = getBatchProcessor(request.apiKey);
  
  try {
    const result = await batchProcessor.process({
      imageUrl: request.imageUrl,
      prompt: request.prompt,
      model: request.model,
      maxTokens: request.maxTokens,
    });
    
    const response = {
      description: result.description,
      confidence: result.confidence || 0.8,
      cached: false,
      processingTime: result.processingTime,
      metadata: {
        model: request.model,
        tokens: result.description.length, // Approximate
        batchId: 'batch_' + Date.now(),
      },
    };
    
    // Cache the result
    await cache.set(cacheKey, response, 3600, ['vision_descriptions']);
    
    monitor.incrementCounter('api.vision.success');
    return response;
    
  } catch (error) {
    monitor.incrementCounter('api.vision.error');
    throw error;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timerId = monitor.startTimer('api.request.duration', { 
    endpoint: '/api/descriptions/generate',
    method: 'POST' 
  });
  
  monitor.incrementCounter('api.requests.total', { 
    endpoint: '/api/descriptions/generate' 
  });
  
  try {
    // Parse and validate request
    const requestText = await request.text();
    const body = safeParse(requestText);
    
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    };
    const validatedData = requestSchema.parse(body);
    
    monitor.incrementCounter('api.requests.validated');
    
    // Add request metadata
    monitor.gauge('api.concurrent_requests', 
      monitor.getCounter('api.requests.total') - monitor.getCounter('api.requests.completed')
    );
    
    // Generate description with all optimizations
    const result = await generateDescription(validatedData);
    
    // Track response metrics
    monitor.histogram('api.response.size', safeStringify(result).length);
    monitor.histogram('api.response.description_length', result.description.length);
    
    if (result.cached) {
      monitor.incrementCounter('api.responses.cached');
    } else {
      monitor.incrementCounter('api.responses.generated');
    }
    
    monitor.incrementCounter('api.requests.success');
    monitor.incrementCounter('api.requests.completed');
    
    const responseTime = monitor.endTimer(timerId);
    
    // Add performance headers
    const response = NextResponse.json({
      success: true,
      data: result,
      meta: {
        requestId,
        responseTime,
        cached: result.cached,
        timestamp: new Date().toISOString(),
      },
    });
    
    // Performance and caching headers
    response.headers.set('X-Request-ID', requestId);
    response.headers.set('X-Response-Time', `${responseTime}ms`);
    response.headers.set('X-Cache-Status', result.cached ? 'HIT' : 'MISS');
    response.headers.set('X-Rate-Limit-Remaining', '100'); // Placeholder
    
    if (result.cached) {
      response.headers.set('Cache-Control', 'public, max-age=3600');
    } else {
      response.headers.set('Cache-Control', 'public, max-age=300');
    }
    
    return response;
    
  } catch (error) {
    monitor.incrementCounter('api.requests.error');
    monitor.incrementCounter('api.requests.completed');
    monitor.endTimer(timerId);

    apiLogger.error('API Error:', asLogContext({
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }));
    
    // Handle specific error types
    if (error instanceof z.ZodError) {
      monitor.incrementCounter('api.errors.validation');
      return NextResponse.json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      }, { status: 400 });
    }


    if (error instanceof Error && error.message.includes('Circuit breaker is OPEN')) {
      monitor.incrementCounter('api.errors.circuit_breaker');
      return NextResponse.json({
        success: false,
        error: {
          type: 'SERVICE_UNAVAILABLE',
          message: 'Vision service is temporarily unavailable. Please try again later.',
          retryAfter: 60,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      }, { status: 503 });
    }


    if (error instanceof Error && error.message.includes('timeout')) {
      monitor.incrementCounter('api.errors.timeout');
      return NextResponse.json({
        success: false,
        error: {
          type: 'TIMEOUT',
          message: 'Request timed out. Please try again.',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      }, { status: 408 });
    }

    // Generic error
    monitor.incrementCounter('api.errors.internal');
    return NextResponse.json({
      success: false,
      error: {
        type: 'INTERNAL_ERROR',
        message: 'An internal error occurred. Please try again.',
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    }, { status: 500 });
  }
}

// Health check endpoint for monitoring
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      components: {
        performance: monitor.getHealthStatus(),
        pools: poolManager.getStats(),
        cache: await cache.getStats(),
        batching: {
          activeProcessors: batchProcessors.size,
          totalBatched: monitor.getCounter('batch.requests') || 0,
        },
      },
    };
    
    // Determine overall health
    const isHealthy = health.components.performance.status === 'healthy' &&
                     Object.values(health.components.pools).every(pool => pool.available > 0);
    
    return NextResponse.json(health, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    }, { status: 503 });
  }
}

// Performance metrics endpoint
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  try {
    const metrics = await monitor.generateReport();
    
    return NextResponse.json({
      metrics,
      pools: poolManager.getStats(),
      cache: await cache.getStats(),
      batching: Array.from(batchProcessors.entries()).map(([key, processor]) => ({
        apiKey: key.substring(0, 8) + '...',
        metrics: processor.getMetrics(),
        queueStats: processor.getQueueStats(),
      })),
    }, {
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to generate metrics',
      message: error.message,
    }, { status: 500 });
  }
}