/**
 * Comprehensive Health Check Endpoint
 * Provides detailed system health status, performance metrics, and service availability
 */

import { NextRequest, NextResponse } from "next/server";
import { structuredLogger as logger } from "@/lib/monitoring/logger";
import { metrics } from "@/lib/monitoring/metrics";
import { errorTracker } from "@/lib/monitoring/errorTracking";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    api: ServiceHealth;
    database: ServiceHealth;
    openai: ServiceHealth;
    memory: ServiceHealth;
    errors: ServiceHealth;
  };
  metrics: {
    requests: {
      total: number;
      errors: number;
      activeConnections: number;
      averageResponseTime: number;
    };
    system: {
      memoryUsage: number;
      memoryPercentage: number;
      nodeVersion: string;
      platform: string;
    };
    performance: {
      slowestEndpoints: Array<{
        endpoint: string;
        averageTime: number;
        requests: number;
      }>;
      errorRates: Array<{
        endpoint: string;
        errorRate: number;
        totalRequests: number;
      }>;
    };
  };
  alerts: string[];
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: string;
  details?: Record<string, any>;
}

/**
 * GET /api/monitoring/health
 * Returns comprehensive health status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();
  const requestId = logger.generateRequestId();
  
  try {
    // Collect system health data
    const systemHealth = metrics.getSystemHealth();
    const errorAnalytics = errorTracker.getErrorAnalytics();
    
    // Check individual services
    const services = await checkAllServices();
    
    // Calculate overall status
    const overallStatus = calculateOverallStatus(services, systemHealth);
    
    // Get performance metrics
    const performanceMetrics = getPerformanceMetrics();
    
    // Generate alerts
    const alerts = generateHealthAlerts(systemHealth, services, errorAnalytics);
    
    const healthResponse: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: systemHealth.uptime,
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      services,
      metrics: {
        requests: {
          total: systemHealth.requests.totalToday,
          errors: systemHealth.requests.errorsToday,
          activeConnections: systemHealth.requests.active,
          averageResponseTime: performanceMetrics.averageResponseTime
        },
        system: {
          memoryUsage: systemHealth.memory.current,
          memoryPercentage: systemHealth.memory.current,
          nodeVersion: process.version,
          platform: process.platform
        },
        performance: {
          slowestEndpoints: performanceMetrics.slowestEndpoints,
          errorRates: performanceMetrics.errorRates
        }
      },
      alerts
    };

    const responseTime = performance.now() - startTime;
    
    // Log health check
    logger.logEvent(
      logger.createLogContext(request, requestId),
      'health_check',
      { status: overallStatus, responseTime, alerts: alerts.length }
    );

    return NextResponse.json(healthResponse, {
      status: overallStatus === 'unhealthy' ? 503 : overallStatus === 'degraded' ? 200 : 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': overallStatus,
        'X-Response-Time': `${responseTime.toFixed(2)}ms`,
        'X-Request-ID': requestId
      }
    });
    
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    // Log error
    logger.logError(
      logger.createLogContext(request, requestId),
      error instanceof Error ? error : new Error(String(error)),
      { category: 'system', severity: 'high', code: 'HEALTH_CHECK_ERROR' }
    );

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        requestId
      },
      { 
        status: 503,
        headers: {
          'X-Health-Status': 'unhealthy',
          'X-Response-Time': `${responseTime.toFixed(2)}ms`,
          'X-Request-ID': requestId
        }
      }
    );
  }
}

/**
 * Check all individual services
 */
async function checkAllServices(): Promise<HealthCheckResponse['services']> {
  const results = await Promise.allSettled([
    checkAPIService(),
    checkDatabaseService(),
    checkOpenAIService(),
    checkMemoryService(),
    checkErrorService()
  ]);

  return {
    api: results[0].status === 'fulfilled' ? results[0].value : createFailedServiceHealth('API service check failed'),
    database: results[1].status === 'fulfilled' ? results[1].value : createFailedServiceHealth('Database check failed'),
    openai: results[2].status === 'fulfilled' ? results[2].value : createFailedServiceHealth('OpenAI check failed'),
    memory: results[3].status === 'fulfilled' ? results[3].value : createFailedServiceHealth('Memory check failed'),
    errors: results[4].status === 'fulfilled' ? results[4].value : createFailedServiceHealth('Error service check failed')
  };
}

/**
 * Check API service health
 */
async function checkAPIService(): Promise<ServiceHealth> {
  const startTime = performance.now();
  
  try {
    // Basic API functionality check
    const systemHealth = metrics.getSystemHealth();
    const responseTime = performance.now() - startTime;
    
    return {
      status: systemHealth.alerts.length > 0 ? 'degraded' : 'up',
      responseTime,
      lastCheck: new Date().toISOString(),
      details: {
        activeRequests: systemHealth.requests.active,
        uptime: systemHealth.uptime,
        alerts: systemHealth.alerts.length
      }
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: performance.now() - startTime,
      lastCheck: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Check database connectivity
 */
async function checkDatabaseService(): Promise<ServiceHealth> {
  const startTime = performance.now();
  
  try {
    // This would typically ping your database
    // For now, we'll simulate based on environment variables
    const hasSupabaseConfig = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
    const responseTime = performance.now() - startTime;
    
    return {
      status: hasSupabaseConfig ? 'up' : 'degraded',
      responseTime,
      lastCheck: new Date().toISOString(),
      details: {
        configured: hasSupabaseConfig,
        provider: 'supabase'
      }
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: performance.now() - startTime,
      lastCheck: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Check OpenAI service availability
 */
async function checkOpenAIService(): Promise<ServiceHealth> {
  const startTime = performance.now();
  
  try {
    // Check if OpenAI API key is configured
    const hasAPIKey = !!process.env.OPENAI_API_KEY;
    const responseTime = performance.now() - startTime;
    
    // Could make an actual API call here for deeper health check
    return {
      status: hasAPIKey ? 'up' : 'degraded',
      responseTime,
      lastCheck: new Date().toISOString(),
      details: {
        configured: hasAPIKey,
        keyLength: process.env.OPENAI_API_KEY?.length || 0,
        service: 'openai'
      }
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: performance.now() - startTime,
      lastCheck: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Check memory usage
 */
async function checkMemoryService(): Promise<ServiceHealth> {
  const startTime = performance.now();
  
  try {
    const memoryUsage = logger.getMemoryMetrics();
    const responseTime = performance.now() - startTime;
    
    if (!memoryUsage) {
      return {
        status: 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: { error: 'Memory metrics unavailable' }
      };
    }
    
    const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const status = memoryPercentage > 90 ? 'degraded' : memoryPercentage > 95 ? 'down' : 'up';
    
    return {
      status,
      responseTime,
      lastCheck: new Date().toISOString(),
      details: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round(memoryPercentage),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      }
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: performance.now() - startTime,
      lastCheck: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Check error tracking service
 */
async function checkErrorService(): Promise<ServiceHealth> {
  const startTime = performance.now();
  
  try {
    const errorAnalytics = errorTracker.getErrorAnalytics();
    const responseTime = performance.now() - startTime;
    
    // Consider service degraded if error rate is high
    const recentErrors = errorTracker.getRecentErrors(100);
    const recentCriticalErrors = recentErrors.filter(e => e.error.severity === 'critical').length;
    
    const status = recentCriticalErrors > 10 ? 'degraded' : recentCriticalErrors > 20 ? 'down' : 'up';
    
    return {
      status,
      responseTime,
      lastCheck: new Date().toISOString(),
      details: {
        totalErrors: errorAnalytics.totalErrors,
        recentCritical: recentCriticalErrors,
        affectedUsers: errorAnalytics.affectedUsers.total
      }
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: performance.now() - startTime,
      lastCheck: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Calculate overall system status
 */
function calculateOverallStatus(
  services: HealthCheckResponse['services'], 
  systemHealth: ReturnType<typeof metrics.getSystemHealth>
): 'healthy' | 'degraded' | 'unhealthy' {
  const serviceStatuses = Object.values(services).map(s => s.status);
  
  // If any service is down, system is unhealthy
  if (serviceStatuses.includes('down')) {
    return 'unhealthy';
  }
  
  // If any service is degraded or there are system alerts, system is degraded
  if (serviceStatuses.includes('degraded') || systemHealth.alerts.length > 0) {
    return 'degraded';
  }
  
  return 'healthy';
}

/**
 * Get performance metrics summary
 */
function getPerformanceMetrics() {
  const allEndpoints = ['GET:/api/descriptions/generate', 'POST:/api/descriptions/generate', 'GET:/api/health'];
  
  const slowestEndpoints = allEndpoints
    .map(endpoint => {
      const summary = metrics.getEndpointSummary(endpoint.split(':')[1], endpoint.split(':')[0]);
      return summary ? {
        endpoint,
        averageTime: summary.averageResponseTime,
        requests: summary.totalRequests
      } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (b?.averageTime || 0) - (a?.averageTime || 0))
    .slice(0, 5) as Array<{ endpoint: string; averageTime: number; requests: number; }>;

  const errorRates = allEndpoints
    .map(endpoint => {
      const summary = metrics.getEndpointSummary(endpoint.split(':')[1], endpoint.split(':')[0]);
      return summary ? {
        endpoint,
        errorRate: summary.errorRate,
        totalRequests: summary.totalRequests
      } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (b?.errorRate || 0) - (a?.errorRate || 0))
    .slice(0, 5) as Array<{ endpoint: string; errorRate: number; totalRequests: number; }>;

  const averageResponseTime = slowestEndpoints.length > 0 
    ? slowestEndpoints.reduce((sum, ep) => sum + ep.averageTime, 0) / slowestEndpoints.length 
    : 0;

  return {
    slowestEndpoints,
    errorRates,
    averageResponseTime
  };
}

/**
 * Generate health alerts
 */
function generateHealthAlerts(
  systemHealth: ReturnType<typeof metrics.getSystemHealth>,
  services: HealthCheckResponse['services'],
  errorAnalytics: ReturnType<typeof errorTracker.getErrorAnalytics>
): string[] {
  const alerts: string[] = [];
  
  // System alerts
  alerts.push(...systemHealth.alerts);
  
  // Service alerts
  Object.entries(services).forEach(([serviceName, service]) => {
    if (service.status === 'down') {
      alerts.push(`${serviceName} service is down`);
    } else if (service.status === 'degraded') {
      alerts.push(`${serviceName} service is degraded`);
    }
  });
  
  // Error alerts
  if (errorAnalytics.totalErrors > 1000) {
    alerts.push('High error count detected');
  }
  
  const criticalErrors = errorAnalytics.errorsBySeverity.critical || 0;
  if (criticalErrors > 10) {
    alerts.push(`${criticalErrors} critical errors detected`);
  }
  
  return alerts;
}

/**
 * Create a failed service health object
 */
function createFailedServiceHealth(error: string): ServiceHealth {
  return {
    status: 'down',
    lastCheck: new Date().toISOString(),
    details: { error }
  };
}