/**
 * Sentry Server Configuration
 * This file configures Sentry for the server-side (Node.js)
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || ENVIRONMENT,
  release: process.env.SENTRY_RELEASE || '1.0.0',

  // Performance monitoring
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

  // Enable profiling for server-side
  profilesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0,

  // Error filtering
  beforeSend(event, hint) {
    // Filter out common non-critical errors
    if (event.exception) {
      const error = hint.originalException;

      // Skip cancelled requests
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
    }

    return event;
  },
});