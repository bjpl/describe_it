'use client';

import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { ErrorBoundary } from "@/providers/ErrorBoundary";
import { AuthProvider } from "@/providers/AuthProvider";
import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useAuthStore } from '@/lib/stores/useAuthStore';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize event-driven auth (uses Supabase onAuthStateChange, NOT polling)
    if (typeof window !== 'undefined') {
      logger.info('[Providers] Initializing event-driven auth');
      const cleanup = useAuthStore.getState().initialize();

      // Initialize analytics on client side
      try {
        import('@/lib/analytics').then(({ initializeAnalytics }) => {
          initializeAnalytics();
        });
      } catch (error) {
        logger.error('Failed to initialize analytics:', error);
      }

      return cleanup;
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