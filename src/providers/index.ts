// Export all providers for easy importing
export { ReactQueryProvider, queryKeys, useInvalidateQueries } from './ReactQueryProvider';
export { ErrorBoundary, withErrorBoundary, useErrorHandler } from './ErrorBoundary';

// Combined provider component
import React from 'react';
import { ReactQueryProvider } from './ReactQueryProvider';
import { ErrorBoundary } from './ErrorBoundary';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <ReactQueryProvider>
        {children}
      </ReactQueryProvider>
    </ErrorBoundary>
  );
};