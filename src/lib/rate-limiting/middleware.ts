import { NextRequest, NextResponse } from 'next/server';
import { getRateLimiter, RateLimitConfig, RateLimitConfigs, ExponentialBackoff } from './rate-limiter';
import { logger } from '@/lib/logger';
import type { ErrorResponse } from '@/types/api';

/**
 * Rate limiting middleware options
 */
export interface RateLimitMiddlewareOptions {
  config?: RateLimitConfig;
  configName?: keyof typeof RateLimitConfigs;
  message?: string;
  enableExpBackoff?: boolean;
  bypassAdmin?: boolean;
  onLimitExceeded?: (req: NextRequest, rateLimitResult: any) => void;
  skipIf?: (req: NextRequest) => boolean;
}

/**
 * Enhanced error response for rate limiting - extends canonical ErrorResponse
 */
export interface RateLimitErrorResponse extends Omit<ErrorResponse, 'details'> {
  requestId?: string;
  code?: 'RATE_LIMIT_EXCEEDED';
  details: {
    limit: number;
    remaining: number;
    resetTime: string;
    retryAfter: number;
    backoffMultiplier?: number;
    violationCount?: number;
  };
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: RateLimitMiddlewareOptions = {}
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = crypto.randomUUID();
    const rateLimiter = getRateLimiter();

    try {
      // Skip rate limiting if specified
      if (options.skipIf && options.skipIf(req)) {
        return handler(req);
      }

      // Check for admin bypass
      if (options.bypassAdmin && isAdminRequest(req)) {
        logger.info('[Rate Limit] Admin bypass detected, skipping rate limit');
        return handler(req);
      }

      // Determine rate limit configuration
      const config = options.config || 
                    (options.configName ? RateLimitConfigs[options.configName] : RateLimitConfigs.general);

      // Apply exponential backoff if enabled
      if (options.enableExpBackoff) {
        const identifier = getRequestIdentifier(req);
        const backoffWindowMs = ExponentialBackoff.calculateBackoff(identifier, config.windowMs);
        
        if (backoffWindowMs > config.windowMs) {
          const backoffConfig = { ...config, windowMs: backoffWindowMs };
          const backoffResult = await rateLimiter.checkRateLimit(req, backoffConfig);
          
          if (!backoffResult.success) {
            return createRateLimitResponse({
              ...backoffResult,
              retryAfter: Math.ceil(backoffWindowMs / 1000)
            }, requestId, {
              backoffMultiplier: Math.ceil(backoffWindowMs / config.windowMs),
              violationCount: ExponentialBackoff.getViolationCount(identifier)
            });
          }
        }
      }

      // Check rate limit
      const rateLimitResult = await rateLimiter.checkRateLimit(req, config);

      // Add rate limit headers to successful requests
      const response = rateLimitResult.success 
        ? await handler(req)
        : createRateLimitResponse(rateLimitResult, requestId);

      // Add rate limit headers to all responses
      addRateLimitHeaders(response, rateLimitResult);

      // Handle rate limit exceeded
      if (!rateLimitResult.success) {
        // Call custom callback if provided
        if (options.onLimitExceeded) {
          options.onLimitExceeded(req, rateLimitResult);
        }

        // Log rate limit violation
        logger.warn('[Rate Limit] Rate limit exceeded:', {
          identifier: getRequestIdentifier(req),
          url: req.url,
          method: req.method,
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime.toISOString(),
          requestId
        });
      }

      return response;

    } catch (error) {
      logger.error('[Rate Limit] Middleware error:', error);
      
      // On error, allow request to proceed but log the issue
      logger.warn('[Rate Limit] Allowing request due to middleware error');
      return handler(req);
    }
  };
}

/**
 * Create standardized rate limit error response
 */
function createRateLimitResponse(
  rateLimitResult: any,
  requestId: string,
  extraDetails: Record<string, any> = {}
): NextResponse {
  const errorResponse: RateLimitErrorResponse = {
    success: false,
    error: "Rate limit exceeded",
    message: "Too many requests. Please try again later.",
    code: 'RATE_LIMIT_EXCEEDED',
    details: {
      limit: rateLimitResult.limit,
      remaining: rateLimitResult.remaining,
      resetTime: rateLimitResult.resetTime.toISOString(),
      retryAfter: rateLimitResult.retryAfter || Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000),
      ...extraDetails
    },
    timestamp: new Date().toISOString(),
    requestId
  };

  const response = NextResponse.json(errorResponse, { 
    status: 429,
    statusText: 'Too Many Requests'
  });

  // Add standard rate limit headers
  addRateLimitHeaders(response, rateLimitResult);

  // Add Retry-After header (RFC 6585)
  response.headers.set('Retry-After', errorResponse.details.retryAfter.toString());

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Request-ID', requestId);

  return response;
}

/**
 * Add rate limiting headers to response
 */
function addRateLimitHeaders(response: NextResponse, rateLimitResult: any): void {
  response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime.getTime() / 1000).toString());
  
  if (rateLimitResult.retryAfter) {
    response.headers.set('X-RateLimit-RetryAfter', rateLimitResult.retryAfter.toString());
  }
}

/**
 * Check if request is from an admin user
 */
function isAdminRequest(req: NextRequest): boolean {
  // Check for admin API key
  const adminApiKey = req.headers.get('x-admin-key');
  if (adminApiKey && adminApiKey === process.env.ADMIN_API_KEY) {
    return true;
  }

  // Check for admin authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.includes('admin')) {
    return true;
  }

  // Check for admin user ID
  const userId = req.headers.get('x-user-id');
  if (userId && process.env.ADMIN_USER_IDS?.split(',').includes(userId)) {
    return true;
  }

  return false;
}

/**
 * Generate request identifier for rate limiting
 */
function getRequestIdentifier(req: NextRequest): string {
  // Try to get user ID from various sources
  const userId = req.headers.get('x-user-id') || 
                req.headers.get('x-user') ||
                extractUserFromAuth(req) ||
                'anonymous';
  
  // Get IP address from various headers
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            req.headers.get('x-real-ip') ||
            req.headers.get('cf-connecting-ip') ||
            req.headers.get('x-client-ip') ||
            'unknown';
  
  return `${userId}:${ip}`;
}

/**
 * Extract user ID from authorization header
 */
function extractUserFromAuth(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  try {
    // Handle Bearer token
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // In a real app, you would decode the JWT token here
      // For now, we'll use a simple hash of the token as user identifier
      return `token_${simpleHash(token)}`;
    }

    // Handle basic auth
    if (authHeader.startsWith('Basic ')) {
      const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
      const [username] = credentials.split(':');
      return username;
    }
  } catch (error) {
    logger.warn('[Rate Limit] Error extracting user from auth header:', { error: error instanceof Error ? error.message : String(error) });
  }

  return null;
}

/**
 * Simple hash function for generating consistent user identifiers
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Predefined middleware functions for common use cases
 */
export const RateLimitMiddleware = {
  /**
   * Authentication endpoints rate limiting
   */
  auth: (handler: (req: NextRequest) => Promise<NextResponse>) =>
    withRateLimit(handler, {
      configName: 'auth',
      message: 'Too many authentication attempts. Please try again later.',
      enableExpBackoff: true,
      onLimitExceeded: (req) => {
        logger.warn(`[Security] Potential brute force attack from ${getRequestIdentifier(req)}`);
      }
    }),

  /**
   * Description generation rate limiting (tier-based)
   */
  description: (handler: (req: NextRequest) => Promise<NextResponse>, isPaidTier = false) =>
    withRateLimit(handler, {
      configName: isPaidTier ? 'descriptionPaid' : 'descriptionFree',
      message: isPaidTier 
        ? 'Description generation rate limit exceeded for paid tier.'
        : 'Description generation rate limit exceeded. Upgrade for higher limits.',
      bypassAdmin: true,
    }),

  /**
   * General API rate limiting
   */
  general: (handler: (req: NextRequest) => Promise<NextResponse>) =>
    withRateLimit(handler, {
      configName: 'general',
      message: 'API rate limit exceeded. Please slow down your requests.',
      bypassAdmin: true,
    }),

  /**
   * Strict rate limiting for sensitive operations
   */
  strict: (handler: (req: NextRequest) => Promise<NextResponse>) =>
    withRateLimit(handler, {
      configName: 'strict',
      message: 'Rate limit exceeded for this sensitive operation.',
      enableExpBackoff: true,
      bypassAdmin: false, // Even admins are rate limited for sensitive operations
    }),

  /**
   * Burst protection rate limiting
   */
  burst: (handler: (req: NextRequest) => Promise<NextResponse>) =>
    withRateLimit(handler, {
      configName: 'burst',
      message: 'Too many requests in a short period. Please wait a moment.',
    }),

  /**
   * Custom rate limiting with specific configuration
   */
  custom: (
    handler: (req: NextRequest) => Promise<NextResponse>,
    config: RateLimitConfig,
    options: Omit<RateLimitMiddlewareOptions, 'config'> = {}
  ) =>
    withRateLimit(handler, {
      ...options,
      config,
    }),
} as const;

/**
 * Rate limit status endpoint middleware
 */
export function withRateLimitStatus(
  handler: (req: NextRequest) => Promise<NextResponse>,
  configName: keyof typeof RateLimitConfigs = 'general'
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const rateLimiter = getRateLimiter();
      const config = RateLimitConfigs[configName];
      const status = await rateLimiter.getRateLimitStatus(req, config);

      const response = await handler(req);
      addRateLimitHeaders(response, status);

      return response;
    } catch (error) {
      logger.error('[Rate Limit Status] Error:', error);
      return handler(req);
    }
  };
}

/**
 * Utility function to check if a request would be rate limited without incrementing counters
 */
export async function checkRateLimitStatus(
  req: NextRequest,
  configName: keyof typeof RateLimitConfigs = 'general'
): Promise<{
  limited: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
}> {
  try {
    const rateLimiter = getRateLimiter();
    const config = RateLimitConfigs[configName];
    const result = await rateLimiter.getRateLimitStatus(req, config);

    return {
      limited: !result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetTime: result.resetTime,
    };
  } catch (error) {
    logger.error('[Rate Limit Check] Error:', error);
    return {
      limited: false,
      limit: 100,
      remaining: 100,
      resetTime: new Date(Date.now() + 60000),
    };
  }
}