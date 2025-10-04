/**
 * Resource Utilization Monitoring Endpoint
 * Provides real-time and historical resource usage metrics including memory, CPU, and system resources
 */

import { NextRequest, NextResponse } from "next/server";
import { structuredLogger as logger } from "@/lib/monitoring/logger";
import { metrics } from "@/lib/monitoring/metrics";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

interface ResourceUtilizationResponse {
  timestamp: string;
  current: {
    memory: {
      heapUsed: number;
      heapTotal: number;
      heapPercentage: number;
      external: number;
      rss: number;
      arrayBuffers: number;
    };
    cpu: {
      user: number;
      system: number;
      percentage?: number;
    } | null;
    process: {
      pid: number;
      uptime: number;
      version: string;
      platform: string;
      arch: string;
    };
    requests: {
      active: number;
      queued: number;
      total: number;
      ratePerMinute: number;
    };
  };
  historical: {
    memory: {
      timeline: Array<{
        timestamp: string;
        heapUsed: number;
        heapTotal: number;
        percentage: number;
      }>;
      averageUsage: number;
      peakUsage: number;
      memoryLeaks: Array<{
        timestamp: string;
        growth: number;
        duration: number;
      }>;
    };
    requests: {
      timeline: Array<{
        timestamp: string;
        count: number;
        errors: number;
        averageResponseTime: number;
      }>;
      throughput: {
        current: number;
        average: number;
        peak: number;
      };
    };
  };
  alerts: Array<{
    type: 'memory' | 'cpu' | 'requests' | 'performance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    threshold: number;
    currentValue: number;
    timestamp: string;
  }>;
  recommendations: string[];
}

/**
 * GET /api/monitoring/resource-usage
 * Returns comprehensive resource utilization metrics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();
  const requestId = logger.generateRequestId();
  const url = new URL(request.url);
  
  // Parse query parameters
  const timeRange = parseInt(url.searchParams.get('hours') || '24');
  const includeHistorical = url.searchParams.get('includeHistorical') !== 'false';
  const includeRecommendations = url.searchParams.get('includeRecommendations') !== 'false';
  
  try {
    // Collect current resource metrics
    const currentMetrics = metrics.collectResourceMetrics();
    const memoryUsage = logger.getMemoryMetrics();
    const cpuUsage = logger.getCPUMetrics();
    const systemHealth = metrics.getSystemHealth();
    
    // Get historical data
    const resourceHistory = includeHistorical 
      ? metrics.getResourceHistory(timeRange)
      : [];
    
    // Build comprehensive response
    const resourceResponse: ResourceUtilizationResponse = {
      timestamp: new Date().toISOString(),
      current: buildCurrentMetrics(currentMetrics, memoryUsage, cpuUsage, systemHealth),
      historical: includeHistorical 
        ? buildHistoricalMetrics(resourceHistory, timeRange)
        : { memory: { timeline: [], averageUsage: 0, peakUsage: 0, memoryLeaks: [] }, requests: { timeline: [], throughput: { current: 0, average: 0, peak: 0 } } },
      alerts: generateResourceAlerts(currentMetrics, memoryUsage, systemHealth),
      recommendations: includeRecommendations 
        ? generateRecommendations(currentMetrics, memoryUsage, resourceHistory)
        : []
    };

    const responseTime = performance.now() - startTime;
    
    // Log resource monitoring request
    logger.logEvent(
      logger.createLogContext(request, requestId),
      'resource_monitoring_requested',
      {
        timeRange,
        includeHistorical,
        includeRecommendations,
        responseTime,
        currentMemoryUsage: resourceResponse.current.memory.heapPercentage,
        activeRequests: resourceResponse.current.requests.active
      }
    );

    return NextResponse.json(resourceResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${responseTime.toFixed(2)}ms`,
        'X-Request-ID': requestId,
        'X-Memory-Usage': `${resourceResponse.current.memory.heapPercentage.toFixed(1)}%`,
        'X-Active-Requests': resourceResponse.current.requests.active.toString()
      }
    });
    
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    // Log error
    logger.logError(
      logger.createLogContext(request, requestId),
      error instanceof Error ? error : new Error(String(error)),
      { category: 'system', severity: 'medium', code: 'RESOURCE_MONITORING_ERROR' }
    );

    return NextResponse.json(
      {
        error: 'Failed to retrieve resource usage metrics',
        timestamp: new Date().toISOString(),
        requestId
      },
      { 
        status: 500,
        headers: {
          'X-Response-Time': `${responseTime.toFixed(2)}ms`,
          'X-Request-ID': requestId
        }
      }
    );
  }
}

/**
 * Build current resource metrics
 */
function buildCurrentMetrics(
  currentMetrics: ReturnType<typeof metrics.collectResourceMetrics>,
  memoryUsage: NodeJS.MemoryUsage | undefined,
  cpuUsage: NodeJS.CpuUsage | undefined,
  systemHealth: ReturnType<typeof metrics.getSystemHealth>
): ResourceUtilizationResponse['current'] {
  return {
    memory: {
      heapUsed: memoryUsage ? Math.round(memoryUsage.heapUsed / 1024 / 1024) : 0,
      heapTotal: memoryUsage ? Math.round(memoryUsage.heapTotal / 1024 / 1024) : 0,
      heapPercentage: memoryUsage ? Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 * 100) / 100 : 0,
      external: memoryUsage ? Math.round(memoryUsage.external / 1024 / 1024) : 0,
      rss: memoryUsage ? Math.round(memoryUsage.rss / 1024 / 1024) : 0,
      arrayBuffers: memoryUsage ? Math.round(memoryUsage.arrayBuffers / 1024 / 1024) : 0
    },
    cpu: cpuUsage ? {
      user: cpuUsage.user,
      system: cpuUsage.system,
      percentage: calculateCPUPercentage(cpuUsage)
    } : null,
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch
    },
    requests: {
      active: currentMetrics.requests.active,
      queued: 0, // Would be tracked separately in a real implementation
      total: currentMetrics.requests.total,
      ratePerMinute: calculateRequestRate(systemHealth.uptime, currentMetrics.requests.total)
    }
  };
}

/**
 * Build historical metrics
 */
function buildHistoricalMetrics(
  resourceHistory: ReturnType<typeof metrics.getResourceHistory>,
  hours: number
): ResourceUtilizationResponse['historical'] {
  const memoryTimeline = resourceHistory.map(resource => ({
    timestamp: resource.timestamp,
    heapUsed: Math.round(resource.memory.used / 1024 / 1024),
    heapTotal: Math.round(resource.memory.total / 1024 / 1024),
    percentage: Math.round(resource.memory.percentage * 100) / 100
  }));
  
  const requestsTimeline = resourceHistory.map(resource => ({
    timestamp: resource.timestamp,
    count: resource.requests.active,
    errors: resource.requests.errors,
    averageResponseTime: 500 // Would be calculated from actual metrics
  }));
  
  // Calculate memory statistics
  const memoryPercentages = memoryTimeline.map(m => m.percentage);
  const averageUsage = memoryPercentages.length > 0 
    ? memoryPercentages.reduce((sum, p) => sum + p, 0) / memoryPercentages.length 
    : 0;
  const peakUsage = memoryPercentages.length > 0 ? Math.max(...memoryPercentages) : 0;
  
  // Detect potential memory leaks
  const memoryLeaks = detectMemoryLeaks(memoryTimeline);
  
  // Calculate request throughput
  const requestCounts = requestsTimeline.map(r => r.count);
  const currentThroughput = requestCounts[requestCounts.length - 1] || 0;
  const averageThroughput = requestCounts.length > 0
    ? requestCounts.reduce((sum, c) => sum + c, 0) / requestCounts.length
    : 0;
  const peakThroughput = requestCounts.length > 0 ? Math.max(...requestCounts) : 0;
  
  return {
    memory: {
      timeline: memoryTimeline,
      averageUsage: Math.round(averageUsage * 100) / 100,
      peakUsage: Math.round(peakUsage * 100) / 100,
      memoryLeaks
    },
    requests: {
      timeline: requestsTimeline,
      throughput: {
        current: currentThroughput,
        average: Math.round(averageThroughput),
        peak: peakThroughput
      }
    }
  };
}

/**
 * Generate resource usage alerts
 */
function generateResourceAlerts(
  currentMetrics: ReturnType<typeof metrics.collectResourceMetrics>,
  memoryUsage: NodeJS.MemoryUsage | undefined,
  systemHealth: ReturnType<typeof metrics.getSystemHealth>
): ResourceUtilizationResponse['alerts'] {
  const alerts: ResourceUtilizationResponse['alerts'] = [];
  
  // Memory alerts
  if (memoryUsage) {
    const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (memoryPercentage > 95) {
      alerts.push({
        type: 'memory',
        severity: 'critical',
        message: 'Memory usage is critically high',
        threshold: 95,
        currentValue: memoryPercentage,
        timestamp: new Date().toISOString()
      });
    } else if (memoryPercentage > 85) {
      alerts.push({
        type: 'memory',
        severity: 'high',
        message: 'Memory usage is high',
        threshold: 85,
        currentValue: memoryPercentage,
        timestamp: new Date().toISOString()
      });
    } else if (memoryPercentage > 70) {
      alerts.push({
        type: 'memory',
        severity: 'medium',
        message: 'Memory usage is elevated',
        threshold: 70,
        currentValue: memoryPercentage,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Request load alerts
  const activeRequests = currentMetrics.requests.active;
  if (activeRequests > 100) {
    alerts.push({
      type: 'requests',
      severity: 'high',
      message: 'High number of active requests',
      threshold: 100,
      currentValue: activeRequests,
      timestamp: new Date().toISOString()
    });
  } else if (activeRequests > 50) {
    alerts.push({
      type: 'requests',
      severity: 'medium',
      message: 'Elevated request load',
      threshold: 50,
      currentValue: activeRequests,
      timestamp: new Date().toISOString()
    });
  }
  
  // Performance alerts based on system health
  if (systemHealth.alerts.length > 0) {
    alerts.push({
      type: 'performance',
      severity: 'medium',
      message: `System health alerts: ${systemHealth.alerts.join(', ')}`,
      threshold: 0,
      currentValue: systemHealth.alerts.length,
      timestamp: new Date().toISOString()
    });
  }
  
  return alerts;
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(
  currentMetrics: ReturnType<typeof metrics.collectResourceMetrics>,
  memoryUsage: NodeJS.MemoryUsage | undefined,
  resourceHistory: ReturnType<typeof metrics.getResourceHistory>
): string[] {
  const recommendations: string[] = [];
  
  // Memory recommendations
  if (memoryUsage) {
    const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (memoryPercentage > 80) {
      recommendations.push('Consider implementing memory optimization strategies or increasing available memory');
      recommendations.push('Review for potential memory leaks in long-running processes');
      recommendations.push('Consider implementing garbage collection tuning');
    }
    
    if (memoryUsage.external > memoryUsage.heapUsed) {
      recommendations.push('High external memory usage detected - review Buffer and TypedArray usage');
    }
  }
  
  // Request handling recommendations
  const activeRequests = currentMetrics.requests.active;
  if (activeRequests > 30) {
    recommendations.push('Consider implementing request queuing or load balancing');
    recommendations.push('Review API endpoint performance and consider caching strategies');
  }
  
  // Historical trend recommendations
  if (resourceHistory.length > 10) {
    const memoryTrend = resourceHistory.slice(-10).map(r => r.memory.percentage);
    const isIncreasing = memoryTrend[memoryTrend.length - 1] > memoryTrend[0];
    const growthRate = ((memoryTrend[memoryTrend.length - 1] - memoryTrend[0]) / memoryTrend[0]) * 100;
    
    if (isIncreasing && growthRate > 10) {
      recommendations.push('Memory usage is trending upward - monitor for potential memory leaks');
    }
    
    const requestTrend = resourceHistory.slice(-10).map(r => r.requests.active);
    const avgRequests = requestTrend.reduce((sum, r) => sum + r, 0) / requestTrend.length;
    if (avgRequests > 20) {
      recommendations.push('Consider implementing horizontal scaling or request rate limiting');
    }
  }
  
  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('System resources are operating within normal parameters');
    recommendations.push('Continue monitoring for performance optimization opportunities');
  }
  
  return recommendations;
}

/**
 * Detect potential memory leaks
 */
function detectMemoryLeaks(
  timeline: Array<{ timestamp: string; percentage: number }>
): Array<{ timestamp: string; growth: number; duration: number }> {
  const leaks: Array<{ timestamp: string; growth: number; duration: number }> = [];
  
  if (timeline.length < 5) return leaks;
  
  // Look for sustained memory growth over time
  for (let i = 4; i < timeline.length; i++) {
    const window = timeline.slice(i - 4, i + 1);
    const initialUsage = window[0].percentage;
    const finalUsage = window[window.length - 1].percentage;
    const growth = finalUsage - initialUsage;
    
    // Consider it a potential leak if memory grew by more than 10% over 5 data points
    if (growth > 10) {
      const startTime = new Date(window[0].timestamp);
      const endTime = new Date(window[window.length - 1].timestamp);
      const duration = endTime.getTime() - startTime.getTime();
      
      leaks.push({
        timestamp: window[window.length - 1].timestamp,
        growth: Math.round(growth * 100) / 100,
        duration
      });
    }
  }
  
  return leaks;
}

/**
 * Calculate CPU percentage (simplified)
 */
function calculateCPUPercentage(cpuUsage: NodeJS.CpuUsage): number {
  // This is a simplified calculation - in a real implementation,
  // you'd need to track CPU usage over time intervals
  const total = cpuUsage.user + cpuUsage.system;
  return Math.round((total / 1000000) * 100) / 100; // Convert microseconds to percentage
}

/**
 * Calculate request rate per minute
 */
function calculateRequestRate(uptimeSeconds: number, totalRequests: number): number {
  if (uptimeSeconds === 0) return 0;
  return Math.round((totalRequests / uptimeSeconds) * 60);
}