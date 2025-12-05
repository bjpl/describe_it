/**
 * Analytics Types
 *
 * Type definitions for analytics, monitoring, and real-time data streaming
 */

// ============================================================================
// METRICS & MONITORING
// ============================================================================

export interface MetricsSnapshot {
  timestamp: number;
  datetime: string;
  apiCalls: number;
  errors: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  activeUsers: number;
  totalCost: number;
  cacheHitRate: number;
  openaiTokensUsed: number;
}

export interface ApiKeyMetrics {
  keyHash: string;
  keyName: string | null;
  totalRequests: number;
  totalErrors: number;
  totalCost: number;
  firstUsed: number;
  lastUsed: number;
  rateLimitHits: number;
  blockedRequests: number;
  errorRate: number;
  usageHistory: Array<{ timestamp: number; [key: string]: unknown }>;
}

export interface AlertData {
  timestamp: number;
  datetime: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  patternId: string;
  message: string;
  score: number;
  threshold: number;
  identifier: string;
  [key: string]: unknown;
}

export interface ErrorAnalysis {
  errorType: string;
  count: number;
  percentage: number;
  firstOccurrence: number;
  lastOccurrence: number;
}

export interface RateLimitAnalysis {
  identifier: string;
  totalHits: number;
  timeRange: {
    start: number;
    end: number;
  };
  avgHitsPerHour: number;
}

// ============================================================================
// EXPORT DATA STRUCTURES
// ============================================================================

export interface AnalyticsExportData {
  exportInfo: {
    generatedAt: number;
    timeRange: {
      start: number;
      end: number;
    };
    recordCount: {
      metrics: number;
      apiKeys: number;
      alerts: number;
      errors: number;
      rateLimits: number;
    };
  };
  metrics: MetricsSnapshot[];
  apiKeys: ApiKeyMetrics[];
  alerts: AlertData[];
  errors: ErrorAnalysis[];
  rateLimits: RateLimitAnalysis[];
  summary: AnalyticsSummary;
}

export interface AnalyticsSummary {
  totalRequests: number;
  totalErrors: number;
  overallErrorRate: number;
  totalCost: number;
  avgResponseTime: number;
  activeApiKeys: number;
  highSeverityAlerts: number;
  mostActiveApiKey: string | null;
  topErrorType: string | null;
}

// ============================================================================
// WEBSOCKET TYPES
// ============================================================================

export type WebSocketMessageType =
  | 'metrics_update'
  | 'api_keys_update'
  | 'alert'
  | 'fraud_event'
  | 'system_status';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: number;
}

export interface ConnectedClient {
  id: string;
  ws: unknown;
  subscriptions: string[];
  lastPing: number;
}

export interface WebSocketSystemStatus {
  status: string;
  clientId?: string;
  availableSubscriptions?: string[];
  subscriptions?: string[];
}

// ============================================================================
// REAL-TIME DATA PAYLOADS
// ============================================================================

export interface MetricsUpdatePayload {
  timestamp: number;
  apiCalls: number;
  errors: number;
  avgResponseTime: number;
  activeUsers: number;
  totalCost: number;
  cacheHitRate: number;
  openaiTokensUsed: number;
}

export interface ApiKeysUpdatePayload {
  keyHash: string;
  keyName: string | null;
  requests: number;
  errors: number;
  cost: number;
  lastUsed: number;
  rateLimitHits: number;
}

// ============================================================================
// TIME RANGE & FILTERS
// ============================================================================

export type TimeRangePreset = '1h' | '24h' | '7d' | '30d';

export interface TimeRange {
  start: number;
  end: number;
}

export interface AnalyticsFilters {
  timeRange?: TimeRangePreset;
  apiKey?: string;
  severity?: AlertData['severity'];
  errorType?: string;
  customRange?: TimeRange;
}

// ============================================================================
// REDIS DATA STRUCTURES
// ============================================================================

export interface RedisAnalyticsData {
  name?: string;
  requests?: string;
  errors?: string;
  cost?: string;
  firstUsed?: string;
  lastUsed?: string;
  rateLimitHits?: string;
  blockedRequests?: string;
}

export interface RedisCacheEntry<T> {
  data: T;
  timestamp: number;
}
