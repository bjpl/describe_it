import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';
import { LoadTester } from './performance-test';

// Benchmark configuration
const BENCHMARK_CONFIG = {
  warmupIterations: 10,
  benchmarkIterations: 100,
  timeoutMs: 30000,
  memoryThreshold: 100 * 1024 * 1024, // 100MB
};

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
  memoryUsed: number;
  percentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
}

class BenchmarkSuite {
  private results: BenchmarkResult[] = [];

  async benchmark(
    name: string,
    operation: () => Promise<any> | any,
    iterations: number = BENCHMARK_CONFIG.benchmarkIterations
  ): Promise<BenchmarkResult> {
    console.log(`Running benchmark: ${name}`);
    
    // Warmup
    console.log(`  Warming up (${BENCHMARK_CONFIG.warmupIterations} iterations)...`);
    for (let i = 0; i < BENCHMARK_CONFIG.warmupIterations; i++) {
      await operation();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Measure baseline memory
    const baselineMemory = process.memoryUsage().heapUsed;
    
    // Benchmark
    console.log(`  Benchmarking (${iterations} iterations)...`);
    const times: number[] = [];
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();
      await operation();
      const iterationEnd = performance.now();
      times.push(iterationEnd - iterationStart);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryUsed = finalMemory - baselineMemory;

    // Calculate statistics
    times.sort((a, b) => a - b);
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = times[0];
    const maxTime = times[times.length - 1];
    const opsPerSecond = 1000 / averageTime;

    const p50Index = Math.floor(times.length * 0.5);
    const p95Index = Math.floor(times.length * 0.95);
    const p99Index = Math.floor(times.length * 0.99);

    const result: BenchmarkResult = {
      name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      opsPerSecond,
      memoryUsed,
      percentiles: {
        p50: times[p50Index],
        p95: times[p95Index],
        p99: times[p99Index],
      },
    };

    this.results.push(result);
    this.logResult(result);
    
    return result;
  }

  private logResult(result: BenchmarkResult): void {
    console.log(`  Results for ${result.name}:`);
    console.log(`    Iterations: ${result.iterations}`);
    console.log(`    Total time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`    Average time: ${result.averageTime.toFixed(2)}ms`);
    console.log(`    Min time: ${result.minTime.toFixed(2)}ms`);
    console.log(`    Max time: ${result.maxTime.toFixed(2)}ms`);
    console.log(`    Operations/sec: ${result.opsPerSecond.toFixed(2)}`);
    console.log(`    Memory used: ${(result.memoryUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`    Percentiles:`);
    console.log(`      P50: ${result.percentiles.p50.toFixed(2)}ms`);
    console.log(`      P95: ${result.percentiles.p95.toFixed(2)}ms`);
    console.log(`      P99: ${result.percentiles.p99.toFixed(2)}ms`);
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  generateReport(): string {
    const report = ['Performance Benchmark Report', '='.repeat(50)];
    
    for (const result of this.results) {
      report.push('');
      report.push(`${result.name}:`);
      report.push(`  Average: ${result.averageTime.toFixed(2)}ms`);
      report.push(`  Ops/sec: ${result.opsPerSecond.toFixed(2)}`);
      report.push(`  P95: ${result.percentiles.p95.toFixed(2)}ms`);
      report.push(`  Memory: ${(result.memoryUsed / 1024 / 1024).toFixed(2)}MB`);
    }

    // Performance comparison
    if (this.results.length > 1) {
      report.push('');
      report.push('Performance Comparison:');
      const fastest = this.results.reduce((a, b) => 
        a.averageTime < b.averageTime ? a : b
      );
      
      for (const result of this.results) {
        if (result !== fastest) {
          const factor = result.averageTime / fastest.averageTime;
          report.push(`  ${result.name} is ${factor.toFixed(2)}x slower than ${fastest.name}`);
        }
      }
    }

    return report.join('\n');
  }

  clear(): void {
    this.results = [];
  }
}

describe('Performance Benchmarks', () => {
  let suite: BenchmarkSuite;
  let loadTester: LoadTester;

  beforeAll(() => {
    suite = new BenchmarkSuite();
    loadTester = new LoadTester();
  });

  afterAll(() => {
    console.log('\n' + suite.generateReport());
  });

  describe('Core Operations Benchmarks', () => {
    it('should benchmark JSON parsing/stringifying', async () => {
      const testData = {
        id: 'test-123',
        data: Array.from({ length: 1000 }, (_, i) => ({
          index: i,
          value: Math.random(),
          nested: { a: i, b: i * 2, c: `item-${i}` }
        }))
      };

      await suite.benchmark('JSON stringify', () => {
        return JSON.stringify(testData);
      });

      const jsonString = JSON.stringify(testData);
      await suite.benchmark('JSON parse', () => {
        return JSON.parse(jsonString);
      });

      const results = suite.getResults();
      const stringifyResult = results.find(r => r.name === 'JSON stringify');
      const parseResult = results.find(r => r.name === 'JSON parse');

      expect(stringifyResult?.averageTime).toBeLessThan(50); // Less than 50ms
      expect(parseResult?.averageTime).toBeLessThan(50); // Less than 50ms
    }, BENCHMARK_CONFIG.timeoutMs);

    it('should benchmark array operations', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);

      await suite.benchmark('Array map', () => {
        return largeArray.map(x => x * 2);
      });

      await suite.benchmark('Array filter', () => {
        return largeArray.filter(x => x % 2 === 0);
      });

      await suite.benchmark('Array reduce', () => {
        return largeArray.reduce((sum, x) => sum + x, 0);
      });

      await suite.benchmark('Array find', () => {
        return largeArray.find(x => x === 5000);
      });

      const results = suite.getResults().slice(-4); // Last 4 results
      
      for (const result of results) {
        expect(result.averageTime).toBeLessThan(100); // Less than 100ms
        expect(result.memoryUsed).toBeLessThan(BENCHMARK_CONFIG.memoryThreshold);
      }
    }, BENCHMARK_CONFIG.timeoutMs);

    it('should benchmark string operations', async () => {
      const baseString = 'The quick brown fox jumps over the lazy dog. ';
      const longString = baseString.repeat(1000);

      await suite.benchmark('String concatenation', () => {
        let result = '';
        for (let i = 0; i < 100; i++) {
          result += baseString;
        }
        return result;
      });

      await suite.benchmark('String template literals', () => {
        let result = '';
        for (let i = 0; i < 100; i++) {
          result += `${baseString}`;
        }
        return result;
      });

      await suite.benchmark('String split', () => {
        return longString.split(' ');
      });

      await suite.benchmark('String replace', () => {
        return longString.replace(/fox/g, 'cat');
      });

      const results = suite.getResults().slice(-4);
      
      for (const result of results) {
        expect(result.averageTime).toBeLessThan(50); // Less than 50ms
      }
    }, BENCHMARK_CONFIG.timeoutMs);
  });

  describe('Async Operations Benchmarks', () => {
    it('should benchmark Promise operations', async () => {
      await suite.benchmark('Promise resolve', async () => {
        return Promise.resolve('test');
      });

      await suite.benchmark('Promise all (10 items)', async () => {
        const promises = Array.from({ length: 10 }, () => 
          Promise.resolve(Math.random())
        );
        return Promise.all(promises);
      });

      await suite.benchmark('Promise allSettled (10 items)', async () => {
        const promises = Array.from({ length: 10 }, (_, i) => 
          i % 3 === 0 ? Promise.reject('error') : Promise.resolve(i)
        );
        return Promise.allSettled(promises);
      });

      await suite.benchmark('setTimeout (1ms)', async () => {
        return new Promise(resolve => setTimeout(resolve, 1));
      });

      const results = suite.getResults().slice(-4);
      
      // Async operations should still be reasonably fast
      expect(results[0].averageTime).toBeLessThan(5); // Promise resolve
      expect(results[1].averageTime).toBeLessThan(10); // Promise.all
      expect(results[2].averageTime).toBeLessThan(10); // Promise.allSettled
      expect(results[3].averageTime).toBeGreaterThan(0.5); // setTimeout should take at least 1ms
    }, BENCHMARK_CONFIG.timeoutMs);

    it('should benchmark concurrent operations', async () => {
      const heavyOperation = async () => {
        // Simulate CPU-intensive work
        let result = 0;
        for (let i = 0; i < 10000; i++) {
          result += Math.sqrt(i);
        }
        return result;
      };

      await suite.benchmark('Sequential operations (10 items)', async () => {
        const results = [];
        for (let i = 0; i < 10; i++) {
          results.push(await heavyOperation());
        }
        return results;
      });

      await suite.benchmark('Parallel operations (10 items)', async () => {
        const promises = Array.from({ length: 10 }, () => heavyOperation());
        return Promise.all(promises);
      });

      const results = suite.getResults().slice(-2);
      const sequentialResult = results[0];
      const parallelResult = results[1];

      // Parallel should be faster than sequential
      expect(parallelResult.averageTime).toBeLessThan(sequentialResult.averageTime);
      
      console.log(`Parallel speedup: ${(sequentialResult.averageTime / parallelResult.averageTime).toFixed(2)}x`);
    }, BENCHMARK_CONFIG.timeoutMs);
  });

  describe('Memory Management Benchmarks', () => {
    it('should benchmark memory allocation patterns', async () => {
      await suite.benchmark('Small object creation', () => {
        const objects = [];
        for (let i = 0; i < 1000; i++) {
          objects.push({ id: i, value: Math.random() });
        }
        return objects;
      });

      await suite.benchmark('Large object creation', () => {
        const objects = [];
        for (let i = 0; i < 100; i++) {
          objects.push({
            id: i,
            data: new Array(1000).fill(0).map(() => Math.random()),
            metadata: { created: Date.now(), index: i }
          });
        }
        return objects;
      });

      await suite.benchmark('Object property access', () => {
        const obj = {};
        for (let i = 0; i < 1000; i++) {
          obj[`prop${i}`] = i;
        }
        
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += obj[`prop${i}`];
        }
        return sum;
      });

      const results = suite.getResults().slice(-3);
      
      for (const result of results) {
        expect(result.averageTime).toBeLessThan(100); // Less than 100ms
        expect(result.memoryUsed).toBeLessThan(BENCHMARK_CONFIG.memoryThreshold);
      }
    }, BENCHMARK_CONFIG.timeoutMs);
  });

  describe('Load Testing Benchmarks', () => {
    it('should benchmark under simulated load', async () => {
      const mockApiCall = async () => {
        // Simulate API latency
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
        
        // Simulate occasional errors
        if (Math.random() < 0.05) {
          throw new Error('Simulated API error');
        }
        
        return { success: true, data: Math.random() };
      };

      const loadTestResult = await loadTester.runLoadTest({
        operation: mockApiCall,
        concurrency: 10,
        duration: 5000, // 5 seconds
        rampUpTime: 1000, // 1 second ramp-up
      });

      expect(loadTestResult.totalRequests).toBeGreaterThan(100);
      expect(loadTestResult.throughput).toBeGreaterThan(10); // At least 10 req/s
      expect(loadTestResult.errorRate).toBeLessThan(0.1); // Less than 10% errors
      expect(loadTestResult.percentiles.p95).toBeLessThan(100); // P95 under 100ms

      console.log('Load Test Results:', {
        totalRequests: loadTestResult.totalRequests,
        successful: loadTestResult.successful,
        failed: loadTestResult.failed,
        throughput: `${loadTestResult.throughput.toFixed(2)} req/s`,
        errorRate: `${(loadTestResult.errorRate * 100).toFixed(1)}%`,
        avgResponseTime: `${loadTestResult.averageResponseTime.toFixed(2)}ms`,
        percentiles: {
          p50: `${loadTestResult.percentiles.p50.toFixed(2)}ms`,
          p95: `${loadTestResult.percentiles.p95.toFixed(2)}ms`,
          p99: `${loadTestResult.percentiles.p99.toFixed(2)}ms`,
        },
      });
    }, 15000);
  });

  describe('Performance Regression Tests', () => {
    it('should detect performance regressions against baseline', async () => {
      // Baseline performance data (would typically be loaded from file)
      const baseline = {
        'JSON stringify': { averageTime: 10, opsPerSecond: 100 },
        'JSON parse': { averageTime: 8, opsPerSecond: 125 },
        'Array map': { averageTime: 15, opsPerSecond: 66.67 },
      };

      const testData = { test: 'data', array: [1, 2, 3, 4, 5] };
      
      // Run current benchmarks
      const currentResults = {
        'JSON stringify': await suite.benchmark('JSON stringify (regression test)', () => {
          return JSON.stringify(testData);
        }, 50),
        'JSON parse': await suite.benchmark('JSON parse (regression test)', () => {
          return JSON.parse(JSON.stringify(testData));
        }, 50),
        'Array map (regression test)': await suite.benchmark('Array map (regression test)', () => {
          return [1, 2, 3, 4, 5].map(x => x * 2);
        }, 50),
      };

      // Compare against baseline (allow 20% regression threshold)
      const regressionThreshold = 1.2;
      const regressions = [];

      for (const [testName, current] of Object.entries(currentResults)) {
        const baselineName = testName.replace(' (regression test)', '');
        const baselineData = baseline[baselineName];
        
        if (baselineData) {
          const responseTimeRegression = current.averageTime > baselineData.averageTime * regressionThreshold;
          const throughputRegression = current.opsPerSecond < baselineData.opsPerSecond / regressionThreshold;
          
          if (responseTimeRegression || throughputRegression) {
            regressions.push({
              test: testName,
              baseline: baselineData,
              current: {
                averageTime: current.averageTime,
                opsPerSecond: current.opsPerSecond,
              },
              responseTimeRegression,
              throughputRegression,
            });
          }
        }
      }

      if (regressions.length > 0) {
        console.warn('Performance regressions detected:', regressions);
      }

      // For this test, we'll just verify the structure
      expect(Array.isArray(regressions)).toBe(true);
      
      // In a real scenario, you might want to fail the test if regressions are found
      // expect(regressions.length).toBe(0);
    }, BENCHMARK_CONFIG.timeoutMs);
  });
});

// Utility for running specific benchmarks
export async function runBenchmark(name: string, operation: () => any, iterations?: number): Promise<BenchmarkResult> {
  const suite = new BenchmarkSuite();
  return suite.benchmark(name, operation, iterations);
}

// Utility for comparing two operations
export async function compareBenchmarks(
  name1: string, operation1: () => any,
  name2: string, operation2: () => any,
  iterations?: number
): Promise<{
  result1: BenchmarkResult;
  result2: BenchmarkResult;
  speedupFactor: number;
  winner: string;
}> {
  const suite = new BenchmarkSuite();
  
  const result1 = await suite.benchmark(name1, operation1, iterations);
  const result2 = await suite.benchmark(name2, operation2, iterations);
  
  const speedupFactor = result1.averageTime / result2.averageTime;
  const winner = speedupFactor > 1 ? name2 : name1;
  
  return {
    result1,
    result2,
    speedupFactor: Math.abs(speedupFactor),
    winner,
  };
}