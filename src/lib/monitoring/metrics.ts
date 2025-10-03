/**
 * Performance Metrics Collection System
 * Tracks API performance, resource usage, and system health metrics
 */

import { structuredLogger as logger } from './logger';

export interface APIMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestSize: number;
  responseSize: number;
  timestamp: string;
  userId?: string;
  userTier?: string;
  requestId: string;
}

export interface ResourceMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu?: {
    user: number;
    system: number;
    percentage?: number;
  };
  requests: {
    active: number;
    total: number;
    errors: number;
  };
  timestamp: string;
}

export interface ErrorMetrics {
  endpoint: string;
  errorType: string;
  category: string;
  severity: string;
  count: number;
  lastOccurrence: string;
  averageResponseTime: number;
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metricsStore: Map<string, APIMetrics[]> = new Map();
  private errorStore: Map<string, ErrorMetrics> = new Map();
  private resourceHistory: ResourceMetrics[] = [];
  private activeRequests: Set<string> = new Set();
  private startTime: number = Date.now();

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Start tracking a request
   */
  startRequest(requestId: string): { startTime: number; startMemory: NodeJS.MemoryUsage | undefined } {
    this.activeRequests.add(requestId);
    
    return {
      startTime: performance.now(),
      startMemory: logger.getMemoryMetrics()
    };
  }

  /**
   * End tracking a request and collect metrics
   */
  endRequest(
    requestId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    startTime: number,
    requestSize: number,
    responseSize: number,
    userId?: string,
    userTier?: string
  ): APIMetrics {
    this.activeRequests.delete(requestId);
    const responseTime = performance.now() - startTime;

    const metrics: APIMetrics = {
      endpoint,
      method,
      statusCode,
      responseTime,
      requestSize,
      responseSize,
      timestamp: new Date().toISOString(),
      userId,
      userTier,
      requestId
    };

    // Store metrics
    const endpointKey = `${method}:${endpoint}`;
    if (!this.metricsStore.has(endpointKey)) {
      this.metricsStore.set(endpointKey, []);
    }
    
    const endpointMetrics = this.metricsStore.get(endpointKey)!;
    endpointMetrics.push(metrics);
    
    // Keep only last 1000 metrics per endpoint
    if (endpointMetrics.length > 1000) {
      endpointMetrics.splice(0, endpointMetrics.length - 1000);
    }

    return metrics;
  }

  /**
   * Record an error occurrence
   */
  recordError(
    endpoint: string,
    errorType: string,
    category: string,
    severity: string,
    responseTime: number
  ) {
    const errorKey = `${endpoint}:${errorType}`;
    const existing = this.errorStore.get(errorKey);

    if (existing) {
      existing.count++;
      existing.lastOccurrence = new Date().toISOString();
      existing.averageResponseTime = (existing.averageResponseTime + responseTime) / 2;
    } else {
      this.errorStore.set(errorKey, {
        endpoint,
        errorType,
        category,
        severity,
        count: 1,
        lastOccurrence: new Date().toISOString(),
        averageResponseTime: responseTime
      });
    }
  }

  /**
   * Collect current resource metrics
   */
  collectResourceMetrics(): ResourceMetrics {
    const memory = logger.getMemoryMetrics();
    const cpu = logger.getCPUMetrics();

    const resourceMetrics: ResourceMetrics = {
      memory: {
        used: memory?.heapUsed || 0,
        total: memory?.heapTotal || 0,
        percentage: memory ? (memory.heapUsed / memory.heapTotal) * 100 : 0
      },
      cpu: cpu ? {
        user: cpu.user,
        system: cpu.system
      } : undefined,
      requests: {
        active: this.activeRequests.size,
        total: this.getTotalRequestCount(),
        errors: this.getTotalErrorCount()
      },
      timestamp: new Date().toISOString()
    };

    // Store resource history
    this.resourceHistory.push(resourceMetrics);
    
    // Keep only last 1000 resource snapshots (about 16-17 hours at 1 per minute)
    if (this.resourceHistory.length > 1000) {
      this.resourceHistory = this.resourceHistory.slice(-1000);
    }

    return resourceMetrics;
  }

  /**
   * Get performance summary for an endpoint
   */
  getEndpointSummary(endpoint: string, method?: string): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    statusCodes: Record<number, number>;
    recentRequests: APIMetrics[];
  } | null {
    const key = method ? `${method}:${endpoint}` : endpoint;
    let metrics: APIMetrics[] = [];

    if (method) {
      metrics = this.metricsStore.get(key) || [];
    } else {
      // Get all methods for this endpoint
      for (const [k, v] of this.metricsStore.entries()) {
        if (k.endsWith(`:${endpoint}`)) {
          metrics.push(...v);
        }
      }
    }

    if (metrics.length === 0) return null;

    // Calculate statistics
    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
    const statusCodes: Record<number, number> = {};
    let errors = 0;

    metrics.forEach(m => {
      statusCodes[m.statusCode] = (statusCodes[m.statusCode] || 0) + 1;
      if (m.statusCode >= 400) errors++;
    });

    return {
      totalRequests: metrics.length,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      errorRate: (errors / metrics.length) * 100,
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
      statusCodes,
      recentRequests: metrics.slice(-10)
    };
  }

  /**
   * Get system health summary
   */
  getSystemHealth(): {
    uptime: number;
    memory: {
      current: number;
      average: number;
      peak: number;
    };
    requests: {
      active: number;
      totalToday: number;
      errorsToday: number;
    };
    endpoints: {
      healthiest: string;
      slowest: string;
    };
    alerts: string[];
  } {
    const uptime = Date.now() - this.startTime;
    const recentResources = this.resourceHistory.slice(-60); // Last hour if collected every minute
    
    const memoryValues = recentResources.map(r => r.memory.used);
    const averageMemory = memoryValues.length > 0 
      ? memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length 
      : 0;
    const peakMemory = memoryValues.length > 0 ? Math.max(...memoryValues) : 0;

    // Get today's metrics
    const today = new Date().toDateString();
    let totalToday = 0;
    let errorsToday = 0;

    this.metricsStore.forEach(metrics => {
      metrics.forEach(metric => {
        if (new Date(metric.timestamp).toDateString() === today) {
          totalToday++;
          if (metric.statusCode >= 400) errorsToday++;
        }
      });
    });

    // Find healthiest and slowest endpoints
    let healthiestEndpoint = '';
    let slowestEndpoint = '';
    let bestErrorRate = 100;
    let worstAvgResponseTime = 0;

    this.metricsStore.forEach((metrics, endpoint) => {
      const recentMetrics = metrics.slice(-100); // Last 100 requests
      if (recentMetrics.length < 10) return; // Need enough data

      const errors = recentMetrics.filter(m => m.statusCode >= 400).length;
      const errorRate = (errors / recentMetrics.length) * 100;
      const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;

      if (errorRate < bestErrorRate) {
        bestErrorRate = errorRate;
        healthiestEndpoint = endpoint;
      }

      if (avgResponseTime > worstAvgResponseTime) {
        worstAvgResponseTime = avgResponseTime;
        slowestEndpoint = endpoint;
      }
    });

    // Generate alerts
    const alerts: string[] = [];
    const currentMemory = this.resourceHistory[this.resourceHistory.length - 1]?.memory.percentage || 0;
    
    if (currentMemory > 90) {
      alerts.push('High memory usage detected');
    }
    if (this.activeRequests.size > 50) {
      alerts.push('High number of active requests');
    }
    if (errorsToday > totalToday * 0.1) {
      alerts.push('High error rate detected today');
    }

    return {
      uptime,
      memory: {
        current: currentMemory,
        average: averageMemory,
        peak: peakMemory
      },
      requests: {
        active: this.activeRequests.size,
        totalToday,
        errorsToday
      },
      endpoints: {
        healthiest: healthiestEndpoint,
        slowest: slowestEndpoint
      },
      alerts
    };
  }

  /**
   * Get all error metrics
   */
  getErrorMetrics(): ErrorMetrics[] {
    return Array.from(this.errorStore.values());
  }

  /**
   * Get resource usage history
   */
  getResourceHistory(hours: number = 1): ResourceMetrics[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    return this.resourceHistory.filter(r => r.timestamp >= cutoffTime);
  }

  /**
   * Clear all metrics (useful for testing or periodic cleanup)
   */
  clearMetrics() {
    this.metricsStore.clear();
    this.errorStore.clear();
    this.resourceHistory = [];
    this.activeRequests.clear();
  }

  private getTotalRequestCount(): number {
    let total = 0;
    this.metricsStore.forEach(metrics => {
      total += metrics.length;
    });
    return total;
  }

  private getTotalErrorCount(): number {
    let total = 0;
    this.errorStore.forEach(error => {
      total += error.count;
    });
    return total;
  }
}

// Export singleton instance
export const metrics = MetricsCollector.getInstance();