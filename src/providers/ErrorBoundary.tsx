"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from '@/lib/logger';

// SSR-safe check for browser environment
const isBrowser = typeof window !== 'undefined';
const isDevelopment = process.env.NODE_ENV === "development";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  errorCount: number;
}

class ErrorBoundaryClass extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `err-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group("🔥 React Error Boundary - PRODUCTION DEBUG");
    logger.error("[PRODUCTION ERROR] Error:", error);
    logger.error("[PRODUCTION ERROR] Error Message:", undefined, { message: error.message });
    logger.error("[PRODUCTION ERROR] Error Stack:", undefined, { stack: error.stack });
    logger.error("[PRODUCTION ERROR] Error Info:", undefined, errorInfo as any);
    logger.error("[PRODUCTION ERROR] Component Stack:", undefined, { componentStack: errorInfo.componentStack });
    logger.error("[PRODUCTION ERROR] Environment:", {
      NODE_ENV: process.env.NODE_ENV,
      isClient: isBrowser,
      userAgent: isBrowser ? navigator.userAgent : 'N/A',
      url: isBrowser ? window.location.href : 'N/A',
      timestamp: new Date().toISOString(),
      errorCount: this.state.errorCount + 1
    });
    console.groupEnd();

    this.setState({
      errorInfo,
      errorCount: this.state.errorCount + 1,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error for production debugging
    this.reportError(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      // Reset on props change if enabled
      if (resetOnPropsChange && prevProps.children !== this.props.children) {
        this.resetError();
      }

      // Reset on specific key changes
      if (resetKeys && prevProps.resetKeys !== resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (resetKey, idx) => prevProps.resetKeys?.[idx] !== resetKey
        );
        
        if (hasResetKeyChanged) {
          this.resetError();
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  reportError = (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        errorId: this.state.errorId,
        userAgent: isBrowser ? navigator.userAgent : 'N/A',
        url: isBrowser ? window.location.href : 'N/A',
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          isClient: isBrowser,
        },
        errorCount: this.state.errorCount + 1
      };

      logger.error("[ERROR BOUNDARY REPORT]", JSON.stringify(errorData, null, 2));

      // Store error in local storage for debugging (SSR safe)
      if (isBrowser && typeof localStorage !== 'undefined') {
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
          logger.warn('[ERROR BOUNDARY] Failed to store error in localStorage:', { error: storageError as Error });
        }
      }
    } catch (reportingError) {
      logger.error("[ERROR BOUNDARY] Failed to report error:", reportingError as Error);
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
      errorId: '',
    });
  };

  handleRetry = () => {
    logger.info('[ERROR BOUNDARY] Retry attempt initiated');

    // Add delay to prevent rapid retries (SSR safe)
    this.resetTimeoutId = (isBrowser ? window.setTimeout : global.setTimeout)(() => {
      logger.info('[ERROR BOUNDARY] Resetting error state');
      this.resetError();
    }, 1000) as unknown as number;
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          errorCount={this.state.errorCount}
          resetError={this.resetError}
          handleRetry={this.handleRetry}
          isolate={this.props.isolate}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  errorCount: number;
  resetError: () => void;
  handleRetry: () => void;
  isolate?: boolean;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  errorCount,
  resetError,
  handleRetry,
  isolate,
}) => {
  const copyErrorToClipboard = async () => {
    const errorText = `
Error ID: ${errorId}
Time: ${new Date().toISOString()}
URL: ${isBrowser ? window.location.href : 'N/A'}
User Agent: ${isBrowser ? navigator.userAgent : 'N/A'}
Environment: ${process.env.NODE_ENV}

Error: ${error?.message}

Stack Trace:
${error?.stack}

Component Stack:
${errorInfo?.componentStack}
    `.trim();

    try {
      if (isBrowser && navigator.clipboard) {
        await navigator.clipboard.writeText(errorText);
        alert("Error details copied to clipboard");
      } else {
        logger.info('[ERROR BOUNDARY] Error details (clipboard not available):', { errorText });
        alert("Error details logged to console (clipboard not available)");
      }
    } catch (err) {
      logger.error("[ERROR BOUNDARY] Failed to copy error details:", err as Error);
      logger.info('[ERROR BOUNDARY] Error details:', { errorText });
    }
  };

  return (
    <div className={`
      ${isolate ? "min-h-64 border-2 border-red-200 rounded-lg bg-red-50" : "min-h-screen bg-gray-50"}
      flex items-center justify-center p-4
    `}>
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900">
              Something went wrong
            </h1>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            We encountered an unexpected error. Please try refreshing the page
            or contact support if the problem persists.
          </p>
          {errorCount > 1 && (
            <p className="text-sm text-orange-600 mt-2">
              This error has occurred {errorCount} times
            </p>
          )}
        </div>

        {isDevelopment && error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <h3 className="text-sm font-medium text-red-800 mb-2">
              Error Details (Development Mode)
            </h3>
            <pre className="text-xs text-red-700 overflow-auto">
              {error.message}
            </pre>
            {errorInfo && (
              <details className="mt-2">
                <summary className="text-xs text-red-600 cursor-pointer">
                  Stack Trace
                </summary>
                <pre className="text-xs text-red-600 mt-1 overflow-auto">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        )}

        {errorId && (
          <div className="mb-4 text-xs text-gray-500 font-mono">
            Error ID: {errorId}
          </div>
        )}

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={handleRetry}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => {
              logger.info('[ERROR BOUNDARY] Refresh page clicked');
              if (isBrowser) {
                window.location.reload();
              }
            }}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Refresh Page
          </button>
        </div>

        {isDevelopment && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={copyErrorToClipboard}
              className="w-full text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
            >
              Copy Error Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// HOC for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void,
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryClass fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundaryClass>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for manually reporting errors
export const useErrorHandler = () => {
  const reportError = React.useCallback((error: Error | string) => {
    const errorMessage = typeof error === "string" ? error : error.message;
    logger.error("Manual error report:", typeof error === "string" ? undefined : error, { message: errorMessage });
  }, []);

  return { reportError };
};

// Main ErrorBoundary component (SSR-safe)
export const ErrorBoundary: React.FC<Props> = ({
  children,
  fallback,
  onError,
  isolate,
  resetKeys,
  resetOnPropsChange,
}) => {
  return (
    <ErrorBoundaryClass 
      fallback={fallback} 
      onError={onError}
      isolate={isolate}
      resetKeys={resetKeys}
      resetOnPropsChange={resetOnPropsChange}
    >
      {children}
    </ErrorBoundaryClass>
  );
};

export default ErrorBoundary;