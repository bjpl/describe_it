/**
 * Rate Limiting Security Module
 * Implements comprehensive rate limiting for API endpoints
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
  blocked: boolean;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs: number;
  keyGenerator?: (identifier: string) => string;
}

export class SecurityRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private configs = new Map<string, RateLimitConfig>();
  
  constructor() {
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  // Register rate limit configuration for endpoint
  configure(endpoint: string, config: RateLimitConfig) {
    this.configs.set(endpoint, {
      keyGenerator: (identifier) => `${endpoint}:${identifier}`,
      ...config
    });
  }

  // Check if request should be rate limited
  async isRateLimited(endpoint: string, identifier: string): Promise<{
    limited: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const config = this.configs.get(endpoint);
    if (!config) {
      // No rate limit configured - allow request
      return { limited: false, remaining: Infinity, resetTime: 0 };
    }

    const key = config.keyGenerator!(identifier);
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || (now - entry.windowStart) >= config.windowMs) {
      // New window or expired entry
      this.store.set(key, {
        count: 1,
        windowStart: now,
        blocked: false
      });
      
      return {
        limited: false,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      };
    }

    // Check if currently blocked
    if (entry.blocked && (now - entry.windowStart) < config.blockDurationMs) {
      return {
        limited: true,
        remaining: 0,
        resetTime: entry.windowStart + config.blockDurationMs,
        retryAfter: Math.ceil((entry.windowStart + config.blockDurationMs - now) / 1000)
      };
    }

    // Increment counter
    entry.count++;

    if (entry.count > config.maxRequests) {
      // Rate limit exceeded - block future requests
      entry.blocked = true;
      entry.windowStart = now; // Reset window start for block duration
      
      return {
        limited: true,
        remaining: 0,
        resetTime: now + config.blockDurationMs,
        retryAfter: Math.ceil(config.blockDurationMs / 1000)
      };
    }

    return {
      limited: false,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.windowStart + config.windowMs
    };
  }

  // Cleanup expired entries
  private cleanup() {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      // Find config for this key to get appropriate timeout
      const endpoint = key.split(':')[0];
      const config = this.configs.get(endpoint);
      const timeout = config ? Math.max(config.windowMs, config.blockDurationMs) : 60000;
      
      if ((now - entry.windowStart) > timeout) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.store.delete(key));
  }

  // Get current statistics
  getStats() {
    return {
      totalKeys: this.store.size,
      blockedKeys: Array.from(this.store.values()).filter(e => e.blocked).length,
      configurations: Array.from(this.configs.keys())
    };
  }
}

// Create singleton instance
export const rateLimiter = new SecurityRateLimiter();

// Configure rate limits for different endpoint types
rateLimiter.configure('debug', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 requests per 15 minutes
  blockDurationMs: 60 * 60 * 1000 // 1 hour block
});

rateLimiter.configure('error-report', {
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10, // 10 error reports per 5 minutes
  blockDurationMs: 15 * 60 * 1000 // 15 minute block
});

rateLimiter.configure('api-general', {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  blockDurationMs: 5 * 60 * 1000 // 5 minute block
});