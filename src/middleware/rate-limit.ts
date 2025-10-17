/**
 * Rate Limiting Middleware
 * Implements token bucket algorithm with multiple strategies
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Rate limit configuration
const RATE_LIMITS = {
  description: {
    points: 10,          // 10 requests
    duration: 60,        // per minute
    blockDuration: 300,  // block for 5 minutes on exceed
  },
  vocabulary: {
    points: 30,
    duration: 60,
    blockDuration: 300,
  },
  general: {
    points: 100,
    duration: 60,
    blockDuration: 180,
  },
  auth: {
    points: 5,           // Strict limit for auth endpoints
    duration: 60,
    blockDuration: 600,  // 10 minute block
  },
} as const;

type RateLimitType = keyof typeof RATE_LIMITS;

interface RateLimitInfo {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

/**
 * In-memory fallback for rate limiting when KV is unavailable
 */
class MemoryRateLimiter {
  private limits = new Map<string, RateLimitInfo>();

  async check(key: string, limit: typeof RATE_LIMITS[RateLimitType]): Promise<RateLimitInfo> {
    const now = Date.now();
    const existing = this.limits.get(key);

    // Check if blocked
    if (existing?.blockedUntil && existing.blockedUntil > now) {
      return existing;
    }

    // Reset if expired
    if (!existing || existing.resetAt < now) {
      const info: RateLimitInfo = {
        count: 1,
        resetAt: now + limit.duration * 1000,
      };
      this.limits.set(key, info);
      return info;
    }

    // Increment counter
    existing.count++;

    // Check if limit exceeded
    if (existing.count > limit.points) {
      existing.blockedUntil = now + limit.blockDuration * 1000;
    }

    this.limits.set(key, existing);
    return existing;
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, info] of this.limits.entries()) {
      if (info.resetAt < now && (!info.blockedUntil || info.blockedUntil < now)) {
        this.limits.delete(key);
      }
    }
  }
}

const memoryLimiter = new MemoryRateLimiter();

// Cleanup memory limiter every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    memoryLimiter.cleanup().catch(console.error);
  }, 5 * 60 * 1000);
}

/**
 * Get client identifier from request
 */
function getClientId(req: NextRequest): string {
  // Try to get user ID from auth
  const userId = req.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    req.ip ||
    'unknown';

  return `ip:${ip}`;
}

/**
 * Build rate limit key
 */
function buildRateLimitKey(clientId: string, type: RateLimitType): string {
  return `ratelimit:${type}:${clientId}`;
}

/**
 * Check rate limit using Vercel KV or memory fallback
 */
async function checkRateLimit(
  key: string,
  limit: typeof RATE_LIMITS[RateLimitType]
): Promise<RateLimitInfo> {
  const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

  if (!hasKV) {
    return memoryLimiter.check(key, limit);
  }

  try {
    const now = Date.now();
    const blockKey = `${key}:block`;

    // Check if client is blocked
    const blockedUntil = await kv.get<number>(blockKey);
    if (blockedUntil && blockedUntil > now) {
      return {
        count: limit.points + 1,
        resetAt: now + limit.duration * 1000,
        blockedUntil,
      };
    }

    // Increment counter using INCR (atomic operation)
    const count = await kv.incr(key);

    // Set expiration on first request
    if (count === 1) {
      await kv.expire(key, limit.duration);
    }

    // Get TTL for reset time
    const ttl = await kv.ttl(key);
    const resetAt = now + (ttl > 0 ? ttl * 1000 : limit.duration * 1000);

    // Check if limit exceeded
    if (count > limit.points) {
      const blockedUntilTime = now + limit.blockDuration * 1000;
      await kv.set(blockKey, blockedUntilTime, { ex: limit.blockDuration });

      return {
        count,
        resetAt,
        blockedUntil: blockedUntilTime,
      };
    }

    return {
      count,
      resetAt,
    };
  } catch (error) {
    console.error('[RateLimit] KV error, falling back to memory:', error);
    return memoryLimiter.check(key, limit);
  }
}

/**
 * Rate limit headers
 */
function addRateLimitHeaders(
  response: NextResponse,
  limit: typeof RATE_LIMITS[RateLimitType],
  info: RateLimitInfo
): void {
  const remaining = Math.max(0, limit.points - info.count);
  const resetSeconds = Math.ceil((info.resetAt - Date.now()) / 1000);

  response.headers.set('X-RateLimit-Limit', limit.points.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', info.resetAt.toString());

  if (info.blockedUntil) {
    const retryAfter = Math.ceil((info.blockedUntil - Date.now()) / 1000);
    response.headers.set('Retry-After', retryAfter.toString());
  }
}

/**
 * Rate limit middleware
 */
export async function rateLimit(
  req: NextRequest,
  type: RateLimitType = 'general'
): Promise<NextResponse | null> {
  // Skip rate limiting in development if configured
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true') {
    return null;
  }

  const clientId = getClientId(req);
  const key = buildRateLimitKey(clientId, type);
  const limit = RATE_LIMITS[type];

  const info = await checkRateLimit(key, limit);

  // Check if blocked
  if (info.blockedUntil && info.blockedUntil > Date.now()) {
    const response = NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((info.blockedUntil - Date.now()) / 1000),
      },
      { status: 429 }
    );

    addRateLimitHeaders(response, limit, info);
    return response;
  }

  // Check if limit exceeded
  if (info.count > limit.points) {
    const response = NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please slow down.',
        retryAfter: Math.ceil((info.resetAt - Date.now()) / 1000),
      },
      { status: 429 }
    );

    addRateLimitHeaders(response, limit, info);
    return response;
  }

  // Rate limit OK - return null to continue
  // Headers will be added by the withRateLimit wrapper
  return null;
}

/**
 * Higher-order function to wrap API routes with rate limiting
 */
export function withRateLimit(
  type: RateLimitType = 'general',
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Check rate limit
    const rateLimitResponse = await rateLimit(req, type);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Execute handler
    const response = await handler(req);

    // Add rate limit headers to successful response
    const clientId = getClientId(req);
    const key = buildRateLimitKey(clientId, type);
    const limit = RATE_LIMITS[type];
    const info = await checkRateLimit(key, limit);

    addRateLimitHeaders(response, limit, info);

    return response;
  };
}

/**
 * Manual rate limit check (for use in API route handlers)
 */
export async function checkApiRateLimit(
  req: NextRequest,
  type: RateLimitType = 'general'
): Promise<{
  allowed: boolean;
  response?: NextResponse;
  remaining: number;
  resetAt: number;
}> {
  const clientId = getClientId(req);
  const key = buildRateLimitKey(clientId, type);
  const limit = RATE_LIMITS[type];

  const info = await checkRateLimit(key, limit);
  const remaining = Math.max(0, limit.points - info.count);

  // Check if blocked
  if (info.blockedUntil && info.blockedUntil > Date.now()) {
    const response = NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((info.blockedUntil - Date.now()) / 1000),
      },
      { status: 429 }
    );

    addRateLimitHeaders(response, limit, info);

    return {
      allowed: false,
      response,
      remaining: 0,
      resetAt: info.resetAt,
    };
  }

  // Check if limit exceeded
  if (info.count > limit.points) {
    const response = NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please slow down.',
        retryAfter: Math.ceil((info.resetAt - Date.now()) / 1000),
      },
      { status: 429 }
    );

    addRateLimitHeaders(response, limit, info);

    return {
      allowed: false,
      response,
      remaining: 0,
      resetAt: info.resetAt,
    };
  }

  return {
    allowed: true,
    remaining,
    resetAt: info.resetAt,
  };
}

/**
 * Reset rate limit for a client (admin function)
 */
export async function resetRateLimit(clientId: string, type: RateLimitType): Promise<void> {
  const key = buildRateLimitKey(clientId, type);
  const blockKey = `${key}:block`;

  const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

  if (hasKV) {
    try {
      await kv.del(key);
      await kv.del(blockKey);
    } catch (error) {
      console.error('[RateLimit] Error resetting rate limit:', error);
    }
  }
}

/**
 * Get rate limit status for a client
 */
export async function getRateLimitStatus(
  clientId: string,
  type: RateLimitType
): Promise<{
  count: number;
  limit: number;
  remaining: number;
  resetAt: number;
  blocked: boolean;
}> {
  const key = buildRateLimitKey(clientId, type);
  const limit = RATE_LIMITS[type];
  const info = await checkRateLimit(key, limit);

  return {
    count: info.count,
    limit: limit.points,
    remaining: Math.max(0, limit.points - info.count),
    resetAt: info.resetAt,
    blocked: !!(info.blockedUntil && info.blockedUntil > Date.now()),
  };
}
