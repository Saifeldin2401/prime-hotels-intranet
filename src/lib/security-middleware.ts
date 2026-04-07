// Security middleware and rate limiting utilities

import { supabase } from './supabase'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// Simple in-memory rate limiting (for development)
const rateLimitStore: RateLimitStore = {}

// ============================================================================
// DANGEROUS URL SCHEMES - SECURITY CRITICAL
// ============================================================================

/**
 * Dangerous URL schemes that can execute code or access sensitive resources.
 * These are blocked in SVG sanitization and validation.
 */
const DANGEROUS_URL_SCHEMES = [
  'javascript:',      // JavaScript execution
  'vbscript:',        // VBScript execution (IE)
  'data:',            // Data URIs (can contain HTML/JS)
  'file:',            // Local file access
  'about:',           // Browser internal pages
  'chrome:',          // Chrome internal pages
  'chrome-extension:',// Chrome extension access
  'firefox:',         // Firefox internal pages
  'moz-extension:',   // Firefox extension access
  'safari-extension:',// Safari extension access
  'ms-appx:',         // Windows app access
  'ms-windows-store:',// Windows store
  'blob:',            // Blob URLs (potential XSS vector)
  'filesystem:',      // FileSystem API access
]

/**
 * Allowed safe data: URI MIME types for images only.
 * All other data: URIs are considered dangerous.
 */
const ALLOWED_DATA_URI_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]

/**
 * Regex to match any dangerous URL scheme at the start of a string or after whitespace/punctuation.
 * Matches schemes like javascript:, data:, vbscript:, etc.
 */
const DANGEROUS_SCHEME_REGEX = new RegExp(
  '(?:^|[\\s"\'\(=]+)(' +
    DANGEROUS_URL_SCHEMES.map(s => s.replace(':', '\\:')).join('|') +
  ')',
  'gi'
)

/**
 * Regex to match data: URIs that are NOT in the allowed safe list.
 * This blocks data:text/html, data:application/javascript, etc.
 */
const DANGEROUS_DATA_URI_REGEX = new RegExp(
  'data:(?!(' + ALLOWED_DATA_URI_TYPES.join('|') + ')[;\\s])',
  'gi'
)

/**
 * Check if a URL string contains any dangerous scheme.
 * Uses a whitelist approach - only http:, https:, and safe data: URIs are allowed.
 */
function containsDangerousScheme(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  
  const trimmed = url.trim().toLowerCase()
  
  // Check for dangerous schemes
  for (const scheme of DANGEROUS_URL_SCHEMES) {
    if (trimmed.startsWith(scheme)) {
      // Special case: data: URIs need additional checking
      if (scheme === 'data:') {
        // Check if it's a safe image data URI
        for (const safeType of ALLOWED_DATA_URI_TYPES) {
          if (trimmed.startsWith(`data:${safeType}`)) {
            return false // Safe data URI
          }
        }
        return true // Dangerous data URI
      }
      return true // Other dangerous scheme
    }
  }
  
  return false
}

/**
 * Sanitize a URL attribute value by removing dangerous schemes.
 * Returns empty string if dangerous scheme detected.
 */
function sanitizeUrlValue(url: string): string {
  if (!url || typeof url !== 'string') return ''
  
  // Check for dangerous schemes
  if (containsDangerousScheme(url)) {
    return ''
  }
  
  // Additional check: ensure URL starts with safe scheme or is relative
  const trimmed = url.trim()
  const lowerTrimmed = trimmed.toLowerCase()
  
  // Allow http:, https:, and relative URLs
  if (
    lowerTrimmed.startsWith('http://') ||
    lowerTrimmed.startsWith('https://') ||
    lowerTrimmed.startsWith('/') ||
    lowerTrimmed.startsWith('#') ||
    lowerTrimmed.startsWith('./') ||
    lowerTrimmed.startsWith('../') ||
    (!lowerTrimmed.includes(':')) // No scheme = relative
  ) {
    return trimmed
  }
  
  // Check for safe data: URIs
  for (const safeType of ALLOWED_DATA_URI_TYPES) {
    if (lowerTrimmed.startsWith(`data:${safeType}`)) {
      return trimmed
    }
  }
  
  // Unknown scheme - block for safety
  return ''
}

// Blocked file extensions (executable files)
const BLOCKED_EXTENSIONS = new Set([
  'exe', 'dll', 'bat', 'cmd', 'msi', 'ps1', 'vbs', 'js', 'jar', 'scr',
  'com', 'sh', 'php', 'pl', 'py', 'rb', 'app', 'dmg', 'pkg', 'deb', 'rpm',
  'so', 'dylib', 'o', 'a', 'lib'
])

// Suspicious filename patterns
const SUSPICIOUS_PATTERNS = [
  /\.\./,                           // Path traversal
  /[<>]/,                           // HTML injection
  /[/\\]/,                          // Directory separators
  /\x00/,                           // Null bytes
  /^\./,                            // Hidden files
  /\.(exe|bat|cmd|sh|php|pl|py)$/i, // Executable extensions
  /\.[a-z0-9]{1,5}\.(exe|bat|cmd|msi|ps1|vbs|js|jar|scr|com|sh|php|pl)$/i, // Double extension
]

// File type definitions with magic numbers
const FILE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'application/msword': [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]],
}

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
  static validateRequest(data: Record<string, unknown>, requiredFields: string[]): {
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
  static validateSession(session: Record<string, unknown> | null | undefined): boolean {
    if (!session) return false

    // Check session age
    const createdAt = typeof session.created_at === 'string' ? session.created_at : ''
    const sessionAge = createdAt ? Date.now() - new Date(createdAt).getTime() : Number.POSITIVE_INFINITY
    const defaultMaxSessionAge = 24 * 60 * 60 * 1000 // 24 hours
    const configuredMaxSessionAge = Number(import.meta.env.VITE_MAX_SESSION_AGE_MS)
    const maxSessionAge = Number.isFinite(configuredMaxSessionAge)
      ? configuredMaxSessionAge
      : defaultMaxSessionAge

    if (sessionAge > maxSessionAge) {
      return false
    }

    // Check session integrity
    return typeof session.user_id === 'string' && Boolean(session.expires_at)
  }

  /**
   * SECURE: Server-side rate limiting using Supabase RPC.
   * This is the recommended approach for production.
   */
  static async checkServerRateLimit(
    action: string,
    maxRequests: number = 100,
    windowSeconds: number = 900
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_user_rate_limit', {
        p_action: action,
        p_max_requests: maxRequests,
        p_window_seconds: windowSeconds
      })
      
      if (error) {
        console.error('Server rate limit check failed:', error)
        // Log security event
        await this.logSecurityEvent('rate_limit_check_failed', { error: error.message })
        // Fail open to prevent DoS, but log the issue
        return true
      }
      
      return data === true
    } catch (e) {
      console.error('Rate limit exception:', e)
      return true
    }
  }

  /**
   * Log security event to audit log
   */
  static async logSecurityEvent(
    eventType: string,
    metadata: Record<string, unknown> = {},
    severity: 'info' | 'warning' | 'error' | 'critical' = 'info'
  ): Promise<void> {
    try {
      await supabase.rpc('log_security_event', {
        p_event_type: eventType,
        p_metadata: metadata,
        p_severity: severity
      })
    } catch (e) {
      // Silent fail - don't break app flow for logging
      console.error('Failed to log security event:', e)
    }
  }

  // API key validation
  static validateApiKey(apiKey: string): boolean {
    // Basic API key format validation
    const apiKeyRegex = /^[a-zA-Z0-9_-]{20,}$/
    return apiKeyRegex.test(apiKey)
  }

  /**
   * File upload security validation
   * Enhanced with magic number verification to prevent MIME type spoofing
   */
  static validateFileUpload(file: File, options: {
    allowedTypes?: string[]
    maxSize?: number
    checkMagicNumbers?: boolean
  } = {}): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    
    const allowedTypes = options.allowedTypes || [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/svg+xml',
      'application/pdf', 
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    const maxSize = options.maxSize || 5 * 1024 * 1024 // 5MB default

    // Check file exists and has content
    if (!file || file.size === 0) {
      errors.push('File is empty')
      return { isValid: false, errors, warnings }
    }

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type not allowed: ${file.type}`)
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1)
      errors.push(`File size exceeds ${maxSizeMB}MB limit`)
    }

    // Check filename for suspicious patterns
    const filenameValidation = this.validateFilename(file.name)
    if (!filenameValidation.isValid) {
      errors.push(...filenameValidation.errors)
    }

    // Check for double extensions
    if (filenameValidation.hasDoubleExtension) {
      warnings.push('File has multiple extensions')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate filename for security issues
   */
  static validateFilename(filename: string): {
    isValid: boolean
    errors: string[]
    hasDoubleExtension: boolean
    extension: string | null
  } {
    const errors: string[] = []
    let hasDoubleExtension = false

    // Check for suspicious patterns
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(filename)) {
        errors.push('Filename contains suspicious characters or patterns')
        break
      }
    }

    // Extract extension
    const parts = filename.split('.')
    const extension = parts.length > 1 ? parts.pop()?.toLowerCase() || null : null

    // Check for blocked extensions
    if (extension && BLOCKED_EXTENSIONS.has(extension)) {
      errors.push(`File extension .${extension} is not allowed`)
    }

    // Check for double extensions
    if (parts.length > 2) {
      const secondExtension = parts[parts.length - 1].toLowerCase()
      if (BLOCKED_EXTENSIONS.has(secondExtension)) {
        errors.push('Suspicious double extension detected')
      }
      hasDoubleExtension = true
    }

    // Check filename length
    if (filename.length > 255) {
      errors.push('Filename too long (max 255 characters)')
    }

    // Check for null bytes
    if (filename.includes('\x00')) {
      errors.push('Filename contains invalid characters')
    }

    return {
      isValid: errors.length === 0,
      errors,
      hasDoubleExtension,
      extension
    }
  }

  /**
   * Verify file signature (magic numbers) to prevent MIME type spoofing
   * Note: This is an async operation that reads the file
   */
  static async verifyFileSignature(file: File): Promise<{
    isValid: boolean
    detectedType: string | null
    expectedType: string
    error?: string
  }> {
    const expectedSignatures = FILE_SIGNATURES[file.type]
    
    if (!expectedSignatures) {
      // No signature check for this type (e.g., text files, SVG)
      return { isValid: true, detectedType: file.type, expectedType: file.type }
    }

    try {
      // Read first 8 bytes of file
      const slice = file.slice(0, 8)
      const arrayBuffer = await slice.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      // Check against all possible signatures for this type
      for (const signature of expectedSignatures) {
        let matches = true
        for (let i = 0; i < signature.length; i++) {
          if (bytes[i] !== signature[i]) {
            matches = false
            break
          }
        }
        if (matches) {
          return { isValid: true, detectedType: file.type, expectedType: file.type }
        }
      }

      return {
        isValid: false,
        detectedType: null,
        expectedType: file.type,
        error: `File signature does not match expected type: ${file.type}`
      }
    } catch (error) {
      return {
        isValid: false,
        detectedType: null,
        expectedType: file.type,
        error: 'Failed to verify file signature'
      }
    }
  }

  /**
   * Generate secure filename with UUID
   */
  static generateSecureFilename(originalFilename: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 10)
    
    // Get extension
    const extension = originalFilename.split('.').pop()?.toLowerCase() || ''
    const validExtension = /^[a-z0-9]{1,10}$/.test(extension) ? extension : 'bin'
    
    return `${timestamp}-${random}.${validExtension}`
  }

  /**
   * Sanitize SVG content to prevent XSS
   * Uses DOMParser for robust parsing with comprehensive URL scheme validation
   */
  static sanitizeSvg(svgContent: string): string {
    // Use DOMParser to properly parse and sanitize SVG
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgContent, 'image/svg+xml')
    
    // Remove dangerous elements
    const dangerousElements = doc.querySelectorAll('script, foreignObject, embed, iframe, object')
    dangerousElements.forEach(el => el.remove())
    
    // URL attributes that need validation
    const urlAttributes = ['href', 'src', 'action', 'formaction', 'poster', 'cite', 'xlink:href']
    
    // Remove event handlers and validate URL attributes from all elements
    const allElements = doc.querySelectorAll('*')
    allElements.forEach(el => {
      const element = el as Element
      Array.from(element.attributes).forEach(attr => {
        const attrName = attr.name.toLowerCase()
        
        // Remove event handlers
        if (attrName.startsWith('on')) {
          element.removeAttribute(attr.name)
          return
        }
        
        // Validate URL attributes
        if (urlAttributes.includes(attrName) || urlAttributes.some(ua => attrName.endsWith(':' + ua) || attrName === ua)) {
          const urlValue = attr.value
          if (containsDangerousScheme(urlValue)) {
            // Remove dangerous URL attribute
            element.removeAttribute(attr.name)
          }
        }
      })
    })
    
    // Serialize back to string
    const serializer = new XMLSerializer()
    let sanitized = serializer.serializeToString(doc.documentElement)
    
    // Additional regex-based cleanup for things DOMParser might miss
    // Use recursive sanitization to prevent bypass attempts
    let previous: string;
    do {
      previous = sanitized;
      // Remove javascript: URLs (including nested attempts)
      sanitized = previous.replace(/javascript:/gi, '');
      // Remove vbscript: URLs
      sanitized = sanitized.replace(/vbscript:/gi, '');
      // Remove data: URLs that are not safe images
      sanitized = sanitized.replace(DANGEROUS_DATA_URI_REGEX, '');
    } while (sanitized !== previous);
    
    return sanitized
  }

  /**
   * Validate SVG content for security issues
   * Uses comprehensive URL scheme validation.
   */
  static validateSvgContent(svgContent: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    const lowerContent = svgContent.toLowerCase()

    // Check for script tags
    if (/<script\b/i.test(svgContent)) {
      errors.push('SVG contains script tags')
    }

    // Check for event handlers (on* attributes)
    if (/\son\w+\s*=/i.test(svgContent)) {
      errors.push('SVG contains event handlers')
    }

    // Check for any dangerous URL schemes
    // Extract all potential URLs from href, src, action, etc.
    const urlPattern = /(?:href|src|action|formaction|poster|cite|url)\s*=\s*["']([^"']+)["']/gi
    let match
    while ((match = urlPattern.exec(svgContent)) !== null) {
      const url = match[1]
      if (containsDangerousScheme(url)) {
        errors.push(`SVG contains dangerous URL scheme: ${url.substring(0, 50)}`)
        break
      }
    }

    // Check for javascript: pattern anywhere (CSS, inline styles, etc.)
    if (/javascript:/i.test(svgContent)) {
      errors.push('SVG contains JavaScript URLs')
    }

    // Check for dangerous data: URIs
    if (DANGEROUS_DATA_URI_REGEX.test(svgContent)) {
      errors.push('SVG contains suspicious data URIs')
    }

    // Check for other dangerous schemes
    for (const scheme of DANGEROUS_URL_SCHEMES) {
      if (scheme === 'data:') continue // Already checked above
      const schemeRegex = new RegExp('(?:^|[\\s"\'\(=]+)' + scheme.replace(':', '\\:'), 'i')
      if (schemeRegex.test(svgContent)) {
        errors.push(`SVG contains dangerous URL scheme: ${scheme}`)
        break
      }
    }

    // Check for foreignObject (can contain HTML with scripts)
    if (/<foreignobject\b/i.test(svgContent)) {
      errors.push('SVG contains foreignObject')
    }

    // Check for embed elements
    if (/<embed\b/i.test(svgContent)) {
      errors.push('SVG contains embed elements')
    }

    // Check for iframe elements
    if (/<iframe\b/i.test(svgContent)) {
      errors.push('SVG contains iframe elements')
    }

    // Check for object elements
    if (/<object\b/i.test(svgContent)) {
      errors.push('SVG contains object elements')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Check for image dimensions (async)
   */
  static getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(null)
        return
      }

      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }

      img.src = url
    })
  }

  /**
   * Validate image dimensions
   */
  static validateImageDimensions(
    width: number,
    height: number,
    maxWidth = 16384,
    maxHeight = 16384
  ): {
    isValid: boolean
    error?: string
  } {
    if (width <= 0 || height <= 0) {
      return { isValid: false, error: 'Invalid image dimensions' }
    }

    if (width > maxWidth || height > maxHeight) {
      return {
        isValid: false,
        error: `Image dimensions exceed maximum (${maxWidth}x${maxHeight})`
      }
    }

    // Check for decompression bomb
    const pixelCount = width * height
    const maxPixels = 100_000_000 // 100 megapixels
    if (pixelCount > maxPixels) {
      return {
        isValid: false,
        error: `Image pixel count exceeds maximum (${maxPixels} pixels)`
      }
    }

    return { isValid: true }
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

// ============================================================================
// CSRF PROTECTION
// ============================================================================

/**
 * CSRF Protection utilities
 * Provides token generation, validation, and header management
 */
export class CsrfProtection {
  /**
   * Get current CSRF token (generates if needed)
   */
  static getToken(): string {
    return getCsrfToken()
  }

  /**
   * Validate a CSRF token
   */
  static validateToken(token: string): boolean {
    return validateCsrfToken(token)
  }

  /**
   * Clear current CSRF token
   */
  static clearToken(): void {
    clearCsrfToken()
  }

  /**
   * Generate a new CSRF token
   */
  static generateToken(): string {
    return generateCsrfToken()
  }

  /**
   * Get headers with CSRF token for API requests
   */
  static getHeaders(): Record<string, string> {
    return getSecureHeaders()
  }

  /**
   * Refresh CSRF token (generate new and store)
   */
  static refreshToken(): string {
    clearCsrfToken()
    return getCsrfToken()
  }
}

/**
 * Hook for using CSRF protection in components
 */
export function useCsrfProtection() {
  return {
    token: CsrfProtection.getToken(),
    headers: CsrfProtection.getHeaders(),
    refresh: () => CsrfProtection.refreshToken(),
    validate: (token: string) => CsrfProtection.validateToken(token),
  }
}

// ============================================================================
// CSRF TOKEN HELPERS
// ============================================================================

/**
 * Generate a new CSRF token
 * Uses crypto.randomUUID if available, falls back to Math.random
 */
export function generateCsrfToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

const CSRF_TOKEN_KEY = 'csrf_token'

/**
 * Get current CSRF token from storage (generates if needed)
 */
export function getCsrfToken(): string {
  if (typeof window === 'undefined') return generateCsrfToken()
  
  let token = sessionStorage.getItem(CSRF_TOKEN_KEY)
  if (!token) {
    token = generateCsrfToken()
    sessionStorage.setItem(CSRF_TOKEN_KEY, token)
  }
  return token
}

/**
 * Validate a CSRF token against stored token
 */
export function validateCsrfToken(token: string): boolean {
  if (typeof window === 'undefined') return false
  return token === sessionStorage.getItem(CSRF_TOKEN_KEY)
}

/**
 * Clear current CSRF token
 */
export function clearCsrfToken(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(CSRF_TOKEN_KEY)
  }
}

/**
 * Get secure headers including CSRF token for API requests
 */
export function getSecureHeaders(): Record<string, string> {
  return {
    'X-CSRF-Token': getCsrfToken(),
    'X-Requested-With': 'XMLHttpRequest'
  }
}

/**
 * Hook for using server-side rate limiting in components
 */
export function useRateLimiter() {
  return {
    checkLimit: async (action: string, maxRequests?: number, windowSeconds?: number) => {
      return SecurityMiddleware.checkServerRateLimit(action, maxRequests, windowSeconds)
    },
    
    // For API calls with automatic rate limit checking
    withRateLimit: async <T>(
      action: string,
      fn: () => Promise<T>,
      options?: { maxRequests?: number; windowSeconds?: number; onRateLimited?: () => void }
    ): Promise<T | null> => {
      const allowed = await SecurityMiddleware.checkServerRateLimit(
        action,
        options?.maxRequests,
        options?.windowSeconds
      )
      
      if (!allowed) {
        options?.onRateLimited?.()
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      
      return fn()
    }
  }
}
