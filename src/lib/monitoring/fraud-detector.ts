/**
 * Advanced fraud detection system for API abuse and suspicious patterns
 * Implements machine learning-like heuristics for detecting fraudulent usage
 */

import Redis from 'ioredis';
import { recordSuspiciousActivity, recordBlockedRequest } from './prometheus';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { logger } from '@/lib/logger';

export interface FraudRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high';
  action: 'log' | 'alert' | 'block' | 'throttle';
  threshold: number;
  timeWindowMs: number;
  cooldownMs: number;
  metadata?: Record<string, any>;
}

export interface FraudEvent {
  id: string;
  ruleId: string;
  identifier: string;
  score: number;
  evidence: Record<string, any>;
  timestamp: number;
  blocked: boolean;
  resolved: boolean;
}

export interface UserBehaviorProfile {
  identifier: string;
  firstSeen: number;
  lastSeen: number;
  totalRequests: number;
  avgRequestsPerHour: number;
  peakHour: number;
  commonEndpoints: string[];
  avgResponseTime: number;
  errorRate: number;
  typicalDays: number[];
  suspiciousFlags: number;
  riskScore: number;
}

export class FraudDetector {
  private redis: Redis;
  private rules: Map<string, FraudRule> = new Map();
  private profiles: Map<string, UserBehaviorProfile> = new Map();
  private alertCallbacks: Array<(event: FraudEvent) => void> = [];

  constructor(redisConfig?: any) {
    this.redis = new Redis(redisConfig || {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    this.initializeDefaultRules();
  }

  /**
   * Initialize default fraud detection rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: FraudRule[] = [
      {
        id: 'rapid_fire_requests',
        name: 'Rapid Fire API Requests',
        description: 'Detects extremely high request rates that may indicate bot activity',
        enabled: true,
        severity: 'high',
        action: 'block',
        threshold: 100, // requests per minute
        timeWindowMs: 60 * 1000,
        cooldownMs: 10 * 60 * 1000,
      },
      {
        id: 'token_farming',
        name: 'Token Farming Pattern',
        description: 'Detects patterns consistent with token farming or abuse',
        enabled: true,
        severity: 'high',
        action: 'block',
        threshold: 10000, // tokens per hour
        timeWindowMs: 60 * 60 * 1000,
        cooldownMs: 60 * 60 * 1000,
      },
      {
        id: 'unusual_timing',
        name: 'Unusual Access Timing',
        description: 'Detects access patterns outside normal business hours',
        enabled: true,
        severity: 'medium',
        action: 'alert',
        threshold: 500, // requests during off-hours
        timeWindowMs: 8 * 60 * 60 * 1000, // 8-hour window
        cooldownMs: 4 * 60 * 60 * 1000,
      },
      {
        id: 'endpoint_scanning',
        name: 'Endpoint Scanning',
        description: 'Detects attempts to discover or enumerate API endpoints',
        enabled: true,
        severity: 'medium',
        action: 'throttle',
        threshold: 20, // unique endpoints in short time
        timeWindowMs: 5 * 60 * 1000,
        cooldownMs: 30 * 60 * 1000,
      },
      {
        id: 'error_farming',
        name: 'Intentional Error Generation',
        description: 'Detects patterns of intentional error generation',
        enabled: true,
        severity: 'medium',
        action: 'alert',
        threshold: 0.5, // 50% error rate
        timeWindowMs: 10 * 60 * 1000,
        cooldownMs: 20 * 60 * 1000,
      },
      {
        id: 'credential_stuffing',
        name: 'Credential Stuffing Attack',
        description: 'Detects attempts to use multiple stolen API keys',
        enabled: true,
        severity: 'high',
        action: 'block',
        threshold: 5, // different API keys from same source
        timeWindowMs: 10 * 60 * 1000,
        cooldownMs: 60 * 60 * 1000,
      },
      {
        id: 'resource_exhaustion',
        name: 'Resource Exhaustion Attack',
        description: 'Detects attempts to exhaust system resources',
        enabled: true,
        severity: 'high',
        action: 'block',
        threshold: 30, // seconds of total processing time
        timeWindowMs: 60 * 1000,
        cooldownMs: 10 * 60 * 1000,
      },
      {
        id: 'volume_spike',
        name: 'Abnormal Volume Spike',
        description: 'Detects sudden spikes in request volume',
        enabled: true,
        severity: 'medium',
        action: 'alert',
        threshold: 5.0, // 5x normal volume
        timeWindowMs: 5 * 60 * 1000,
        cooldownMs: 15 * 60 * 1000,
      },
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  /**
   * Analyze request for fraud indicators
   */
  async analyzeRequest(
    identifier: string,
    requestData: {
      endpoint: string;
      method: string;
      responseTime: number;
      statusCode: number;
      tokensUsed?: number;
      userAgent?: string;
      ipHash?: string;
      timestamp?: number;
    }
  ): Promise<FraudEvent[]> {
    const events: FraudEvent[] = [];
    const timestamp = requestData.timestamp || Date.now();

    try {
      // Update user behavior profile
      await this.updateUserProfile(identifier, requestData, timestamp);

      // Run fraud detection rules
      for (const [ruleId, rule] of this.rules) {
        if (!rule.enabled) continue;

        // Check if rule is in cooldown
        if (await this.isRuleCooldown(identifier, ruleId)) continue;

        let fraudEvent: FraudEvent | null = null;

        switch (ruleId) {
          case 'rapid_fire_requests':
            fraudEvent = await this.detectRapidFireRequests(identifier, rule, timestamp);
            break;
          case 'token_farming':
            fraudEvent = await this.detectTokenFarming(identifier, rule, requestData, timestamp);
            break;
          case 'unusual_timing':
            fraudEvent = await this.detectUnusualTiming(identifier, rule, timestamp);
            break;
          case 'endpoint_scanning':
            fraudEvent = await this.detectEndpointScanning(identifier, rule, requestData, timestamp);
            break;
          case 'error_farming':
            fraudEvent = await this.detectErrorFarming(identifier, rule, requestData, timestamp);
            break;
          case 'credential_stuffing':
            fraudEvent = await this.detectCredentialStuffing(identifier, rule, requestData, timestamp);
            break;
          case 'resource_exhaustion':
            fraudEvent = await this.detectResourceExhaustion(identifier, rule, requestData, timestamp);
            break;
          case 'volume_spike':
            fraudEvent = await this.detectVolumeSpike(identifier, rule, timestamp);
            break;
        }

        if (fraudEvent) {
          events.push(fraudEvent);
          await this.handleFraudEvent(fraudEvent);
          await this.setCooldown(identifier, ruleId, rule.cooldownMs);
        }
      }
    } catch (error) {
      logger.error('Fraud analysis failed:', error);
    }

    return events;
  }

  /**
   * Detect rapid fire requests
   */
  private async detectRapidFireRequests(
    identifier: string,
    rule: FraudRule,
    timestamp: number
  ): Promise<FraudEvent | null> {
    const key = `fraud:rapid_fire:${identifier}`;
    const windowStart = timestamp - rule.timeWindowMs;

    await this.redis.zremrangebyscore(key, '-inf', windowStart);
    await this.redis.zadd(key, timestamp, `${timestamp}-${Math.random()}`);
    await this.redis.expire(key, Math.ceil(rule.timeWindowMs / 1000));

    const requestCount = await this.redis.zcard(key);

    if (requestCount > rule.threshold) {
      return {
        id: `${identifier}-${rule.id}-${timestamp}`,
        ruleId: rule.id,
        identifier,
        score: requestCount / rule.threshold,
        evidence: { requestCount, threshold: rule.threshold, timeWindowMs: rule.timeWindowMs },
        timestamp,
        blocked: rule.action === 'block',
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Detect token farming patterns
   */
  private async detectTokenFarming(
    identifier: string,
    rule: FraudRule,
    requestData: any,
    timestamp: number
  ): Promise<FraudEvent | null> {
    if (!requestData.tokensUsed) return null;

    const key = `fraud:token_farming:${identifier}`;
    const windowStart = timestamp - rule.timeWindowMs;

    await this.redis.zremrangebyscore(key, '-inf', windowStart);
    await this.redis.zadd(key, timestamp, requestData.tokensUsed);
    await this.redis.expire(key, Math.ceil(rule.timeWindowMs / 1000));

    const tokenCounts = await this.redis.zrange(key, 0, -1);
    const totalTokens = tokenCounts.reduce((sum, count) => sum + parseInt(count), 0);

    if (totalTokens > rule.threshold) {
      return {
        id: `${identifier}-${rule.id}-${timestamp}`,
        ruleId: rule.id,
        identifier,
        score: totalTokens / rule.threshold,
        evidence: { totalTokens, threshold: rule.threshold, requestCount: tokenCounts.length },
        timestamp,
        blocked: rule.action === 'block',
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Detect unusual timing patterns
   */
  private async detectUnusualTiming(
    identifier: string,
    rule: FraudRule,
    timestamp: number
  ): Promise<FraudEvent | null> {
    const hour = new Date(timestamp).getHours();
    const isOffHours = hour < 6 || hour > 22; // 10 PM to 6 AM

    if (!isOffHours) return null;

    const key = `fraud:timing:${identifier}`;
    const windowStart = timestamp - rule.timeWindowMs;

    await this.redis.zremrangebyscore(key, '-inf', windowStart);
    await this.redis.zadd(key, timestamp, `${timestamp}-${hour}`);
    await this.redis.expire(key, Math.ceil(rule.timeWindowMs / 1000));

    const offHoursCount = await this.redis.zcard(key);

    if (offHoursCount > rule.threshold) {
      return {
        id: `${identifier}-${rule.id}-${timestamp}`,
        ruleId: rule.id,
        identifier,
        score: offHoursCount / rule.threshold,
        evidence: { offHoursCount, hour, threshold: rule.threshold },
        timestamp,
        blocked: rule.action === 'block',
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Detect endpoint scanning attempts
   */
  private async detectEndpointScanning(
    identifier: string,
    rule: FraudRule,
    requestData: any,
    timestamp: number
  ): Promise<FraudEvent | null> {
    const key = `fraud:endpoints:${identifier}`;
    const windowStart = timestamp - rule.timeWindowMs;

    await this.redis.zremrangebyscore(key, '-inf', windowStart);
    await this.redis.zadd(key, timestamp, requestData.endpoint);
    await this.redis.expire(key, Math.ceil(rule.timeWindowMs / 1000));

    const uniqueEndpoints = await this.redis.zcard(key);

    if (uniqueEndpoints > rule.threshold) {
      const endpoints = await this.redis.zrange(key, 0, -1);
      return {
        id: `${identifier}-${rule.id}-${timestamp}`,
        ruleId: rule.id,
        identifier,
        score: uniqueEndpoints / rule.threshold,
        evidence: { uniqueEndpoints, endpoints, threshold: rule.threshold },
        timestamp,
        blocked: rule.action === 'block',
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Detect error farming patterns
   */
  private async detectErrorFarming(
    identifier: string,
    rule: FraudRule,
    requestData: any,
    timestamp: number
  ): Promise<FraudEvent | null> {
    const key = `fraud:errors:${identifier}`;
    const windowStart = timestamp - rule.timeWindowMs;

    await this.redis.zremrangebyscore(key, '-inf', windowStart);
    await this.redis.zadd(key, timestamp, requestData.statusCode >= 400 ? 1 : 0);
    await this.redis.expire(key, Math.ceil(rule.timeWindowMs / 1000));

    const results = await this.redis.zrange(key, 0, -1);
    const totalRequests = results.length;
    const errorCount = results.filter(r => parseInt(r) === 1).length;
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

    if (totalRequests > 10 && errorRate > rule.threshold) {
      return {
        id: `${identifier}-${rule.id}-${timestamp}`,
        ruleId: rule.id,
        identifier,
        score: errorRate / rule.threshold,
        evidence: { errorRate, errorCount, totalRequests, threshold: rule.threshold },
        timestamp,
        blocked: rule.action === 'block',
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Detect credential stuffing attacks
   */
  private async detectCredentialStuffing(
    identifier: string,
    rule: FraudRule,
    requestData: any,
    timestamp: number
  ): Promise<FraudEvent | null> {
    if (!requestData.ipHash) return null;

    const key = `fraud:credentials:${requestData.ipHash}`;
    const windowStart = timestamp - rule.timeWindowMs;

    await this.redis.zremrangebyscore(key, '-inf', windowStart);
    await this.redis.zadd(key, timestamp, identifier);
    await this.redis.expire(key, Math.ceil(rule.timeWindowMs / 1000));

    const uniqueKeys = await this.redis.zcard(key);

    if (uniqueKeys > rule.threshold) {
      const identifiers = await this.redis.zrange(key, 0, -1);
      return {
        id: `${identifier}-${rule.id}-${timestamp}`,
        ruleId: rule.id,
        identifier,
        score: uniqueKeys / rule.threshold,
        evidence: { uniqueKeys, identifiers, threshold: rule.threshold, ipHash: requestData.ipHash },
        timestamp,
        blocked: rule.action === 'block',
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Detect resource exhaustion attempts
   */
  private async detectResourceExhaustion(
    identifier: string,
    rule: FraudRule,
    requestData: any,
    timestamp: number
  ): Promise<FraudEvent | null> {
    const key = `fraud:resources:${identifier}`;
    const windowStart = timestamp - rule.timeWindowMs;

    await this.redis.zremrangebyscore(key, '-inf', windowStart);
    await this.redis.zadd(key, timestamp, requestData.responseTime);
    await this.redis.expire(key, Math.ceil(rule.timeWindowMs / 1000));

    const responseTimes = await this.redis.zrange(key, 0, -1);
    const totalTime = responseTimes.reduce((sum, time) => sum + parseFloat(time), 0) / 1000; // Convert to seconds

    if (totalTime > rule.threshold) {
      return {
        id: `${identifier}-${rule.id}-${timestamp}`,
        ruleId: rule.id,
        identifier,
        score: totalTime / rule.threshold,
        evidence: { totalTime, requestCount: responseTimes.length, avgTime: totalTime / responseTimes.length },
        timestamp,
        blocked: rule.action === 'block',
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Detect abnormal volume spikes
   */
  private async detectVolumeSpike(
    identifier: string,
    rule: FraudRule,
    timestamp: number
  ): Promise<FraudEvent | null> {
    const profile = await this.getUserProfile(identifier);
    if (!profile || profile.totalRequests < 100) return null; // Not enough historical data

    const key = `fraud:volume:${identifier}`;
    const windowStart = timestamp - rule.timeWindowMs;

    await this.redis.zremrangebyscore(key, '-inf', windowStart);
    await this.redis.zadd(key, timestamp, '1');
    await this.redis.expire(key, Math.ceil(rule.timeWindowMs / 1000));

    const currentVolume = await this.redis.zcard(key);
    const expectedVolume = (profile.avgRequestsPerHour / 12); // 5-minute expected volume
    const volumeRatio = expectedVolume > 0 ? currentVolume / expectedVolume : 0;

    if (volumeRatio > rule.threshold) {
      return {
        id: `${identifier}-${rule.id}-${timestamp}`,
        ruleId: rule.id,
        identifier,
        score: volumeRatio,
        evidence: { currentVolume, expectedVolume, volumeRatio, threshold: rule.threshold },
        timestamp,
        blocked: rule.action === 'block',
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Update user behavior profile
   */
  private async updateUserProfile(
    identifier: string,
    requestData: any,
    timestamp: number
  ): Promise<void> {
    const key = `fraud:profile:${identifier}`;
    const profile = await this.getUserProfile(identifier);

    const hour = new Date(timestamp).getHours();
    const day = new Date(timestamp).getDay();
    const isError = requestData.statusCode >= 400;

    const updatedProfile: UserBehaviorProfile = {
      identifier,
      firstSeen: profile?.firstSeen || timestamp,
      lastSeen: timestamp,
      totalRequests: (profile?.totalRequests || 0) + 1,
      avgRequestsPerHour: 0, // Will be calculated
      peakHour: profile?.peakHour || hour,
      commonEndpoints: this.updateCommonEndpoints(profile?.commonEndpoints || [], requestData.endpoint),
      avgResponseTime: this.updateAverage(profile?.avgResponseTime || 0, requestData.responseTime, profile?.totalRequests || 0),
      errorRate: this.updateErrorRate(profile?.errorRate || 0, isError, profile?.totalRequests || 0),
      typicalDays: this.updateTypicalDays(profile?.typicalDays || [], day),
      suspiciousFlags: profile?.suspiciousFlags || 0,
      riskScore: 0, // Will be calculated
    };

    // Calculate average requests per hour
    const hoursActive = Math.max(1, (timestamp - updatedProfile.firstSeen) / (60 * 60 * 1000));
    updatedProfile.avgRequestsPerHour = updatedProfile.totalRequests / hoursActive;

    // Calculate risk score
    updatedProfile.riskScore = this.calculateRiskScore(updatedProfile);

    await this.redis.hset(key, {
      ...updatedProfile,
      commonEndpoints: safeStringify(updatedProfile.commonEndpoints),
      typicalDays: safeStringify(updatedProfile.typicalDays),
    });
    await this.redis.expire(key, 30 * 24 * 60 * 60); // 30 days
  }

  /**
   * Get user behavior profile
   */
  private async getUserProfile(identifier: string): Promise<UserBehaviorProfile | null> {
    try {
      const key = `fraud:profile:${identifier}`;
      const data = await this.redis.hgetall(key);
      
      if (!data.identifier) return null;

      return {
        identifier: data.identifier,
        firstSeen: parseInt(data.firstSeen),
        lastSeen: parseInt(data.lastSeen),
        totalRequests: parseInt(data.totalRequests),
        avgRequestsPerHour: parseFloat(data.avgRequestsPerHour),
        peakHour: parseInt(data.peakHour),
        commonEndpoints: safeParse(data.commonEndpoints || '[]'),
        avgResponseTime: parseFloat(data.avgResponseTime),
        errorRate: parseFloat(data.errorRate),
        typicalDays: safeParse(data.typicalDays || '[]'),
        suspiciousFlags: parseInt(data.suspiciousFlags),
        riskScore: parseFloat(data.riskScore),
      };
    } catch (error) {
      logger.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Calculate user risk score
   */
  private calculateRiskScore(profile: UserBehaviorProfile): number {
    let score = 0;

    // High error rate increases risk
    if (profile.errorRate > 0.2) score += 20;
    else if (profile.errorRate > 0.1) score += 10;

    // Unusual timing patterns
    if (profile.peakHour < 6 || profile.peakHour > 22) score += 15;

    // Too many different endpoints
    if (profile.commonEndpoints.length > 20) score += 10;

    // Very high request rate
    if (profile.avgRequestsPerHour > 1000) score += 25;
    else if (profile.avgRequestsPerHour > 500) score += 15;

    // Previous suspicious flags
    score += profile.suspiciousFlags * 5;

    return Math.min(100, score);
  }

  /**
   * Handle fraud event
   */
  private async handleFraudEvent(event: FraudEvent): Promise<void> {
    // Record metrics
    const rule = this.rules.get(event.ruleId);
    if (rule) {
      recordSuspiciousActivity(event.ruleId, rule.severity);
      
      if (event.blocked) {
        recordBlockedRequest('fraud_detection', this.hashString(event.identifier));
        await this.blockIdentifier(event.identifier, rule.cooldownMs);
      }
    }

    // Store event
    const key = `fraud:events:${event.identifier}`;
    await this.redis.lpush(key, JSON.stringify(event));
    await this.redis.ltrim(key, 0, 99); // Keep last 100 events
    await this.redis.expire(key, 7 * 24 * 60 * 60); // 7 days

    // Increment suspicious flags
    await this.incrementSuspiciousFlags(event.identifier);

    // Notify callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Fraud alert callback failed:', error);
      }
    });

    logger.info(`Fraud detected: ${rule?.name}`, {
      identifier: event.identifier,
      score: event.score,
      blocked: event.blocked
    });
  }

  /**
   * Helper methods
   */
  private updateCommonEndpoints(current: string[], endpoint: string): string[] {
    const updated = [...current];
    if (!updated.includes(endpoint)) {
      updated.push(endpoint);
    }
    return updated.slice(-50); // Keep last 50 unique endpoints
  }

  private updateAverage(currentAvg: number, newValue: number, count: number): number {
    return (currentAvg * count + newValue) / (count + 1);
  }

  private updateErrorRate(currentRate: number, isError: boolean, count: number): number {
    const currentErrors = currentRate * count;
    const newErrors = currentErrors + (isError ? 1 : 0);
    return newErrors / (count + 1);
  }

  private updateTypicalDays(current: number[], day: number): number[] {
    const updated = [...current, day];
    return updated.slice(-100); // Keep last 100 days
  }

  private async incrementSuspiciousFlags(identifier: string): Promise<void> {
    const key = `fraud:profile:${identifier}`;
    await this.redis.hincrby(key, 'suspiciousFlags', 1);
  }

  private async setCooldown(identifier: string, ruleId: string, cooldownMs: number): Promise<void> {
    const key = `fraud:cooldown:${identifier}:${ruleId}`;
    await this.redis.setex(key, Math.ceil(cooldownMs / 1000), '1');
  }

  private async isRuleCooldown(identifier: string, ruleId: string): Promise<boolean> {
    const key = `fraud:cooldown:${identifier}:${ruleId}`;
    return (await this.redis.get(key)) === '1';
  }

  private async blockIdentifier(identifier: string, durationMs: number): Promise<void> {
    const key = `fraud:blocked:${identifier}`;
    await this.redis.setex(key, Math.ceil(durationMs / 1000), '1');
  }

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
   * Public methods
   */
  async isBlocked(identifier: string): Promise<boolean> {
    const key = `fraud:blocked:${identifier}`;
    return (await this.redis.get(key)) === '1';
  }

  async getRecentEvents(identifier: string, limit: number = 10): Promise<FraudEvent[]> {
    const key = `fraud:events:${identifier}`;
    const data = await this.redis.lrange(key, 0, limit - 1);
    return data.map(item => safeParse(item));
  }

  onFraudAlert(callback: (event: FraudEvent) => void): void {
    this.alertCallbacks.push(callback);
  }

  updateRule(ruleId: string, updates: Partial<FraudRule>): void {
    const existing = this.rules.get(ruleId);
    if (existing) {
      this.rules.set(ruleId, { ...existing, ...updates });
    }
  }

  getRules(): FraudRule[] {
    return Array.from(this.rules.values());
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export default FraudDetector;