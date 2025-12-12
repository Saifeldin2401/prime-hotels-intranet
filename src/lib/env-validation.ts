// Environment variable validation and security utilities

interface EnvConfig {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  VITE_APP_NAME?: string
  VITE_APP_DESCRIPTION?: string
  VITE_DEV_MODE?: string
  VITE_API_BASE_URL?: string
  VITE_MOCK_AUTH?: string
}

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
    'VITE_MOCK_AUTH'
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

  if (supabaseKey && supabaseKey.length < 100) {
    console.warn('Supabase anon key seems too short')
  }

  return config as EnvConfig
}

// Security headers configuration
export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for some libraries
    "style-src 'self' 'unsafe-inline'", // Needed for Tailwind
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.supabase.co https://htsvjfrofcpkfzvjpwvx.supabase.co",
    "frame-ancestors 'none'"
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}

// CORS configuration
export const corsConfig = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with actual domains
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey']
}

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.'
}
