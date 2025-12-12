// Security middleware and rate limiting utilities

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// Simple in-memory rate limiting (for development)
const rateLimitStore: RateLimitStore = {}

export class SecurityMiddleware {
  // Rate limiting
  static rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()

    // Clean up old entries
    Object.keys(rateLimitStore).forEach(k => {
      if (rateLimitStore[k].resetTime < now) {
        delete rateLimitStore[k]
      }
    })

    // Check current IP
    const current = rateLimitStore[key]
    if (!current) {
      rateLimitStore[key] = {
        count: 1,
        resetTime: now + windowMs
      }
      return true
    }

    if (current.count >= maxRequests) {
      return false
    }

    current.count++
    return true
  }

  // Input validation
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .slice(0, 1000) // Limit length
  }

  // Email validation
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Password strength validation
  static validatePasswordStrength(password: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // SQL injection prevention (basic)
  static sanitizeSqlInput(input: string): string {
    return input
      .replace(/['"\\]/g, '')
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
  }

  // XSS prevention
  static sanitizeHtml(input: string): string {
    const div = document.createElement('div')
    div.textContent = input
    return div.innerHTML
  }

  // Request validation
  static validateRequest(data: any, requiredFields: string[]): {
    isValid: boolean
    missingFields: string[]
  } {
    const missingFields: string[] = []

    for (const field of requiredFields) {
      if (!data[field] || data[field] === '') {
        missingFields.push(field)
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields
    }
  }

  // Session security
  static validateSession(session: any): boolean {
    if (!session) return false

    // Check session age
    const sessionAge = Date.now() - new Date(session.created_at).getTime()
    const maxSessionAge = 24 * 60 * 60 * 1000 // 24 hours

    if (sessionAge > maxSessionAge) {
      return false
    }

    // Check session integrity
    return !!session.user_id && !!session.expires_at
  }

  // API key validation
  static validateApiKey(apiKey: string): boolean {
    // Basic API key format validation
    const apiKeyRegex = /^[a-zA-Z0-9_-]{20,}$/
    return apiKeyRegex.test(apiKey)
  }

  // File upload security
  static validateFileUpload(file: File): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not allowed')
    }

    if (file.size > maxSize) {
      errors.push('File size exceeds 5MB limit')
    }

    // Check file name for suspicious patterns
    const suspiciousPatterns = [/\.\./, /[<>]/, /[/\\]/]
    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      errors.push('File name contains suspicious characters')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Export rate limiting configuration
export const rateLimitConfig = {
  // API endpoints
  api: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000 // 15 minutes
  },
  // Authentication endpoints
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000 // 15 minutes
  },
  // File uploads
  upload: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000 // 1 hour
  }
}
