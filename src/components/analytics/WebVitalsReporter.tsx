'use client';

import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';
import { useEffect } from 'react';

interface AnalyticsData {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

// Thresholds based on Core Web Vitals recommendations
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

function getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[metric as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

function sendToAnalytics({ name, value, rating, delta, id }: AnalyticsData) {
  // Send to Vercel Analytics if available
  if (typeof window !== 'undefined' && 'va' in window) {
    (window as any).va('track', 'Web Vitals', {
      metric: name,
      value: Math.round(value),
      rating,
      delta: Math.round(delta),
      id
    });
  }

  // Send to custom analytics endpoint
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        value: Math.round(value),
        rating,
        delta: Math.round(delta),
        id,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        connection: (navigator as any).connection?.effectiveType,
      }),
    }).catch(console.error);
  }

  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Web Vital: ${name}`, {
      value: Math.round(value),
      rating,
      threshold: THRESHOLDS[name as keyof typeof THRESHOLDS],
    });
  }
}

function reportWebVital(metric: Metric) {
  const analyticsData: AnalyticsData = {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    delta: metric.delta,
    id: metric.id,
  };

  sendToAnalytics(analyticsData);
}

export default function WebVitalsReporter() {
  useEffect(() => {
    // Only run in the browser
    if (typeof window === 'undefined') return;

    // Collect all Core Web Vitals
    getCLS(reportWebVital);
    getFID(reportWebVital);
    getFCP(reportWebVital);
    getLCP(reportWebVital);
    getTTFB(reportWebVital);

    // Report navigation type
    if ('navigation' in performance) {
      const navType = (performance as any).navigation?.type || 'unknown';
      sendToAnalytics({
        name: 'Navigation Type',
        value: navType === 'reload' ? 1 : 0,
        rating: 'good',
        delta: 0,
        id: 'nav-type',
      });
    }

    // Report connection information
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        sendToAnalytics({
          name: 'Connection',
          value: connection.downlink || 0,
          rating: connection.effectiveType === '4g' ? 'good' : 'needs-improvement',
          delta: 0,
          id: 'connection',
        });
      }
    }
  }, []);

  return null;
}

// Hook for manual performance tracking
export function usePerformanceTracking() {
  const trackCustomMetric = (name: string, value: number, unit = 'ms') => {
    const analyticsData: AnalyticsData = {
      name: `Custom: ${name}`,
      value,
      rating: 'good',
      delta: 0,
      id: `custom-${name.toLowerCase().replace(/\s+/g, '-')}`,
    };

    sendToAnalytics(analyticsData);

    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Custom Metric: ${name}`, { value, unit });
    }
  };

  const trackUserTiming = (markName: string, measureName?: string) => {
    if (typeof window === 'undefined' || !performance.mark) return;

    try {
      performance.mark(markName);
      
      if (measureName) {
        performance.measure(measureName, markName);
        const measure = performance.getEntriesByName(measureName, 'measure')[0];
        if (measure) {
          trackCustomMetric(measureName, measure.duration);
        }
      }
    } catch (error) {
      console.warn('Performance tracking error:', error);
    }
  };

  const trackResourceTiming = () => {
    if (typeof window === 'undefined' || !performance.getEntriesByType) return;

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    // Track largest resources
    const largestResources = resources
      .sort((a, b) => b.transferSize - a.transferSize)
      .slice(0, 5);

    largestResources.forEach((resource, index) => {
      trackCustomMetric(
        `Largest Resource ${index + 1}`,
        resource.duration
      );
    });

    // Track resource types
    const resourceTypes = resources.reduce((acc, resource) => {
      const type = resource.initiatorType || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(resourceTypes).forEach(([type, count]) => {
      trackCustomMetric(`Resource Count: ${type}`, count, 'count');
    });
  };

  return {
    trackCustomMetric,
    trackUserTiming,
    trackResourceTiming,
  };
}