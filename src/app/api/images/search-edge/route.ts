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
 * Generate demo images using stable Unsplash image IDs
 */
function generateDemoImages(query: string, page: number) {
  // Stable Unsplash photo IDs for reliable demo images
  const stableImages = [
    { id: '1506905925346-21bda4d32df4', description: 'Mountain landscape' },
    { id: '1472214103451-9374bd1c798e', description: 'Forest pathway' },
    { id: '1501594907352-04cda38ebc29', description: 'Ocean waves' },
    { id: '1469474968028-56623f02e42e', description: 'Nature scene' },
    { id: '1441974231531-c6227db76b6e', description: 'Rocky mountains' },
    { id: '1470071459604-8b5ce755-dae1', description: 'Desert landscape' },
    { id: '1426604966848-d7adac402bff', description: 'Arctic vista' },
    { id: '1518173946687-a19c8550c4fd', description: 'Sunset view' },
    { id: '1507003211169-0a1dd7228f2d', description: 'Beach scene' },
    { id: '1441974231531-c6227db76b6e', description: 'Mountain peak' },
    { id: '1472396821693-b928d1c53b87', description: 'Forest trees' },
    { id: '1501594907352-04cda38ebc29', description: 'Ocean vista' },
  ];

  const images = [];
  const pageOffset = (page - 1) * 12;

  for (let i = 0; i < 12; i++) {
    const imageIndex = i % stableImages.length;
    const stableImage = stableImages[imageIndex];
    const imageId = pageOffset + i + 1;

    images.push({
      id: `demo-${query}-${stableImage.id}`,
      urls: {
        small: `https://images.unsplash.com/photo-${stableImage.id}?w=400`,
        regular: `https://images.unsplash.com/photo-${stableImage.id}?w=1080`,
        full: `https://images.unsplash.com/photo-${stableImage.id}?w=1920`,
      },
      alt_description: `${query} - ${stableImage.description}`,
      user: {
        name: "Unsplash Demo",
        username: "unsplash",
      },
      width: 1920,
      height: 1080,
      color: "#" + Math.floor(Math.random()*16777215).toString(16),
    });
  }

  return {
    images,
    totalPages: 10,
    currentPage: page,
    total: 120,
    hasNextPage: page < 10,
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
