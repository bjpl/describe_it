/**
 * Analytics data export endpoint
 * Provides CSV and JSON export functionality for usage reports
 */

import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { recordApiRequest } from '@/lib/monitoring/prometheus';
import { safeParse, safeStringify } from '@/lib/utils/json-safe';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const timeRange = searchParams.get('timeRange') || '24h';

  try {
    // Calculate time range
    const timeRangeMs = getTimeRangeMs(timeRange);
    const now = Date.now();
    const startTimeMs = now - timeRangeMs;

    // Fetch comprehensive analytics data
    const data = await getExportData(startTimeMs, now);

    if (format === 'csv') {
      const csv = convertToCSV(data);
      const duration = (Date.now() - startTime) / 1000;
      recordApiRequest('GET', '/api/analytics/export', 200, duration);

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics_${timeRange}.csv"`,
        },
      });
    } else {
      const duration = (Date.now() - startTime) / 1000;
      recordApiRequest('GET', '/api/analytics/export', 200, duration);

      return new NextResponse(safeStringify(data, '{}', 'analytics-export', null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="analytics_${timeRange}.json"`,
        },
      });
    }
  } catch (error) {
    console.error('Analytics export error:', error);
    
    const duration = (Date.now() - startTime) / 1000;
    recordApiRequest('GET', '/api/analytics/export', 500, duration);

    return NextResponse.json(
      { error: 'Failed to export analytics data' },
      { status: 500 }
    );
  }
}

async function getExportData(startTime: number, endTime: number) {
  const [metrics, apiKeys, alerts, errors, rateLimits] = await Promise.all([
    getDetailedMetrics(startTime, endTime),
    getDetailedApiKeysData(startTime, endTime),
    getDetailedAlertsData(startTime, endTime),
    getErrorAnalysis(startTime, endTime),
    getRateLimitAnalysis(startTime, endTime),
  ]);

  return {
    exportInfo: {
      generatedAt: Date.now(),
      timeRange: { start: startTime, end: endTime },
      recordCount: {
        metrics: metrics.length,
        apiKeys: apiKeys.length,
        alerts: alerts.length,
        errors: errors.length,
        rateLimits: rateLimits.length,
      },
    },
    metrics,
    apiKeys,
    alerts,
    errors,
    rateLimits,
    summary: generateSummary({ metrics, apiKeys, alerts, errors, rateLimits }),
  };
}

async function getDetailedMetrics(startTime: number, endTime: number) {
  try {
    // This would query your time-series database
    // For now, generating sample data - replace with actual implementation
    const metrics = [];
    const interval = Math.min(300000, (endTime - startTime) / 288); // 5-minute max intervals

    for (let timestamp = startTime; timestamp <= endTime; timestamp += interval) {
      metrics.push({
        timestamp,
        datetime: new Date(timestamp).toISOString(),
        apiCalls: Math.floor(Math.random() * 1000) + 100,
        errors: Math.floor(Math.random() * 50),
        avgResponseTime: Math.random() * 2000 + 200,
        p95ResponseTime: Math.random() * 5000 + 1000,
        p99ResponseTime: Math.random() * 10000 + 2000,
        activeUsers: Math.floor(Math.random() * 50) + 10,
        totalCost: Math.random() * 10 + 1,
        cacheHitRate: Math.random() * 0.3 + 0.7, // 70-100%
        openaiTokensUsed: Math.floor(Math.random() * 10000) + 1000,
      });
    }

    return metrics;
  } catch (error) {
    console.error('Error fetching detailed metrics:', error);
    return [];
  }
}

async function getDetailedApiKeysData(startTime: number, endTime: number) {
  try {
    const keys = await redis.keys('analytics:api_key:*');
    const apiKeysData = [];

    for (const key of keys) {
      try {
        const data = await redis.hgetall(key);
        const keyHash = key.split(':').pop() || 'unknown';
        
        // Get detailed usage history
        const historyKey = `analytics:api_key_history:${keyHash}`;
        const history = await redis.lrange(historyKey, 0, -1);
        
        const usageHistory = history
          .map(item => safeParse(item, null, `usage-history-${keyHash}`))
          .filter(item => item && item.timestamp >= startTime && item.timestamp <= endTime)
          .sort((a, b) => a.timestamp - b.timestamp);

        apiKeysData.push({
          keyHash,
          keyName: data.name || null,
          totalRequests: parseInt(data.requests || '0'),
          totalErrors: parseInt(data.errors || '0'),
          totalCost: parseFloat(data.cost || '0'),
          firstUsed: parseInt(data.firstUsed || '0'),
          lastUsed: parseInt(data.lastUsed || '0'),
          rateLimitHits: parseInt(data.rateLimitHits || '0'),
          blockedRequests: parseInt(data.blockedRequests || '0'),
          usageHistory,
          errorRate: parseInt(data.requests || '0') > 0 
            ? (parseInt(data.errors || '0') / parseInt(data.requests || '0')) * 100 
            : 0,
        });
      } catch (error) {
        console.error(`Error processing API key data for ${key}:`, error);
      }
    }

    return apiKeysData.sort((a, b) => b.totalRequests - a.totalRequests);
  } catch (error) {
    console.error('Error fetching detailed API keys data:', error);
    return [];
  }
}

async function getDetailedAlertsData(startTime: number, endTime: number) {
  try {
    const alertKeys = await redis.keys('anomaly:alerts:*');
    const allAlerts = [];

    for (const key of alertKeys) {
      try {
        const alerts = await redis.lrange(key, 0, -1);
        for (const alertStr of alerts) {
          const alert = safeParse<{ timestamp: number; [key: string]: any }>(
            alertStr, 
            null, 
            `detailed-alerts-${key}`
          );
          if (alert && alert.timestamp >= startTime && alert.timestamp <= endTime) {
            allAlerts.push({
              ...alert,
              datetime: new Date(alert.timestamp).toISOString(),
              identifier: key.split(':').pop() || 'unknown',
            });
          }
        }
      } catch (error) {
        console.error(`Error processing alerts for ${key}:`, error);
      }
    }

    return allAlerts.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error fetching detailed alerts data:', error);
    return [];
  }
}

async function getErrorAnalysis(startTime: number, endTime: number) {
  try {
    // This would analyze error patterns from your logs
    // For now, returning sample data
    return [
      {
        errorType: 'rate_limit_exceeded',
        count: Math.floor(Math.random() * 100) + 10,
        percentage: Math.random() * 30 + 5,
        firstOccurrence: startTime + Math.random() * (endTime - startTime),
        lastOccurrence: endTime - Math.random() * (endTime - startTime) * 0.1,
      },
      {
        errorType: 'invalid_api_key',
        count: Math.floor(Math.random() * 50) + 5,
        percentage: Math.random() * 15 + 2,
        firstOccurrence: startTime + Math.random() * (endTime - startTime),
        lastOccurrence: endTime - Math.random() * (endTime - startTime) * 0.2,
      },
      {
        errorType: 'openai_api_error',
        count: Math.floor(Math.random() * 30) + 3,
        percentage: Math.random() * 10 + 1,
        firstOccurrence: startTime + Math.random() * (endTime - startTime),
        lastOccurrence: endTime - Math.random() * (endTime - startTime) * 0.3,
      },
    ];
  } catch (error) {
    console.error('Error generating error analysis:', error);
    return [];
  }
}

async function getRateLimitAnalysis(startTime: number, endTime: number) {
  try {
    // Analyze rate limiting patterns
    const rateLimitKeys = await redis.keys('rate_limit:*');
    const analysis = [];

    for (const key of rateLimitKeys.slice(0, 20)) { // Limit for performance
      try {
        const hits = await redis.get(`${key}:hits`) || '0';
        const identifier = key.split(':').pop() || 'unknown';
        
        analysis.push({
          identifier,
          totalHits: parseInt(hits),
          timeRange: { start: startTime, end: endTime },
          avgHitsPerHour: parseInt(hits) / ((endTime - startTime) / (60 * 60 * 1000)),
        });
      } catch (error) {
        console.error(`Error processing rate limit data for ${key}:`, error);
      }
    }

    return analysis.sort((a, b) => b.totalHits - a.totalHits);
  } catch (error) {
    console.error('Error fetching rate limit analysis:', error);
    return [];
  }
}

function generateSummary(data: any) {
  const { metrics, apiKeys, alerts, errors } = data;
  
  const totalRequests = metrics.reduce((sum: number, m: any) => sum + m.apiCalls, 0);
  const totalErrors = metrics.reduce((sum: number, m: any) => sum + m.errors, 0);
  const totalCost = metrics.reduce((sum: number, m: any) => sum + m.totalCost, 0);
  const avgResponseTime = metrics.length > 0 
    ? metrics.reduce((sum: number, m: any) => sum + m.avgResponseTime, 0) / metrics.length 
    : 0;

  return {
    totalRequests,
    totalErrors,
    overallErrorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
    totalCost,
    avgResponseTime,
    activeApiKeys: apiKeys.filter((key: any) => key.totalRequests > 0).length,
    highSeverityAlerts: alerts.filter((alert: any) => alert.severity === 'high').length,
    mostActiveApiKey: apiKeys.length > 0 ? apiKeys[0].keyHash : null,
    topErrorType: errors.length > 0 ? errors[0].errorType : null,
  };
}

function convertToCSV(data: any): string {
  const { metrics, apiKeys, alerts } = data;
  let csv = '';

  // Add summary section
  csv += 'SUMMARY\n';
  csv += `Generated At,${new Date(data.exportInfo.generatedAt).toISOString()}\n`;
  csv += `Total Requests,${data.summary.totalRequests}\n`;
  csv += `Total Errors,${data.summary.totalErrors}\n`;
  csv += `Error Rate %,${data.summary.overallErrorRate.toFixed(2)}\n`;
  csv += `Total Cost $,${data.summary.totalCost.toFixed(2)}\n`;
  csv += `Avg Response Time ms,${data.summary.avgResponseTime.toFixed(2)}\n\n`;

  // Add metrics section
  csv += 'METRICS\n';
  csv += 'DateTime,API Calls,Errors,Avg Response Time,P95 Response Time,P99 Response Time,Active Users,Total Cost,Cache Hit Rate,OpenAI Tokens\n';
  
  metrics.forEach((metric: any) => {
    csv += `${metric.datetime},${metric.apiCalls},${metric.errors},${metric.avgResponseTime.toFixed(2)},${metric.p95ResponseTime.toFixed(2)},${metric.p99ResponseTime.toFixed(2)},${metric.activeUsers},${metric.totalCost.toFixed(2)},${metric.cacheHitRate.toFixed(3)},${metric.openaiTokensUsed}\n`;
  });

  csv += '\n';

  // Add API keys section
  csv += 'API KEYS\n';
  csv += 'Key Hash,Key Name,Total Requests,Total Errors,Error Rate %,Total Cost,Rate Limit Hits,Blocked Requests,First Used,Last Used\n';
  
  apiKeys.forEach((key: any) => {
    csv += `${key.keyHash},${key.keyName || ''},${key.totalRequests},${key.totalErrors},${key.errorRate.toFixed(2)},${key.totalCost.toFixed(2)},${key.rateLimitHits},${key.blockedRequests},${new Date(key.firstUsed).toISOString()},${new Date(key.lastUsed).toISOString()}\n`;
  });

  csv += '\n';

  // Add alerts section
  csv += 'ALERTS\n';
  csv += 'DateTime,Severity,Pattern ID,Message,Score,Threshold,Identifier\n';
  
  alerts.forEach((alert: any) => {
    csv += `${alert.datetime},${alert.severity},${alert.patternId},"${alert.message.replace(/"/g, '""')}",${alert.score.toFixed(2)},${alert.threshold},${alert.identifier}\n`;
  });

  return csv;
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