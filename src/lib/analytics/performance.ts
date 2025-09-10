/**
 * Performance Monitoring and Analytics
 * Tracks application performance metrics and user experience indicators
 */

import { trackEvent } from './tracker';
import { EventBuilders } from './events';

interface PerformanceMetrics {
  navigation?: PerformanceNavigationTiming;
  paint?: PerformancePaintTiming[];
  resource?: PerformanceResourceTiming[];
  memory?: any;
}

interface WebVitalsMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

class PerformanceMonitor {
  private observers: PerformanceObserver[] = [];
  private vitals: WebVitalsMetrics = {};
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'performance' in window;
    
    if (this.isSupported) {
      this.initializeObservers();
      this.trackPageLoad();
    }
  }

  private initializeObservers() {
    // Web Vitals observers
    this.observeWebVitals();
    
    // Resource timing observer
    this.observeResourceTiming();
    
    // Long task observer
    this.observeLongTasks();
  }

  private observeWebVitals() {
    // First Contentful Paint
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.vitals.fcp = entry.startTime;
            this.reportWebVitals();
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);
    } catch (error) {
      console.warn('FCP observation not supported:', error);
    }

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.vitals.lcp = lastEntry.startTime;
        this.reportWebVitals();
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (error) {
      console.warn('LCP observation not supported:', error);
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = (entry as any).processingStart - entry.startTime;
          this.vitals.fid = fid;
          this.reportWebVitals();
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (error) {
      console.warn('FID observation not supported:', error);
    }

    // Cumulative Layout Shift
    try {
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsScore += (entry as any).value;
            this.vitals.cls = clsScore;
            this.reportWebVitals();
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('CLS observation not supported:', error);
    }
  }

  private observeResourceTiming() {
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;
          
          // Track slow resources
          if (resource.duration > 1000) {
            trackEvent({
              eventName: 'api_response_time',
              timestamp: Date.now(),
              properties: {
                resource: resource.name,
                duration: resource.duration,
                size: resource.transferSize,
                type: this.getResourceType(resource.name),
              },
            });
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource timing observation not supported:', error);
    }
  }

  private observeLongTasks() {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          trackEvent({
            eventName: 'performance_issue',
            timestamp: Date.now(),
            properties: {
              type: 'long_task',
              duration: entry.duration,
              startTime: entry.startTime,
            },
          });
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    } catch (error) {
      console.warn('Long task observation not supported:', error);
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('/api/')) return 'api';
    if (url.match(/\.(js|jsx|ts|tsx)$/)) return 'script';
    if (url.match(/\.(css)$/)) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    return 'other';
  }

  private trackPageLoad() {
    if (!this.isSupported) return;

    // TTFB calculation
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.vitals.ttfb = navigation.responseStart - navigation.requestStart;
      this.reportWebVitals();
    }

    // Page load complete
    window.addEventListener('load', () => {
      setTimeout(() => {
        const loadTime = performance.now();
        trackEvent({
          eventName: 'page_load',
          timestamp: Date.now(),
          properties: {
            loadTime,
            route: window.location.pathname,
            referrer: document.referrer,
          },
        });
      }, 0);
    });
  }

  private reportWebVitals() {
    // Only report when we have meaningful data
    if (Object.keys(this.vitals).length >= 2) {
      trackEvent(EventBuilders.webVitals(
        performance.now().toString(),
        { ...this.vitals },
        window.location.pathname
      ));
    }
  }

  public trackComponentRender(componentName: string, renderTime: number) {
    trackEvent(EventBuilders.performanceMetric(
      performance.now().toString(),
      componentName,
      renderTime,
      window.location.pathname
    ));
  }

  public trackApiCall(endpoint: string, method: string, startTime: number) {
    const duration = performance.now() - startTime;
    
    trackEvent({
      eventName: 'api_response_time',
      timestamp: Date.now(),
      properties: {
        endpoint,
        method,
        duration,
      },
    });
  }

  public trackMemoryUsage() {
    if (!this.isSupported || !(performance as any).memory) return;

    const memory = (performance as any).memory;
    trackEvent({
      eventName: 'memory_usage',
      timestamp: Date.now(),
      properties: {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      },
    });
  }

  public getVitals(): WebVitalsMetrics {
    return { ...this.vitals };
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    if (!this.isSupported) return {};

    return {
      navigation: performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming,
      paint: performance.getEntriesByType('paint') as PerformancePaintTiming[],
      resource: performance.getEntriesByType('resource') as PerformanceResourceTiming[],
      memory: (performance as any).memory,
    };
  }

  public destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React Hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const trackRender = () => {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      performanceMonitor.trackComponentRender(componentName, renderTime);
    };
  };

  return { trackRender };
}

// Higher-order component for automatic performance tracking
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name;
  
  const PerformanceTrackedComponent = (props: P) => {
    const startTime = performance.now();
    
    React.useEffect(() => {
      const renderTime = performance.now() - startTime;
      performanceMonitor.trackComponentRender(displayName, renderTime);
    }, []);
    
    return React.createElement(WrappedComponent, props);
  };
  
  PerformanceTrackedComponent.displayName = `withPerformanceTracking(${displayName})`;
  
  return PerformanceTrackedComponent;
}

export default performanceMonitor;