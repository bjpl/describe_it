import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  RateLimiter,
  RATE_LIMITS,
  InputValidator,
  SecurityUtils,
  PerformanceMonitor,
  ErrorResponseUtils,
  APICacheUtils,
} from "@/lib/utils/api-helpers";

// Middleware configuration for different endpoints
const ENDPOINT_CONFIGS = {
  "/api/descriptions/generate": {
    rateLimit: RATE_LIMITS.AI_GENERATION,
    maxRequestSize: 1024 * 10, // 10KB
    requiresImageUrl: true,
    cacheable: true,
  },
  "/api/phrases/extract": {
    rateLimit: RATE_LIMITS.AI_GENERATION,
    maxRequestSize: 1024 * 10, // 10KB
    requiresImageUrl: true,
    cacheable: true,
  },
  "/api/qa/generate": {
    rateLimit: RATE_LIMITS.AI_GENERATION,
    maxRequestSize: 1024 * 10, // 10KB
    requiresImageUrl: true,
    cacheable: true,
  },
  "/api/translate": {
    rateLimit: RATE_LIMITS.AI_GENERATION,
    maxRequestSize: 1024 * 50, // 50KB for longer texts
    requiresImageUrl: false,
    cacheable: true,
  },
  "/api/vocabulary/save": {
    rateLimit: RATE_LIMITS.DATA_OPERATIONS,
    maxRequestSize: 1024 * 100, // 100KB for bulk operations
    requiresImageUrl: false,
    cacheable: false,
  },
  "/api/progress/track": {
    rateLimit: RATE_LIMITS.DATA_OPERATIONS,
    maxRequestSize: 1024 * 20, // 20KB
    requiresImageUrl: false,
    cacheable: false,
  },
  "/api/export/generate": {
    rateLimit: RATE_LIMITS.EXPORT_OPERATIONS,
    maxRequestSize: 1024 * 5, // 5KB
    requiresImageUrl: false,
    cacheable: true,
  },
  "/api/settings/save": {
    rateLimit: RATE_LIMITS.DATA_OPERATIONS,
    maxRequestSize: 1024 * 20, // 20KB
    requiresImageUrl: false,
    cacheable: false,
  },
  "/api/images/search": {
    rateLimit: RATE_LIMITS.READ_OPERATIONS,
    maxRequestSize: 1024 * 5, // 5KB
    requiresImageUrl: false,
    cacheable: true,
  },
};

// Enhanced API middleware class
export class APIMiddleware {
  private rateLimiters: Map<string, RateLimiter> = new Map();

  constructor() {
    // Initialize rate limiters for each endpoint
    Object.entries(ENDPOINT_CONFIGS).forEach(([endpoint, config]) => {
      this.rateLimiters.set(endpoint, new RateLimiter(config.rateLimit));
    });
  }

  // Main middleware function
  async processRequest(
    request: NextRequest,
    endpoint: string,
    handler: (req: NextRequest) => Promise<NextResponse>,
  ): Promise<NextResponse> {
    const monitor = new PerformanceMonitor();
    const requestId = SecurityUtils.generateRequestId();

    try {
      // 1. Security validation
      const securityCheck = await this.validateSecurity(request, endpoint);
      if (!securityCheck.passed) {
        await monitor.recordMetrics(endpoint, request.method, 403, {
          reason: "security",
        });
        return NextResponse.json(
          ErrorResponseUtils.createErrorResponse(
            new Error(securityCheck.reason),
            403,
            requestId,
            monitor.getFormattedResponseTime(),
          ),
          { status: 403 },
        );
      }

      // 2. Rate limiting
      const rateLimitCheck = await this.checkRateLimit(request, endpoint);
      if (!rateLimitCheck.allowed) {
        await monitor.recordMetrics(endpoint, request.method, 429, {
          reason: "rate_limit",
          remaining: rateLimitCheck.remaining,
        });
        return NextResponse.json(
          ErrorResponseUtils.createRateLimitResponse(
            rateLimitCheck.resetTime,
            rateLimitCheck.remaining,
            requestId,
          ),
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit":
                ENDPOINT_CONFIGS[
                  endpoint as keyof typeof ENDPOINT_CONFIGS
                ]?.rateLimit.maxRequests.toString() || "100",
              "X-RateLimit-Remaining": rateLimitCheck.remaining.toString(),
              "X-RateLimit-Reset": new Date(
                rateLimitCheck.resetTime,
              ).toISOString(),
              "Retry-After": Math.ceil(
                (rateLimitCheck.resetTime - Date.now()) / 1000,
              ).toString(),
            },
          },
        );
      }

      // 3. Input validation
      const validationResult = await this.validateInput(request, endpoint);
      if (!validationResult.valid) {
        await monitor.recordMetrics(endpoint, request.method, 400, {
          reason: "validation",
        });
        return NextResponse.json(
          ErrorResponseUtils.createValidationErrorResponse(
            validationResult.errors,
            requestId,
            monitor.getFormattedResponseTime(),
          ),
          { status: 400 },
        );
      }

      // 4. Execute the actual handler
      const response = await handler(request);

      // 5. Post-process response
      const processedResponse = await this.postProcessResponse(
        response,
        request,
        endpoint,
        requestId,
        monitor,
        rateLimitCheck,
      );

      await monitor.recordMetrics(endpoint, request.method, response.status, {
        cached: processedResponse.headers.get("X-Cache") === "HIT",
        requestId,
      });

      return processedResponse;
    } catch (error: any) {
      console.error(`API middleware error for ${endpoint}:`, error);

      await monitor.recordMetrics(endpoint, request.method, 500, {
        error: error.message,
        requestId,
      });

      return NextResponse.json(
        ErrorResponseUtils.createErrorResponse(
          error,
          500,
          requestId,
          monitor.getFormattedResponseTime(),
        ),
        { status: 500 },
      );
    }
  }

  private async validateSecurity(
    request: NextRequest,
    endpoint: string,
  ): Promise<{
    passed: boolean;
    reason?: string;
  }> {
    // Check request size
    const config = ENDPOINT_CONFIGS[endpoint as keyof typeof ENDPOINT_CONFIGS];
    if (
      config &&
      !InputValidator.validateRequestSize(request, config.maxRequestSize)
    ) {
      return { passed: false, reason: "Request too large" };
    }

    // Check origin (CORS)
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "https://*.vercel.app",
      "https://describe-it.vercel.app",
    ];

    const origin = request.headers.get("origin");
    if (!SecurityUtils.isValidOrigin(origin, allowedOrigins)) {
      return { passed: false, reason: "Invalid origin" };
    }

    // Check for suspicious headers or patterns
    const userAgent = request.headers.get("user-agent") || "";
    const suspiciousPatterns = ["bot", "crawler", "spider", "scraper"];

    // Allow legitimate user agents but block suspicious ones
    const isSuspicious =
      suspiciousPatterns.some((pattern) =>
        userAgent.toLowerCase().includes(pattern),
      ) &&
      !["googlebot", "bingbot"].some((allowed) =>
        userAgent.toLowerCase().includes(allowed),
      );

    if (isSuspicious && Math.random() > 0.8) {
      // Random blocking of 20% suspicious requests
      return { passed: false, reason: "Suspicious user agent" };
    }

    return { passed: true };
  }

  private async checkRateLimit(request: NextRequest, endpoint: string) {
    const rateLimiter = this.rateLimiters.get(endpoint);

    if (!rateLimiter) {
      // Default rate limiting if endpoint not configured
      const defaultLimiter = new RateLimiter(RATE_LIMITS.READ_OPERATIONS);
      return await defaultLimiter.checkLimit(request);
    }

    return await rateLimiter.checkLimit(request);
  }

  private async validateInput(
    request: NextRequest,
    endpoint: string,
  ): Promise<{
    valid: boolean;
    errors: any[];
  }> {
    const errors: any[] = [];
    const config = ENDPOINT_CONFIGS[endpoint as keyof typeof ENDPOINT_CONFIGS];

    try {
      // Only validate JSON body for POST/PUT requests
      if (["POST", "PUT", "PATCH"].includes(request.method)) {
        const body = await request
          .clone()
          .json()
          .catch(() => null);

        if (!body && request.method === "POST") {
          errors.push({ field: "body", message: "Request body is required" });
          return { valid: false, errors };
        }

        if (body) {
          // Validate image URL if required
          if (config?.requiresImageUrl && body.imageUrl) {
            const urlValidation = InputValidator.validateImageUrl(
              body.imageUrl,
            );
            if (!urlValidation.valid) {
              errors.push({
                field: "imageUrl",
                message: urlValidation.error,
              });
            }
          }

          // Validate user ID if present
          if (body.userId) {
            const userIdValidation = InputValidator.validateUserId(body.userId);
            if (!userIdValidation.valid) {
              errors.push({
                field: "userId",
                message: userIdValidation.error,
              });
            }
          }

          // Validate text fields
          ["text", "phrase", "question", "answer"].forEach((field) => {
            if (body[field] && typeof body[field] === "string") {
              const sanitized = InputValidator.sanitizeText(body[field]);
              if (sanitized.length === 0 && body[field].length > 0) {
                errors.push({
                  field,
                  message: "Text contains invalid characters",
                });
              }
            }
          });

          // Validate language codes
          ["language", "fromLanguage", "toLanguage"].forEach((field) => {
            if (
              body[field] &&
              !InputValidator.validateLanguageCode(body[field])
            ) {
              errors.push({
                field,
                message: "Invalid language code format",
              });
            }
          });
        }
      }

      // Validate query parameters for GET requests
      if (request.method === "GET") {
        const { searchParams } = new URL(request.url);

        // Validate common query parameters
        const userId = searchParams.get("userId");
        if (userId) {
          const userIdValidation = InputValidator.validateUserId(userId);
          if (!userIdValidation.valid) {
            errors.push({
              field: "userId",
              message: userIdValidation.error,
            });
          }
        }

        // Validate pagination parameters
        const limit = searchParams.get("limit");
        if (
          limit &&
          (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)
        ) {
          errors.push({
            field: "limit",
            message: "Limit must be between 1 and 100",
          });
        }

        const offset = searchParams.get("offset");
        if (offset && (isNaN(Number(offset)) || Number(offset) < 0)) {
          errors.push({
            field: "offset",
            message: "Offset must be 0 or greater",
          });
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (error: any) {
      errors.push({
        field: "general",
        message: `Validation error: ${error.message}`,
      });
      return { valid: false, errors };
    }
  }

  private async postProcessResponse(
    response: NextResponse,
    request: NextRequest,
    endpoint: string,
    requestId: string,
    monitor: PerformanceMonitor,
    rateLimitInfo: any,
  ): Promise<NextResponse> {
    // Clone the response to read/modify headers
    const newResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    // Add common security headers
    newResponse.headers.set("X-Content-Type-Options", "nosniff");
    newResponse.headers.set("X-Frame-Options", "DENY");
    newResponse.headers.set("X-XSS-Protection", "1; mode=block");
    newResponse.headers.set(
      "Referrer-Policy",
      "strict-origin-when-cross-origin",
    );

    // Add request tracking headers
    newResponse.headers.set("X-Request-ID", requestId);
    newResponse.headers.set(
      "X-Response-Time",
      monitor.getFormattedResponseTime(),
    );

    // Add rate limit headers
    const config = ENDPOINT_CONFIGS[endpoint as keyof typeof ENDPOINT_CONFIGS];
    if (config) {
      newResponse.headers.set(
        "X-RateLimit-Limit",
        config.rateLimit.maxRequests.toString(),
      );
      newResponse.headers.set(
        "X-RateLimit-Remaining",
        rateLimitInfo.remaining.toString(),
      );
      newResponse.headers.set(
        "X-RateLimit-Reset",
        new Date(rateLimitInfo.resetTime).toISOString(),
      );
    }

    // Add caching headers if cacheable
    if (config?.cacheable && response.status === 200) {
      const cacheControl = response.headers.get("Cache-Control");
      if (!cacheControl) {
        newResponse.headers.set("Cache-Control", "private, max-age=300"); // 5 minutes default
      }
    }

    // Add CORS headers
    const origin = request.headers.get("origin");
    if (origin) {
      newResponse.headers.set("Access-Control-Allow-Origin", origin);
      newResponse.headers.set("Access-Control-Allow-Credentials", "true");
      newResponse.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      newResponse.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With",
      );
      newResponse.headers.set(
        "Access-Control-Expose-Headers",
        "X-Request-ID, X-Response-Time, X-Cache, X-RateLimit-Remaining",
      );
    }

    return newResponse;
  }
}

// Singleton instance
const apiMiddleware = new APIMiddleware();

// Helper function to wrap endpoint handlers
export function withAPIMiddleware(
  endpoint: string,
  handler: (req: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    return apiMiddleware.processRequest(request, endpoint, handler);
  };
}

// Helper function for OPTIONS requests (CORS preflight)
export function handleCORSPreflight(): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// Export the middleware instance
export { apiMiddleware };
