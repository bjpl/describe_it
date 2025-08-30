import { vi } from 'vitest';

/**
 * Performance testing utilities and benchmarking helpers
 */

interface PerformanceMetrics {
  executionTime: number;
  memoryUsed?: number;
  memoryPeak?: number;
  iterations?: number;
  averageTime?: number;
  minTime?: number;
  maxTime?: number;
  standardDeviation?: number;
}

interface MemorySnapshot {
  used: number;
  total: number;
  external: number;
  arrayBuffers: number;
}

// Memory measurement utilities
export const takeMemorySnapshot = (): MemorySnapshot | null => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      used: usage.heapUsed,
      total: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
    };
  }
  
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      external: 0,
      arrayBuffers: 0,
    };
  }
  
  return null;
};

export const calculateMemoryDifference = (before: MemorySnapshot, after: MemorySnapshot) => {
  return {
    usedDiff: after.used - before.used,
    totalDiff: after.total - before.total,
    externalDiff: after.external - before.external,
    arrayBuffersDiff: after.arrayBuffers - before.arrayBuffers,
  };
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Execution time measurement
export const measureExecutionTime = async <T>(
  fn: () => Promise<T> | T,
  iterations: number = 1
): Promise<PerformanceMetrics & { result: T }> => {
  const times: number[] = [];
  let result: T;
  const memoryBefore = takeMemorySnapshot();
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = await fn();
    const end = performance.now();
    times.push(end - start);
  }
  
  const memoryAfter = takeMemorySnapshot();
  const memoryDiff = memoryBefore && memoryAfter 
    ? calculateMemoryDifference(memoryBefore, memoryAfter)
    : null;
  
  const executionTime = times[times.length - 1]; // Last execution time
  const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  // Calculate standard deviation
  const variance = times.reduce((acc, time) => acc + Math.pow(time - averageTime, 2), 0) / times.length;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    result: result!,
    executionTime,
    iterations,
    averageTime,
    minTime,
    maxTime,
    standardDeviation,
    memoryUsed: memoryDiff?.usedDiff,
    memoryPeak: memoryAfter?.used,
  };
};

// Performance assertion helpers
export const expectPerformance = {
  toBeFasterThan: (metrics: PerformanceMetrics, maxTime: number) => {
    if (metrics.executionTime > maxTime) {
      throw new Error(
        `Expected execution time to be less than ${maxTime}ms, but got ${metrics.executionTime.toFixed(2)}ms`
      );
    }
  },
  
  toUseMemoryLessThan: (metrics: PerformanceMetrics, maxMemory: number) => {
    if (metrics.memoryUsed && metrics.memoryUsed > maxMemory) {
      throw new Error(
        `Expected memory usage to be less than ${formatBytes(maxMemory)}, but got ${formatBytes(metrics.memoryUsed)}`
      );
    }
  },
  
  toBeConsistent: (metrics: PerformanceMetrics, maxDeviation: number = 100) => {
    if (metrics.standardDeviation && metrics.standardDeviation > maxDeviation) {
      throw new Error(
        `Expected performance to be consistent (std dev < ${maxDeviation}ms), but got ${metrics.standardDeviation.toFixed(2)}ms`
      );
    }
  },
};

// Component rendering performance
export const measureRenderTime = async (renderFn: () => any, iterations: number = 10) => {
  return measureExecutionTime(renderFn, iterations);
};

// API call performance
export const measureApiPerformance = async <T>(
  apiCall: () => Promise<T>,
  options: {
    iterations?: number;
    timeout?: number;
    expectedStatus?: number;
  } = {}
) => {
  const { iterations = 5, timeout = 10000 } = options;
  
  const apiCallWithTimeout = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      return await apiCall();
    } finally {
      clearTimeout(timeoutId);
    }
  };
  
  return measureExecutionTime(apiCallWithTimeout, iterations);
};

// Database operation performance
export const measureDatabasePerformance = async <T>(
  operation: () => Promise<T>,
  operationType: 'read' | 'write' | 'update' | 'delete'
) => {
  const metrics = await measureExecutionTime(operation);
  
  // Define performance thresholds based on operation type
  const thresholds = {
    read: 50,    // 50ms for read operations
    write: 200,  // 200ms for write operations
    update: 100, // 100ms for update operations
    delete: 50,  // 50ms for delete operations
  };
  
  const threshold = thresholds[operationType];
  
  return {
    ...metrics,
    operationType,
    threshold,
    isWithinThreshold: metrics.executionTime <= threshold,
  };
};

// Load testing utilities
export const simulateLoad = async <T>(
  operation: () => Promise<T>,
  options: {
    concurrency: number;
    duration?: number;
    iterations?: number;
  }
) => {
  const { concurrency, duration, iterations } = options;
  const results: PerformanceMetrics[] = [];
  const errors: Error[] = [];
  
  if (duration) {
    // Duration-based load test
    const endTime = Date.now() + duration;
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < concurrency; i++) {
      promises.push(
        (async () => {
          while (Date.now() < endTime) {
            try {
              const metrics = await measureExecutionTime(operation);
              results.push(metrics);
            } catch (error) {
              errors.push(error as Error);
            }
            
            // Small delay to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        })()
      );
    }
    
    await Promise.all(promises);
  } else if (iterations) {
    // Iteration-based load test
    const iterationsPerWorker = Math.ceil(iterations / concurrency);
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < concurrency; i++) {
      promises.push(
        (async () => {
          for (let j = 0; j < iterationsPerWorker; j++) {
            try {
              const metrics = await measureExecutionTime(operation);
              results.push(metrics);
            } catch (error) {
              errors.push(error as Error);
            }
          }
        })()
      );
    }
    
    await Promise.all(promises);
  }
  
  // Calculate aggregate metrics
  const totalOperations = results.length;
  const totalErrors = errors.length;
  const successRate = totalOperations / (totalOperations + totalErrors);
  
  const executionTimes = results.map(r => r.executionTime);
  const averageTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
  const minTime = Math.min(...executionTimes);
  const maxTime = Math.max(...executionTimes);
  
  // Calculate percentiles
  const sortedTimes = [...executionTimes].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
  const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
  
  return {
    totalOperations,
    totalErrors,
    successRate,
    averageTime,
    minTime,
    maxTime,
    percentiles: { p50, p90, p95, p99 },
    results,
    errors,
  };
};

// Memory leak detection
export class MemoryLeakDetector {
  private snapshots: { label: string; snapshot: MemorySnapshot; timestamp: number }[] = [];
  
  takeSnapshot(label: string) {
    const snapshot = takeMemorySnapshot();
    if (snapshot) {
      this.snapshots.push({
        label,
        snapshot,
        timestamp: Date.now(),
      });
    }
  }
  
  detectLeaks(thresholdMB: number = 10): boolean {
    if (this.snapshots.length < 2) {
      return false;
    }
    
    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    
    const memoryIncrease = last.snapshot.used - first.snapshot.used;
    const thresholdBytes = thresholdMB * 1024 * 1024;
    
    return memoryIncrease > thresholdBytes;
  }
  
  getMemoryReport() {
    return this.snapshots.map(({ label, snapshot, timestamp }) => ({
      label,
      timestamp,
      memoryUsed: formatBytes(snapshot.used),
      memoryTotal: formatBytes(snapshot.total),
    }));
  }
  
  reset() {
    this.snapshots = [];
  }
}

// Performance regression detection
export class PerformanceRegression {
  private baselines: Map<string, PerformanceMetrics> = new Map();
  
  setBaseline(testName: string, metrics: PerformanceMetrics) {
    this.baselines.set(testName, metrics);
  }
  
  checkRegression(
    testName: string, 
    currentMetrics: PerformanceMetrics,
    thresholdPercent: number = 20
  ): boolean {
    const baseline = this.baselines.get(testName);
    if (!baseline) {
      this.setBaseline(testName, currentMetrics);
      return false;
    }
    
    const timeDifference = currentMetrics.executionTime - baseline.executionTime;
    const percentIncrease = (timeDifference / baseline.executionTime) * 100;
    
    return percentIncrease > thresholdPercent;
  }
  
  getRegressionReport() {
    const report: Array<{
      testName: string;
      baseline: PerformanceMetrics;
      regressions: Array<{
        metrics: PerformanceMetrics;
        percentIncrease: number;
        timestamp: number;
      }>;
    }> = [];
    
    for (const [testName, baseline] of this.baselines.entries()) {
      report.push({
        testName,
        baseline,
        regressions: [], // This would be populated in a real implementation
      });
    }
    
    return report;
  }
}

// Resource monitoring
export const monitorResources = async (
  operation: () => Promise<any>,
  intervalMs: number = 100
) => {
  const snapshots: Array<{ timestamp: number; memory: MemorySnapshot }> = [];
  let monitoring = true;
  
  // Start monitoring
  const monitor = setInterval(() => {
    if (!monitoring) return;
    
    const memory = takeMemorySnapshot();
    if (memory) {
      snapshots.push({
        timestamp: Date.now(),
        memory,
      });
    }
  }, intervalMs);
  
  try {
    const result = await operation();
    monitoring = false;
    clearInterval(monitor);
    
    return {
      result,
      resourceUsage: snapshots,
      peakMemory: Math.max(...snapshots.map(s => s.memory.used)),
      averageMemory: snapshots.reduce((sum, s) => sum + s.memory.used, 0) / snapshots.length,
    };
  } finally {
    monitoring = false;
    clearInterval(monitor);
  }
};

// Export performance testing suite
export const performanceTestSuite = {
  measureExecutionTime,
  measureRenderTime,
  measureApiPerformance,
  measureDatabasePerformance,
  simulateLoad,
  expectPerformance,
  MemoryLeakDetector,
  PerformanceRegression,
  monitorResources,
  takeMemorySnapshot,
  formatBytes,
};
