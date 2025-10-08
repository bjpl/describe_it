import { logger } from '@/lib/logger';
import {
  RateLimiter,
  getRateLimiter,
  ExponentialBackoff,
  RateLimitConfigs,
} from './rate-limiter';
import {
  withRateLimit,
  withRateLimitStatus,
  checkRateLimitStatus,
  RateLimitMiddleware,
} from './middleware';

/**
 * Rate Limiting Module
 *
 * Comprehensive rate limiting system for the Describe-It application
 * with Redis-backed sliding window algorithm and memory fallback.
 *
 * Features:
 * - Sliding window rate limiting algorithm
 * - Redis-based distributed rate limiting with memory fallback
 * - Tier-based rate limits (free vs paid users)
 * - Exponential backoff for repeated violations
 * - Admin bypass functionality
 * - Comprehensive error responses with proper HTTP headers
 * - Multiple predefined configurations for different endpoint types
 */

// Re-export core rate limiting classes and functions
export {
  RateLimiter,
  getRateLimiter,
  ExponentialBackoff,
  RateLimitConfigs,
};

// Re-export middleware and utilities
export {
  withRateLimit,
  withRateLimitStatus,
  checkRateLimitStatus,
  RateLimitMiddleware,
};

// Types and interfaces
export type {
  RateLimitConfig,
  RateLimitResult,
} from './rate-limiter';

export type {
  RateLimitMiddlewareOptions,
  RateLimitErrorResponse,
} from './middleware';

/**
 * Quick setup utilities for common scenarios
 */
export const QuickSetup = {
  /**
   * Apply rate limiting to authentication endpoints
   */
  forAuth: RateLimitMiddleware.auth,

  /**
   * Apply rate limiting to description generation (auto-detects tier)
   */
  forDescriptions: (handler: any, userTier?: 'free' | 'paid') => {
    return RateLimitMiddleware.description(handler, userTier === 'paid');
  },

  /**
   * Apply general rate limiting to API endpoints
   */
  forAPI: RateLimitMiddleware.general,

  /**
   * Apply strict rate limiting to sensitive operations
   */
  forSensitive: RateLimitMiddleware.strict,

  /**
   * Apply burst protection
   */
  forBurst: RateLimitMiddleware.burst,
} as const;

/**
 * Configuration presets for different application tiers
 */
export const TierConfigs = {
  free: {
    descriptions: RateLimitConfigs.descriptionFree,
    api: RateLimitConfigs.general,
    auth: RateLimitConfigs.auth,
  },
  paid: {
    descriptions: RateLimitConfigs.descriptionPaid,
    api: { ...RateLimitConfigs.general, maxRequests: 500 }, // Higher limit for paid
    auth: RateLimitConfigs.auth,
  },
  enterprise: {
    descriptions: { ...RateLimitConfigs.descriptionPaid, maxRequests: 1000 },
    api: { ...RateLimitConfigs.general, maxRequests: 2000 },
    auth: { ...RateLimitConfigs.auth, maxRequests: 20 },
  },
} as const;

/**
 * Rate limiting constants
 */
export const RateLimit = {
  // Common time windows
  WINDOWS: {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
  },

  // HTTP status codes
  STATUS_CODES: {
    TOO_MANY_REQUESTS: 429,
    OK: 200,
    BAD_REQUEST: 400,
  },

  // Header names
  HEADERS: {
    LIMIT: 'X-RateLimit-Limit',
    REMAINING: 'X-RateLimit-Remaining',
    RESET: 'X-RateLimit-Reset',
    RETRY_AFTER: 'Retry-After',
  },
} as const;

/**
 * Development utilities
 */
export const DevUtils = {
  /**
   * Create a rate limiter that always allows requests (for testing)
   */
  createMockRateLimiter: () => ({
    checkRateLimit: async () => ({
      success: true,
      limit: 1000,
      remaining: 999,
      resetTime: new Date(Date.now() + 60000),
    }),
    getRateLimitStatus: async () => ({
      success: true,
      limit: 1000,
      remaining: 999,
      resetTime: new Date(Date.now() + 60000),
    }),
    resetRateLimit: async () => true,
    getStats: async () => ({
      redisAvailable: false,
      memoryEntries: 0,
      uptime: process.uptime(),
    }),
    destroy: async () => {},
  }),

  /**
   * Bypass rate limiting for development
   */
  bypassMiddleware: (handler: any) => handler,

  /**
   * Log rate limiting statistics
   */
  logStats: async () => {
    const rateLimiter = getRateLimiter();
    const stats = await rateLimiter.getStats();
    logger.info('[Rate Limit] Statistics:', stats);
    return stats;
  },
} as const;