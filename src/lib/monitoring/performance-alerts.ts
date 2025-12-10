/**
 * Performance monitoring and alerting
 * Integrates with Sentry for performance degradation alerts
 */

import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

export interface PerformanceAlert {
  type: 'slow_query' | 'high_memory' | 'slow_api' | 'cache_miss_rate' | 'error_rate';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

/**
 * Performance thresholds for alerts
 */
const THRESHOLDS = {
  // API response times (ms)
  API_SLOW: 3000,
  API_VERY_SLOW: 5000,

  // Database query times (ms)
  QUERY_SLOW: 500,
  QUERY_VERY_SLOW: 1000,

  // Memory usage (MB)
  MEMORY_HIGH: 512,
  MEMORY_CRITICAL: 1024,

  // Cache hit rates (%)
  CACHE_HIT_LOW: 60,
  CACHE_HIT_CRITICAL: 40,

  // Error rates (%)
  ERROR_RATE_HIGH: 5,
  ERROR_RATE_CRITICAL: 10,
};

/**
 * Alert history for deduplication
 */
const alertHistory = new Map<string, number>();
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if we should send an alert (prevents spam)
 */
function shouldSendAlert(alertKey: string): boolean {
  const lastSent = alertHistory.get(alertKey);
  const now = Date.now();

  if (!lastSent || now - lastSent > ALERT_COOLDOWN_MS) {
    alertHistory.set(alertKey, now);
    return true;
  }

  return false;
}

/**
 * Send performance alert
 */
function sendAlert(alert: PerformanceAlert): void {
  const alertKey = `${alert.type}_${alert.severity}`;

  if (!shouldSendAlert(alertKey)) {
    return;
  }

  // Log locally
  logger.warn(`Performance Alert: ${alert.message}`, alert.metadata);

  // Send to Sentry
  if (alert.severity === 'critical' || alert.severity === 'error') {
    Sentry.captureMessage(alert.message, {
      level: alert.severity === 'critical' ? 'error' : 'error',
      tags: {
        type: alert.type,
        performance_alert: 'true',
      },
      extra: alert.metadata,
    });
  }

  // Track as breadcrumb for context
  Sentry.addBreadcrumb({
    category: 'performance',
    message: alert.message,
    level: alert.severity === 'critical' ? 'error' : alert.severity,
    data: alert.metadata,
  });
}

/**
 * Monitor API response time
 */
export function monitorApiResponse(endpoint: string, duration: number, statusCode: number): void {
  if (duration > THRESHOLDS.API_VERY_SLOW) {
    sendAlert({
      type: 'slow_api',
      severity: 'critical',
      message: `Critical API slowness detected: ${endpoint}`,
      metadata: {
        endpoint,
        duration,
        statusCode,
        threshold: THRESHOLDS.API_VERY_SLOW,
      },
      timestamp: new Date(),
    });
  } else if (duration > THRESHOLDS.API_SLOW) {
    sendAlert({
      type: 'slow_api',
      severity: 'warning',
      message: `Slow API response: ${endpoint}`,
      metadata: {
        endpoint,
        duration,
        statusCode,
        threshold: THRESHOLDS.API_SLOW,
      },
      timestamp: new Date(),
    });
  }

  // Track in Sentry performance monitoring
  Sentry.metrics.distribution('api.response.duration', duration, {
    attributes: {
      endpoint,
      status: statusCode.toString(),
    },
    unit: 'millisecond',
  });
}

/**
 * Monitor database query performance
 */
export function monitorDatabaseQuery(query: string, duration: number, rowCount?: number): void {
  if (duration > THRESHOLDS.QUERY_VERY_SLOW) {
    sendAlert({
      type: 'slow_query',
      severity: 'error',
      message: `Very slow database query detected`,
      metadata: {
        query: query.substring(0, 200), // Truncate for safety
        duration,
        rowCount,
        threshold: THRESHOLDS.QUERY_VERY_SLOW,
      },
      timestamp: new Date(),
    });
  } else if (duration > THRESHOLDS.QUERY_SLOW) {
    sendAlert({
      type: 'slow_query',
      severity: 'warning',
      message: `Slow database query`,
      metadata: {
        query: query.substring(0, 200),
        duration,
        rowCount,
        threshold: THRESHOLDS.QUERY_SLOW,
      },
      timestamp: new Date(),
    });
  }

  Sentry.metrics.distribution('db.query.duration', duration, {
    attributes: {
      query_type: query.split(' ')[0], // SELECT, INSERT, etc.
    },
    unit: 'millisecond',
  });
}

/**
 * Monitor memory usage
 */
export function monitorMemoryUsage(): void {
  if (typeof process === 'undefined') return;

  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);

  if (heapUsedMB > THRESHOLDS.MEMORY_CRITICAL) {
    sendAlert({
      type: 'high_memory',
      severity: 'critical',
      message: `Critical memory usage: ${heapUsedMB}MB`,
      metadata: {
        heapUsedMB,
        heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
        rssMB: Math.round(usage.rss / 1024 / 1024),
        threshold: THRESHOLDS.MEMORY_CRITICAL,
      },
      timestamp: new Date(),
    });
  } else if (heapUsedMB > THRESHOLDS.MEMORY_HIGH) {
    sendAlert({
      type: 'high_memory',
      severity: 'warning',
      message: `High memory usage: ${heapUsedMB}MB`,
      metadata: {
        heapUsedMB,
        heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
        rssMB: Math.round(usage.rss / 1024 / 1024),
        threshold: THRESHOLDS.MEMORY_HIGH,
      },
      timestamp: new Date(),
    });
  }

  Sentry.metrics.gauge('memory.heap.used', heapUsedMB, {
    unit: 'megabyte',
  });
}

/**
 * Monitor cache hit rate
 */
export function monitorCacheHitRate(
  hitRate: number,
  source: string,
  stats: Record<string, any>
): void {
  const hitRatePercent = hitRate * 100;

  if (hitRatePercent < THRESHOLDS.CACHE_HIT_CRITICAL) {
    sendAlert({
      type: 'cache_miss_rate',
      severity: 'critical',
      message: `Critical cache hit rate: ${hitRatePercent.toFixed(1)}%`,
      metadata: {
        hitRate: hitRatePercent,
        source,
        threshold: THRESHOLDS.CACHE_HIT_CRITICAL,
        ...stats,
      },
      timestamp: new Date(),
    });
  } else if (hitRatePercent < THRESHOLDS.CACHE_HIT_LOW) {
    sendAlert({
      type: 'cache_miss_rate',
      severity: 'warning',
      message: `Low cache hit rate: ${hitRatePercent.toFixed(1)}%`,
      metadata: {
        hitRate: hitRatePercent,
        source,
        threshold: THRESHOLDS.CACHE_HIT_LOW,
        ...stats,
      },
      timestamp: new Date(),
    });
  }

  Sentry.metrics.gauge('cache.hit.rate', hitRate, {
    attributes: { source },
    unit: 'ratio',
  });
}

/**
 * Monitor error rate
 */
export function monitorErrorRate(
  errorRate: number,
  totalRequests: number,
  errorCount: number,
  endpoint?: string
): void {
  const errorRatePercent = errorRate * 100;

  if (errorRatePercent > THRESHOLDS.ERROR_RATE_CRITICAL) {
    sendAlert({
      type: 'error_rate',
      severity: 'critical',
      message: `Critical error rate: ${errorRatePercent.toFixed(1)}%`,
      metadata: {
        errorRate: errorRatePercent,
        totalRequests,
        errorCount,
        endpoint,
        threshold: THRESHOLDS.ERROR_RATE_CRITICAL,
      },
      timestamp: new Date(),
    });
  } else if (errorRatePercent > THRESHOLDS.ERROR_RATE_HIGH) {
    sendAlert({
      type: 'error_rate',
      severity: 'warning',
      message: `High error rate: ${errorRatePercent.toFixed(1)}%`,
      metadata: {
        errorRate: errorRatePercent,
        totalRequests,
        errorCount,
        endpoint,
        threshold: THRESHOLDS.ERROR_RATE_HIGH,
      },
      timestamp: new Date(),
    });
  }

  Sentry.metrics.gauge('error.rate', errorRate, {
    attributes: endpoint ? { endpoint } : {},
    unit: 'ratio',
  });
}

/**
 * Start periodic monitoring
 */
export function startPerformanceMonitoring(): void {
  // Monitor memory every 30 seconds
  setInterval(() => {
    monitorMemoryUsage();
  }, 30000);

  logger.info('Performance monitoring started');
}
