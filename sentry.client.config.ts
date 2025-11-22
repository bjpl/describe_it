import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Trace propagation targets
  tracePropagationTargets: ['localhost', /^\//],

  // Error Sampling
  sampleRate: 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration({
      // Track component interactions
      enableLongTask: true,
      enableInp: true,
    }),
    // Web Vitals tracking
    Sentry.browserProfilingIntegration(),
  ],

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',

  // Performance monitoring with custom spans
  beforeSend(event, hint) {
    // Filter out specific errors
    if (event.exception) {
      const error = hint.originalException;

      // Ignore network errors in development
      if (process.env.NODE_ENV === 'development' && error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
          return null;
        }
      }

      // Ignore third-party script errors
      if (event.exception.values?.[0]?.stacktrace?.frames?.[0]?.filename?.includes('extensions')) {
        return null;
      }

      // Enrich error context
      event.contexts = {
        ...event.contexts,
        performance: {
          navigation: performance.getEntriesByType('navigation')[0],
          memory: (performance as any).memory,
        },
      };
    }

    return event;
  },

  // Breadcrumb filtering
  beforeBreadcrumb(breadcrumb, hint) {
    // Filter out console logs in production
    if (breadcrumb.category === 'console' && process.env.NODE_ENV === 'production') {
      return null;
    }

    // Add performance breadcrumbs
    if (breadcrumb.category === 'navigation') {
      breadcrumb.data = {
        ...breadcrumb.data,
        timing: performance.now(),
      };
    }

    return breadcrumb;
  },


  // Additional context
  initialScope: {
    tags: {
      'app.type': 'frontend',
      'app.framework': 'nextjs',
      'app.version': process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
    },
    user: {
      // Anonymous user tracking
      id: typeof window !== 'undefined' ? (window.localStorage.getItem('user-id') || undefined) : undefined,
    },
  },

  // Performance thresholds
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Custom fingerprinting for better error grouping
  beforeSendTransaction(transaction) {
    // Filter out very fast transactions
    if (transaction.spans && transaction.spans.length === 0) {
      return null;
    }
    return transaction;
  },
});
