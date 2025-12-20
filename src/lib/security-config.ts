// Comprehensive security configuration for Prime Hotels Intranet

export const securityConfig = {
  // Authentication security
  auth: {
    // Password requirements
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,

    // Session management
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    maxSessionAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    refreshThreshold: 15 * 60 * 1000, // 15 minutes before expiry

    // Rate limiting
    loginAttempts: {
      max: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      lockoutDuration: 30 * 60 * 1000 // 30 minutes
    },

    // Token security
    tokenRotation: true,
    requireEmailVerification: true
  },

  // API security
  api: {
    // Rate limiting
    rateLimiting: {
      default: {
        maxRequests: 100,
        windowMs: 15 * 60 * 1000 // 15 minutes
      },
      auth: {
        maxRequests: 5,
        windowMs: 15 * 60 * 1000
      },
      upload: {
        maxRequests: 10,
        windowMs: 60 * 60 * 1000 // 1 hour
      }
    },

    // Request validation
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    maxUrlLength: 2048,
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

    // CORS
    cors: {
      allowedOrigins: import.meta.env.PROD
        ? (import.meta.env.VITE_ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'])
        : ['http://localhost:5173', 'http://localhost:3000'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'apikey'],
      credentials: true,
      maxAge: 86400 // 24 hours
    }
  },

  // Content Security Policy
  csp: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for some libraries
      'style-src': ["'self'", "'unsafe-inline'"], // Needed for Tailwind
      'img-src': ["'self'", "data:", "https:"],
      'font-src': ["'self'"],
      'connect-src': ["'self'", "https://api.supabase.co"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    }
  },

  // File upload security
  fileUpload: {
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    scanForMalware: true,
    sanitizeFilenames: true
  },

  // Data protection
  dataProtection: {
    // PII handling
    piiFields: [
      'email',
      'phone',
      'full_name',
      'address',
      'ssn',
      'credit_card'
    ],

    // Data retention
    retentionPeriods: {
      userAccounts: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
      auditLogs: 365 * 24 * 60 * 60 * 1000, // 1 year
      sessionData: 30 * 24 * 60 * 60 * 1000 // 30 days
    },

    // Encryption
    encryptSensitiveData: true,
    encryptionAlgorithm: 'AES-256-GCM'
  },

  // Monitoring and logging
  monitoring: {
    // Security events to log
    securityEvents: [
      'login_attempt',
      'login_success',
      'login_failure',
      'logout',
      'password_change',
      'permission_denied',
      'suspicious_activity',
      'rate_limit_exceeded',
      'invalid_api_key'
    ],

    // Alerting
    alerts: {
      failedLoginThreshold: 5,
      suspiciousActivityThreshold: 10,
      rateLimitThreshold: 0.9 // 90% of rate limit
    }
  },

  // Development vs Production
  isDevelopment: process.env.NODE_ENV === 'development',

  // Feature flags
  features: {
    enableAuditLogging: process.env.NODE_ENV === 'production',
    enableRateLimiting: true,
    enableCSP: process.env.NODE_ENV === 'production',
    enableSecurityHeaders: true,
    enableInputValidation: true,
    enableSessionSecurity: true
  }
}

// Security headers configuration
export const securityHeaders = {
  'Content-Security-Policy': Object.entries(securityConfig.csp.directives)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  'Strict-Transport-Security': securityConfig.isDevelopment ? '' : 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin'
}

// Export security utilities
export const securityUtils = {
  // Check if feature is enabled
  isFeatureEnabled: (feature: keyof typeof securityConfig.features): boolean => {
    return securityConfig.features[feature]
  },

  // Get rate limit config for endpoint
  getRateLimitConfig: (endpoint: 'default' | 'auth' | 'upload') => {
    return securityConfig.api.rateLimiting[endpoint]
  },

  // Validate file upload
  validateFileUpload: (file: File) => {
    const { allowedTypes, maxFileSize } = securityConfig.fileUpload

    const isValidType = allowedTypes.includes(file.type)
    const isValidSize = file.size <= maxFileSize

    return {
      isValid: isValidType && isValidSize,
      errors: [
        ...(isValidType ? [] : ['File type not allowed']),
        ...(isValidSize ? [] : [`File size exceeds ${maxFileSize / 1024 / 1024}MB limit`])
      ]
    }
  },

  // Check if field is PII
  isPIIField: (fieldName: string): boolean => {
    return securityConfig.dataProtection.piiFields.includes(fieldName)
  },

  // Get retention period for data type
  getRetentionPeriod: (dataType: keyof typeof securityConfig.dataProtection.retentionPeriods): number => {
    return securityConfig.dataProtection.retentionPeriods[dataType]
  },

  // Centralized exception logging
  logException: (error: Error, context?: Record<string, any>) => {
    // In a real app, integrate with Sentry/LogRocket here
    // Example: Sentry.captureException(error, { extra: context })

    // For now, structured console logging
    const timestamp = new Date().toISOString()
    const logData = { error: { name: error.name, message: error.message, stack: error.stack }, context, timestamp }

    if (import.meta.env.PROD) {
      console.error('[Production Error Log]:', JSON.stringify(logData))
    } else {
      console.group('🚨 Dev Exception Caught')
      console.error(error)
      if (context) console.table(context)
      console.groupEnd()
    }
  }
}
