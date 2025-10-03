import { Redis } from 'ioredis';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Rate limiting configuration for different endpoint types
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
  onLimitReached?: (req: NextRequest) => void;
}

/**
 * Rate limit result interface
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

/**
 * Memory-based cache for fallback when Redis is unavailable
 */
class MemoryRateLimitCache {
  private cache = new Map<string, { requests: Array<{ timestamp: number; success: boolean }> }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.cache.entries()) {
      // Remove requests older than 1 hour
      data.requests = data.requests.filter(req => now - req.timestamp < 60 * 60 * 1000);
      if (data.requests.length === 0) {
        this.cache.delete(key);
      }
    }
  }

  addRequest(key: string, timestamp: number, success: boolean = true): void {
    if (!this.cache.has(key)) {
      this.cache.set(key, { requests: [] });
    }
    
    const entry = this.cache.get(key)!;
    entry.requests.push({ timestamp, success });
  }

  getRequestCount(key: string, windowMs: number, skipSuccessfulRequests?: boolean, skipFailedRequests?: boolean): number {
    const entry = this.cache.get(key);
    if (!entry) return 0;

    const now = Date.now();
    const cutoff = now - windowMs;

    return entry.requests.filter(req => {
      if (req.timestamp < cutoff) return false;
      if (skipSuccessfulRequests && req.success) return false;
      if (skipFailedRequests && !req.success) return false;
      return true;
    }).length;
  }

  clear(): void {
    this.cache.clear();
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

/**
 * Comprehensive rate limiter using sliding window algorithm
 */
export class RateLimiter {
  private redis: Redis | null = null;
  private memoryCache: MemoryRateLimitCache;
  private redisAvailable = false;
  private keyPrefix = 'rate_limit:';

  constructor() {
    this.memoryCache = new MemoryRateLimitCache();
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      // Try to connect to Redis if available
      if (process.env.REDIS_HOST || process.env.REDIS_URL) {
        this.redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '1'), // Use DB 1 for rate limiting
          keyPrefix: this.keyPrefix,
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
          enableOfflineQueue: false,
          lazyConnect: true,
          connectTimeout: 5000,
          commandTimeout: 3000,
        });

        this.redis.on('connect', () => {
          logger.info('[Rate Limiter] Redis connected');
          this.redisAvailable = true;
        });

        this.redis.on('error', (error) => {
          logger.warn('[Rate Limiter] Redis error, falling back to memory:', error.message);
          this.redisAvailable = false;
        });

        this.redis.on('close', () => {
          logger.warn('[Rate Limiter] Redis connection closed, using memory fallback');
          this.redisAvailable = false;
        });

        // Test connection
        await this.redis.ping();
        this.redisAvailable = true;
      } else {
        logger.info('[Rate Limiter] No Redis configuration found, using memory-only mode');
      }
    } catch (error) {
      logger.warn('[Rate Limiter] Failed to connect to Redis, using memory fallback:', error);
      this.redisAvailable = false;
      this.redis = null;
    }
  }

  /**
   * Generate a unique key for rate limiting
   */
  private generateKey(identifier: string, config: RateLimitConfig): string {
    return `${identifier}:${config.windowMs}:${config.maxRequests}`;
  }

  /**
   * Default key generator using IP address and user ID
   */
  private defaultKeyGenerator(req: NextRequest): string {
    // Try to get user ID from various sources
    const userId = req.headers.get('x-user-id') || 
                  req.headers.get('authorization')?.split(' ')[1] || 
                  'anonymous';
    
    // Get IP address from various headers
    const ip = req.headers.get('x-forwarded-for') || 
              req.headers.get('x-real-ip') || 
              req.ip || 
              'unknown';
    
    return `${userId}:${ip}`;
  }

  /**
   * Check if a request should be rate limited using sliding window algorithm
   */
  async checkRateLimit(req: NextRequest, config: RateLimitConfig): Promise<RateLimitResult> {
    const identifier = (config.keyGenerator || this.defaultKeyGenerator)(req);
    const key = this.generateKey(identifier, config);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      let currentCount: number;

      if (this.redisAvailable && this.redis) {
        // Use Redis sliding window
        const multi = this.redis.multi();
        
        // Remove expired entries
        multi.zremrangebyscore(key, '-inf', windowStart);
        
        // Add current request
        multi.zadd(key, now, `${now}-${Math.random()}`);
        
        // Count requests in current window
        multi.zcard(key);
        
        // Set expiration
        multi.expire(key, Math.ceil(config.windowMs / 1000) + 60);
        
        const results = await multi.exec();
        
        if (!results || results.some(([err]) => err)) {
          throw new Error('Redis transaction failed');
        }
        
        currentCount = results[2][1] as number;
      } else {
        // Use memory fallback
        this.memoryCache.addRequest(key, now);
        currentCount = this.memoryCache.getRequestCount(
          key, 
          config.windowMs,
          config.skipSuccessfulRequests,
          config.skipFailedRequests
        );
      }

      const isLimited = currentCount > config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - currentCount);
      const resetTime = new Date(now + config.windowMs);

      if (isLimited) {
        // Calculate retry after in seconds
        const retryAfter = Math.ceil(config.windowMs / 1000);
        
        // Call rate limit callback if provided
        if (config.onLimitReached) {
          config.onLimitReached(req);
        }

        return {
          success: false,
          limit: config.maxRequests,
          remaining: 0,
          resetTime,
          retryAfter,
        };
      }

      return {
        success: true,
        limit: config.maxRequests,
        remaining: remaining - 1, // Subtract 1 for current request
        resetTime,
      };

    } catch (error) {
      logger.error('[Rate Limiter] Error checking rate limit:', error);
      
      // On error, allow the request but log the issue
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime: new Date(now + config.windowMs),
      };
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getRateLimitStatus(req: NextRequest, config: RateLimitConfig): Promise<RateLimitResult> {
    const identifier = (config.keyGenerator || this.defaultKeyGenerator)(req);
    const key = this.generateKey(identifier, config);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      let currentCount: number;

      if (this.redisAvailable && this.redis) {
        // Count current requests in Redis
        await this.redis.zremrangebyscore(key, '-inf', windowStart);
        currentCount = await this.redis.zcard(key);
      } else {
        // Count current requests in memory
        currentCount = this.memoryCache.getRequestCount(
          key,
          config.windowMs,
          config.skipSuccessfulRequests,
          config.skipFailedRequests
        );
      }

      const remaining = Math.max(0, config.maxRequests - currentCount);
      const resetTime = new Date(now + config.windowMs);

      return {
        success: currentCount < config.maxRequests,
        limit: config.maxRequests,
        remaining,
        resetTime,
      };

    } catch (error) {
      logger.error('[Rate Limiter] Error getting rate limit status:', error);
      
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: new Date(now + config.windowMs),
      };
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async resetRateLimit(req: NextRequest, config: RateLimitConfig): Promise<boolean> {
    const identifier = (config.keyGenerator || this.defaultKeyGenerator)(req);
    const key = this.generateKey(identifier, config);

    try {
      if (this.redisAvailable && this.redis) {
        await this.redis.del(key);
      } else {
        // Clear from memory cache - simplified approach
        this.memoryCache.clear();
      }
      
      return true;
    } catch (error) {
      logger.error('[Rate Limiter] Error resetting rate limit:', error);
      return false;
    }
  }

  /**
   * Get rate limiter statistics
   */
  async getStats(): Promise<{
    redisAvailable: boolean;
    memoryEntries: number;
    uptime: number;
  }> {
    return {
      redisAvailable: this.redisAvailable,
      memoryEntries: this.memoryCache['cache'].size,
      uptime: process.uptime(),
    };
  }

  /**
   * Cleanup and disconnect
   */
  async destroy(): Promise<void> {
    this.memoryCache.destroy();
    
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

/**
 * Predefined rate limiting configurations for different endpoint types
 */
export const RateLimitConfigs = {
  // Authentication endpoints: 5 attempts per 15 minutes
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // API description generation: tier-based limits
  descriptionFree: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
  },

  descriptionPaid: {
    windowMs: 60 * 1000, // 1 minute  
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
  },

  // General API endpoints: 100 requests per minute
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
  },

  // Strict rate limiting for sensitive operations
  strict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // Burst protection: Very short window, high limit
  burst: {
    windowMs: 10 * 1000, // 10 seconds
    maxRequests: 20,
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
  },
} as const;

// Singleton rate limiter instance
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Exponential backoff calculator for repeated violations
 */
export class ExponentialBackoff {
  private static violations = new Map<string, { count: number; lastViolation: number }>();

  static calculateBackoff(identifier: string, baseWindowMs: number): number {
    const violation = this.violations.get(identifier);
    const now = Date.now();
    
    if (!violation || now - violation.lastViolation > baseWindowMs * 10) {
      // Reset if no recent violations
      this.violations.set(identifier, { count: 1, lastViolation: now });
      return baseWindowMs;
    }

    // Increment violation count and calculate exponential backoff
    violation.count += 1;
    violation.lastViolation = now;
    this.violations.set(identifier, violation);

    // Exponential backoff: 2^violations * baseWindow, max 1 hour
    const backoff = Math.min(
      baseWindowMs * Math.pow(2, violation.count - 1),
      60 * 60 * 1000 // Max 1 hour
    );

    return backoff;
  }

  static resetViolations(identifier: string): void {
    this.violations.delete(identifier);
  }

  static getViolationCount(identifier: string): number {
    const violation = this.violations.get(identifier);
    return violation?.count || 0;
  }
}