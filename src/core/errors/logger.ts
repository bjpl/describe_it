/**
 * Error logging utility with context tracking
 * Provides structured logging for errors with additional context
 */

import { AppError, isAppError } from './index';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  error?: {
    name: string;
    message: string;
    code?: string;
    statusCode?: number;
    stack?: string;
    details?: unknown;
  };
  context?: ErrorContext;
  timestamp: string;
}

class ErrorLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Logs an error with context
   */
  error(error: unknown, context?: ErrorContext): void {
    const logEntry = this.createLogEntry('error', error, context);
    this.write(logEntry);
  }

  /**
   * Logs a warning
   */
  warn(message: string, context?: ErrorContext): void {
    const logEntry: LogEntry = {
      level: 'warn',
      message,
      context,
      timestamp: new Date().toISOString(),
    };
    this.write(logEntry);
  }

  /**
   * Logs an info message
   */
  info(message: string, context?: ErrorContext): void {
    const logEntry: LogEntry = {
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString(),
    };
    this.write(logEntry);
  }

  /**
   * Logs a debug message (only in development)
   */
  debug(message: string, context?: ErrorContext): void {
    if (!this.isDevelopment) return;

    const logEntry: LogEntry = {
      level: 'debug',
      message,
      context,
      timestamp: new Date().toISOString(),
    };
    this.write(logEntry);
  }

  /**
   * Logs a fatal error (critical errors that require immediate attention)
   */
  fatal(error: unknown, context?: ErrorContext): void {
    const logEntry = this.createLogEntry('fatal', error, context);
    this.write(logEntry);
  }

  /**
   * Creates a structured log entry from an error
   */
  private createLogEntry(
    level: LogLevel,
    error: unknown,
    context?: ErrorContext
  ): LogEntry {
    let errorInfo: LogEntry['error'];
    let message: string;

    if (isAppError(error)) {
      message = error.message;
      errorInfo = {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: this.isDevelopment ? error.stack : undefined,
        details: error.details,
      };
    } else if (error instanceof Error) {
      message = error.message;
      errorInfo = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      };
    } else {
      message = 'Unknown error occurred';
      errorInfo = {
        name: 'UnknownError',
        message: String(error),
      };
    }

    return {
      level,
      message,
      error: errorInfo,
      context,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Writes log entry to appropriate output
   */
  private write(entry: LogEntry): void {
    if (this.isDevelopment) {
      this.writeToConsole(entry);
    } else {
      this.writeToJson(entry);
    }

    // In production, you might also want to send to external logging service
    if (this.isProduction && entry.level === 'error' || entry.level === 'fatal') {
      this.sendToExternalService(entry);
    }
  }

  /**
   * Writes formatted log to console (development)
   */
  private writeToConsole(entry: LogEntry): void {
    const color = this.getLevelColor(entry.level);
    const reset = '\x1b[0m';

    console.error(
      `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} - ${entry.message}`
    );

    if (entry.error) {
      console.error('Error Details:', {
        name: entry.error.name,
        code: entry.error.code,
        statusCode: entry.error.statusCode,
        details: entry.error.details,
      });

      if (entry.error.stack) {
        console.error('Stack Trace:', entry.error.stack);
      }
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      console.error('Context:', entry.context);
    }

    console.error('---');
  }

  /**
   * Writes JSON log (production)
   */
  private writeToJson(entry: LogEntry): void {
    console.error(JSON.stringify(entry));
  }

  /**
   * Gets ANSI color code for log level
   */
  private getLevelColor(level: LogLevel): string {
    const colors = {
      debug: '\x1b[36m',  // Cyan
      info: '\x1b[32m',   // Green
      warn: '\x1b[33m',   // Yellow
      error: '\x1b[31m',  // Red
      fatal: '\x1b[35m',  // Magenta
    };
    return colors[level];
  }

  /**
   * Sends critical errors to external logging service
   * This is a placeholder - implement with your actual logging service
   */
  private sendToExternalService(entry: LogEntry): void {
    // TODO: Implement integration with logging service (e.g., Sentry, DataDog, etc.)
    // Example:
    // Sentry.captureException(entry.error, {
    //   level: entry.level,
    //   contexts: { custom: entry.context }
    // });
  }
}

// Export singleton instance
export const logger = new ErrorLogger();

/**
 * Decorates a function with error logging
 */
export function withErrorLogging<T extends (...args: any[]) => any>(
  fn: T,
  context?: Partial<ErrorContext>
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);

      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          logger.error(error, context);
          throw error;
        });
      }

      return result;
    } catch (error) {
      logger.error(error, context);
      throw error;
    }
  }) as T;
}
