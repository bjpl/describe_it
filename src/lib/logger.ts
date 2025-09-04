/**
 * Centralized logging utility for production-safe logging
 * Replaces console statements with structured logging
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: any;
  userId?: string;
  sessionId?: string;
  component?: string;
  function?: string;
  timestamp?: string;
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

    // For now, we'll just store critical errors
    if (level === "error" && this.isClient) {
      // Could integrate with Sentry here
      try {
        localStorage.setItem(
          `app-error-${Date.now()}`,
          JSON.stringify({
            level,
            message,
            context,
            timestamp: new Date().toISOString(),
          }),
        );
      } catch {
        // Silent fail if localStorage is not available
      }
    }
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
    this[level](`API ${method.toUpperCase()} ${status}: ${url}`, {
      ...context,
      type: "api-response",
      method,
      url,
      status,
    });
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
