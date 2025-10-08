/**
 * Prometheus metrics collection for describe_it project
 * Provides comprehensive monitoring for API usage, performance, and errors
 */

import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Initialize default metrics collection (CPU, memory, etc.)
collectDefaultMetrics({ register });

/**
 * API Request Metrics
 */
export const apiRequestCounter = new Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['method', 'endpoint', 'status_code', 'api_key_hash', 'user_id'],
  registers: [register]
});

export const apiRequestDuration = new Histogram({
  name: 'api_request_duration_seconds',
  help: 'Duration of API requests in seconds',
  labelNames: ['method', 'endpoint', 'api_key_hash'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10, 30],
  registers: [register]
});

export const apiErrorCounter = new Counter({
  name: 'api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['method', 'endpoint', 'error_type', 'api_key_hash'],
  registers: [register]
});

/**
 * OpenAI API Metrics
 */
export const openaiRequestCounter = new Counter({
  name: 'openai_requests_total',
  help: 'Total number of OpenAI API requests',
  labelNames: ['model', 'endpoint', 'status'],
  registers: [register]
});

export const openaiTokensUsed = new Counter({
  name: 'openai_tokens_used_total',
  help: 'Total number of OpenAI tokens consumed',
  labelNames: ['model', 'type'], // type: prompt, completion
  registers: [register]
});

export const openaiRequestDuration = new Histogram({
  name: 'openai_request_duration_seconds',
  help: 'Duration of OpenAI API requests in seconds',
  labelNames: ['model', 'endpoint'],
  buckets: [1, 3, 5, 10, 15, 30, 60, 120],
  registers: [register]
});

export const openaiCostCounter = new Counter({
  name: 'openai_cost_usd_total',
  help: 'Total cost of OpenAI API usage in USD',
  labelNames: ['model', 'api_key_hash'],
  registers: [register]
});

/**
 * Rate Limiting Metrics
 */
export const rateLimitHitsCounter = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['api_key_hash', 'limit_type'], // limit_type: per_minute, per_hour, per_day
  registers: [register]
});

export const rateLimitGauge = new Gauge({
  name: 'rate_limit_remaining',
  help: 'Remaining rate limit quota',
  labelNames: ['api_key_hash', 'limit_type'],
  registers: [register]
});

/**
 * Cache Metrics
 */
export const cacheHitsCounter = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type', 'operation'], // cache_type: redis, memory, operation: get, set, delete
  registers: [register]
});

export const cacheMissesCounter = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type', 'operation'],
  registers: [register]
});

export const cacheOperationDuration = new Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Duration of cache operations in seconds',
  labelNames: ['cache_type', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
});

/**
 * Application Metrics
 */
export const activeSessionsGauge = new Gauge({
  name: 'active_sessions_total',
  help: 'Number of active user sessions',
  registers: [register]
});

export const imageProcessingCounter = new Counter({
  name: 'image_processing_total',
  help: 'Total number of images processed',
  labelNames: ['processing_type', 'status'], // processing_type: description, analysis, ocr
  registers: [register]
});

export const imageProcessingDuration = new Histogram({
  name: 'image_processing_duration_seconds',
  help: 'Duration of image processing in seconds',
  labelNames: ['processing_type'],
  buckets: [1, 3, 5, 10, 15, 30, 60],
  registers: [register]
});

export const vocabularyOperationsCounter = new Counter({
  name: 'vocabulary_operations_total',
  help: 'Total number of vocabulary operations',
  labelNames: ['operation', 'status'], // operation: add, update, delete, search
  registers: [register]
});

/**
 * Business Metrics
 */
export const userRegistrationCounter = new Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['source'], // source: web, api, mobile
  registers: [register]
});

export const subscriptionGauge = new Gauge({
  name: 'active_subscriptions_total',
  help: 'Number of active subscriptions',
  labelNames: ['plan_type'], // plan_type: free, premium, enterprise
  registers: [register]
});

export const revenueCounter = new Counter({
  name: 'revenue_usd_total',
  help: 'Total revenue in USD',
  labelNames: ['plan_type', 'payment_method'],
  registers: [register]
});

/**
 * Security Metrics
 */
export const authenticationAttemptsCounter = new Counter({
  name: 'authentication_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'status'], // method: api_key, oauth, status: success, failure
  registers: [register]
});

export const suspiciousActivityCounter = new Counter({
  name: 'suspicious_activity_total',
  help: 'Total number of suspicious activity events',
  labelNames: ['activity_type', 'severity'], // activity_type: rate_abuse, invalid_tokens, severity: low, medium, high
  registers: [register]
});

export const blockedRequestsCounter = new Counter({
  name: 'blocked_requests_total',
  help: 'Total number of blocked requests',
  labelNames: ['reason', 'ip_hash'], // reason: rate_limit, invalid_key, suspicious
  registers: [register]
});

/**
 * Helper functions for metrics collection
 */

export function recordApiRequest(
  method: string,
  endpoint: string,
  statusCode: number,
  duration: number,
  apiKeyHash?: string,
  userId?: string
) {
  const labels = {
    method,
    endpoint,
    status_code: statusCode.toString(),
    api_key_hash: apiKeyHash || 'anonymous',
    user_id: userId || 'anonymous'
  };

  apiRequestCounter.inc(labels);
  apiRequestDuration.observe({ method, endpoint, api_key_hash: apiKeyHash || 'anonymous' }, duration);

  if (statusCode >= 400) {
    const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
    apiErrorCounter.inc({ method, endpoint, error_type: errorType, api_key_hash: apiKeyHash || 'anonymous' });
  }
}

export function recordOpenAIRequest(
  model: string,
  endpoint: string,
  duration: number,
  promptTokens: number,
  completionTokens: number,
  cost: number,
  apiKeyHash: string,
  status: 'success' | 'error' = 'success'
) {
  openaiRequestCounter.inc({ model, endpoint, status });
  openaiRequestDuration.observe({ model, endpoint }, duration);
  openaiTokensUsed.inc({ model, type: 'prompt' }, promptTokens);
  openaiTokensUsed.inc({ model, type: 'completion' }, completionTokens);
  openaiCostCounter.inc({ model, api_key_hash: apiKeyHash }, cost);
}

export function recordRateLimitHit(apiKeyHash: string, limitType: string, remaining: number) {
  rateLimitHitsCounter.inc({ api_key_hash: apiKeyHash, limit_type: limitType });
  rateLimitGauge.set({ api_key_hash: apiKeyHash, limit_type: limitType }, remaining);
}

export function recordCacheOperation(
  cacheType: string,
  operation: string,
  hit: boolean,
  duration: number
) {
  const labels = { cache_type: cacheType, operation };
  
  if (hit) {
    cacheHitsCounter.inc(labels);
  } else {
    cacheMissesCounter.inc(labels);
  }
  
  cacheOperationDuration.observe(labels, duration);
}

export function recordImageProcessing(
  processingType: string,
  duration: number,
  status: 'success' | 'error' = 'success'
) {
  imageProcessingCounter.inc({ processing_type: processingType, status });
  imageProcessingDuration.observe({ processing_type: processingType }, duration);
}

export function recordSuspiciousActivity(activityType: string, severity: 'low' | 'medium' | 'high') {
  suspiciousActivityCounter.inc({ activity_type: activityType, severity });
}

export function recordBlockedRequest(reason: string, ipHash: string) {
  blockedRequestsCounter.inc({ reason, ip_hash: ipHash });
}

export function updateActiveSessionsCount(count: number) {
  activeSessionsGauge.set(count);
}

export function updateSubscriptionCount(planType: string, count: number) {
  subscriptionGauge.set({ plan_type: planType }, count);
}

/**
 * Get metrics for Prometheus scraping
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics() {
  register.clear();
}

/**
 * Middleware wrapper for Express/Next.js routes
 */
export function withMetrics(handler: Function) {
  return async (req: any, res: any, ...args: any[]) => {
    const startTime = Date.now();
    const method = req.method;
    const endpoint = req.url || req.path;
    
    try {
      const result = await handler(req, res, ...args);
      const duration = (Date.now() - startTime) / 1000;
      const statusCode = res.statusCode || 200;
      
      recordApiRequest(method, endpoint, statusCode, duration);
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      recordApiRequest(method, endpoint, 500, duration);
      throw error;
    }
  };
}

const prometheusMetrics = {
  apiRequestCounter,
  apiRequestDuration,
  apiErrorCounter,
  openaiRequestCounter,
  openaiTokensUsed,
  openaiRequestDuration,
  openaiCostCounter,
  rateLimitHitsCounter,
  rateLimitGauge,
  cacheHitsCounter,
  cacheMissesCounter,
  cacheOperationDuration,
  activeSessionsGauge,
  imageProcessingCounter,
  imageProcessingDuration,
  vocabularyOperationsCounter,
  userRegistrationCounter,
  subscriptionGauge,
  revenueCounter,
  authenticationAttemptsCounter,
  suspiciousActivityCounter,
  blockedRequestsCounter,
  recordApiRequest,
  recordOpenAIRequest,
  recordRateLimitHit,
  recordCacheOperation,
  recordImageProcessing,
  recordSuspiciousActivity,
  recordBlockedRequest,
  updateActiveSessionsCount,
  updateSubscriptionCount,
  getMetrics,
  clearMetrics,
  withMetrics
};

export default prometheusMetrics;