// Service Worker for PWA functionality and caching
const CACHE_NAME = 'describe-it-v1.0.0';
const STATIC_CACHE_NAME = 'describe-it-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'describe-it-dynamic-v1.0.0';
const IMAGE_CACHE_NAME = 'describe-it-images-v1.0.0';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico',
  '/_next/static/css/',
  '/_next/static/js/',
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^https:\/\/api\.unsplash\.com\//,
  /^\/api\/images\/search/,
  /^\/api\/descriptions/,
  /^\/api\/questions/,
];

// Image domains to cache
const IMAGE_DOMAINS = [
  'images.unsplash.com',
  'plus.unsplash.com',
  'res.cloudinary.com',
  'picsum.photos'
];

// Cache size limits
const MAX_CACHE_SIZE = {
  static: 50,
  dynamic: 100,
  images: 200
};

// Cache duration (in milliseconds)
const CACHE_DURATION = {
  static: 7 * 24 * 60 * 60 * 1000, // 7 days
  dynamic: 24 * 60 * 60 * 1000,    // 1 day
  images: 30 * 24 * 60 * 60 * 1000  // 30 days
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching static assets');
      return cache.addAll(STATIC_ASSETS.filter(url => !url.includes('_next')));
    }).then(() => {
      // Force activation
      self.skipWaiting();
    }).catch(error => {
      console.error('Service Worker: Install failed', error);
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME && 
              cacheName !== IMAGE_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients
      return self.clients.claim();
    }).then(() => {
      // Notify clients about activation
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ 
            type: 'SW_ACTIVATED',
            cacheName: CACHE_NAME 
          });
        });
      });
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different resource types with appropriate strategies
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleDefaultRequest(request));
  }
});

// Strategy: Cache First (for static assets)
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      await limitCacheSize(STATIC_CACHE_NAME, MAX_CACHE_SIZE.static);
    }
    return networkResponse;
  } catch (error) {
    console.error('Static asset fetch failed:', error);
    return new Response('Asset not available offline', { status: 503 });
  }
}

// Strategy: Network First with cache fallback (for API requests)
async function handleAPIRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      await limitCacheSize(DYNAMIC_CACHE_NAME, MAX_CACHE_SIZE.dynamic);
      
      // Notify clients about cache update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ 
            type: 'CACHE_UPDATED',
            url: request.url,
            timestamp: Date.now()
          });
        });
      });
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add header to indicate stale content
      const response = cachedResponse.clone();
      response.headers.set('X-Cache-Status', 'stale');
      return response;
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Service unavailable offline',
        offline: true,
        timestamp: Date.now()
      }), 
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Strategy: Cache First with network update (for images)
async function handleImageRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Return cached version immediately
      fetchAndUpdateCache(request);
      return cachedResponse;
    }

    // If not cached, fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(IMAGE_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      await limitCacheSize(IMAGE_CACHE_NAME, MAX_CACHE_SIZE.images);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Image fetch failed:', error);
    
    // Return placeholder or cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return a placeholder image
    return new Response('', { status: 503 });
  }
}

// Background fetch and update cache
async function fetchAndUpdateCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(IMAGE_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // Silently fail - we already have cached version
  }
}

// Strategy: Network First with offline page fallback (for navigation)
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('Navigation offline, serving cached page');
    
    const cachedResponse = await caches.match('/offline.html');
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Default strategy: Network First
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Not available offline', { status: 503 });
  }
}

// Utility functions
function isStaticAsset(request) {
  return request.url.includes('/_next/static/') ||
         request.url.includes('/favicon.ico') ||
         request.url.includes('/manifest.json');
}

function isAPIRequest(request) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

function isImageRequest(request) {
  const url = new URL(request.url);
  return IMAGE_DOMAINS.includes(url.hostname) ||
         request.destination === 'image' ||
         /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.pathname);
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// Cache management
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    // Remove oldest entries
    const keysToDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

// Clean expired entries
async function cleanExpiredEntries() {
  const cacheNames = await caches.keys();
  const now = Date.now();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const dateHeader = response.headers.get('date');
        const cacheDate = dateHeader ? new Date(dateHeader).getTime() : 0;
        const maxAge = getCacheDuration(cacheName);
        
        if (now - cacheDate > maxAge) {
          await cache.delete(request);
        }
      }
    }
  }
}

function getCacheDuration(cacheName) {
  if (cacheName.includes('static')) return CACHE_DURATION.static;
  if (cacheName.includes('images')) return CACHE_DURATION.images;
  return CACHE_DURATION.dynamic;
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'retry-failed-requests') {
    event.waitUntil(retryFailedRequests());
  }
});

async function retryFailedRequests() {
  // Implement retry logic for failed API requests
  console.log('Retrying failed requests...');
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { data } = event;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0]?.postMessage({ type: 'CACHE_STATUS', ...status });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0]?.postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
      
    case 'PRELOAD_ROUTES':
      preloadRoutes(data.routes);
      break;
  }
});

async function getCacheStatus() {
  const cacheNames = await caches.keys();
  let totalCached = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    totalCached += keys.length;
  }
  
  return { totalCached, cacheNames };
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}

async function preloadRoutes(routes) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  
  for (const route of routes) {
    try {
      const response = await fetch(route);
      if (response.ok) {
        await cache.put(route, response);
      }
    } catch (error) {
      console.warn(`Failed to preload route: ${route}`, error);
    }
  }
}

// Periodic cache cleanup
setInterval(cleanExpiredEntries, 60 * 60 * 1000); // Every hour

console.log('Service Worker: Loaded and ready');