// This file enables Web Vitals tracking for the application
import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';
import { logger } from '@/lib/logger';

function sendToAnalytics(metric: any) {
  // Send to your analytics service
  logger.info('Web Vital:', { metric });
  
  // Example: Send to Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }
  
  // Example: Send to custom analytics endpoint
  if (typeof window !== 'undefined') {
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        url: window.location.href,
        timestamp: Date.now(),
      }),
    }).catch(error => logger.error('Failed to send web vitals to analytics', error as Error));
  }
}

export function reportWebVitals() {
  if (typeof window === 'undefined') return;

  try {
    onCLS(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
    onINP(sendToAnalytics);
  } catch (error) {
    logger.error('Failed to initialize Web Vitals reporting:', error as Error);
  }
}

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reportWebVitals);
  } else {
    reportWebVitals();
  }
}