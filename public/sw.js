const CACHE_PREFIX = 'prime-hotels-'
const RELOAD_PARAM = '__phg_sw_cleanup'

async function clearPrimeHotelCaches() {
  const cacheNames = await caches.keys()
  const staleCaches = cacheNames.filter((name) => name.startsWith(CACHE_PREFIX))
  await Promise.allSettled(staleCaches.map((name) => caches.delete(name)))
}

async function reloadOpenClients() {
  const openClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

  await Promise.allSettled(openClients.map(async (client) => {
    try {
      const url = new URL(client.url)
      if (url.searchParams.get(RELOAD_PARAM) === '1') return

      url.searchParams.set(RELOAD_PARAM, '1')
      await client.navigate(url.toString())
    } catch {
      // Ignore navigation failures while cleaning up stale registrations.
    }
  }))
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(clearPrimeHotelCaches())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await clearPrimeHotelCaches()
    await self.clients.claim()
    await reloadOpenClients()
    await self.registration.unregister()
  })())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
