import * as Sentry from '@sentry/nextjs';

/**
 * Custom error tracking utilities for Sentry
 */

export interface CustomEventContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Track custom events in Sentry
 */
export function trackEvent(
  eventName: string,
  context?: CustomEventContext
) {
  Sentry.addBreadcrumb({
    category: 'user-action',
    message: eventName,
    level: 'info',
    data: context,
  });
}

/**
 * Track API call performance
 */
export function trackApiCall(
  endpoint: string,
  method: string,
  status: number,
  duration: number
) {
  Sentry.addBreadcrumb({
    category: 'api',
    message: `${method} ${endpoint}`,
    level: status >= 400 ? 'error' : 'info',
    data: {
      status,
      duration,
      endpoint,
      method,
    },
  });
}

/**
 * Track component errors
 */
export function trackComponentError(
  componentName: string,
  error: Error,
  errorInfo?: React.ErrorInfo
) {
  Sentry.withScope((scope) => {
    scope.setTag('component', componentName);
    scope.setContext('errorInfo', {
      componentStack: errorInfo?.componentStack,
    });
    Sentry.captureException(error);
  });
}

/**
 * Track user interactions
 */
export function trackUserInteraction(
  action: string,
  context?: Record<string, unknown>
) {
  trackEvent(`user.${action}`, {
    action,
    ...context,
  });
}

/**
 * Track performance metrics
 */
export function trackPerformanceMetric(
  metricName: string,
  value: number,
  unit: string = 'ms'
) {
  Sentry.setMeasurement(metricName, value, unit);

  Sentry.addBreadcrumb({
    category: 'performance',
    message: `${metricName}: ${value}${unit}`,
    level: 'info',
    data: {
      metric: metricName,
      value,
      unit,
    },
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    email,
  });
}

/**
 * Clear user context on logout
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(
  featureName: string,
  metadata?: Record<string, unknown>
) {
  trackEvent(`feature.${featureName}`, {
    feature: featureName,
    ...metadata,
  });
}

/**
 * Track search queries
 */
export function trackSearch(query: string, resultsCount: number) {
  trackEvent('search.performed', {
    query: query.substring(0, 100), // Limit query length for privacy
    resultsCount,
  });
}

/**
 * Track vocabulary actions
 */
export function trackVocabularyAction(
  action: 'save' | 'delete' | 'export' | 'import',
  itemCount: number
) {
  trackEvent(`vocabulary.${action}`, {
    action,
    itemCount,
  });
}
