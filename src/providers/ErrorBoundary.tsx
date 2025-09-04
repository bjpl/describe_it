"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={() =>
            this.setState({ hasError: false, error: null, errorInfo: null })
          }
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
}) => {
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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

        <div className="flex space-x-3">
          <button
            onClick={resetError}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Refresh Page
          </button>
        </div>
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
    console.error("Manual error report:", errorMessage);
  }, []);

  return { reportError };
};

// Main ErrorBoundary component
export const ErrorBoundary: React.FC<Props> = ({
  children,
  fallback,
  onError,
}) => {
  return (
    <ErrorBoundaryClass fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundaryClass>
  );
};

export default ErrorBoundary;
