/**
 * Unified Structured Logging Infrastructure
 * Replaces all console statements with Winston-based structured logging
 * Supports environment-specific configuration and external monitoring integration
 */

import { NextRequest } from 'next/server';
import { safeParse, safeStringify } from './utils/json-safe';

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

export interface LogContext {
  [key: string]: any;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  traceId?: string;
  correlationId?: string;
  component?: string;
  function?: string;
  timestamp?: string;
  errorId?: string;
  category?: string;
  severity?: string;
  operation?: string;
  duration?: number;
  method?: string;
  url?: string;
  statusCode?: number;
  ip?: string;
  userAgent?: string;
}

export interface ErrorCategory {
  category: 'authentication' | 'validation' | 'external_api' | 'database' | 'system' | 'business_logic' | 'network' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable?: boolean;
  code?: string;
  stack?: string;
}

// Winston logger instance (server-side only)
let winstonLogger: any = null;

// Detect Edge Runtime
const isEdgeRuntime = typeof EdgeRuntime !== 'undefined' || process.env.NEXT_RUNTIME === 'edge';

// Initialize Winston on Node.js runtime only (not Edge Runtime)
if (typeof window === 'undefined' && !isEdgeRuntime) {
  try {
    const winston = require('winston');
    const { format, transports } = winston;

    // Custom format for development (pretty console output)
    const devFormat = format.combine(
      format.colorize({ all: true }),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      format.errors({ stack: true }),
      format.printf((info: any) => {
        const { timestamp, level, message, context, error, ...meta } = info;
        let log = `${timestamp} [${level}]`;

        if (context) log += ` [${context}]`;
        log += `: ${message}`;

        if (error) {
          log += `\n  Error: ${error.message}`;
          if (error.stack) log += `\n  Stack: ${error.stack}`;
        }

        if (Object.keys(meta).length > 0) {
          log += `\n  Meta: ${JSON.stringify(meta, null, 2)}`;
        }

        return log;
      })
    );

    // Custom format for production (JSON structured logs)
    const prodFormat = format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json()
    );

    // Create transports based on environment
    const logTransports: any[] = [];

    // Console transport (all environments except test)
    if (process.env.NODE_ENV !== 'test') {
      logTransports.push(
        new transports.Console({
          format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
          level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        })
      );
    }

    // File transports for production
    if (process.env.NODE_ENV === 'production') {
      // Error log file
      logTransports.push(
        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: prodFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 10,
          tailable: true,
        })
      );

      // Combined log file
      logTransports.push(
        new transports.File({
          filename: 'logs/combined.log',
          format: prodFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          tailable: true,
        })
      );

      // HTTP requests log file
      logTransports.push(
        new transports.File({
          filename: 'logs/http.log',
          level: 'http',
          format: prodFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 3,
          tailable: true,
        })
      );
    }

    // Create Winston logger
    winstonLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6,
      },
      transports: logTransports,
      exitOnError: false,
    });

    // Add custom colors
    winston.addColors({
      error: 'red',
      warn: 'yellow',
      info: 'green',
      http: 'magenta',
      verbose: 'cyan',
      debug: 'white',
      silly: 'grey',
    });
  } catch (error) {
    console.error('Failed to initialize Winston logger:', error);
  }
}

/**
 * Unified Logger class
 */
class Logger {
  private context: string;
  private isClient = typeof window !== 'undefined';
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';
  private requestMeta: LogContext = {};

  constructor(context: string = 'app') {
    this.context = context;
  }

  /**
   * Set request-specific metadata for all subsequent logs
   */
  setRequest(meta: LogContext): this {
    this.requestMeta = meta;
    return this;
  }

  /**
   * Clear request metadata
   */
  clearRequest(): this {
    this.requestMeta = {};
    return this;
  }

  /**
   * Generate a unique request ID
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract request context from NextRequest
   */
  extractRequestContext(request: NextRequest, requestId?: string): LogContext {
    const url = new URL(request.url);
    return {
      requestId: requestId || this.generateRequestId(),
      method: request.method,
      url: url.pathname,
      query: Object.fromEntries(url.searchParams),
      userAgent: request.headers.get('user-agent') || undefined,
      ip: this.getClientIP(request),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get client IP from request
   */
  private getClientIP(request: NextRequest): string | undefined {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return request.headers.get('x-real-ip') || undefined;
  }

  /**
   * Format log data for Winston or console
   */
  private formatLogData(message: string, context?: LogContext): any {
    return {
      message,
      context: this.context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      service: 'describe-it',
      ...this.requestMeta,
      ...context,
    };
  }

  /**
   * Write log using Winston (server) or console (client/edge)
   */
  private writeLog(level: LogLevel, message: string, context?: LogContext): void {
    const logData = this.formatLogData(message, context);

    // Detect Edge Runtime
    const isEdge = typeof EdgeRuntime !== 'undefined' || process.env.NEXT_RUNTIME === 'edge';

    if (winstonLogger && !this.isClient && !isEdge) {
      // Node.js runtime: Use Winston
      winstonLogger.log(level, message, logData);
    } else {
      // Client-side or Edge Runtime: Use console with formatting
      this.writeToConsole(level, message, logData);
    }

    // Store errors in localStorage for client-side debugging (not available in Edge Runtime)
    if (level === 'error' && this.isClient && !isEdge) {
      this.storeError(message, logData);
    }

    // Send to external monitoring in production (Edge Runtime compatible)
    if (this.isProduction && (level === 'error' || level === 'warn')) {
      this.sendToExternalMonitoring(level, message, logData);
    }
  }

  /**
   * Write to console with proper formatting
   */
  private writeToConsole(level: LogLevel, message: string, data: any): void {
    if (process.env.NODE_ENV === 'test') return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]`;
    const formattedMessage = `${prefix}: ${message}`;

    switch (level) {
      case 'error':
        console.error(formattedMessage, data);
        break;
      case 'warn':
        console.warn(formattedMessage, data);
        break;
      case 'info':
        console.info(formattedMessage, data);
        break;
      case 'http':
      case 'verbose':
      case 'debug':
      case 'silly':
        if (this.isDevelopment) {
          console.log(formattedMessage, data);
        }
        break;
      default:
        console.log(formattedMessage, data);
    }
  }

  /**
   * Store error in localStorage for debugging
   */
  private storeError(message: string, data: any): void {
    try {
      const errorData = {
        message,
        ...data,
        storedAt: Date.now(),
      };
      const errorId = data.errorId || `error_${Date.now()}`;
      localStorage.setItem(`app-error-${errorId}`, JSON.stringify(errorData));

      // Clean old errors (keep last 7 days)
      this.cleanOldErrors(7);
    } catch (error) {
      // Silent fail if localStorage unavailable
    }
  }

  /**
   * Send to external monitoring service (Sentry, DataDog, etc.)
   */
  private async sendToExternalMonitoring(level: string, message: string, data: any): Promise<void> {
    try {
      // Sentry integration
      if (process.env.NEXT_PUBLIC_SENTRY_DSN && this.isClient) {
        // Client-side Sentry would be initialized separately
        // This is a placeholder for the integration
      }

      // Custom webhook integration
      if (process.env.LOGGING_WEBHOOK_URL) {
        await fetch(process.env.LOGGING_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level, message, data, timestamp: Date.now() }),
        }).catch(() => {
          // Silent fail - don't let logging break the app
        });
      }
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Clean old errors from localStorage
   */
  private cleanOldErrors(daysToKeep: number = 7): void {
    if (!this.isClient) return;

    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('app-error-')) {
          const item = localStorage.getItem(key);
          if (item) {
            const data = safeParse(item);
            if (data.storedAt && data.storedAt < cutoffTime) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      // Silent fail
    }
  }

  // =====================
  // Public Logging Methods
  // =====================

  error(message: string, error?: Error | any, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
      } : undefined,
    };
    this.writeLog('error', message, errorContext);
  }

  warn(message: string, context?: LogContext): void {
    this.writeLog('warn', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.writeLog('info', message, context);
  }

  http(message: string, context?: LogContext): void {
    this.writeLog('http', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.writeLog('debug', message, context);
  }

  verbose(message: string, context?: LogContext): void {
    this.writeLog('verbose', message, context);
  }

  // =====================
  // Specialized Logging Methods
  // =====================

  /**
   * Log API request
   */
  apiRequest(method: string, url: string, context?: LogContext): void {
    this.http(`API Request: ${method} ${url}`, {
      type: 'api-request',
      method,
      url,
      ...context,
    });
  }

  /**
   * Log API response
   */
  apiResponse(method: string, url: string, statusCode: number, duration?: number, context?: LogContext): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this[level](`API Response: ${method} ${url} - ${statusCode}`, {
      type: 'api-response',
      method,
      url,
      statusCode,
      duration,
      ...context,
    });
  }

  /**
   * Log security event
   */
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this[level](`SECURITY: ${event}`, {
      type: 'security-event',
      category: 'security',
      severity,
      ...context,
    });
  }

  /**
   * Log authentication event
   */
  auth(event: string, success: boolean, context?: LogContext): void {
    const level = success ? 'info' : 'warn';
    this[level](`AUTH: ${event}`, {
      type: 'auth-event',
      category: 'authentication',
      success,
      ...context,
    });
  }

  /**
   * Log database operation
   */
  database(operation: string, duration?: number, context?: LogContext): void {
    const level = duration && duration > 1000 ? 'warn' : 'debug';
    this[level](`DB: ${operation}`, {
      type: 'database-operation',
      category: 'database',
      operation,
      duration,
      ...context,
    });
  }

  /**
   * Log performance metric
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 1000 ? 'warn' : 'debug';
    this[level](`PERF: ${operation} took ${duration}ms`, {
      type: 'performance',
      operation,
      duration,
      slow: duration > 1000,
      ...context,
    });
  }

  /**
   * Log user action
   */
  userAction(action: string, context?: LogContext): void {
    this.info(`USER ACTION: ${action}`, {
      type: 'user-action',
      action,
      ...context,
    });
  }

  /**
   * Log component lifecycle event
   */
  componentLifecycle(component: string, event: 'mount' | 'unmount' | 'render', context?: LogContext): void {
    this.debug(`COMPONENT: ${component} ${event}`, {
      type: 'component-lifecycle',
      component,
      event,
      ...context,
    });
  }

  /**
   * Log network error
   */
  networkError(message: string, error?: Error, context?: LogContext): void {
    this.error(`NETWORK: ${message}`, error, {
      category: 'network',
      severity: 'medium',
      ...context,
    });
  }

  /**
   * Log validation error
   */
  validationError(message: string, context?: LogContext): void {
    this.warn(`VALIDATION: ${message}`, {
      category: 'validation',
      severity: 'low',
      ...context,
    });
  }

  /**
   * Log business logic error
   */
  businessError(message: string, context?: LogContext): void {
    this.error(`BUSINESS: ${message}`, undefined, {
      category: 'business_logic',
      severity: 'medium',
      ...context,
    });
  }

  /**
   * Log system error
   */
  systemError(message: string, error?: Error, context?: LogContext): void {
    this.error(`SYSTEM: ${message}`, error, {
      category: 'system',
      severity: 'critical',
      ...context,
    });
  }

  // =====================
  // Utility Methods
  // =====================

  /**
   * Get stored errors from localStorage
   */
  getStoredErrors(): any[] {
    if (!this.isClient) return [];

    const errors: any[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('app-error-')) {
          const item = localStorage.getItem(key);
          if (item) {
            errors.push(safeParse(item));
          }
        }
      }
    } catch (error) {
      // Silent fail
    }

    return errors.sort((a, b) => b.storedAt - a.storedAt);
  }

  /**
   * Clear all stored errors
   */
  clearStoredErrors(): void {
    if (!this.isClient) return;

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('app-error-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      // Silent fail
    }
  }
}

// =====================
// Factory Functions
// =====================

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Create a logger with request context
 */
export function createRequestLogger(context: string, request?: NextRequest): Logger {
  const logger = new Logger(context);
  if (request) {
    logger.setRequest(logger.extractRequestContext(request));
  }
  return logger;
}

// =====================
// Specialized Logger Instances
// =====================

export const logger = createLogger('app');
export const apiLogger = createLogger('api');
export const authLogger = createLogger('auth');
export const dbLogger = createLogger('database');
export const securityLogger = createLogger('security');
export const performanceLogger = createLogger('performance');

// =====================
// Convenience Export Functions
// =====================

export const logError = (message: string, error?: Error, context?: LogContext) =>
  logger.error(message, error, context);

export const logWarn = (message: string, context?: LogContext) =>
  logger.warn(message, context);

export const logInfo = (message: string, context?: LogContext) =>
  logger.info(message, context);

export const logDebug = (message: string, context?: LogContext) =>
  logger.debug(message, context);

export const logApiCall = (method: string, url: string, context?: LogContext) =>
  apiLogger.apiRequest(method, url, context);

export const logApiResponse = (method: string, url: string, status: number, duration?: number, context?: LogContext) =>
  apiLogger.apiResponse(method, url, status, duration, context);

export const logPerformance = (operation: string, duration: number, context?: LogContext) =>
  performanceLogger.performance(operation, duration, context);

export const logUserAction = (action: string, context?: LogContext) =>
  logger.userAction(action, context);

// Development-only logging helpers
export const devLog = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(message, { args });
  }
};

export const devWarn = (message: string, context?: LogContext) => {
  if (process.env.NODE_ENV === 'development') {
    logger.warn(message, context);
  }
};

export const devError = (message: string, error?: Error, context?: LogContext) => {
  if (process.env.NODE_ENV === 'development') {
    logger.error(message, error, context);
  }
};

// Default export
export default logger;
