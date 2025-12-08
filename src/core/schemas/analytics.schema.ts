/**
 * Analytics API Schemas
 *
 * Zod schemas for analytics, monitoring, and metrics with runtime validation
 * and TypeScript type inference
 */

import { z } from 'zod';

// ============================================================================
// METRICS & MONITORING
// ============================================================================

export const metricsSnapshotSchema = z.object({
  timestamp: z.number().int().nonnegative(),
  datetime: z.string().datetime(),
  apiCalls: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  avgResponseTime: z.number().nonnegative(),
  p95ResponseTime: z.number().nonnegative(),
  p99ResponseTime: z.number().nonnegative(),
  activeUsers: z.number().int().nonnegative(),
  totalCost: z.number().nonnegative(),
  cacheHitRate: z.number().min(0).max(1),
  openaiTokensUsed: z.number().int().nonnegative(),
});

export type MetricsSnapshot = z.infer<typeof metricsSnapshotSchema>;

export const apiKeyMetricsSchema = z.object({
  keyHash: z.string(),
  keyName: z.string().nullable(),
  totalRequests: z.number().int().nonnegative(),
  totalErrors: z.number().int().nonnegative(),
  totalCost: z.number().nonnegative(),
  firstUsed: z.number().int().nonnegative(),
  lastUsed: z.number().int().nonnegative(),
  rateLimitHits: z.number().int().nonnegative(),
  blockedRequests: z.number().int().nonnegative(),
  errorRate: z.number().min(0).max(1),
  usageHistory: z.array(z.record(z.unknown())),
});

export type ApiKeyMetrics = z.infer<typeof apiKeyMetricsSchema>;

export const alertSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export type AlertSeverity = z.infer<typeof alertSeveritySchema>;

export const alertDataSchema = z.object({
  timestamp: z.number().int().nonnegative(),
  datetime: z.string().datetime(),
  severity: alertSeveritySchema,
  patternId: z.string(),
  message: z.string(),
  score: z.number(),
  threshold: z.number(),
  identifier: z.string(),
}).passthrough(); // Allow additional fields

export type AlertData = z.infer<typeof alertDataSchema>;

// ============================================================================
// ANALYTICS QUERY
// ============================================================================

export const timeRangePresetSchema = z.enum(['1h', '24h', '7d', '30d']);

export type TimeRangePreset = z.infer<typeof timeRangePresetSchema>;

export const analyticsQuerySchema = z.object({
  timeRange: timeRangePresetSchema.optional(),
  apiKey: z.string().optional(),
  severity: alertSeveritySchema.optional(),
  errorType: z.string().optional(),
  customRange: z.object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  }).optional(),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

// ============================================================================
// ANALYTICS RESPONSES
// ============================================================================

export const errorAnalysisSchema = z.object({
  errorType: z.string(),
  count: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
  firstOccurrence: z.number().int().nonnegative(),
  lastOccurrence: z.number().int().nonnegative(),
});

export type ErrorAnalysis = z.infer<typeof errorAnalysisSchema>;

export const rateLimitAnalysisSchema = z.object({
  identifier: z.string(),
  totalHits: z.number().int().nonnegative(),
  timeRange: z.object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  }),
  avgHitsPerHour: z.number().nonnegative(),
});

export type RateLimitAnalysis = z.infer<typeof rateLimitAnalysisSchema>;

export const analyticsSummarySchema = z.object({
  totalRequests: z.number().int().nonnegative(),
  totalErrors: z.number().int().nonnegative(),
  overallErrorRate: z.number().min(0).max(1),
  totalCost: z.number().nonnegative(),
  avgResponseTime: z.number().nonnegative(),
  activeApiKeys: z.number().int().nonnegative(),
  highSeverityAlerts: z.number().int().nonnegative(),
  mostActiveApiKey: z.string().nullable(),
  topErrorType: z.string().nullable(),
});

export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;

export const analyticsExportDataSchema = z.object({
  exportInfo: z.object({
    generatedAt: z.number().int().nonnegative(),
    timeRange: z.object({
      start: z.number().int().nonnegative(),
      end: z.number().int().nonnegative(),
    }),
    recordCount: z.object({
      metrics: z.number().int().nonnegative(),
      apiKeys: z.number().int().nonnegative(),
      alerts: z.number().int().nonnegative(),
      errors: z.number().int().nonnegative(),
      rateLimits: z.number().int().nonnegative(),
    }),
  }),
  metrics: z.array(metricsSnapshotSchema),
  apiKeys: z.array(apiKeyMetricsSchema),
  alerts: z.array(alertDataSchema),
  errors: z.array(errorAnalysisSchema),
  rateLimits: z.array(rateLimitAnalysisSchema),
  summary: analyticsSummarySchema,
});

export type AnalyticsExportData = z.infer<typeof analyticsExportDataSchema>;

export const getAnalyticsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    metrics: z.array(metricsSnapshotSchema),
    apiKeys: z.array(apiKeyMetricsSchema),
    alerts: z.array(alertDataSchema),
    summary: analyticsSummarySchema,
  }).nullable(),
  error: z.string().optional(),
});

export type GetAnalyticsResponse = z.infer<typeof getAnalyticsResponseSchema>;

// ============================================================================
// WEB VITALS
// ============================================================================

export const webVitalSchema = z.object({
  id: z.string(),
  name: z.enum(['CLS', 'FID', 'FCP', 'LCP', 'TTFB', 'INP']),
  value: z.number().nonnegative(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  delta: z.number(),
  navigationType: z.enum(['navigate', 'reload', 'back-forward', 'prerender']).optional(),
});

export type WebVital = z.infer<typeof webVitalSchema>;

export const trackWebVitalsRequestSchema = z.object({
  vitals: z.array(webVitalSchema).min(1),
  url: z.string().url(),
  userAgent: z.string().optional(),
  connection: z.object({
    effectiveType: z.enum(['slow-2g', '2g', '3g', '4g']).optional(),
    rtt: z.number().int().nonnegative().optional(),
    downlink: z.number().nonnegative().optional(),
  }).optional(),
});

export type TrackWebVitalsRequest = z.infer<typeof trackWebVitalsRequestSchema>;

export const trackWebVitalsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: z.string().optional(),
});

export type TrackWebVitalsResponse = z.infer<typeof trackWebVitalsResponseSchema>;

// ============================================================================
// WEBSOCKET MESSAGES
// ============================================================================

export const webSocketMessageTypeSchema = z.enum([
  'metrics_update',
  'api_keys_update',
  'alert',
  'fraud_event',
  'system_status',
]);

export type WebSocketMessageType = z.infer<typeof webSocketMessageTypeSchema>;

export const webSocketMessageSchema = z.object({
  type: webSocketMessageTypeSchema,
  payload: z.unknown(),
  timestamp: z.number().int().nonnegative(),
});

export type WebSocketMessage = z.infer<typeof webSocketMessageSchema>;

export const metricsUpdatePayloadSchema = z.object({
  timestamp: z.number().int().nonnegative(),
  apiCalls: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  avgResponseTime: z.number().nonnegative(),
  activeUsers: z.number().int().nonnegative(),
  totalCost: z.number().nonnegative(),
  cacheHitRate: z.number().min(0).max(1),
  openaiTokensUsed: z.number().int().nonnegative(),
});

export type MetricsUpdatePayload = z.infer<typeof metricsUpdatePayloadSchema>;

export const apiKeysUpdatePayloadSchema = z.object({
  keyHash: z.string(),
  keyName: z.string().nullable(),
  requests: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  cost: z.number().nonnegative(),
  lastUsed: z.number().int().nonnegative(),
  rateLimitHits: z.number().int().nonnegative(),
});

export type ApiKeysUpdatePayload = z.infer<typeof apiKeysUpdatePayloadSchema>;
