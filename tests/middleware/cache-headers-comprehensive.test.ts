/**
 * Comprehensive Cache Headers Middleware Tests
 * Tests ETags, Cache-Control, conditional requests, and security headers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  CacheControl,
  generateETag,
  generateWeakETag,
  matchesETag,
  modifiedSince,
  addCacheHeaders,
  handleConditionalGet,
  withCacheHeaders,
  getCacheStrategy,
  addSecurityHeaders,
} from '@/middleware/cache-headers';

describe('Cache Headers Middleware - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ETag Generation', () => {
    it('should generate consistent ETag for same content', () => {
      const content = 'test content';
      const etag1 = generateETag(content);
      const etag2 = generateETag(content);

      expect(etag1).toBe(etag2);
      expect(etag1).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it('should generate different ETags for different content', () => {
      const etag1 = generateETag('content 1');
      const etag2 = generateETag('content 2');

      expect(etag1).not.toBe(etag2);
    });

    it('should handle object content', () => {
      const content = { foo: 'bar', baz: 123 };
      const etag = generateETag(content);

      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it('should generate consistent ETags for same object', () => {
      const content = { items: [1, 2, 3], name: 'test' };
      const etag1 = generateETag(content);
      const etag2 = generateETag(content);

      expect(etag1).toBe(etag2);
    });

    it('should generate weak ETags', () => {
      const content = 'test content';
      const weakETag = generateWeakETag(content);

      expect(weakETag).toMatch(/^W\/"[a-f0-9]{32}"$/);
    });

    it('should differentiate between strong and weak ETags', () => {
      const content = 'test';
      const strongETag = generateETag(content);
      const weakETag = generateWeakETag(content);

      expect(strongETag).not.toBe(weakETag);
      expect(strongETag.startsWith('"')).toBe(true);
      expect(weakETag.startsWith('W/"')).toBe(true);
    });
  });

  describe('ETag Matching', () => {
    it('should match exact ETag', () => {
      const etag = '"abc123"';
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'if-none-match': etag,
        },
      });

      expect(matchesETag(req, etag)).toBe(true);
    });

    it('should not match different ETag', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'if-none-match': '"abc123"',
        },
      });

      expect(matchesETag(req, '"xyz789"')).toBe(false);
    });

    it('should handle multiple ETags', () => {
      const etag = '"abc123"';
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'if-none-match': '"xyz789", "abc123", "def456"',
        },
      });

      expect(matchesETag(req, etag)).toBe(true);
    });

    it('should match wildcard', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'if-none-match': '*',
        },
      });

      expect(matchesETag(req, '"any-etag"')).toBe(true);
    });

    it('should return false when no if-none-match header', () => {
      const req = new NextRequest('http://localhost:3000/api/test');

      expect(matchesETag(req, '"abc123"')).toBe(false);
    });

    it('should handle weak ETags', () => {
      const weakETag = 'W/"abc123"';
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'if-none-match': weakETag,
        },
      });

      expect(matchesETag(req, weakETag)).toBe(true);
    });
  });

  describe('Modified Since', () => {
    it('should detect modification', () => {
      const lastModified = new Date('2024-01-15T12:00:00Z');
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'if-modified-since': 'Mon, 01 Jan 2024 00:00:00 GMT',
        },
      });

      expect(modifiedSince(req, lastModified)).toBe(true);
    });

    it('should detect no modification', () => {
      const lastModified = new Date('2024-01-01T00:00:00Z');
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'if-modified-since': 'Mon, 15 Jan 2024 12:00:00 GMT',
        },
      });

      expect(modifiedSince(req, lastModified)).toBe(false);
    });

    it('should return true when no if-modified-since header', () => {
      const lastModified = new Date();
      const req = new NextRequest('http://localhost:3000/api/test');

      expect(modifiedSince(req, lastModified)).toBe(true);
    });

    it('should handle exact match dates', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'if-modified-since': date.toUTCString(),
        },
      });

      expect(modifiedSince(req, date)).toBe(false);
    });
  });

  describe('Add Cache Headers', () => {
    it('should add cache-control header', () => {
      const response = new NextResponse();
      addCacheHeaders(response, {
        cacheControl: CacheControl.PUBLIC_SHORT,
      });

      expect(response.headers.get('Cache-Control')).toBe(CacheControl.PUBLIC_SHORT);
    });

    it('should add ETag header', () => {
      const response = new NextResponse();
      const etag = '"test-etag"';
      addCacheHeaders(response, { etag });

      expect(response.headers.get('ETag')).toBe(etag);
    });

    it('should add Last-Modified header', () => {
      const response = new NextResponse();
      const lastModified = new Date('2024-01-15T12:00:00Z');
      addCacheHeaders(response, { lastModified });

      expect(response.headers.get('Last-Modified')).toBe(lastModified.toUTCString());
    });

    it('should add Vary headers', () => {
      const response = new NextResponse();
      addCacheHeaders(response, {
        vary: ['Accept', 'Accept-Language'],
      });

      expect(response.headers.get('Vary')).toBe('Accept, Accept-Language');
    });

    it('should add stale-while-revalidate', () => {
      const response = new NextResponse();
      addCacheHeaders(response, {
        cacheControl: CacheControl.PUBLIC_SHORT,
        staleWhileRevalidate: 300,
      });

      expect(response.headers.get('Cache-Control')).toContain('stale-while-revalidate=300');
    });

    it('should add stale-if-error', () => {
      const response = new NextResponse();
      addCacheHeaders(response, {
        cacheControl: CacheControl.PUBLIC_SHORT,
        staleIfError: 600,
      });

      expect(response.headers.get('Cache-Control')).toContain('stale-if-error=600');
    });

    it('should add all headers together', () => {
      const response = new NextResponse();
      const etag = '"combined-test"';
      const lastModified = new Date('2024-01-15T12:00:00Z');

      addCacheHeaders(response, {
        cacheControl: CacheControl.PUBLIC_MEDIUM,
        etag,
        lastModified,
        vary: ['Accept-Encoding', 'User-Agent'],
        staleWhileRevalidate: 300,
        staleIfError: 600,
      });

      expect(response.headers.get('Cache-Control')).toContain(CacheControl.PUBLIC_MEDIUM);
      expect(response.headers.get('Cache-Control')).toContain('stale-while-revalidate=300');
      expect(response.headers.get('Cache-Control')).toContain('stale-if-error=600');
      expect(response.headers.get('ETag')).toBe(etag);
      expect(response.headers.get('Last-Modified')).toBe(lastModified.toUTCString());
      expect(response.headers.get('Vary')).toBe('Accept-Encoding, User-Agent');
    });
  });

  describe('Handle Conditional GET', () => {
    it('should return 304 for matching ETag', () => {
      const etag = '"test-etag"';
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'if-none-match': etag,
        },
      });

      const response = handleConditionalGet(req, { etag });
      expect(response?.status).toBe(304);
      expect(response?.headers.get('ETag')).toBe(etag);
    });

    it('should return 304 for not modified since', () => {
      const lastModified = new Date('2024-01-01T00:00:00Z');
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'if-modified-since': 'Mon, 15 Jan 2024 12:00:00 GMT',
        },
      });

      const response = handleConditionalGet(req, { lastModified });
      expect(response?.status).toBe(304);
      expect(response?.headers.get('Last-Modified')).toBe(lastModified.toUTCString());
    });

    it('should return null for non-matching conditions', () => {
      const req = new NextRequest('http://localhost:3000/api/test');

      const response = handleConditionalGet(req, {
        etag: '"test"',
        lastModified: new Date(),
      });

      expect(response).toBeNull();
    });

    it('should prioritize ETag over Last-Modified', () => {
      const etag = '"test-etag"';
      const lastModified = new Date('2024-01-01T00:00:00Z');

      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'if-none-match': etag,
          'if-modified-since': 'Mon, 15 Jan 2024 12:00:00 GMT',
        },
      });

      const response = handleConditionalGet(req, { etag, lastModified });
      expect(response?.status).toBe(304);
      expect(response?.headers.get('ETag')).toBe(etag);
    });
  });

  describe('withCacheHeaders Higher-Order Function', () => {
    it('should add cache headers to successful response', async () => {
      const handler = async () => {
        return NextResponse.json({ data: 'test' });
      };

      const wrappedHandler = withCacheHeaders(
        { cacheControl: CacheControl.PUBLIC_SHORT },
        handler
      );

      const req = new NextRequest('http://localhost:3000/api/test');
      const response = await wrappedHandler(req);

      expect(response.headers.get('Cache-Control')).toBe(CacheControl.PUBLIC_SHORT);
    });

    it('should generate and use ETag', async () => {
      const handler = async () => {
        return new NextResponse('test content');
      };

      const wrappedHandler = withCacheHeaders(
        {
          cacheControl: CacheControl.PUBLIC_MEDIUM,
          generateETag: true,
        },
        handler
      );

      const req = new NextRequest('http://localhost:3000/api/test');
      const response = await wrappedHandler(req);

      expect(response.headers.has('ETag')).toBe(true);
      expect(response.headers.get('ETag')).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it('should return 304 for matching ETag', async () => {
      const content = 'test content';
      const etag = generateETag(content);

      const handler = async () => {
        return new NextResponse(content);
      };

      const wrappedHandler = withCacheHeaders(
        {
          cacheControl: CacheControl.PUBLIC_MEDIUM,
          generateETag: true,
        },
        handler
      );

      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'if-none-match': etag,
        },
      });

      const response = await wrappedHandler(req);
      expect(response.status).toBe(304);
    });

    it('should use weak ETags when specified', async () => {
      const handler = async () => {
        return new NextResponse('test content');
      };

      const wrappedHandler = withCacheHeaders(
        {
          cacheControl: CacheControl.PUBLIC_SHORT,
          generateETag: true,
          useWeakETag: true,
        },
        handler
      );

      const req = new NextRequest('http://localhost:3000/api/test');
      const response = await wrappedHandler(req);

      expect(response.headers.get('ETag')).toMatch(/^W\/"[a-f0-9]{32}"$/);
    });

    it('should not add cache headers to error responses', async () => {
      const handler = async () => {
        return NextResponse.json({ error: 'test' }, { status: 500 });
      };

      const wrappedHandler = withCacheHeaders(
        { cacheControl: CacheControl.PUBLIC_SHORT },
        handler
      );

      const req = new NextRequest('http://localhost:3000/api/test');
      const response = await wrappedHandler(req);

      expect(response.headers.get('Cache-Control')).toBeNull();
    });
  });

  describe('Cache Strategy', () => {
    it('should provide static content strategy', () => {
      const strategy = getCacheStrategy('static');

      expect(strategy.cacheControl).toBe(CacheControl.PUBLIC_LONG);
      expect(strategy.staleWhileRevalidate).toBe(3600);
      expect(strategy.staleIfError).toBe(86400);
    });

    it('should provide user content strategy', () => {
      const strategy = getCacheStrategy('user');

      expect(strategy.cacheControl).toBe(CacheControl.PRIVATE_MEDIUM);
      expect(strategy.staleWhileRevalidate).toBe(300);
      expect(strategy.staleIfError).toBe(3600);
    });

    it('should provide dynamic content strategy', () => {
      const strategy = getCacheStrategy('dynamic');

      expect(strategy.cacheControl).toBe(CacheControl.REVALIDATE_SHORT);
      expect(strategy.staleWhileRevalidate).toBe(60);
      expect(strategy.staleIfError).toBe(300);
    });

    it('should provide auth content strategy', () => {
      const strategy = getCacheStrategy('auth');

      expect(strategy.cacheControl).toBe(CacheControl.NO_CACHE);
      expect(strategy.staleWhileRevalidate).toBeUndefined();
      expect(strategy.staleIfError).toBeUndefined();
    });
  });

  describe('Security Headers', () => {
    it('should add CORS headers', () => {
      const response = new NextResponse();
      addSecurityHeaders(response);

      expect(response.headers.has('Access-Control-Allow-Origin')).toBe(true);
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });

    it('should add security headers', () => {
      const response = new NextResponse();
      addSecurityHeaders(response);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });

    it('should add Content Security Policy', () => {
      const response = new NextResponse();
      addSecurityHeaders(response);

      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self'");
    });

    it('should use environment APP_URL for CORS origin', () => {
      const originalUrl = process.env.NEXT_PUBLIC_APP_URL;
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';

      const response = new NextResponse();
      addSecurityHeaders(response);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');

      process.env.NEXT_PUBLIC_APP_URL = originalUrl;
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const etag = generateETag('');
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it('should handle complex objects', () => {
      const complexObject = {
        nested: {
          deep: {
            array: [1, 2, { foo: 'bar' }],
            date: '2024-01-15',
          },
        },
        nullValue: null,
        undefinedValue: undefined,
      };

      const etag = generateETag(complexObject);
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it('should handle special characters in content', () => {
      const content = 'Special: ñ, ü, é, 中文, 🎉';
      const etag = generateETag(content);
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it('should handle very long content', () => {
      const longContent = 'x'.repeat(100000);
      const etag = generateETag(longContent);
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });
  });
});
