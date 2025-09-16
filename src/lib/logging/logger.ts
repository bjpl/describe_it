/**
 * Centralized structured logging framework
 * Uses Winston on server, console on client
 */

import { NextRequest } from 'next/server';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

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

// Simple console logger for client-side
class SimpleLogger {
  private context: string;
  
  constructor(context: string = 'app') {
    this.context = context;
  }
  
  private formatMessage(level: string, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${safeStringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${metaStr}`;
  }
  
  error(message: string, error?: Error | any, meta?: Record<string, any>) {
    console.error(this.formatMessage('error', message, { ...meta, error: error?.message || error }));
  }
  
  warn(message: string, meta?: Record<string, any>) {
    console.warn(this.formatMessage('warn', message, meta));
  }
  
  info(message: string, meta?: Record<string, any>) {
    console.info(this.formatMessage('info', message, meta));
  }
  
  debug(message: string, meta?: Record<string, any>) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
  
  http(message: string, meta?: Record<string, any>) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('http', message, meta));
    }
  }
  
  setContext(context: string) {
    this.context = context;
    return this;
  }
  
  setRequest(meta: Record<string, any>) {
    return this; // For API compatibility
  }
}

// Server-side Winston logger
let winstonLogger: any = null;

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
        (info: any) => `${info.timestamp} ${info.level}: ${info.message}`
      )
    );
    
    // Define format for production
    const prodFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );
    
    // Create transports
    const transports: any[] = [];
    
    // Console transport for all environments
    if (process.env.NODE_ENV !== 'test') {
      transports.push(
        new winston.transports.Console({
          format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
        })
      );
    }
    
    // File transport for production (server-side only)
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
    
    // Create the Winston logger
    winstonLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      levels,
      transports,
    });
  } catch (error) {
    console.error('Failed to initialize Winston logger:', error);
  }
}

/**
 * Logger class that provides structured logging
 */
export class Logger {
  private context: string;
  private logger: any;
  private requestMeta: Record<string, any> = {};

  constructor(context: string = 'app') {
    this.context = context;
    this.logger = winstonLogger || new SimpleLogger(context);
  }

  /**
   * Set request-specific metadata
   */
  setRequest(meta: Record<string, any>) {
    this.requestMeta = meta;
    return this;
  }

  /**
   * Log an error
   */
  error(message: string, error?: Error | any, meta?: Record<string, any>) {
    const logData = {
      context: this.context,
      ...this.requestMeta,
      ...meta,
      error: error ? {
        message: error.message || error,
        stack: error.stack,
        name: error.name,
      } : undefined,
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
  warn(message: string, meta?: Record<string, any>) {
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
  info(message: string, meta?: Record<string, any>) {
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
  debug(message: string, meta?: Record<string, any>) {
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
  http(message: string, meta?: Record<string, any>) {
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