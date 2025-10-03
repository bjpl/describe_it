/**
 * Sentry Client Configuration
 * This file configures Sentry for the browser/client-side
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || ENVIRONMENT,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || '1.0.0',

  // Performance monitoring
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

  // Replay for debugging
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Error filtering
  beforeSend(event, hint) {
    // Filter out common non-critical errors
    if (event.exception) {
      const error = hint.originalException;

      // Skip network errors in development
      if (ENVIRONMENT === 'development' &&
          error instanceof TypeError &&
          error.message.includes('Failed to fetch')) {
        return null;
      }

      // Skip cancelled requests
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
    }

    return event;
  },
});