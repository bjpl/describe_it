/* eslint-disable custom-rules/require-logger, no-console */
/* Sentry monitoring - console usage for development-only warnings */

/**
 * Claude API Performance Tracking Utilities for Sentry
 *
 * This module provides comprehensive performance monitoring for Claude API calls including:
 * - Response time tracking (p50, p95, p99 percentiles)
 * - Token usage monitoring and cost estimation
 * - Error rate tracking by endpoint
 * - Streaming performance metrics
 */

import * as Sentry from '@sentry/nextjs';

// Claude Sonnet 4.5 pricing
const CLAUDE_PRICING = {
  'claude-sonnet-4-5-20250514': {
    input: 0.003, // $3 per 1M input tokens
    output: 0.015, // $15 per 1M output tokens
  },
  'claude-sonnet-4-5': {
    input: 0.003,
    output: 0.015,
  },
} as const;

export interface ClaudeMetrics {
  endpoint: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  responseTime: number;
  estimatedCost: number;
  success: boolean;
  errorType?: string;
  streaming?: boolean;
  chunkCount?: number;
}

export interface ClaudePerformanceMarker {
  name: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Calculate estimated cost for Claude API call
 */
export function calculateClaudeCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing =
    CLAUDE_PRICING[model as keyof typeof CLAUDE_PRICING] || CLAUDE_PRICING['claude-sonnet-4-5'];

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Track Claude API call performance in Sentry
 */
export function trackClaudeAPICall(metrics: ClaudeMetrics): void {
  const scope = Sentry.getCurrentScope();
  const span = Sentry.getActiveSpan();

  if (!span) {
    if (process.env.NODE_ENV !== 'production')
      console.warn('[Sentry] No active span for Claude API metrics');
    return;
  }

  const transaction = span as any; // Type assertion for compatibility

  // Add custom measurements to transaction
  transaction.setMeasurement('claude.tokens.input', metrics.inputTokens, 'none');
  transaction.setMeasurement('claude.tokens.output', metrics.outputTokens, 'none');
  transaction.setMeasurement('claude.tokens.total', metrics.totalTokens, 'none');
  transaction.setMeasurement('claude.cost.estimated', metrics.estimatedCost, 'none');
  transaction.setMeasurement('claude.response_time', metrics.responseTime, 'millisecond');

  if (metrics.streaming && metrics.chunkCount) {
    transaction.setMeasurement('claude.streaming.chunks', metrics.chunkCount, 'none');
  }

  // Set custom tags
  transaction.setTag('claude.endpoint', metrics.endpoint);
  transaction.setTag('claude.model', metrics.model);
  transaction.setTag('claude.success', metrics.success);

  if (metrics.errorType) {
    transaction.setTag('claude.error_type', metrics.errorType);
  }

  // Set context data
  transaction.setContext('claude_api', {
    endpoint: metrics.endpoint,
    model: metrics.model,
    tokens: {
      input: metrics.inputTokens,
      output: metrics.outputTokens,
      total: metrics.totalTokens,
    },
    performance: {
      responseTime: metrics.responseTime,
      streaming: metrics.streaming,
      chunkCount: metrics.chunkCount,
    },
    cost: {
      estimated: metrics.estimatedCost,
      currency: 'USD',
    },
  });

  // Create breadcrumb for tracking
  Sentry.addBreadcrumb({
    category: 'claude.api',
    message: `Claude API call to ${metrics.endpoint}`,
    level: metrics.success ? 'info' : 'error',
    data: {
      model: metrics.model,
      tokens: metrics.totalTokens,
      responseTime: metrics.responseTime,
      cost: metrics.estimatedCost,
      success: metrics.success,
    },
  });
}

/**
 * Start a Claude API transaction span
 */
export function startClaudeSpan(operation: string, description: string): Sentry.Span | undefined {
  const activeSpan = Sentry.getActiveSpan();

  if (!activeSpan) {
    if (process.env.NODE_ENV !== 'production')
      console.warn('[Sentry] No active span for Claude span');
    return undefined;
  }

  const span = Sentry.startInactiveSpan({
    op: `claude.${operation}`,
    name: description,
  });

  return span as any;
}

/**
 * Track Claude API error with context
 */
export function trackClaudeError(
  error: Error,
  context: {
    endpoint: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    requestDuration?: number;
  }
): void {
  Sentry.captureException(error, {
    tags: {
      'claude.endpoint': context.endpoint,
      'claude.model': context.model,
      'error.type': 'claude_api_error',
    },
    contexts: {
      claude_error: {
        endpoint: context.endpoint,
        model: context.model,
        tokens: {
          input: context.inputTokens || 0,
          output: context.outputTokens || 0,
        },
        requestDuration: context.requestDuration,
      },
    },
    fingerprint: ['claude-api-error', context.endpoint, error.message],
  });
}

/**
 * Create performance markers for fine-grained tracking
 */
export class ClaudePerformanceTracker {
  private markers: ClaudePerformanceMarker[] = [];
  private startTime: number;

  constructor(private endpoint: string) {
    this.startTime = performance.now();
  }

  mark(name: string, metadata?: Record<string, any>): void {
    this.markers.push({
      name,
      timestamp: performance.now(),
      metadata,
    });
  }

  getMarkers(): ClaudePerformanceMarker[] {
    return this.markers;
  }

  getDuration(): number {
    return performance.now() - this.startTime;
  }

  getMarkersWithDurations(): Array<{
    name: string;
    duration: number;
    metadata?: Record<string, any>;
  }> {
    const result = [];

    for (let i = 0; i < this.markers.length; i++) {
      const current = this.markers[i];
      const previous = i > 0 ? this.markers[i - 1] : { timestamp: this.startTime };

      result.push({
        name: current.name,
        duration: current.timestamp - previous.timestamp,
        metadata: current.metadata,
      });
    }

    return result;
  }

  finish(): void {
    const activeSpan = Sentry.getActiveSpan();

    if (activeSpan) {
      // Add all markers as breadcrumbs
      this.getMarkersWithDurations().forEach(marker => {
        Sentry.addBreadcrumb({
          category: 'claude.performance',
          message: `${this.endpoint}: ${marker.name}`,
          level: 'info',
          data: {
            duration: marker.duration,
            ...marker.metadata,
          },
        });
      });

      // Set total duration on the active span
      const span = activeSpan as any;
      if (span.setMeasurement) {
        span.setMeasurement('claude.total_duration', this.getDuration(), 'millisecond');
      }
    }
  }
}

/**
 * Wrapper for tracking streaming responses
 */
export class ClaudeStreamingTracker {
  private chunks: number = 0;
  private totalTokens: number = 0;
  private startTime: number;

  constructor(private endpoint: string) {
    this.startTime = performance.now();
  }

  trackChunk(tokens: number): void {
    this.chunks++;
    this.totalTokens += tokens;
  }

  finish(inputTokens: number, model: string): void {
    const responseTime = performance.now() - this.startTime;
    const estimatedCost = calculateClaudeCost(model, inputTokens, this.totalTokens);

    trackClaudeAPICall({
      endpoint: this.endpoint,
      model,
      inputTokens,
      outputTokens: this.totalTokens,
      totalTokens: inputTokens + this.totalTokens,
      responseTime,
      estimatedCost,
      success: true,
      streaming: true,
      chunkCount: this.chunks,
    });
  }
}

/**
 * Check if response time exceeds threshold and log warning
 */
export function checkPerformanceThreshold(
  endpoint: string,
  responseTime: number,
  threshold: number = 2000
): void {
  if (responseTime > threshold) {
    Sentry.addBreadcrumb({
      category: 'performance.warning',
      message: `Claude API response time exceeded threshold`,
      level: 'warning',
      data: {
        endpoint,
        responseTime,
        threshold,
        exceeded: responseTime - threshold,
      },
    });
  }
}

/**
 * Track token usage spikes (>50% above average)
 */
export function checkTokenUsageSpike(
  endpoint: string,
  currentTokens: number,
  averageTokens: number
): void {
  const threshold = averageTokens * 1.5;

  if (currentTokens > threshold) {
    Sentry.addBreadcrumb({
      category: 'usage.warning',
      message: `Claude API token usage spike detected`,
      level: 'warning',
      data: {
        endpoint,
        currentTokens,
        averageTokens,
        threshold,
        percentageIncrease: ((currentTokens - averageTokens) / averageTokens) * 100,
      },
    });
  }
}

/**
 * Track error rate by endpoint
 */
let errorCounts: Record<string, { total: number; errors: number }> = {};

export function trackEndpointErrorRate(endpoint: string, isError: boolean): void {
  if (!errorCounts[endpoint]) {
    errorCounts[endpoint] = { total: 0, errors: 0 };
  }

  errorCounts[endpoint].total++;
  if (isError) {
    errorCounts[endpoint].errors++;
  }

  const errorRate = errorCounts[endpoint].errors / errorCounts[endpoint].total;

  // Alert if error rate exceeds 1%
  if (errorRate > 0.01 && errorCounts[endpoint].total >= 10) {
    Sentry.addBreadcrumb({
      category: 'error.rate',
      message: `Claude API error rate threshold exceeded`,
      level: 'error',
      data: {
        endpoint,
        errorRate: (errorRate * 100).toFixed(2) + '%',
        totalRequests: errorCounts[endpoint].total,
        errors: errorCounts[endpoint].errors,
      },
    });
  }
}

// Reset error counts periodically (every hour)
setInterval(
  () => {
    errorCounts = {};
  },
  60 * 60 * 1000
);
