"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { MotionDiv } from "@/components/ui/MotionWrappers";
import {
  AlertTriangle,
  RefreshCw,
  Bug,
  Copy,
} from "lucide-react";
import { errorHandler, ErrorCategory, ErrorSeverity, RecoveryStrategy } from "@/lib/errorHandler";
import { logger } from "@/lib/logger";

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

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // PRODUCTION DEBUGGING: Always log errors for debugging
    console.group("🔥 React Error Boundary - PRODUCTION DEBUG");
    console.error("[PRODUCTION ERROR] Error:", error);
    console.error("[PRODUCTION ERROR] Error Message:", error.message);
    console.error("[PRODUCTION ERROR] Error Stack:", error.stack);
    console.error("[PRODUCTION ERROR] Error Info:", errorInfo);
    console.error("[PRODUCTION ERROR] Component Stack:", errorInfo.componentStack);
    console.error("[PRODUCTION ERROR] Environment:", {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
      isClient: typeof window !== 'undefined',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      url: typeof window !== 'undefined' ? window.location.href : 'N/A',
      timestamp: new Date().toISOString(),
      errorCount: this.state.errorCount + 1
    });
    console.groupEnd();

    // Development specific logging
    if (process.env.NODE_ENV === "development") {
      console.group("🔧 Development Details");
      console.error("Props:", this.props);
      console.error("State:", this.state);
      console.groupEnd();
    }

    try {
      // Create enhanced error with context using our centralized error handler
      const appError = errorHandler.createError(
        error.message,
        this.categorizeComponentError(error, errorInfo),
        this.assessErrorSeverity(error),
        this.determineRecoveryStrategy(error),
        {
          component: 'ErrorBoundary',
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
          isolate: this.props.isolate,
          errorCount: this.state.errorCount + 1,
        },
        error
      );

      // Handle the error through our centralized system
      await errorHandler.handleError(appError);

      // Update state with error details
      this.setState({
        error,
        errorInfo,
        eventId: appError.id,
        errorCount: this.state.errorCount + 1,
      });

      // Call custom error handler
      this.props.onError?.(error, errorInfo);

      // Send to error reporting service (maintain compatibility)
      this.reportError(error, errorInfo, appError.id);

    } catch (handlerError) {
      // Fallback if our error handler fails
      logger.systemError('Error boundary failed to handle error', handlerError as Error, {
        originalError: error.message,
      });
      
      // Fallback to original behavior
      const eventId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.setState({
        error,
        errorInfo,
        eventId,
        errorCount: this.state.errorCount + 1,
      });
      this.props.onError?.(error, errorInfo);
      this.reportError(error, errorInfo, eventId);
    }
  }

  private categorizeComponentError(error: Error, errorInfo: ErrorInfo): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    const componentStack = errorInfo.componentStack?.toLowerCase() || '';

    // Check for specific React errors
    if (message.includes('hydration') || message.includes('hydrate')) {
      return ErrorCategory.UI_COMPONENT;
    }
    if (message.includes('hook') || stack.includes('usehook') || componentStack.includes('hook')) {
      return ErrorCategory.UI_COMPONENT;
    }
    if (message.includes('render') || message.includes('cannot read properties')) {
      return ErrorCategory.UI_COMPONENT;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorCategory.AUTHENTICATION;
    }

    return ErrorCategory.UI_COMPONENT;
  }

  private assessErrorSeverity(error: Error): ErrorSeverity {
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return ErrorSeverity.MEDIUM;
    }
    if (this.props.isolate) {
      return ErrorSeverity.LOW;
    }
    return ErrorSeverity.MEDIUM;
  }

  private determineRecoveryStrategy(error: Error): RecoveryStrategy {
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return RecoveryStrategy.REFRESH;
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return RecoveryStrategy.RETRY;
    }
    return RecoveryStrategy.FALLBACK;
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
      // Enhanced error data for production debugging
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        eventId,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
        url: typeof window !== 'undefined' ? window.location.href : 'N/A',
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
          isClient: typeof window !== 'undefined',
          hasDocument: typeof document !== 'undefined',
          hasLocalStorage: typeof localStorage !== 'undefined',
          hasSessionStorage: typeof sessionStorage !== 'undefined'
        },
        errorDetails: {
          name: error.name,
          cause: error.cause,
          toString: error.toString()
        },
        isolatedComponent: this.props.isolate,
        errorCount: this.state.errorCount + 1
      };

      // PRODUCTION: Log to console for Vercel logs
      console.error("[ERROR BOUNDARY REPORT]", JSON.stringify(errorData, null, 2));

      // In production, send to your error reporting service
      if (process.env.NODE_ENV === "production") {
        // Log to Vercel function logs
        try {
          await fetch('/api/error-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorData)
          }).catch(() => {
            // Silent fail - error reporting service might not be available
            console.warn('[ERROR BOUNDARY] Failed to send error to reporting service');
          });
        } catch (fetchError) {
          console.warn('[ERROR BOUNDARY] Error reporting service unavailable:', fetchError);
        }
      }

      // Store error in local storage for debugging (with SSR safety)
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        try {
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
        } catch (storageError) {
          console.warn('[ERROR BOUNDARY] Failed to store error in localStorage:', storageError);
        }
      }
    } catch (reportingError) {
      console.error("[ERROR BOUNDARY] Failed to report error:", reportingError);
      // Fallback: at least log the original error
      console.error("[ERROR BOUNDARY] Original error:", error);
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
    console.log('[ERROR BOUNDARY] Retry attempt initiated');
    this.setState({ isRetrying: true });

    // Add delay to prevent rapid retries (SSR safe)
    this.resetTimeoutId = (typeof window !== 'undefined' ? window.setTimeout : setTimeout)(() => {
      console.log('[ERROR BOUNDARY] Resetting error state');
      this.resetError();
    }, 1000) as number;
  };

  copyErrorToClipboard = async () => {
    const { error, errorInfo, eventId } = this.state;

    const errorText = `
Error ID: ${eventId}
Time: ${new Date().toISOString()}
URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}
User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}
Environment: ${process.env.NODE_ENV}

Error: ${error?.message}

Stack Trace:
${error?.stack}

Component Stack:
${errorInfo?.componentStack}
    `.trim();

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(errorText);
        alert("Error details copied to clipboard");
      } else {
        console.log('[ERROR BOUNDARY] Error details (clipboard not available):', errorText);
        alert("Error details logged to console (clipboard not available)");
      }
    } catch (err) {
      console.error("[ERROR BOUNDARY] Failed to copy error details:", err);
      console.log('[ERROR BOUNDARY] Error details:', errorText);
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
          <MotionDiv
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full text-center space-y-6"
          >
            {/* Error Icon */}
            <MotionDiv
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex justify-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </MotionDiv>

            {/* Error Message */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">
                Something went wrong
              </h2>
              <p className="text-gray-600">
                We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
              </p>
              {errorCount > 1 && (
                <p className="text-sm text-orange-600">
                  This error has occurred {errorCount} times
                </p>
              )}
            </div>

            {/* Error Details (Development) */}
            {process.env.NODE_ENV === "development" && error && (
              <MotionDiv
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
              </MotionDiv>
            )}

            {/* Error ID */}
            {eventId && (
              <div className="text-xs text-gray-500 font-mono">
                Error ID: {eventId}
              </div>
            )}

            {/* Action Buttons */}
            <MotionDiv
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
                onClick={() => {
                  console.log('[ERROR BOUNDARY] Refresh page clicked');
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}
                className="
                  flex items-center justify-center gap-2 px-4 py-2 
                  bg-gray-600 text-white rounded-lg hover:bg-gray-700 
                  transition-colors
                "
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>
            </MotionDiv>

            {/* Development Tools */}
            {process.env.NODE_ENV === "development" && (
              <MotionDiv
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
                    try {
                      if (typeof localStorage !== 'undefined') {
                        const errors = JSON.parse(
                          localStorage.getItem("react-error-boundary-logs") || "[]",
                        );
                        console.table(errors);
                        alert(`${errors.length} errors logged to console`);
                      } else {
                        console.log('[ERROR BOUNDARY] localStorage not available');
                        alert('Error logs not available (localStorage not supported)');
                      }
                    } catch (err) {
                      console.error('[ERROR BOUNDARY] Failed to access error logs:', err);
                      alert('Failed to access error logs');
                    }
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
              </MotionDiv>
            )}
          </MotionDiv>
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
