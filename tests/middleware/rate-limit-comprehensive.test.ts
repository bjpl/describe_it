/**
 * Comprehensive Rate Limit Middleware Tests
 * Tests all scenarios including edge cases, error handling, and concurrent requests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  rateLimit,
  withRateLimit,
  checkApiRateLimit,
  resetRateLimit,
  getRateLimitStatus,
} from '@/middleware/rate-limit';

// Mock Vercel KV
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Rate Limit Middleware - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.SKIP_RATE_LIMIT;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Memory-based Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const response = await rateLimit(req, 'general');
      expect(response).toBeNull();
    });

    it('should block requests exceeding limit', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });

      // Make 101 requests (limit is 100 for general)
      for (let i = 0; i < 101; i++) {
        await rateLimit(req, 'general');
      }

      const response = await rateLimit(req, 'general');
      expect(response).not.toBeNull();
      expect(response?.status).toBe(429);
    });

    it('should respect different limits for different types', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.200',
        },
      });

      // Description limit is 10
      for (let i = 0; i < 10; i++) {
        const response = await rateLimit(req, 'description');
        expect(response).toBeNull();
      }

      const response = await rateLimit(req, 'description');
      expect(response?.status).toBe(429);
    });

    it('should reset counter after duration expires', async () => {
      vi.useFakeTimers();

      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.250',
        },
      });

      // Use up the limit
      for (let i = 0; i < 10; i++) {
        await rateLimit(req, 'description');
      }

      // Should be blocked
      let response = await rateLimit(req, 'description');
      expect(response?.status).toBe(429);

      // Fast forward past the duration (60 seconds)
      vi.advanceTimersByTime(61 * 1000);

      // Should be allowed again
      response = await rateLimit(req, 'description');
      expect(response).toBeNull();

      vi.useRealTimers();
    });

    it('should enforce block duration', async () => {
      vi.useFakeTimers();

      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.254',
        },
      });

      // Exceed limit to trigger block
      for (let i = 0; i < 11; i++) {
        await rateLimit(req, 'description');
      }

      // Should be blocked
      let response = await rateLimit(req, 'description');
      expect(response?.status).toBe(429);

      // Fast forward past duration but not block duration
      vi.advanceTimersByTime(61 * 1000);

      // Should still be blocked (block duration is 300 seconds)
      response = await rateLimit(req, 'description');
      expect(response?.status).toBe(429);

      // Fast forward past block duration
      vi.advanceTimersByTime(300 * 1000);

      // Should be allowed now
      response = await rateLimit(req, 'description');
      expect(response).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('Client Identification', () => {
    it('should use user ID when available', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-user-id': 'user123',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const response = await rateLimit(req, 'general');
      expect(response).toBeNull();
    });

    it('should fallback to IP address', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.99',
        },
      });

      const response = await rateLimit(req, 'general');
      expect(response).toBeNull();
    });

    it('should handle x-real-ip header', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-real-ip': '10.0.0.1',
        },
      });

      const response = await rateLimit(req, 'general');
      expect(response).toBeNull();
    });

    it('should handle unknown client', async () => {
      const req = new NextRequest('http://localhost:3000/api/test');

      const response = await rateLimit(req, 'general');
      expect(response).toBeNull();
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include rate limit headers in response', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.50',
        },
      });

      // Exceed limit
      for (let i = 0; i < 11; i++) {
        await rateLimit(req, 'description');
      }

      const response = await rateLimit(req, 'description');
      expect(response?.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response?.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response?.headers.has('X-RateLimit-Reset')).toBe(true);
      expect(response?.headers.has('Retry-After')).toBe(true);
    });
  });

  describe('withRateLimit Higher-Order Function', () => {
    it('should allow requests within limit', async () => {
      const handler = vi.fn(async () => {
        return NextResponse.json({ success: true });
      });

      const wrappedHandler = withRateLimit('general', handler);
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.2.1',
        },
      });

      const response = await wrappedHandler(req);
      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should block requests exceeding limit', async () => {
      const handler = vi.fn(async () => {
        return NextResponse.json({ success: true });
      });

      const wrappedHandler = withRateLimit('auth', handler);
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.2.100',
        },
      });

      // Auth limit is 5
      for (let i = 0; i < 6; i++) {
        await wrappedHandler(req);
      }

      const response = await wrappedHandler(req);
      expect(response.status).toBe(429);
      expect(handler).toHaveBeenCalledTimes(5); // Handler should not be called after limit
    });

    it('should add rate limit headers to successful responses', async () => {
      const handler = async () => {
        return NextResponse.json({ success: true });
      };

      const wrappedHandler = withRateLimit('general', handler);
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.2.200',
        },
      });

      const response = await wrappedHandler(req);
      expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
      expect(response.headers.has('X-RateLimit-Remaining')).toBe(true);
      expect(response.headers.has('X-RateLimit-Reset')).toBe(true);
    });
  });

  describe('checkApiRateLimit', () => {
    it('should return allowed status when within limit', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.3.1',
        },
      });

      const result = await checkApiRateLimit(req, 'general');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it('should return denied status when exceeding limit', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.3.100',
        },
      });

      // Exceed limit
      for (let i = 0; i < 11; i++) {
        await checkApiRateLimit(req, 'description');
      }

      const result = await checkApiRateLimit(req, 'description');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.response?.status).toBe(429);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for a client', async () => {
      const clientId = 'ip:192.168.4.1';
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.4.1',
        },
      });

      // Use up the limit
      for (let i = 0; i < 11; i++) {
        await rateLimit(req, 'description');
      }

      // Should be blocked
      let response = await rateLimit(req, 'description');
      expect(response?.status).toBe(429);

      // Reset the limit
      await resetRateLimit(clientId, 'description');

      // Should be allowed again
      response = await rateLimit(req, 'description');
      expect(response).toBeNull();
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return current rate limit status', async () => {
      const clientId = 'ip:192.168.5.1';
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.5.1',
        },
      });

      // Make a few requests
      await rateLimit(req, 'description');
      await rateLimit(req, 'description');

      const status = await getRateLimitStatus(clientId, 'description');
      expect(status.count).toBe(2);
      expect(status.limit).toBe(10);
      expect(status.remaining).toBe(8);
      expect(status.blocked).toBe(false);
    });

    it('should indicate blocked status', async () => {
      const clientId = 'ip:192.168.5.100';
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.5.100',
        },
      });

      // Exceed limit
      for (let i = 0; i < 12; i++) {
        await rateLimit(req, 'description');
      }

      const status = await getRateLimitStatus(clientId, 'description');
      expect(status.blocked).toBe(true);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle concurrent requests correctly', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.6.1',
        },
      });

      // Make 5 concurrent requests
      const promises = Array(5)
        .fill(null)
        .map(() => rateLimit(req, 'description'));

      const results = await Promise.all(promises);

      // All 5 should succeed (within limit of 10)
      results.forEach(result => {
        expect(result).toBeNull();
      });
    });

    it('should correctly count concurrent requests', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.6.100',
        },
      });

      // Make 12 concurrent requests (limit is 10)
      const promises = Array(12)
        .fill(null)
        .map(() => rateLimit(req, 'description'));

      const results = await Promise.all(promises);

      // Some should be blocked
      const blocked = results.filter(r => r?.status === 429);
      expect(blocked.length).toBeGreaterThan(0);
    });
  });

  describe('Development Mode', () => {
    it('should skip rate limiting when SKIP_RATE_LIMIT is true', async () => {
      process.env.NODE_ENV = 'development';
      process.env.SKIP_RATE_LIMIT = 'true';

      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.7.1',
        },
      });

      // Make many requests
      for (let i = 0; i < 200; i++) {
        const response = await rateLimit(req, 'description');
        expect(response).toBeNull();
      }
    });
  });

  describe('Error Handling', () => {
    it('should fallback to memory limiter on KV errors', async () => {
      const { kv } = await import('@vercel/kv');
      process.env.KV_REST_API_URL = 'http://test';
      process.env.KV_REST_API_TOKEN = 'test-token';

      // Mock KV to throw errors
      vi.mocked(kv.incr).mockRejectedValue(new Error('KV error'));

      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.8.1',
        },
      });

      // Should fallback to memory limiter
      const response = await rateLimit(req, 'general');
      expect(response).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle requests with no IP headers', async () => {
      const req = new NextRequest('http://localhost:3000/api/test');

      const response = await rateLimit(req, 'general');
      expect(response).toBeNull();
    });

    it('should handle requests with multiple forwarded IPs', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.9.1, 10.0.0.1, 172.16.0.1',
        },
      });

      const response = await rateLimit(req, 'general');
      expect(response).toBeNull();
    });

    it('should handle auth endpoints with stricter limits', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/signin', {
        headers: {
          'x-forwarded-for': '192.168.10.1',
        },
      });

      // Auth limit is 5
      for (let i = 0; i < 5; i++) {
        const response = await rateLimit(req, 'auth');
        expect(response).toBeNull();
      }

      const response = await rateLimit(req, 'auth');
      expect(response?.status).toBe(429);

      // Block duration for auth is 600 seconds
      const retryAfter = response?.headers.get('Retry-After');
      expect(parseInt(retryAfter || '0')).toBeGreaterThan(0);
    });

    it('should handle vocabulary endpoints with moderate limits', async () => {
      const req = new NextRequest('http://localhost:3000/api/vocabulary', {
        headers: {
          'x-forwarded-for': '192.168.11.1',
        },
      });

      // Vocabulary limit is 30
      for (let i = 0; i < 30; i++) {
        const response = await rateLimit(req, 'vocabulary');
        expect(response).toBeNull();
      }

      const response = await rateLimit(req, 'vocabulary');
      expect(response?.status).toBe(429);
    });
  });
});
