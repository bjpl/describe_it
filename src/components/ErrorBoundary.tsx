"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function DefaultErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fef2f2",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "0.5rem",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          maxWidth: "28rem",
          width: "100%",
          margin: "1rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚠️</div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "1rem",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            An error occurred while rendering this page.
          </p>
          <details
            style={{
              textAlign: "left",
              marginBottom: "1.5rem",
              backgroundColor: "#f3f4f6",
              padding: "1rem",
              borderRadius: "0.25rem",
              fontSize: "0.875rem",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "500",
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Error details
            </summary>
            <pre style={{ whiteSpace: "pre-wrap", color: "#dc2626" }}>
              {error.message}
            </pre>
          </details>
          <button
            onClick={reset}
            style={{
              backgroundColor: "#2563eb",
              color: "white",
              padding: "0.5rem 1.5rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

// Custom hook for error handling
export const useErrorHandler = () => {
  const handleError = React.useCallback(
    (error: Error, errorInfo?: React.ErrorInfo) => {
      console.error("Error caught by error handler:", error, errorInfo);
      // Additional error handling logic can be added here
    },
    [],
  );

  return { handleError };
};

// Higher-order component for error boundaries
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>,
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          reset={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}
