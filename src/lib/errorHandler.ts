/**
 * Comprehensive Error Handling System
 * Centralized error management with categorization, performance monitoring, and integration
 * with existing logging infrastructure
 */

import { logger, LogContext } from './logger';

// Error Categories
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  API = 'api',
  DATABASE = 'database',
  FILE_SYSTEM = 'filesystem',
  EXTERNAL_SERVICE = 'external_service',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  UI_COMPONENT = 'ui_component',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

// Error Severity Levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error Recovery Strategies
export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  IGNORE = 'ignore',
  REDIRECT = 'redirect',
  REFRESH = 'refresh',
  LOGOUT = 'logout',
  NONE = 'none'
}

// Extended Error Interface
export interface AppError extends Error {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoveryStrategy: RecoveryStrategy;
  context?: LogContext;
  userMessage?: string;
  recoverable: boolean;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  component?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

// Error Handler Configuration
export interface ErrorHandlerConfig {
  enableReporting: boolean;
  enablePerformanceTracking: boolean;
  maxErrorsPerSession: number;
  retryAttempts: number;
  retryDelay: number;
  enableNotifications: boolean;
  enableLocalStorage: boolean;
  enableConsoleLogging: boolean;
  productionMode: boolean;
}

// Performance Metrics
export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  errorCount: number;
  context?: LogContext;
}

// Error Reporter Interface
export interface ErrorReporter {
  report(error: AppError): Promise<void>;
  reportBatch(errors: AppError[]): Promise<void>;
}

// Default Configuration
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableReporting: true,
  enablePerformanceTracking: true,
  maxErrorsPerSession: 100,
  retryAttempts: 3,
  retryDelay: 1000,
  enableNotifications: true,
  enableLocalStorage: true,
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  productionMode: process.env.NODE_ENV === 'production'
};

// Error Handler Class
export class ErrorHandler {
  private config: ErrorHandlerConfig;
  private errorCount = 0;
  private sessionErrors: AppError[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private reporters: ErrorReporter[] = [];
  private isClient: boolean;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isClient = typeof window !== 'undefined';
    this.initializeErrorTracking();
  }

  private initializeErrorTracking() {
    if (this.isClient) {
      // Track unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleUnhandledRejection(event);
      });

      // Track global errors
      window.addEventListener('error', (event) => {
        this.handleGlobalError(event);
      });

      // Performance observer for performance issues
      if ('PerformanceObserver' in window && this.config.enablePerformanceTracking) {
        this.initializePerformanceMonitoring();
      }
    }
  }

  private initializePerformanceMonitoring() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.trackPerformance({
            operation: entry.name,
            startTime: entry.startTime,
            endTime: entry.startTime + entry.duration,
            duration: entry.duration,
            success: true,
            errorCount: 0
          });
        }
      });
      observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
    } catch (error) {
      logger.warn('Failed to initialize performance monitoring', { error });
    }
  }

  // Create Error with full context
  createError(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    recovery: RecoveryStrategy = RecoveryStrategy.NONE,
    context?: LogContext,
    originalError?: Error
  ): AppError {
    const error = new Error(message) as AppError;
    
    error.id = this.generateErrorId();
    error.category = category;
    error.severity = severity;
    error.recoveryStrategy = recovery;
    error.context = context;
    error.recoverable = recovery !== RecoveryStrategy.NONE;
    error.timestamp = new Date();
    error.userMessage = this.generateUserFriendlyMessage(category, message);
    
    if (originalError) {
      error.stack = originalError.stack;
      error.cause = originalError;
    }

    return error;
  }

  // Handle different types of errors
  async handleError(error: Error | AppError, context?: LogContext): Promise<AppError> {
    const appError = this.normalizeError(error, context);
    
    // Increment error count and check limits
    this.errorCount++;
    if (this.errorCount > this.config.maxErrorsPerSession) {
      logger.warn('Error limit reached for session', { errorCount: this.errorCount });
    }

    // Add to session errors
    this.sessionErrors.push(appError);

    // Log the error
    this.logError(appError);

    // Report to external services
    if (this.config.enableReporting) {
      await this.reportError(appError);
    }

    // Store locally if enabled
    if (this.config.enableLocalStorage && this.isClient) {
      this.storeErrorLocally(appError);
    }

    // Attempt recovery
    await this.attemptRecovery(appError);

    return appError;
  }

  // Normalize any error to AppError
  private normalizeError(error: Error | AppError, context?: LogContext): AppError {
    if (this.isAppError(error)) {
      return error;
    }

    const category = this.categorizeError(error);
    const severity = this.assessSeverity(error, category);
    const recovery = this.determineRecoveryStrategy(category, severity);

    return this.createError(
      error.message,
      category,
      severity,
      recovery,
      { ...context, originalStack: error.stack },
      error
    );
  }

  private isAppError(error: Error): error is AppError {
    return 'category' in error && 'severity' in error;
  }

  // Categorize errors automatically
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('api') || message.includes('http')) {
      return ErrorCategory.API;
    }
    if (message.includes('database') || message.includes('sql')) {
      return ErrorCategory.DATABASE;
    }
    if (stack.includes('react') || stack.includes('component')) {
      return ErrorCategory.UI_COMPONENT;
    }
    if (message.includes('permission') || message.includes('access')) {
      return ErrorCategory.AUTHORIZATION;
    }

    return ErrorCategory.UNKNOWN;
  }

  // Assess error severity
  private assessSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    if (category === ErrorCategory.SECURITY || message.includes('critical')) {
      return ErrorSeverity.CRITICAL;
    }
    if (category === ErrorCategory.AUTHENTICATION || category === ErrorCategory.DATABASE) {
      return ErrorSeverity.HIGH;
    }
    if (category === ErrorCategory.API || category === ErrorCategory.NETWORK) {
      return ErrorSeverity.MEDIUM;
    }
    
    return ErrorSeverity.LOW;
  }

  // Determine recovery strategy
  private determineRecoveryStrategy(category: ErrorCategory, severity: ErrorSeverity): RecoveryStrategy {
    if (category === ErrorCategory.NETWORK || category === ErrorCategory.API) {
      return RecoveryStrategy.RETRY;
    }
    if (category === ErrorCategory.AUTHENTICATION) {
      return RecoveryStrategy.LOGOUT;
    }
    if (category === ErrorCategory.UI_COMPONENT) {
      return RecoveryStrategy.REFRESH;
    }
    if (severity === ErrorSeverity.CRITICAL) {
      return RecoveryStrategy.REFRESH;
    }
    
    return RecoveryStrategy.NONE;
  }

  // Generate user-friendly messages
  private generateUserFriendlyMessage(category: ErrorCategory, message: string): string {
    const userMessages = {
      [ErrorCategory.NETWORK]: 'Connection problem. Please check your internet connection and try again.',
      [ErrorCategory.API]: 'Service temporarily unavailable. Please try again in a few moments.',
      [ErrorCategory.AUTHENTICATION]: 'Session expired. Please log in again.',
      [ErrorCategory.AUTHORIZATION]: 'You don\'t have permission to perform this action.',
      [ErrorCategory.VALIDATION]: 'Please check your input and try again.',
      [ErrorCategory.DATABASE]: 'Unable to save changes right now. Please try again.',
      [ErrorCategory.FILE_SYSTEM]: 'Unable to access file system. Please try again.',
      [ErrorCategory.EXTERNAL_SERVICE]: 'External service is unavailable. Please try again later.',
      [ErrorCategory.PERFORMANCE]: 'The operation is taking longer than expected.',
      [ErrorCategory.SECURITY]: 'Security issue detected. Please refresh and try again.',
      [ErrorCategory.UI_COMPONENT]: 'Something went wrong with the interface. Refreshing might help.',
      [ErrorCategory.BUSINESS_LOGIC]: 'A processing error occurred. Please contact support.',
      [ErrorCategory.SYSTEM]: 'A system error occurred. Please try again.',
      [ErrorCategory.UNKNOWN]: 'An unexpected error occurred. Please try again.'
    };

    return userMessages[category] || 'Something went wrong. Please try again.';
  }

  // Log errors using existing logger
  private logError(error: AppError) {
    const logContext = {
      ...error.context,
      errorId: error.id,
      category: error.category,
      severity: error.severity,
      recovery: error.recoveryStrategy,
      timestamp: error.timestamp.toISOString(),
      component: error.component,
      operation: error.operation,
      userId: error.userId,
      sessionId: error.sessionId
    };

    logger.error(error.message, error, logContext);
  }

  // Report to external services
  private async reportError(error: AppError) {
    for (const reporter of this.reporters) {
      try {
        await reporter.report(error);
      } catch (reportingError) {
        logger.warn('Failed to report error', { originalError: error.id, reportingError });
      }
    }
  }

  // Store error locally
  private storeErrorLocally(error: AppError) {
    try {
      const key = `app-error-${error.timestamp.getTime()}`;
      const errorData = {
        id: error.id,
        message: error.message,
        category: error.category,
        severity: error.severity,
        timestamp: error.timestamp.toISOString(),
        context: error.context
      };
      localStorage.setItem(key, JSON.stringify(errorData));
      
      // Clean up old errors (keep last 50)
      this.cleanupLocalErrors();
    } catch (storageError) {
      logger.warn('Failed to store error locally', { error: storageError });
    }
  }

  private cleanupLocalErrors() {
    try {
      const errorKeys = Object.keys(localStorage).filter(key => key.startsWith('app-error-'));
      if (errorKeys.length > 50) {
        errorKeys.sort().slice(0, errorKeys.length - 50).forEach(key => {
          localStorage.removeItem(key);
        });
      }
    } catch (error) {
      logger.warn('Failed to cleanup local errors', { error });
    }
  }

  // Attempt error recovery
  private async attemptRecovery(error: AppError): Promise<boolean> {
    if (!error.recoverable) {
      return false;
    }

    try {
      switch (error.recoveryStrategy) {
        case RecoveryStrategy.RETRY:
          return await this.retryOperation(error);
        case RecoveryStrategy.FALLBACK:
          return this.useFallback(error);
        case RecoveryStrategy.REFRESH:
          if (this.isClient) {
            window.location.reload();
          }
          return true;
        case RecoveryStrategy.REDIRECT:
          return this.redirectUser(error);
        case RecoveryStrategy.LOGOUT:
          return this.logoutUser(error);
        default:
          return false;
      }
    } catch (recoveryError) {
      logger.error('Recovery attempt failed', recoveryError as Error, { originalError: error.id });
      return false;
    }
  }

  private async retryOperation(error: AppError): Promise<boolean> {
    // Implementation would depend on the specific operation
    // This is a placeholder for retry logic
    logger.info('Attempting retry for operation', { errorId: error.id });
    return false;
  }

  private useFallback(error: AppError): boolean {
    logger.info('Using fallback for operation', { errorId: error.id });
    return true;
  }

  private redirectUser(error: AppError): boolean {
    if (this.isClient) {
      window.location.href = '/error';
    }
    return true;
  }

  private logoutUser(error: AppError): boolean {
    if (this.isClient) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
    return true;
  }

  // Handle unhandled promise rejections
  private handleUnhandledRejection(event: PromiseRejectionEvent) {
    const error = this.createError(
      `Unhandled Promise Rejection: ${event.reason}`,
      ErrorCategory.SYSTEM,
      ErrorSeverity.HIGH,
      RecoveryStrategy.NONE,
      { type: 'unhandled-rejection', reason: event.reason }
    );
    
    this.handleError(error);
    event.preventDefault();
  }

  // Handle global errors
  private handleGlobalError(event: ErrorEvent) {
    const error = this.createError(
      event.message || 'Global error occurred',
      ErrorCategory.SYSTEM,
      ErrorSeverity.HIGH,
      RecoveryStrategy.REFRESH,
      {
        type: 'global-error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    );
    
    this.handleError(error);
  }

  // Performance tracking
  trackPerformance(metrics: PerformanceMetrics) {
    this.performanceMetrics.push(metrics);
    
    // Log slow operations
    if (metrics.duration > 3000) {
      const error = this.createError(
        `Slow operation detected: ${metrics.operation}`,
        ErrorCategory.PERFORMANCE,
        ErrorSeverity.MEDIUM,
        RecoveryStrategy.NONE,
        { ...metrics.context, duration: metrics.duration, operation: metrics.operation }
      );
      this.handleError(error);
    }

    logger.performance(metrics.operation, metrics.duration, metrics.context);
  }

  // Add error reporter
  addReporter(reporter: ErrorReporter) {
    this.reporters.push(reporter);
  }

  // Generate unique error ID
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get error statistics
  getErrorStats() {
    const categoryStats = this.sessionErrors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const severityStats = this.sessionErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    return {
      totalErrors: this.errorCount,
      sessionErrors: this.sessionErrors.length,
      categoryBreakdown: categoryStats,
      severityBreakdown: severityStats,
      averagePerformance: this.calculateAveragePerformance(),
      recentErrors: this.sessionErrors.slice(-10)
    };
  }

  private calculateAveragePerformance() {
    if (this.performanceMetrics.length === 0) return 0;
    const total = this.performanceMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / this.performanceMetrics.length;
  }

  // Clear session data
  clearSession() {
    this.sessionErrors = [];
    this.performanceMetrics = [];
    this.errorCount = 0;
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Utility functions for common error scenarios
export const handleApiError = async (error: Error, operation: string, context?: LogContext) => {
  const apiError = errorHandler.createError(
    error.message,
    ErrorCategory.API,
    ErrorSeverity.MEDIUM,
    RecoveryStrategy.RETRY,
    { ...context, operation }
  );
  return await errorHandler.handleError(apiError);
};

export const handleValidationError = async (message: string, context?: LogContext) => {
  const validationError = errorHandler.createError(
    message,
    ErrorCategory.VALIDATION,
    ErrorSeverity.LOW,
    RecoveryStrategy.NONE,
    context
  );
  return await errorHandler.handleError(validationError);
};

export const handleNetworkError = async (error: Error, context?: LogContext) => {
  const networkError = errorHandler.createError(
    error.message,
    ErrorCategory.NETWORK,
    ErrorSeverity.MEDIUM,
    RecoveryStrategy.RETRY,
    context
  );
  return await errorHandler.handleError(networkError);
};

export const handleAuthError = async (message: string, context?: LogContext) => {
  const authError = errorHandler.createError(
    message,
    ErrorCategory.AUTHENTICATION,
    ErrorSeverity.HIGH,
    RecoveryStrategy.LOGOUT,
    context
  );
  return await errorHandler.handleError(authError);
};

// Performance monitoring utilities
export const withPerformanceTracking = <T extends any[], R>(
  fn: (...args: T) => R | Promise<R>,
  operation: string,
  context?: LogContext
) => {
  return async (...args: T): Promise<R> => {
    const startTime = performance.now();
    let success = true;
    let result: R;

    try {
      result = await fn(...args);
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const endTime = performance.now();
      errorHandler.trackPerformance({
        operation,
        startTime,
        endTime,
        duration: endTime - startTime,
        success,
        errorCount: success ? 0 : 1,
        context
      });
    }
  };
};

// React component error boundary helper
export const createErrorBoundaryProps = (
  component: string,
  fallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>
) => ({
  onError: (error: Error, errorInfo: React.ErrorInfo) => {
    const componentError = errorHandler.createError(
      error.message,
      ErrorCategory.UI_COMPONENT,
      ErrorSeverity.MEDIUM,
      RecoveryStrategy.REFRESH,
      {
        component,
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    );
    errorHandler.handleError(componentError);
  },
  fallback: fallbackComponent
});