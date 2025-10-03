/**
 * Alert System for Monitoring and Performance Issues
 * Provides real-time alerting for errors, performance degradation, and system issues
 */

import { supabase } from '@/lib/supabase';
import { captureError } from './sentry';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { logger } from '@/lib/logger';

export interface Alert {
  id?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  threshold?: number;
  currentValue?: number;
  triggerCount?: number;
  acknowledged?: boolean;
  resolved?: boolean;
  createdAt?: Date;
}

export type AlertType = 
  | 'high_error_rate'
  | 'performance_degradation' 
  | 'api_limit_exceeded'
  | 'memory_usage_high'
  | 'database_slow'
  | 'critical_error'
  | 'user_experience_poor'
  | 'security_incident'
  | 'service_down';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AlertRule {
  type: AlertType;
  severity: AlertSeverity;
  threshold: number;
  timeWindow: number; // minutes
  condition: 'greater_than' | 'less_than' | 'equals' | 'percentage';
  enabled: boolean;
  cooldown: number; // minutes
}

const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    type: 'high_error_rate',
    severity: 'high',
    threshold: 5, // 5% error rate
    timeWindow: 10,
    condition: 'greater_than',
    enabled: true,
    cooldown: 15,
  },
  {
    type: 'performance_degradation',
    severity: 'medium',
    threshold: 2000, // 2 seconds response time
    timeWindow: 5,
    condition: 'greater_than',
    enabled: true,
    cooldown: 10,
  },
  {
    type: 'critical_error',
    severity: 'critical',
    threshold: 1, // Any critical error
    timeWindow: 1,
    condition: 'greater_than',
    enabled: true,
    cooldown: 5,
  },
  {
    type: 'memory_usage_high',
    severity: 'medium',
    threshold: 85, // 85% memory usage
    timeWindow: 5,
    condition: 'greater_than',
    enabled: true,
    cooldown: 20,
  },
  {
    type: 'api_limit_exceeded',
    severity: 'high',
    threshold: 90, // 90% of API limit
    timeWindow: 60,
    condition: 'greater_than',
    enabled: true,
    cooldown: 30,
  },
];

class AlertManager {
  private rules: AlertRule[] = DEFAULT_ALERT_RULES;
  private alertCooldowns: Map<string, number> = new Map();
  private isEnabled: boolean = true;

  constructor() {
    if (typeof window === 'undefined') {
      // Server-side initialization
      this.loadRulesFromDatabase();
    }
  }

  private async loadRulesFromDatabase() {
    try {
      // In a real implementation, you might store rules in the database
      // For now, we'll use the default rules
      this.rules = DEFAULT_ALERT_RULES;
    } catch (error) {
      logger.error('Failed to load alert rules:', error);
    }
  }

  public async checkMetric(
    type: AlertType,
    value: number,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    if (!this.isEnabled) return false;

    const rule = this.rules.find(r => r.type === type && r.enabled);
    if (!rule) return false;

    // Check cooldown
    const cooldownKey = `${type}_${JSON.stringify(metadata?.context || {})}`;
    const lastTriggered = this.alertCooldowns.get(cooldownKey);
    const now = Date.now();
    
    if (lastTriggered && (now - lastTriggered) < rule.cooldown * 60 * 1000) {
      return false; // Still in cooldown
    }

    // Check threshold
    const shouldTrigger = this.evaluateCondition(value, rule.threshold, rule.condition);
    
    if (shouldTrigger) {
      await this.triggerAlert({
        type,
        severity: rule.severity,
        title: this.generateAlertTitle(type, value, rule.threshold),
        message: this.generateAlertMessage(type, value, rule, metadata),
        threshold: rule.threshold,
        currentValue: value,
        metadata,
      });

      this.alertCooldowns.set(cooldownKey, now);
      return true;
    }

    return false;
  }

  private evaluateCondition(
    value: number,
    threshold: number,
    condition: AlertRule['condition']
  ): boolean {
    switch (condition) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return value === threshold;
      case 'percentage':
        return (value / threshold) * 100 > 100;
      default:
        return false;
    }
  }

  private generateAlertTitle(type: AlertType, value: number, threshold: number): string {
    const titles: Record<AlertType, string> = {
      high_error_rate: `High Error Rate: ${value.toFixed(1)}%`,
      performance_degradation: `Performance Issue: ${value}ms response time`,
      api_limit_exceeded: `API Limit Warning: ${value}% usage`,
      memory_usage_high: `High Memory Usage: ${value.toFixed(1)}%`,
      database_slow: `Database Performance Issue: ${value}ms query time`,
      critical_error: `Critical Error Occurred`,
      user_experience_poor: `Poor User Experience: ${value} score`,
      security_incident: `Security Alert: ${type}`,
      service_down: `Service Unavailable`,
    };

    return titles[type] || `Alert: ${type}`;
  }

  private generateAlertMessage(
    type: AlertType,
    value: number,
    rule: AlertRule,
    metadata?: Record<string, any>
  ): string {
    const baseMessage = `${type.replace(/_/g, ' ').toUpperCase()} detected.`;
    const thresholdMessage = `Current value: ${value}, Threshold: ${rule.threshold}`;
    const timeMessage = `Time window: ${rule.timeWindow} minutes`;
    
    let contextMessage = '';
    if (metadata) {
      if (metadata.endpoint) contextMessage += ` Endpoint: ${metadata.endpoint}`;
      if (metadata.component) contextMessage += ` Component: ${metadata.component}`;
      if (metadata.userId) contextMessage += ` User: ${metadata.userId}`;
    }

    return `${baseMessage} ${thresholdMessage}. ${timeMessage}.${contextMessage}`;
  }

  public async triggerAlert(alert: Omit<Alert, 'id' | 'createdAt'>): Promise<string | null> {
    try {
      // Store alert in database
      const { data, error } = await supabase
        .from('system_alerts')
        .insert({
          alert_type: alert.type,
          severity: alert.severity,
          message: `${alert.title}: ${alert.message}`,
          event_data: {
            title: alert.title,
            metadata: alert.metadata,
            threshold: alert.threshold,
            currentValue: alert.currentValue,
          },
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        logger.error('Failed to store alert:', error);
        return null;
      }

      const alertId = data?.id;

      // Send notifications based on severity
      await this.sendNotifications(alert, alertId);

      // Log alert for debugging
      logger.warn(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`, {
        type: alert.type,
        message: alert.message,
        metadata: alert.metadata,
      });

      return alertId;

    } catch (error) {
      logger.error('Failed to trigger alert:', error);
      captureError(error as Error, {
        alertType: alert.type,
        alertSeverity: alert.severity,
      });
      return null;
    }
  }

  private async sendNotifications(alert: Omit<Alert, 'id' | 'createdAt'>, alertId?: string) {
    // Critical and high severity alerts trigger immediate notifications
    if (alert.severity === 'critical' || alert.severity === 'high') {
      await this.sendImmediateNotification(alert, alertId);
    }

    // All alerts are logged for dashboard display
    await this.logAlertForDashboard(alert, alertId);
  }

  private async sendImmediateNotification(alert: Omit<Alert, 'id' | 'createdAt'>, alertId?: string) {
    // In production, implement:
    // - Email notifications
    // - Slack/Discord webhooks
    // - SMS for critical alerts
    // - PagerDuty integration
    // - Push notifications

    try {
      // Example webhook notification (implement based on your needs)
      if (process.env.ALERT_WEBHOOK_URL) {
        await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alertId,
            type: alert.type,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            timestamp: new Date().toISOString(),
            metadata: alert.metadata,
          }),
        });
      }

      // Example email notification (implement with your email service)
      if (process.env.ALERT_EMAIL && alert.severity === 'critical') {
        // await sendEmailAlert(alert);
      }

    } catch (error) {
      logger.error('Failed to send immediate notification:', error);
    }
  }

  private async logAlertForDashboard(alert: Omit<Alert, 'id' | 'createdAt'>, alertId?: string) {
    // Store in a format that the admin dashboard can easily consume
    try {
      // This could be stored in a separate table or sent to a real-time system
      logger.info('Dashboard Alert:', { alertId, ...alert });
    } catch (error) {
      logger.error('Failed to log alert for dashboard:', error);
    }
  }

  public async acknowledgeAlert(alertId: string, userId?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_alerts')
        .update({
          acknowledged: true,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      return !error;
    } catch (error) {
      logger.error('Failed to acknowledge alert:', error);
      return false;
    }
  }

  public async resolveAlert(alertId: string, userId?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_alerts')
        .update({
          resolved: true,
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      return !error;
    } catch (error) {
      logger.error('Failed to resolve alert:', error);
      return false;
    }
  }

  public async getActiveAlerts(): Promise<Alert[]> {
    try {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('Failed to get active alerts:', error);
        return [];
      }

      return data?.map(row => ({
        id: row.id,
        type: row.alert_type,
        severity: row.severity,
        title: row.event_data?.title || row.alert_type,
        message: row.message,
        metadata: row.event_data?.metadata,
        threshold: row.event_data?.threshold,
        currentValue: row.event_data?.currentValue,
        acknowledged: row.acknowledged,
        resolved: row.resolved,
        createdAt: new Date(row.created_at),
      })) || [];

    } catch (error) {
      logger.error('Failed to get active alerts:', error);
      return [];
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public updateRules(rules: AlertRule[]) {
    this.rules = rules;
  }
}

// Global alert manager instance
export const alertManager = new AlertManager();

// Convenience functions for common alerts
export const AlertHelpers = {
  checkErrorRate: async (errorRate: number, context?: Record<string, any>) => {
    return alertManager.checkMetric('high_error_rate', errorRate, context);
  },

  checkResponseTime: async (responseTime: number, endpoint?: string) => {
    return alertManager.checkMetric('performance_degradation', responseTime, { endpoint });
  },

  checkMemoryUsage: async (memoryPercent: number) => {
    return alertManager.checkMetric('memory_usage_high', memoryPercent);
  },

  reportCriticalError: async (error: Error, component?: string) => {
    return alertManager.triggerAlert({
      type: 'critical_error',
      severity: 'critical',
      title: 'Critical Error Occurred',
      message: `Critical error in ${component || 'application'}: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack,
        component,
      },
    });
  },

  checkApiUsage: async (usagePercent: number, apiName?: string) => {
    return alertManager.checkMetric('api_limit_exceeded', usagePercent, { apiName });
  },
};

export default alertManager;