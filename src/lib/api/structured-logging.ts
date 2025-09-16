import { vercelKvCache } from "./vercel-kv";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

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
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
    ip?: string;
    userAgent?: string;
    referer?: string;
  };
  response?: {
    status: number;
    headers?: Record<string, string>;
    responseTime?: number;
    size?: number;
  };
  performance?: {
    duration: number;
    memory: {
      before: NodeJS.MemoryUsage;
      after: NodeJS.MemoryUsage;
      delta: number;
    };
    cpu?: number;
  };
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  session?: {
    id: string;
    duration?: number;
  };
  trace?: {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableMetrics: boolean;
  maxStorageSize: number;
  retentionDays: number;
  sensitiveFields: string[];
  environment: "development" | "staging" | "production";
}

class StructuredLogger {
  private config: LoggerConfig;
  private metricsBuffer: LogEntry[] = [];
  private readonly BUFFER_SIZE = 100;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableStorage: true,
      enableMetrics: true,
      maxStorageSize: 1000,
      retentionDays: 30,
      sensitiveFields: ["password", "token", "key", "secret", "authorization"],
      environment: (process.env.NODE_ENV as any) || "development",
      ...config,
    };
  }

  /**
   * Sanitizes sensitive data from objects
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== "object") return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    const sanitized = { ...data };

    for (const field of this.config.sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "[REDACTED]";
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Generates a unique trace ID for request tracking
   */
  private generateTraceId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Formats log entry for console output
   */
  private formatForConsole(entry: LogEntry): string {
    const levelNames = ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"];
    const levelName = levelNames[entry.level] || "UNKNOWN";

    const timestamp = new Date(entry.timestamp).toISOString();
    let output = `[${timestamp}] ${levelName}: ${entry.message}`;

    if (entry.context) {
      output += `\nContext: ${safeStringify(entry.context, null, 2)}`;
    }

    if (entry.request) {
      output += `\nRequest: ${entry.request.method} ${entry.request.url}`;
      if (entry.response) {
        output += ` -> ${entry.response.status} (${entry.response.responseTime}ms)`;
      }
    }

    if (entry.error) {
      output += `\nError: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack && this.config.environment === "development") {
        output += `\nStack: ${entry.error.stack}`;
      }
    }

    return output;
  }

  /**
   * Stores log entry in persistent storage
   */
  private async storeLogEntry(entry: LogEntry): Promise<void> {
    if (!this.config.enableStorage) return;

    try {
      const key = `log:${entry.timestamp}:${Math.random().toString(36).substring(7)}`;
      const ttl = this.config.retentionDays * 24 * 60 * 60; // Convert days to seconds

      await vercelKvCache.set(key, entry, ttl);

      // Maintain metrics buffer
      if (this.config.enableMetrics) {
        this.metricsBuffer.push(entry);

        if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
          await this.flushMetrics();
        }
      }
    } catch (error) {
      console.error("Failed to store log entry:", error);
    }
  }

  /**
   * Flushes metrics buffer to storage
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    try {
      const metrics = this.generateMetrics(this.metricsBuffer);
      const key = `metrics:${Date.now()}`;

      await vercelKvCache.set(key, metrics, 7 * 24 * 60 * 60); // 7 days retention

      this.metricsBuffer = [];
    } catch (error) {
      console.error("Failed to flush metrics:", error);
    }
  }

  /**
   * Generates metrics from log entries
   */
  private generateMetrics(entries: LogEntry[]): any {
    const now = new Date().toISOString();

    const metrics = {
      timestamp: now,
      period: {
        start: entries[0]?.timestamp,
        end: entries[entries.length - 1]?.timestamp,
        count: entries.length,
      },
      levels: {} as Record<string, number>,
      errors: {
        total: 0,
        by_type: {} as Record<string, number>,
      },
      requests: {
        total: 0,
        by_method: {} as Record<string, number>,
        by_status: {} as Record<string, number>,
        avg_response_time: 0,
        response_times: [] as number[],
      },
      performance: {
        avg_duration: 0,
        avg_memory_delta: 0,
        durations: [] as number[],
        memory_deltas: [] as number[],
      },
    };

    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let totalDuration = 0;
    let durationCount = 0;
    let totalMemoryDelta = 0;
    let memoryCount = 0;

    for (const entry of entries) {
      // Level counts
      const levelName = LogLevel[entry.level] || "UNKNOWN";
      metrics.levels[levelName] = (metrics.levels[levelName] || 0) + 1;

      // Error tracking
      if (entry.error) {
        metrics.errors.total++;
        metrics.errors.by_type[entry.error.name] =
          (metrics.errors.by_type[entry.error.name] || 0) + 1;
      }

      // Request metrics
      if (entry.request) {
        metrics.requests.total++;
        metrics.requests.by_method[entry.request.method] =
          (metrics.requests.by_method[entry.request.method] || 0) + 1;

        if (entry.response) {
          metrics.requests.by_status[entry.response.status.toString()] =
            (metrics.requests.by_status[entry.response.status.toString()] ||
              0) + 1;

          if (entry.response.responseTime) {
            totalResponseTime += entry.response.responseTime;
            responseTimeCount++;
            metrics.requests.response_times.push(entry.response.responseTime);
          }
        }
      }

      // Performance metrics
      if (entry.performance) {
        totalDuration += entry.performance.duration;
        durationCount++;
        metrics.performance.durations.push(entry.performance.duration);

        if (entry.performance.memory.delta) {
          totalMemoryDelta += entry.performance.memory.delta;
          memoryCount++;
          metrics.performance.memory_deltas.push(
            entry.performance.memory.delta,
          );
        }
      }
    }

    // Calculate averages
    if (responseTimeCount > 0) {
      metrics.requests.avg_response_time =
        totalResponseTime / responseTimeCount;
    }

    if (durationCount > 0) {
      metrics.performance.avg_duration = totalDuration / durationCount;
    }

    if (memoryCount > 0) {
      metrics.performance.avg_memory_delta = totalMemoryDelta / memoryCount;
    }

    return metrics;
  }

  /**
   * Core logging method
   */
  async log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error,
    additionalData?: Partial<LogEntry>,
  ): Promise<void> {
    // Skip if below configured level
    if (level < this.config.level) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ? this.sanitizeData(context) : undefined,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: (error as any).code,
          }
        : undefined,
      ...additionalData,
    };

    // Console output
    if (this.config.enableConsole) {
      const formattedMessage = this.formatForConsole(entry);

      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(formattedMessage);
          break;
      }
    }

    // Store entry
    await this.storeLogEntry(entry);
  }

  /**
   * Convenience methods for different log levels
   */
  debug(message: string, context?: Record<string, any>): Promise<void> {
    return this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): Promise<void> {
    return this.log(LogLevel.INFO, message, context);
  }

  warn(
    message: string,
    context?: Record<string, any>,
    error?: Error,
  ): Promise<void> {
    return this.log(LogLevel.WARN, message, context, error);
  }

  error(
    message: string,
    error?: Error,
    context?: Record<string, any>,
  ): Promise<void> {
    return this.log(LogLevel.ERROR, message, context, error);
  }

  fatal(
    message: string,
    error?: Error,
    context?: Record<string, any>,
  ): Promise<void> {
    return this.log(LogLevel.FATAL, message, context, error);
  }

  /**
   * Request-specific logging
   */
  async logRequest(
    req: Request,
    res?: Response,
    additionalContext?: Record<string, any>,
  ): Promise<void> {
    const startTime = performance.now();

    const requestData = {
      method: req.method,
      url: req.url,
      headers: this.sanitizeData(Object.fromEntries(req.headers.entries())),
      ip:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || undefined,
      referer: req.headers.get("referer") || undefined,
    };

    const responseData = res
      ? {
          status: res.status,
          headers: this.sanitizeData(Object.fromEntries(res.headers.entries())),
          responseTime: performance.now() - startTime,
        }
      : undefined;

    await this.log(
      LogLevel.INFO,
      `${req.method} ${req.url}`,
      additionalContext,
      undefined,
      {
        request: requestData,
        response: responseData,
      },
    );
  }

  /**
   * Performance-specific logging
   */
  async logPerformance(
    operation: string,
    duration: number,
    memoryBefore: NodeJS.MemoryUsage,
    memoryAfter: NodeJS.MemoryUsage,
    additionalContext?: Record<string, any>,
  ): Promise<void> {
    const memoryDelta = memoryAfter.heapUsed - memoryBefore.heapUsed;

    await this.log(
      LogLevel.INFO,
      `Performance: ${operation}`,
      additionalContext,
      undefined,
      {
        performance: {
          duration,
          memory: {
            before: memoryBefore,
            after: memoryAfter,
            delta: memoryDelta,
          },
        },
      },
    );
  }

  /**
   * Search and retrieve log entries
   */
  async searchLogs(
    filters: {
      level?: LogLevel;
      timeRange?: { start: Date; end: Date };
      message?: string;
      error?: string;
      userId?: string;
    },
    limit: number = 100,
  ): Promise<LogEntry[]> {
    try {
      // Get all log keys
      const logKeys = await vercelKvCache.keys("log:*");
      const entries: LogEntry[] = [];

      // Batch get log entries
      const batchSize = 50;
      for (
        let i = 0;
        i < logKeys.length && entries.length < limit;
        i += batchSize
      ) {
        const batch = logKeys.slice(i, i + batchSize);
        const batchEntries = await vercelKvCache.mget<LogEntry>(batch);

        for (const entry of batchEntries) {
          if (!entry) continue;

          // Apply filters
          if (filters.level !== undefined && entry.level !== filters.level)
            continue;

          if (filters.timeRange) {
            const entryTime = new Date(entry.timestamp);
            if (
              entryTime < filters.timeRange.start ||
              entryTime > filters.timeRange.end
            ) {
              continue;
            }
          }

          if (filters.message && !entry.message.includes(filters.message))
            continue;

          if (
            filters.error &&
            (!entry.error || !entry.error.message.includes(filters.error))
          ) {
            continue;
          }

          if (
            filters.userId &&
            (!entry.user || entry.user.id !== filters.userId)
          ) {
            continue;
          }

          entries.push(entry);

          if (entries.length >= limit) break;
        }
      }

      // Sort by timestamp (newest first)
      return entries.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    } catch (error) {
      console.error("Failed to search logs:", error);
      return [];
    }
  }

  /**
   * Get aggregated metrics
   */
  async getMetrics(timeRange?: { start: Date; end: Date }): Promise<any> {
    try {
      const metricsKeys = await vercelKvCache.keys("metrics:*");
      const allMetrics = await vercelKvCache.mget(metricsKeys);

      // Filter by time range if provided
      let filteredMetrics = allMetrics.filter(Boolean);

      if (timeRange) {
        filteredMetrics = filteredMetrics.filter((metrics) => {
          const metricsTime = new Date(metrics.timestamp);
          return metricsTime >= timeRange.start && metricsTime <= timeRange.end;
        });
      }

      // Aggregate metrics
      // This would contain logic to combine multiple metric periods
      // For now, return the latest metrics
      return filteredMetrics[filteredMetrics.length - 1] || null;
    } catch (error) {
      console.error("Failed to get metrics:", error);
      return null;
    }
  }

  /**
   * Health check for logging system
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.debug("Logging system health check");
      return true;
    } catch (error) {
      console.error("Logging system health check failed:", error);
      return false;
    }
  }

  /**
   * Clean up old log entries
   */
  async cleanup(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const logKeys = await vercelKvCache.keys("log:*");
      let deletedCount = 0;

      for (const key of logKeys) {
        // Extract timestamp from key (assuming format: log:timestamp:random)
        const keyParts = key.split(":");
        if (keyParts.length >= 2) {
          const timestamp = new Date(keyParts[1]);
          if (timestamp < cutoffDate) {
            const deleted = await vercelKvCache.delete(key);
            if (deleted) deletedCount++;
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error("Failed to cleanup logs:", error);
      return 0;
    }
  }
}

// Export singleton logger instance
export const logger = new StructuredLogger({
  level: process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableStorage: true,
  enableMetrics: true,
  environment: (process.env.NODE_ENV as any) || "development",
});

// Export class for custom instances
export { StructuredLogger };
