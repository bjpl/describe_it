'use client';

import React, { useEffect, useState } from 'react';
import { safeParse, safeStringify, safeParseLocalStorage, safeSetLocalStorage } from "@/lib/utils/json-safe";
import { createLogger } from '@/lib/logging/logger';

const debugLogger = createLogger('ProductionDebugger');

interface DebugInfo {
  timestamp: string;
  environment: {
    NODE_ENV: string | undefined;
    NEXT_PUBLIC_ENVIRONMENT: string | undefined;
    isClient: boolean;
    hasWindow: boolean;
    hasDocument: boolean;
    hasLocalStorage: boolean;
    hasSessionStorage: boolean;
    hasPerformance: boolean;
    hasNavigator: boolean;
  };
  urls: {
    current: string;
    origin: string;
    host: string;
  };
  userAgent: string;
  screen: {
    width: number;
    height: number;
    orientation?: string;
  };
  errors: Array<{
    message: string;
    timestamp: string;
    source: string;
  }>;
}

export const ProductionDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [errors, setErrors] = useState<DebugInfo['errors']>([]);

  useEffect(() => {
    debugLogger.info('Production debugger initializing');

    // Collect comprehensive debug information
    const collectDebugInfo = (): DebugInfo => {
      const info: DebugInfo = {
        timestamp: new Date().toISOString(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
          isClient: typeof window !== 'undefined',
          hasWindow: typeof window !== 'undefined',
          hasDocument: typeof document !== 'undefined',
          hasLocalStorage: typeof localStorage !== 'undefined',
          hasSessionStorage: typeof sessionStorage !== 'undefined',
          hasPerformance: typeof performance !== 'undefined',
          hasNavigator: typeof navigator !== 'undefined',
        },
        urls: {
          current: typeof window !== 'undefined' ? window.location.href : 'N/A',
          origin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
          host: typeof window !== 'undefined' ? window.location.host : 'N/A',
        },
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
        screen: {
          width: typeof window !== 'undefined' ? window.innerWidth : 0,
          height: typeof window !== 'undefined' ? window.innerHeight : 0,
          orientation: typeof screen !== 'undefined' && 'orientation' in screen ? 
            (screen as any).orientation?.type : 'N/A',
        },
        errors: errors,
      };

      return info;
    };

    // Global error handlers
    const handleError = (event: ErrorEvent) => {
      const errorInfo = {
        message: event.message,
        timestamp: new Date().toISOString(),
        source: `${event.filename}:${event.lineno}:${event.colno}`,
      };

      debugLogger.error('JavaScript error detected', errorInfo);
      setErrors(prev => [...prev.slice(-9), errorInfo]);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorInfo = {
        message: `Unhandled Promise Rejection: ${event.reason}`,
        timestamp: new Date().toISOString(),
        source: 'Promise',
      };

      debugLogger.error('Unhandled promise rejection detected', errorInfo);
      setErrors(prev => [...prev.slice(-9), errorInfo]);
    };

    // Set up error listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    // Collect initial debug info
    const info = collectDebugInfo();
    setDebugInfo(info);

    // Log comprehensive debug information
    // Debug group: '[PRODUCTION DEBUGGER] Environment Information'
    debugLogger.debug('Debug information collected', {
      timestamp: info.timestamp,
      hasEnvironment: !!info.environment,
      hasUrls: !!info.urls,
      hasUserAgent: !!info.userAgent,
      hasScreen: !!info.screen
    });
    // End debug group

    // Update debug info periodically
    const interval = setInterval(() => {
      const updatedInfo = collectDebugInfo();
      setDebugInfo(updatedInfo);
    }, 10000); // Every 10 seconds

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }
      clearInterval(interval);
    };
  }, [errors]);

  // Only render in development or when explicitly needed
  if (process.env.NODE_ENV === 'production' && !debugInfo?.environment.NEXT_PUBLIC_ENVIRONMENT?.includes('debug')) {
    return null;
  }

  if (!debugInfo) {
    return (
      <div className="fixed bottom-4 left-4 bg-blue-900 text-white p-2 rounded text-xs z-50">
        Loading debug info...
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg text-xs max-w-md z-50 max-h-96 overflow-y-auto">
      <div className="font-bold mb-2">🐛 Production Debugger</div>
      
      <div className="space-y-2">
        <div>
          <strong>Environment:</strong>
          <div className="ml-2">
            <div>NODE_ENV: {debugInfo.environment.NODE_ENV}</div>
            <div>Client: {debugInfo.environment.isClient ? '✅' : '❌'}</div>
            <div>Window: {debugInfo.environment.hasWindow ? '✅' : '❌'}</div>
            <div>Document: {debugInfo.environment.hasDocument ? '✅' : '❌'}</div>
            <div>LocalStorage: {debugInfo.environment.hasLocalStorage ? '✅' : '❌'}</div>
            <div>Performance: {debugInfo.environment.hasPerformance ? '✅' : '❌'}</div>
          </div>
        </div>

        <div>
          <strong>URLs:</strong>
          <div className="ml-2 break-all">
            <div>Host: {debugInfo.urls.host}</div>
            <div>Origin: {debugInfo.urls.origin}</div>
          </div>
        </div>

        <div>
          <strong>Screen:</strong>
          <div className="ml-2">
            {debugInfo.screen.width} × {debugInfo.screen.height}
          </div>
        </div>

        {debugInfo.errors.length > 0 && (
          <div>
            <strong>Recent Errors ({debugInfo.errors.length}):</strong>
            <div className="ml-2 space-y-1 max-h-32 overflow-y-auto">
              {debugInfo.errors.map((error, index) => (
                <div key={index} className="text-red-300 border-l-2 border-red-500 pl-2">
                  <div className="font-mono break-all">{error.message}</div>
                  <div className="text-gray-400 text-xs">
                    {error.source} - {new Date(error.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-gray-400 text-xs">
          Updated: {new Date(debugInfo.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

// Export a function to manually trigger debug info logging
export const logProductionDebugInfo = () => {
  if (typeof window === 'undefined') {
    debugLogger.debug('Running in server environment');
    return;
  }

  const debugInfo = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    screen: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
    },
    features: {
      localStorage: typeof localStorage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      fetch: typeof fetch !== 'undefined',
      performance: typeof performance !== 'undefined',
      intersection: typeof IntersectionObserver !== 'undefined',
      mutation: typeof MutationObserver !== 'undefined',
    },
    errors: (() => {
      try {
        return safeParseLocalStorage('react-error-boundary-logs', '[]');
      } catch {
        return [];
      }
    })(),
  };

  // Debug group: '[PRODUCTION DEBUG] Manual Debug Report'
  debugLogger.debug('Debug info', { hasDebugInfo: !!debugInfo });
  // End debug group

  return debugInfo;
};