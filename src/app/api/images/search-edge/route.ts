import { NextRequest, NextResponse } from "next/server";

// Use Edge Runtime for faster cold starts and better performance
export const runtime = "edge";
export const dynamic = "force-dynamic";

// Edge runtime logger (development-only logging for edge runtime)
// Edge runtime does not support Winston logger, console is necessary here
const edgeLogger = {
  warn: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line custom-rules/require-logger, no-console
      console.warn(`[Edge API] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    // Always log errors, even in production
    // eslint-disable-next-line custom-rules/require-logger, no-console
    console.error(`[Edge API] ${message}`, ...args);
  },
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line custom-rules/require-logger, no-console
      console.log(`[Edge API] ${message}`, ...args);
    }
  },
};

// Simple in-memory cache for Edge Runtime
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Edge-optimized image search endpoint
 * Returns immediately with cached or demo results
 * Optimized for Vercel's 5-second limit
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get("query") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const apiKey = searchParams.get("api_key") || "";
    
    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = `${query}-${page}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data, {
        headers: {
          "X-Cache": "HIT",
          "X-Response-Time": `${Date.now() - startTime}ms`,
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      });
    }

    // If we have an API key, try to fetch from Unsplash with aggressive timeout
    if (apiKey && apiKey !== "demo") {
      try {
        // Create abort controller with 2-second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const unsplashUrl = new URL("https://api.unsplash.com/search/photos");
        unsplashUrl.searchParams.set("query", query);
        unsplashUrl.searchParams.set("page", page.toString());
        unsplashUrl.searchParams.set("per_page", "12"); // Reduce to 12 for faster response
        
        const response = await fetch(unsplashUrl.toString(), {
          headers: {
            "Authorization": `Client-ID ${apiKey}`,
            "Accept-Version": "v1",
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          
          // Transform to our format
          const result = {
            images: data.results.map((img: any) => ({
              id: img.id,
              urls: {
                small: img.urls.small,
                regular: img.urls.regular,
                full: img.urls.full,
              },
              alt_description: img.alt_description || img.description || `Image for ${query}`,
              user: {
                name: img.user?.name || "Unknown",
                username: img.user?.username || "unknown",
              },
              width: img.width,
              height: img.height,
              color: img.color,
            })),
            totalPages: Math.ceil(data.total / 12),
            currentPage: page,
            total: data.total,
            hasNextPage: page < Math.ceil(data.total / 12),
          };
          
          // Cache the result
          cache.set(cacheKey, { data: result, timestamp: Date.now() });
          
          // Clean old cache entries if needed
          if (cache.size > 100) {
            const oldestKey = Array.from(cache.keys())[0];
            cache.delete(oldestKey);
          }
          
          return NextResponse.json(result, {
            headers: {
              "X-Cache": "MISS",
              "X-Response-Time": `${Date.now() - startTime}ms`,
              "X-Source": "unsplash",
              "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
            },
          });
        }
      } catch (error) {
        edgeLogger.warn("Unsplash fetch failed or timed out, using demo:", error);
        // Fall through to demo mode
      }
    }

    // Return demo images immediately (no external API calls)
    const demoImages = generateDemoImages(query, page);
    
    // Cache demo results too
    cache.set(cacheKey, { data: demoImages, timestamp: Date.now() });
    
    return NextResponse.json(demoImages, {
      headers: {
        "X-Cache": "DEMO",
        "X-Response-Time": `${Date.now() - startTime}ms`,
        "X-Source": "demo",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    edgeLogger.error("Error:", error);

    // Return minimal fallback
    return NextResponse.json(
      {
        images: [],
        totalPages: 1,
        currentPage: 1,
        total: 0,
        hasNextPage: false,
      },
      {
        status: 500,
        headers: {
          "X-Response-Time": `${Date.now() - startTime}ms`,
          "Cache-Control": "no-cache",
        },
      }
    );
  }
}

/**
 * Generate demo images without external API calls
 */
function generateDemoImages(query: string, page: number) {
  const baseId = `${query}-${page}-${Date.now()}`;
  const images = [];
  
  for (let i = 0; i < 12; i++) {
    const seed = `${baseId}-${i}`;
    images.push({
      id: `demo-${seed}`,
      urls: {
        small: `https://picsum.photos/400/300?random=${seed}`,
        regular: `https://picsum.photos/800/600?random=${seed}`,
        full: `https://picsum.photos/1600/1200?random=${seed}`,
      },
      alt_description: `Demo image ${i + 1} for "${query}"`,
      user: {
        name: "Demo User",
        username: "demo",
      },
      width: 1600,
      height: 1200,
      color: "#" + Math.floor(Math.random()*16777215).toString(16),
    });
  }
  
  return {
    images,
    totalPages: 5,
    currentPage: page,
    total: 60,
    hasNextPage: page < 5,
  };
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
