/**
 * Sentry Edge Runtime Configuration
 * This file configures Sentry for Edge Runtime (Vercel Edge Functions)
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || ENVIRONMENT,
  release: process.env.SENTRY_RELEASE || '1.0.0',

  // Performance monitoring (lower for edge due to cost)
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.05 : 0.5,

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