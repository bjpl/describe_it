/**
 * HTTP Cache Headers Middleware
 * Implements proper caching with ETags, Cache-Control, and conditional requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * Cache control directives
 */
export const CacheControl = {
  // No caching - always fetch fresh
  NO_CACHE: 'no-cache, no-store, must-revalidate',

  // Private cache (user-specific data)
  PRIVATE_SHORT: 'private, max-age=300', // 5 minutes
  PRIVATE_MEDIUM: 'private, max-age=600', // 10 minutes
  PRIVATE_LONG: 'private, max-age=3600', // 1 hour

  // Public cache (shared data)
  PUBLIC_SHORT: 'public, max-age=300, s-maxage=300', // 5 minutes
  PUBLIC_MEDIUM: 'public, max-age=600, s-maxage=600', // 10 minutes
  PUBLIC_LONG: 'public, max-age=3600, s-maxage=3600', // 1 hour

  // Immutable (never changes)
  IMMUTABLE: 'public, max-age=31536000, immutable', // 1 year

  // Revalidate (check for updates)
  REVALIDATE_SHORT: 'public, max-age=60, must-revalidate',
  REVALIDATE_MEDIUM: 'public, max-age=300, must-revalidate',
} as const;

/**
 * Generate ETag from content
 */
export function generateETag(content: string | object): string {
  const data = typeof content === 'string' ? content : JSON.stringify(content);
  return `"${createHash('md5').update(data).digest('hex')}"`;
}

/**
 * Generate weak ETag (for dynamic content that's functionally equivalent)
 */
export function generateWeakETag(content: string | object): string {
  const data = typeof content === 'string' ? content : JSON.stringify(content);
  return `W/"${createHash('md5').update(data).digest('hex')}"`;
}

/**
 * Check if content matches ETag from request
 */
export function matchesETag(req: NextRequest, etag: string): boolean {
  const ifNoneMatch = req.headers.get('if-none-match');
  if (!ifNoneMatch) {
    return false;
  }

  // Handle multiple ETags (comma-separated)
  const requestETags = ifNoneMatch.split(',').map(tag => tag.trim());

  // Check for wildcard match
  if (requestETags.includes('*')) {
    return true;
  }

  return requestETags.includes(etag);
}

/**
 * Check if content has been modified since given date
 */
export function modifiedSince(req: NextRequest, lastModified: Date): boolean {
  const ifModifiedSince = req.headers.get('if-modified-since');
  if (!ifModifiedSince) {
    return true;
  }

  const ifModifiedSinceDate = new Date(ifModifiedSince);
  return lastModified > ifModifiedSinceDate;
}

/**
 * Add cache headers to response
 */
export function addCacheHeaders(
  response: NextResponse,
  options: {
    cacheControl?: string;
    etag?: string;
    lastModified?: Date;
    vary?: string[];
    staleWhileRevalidate?: number;
    staleIfError?: number;
  }
): NextResponse {
  const {
    cacheControl,
    etag,
    lastModified,
    vary = ['Accept-Encoding'],
    staleWhileRevalidate,
    staleIfError,
  } = options;

  // Set Cache-Control
  if (cacheControl) {
    let cacheControlValue = cacheControl;

    // Add stale-while-revalidate if specified
    if (staleWhileRevalidate) {
      cacheControlValue += `, stale-while-revalidate=${staleWhileRevalidate}`;
    }

    // Add stale-if-error if specified
    if (staleIfError) {
      cacheControlValue += `, stale-if-error=${staleIfError}`;
    }

    response.headers.set('Cache-Control', cacheControlValue);
  }

  // Set ETag
  if (etag) {
    response.headers.set('ETag', etag);
  }

  // Set Last-Modified
  if (lastModified) {
    response.headers.set('Last-Modified', lastModified.toUTCString());
  }

  // Set Vary headers
  if (vary.length > 0) {
    response.headers.set('Vary', vary.join(', '));
  }

  return response;
}

/**
 * Handle conditional GET requests
 * Returns 304 Not Modified if content hasn't changed
 */
export function handleConditionalGet(
  req: NextRequest,
  options: {
    etag?: string;
    lastModified?: Date;
  }
): NextResponse | null {
  const { etag, lastModified } = options;

  // Check ETag first (stronger validator)
  if (etag && matchesETag(req, etag)) {
    const response = new NextResponse(null, { status: 304 });
    response.headers.set('ETag', etag);
    return response;
  }

  // Check Last-Modified (weaker validator)
  if (lastModified && !modifiedSince(req, lastModified)) {
    const response = new NextResponse(null, { status: 304 });
    response.headers.set('Last-Modified', lastModified.toUTCString());
    return response;
  }

  return null;
}

/**
 * Wrapper for API routes with caching support
 */
export function withCacheHeaders(
  cacheOptions: {
    cacheControl: string;
    generateETag?: boolean;
    useWeakETag?: boolean;
    staleWhileRevalidate?: number;
    staleIfError?: number;
  },
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Execute handler
    const response = await handler(req);

    // Only add cache headers for successful responses
    if (response.status >= 200 && response.status < 300) {
      const options: Parameters<typeof addCacheHeaders>[1] = {
        cacheControl: cacheOptions.cacheControl,
        staleWhileRevalidate: cacheOptions.staleWhileRevalidate,
        staleIfError: cacheOptions.staleIfError,
      };

      // Generate ETag if requested
      if (cacheOptions.generateETag) {
        const body = await response.text();
        const etag = cacheOptions.useWeakETag
          ? generateWeakETag(body)
          : generateETag(body);

        options.etag = etag;

        // Check if client has matching ETag
        const notModified = handleConditionalGet(req, { etag });
        if (notModified) {
          return notModified;
        }

        // Return new response with body
        return new NextResponse(body, {
          status: response.status,
          headers: addCacheHeaders(response, options).headers,
        });
      }

      addCacheHeaders(response, options);
    }

    return response;
  };
}

/**
 * Get cache strategy based on endpoint type
 */
export function getCacheStrategy(endpointType: 'static' | 'user' | 'dynamic' | 'auth'): {
  cacheControl: string;
  staleWhileRevalidate?: number;
  staleIfError?: number;
} {
  switch (endpointType) {
    case 'static':
      return {
        cacheControl: CacheControl.PUBLIC_LONG,
        staleWhileRevalidate: 3600, // 1 hour
        staleIfError: 86400, // 1 day
      };

    case 'user':
      return {
        cacheControl: CacheControl.PRIVATE_MEDIUM,
        staleWhileRevalidate: 300, // 5 minutes
        staleIfError: 3600, // 1 hour
      };

    case 'dynamic':
      return {
        cacheControl: CacheControl.REVALIDATE_SHORT,
        staleWhileRevalidate: 60, // 1 minute
        staleIfError: 300, // 5 minutes
      };

    case 'auth':
      return {
        cacheControl: CacheControl.NO_CACHE,
      };
  }
}

/**
 * Add CORS and security headers along with cache headers
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // CORS headers
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy (basic)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  );

  return response;
}
