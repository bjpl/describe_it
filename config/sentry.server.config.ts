/**
 * Sentry Server Configuration
 * This file configures Sentry for the server-side (Node.js)
 */

import { initSentry } from './src/lib/monitoring/sentry';

// Initialize Sentry for server-side
initSentry();