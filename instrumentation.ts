/**
 * Next.js Instrumentation File
 * Used to initialize monitoring and observability tools
 */

export async function register() {
  // Only run instrumentation on the server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Sentry for server-side monitoring
    await import('./config/sentry.server.config');

    // Initialize any other monitoring tools here
    console.log('🔧 Server instrumentation initialized');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Initialize Sentry for edge runtime
    await import('./config/sentry.edge.config');

    console.log('⚡ Edge instrumentation initialized');
  }
}