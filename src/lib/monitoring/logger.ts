/**
 * Structured Logging System
 * Provides comprehensive logging with request tracing, performance metrics, and error categorization
 */

import { NextRequest } from "next/server";

export interface LogContext {
  requestId: string;
  userId?: string;
  userTier?: string;
  endpoint: string;
  method: string;
  userAgent?: string;
  ip?: string;
  timestamp: string;
  sessionId?: string;
}

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage?: {
    used: number;
    total: number;
    external: number;
    heapUsed: number;
    heapTotal: number;
  };
  cpuUsage?: {
    user: number;
    system: number;
  };
  requestSize?: number;
  responseSize?: number;
}

export interface ErrorContext {
  category: 'authentication' | 'validation' | 'external_api' | 'database' | 'system' | 'business_logic' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  code?: string;
  stack?: string;
  additionalData?: Record<string, any>;
}

export class StructuredLogger {
  private static instance: StructuredLogger;
  private enableConsole: boolean = process.env.NODE_ENV === 'development';
  private enableExternal: boolean = !!process.env.EXTERNAL_LOGGING_ENABLED;

  static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  /**
   * Generate request context from NextRequest
   */
  createLogContext(request: NextRequest, requestId: string, additionalData?: Partial<LogContext>): LogContext {
    const url = new URL(request.url);
    return {
      requestId,
      endpoint: url.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: this.getClientIP(request),
      timestamp: new Date().toISOString(),
      ...additionalData
    };
  }

  /**
   * Log API request start
   */
  logRequest(context: LogContext, additionalData?: Record<string, any>) {
    const logData = {
      type: 'api_request_start',
      level: 'info',
      ...context,
      ...additionalData
    };

    this.writeLog(logData);
  }

  /**
   * Log API response
   */
  logResponse(
    context: LogContext, 
    statusCode: number, 
    metrics: PerformanceMetrics, 
    additionalData?: Record<string, any>
  ) {
    const logData = {
      type: 'api_response',
      level: this.getResponseLogLevel(statusCode),
      statusCode,
      ...context,
      performance: metrics,
      ...additionalData
    };

    this.writeLog(logData);
  }

  /**
   * Log errors with detailed context
   */
  logError(
    context: LogContext, 
    error: Error | string, 
    errorContext: ErrorContext,
    additionalData?: Record<string, any>
  ) {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    const logData = {
      type: 'api_error',
      level: 'error',
      ...context,
      error: {
        message: errorMessage,
        stack,
        ...errorContext
      },
      ...additionalData
    };

    this.writeLog(logData);

    // Send to external error tracking if enabled
    if (this.enableExternal) {
      this.sendToExternalTracking(logData);
    }
  }

  /**
   * Log performance warnings
   */
  logPerformanceWarning(
    context: LogContext, 
    metrics: PerformanceMetrics, 
    threshold: number,
    additionalData?: Record<string, any>
  ) {
    const logData = {
      type: 'performance_warning',
      level: 'warn',
      ...context,
      performance: metrics,
      threshold,
      ...additionalData
    };

    this.writeLog(logData);
  }

  /**
   * Log business events
   */
  logEvent(
    context: LogContext, 
    eventName: string, 
    eventData?: Record<string, any>
  ) {
    const logData = {
      type: 'business_event',
      level: 'info',
      ...context,
      event: {
        name: eventName,
        data: eventData
      }
    };

    this.writeLog(logData);
  }

  /**
   * Log security events
   */
  logSecurity(
    context: LogContext, 
    securityEvent: string, 
    severity: 'low' | 'medium' | 'high' | 'critical',
    additionalData?: Record<string, any>
  ) {
    const logData = {
      type: 'security_event',
      level: severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info',
      ...context,
      security: {
        event: securityEvent,
        severity
      },
      ...additionalData
    };

    this.writeLog(logData);

    // Always send security events to external tracking
    if (severity === 'high' || severity === 'critical') {
      this.sendToExternalTracking(logData);
    }
  }

  /**
   * Create request tracing ID
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get memory usage metrics
   */
  getMemoryMetrics() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return undefined;
  }

  /**
   * Get CPU usage metrics (simplified)
   */
  getCPUMetrics() {
    if (typeof process !== 'undefined' && process.cpuUsage) {
      return process.cpuUsage();
    }
    return undefined;
  }

  private getClientIP(request: NextRequest): string | undefined {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || undefined;
  }

  private getResponseLogLevel(statusCode: number): string {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  private writeLog(data: Record<string, any>) {
    const logEntry = {
      ...data,
      service: 'describe-it-api',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    if (this.enableConsole) {
      console.log(JSON.stringify(logEntry, null, 2));
    }

    // Store in memory for analytics (could be extended to write to file/database)
    this.storeLogEntry(logEntry);
  }

  private storeLogEntry(entry: Record<string, any>) {
    // This could be extended to store in Redis, database, or file system
    // For now, we'll keep a simple in-memory store for recent entries
    if (typeof globalThis !== 'undefined') {
      if (!globalThis._apiLogs) {
        globalThis._apiLogs = [];
      }
      
      globalThis._apiLogs.push(entry);
      
      // Keep only last 1000 entries to prevent memory issues
      if (globalThis._apiLogs.length > 1000) {
        globalThis._apiLogs = globalThis._apiLogs.slice(-1000);
      }
    }
  }

  private async sendToExternalTracking(data: Record<string, any>) {
    try {
      // Integration points for external services like Sentry, DataDog, etc.
      // This would be implemented based on the chosen external service
      
      // Example for Sentry integration
      if (process.env.SENTRY_DSN && typeof window !== 'undefined') {
        // Client-side Sentry integration would go here
      }
      
      // Example for custom webhook
      if (process.env.LOGGING_WEBHOOK_URL) {
        await fetch(process.env.LOGGING_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
    } catch (error) {
      // Don't let logging errors break the application
      console.error('Failed to send to external tracking:', error);
    }
  }

  /**
   * Get recent log entries for analytics
   */
  getRecentLogs(count: number = 100): any[] {
    if (typeof globalThis !== 'undefined' && globalThis._apiLogs) {
      return globalThis._apiLogs.slice(-count);
    }
    return [];
  }

  /**
   * Clear stored logs
   */
  clearLogs() {
    if (typeof globalThis !== 'undefined') {
      globalThis._apiLogs = [];
    }
  }
}

// Export singleton instance
export const logger = StructuredLogger.getInstance();

// Type definitions for global log storage
declare global {
  var _apiLogs: any[] | undefined;
}