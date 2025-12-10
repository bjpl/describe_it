/**
 * React Performance Profiler
 *
 * Tools for monitoring and optimizing React component performance:
 * - Component render tracking
 * - Re-render analysis
 * - Performance budgets
 * - Component profiling hooks
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';

export interface RenderMetrics {
  componentName: string;
  renderCount: number;
  averageRenderTime: number;
  totalRenderTime: number;
  lastRenderTime: number;
  slowRenders: number;
  timestamp: number;
}

export interface PerformanceBudget {
  maxRenderTime: number; // milliseconds
  maxReRenders: number; // per minute
  warnThreshold: number; // percentage of budget
}

const DEFAULT_BUDGET: PerformanceBudget = {
  maxRenderTime: 16, // 60fps = 16.67ms per frame
  maxReRenders: 100, // Maximum re-renders per minute
  warnThreshold: 0.8, // Warn at 80% of budget
};

class ReactProfiler {
  private metrics: Map<string, RenderMetrics> = new Map();
  private budgets: Map<string, PerformanceBudget> = new Map();
  private renderTimestamps: Map<string, number[]> = new Map();
  private isProfilingEnabled = process.env.NODE_ENV === 'development';

  /**
   * Track a component render
   */
  trackRender(
    componentName: string,
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ): void {
    if (!this.isProfilingEnabled) return;

    const existing = this.metrics.get(componentName) || {
      componentName,
      renderCount: 0,
      averageRenderTime: 0,
      totalRenderTime: 0,
      lastRenderTime: 0,
      slowRenders: 0,
      timestamp: Date.now(),
    };

    const newRenderCount = existing.renderCount + 1;
    const newTotalTime = existing.totalRenderTime + actualDuration;

    const updated: RenderMetrics = {
      componentName,
      renderCount: newRenderCount,
      averageRenderTime: newTotalTime / newRenderCount,
      totalRenderTime: newTotalTime,
      lastRenderTime: actualDuration,
      slowRenders:
        actualDuration > (this.budgets.get(componentName)?.maxRenderTime || DEFAULT_BUDGET.maxRenderTime)
          ? existing.slowRenders + 1
          : existing.slowRenders,
      timestamp: Date.now(),
    };

    this.metrics.set(componentName, updated);

    // Track render timestamps for re-render rate analysis
    this.trackRenderTimestamp(componentName, commitTime);

    // Check performance budget
    this.checkBudget(componentName, updated);
  }

  /**
   * Set performance budget for a component
   */
  setBudget(componentName: string, budget: Partial<PerformanceBudget>): void {
    const existing = this.budgets.get(componentName) || DEFAULT_BUDGET;
    this.budgets.set(componentName, { ...existing, ...budget });
  }

  /**
   * Get metrics for a component
   */
  getMetrics(componentName: string): RenderMetrics | null {
    return this.metrics.get(componentName) || null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): RenderMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get components exceeding performance budgets
   */
  getSlowComponents(): RenderMetrics[] {
    return this.getAllMetrics().filter(metric => {
      const budget = this.budgets.get(metric.componentName) || DEFAULT_BUDGET;
      return (
        metric.averageRenderTime > budget.maxRenderTime ||
        metric.slowRenders / metric.renderCount > budget.warnThreshold
      );
    });
  }

  /**
   * Analyze re-render patterns
   */
  analyzeReRenders(componentName: string, windowMs = 60000): {
    reRendersPerMinute: number;
    timestamps: number[];
    exceedsBudget: boolean;
  } {
    const timestamps = this.renderTimestamps.get(componentName) || [];
    const now = Date.now();
    const recentRenders = timestamps.filter(t => now - t < windowMs);

    const budget = this.budgets.get(componentName) || DEFAULT_BUDGET;
    const reRendersPerMinute = (recentRenders.length / windowMs) * 60000;

    return {
      reRendersPerMinute,
      timestamps: recentRenders,
      exceedsBudget: reRendersPerMinute > budget.maxReRenders,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: {
      totalComponents: number;
      slowComponents: number;
      totalRenders: number;
      averageRenderTime: number;
    };
    components: Array<{
      name: string;
      metrics: RenderMetrics;
      reRenderRate: number;
      budgetStatus: 'good' | 'warning' | 'exceeded';
    }>;
  } {
    const allMetrics = this.getAllMetrics();
    const totalRenders = allMetrics.reduce((sum, m) => sum + m.renderCount, 0);
    const totalTime = allMetrics.reduce((sum, m) => sum + m.totalRenderTime, 0);

    const components = allMetrics.map(metrics => {
      const analysis = this.analyzeReRenders(metrics.componentName);
      const budget = this.budgets.get(metrics.componentName) || DEFAULT_BUDGET;

      let budgetStatus: 'good' | 'warning' | 'exceeded' = 'good';
      const timeRatio = metrics.averageRenderTime / budget.maxRenderTime;
      const reRenderRatio = analysis.reRendersPerMinute / budget.maxReRenders;

      if (timeRatio > 1 || reRenderRatio > 1) {
        budgetStatus = 'exceeded';
      } else if (timeRatio > budget.warnThreshold || reRenderRatio > budget.warnThreshold) {
        budgetStatus = 'warning';
      }

      return {
        name: metrics.componentName,
        metrics,
        reRenderRate: analysis.reRendersPerMinute,
        budgetStatus,
      };
    });

    // Sort by performance issues
    components.sort((a, b) => {
      const statusWeight = { exceeded: 3, warning: 2, good: 1 };
      const weightA = statusWeight[a.budgetStatus];
      const weightB = statusWeight[b.budgetStatus];
      if (weightA !== weightB) return weightB - weightA;
      return b.metrics.averageRenderTime - a.metrics.averageRenderTime;
    });

    return {
      summary: {
        totalComponents: allMetrics.length,
        slowComponents: this.getSlowComponents().length,
        totalRenders,
        averageRenderTime: totalTime / totalRenders || 0,
      },
      components,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.renderTimestamps.clear();
  }

  /**
   * Enable/disable profiling
   */
  setProfilingEnabled(enabled: boolean): void {
    this.isProfilingEnabled = enabled;
  }

  // Private methods

  private trackRenderTimestamp(componentName: string, timestamp: number): void {
    const existing = this.renderTimestamps.get(componentName) || [];
    const now = Date.now();

    // Keep only recent timestamps (last 5 minutes)
    const recent = existing.filter(t => now - t < 5 * 60 * 1000);
    recent.push(timestamp);

    this.renderTimestamps.set(componentName, recent);
  }

  private checkBudget(componentName: string, metrics: RenderMetrics): void {
    const budget = this.budgets.get(componentName) || DEFAULT_BUDGET;
    const analysis = this.analyzeReRenders(componentName);

    // Check render time budget
    if (metrics.lastRenderTime > budget.maxRenderTime) {
      logger.warn('Component exceeded render time budget', {
        component: componentName,
        actualTime: `${metrics.lastRenderTime.toFixed(2)}ms`,
        budget: `${budget.maxRenderTime}ms`,
      });
    }

    // Check re-render rate budget
    if (analysis.exceedsBudget) {
      logger.warn('Component exceeded re-render rate budget', {
        component: componentName,
        actualRate: `${analysis.reRendersPerMinute.toFixed(1)}/min`,
        budget: `${budget.maxReRenders}/min`,
      });
    }
  }
}

// Singleton instance
export const reactProfiler = new ReactProfiler();

// React Hooks

/**
 * Hook to profile a component's renders
 */
export function useComponentProfiler(componentName: string, budget?: Partial<PerformanceBudget>) {
  const renderCount = useRef(0);
  const startTime = useRef(0);

  useEffect(() => {
    if (budget) {
      reactProfiler.setBudget(componentName, budget);
    }
  }, [componentName, budget]);

  useEffect(() => {
    startTime.current = performance.now();
    renderCount.current += 1;

    return () => {
      const duration = performance.now() - startTime.current;
      reactProfiler.trackRender(
        componentName,
        duration,
        duration,
        startTime.current,
        performance.now()
      );
    };
  });

  return {
    renderCount: renderCount.current,
    getMetrics: () => reactProfiler.getMetrics(componentName),
  };
}

/**
 * Hook to track why a component re-rendered
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, unknown>) {
  const previousProps = useRef<Record<string, unknown> | undefined>(undefined);

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: unknown; to: unknown }> = {};

      allKeys.forEach(key => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        logger.info(`[${name}] Re-render caused by:`, changedProps);
      }
    }

    previousProps.current = props;
  });
}

/**
 * Hook to measure expensive computations
 */
export function useMeasureComputation<T>(
  name: string,
  computation: () => T,
  deps: React.DependencyList
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    const start = performance.now();
    const result = computation();
    const duration = performance.now() - start;

    if (duration > 10) { // Log if computation takes > 10ms
      logger.warn('Expensive computation detected', {
        name,
        duration: duration,
      });
    }

    return result;
  }, deps);
}

/**
 * Hook to debounce expensive operations
 */
export function useDebounceCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Export performance report for analysis
 */
export function exportPerformanceReport(): string {
  const report = reactProfiler.generateReport();
  return JSON.stringify(report, null, 2);
}
