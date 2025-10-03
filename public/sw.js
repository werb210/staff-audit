/**
 * PWA V2 Service Worker - Versioned Caches & Update Flow
 * Enhanced caching strategy with proper versioning and update notifications
 */

const CACHE_VERSION = 'v2.1';
const CACHE_NAMES = {
  STATIC: `boreal-static-${CACHE_VERSION}`,
  DYNAMIC: `boreal-dynamic-${CACHE_VERSION}`,
  API: `boreal-api-${CACHE_VERSION}`
};

// Critical resources to precache
const PRECACHE_RESOURCES = [
  '/',
  '/login',
  '/portal',
  '/applications',
  '/communications',
  '/static/js/bundle.js',
  '/static/css/bundle.css',
  '/manifest.json'
];

// API routes to cache
const API_CACHE_PATTERNS = [
  /^\/api\/health/,
  /^\/api\/auth-fixed\/session/,
  /^\/api\/applications/,
  /^\/api\/pipeline/
];

/**
 * Install Event - Precache critical resources
 */
self.addEventListener('install', (event) => {
  console.log('🔧 [SW-V2] Installing Service Worker v2.1');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAMES.STATIC);
        
        // Precache critical resources
        const cachePromises = PRECACHE_RESOURCES.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log(`✅ [SW-V2] Precached: ${url}`);
            }
          } catch (error) {
            console.warn(`⚠️ [SW-V2] Failed to precache: ${url}`, error);
          }
        });
        
        await Promise.all(cachePromises);
        
        console.log('✅ [SW-V2] All critical resources precached');
        
        // Skip waiting to activate immediately
        self.skipWaiting();
        
      } catch (error) {
        console.error('❌ [SW-V2] Install failed:', error);
      }
    })()
  );
});

/**
 * Activate Event - Clean old caches and claim clients
 */
self.addEventListener('activate', (event) => {
  console.log('🚀 [SW-V2] Activating Service Worker v2.1');
  
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          !Object.values(CACHE_NAMES).includes(name)
        );
        
        await Promise.all(
          oldCaches.map(cacheName => {
            console.log(`🧹 [SW-V2] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
        
        // Claim all clients immediately
        await self.clients.claim();
        
        console.log('✅ [SW-V2] Service Worker activated and claimed clients');
        
        // Notify clients of activation
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: CACHE_VERSION,
            message: 'Service Worker v2.1 activated successfully'
          });
        });
        
      } catch (error) {
        console.error('❌ [SW-V2] Activation failed:', error);
      }
    })()
  );
});

/**
 * Fetch Event - Network-first with cache fallback
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        // API requests - network first with cache fallback
        if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
          return handleAPIRequest(request);
        }
        
        // Static resources - cache first with network fallback
        if (isStaticResource(url.pathname)) {
          return handleStaticRequest(request);
        }
        
        // Navigation requests - network first with cache fallback
        if (request.mode === 'navigate') {
          return handleNavigationRequest(request);
        }
        
        // Default: network first
        return fetch(request);
        
      } catch (error) {
        console.error('❌ [SW-V2] Fetch error:', error);
        return fetch(request);
      }
    })()
  );
});

/**
 * Handle API requests with network-first strategy
 */
async function handleAPIRequest(request) {
  const cache = await caches.open(CACHE_NAMES.API);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone and cache the response
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('🔄 [SW-V2] Network failed, trying cache for:', request.url);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Handle static resources with cache-first strategy
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAMES.STATIC);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Cache miss, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('❌ [SW-V2] Failed to fetch static resource:', request.url);
    throw error;
  }
}

/**
 * Handle navigation requests
 */
async function handleNavigationRequest(request) {
  const cache = await caches.open(CACHE_NAMES.DYNAMIC);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Last resort: serve cached index.html
    const indexResponse = await cache.match('/');
    if (indexResponse) {
      return indexResponse;
    }
    
    throw error;
  }
}

/**
 * Check if resource is static (CSS, JS, images, etc.)
 */
function isStaticResource(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) || pathname.startsWith('/static/');
}

/**
 * Background Sync Event
 */
self.addEventListener('sync', (event) => {
  console.log('🔄 [SW-V2] Background sync triggered:', event.tag);
  
  if (event.tag === 'call-actions-sync') {
    event.waitUntil(syncCallActions());
  }
  
  if (event.tag === 'application-updates-sync') {
    event.waitUntil(syncApplicationUpdates());
  }
});

/**
 * Sync call actions when back online
 */
async function syncCallActions() {
  try {
    console.log('📞 [SW-V2] Syncing call actions...');
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_CALL_ACTIONS',
        message: 'Syncing call actions with server'
      });
    });
    
  } catch (error) {
    console.error('❌ [SW-V2] Call actions sync failed:', error);
  }
}

/**
 * Sync application updates when back online
 */
async function syncApplicationUpdates() {
  try {
    console.log('📋 [SW-V2] Syncing application updates...');
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_APPLICATIONS',
        message: 'Syncing application updates with server'
      });
    });
    
  } catch (error) {
    console.error('❌ [SW-V2] Application updates sync failed:', error);
  }
}

/**
 * Push Event - Handle push notifications with deep-linking support
 */
self.addEventListener('push', (event) => {
  let data = {};
  try { 
    data = event.data ? event.data.json() : {}; 
  } catch (e) {
    console.error('📱 [SW-V2] Failed to parse push data:', e);
  }
  
  const title = data.title || "Boreal Financial";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/pwa-192.png",
    badge: data.badge || "/icons/badge.png",
    data: data.data || {},
    tag: "bfs-notification",
    renotify: true,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: "view",
        title: "View Application",
        icon: "/icons/view.png"
      },
      {
        action: "dismiss",
        title: "Dismiss",
        icon: "/icons/close.png"
      }
    ]
  };
  
  console.log("📱 [SW-V2] Received push notification:", { title, data: data.data });
  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Notification Click Event with silo-aware deep-linking
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || "/";
  const silo = event.notification.data?.silo || "bf";
  
  console.log("📱 [SW-V2] Notification clicked:", { url, silo, action: event.action });
  
  if (event.action === "dismiss") {
    return; // Just close the notification
  }
  
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window with the target URL
      for (const client of clientList) {
        if (client.url.includes("/portal") || client.url.includes("/pipeline")) {
          client.navigate(url);
          return client.focus();
        }
      }
      
      // No existing window found, open new one
      return clients.openWindow(url);
    }).catch((err) => {
      console.error("📱 [SW-V2] Error handling notification click:", err);
      return clients.openWindow("/");
    })
  );
});

console.log('🚀 [SW-V2] Service Worker v2.1 loaded successfully');