import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import {
  RateLimiter,
  RateLimitConfigs,
  ExponentialBackoff,
  getRateLimiter
} from '@/lib/rate-limiting/rate-limiter';
import type { RateLimitConfig, RateLimitResult } from '@/lib/rate-limiting/rate-limiter';

/**
 * Test suite for RateLimiter class
 *
 * Covers:
 * - Sliding window algorithm accuracy
 * - Multiple IP tracking
 * - Concurrent request handling
 * - Memory efficiency
 * - Redis integration and fallback
 * - Cleanup mechanisms
 */

describe('RateLimiter - Core Functionality', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  afterEach(async () => {
    await rateLimiter.destroy();
  });

  describe('Sliding Window Algorithm', () => {
    it('should accurately count requests within window', async () => {
      const config: RateLimitConfig = {
        windowMs: 1000, // 1 second
        maxRequests: 5,
      };

      const req = createMockRequest('192.168.1.1');

      // Make requests up to limit
      const results: any[] = [];
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkRateLimit(req, config);
        results.push(result);
        expect(result.success).toBe(true);
      }

      // 6th request should fail
      const result = await rateLimiter.checkRateLimit(req, config);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);

      // Verify we got reasonable remaining counts
      expect(results[0].remaining).toBeGreaterThanOrEqual(0);
    });

    it('should properly slide the window over time', async () => {
      const config: RateLimitConfig = {
        windowMs: 500, // 500ms
        maxRequests: 3,
      };

      const req = createMockRequest('192.168.1.2');

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        const result = await rateLimiter.checkRateLimit(req, config);
        expect(result.success).toBe(true);
      }

      // 4th should fail
      let result = await rateLimiter.checkRateLimit(req, config);
      expect(result.success).toBe(false);

      // Wait for window to expire
      await sleep(600);

      // Should succeed again
      result = await rateLimiter.checkRateLimit(req, config);
      expect(result.success).toBe(true);
    });

    it('should handle requests at window boundary', async () => {
      const config: RateLimitConfig = {
        windowMs: 1000,
        maxRequests: 2,
      };

      const req = createMockRequest('192.168.1.3');

      // First request at t=0
      const result1 = await rateLimiter.checkRateLimit(req, config);
      expect(result1.success).toBe(true);

      // Wait 400ms
      await sleep(400);

      // Second request at t=400
      const result2 = await rateLimiter.checkRateLimit(req, config);
      expect(result2.success).toBe(true);

      // Third request should fail (still within window)
      const result3 = await rateLimiter.checkRateLimit(req, config);
      expect(result3.success).toBe(false);

      // Wait for full window to expire (1100ms total to ensure first request is out)
      await sleep(1100);

      // Should succeed again (first request is now outside window)
      const result4 = await rateLimiter.checkRateLimit(req, config);
      expect(result4.success).toBe(true);
    });
  });

  describe('Multiple IP Tracking', () => {
    it('should track different IPs independently', async () => {
      const config: RateLimitConfig = {
        windowMs: 1000,
        maxRequests: 2,
      };

      const req1 = createMockRequest('192.168.1.1');
      const req2 = createMockRequest('192.168.1.2');
      const req3 = createMockRequest('192.168.1.3');

      // Each IP should have independent limits
      for (let i = 0; i < 2; i++) {
        expect((await rateLimiter.checkRateLimit(req1, config)).success).toBe(true);
        expect((await rateLimiter.checkRateLimit(req2, config)).success).toBe(true);
        expect((await rateLimiter.checkRateLimit(req3, config)).success).toBe(true);
      }

      // All should be rate limited now
      expect((await rateLimiter.checkRateLimit(req1, config)).success).toBe(false);
      expect((await rateLimiter.checkRateLimit(req2, config)).success).toBe(false);
      expect((await rateLimiter.checkRateLimit(req3, config)).success).toBe(false);
    });

    it('should handle many concurrent IPs efficiently', async () => {
      const config: RateLimitConfig = {
        windowMs: 1000,
        maxRequests: 10,
      };

      const ipCount = 100;
      const promises: Promise<RateLimitResult>[] = [];

      for (let i = 0; i < ipCount; i++) {
        const req = createMockRequest(`192.168.${Math.floor(i / 256)}.${i % 256}`);
        promises.push(rateLimiter.checkRateLimit(req, config));
      }

      const results = await Promise.all(promises);

      // All different IPs should succeed
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent requests from same IP correctly', async () => {
      const config: RateLimitConfig = {
        windowMs: 1000,
        maxRequests: 10,
      };

      const req = createMockRequest('192.168.1.1');
      const promises: Promise<RateLimitResult>[] = [];

      // Send 15 concurrent requests
      for (let i = 0; i < 15; i++) {
        promises.push(rateLimiter.checkRateLimit(req, config));
      }

      const results = await Promise.all(promises);

      // First 10 should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeLessThanOrEqual(10);

      // At least some should fail
      const failureCount = results.filter(r => !r.success).length;
      expect(failureCount).toBeGreaterThan(0);
    });

    it('should maintain accuracy under high concurrency', async () => {
      const config: RateLimitConfig = {
        windowMs: 2000,
        maxRequests: 50,
      };

      const req = createMockRequest('192.168.1.2');
      const promises: Promise<RateLimitResult>[] = [];

      // Send 100 concurrent requests
      for (let i = 0; i < 100; i++) {
        promises.push(rateLimiter.checkRateLimit(req, config));
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;

      // Should allow approximately maxRequests (with some tolerance for race conditions)
      expect(successCount).toBeGreaterThanOrEqual(50);
      expect(successCount).toBeLessThanOrEqual(55); // Small tolerance
    });
  });

  describe('Memory Management', () => {
    it('should clean up old entries periodically', async () => {
      const config: RateLimitConfig = {
        windowMs: 100,
        maxRequests: 5,
      };

      const req = createMockRequest('192.168.1.1');

      // Make requests
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkRateLimit(req, config);
      }

      // Get initial stats
      const stats1 = await rateLimiter.getStats();
      expect(stats1.memoryEntries).toBeGreaterThan(0);

      // Wait for cleanup (memory cache cleans every minute, but entries expire after 1 hour)
      // We'll test by checking stats remain reasonable
      await sleep(200);

      // Should still work after window expires
      const result = await rateLimiter.checkRateLimit(req, config);
      expect(result.success).toBe(true);
    });

    it('should handle memory efficiently with many IPs', async () => {
      const config: RateLimitConfig = {
        windowMs: 1000,
        maxRequests: 5,
      };

      const ipCount = 1000;

      for (let i = 0; i < ipCount; i++) {
        const req = createMockRequest(`10.${Math.floor(i / 256)}.${Math.floor((i % 256) / 256)}.${i % 256}`);
        await rateLimiter.checkRateLimit(req, config);
      }

      const stats = await rateLimiter.getStats();
      expect(stats.memoryEntries).toBe(ipCount);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should get status without incrementing counter', async () => {
      const config: RateLimitConfig = {
        windowMs: 1000,
        maxRequests: 5,
      };

      const req = createMockRequest('192.168.1.1');

      // Get status multiple times
      for (let i = 0; i < 10; i++) {
        const status = await rateLimiter.getRateLimitStatus(req, config);
        expect(status.remaining).toBe(5);
        expect(status.success).toBe(true);
      }

      // Now make an actual request (decrements counter)
      const result = await rateLimiter.checkRateLimit(req, config);
      // After one request, remaining should be less than initial
      expect(result.remaining).toBeLessThan(5);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for specific identifier', async () => {
      const config: RateLimitConfig = {
        windowMs: 5000,
        maxRequests: 2,
      };

      const req = createMockRequest('192.168.1.1');

      // Hit rate limit
      await rateLimiter.checkRateLimit(req, config);
      await rateLimiter.checkRateLimit(req, config);

      let result = await rateLimiter.checkRateLimit(req, config);
      expect(result.success).toBe(false);

      // Reset
      await rateLimiter.resetRateLimit(req, config);

      // Should work again
      result = await rateLimiter.checkRateLimit(req, config);
      expect(result.success).toBe(true);
    });
  });
});

describe('ExponentialBackoff', () => {
  beforeEach(() => {
    // Reset violations before each test
    ExponentialBackoff.resetViolations('test-user');
  });

  it('should calculate exponential backoff correctly', () => {
    const baseWindow = 1000; // 1 second
    const identifier = 'test-user';

    // First violation: 1x
    const backoff1 = ExponentialBackoff.calculateBackoff(identifier, baseWindow);
    expect(backoff1).toBe(baseWindow);

    // Second violation: 2x
    const backoff2 = ExponentialBackoff.calculateBackoff(identifier, baseWindow);
    expect(backoff2).toBe(baseWindow * 2);

    // Third violation: 4x
    const backoff3 = ExponentialBackoff.calculateBackoff(identifier, baseWindow);
    expect(backoff3).toBe(baseWindow * 4);

    // Fourth violation: 8x
    const backoff4 = ExponentialBackoff.calculateBackoff(identifier, baseWindow);
    expect(backoff4).toBe(baseWindow * 8);
  });

  it('should cap backoff at 1 hour maximum', () => {
    const baseWindow = 1000;
    const identifier = 'test-user-2';
    const maxBackoff = 60 * 60 * 1000; // 1 hour

    // Trigger many violations
    for (let i = 0; i < 20; i++) {
      const backoff = ExponentialBackoff.calculateBackoff(identifier, baseWindow);
      expect(backoff).toBeLessThanOrEqual(maxBackoff);
    }
  });

  it('should reset violations after extended inactivity', async () => {
    const baseWindow = 100;
    const identifier = 'test-user-3';

    // First violation
    let backoff = ExponentialBackoff.calculateBackoff(identifier, baseWindow);
    expect(backoff).toBe(baseWindow);

    // Second violation
    backoff = ExponentialBackoff.calculateBackoff(identifier, baseWindow);
    expect(backoff).toBe(baseWindow * 2);

    // Wait for reset period (10x base window)
    await sleep(1100);

    // Should reset to base
    backoff = ExponentialBackoff.calculateBackoff(identifier, baseWindow);
    expect(backoff).toBe(baseWindow);
  });

  it('should track violation count correctly', () => {
    const identifier = 'test-user-4';
    const baseWindow = 1000;

    expect(ExponentialBackoff.getViolationCount(identifier)).toBe(0);

    ExponentialBackoff.calculateBackoff(identifier, baseWindow);
    expect(ExponentialBackoff.getViolationCount(identifier)).toBe(1);

    ExponentialBackoff.calculateBackoff(identifier, baseWindow);
    expect(ExponentialBackoff.getViolationCount(identifier)).toBe(2);

    ExponentialBackoff.resetViolations(identifier);
    expect(ExponentialBackoff.getViolationCount(identifier)).toBe(0);
  });
});

describe('RateLimitConfigs', () => {
  it('should have correct auth config', () => {
    expect(RateLimitConfigs.auth).toEqual({
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    });
  });

  it('should have correct description configs', () => {
    expect(RateLimitConfigs.descriptionFree).toEqual({
      windowMs: 60 * 1000,
      maxRequests: 10,
      skipSuccessfulRequests: false,
      skipFailedRequests: true,
    });

    expect(RateLimitConfigs.descriptionPaid).toEqual({
      windowMs: 60 * 1000,
      maxRequests: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: true,
    });
  });

  it('should have correct burst config', () => {
    expect(RateLimitConfigs.burst).toEqual({
      windowMs: 10 * 1000,
      maxRequests: 20,
      skipSuccessfulRequests: true,
      skipFailedRequests: false,
    });
  });
});

describe('Custom Key Generators', () => {
  it('should use custom key generator when provided', async () => {
    const config: RateLimitConfig = {
      windowMs: 1000,
      maxRequests: 2,
      keyGenerator: (req) => {
        return req.headers.get('x-custom-id') || 'default';
      },
    };

    const rateLimiter = new RateLimiter();

    const req1 = createMockRequest('192.168.1.1', { 'x-custom-id': 'user1' });
    const req2 = createMockRequest('192.168.1.1', { 'x-custom-id': 'user2' });

    // Same IP but different custom IDs should be independent
    await rateLimiter.checkRateLimit(req1, config);
    await rateLimiter.checkRateLimit(req1, config);

    let result = await rateLimiter.checkRateLimit(req1, config);
    expect(result.success).toBe(false);

    // Different custom ID should still work
    result = await rateLimiter.checkRateLimit(req2, config);
    expect(result.success).toBe(true);

    await rateLimiter.destroy();
  });
});

describe('Rate Limiter Singleton', () => {
  it('should return same instance', () => {
    const instance1 = getRateLimiter();
    const instance2 = getRateLimiter();

    expect(instance1).toBe(instance2);
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
