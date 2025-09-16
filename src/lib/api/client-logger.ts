// Client-safe logger that doesn't import any server-side modules
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

class ClientLogger {
  private logLevel: LogLevel = LogLevel.INFO;

  constructor() {
    // Set log level based on environment
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      this.logLevel = LogLevel.DEBUG;
    }
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: any,
  ): string {
    const levelName = LogLevel[level];
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${levelName}] ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  debug(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message), context);
    }
  }

  info(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message), context);
    }
  }

  warn(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message), context);
    }
  }

  error(message: string, error?: Error | any, context?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorInfo = error
        ? {
            name: error.name || "Error",
            message: error.message || String(error),
            stack: error.stack,
          }
        : undefined;

      console.error(this.formatMessage(LogLevel.ERROR, message), {
        error: errorInfo,
        context,
      });
    }
  }

  fatal(message: string, error?: Error, context?: any): void {
    if (this.shouldLog(LogLevel.FATAL)) {
      const errorInfo = error
        ? {
            name: error.name || "Fatal Error",
            message: error.message || String(error),
            stack: error.stack,
          }
        : undefined;

      console.error(this.formatMessage(LogLevel.FATAL, message), {
        error: errorInfo,
        context,
      });
    }
  }
}

// Export singleton instance
export const logger = new ClientLogger();
