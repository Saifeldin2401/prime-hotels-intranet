// Offline service for handling form submissions when network is unavailable
// This runs in the main thread, not in the service worker

interface PendingSubmission {
  id: string
  url: string
  method: string
  headers: Record<string, string>
  body: string
  timestamp: string
  retryCount: number
}

const DB_NAME = 'phg-offline'
const DB_VERSION = 1
const STORE_NAME = 'pendingSubmissions'

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

// Queue a submission for later
export async function queueSubmission(submission: Omit<PendingSubmission, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  const pendingSubmission: PendingSubmission = {
    ...submission,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  }

  await new Promise<void>((resolve, reject) => {
    const request = store.add(pendingSubmission)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })

  // Register for background sync if available
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }
    await registration.sync?.register('sync-forms')
  }
}

// Get all pending submissions
export async function getPendingSubmissions(): Promise<PendingSubmission[]> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result as PendingSubmission[])
    request.onerror = () => reject(request.error)
  })
}

// Remove a processed submission
export async function removeSubmission(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine
}

// Wait for online status
export function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    if (navigator.onLine) {
      resolve()
      return
    }

    const handler = () => {
      window.removeEventListener('online', handler)
      resolve()
    }

    window.addEventListener('online', handler)
  })
}

// Enhanced fetch with offline support
export async function offlineFetch(
  url: string,
  options?: RequestInit,
  offlineMessage?: string
): Promise<Response> {
  try {
    const response = await fetch(url, options)
    return response
  } catch (error) {
    if (!navigator.onLine && options?.method && options.method !== 'GET') {
      // Queue for later
      await queueSubmission({
        url,
        method: options.method,
        headers: options.headers as Record<string, string> || {},
        body: options.body as string || '',
      })

      // Return a mock success response
      return new Response(
        JSON.stringify({
          success: true,
          queued: true,
          message: offlineMessage || 'Request queued for offline processing',
        }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      )
    }
    throw error
  }
}
