/**
 * Cache system testing utilities
 * Use this to verify caching functionality
 */

import {
  tieredCache,
  imageCache,
  descriptionCache,
  qaCache,
  phrasesCache,
} from "./tiered-cache";
import { vercelKvCache } from "../api/vercel-kv";
import { memoryCache } from "./memory-cache";

interface CacheTestResult {
  success: boolean;
  provider: string;
  responseTime: number;
  error?: string;
}

interface CacheTestSuite {
  memoryCache: CacheTestResult;
  vercelKv: CacheTestResult;
  tieredCache: CacheTestResult;
  specializedCaches: {
    images: CacheTestResult;
    descriptions: CacheTestResult;
    qa: CacheTestResult;
    phrases: CacheTestResult;
  };
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    overallSuccess: boolean;
  };
}

/**
 * Test memory cache functionality
 */
async function testMemoryCache(): Promise<CacheTestResult> {
  const start = performance.now();

  try {
    const testKey = "test_memory_cache";
    const testValue = {
      message: "Hello from memory cache",
      timestamp: Date.now(),
    };

    // Test set
    memoryCache.set(testKey, testValue, 10); // 10 seconds TTL

    // Test get
    const retrieved = memoryCache.get(testKey);

    if (!retrieved || JSON.stringify(retrieved) !== JSON.stringify(testValue)) {
      throw new Error("Retrieved value does not match original");
    }

    // Test delete
    const deleted = memoryCache.delete(testKey);
    if (!deleted) {
      throw new Error("Failed to delete test key");
    }

    // Verify deletion
    const afterDelete = memoryCache.get(testKey);
    if (afterDelete !== null) {
      throw new Error("Key still exists after deletion");
    }

    return {
      success: true,
      provider: "memory",
      responseTime: performance.now() - start,
    };
  } catch (error) {
    return {
      success: false,
      provider: "memory",
      responseTime: performance.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Test Vercel KV cache functionality
 */
async function testVercelKvCache(): Promise<CacheTestResult> {
  const start = performance.now();

  try {
    const testKey = "test_vercel_kv_cache";
    const testValue = {
      message: "Hello from Vercel KV",
      timestamp: Date.now(),
    };

    // Test set
    await vercelKvCache.set(testKey, testValue, 10); // 10 seconds TTL

    // Test get
    const retrieved = await vercelKvCache.get(testKey);

    if (!retrieved || JSON.stringify(retrieved) !== JSON.stringify(testValue)) {
      throw new Error("Retrieved value does not match original");
    }

    // Test delete
    const deleted = await vercelKvCache.delete(testKey);
    if (!deleted) {
      throw new Error("Failed to delete test key");
    }

    // Verify deletion
    const afterDelete = await vercelKvCache.get(testKey);
    if (afterDelete !== null) {
      throw new Error("Key still exists after deletion");
    }

    return {
      success: true,
      provider: "vercel-kv",
      responseTime: performance.now() - start,
    };
  } catch (error) {
    return {
      success: false,
      provider: "vercel-kv",
      responseTime: performance.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Test tiered cache functionality
 */
async function testTieredCache(): Promise<CacheTestResult> {
  const start = performance.now();

  try {
    const testKey = "test_tiered_cache";
    const testValue = {
      message: "Hello from tiered cache",
      timestamp: Date.now(),
    };

    // Test set
    await tieredCache.set(testKey, testValue, {
      kvTTL: 10,
      memoryTTL: 10,
      sessionTTL: 10,
    });

    // Test get
    const retrieved = await tieredCache.get(testKey);

    if (!retrieved || JSON.stringify(retrieved) !== JSON.stringify(testValue)) {
      throw new Error("Retrieved value does not match original");
    }

    // Test delete
    const deleted = await tieredCache.delete(testKey);
    if (!deleted) {
      throw new Error("Failed to delete test key");
    }

    // Verify deletion
    const afterDelete = await tieredCache.get(testKey);
    if (afterDelete !== null) {
      throw new Error("Key still exists after deletion");
    }

    return {
      success: true,
      provider: "tiered",
      responseTime: performance.now() - start,
    };
  } catch (error) {
    return {
      success: false,
      provider: "tiered",
      responseTime: performance.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Test specialized cache functionality
 */
async function testSpecializedCache(
  cache: any,
  name: string,
): Promise<CacheTestResult> {
  const start = performance.now();

  try {
    const testKey = `test_${name}_cache`;
    const testValue = {
      message: `Hello from ${name} cache`,
      timestamp: Date.now(),
    };

    // Test set
    await cache.set(testKey, testValue, {
      kvTTL: 10,
      memoryTTL: 10,
      sessionTTL: 10,
    });

    // Test get
    const retrieved = await cache.get(testKey);

    if (!retrieved || JSON.stringify(retrieved) !== JSON.stringify(testValue)) {
      throw new Error("Retrieved value does not match original");
    }

    // Test delete
    const deleted = await cache.delete(testKey);
    if (!deleted) {
      throw new Error("Failed to delete test key");
    }

    return {
      success: true,
      provider: name,
      responseTime: performance.now() - start,
    };
  } catch (error) {
    return {
      success: false,
      provider: name,
      responseTime: performance.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Run complete cache test suite
 */
export async function runCacheTests(): Promise<CacheTestSuite> {
  console.log("🧪 Starting cache system tests...");

  const [
    memoryResult,
    kvResult,
    tieredResult,
    imagesResult,
    descriptionsResult,
    qaResult,
    phrasesResult,
  ] = await Promise.all([
    testMemoryCache(),
    testVercelKvCache(),
    testTieredCache(),
    testSpecializedCache(imageCache, "images"),
    testSpecializedCache(descriptionCache, "descriptions"),
    testSpecializedCache(qaCache, "qa"),
    testSpecializedCache(phrasesCache, "phrases"),
  ]);

  const results: CacheTestSuite = {
    memoryCache: memoryResult,
    vercelKv: kvResult,
    tieredCache: tieredResult,
    specializedCaches: {
      images: imagesResult,
      descriptions: descriptionsResult,
      qa: qaResult,
      phrases: phrasesResult,
    },
    summary: {
      totalTests: 7,
      passed: 0,
      failed: 0,
      overallSuccess: false,
    },
  };

  // Calculate summary
  const allResults = [
    memoryResult,
    kvResult,
    tieredResult,
    imagesResult,
    descriptionsResult,
    qaResult,
    phrasesResult,
  ];

  results.summary.passed = allResults.filter((r) => r.success).length;
  results.summary.failed = allResults.filter((r) => !r.success).length;
  results.summary.overallSuccess = results.summary.failed === 0;

  // Log results
  console.log("📊 Cache test results:");
  console.log(
    `   Memory Cache: ${memoryResult.success ? "✅" : "❌"} (${memoryResult.responseTime.toFixed(2)}ms)`,
  );
  console.log(
    `   Vercel KV: ${kvResult.success ? "✅" : "❌"} (${kvResult.responseTime.toFixed(2)}ms)`,
  );
  console.log(
    `   Tiered Cache: ${tieredResult.success ? "✅" : "❌"} (${tieredResult.responseTime.toFixed(2)}ms)`,
  );
  console.log(
    `   Image Cache: ${imagesResult.success ? "✅" : "❌"} (${imagesResult.responseTime.toFixed(2)}ms)`,
  );
  console.log(
    `   Description Cache: ${descriptionsResult.success ? "✅" : "❌"} (${descriptionsResult.responseTime.toFixed(2)}ms)`,
  );
  console.log(
    `   Q&A Cache: ${qaResult.success ? "✅" : "❌"} (${qaResult.responseTime.toFixed(2)}ms)`,
  );
  console.log(
    `   Phrases Cache: ${phrasesResult.success ? "✅" : "❌"} (${phrasesResult.responseTime.toFixed(2)}ms)`,
  );
  console.log(
    `   Summary: ${results.summary.passed}/${results.summary.totalTests} tests passed`,
  );

  if (!results.summary.overallSuccess) {
    console.log("❌ Some cache tests failed:");
    allResults
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   ${r.provider}: ${r.error}`);
      });
  } else {
    console.log("✅ All cache tests passed!");
  }

  return results;
}

/**
 * Test cache performance under load
 */
export async function runCachePerformanceTest(
  iterations: number = 100,
): Promise<{
  memory: { avgTime: number; hitRate: number };
  tiered: { avgTime: number; hitRate: number };
}> {
  console.log(
    `🚀 Running cache performance test with ${iterations} iterations...`,
  );

  const memoryTimes: number[] = [];
  const tieredTimes: number[] = [];
  let memoryHits = 0;
  let tieredHits = 0;

  for (let i = 0; i < iterations; i++) {
    const key = `perf_test_${i}`;
    const value = {
      iteration: i,
      timestamp: Date.now(),
      data: "x".repeat(1000),
    };

    // Test memory cache
    const memoryStart = performance.now();
    memoryCache.set(key, value, 60);
    const retrieved = memoryCache.get(key);
    if (retrieved) memoryHits++;
    memoryTimes.push(performance.now() - memoryStart);

    // Test tiered cache
    const tieredStart = performance.now();
    await tieredCache.set(key, value, { memoryTTL: 60, kvTTL: 60 });
    const tieredRetrieved = await tieredCache.get(key);
    if (tieredRetrieved) tieredHits++;
    tieredTimes.push(performance.now() - tieredStart);
  }

  const memoryAvg = memoryTimes.reduce((a, b) => a + b, 0) / memoryTimes.length;
  const tieredAvg = tieredTimes.reduce((a, b) => a + b, 0) / tieredTimes.length;

  const results = {
    memory: {
      avgTime: memoryAvg,
      hitRate: memoryHits / iterations,
    },
    tiered: {
      avgTime: tieredAvg,
      hitRate: tieredHits / iterations,
    },
  };

  console.log(`📈 Performance test results:`);
  console.log(
    `   Memory Cache: ${memoryAvg.toFixed(2)}ms avg, ${(results.memory.hitRate * 100).toFixed(1)}% hit rate`,
  );
  console.log(
    `   Tiered Cache: ${tieredAvg.toFixed(2)}ms avg, ${(results.tiered.hitRate * 100).toFixed(1)}% hit rate`,
  );

  // Clean up test data
  await Promise.all([
    memoryCache.clear("perf_test_*"),
    tieredCache.clear("perf_test_*"),
  ]);

  return results;
}

/**
 * Quick health check for all cache systems
 */
export async function quickHealthCheck(): Promise<{
  overall: boolean;
  details: Record<string, boolean>;
}> {
  const health = await Promise.all([
    memoryCache.healthCheck(),
    vercelKvCache.healthCheck(),
    tieredCache.healthCheck(),
    imageCache.healthCheck(),
    descriptionCache.healthCheck(),
    qaCache.healthCheck(),
    phrasesCache.healthCheck(),
  ]);

  const details = {
    memory: health[0],
    vercelKv: health[1],
    tiered: health[2].overall,
    images: health[3].overall,
    descriptions: health[4].overall,
    qa: health[5].overall,
    phrases: health[6].overall,
  };

  return {
    overall: Object.values(details).some((h) => h), // At least one cache working
    details,
  };
}
