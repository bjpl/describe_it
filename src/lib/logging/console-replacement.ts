/**
 * Console Replacement Utilities
 * Drop-in replacements for console.log/warn/error with structured logging
 *
 * Usage:
 *   import { log } from '@/lib/logging';
 *
 *   // Instead of: console.log('User logged in', userId)
 *   log.info('User logged in', { userId });
 *
 *   // Instead of: console.error('API failed', error)
 *   log.error('API failed', error);
 */

import { logger, LogContext } from '@/lib/logger';

/**
 * Drop-in console replacements with structured logging
 * These maintain console's familiar API while providing Winston's benefits
 */
export const log = {
  /**
   * Debug-level logging (development only)
   * @param message - Log message
   * @param args - Additional data to log
   */
  debug: (message: string, ...args: any[]): void => {
    const context: LogContext = args.length > 0 ? { data: args } : {};
    logger.debug(message, context);
  },

  /**
   * Info-level logging
   * @param message - Log message
   * @param args - Additional data to log
   */
  info: (message: string, ...args: any[]): void => {
    const context: LogContext = args.length > 0 ? { data: args } : {};
    logger.info(message, context);
  },

  /**
   * Warning-level logging
   * @param message - Warning message
   * @param args - Additional data to log
   */
  warn: (message: string, ...args: any[]): void => {
    const context: LogContext = args.length > 0 ? { data: args } : {};
    logger.warn(message, context);
  },

  /**
   * Error-level logging
   * @param message - Error message
   * @param errorOrContext - Error object or first context argument
   * @param args - Additional data to log
   */
  error: (message: string, errorOrContext?: Error | any, ...args: any[]): void => {
    if (errorOrContext instanceof Error) {
      const context: LogContext = args.length > 0 ? { data: args } : {};
      logger.error(message, errorOrContext, context);
    } else {
      const allArgs = errorOrContext ? [errorOrContext, ...args] : args;
      const context: LogContext = allArgs.length > 0 ? { data: allArgs } : {};
      logger.error(message, undefined, context);
    }
  },

  /**
   * Verbose logging (development only)
   * @param message - Log message
   * @param args - Additional data to log
   */
  verbose: (message: string, ...args: any[]): void => {
    const context: LogContext = args.length > 0 ? { data: args } : {};
    logger.verbose(message, context);
  },
};

/**
 * Console-compatible table logging
 * @param data - Array of objects or single object to display as table
 * @param columns - Optional column names to display
 */
export const table = (data: any, columns?: string[]): void => {
  if (process.env.NODE_ENV === 'development') {
    console.table(data, columns);
  }
  logger.debug('Table output', { table: data, columns });
};

/**
 * Console-compatible group logging
 * @param label - Group label
 */
export const group = (label: string): void => {
  if (process.env.NODE_ENV === 'development') {
    console.group(label);
  }
  logger.debug(`Group: ${label}`);
};

/**
 * Console-compatible groupEnd
 */
export const groupEnd = (): void => {
  if (process.env.NODE_ENV === 'development') {
    console.groupEnd();
  }
  logger.debug('Group end');
};

/**
 * Console-compatible time/timeEnd for performance measurement
 */
const timers = new Map<string, number>();

export const time = (label: string): void => {
  timers.set(label, Date.now());
  if (process.env.NODE_ENV === 'development') {
    console.time(label);
  }
};

export const timeEnd = (label: string): void => {
  const startTime = timers.get(label);
  if (startTime) {
    const duration = Date.now() - startTime;
    logger.performance(label, duration);
    timers.delete(label);
  }
  if (process.env.NODE_ENV === 'development') {
    console.timeEnd(label);
  }
};

/**
 * Console-compatible trace logging
 * @param message - Trace message
 * @param args - Additional data
 */
export const trace = (message: string, ...args: any[]): void => {
  const stack = new Error().stack;
  const context: LogContext = {
    data: args,
    stack,
  };
  logger.debug(`TRACE: ${message}`, context);
  if (process.env.NODE_ENV === 'development') {
    console.trace(message, ...args);
  }
};

/**
 * Console-compatible assert
 * @param condition - Condition to assert
 * @param message - Message if assertion fails
 * @param args - Additional data
 */
export const assert = (condition: boolean, message: string, ...args: any[]): void => {
  if (!condition) {
    const context: LogContext = args.length > 0 ? { data: args } : {};
    logger.error(`ASSERTION FAILED: ${message}`, undefined, context);
    if (process.env.NODE_ENV === 'development') {
      console.assert(condition, message, ...args);
    }
  }
};

/**
 * Console-compatible count/countReset
 */
const counters = new Map<string, number>();

export const count = (label: string = 'default'): void => {
  const current = counters.get(label) || 0;
  const newCount = current + 1;
  counters.set(label, newCount);
  logger.debug(`Count ${label}: ${newCount}`);
  if (process.env.NODE_ENV === 'development') {
    console.count(label);
  }
};

export const countReset = (label: string = 'default'): void => {
  counters.set(label, 0);
  if (process.env.NODE_ENV === 'development') {
    console.countReset(label);
  }
};

/**
 * Complete console replacement object
 * Use this as a drop-in replacement for console
 */
export const consoleReplacement = {
  log: log.info,
  debug: log.debug,
  info: log.info,
  warn: log.warn,
  error: log.error,
  table,
  group,
  groupEnd,
  time,
  timeEnd,
  trace,
  assert,
  count,
  countReset,
};

/**
 * Default export for convenience
 */
export default log;
