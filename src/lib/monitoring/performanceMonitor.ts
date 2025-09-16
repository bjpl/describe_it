/**
 * Performance Monitoring Service
 * Provides comprehensive performance tracking and monitoring capabilities
 */

import { logger } from '@/lib/logger';
import { errorHandler } from '@/lib/errorHandler';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

// Performance metric types
export enum MetricType {
  NAVIGATION = 'navigation',
  PAINT = 'paint',
  LAYOUT = 'layout',
  API_CALL = 'api_call',
  COMPONENT_RENDER = 'component_render',
  USER_INTERACTION = 'user_interaction',
  MEMORY_USAGE = 'memory_usage',
  CUSTOM = 'custom',
}

// Performance metric interface
export interface PerformanceMetric {
  id: string;
  type: MetricType;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, any>;
  threshold?: {
    warning: number;
    error: number;
  };
}

// Performance summary interface
export interface PerformanceSummary {
  metrics: PerformanceMetric[];
  aggregations: {
    averages: Record<string, number>;
    p50: Record<string, number>;
    p95: Record<string, number>;
    p99: Record<string, number>;
  };
  slowMetrics: PerformanceMetric[];
  memoryStats?: {
    used: number;
    total: number;
    percentage: number;
  };
  recommendations: string[];
}

// Performance monitor configuration
export interface PerformanceMonitorConfig {
  enabled: boolean;
  maxMetrics: number;
  enableWebVitals: boolean;
  enableResourceTiming: boolean;
  enableUserTiming: boolean;
  enableMemoryMonitoring: boolean;
  thresholds: {
    [MetricType.API_CALL]: { warning: number; error: number };
    [MetricType.COMPONENT_RENDER]: { warning: number; error: number };
    [MetricType.USER_INTERACTION]: { warning: number; error: number };
    [MetricType.NAVIGATION]: { warning: number; error: number };
    [MetricType.PAINT]: { warning: number; error: number };
    [MetricType.LAYOUT]: { warning: number; error: number };
    [MetricType.MEMORY_USAGE]: { warning: number; error: number };
    [MetricType.CUSTOM]: { warning: number; error: number };
  };
}

// Default configuration
const DEFAULT_CONFIG: PerformanceMonitorConfig = {
  enabled: true,
  maxMetrics: 1000,
  enableWebVitals: true,
  enableResourceTiming: true,
  enableUserTiming: true,
  enableMemoryMonitoring: true,
  thresholds: {
    [MetricType.API_CALL]: { warning: 1000, error: 3000 },
    [MetricType.COMPONENT_RENDER]: { warning: 16, error: 50 },
    [MetricType.USER_INTERACTION]: { warning: 100, error: 300 },
    [MetricType.NAVIGATION]: { warning: 2000, error: 5000 },
    [MetricType.PAINT]: { warning: 100, error: 300 },
    [MetricType.LAYOUT]: { warning: 16, error: 50 },
    [MetricType.MEMORY_USAGE]: { warning: 50000000, error: 100000000 },
    [MetricType.CUSTOM]: { warning: 1000, error: 3000 },
  },
};

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private config: PerformanceMonitorConfig;
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isClient: boolean;

  constructor(config: Partial<PerformanceMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isClient = typeof window !== 'undefined';
    this.initialize();
  }

  static getInstance(config?: Partial<PerformanceMonitorConfig>): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }

  private initialize() {
    if (!this.isClient || !this.config.enabled) return;

    try {
      // Initialize Web Vitals monitoring
      if (this.config.enableWebVitals) {
        this.initializeWebVitals();
      }

      // Initialize Resource Timing
      if (this.config.enableResourceTiming) {
        this.initializeResourceTiming();
      }

      // Initialize User Timing
      if (this.config.enableUserTiming) {
        this.initializeUserTiming();
      }

      // Initialize Memory Monitoring
      if (this.config.enableMemoryMonitoring) {
        this.initializeMemoryMonitoring();
      }

      logger.info('Performance monitoring initialized', {
        config: this.config,
      });
    } catch (error) {
      logger.error('Failed to initialize performance monitoring', error as Error);
    }
  }

  private initializeWebVitals() {
    try {
      // Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.addMetric({
            type: MetricType.PAINT,
            name: entry.name,
            value: entry.startTime,
            unit: 'ms',
            metadata: {
              entryType: entry.entryType,
              webVital: true,
            },
          });
        }
      });

      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
      this.observers.push(observer);

      // First Input Delay (FID)
      if ('PerformanceEventTiming' in window) {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ((entry as any).processingStart && entry.startTime) {
              const fid = (entry as any).processingStart - entry.startTime;
              this.addMetric({
                type: MetricType.USER_INTERACTION,
                name: 'first-input-delay',
                value: fid,
                unit: 'ms',
                metadata: {
                  webVital: true,
                  eventType: (entry as any).name,
                },
                threshold: { warning: 100, error: 300 },
              });
            }
          }
        });

        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      }
    } catch (error) {
      logger.warn('Failed to initialize Web Vitals monitoring', { error });
    }
  }

  private initializeResourceTiming() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;
          
          this.addMetric({
            type: MetricType.API_CALL,
            name: `resource-${resource.name.split('/').pop()}`,
            value: resource.responseEnd - resource.requestStart,
            unit: 'ms',
            metadata: {
              url: resource.name,
              type: resource.initiatorType,
              size: resource.transferSize,
              cached: resource.transferSize === 0,
            },
          });
        }
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (error) {
      logger.warn('Failed to initialize Resource Timing monitoring', { error });
    }
  }

  private initializeUserTiming() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.addMetric({
            type: MetricType.CUSTOM,
            name: entry.name,
            value: entry.duration || entry.startTime,
            unit: 'ms',
            metadata: {
              entryType: entry.entryType,
              userTiming: true,
            },
          });
        }
      });

      observer.observe({ entryTypes: ['measure', 'mark'] });
      this.observers.push(observer);
    } catch (error) {
      logger.warn('Failed to initialize User Timing monitoring', { error });
    }
  }

  private initializeMemoryMonitoring() {
    if (!('memory' in performance)) return;

    const monitorMemory = () => {
      try {
        const memory = (performance as any).memory;
        if (memory) {
          const memoryUsage = {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
          };

          this.addMetric({
            type: MetricType.MEMORY_USAGE,
            name: 'js-heap-usage',
            value: memoryUsage.used,
            unit: 'bytes',
            metadata: {
              total: memoryUsage.total,
              limit: memoryUsage.limit,
              percentage: (memoryUsage.used / memoryUsage.total) * 100,
            },
          });

          // Alert on high memory usage
          const percentage = (memoryUsage.used / memoryUsage.total) * 100;
          if (percentage > 80) {
            logger.warn('High memory usage detected', {
              percentage,
              used: memoryUsage.used,
              total: memoryUsage.total,
            });
          }
        }
      } catch (error) {
        logger.warn('Failed to collect memory stats', { error });
      }
    };

    // Monitor memory every 30 seconds
    const memoryInterval = setInterval(monitorMemory, 30000);
    
    // Clean up on page unload
    if (this.isClient) {
      window.addEventListener('beforeunload', () => {
        clearInterval(memoryInterval);
      });
    }
  }

  // Add a performance metric
  public addMetric(metricData: Omit<PerformanceMetric, 'id' | 'timestamp'>): PerformanceMetric {
    if (!this.config.enabled) {
      return {} as PerformanceMetric;
    }

    const metric: PerformanceMetric = {
      ...metricData,
      id: this.generateMetricId(),
      timestamp: Date.now(),
    };

    // Add to metrics array
    this.metrics.push(metric);

    // Maintain max metrics limit
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics.shift();
    }

    // Check thresholds and log warnings/errors
    this.checkThresholds(metric);

    // Log the metric
    logger.performance(metric.name, metric.value, {
      type: metric.type,
      unit: metric.unit,
      metadata: metric.metadata,
    });

    return metric;
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkThresholds(metric: PerformanceMetric) {
    const threshold = metric.threshold || this.config.thresholds[metric.type];
    if (!threshold) return;

    if (metric.value > threshold.error) {
      errorHandler.createError(
        `Performance threshold exceeded: ${metric.name}`,
        'performance' as any,
        'medium' as any,
        'none' as any,
        {
          metric: metric.name,
          value: metric.value,
          threshold: threshold.error,
          unit: metric.unit,
        }
      );
    } else if (metric.value > threshold.warning) {
      logger.warn(`Performance warning: ${metric.name}`, {
        value: metric.value,
        threshold: threshold.warning,
        unit: metric.unit,
        metadata: metric.metadata,
      });
    }
  }

  // Track API call performance
  public trackApiCall(url: string, method: string = 'GET'): {
    finish: (statusCode?: number, error?: Error) => void;
  } {
    const startTime = performance.now();
    const metricName = `${method.toUpperCase()} ${url}`;

    return {
      finish: (statusCode?: number, error?: Error) => {
        const duration = performance.now() - startTime;
        
        this.addMetric({
          type: MetricType.API_CALL,
          name: metricName,
          value: duration,
          unit: 'ms',
          metadata: {
            url,
            method,
            statusCode,
            success: !error,
            error: error?.message,
          },
          threshold: this.config.thresholds[MetricType.API_CALL],
        });
      },
    };
  }

  // Track component render performance
  public trackComponentRender(componentName: string): {
    finish: () => void;
  } {
    const startTime = performance.now();

    return {
      finish: () => {
        const duration = performance.now() - startTime;
        
        this.addMetric({
          type: MetricType.COMPONENT_RENDER,
          name: `${componentName}-render`,
          value: duration,
          unit: 'ms',
          metadata: {
            component: componentName,
          },
          threshold: this.config.thresholds[MetricType.COMPONENT_RENDER],
        });
      },
    };
  }

  // Track user interaction performance
  public trackUserInteraction(interactionType: string, targetElement?: string): {
    finish: () => void;
  } {
    const startTime = performance.now();

    return {
      finish: () => {
        const duration = performance.now() - startTime;
        
        this.addMetric({
          type: MetricType.USER_INTERACTION,
          name: `${interactionType}-interaction`,
          value: duration,
          unit: 'ms',
          metadata: {
            interactionType,
            targetElement,
          },
          threshold: this.config.thresholds[MetricType.USER_INTERACTION],
        });
      },
    };
  }

  // Get performance summary
  public getPerformanceSummary(timeRange?: { start: number; end: number }): PerformanceSummary {
    let filteredMetrics = this.metrics;
    
    if (timeRange) {
      filteredMetrics = this.metrics.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    // Calculate aggregations
    const metricsByName = filteredMetrics.reduce((acc, metric) => {
      if (!acc[metric.name]) acc[metric.name] = [];
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    const averages: Record<string, number> = {};
    const p50: Record<string, number> = {};
    const p95: Record<string, number> = {};
    const p99: Record<string, number> = {};

    Object.entries(metricsByName).forEach(([name, values]) => {
      const sorted = values.sort((a, b) => a - b);
      averages[name] = values.reduce((a, b) => a + b, 0) / values.length;
      p50[name] = sorted[Math.floor(sorted.length * 0.5)];
      p95[name] = sorted[Math.floor(sorted.length * 0.95)];
      p99[name] = sorted[Math.floor(sorted.length * 0.99)];
    });

    // Find slow metrics
    const slowMetrics = filteredMetrics.filter(metric => {
      const threshold = metric.threshold || this.config.thresholds[metric.type];
      return threshold && metric.value > threshold.warning;
    });

    // Memory stats
    let memoryStats: PerformanceSummary['memoryStats'];
    if (this.isClient && 'memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        memoryStats = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
        };
      }
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(filteredMetrics, slowMetrics, memoryStats);

    return {
      metrics: filteredMetrics,
      aggregations: {
        averages,
        p50,
        p95,
        p99,
      },
      slowMetrics,
      memoryStats,
      recommendations,
    };
  }

  private generateRecommendations(
    metrics: PerformanceMetric[],
    slowMetrics: PerformanceMetric[],
    memoryStats?: PerformanceSummary['memoryStats']
  ): string[] {
    const recommendations: string[] = [];

    // API call recommendations
    const slowApiCalls = slowMetrics.filter(m => m.type === MetricType.API_CALL);
    if (slowApiCalls.length > 0) {
      recommendations.push(`${slowApiCalls.length} API calls are slower than expected. Consider caching, pagination, or optimizing queries.`);
    }

    // Component render recommendations
    const slowRenders = slowMetrics.filter(m => m.type === MetricType.COMPONENT_RENDER);
    if (slowRenders.length > 0) {
      recommendations.push(`${slowRenders.length} components have slow render times. Consider React.memo, useMemo, or component splitting.`);
    }

    // Memory recommendations
    if (memoryStats && memoryStats.percentage > 70) {
      recommendations.push('High memory usage detected. Consider cleaning up event listeners, clearing intervals, or optimizing data structures.');
    }

    // User interaction recommendations
    const slowInteractions = slowMetrics.filter(m => m.type === MetricType.USER_INTERACTION);
    if (slowInteractions.length > 0) {
      recommendations.push(`${slowInteractions.length} user interactions are slow. Consider debouncing, throttling, or async processing.`);
    }

    return recommendations;
  }

  // Clear metrics
  public clearMetrics() {
    this.metrics = [];
  }

  // Update configuration
  public updateConfig(newConfig: Partial<PerformanceMonitorConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    if (!this.config.enabled) {
      this.disconnect();
    } else if (this.isClient) {
      this.initialize();
    }
  }

  // Get current configuration
  public getConfig(): PerformanceMonitorConfig {
    return { ...this.config };
  }

  // Disconnect all observers
  public disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  // Export metrics as JSON
  public exportMetrics(): string {
    return JSON.stringify({
      summary: this.getPerformanceSummary(),
      config: this.config,
      exportTime: new Date().toISOString(),
    }, null, 2);
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Utility functions
export const trackApiCall = (url: string, method?: string) =>
  performanceMonitor.trackApiCall(url, method);

export const trackComponentRender = (componentName: string) =>
  performanceMonitor.trackComponentRender(componentName);

export const trackUserInteraction = (interactionType: string, targetElement?: string) =>
  performanceMonitor.trackUserInteraction(interactionType, targetElement);

export const getPerformanceSummary = (timeRange?: { start: number; end: number }) =>
  performanceMonitor.getPerformanceSummary(timeRange);