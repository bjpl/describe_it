/**
 * Logger Helper Functions
 * Provides common logging patterns and utilities for application-wide use
 */

import { createLogger, LogContext } from '@/lib/logger';

/**
 * Create a scoped logger for a specific component or module
 * This allows for better log filtering and organization
 *
 * @param component - Component name (e.g., 'AuthService', 'UserDashboard')
 * @returns Logger instance scoped to the component
 *
 * @example
 * const logger = createScopedLogger('UserService');
 * logger.info('User created', { userId: '123' });
 * // Output: [INFO] [UserService]: User created { userId: '123' }
 */
export function createScopedLogger(component: string) {
  return createLogger(component);
}

/**
 * Create a logger for API routes
 * Includes automatic request context tracking
 *
 * @param routeName - API route name (e.g., 'auth/signin', 'users/create')
 * @returns Scoped logger for the API route
 *
 * @example
 * const logger = createApiLogger('auth/signin');
 * logger.apiRequest('POST', '/api/auth/signin');
 */
export function createApiLogger(routeName: string) {
  return createLogger(`api/${routeName}`);
}

/**
 * Create a logger for React components
 * Optimized for component lifecycle logging
 *
 * @param componentName - React component name
 * @returns Scoped logger for the component
 *
 * @example
 * const logger = createComponentLogger('UserProfile');
 * logger.componentLifecycle('UserProfile', 'mount');
 */
export function createComponentLogger(componentName: string) {
  return createLogger(`component/${componentName}`);
}

/**
 * Wrap a function with automatic logging
 * Logs function entry, exit, errors, and performance
 *
 * @param fn - Function to wrap
 * @param fnName - Name of the function for logging
 * @param context - Additional context to include in logs
 * @returns Wrapped function with logging
 *
 * @example
 * const fetchUser = withLogging(
 *   async (userId: string) => { ... },
 *   'fetchUser',
 *   { component: 'UserService' }
 * );
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withLogging<T extends (...args: unknown[]) => unknown>(
  fn: T,
  fnName: string,
  context?: LogContext
): T {
  const logger = createLogger(fnName);

  return ((...args: unknown[]) => {
    const startTime = Date.now();
    const callContext = {
      ...context,
      args: args.length > 0 ? args : undefined,
    };

    logger.debug(`Entering ${fnName}`, callContext);

    try {
      const result = fn(...args);

      // Handle promises
      if (result instanceof Promise) {
        return result
          .then((value) => {
            const duration = Date.now() - startTime;
            logger.performance(fnName, duration, callContext);
            logger.debug(`Exiting ${fnName}`, { ...callContext, success: true });
            return value;
          })
          .catch((error) => {
            const duration = Date.now() - startTime;
            logger.error(`Error in ${fnName}`, error, {
              ...callContext,
              duration,
            });
            throw error;
          });
      }

      // Handle synchronous functions
      const duration = Date.now() - startTime;
      logger.performance(fnName, duration, callContext);
      logger.debug(`Exiting ${fnName}`, { ...callContext, success: true });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Error in ${fnName}`, error as Error, {
        ...callContext,
        duration,
      });
      throw error;
    }
  }) as T;
}

/**
 * Log performance of a function call
 * Measures execution time and logs warnings for slow operations
 *
 * @param label - Label for the operation
 * @param fn - Function to measure
 * @param warningThreshold - Threshold in ms to log warnings (default: 1000ms)
 * @param context - Additional context
 * @returns Result of the function
 *
 * @example
 * const users = await logPerformance(
 *   'fetchUsers',
 *   () => database.users.findMany(),
 *   500 // warn if > 500ms
 * );
 */
export async function logPerformance<T>(
  label: string,
  fn: () => T | Promise<T>,
  warningThreshold: number = 1000,
  context?: LogContext
): Promise<T> {
  const logger = createLogger('performance');
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    if (duration > warningThreshold) {
      logger.warn(`Slow operation: ${label} took ${duration}ms`, {
        ...context,
        duration,
        threshold: warningThreshold,
        slow: true,
      });
    } else {
      logger.debug(`${label} completed in ${duration}ms`, {
        ...context,
        duration,
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`${label} failed after ${duration}ms`, error as Error, {
      ...context,
      duration,
    });
    throw error;
  }
}

/**
 * Create a logger with automatic error boundary
 * Catches and logs errors without throwing
 *
 * @param fn - Function to execute
 * @param fallback - Fallback value if function fails
 * @param context - Additional context
 * @returns Result or fallback value
 *
 * @example
 * const config = await withErrorBoundary(
 *   () => loadConfig(),
 *   defaultConfig,
 *   { component: 'ConfigLoader' }
 * );
 */
export async function withErrorBoundary<T>(
  fn: () => T | Promise<T>,
  fallback: T,
  context?: LogContext
): Promise<T> {
  const logger = createLogger('error-boundary');

  try {
    return await fn();
  } catch (error) {
    logger.error('Error caught by boundary', error as Error, context);
    return fallback;
  }
}

/**
 * Log and track user actions
 * Useful for analytics and debugging user flows
 *
 * @param action - User action description
 * @param userId - User ID
 * @param metadata - Additional metadata
 *
 * @example
 * trackUserAction('clicked_signup_button', user.id, {
 *   page: 'landing',
 *   timestamp: Date.now()
 * });
 */
export function trackUserAction(
  action: string,
  userId: string,
  metadata?: Record<string, any>
): void {
  const logger = createLogger('user-actions');
  logger.userAction(action, {
    userId,
    ...metadata,
  });
}

/**
 * Log API requests with automatic formatting
 * Includes request/response tracking and performance metrics
 *
 * @param method - HTTP method
 * @param url - Request URL
 * @param options - Additional options
 * @returns Request logger
 *
 * @example
 * const reqLogger = createRequestLogger('POST', '/api/users');
 * reqLogger.start({ body: userData });
 * // ... make request ...
 * reqLogger.end(201, { userId: newUser.id });
 */
export function createRequestLogger(method: string, url: string) {
  const logger = createLogger('http');
  const startTime = Date.now();
  let requestId: string;

  return {
    start(context?: LogContext) {
      requestId = logger.generateRequestId();
      logger.apiRequest(method, url, { ...context, requestId });
    },

    end(statusCode: number, context?: LogContext) {
      const duration = Date.now() - startTime;
      logger.apiResponse(method, url, statusCode, duration, {
        ...context,
        requestId,
      });
    },

    error(error: Error, context?: LogContext) {
      const duration = Date.now() - startTime;
      logger.error(`Request failed: ${method} ${url}`, error, {
        ...context,
        requestId,
        duration,
      });
    },
  };
}

/**
 * Batch log multiple related operations
 * Useful for logging complex workflows
 *
 * @param batchName - Name of the batch operation
 * @param operations - Array of operations to log
 * @param context - Additional context
 *
 * @example
 * await batchLog('user-registration', [
 *   { name: 'validate-email', fn: () => validateEmail(email) },
 *   { name: 'create-user', fn: () => createUser(data) },
 *   { name: 'send-welcome', fn: () => sendWelcomeEmail(user) }
 * ]);
 */
export async function batchLog(
  batchName: string,
  operations: Array<{ name: string; fn: () => any | Promise<any> }>,
  context?: LogContext
): Promise<void> {
  const logger = createLogger('batch');
  const batchId = `batch_${Date.now()}`;
  const startTime = Date.now();

  logger.info(`Starting batch: ${batchName}`, {
    ...context,
    batchId,
    operationCount: operations.length,
  });

  const results: Array<{ name: string; success: boolean; duration: number }> = [];
  const errors: Array<{ name: string; error: Error; duration: number }> = [];

  for (const { name, fn } of operations) {
    const opStartTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - opStartTime;
      logger.debug(`Batch operation completed: ${name}`, {
        ...context,
        batchId,
        batchName,
        operationName: name,
        duration,
      });
      results.push({ name, success: true, duration });
    } catch (error) {
      const duration = Date.now() - opStartTime;
      logger.error(`Batch operation failed: ${name}`, error as Error, {
        ...context,
        batchId,
        batchName,
        operationName: name,
        duration,
      });
      errors.push({ name, error: error as Error, duration });
    }
  }

  const totalDuration = Date.now() - startTime;
  const successCount = results.length;
  const failureCount = errors.length;

  logger.info(`Batch completed: ${batchName}`, {
    ...context,
    batchId,
    totalDuration,
    successCount,
    failureCount,
    totalOperations: operations.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}

/**
 * Create a logger for database operations
 * Includes query performance tracking
 *
 * @param operation - Database operation type (e.g., 'select', 'insert')
 * @param table - Database table name
 * @returns Database operation logger
 *
 * @example
 * const dbLogger = createDatabaseLogger('select', 'users');
 * dbLogger.start({ query: 'SELECT * FROM users WHERE id = ?' });
 * // ... execute query ...
 * dbLogger.end(5); // 5ms duration
 */
export function createDatabaseLogger(operation: string, table: string) {
  const logger = createLogger('database');
  const startTime = Date.now();

  return {
    start(context?: LogContext) {
      logger.debug(`DB ${operation} on ${table}`, context);
    },

    end(rowCount?: number, context?: LogContext) {
      const duration = Date.now() - startTime;
      logger.database(`${operation} ${table}`, duration, {
        ...context,
        rowCount,
      });
    },

    error(error: Error, context?: LogContext) {
      const duration = Date.now() - startTime;
      logger.error(`DB ${operation} failed on ${table}`, error, {
        ...context,
        duration,
      });
    },
  };
}

/**
 * Development-only logging utility
 * Automatically disabled in production
 *
 * @param message - Log message
 * @param data - Additional data
 *
 * @example
 * devOnly('Debug info', { state, props });
 * // Only logs in development
 */
export function devOnly(message: string, data?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    const logger = createLogger('dev');
    logger.debug(message, data);
  }
}

/**
 * Test-safe logging
 * Automatically disabled in test environment
 *
 * @param message - Log message
 * @param context - Additional context
 *
 * @example
 * testSafeLog('Operation completed', { result });
 * // Only logs outside test environment
 */
export function testSafeLog(message: string, context?: LogContext): void {
  if (process.env.NODE_ENV !== 'test') {
    const logger = createLogger('app');
    logger.info(message, context);
  }
}
