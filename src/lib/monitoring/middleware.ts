/**
 * API Monitoring Middleware
 * Provides comprehensive request/response logging, performance tracking, and error handling
 */

import { NextRequest, NextResponse } from "next/server";
import { logger, type LogContext, type PerformanceMetrics, type ErrorContext } from './logger';
import { metrics } from './metrics';

export interface MonitoringConfig {
  enableRequestLogging?: boolean;
  enableResponseLogging?: boolean;
  enablePerformanceTracking?: boolean;
  enableErrorTracking?: boolean;
  performanceThreshold?: number; // ms
  excludeHeaders?: string[];
  includeBody?: boolean;
  maxBodySize?: number; // bytes
}

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    subscription_status?: string;
    [key: string]: any;
  };
}

/**
 * Main monitoring middleware for API routes
 */
export function withMonitoring<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse>,
  config: MonitoringConfig = {}
) {
  return async (request: T): Promise<NextResponse> => {
    const startTime = performance.now();
    const requestId = logger.generateRequestId();
    const requestSize = await getRequestSize(request);
    
    // Default configuration
    const monitoringConfig: Required<MonitoringConfig> = {
      enableRequestLogging: true,
      enableResponseLogging: true,
      enablePerformanceTracking: true,
      enableErrorTracking: true,
      performanceThreshold: 1000, // 1 second
      excludeHeaders: ['authorization', 'cookie', 'x-api-key'],
      includeBody: process.env.NODE_ENV === 'development',
      maxBodySize: 10 * 1024, // 10KB
      ...config
    };

    // Create log context
    const logContext: LogContext = logger.createLogContext(request, requestId, {
      userId: (request as AuthenticatedRequest).user?.id,
      userTier: (request as AuthenticatedRequest).user?.subscription_status,
    });

    // Start request tracking
    const requestTracking = metrics.startRequest(requestId);

    // Log request start
    if (monitoringConfig.enableRequestLogging) {
      await logIncomingRequest(request, logContext, monitoringConfig);
    }

    let response: NextResponse;
    let error: Error | null = null;
    
    try {
      // Execute the handler
      response = await handler(request);
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      
      // Log error
      if (monitoringConfig.enableErrorTracking) {
        const errorContext = categorizeError(error);
        logger.logError(logContext, error, errorContext);
        
        // Record error metrics
        metrics.recordError(
          logContext.endpoint,
          error.constructor.name,
          errorContext.category,
          errorContext.severity,
          performance.now() - startTime
        );
      }
      
      // Create error response
      response = createErrorResponse(error, requestId);
    }

    // Calculate final metrics
    const responseTime = performance.now() - startTime;
    const responseSize = await getResponseSize(response);
    
    const performanceMetrics: PerformanceMetrics = {
      responseTime,
      memoryUsage: logger.getMemoryMetrics(),
      cpuUsage: logger.getCPUMetrics(),
      requestSize,
      responseSize
    };

    // End request tracking and collect metrics
    if (monitoringConfig.enablePerformanceTracking) {
      metrics.endRequest(
        requestId,
        logContext.endpoint,
        logContext.method,
        response.status,
        requestTracking.startTime,
        requestSize,
        responseSize,
        logContext.userId,
        logContext.userTier
      );
    }

    // Log response
    if (monitoringConfig.enableResponseLogging) {
      logger.logResponse(logContext, response.status, performanceMetrics);
    }

    // Log performance warning if threshold exceeded
    if (responseTime > monitoringConfig.performanceThreshold) {
      logger.logPerformanceWarning(logContext, performanceMetrics, monitoringConfig.performanceThreshold);
    }

    // Add monitoring headers to response
    const monitoredResponse = addMonitoringHeaders(response, requestId, performanceMetrics);

    return monitoredResponse;
  };
}

/**
 * Log incoming request details
 */
async function logIncomingRequest(
  request: NextRequest,
  context: LogContext,
  config: MonitoringConfig
) {
  const headers = sanitizeHeaders(request.headers, config.excludeHeaders || []);
  let body: any = null;

  // Include body if enabled and request has content
  if (config.includeBody && request.headers.get('content-type')?.includes('application/json')) {
    try {
      const clonedRequest = request.clone();
      const bodyText = await clonedRequest.text();
      
      if (bodyText && bodyText.length <= (config.maxBodySize || 10240)) {
        body = JSON.parse(bodyText);
      }
    } catch (err) {
      // Ignore body parsing errors
    }
  }

  logger.logRequest(context, {
    headers,
    body,
    query: Object.fromEntries(new URL(request.url).searchParams)
  });
}

/**
 * Categorize errors for better tracking
 */
function categorizeError(error: Error): ErrorContext {
  const message = error.message.toLowerCase();
  const name = error.constructor.name.toLowerCase();

  // Authentication errors
  if (message.includes('unauthorized') || message.includes('forbidden') || 
      message.includes('token') || name.includes('auth')) {
    return {
      category: 'authentication',
      severity: 'medium',
      code: 'AUTH_ERROR'
    };
  }

  // Validation errors
  if (message.includes('validation') || message.includes('invalid') || 
      name.includes('zod') || name.includes('validation')) {
    return {
      category: 'validation',
      severity: 'low',
      code: 'VALIDATION_ERROR'
    };
  }

  // External API errors
  if (message.includes('fetch') || message.includes('network') || 
      message.includes('timeout') || message.includes('api')) {
    return {
      category: 'external_api',
      severity: 'medium',
      code: 'EXTERNAL_API_ERROR'
    };
  }

  // Database errors
  if (message.includes('database') || message.includes('sql') || 
      message.includes('connection') || name.includes('db')) {
    return {
      category: 'database',
      severity: 'high',
      code: 'DATABASE_ERROR'
    };
  }

  // System errors
  if (message.includes('memory') || message.includes('system') || 
      name.includes('system') || name.includes('reference')) {
    return {
      category: 'system',
      severity: 'critical',
      code: 'SYSTEM_ERROR'
    };
  }

  // Default to business logic error
  return {
    category: 'business_logic',
    severity: 'medium',
    code: 'BUSINESS_ERROR'
  };
}

/**
 * Create standardized error response
 */
function createErrorResponse(error: Error, requestId: string): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    success: false,
    error: 'Internal Server Error',
    message: isDevelopment ? error.message : 'An unexpected error occurred',
    requestId,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: error.stack })
  };

  return NextResponse.json(errorResponse, {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      'X-Error': 'true'
    }
  });
}

/**
 * Add monitoring headers to response
 */
function addMonitoringHeaders(
  response: NextResponse,
  requestId: string,
  metrics: PerformanceMetrics
): NextResponse {
  const headers = new Headers(response.headers);
  
  headers.set('X-Request-ID', requestId);
  headers.set('X-Response-Time', `${metrics.responseTime.toFixed(2)}ms`);
  headers.set('X-Timestamp', new Date().toISOString());
  
  if (metrics.memoryUsage) {
    headers.set('X-Memory-Usage', `${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  }

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Sanitize headers by removing sensitive information
 */
function sanitizeHeaders(headers: Headers, excludeHeaders: string[]): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  headers.forEach((value, key) => {
    if (!excludeHeaders.includes(key.toLowerCase())) {
      sanitized[key] = value;
    } else {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Calculate request size
 */
async function getRequestSize(request: NextRequest): Promise<number> {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }
  
  // Estimate size if content-length not available
  try {
    const cloned = request.clone();
    const body = await cloned.text();
    return new Blob([body]).size;
  } catch {
    return 0;
  }
}

/**
 * Calculate response size
 */
async function getResponseSize(response: NextResponse): Promise<number> {
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }
  
  // Estimate size if content-length not available
  try {
    const cloned = response.clone();
    const body = await cloned.text();
    return new Blob([body]).size;
  } catch {
    return 0;
  }
}

/**
 * Rate limiting with monitoring
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (request: NextRequest) => string;
  }
) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return async (request: NextRequest): Promise<NextResponse> => {
    const key = options.keyGenerator ? 
      options.keyGenerator(request) : 
      request.headers.get('x-forwarded-for') || 'unknown';
    
    const now = Date.now();
    const windowStart = now - options.windowMs;
    
    // Clean old entries
    for (const [k, v] of requests.entries()) {
      if (v.resetTime < windowStart) {
        requests.delete(k);
      }
    }
    
    // Check current usage
    const current = requests.get(key);
    if (current && current.count >= options.maxRequests) {
      logger.logSecurity(
        logger.createLogContext(request, logger.generateRequestId()),
        'rate_limit_exceeded',
        'medium',
        { key, count: current.count, limit: options.maxRequests }
      );
      
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': options.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString(),
            'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString()
          }
        }
      );
    }
    
    // Update counter
    const resetTime = current?.resetTime || (now + options.windowMs);
    const count = (current?.count || 0) + 1;
    requests.set(key, { count, resetTime });
    
    // Execute handler
    const response = await handler(request);
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', options.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', Math.max(0, options.maxRequests - count).toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
    
    return response;
  };
}