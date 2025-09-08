"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { errorHandler, ErrorCategory, ErrorSeverity, AppError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';

// Error reporting hook configuration
interface UseErrorReportingConfig {
  enableAutoReporting?: boolean;
  enablePerformanceTracking?: boolean;
  enableNetworkErrorDetection?: boolean;
  maxErrorsPerSession?: number;
  enableNotifications?: boolean;
  notificationDuration?: number;
}

// Error notification interface
interface ErrorNotification {
  id: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: Date;
  dismissed: boolean;
  userMessage: string;
}

// Hook return interface
interface UseErrorReportingReturn {
  // Error reporting functions
  reportError: (error: Error | string, context?: Record<string, any>) => Promise<AppError>;
  reportValidationError: (message: string, field?: string, value?: any) => Promise<AppError>;
  reportNetworkError: (error: Error, operation?: string) => Promise<AppError>;
  reportAuthError: (message?: string) => Promise<AppError>;
  reportBusinessError: (message: string, context?: Record<string, any>) => Promise<AppError>;
  
  // Performance tracking
  trackOperation: <T>(operation: string, fn: () => Promise<T>) => Promise<T>;
  trackAsyncOperation: (operation: string) => { finish: (success?: boolean) => void };
  
  // Error state management
  errors: AppError[];
  notifications: ErrorNotification[];
  clearErrors: () => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Statistics
  errorStats: {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: AppError[];
  };
  
  // Configuration
  updateConfig: (config: Partial<UseErrorReportingConfig>) => void;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

// Default configuration
const DEFAULT_CONFIG: UseErrorReportingConfig = {
  enableAutoReporting: true,
  enablePerformanceTracking: true,
  enableNetworkErrorDetection: true,
  maxErrorsPerSession: 50,
  enableNotifications: true,
  notificationDuration: 5000,
};

export function useErrorReporting(
  initialConfig: Partial<UseErrorReportingConfig> = {}
): UseErrorReportingReturn {
  const [config, setConfig] = useState<UseErrorReportingConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  
  const [errors, setErrors] = useState<AppError[]>([]);
  const [notifications, setNotifications] = useState<ErrorNotification[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const operationTracking = useRef<Map<string, { startTime: number; operation: string }>>(new Map());

  // Initialize error detection
  useEffect(() => {
    if (!isEnabled) return;

    // Network error detection
    if (config.enableNetworkErrorDetection) {
      const handleOnline = () => {
        logger.info('Network connection restored');
      };
      
      const handleOffline = () => {
        reportNetworkError(new Error('Network connection lost'), 'connection_lost');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [isEnabled, config.enableNetworkErrorDetection]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (!config.enableNotifications) return;

    const timers = notifications
      .filter(n => !n.dismissed)
      .map(notification => 
        setTimeout(() => {
          dismissNotification(notification.id);
        }, config.notificationDuration)
      );

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, config.enableNotifications, config.notificationDuration]);

  // Core error reporting function
  const reportError = useCallback(async (
    error: Error | string, 
    context: Record<string, any> = {}
  ): Promise<AppError> => {
    if (!isEnabled) {
      const dummyError = new Error(typeof error === 'string' ? error : error.message) as AppError;
      dummyError.id = 'disabled';
      dummyError.category = ErrorCategory.UNKNOWN;
      dummyError.severity = ErrorSeverity.LOW;
      return dummyError;
    }

    try {
      const errorObj = typeof error === 'string' ? new Error(error) : error;
      const appError = await errorHandler.handleError(errorObj, {
        ...context,
        component: 'useErrorReporting',
        reportedViaHook: true,
        timestamp: new Date().toISOString(),
      });

      // Add to local error state
      setErrors(prev => {
        const newErrors = [appError, ...prev].slice(0, config.maxErrorsPerSession);
        return newErrors;
      });

      // Create notification if enabled
      if (config.enableNotifications) {
        const notification: ErrorNotification = {
          id: appError.id,
          message: errorObj.message,
          severity: appError.severity,
          category: appError.category,
          timestamp: appError.timestamp,
          dismissed: false,
          userMessage: appError.userMessage || 'An error occurred',
        };

        setNotifications(prev => [notification, ...prev].slice(0, 10));
      }

      return appError;
    } catch (reportingError) {
      logger.systemError('Failed to report error via hook', reportingError as Error, {
        originalError: typeof error === 'string' ? error : error.message,
      });
      
      // Return a minimal error object
      const fallbackError = new Error(typeof error === 'string' ? error : error.message) as AppError;
      fallbackError.id = `fallback_${Date.now()}`;
      fallbackError.category = ErrorCategory.SYSTEM;
      fallbackError.severity = ErrorSeverity.MEDIUM;
      return fallbackError;
    }
  }, [isEnabled, config.maxErrorsPerSession, config.enableNotifications]);

  // Specialized error reporting functions
  const reportValidationError = useCallback(async (
    message: string, 
    field?: string, 
    value?: any
  ): Promise<AppError> => {
    return reportError(message, {
      type: 'validation',
      field,
      value,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
    });
  }, [reportError]);

  const reportNetworkError = useCallback(async (
    error: Error, 
    operation?: string
  ): Promise<AppError> => {
    return reportError(error, {
      type: 'network',
      operation,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
    });
  }, [reportError]);

  const reportAuthError = useCallback(async (
    message: string = 'Authentication failed'
  ): Promise<AppError> => {
    return reportError(message, {
      type: 'authentication',
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
    });
  }, [reportError]);

  const reportBusinessError = useCallback(async (
    message: string, 
    context: Record<string, any> = {}
  ): Promise<AppError> => {
    return reportError(message, {
      ...context,
      type: 'business_logic',
      category: ErrorCategory.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
    });
  }, [reportError]);

  // Performance tracking functions
  const trackOperation = useCallback(async <T>(
    operation: string, 
    fn: () => Promise<T>
  ): Promise<T> => {
    if (!isEnabled || !config.enablePerformanceTracking) {
      return await fn();
    }

    const startTime = performance.now();
    let result: T;
    let error: Error | null = null;

    try {
      result = await fn();
      return result;
    } catch (err) {
      error = err as Error;
      throw err;
    } finally {
      const duration = performance.now() - startTime;
      
      // Track performance
      errorHandler.trackPerformance({
        operation,
        startTime,
        endTime: performance.now(),
        duration,
        success: !error,
        errorCount: error ? 1 : 0,
        context: {
          reportedViaHook: true,
        },
      });

      // Report slow operations as performance issues
      if (duration > 3000) {
        reportError(`Slow operation: ${operation}`, {
          type: 'performance',
          operation,
          duration,
          category: ErrorCategory.PERFORMANCE,
          severity: ErrorSeverity.MEDIUM,
        });
      }
    }
  }, [isEnabled, config.enablePerformanceTracking, reportError]);

  const trackAsyncOperation = useCallback((operation: string) => {
    if (!isEnabled || !config.enablePerformanceTracking) {
      return { finish: () => {} };
    }

    const startTime = performance.now();
    const trackingId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    operationTracking.current.set(trackingId, { startTime, operation });

    return {
      finish: (success: boolean = true) => {
        const tracking = operationTracking.current.get(trackingId);
        if (!tracking) return;

        const duration = performance.now() - tracking.startTime;
        operationTracking.current.delete(trackingId);

        errorHandler.trackPerformance({
          operation: tracking.operation,
          startTime: tracking.startTime,
          endTime: performance.now(),
          duration,
          success,
          errorCount: success ? 0 : 1,
          context: {
            reportedViaHook: true,
            asyncTracking: true,
          },
        });

        // Report slow async operations
        if (duration > 5000) {
          reportError(`Slow async operation: ${tracking.operation}`, {
            type: 'performance',
            operation: tracking.operation,
            duration,
            category: ErrorCategory.PERFORMANCE,
            severity: ErrorSeverity.MEDIUM,
          });
        }
      },
    };
  }, [isEnabled, config.enablePerformanceTracking, reportError]);

  // Error management functions
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, dismissed: true }
          : notification
      )
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Configuration update
  const updateConfig = useCallback((newConfig: Partial<UseErrorReportingConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Calculate error statistics
  const errorStats = useMemo(() => {
    const errorsByCategory = errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const errorsBySeverity = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    return {
      totalErrors: errors.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors: errors.slice(0, 10),
    };
  }, [errors]);

  return {
    reportError,
    reportValidationError,
    reportNetworkError,
    reportAuthError,
    reportBusinessError,
    trackOperation,
    trackAsyncOperation,
    errors,
    notifications,
    clearErrors,
    dismissNotification,
    clearNotifications,
    errorStats,
    updateConfig,
    isEnabled,
    setEnabled,
  };
}

// Utility hook for async operations with automatic error handling
export function useAsyncOperation<T = any>(
  operation: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const { reportError, trackOperation } = useErrorReporting();

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await trackOperation('useAsyncOperation', operation);
      setData(result);
      return result;
    } catch (err) {
      const appError = await reportError(err as Error, {
        hook: 'useAsyncOperation',
        context: 'async_execution',
      });
      setError(appError);
      throw appError;
    } finally {
      setLoading(false);
    }
  }, deps);

  return {
    execute,
    loading,
    data,
    error,
    reset: () => {
      setData(null);
      setError(null);
      setLoading(false);
    },
  };
}

// Hook for monitoring component performance
export function usePerformanceMonitor(componentName: string) {
  const { trackOperation, trackAsyncOperation } = useErrorReporting();
  const mountTime = useRef(performance.now());

  useEffect(() => {
    logger.componentMount(componentName, {
      mountTime: mountTime.current,
    });

    return () => {
      const unmountTime = performance.now();
      const componentLifetime = unmountTime - mountTime.current;
      
      logger.componentUnmount(componentName, {
        unmountTime,
        componentLifetime,
      });
      
      // Report components that stayed mounted too long (potential memory leaks)
      if (componentLifetime > 300000) { // 5 minutes
        logger.warn(`Component ${componentName} had long lifetime`, {
          componentLifetime,
          category: ErrorCategory.PERFORMANCE,
          severity: ErrorSeverity.LOW,
        });
      }
    };
  }, [componentName]);

  return {
    trackOperation: (operation: string, fn: () => Promise<any>) =>
      trackOperation(`${componentName}.${operation}`, fn),
    trackAsyncOperation: (operation: string) =>
      trackAsyncOperation(`${componentName}.${operation}`),
  };
}