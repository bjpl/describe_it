'use client';

import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { ErrorBoundary } from "@/providers/ErrorBoundary";
import { AuthProvider } from "@/providers/AuthProvider";
import { SentryErrorBoundary } from "@/lib/monitoring/error-boundary";
import { initializeAnalytics } from "@/lib/analytics";
import { useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize analytics on client side
    if (typeof window !== 'undefined') {
      initializeAnalytics();
    }
  }, []);

  return (
    <SentryErrorBoundary>
      <ErrorBoundary>
        <ReactQueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ReactQueryProvider>
      </ErrorBoundary>
    </SentryErrorBoundary>
  );
}