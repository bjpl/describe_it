/* eslint-disable no-console, custom-rules/require-logger */
/**
 * Centralized structured logging framework
 * Uses Winston on server, console on client
 *
 * NOTE: This file must NOT import from @/lib/logger to avoid circular dependencies
 * Console usage is intentional here - this IS the logger infrastructure
 */

import { NextRequest } from 'next/server';
import { safeStringify } from '@/lib/utils/json-safe';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

// Simple console logger for client-side (uses console directly, no imports)
class SimpleLogger {
  private context: string;

  constructor(context: string = 'app') {
    this.context = context;
  }

  private formatMessage(level: string, message: string, meta?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${safeStringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${metaStr}`;
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    const errorMessage = error instanceof Error ? error.message : error ? String(error) : undefined;
    console.error(this.formatMessage('error', message, { ...meta, error: errorMessage }));
  }

  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(this.formatMessage('warn', message, meta));
  }

  info(message: string, meta?: Record<string, unknown>) {
    console.info(this.formatMessage('info', message, meta));
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('debug', message, meta));
    }
  }

  http(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('http', message, meta));
    }
  }

  setContext(context: string) {
    this.context = context;
    return this;
  }

  setRequest(meta: Record<string, unknown>) {
    return this; // For API compatibility
  }
}

// Server-side Winston logger
let winstonLogger: ReturnType<typeof import('winston').createLogger> | null = null;

if (typeof window === 'undefined') {
  try {
    const winston = require('winston');

    // Define custom colors
    const colors = {
      error: 'red',
      warn: 'yellow',
      info: 'green',
      http: 'magenta',
      verbose: 'cyan',
      debug: 'white',
      silly: 'grey',
    };

    winston.addColors(colors);

    // Define format for development
    const devFormat = winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(
        (info: Record<string, unknown>) => `${info.timestamp} ${info.level}: ${info.message}`
      )
    );

    // Define format for production
    const prodFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // Create transports
    const transports: Array<InstanceType<typeof winston.transports.Console>> = [];

    // Console transport for all environments
    // NOTE: File transports removed - Vercel serverless has read-only filesystem
    if (process.env.NODE_ENV !== 'test') {
      transports.push(
        new winston.transports.Console({
          format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
        })
      );
    }

    // Create the Winston logger
    winstonLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      levels,
      transports,
    });
  } catch (error) {
    // Use console directly to avoid circular dependency
    console.error('Failed to initialize Winston logger:', error);
  }
}

/**
 * Logger class that provides structured logging
 */
export class Logger {
  private context: string;
  private logger: ReturnType<typeof import('winston').createLogger> | SimpleLogger;
  private requestMeta: Record<string, unknown> = {};

  constructor(context: string = 'app') {
    this.context = context;
    this.logger = winstonLogger || new SimpleLogger(context);
  }

  /**
   * Set request-specific metadata
   */
  setRequest(meta: Record<string, unknown>) {
    this.requestMeta = meta;
    return this;
  }

  /**
   * Log an error
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    const errorDetails =
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : error
          ? { message: String(error) }
          : undefined;

    const logData = {
      context: this.context,
      ...this.requestMeta,
      ...meta,
      error: errorDetails,
    };

    if (winstonLogger) {
      winstonLogger.error(message, logData);
    } else {
      this.logger.error(message, error, logData);
    }
  }

  /**
   * Log a warning
   */
  warn(message: string, meta?: Record<string, unknown>) {
    const logData = {
      context: this.context,
      ...this.requestMeta,
      ...meta,
    };

    if (winstonLogger) {
      winstonLogger.warn(message, logData);
    } else {
      this.logger.warn(message, logData);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, meta?: Record<string, unknown>) {
    const logData = {
      context: this.context,
      ...this.requestMeta,
      ...meta,
    };

    if (winstonLogger) {
      winstonLogger.info(message, logData);
    } else {
      this.logger.info(message, logData);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, meta?: Record<string, unknown>) {
    const logData = {
      context: this.context,
      ...this.requestMeta,
      ...meta,
    };

    if (winstonLogger) {
      winstonLogger.debug(message, logData);
    } else {
      this.logger.debug(message, logData);
    }
  }

  /**
   * Log an HTTP request
   */
  http(message: string, meta?: Record<string, unknown>) {
    const logData = {
      context: this.context,
      ...this.requestMeta,
      ...meta,
    };

    if (winstonLogger) {
      winstonLogger.http(message, logData);
    } else {
      this.logger.http(message, logData);
    }
  }

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
  apiResponse(statusCode: number, duration: number, meta?: Record<string, any>) {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this[level](`API Response: ${statusCode}`, {
      statusCode,
      duration,
      ...meta,
    });
  }

  /**
   * Log security event
   */
  securityEvent(event: string, meta?: Record<string, any>) {
    this.warn(`Security Event: ${event}`, {
      event,
      ...meta,
    });
  }

  /**
   * Log performance metric
   */
  performance(metric: string, value: number, meta?: Record<string, any>) {
    this.info(`Performance: ${metric}`, {
      metric,
      value,
      ...meta,
    });
  }
}

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Create a logger with context from a request
 */
export function createContextLogger(context: string, request?: NextRequest): Logger {
  const logger = new Logger(context);

  if (request) {
    logger.setRequest({
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });
  }

  return logger;
}

// Export specialized loggers
export const apiLogger = createLogger('api');
export const authLogger = createLogger('auth');
export const dbLogger = createLogger('database');
export const securityLogger = createLogger('security');
export const performanceLogger = createLogger('performance');

// Default export
export default createLogger('app');
