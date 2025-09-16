/**
 * Sentry Error Tracking Configuration
 * Provides comprehensive error monitoring and performance tracking
 */

import * as Sentry from '@sentry/nextjs';

// Environment-specific configuration
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || ENVIRONMENT;
const SENTRY_RELEASE = process.env.SENTRY_RELEASE || '1.0.0';

/**
 * Initialize Sentry with comprehensive configuration
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    
    // Performance monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Session tracking
    autoSessionTracking: true,
    
    // Error filtering
    beforeSend(event, hint) {
      // Filter out common non-critical errors
      if (event.exception) {
        const error = hint.originalException;
        
        // Skip network errors in development
        if (ENVIRONMENT === 'development' && 
            (error instanceof TypeError && error.message.includes('Failed to fetch'))) {
          return null;
        }
        
        // Skip cancelled requests
        if (error instanceof Error && error.name === 'AbortError') {
          return null;
        }
      }
      
      return event;
    },
    
    // Integrations
    integrations: [
      new Sentry.BrowserTracing({
        // Track page loads and navigation
        routingInstrumentation: Sentry.nextRouterInstrumentation,
        
        // Track specific operations
        tracingOrigins: [
          'localhost',
          /^https:\/\/.*\.vercel\.app$/,
          /^https:\/\/.*\.yourdomain\.com$/,
        ],
      }),
    ],
    
    // User context
    initialScope: {
      tags: {
        component: 'describe-it-app',
      },
    },
  });
}

/**
 * Enhanced error capture with context
 */
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    
    scope.setTag('errorType', 'application');
    scope.setLevel('error');
    
    Sentry.captureException(error);
  });
}

/**
 * Capture API errors with request context
 */
export function captureApiError(
  error: Error, 
  endpoint: string, 
  method: string,
  statusCode?: number
) {
  Sentry.withScope((scope) => {
    scope.setTag('errorType', 'api');
    scope.setContext('api', {
      endpoint,
      method,
      statusCode,
    });
    
    scope.setLevel(statusCode && statusCode >= 500 ? 'error' : 'warning');
    
    Sentry.captureException(error);
  });
}

/**
 * Track user actions for behavior analysis
 */
export function trackUserAction(action: string, properties?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message: `User action: ${action}`,
    category: 'user',
    data: properties,
    level: 'info',
  });
}

/**
 * Track performance metrics
 */
export function trackPerformance(
  operation: string, 
  duration: number, 
  metadata?: Record<string, any>
) {
  Sentry.withScope((scope) => {
    scope.setTag('metricType', 'performance');
    scope.setContext('performance', {
      operation,
      duration,
      ...metadata,
    });
    
    // Create a custom event for performance tracking
    Sentry.captureMessage(`Performance: ${operation} took ${duration}ms`, 'info');
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  tier?: string;
  plan?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    tier: user.tier,
    plan: user.plan,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Start performance transaction
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Profile function execution
 */
export function profileFunction<T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const transaction = startTransaction(name, 'function');
  
  return Promise.resolve(fn())
    .then((result) => {
      transaction.setStatus('ok');
      return result;
    })
    .catch((error) => {
      transaction.setStatus('internal_error');
      captureError(error, { function: name });
      throw error;
    })
    .finally(() => {
      transaction.finish();
    });
}

export { Sentry };