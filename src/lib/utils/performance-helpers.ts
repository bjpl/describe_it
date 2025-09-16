"use client";

import { useRef, useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

// Performance profiler class
export class PerformanceProfiler {
  private marks: Map<string, number> = new Map();
  private measurements: Map<string, number> = new Map();

  startMark(name: string): void {
    this.marks.set(name, performance.now());
  }

  endMark(name: string): number {
    const startTime = this.marks.get(name);
    if (startTime === undefined) {
      logger.warn(`Performance mark '${name}' not found`, {
        component: "performance-profiler",
        mark: name,
      });
      return 0;
    }

    const duration = performance.now() - startTime;
    this.measurements.set(name, duration);
    this.marks.delete(name);

    logger.performance(name, duration);

    return duration;
  }

  getMeasurement(name: string): number | undefined {
    return this.measurements.get(name);
  }

  clearMeasurements(): void {
    this.marks.clear();
    this.measurements.clear();
  }
}

export const performanceProfiler = new PerformanceProfiler();

// Custom hook for tracking render count
export function useRenderCount(componentName: string) {
  const renderCount = useRef(0);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    renderCount.current += 1;
    if (process.env.NODE_ENV === "development") {
      console.log(`${componentName} rendered ${renderCount.current} times`);
    }
  });

  return renderCount.current;
}

// Animation optimization utilities
export const optimizeAnimations = {
  // Create optimized animation variants with reduced motion support
  createOptimizedVariants: (variants: any) => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      // Return variants with no animation for users who prefer reduced motion
      const reducedVariants: any = {};
      Object.keys(variants).forEach((key) => {
        reducedVariants[key] = {
          ...variants[key],
          transition: { duration: 0 },
        };
      });
      return reducedVariants;
    }
    return variants;
  },

  // Get optimized transition settings
  getOptimizedTransition: (transition: any) => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return { duration: 0 };
    }
    return transition;
  },
};

// Shallow comparison utility for React.memo
export function shallowCompare<T extends Record<string, any>>(
  obj1: T,
  obj2: T,
): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Memory usage tracking (for development)
export const memoryTracker = {
  getMemoryUsage: () => {
    if (typeof window !== "undefined" && "memory" in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
      };
    }
    return null;
  },

  logMemoryUsage: (label: string) => {
    if (process.env.NODE_ENV === "development") {
      const usage = memoryTracker.getMemoryUsage();
      if (usage) {
        console.log(`Memory ${label}:`, usage);
      }
    }
  },
};

// Image loading optimization
export const imageOptimization = {
  preloadImage: (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  },

  preloadImages: async (sources: string[]): Promise<void> => {
    const promises = sources.map((src) => imageOptimization.preloadImage(src));
    await Promise.all(promises);
  },

  getOptimizedImageSrc: (src: string, width?: number, quality?: number) => {
    // This would integrate with your image optimization service
    // For now, return the original src
    return src;
  },
};

// Viewport detection hook
export function useIntersectionObserver(
  ref: React.RefObject<Element | null>,
  options: IntersectionObserverInit = {},
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

// Bundle size analyzer (development only)
export const bundleAnalyzer = {
  logComponentSize: (componentName: string, component: any) => {
    if (process.env.NODE_ENV === "development") {
      const size = safeStringify(component).length;
      console.log(`Component ${componentName} approximate size: ${size} bytes`);
    }
  },
};

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const mountTime = useRef<number>(performance.now());
  const renderCount = useRef(0);

  useEffect(() => {
    mountTime.current = performance.now();
    renderCount.current = 0;

    return () => {
      if (mountTime.current && process.env.NODE_ENV === "development") {
        const totalTime = performance.now() - mountTime.current;
        console.log(
          `Component ${componentName} was mounted for ${totalTime.toFixed(2)}ms with ${renderCount.current} renders`,
        );
      }
    };
  }, [componentName]);

  useEffect(() => {
    renderCount.current += 1;
  });

  return {
    renderCount: renderCount.current,
    mountTime: mountTime.current,
  };
}
