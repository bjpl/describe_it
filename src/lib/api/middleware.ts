import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

// Rate limiting configuration
const RATE_LIMITS = {
  auth: { requests: 5, window: 60 * 1000 }, // 5 requests per minute
  api: { requests: 100, window: 60 * 1000 }, // 100 requests per minute
  search: { requests: 50, window: 60 * 1000 }, // 50 requests per minute
  upload: { requests: 10, window: 60 * 1000 }, // 10 requests per minute
} as const;

// Cache TTLs in seconds
const CACHE_TTL = {
  user_profile: 300, // 5 minutes
  vocabulary: 60, // 1 minute
  progress: 120, // 2 minutes
  sessions: 30, // 30 seconds
  analytics: 600, // 10 minutes
} as const;

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}

/**
 * Authentication middleware
 */
export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    try {
      const authHeader = req.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Missing or invalid authorization header" },
          { status: 401 },
        );
      }

      const token = authHeader.split(" ")[1];
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 },
        );
      }

      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = {
        id: user.id,
        email: user.email!,
        role: user.user_metadata?.role || "user",
      };

      return handler(authenticatedReq);
    } catch (error) {
      console.error("Authentication error:", error);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 },
      );
    }
  };
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  type: keyof typeof RATE_LIMITS,
  handler?: (req: NextRequest) => Promise<NextResponse>,
) {
  // Support both curried and direct usage
  if (!handler) {
    return (handler: (req: NextRequest) => Promise<NextResponse>) => 
      withRateLimit(type, handler);
  }
  
  return async (req: NextRequest) => {
    try {
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || req.headers.get('cf-connecting-ip') || "anonymous";
      const limit = RATE_LIMITS[type];
      const key = `rate_limit:${type}:${ip}`;

      // Check current count
      const current = (await kv.get<number>(key)) || 0;

      if (current >= limit.requests) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            retryAfter: Math.ceil(limit.window / 1000),
          },
          {
            status: 429,
            headers: {
              "Retry-After": Math.ceil(limit.window / 1000).toString(),
              "X-RateLimit-Limit": limit.requests.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": new Date(
                Date.now() + limit.window,
              ).toISOString(),
            },
          },
        );
      }

      // Increment counter
      await kv.set(key, current + 1, { px: limit.window });

      // Add rate limit headers to response
      const response = await handler(req);
      response.headers.set("X-RateLimit-Limit", limit.requests.toString());
      response.headers.set(
        "X-RateLimit-Remaining",
        (limit.requests - current - 1).toString(),
      );
      response.headers.set(
        "X-RateLimit-Reset",
        new Date(Date.now() + limit.window).toISOString(),
      );

      return response;
    } catch (error) {
      console.error("Rate limiting error:", error);
      // If rate limiting fails, continue with the request
      return handler(req);
    }
  };
}

/**
 * Caching middleware
 */
export function withCache(
  cacheKey: keyof typeof CACHE_TTL,
  generateCacheKey: (req: NextRequest) => string,
  handler: (req: NextRequest) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    try {
      const key = generateCacheKey(req);
      const ttl = CACHE_TTL[cacheKey];

      // Try to get cached response
      if (req.method === "GET") {
        const cached = await kv.get(key);
        if (cached) {
          return NextResponse.json(cached, {
            headers: {
              "X-Cache": "HIT",
              "Cache-Control": `max-age=${ttl}`,
            },
          });
        }
      }

      // Execute handler
      const response = await handler(req);

      // Cache successful GET responses
      if (req.method === "GET" && response.status === 200) {
        const data = await response.json();
        await kv.set(key, data, { ex: ttl });

        return NextResponse.json(data, {
          headers: {
            "X-Cache": "MISS",
            "Cache-Control": `max-age=${ttl}`,
          },
        });
      }

      // Invalidate cache for non-GET requests
      if (req.method !== "GET") {
        const pattern = key.split(":").slice(0, -1).join(":") + ":*";
        // Note: This would require a custom implementation for wildcard deletion
        // For now, we'll just delete the specific key
        await kv.del(key);
      }

      return response;
    } catch (error) {
      console.error("Caching error:", error);
      return handler(req);
    }
  };
}

/**
 * Error handling middleware
 */
export function withErrorHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      console.error("API Error:", error);

      if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes("validation")) {
          return NextResponse.json(
            { error: "Validation error", details: error.message },
            { status: 400 },
          );
        }

        if (error.message.includes("not found")) {
          return NextResponse.json(
            { error: "Resource not found" },
            { status: 404 },
          );
        }

        if (error.message.includes("permission")) {
          return NextResponse.json(
            { error: "Permission denied" },
            { status: 403 },
          );
        }
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

/**
 * CORS middleware
 */
export function withCors(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const response = await handler(req);

    // Add CORS headers to response
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    return response;
  };
}

/**
 * Validation middleware
 */
export function withValidation<T>(
  schema: { parse: (data: any) => T },
  handler: (req: NextRequest, validData: T) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    try {
      let data: any;

      if (req.method === "GET") {
        // Parse query parameters
        const url = new URL(req.url);
        data = Object.fromEntries(url.searchParams.entries());

        // Convert string numbers and booleans
        for (const key in data) {
          const value = data[key];
          if (value === "true") data[key] = true;
          else if (value === "false") data[key] = false;
          else if (!isNaN(Number(value)) && value !== "")
            data[key] = Number(value);
        }
      } else {
        // Parse JSON body
        data = await req.json();
      }

      const validData = schema.parse(data);
      return handler(req, validData);
    } catch (error) {
      console.error("Validation error:", error);
      return NextResponse.json(
        {
          error: "Validation failed",
          details:
            error instanceof Error ? error.message : "Unknown validation error",
        },
        { status: 400 },
      );
    }
  };
}

/**
 * Compose multiple middleware functions
 */
export function compose(...middlewares: Array<(handler: any) => any>) {
  return (handler: any) => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler,
    );
  };
}

/**
 * Common middleware combinations
 */
export const withAuthAndRateLimit = (type: keyof typeof RATE_LIMITS) =>
  compose(withErrorHandler, withCors, withRateLimit(type), withAuth);

export const withPublicRateLimit = (type: keyof typeof RATE_LIMITS) =>
  compose(withErrorHandler, withCors, withRateLimit(type));

export const withCacheAndAuth = (
  cacheKey: keyof typeof CACHE_TTL,
  generateKey: (req: NextRequest) => string,
) =>
  compose(
    withErrorHandler,
    withCors,
    withAuth,
    (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => 
      withCache(cacheKey, generateKey, handler as (req: NextRequest) => Promise<NextResponse>),
  );
