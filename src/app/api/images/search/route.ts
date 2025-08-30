import { NextRequest, NextResponse } from 'next/server'
import { unsplashService } from '@/lib/api/unsplash'
import { z } from 'zod'

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
  for (const [key, value] of cache.entries()) {
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

// Add prefetch endpoint for critical images
export async function HEAD(request: NextRequest) {
  // Return headers only for prefetch requests
  return new NextResponse(null, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
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
      
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
          'ETag': cached.etag,
          'X-Cache': 'HIT',
          'X-Response-Time': `${performance.now() - startTime}ms`
        }
      })
    }
    
    // Fetch fresh data
    const results = await unsplashService.searchImages(params)
    const etag = generateETag(results)
    
    // Cache the results
    cache.set(cacheKey, {
      data: results,
      timestamp: now,
      etag
    })
    
    // Clean old cache entries
    cleanCache()
    
    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'ETag': etag,
        'X-Cache': 'MISS',
        'X-Response-Time': `${performance.now() - startTime}ms`,
        'X-Rate-Limit-Remaining': '1000', // Mock rate limit
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
      // console.log('Serving stale cache due to error')
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=3600',
          'ETag': cached.etag,
          'X-Cache': 'STALE-ERROR',
          'X-Response-Time': `${responseTime}ms`,
          'X-Error': 'true'
        }
      })
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to search images',
        timestamp: new Date().toISOString(),
        retry: true
      },
      { 
        status: 500,
        headers: {
          'Retry-After': '60',
          'X-Response-Time': `${responseTime}ms`
        }
      }
    )
  }
}