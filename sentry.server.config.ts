// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://58c3cacf9671e15d453e2f28a626a134@o4510134648307712.ingest.us.sentry.io/4510134719348736",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Track all outgoing HTTP requests (Claude API calls)
  tracePropagationTargets: ['api.anthropic.com', /^\//],

  // Enhanced integrations for HTTP monitoring
  integrations: [
    Sentry.httpIntegration(),
  ],

  // Custom tags for Claude API monitoring
  initialScope: {
    tags: {
      'ai.provider': 'anthropic',
      'ai.model': 'claude-sonnet-4-5',
    },
  },

  // Performance monitoring configuration
  profilesSampleRate: 1.0, // Profile 100% of transactions in development

  // Custom trace sampler for fine-grained control
  tracesSampler: (samplingContext) => {
    // Always sample Claude API routes
    if (samplingContext.name?.includes('/api/descriptions/generate') ||
        samplingContext.name?.includes('/api/qa/generate') ||
        samplingContext.name?.includes('/api/translate')) {
      return 1.0;
    }

    // Sample other routes at lower rate
    return 0.1;
  },

  // Before sending events, enrich with Claude-specific context
  beforeSend: (event, hint) => {
    // Add custom fingerprinting for Claude API errors
    if (event.exception?.values?.[0]?.value?.includes('Claude') ||
        event.exception?.values?.[0]?.value?.includes('Anthropic')) {
      event.fingerprint = ['claude-api-error', '{{ default }}'];
    }

    return event;
  },

  // Before sending transactions, add custom metrics
  beforeSendTransaction: (event) => {
    // Add custom measurements for Claude API calls
    if (event.contexts?.trace?.op === 'http.server') {
      const measurements = event.measurements || {};
      event.measurements = {
        ...measurements,
        // Custom metrics will be added by instrumentation
      };
    }

    return event;
  },
});
