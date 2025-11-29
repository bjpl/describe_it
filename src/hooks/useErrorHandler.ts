/**
 * Error Handler Hook
 * Provides consistent error handling with toast notifications
 */

import { useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { AppError, normalizeError, ErrorCode, ErrorSeverity } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface ErrorHandlerOptions {
  /**
   * Show toast notification for this error
   */
  showToast?: boolean;

  /**
   * Custom toast title
   */
  toastTitle?: string;

  /**
   * Custom toast message (overrides default error message)
   */
  toastMessage?: string;

  /**
   * Auto-dismiss duration in ms (0 = no auto-dismiss)
   */
  toastDuration?: number;

  /**
   * Log error to console/logger
   */
  logError?: boolean;

  /**
   * Additional context for error logging
   */
  context?: Record<string, any>;

  /**
   * Callback to execute after error is handled
   */
  onError?: (error: AppError) => void;

  /**
   * Rethrow error after handling
   */
  rethrow?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<ErrorHandlerOptions, 'toastTitle' | 'toastMessage' | 'context' | 'onError'>> = {
  showToast: true,
  toastDuration: 5000,
  logError: true,
  rethrow: false,
};

/**
 * Hook for handling errors with toast notifications and logging
 */
export function useErrorHandler() {
  const { toast } = useToast();

  /**
   * Handle an error with customizable options
   */
  const handleError = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}) => {
      const opts = { ...DEFAULT_OPTIONS, ...options };

      // Normalize error to AppError
      const appError = normalizeError(error, opts.context);

      // Log error if enabled
      if (opts.logError) {
        const logContext = {
          code: appError.code,
          severity: appError.severity,
          isRecoverable: appError.isRecoverable,
          ...appError.context,
          ...opts.context,
        };

        if (appError.severity === ErrorSeverity.CRITICAL || appError.severity === ErrorSeverity.HIGH) {
          logger.error(appError.message, appError.originalError || appError, logContext);
        } else {
          logger.warn(appError.message, logContext);
        }
      }

      // Show toast notification if enabled
      if (opts.showToast) {
        const toastType = getToastType(appError);
        const message = opts.toastMessage || appError.getUserMessage();
        const title = opts.toastTitle || getDefaultTitle(appError);

        // Determine duration
        let duration = opts.toastDuration;
        if (appError.severity === ErrorSeverity.CRITICAL || appError.severity === ErrorSeverity.HIGH) {
          duration = 0; // Don't auto-dismiss severe errors
        }

        toast({
          type: toastType,
          title,
          description: message,
          duration,
        });
      }

      // Execute callback if provided
      if (opts.onError) {
        opts.onError(appError);
      }

      // Rethrow if requested
      if (opts.rethrow) {
        throw appError;
      }

      return appError;
    },
    [toast]
  );

  /**
   * Show success message
   */
  const showSuccess = useCallback(
    (message: string, title?: string, duration?: number) => {
      toast({
        type: 'success',
        title: title || 'Success',
        description: message,
        duration: duration !== undefined ? duration : 3000,
      });
    },
    [toast]
  );

  /**
   * Show error message without error object
   */
  const showError = useCallback(
    (message: string, title?: string, duration?: number) => {
      const appError = normalizeError(message);

      toast({
        type: 'error',
        title: title || 'Error',
        description: message,
        duration: duration !== undefined ? duration : 5000,
      });

      logger.error(message, appError);
    },
    [toast]
  );

  /**
   * Show warning message
   */
  const showWarning = useCallback(
    (message: string, title?: string, duration?: number) => {
      toast({
        type: 'warning',
        title: title || 'Warning',
        description: message,
        duration: duration !== undefined ? duration : 4000,
      });
    },
    [toast]
  );

  /**
   * Show info message
   */
  const showInfo = useCallback(
    (message: string, title?: string, duration?: number) => {
      toast({
        type: 'info',
        title: title || 'Information',
        description: message,
        duration: duration !== undefined ? duration : 3000,
      });
    },
    [toast]
  );

  /**
   * Clear all error notifications
   */
  const clearErrors = useCallback(() => {
    // Toast provider handles dismissAll
  }, []);

  return {
    handleError,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearErrors,
  };
}

/**
 * Get toast type based on error severity
 */
function getToastType(error: AppError): 'error' | 'warning' | 'info' {
  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      return 'error';
    case ErrorSeverity.MEDIUM:
      return 'warning';
    case ErrorSeverity.LOW:
    default:
      return 'info';
  }
}

/**
 * Get default toast title based on error code
 */
function getDefaultTitle(error: AppError): string {
  switch (error.code) {
    case ErrorCode.NETWORK_ERROR:
    case ErrorCode.NETWORK_TIMEOUT:
    case ErrorCode.NETWORK_OFFLINE:
      return 'Connection Error';

    case ErrorCode.API_ERROR:
    case ErrorCode.API_RATE_LIMIT:
    case ErrorCode.API_SERVER_ERROR:
      return 'API Error';

    case ErrorCode.API_UNAUTHORIZED:
    case ErrorCode.API_FORBIDDEN:
    case ErrorCode.AUTH_ERROR:
    case ErrorCode.AUTH_EXPIRED:
    case ErrorCode.AUTH_INVALID:
      return 'Authentication Error';

    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.VALIDATION_REQUIRED:
    case ErrorCode.VALIDATION_FORMAT:
      return 'Validation Error';

    case ErrorCode.STORAGE_ERROR:
    case ErrorCode.STORAGE_QUOTA:
    case ErrorCode.STORAGE_READ:
    case ErrorCode.STORAGE_WRITE:
      return 'Storage Error';

    case ErrorCode.OPERATION_FAILED:
    case ErrorCode.RESOURCE_NOT_FOUND:
    case ErrorCode.DUPLICATE_RESOURCE:
      return 'Operation Failed';

    case ErrorCode.SYSTEM_ERROR:
    case ErrorCode.INITIALIZATION_ERROR:
      return 'System Error';

    default:
      return 'Error';
  }
}

/**
 * Utility hook for wrapping async operations with error handling
 */
export function useAsyncErrorHandler() {
  const { handleError } = useErrorHandler();

  /**
   * Wrap an async function with automatic error handling
   */
  const wrapAsync = useCallback(
    <T extends (...args: any[]) => Promise<any>>(
      fn: T,
      options?: ErrorHandlerOptions
    ): T => {
      return (async (...args: Parameters<T>) => {
        try {
          return await fn(...args);
        } catch (error) {
          return handleError(error, options);
        }
      }) as T;
    },
    [handleError]
  );

  return { wrapAsync, handleError };
}

export default useErrorHandler;
