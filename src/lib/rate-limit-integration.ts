/**
 * Rate Limiting Integration Examples
 * Shows how to integrate rate limiting with existing API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, withRateLimit, resetRateLimit, getRateLimitStatus } from '@/middleware/rate-limit';

/**
 * Example 1: Apply rate limiting to description generation
 * Usage in /api/descriptions/generate/route.ts
 */
export async function applyDescriptionRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const result = await checkApiRateLimit(req, 'description');

  if (!result.allowed) {
    return result.response!;
  }

  return null;
}

/**
 * Example 2: Apply rate limiting to vocabulary save
 * Usage in /api/vocabulary/save/route.ts
 */
export async function applyVocabularyRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const result = await checkApiRateLimit(req, 'vocabulary');

  if (!result.allowed) {
    return result.response!;
  }

  return null;
}

/**
 * Example 3: Apply rate limiting to auth endpoints
 * Usage in /api/auth/[endpoint]/route.ts
 */
export async function applyAuthRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const result = await checkApiRateLimit(req, 'auth');

  if (!result.allowed) {
    return result.response!;
  }

  return null;
}

/**
 * Example 4: Wrapper function for easy integration
 * Wraps any API handler with rate limiting
 */
export function withDescriptionRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return withRateLimit('description', handler);
}

export function withVocabularyRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return withRateLimit('vocabulary', handler);
}

export function withAuthRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return withRateLimit('auth', handler);
}

/**
 * Example 5: Admin function to reset rate limits
 * Useful for testing or customer support
 */
export async function adminResetUserRateLimit(userId: string) {
  const clientId = `user:${userId}`;

  await Promise.all([
    resetRateLimit(clientId, 'description'),
    resetRateLimit(clientId, 'vocabulary'),
    resetRateLimit(clientId, 'general'),
  ]);
}

/**
 * Example 6: Get rate limit status for monitoring
 * Can be used in admin dashboards or user profiles
 */
export async function getUserRateLimitStatus(userId: string) {
  const clientId = `user:${userId}`;

  const [description, vocabulary, general] = await Promise.all([
    getRateLimitStatus(clientId, 'description'),
    getRateLimitStatus(clientId, 'vocabulary'),
    getRateLimitStatus(clientId, 'general'),
  ]);

  return {
    description,
    vocabulary,
    general,
  };
}

/**
 * Example 7: Rate limit check with custom response
 * Returns both status and a custom error if blocked
 */
export async function checkRateLimitWithCustomResponse(
  req: NextRequest,
  type: 'description' | 'vocabulary' | 'general' | 'auth'
): Promise<{ allowed: boolean; response?: NextResponse; info?: { remaining: number; resetAt: number } }> {
  const result = await checkApiRateLimit(req, type);

  if (!result.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: 'You have made too many requests. Please try again later.',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: result.response?.headers
        }
      ),
    };
  }

  return {
    allowed: true,
    info: {
      remaining: result.remaining,
      resetAt: result.resetAt,
    },
  };
}

/**
 * Example 8: Conditional rate limiting based on user tier
 * Free users get stricter limits, paid users get relaxed limits
 */
export async function applyTieredRateLimit(
  req: NextRequest,
  userTier: 'free' | 'pro' | 'enterprise',
  endpoint: 'description' | 'vocabulary' | 'general'
): Promise<NextResponse | null> {
  // Skip rate limiting for enterprise users
  if (userTier === 'enterprise') {
    return null;
  }

  // Pro users get double the limits (implement by checking half as often)
  if (userTier === 'pro') {
    // For pro users, we could implement a separate rate limit tier
    // For now, just apply standard rate limiting
  }

  return applyDescriptionRateLimit(req);
}
