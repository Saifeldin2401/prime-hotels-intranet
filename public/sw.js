/**
 * Service Worker for Prime Hotels PWA
 * 
 * Provides offline caching for static assets and API responses.
 */

const CACHE_NAME = 'prime-hotels-v1';
const STATIC_CACHE = 'prime-hotels-static-v1';
const DYNAMIC_CACHE = 'prime-hotels-dynamic-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/prime-logo-dark.png',
    '/prime-logo-light.png',
    '/vite.svg'
];

// API routes to cache with network-first strategy
const API_ROUTES = [
    '/rest/v1/announcements',
    '/rest/v1/messages',
    '/rest/v1/training_modules'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
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
                    .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Chrome extensions and non-http(s)
    if (!url.protocol.startsWith('http')) return;

    // API requests - network first, fallback to cache
    if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Static assets - cache first, fallback to network
    if (
        request.destination === 'image' ||
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'font' ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.ico')
    ) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // HTML pages - network first with offline fallback
    if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(networkFirstWithOffline(request));
        return;
    }

    // Default - network with cache fallback
    event.respondWith(networkFirst(request));
});

// Cache-first strategy
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('Asset not available offline', { status: 503 });
    }
}

// Network-first strategy
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response('Network error', { status: 503 });
    }
}

// Network-first with offline fallback for HTML
async function networkFirstWithOffline(request) {
    try {
        const response = await fetch(request);
        if (response.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;

        // Return cached index.html for SPA navigation
        const indexCached = await caches.match('/index.html');
        if (indexCached) return indexCached;

        return new Response('You are offline', {
            status: 503,
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// Handle push notifications (future)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});
