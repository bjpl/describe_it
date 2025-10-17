import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  sampleRate: 1.0,
  integrations: [Sentry.httpIntegration()],
  environment: process.env.NODE_ENV || 'development',
  release: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
  beforeSend(event, hint) {
    if (event.exception) {
      const error = hint.originalException;
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
          if (process.env.NODE_ENV === 'development') {
            return null;
          }
        }
      }
    }
    return event;
  },
  initialScope: {
    tags: {
      'app.type': 'backend',
      'app.framework': 'nextjs',
    },
  },
});
