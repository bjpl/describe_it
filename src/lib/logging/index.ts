/**
 * Logging Utilities - Centralized Exports
 *
 * This module provides comprehensive logging utilities including:
 * - Console replacements for easy migration from console.log
 * - Logger helpers for advanced patterns
 * - Session logging and reporting
 * - Structured logging with Winston integration
 *
 * @module logging
 */

// =====================
// Console Replacements
// =====================
// Drop-in replacements for console.log/warn/error
export {
  log,
  table,
  group,
  groupEnd,
  time,
  timeEnd,
  trace,
  assert,
  count,
  countReset,
  consoleReplacement,
} from './console-replacement';

// =====================
// Logger Helpers
// =====================
// Advanced logging patterns and utilities
export {
  createScopedLogger,
  createApiLogger,
  createComponentLogger,
  withLogging,
  logPerformance,
  withErrorBoundary,
  trackUserAction,
  createRequestLogger,
  batchLog,
  createDatabaseLogger,
  devOnly,
  testSafeLog,
} from './logger-helpers';

// =====================
// Session Logging
// =====================
// Session-specific logging and reporting
export {
  SessionLogger,
  getSessionLogger,
  createSessionLogger,
} from "./sessionLogger";
export {
  SessionReportGenerator,
  createReportGenerator,
} from "./sessionReportGenerator";
export {
  SessionPersistence,
  createSessionPersistence,
} from "./sessionPersistence";

// =====================
// Core Logger Exports
// =====================
// Re-export core logger types and instances
export {
  logger,
  apiLogger,
  authLogger,
  dbLogger,
  securityLogger,
  performanceLogger,
  createLogger,
  createRequestLogger as createRequestLoggerBase,
  logError,
  logWarn,
  logInfo,
  logDebug,
  logApiCall,
  logApiResponse,
  logPerformance as logPerformanceMetric,
  logUserAction,
  devLog,
  devWarn,
  devError,
} from '@/lib/logger';

// =====================
// Type Exports
// =====================
// Re-export types for convenience
export type { LogContext, LogLevel } from '@/lib/logger';
export * from "@/types/session";

/**
 * Quick Start Examples:
 *
 * 1. Simple logging (console replacement):
 *    import { log } from '@/lib/logging';
 *    log.info('User logged in', { userId });
 *
 * 2. Component logging:
 *    const logger = createComponentLogger('UserProfile');
 *    logger.componentLifecycle('UserProfile', 'mount');
 *
 * 3. API logging:
 *    const logger = createApiLogger('auth/signin');
 *    logger.apiRequest('POST', '/api/auth/signin');
 *
 * 4. Performance logging:
 *    await logPerformance('fetchUsers', () => db.users.findMany());
 *
 * 5. Function wrapping:
 *    const fetchUser = withLogging(
 *      async (id) => db.user.findUnique({ where: { id } }),
 *      'fetchUser'
 *    );
 *
 * 6. Session logging:
 *    const sessionLogger = createSessionLogger('user-session-123');
 *    sessionLogger.logEvent('action', { type: 'click' });
 */

/**
 * Migration Guide (Console to Structured Logging):
 *
 * Before:
 *   console.log('User action', data);
 *   console.error('Failed to save', error);
 *   console.warn('Slow query');
 *
 * After:
 *   import { log } from '@/lib/logging';
 *   log.info('User action', data);
 *   log.error('Failed to save', error);
 *   log.warn('Slow query');
 *
 * Benefits:
 * - Structured logging with metadata
 * - Automatic performance tracking
 * - Environment-aware log levels
 * - External monitoring integration
 * - Type-safe logging contexts
 * - Better debugging with request tracing
 */
