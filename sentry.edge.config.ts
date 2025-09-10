/**
 * Sentry Edge Runtime Configuration
 * This file configures Sentry for Edge Runtime (Vercel Edge Functions)
 */

import { initSentry } from './src/lib/monitoring/sentry';

// Initialize Sentry for edge runtime
initSentry();