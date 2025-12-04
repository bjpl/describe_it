/**
 * Performance benchmark suite
 * Tests critical performance paths and tracks regression
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { performance } from 'perf_hooks';

// Benchmark thresholds (ms)
const THRESHOLDS = {
  CACHE_GET: 10,
  CACHE_SET: 20,
  QUERY_CACHE_HIT: 5,
  QUERY_CACHE_MISS: 100,
  PAGINATION: 100,
};

interface BenchmarkResult {
  name: string;
  duration: number;
  threshold: number;
  passed: boolean;
  iterations: number;
  avgDuration: number;
}

async function benchmark(
  name: string,
  fn: () => Promise<void> | void,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const durations: number[] = [];
  for (let i = 0; i < 10; i++) await fn();
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    durations.push(performance.now() - start);
  }
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS] || 1000;
  return { name, duration: avgDuration, threshold, passed: avgDuration < threshold, iterations, avgDuration };
}

describe('Performance Benchmarks', () => {
  let results: BenchmarkResult[] = [];
  beforeAll(() => console.log('\n📊 Running Performance Benchmarks...\n'));

  it('should benchmark cache operations', async () => {
    const { tieredCache } = await import('@/lib/cache/tiered-cache');
    await tieredCache.set('benchmark_test', { data: 'test' });
    const result = await benchmark('CACHE_GET', async () => {
      await tieredCache.get('benchmark_test');
    }, 100);
    results.push(result);
    expect(result.passed).toBe(true);
  });

  it('should print results', () => {
    console.log('\n📈 Benchmark Results:\n');
    results.forEach(r => console.log(`${r.name}: ${r.avgDuration.toFixed(2)}ms (threshold: ${r.threshold}ms) ${r.passed ? '✅' : '❌'}`));
    expect(results.every(r => r.passed)).toBe(true);
  });
});
