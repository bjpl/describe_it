'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Home, ArrowLeft } from 'lucide-react';
import { logger } from '@/lib/api/client-logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retrying: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  level?: 'page' | 'section' | 'component';
  name?: string;
  showErrorDetails?: boolean;
  enableRetry?: boolean;
  enableNavigation?: boolean;
}

/**
 * Global Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the component tree,
 * logs error information, and displays fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substring(7)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    this.logError(error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;
    
    // Reset error boundary when props change (if enabled)
    if (hasError && resetOnPropsChange) {
      if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (resetKey, idx) => prevProps.resetKeys?.[idx] !== resetKey
        );
        
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }
  }

  /**
   * Logs error information using structured logging
   */
  private async logError(error: Error, errorInfo: ErrorInfo) {
    const { level = 'component', name } = this.props;
    
    try {
      await logger.error(
        `Error Boundary Caught Error - ${level}${name ? `: ${name}` : ''}`,
        error,
        {
          errorBoundary: {
            level,
            name,
            componentStack: errorInfo.componentStack,
            errorId: this.state.errorId
          },
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
          url: typeof window !== 'undefined' ? window.location.href : 'server',
          timestamp: new Date().toISOString()
        }
      );
    } catch (loggingError) {
      // Fallback to console if structured logging fails
      console.error('Error Boundary - Failed to log error:', loggingError);
      console.error('Original Error:', error);
      console.error('Error Info:', errorInfo);
    }
  }

  /**
   * Resets the error boundary state
   */
  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retrying: false
    });
  };

  /**
   * Handles retry functionality
   */
  private handleRetry = () => {
    this.setState({ retrying: true });
    
    // Call custom retry handler
    this.props.onRetry?.();
    
    // Reset after a brief delay to show loading state
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, 1000);
  };

  /**
   * Navigation helpers
   */
  private handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  /**
   * Renders error details for development
   */
  private renderErrorDetails() {
    const { error, errorInfo, errorId } = this.state;
    const { showErrorDetails = process.env.NODE_ENV === 'development' } = this.props;
    
    if (!showErrorDetails || !error) return null;

    return (
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-3">
          <Bug className="h-4 w-4" />
          <span className="font-medium text-sm">Error Details</span>
        </div>
        
        <div className="space-y-3 text-xs font-mono">
          {errorId && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">ID:</span>
              <span className="ml-2 text-gray-700 dark:text-gray-300">{errorId}</span>
            </div>
          )}
          
          <div>
            <span className="text-gray-500 dark:text-gray-400">Message:</span>
            <pre className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded overflow-x-auto whitespace-pre-wrap">
              {error.message}
            </pre>
          </div>
          
          {error.stack && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Stack Trace:</span>
              <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded overflow-x-auto text-xs max-h-32 overflow-y-auto">
                {error.stack}
              </pre>
            </div>
          )}
          
          {errorInfo?.componentStack && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Component Stack:</span>
              <pre className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded overflow-x-auto text-xs max-h-32 overflow-y-auto">
                {errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  /**
   * Renders the error UI based on the level
   */
  private renderErrorUI() {
    const { 
      level = 'component', 
      name, 
      enableRetry = true, 
      enableNavigation = false 
    } = this.props;
    const { error, retrying } = this.state;

    // Different UI based on error boundary level
    const getErrorConfig = () => {
      switch (level) {
        case 'page':
          return {
            title: 'Page Error',
            message: 'Something went wrong with this page. Please try refreshing or go back to the home page.',
            icon: <AlertTriangle className="h-12 w-12 text-red-500" />,
            showNavigation: true,
            size: 'lg' as const
          };
        case 'section':
          return {
            title: name ? `${name} Error` : 'Section Error',
            message: 'This section encountered an error. You can try reloading it or continue using other parts of the app.',
            icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
            showNavigation: false,
            size: 'md' as const
          };
        case 'component':
        default:
          return {
            title: name ? `${name} Error` : 'Component Error',
            message: 'This component failed to load. Please try again.',
            icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
            showNavigation: false,
            size: 'sm' as const
          };
      }
    };

    const config = getErrorConfig();
    const showNavigation = enableNavigation || config.showNavigation;

    const sizeClasses = {
      sm: 'p-4 text-sm',
      md: 'p-6 text-base',
      lg: 'p-8 text-lg'
    };

    const titleSizeClasses = {
      sm: 'text-lg',
      md: 'text-xl',
      lg: 'text-2xl'
    };

    const buttonSizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    return (
      <div className={`
        bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg 
        ${sizeClasses[config.size]}
        ${level === 'page' ? 'min-h-[400px] flex items-center justify-center' : ''}
      `}>
        <div className="text-center max-w-md mx-auto">
          {/* Error Icon */}
          <div className="mb-4">
            {config.icon}
          </div>

          {/* Title */}
          <h3 className={`font-semibold text-gray-900 dark:text-gray-100 mb-3 ${titleSizeClasses[config.size]}`}>
            {config.title}
          </h3>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            {config.message}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {enableRetry && (
              <button
                onClick={this.handleRetry}
                disabled={retrying}
                className={`
                  ${buttonSizeClasses[config.size]}
                  bg-red-600 text-white rounded-lg font-medium
                  hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200
                  flex items-center justify-center gap-2
                `}
                aria-label={retrying ? 'Retrying...' : 'Try again'}
              >
                <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Retrying...' : 'Try Again'}
              </button>
            )}

            {showNavigation && (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={this.handleGoBack}
                  className={`
                    ${buttonSizeClasses[config.size]}
                    bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium
                    hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                    transition-colors duration-200
                    flex items-center gap-2
                  `}
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  onClick={this.handleGoHome}
                  className={`
                    ${buttonSizeClasses[config.size]}
                    bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium
                    hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                    transition-colors duration-200
                    flex items-center gap-2
                  `}
                  aria-label="Go to home page"
                >
                  <Home className="w-4 h-4" />
                  Home
                </button>
              </div>
            )}
          </div>

          {/* Error Details (Development) */}
          {this.renderErrorDetails()}
        </div>
      </div>
    );
  }

  render() {
    const { hasError } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Render custom fallback or default error UI
      return fallback || this.renderErrorUI();
    }

    return children;
  }
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export function withErrorBoundary<T extends {}>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for programmatically triggering error boundaries
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    // In a real application, you might want to report this to an error reporting service
    logger.error('Manual Error Trigger', error, { 
      manual: true, 
      errorInfo 
    });
    
    // Re-throw to trigger error boundary
    throw error;
  };
}

export default ErrorBoundary;