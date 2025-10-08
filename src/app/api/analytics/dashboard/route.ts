/**
 * Analytics dashboard API endpoint
 * Provides aggregated analytics data for the dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { recordApiRequest } from '@/lib/monitoring/prometheus';
import { safeParse } from '@/lib/utils/json-safe';
import { createContextLogger } from '@/lib/logging/logger';

// Prevent prerendering during build (Redis not available)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  lazyConnect: true, // Don't connect during module load
  enableOfflineQueue: false, // Fail fast if not connected
  maxRetriesPerRequest: 0, // Don't retry during build
});

// Suppress Redis errors during build
redis.on('error', () => {
  // Silent fail during build - will connect on first use
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || '24h';

  try {
    // Calculate time range in milliseconds
    const timeRangeMs = getTimeRangeMs(timeRange);
    const now = Date.now();
    const startTime = now - timeRangeMs;

    // Fetch metrics data
    const metricsData = await getMetricsData(startTime, now);
    const apiKeysData = await getApiKeysData(startTime, now);
    const alertsData = await getAlertsData(startTime, now);

    const response = {
      metrics: metricsData,
      apiKeys: apiKeysData,
      alerts: alertsData,
      timeRange,
      generatedAt: now,
    };

    const duration = (Date.now() - startTime) / 1000;
    recordApiRequest('GET', '/api/analytics/dashboard', 200, duration);

    return NextResponse.json(response);
  } catch (error) {
    const logger = createContextLogger('analytics-dashboard');
    logger.error('Analytics dashboard API error', error);
    
    const duration = (Date.now() - startTime) / 1000;
    recordApiRequest('GET', '/api/analytics/dashboard', 500, duration);

    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

async function getMetricsData(startTime: number, endTime: number) {
  try {
    // This would typically query your metrics storage (Redis, InfluxDB, etc.)
    // For now, we'll return mock data - replace with actual metrics retrieval
    const metrics = [];
    const pointCount = Math.min(100, Math.floor((endTime - startTime) / (5 * 60 * 1000))); // 5-minute intervals
    
    for (let i = 0; i < pointCount; i++) {
      const timestamp = startTime + (i * (endTime - startTime) / pointCount);
      metrics.push({
        timestamp,
        apiCalls: Math.floor(Math.random() * 1000) + 100,
        errors: Math.floor(Math.random() * 50),
        avgResponseTime: Math.random() * 2000 + 200,
        activeUsers: Math.floor(Math.random() * 50) + 10,
        totalCost: Math.random() * 10 + 1,
      });
    }

    return metrics;
  } catch (error) {
    createContextLogger('analytics-metrics').error('Failed to fetch metrics data', { error: error instanceof Error ? error.message : error });
    return [];
  }
}

async function getApiKeysData(startTime: number, endTime: number) {
  try {
    // Fetch API key usage data from Redis
    const keys = await redis.keys('analytics:api_key:*');
    const apiKeysData = [];

    for (const key of keys.slice(0, 20)) { // Limit to 20 keys for performance
      try {
        const data = await redis.hgetall(key);
        const keyHash = key.split(':').pop() || 'unknown';
        
        apiKeysData.push({
          keyHash,
          keyName: data.name || null,
          requests: parseInt(data.requests || '0'),
          errors: parseInt(data.errors || '0'),
          cost: parseFloat(data.cost || '0'),
          lastUsed: parseInt(data.lastUsed || '0'),
          rateLimitHits: parseInt(data.rateLimitHits || '0'),
        });
      } catch (error) {
        createContextLogger('analytics-apikeys').error('Error processing API key data', { key, error: error instanceof Error ? error.message : error });
      }
    }

    return apiKeysData.sort((a, b) => b.requests - a.requests);
  } catch (error) {
    createContextLogger('analytics-apikeys').error('Failed to fetch API keys data', { error: error instanceof Error ? error.message : error });
    return [];
  }
}

async function getAlertsData(startTime: number, endTime: number) {
  try {
    // Fetch recent anomaly alerts
    const alertKeys = await redis.keys('anomaly:alerts:*');
    const allAlerts = [];

    for (const key of alertKeys.slice(0, 10)) { // Limit for performance
      try {
        const alerts = await redis.lrange(key, 0, 9); // Get last 10 alerts per key
        for (const alertStr of alerts) {
          const alert = safeParse<{ timestamp: number; [key: string]: any }>(
            alertStr,
            undefined
          );
          if (alert && alert.timestamp >= startTime && alert.timestamp <= endTime) {
            allAlerts.push(alert);
          }
        }
      } catch (error) {
        createContextLogger('analytics-alerts').error('Error processing alerts data', { key, error: error instanceof Error ? error.message : error });
      }
    }

    return allAlerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50); // Return last 50 alerts
  } catch (error) {
    createContextLogger('analytics-alerts').error('Failed to fetch alerts data', { error: error instanceof Error ? error.message : error });
    return [];
  }
}

function getTimeRangeMs(timeRange: string): number {
  switch (timeRange) {
    case '1h': return 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    case '30d': return 30 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}