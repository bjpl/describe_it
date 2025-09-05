// Re-export the consolidated error boundary as the main ErrorBoundary
export {
  ConsolidatedErrorBoundary as ErrorBoundary,
  CompactErrorFallback,
  withErrorBoundary,
  useErrorHandler,
  type ErrorBoundaryProps,
  type ErrorFallbackProps,
} from "./ConsolidatedErrorBoundary";

// Export consolidated as enhanced for backward compatibility
export { ConsolidatedErrorBoundary as EnhancedErrorBoundary } from "./ConsolidatedErrorBoundary";

// Default export
export { default } from "./ConsolidatedErrorBoundary";
