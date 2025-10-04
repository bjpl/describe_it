import { NextRequest, NextResponse } from "next/server";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import {
  tieredCache,
  imageCache,
  descriptionCache,
  qaCache,
  phrasesCache,
} from "@/lib/cache/tiered-cache";
import { vercelKvCache } from "@/lib/api/vercel-kv";
import { memoryCache } from "@/lib/cache/memory-cache";
import { redisCache } from "@/lib/api/redis-adapter";
import { apiLogger } from '@/lib/logger';
import { asLogContext } from '@/lib/utils/typeGuards';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cache Status API
 * GET /api/cache/status - Get cache health and metrics
 * POST /api/cache/status - Perform cache operations (clear, health check)
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get("detailed") === "true";
  const healthOnly = searchParams.get("health") === "true";

  try {
    // Get health status for all cache layers
    const healthStatus = await tieredCache.healthCheck();

    if (healthOnly) {
      return NextResponse.json({
        service: "Cache Status API",
        status: healthStatus.overall ? "healthy" : "degraded",
        health: healthStatus,
        timestamp: new Date().toISOString(),
      });
    }

    // Get metrics from all cache instances
    const [
      tieredMetrics,
      imageMetrics,
      descriptionMetrics,
      qaMetrics,
      phrasesMetrics,
    ] = await Promise.all([
      tieredCache.getMetrics(),
      imageCache.getMetrics(),
      descriptionCache.getMetrics(),
      qaCache.getMetrics(),
      phrasesCache.getMetrics(),
    ]);

    // Get memory cache stats
    const memoryStats = memoryCache.getStats();

    // Get KV stats if available
    let kvStats = null;
    try {
      kvStats = await vercelKvCache.getStats();
    } catch (error) {
      apiLogger.warn("Could not get KV stats:", asLogContext(error));
    }

    // Get Redis stats if available
    let redisStats = null;
    let redisHealthy = false;
    try {
      redisHealthy = await redisCache.healthCheck();
      if (redisHealthy) {
        redisStats = await redisCache.getStats();
      }
    } catch (error) {
      apiLogger.warn("Could not get Redis stats:", asLogContext(error));
    }

    const response = {
      service: "Cache Status API",
      status: healthStatus.overall ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      health: healthStatus,
      summary: {
        totalHitRate: calculateAverageHitRate([
          tieredMetrics,
          imageMetrics,
          descriptionMetrics,
          qaMetrics,
          phrasesMetrics,
        ]),
        preferredProvider: tieredMetrics.preferredProvider,
        kvConfigured: !!(
          process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
        ),
        redisConfigured: !!process.env.REDIS_URL,
        redisHealthy: redisHealthy,
        memoryUsage: memoryStats.memoryEstimate,
        totalCachedItems: memoryStats.size,
      },
      ...(detailed && {
        detailed: {
          tiered: tieredMetrics,
          specialized: {
            images: imageMetrics,
            descriptions: descriptionMetrics,
            qa: qaMetrics,
            phrases: phrasesMetrics,
          },
          infrastructure: {
            memory: memoryStats,
            kv: kvStats,
            redis: redisStats,
            environment: {
              kvConfigured: !!(
                process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
              ),
              redisConfigured: !!process.env.REDIS_URL,
              redisHealthy: redisHealthy,
              maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE || "1000"),
              defaultTTL: parseInt(process.env.DEFAULT_CACHE_TTL || "3600"),
              cacheWriteThrough: process.env.CACHE_WRITE_THROUGH === "true",
              memoryFallbackEnabled:
                process.env.ENABLE_MEMORY_CACHE_FALLBACK !== "false",
            },
          },
        },
      }),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-cache",
        "X-Cache-Status": healthStatus.overall ? "healthy" : "degraded",
      },
    });
  } catch (error) {
    apiLogger.error("Cache status error:", error);

    return NextResponse.json(
      {
        service: "Cache Status API",
        status: "error",
        error: "Failed to retrieve cache status",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "X-Cache-Status": "error",
        },
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestText = await request.text();
    const body = safeParse(requestText);
    
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    };
    const { action, pattern, cacheType } = body;

    if (!action) {
      return NextResponse.json(
        {
          error: "Action required",
          validActions: ["clear", "health-check", "reset-metrics"],
        },
        { status: 400 },
      );
    }

    let result;

    switch (action) {
      case "clear":
        result = await performCacheClear(pattern, cacheType);
        break;

      case "health-check":
        result = await performHealthCheck();
        break;

      case "reset-metrics":
        result = performMetricsReset();
        break;

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}`,
            validActions: ["clear", "health-check", "reset-metrics"],
          },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    apiLogger.error("Cache operation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Cache operation failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

function calculateAverageHitRate(metrics: Array<{ hitRate: number }>): number {
  const validMetrics = metrics.filter(
    (m) => typeof m.hitRate === "number" && !isNaN(m.hitRate),
  );
  if (validMetrics.length === 0) return 0;

  const totalHitRate = validMetrics.reduce((sum, m) => sum + m.hitRate, 0);
  return totalHitRate / validMetrics.length;
}

async function performCacheClear(
  pattern?: string,
  cacheType?: string,
): Promise<any> {
  const results: Record<string, number> = {};

  if (!cacheType || cacheType === "all" || cacheType === "tiered") {
    results.tiered = await tieredCache.clear(pattern);
  }

  if (!cacheType || cacheType === "all" || cacheType === "images") {
    results.images = await imageCache.clear(pattern);
  }

  if (!cacheType || cacheType === "all" || cacheType === "descriptions") {
    results.descriptions = await descriptionCache.clear(pattern);
  }

  if (!cacheType || cacheType === "all" || cacheType === "qa") {
    results.qa = await qaCache.clear(pattern);
  }

  if (!cacheType || cacheType === "all" || cacheType === "phrases") {
    results.phrases = await phrasesCache.clear(pattern);
  }

  if (!cacheType || cacheType === "all" || cacheType === "memory") {
    results.memory = memoryCache.clear(pattern);
  }

  const total = Object.values(results).reduce((sum, count) => sum + count, 0);

  return {
    cleared: results,
    totalCleared: total,
    pattern: pattern || "*",
  };
}

async function performHealthCheck(): Promise<any> {
  const [
    tieredHealth,
    imageHealth,
    descriptionHealth,
    qaHealth,
    phrasesHealth,
  ] = await Promise.all([
    tieredCache.healthCheck(),
    imageCache.healthCheck(),
    descriptionCache.healthCheck(),
    qaCache.healthCheck(),
    phrasesCache.healthCheck(),
  ]);

  const memoryHealth = memoryCache.healthCheck();

  let kvHealth = false;
  try {
    kvHealth = await vercelKvCache.healthCheck();
  } catch (error) {
    apiLogger.warn("KV health check failed:", asLogContext(error));
  }

  let redisHealth = false;
  try {
    redisHealth = await redisCache.healthCheck();
  } catch (error) {
    apiLogger.warn("Redis health check failed:", asLogContext(error));
  }

  return {
    overall: tieredHealth.overall || redisHealth || memoryHealth,
    specialized: {
      tiered: tieredHealth,
      images: imageHealth,
      descriptions: descriptionHealth,
      qa: qaHealth,
      phrases: phrasesHealth,
    },
    infrastructure: {
      memory: memoryHealth,
      kv: kvHealth,
      redis: redisHealth,
    },
  };
}

function performMetricsReset(): any {
  // Reset metrics for all cache instances
  tieredCache.resetMetrics();
  imageCache.resetMetrics();
  descriptionCache.resetMetrics();
  qaCache.resetMetrics();
  phrasesCache.resetMetrics();

  return {
    message: "All cache metrics have been reset",
    resetAt: new Date().toISOString(),
  };
}
