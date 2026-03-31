import { createClient } from '@supabase/supabase-js'
import { validateEnvironment } from './env-validation'

// Validate environment variables on startup
const env = validateEnvironment()
const isDevMode = import.meta.env.DEV || env.VITE_DEV_MODE === 'true'

type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

const createSafeStorage = (preferred: 'local' | 'session'): StorageLike => {
  const memoryStore = new Map<string, string>()

  const getNativeStorage = (): Storage | null => {
    if (typeof window === 'undefined') return null
    try {
      const storage = preferred === 'local' ? window.localStorage : window.sessionStorage
      const testKey = '__storage_test__'
      storage.setItem(testKey, '1')
      storage.removeItem(testKey)
      return storage
    } catch {
      return null
    }
  }

  return {
    getItem: (key) => {
      const nativeStorage = getNativeStorage()
      if (nativeStorage) return nativeStorage.getItem(key)
      return memoryStore.get(key) ?? null
    },
    setItem: (key, value) => {
      const nativeStorage = getNativeStorage()
      if (nativeStorage) {
        nativeStorage.setItem(key, value)
        return
      }
      memoryStore.set(key, value)
    },
    removeItem: (key) => {
      const nativeStorage = getNativeStorage()
      if (nativeStorage) {
        nativeStorage.removeItem(key)
        return
      }
      memoryStore.delete(key)
    },
  }
}

// Security: No fallback to demo project in any environment
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

// Additional security validation
if (!supabaseUrl.startsWith('https://')) {
  throw new Error('Supabase URL must use HTTPS for security')
}



export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Use localStorage for consistent session persistence across tabs
    storage: createSafeStorage('local'),
  },
  // Security: Add global request headers
  global: {
    headers: {
      'X-Client-Info': 'phg-connect/1.0.0'
    }
  },
  // Security: Enable real-time with proper authentication
  realtime: {
    params: {
      eventsPerSecond: 10 // Rate limit real-time events
    }
  }
})

// Export environment config for other parts of the app
export { env }
