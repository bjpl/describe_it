// Cloudflare Worker for CDN edge caching and optimization
// Deploy this to Cloudflare Workers for global edge caching

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cache = caches.default;

    // Only handle GET requests
    if (request.method !== 'GET') {
      return fetch(request);
    }

    // Check if this is an API request we should cache
    const shouldCache = url.pathname.startsWith('/api/descriptions/') ||
                       url.pathname.startsWith('/api/cache/') ||
                       url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);

    if (!shouldCache) {
      return fetch(request);
    }

    // Create cache key
    const cacheKey = new Request(url.toString(), request);
    
    // Check cache first
    let response = await cache.match(cacheKey);
    
    if (response) {
      // Cache hit - add cache status header
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('CF-Cache-Status', 'HIT');
      newResponse.headers.set('Cache-Control', 'public, max-age=3600');
      return newResponse;
    }

    // Cache miss - fetch from origin
    response = await fetch(request);
    
    if (response.ok) {
      // Clone response for caching
      const responseToCache = response.clone();
      
      // Determine cache TTL based on content type
      const contentType = response.headers.get('content-type') || '';
      let cacheTTL = 3600; // Default 1 hour
      
      if (contentType.includes('image/')) {
        cacheTTL = 86400; // Images: 24 hours
      } else if (url.pathname.includes('/api/descriptions/')) {
        cacheTTL = 1800; // API responses: 30 minutes
      } else if (url.pathname.includes('/api/cache/')) {
        cacheTTL = 300; // Cache API: 5 minutes
      }

      // Set cache headers
      const cacheHeaders = new Headers(responseToCache.headers);
      cacheHeaders.set('Cache-Control', `public, max-age=${cacheTTL}`);
      cacheHeaders.set('CF-Cache-Status', 'MISS');
      cacheHeaders.set('CF-Edge-Cache', 'true');
      
      // Add performance headers
      cacheHeaders.set('X-Cache-TTL', cacheTTL.toString());
      cacheHeaders.set('X-Timestamp', Date.now().toString());
      
      // Create cacheable response
      const cacheableResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: cacheHeaders,
      });

      // Store in cache asynchronously
      ctx.waitUntil(cache.put(cacheKey, cacheableResponse.clone()));
      
      return cacheableResponse;
    }

    return response;
  },
};

// Advanced caching configuration
const CACHE_CONFIG = {
  // Cache TTL by content type
  ttl: {
    'image/*': 86400,           // 24 hours
    'application/json': 1800,   // 30 minutes
    'text/html': 3600,          // 1 hour
    'text/css': 86400,          // 24 hours
    'application/javascript': 86400, // 24 hours
  },
  
  // Cache by URL patterns
  patterns: {
    '/api/descriptions/*': {
      ttl: 1800,
      bypassOnError: true,
      compression: true,
    },
    '/api/cache/*': {
      ttl: 300,
      bypassOnError: false,
      compression: false,
    },
    '/static/*': {
      ttl: 604800, // 7 days
      bypassOnError: true,
      compression: true,
    },
  },
  
  // Compression settings
  compression: {
    minSize: 1024, // Minimum size to compress (1KB)
    types: [
      'text/html',
      'text/css',
      'application/javascript',
      'application/json',
      'text/plain',
    ],
  },
};

// Image optimization worker
export const imageOptimizationWorker = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Check if this is an image optimization request
    if (!url.pathname.startsWith('/optimize/')) {
      return new Response('Not Found', { status: 404 });
    }

    // Extract image URL and optimization parameters
    const imageUrl = url.searchParams.get('url');
    const width = parseInt(url.searchParams.get('w') || '0');
    const height = parseInt(url.searchParams.get('h') || '0');
    const quality = parseInt(url.searchParams.get('q') || '85');
    const format = url.searchParams.get('f') || 'webp';

    if (!imageUrl) {
      return new Response('Missing image URL', { status: 400 });
    }

    // Create cache key for optimized image
    const cacheKey = `img:${imageUrl}:${width}:${height}:${quality}:${format}`;
    const cache = caches.default;
    
    // Check cache
    let response = await cache.match(cacheKey);
    if (response) {
      return response;
    }

    try {
      // Fetch original image
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return new Response('Image not found', { status: 404 });
      }

      // Optimize image using Cloudflare Image Resizing
      const optimizedUrl = new URL('/cdn-cgi/image/', request.url);
      optimizedUrl.searchParams.set('width', width.toString());
      optimizedUrl.searchParams.set('height', height.toString());
      optimizedUrl.searchParams.set('quality', quality.toString());
      optimizedUrl.searchParams.set('format', format);
      optimizedUrl.searchParams.set('url', imageUrl);

      const optimizedResponse = await fetch(optimizedUrl.toString());
      
      if (optimizedResponse.ok) {
        // Add cache headers
        const headers = new Headers(optimizedResponse.headers);
        headers.set('Cache-Control', 'public, max-age=86400');
        headers.set('CF-Cache-Status', 'MISS');
        
        const cachedResponse = new Response(optimizedResponse.body, {
          status: optimizedResponse.status,
          headers,
        });

        // Cache the optimized image
        ctx.waitUntil(cache.put(cacheKey, cachedResponse.clone()));
        
        return cachedResponse;
      }

      return optimizedResponse;

    } catch (error) {
      console.error('Image optimization error:', error);
      return new Response('Optimization failed', { status: 500 });
    }
  },
};

// Geographic routing worker
export const geoRoutingWorker = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const country = request.cf?.country || 'US';
    const continent = request.cf?.continent || 'NA';

    // Route to regional API endpoints based on geography
    const regionalEndpoints = {
      'US': env.US_API_ENDPOINT,
      'EU': env.EU_API_ENDPOINT,
      'ASIA': env.ASIA_API_ENDPOINT,
    };

    let targetEndpoint = env.DEFAULT_API_ENDPOINT;

    // Determine best endpoint
    if (continent === 'EU' && regionalEndpoints.EU) {
      targetEndpoint = regionalEndpoints.EU;
    } else if (continent === 'AS' && regionalEndpoints.ASIA) {
      targetEndpoint = regionalEndpoints.ASIA;
    } else if (regionalEndpoints.US) {
      targetEndpoint = regionalEndpoints.US;
    }

    // Rewrite URL to target endpoint
    const targetUrl = new URL(url.pathname + url.search, targetEndpoint);
    
    // Forward request with additional headers
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),
        'X-Forwarded-Country': country,
        'X-Forwarded-Continent': continent,
        'X-Original-Host': url.hostname,
      },
      body: request.body,
    });

    try {
      const response = await fetch(modifiedRequest);
      
      // Add routing headers to response
      const modifiedResponse = new Response(response.body, response);
      modifiedResponse.headers.set('X-Routed-To', targetEndpoint);
      modifiedResponse.headers.set('X-Client-Country', country);
      modifiedResponse.headers.set('X-Response-Time', Date.now().toString());
      
      return modifiedResponse;

    } catch (error) {
      console.error('Routing error:', error);
      
      // Fallback to default endpoint
      if (targetEndpoint !== env.DEFAULT_API_ENDPOINT) {
        const fallbackUrl = new URL(url.pathname + url.search, env.DEFAULT_API_ENDPOINT);
        return fetch(new Request(fallbackUrl, modifiedRequest));
      }
      
      return new Response('Service unavailable', { status: 503 });
    }
  },
};

// Combined worker with all optimizations
export const optimizedWorker = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Route to specific workers based on path
    if (url.pathname.startsWith('/optimize/')) {
      return imageOptimizationWorker.fetch(request, env, ctx);
    }
    
    if (url.pathname.startsWith('/geo/')) {
      return geoRoutingWorker.fetch(request, env, ctx);
    }
    
    // Default caching behavior
    return exports.default.fetch(request, env, ctx);
  },
};