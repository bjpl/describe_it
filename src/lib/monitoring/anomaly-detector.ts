/**
 * Statistical anomaly detection for API usage patterns
 * Implements multiple algorithms for fraud detection and suspicious activity monitoring
 */

import Redis from 'ioredis';
import { recordSuspiciousActivity, recordBlockedRequest } from './prometheus';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

export interface AnomalyPattern {
  id: string;
  name: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
  action: 'log' | 'alert' | 'block';
  enabled: boolean;
}

export interface UsageMetrics {
  requestCount: number;
  errorRate: number;
  avgResponseTime: number;
  uniqueEndpoints: number;
  timespan: number;
  timestamp: number;
}

export interface AnomalyAlert {
  id: string;
  patternId: string;
  identifier: string;
  severity: 'low' | 'medium' | 'high';
  score: number;
  threshold: number;
  message: string;
  metadata: Record<string, any>;
  timestamp: number;
}

export class AnomalyDetector {
  private redis: Redis;
  private patterns: Map<string, AnomalyPattern> = new Map();
  private alertCallbacks: Array<(alert: AnomalyAlert) => void> = [];

  constructor(redisConfig?: any) {
    this.redis = new Redis(redisConfig || {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    this.initializeDefaultPatterns();
  }

  /**
   * Initialize default anomaly detection patterns
   */
  private initializeDefaultPatterns(): void {
    const defaultPatterns: AnomalyPattern[] = [
      {
        id: 'high_request_rate',
        name: 'Abnormally High Request Rate',
        threshold: 3.0, // 3 standard deviations
        severity: 'high',
        action: 'alert',
        enabled: true
      },
      {
        id: 'error_rate_spike',
        name: 'Error Rate Spike',
        threshold: 2.5,
        severity: 'high',
        action: 'alert',
        enabled: true
      },
      {
        id: 'unusual_endpoints',
        name: 'Unusual Endpoint Access Pattern',
        threshold: 2.0,
        severity: 'medium',
        action: 'log',
        enabled: true
      },
      {
        id: 'off_hours_activity',
        name: 'Suspicious Off-Hours Activity',
        threshold: 1.5,
        severity: 'medium',
        action: 'log',
        enabled: true
      },
      {
        id: 'geographic_anomaly',
        name: 'Geographic Usage Anomaly',
        threshold: 2.5,
        severity: 'high',
        action: 'block',
        enabled: true
      },
      {
        id: 'token_abuse',
        name: 'Token Usage Abuse Pattern',
        threshold: 3.0,
        severity: 'high',
        action: 'block',
        enabled: true
      },
      {
        id: 'rapid_key_rotation',
        name: 'Rapid API Key Rotation',
        threshold: 2.0,
        severity: 'medium',
        action: 'alert',
        enabled: true
      }
    ];

    defaultPatterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });
  }

  /**
   * Record usage metrics for an identifier
   */
  async recordUsage(
    identifier: string,
    metrics: Omit<UsageMetrics, 'timestamp'>
  ): Promise<void> {
    try {
      const key = `anomaly:usage:${identifier}`;
      const timestampedMetrics: UsageMetrics = {
        ...metrics,
        timestamp: Date.now()
      };

      await this.redis.lpush(key, JSON.stringify(timestampedMetrics));
      await this.redis.ltrim(key, 0, 99); // Keep last 100 entries
      await this.redis.expire(key, 24 * 60 * 60); // 24 hours

      // Trigger anomaly detection
      await this.detectAnomalies(identifier);
    } catch (error) {
      console.error('Failed to record usage metrics:', error);
    }
  }

  /**
   * Detect anomalies for a specific identifier
   */
  async detectAnomalies(identifier: string): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];

    try {
      const recentMetrics = await this.getRecentMetrics(identifier, 50);
      if (recentMetrics.length < 10) {
        return alerts; // Not enough data for meaningful analysis
      }

      for (const [patternId, pattern] of this.patterns) {
        if (!pattern.enabled) continue;

        let alert: AnomalyAlert | null = null;

        switch (patternId) {
          case 'high_request_rate':
            alert = await this.detectHighRequestRate(identifier, pattern, recentMetrics);
            break;
          case 'error_rate_spike':
            alert = await this.detectErrorRateSpike(identifier, pattern, recentMetrics);
            break;
          case 'unusual_endpoints':
            alert = await this.detectUnusualEndpoints(identifier, pattern, recentMetrics);
            break;
          case 'off_hours_activity':
            alert = await this.detectOffHoursActivity(identifier, pattern, recentMetrics);
            break;
          case 'geographic_anomaly':
            alert = await this.detectGeographicAnomaly(identifier, pattern);
            break;
          case 'token_abuse':
            alert = await this.detectTokenAbuse(identifier, pattern, recentMetrics);
            break;
          case 'rapid_key_rotation':
            alert = await this.detectRapidKeyRotation(identifier, pattern);
            break;
        }

        if (alert) {
          alerts.push(alert);
          await this.handleAlert(alert);
        }
      }
    } catch (error) {
      console.error('Anomaly detection failed:', error);
    }

    return alerts;
  }

  /**
   * Detect abnormally high request rate using z-score
   */
  private async detectHighRequestRate(
    identifier: string,
    pattern: AnomalyPattern,
    metrics: UsageMetrics[]
  ): Promise<AnomalyAlert | null> {
    const requestCounts = metrics.map(m => m.requestCount);
    const stats = this.calculateStats(requestCounts);
    
    const currentRate = metrics[0]?.requestCount || 0;
    const zScore = Math.abs((currentRate - stats.mean) / stats.stdDev);

    if (zScore > pattern.threshold) {
      return {
        id: `${identifier}-${pattern.id}-${Date.now()}`,
        patternId: pattern.id,
        identifier,
        severity: pattern.severity,
        score: zScore,
        threshold: pattern.threshold,
        message: `Request rate ${currentRate} is ${zScore.toFixed(2)} standard deviations above normal (${stats.mean.toFixed(2)})`,
        metadata: { currentRate, normalRate: stats.mean, zScore },
        timestamp: Date.now()
      };
    }

    return null;
  }

  /**
   * Detect error rate spikes
   */
  private async detectErrorRateSpike(
    identifier: string,
    pattern: AnomalyPattern,
    metrics: UsageMetrics[]
  ): Promise<AnomalyAlert | null> {
    const errorRates = metrics.map(m => m.errorRate);
    const stats = this.calculateStats(errorRates);
    
    const currentErrorRate = metrics[0]?.errorRate || 0;
    const zScore = Math.abs((currentErrorRate - stats.mean) / stats.stdDev);

    if (zScore > pattern.threshold && currentErrorRate > 0.1) { // Only alert if error rate > 10%
      return {
        id: `${identifier}-${pattern.id}-${Date.now()}`,
        patternId: pattern.id,
        identifier,
        severity: pattern.severity,
        score: zScore,
        threshold: pattern.threshold,
        message: `Error rate ${(currentErrorRate * 100).toFixed(1)}% is unusually high`,
        metadata: { currentErrorRate, normalErrorRate: stats.mean, zScore },
        timestamp: Date.now()
      };
    }

    return null;
  }

  /**
   * Detect unusual endpoint access patterns
   */
  private async detectUnusualEndpoints(
    identifier: string,
    pattern: AnomalyPattern,
    metrics: UsageMetrics[]
  ): Promise<AnomalyAlert | null> {
    const endpointCounts = metrics.map(m => m.uniqueEndpoints);
    const stats = this.calculateStats(endpointCounts);
    
    const currentEndpoints = metrics[0]?.uniqueEndpoints || 0;
    const zScore = Math.abs((currentEndpoints - stats.mean) / stats.stdDev);

    if (zScore > pattern.threshold) {
      return {
        id: `${identifier}-${pattern.id}-${Date.now()}`,
        patternId: pattern.id,
        identifier,
        severity: pattern.severity,
        score: zScore,
        threshold: pattern.threshold,
        message: `Accessing ${currentEndpoints} unique endpoints, significantly different from normal pattern`,
        metadata: { currentEndpoints, normalEndpoints: stats.mean, zScore },
        timestamp: Date.now()
      };
    }

    return null;
  }

  /**
   * Detect off-hours suspicious activity
   */
  private async detectOffHoursActivity(
    identifier: string,
    pattern: AnomalyPattern,
    metrics: UsageMetrics[]
  ): Promise<AnomalyAlert | null> {
    const now = new Date();
    const hour = now.getHours();
    const isOffHours = hour < 6 || hour > 22; // Consider 10 PM - 6 AM as off-hours

    if (!isOffHours) return null;

    const recentActivity = metrics.slice(0, 5); // Last 5 data points
    const totalRequests = recentActivity.reduce((sum, m) => sum + m.requestCount, 0);

    if (totalRequests > 50) { // Arbitrary threshold for off-hours activity
      return {
        id: `${identifier}-${pattern.id}-${Date.now()}`,
        patternId: pattern.id,
        identifier,
        severity: pattern.severity,
        score: totalRequests / 10, // Simple scoring
        threshold: pattern.threshold,
        message: `High activity (${totalRequests} requests) detected during off-hours`,
        metadata: { hour, totalRequests, isOffHours },
        timestamp: Date.now()
      };
    }

    return null;
  }

  /**
   * Detect geographic anomalies (placeholder - would need IP geolocation data)
   */
  private async detectGeographicAnomaly(
    identifier: string,
    pattern: AnomalyPattern
  ): Promise<AnomalyAlert | null> {
    // This would require IP geolocation data and historical location patterns
    // For now, return null - implement when geolocation data is available
    return null;
  }

  /**
   * Detect token usage abuse patterns
   */
  private async detectTokenAbuse(
    identifier: string,
    pattern: AnomalyPattern,
    metrics: UsageMetrics[]
  ): Promise<AnomalyAlert | null> {
    const avgResponseTimes = metrics.map(m => m.avgResponseTime);
    const stats = this.calculateStats(avgResponseTimes);
    
    // Look for patterns that might indicate token farming or abuse
    const currentResponseTime = metrics[0]?.avgResponseTime || 0;
    const recentRequests = metrics.slice(0, 10).reduce((sum, m) => sum + m.requestCount, 0);
    
    // Heuristic: High request count with unusually low response times might indicate automation
    if (recentRequests > 100 && currentResponseTime < stats.mean * 0.5) {
      return {
        id: `${identifier}-${pattern.id}-${Date.now()}`,
        patternId: pattern.id,
        identifier,
        severity: pattern.severity,
        score: recentRequests / currentResponseTime,
        threshold: pattern.threshold,
        message: `Potential token abuse: ${recentRequests} requests with unusually low response times`,
        metadata: { recentRequests, currentResponseTime, normalResponseTime: stats.mean },
        timestamp: Date.now()
      };
    }

    return null;
  }

  /**
   * Detect rapid API key rotation (placeholder)
   */
  private async detectRapidKeyRotation(
    identifier: string,
    pattern: AnomalyPattern
  ): Promise<AnomalyAlert | null> {
    // This would require tracking API key usage patterns
    // For now, return null - implement when key rotation tracking is available
    return null;
  }

  /**
   * Handle detected alert based on pattern action
   */
  private async handleAlert(alert: AnomalyAlert): Promise<void> {
    try {
      // Record in metrics
      recordSuspiciousActivity(alert.patternId, alert.severity);

      // Store alert in Redis
      const alertKey = `anomaly:alerts:${alert.identifier}`;
      await this.redis.lpush(alertKey, JSON.stringify(alert));
      await this.redis.ltrim(alertKey, 0, 49); // Keep last 50 alerts
      await this.redis.expire(alertKey, 7 * 24 * 60 * 60); // 7 days

      // Execute action based on pattern
      const pattern = this.patterns.get(alert.patternId);
      if (pattern?.action === 'block') {
        await this.blockIdentifier(alert.identifier, 60 * 60 * 1000); // Block for 1 hour
        recordBlockedRequest('anomaly_detection', this.hashString(alert.identifier));
      }

      // Notify callbacks
      this.alertCallbacks.forEach(callback => {
        try {
          callback(alert);
        } catch (error) {
          console.error('Alert callback failed:', error);
        }
      });

      console.log(`Anomaly detected: ${alert.message}`, {
        identifier: alert.identifier,
        severity: alert.severity,
        score: alert.score
      });
    } catch (error) {
      console.error('Failed to handle alert:', error);
    }
  }

  /**
   * Block an identifier for suspicious activity
   */
  private async blockIdentifier(identifier: string, durationMs: number): Promise<void> {
    try {
      const blockKey = `anomaly:blocked:${identifier}`;
      await this.redis.setex(blockKey, Math.ceil(durationMs / 1000), '1');
    } catch (error) {
      console.error('Failed to block identifier:', error);
    }
  }

  /**
   * Check if an identifier is blocked
   */
  async isBlocked(identifier: string): Promise<boolean> {
    try {
      const blockKey = `anomaly:blocked:${identifier}`;
      const blocked = await this.redis.get(blockKey);
      return blocked === '1';
    } catch (error) {
      console.error('Failed to check block status:', error);
      return false;
    }
  }

  /**
   * Get recent metrics for an identifier
   */
  private async getRecentMetrics(identifier: string, limit: number = 50): Promise<UsageMetrics[]> {
    try {
      const key = `anomaly:usage:${identifier}`;
      const data = await this.redis.lrange(key, 0, limit - 1);
      return data.map(item => JSON.parse(item)).reverse(); // Reverse to get chronological order
    } catch (error) {
      console.error('Failed to get recent metrics:', error);
      return [];
    }
  }

  /**
   * Get recent alerts for an identifier
   */
  async getRecentAlerts(identifier: string, limit: number = 10): Promise<AnomalyAlert[]> {
    try {
      const key = `anomaly:alerts:${identifier}`;
      const data = await this.redis.lrange(key, 0, limit - 1);
      return data.map(item => JSON.parse(item));
    } catch (error) {
      console.error('Failed to get recent alerts:', error);
      return [];
    }
  }

  /**
   * Calculate basic statistics (mean, standard deviation)
   */
  private calculateStats(values: number[]): { mean: number; stdDev: number } {
    if (values.length === 0) return { mean: 0, stdDev: 0 };

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev: stdDev || 1 }; // Avoid division by zero
  }

  /**
   * Hash string for privacy
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Add alert callback
   */
  onAlert(callback: (alert: AnomalyAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Update pattern configuration
   */
  updatePattern(patternId: string, updates: Partial<AnomalyPattern>): void {
    const existing = this.patterns.get(patternId);
    if (existing) {
      this.patterns.set(patternId, { ...existing, ...updates });
    }
  }

  /**
   * Get all patterns
   */
  getPatterns(): AnomalyPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export default AnomalyDetector;