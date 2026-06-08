/**
 * Service Worker for Prime Hotels Intranet
 * 
 * Handles:
 * - Push notifications
 * - Background sync for offline actions
 * - Cache management for offline access
 */

const CACHE_NAME = 'prime-hotels-intranet-v2';
const STATIC_ASSETS = [
  '/manifest.json',
  '/prime-logo-light.png',
  '/prime-logo-dark.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(() => {
      // Silent fail - don't block installation
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Never cache navigation requests (HTML documents) - always fetch fresh from network
  // This prevents stale/error HTML pages from being served as a white screen
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    return;
  }

  // Skip API requests - don't cache them
  if (event.request.url.includes('/api/') ||
      event.request.url.includes('/functions/') ||
      event.request.url.includes('/auth/') ||
      event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses for static assets
        if (!response.ok) return response;

        // Clone the response before caching
        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'Prime Hotels Intranet',
      body: event.data.text(),
    };
  }

  const options = {
    body: data.body || 'New notification',
    icon: data.icon || '/prime-logo-light.png',
    badge: data.badge || '/prime-logo-light.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Prime Hotels Intranet',
      options
    )
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window client is already open, focus it
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'phg-sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
});

// Message event from main thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

/**
 * Sync pending actions from IndexedDB or localStorage
 */
async function syncPendingActions() {
  try {
    // Get pending actions from all clients
    const clients = await self.clients.matchAll({ type: 'window' });
    
    for (const client of clients) {
      client.postMessage({
        type: 'SYNC_PENDING_ACTIONS',
      });
    }
  } catch (error) {
    console.error('[SW] Error syncing pending actions:', error);
  }
}

/**
 * Store push subscription in the database
 * This is called from the main thread after subscription
 */
async function storeSubscription(subscription) {
  try {
    // Send subscription to backend
    const response = await fetch('/functions/v1/store-push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to store subscription');
    }

    return true;
  } catch (error) {
    console.error('[SW] Error storing subscription:', error);
    return false;
  }
}

// Export for use in main thread
self.storePushSubscription = storeSubscription;
