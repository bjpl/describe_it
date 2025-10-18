'use client';

import { useEffect, useState } from 'react';
import { trackPerformanceMetric } from '@/lib/sentry-utils';
import { performanceLogger } from '@/lib/logger';

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  id: string;
}

interface PerformanceMetrics {
  lcp?: WebVitalsMetric;
  fid?: WebVitalsMetric;
  cls?: WebVitalsMetric;
  fcp?: WebVitalsMetric;
  ttfb?: WebVitalsMetric;
  inp?: WebVitalsMetric;
}

/**
 * Performance monitoring component for Core Web Vitals
 * Tracks Lighthouse metrics and reports to Sentry
 */
export function LighthouseMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Import web-vitals dynamically
    import('web-vitals').then(({ onCLS, onFID, onLCP, onFCP, onTTFB, onINP }) => {
      function sendToAnalytics(metric: WebVitalsMetric) {
        // Track in Sentry
        trackPerformanceMetric(metric.name, metric.value);

        // Update local state
        setMetrics((prev) => ({
          ...prev,
          [metric.name.toLowerCase()]: metric,
        }));

        // Log in development
        if (process.env.NODE_ENV === 'development') {
          performanceLogger.debug('Web Vitals metric', { metric: metric.name, value: metric.value, rating: metric.rating });
        }
      }

      // Observe Core Web Vitals
      onCLS(sendToAnalytics);
      onFID(sendToAnalytics);
      onLCP(sendToAnalytics);
      onFCP(sendToAnalytics);
      onTTFB(sendToAnalytics);
      onINP(sendToAnalytics);
    });
  }, []);

  // Performance budget thresholds
  const budgets = {
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    fcp: { good: 1800, poor: 3000 },
    ttfb: { good: 800, poor: 1800 },
    inp: { good: 200, poor: 500 },
  };

  function getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const budget = budgets[metricName.toLowerCase() as keyof typeof budgets];
    if (!budget) return 'good';

    if (value <= budget.good) return 'good';
    if (value <= budget.poor) return 'needs-improvement';
    return 'poor';
  }

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg text-xs max-w-xs z-50">
      <h3 className="font-semibold mb-2">Performance Metrics</h3>
      <div className="space-y-1">
        {Object.entries(metrics).map(([key, metric]) => {
          if (!metric) return null;
          const rating = getRating(key, metric.value);
          const color = rating === 'good' ? 'text-green-600' : rating === 'needs-improvement' ? 'text-yellow-600' : 'text-red-600';

          return (
            <div key={key} className="flex justify-between items-center">
              <span className="font-medium">{metric.name}:</span>
              <span className={color}>
                {metric.value.toFixed(2)} {key === 'cls' ? '' : 'ms'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
