import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  labels?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
}

export interface TimerMetric {
  start: number;
  end?: number;
  duration?: number;
  name: string;
  labels?: Record<string, string>;
}

export interface HistogramData {
  count: number;
  sum: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  buckets: Map<number, number>;
}

export interface PerformanceReport {
  timeRange: {
    start: Date;
    end: Date;
    duration: number;
  };
  metrics: {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, HistogramData>;
    timers: Record<string, HistogramData>;
  };
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

export class PerformanceMonitor extends EventEmitter {
  private metrics = new Map<string, PerformanceMetric[]>();
  private timers = new Map<string, TimerMetric>();
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private reportingInterval?: NodeJS.Timeout;
  private startTime = Date.now();
  private memoryUsageHistory: NodeJS.MemoryUsage[] = [];
  private cpuUsageHistory: NodeJS.CpuUsage[] = [];

  constructor(private config: {
    reportingIntervalMs?: number;
    maxMetricsHistory?: number;
    enableSystemMetrics?: boolean;
  } = {}) {
    super();
    
    this.config = {
      reportingIntervalMs: 60000, // 1 minute
      maxMetricsHistory: 1000,
      enableSystemMetrics: true,
      ...config,
    };

    if (this.config.reportingIntervalMs) {
      this.startReporting();
    }

    if (this.config.enableSystemMetrics) {
      this.startSystemMetricsCollection();
    }
  }

  private startReporting(): void {
    this.reportingInterval = setInterval(() => {
      const report = this.generateReport();
      this.emit('report', report);
    }, this.config.reportingIntervalMs);
  }

  private startSystemMetricsCollection(): void {
    const collectSystemMetrics = () => {
      // Memory usage
      const memUsage = process.memoryUsage();
      this.memoryUsageHistory.push(memUsage);
      if (this.memoryUsageHistory.length > 100) {
        this.memoryUsageHistory = this.memoryUsageHistory.slice(-50);
      }

      // CPU usage
      const cpuUsage = process.cpuUsage();
      this.cpuUsageHistory.push(cpuUsage);
      if (this.cpuUsageHistory.length > 100) {
        this.cpuUsageHistory = this.cpuUsageHistory.slice(-50);
      }

      // Record as gauges
      this.gauge('system.memory.heap.used', memUsage.heapUsed);
      this.gauge('system.memory.heap.total', memUsage.heapTotal);
      this.gauge('system.memory.rss', memUsage.rss);
      this.gauge('system.memory.external', memUsage.external);
      this.gauge('system.cpu.user', cpuUsage.user);
      this.gauge('system.cpu.system', cpuUsage.system);
    };

    // Collect system metrics every 5 seconds
    setInterval(collectSystemMetrics, 5000);
    collectSystemMetrics(); // Initial collection
  }

  // Counter methods
  counter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
    
    this.recordMetric({
      name,
      value: current + value,
      unit: 'count',
      timestamp: new Date(),
      labels,
      type: 'counter',
    });
  }

  incrementCounter(name: string, labels?: Record<string, string>): void {
    this.counter(name, 1, labels);
  }

  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  // Gauge methods
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    this.gauges.set(name, value);
    
    this.recordMetric({
      name,
      value,
      unit: 'value',
      timestamp: new Date(),
      labels,
      type: 'gauge',
    });
  }

  getGauge(name: string): number | undefined {
    return this.gauges.get(name);
  }

  // Histogram methods
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    const values = this.histograms.get(name) || [];
    values.push(value);
    
    // Keep only recent values
    if (values.length > this.config.maxMetricsHistory!) {
      values.splice(0, values.length - this.config.maxMetricsHistory!);
    }
    
    this.histograms.set(name, values);
    
    this.recordMetric({
      name,
      value,
      unit: 'distribution',
      timestamp: new Date(),
      labels,
      type: 'histogram',
    });
  }

  getHistogramData(name: string): HistogramData | undefined {
    const values = this.histograms.get(name);
    if (!values || values.length === 0) return undefined;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const min = sorted[0];
    const max = sorted[count - 1];
    const mean = sum / count;

    // Calculate percentiles
    const p50Index = Math.floor(count * 0.5);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);

    const p50 = sorted[p50Index];
    const p95 = sorted[p95Index];
    const p99 = sorted[p99Index];

    // Create buckets for histogram
    const buckets = new Map<number, number>();
    const bucketBoundaries = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
    
    for (const boundary of bucketBoundaries) {
      const countInBucket = sorted.filter(v => v <= boundary).length;
      buckets.set(boundary, countInBucket);
    }

    return {
      count,
      sum,
      min,
      max,
      mean,
      p50,
      p95,
      p99,
      buckets,
    };
  }

  // Timer methods
  startTimer(name: string, labels?: Record<string, string>): string {
    const timerId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.timers.set(timerId, {
      start: performance.now(),
      name,
      labels,
    });
    
    return timerId;
  }

  endTimer(timerId: string): number | undefined {
    const timer = this.timers.get(timerId);
    if (!timer) return undefined;

    const end = performance.now();
    const duration = end - timer.start;
    
    timer.end = end;
    timer.duration = duration;
    
    this.histogram(timer.name, duration, timer.labels);
    this.timers.delete(timerId);
    
    return duration;
  }

  // Timing wrapper
  async time<T>(name: string, operation: () => Promise<T>, labels?: Record<string, string>): Promise<T> {
    const timerId = this.startTimer(name, labels);
    try {
      const result = await operation();
      this.endTimer(timerId);
      return result;
    } catch (error) {
      this.endTimer(timerId);
      this.counter(`${name}.errors`, 1, labels);
      throw error;
    }
  }

  timeSync<T>(name: string, operation: () => T, labels?: Record<string, string>): T {
    const timerId = this.startTimer(name, labels);
    try {
      const result = operation();
      this.endTimer(timerId);
      return result;
    } catch (error) {
      this.endTimer(timerId);
      this.counter(`${name}.errors`, 1, labels);
      throw error;
    }
  }

  // Metric recording
  private recordMetric(metric: PerformanceMetric): void {
    const metrics = this.metrics.get(metric.name) || [];
    metrics.push(metric);
    
    // Keep only recent metrics
    if (metrics.length > this.config.maxMetricsHistory!) {
      metrics.splice(0, metrics.length - this.config.maxMetricsHistory!);
    }
    
    this.metrics.set(metric.name, metrics);
    this.emit('metric', metric);
  }

  // Report generation
  generateReport(timeRangeMs?: number): PerformanceReport {
    const now = new Date();
    const startTime = timeRangeMs ? new Date(now.getTime() - timeRangeMs) : new Date(this.startTime);
    
    const counters: Record<string, number> = {};
    for (const [name, value] of this.counters) {
      counters[name] = value;
    }

    const gauges: Record<string, number> = {};
    for (const [name, value] of this.gauges) {
      gauges[name] = value;
    }

    const histograms: Record<string, HistogramData> = {};
    for (const [name] of this.histograms) {
      const data = this.getHistogramData(name);
      if (data) {
        histograms[name] = data;
      }
    }

    // Timers are stored as histograms
    const timers: Record<string, HistogramData> = {};
    for (const [name, data] of Object.entries(histograms)) {
      if (name.includes('time') || name.includes('duration') || name.includes('latency')) {
        timers[name] = data;
      }
    }

    // Calculate summary metrics
    const totalRequests = counters['requests.total'] || 0;
    const totalErrors = counters['requests.errors'] || 0;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    
    const responseTimeData = this.getHistogramData('request.duration');
    const averageResponseTime = responseTimeData?.mean || 0;
    
    const duration = now.getTime() - startTime.getTime();
    const throughput = totalRequests / (duration / 1000); // requests per second

    const latestMemory = this.memoryUsageHistory[this.memoryUsageHistory.length - 1] || process.memoryUsage();
    const latestCpu = this.cpuUsageHistory[this.cpuUsageHistory.length - 1] || process.cpuUsage();

    return {
      timeRange: {
        start: startTime,
        end: now,
        duration,
      },
      metrics: {
        counters,
        gauges,
        histograms,
        timers,
      },
      summary: {
        totalRequests,
        averageResponseTime,
        errorRate,
        throughput,
        memoryUsage: latestMemory,
        cpuUsage: latestCpu,
      },
    };
  }

  // Query methods
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.get(name) || [];
    }
    
    const allMetrics: PerformanceMetric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    
    return allMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  // Health checks
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    metrics: Record<string, number>;
  } {
    const report = this.generateReport(300000); // Last 5 minutes
    
    const checks = {
      lowErrorRate: report.summary.errorRate < 0.05, // Less than 5% errors
      reasonableResponseTime: report.summary.averageResponseTime < 5000, // Less than 5 seconds
      memoryUsage: report.summary.memoryUsage.heapUsed < 1024 * 1024 * 1024, // Less than 1GB
      cpuUsage: report.summary.cpuUsage.user < 1000000 * 60, // Less than 60 seconds of CPU time
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (passedChecks === totalChecks) {
      status = 'healthy';
    } else if (passedChecks >= totalChecks * 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      checks,
      metrics: {
        errorRate: report.summary.errorRate,
        averageResponseTime: report.summary.averageResponseTime,
        throughput: report.summary.throughput,
        memoryUsagePercent: (report.summary.memoryUsage.heapUsed / report.summary.memoryUsage.heapTotal) * 100,
      },
    };
  }

  // Cleanup
  reset(): void {
    this.metrics.clear();
    this.timers.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.memoryUsageHistory = [];
    this.cpuUsageHistory = [];
    this.startTime = Date.now();
  }

  destroy(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    this.removeAllListeners();
    this.reset();
  }
}

// Singleton monitor instance
let monitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(config?: {
  reportingIntervalMs?: number;
  maxMetricsHistory?: number;
  enableSystemMetrics?: boolean;
}): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor(config);
  }
  return monitorInstance;
}

// Decorator for automatic method timing
export function timed(metricName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      return monitor.time(name, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

// Middleware for request timing
export function createPerformanceMiddleware() {
  const monitor = getPerformanceMonitor();

  return (req: any, res: any, next: any) => {
    const timerId = monitor.startTimer('request.duration', {
      method: req.method,
      route: req.route?.path || req.path,
    });

    monitor.incrementCounter('requests.total', {
      method: req.method,
      route: req.route?.path || req.path,
    });

    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      monitor.endTimer(timerId);
      
      monitor.incrementCounter('requests.status', {
        status: res.statusCode.toString(),
        method: req.method,
      });

      if (res.statusCode >= 400) {
        monitor.incrementCounter('requests.errors', {
          status: res.statusCode.toString(),
          method: req.method,
        });
      }

      originalEnd.apply(this, args);
    };

    next();
  };
}