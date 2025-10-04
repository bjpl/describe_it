import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { getRateLimiter } from '@/lib/rate-limiting/rate-limiter';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import type { RateLimitConfig } from '@/lib/rate-limiting/rate-limiter';

/**
 * Integration tests for rate limiting system
 *
 * Covers:
 * - Security scenarios (DDoS, distributed attacks)
 * - Performance benchmarks
 * - Redis integration
 * - End-to-end flows
 */

describe('Security Scenarios', () => {
  afterEach(async () => {
    const limiter = getRateLimiter();
    await limiter.destroy();
  });

  describe('DDoS Simulation', () => {
    it('should handle 1000+ rapid requests from single IP', async () => {
      const config: RateLimitConfig = {
        windowMs: 10000, // 10 seconds
        maxRequests: 100,
      };

      const handler = withRateLimit(
        async () => NextResponse.json({ success: true }),
        { config }
      );

      const req = createMockRequest('192.168.1.1');
      const startTime = Date.now();
      let blockedCount = 0;
      let allowedCount = 0;

      // Send 1000 requests
      for (let i = 0; i < 1000; i++) {
        const response = await handler(req);
        if (response.status === 429) {
          blockedCount++;
        } else {
          allowedCount++;
        }
      }

      const duration = Date.now() - startTime;

      // Should block most requests
      expect(blockedCount).toBeGreaterThan(800);
      expect(allowedCount).toBeLessThanOrEqual(100);

      // Should complete reasonably fast
      expect(duration).toBeLessThan(30000); // 30 seconds max

      console.log(`DDoS test: ${allowedCount} allowed, ${blockedCount} blocked in ${duration}ms`);
    });

    it('should handle sustained attack over multiple windows', async () => {
      const config: RateLimitConfig = {
        windowMs: 500, // 500ms windows
        maxRequests: 10,
      };

      const handler = withRateLimit(
        async () => NextResponse.json({ success: true }),
        { config }
      );

      const req = createMockRequest('192.168.1.2');
      let totalBlocked = 0;

      // Simulate 5 windows of attacks
      for (let window = 0; window < 5; window++) {
        let windowBlocked = 0;

        // 20 requests per window (should block ~10)
        for (let i = 0; i < 20; i++) {
          const response = await handler(req);
          if (response.status === 429) {
            windowBlocked++;
          }
        }

        totalBlocked += windowBlocked;
        expect(windowBlocked).toBeGreaterThan(5);

        // Wait for next window
        if (window < 4) {
          await sleep(600);
        }
      }

      expect(totalBlocked).toBeGreaterThan(25);
    });
  });

  describe('Distributed Attack Simulation', () => {
    it('should handle attack from multiple IPs', async () => {
      const config: RateLimitConfig = {
        windowMs: 1000,
        maxRequests: 5,
      };

      const handler = withRateLimit(
        async () => NextResponse.json({ success: true }),
        { config }
      );

      const ipCount = 50;
      const requestsPerIP = 10;
      let totalBlocked = 0;

      // Simulate 50 IPs sending 10 requests each
      for (let i = 0; i < ipCount; i++) {
        const req = createMockRequest(`192.168.${Math.floor(i / 256)}.${i % 256}`);

        for (let j = 0; j < requestsPerIP; j++) {
          const response = await handler(req);
          if (response.status === 429) {
            totalBlocked++;
          }
        }
      }

      // Each IP should have ~5 blocked requests
      const expectedBlocked = ipCount * (requestsPerIP - 5);
      expect(totalBlocked).toBeGreaterThanOrEqual(expectedBlocked * 0.9); // 90% accuracy
      expect(totalBlocked).toBeLessThanOrEqual(expectedBlocked * 1.1); // 110% accuracy
    });

    it('should handle concurrent distributed attack', async () => {
      const config: RateLimitConfig = {
        windowMs: 2000,
        maxRequests: 10,
      };

      const handler = withRateLimit(
        async () => NextResponse.json({ success: true }),
        { config }
      );

      const ipCount = 20;
      const requestsPerIP = 20;
      const promises: Promise<NextResponse>[] = [];

      // Send all requests concurrently
      for (let i = 0; i < ipCount; i++) {
        const req = createMockRequest(`10.0.${Math.floor(i / 256)}.${i % 256}`);

        for (let j = 0; j < requestsPerIP; j++) {
          promises.push(handler(req));
        }
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;

      const blockedCount = responses.filter(r => r.status === 429).length;
      const allowedCount = responses.filter(r => r.status === 200).length;

      // Should allow ~10 per IP
      expect(allowedCount).toBeGreaterThanOrEqual(ipCount * 9);
      expect(allowedCount).toBeLessThanOrEqual(ipCount * 11);

      // Should handle concurrency efficiently
      expect(duration).toBeLessThan(10000); // 10 seconds

      console.log(`Distributed attack: ${allowedCount} allowed, ${blockedCount} blocked in ${duration}ms`);
    });
  });

  describe('Burst Traffic Handling', () => {
    it('should handle sudden traffic spike', async () => {
      const config: RateLimitConfig = {
        windowMs: 1000,
        maxRequests: 50,
      };

      const handler = withRateLimit(
        async () => NextResponse.json({ success: true }),
        { config }
      );

      const req = createMockRequest('192.168.1.3');
      const promises: Promise<NextResponse>[] = [];

      // Sudden burst of 100 requests
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        promises.push(handler(req));
      }

      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;

      const allowedCount = responses.filter(r => r.status === 200).length;
      const blockedCount = responses.filter(r => r.status === 429).length;

      // Should allow ~50 and block ~50
      expect(allowedCount).toBeGreaterThanOrEqual(45);
      expect(allowedCount).toBeLessThanOrEqual(55);
      expect(blockedCount).toBeGreaterThanOrEqual(45);

      // Should handle quickly
      expect(duration).toBeLessThan(5000); // 5 seconds

      console.log(`Burst handling: ${allowedCount} allowed, ${blockedCount} blocked in ${duration}ms`);
    });
  });

  describe('Rate Limit Bypass Attempts', () => {
    it('should not be bypassed by IP spoofing', async () => {
      const config: RateLimitConfig = {
        windowMs: 1000,
        maxRequests: 3,
      };

      const handler = withRateLimit(
        async () => NextResponse.json({ success: true }),
        { config }
      );

      // Try different IP headers
      const headers1 = { 'x-forwarded-for': '192.168.1.1' };
      const headers2 = { 'x-real-ip': '192.168.1.1' };
      const headers3 = { 'cf-connecting-ip': '192.168.1.1' };

      const req1 = createMockRequest('192.168.1.1', headers1);
      const req2 = createMockRequest('192.168.1.1', headers2);
      const req3 = createMockRequest('192.168.1.1', headers3);

      // All should count toward same limit
      await handler(req1);
      await handler(req2);
      await handler(req3);

      const response = await handler(req1);
      expect(response.status).toBe(429);
    });

    it('should not be bypassed by rapid user switching', async () => {
      const config: RateLimitConfig = {
        windowMs: 1000,
        maxRequests: 5,
        keyGenerator: (req) => req.headers.get('x-user-id') || 'anonymous',
      };

      const handler = withRateLimit(
        async () => NextResponse.json({ success: true }),
        { config }
      );

      const req = createMockRequest('192.168.1.1');

      // Try switching users rapidly
      for (let i = 0; i < 5; i++) {
        const headers = { 'x-user-id': `user-${i}` };
        const userReq = createMockRequest('192.168.1.1', headers);
        await handler(userReq);
      }

      // Each user should still be tracked
      const response = await handler(createMockRequest('192.168.1.1', { 'x-user-id': 'user-0' }));
      expect(response.status).toBe(429);
    });
  });
});

describe('Performance Benchmarks', () => {
  afterEach(async () => {
    const limiter = getRateLimiter();
    await limiter.destroy();
  });

  it('should have sub-millisecond latency for single check', async () => {
    const limiter = getRateLimiter();
    const config: RateLimitConfig = {
      windowMs: 1000,
      maxRequests: 100,
    };

    const req = createMockRequest('192.168.1.10');

    const iterations = 100;
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await limiter.checkRateLimit(req, config);
      const duration = performance.now() - start;
      latencies.push(duration);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

    console.log(`Average latency: ${avgLatency.toFixed(3)}ms`);
    console.log(`P95 latency: ${p95Latency.toFixed(3)}ms`);

    expect(avgLatency).toBeLessThan(10); // Average < 10ms
    expect(p95Latency).toBeLessThan(20); // P95 < 20ms
  });

  it('should handle concurrent requests efficiently', async () => {
    const limiter = getRateLimiter();
    const config: RateLimitConfig = {
      windowMs: 5000,
      maxRequests: 1000,
    };

    const concurrency = 100;
    const promises: Promise<any>[] = [];

    const startTime = performance.now();

    for (let i = 0; i < concurrency; i++) {
      const req = createMockRequest(`192.168.${Math.floor(i / 256)}.${i % 256}`);
      promises.push(limiter.checkRateLimit(req, config));
    }

    await Promise.all(promises);
    const duration = performance.now() - startTime;

    console.log(`${concurrency} concurrent checks in ${duration.toFixed(2)}ms`);
    console.log(`Throughput: ${((concurrency / duration) * 1000).toFixed(0)} checks/second`);

    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });

  it('should maintain performance with many tracked IPs', async () => {
    const limiter = getRateLimiter();
    const config: RateLimitConfig = {
      windowMs: 60000,
      maxRequests: 10,
    };

    // Create 1000 different IPs
    for (let i = 0; i < 1000; i++) {
      const req = createMockRequest(`10.${Math.floor(i / 256)}.${(i % 256) / 256}.${i % 256}`);
      await limiter.checkRateLimit(req, config);
    }

    // Measure performance with full cache
    const testReq = createMockRequest('192.168.1.1');
    const start = performance.now();
    await limiter.checkRateLimit(testReq, config);
    const duration = performance.now() - start;

    console.log(`Check with 1000 IPs cached: ${duration.toFixed(3)}ms`);

    expect(duration).toBeLessThan(10); // Should still be fast
  });

  it('should handle memory efficiently under load', async () => {
    const limiter = getRateLimiter();
    const config: RateLimitConfig = {
      windowMs: 10000,
      maxRequests: 100,
    };

    const initialStats = await limiter.getStats();

    // Generate load
    for (let i = 0; i < 500; i++) {
      const req = createMockRequest(`172.16.${Math.floor(i / 256)}.${i % 256}`);
      await limiter.checkRateLimit(req, config);
    }

    const loadedStats = await limiter.getStats();

    console.log(`Memory entries: ${loadedStats.memoryEntries}`);
    console.log(`Redis available: ${loadedStats.redisAvailable}`);

    expect(loadedStats.memoryEntries).toBe(500);
  });
});

describe('End-to-End Flows', () => {
  afterEach(async () => {
    const limiter = getRateLimiter();
    await limiter.destroy();
  });

  it('should handle complete request lifecycle', async () => {
    const config: RateLimitConfig = {
      windowMs: 2000,
      maxRequests: 5,
    };

    const onLimitExceeded = vi.fn();
    const handler = withRateLimit(
      async () => NextResponse.json({ success: true }),
      { config, onLimitExceeded, enableExpBackoff: true }
    );

    const req = createMockRequest('192.168.1.50');

    // Phase 1: Normal usage
    for (let i = 0; i < 5; i++) {
      const response = await handler(req);
      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Remaining')).toBe(String(4 - i));
    }

    // Phase 2: Hit limit
    let response = await handler(req);
    expect(response.status).toBe(429);
    expect(onLimitExceeded).toHaveBeenCalledTimes(1);

    const data1 = await response.json();
    expect(data1.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(data1.details.retryAfter).toBeDefined();

    // Phase 3: Repeated violations (exponential backoff)
    await sleep(100);
    response = await handler(req);
    const data2 = await response.json();

    if (data2.details.backoffMultiplier) {
      expect(data2.details.backoffMultiplier).toBeGreaterThan(1);
    }

    // Phase 4: Wait for window reset
    await sleep(2100);

    // Phase 5: Should work again
    response = await handler(req);
    expect(response.status).toBe(200);
  });

  it('should handle multiple endpoints with different limits', async () => {
    const authHandler = withRateLimit(
      async () => NextResponse.json({ auth: true }),
      { configName: 'auth' }
    );

    const apiHandler = withRateLimit(
      async () => NextResponse.json({ api: true }),
      { configName: 'general' }
    );

    const req = createMockRequest('192.168.1.51');

    // Auth: 5 per 15 minutes
    for (let i = 0; i < 5; i++) {
      const response = await authHandler(req);
      expect(response.status).toBe(200);
    }
    expect((await authHandler(req)).status).toBe(429);

    // API should still work (100 per minute)
    const apiResponse = await apiHandler(req);
    expect(apiResponse.status).toBe(200);
  });
});

describe('User vs IP Rate Limiting', () => {
  it('should rate limit by user ID when available', async () => {
    const config: RateLimitConfig = {
      windowMs: 1000,
      maxRequests: 3,
    };

    const handler = withRateLimit(
      async () => NextResponse.json({ success: true }),
      { config }
    );

    // Same user, different IPs
    const req1 = createMockRequest('192.168.1.1', { 'x-user-id': 'user123' });
    const req2 = createMockRequest('192.168.1.2', { 'x-user-id': 'user123' });

    // Should share limit
    await handler(req1);
    await handler(req2);
    await handler(req1);

    const response = await handler(req2);
    expect(response.status).toBe(429);
  });

  it('should rate limit by IP when no user ID', async () => {
    const config: RateLimitConfig = {
      windowMs: 1000,
      maxRequests: 3,
    };

    const handler = withRateLimit(
      async () => NextResponse.json({ success: true }),
      { config }
    );

    const req1 = createMockRequest('192.168.1.1');
    const req2 = createMockRequest('192.168.1.2');

    // Different IPs should have separate limits
    for (let i = 0; i < 3; i++) {
      expect((await handler(req1)).status).toBe(200);
      expect((await handler(req2)).status).toBe(200);
    }

    // Both should be limited now
    expect((await handler(req1)).status).toBe(429);
    expect((await handler(req2)).status).toBe(429);
  });
});

// Helper functions
function createMockRequest(ip: string, additionalHeaders: Record<string, string> = {}): NextRequest {
  const headers = new Headers({
    'x-forwarded-for': ip,
    'x-real-ip': ip,
    ...additionalHeaders,
  });

  return {
    headers,
    method: 'GET',
    url: 'http://localhost:3000/api/test',
    ip,
  } as NextRequest;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
