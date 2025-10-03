/**
 * Redis-based rate limiting with sliding window algorithm
 * Supports per-API-key and distributed rate limiting
 */

import Redis from 'ioredis';
import { recordRateLimitHit } from '../monitoring/prometheus';
import { logger } from '@/lib/logger';

export interface RateLimitConfig {
  windowSizeMs: number;
  maxRequests: number;
  keyPrefix?: string;
  blockDurationMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTimeMs: number;
  totalRequests: number;
  retryAfterMs?: number;
}

export class RedisRateLimiter {
  private redis: Redis;
  private defaultConfig: RateLimitConfig;

  constructor(redisConfig?: any, defaultConfig?: Partial<RateLimitConfig>) {
    this.redis = new Redis(redisConfig || {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
    });

    this.defaultConfig = {
      windowSizeMs: 60 * 1000, // 1 minute
      maxRequests: 60,
      keyPrefix: 'rate_limit',
      blockDurationMs: 0,
      ...defaultConfig
    };
  }

  /**
   * Check rate limit using sliding window log algorithm
   */
  async checkRateLimit(
    identifier: string,
    config?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const key = `${finalConfig.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - finalConfig.windowSizeMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, '-inf', windowStart);
      
      // Count current requests in window
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiration
      pipeline.expire(key, Math.ceil(finalConfig.windowSizeMs / 1000));
      
      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Redis pipeline failed');
      }

      const currentCount = (results[1][1] as number) || 0;
      const totalRequests = currentCount + 1;
      const remainingRequests = Math.max(0, finalConfig.maxRequests - totalRequests);
      const allowed = totalRequests <= finalConfig.maxRequests;
      
      const resetTimeMs = now + finalConfig.windowSizeMs;
      let retryAfterMs: number | undefined;

      if (!allowed) {
        // Remove the request we just added since it's not allowed
        await this.redis.zrem(key, `${now}-${Math.random()}`);
        
        if (finalConfig.blockDurationMs && finalConfig.blockDurationMs > 0) {
          retryAfterMs = finalConfig.blockDurationMs;
          await this.redis.setex(`${key}:blocked`, Math.ceil(finalConfig.blockDurationMs / 1000), '1');
        }
        
        // Record rate limit hit in metrics
        recordRateLimitHit(
          this.hashIdentifier(identifier),
          this.getWindowType(finalConfig.windowSizeMs),
          remainingRequests
        );
      }

      return {
        allowed,
        remainingRequests,
        resetTimeMs,
        totalRequests: allowed ? totalRequests : currentCount,
        retryAfterMs
      };
    } catch (error) {
      logger.error('Redis rate limit check failed:', error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remainingRequests: finalConfig.maxRequests,
        resetTimeMs: now + finalConfig.windowSizeMs,
        totalRequests: 0
      };
    }
  }

  /**
   * Check if identifier is currently blocked
   */
  async isBlocked(identifier: string): Promise<boolean> {
    try {
      const key = `${this.defaultConfig.keyPrefix}:${identifier}:blocked`;
      const blocked = await this.redis.get(key);
      return blocked === '1';
    } catch (error) {
      logger.error('Redis block check failed:', error);
      return false;
    }
  }

  /**
   * Manually block an identifier
   */
  async blockIdentifier(identifier: string, durationMs: number): Promise<void> {
    try {
      const key = `${this.defaultConfig.keyPrefix}:${identifier}:blocked`;
      await this.redis.setex(key, Math.ceil(durationMs / 1000), '1');
    } catch (error) {
      logger.error('Redis manual block failed:', error);
    }
  }

  /**
   * Unblock an identifier
   */
  async unblockIdentifier(identifier: string): Promise<void> {
    try {
      const key = `${this.defaultConfig.keyPrefix}:${identifier}:blocked`;
      await this.redis.del(key);
    } catch (error) {
      logger.error('Redis unblock failed:', error);
    }
  }

  /**
   * Get current usage for an identifier
   */
  async getCurrentUsage(identifier: string, windowSizeMs?: number): Promise<number> {
    try {
      const key = `${this.defaultConfig.keyPrefix}:${identifier}`;
      const now = Date.now();
      const windowStart = now - (windowSizeMs || this.defaultConfig.windowSizeMs);
      
      await this.redis.zremrangebyscore(key, '-inf', windowStart);
      return await this.redis.zcard(key);
    } catch (error) {
      logger.error('Redis usage check failed:', error);
      return 0;
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  async resetRateLimit(identifier: string): Promise<void> {
    try {
      const key = `${this.defaultConfig.keyPrefix}:${identifier}`;
      await this.redis.del(key);
    } catch (error) {
      logger.error('Redis reset failed:', error);
    }
  }

  /**
   * Get rate limit info without consuming quota
   */
  async getRateLimitInfo(
    identifier: string,
    config?: Partial<RateLimitConfig>
  ): Promise<Omit<RateLimitResult, 'allowed'>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const key = `${finalConfig.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - finalConfig.windowSizeMs;

    try {
      await this.redis.zremrangebyscore(key, '-inf', windowStart);
      const currentCount = await this.redis.zcard(key);
      const remainingRequests = Math.max(0, finalConfig.maxRequests - currentCount);
      const resetTimeMs = now + finalConfig.windowSizeMs;

      return {
        remainingRequests,
        resetTimeMs,
        totalRequests: currentCount
      };
    } catch (error) {
      logger.error('Redis info check failed:', error);
      return {
        remainingRequests: finalConfig.maxRequests,
        resetTimeMs: now + finalConfig.windowSizeMs,
        totalRequests: 0
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Hash identifier for privacy
   */
  private hashIdentifier(identifier: string): string {
    // Simple hash for metrics - could use crypto.createHash for stronger privacy
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get window type for metrics
   */
  private getWindowType(windowSizeMs: number): string {
    if (windowSizeMs <= 60 * 1000) return 'per_minute';
    if (windowSizeMs <= 60 * 60 * 1000) return 'per_hour';
    if (windowSizeMs <= 24 * 60 * 60 * 1000) return 'per_day';
    return 'custom';
  }
}

/**
 * Multi-tier rate limiting for different limits
 */
export class MultiTierRateLimiter {
  private limiter: RedisRateLimiter;
  private tiers: Array<{ name: string; config: RateLimitConfig }>;

  constructor(redisConfig?: any, tiers?: Array<{ name: string; config: RateLimitConfig }>) {
    this.limiter = new RedisRateLimiter(redisConfig);
    this.tiers = tiers || [
      {
        name: 'per_minute',
        config: { windowSizeMs: 60 * 1000, maxRequests: 60, keyPrefix: 'rate_limit_1m' }
      },
      {
        name: 'per_hour',
        config: { windowSizeMs: 60 * 60 * 1000, maxRequests: 1000, keyPrefix: 'rate_limit_1h' }
      },
      {
        name: 'per_day',
        config: { windowSizeMs: 24 * 60 * 60 * 1000, maxRequests: 10000, keyPrefix: 'rate_limit_1d' }
      }
    ];
  }

  /**
   * Check all rate limit tiers
   */
  async checkAllTiers(identifier: string): Promise<RateLimitResult> {
    const results = await Promise.all(
      this.tiers.map(tier => 
        this.limiter.checkRateLimit(identifier, tier.config)
      )
    );

    // If any tier is exceeded, deny the request
    const deniedResult = results.find(result => !result.allowed);
    if (deniedResult) {
      return deniedResult;
    }

    // Return the most restrictive allowed result
    return results.reduce((mostRestrictive, current) => 
      current.remainingRequests < mostRestrictive.remainingRequests 
        ? current 
        : mostRestrictive
    );
  }

  /**
   * Get info for all tiers
   */
  async getAllTiersInfo(identifier: string): Promise<Array<{ name: string; info: any }>> {
    const results = await Promise.all(
      this.tiers.map(async tier => ({
        name: tier.name,
        info: await this.limiter.getRateLimitInfo(identifier, tier.config)
      }))
    );

    return results;
  }

  async close(): Promise<void> {
    await this.limiter.close();
  }
}

/**
 * Express.js middleware for rate limiting
 */
export function rateLimitMiddleware(
  limiter: RedisRateLimiter | MultiTierRateLimiter,
  options: {
    keyGenerator?: (req: any) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    onLimitReached?: (req: any, res: any, result: RateLimitResult) => void;
  } = {}
) {
  return async (req: any, res: any, next: Function) => {
    try {
      const identifier = options.keyGenerator 
        ? options.keyGenerator(req)
        : req.ip || req.connection.remoteAddress || 'unknown';

      const result = limiter instanceof MultiTierRateLimiter
        ? await limiter.checkAllTiers(identifier)
        : await limiter.checkRateLimit(identifier);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Remaining': result.remainingRequests.toString(),
        'X-RateLimit-Reset': new Date(result.resetTimeMs).toISOString(),
        'X-RateLimit-Total': result.totalRequests.toString()
      });

      if (!result.allowed) {
        if (result.retryAfterMs) {
          res.set('Retry-After', Math.ceil(result.retryAfterMs / 1000).toString());
        }

        if (options.onLimitReached) {
          options.onLimitReached(req, res, result);
        }

        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests, please try again later',
          retryAfter: result.retryAfterMs
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limiting middleware error:', error);
      // Fail open - continue if rate limiting fails
      next();
    }
  };
}

export default RedisRateLimiter;