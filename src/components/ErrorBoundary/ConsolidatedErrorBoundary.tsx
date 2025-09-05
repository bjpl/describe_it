/**
 * Consolidated Error Boundary
 * Single, comprehensive error boundary implementation that replaces all duplicates
 */
import React, { Component, ReactNode } from 'react';
import { isDevelopment } from '@/config/env';
import { logSecureError } from '@/security/apiSecurity';

interface ErrorInfo {
  componentStack: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, only catches errors from direct children
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  errorId: string;
}

class ConsolidatedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `err-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    
    // Log error securely
    logSecureError(error, 'ErrorBoundary');
    
    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // In development, log detailed error info
    if (isDevelopment) {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Report to external error tracking (if configured)
    this.reportError(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Auto-reset on props change if enabled
    if (hasError && prevProps.children !== this.props.children && resetOnPropsChange) {
      this.resetError();
    }

    // Reset on specific key changes
    if (hasError && resetKeys && prevProps.resetKeys !== resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (resetKey, idx) => prevProps.resetKeys?.[idx] !== resetKey
      );
      
      if (hasResetKeyChanged) {
        this.resetError();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetError = (): void => {
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

  reportError = (error: Error, errorInfo: ErrorInfo): void => {
    // This would integrate with Sentry or other error reporting service
    if (isDevelopment) {
      console.info('Error reported to tracking service:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
      });
    }
  };

  render(): ReactNode {
    const { hasError, error, errorId } = this.state;
    const { children, fallback: FallbackComponent } = this.props;

    if (hasError && error) {
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            resetError={this.resetError}
            errorId={errorId}
          />
        );
      }

      return <DefaultErrorFallback error={error} resetError={this.resetError} errorId={errorId} />;
    }

    return children;
  }
}

/**
 * Default Error Fallback Component
 */
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError, errorId }) => {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md mx-auto text-center space-y-6">
        <div className="text-6xl mb-4">⚠️</div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Something went wrong
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400">
            We encountered an unexpected error. Please try again.
          </p>
          
          {isDevelopment && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Error Details (Development)
              </summary>
              <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded border text-sm">
                <p className="font-mono text-red-800 dark:text-red-200">
                  {error.message}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Error ID: {errorId}
                </p>
              </div>
            </details>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetError}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Custom Error Fallback for specific use cases
 */
export const CompactErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <span className="text-red-500">⚠️</span>
        <span className="text-sm text-red-800 dark:text-red-200">
          Something went wrong
        </span>
      </div>
      <button
        onClick={resetError}
        className="text-xs text-red-600 dark:text-red-400 hover:underline"
      >
        Retry
      </button>
    </div>
  </div>
);

/**
 * HOC for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ConsolidatedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ConsolidatedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Hook for error reporting in functional components
 */
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: any) => {
    logSecureError(error, 'useErrorHandler');
    
    if (isDevelopment) {
      console.error('Manual error report:', error, errorInfo);
    }
  }, []);
}

export default ConsolidatedErrorBoundary;
export { ConsolidatedErrorBoundary };
export type { ErrorBoundaryProps, ErrorFallbackProps };