import { NextRequest, NextResponse } from 'next/server'
import { unsplashService } from '@/lib/api/unsplash'
import { z } from 'zod'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, If-None-Match',
}

// Force dynamic rendering to fix build error
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Cache implementation
const cache = new Map<string, { data: any; timestamp: number; etag: string }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 100

const searchSchema = z.object({
  query: z.string().min(1).max(100),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(30).default(20),
  orientation: z.enum(['landscape', 'portrait', 'squarish']).optional(),
  color: z.string().optional(),
  orderBy: z.enum(['relevant', 'latest', 'oldest', 'popular']).optional(),
})

// Generate cache key
function getCacheKey(params: any): string {
  return JSON.stringify(params)
}

// Generate ETag
function generateETag(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16)
}

// Clean old cache entries
function cleanCache() {
  const now = Date.now()
  for (const [key, value] of Array.from(cache.entries())) {
    if (now - value.timestamp > CACHE_DURATION) {
      cache.delete(key)
    }
  }
  
  // Limit cache size
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    for (let i = 0; i < entries.length - MAX_CACHE_SIZE; i++) {
      cache.delete(entries[i][0])
    }
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// Add prefetch endpoint for critical images
export async function HEAD(request: NextRequest) {
  // Return headers only for prefetch requests
  return new NextResponse(null, {
    headers: {
      ...corsHeaders,
      'Cache-Control': 'public, max-age=300',
    }
  })
}

export async function GET(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const params = searchSchema.parse(searchParams)
    
    const cacheKey = getCacheKey(params)
    const now = Date.now()
    
    // Check cache
    const cached = cache.get(cacheKey)
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      // Check if client has cached version
      const clientETag = request.headers.get('if-none-match')
      if (clientETag === cached.etag) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
            'ETag': cached.etag,
            'X-Cache': 'HIT-304',
            'X-Response-Time': `${performance.now() - startTime}ms`
          }
        })
      }
      
      // Transform cached data to match expected interface
      const transformedCached = {
        images: cached.data.results || cached.data.images || [],
        totalPages: cached.data.total_pages || cached.data.totalPages || 1,
        currentPage: params.page,
        total: cached.data.total || 0,
        hasNextPage: (params.page < (cached.data.total_pages || cached.data.totalPages || 1))
      };

      return NextResponse.json(transformedCached, {
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
          'ETag': cached.etag,
          'X-Cache': 'HIT',
          'X-Response-Time': `${performance.now() - startTime}ms`
        }
      })
    }
    
    // Fetch data (unsplashService handles demo mode internally)
    const results = await unsplashService.searchImages(params as any)
    const etag = generateETag(results)
    
    // Cache the results
    cache.set(cacheKey, {
      data: results,
      timestamp: now,
      etag
    })
    
    // Clean old cache entries
    cleanCache()
    
    // Transform results to match expected interface
    const transformedResults = {
      images: results.results || results.images || [],
      totalPages: results.total_pages || results.totalPages || 1,
      currentPage: params.page,
      total: results.total || 0,
      hasNextPage: (params.page < (results.total_pages || results.totalPages || 1))
    };

    return NextResponse.json(transformedResults, {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'ETag': etag,
        'X-Cache': 'MISS',
        'X-Response-Time': `${performance.now() - startTime}ms`,
        'X-Rate-Limit-Remaining': '1000', // Mock rate limit
        'X-Demo-Mode': !process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ? 'true' : 'false',
      }
    })
    
  } catch (error) {
    const responseTime = performance.now() - startTime
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters', 
          details: error.errors,
          timestamp: new Date().toISOString()
        },
        { 
          status: 400,
          headers: {
            ...corsHeaders,
            'X-Response-Time': `${responseTime}ms`
          }
        }
      )
    }
    
    console.error('Image search error:', error)
    
    // Return cached data if available during error
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const cacheKey = getCacheKey(searchParams)
    const cached = cache.get(cacheKey)
    
    if (cached) {
      // Transform stale cached data to match expected interface
      const transformedStale = {
        images: cached.data.results || cached.data.images || [],
        totalPages: cached.data.total_pages || cached.data.totalPages || 1,
        currentPage: searchParams.page || 1,
        total: cached.data.total || 0,
        hasNextPage: ((searchParams.page || 1) < (cached.data.total_pages || cached.data.totalPages || 1))
      };
      
      return NextResponse.json(transformedStale, {
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=3600',
          'ETag': cached.etag,
          'X-Cache': 'STALE-ERROR',
          'X-Response-Time': `${responseTime}ms`,
          'X-Error': 'true'
        }
      })
    }
    
    // Return demo data as final fallback
    const demoFallback = {
      images: [
        {
          id: 'fallback-1',
          urls: {
            small: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
            regular: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
            full: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200'
          },
          alt_description: 'Error fallback: Mountain landscape',
          description: 'Fallback image due to API error',
          user: { name: 'Fallback User', username: 'fallback' },
          width: 1200,
          height: 800,
          color: '#4A90E2',
          likes: 0,
          created_at: new Date().toISOString()
        }
      ],
      total: 1,
      totalPages: 1,
      currentPage: 1,
      hasNextPage: false
    };
    
    return NextResponse.json(demoFallback, {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'X-Cache': 'ERROR-FALLBACK',
        'X-Response-Time': `${responseTime}ms`,
        'X-Error': 'true'
      }
    });
  }
}