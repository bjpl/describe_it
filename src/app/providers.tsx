'use client';

import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { ErrorBoundary } from "@/providers/ErrorBoundary";
import { AuthProvider } from "@/providers/AuthProvider";
import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize analytics on client side
    if (typeof window !== 'undefined') {
      try {
        // Lazy load analytics to avoid build issues
        import('@/lib/analytics').then(({ initializeAnalytics }) => {
          initializeAnalytics();
        });
      } catch (error) {
        logger.error('Failed to initialize analytics:', error);
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <ReactQueryProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ReactQueryProvider>
    </ErrorBoundary>
  );
}