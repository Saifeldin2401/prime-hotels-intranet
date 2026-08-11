// Environment variable validation and security utilities

interface EnvConfig {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  VITE_APP_NAME?: string
  VITE_APP_DESCRIPTION?: string
  VITE_DEV_MODE?: string
  VITE_API_BASE_URL?: string
  VITE_MOCK_AUTH?: string
  VITE_ALLOWED_ORIGINS?: string
  VITE_APP_URL?: string
  VITE_CERTIFICATE_VERIFY_URL?: string
  VITE_ENABLE_PWA?: string
}

// guardrail-ok: the list of placeholder values this validator DETECTS and rejects.
const PLACEHOLDER_MARKERS = [
  'your-project-id',
  'your_supabase_anon_key_here',
  'examplePublicKey@o0.ingest.sentry.io/0',
]

// Required environment variables
const REQUIRED_VARS: Array<keyof EnvConfig> = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
]

// Security validation functions
export function validateEnvironment(): EnvConfig {
  const config: Partial<EnvConfig> = {}
  const errors: string[] = []

  // Check required variables
  for (const varName of REQUIRED_VARS) {
    const value = import.meta.env[varName]
    if (!value) {
      errors.push(`Missing required environment variable: ${varName}`)
    } else if (PLACEHOLDER_MARKERS.some((marker) => value.includes(marker))) {
      errors.push(`Environment variable ${varName} is still using a placeholder value`)
    } else {
      (config as any)[varName] = value
    }
  }

  // Check optional variables
  const OPTIONAL_VARS: Array<keyof EnvConfig> = [
    'VITE_APP_NAME',
    'VITE_APP_DESCRIPTION',
    'VITE_DEV_MODE',
    'VITE_API_BASE_URL',
    'VITE_MOCK_AUTH',
    'VITE_ALLOWED_ORIGINS',
    'VITE_APP_URL',
    'VITE_CERTIFICATE_VERIFY_URL',
    'VITE_ENABLE_PWA'
  ]

  for (const varName of OPTIONAL_VARS) {
    const value = import.meta.env[varName]
    if (value) {
      (config as any)[varName] = value
    }
  }

  // Log warnings for missing optional variables
  if (errors.length > 0) {
    console.error('Environment validation errors:', errors)
    throw new Error(`Environment configuration error: ${errors.join(', ')}`)
  }

  // Security checks
  const supabaseUrl = config.VITE_SUPABASE_URL
  const supabaseKey = config.VITE_SUPABASE_ANON_KEY

  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    console.warn('Supabase URL should use HTTPS for production')
  }
  if (supabaseUrl) {
    try {
      if (!/\.supabase\.co$/i.test(new URL(supabaseUrl).host)) {
        console.warn('Supabase URL does not appear to be a standard Supabase project URL')
      }
    } catch {
      errors.push('VITE_SUPABASE_URL must be a valid URL')
    }
  }
  if (supabaseKey && !(supabaseKey.startsWith('sb_publishable_') || supabaseKey.startsWith('eyJ'))) {
    errors.push('VITE_SUPABASE_ANON_KEY must be a Supabase publishable key or legacy anon JWT')
  }
  if (errors.length > 0) {
    console.error('Environment validation errors:', errors)
    throw new Error(`Environment configuration error: ${errors.join(', ')}`)
  }

  return config as EnvConfig
}

// NOTE: Security headers, CORS, and rate limiting are enforced at infrastructure level:
// - Security headers: vercel.json (production) + vite.config.ts security-headers plugin (dev)
// - CORS: Supabase API handles CORS for database requests
// - Rate limiting: Requires server-side middleware (Supabase handles API rate limits)
