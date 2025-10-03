/**
 * Enhanced Error Boundary with Sentry Integration
 * Provides comprehensive error catching and reporting
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { captureError } from './sentry';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'feature';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
}

export class SentryErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private readonly maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Capture error with Sentry
    const eventId = Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', true);
      scope.setTag('level', this.props.level || 'component');
      scope.setLevel('error');
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
      });
      
      return Sentry.captureException(error);
    });

    // Also use our custom error capture
    captureError(error, {
      errorBoundary: this.constructor.name,
      componentStack: errorInfo.componentStack,
      level: this.props.level,
      retryCount: this.retryCount,
    });

    this.setState({
      error,
      errorInfo,
      eventId,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    logger.error('Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        eventId: null,
      });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReportFeedback = () => {
    if (this.state.eventId) {
      // In a real app, you might show a feedback dialog
      Sentry.showReportDialog({ eventId: this.state.eventId });
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo } = this.state;
      const canRetry = this.retryCount < this.maxRetries;
      const isPageLevel = this.props.level === 'page';

      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">
                      {isPageLevel ? 'Page Error' : 'Something went wrong'}
                    </h3>
                    <p className="text-sm">
                      {isPageLevel 
                        ? 'This page encountered an error and cannot be displayed properly.'
                        : 'This component encountered an error. You can try reloading or continue using other parts of the app.'
                      }
                    </p>
                  </div>

                  {this.props.showDetails && error && (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium">
                        Error Details
                      </summary>
                      <div className="mt-2 p-2 bg-red-100 rounded text-red-900">
                        <pre className="whitespace-pre-wrap break-words">
                          {error.toString()}
                        </pre>
                        {process.env.NODE_ENV === 'development' && errorInfo && (
                          <pre className="mt-2 whitespace-pre-wrap break-words">
                            {errorInfo.componentStack}
                          </pre>
                        )}
                      </div>
                    </details>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {canRetry && (
                      <Button 
                        onClick={this.handleRetry} 
                        size="sm"
                        variant="outline"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Try Again
                      </Button>
                    )}
                    
                    <Button 
                      onClick={this.handleReload} 
                      size="sm"
                      variant="default"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Reload Page
                    </Button>

                    {this.state.eventId && (
                      <Button 
                        onClick={this.handleReportFeedback} 
                        size="sm"
                        variant="outline"
                      >
                        <Bug className="w-3 h-3 mr-1" />
                        Report Issue
                      </Button>
                    )}
                  </div>

                  {!canRetry && (
                    <p className="text-xs text-red-600">
                      Maximum retry attempts reached. Please reload the page.
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const WithErrorBoundaryComponent = (props: P) => (
    <SentryErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </SentryErrorBoundary>
  );
  
  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${displayName})`;
  
  return WithErrorBoundaryComponent;
}

// Hook for manual error reporting
export function useErrorHandler() {
  return {
    reportError: (error: Error, context?: Record<string, any>) => {
      captureError(error, {
        ...context,
        manual: true,
        timestamp: Date.now(),
      });
    },
    
    reportUserFeedback: (feedback: string, context?: Record<string, any>) => {
      Sentry.withScope((scope) => {
        scope.setTag('type', 'user_feedback');
        scope.setLevel('info');
        if (context) {
          scope.setContext('feedback_context', context);
        }
        Sentry.captureMessage(`User Feedback: ${feedback}`, 'info');
      });
    },
  };
}

export default SentryErrorBoundary;