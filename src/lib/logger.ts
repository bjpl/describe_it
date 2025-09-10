/**
 * Centralized logging utility for production-safe logging
 * Replaces console statements with structured logging
 * Enhanced with error categorization and performance monitoring
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: any;
  userId?: string;
  sessionId?: string;
  component?: string;
  function?: string;
  timestamp?: string;
  errorId?: string;
  category?: string;
  severity?: string;
  recovery?: string;
  operation?: string;
  duration?: number;
  traceId?: string;
  correlationId?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isClient = typeof window !== "undefined";

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context) : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${contextStr}`;
  }

  private logToConsole(level: LogLevel, message: string, context?: LogContext) {
    if (!this.isDevelopment) return;

    const formattedMessage = this.formatMessage(level, message, context);

    switch (level) {
      case "debug":
        console.log(formattedMessage);
        break;
      case "info":
        console.info(formattedMessage);
        break;
      case "warn":
        console.warn(formattedMessage);
        break;
      case "error":
        console.error(formattedMessage);
        break;
    }
  }

  private logToService(level: LogLevel, message: string, context?: LogContext) {
    // In production, send to logging service (Sentry, LogRocket, etc.)
    if (this.isDevelopment) return;

    // Enhanced error storage with categorization
    if (level === "error" && this.isClient) {
      try {
        const errorData = {
          level,
          message,
          context,
          timestamp: new Date().toISOString(),
          category: context?.category || 'unknown',
          severity: context?.severity || 'medium',
          errorId: context?.errorId || `log_${Date.now()}`,
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionId: this.getSessionId(),
        };
        
        localStorage.setItem(
          `app-error-${errorData.errorId}`,
          JSON.stringify(errorData)
        );

        // Also send to external service if available
        this.sendToExternalService(errorData);
      } catch (storageError) {
        // Silent fail if localStorage is not available
        console.error('Failed to store error:', storageError);
      }
    }

    // Store performance logs
    if (context?.duration && this.isClient) {
      this.storePerformanceMetric(message, context);
    }
  }

  private sendToExternalService(errorData: any) {
    // Placeholder for external service integration (Sentry, LogRocket, etc.)
    // This could be implemented to send to actual monitoring services
    if (typeof window !== 'undefined' && 'fetch' in window) {
      // Example: Send to monitoring service
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData)
      // }).catch(() => {});
    }
  }

  private storePerformanceMetric(message: string, context: LogContext) {
    try {
      const performanceData = {
        message,
        duration: context.duration,
        operation: context.operation,
        timestamp: new Date().toISOString(),
        component: context.component,
        url: window.location.href,
      };
      
      localStorage.setItem(
        `perf-${Date.now()}`,
        JSON.stringify(performanceData)
      );
    } catch (error) {
      // Silent fail
    }
  }

  private getSessionId(): string {
    if (!this.isClient) return 'server-session';
    
    let sessionId = sessionStorage.getItem('app-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('app-session-id', sessionId);
    }
    return sessionId;
  }

  debug(message: string, context?: LogContext) {
    this.logToConsole("debug", message, { ...context, level: "debug" });
  }

  info(message: string, context?: LogContext) {
    this.logToConsole("info", message, { ...context, level: "info" });
    this.logToService("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.logToConsole("warn", message, { ...context, level: "warn" });
    this.logToService("warn", message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    const errorContext = {
      ...context,
      level: "error",
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };

    this.logToConsole("error", message, errorContext);
    this.logToService("error", message, errorContext);
  }

  // Utility methods for common patterns
  apiCall(method: string, url: string, context?: LogContext) {
    this.debug(`API ${method.toUpperCase()}: ${url}`, {
      ...context,
      type: "api-call",
      method,
      url,
    });
  }

  apiResponse(
    method: string,
    url: string,
    status: number,
    context?: LogContext,
  ) {
    const level = status >= 400 ? "error" : status >= 300 ? "warn" : "info";
    const responseContext = {
      ...context,
      type: "api-response",
      method,
      url,
      status,
    };
    
    if (level === "error") {
      this.error(`API ${method.toUpperCase()} ${status}: ${url}`, undefined, responseContext);
    } else if (level === "warn") {
      this.warn(`API ${method.toUpperCase()} ${status}: ${url}`, responseContext);
    } else {
      this.info(`API ${method.toUpperCase()} ${status}: ${url}`, responseContext);
    }
  }

  componentMount(componentName: string, context?: LogContext) {
    this.debug(`Component mounted: ${componentName}`, {
      ...context,
      type: "component-lifecycle",
      component: componentName,
      action: "mount",
    });
  }

  componentUnmount(componentName: string, context?: LogContext) {
    this.debug(`Component unmounted: ${componentName}`, {
      ...context,
      type: "component-lifecycle",
      component: componentName,
      action: "unmount",
    });
  }

  userAction(action: string, context?: LogContext) {
    this.info(`User action: ${action}`, {
      ...context,
      type: "user-action",
      action,
    });
  }

  performance(operation: string, duration: number, context?: LogContext) {
    const level = duration > 1000 ? "warn" : "debug";
    this[level](`Performance: ${operation} took ${duration}ms`, {
      ...context,
      type: "performance",
      operation,
      duration,
    });
  }

  // Enhanced error logging with categorization
  errorWithCategory(
    message: string,
    error: Error,
    category: string,
    severity: string,
    context?: LogContext
  ) {
    this.error(message, error, {
      ...context,
      category,
      severity,
    });
  }

  // Security-related logging
  security(message: string, context?: LogContext) {
    this.error(`SECURITY: ${message}`, undefined, {
      ...context,
      category: 'security',
      severity: 'critical',
      type: 'security-event',
    });
  }

  // Network error logging
  networkError(message: string, error?: Error, context?: LogContext) {
    this.error(`NETWORK: ${message}`, error, {
      ...context,
      category: 'network',
      severity: 'medium',
      type: 'network-error',
    });
  }

  // Database error logging
  databaseError(message: string, error?: Error, context?: LogContext) {
    this.error(`DATABASE: ${message}`, error, {
      ...context,
      category: 'database',
      severity: 'high',
      type: 'database-error',
    });
  }

  // Authentication error logging
  authError(message: string, context?: LogContext) {
    this.error(`AUTH: ${message}`, undefined, {
      ...context,
      category: 'authentication',
      severity: 'high',
      type: 'auth-error',
    });
  }

  // Validation error logging
  validationError(message: string, context?: LogContext) {
    this.warn(`VALIDATION: ${message}`, {
      ...context,
      category: 'validation',
      severity: 'low',
      type: 'validation-error',
    });
  }

  // Business logic error logging
  businessError(message: string, context?: LogContext) {
    this.error(`BUSINESS: ${message}`, undefined, {
      ...context,
      category: 'business_logic',
      severity: 'medium',
      type: 'business-error',
    });
  }

  // System error logging
  systemError(message: string, error?: Error, context?: LogContext) {
    this.error(`SYSTEM: ${message}`, error, {
      ...context,
      category: 'system',
      severity: 'critical',
      type: 'system-error',
    });
  }

  // Get stored errors for analysis
  getStoredErrors(): any[] {
    if (!this.isClient) return [];
    
    const errors: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('app-error-')) {
        try {
          const errorData = JSON.parse(localStorage.getItem(key) || '{}');
          errors.push(errorData);
        } catch {
          // Skip invalid JSON
        }
      }
    }
    return errors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Get stored performance metrics
  getStoredPerformanceMetrics(): any[] {
    if (!this.isClient) return [];
    
    const metrics: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('perf-')) {
        try {
          const perfData = JSON.parse(localStorage.getItem(key) || '{}');
          metrics.push(perfData);
        } catch {
          // Skip invalid JSON
        }
      }
    }
    return metrics.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Clear old stored data
  clearOldLogs(daysToKeep: number = 7) {
    if (!this.isClient) return;
    
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('app-error-') || key?.startsWith('perf-')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (new Date(data.timestamp).getTime() < cutoffTime) {
            keysToRemove.push(key);
          }
        } catch {
          // Remove invalid entries
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience functions for common patterns
export const logApiCall = (method: string, url: string, context?: LogContext) =>
  logger.apiCall(method, url, context);

export const logApiResponse = (
  method: string,
  url: string,
  status: number,
  context?: LogContext,
) => logger.apiResponse(method, url, status, context);

export const logError = (
  message: string,
  error?: Error,
  context?: LogContext,
) => logger.error(message, error, context);

export const logUserAction = (action: string, context?: LogContext) =>
  logger.userAction(action, context);

export const logPerformance = (
  operation: string,
  duration: number,
  context?: LogContext,
) => logger.performance(operation, duration, context);

// Development-only logging functions
export const devLog = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV] ${message}`, ...args);
  }
};

export const devWarn = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[DEV] ${message}`, ...args);
  }
};

export const devError = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === "development") {
    console.error(`[DEV] ${message}`, ...args);
  }
};
