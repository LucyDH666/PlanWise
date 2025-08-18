/* PlanWise Service Worker
   Provides offline functionality and caching for PWA features
*/

const CACHE_NAME = 'planwise-v1.1.0';
const STATIC_CACHE = 'planwise-static-v1.1.0';
const DYNAMIC_CACHE = 'planwise-dynamic-v1.1.0';
const OFFLINE_CACHE = 'planwise-offline-v1.1.0';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/services/api.js',
  '/services/scheduler.js',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/main.min.css',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/main.min.js'
];

// Offline fallback page
const OFFLINE_PAGE = '/offline.html';

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (isStaticFile(request)) {
    event.respondWith(handleStaticFile(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Check if request is for a static file
function isStaticFile(request) {
  const url = new URL(request.url);
  return STATIC_FILES.some(file => url.pathname.endsWith(file.split('/').pop()));
}

// Check if request is for API
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || url.pathname.includes('api.planwise.com');
}

// Handle static file requests
async function handleStaticFile(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Static file fetch failed', error);
    
    // Return offline page for HTML requests
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Handle API requests
async function handleAPIRequest(request) {
  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: API request failed', error);
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline data for localStorage-based API
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'Service is currently offline',
      data: null
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle dynamic requests
async function handleDynamicRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Dynamic request failed', error);
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(performBackgroundSync());
  }
});

// Perform background sync
async function performBackgroundSync() {
  try {
    // Get pending actions from IndexedDB
    const pendingActions = await getPendingActions();
    
    for (const action of pendingActions) {
      try {
        await performAction(action);
        await removePendingAction(action.id);
      } catch (error) {
        console.error('Service Worker: Failed to sync action', action, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// Get pending actions from IndexedDB
async function getPendingActions() {
  // This would be implemented with IndexedDB
  // For now, return empty array
  return [];
}

// Perform a pending action
async function performAction(action) {
  // This would be implemented based on action type
  console.log('Service Worker: Performing action', action);
}

// Remove completed action
async function removePendingAction(actionId) {
  // This would be implemented with IndexedDB
  console.log('Service Worker: Removing action', actionId);
}

// Push notification handling
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Nieuwe update beschikbaar',
    icon: '/manifest.json',
    badge: '/manifest.json',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Bekijk',
        icon: '/manifest.json'
      },
      {
        action: 'close',
        title: 'Sluiten',
        icon: '/manifest.json'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('PlanWise', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', event => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CACHE_TECHNICIAN_DATA') {
    event.waitUntil(cacheTechnicianData(event.data.data));
  }
  
  if (event.data && event.data.type === 'SYNC_OFFLINE_DATA') {
    event.waitUntil(syncOfflineData());
  }
});

// Cache technician data for offline use
async function cacheTechnicianData(data) {
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    await cache.put('/api/technician/tasks', new Response(JSON.stringify(data)));
    console.log('Service Worker: Technician data cached for offline use');
  } catch (error) {
    console.error('Service Worker: Failed to cache technician data', error);
  }
}

// Sync offline data when back online
async function syncOfflineData() {
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    const response = await cache.match('/api/technician/tasks');
    
    if (response) {
      const data = await response.json();
      console.log('Service Worker: Syncing offline data', data);
      
      // Here you would send the data to the server
      // For now, just log it
      await cache.delete('/api/technician/tasks');
    }
  } catch (error) {
    console.error('Service Worker: Failed to sync offline data', error);
  }
}

// Enhanced offline page handling
async function handleOfflineRequest(request) {
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return cache.match(OFFLINE_PAGE) || new Response('Offline - Probeer later opnieuw');
    }
    
    return new Response('Offline - Geen data beschikbaar');
  } catch (error) {
    console.error('Service Worker: Offline handling failed', error);
    return new Response('Offline - Fout opgetreden');
  }
}
