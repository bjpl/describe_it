// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
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

  // Custom tags for edge runtime Claude API monitoring
  initialScope: {
    tags: {
      'ai.provider': 'anthropic',
      'ai.model': 'claude-sonnet-4-5',
      'runtime': 'edge',
    },
  },

  // Custom trace sampler for edge routes
  tracesSampler: (samplingContext) => {
    // Always sample Claude API routes in edge runtime
    if (samplingContext.name?.includes('/api/')) {
      return 1.0;
    }

    // Sample middleware at lower rate
    return 0.1;
  },

  // Before sending events, enrich with edge-specific context
  beforeSend: (event, hint) => {
    // Add edge runtime context
    if (event.contexts) {
      event.contexts.runtime = {
        name: 'edge',
        version: process.env.NEXT_RUNTIME || 'unknown',
      };
    }

    return event;
  },
});
