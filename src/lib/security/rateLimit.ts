/**
 * Rate Limiting Security Utilities
 * Provides comprehensive rate limiting to prevent abuse and DDoS attacks
 */

/**
 * Rate limit configuration interface
 */
export interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  max: number;            // Maximum requests per window
  message?: string;       // Error message when limit exceeded
  standardHeaders?: boolean; // Add rate limit info to response headers
  legacyHeaders?: boolean;   // Add legacy headers for compatibility
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean;     // Don't count failed requests
  keyGenerator?: (identifier: string, endpoint: string) => string;
}

/**
 * Rate limit result interface
 */
export interface RateLimitResult {
  allowed: boolean;
  totalRequests: number;
  remainingRequests: number;
  resetTime: Date;
  windowStart: Date;
  retryAfter?: number;
}

/**
 * Rate limit store interface for different storage backends
 */
export interface RateLimitStore {
  get(key: string): Promise<{ count: number; resetTime: number } | null>;
  set(key: string, value: { count: number; resetTime: number }, ttl: number): Promise<void>;
  increment(key: string, ttl: number): Promise<{ count: number; resetTime: number }>;
  reset(key: string): Promise<void>;
}

/**
 * In-memory rate limit store
 */
class MemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const data = this.store.get(key);
    
    if (!data) {
      return null;
    }

    // Clean up expired entries
    if (Date.now() > data.resetTime) {
      this.store.delete(key);
      return null;
    }

    return data;
  }

  async set(key: string, value: { count: number; resetTime: number }, ttl: number): Promise<void> {
    this.store.set(key, value);
    
    // Set cleanup timer
    setTimeout(() => {
      this.store.delete(key);
    }, ttl);
  }

  async increment(key: string, ttl: number): Promise<{ count: number; resetTime: number }> {
    const existing = await this.get(key);
    
    if (existing) {
      existing.count++;
      this.store.set(key, existing);
      return existing;
    }

    const newData = {
      count: 1,
      resetTime: Date.now() + ttl
    };

    await this.set(key, newData, ttl);
    return newData;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  // Cleanup method for maintenance
  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (now > data.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Redis rate limit store (for production use)
 */
class RedisRateLimitStore implements RateLimitStore {
  private client: any; // Redis client

  constructor(redisClient: any) {
    this.client = redisClient;
  }

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis rate limit get error:', error);
      return null;
    }
  }

  async set(key: string, value: { count: number; resetTime: number }, ttl: number): Promise<void> {
    try {
      await this.client.setex(key, Math.ceil(ttl / 1000), JSON.stringify(value));
    } catch (error) {
      console.error('Redis rate limit set error:', error);
    }
  }

  async increment(key: string, ttl: number): Promise<{ count: number; resetTime: number }> {
    try {
      const existing = await this.get(key);
      
      if (existing) {
        existing.count++;
        await this.set(key, existing, existing.resetTime - Date.now());
        return existing;
      }

      const newData = {
        count: 1,
        resetTime: Date.now() + ttl
      };

      await this.set(key, newData, ttl);
      return newData;
    } catch (error) {
      console.error('Redis rate limit increment error:', error);
      // Fallback to allow the request
      return { count: 1, resetTime: Date.now() + ttl };
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis rate limit reset error:', error);
    }
  }
}

/**
 * Rate Limiter Class
 */
export class RateLimiter {
  private store: RateLimitStore;
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig, store?: RateLimitStore) {
    this.config = {
      windowMs: config.windowMs,
      max: config.max,
      message: config.message || 'Too many requests, please try again later.',
      standardHeaders: config.standardHeaders ?? true,
      legacyHeaders: config.legacyHeaders ?? false,
      skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
      skipFailedRequests: config.skipFailedRequests ?? false,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator
    };

    this.store = store || new MemoryRateLimitStore();
  }

  private defaultKeyGenerator(identifier: string, endpoint: string): string {
    return `ratelimit:${identifier}:${endpoint}`;
  }

  async checkLimit(
    identifier: string,
    endpoint: string = 'default'
  ): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(identifier, endpoint);
    const windowStart = new Date(Date.now() - (Date.now() % this.config.windowMs));
    
    try {
      const current = await this.store.increment(key, this.config.windowMs);
      const remainingRequests = Math.max(0, this.config.max - current.count);
      const allowed = current.count <= this.config.max;

      return {
        allowed,
        totalRequests: current.count,
        remainingRequests,
        resetTime: new Date(current.resetTime),
        windowStart,
        retryAfter: allowed ? undefined : Math.ceil((current.resetTime - Date.now()) / 1000)
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      
      // On error, allow the request but log the issue
      return {
        allowed: true,
        totalRequests: 0,
        remainingRequests: this.config.max,
        resetTime: new Date(Date.now() + this.config.windowMs),
        windowStart
      };
    }
  }

  async resetLimit(identifier: string, endpoint: string = 'default'): Promise<void> {
    const key = this.config.keyGenerator(identifier, endpoint);
    await this.store.reset(key);
  }

  getHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.standardHeaders) {
      headers['RateLimit-Limit'] = this.config.max.toString();
      headers['RateLimit-Remaining'] = result.remainingRequests.toString();
      headers['RateLimit-Reset'] = new Date(result.resetTime).toISOString();
    }

    if (this.config.legacyHeaders) {
      headers['X-RateLimit-Limit'] = this.config.max.toString();
      headers['X-RateLimit-Remaining'] = result.remainingRequests.toString();
      headers['X-RateLimit-Reset'] = Math.ceil(result.resetTime.getTime() / 1000).toString();
    }

    if (!result.allowed && result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
  }
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitConfigs = {
  // General API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many API requests, please try again later.'
  },

  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many authentication attempts, please try again later.'
  },

  // File upload endpoints
  upload: {
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Too many upload attempts, please try again later.'
  },

  // Search endpoints
  search: {
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    message: 'Too many search requests, please try again later.'
  },

  // Password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many password reset attempts, please try again later.'
  },

  // Email sending
  email: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many email requests, please try again later.'
  },

  // Registration
  registration: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many registration attempts, please try again later.'
  },

  // Strict rate limiting for sensitive operations
  strict: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1,
    message: 'This action can only be performed once per hour.'
  }
};

/**
 * Rate Limit Manager
 * Manages multiple rate limiters for different endpoints
 */
export class RateLimitManager {
  private limiters: Map<string, RateLimiter> = new Map();
  private store: RateLimitStore;

  constructor(store?: RateLimitStore) {
    this.store = store || new MemoryRateLimitStore();
  }

  addLimiter(name: string, config: RateLimitConfig): void {
    this.limiters.set(name, new RateLimiter(config, this.store));
  }

  async checkLimit(
    limiterName: string,
    identifier: string,
    endpoint?: string
  ): Promise<RateLimitResult> {
    const limiter = this.limiters.get(limiterName);
    
    if (!limiter) {
      throw new Error(`Rate limiter '${limiterName}' not found`);
    }

    return limiter.checkLimit(identifier, endpoint);
  }

  async resetLimit(
    limiterName: string,
    identifier: string,
    endpoint?: string
  ): Promise<void> {
    const limiter = this.limiters.get(limiterName);
    
    if (!limiter) {
      throw new Error(`Rate limiter '${limiterName}' not found`);
    }

    return limiter.resetLimit(identifier, endpoint);
  }

  getLimiter(name: string): RateLimiter | undefined {
    return this.limiters.get(name);
  }
}

/**
 * Express middleware factory for rate limiting
 */
export function createRateLimitMiddleware(
  config: RateLimitConfig,
  options: {
    keyGenerator?: (req: any) => string;
    skip?: (req: any) => boolean;
    onLimitReached?: (req: any, res: any) => void;
  } = {}
) {
  const limiter = new RateLimiter(config);

  return async (req: any, res: any, next: any) => {
    try {
      // Skip if condition is met
      if (options.skip && options.skip(req)) {
        return next();
      }

      // Generate identifier
      const identifier = options.keyGenerator 
        ? options.keyGenerator(req) 
        : req.ip || req.connection?.remoteAddress || 'unknown';

      const result = await limiter.checkLimit(identifier, req.route?.path || req.url);

      // Add headers
      const headers = limiter.getHeaders(result);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      if (!result.allowed) {
        if (options.onLimitReached) {
          options.onLimitReached(req, res);
        }

        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: config.message || 'Too many requests, please try again later.',
          retryAfter: result.retryAfter
        });
      }

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // On error, allow the request to continue
      next();
    }
  };
}

/**
 * Utility function to get client IP address
 */
export function getClientIp(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

/**
 * Utility function to get user identifier for rate limiting
 */
export function getUserIdentifier(req: any): string {
  // Priority order: user ID, session ID, IP address
  return req.user?.id ||
         req.session?.id ||
         req.headers['x-session-id'] ||
         getClientIp(req);
}

// Create default rate limit manager with common configurations
export const defaultRateLimitManager = new RateLimitManager();

// Add common rate limiters
Object.entries(RateLimitConfigs).forEach(([name, config]) => {
  defaultRateLimitManager.addLimiter(name, config);
});

export default RateLimiter;