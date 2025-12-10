/**
 * React error boundary utilities
 * Provides components and hooks for handling React rendering errors
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/core/errors/logger';
import { AppError } from '@/core/errors';

/**
 * Props for ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

/**
 * State for ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Default error fallback UI
 */
export function DefaultErrorFallback({ error, reset }: { error: Error; reset?: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="mt-4 text-xl font-semibold text-center text-gray-900">
          Something went wrong
        </h2>

        <p className="mt-2 text-sm text-center text-gray-600">
          {error.message || 'An unexpected error occurred'}
        </p>

        {process.env.NODE_ENV === 'development' && error.stack && (
          <details className="mt-4 text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
              Error details
            </summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-red-600">
              {error.stack}
            </pre>
          </details>
        )}

        {reset && (
          <button
            onClick={reset}
            className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * React Error Boundary component
 * Catches errors in the component tree and displays fallback UI
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<ErrorPage />}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error with context
    logger.error(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    this.setState({
      errorInfo,
    });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when reset keys change
    if (hasError && resetKeys) {
      const hasResetKeysChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeysChanged) {
        this.reset();
      }
    }

    // Reset on any props change if enabled
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.reset();
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Render custom fallback
      if (typeof fallback === 'function') {
        return fallback(error, errorInfo!);
      }

      if (fallback) {
        return fallback;
      }

      // Render default fallback
      return <DefaultErrorFallback error={error} reset={this.reset} />;
    }

    return children;
  }
}

/**
 * Creates an error boundary component with default props
 */
export function createErrorBoundary(
  defaultProps: Partial<ErrorBoundaryProps> = {}
): React.FC<Pick<ErrorBoundaryProps, 'children'>> {
  const BoundaryComponent = ({ children }: Pick<ErrorBoundaryProps, 'children'>) => (
    <ErrorBoundary {...defaultProps}>
      {children}
    </ErrorBoundary>
  );

  BoundaryComponent.displayName = 'CreatedErrorBoundary';

  return BoundaryComponent;
}

/**
 * Hook to programmatically throw errors to nearest error boundary
 * Useful for async error handling in components
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const throwError = useErrorHandler();
 *
 *   async function loadData() {
 *     try {
 *       await fetchData();
 *     } catch (error) {
 *       throwError(error);
 *     }
 *   }
 * }
 * ```
 */
export function useErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error>();

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}

/**
 * Hook for safe async operations with automatic error boundary integration
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const safeAsync = useSafeAsync();
 *
 *   const handleClick = safeAsync(async () => {
 *     await riskyOperation(); // Errors automatically caught by error boundary
 *   });
 * }
 * ```
 */
export function useSafeAsync() {
  const throwError = useErrorHandler();

  return React.useCallback(
    <T extends (...args: any[]) => Promise<any>>(fn: T): T => {
      return (async (...args: Parameters<T>) => {
        try {
          return await fn(...args);
        } catch (error) {
          throwError(error instanceof Error ? error : new Error(String(error)));
        }
      }) as T;
    },
    [throwError]
  );
}

/**
 * HOC to wrap a component with an error boundary
 *
 * @example
 * ```tsx
 * const SafeComponent = withErrorBoundary(MyComponent, {
 *   fallback: <ErrorPage />
 * });
 * ```
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
