/**
 * Centralized Winston-based structured logging framework
 * Replaces console statements with proper logging
 */

import winston from 'winston';
import { NextRequest } from 'next/server';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Tell winston about our colors
winston.addColors(colors);

// Define format for development
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    ({ timestamp, level, message, context, ...metadata }) => {
      let msg = `${timestamp} [${level}]`;
      if (context) msg += ` [${context}]`;
      msg += `: ${message}`;
      if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
      }
      return msg;
    }
  )
);

// Define format for production
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports: winston.transport[] = [];

// Console transport for all environments
if (process.env.NODE_ENV !== 'test') {
  transports.push(
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    })
  );
}

// File transport for production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: prodFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: prodFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the base logger
const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  transports,
});

/**
 * Logger class with context and request tracking
 */
export class Logger {
  private context?: string;
  private requestId?: string;
  private userId?: string;
  private metadata: Record<string, any> = {};

  constructor(context?: string) {
    this.context = context;
  }

  /**
   * Set request context for tracking
   */
  setRequest(request: NextRequest | { requestId?: string; userId?: string }) {
    if ('headers' in request) {
      // NextRequest
      this.requestId = request.headers.get('x-request-id') || undefined;
      this.userId = request.headers.get('x-user-id') || undefined;
    } else {
      // Plain object
      this.requestId = request.requestId;
      this.userId = request.userId;
    }
    return this;
  }

  /**
   * Add metadata to all log entries
   */
  addMetadata(metadata: Record<string, any>) {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  /**
   * Create log entry with context
   */
  private log(level: string, message: string, meta?: Record<string, any>) {
    const logData: Record<string, any> = {
      ...this.metadata,
      ...meta,
    };

    if (this.context) logData.context = this.context;
    if (this.requestId) logData.requestId = this.requestId;
    if (this.userId) logData.userId = this.userId;

    baseLogger.log(level, message, logData);
  }

  // Standard log methods
  error(message: string, error?: Error | unknown, meta?: Record<string, any>) {
    const errorMeta: Record<string, any> = { ...meta };
    
    if (error instanceof Error) {
      errorMeta.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    } else if (error) {
      errorMeta.error = error;
    }
    
    this.log('error', message, errorMeta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }

  http(message: string, meta?: Record<string, any>) {
    this.log('http', message, meta);
  }

  debug(message: string, meta?: Record<string, any>) {
    this.log('debug', message, meta);
  }

  // Specialized logging methods

  /**
   * Log API request
   */
  apiRequest(method: string, path: string, meta?: Record<string, any>) {
    this.http(`API Request: ${method} ${path}`, {
      method,
      path,
      ...meta,
    });
  }

  /**
   * Log API response
   */
  apiResponse(status: number, duration: number, meta?: Record<string, any>) {
    const level = status >= 400 ? 'warn' : 'http';
    this.log(level, `API Response: ${status} (${duration}ms)`, {
      status,
      duration,
      ...meta,
    });
  }

  /**
   * Log security event
   */
  securityEvent(event: string, meta?: Record<string, any>) {
    this.warn(`Security Event: ${event}`, {
      securityEvent: event,
      ...meta,
    });
  }

  /**
   * Log performance metric
   */
  performance(metric: string, value: number, unit: string = 'ms', meta?: Record<string, any>) {
    this.info(`Performance: ${metric} = ${value}${unit}`, {
      metric,
      value,
      unit,
      ...meta,
    });
  }

  /**
   * Log database query
   */
  database(operation: string, table: string, duration?: number, meta?: Record<string, any>) {
    this.debug(`Database: ${operation} on ${table}`, {
      operation,
      table,
      duration,
      ...meta,
    });
  }

  /**
   * Log cache operation
   */
  cache(operation: 'hit' | 'miss' | 'set' | 'delete', key: string, meta?: Record<string, any>) {
    this.debug(`Cache ${operation}: ${key}`, {
      cacheOperation: operation,
      key,
      ...meta,
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string): Logger {
    const child = new Logger(`${this.context}:${context}`);
    child.requestId = this.requestId;
    child.userId = this.userId;
    child.metadata = { ...this.metadata };
    return child;
  }
}

// Export singleton logger instances for common contexts
export const logger = new Logger();
export const apiLogger = new Logger('API');
export const authLogger = new Logger('Auth');
export const dbLogger = new Logger('Database');
export const cacheLogger = new Logger('Cache');
export const securityLogger = new Logger('Security');
export const performanceLogger = new Logger('Performance');

// Helper function to create logger for a specific context
export function createLogger(context: string): Logger {
  return new Logger(context);
}

// Middleware to add request tracking
export function loggerMiddleware(request: NextRequest): Logger {
  const requestLogger = new Logger('Request');
  requestLogger.setRequest(request);
  return requestLogger;
}

// Export the base Winston logger for advanced use cases
export { baseLogger as winstonLogger };