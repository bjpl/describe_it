/**
 * Error Tracking Integration System
 * Provides integration points for external error tracking services and comprehensive error analysis
 */

import { logger, type ErrorContext } from './logger';
import { metrics } from './metrics';

export interface ErrorReport {
  id: string;
  timestamp: string;
  requestId: string;
  endpoint: string;
  method: string;
  userId?: string;
  userTier?: string;
  error: {
    name: string;
    message: string;
    stack?: string;
    category: string;
    severity: string;
    code?: string;
  };
  context: {
    userAgent?: string;
    ip?: string;
    headers: Record<string, string>;
    query?: Record<string, string>;
    body?: any;
  };
  environment: {
    service: string;
    version: string;
    nodeVersion: string;
    environment: string;
    memory?: NodeJS.MemoryUsage;
  };
  fingerprint: string;
}

export interface ErrorAnalytics {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  errorTrends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
  mostCommonErrors: Array<{
    message: string;
    count: number;
    lastOccurrence: string;
  }>;
  affectedUsers: {
    total: number;
    byTier: Record<string, number>;
  };
}

export class ErrorTracker {
  private static instance: ErrorTracker;
  private errorStore: Map<string, ErrorReport[]> = new Map();
  private errorFingerprints: Map<string, number> = new Map();
  private integrations: Map<string, (error: ErrorReport) => Promise<void>> = new Map();

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  constructor() {
    this.setupDefaultIntegrations();
  }

  /**
   * Track an error with full context
   */
  async trackError(
    error: Error,
    context: {
      requestId: string;
      endpoint: string;
      method: string;
      userId?: string;
      userTier?: string;
      userAgent?: string;
      ip?: string;
      headers?: Record<string, string>;
      query?: Record<string, string>;
      body?: any;
    }
  ): Promise<string> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fingerprint = this.generateErrorFingerprint(error, context.endpoint);
    
    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      endpoint: context.endpoint,
      method: context.method,
      userId: context.userId,
      userTier: context.userTier,
      error: {
        name: error.constructor.name,
        message: error.message,
        stack: error.stack,
        category: this.categorizeError(error).category,
        severity: this.categorizeError(error).severity,
        code: this.categorizeError(error).code,
      },
      context: {
        userAgent: context.userAgent,
        ip: context.ip,
        headers: this.sanitizeHeaders(context.headers || {}),
        query: context.query,
        body: this.sanitizeBody(context.body)
      },
      environment: {
        service: 'describe-it-api',
        version: '2.0.0',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        memory: logger.getMemoryMetrics()
      },
      fingerprint
    };

    // Store error
    this.storeError(errorReport);

    // Update fingerprint count
    this.errorFingerprints.set(fingerprint, (this.errorFingerprints.get(fingerprint) || 0) + 1);

    // Send to external integrations
    await this.sendToIntegrations(errorReport);

    return errorId;
  }

  /**
   * Register external error tracking integration
   */
  registerIntegration(name: string, handler: (error: ErrorReport) => Promise<void>) {
    this.integrations.set(name, handler);
    console.log(`Error tracking integration '${name}' registered`);
  }

  /**
   * Get error analytics
   */
  getErrorAnalytics(timeRange?: { start: Date; end: Date }): ErrorAnalytics {
    let allErrors: ErrorReport[] = [];
    
    this.errorStore.forEach(errors => {
      allErrors.push(...errors);
    });

    // Filter by time range if provided
    if (timeRange) {
      allErrors = allErrors.filter(error => {
        const errorDate = new Date(error.timestamp);
        return errorDate >= timeRange.start && errorDate <= timeRange.end;
      });
    }

    // Calculate analytics
    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    const errorsByEndpoint: Record<string, number> = {};
    const affectedUsersByTier: Record<string, number> = {};
    const uniqueUsers = new Set<string>();
    const errorMessages: Map<string, number> = new Map();

    allErrors.forEach(error => {
      // By category
      errorsByCategory[error.error.category] = (errorsByCategory[error.error.category] || 0) + 1;
      
      // By severity
      errorsBySeverity[error.error.severity] = (errorsBySeverity[error.error.severity] || 0) + 1;
      
      // By endpoint
      errorsByEndpoint[error.endpoint] = (errorsByEndpoint[error.endpoint] || 0) + 1;
      
      // Affected users
      if (error.userId) {
        uniqueUsers.add(error.userId);
        const tier = error.userTier || 'unknown';
        affectedUsersByTier[tier] = (affectedUsersByTier[tier] || 0) + 1;
      }
      
      // Error messages
      const message = error.error.message;
      errorMessages.set(message, (errorMessages.get(message) || 0) + 1);
    });

    // Calculate trends (simplified)
    const now = new Date();
    const hourly: number[] = new Array(24).fill(0);
    const daily: number[] = new Array(7).fill(0);
    const weekly: number[] = new Array(4).fill(0);

    allErrors.forEach(error => {
      const errorDate = new Date(error.timestamp);
      const hoursDiff = Math.floor((now.getTime() - errorDate.getTime()) / (1000 * 60 * 60));
      const daysDiff = Math.floor((now.getTime() - errorDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeksDiff = Math.floor((now.getTime() - errorDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

      if (hoursDiff < 24) {
        hourly[23 - hoursDiff]++;
      }
      if (daysDiff < 7) {
        daily[6 - daysDiff]++;
      }
      if (weeksDiff < 4) {
        weekly[3 - weeksDiff]++;
      }
    });

    // Most common errors
    const mostCommonErrors = Array.from(errorMessages.entries())
      .map(([message, count]) => ({
        message,
        count,
        lastOccurrence: allErrors
          .filter(e => e.error.message === message)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp || ''
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: allErrors.length,
      errorsByCategory,
      errorsBySeverity,
      errorsByEndpoint,
      errorTrends: {
        hourly,
        daily,
        weekly
      },
      mostCommonErrors,
      affectedUsers: {
        total: uniqueUsers.size,
        byTier: affectedUsersByTier
      }
    };
  }

  /**
   * Get errors by fingerprint
   */
  getErrorsByFingerprint(fingerprint: string): ErrorReport[] {
    let matchingErrors: ErrorReport[] = [];
    
    this.errorStore.forEach(errors => {
      matchingErrors.push(...errors.filter(error => error.fingerprint === fingerprint));
    });
    
    return matchingErrors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 50): ErrorReport[] {
    let allErrors: ErrorReport[] = [];
    
    this.errorStore.forEach(errors => {
      allErrors.push(...errors);
    });
    
    return allErrors
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, count);
  }

  /**
   * Mark error as resolved
   */
  markAsResolved(fingerprint: string, resolvedBy: string, notes?: string): boolean {
    const errors = this.getErrorsByFingerprint(fingerprint);
    if (errors.length === 0) return false;

    // Add resolution metadata to the most recent error of this fingerprint
    const mostRecent = errors[0];
    (mostRecent as any).resolution = {
      resolvedAt: new Date().toISOString(),
      resolvedBy,
      notes
    };

    return true;
  }

  /**
   * Clear old errors (cleanup)
   */
  cleanup(olderThanDays: number = 30) {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    this.errorStore.forEach((errors, key) => {
      const filteredErrors = errors.filter(error => new Date(error.timestamp) > cutoffDate);
      if (filteredErrors.length === 0) {
        this.errorStore.delete(key);
      } else if (filteredErrors.length !== errors.length) {
        this.errorStore.set(key, filteredErrors);
      }
    });
  }

  private setupDefaultIntegrations() {
    // Console integration for development
    if (process.env.NODE_ENV === 'development') {
      this.registerIntegration('console', async (error: ErrorReport) => {
        console.error(`🚨 Error Tracked [${error.id}]:`, {
          endpoint: error.endpoint,
          error: error.error.message,
          category: error.error.category,
          severity: error.error.severity,
          user: error.userId
        });
      });
    }

    // Webhook integration
    if (process.env.ERROR_WEBHOOK_URL) {
      this.registerIntegration('webhook', async (error: ErrorReport) => {
        try {
          await fetch(process.env.ERROR_WEBHOOK_URL!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(error)
          });
        } catch (err) {
          console.error('Failed to send error to webhook:', err);
        }
      });
    }

    // Sentry integration placeholder
    if (process.env.SENTRY_DSN) {
      this.registerIntegration('sentry', async (error: ErrorReport) => {
        try {
          // This would integrate with @sentry/nextjs
          // Sentry.captureException(error);
          console.log('Sentry integration would capture:', error.id);
        } catch (err) {
          console.error('Failed to send error to Sentry:', err);
        }
      });
    }
  }

  private storeError(error: ErrorReport) {
    const endpointKey = `${error.method}:${error.endpoint}`;
    
    if (!this.errorStore.has(endpointKey)) {
      this.errorStore.set(endpointKey, []);
    }
    
    const endpointErrors = this.errorStore.get(endpointKey)!;
    endpointErrors.push(error);
    
    // Keep only last 1000 errors per endpoint
    if (endpointErrors.length > 1000) {
      endpointErrors.splice(0, endpointErrors.length - 1000);
    }
  }

  private async sendToIntegrations(error: ErrorReport) {
    const promises = Array.from(this.integrations.entries()).map(async ([name, handler]) => {
      try {
        await handler(error);
      } catch (err) {
        console.error(`Error in integration '${name}':`, err);
      }
    });

    await Promise.allSettled(promises);
  }

  private generateErrorFingerprint(error: Error, endpoint: string): string {
    const components = [
      error.constructor.name,
      error.message.replace(/\d+/g, 'X'), // Replace numbers with X for grouping
      endpoint,
      error.stack?.split('\n')[1]?.trim() // First line of stack trace
    ].filter(Boolean);
    
    return Buffer.from(components.join('|')).toString('base64').slice(0, 16);
  }

  private categorizeError(error: Error): ErrorContext {
    const message = error.message.toLowerCase();
    const name = error.constructor.name.toLowerCase();

    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return { category: 'authentication', severity: 'medium', code: 'AUTH_ERROR' };
    }
    if (message.includes('validation') || name.includes('zod')) {
      return { category: 'validation', severity: 'low', code: 'VALIDATION_ERROR' };
    }
    if (message.includes('fetch') || message.includes('network')) {
      return { category: 'external_api', severity: 'medium', code: 'NETWORK_ERROR' };
    }
    if (message.includes('database') || message.includes('sql')) {
      return { category: 'database', severity: 'high', code: 'DB_ERROR' };
    }
    if (message.includes('memory') || message.includes('system')) {
      return { category: 'system', severity: 'critical', code: 'SYSTEM_ERROR' };
    }

    return { category: 'business_logic', severity: 'medium', code: 'UNKNOWN_ERROR' };
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sensitive = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized: Record<string, string> = {};
    
    Object.entries(headers).forEach(([key, value]) => {
      if (sensitive.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    if (typeof body === 'object') {
      const sanitized = { ...body };
      const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
      
      sensitiveFields.forEach(field => {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      });
      
      return sanitized;
    }
    
    return body;
  }
}

// Export singleton instance
export const errorTracker = ErrorTracker.getInstance();