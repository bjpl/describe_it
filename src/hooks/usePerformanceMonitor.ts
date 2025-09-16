'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: any;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
}

interface PerformanceState {
  metrics: PerformanceMetrics;
  isMonitoring: boolean;
  alerts: string[];
}

export const usePerformanceMonitor = (componentName?: string) => {
  console.log(`[PERFORMANCE] Initializing monitor for ${componentName || 'component'}`);
  
  const [performanceState, setPerformanceState] = useState<PerformanceState>({
    metrics: { renderTime: 0 },
    isMonitoring: false,
    alerts: []
  });

  // SSR-safe performance measurement - NEVER call performance.now() during SSR
  const renderStartTime = useRef<number>(0);
  const observer = useRef<PerformanceObserver | null>(null);
  
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined' && typeof performance !== 'undefined';

  // Track component render performance
  const trackRenderStart = useCallback(() => {
    if (isBrowser) {
      renderStartTime.current = performance.now();
    } else {
      renderStartTime.current = Date.now();
    }
  }, [isBrowser]);

  const trackRenderEnd = useCallback(() => {
    try {
      if (renderStartTime.current > 0) {
        const renderTime = (isBrowser ? performance.now() : Date.now()) - renderStartTime.current;
        console.log(`[PERFORMANCE] ${componentName || 'Component'} render end: ${renderTime.toFixed(2)}ms`);
        
        setPerformanceState(prev => ({
          ...prev,
          metrics: { ...prev.metrics, renderTime }
        }));
        
        // Alert if render time is too high
        if (renderTime > 16) { // > 16ms can cause jank at 60fps
          const alertMessage = `Slow render: ${renderTime.toFixed(2)}ms in ${componentName || 'component'}`;
          console.warn(`[PERFORMANCE] ${alertMessage}`);
          setPerformanceState(prev => ({
            ...prev,
            alerts: [...prev.alerts, alertMessage]
          }));
        }
      }
    } catch (error) {
      console.warn('[PERFORMANCE] Failed to track render end:', error);
    }
  }, [componentName, isBrowser]);

  // Monitor Web Vitals
  const startWebVitalsMonitoring = useCallback(() => {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        setPerformanceState(prev => ({
          ...prev,
          metrics: { ...prev.metrics, largestContentfulPaint: entry.startTime }
        }));
        
        if (entry.startTime > 2500) { // LCP threshold
          setPerformanceState(prev => ({
            ...prev,
            alerts: [...prev.alerts, `Poor LCP: ${entry.startTime.toFixed(2)}ms`]
          }));
        }
      }
    });

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        setPerformanceState(prev => ({
          ...prev,
          metrics: { ...prev.metrics, firstContentfulPaint: entry.startTime }
        }));
      }
    });

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          const value = (entry as any).value;
          setPerformanceState(prev => ({
            ...prev,
            metrics: { ...prev.metrics, cumulativeLayoutShift: value }
          }));
          
          if (value > 0.1) { // CLS threshold
            setPerformanceState(prev => ({
              ...prev,
              alerts: [...prev.alerts, `High CLS: ${value.toFixed(3)}`]
            }));
          }
        }
      }
    });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fid = (entry as any).processingStart - entry.startTime;
        setPerformanceState(prev => ({
          ...prev,
          metrics: { ...prev.metrics, firstInputDelay: fid }
        }));
        
        if (fid > 100) { // FID threshold
          setPerformanceState(prev => ({
            ...prev,
            alerts: [...prev.alerts, `High FID: ${fid.toFixed(2)}ms`]
          }));
        }
      }
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      fcpObserver.observe({ entryTypes: ['paint'] });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      fidObserver.observe({ entryTypes: ['first-input'] });
      
      observer.current = lcpObserver; // Store reference for cleanup
      
      setPerformanceState(prev => ({ ...prev, isMonitoring: true }));
      
      return () => {
        try {
          lcpObserver.disconnect();
          fcpObserver.disconnect();
          clsObserver.disconnect();
          fidObserver.disconnect();
          console.log('[PERFORMANCE] Web Vitals observers disconnected');
        } catch (error) {
          console.warn('[PERFORMANCE] Failed to disconnect observers:', error);
        }
      };
    } catch (error) {
      console.warn('[PERFORMANCE] Failed to start Web Vitals monitoring:', error);
      return () => {}; // Return empty cleanup function
    }
  }, [isBrowser]);

  // Monitor memory usage (SSR-safe)
  const trackMemoryUsage = useCallback(() => {
    try {
      if (isBrowser && 'memory' in performance) {
        const memoryInfo = (performance as any).memory;
        setPerformanceState(prev => ({
          ...prev,
          metrics: { ...prev.metrics, memoryUsage: memoryInfo }
        }));
        
        // Alert if memory usage is high
        const usagePercent = (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100;
        if (usagePercent > 80) {
          const alertMessage = `High memory usage: ${usagePercent.toFixed(1)}%`;
          console.warn(`[PERFORMANCE] ${alertMessage}`);
          setPerformanceState(prev => ({
            ...prev,
            alerts: [...prev.alerts, alertMessage]
          }));
        }
      }
    } catch (error) {
      console.warn('[PERFORMANCE] Failed to track memory usage:', error);
    }
  }, [isBrowser]);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setPerformanceState(prev => ({ ...prev, alerts: [] }));
  }, []);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (observer.current) {
      observer.current.disconnect();
    }
    setPerformanceState(prev => ({ ...prev, isMonitoring: false }));
  }, []);

  // Automatic monitoring setup - SSR safe
  useEffect(() => {
    if (!isBrowser) return;
    
    trackRenderStart();
    const cleanup = startWebVitalsMonitoring();
    
    // Track memory periodically
    const memoryInterval = setInterval(trackMemoryUsage, 5000);
    
    return () => {
      cleanup?.();
      clearInterval(memoryInterval);
      trackRenderEnd();
    };
  }, [isBrowser, startWebVitalsMonitoring, trackMemoryUsage, trackRenderStart, trackRenderEnd]);

  // Performance utilities
  const getPerformanceScore = useCallback(() => {
    const { metrics } = performanceState;
    let score = 100;
    
    // Penalize based on metrics
    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) {
      score -= 20;
    }
    if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) {
      score -= 15;
    }
    if (metrics.firstInputDelay && metrics.firstInputDelay > 100) {
      score -= 15;
    }
    if (metrics.renderTime > 16) {
      score -= 10;
    }
    
    return Math.max(0, score);
  }, [performanceState]);

  const formatMetrics = useCallback(() => {
    const { metrics } = performanceState;
    return {
      'Render Time': `${metrics.renderTime.toFixed(2)}ms`,
      'LCP': metrics.largestContentfulPaint ? `${metrics.largestContentfulPaint.toFixed(2)}ms` : 'N/A',
      'FCP': metrics.firstContentfulPaint ? `${metrics.firstContentfulPaint.toFixed(2)}ms` : 'N/A',
      'CLS': metrics.cumulativeLayoutShift ? metrics.cumulativeLayoutShift.toFixed(3) : 'N/A',
      'FID': metrics.firstInputDelay ? `${metrics.firstInputDelay.toFixed(2)}ms` : 'N/A',
      'Memory': metrics.memoryUsage ? 
        `${(metrics.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB` : 'N/A'
    };
  }, [performanceState]);

  return {
    performanceState,
    trackRenderStart,
    trackRenderEnd,
    trackMemoryUsage,
    clearAlerts,
    stopMonitoring,
    getPerformanceScore,
    formatMetrics,
    isSupported: typeof window !== 'undefined' && 'PerformanceObserver' in window
  };
};