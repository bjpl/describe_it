import { NextRequest, NextResponse } from "next/server";
import { unsplashService } from "@/lib/api/unsplash";
import { apiKeyProvider } from "@/lib/api/keyProvider";
import { z } from "zod";
import { getCorsHeaders as getStandardCorsHeaders, createCorsPreflightResponse } from "@/lib/utils/cors";

// Legacy CORS headers function - will be replaced
function getLegacyCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Define allowed origins based on environment
  let allowedOrigins: string[];
  if (isDevelopment) {
    allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];
  } else {
    // Production origins with Vercel deployment support
    const envOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
    allowedOrigins = [
      'https://describe-it-lovat.vercel.app',
      ...envOrigins
    ];
  }
  
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, If-None-Match, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };

  // Enhanced origin matching with wildcard support for Vercel deployments
  function isOriginAllowed(requestOrigin: string, allowed: string[]): boolean {
    return allowed.some(allowedOrigin => {
      // Exact match
      if (allowedOrigin === requestOrigin) return true;
      
      // Wildcard support for Vercel preview deployments
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '[^.]*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(requestOrigin);
      }
      
      // Support for Vercel preview deployments (describe-*.vercel.app)
      if (requestOrigin.match(/^https:\/\/describe-[a-zA-Z0-9-]+\.vercel\.app$/)) {
        return allowedOrigins.includes('https://describe-*.vercel.app') ||
               allowedOrigins.includes('https://*.vercel.app');
      }
      
      return false;
    });
  }

  // Set origin based on security policy
  if (isDevelopment) {
    // Allow localhost in development
    corsHeaders["Access-Control-Allow-Origin"] = origin && origin.includes('localhost') ? origin : "http://localhost:3000";
  } else if (origin && isOriginAllowed(origin, allowedOrigins)) {
    // Allow specific origins and Vercel preview deployments in production
    corsHeaders["Access-Control-Allow-Origin"] = origin;
    corsHeaders["Access-Control-Allow-Credentials"] = "true";
  } else if (!origin) {
    // Allow same-origin requests
    corsHeaders["Access-Control-Allow-Origin"] = allowedOrigins[0] || "null";
  } else {
    // Reject unauthorized origins
    corsHeaders["Access-Control-Allow-Origin"] = "null";
  }

  return corsHeaders;
}

// Force dynamic rendering to fix build error
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Cache implementation
const cache = new Map<string, { data: any; timestamp: number; etag: string }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

const searchSchema = z.object({
  query: z.string().min(1).max(100),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(30).default(20),
  orientation: z.enum(["landscape", "portrait", "squarish"]).optional(),
  color: z.string().optional(),
  orderBy: z.enum(["relevant", "latest", "oldest", "popular"]).optional(),
});

// Generate cache key
function getCacheKey(params: any): string {
  return JSON.stringify(params);
}

// Generate ETag
function generateETag(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString("base64").slice(0, 16);
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

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // Log CORS preflight for security monitoring
  console.log('[SECURITY] CORS preflight request:', {
    origin,
    method: request.headers.get('access-control-request-method'),
    headers: request.headers.get('access-control-request-headers'),
    timestamp: new Date().toISOString()
  });

  // Use centralized CORS utility
  const corsResponse = createCorsPreflightResponse(origin, {
    allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'If-None-Match', 'X-Requested-With'],
    maxAge: 86400
  });

  // Add additional security headers
  corsResponse.headers.set("X-Security-Policy", "CORS-Enabled");
  corsResponse.headers.set("X-Content-Type-Options", "nosniff");

  return corsResponse;
}

// Add prefetch endpoint for critical images
export async function HEAD(request: NextRequest) {
  const corsHeaders = getStandardCorsHeaders(request.headers.get('origin'));
  
  // Return headers only for prefetch requests
  return new NextResponse(null, {
    headers: {
      ...corsHeaders,
      "Cache-Control": "public, max-age=300",
    },
  });
}

export async function GET(request: NextRequest) {
  const startTime = performance.now();

  console.log("[API] Image search endpoint called at", new Date().toISOString());
  
  // Check if user provided an API key in the request
  const userProvidedKey = request.nextUrl.searchParams.get('api_key');
  
  // If user provided a key, temporarily set it for this request
  if (userProvidedKey) {
    console.log("[API] Using user-provided API key from request");
    // Temporarily override the service with user's key
    unsplashService.useTemporaryKey(userProvidedKey);
  }
  
  // Use the key provider to check API key status (with timeout to prevent blocking)
  let unsplashConfig;
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
    console.warn("[API] Key provider failed, using fallback:", error);
    // Fallback to basic config
    unsplashConfig = {
      apiKey: userProvidedKey || '',
      isValid: !!userProvidedKey,
      source: userProvidedKey ? 'user-settings' : 'none',
      isDemo: !userProvidedKey
    };
  }
  
  console.log("[API] Key provider check:", {
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
  });

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    // Remove the api_key from params before parsing
    delete searchParams.api_key;
    console.log("[API] Search params:", searchParams);
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

      const corsHeaders = getStandardCorsHeaders(request.headers.get('origin'));
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
    console.log("[API] Calling unsplashService.searchImages with params:", params);
    
    // Add timeout to prevent infinite waiting
    const searchPromise = unsplashService.searchImages(params as any);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Search timeout')), 15000); // 15 second timeout
    });
    
    const results = await Promise.race([searchPromise, timeoutPromise]);
    console.log("[API] Results from unsplashService:", {
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

    const corsHeaders = getStandardCorsHeaders(request.headers.get('origin'));
    return NextResponse.json(transformedResults, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        ETag: etag,
        "X-Cache": "MISS",
        "X-Response-Time": `${performance.now() - startTime}ms`,
        "X-Rate-Limit-Remaining": "1000", // Mock rate limit
        "X-Demo-Mode": unsplashConfig.isDemo ? "true" : "false",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY"
      },
    });
  } catch (error) {
    const responseTime = performance.now() - startTime;

    if (error instanceof z.ZodError) {
      const corsHeaders = getStandardCorsHeaders(request.headers.get('origin'));
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

    console.error("Image search error:", error);

    // Return cached data if available during error
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const cacheKey = getCacheKey(searchParams);
    const cached = cache.get(cacheKey);

    if (cached) {
      // Transform stale cached data to match expected interface
      const transformedStale = {
        images: cached.data.results || cached.data.images || [],
        totalPages: cached.data.totalPages || 1,
        currentPage: searchParams.page || 1,
        total: cached.data.total || 0,
        hasNextPage: (searchParams.page || 1) < (cached.data.totalPages || 1),
      };

      const corsHeaders = getStandardCorsHeaders(request.headers.get('origin'));
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

    const corsHeaders = getStandardCorsHeaders(request.headers.get('origin'));
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
