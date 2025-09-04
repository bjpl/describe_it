/**
 * Performance Helper Utilities for React Component Optimizations
 * Used by Hive Mind Agent Gamma for performance optimization
 */

import React, { useCallback, useMemo, useRef } from 'react';

// Memoization comparison functions
export const shallowCompare = <T extends Record<string, any>>(
  prevProps: T,
  nextProps: T
): boolean => {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (let i = 0; i < prevKeys.length; i++) {
    const key = prevKeys[i];
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
};

export const deepCompare = <T extends Record<string, any>>(
  prevProps: T,
  nextProps: T,
  excludeKeys: string[] = []
): boolean => {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(prevProps).filter(([key]) => !excludeKeys.includes(key))
    )
  ) === JSON.stringify(
    Object.fromEntries(
      Object.entries(nextProps).filter(([key]) => !excludeKeys.includes(key))
    )
  );
};

// Stable callback helpers
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T => {
  return useCallback(callback, deps);
};

// Memoized complex calculations
export const useMemoizedCalculation = <T>(
  calculation: () => T,
  deps: any[]
): T => {
  return useMemo(calculation, deps);
};

// Debounced state updates
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Performance monitoring
export const performanceProfiler = {
  startMark: (name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`${name}-start`);
    }
  },

  endMark: (name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }
  },

  getMeasurements: (name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      return performance.getEntriesByName(name, 'measure');
    }
    return [];
  }
};

// List virtualization helpers
export const calculateVisibleRange = (
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 5
) => {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(totalItems, start + visibleCount + overscan * 2);
  
  return { start, end, visibleCount };
};

// Memory usage monitoring
export const memoryProfiler = {
  logMemoryUsage: (componentName: string) => {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      console.log(`[${componentName}] Memory Usage:`, {
        used: `${Math.round(memory.usedJSHeapSize / 1048576)}MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1048576)}MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1048576)}MB`
      });
    }
  }
};

// Render count tracking
export const useRenderCount = (componentName: string) => {
  const renderCount = useRef(0);
  
  renderCount.current += 1;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${componentName}] Render count: ${renderCount.current}`);
  }
  
  return renderCount.current;
};

// Component comparison helpers for React.memo
export const createMemoCompare = <T extends Record<string, any>>(
  compareKeys: (keyof T)[]
) => {
  return (prevProps: T, nextProps: T): boolean => {
    return compareKeys.every(key => prevProps[key] === nextProps[key]);
  };
};

// Bundle size helpers
export const lazyImport = <T extends Record<string, any>>(
  importFn: () => Promise<T>,
  fallback?: React.ComponentType
) => {
  return React.lazy(() => importFn());
};

// Animation performance helpers
export const optimizeAnimations = {
  getReducedMotionPreference: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  createOptimizedVariants: (variants: any) => {
    const reducedMotion = optimizeAnimations.getReducedMotionPreference();
    if (reducedMotion) {
      return Object.keys(variants).reduce((acc, key) => {
        acc[key] = { opacity: variants[key].opacity || 1 };
        return acc;
      }, {} as any);
    }
    return variants;
  }
};

// Image optimization helpers
export const imageOptimizer = {
  createSrcSet: (baseUrl: string, sizes: number[]) => {
    return sizes.map(size => `${baseUrl}&w=${size} ${size}w`).join(', ');
  },

  optimizeImageLoading: {
    loading: 'lazy' as const,
    decoding: 'async' as const,
    style: { contentVisibility: 'auto' }
  }
};

// Export performance measurement HOC
export const withPerformanceProfiler = <P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return React.memo((props: P) => {
    React.useEffect(() => {
      performanceProfiler.startMark(componentName);
      return () => {
        performanceProfiler.endMark(componentName);
      };
    });

    return React.createElement(Component, props);
  });
};