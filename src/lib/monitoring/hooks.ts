/**
 * Monitoring Configuration Hooks
 * Provides centralized monitoring configuration sharing and coordination hooks
 */

import { logger } from './logger';
import { metrics } from './metrics';
import { errorTracker } from './errorTracking';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { logger } from '@/lib/logger';

export interface MonitoringHooksConfig {
  enableLogging: boolean;
  enableMetrics: boolean;
  enableErrorTracking: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  performanceThresholds: {
    responseTime: number;
    memoryUsage: number;
    errorRate: number;
  };
  alertThresholds: {
    criticalErrorCount: number;
    highMemoryUsage: number;
    slowResponseTime: number;
  };
  integrations: {
    webhook?: string;
    sentry?: boolean;
    datadog?: boolean;
    customLogger?: boolean;
  };
}

export class MonitoringHooks {
  private static instance: MonitoringHooks;
  private config: MonitoringHooksConfig;
  private subscribers: Map<string, (config: MonitoringHooksConfig) => void> = new Map();
  private sessionData: Map<string, any> = new Map();

  static getInstance(): MonitoringHooks {
    if (!MonitoringHooks.instance) {
      MonitoringHooks.instance = new MonitoringHooks();
    }
    return MonitoringHooks.instance;
  }

  constructor() {
    this.config = this.loadDefaultConfig();
    this.initializeHooks();
  }

  /**
   * Load default monitoring configuration
   */
  private loadDefaultConfig(): MonitoringHooksConfig {
    return {
      enableLogging: true,
      enableMetrics: true,
      enableErrorTracking: true,
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      performanceThresholds: {
        responseTime: parseInt(process.env.PERF_THRESHOLD_RESPONSE_TIME || '1000'),
        memoryUsage: parseInt(process.env.PERF_THRESHOLD_MEMORY || '85'),
        errorRate: parseFloat(process.env.PERF_THRESHOLD_ERROR_RATE || '5.0')
      },
      alertThresholds: {
        criticalErrorCount: parseInt(process.env.ALERT_CRITICAL_ERROR_COUNT || '10'),
        highMemoryUsage: parseInt(process.env.ALERT_HIGH_MEMORY || '90'),
        slowResponseTime: parseInt(process.env.ALERT_SLOW_RESPONSE || '5000')
      },
      integrations: {
        webhook: process.env.MONITORING_WEBHOOK_URL,
        sentry: !!process.env.SENTRY_DSN,
        datadog: !!process.env.DATADOG_API_KEY,
        customLogger: process.env.NODE_ENV === 'development'
      }
    };
  }

  /**
   * Initialize hooks and coordination
   */
  private initializeHooks() {
    // Set up periodic resource collection
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        if (this.config.enableMetrics) {
          metrics.collectResourceMetrics();
        }
      }, 60000); // Collect every minute
    }

    // Set up error cleanup
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        if (this.config.enableErrorTracking) {
          errorTracker.cleanup(30); // Keep 30 days of errors
        }
      }, 24 * 60 * 60 * 1000); // Daily cleanup
    }
  }

  /**
   * Pre-task hook - called before starting any API operation
   */
  async preTask(description: string, context?: Record<string, any>): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (this.config.enableLogging) {
      logger.logEvent(
        { 
          requestId: sessionId,
          endpoint: context?.endpoint || 'unknown',
          method: context?.method || 'unknown',
          timestamp: new Date().toISOString()
        },
        'task_started',
        { description, context }
      );
    }

    // Store session data
    this.sessionData.set(sessionId, {
      startTime: Date.now(),
      description,
      context
    });

    return sessionId;
  }

  /**
   * Post-task hook - called after completing any API operation
   */
  async postTask(sessionId: string, result?: any, error?: Error): Promise<void> {
    const session = this.sessionData.get(sessionId);
    if (!session) return;

    const duration = Date.now() - session.startTime;

    if (this.config.enableLogging) {
      if (error) {
        logger.logError(
          {
            requestId: sessionId,
            endpoint: session.context?.endpoint || 'unknown',
            method: session.context?.method || 'unknown',
            timestamp: new Date().toISOString()
          },
          error,
          {
            category: 'business_logic',
            severity: 'medium',
            code: 'TASK_ERROR'
          }
        );
      } else {
        logger.logEvent(
          {
            requestId: sessionId,
            endpoint: session.context?.endpoint || 'unknown',
            method: session.context?.method || 'unknown',
            timestamp: new Date().toISOString()
          },
          'task_completed',
          { description: session.description, duration, result }
        );
      }
    }

    // Check performance thresholds
    if (duration > this.config.alertThresholds.slowResponseTime) {
      await this.triggerAlert('slow_response', {
        sessionId,
        duration,
        threshold: this.config.alertThresholds.slowResponseTime,
        description: session.description
      });
    }

    // Cleanup session
    this.sessionData.delete(sessionId);
  }

  /**
   * Post-edit hook - called after file modifications
   */
  async postEdit(filePath: string, memoryKey?: string, changes?: any): Promise<void> {
    if (this.config.enableLogging) {
      logger.logEvent(
        {
          requestId: logger.generateRequestId(),
          endpoint: 'file_operation',
          method: 'EDIT',
          timestamp: new Date().toISOString()
        },
        'file_edited',
        { filePath, memoryKey, changes }
      );
    }

    // Store in memory if key provided
    if (memoryKey && changes) {
      this.sessionData.set(memoryKey, {
        timestamp: new Date().toISOString(),
        filePath,
        changes
      });
    }
  }

  /**
   * Notification hook - send notifications about important events
   */
  async notify(message: string, level: 'info' | 'warn' | 'error' = 'info', context?: any): Promise<void> {
    if (this.config.enableLogging) {
      const logContext = {
        requestId: logger.generateRequestId(),
        endpoint: 'notification',
        method: 'NOTIFY',
        timestamp: new Date().toISOString()
      };

      switch (level) {
        case 'error':
          logger.logError(logContext, new Error(message), {
            category: 'system',
            severity: 'medium',
            code: 'NOTIFICATION_ERROR'
          });
          break;
        case 'warn':
          logger.logEvent(logContext, 'warning_notification', { message, context });
          break;
        default:
          logger.logEvent(logContext, 'info_notification', { message, context });
      }
    }

    // Send to external integrations
    if (level === 'error' && this.config.integrations.webhook) {
      await this.sendWebhookNotification(message, context);
    }
  }

  /**
   * Session restore hook - restore session state
   */
  async sessionRestore(sessionId: string): Promise<any> {
    const data = this.sessionData.get(sessionId);
    
    if (this.config.enableLogging && data) {
      logger.logEvent(
        {
          requestId: logger.generateRequestId(),
          endpoint: 'session',
          method: 'RESTORE',
          timestamp: new Date().toISOString()
        },
        'session_restored',
        { sessionId, hasData: !!data }
      );
    }

    return data;
  }

  /**
   * Session end hook - cleanup and export metrics
   */
  async sessionEnd(sessionId: string, exportMetrics: boolean = false): Promise<any> {
    const session = this.sessionData.get(sessionId);
    let exportData = null;

    if (exportMetrics && this.config.enableMetrics) {
      exportData = {
        session,
        metrics: {
          systemHealth: metrics.getSystemHealth(),
          resourceUsage: metrics.getResourceHistory(1),
          errors: errorTracker.getRecentErrors(50)
        }
      };
    }

    if (this.config.enableLogging) {
      logger.logEvent(
        {
          requestId: logger.generateRequestId(),
          endpoint: 'session',
          method: 'END',
          timestamp: new Date().toISOString()
        },
        'session_ended',
        { sessionId, exportMetrics, hasExportData: !!exportData }
      );
    }

    // Cleanup
    this.sessionData.delete(sessionId);

    return exportData;
  }

  /**
   * Get current monitoring configuration
   */
  getConfig(): MonitoringHooksConfig {
    return { ...this.config };
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(updates: Partial<MonitoringHooksConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Notify subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(this.config);
      } catch (error) {
        logger.error('Error notifying config subscriber:', error);
      }
    });

    if (this.config.enableLogging) {
      logger.logEvent(
        {
          requestId: logger.generateRequestId(),
          endpoint: 'config',
          method: 'UPDATE',
          timestamp: new Date().toISOString()
        },
        'config_updated',
        { updates }
      );
    }
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(id: string, callback: (config: MonitoringHooksConfig) => void): void {
    this.subscribers.set(id, callback);
  }

  /**
   * Unsubscribe from configuration changes
   */
  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  /**
   * Trigger monitoring alert
   */
  private async triggerAlert(type: string, data: any): Promise<void> {
    if (this.config.enableLogging) {
      logger.logEvent(
        {
          requestId: logger.generateRequestId(),
          endpoint: 'alert',
          method: 'TRIGGER',
          timestamp: new Date().toISOString()
        },
        `alert_${type}`,
        data
      );
    }

    // Send to webhook if configured
    if (this.config.integrations.webhook) {
      await this.sendWebhookNotification(`Alert: ${type}`, data);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(message: string, data?: any): Promise<void> {
    if (!this.config.integrations.webhook) return;

    try {
      await fetch(this.config.integrations.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          service: 'describe-it-api',
          message,
          data
        })
      });
    } catch (error) {
      logger.error('Failed to send webhook notification:', error);
    }
  }

  /**
   * Get session memory data
   */
  getMemoryData(key: string): any {
    return this.sessionData.get(key);
  }

  /**
   * Set session memory data
   */
  setMemoryData(key: string, data: any): void {
    this.sessionData.set(key, data);
  }

  /**
   * Clear all session data
   */
  clearSessionData(): void {
    this.sessionData.clear();
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    activeSessions: number;
    memoryDataSize: number;
    subscriberCount: number;
    configLastUpdated: string;
    hooksEnabled: {
      logging: boolean;
      metrics: boolean;
      errorTracking: boolean;
    };
  } {
    return {
      activeSessions: this.sessionData.size,
      memoryDataSize: safeStringify(Array.from(this.sessionData.values())).length,
      subscriberCount: this.subscribers.size,
      configLastUpdated: new Date().toISOString(), // Would track actual last update in real implementation
      hooksEnabled: {
        logging: this.config.enableLogging,
        metrics: this.config.enableMetrics,
        errorTracking: this.config.enableErrorTracking
      }
    };
  }
}

// Export singleton instance
export const monitoringHooks = MonitoringHooks.getInstance();

// Export hook functions for easy use
export const hooks = {
  preTask: (description: string, context?: any) => monitoringHooks.preTask(description, context),
  postTask: (sessionId: string, result?: any, error?: Error) => monitoringHooks.postTask(sessionId, result, error),
  postEdit: (filePath: string, memoryKey?: string, changes?: any) => monitoringHooks.postEdit(filePath, memoryKey, changes),
  notify: (message: string, level?: 'info' | 'warn' | 'error', context?: any) => monitoringHooks.notify(message, level, context),
  sessionRestore: (sessionId: string) => monitoringHooks.sessionRestore(sessionId),
  sessionEnd: (sessionId: string, exportMetrics?: boolean) => monitoringHooks.sessionEnd(sessionId, exportMetrics),
  getConfig: () => monitoringHooks.getConfig(),
  updateConfig: (updates: Partial<MonitoringHooksConfig>) => monitoringHooks.updateConfig(updates),
  getStats: () => monitoringHooks.getMonitoringStats()
};