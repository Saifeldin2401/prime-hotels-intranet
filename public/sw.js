/**
 * Service Worker for Prime Hotels PWA
 * 
 * Provides offline caching for static assets and API responses.
 * Implements a "Clean Shell" strategy to resolve navigation redirect errors.
 */

const VERSION = new URL(self.location.href).searchParams.get('v') || 'v8';
const CACHE_NAME = `prime-hotels-${VERSION}`;
const STATIC_CACHE = `prime-hotels-static-${VERSION}`;
const DYNAMIC_CACHE = `prime-hotels-dynamic-${VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/prime-logo-dark.png',
    '/prime-logo-light.png',
    '/vite.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log(`[SW ${VERSION}] Caching static assets`);
            return Promise.all(
                STATIC_ASSETS.map(async (asset) => {
                    try {
                        await cache.add(asset);
                    } catch (error) {
                        console.warn(`[SW ${VERSION}] Failed to cache asset:`, asset, error);
                    }
                })
            );
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
                    .filter((name) =>
                        name.startsWith('prime-hotels-') &&
                        name !== STATIC_CACHE &&
                        name !== DYNAMIC_CACHE
                    )
                    .map((name) => {
                        console.log(`[SW ${VERSION}] Deleting old cache:`, name);
                        return caches.delete(name);
                    })
            );
        })
    );
    self.clients.claim();
});

// Allow the page to activate a waiting service worker immediately.
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Fetch event handler
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Chrome extensions and non-http(s)
    if (!url.protocol.startsWith('http')) return;

    if (url.origin !== self.location.origin) return;

    // 1. Navigation Redirect Fix (App Shell Pattern)
    // Navigation requests (mode: navigate) can fail if the SW returns redirected/opaqueredirect responses.
    if (request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                const cachedShell = await getCachedAppShell(request);

                try {
                    const preloadResponse = await event.preloadResponse;
                    const safePreloadResponse = toSafeResponse(request, preloadResponse);
                    if (safePreloadResponse?.ok) {
                        await cacheAppShell(safePreloadResponse.clone());
                        return safePreloadResponse;
                    }
                } catch (error) {
                    console.warn(`[SW ${VERSION}] Navigation preload failed:`, error);
                }

                try {
                    // Prefer the original navigation request so the hosting rewrite layer can
                    // resolve SPA deep links normally.
                    const response = await fetch(request, {
                        redirect: 'follow',
                        credentials: 'same-origin',
                        cache: 'no-store',
                    });

                    const safeNetworkResponse = toSafeResponse(request, response);
                    if (safeNetworkResponse) {
                        if (safeNetworkResponse.ok) {
                            await cacheAppShell(safeNetworkResponse.clone());
                        }
                        return safeNetworkResponse;
                    }
                } catch (error) {
                    console.warn(`[SW ${VERSION}] Deep-link navigation fetch failed:`, error);
                }

                try {
                    // Fall back to the SPA shell directly if the deep-link request itself
                    // fails, for example during a transient hosting edge issue.
                    const shellUrl = new URL('/index.html', self.location.origin).toString();
                    const response = await fetch(shellUrl, {
                        redirect: 'follow',
                        credentials: 'same-origin',
                        cache: 'no-store',
                    });

                    const safeNetworkResponse = toSafeResponse(request, response);
                    if (safeNetworkResponse) {
                        if (safeNetworkResponse.ok) {
                            await cacheAppShell(safeNetworkResponse.clone());
                        }
                        return safeNetworkResponse;
                    }
                } catch (error) {
                    console.warn(`[SW ${VERSION}] Shell fetch failed:`, error);
                }

                if (cachedShell) {
                    return cachedShell;
                }

                return createOfflineShellResponse();
            })()
        );
        return;
    }

    // 2. API requests - network first, fallback to cache
    if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // 3. Static assets - cache first, fallback to network
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

    // 4. Default - network with cache fallback
    event.respondWith(networkFirst(request));
});

function toSafeResponse(request, response) {
    if (!response) return null;
    const requiresNonRedirectResponse = request.redirect !== 'follow';
    const isRedirectStatus = response.status >= 300 && response.status < 400;

    if (!response.redirected && response.type !== 'opaqueredirect') {
        if (requiresNonRedirectResponse && isRedirectStatus) {
            return null;
        }
        return response;
    }
    if (response.type === 'opaqueredirect' && requiresNonRedirectResponse) {
        return null;
    }
    if (!requiresNonRedirectResponse) {
        return response;
    }
    if (isRedirectStatus) {
        return null;
    }
    try {
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });
    } catch {
        return null;
    }
}

async function cacheAppShell(response) {
    if (!response || !response.ok) return;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return;

    const cache = await caches.open(STATIC_CACHE);
    await Promise.allSettled([
        cache.put('/index.html', response.clone()),
        cache.put('/', response.clone()),
    ]);
}

async function getCachedAppShell(request) {
    for (const path of ['/index.html', '/']) {
        const cached = await caches.match(path);
        const safeCached = toSafeResponse(request, cached);
        if (safeCached) {
            return safeCached;
        }
    }

    return null;
}

function createOfflineShellResponse() {
    return new Response(
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PHG Connect</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f8f6f1;
        color: #1f3b5b;
        font: 16px/1.5 system-ui, sans-serif;
      }
      main {
        max-width: 28rem;
        padding: 2rem;
        text-align: center;
      }
      h1 {
        margin: 0 0 0.75rem;
        font-size: 1.5rem;
      }
      p {
        margin: 0;
        color: #4f6480;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Connection problem</h1>
      <p>PHG Connect could not load the app shell. Refresh the page when the network is back.</p>
    </main>
  </body>
</html>`,
        {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=UTF-8',
                'Cache-Control': 'no-store',
            },
        }
    );
}

// Cache-first strategy
async function cacheFirst(request) {
    const cached = await caches.match(request);
    const safeCached = toSafeResponse(request, cached);
    if (safeCached) return safeCached;

    try {
        const response = await fetch(request);
        const safeResponse = toSafeResponse(request, response);
        if (!safeResponse) {
            return new Response('Asset not available offline', { status: 503 });
        }

        if (safeResponse.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, safeResponse.clone());
        }
        return safeResponse;
    } catch {
        return new Response('Asset not available offline', { status: 503 });
    }
}

// Network-first strategy
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        const safeResponse = toSafeResponse(request, response);
        if (!safeResponse) {
            throw new Error('Unsafe redirect response');
        }

        if (safeResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, safeResponse.clone());
        }
        return safeResponse;
    } catch {
        const cached = await caches.match(request);
        const safeCached = toSafeResponse(request, cached);
        if (safeCached) return safeCached;
        return new Response('Network error', { status: 503 });
    }
}

// Handle push notifications
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            data: {
                url: data.url || '/'
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    } catch (e) {
        console.error('Push error:', e);
    }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});
