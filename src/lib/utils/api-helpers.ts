import { NextRequest } from "next/server";
import { descriptionCache } from "@/lib/cache/tiered-cache";
import { performanceLogger, createLogger } from "@/lib/logger";

const apiHelperLogger = createLogger('APIHelpers');

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Default rate limit configurations for different endpoint types
export const RATE_LIMITS = {
  // Conservative limits for resource-intensive operations
  AI_GENERATION: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  },

  // Moderate limits for data operations
  DATA_OPERATIONS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  },

  // Generous limits for read operations
  READ_OPERATIONS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },

  // Strict limits for heavy operations
  EXPORT_OPERATIONS: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5, // 5 requests per 5 minutes
  },
} as const;

// Rate limiter class
export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req) => this.getClientIdentifier(req),
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };
  }

  async checkLimit(request: NextRequest): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalRequests: number;
  }> {
    const key = this.config.keyGenerator!(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Create rate limit key
    const rateLimitKey = `rate_limit:${key}:${Math.floor(now / this.config.windowMs)}`;

    try {
      // Get current count from cache
      let requestCount = (await descriptionCache.get(rateLimitKey)) || 0;

      // Increment count
      requestCount++;

      // Store updated count with TTL
      await descriptionCache.set(rateLimitKey, requestCount, {
        kvTTL: Math.ceil(this.config.windowMs / 1000),
        memoryTTL: Math.ceil(this.config.windowMs / 1000),
        sessionTTL: Math.ceil(this.config.windowMs / 1000),
      });

      const allowed = requestCount <= this.config.maxRequests;
      const remaining = Math.max(0, this.config.maxRequests - requestCount);
      const resetTime =
        Math.floor(now / this.config.windowMs) * this.config.windowMs +
        this.config.windowMs;

      return {
        allowed,
        remaining,
        resetTime,
        totalRequests: requestCount,
      };
    } catch (error) {
      const errorDetails = error instanceof Error ? { error } : { error: String(error) };
      apiHelperLogger.warn('Rate limiting check failed', errorDetails);
      // Allow request if rate limiting check fails
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
        totalRequests: 1,
      };
    }
  }

  private getClientIdentifier(request: NextRequest): string {
    // Try to get various identifiers in order of preference
    const forwarded = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Use IP address if available
    let clientIP = "unknown";
    if (forwarded) {
      clientIP = forwarded.split(",")[0].trim();
    } else if (realIP) {
      clientIP = realIP;
    }

    // Create a composite key for better identification
    const userAgentHash = this.simpleHash(userAgent);
    return `${clientIP}_${userAgentHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}

// Input validation utilities
export class InputValidator {
  static validateImageUrl(url: string): { valid: boolean; error?: string } {
    try {
      const parsedUrl = new URL(url);

      // Check protocol
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return { valid: false, error: "URL must use HTTP or HTTPS protocol" };
      }

      // Check for suspicious patterns
      const suspicious = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "file://",
        "data:",
        "javascript:",
        "vbscript:",
      ];

      const urlString = url.toLowerCase();
      for (const pattern of suspicious) {
        if (urlString.includes(pattern)) {
          return { valid: false, error: "Invalid or potentially unsafe URL" };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: "Invalid URL format" };
    }
  }

  static sanitizeText(text: string, maxLength: number = 5000): string {
    if (!text || typeof text !== "string") return "";

    return (
      text
        .trim()
        .slice(0, maxLength)
        // Remove potentially dangerous characters
        .replace(/[<>\"']/g, "")
        // Normalize whitespace
        .replace(/\s+/g, " ")
    );
  }

  static validateLanguageCode(code: string): boolean {
    // Basic language code validation (ISO 639-1 and some common extensions)
    const validCodes = /^[a-z]{2}(-[A-Z]{2})?$/;
    return validCodes.test(code);
  }

  static validateUserId(userId: string): {
    valid: boolean;
    sanitized: string;
    error?: string;
  } {
    if (!userId) {
      return { valid: true, sanitized: "anonymous" };
    }

    // Basic sanitization and validation
    const sanitized = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);

    if (sanitized.length < 1) {
      return {
        valid: false,
        sanitized: "anonymous",
        error: "Invalid user ID format",
      };
    }

    return { valid: true, sanitized };
  }

  static validateRequestSize(
    request: NextRequest,
    maxSizeBytes: number = 1024 * 1024,
  ): boolean {
    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      return parseInt(contentLength) <= maxSizeBytes;
    }
    return true; // Allow if we can't determine size
  }
}

// Security utilities
export class SecurityUtils {
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static sanitizeHeaders(headers: Headers): Record<string, string> {
    const safeHeaders: Record<string, string> = {};
    const allowedHeaders = [
      "content-type",
      "user-agent",
      "accept",
      "accept-language",
      "cache-control",
    ];

    allowedHeaders.forEach((header) => {
      const value = headers.get(header);
      if (value) {
        safeHeaders[header] = value.slice(0, 200); // Limit header length
      }
    });

    return safeHeaders;
  }

  static isValidOrigin(
    origin: string | null,
    allowedOrigins: string[],
  ): boolean {
    if (!origin) return true; // Allow requests without origin (like API clients)

    try {
      const url = new URL(origin);
      return allowedOrigins.some((allowed) => {
        if (allowed === "*") return true;
        if (allowed.startsWith("*.")) {
          const domain = allowed.slice(2);
          return url.hostname === domain || url.hostname.endsWith(`.${domain}`);
        }
        return url.origin === allowed;
      });
    } catch {
      return false;
    }
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private startTime: number;
  private requestId: string;

  constructor(requestId?: string) {
    this.startTime = performance.now();
    this.requestId = requestId || SecurityUtils.generateRequestId();
  }

  getResponseTime(): number {
    return performance.now() - this.startTime;
  }

  getFormattedResponseTime(): string {
    return `${this.getResponseTime().toFixed(2)}ms`;
  }

  async recordMetrics(
    endpoint: string,
    method: string,
    statusCode: number,
    additional?: Record<string, any>,
  ) {
    const responseTime = this.getResponseTime();
    const timestamp = new Date().toISOString();

    const metrics = {
      requestId: this.requestId,
      endpoint,
      method,
      statusCode,
      responseTime,
      timestamp,
      ...additional,
    };

    try {
      // Store metrics for analysis
      const metricsKey = `metrics:${endpoint.replace(/\//g, "_")}:${Date.now()}`;
      await descriptionCache.set(metricsKey, metrics, {
        kvTTL: 86400 * 7, // 7 days
        memoryTTL: 0, // Don't cache in memory
        sessionTTL: 0, // Don't cache in session
      });

      // Update aggregated metrics
      await this.updateAggregatedMetrics(
        endpoint,
        method,
        statusCode,
        responseTime,
      );
    } catch (error) {
      const errorDetails = error instanceof Error ? { error } : { error: String(error) };
      performanceLogger.warn('Failed to record metrics', errorDetails);
    }
  }

  private async updateAggregatedMetrics(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
  ) {
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const aggregateKey = `metrics:aggregate:${endpoint.replace(/\//g, "_")}:${date}`;

    try {
      const existing = (await descriptionCache.get(aggregateKey)) || {
        endpoint,
        method,
        date,
        totalRequests: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        statusCodes: {},
        errors: 0,
      };

      existing.totalRequests++;
      existing.totalResponseTime += responseTime;
      existing.averageResponseTime =
        existing.totalResponseTime / existing.totalRequests;
      existing.statusCodes[statusCode] =
        (existing.statusCodes[statusCode] || 0) + 1;

      if (statusCode >= 400) {
        existing.errors++;
      }

      await descriptionCache.set(aggregateKey, existing, {
        kvTTL: 86400 * 30, // 30 days
        memoryTTL: 0, // Don't cache in memory
        sessionTTL: 0, // Don't cache in session
      });
    } catch (error) {
      const errorDetails = error instanceof Error ? { error } : { error: String(error) };
      performanceLogger.warn('Failed to update aggregated metrics', errorDetails);
    }
  }
}

// Error response utilities
export class ErrorResponseUtils {
  static createErrorResponse(
    error: any,
    statusCode: number = 500,
    requestId?: string,
    responseTime?: string,
  ) {
    const isProduction = process.env.NODE_ENV === "production";

    return {
      error: true,
      message: error.message || "An error occurred",
      code: error.code || "INTERNAL_ERROR",
      requestId: requestId || SecurityUtils.generateRequestId(),
      timestamp: new Date().toISOString(),
      ...(responseTime && { responseTime }),
      // Include stack trace only in development
      ...(!isProduction && error.stack && { stack: error.stack }),
    };
  }

  static createValidationErrorResponse(
    validationErrors: any[],
    requestId?: string,
    responseTime?: string,
  ) {
    return {
      error: true,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      details: validationErrors,
      requestId: requestId || SecurityUtils.generateRequestId(),
      timestamp: new Date().toISOString(),
      ...(responseTime && { responseTime }),
    };
  }

  static createRateLimitResponse(
    resetTime: number,
    remaining: number,
    requestId?: string,
  ) {
    return {
      error: true,
      message: "Rate limit exceeded",
      code: "RATE_LIMIT_EXCEEDED",
      resetTime: new Date(resetTime).toISOString(),
      remaining,
      requestId: requestId || SecurityUtils.generateRequestId(),
      timestamp: new Date().toISOString(),
    };
  }
}

// Cache utilities specific to API operations
export class APICacheUtils {
  static generateCacheKey(prefix: string, params: Record<string, any>): string {
    // Sort parameters for consistent cache keys
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join("|");

    return `${prefix}:${this.hashString(sortedParams)}`;
  }

  static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  static getCacheTTLConfig(cacheType: "short" | "medium" | "long" = "medium") {
    const configs = {
      short: {
        kvTTL: 300, // 5 minutes
        memoryTTL: 180, // 3 minutes
        sessionTTL: 120, // 2 minutes
      },
      medium: {
        kvTTL: 3600, // 1 hour
        memoryTTL: 1800, // 30 minutes
        sessionTTL: 900, // 15 minutes
      },
      long: {
        kvTTL: 86400, // 24 hours
        memoryTTL: 7200, // 2 hours
        sessionTTL: 3600, // 1 hour
      },
    };

    return configs[cacheType];
  }
}

// API helper functions
export function buildApiUrl(endpoint: string, params?: Record<string, any>): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const url = new URL(endpoint, baseUrl || window.location.origin);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  
  return url.toString();
}

export async function handleApiError(error: any, context?: string): Promise<never> {
  apiHelperLogger.error(`API Error${context ? ` in ${context}` : ''}`, error);
  
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.message || error.response.statusText || 'Server error';
    throw new Error(`${message} (${error.response.status})`);
  } else if (error.request) {
    // Request was made but no response received
    throw new Error('Network error: No response received');
  } else {
    // Something else happened
    throw new Error(error.message || 'Unknown API error');
  }
}

export async function retryApiCall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error = new Error('No attempts made');
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Check if error is retryable
      const isRetryable = 
        lastError.message.includes('timeout') ||
        lastError.message.includes('503') ||
        lastError.message.includes('502') ||
        lastError.message.includes('ECONNRESET');
        
      if (!isRetryable) {
        break;
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
    }
  }
  
  throw lastError;
}

export function validateApiResponse(response: any, expectedSchema?: any): boolean {
  if (!response || typeof response !== 'object') {
    return false;
  }
  
  // Basic validation
  if (response.error) {
    throw new Error(response.message || 'API returned an error');
  }
  
  // If expectedSchema is provided, validate against it
  if (expectedSchema) {
    if (Array.isArray(expectedSchema)) {
      // Validate array response
      if (!Array.isArray(response)) {
        return false;
      }
      return response.every(item => 
        expectedSchema[0] ? validateApiResponse(item, expectedSchema[0]) : true
      );
    } else if (typeof expectedSchema === 'object') {
      // Validate object response
      return Object.keys(expectedSchema).every(key => {
        if (expectedSchema[key] === 'required') {
          return key in response;
        }
        return true;
      });
    }
  }
  
  return true;
}
