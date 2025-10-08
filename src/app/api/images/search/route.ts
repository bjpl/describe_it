import { NextRequest, NextResponse } from "next/server";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { unsplashService } from "@/lib/api/unsplash";
import { apiKeyProvider } from "@/lib/api/keyProvider";
import { withBasicAuth } from "@/lib/middleware/withAuth";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";
import { z } from "zod";
import { getCorsHeaders, createCorsPreflightResponse, validateCorsRequest } from "@/lib/utils/cors";
import { apiLogger } from '@/lib/logger';
import { asLogContext } from '@/lib/utils/typeGuards';

// Enhanced security configuration
const ALLOWED_METHODS = ['GET', 'HEAD', 'OPTIONS'] as const;
const ALLOWED_HEADERS = [
  'Content-Type', 
  'Authorization', 
  'If-None-Match', 
  'X-Requested-With',
  'Accept',
  'Origin',
  'Cache-Control',
  'X-API-Key'
] as const;
const MAX_AGE = 86400; // 24 hours

// Force dynamic rendering to fix build error
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 5; // 5 seconds max for Vercel hobby plan

// Cache implementation
const cache = new Map<string, { data: any; timestamp: number; etag: string }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

// Supported Unsplash color values
const UNSPLASH_COLORS = [
  "black_and_white",
  "black",
  "white",
  "yellow",
  "orange",
  "red",
  "purple",
  "magenta",
  "green",
  "teal",
  "blue"
] as const;

type UnsplashColor = typeof UNSPLASH_COLORS[number];

const searchSchema = z.object({
  query: z.string().min(1).max(100),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(30).default(20),
  orientation: z.enum(["landscape", "portrait", "squarish"]).optional(),
  color: z.enum(UNSPLASH_COLORS).optional(),
  orderBy: z.enum(["relevant", "latest", "oldest", "popular"]).optional(),
});

// Generate cache key
function getCacheKey(params: z.infer<typeof searchSchema>): string {
  return safeStringify(params);
}

// Generate ETag
function generateETag(data: any): string {
  return Buffer.from(safeStringify(data)).toString("base64").slice(0, 16);
}

// Clean old cache entries
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of Array.from(cache.entries())) {
    if (now - value.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }

  // Limit cache size
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < entries.length - MAX_CACHE_SIZE; i++) {
      cache.delete(entries[i][0]);
    }
  }
}

/**
 * CORS Preflight Handler
 * 
 * Handles CORS preflight requests with comprehensive security validation.
 * Validates origins, methods, and headers before allowing cross-origin requests.
 * 
 * @param request - The incoming preflight request
 * @returns NextResponse with appropriate CORS headers or 403 if rejected
 * 
 * @example
 * ```typescript
 * // Browser will send OPTIONS request before actual request
 * OPTIONS /api/images/search
 * Origin: http://localhost:3000
 * Access-Control-Request-Method: GET
 * ```
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const requestedMethod = request.headers.get('access-control-request-method');
  const requestedHeaders = request.headers.get('access-control-request-headers');
  
  // Enhanced security logging for CORS preflight
  apiLogger.info('[SECURITY] CORS preflight request:', {
    origin: origin || undefined,
    requestedMethod: requestedMethod || undefined,
    requestedHeaders: requestedHeaders || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });

  // Validate the CORS request
  const { isValid, headers } = validateCorsRequest(request);
  
  if (!isValid && origin) {
    apiLogger.warn('[SECURITY] CORS preflight rejected:', {
      origin,
      reason: 'Origin not allowed',
      timestamp: new Date().toISOString()
    });
    
    return new NextResponse(null, {
      status: 403,
      headers: {
        'X-CORS-Error': 'Origin not allowed',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }

  // Create preflight response with enhanced config
  const corsResponse = createCorsPreflightResponse(origin, {
    allowedMethods: [...ALLOWED_METHODS],
    allowedHeaders: [...ALLOWED_HEADERS],
    maxAge: MAX_AGE,
    allowCredentials: true
  });

  // Add comprehensive security headers
  corsResponse.headers.set('X-Security-Policy', 'CORS-Enabled');
  corsResponse.headers.set('X-Content-Type-Options', 'nosniff');
  corsResponse.headers.set('X-Frame-Options', 'DENY');
  corsResponse.headers.set('X-XSS-Protection', '1; mode=block');
  corsResponse.headers.set('Referrer-Policy', 'no-referrer');
  corsResponse.headers.set('Access-Control-Expose-Headers', 'X-Cache, X-Response-Time, X-Rate-Limit-Remaining, ETag');

  return corsResponse;
}

/**
 * HEAD Request Handler
 * 
 * Provides metadata for image search endpoint without returning response body.
 * Useful for prefetching and cache validation.
 * 
 * @param request - The incoming HEAD request
 * @returns NextResponse with headers only (no body)
 * 
 * @example
 * ```typescript
 * HEAD /api/images/search?query=mountain
 * // Returns: Cache-Control, X-Prefetch-Enabled headers
 * ```
 */
export async function HEAD(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // Validate CORS for HEAD requests
  const { isValid, headers: corsHeaders } = validateCorsRequest(request);
  
  if (!isValid && origin) {
    return new NextResponse(null, {
      status: 403,
      headers: {
        'X-CORS-Error': 'Origin not allowed',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }
  
  // Return headers for prefetch requests with security headers
  return new NextResponse(null, {
    headers: {
      ...corsHeaders,
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-Prefetch-Enabled': 'true'
    },
  });
}

async function handleImageSearch(request: AuthenticatedRequest) {
  const startTime = performance.now();
  const userId = request.user?.id;
  const userTier = request.user?.subscription_status || 'free';

  apiLogger.info("[API] Image search endpoint called", { timestamp: new Date().toISOString(), userId, userTier });
  
  // Check if user provided an API key in the request
  const userProvidedKey = request.nextUrl.searchParams.get('api_key') || undefined;
  
  // If user provided a key, temporarily set it for this request
  if (userProvidedKey) {
    apiLogger.info("[API] User provided API key:", {
      keyLength: userProvidedKey.length,
      keyPrefix: userProvidedKey.substring(0, 6) + '...',
      timestamp: new Date().toISOString(),
      source: 'query_param'
    });
    // Temporarily override the service with user's key
    unsplashService.useTemporaryKey(userProvidedKey);
  } else {
    apiLogger.info("[API] No user API key provided in request query params");
  }
  
  // Use the key provider to check API key status (with timeout to prevent blocking)
  let unsplashConfig: any;
  try {
    // Add timeout to prevent blocking
    const configPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Key provider timeout'));
      }, 100); // 100ms timeout
      
      try {
        const config = apiKeyProvider.getServiceConfig('unsplash');
        clearTimeout(timeout);
        resolve(config);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
    
    unsplashConfig = await configPromise;
  } catch (error) {
    apiLogger.warn("[API] Key provider failed, using fallback:", asLogContext({ error: error instanceof Error ? error.message : String(error) }));
    // Fallback to basic config
    unsplashConfig = {
      apiKey: userProvidedKey || '',
      isValid: !!userProvidedKey,
      source: userProvidedKey ? 'user-settings' : 'none',
      isDemo: !userProvidedKey
    };
  }

  apiLogger.info("[API] Key provider check:", asLogContext({
    hasKey: !!unsplashConfig.apiKey || !!userProvidedKey,
    isValid: unsplashConfig.isValid || !!userProvidedKey,
    source: userProvidedKey ? 'user-settings' : unsplashConfig.source,
    isDemo: !userProvidedKey && unsplashConfig.isDemo,
    keyLength: unsplashConfig.apiKey ? unsplashConfig.apiKey.length : 0,
    envCheck: {
      NEXT_PUBLIC_UNSPLASH_ACCESS_KEY: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ? process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY.length : 0,
      UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY ? process.env.UNSPLASH_ACCESS_KEY.length : 0,
      NODE_ENV: process.env.NODE_ENV
    }
  }));

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    // Remove the api_key from params before parsing
    delete searchParams.api_key;
    apiLogger.info("[API] Search params:", searchParams);
    const params = searchSchema.parse(searchParams);

    const cacheKey = getCacheKey(params);
    const now = Date.now();

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      // Check if client has cached version
      const clientETag = request.headers.get("if-none-match");
      if (clientETag === cached.etag) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
            ETag: cached.etag,
            "X-Cache": "HIT-304",
            "X-Response-Time": `${performance.now() - startTime}ms`,
          },
        });
      }

      // Transform cached data to match expected interface
      const transformedCached = {
        images: cached.data.results || cached.data.images || [],
        totalPages: cached.data.totalPages || 1,
        currentPage: params.page,
        total: cached.data.total || 0,
        hasNextPage: params.page < (cached.data.totalPages || 1),
      };

      const corsHeaders = getCorsHeaders(request.headers.get('origin'));
    return NextResponse.json(transformedCached, {
        headers: {
          ...corsHeaders,
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
          ETag: cached.etag,
          "X-Cache": "HIT",
          "X-Response-Time": `${performance.now() - startTime}ms`,
          "X-Content-Type-Options": "nosniff"
        },
      });
    }

    // Fetch data (unsplashService handles demo mode internally)
    apiLogger.info("[API] Calling unsplashService.searchImages with params:", params);
    
    // Add timeout for Vercel serverless (reduced for Vercel's 5s limit on hobby plan)
    const searchPromise = unsplashService.searchImages(params);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Search timeout - using demo mode')), 4000); // 4 seconds max for Vercel hobby
    });
    
    let results: any;
    try {
      results = await Promise.race([searchPromise, timeoutPromise]);
    } catch (timeoutError) {
      apiLogger.warn('[API] Search timed out, generating demo results');
      // Generate demo results directly for immediate response
      results = {
        images: [
          {
            id: `demo-timeout-1`,
            urls: {
              small: `https://picsum.photos/400/300?random=${Date.now()}`,
              regular: `https://picsum.photos/1080/720?random=${Date.now()}`
            },
            alt_description: `Demo image for ${params.query}`,
            user: { name: 'Demo User' }
          },
          {
            id: `demo-timeout-2`,
            urls: {
              small: `https://picsum.photos/400/300?random=${Date.now() + 1}`,
              regular: `https://picsum.photos/1080/720?random=${Date.now() + 1}`
            },
            alt_description: `Another demo image for ${params.query}`,
            user: { name: 'Demo User' }
          },
          {
            id: `demo-timeout-3`,
            urls: {
              small: `https://picsum.photos/400/300?random=${Date.now() + 2}`,
              regular: `https://picsum.photos/1080/720?random=${Date.now() + 2}`
            },
            alt_description: `Third demo image for ${params.query}`,
            user: { name: 'Demo User' }
          }
        ],
        totalPages: 3,
        currentPage: params.page,
        total: 50,
        hasNextPage: params.page < 3
      };
    }
    apiLogger.info("[API] Results from unsplashService:", {
      hasImages: !!(results.images && results.images.length > 0),
      imageCount: results.images?.length || 0,
      totalPages: results.totalPages,
      isDemo: results.images?.[0]?.id?.startsWith('demo')
    });
    const etag = generateETag(results);

    // Cache the results
    cache.set(cacheKey, {
      data: results,
      timestamp: now,
      etag,
    });

    // Clean old cache entries
    cleanCache();

    // Transform results to match expected interface
    const transformedResults = {
      images: results.images || [],
      totalPages: results.totalPages || 1,
      currentPage: params.page,
      total: results.total || 0,
      hasNextPage: params.page < (results.totalPages || 1),
    };

    const corsHeaders = getCorsHeaders(request.headers.get('origin'));
    return NextResponse.json(transformedResults, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        ETag: etag,
        "X-Cache": "MISS",
        "X-Response-Time": `${performance.now() - startTime}ms`,
        "X-Rate-Limit-Remaining": "1000", // Mock rate limit
        "X-Demo-Mode": unsplashConfig.isDemo ? "true" : "false",
        "X-User-ID": userId || 'anonymous',
        "X-User-Tier": userTier,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY"
      },
    });
  } catch (error) {
    const responseTime = performance.now() - startTime;

    if (error instanceof z.ZodError) {
      const corsHeaders = getCorsHeaders(request.headers.get('origin'));
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: error.errors,
          timestamp: new Date().toISOString(),
        },
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "X-Response-Time": `${responseTime}ms`,
            "X-Content-Type-Options": "nosniff"
          },
        },
      );
    }

    apiLogger.error("Image search error:", asLogContext({ error: error instanceof Error ? error.message : String(error) }));

    // Return cached data if available during error
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    delete searchParams.api_key;
    const parsedParams = searchSchema.safeParse(searchParams);
    if (!parsedParams.success) {
      const corsHeaders = getCorsHeaders(request.headers.get('origin'));
      return NextResponse.json(
        {
          error: "Search failed and unable to parse cache params",
          timestamp: new Date().toISOString(),
        },
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "X-Response-Time": `${responseTime}ms`,
          },
        }
      );
    }
    const cacheKey = getCacheKey(parsedParams.data);
    const cached = cache.get(cacheKey);

    if (cached) {
      // Transform stale cached data to match expected interface
      const transformedStale = {
        images: cached.data.results || cached.data.images || [],
        totalPages: cached.data.totalPages || 1,
        currentPage: parsedParams.data.page,
        total: cached.data.total || 0,
        hasNextPage: (searchParams.page || 1) < (cached.data.totalPages || 1),
      };

      const corsHeaders = getCorsHeaders(request.headers.get('origin'));
      return NextResponse.json(transformedStale, {
        headers: {
          ...corsHeaders,
          "Cache-Control": "public, max-age=60, stale-while-revalidate=3600",
          ETag: cached.etag,
          "X-Cache": "STALE-ERROR",
          "X-Response-Time": `${responseTime}ms`,
          "X-Error": "true",
          "X-Content-Type-Options": "nosniff"
        },
      });
    }

    // Return demo data as final fallback
    const demoFallback = {
      images: [
        {
          id: "fallback-1",
          urls: {
            small:
              "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
            regular:
              "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
            full: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200",
          },
          alt_description: "Error fallback: Mountain landscape",
          description: "Fallback image due to API error",
          user: { name: "Fallback User", username: "fallback" },
          width: 1200,
          height: 800,
          color: "#4A90E2",
          likes: 0,
          created_at: new Date().toISOString(),
        },
      ],
      total: 1,
      totalPages: 1,
      currentPage: 1,
      hasNextPage: false,
    };

    const corsHeaders = getCorsHeaders(request.headers.get('origin'));
    return NextResponse.json(demoFallback, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=60",
        "X-Cache": "ERROR-FALLBACK",
        "X-Response-Time": `${responseTime}ms`,
        "X-Error": "true",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY"
      },
    });
  }
}

// Export authenticated handler
export const GET = withBasicAuth(
  handleImageSearch,
  {
    requiredFeatures: ['image_search'],
    errorMessages: {
      featureRequired: 'Image search requires a valid subscription. Free tier includes basic image search.',
    },
  }
);
