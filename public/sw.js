const CACHE_NAME = 'describe-it-v1.0.0';
const RUNTIME_CACHE = 'describe-it-runtime';
const IMAGE_CACHE = 'describe-it-images';
const API_CACHE = 'describe-it-api';

// Resources to cache on install
const STATIC_RESOURCES = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/offline.html'
];

// API endpoints to cache
const CACHEABLE_API_ROUTES = [
  '/api/images/search',
  '/api/descriptions/generate',
  '/api/qa/generate',
  '/api/phrases/extract',
  '/api/search/descriptions',
  '/api/search/vocabulary'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static resources');
      return cache.addAll(STATIC_RESOURCES);
    })
  );
  
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && 
              cacheName !== IMAGE_CACHE && 
              cacheName !== API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  event.waitUntil(self.clients.claim());
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  if (request.method !== 'GET') {
    return;
  }
  
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const isCacheableAPI = CACHEABLE_API_ROUTES.some(route => 
    url.pathname.startsWith(route)
  );
  
  if (!isCacheableAPI) {
    return fetch(request);
  }
  
  const cache = await caches.open(API_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const responseClone = networkResponse.clone();
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cache', 'network');
      headers.set('sw-cache-time', new Date().toISOString());
      
      const cachedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse);
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache');
  }
  
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    const headers = new Headers(cachedResponse.headers);
    headers.set('sw-cache', 'cache-fallback');
    
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers: headers
    });
  }
  
  return new Response(JSON.stringify({ 
    error: 'Network unavailable and no cached data',
    offline: true 
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    return new Response(createPlaceholderImage(), {
      headers: { 'Content-Type': 'image/svg+xml' }
    });
  }
}

// Handle static assets with stale-while-revalidate
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    return cachedResponse;
  });
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  return fetchPromise;
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const offlinePage = await cache.match('/');
    if (offlinePage) {
      return offlinePage;
    }
    
    return new Response(
      '<html><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Utility functions
function isImageRequest(request) {
  return request.destination === 'image' || 
         request.url.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i);
}

function isStaticAsset(request) {
  return request.url.includes('/_next/static/') ||
         request.url.includes('/static/') ||
         request.url.match(/\.(js|css|woff2?|ttf|eot)$/i);
}

function createPlaceholderImage() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="#f0f0f0"/>
    <text x="200" y="150" font-family="Arial" font-size="18" fill="#999" text-anchor="middle">
      Image not available
    </text>
  </svg>`;
}

// Background sync for offline changes
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-vocabulary') {
    event.waitUntil(syncVocabulary());
  } else if (event.tag === 'sync-descriptions') {
    event.waitUntil(syncDescriptions());
  }
});

// Sync vocabulary items
async function syncVocabulary() {
  try {
    const db = await openIndexedDB();
    const pendingItems = await getPendingItems(db, 'vocabulary');

    for (const item of pendingItems) {
      try {
        const response = await fetch('/api/vocabulary/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        });

        if (response.ok) {
          await removePendingItem(db, 'vocabulary', item.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync vocabulary item:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Vocabulary sync failed:', error);
  }
}

// Sync descriptions
async function syncDescriptions() {
  try {
    const db = await openIndexedDB();
    const pendingItems = await getPendingItems(db, 'descriptions');

    for (const item of pendingItems) {
      try {
        const response = await fetch('/api/descriptions/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        });

        if (response.ok) {
          await removePendingItem(db, 'descriptions', item.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync description:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Description sync failed:', error);
  }
}

// IndexedDB helpers for background sync
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('describe-it-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('vocabulary')) {
        db.createObjectStore('vocabulary', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('descriptions')) {
        db.createObjectStore('descriptions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getPendingItems(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removePendingItem(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});