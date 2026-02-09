import { createClient } from '@supabase/supabase-js'
import { validateEnvironment } from './env-validation'

// Validate environment variables on startup
const env = validateEnvironment()
const isDevMode = import.meta.env.DEV || env.VITE_DEV_MODE === 'true'

// Security: No fallback to demo project in any environment
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

// Additional security validation
if (!supabaseUrl.startsWith('https://')) {
  throw new Error('Supabase URL must use HTTPS for security')
}

if (supabaseAnonKey.length < 100) {
  throw new Error('Invalid Supabase anon key format')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Security: Use sessionStorage in production for better security
    storage: isDevMode ? localStorage : sessionStorage,
  },
  // Security: Add global request headers
  global: {
    headers: {
      'X-Client-Info': 'prime-hotels-intranet/1.0.0'
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
