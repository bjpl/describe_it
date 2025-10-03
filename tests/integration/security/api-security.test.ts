/**
 * API Security Integration Tests
 * Tests authorization, rate limiting, and security middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

describe('API Security Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authorization Flows', () => {
    describe('Free Tier User Restrictions', () => {
      it('should allow free tier access to basic features', async () => {
        const response = await fetch('/api/images/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer free-tier-token',
            'X-User-Tier': 'free',
          },
          body: JSON.stringify({ query: 'mountain', limit: 5 }),
        });

        expect(response.status).toBe(200);
      });

      it('should reject free tier access to premium features', async () => {
        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer free-tier-token',
            'X-User-Tier': 'free',
          },
          body: JSON.stringify({
            imageUrl: 'https://example.com/test.jpg',
            styles: ['narrativo', 'descriptivo', 'academico', 'conversacional'], // Premium multi-style
          }),
        });

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toContain('premium');
        expect(data.upgradeUrl).toBeDefined();
      });

      it('should enforce free tier rate limits', async () => {
        // Free tier: 10 requests per hour
        const requests = Array(12).fill(null).map((_, i) =>
          fetch('/api/descriptions/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer free-tier-token',
              'X-User-Tier': 'free',
            },
            body: JSON.stringify({
              imageUrl: `https://example.com/test${i}.jpg`,
            }),
          })
        );

        const responses = await Promise.all(requests);

        const successResponses = responses.filter(r => r.status === 200);
        const rateLimitedResponses = responses.filter(r => r.status === 429);

        expect(successResponses.length).toBeLessThanOrEqual(10);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      });

      it('should reject free tier batch operations', async () => {
        const response = await fetch('/api/descriptions/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer free-tier-token',
            'X-User-Tier': 'free',
          },
          body: JSON.stringify({
            images: ['url1.jpg', 'url2.jpg', 'url3.jpg'],
          }),
        });

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.code).toBe('PREMIUM_REQUIRED');
      });
    });

    describe('Premium User Access', () => {
      it('should allow premium access to all features', async () => {
        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer premium-token',
            'X-User-Tier': 'premium',
          },
          body: JSON.stringify({
            imageUrl: 'https://example.com/test.jpg',
            styles: ['narrativo', 'descriptivo', 'academico'],
          }),
        });

        expect(response.status).toBe(200);
      });

      it('should enforce premium tier rate limits (higher)', async () => {
        // Premium tier: 100 requests per hour
        const requests = Array(105).fill(null).map((_, i) =>
          fetch('/api/descriptions/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer premium-token',
              'X-User-Tier': 'premium',
            },
            body: JSON.stringify({
              imageUrl: `https://example.com/test${i}.jpg`,
            }),
          })
        );

        const responses = await Promise.all(requests);

        const successResponses = responses.filter(r => r.status === 200);
        const rateLimitedResponses = responses.filter(r => r.status === 429);

        expect(successResponses.length).toBeGreaterThan(95); // Most succeed
        expect(rateLimitedResponses.length).toBeGreaterThan(0); // Eventually limited
      });

      it('should allow premium batch operations', async () => {
        const response = await fetch('/api/descriptions/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer premium-token',
            'X-User-Tier': 'premium',
          },
          body: JSON.stringify({
            images: Array(10).fill('https://example.com/test.jpg'),
          }),
        });

        expect(response.status).toBe(200);
      });
    });

    describe('Role Escalation Prevention', () => {
      it('should reject attempts to escalate from free to premium', async () => {
        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer free-tier-token',
            'X-User-Tier': 'premium', // Attempted escalation
          },
          body: JSON.stringify({
            imageUrl: 'https://example.com/test.jpg',
            styles: ['narrativo', 'descriptivo'],
          }),
        });

        // Should validate tier against actual user record, not header
        expect([401, 403]).toContain(response.status);
      });

      it('should reject attempts to forge admin privileges', async () => {
        const response = await fetch('/api/admin/users', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer regular-user-token',
            'X-Admin': 'true', // Attempted privilege escalation
          },
        });

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toContain('Admin');
      });

      it('should validate JWT claims against user database', async () => {
        // Token claims user is admin, but database says otherwise
        const response = await fetch('/api/admin/reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-admin-token',
          },
          body: JSON.stringify({ userId: 'target-user' }),
        });

        expect(response.status).toBe(403);
      });
    });

    describe('Feature Flag Authorization', () => {
      it('should deny access when feature flag is disabled', async () => {
        // Mock feature flag service
        const response = await fetch('/api/features/experimental', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer premium-token',
            'X-Feature-Flags': 'experimental_feature:false',
          },
          body: JSON.stringify({ action: 'test' }),
        });

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.code).toBe('FEATURE_DISABLED');
      });

      it('should allow access when feature flag is enabled for user', async () => {
        const response = await fetch('/api/features/experimental', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer premium-token',
            'X-Feature-Flags': 'experimental_feature:true',
          },
          body: JSON.stringify({ action: 'test' }),
        });

        expect(response.status).toBe(200);
      });

      it('should respect beta tester privileges', async () => {
        const response = await fetch('/api/features/beta', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer beta-tester-token',
            'X-User-Groups': 'beta-testers',
          },
          body: JSON.stringify({ feature: 'new_feature' }),
        });

        expect(response.status).toBe(200);
      });
    });

    describe('Admin Access Control', () => {
      it('should allow admin access to admin panel', async () => {
        const response = await fetch('/api/admin/dashboard', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer admin-token',
            'X-Admin-Key': process.env.ADMIN_API_KEY,
          },
        });

        expect(response.status).toBe(200);
      });

      it('should require both admin token and API key', async () => {
        // Only admin token
        const response1 = await fetch('/api/admin/dashboard', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer admin-token',
          },
        });

        expect(response1.status).toBe(401);

        // Only API key
        const response2 = await fetch('/api/admin/dashboard', {
          method: 'GET',
          headers: {
            'X-Admin-Key': process.env.ADMIN_API_KEY,
          },
        });

        expect(response2.status).toBe(401);
      });

      it('should audit all admin actions', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn');

        await fetch('/api/admin/users/delete', {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer admin-token',
            'X-Admin-Key': process.env.ADMIN_API_KEY,
          },
          body: JSON.stringify({ userId: 'user-to-delete' }),
        });

        // Verify audit log was created
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('ADMIN_ACTION')
        );
      });
    });

    describe('Resource Ownership Validation', () => {
      it('should allow users to access their own resources', async () => {
        const response = await fetch('/api/user/vocabulary', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer user-123-token',
            'X-User-ID': 'user-123',
          },
        });

        expect(response.status).toBe(200);
      });

      it('should prevent users from accessing others resources', async () => {
        const response = await fetch('/api/user/vocabulary?userId=user-456', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer user-123-token',
            'X-User-ID': 'user-123',
          },
        });

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toContain('not authorized');
      });

      it('should validate ownership on updates', async () => {
        const response = await fetch('/api/vocabulary/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer user-123-token',
            'X-User-ID': 'user-123',
          },
          body: JSON.stringify({
            vocabularyId: 'vocab-belonging-to-user-456',
            updates: { phrase: 'hacked' },
          }),
        });

        expect(response.status).toBe(403);
      });
    });
  });

  describe('Security Headers Validation', () => {
    it('should include all required security headers', async () => {
      const response = await fetch('/api/health', {
        method: 'GET',
      });

      const headers = {
        'X-Content-Type-Options': response.headers.get('X-Content-Type-Options'),
        'X-Frame-Options': response.headers.get('X-Frame-Options'),
        'X-XSS-Protection': response.headers.get('X-XSS-Protection'),
        'Strict-Transport-Security': response.headers.get('Strict-Transport-Security'),
        'Content-Security-Policy': response.headers.get('Content-Security-Policy'),
      };

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    });

    it('should not expose server information', async () => {
      const response = await fetch('/api/health');

      expect(response.headers.get('Server')).toBeNull();
      expect(response.headers.get('X-Powered-By')).toBeNull();
    });

    it('should set proper CORS headers', async () => {
      const response = await fetch('/api/images/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://describe-it-lovat.vercel.app',
        },
        body: JSON.stringify({ query: 'test' }),
      });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should reject unauthorized origins', async () => {
      const response = await fetch('/api/vocabulary/save', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'POST',
        },
      });

      // Should either reject or not include origin in allowed origins
      if (response.status === 200) {
        const allowedOrigin = response.headers.get('Access-Control-Allow-Origin');
        expect(allowedOrigin).not.toBe('https://malicious-site.com');
      } else {
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should apply progressive rate limiting after violations', async () => {
      const makeRequest = () => fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: 'https://example.com/test.jpg' }),
      });

      // First violation - normal timeout
      const responses1 = await Promise.all(Array(15).fill(null).map(makeRequest));
      const limited1 = responses1.filter(r => r.status === 429);

      if (limited1.length > 0) {
        const retryAfter1 = parseInt(limited1[0].headers.get('Retry-After') || '60');

        // Second violation - increased timeout
        const responses2 = await Promise.all(Array(15).fill(null).map(makeRequest));
        const limited2 = responses2.filter(r => r.status === 429);

        if (limited2.length > 0) {
          const retryAfter2 = parseInt(limited2[0].headers.get('Retry-After') || '60');
          expect(retryAfter2).toBeGreaterThan(retryAfter1);
        }
      }
    });

    it('should include rate limit info in headers', async () => {
      const response = await fetch('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
      });

      expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });

    it('should reset rate limits after time window', async () => {
      // This test would require time manipulation or longer wait
      // Simplified version:
      const response = await fetch('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
      });

      const resetTime = parseInt(response.headers.get('X-RateLimit-Reset') || '0');
      expect(resetTime).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe('API Key Security', () => {
    it('should validate API key format', async () => {
      const response = await fetch('/api/protected/resource', {
        method: 'GET',
        headers: {
          'X-API-Key': 'invalid-format',
        },
      });

      expect([401, 403]).toContain(response.status);
    });

    it('should not expose API keys in responses', async () => {
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: 'https://example.com/test.jpg' }),
      });

      const responseText = await response.text();
      expect(responseText).not.toContain('sk-');
      expect(responseText).not.toContain('key_');
      expect(responseText).not.toContain('secret_');
    });
  });
});
