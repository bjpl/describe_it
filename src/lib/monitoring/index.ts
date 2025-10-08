/**
 * Monitoring System Exports
 * Centralized exports for the complete monitoring and logging system
 */

// Core monitoring components
export { structuredLogger, structuredLogger as logger, StructuredLogger, type LogContext, type PerformanceMetrics, type ErrorContext } from './logger';
export { metrics, MetricsCollector, type APIMetrics, type ResourceMetrics, type ErrorMetrics } from './metrics';
export { errorTracker, ErrorTracker, type ErrorReport, type ErrorAnalytics } from './errorTracking';

// Middleware and integrations
export {
  withMonitoring,
  withRateLimit,
  type AuthenticatedRequest
} from './middleware';

// Re-export MonitoringConfig from middleware for external use
export type { MonitoringConfig } from './middleware';

// Hooks and configuration
export { 
  monitoringHooks, 
  hooks, 
  type MonitoringHooksConfig 
} from './hooks';

// Import structuredLogger for bindings
import { structuredLogger } from './logger';
import { metrics } from './metrics';
import { errorTracker } from './errorTracking';
import { monitoringHooks } from './hooks';
import type { MonitoringConfig as MonitoringConfigType } from './middleware';

// Convenience functions for common monitoring tasks
export const monitoring = {
  // Quick logging
  logRequest: structuredLogger.logRequest.bind(structuredLogger),
  logResponse: structuredLogger.logResponse.bind(structuredLogger),
  logError: structuredLogger.logError.bind(structuredLogger),
  logEvent: structuredLogger.logEvent.bind(structuredLogger),
  logSecurity: structuredLogger.logSecurity.bind(structuredLogger),

  // Quick metrics
  startRequest: metrics.startRequest.bind(metrics),
  endRequest: metrics.endRequest.bind(metrics),
  getSystemHealth: metrics.getSystemHealth.bind(metrics),
  getEndpointSummary: metrics.getEndpointSummary.bind(metrics),

  // Quick error tracking
  trackError: errorTracker.trackError.bind(errorTracker),
  getRecentErrors: errorTracker.getRecentErrors.bind(errorTracker),
  getErrorAnalytics: errorTracker.getErrorAnalytics.bind(errorTracker),

  // Configuration
  getConfig: monitoringHooks.getConfig.bind(monitoringHooks),
  updateConfig: monitoringHooks.updateConfig.bind(monitoringHooks),

  // Utilities
  generateRequestId: structuredLogger.generateRequestId.bind(structuredLogger),
  createLogContext: structuredLogger.createLogContext.bind(structuredLogger)
};

// Default monitoring middleware configuration
export const defaultMonitoringConfig: MonitoringConfigType = {
  enableRequestLogging: true,
  enableResponseLogging: true,
  enablePerformanceTracking: true,
  enableErrorTracking: true,
  performanceThreshold: 1000,
  excludeHeaders: ['authorization', 'cookie', 'x-api-key'],
  includeBody: process.env.NODE_ENV === 'development',
  maxBodySize: 10 * 1024 // 10KB
};

// Health check helpers
export const healthChecks = {
  async checkAPIHealth() {
    const health = metrics.getSystemHealth();
    return {
      status: health.alerts.length === 0 ? 'healthy' : 'degraded',
      uptime: health.uptime,
      memory: health.memory,
      requests: health.requests,
      alerts: health.alerts
    };
  },
  
  async checkDependencies() {
    return {
      openai: !!process.env.OPENAI_API_KEY,
      supabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
      monitoring: true
    };
  }
};

// Monitoring statistics
export const monitoringStats = {
  getOverview() {
    const systemHealth = metrics.getSystemHealth();
    const errorAnalytics = errorTracker.getErrorAnalytics();
    const hooksStats = monitoringHooks.getMonitoringStats();
    
    return {
      system: {
        uptime: systemHealth.uptime,
        memory: systemHealth.memory.current,
        activeRequests: systemHealth.requests.active,
        totalRequestsToday: systemHealth.requests.totalToday
      },
      errors: {
        total: errorAnalytics.totalErrors,
        byCategory: errorAnalytics.errorsByCategory,
        bySeverity: errorAnalytics.errorsBySeverity
      },
      monitoring: {
        activeSessions: hooksStats.activeSessions,
        subscriberCount: hooksStats.subscriberCount,
        hooksEnabled: hooksStats.hooksEnabled
      }
    };
  }
};