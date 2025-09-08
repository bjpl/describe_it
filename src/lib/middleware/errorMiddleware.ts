/**
 * Server-side Error Handling Middleware for Next.js API Routes
 * Provides comprehensive error logging, categorization, and response formatting
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ErrorCategory, ErrorSeverity, RecoveryStrategy } from '@/lib/errorHandler';

// Request Context Interface
interface RequestContext {
  method: string;
  url: string;
  headers: Record<string, string>;
  userAgent?: string;
  ip?: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  requestId: string;
}

// Error Response Interface
interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    requestId: string;
    timestamp: string;
  };
  details?: any;
  stack?: string;
}

// Performance Metrics Interface
interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  duration: number;
  statusCode: number;
  contentLength?: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

// Error Middleware Class
export class ErrorMiddleware {
  private static instance: ErrorMiddleware;
  private performanceMetrics: PerformanceMetrics[] = [];

  static getInstance(): ErrorMiddleware {
    if (!ErrorMiddleware.instance) {
      ErrorMiddleware.instance = new ErrorMiddleware();
    }
    return ErrorMiddleware.instance;
  }

  // Generate unique request ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Extract request context
  private extractRequestContext(request: NextRequest): RequestContext {
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      method: request.method,
      url: request.url,
      headers,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown',
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
    };
  }

  // Categorize server errors
  private categorizeError(error: Error, context: RequestContext): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Database errors
    if (message.includes('database') || 
        message.includes('sql') || 
        message.includes('connection') ||
        message.includes('prisma') ||
        message.includes('mongodb')) {
      return ErrorCategory.DATABASE;
    }

    // Authentication/Authorization errors
    if (message.includes('unauthorized') || 
        message.includes('forbidden') ||
        message.includes('token') ||
        message.includes('auth')) {
      return ErrorCategory.AUTHENTICATION;
    }

    // Validation errors
    if (message.includes('validation') || 
        message.includes('invalid') ||
        message.includes('required') ||
        message.includes('schema')) {
      return ErrorCategory.VALIDATION;
    }

    // Network/External service errors
    if (message.includes('fetch') || 
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('enotfound') ||
        message.includes('econnrefused')) {
      return ErrorCategory.EXTERNAL_SERVICE;
    }

    // File system errors
    if (message.includes('enoent') || 
        message.includes('eacces') ||
        message.includes('file') ||
        message.includes('directory')) {
      return ErrorCategory.FILE_SYSTEM;
    }

    // API/Business logic errors
    if (context.url.includes('/api/')) {
      return ErrorCategory.API;
    }

    return ErrorCategory.SYSTEM;
  }

  // Assess error severity
  private assessSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    const message = error.message.toLowerCase();

    if (category === ErrorCategory.SECURITY || 
        message.includes('critical') ||
        message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }

    if (category === ErrorCategory.DATABASE || 
        category === ErrorCategory.AUTHENTICATION ||
        message.includes('crash') ||
        message.includes('abort')) {
      return ErrorSeverity.HIGH;
    }

    if (category === ErrorCategory.EXTERNAL_SERVICE || 
        category === ErrorCategory.API ||
        category === ErrorCategory.NETWORK) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  // Generate user-friendly error message
  private generateUserMessage(category: ErrorCategory, isDevelopment: boolean): string {
    if (isDevelopment) {
      // Show more detailed messages in development
      const devMessages = {
        [ErrorCategory.DATABASE]: 'Database connection or query error occurred',
        [ErrorCategory.AUTHENTICATION]: 'Authentication or authorization failed',
        [ErrorCategory.VALIDATION]: 'Request validation failed',
        [ErrorCategory.EXTERNAL_SERVICE]: 'External service call failed',
        [ErrorCategory.FILE_SYSTEM]: 'File system operation failed',
        [ErrorCategory.API]: 'API request processing error',
        [ErrorCategory.NETWORK]: 'Network connectivity issue',
        [ErrorCategory.SYSTEM]: 'System-level error occurred',
      };
      return devMessages[category] || 'An unexpected error occurred';
    }

    // Production user-friendly messages
    const prodMessages = {
      [ErrorCategory.DATABASE]: 'Unable to process your request right now',
      [ErrorCategory.AUTHENTICATION]: 'Authentication required or permission denied',
      [ErrorCategory.VALIDATION]: 'Invalid request data provided',
      [ErrorCategory.EXTERNAL_SERVICE]: 'Service temporarily unavailable',
      [ErrorCategory.FILE_SYSTEM]: 'Unable to access requested resource',
      [ErrorCategory.API]: 'Unable to process your request',
      [ErrorCategory.NETWORK]: 'Connection issue occurred',
      [ErrorCategory.SYSTEM]: 'Unexpected error occurred',
    };
    return prodMessages[category] || 'An unexpected error occurred';
  }

  // Log performance metrics
  private logPerformanceMetrics(metrics: PerformanceMetrics) {
    this.performanceMetrics.push(metrics);
    
    // Keep only last 1000 metrics
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics.shift();
    }

    // Log slow requests
    if (metrics.duration > 5000) {
      logger.warn('Slow API request detected', {
        requestId: metrics.requestId,
        method: metrics.method,
        url: metrics.url,
        duration: metrics.duration,
        category: 'performance',
        severity: 'medium',
      });
    }

    // Log performance data
    logger.performance(`${metrics.method} ${metrics.url}`, metrics.duration, {
      requestId: metrics.requestId,
      statusCode: metrics.statusCode,
      contentLength: metrics.contentLength,
      memoryUsage: metrics.memoryUsage,
    });
  }

  // Main error handling wrapper
  async handleError(
    error: Error,
    context: RequestContext,
    statusCode: number = 500
  ): Promise<NextResponse<ErrorResponse>> {
    const category = this.categorizeError(error, context);
    const severity = this.assessSeverity(error, category);
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Log error with context
    logger.errorWithCategory(
      error.message,
      error,
      category,
      severity,
      {
        requestId: context.requestId,
        method: context.method,
        url: context.url,
        userAgent: context.userAgent,
        ip: context.ip,
        userId: context.userId,
        sessionId: context.sessionId,
      }
    );

    // Determine appropriate HTTP status code
    const httpStatusCode = this.determineStatusCode(error, category, statusCode);

    // Generate error response
    const errorResponse: ErrorResponse = {
      error: {
        message: this.generateUserMessage(category, isDevelopment),
        code: error.name,
        category,
        severity,
        requestId: context.requestId,
        timestamp: context.timestamp,
      },
    };

    // Include additional details in development
    if (isDevelopment) {
      errorResponse.details = {
        originalMessage: error.message,
        stack: error.stack,
        context: {
          method: context.method,
          url: context.url,
          headers: context.headers,
        },
      };
    }

    // Set security headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-Request-ID': context.requestId,
      'X-Error-Category': category,
      'X-Error-Severity': severity,
    });

    return NextResponse.json(errorResponse, {
      status: httpStatusCode,
      headers,
    });
  }

  // Determine appropriate HTTP status code
  private determineStatusCode(error: Error, category: ErrorCategory, defaultCode: number): number {
    const message = error.message.toLowerCase();

    // Specific error types
    if (message.includes('not found') || message.includes('enoent')) return 404;
    if (message.includes('unauthorized') || message.includes('unauthenticated')) return 401;
    if (message.includes('forbidden') || message.includes('permission')) return 403;
    if (message.includes('validation') || message.includes('invalid')) return 400;
    if (message.includes('timeout')) return 408;
    if (message.includes('too many requests') || message.includes('rate limit')) return 429;

    // Category-based status codes
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
        return 401;
      case ErrorCategory.AUTHORIZATION:
        return 403;
      case ErrorCategory.VALIDATION:
        return 400;
      case ErrorCategory.EXTERNAL_SERVICE:
        return 502;
      case ErrorCategory.NETWORK:
        return 503;
      default:
        return defaultCode;
    }
  }

  // Middleware wrapper for API routes
  withErrorHandling = (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return async (request: NextRequest): Promise<NextResponse> => {
      const startTime = Date.now();
      const context = this.extractRequestContext(request);
      let response: NextResponse;

      try {
        // Add request context to headers for downstream handlers
        request.headers.set('x-request-id', context.requestId);
        request.headers.set('x-request-timestamp', context.timestamp);

        // Execute the handler
        response = await handler(request);
        
        // Log successful request
        logger.apiResponse(
          context.method,
          context.url,
          response.status,
          {
            requestId: context.requestId,
            duration: Date.now() - startTime,
          }
        );

        return response;

      } catch (error) {
        // Handle and log the error
        response = await this.handleError(
          error as Error,
          context,
          500
        );

        return response;
      } finally {
        // Log performance metrics
        const duration = Date.now() - startTime;
        const memoryUsage = process.memoryUsage();
        
        this.logPerformanceMetrics({
          requestId: context.requestId,
          method: context.method,
          url: context.url,
          duration,
          statusCode: response?.status || 500,
          memoryUsage,
        });
      }
    };
  };

  // Get performance statistics
  getPerformanceStats() {
    if (this.performanceMetrics.length === 0) {
      return null;
    }

    const durations = this.performanceMetrics.map(m => m.duration);
    const statusCodes = this.performanceMetrics.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalRequests: this.performanceMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      medianDuration: durations.sort()[Math.floor(durations.length / 2)],
      p95Duration: durations.sort()[Math.floor(durations.length * 0.95)],
      statusCodeDistribution: statusCodes,
      slowRequests: this.performanceMetrics.filter(m => m.duration > 5000).length,
    };
  }

  // Clear performance metrics
  clearPerformanceMetrics() {
    this.performanceMetrics = [];
  }
}

// Export singleton instance and utilities
export const errorMiddleware = ErrorMiddleware.getInstance();

// Utility function for wrapping API handlers
export const withErrorHandling = errorMiddleware.withErrorHandling;

// Custom error classes for better error categorization
export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Permission denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ExternalServiceError extends Error {
  constructor(message: string, public service?: string, public statusCode?: number) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public operation?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Type guards for error identification
export const isValidationError = (error: Error): error is ValidationError => {
  return error.name === 'ValidationError';
};

export const isAuthenticationError = (error: Error): error is AuthenticationError => {
  return error.name === 'AuthenticationError';
};

export const isAuthorizationError = (error: Error): error is AuthorizationError => {
  return error.name === 'AuthorizationError';
};

export const isExternalServiceError = (error: Error): error is ExternalServiceError => {
  return error.name === 'ExternalServiceError';
};

export const isDatabaseError = (error: Error): error is DatabaseError => {
  return error.name === 'DatabaseError';
};