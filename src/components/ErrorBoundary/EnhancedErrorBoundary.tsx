"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  RefreshCw,
  Bug,
  Copy,
  ExternalLink,
} from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
  isRetrying: boolean;
  errorCount: number;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
      isRetrying: false,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.group("🔥 React Error Boundary");
      console.error("Error:", error);
      console.error("Error Info:", errorInfo);
      console.error("Component Stack:", errorInfo.componentStack);
      console.groupEnd();
    }

    // Generate error ID for tracking
    const eventId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.setState({
      error,
      errorInfo,
      eventId,
      errorCount: this.state.errorCount + 1,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Send to error reporting service (implement based on your service)
    this.reportError(error, errorInfo, eventId);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && (resetOnPropsChange || resetKeys)) {
      const hasResetKeyChanged = resetKeys?.some(
        (resetKey, index) => prevProps.resetKeys?.[index] !== resetKey,
      );

      if (resetOnPropsChange || hasResetKeyChanged) {
        this.resetError();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  reportError = async (error: Error, errorInfo: ErrorInfo, eventId: string) => {
    try {
      // In production, send to your error reporting service
      if (process.env.NODE_ENV === "production") {
        // Example: Sentry, LogRocket, Bugsnag, etc.
        /*
        Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
          tags: {
            boundary: 'React Error Boundary',
          },
          extra: {
            eventId,
            errorInfo,
          },
        });
        */
      }

      // Store error in local storage for debugging
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        eventId,
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      const existingErrors = JSON.parse(
        localStorage.getItem("react-error-boundary-logs") || "[]",
      );

      existingErrors.push(errorData);

      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }

      localStorage.setItem(
        "react-error-boundary-logs",
        JSON.stringify(existingErrors),
      );
    } catch (reportingError) {
      console.error("Failed to report error:", reportingError);
    }
  };

  resetError = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
      isRetrying: false,
    });
  };

  handleRetry = () => {
    this.setState({ isRetrying: true });

    // Add delay to prevent rapid retries
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetError();
    }, 1000);
  };

  copyErrorToClipboard = async () => {
    const { error, errorInfo, eventId } = this.state;

    const errorText = `
Error ID: ${eventId}
Time: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}

Error: ${error?.message}

Stack Trace:
${error?.stack}

Component Stack:
${errorInfo?.componentStack}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      alert("Error details copied to clipboard");
    } catch (err) {
      console.error("Failed to copy error details:", err);
    }
  };

  render() {
    const { hasError, error, errorInfo, eventId, isRetrying, errorCount } =
      this.state;
    const { children, fallback, isolate } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div
          className={`
          min-h-64 flex items-center justify-center p-8
          ${isolate ? "border-2 border-red-200 rounded-lg bg-red-50" : "min-h-screen bg-gray-50"}
        `}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full text-center space-y-6"
          >
            {/* Error Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex justify-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </motion.div>

            {/* Error Message */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">
                Something went wrong
              </h2>
              <p className="text-gray-600">
                {isolate
                  ? "This component encountered an error and couldn&apos;t render properly."
                  : "We&apos;re sorry, but something unexpected happened."}
              </p>
              {errorCount > 1 && (
                <p className="text-sm text-orange-600">
                  This error has occurred {errorCount} times
                </p>
              )}
            </div>

            {/* Error Details (Development) */}
            {process.env.NODE_ENV === "development" && error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ delay: 0.4 }}
                className="bg-gray-100 rounded-lg p-4 text-left text-sm overflow-auto max-h-32"
              >
                <div className="font-mono text-red-700">
                  <strong>Error:</strong> {error.message}
                </div>
                {errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-gray-700 hover:text-gray-900">
                      Component Stack
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </motion.div>
            )}

            {/* Error ID */}
            {eventId && (
              <div className="text-xs text-gray-500 font-mono">
                Error ID: {eventId}
              </div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <button
                onClick={this.handleRetry}
                disabled={isRetrying}
                className="
                  flex items-center justify-center gap-2 px-4 py-2 
                  bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`}
                />
                {isRetrying ? "Retrying..." : "Try Again"}
              </button>

              <button
                onClick={() => window.location.reload()}
                className="
                  flex items-center justify-center gap-2 px-4 py-2 
                  bg-gray-600 text-white rounded-lg hover:bg-gray-700 
                  transition-colors
                "
              >
                <ExternalLink className="w-4 h-4" />
                Reload Page
              </button>
            </motion.div>

            {/* Development Tools */}
            {process.env.NODE_ENV === "development" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="pt-4 border-t border-gray-200 space-y-2"
              >
                <button
                  onClick={this.copyErrorToClipboard}
                  className="
                    flex items-center justify-center gap-2 w-full px-3 py-2 
                    text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 
                    rounded transition-colors
                  "
                >
                  <Copy className="w-4 h-4" />
                  Copy Error Details
                </button>

                <button
                  onClick={() => {
                    const errors = JSON.parse(
                      localStorage.getItem("react-error-boundary-logs") || "[]",
                    );
                    console.table(errors);
                    alert(`${errors.length} errors logged to console`);
                  }}
                  className="
                    flex items-center justify-center gap-2 w-full px-3 py-2 
                    text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 
                    rounded transition-colors
                  "
                >
                  <Bug className="w-4 h-4" />
                  View Error Logs
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      );
    }

    return children;
  }
}

// HOC for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">,
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for error reporting from functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback(
    (error: Error | string, errorInfo?: any) => {
      const errorObj = error instanceof Error ? error : new Error(error);

      // Report immediately
      if (process.env.NODE_ENV === "development") {
        console.error("Captured error:", errorObj, errorInfo);
      }

      setError(errorObj);
    },
    [],
  );

  // Throw error to be caught by nearest error boundary
  if (error) {
    throw error;
  }

  return { captureError, resetError };
};
