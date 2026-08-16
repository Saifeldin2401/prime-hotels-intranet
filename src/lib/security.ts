/**
 * Security Utilities
 * 
 * Comprehensive security helpers for:
 * - XSS prevention through sanitization
 * - Output encoding for different contexts
 * - Input validation helpers
 * - CSRF protection
 * - Safe error handling
 */

import DOMPurify from 'dompurify';
import { generateCsrfToken as generateToken } from './security-middleware';

// Re-export for backward compatibility
export { generateToken as generateCsrfToken };

// ============================================================================
// TYPES
// ============================================================================

export type EncodingContext = 'html' | 'htmlAttribute' | 'js' | 'css' | 'url' | 'urlComponent';

export interface SecurityConfig {
  maxInputLength: number;
  allowedProtocols: string[];
  strictMode: boolean;
}

export type ValidationResult<T> = 
  { success: true; data: T } |
  { success: false; error: string; field?: string };

// ============================================================================
// SANITIZATION (Uses existing sanitize.ts but provides enhanced versions)
// ============================================================================

let hooksInitialized = false;

// Trusted video embed domains for iframe src validation
const TRUSTED_IFRAME_ORIGINS = [
  'https://www.youtube.com',
  'https://youtube.com',
  'https://www.youtube-nocookie.com',
  'https://player.vimeo.com',
  'https://vimeo.com',
];

function ensureHooksInitialized() {
  if (hooksInitialized) return;

  // Secure anchor tags opened in new tabs
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node instanceof HTMLAnchorElement) {
      const target = node.getAttribute('target');
      if (target === '_blank') {
        const existingRel = node.getAttribute('rel') || '';
        const relParts = new Set(existingRel.split(' ').map(s => s.trim()).filter(Boolean));
        relParts.add('noopener');
        relParts.add('noreferrer');
        node.setAttribute('rel', Array.from(relParts).join(' '));
      }
      
      // Validate href to prevent javascript: protocol
      const href = node.getAttribute('href');
      if (href) {
        try {
          const url = new URL(href, window.location.href);
          if (url.protocol === 'javascript:' || url.protocol === 'data:' || url.protocol === 'vbscript:') {
            node.removeAttribute('href');
            node.setAttribute('data-removed-href', '[unsafe url removed]');
          }
        } catch {
          // Invalid URL, remove it
          node.removeAttribute('href');
        }
      }
    }

    // Validate iframe src - only allow trusted video embed origins
    if (node instanceof HTMLIFrameElement) {
      const src = node.getAttribute('src') || '';
      // Compare the exact parsed origin, not a string prefix: a startsWith() check against
      // 'https://vimeo.com' also matches 'https://vimeo.com.attacker.tld/...', letting an
      // attacker-controlled frame through with the trusted sandbox/allow attributes applied.
      let isTrusted = false;
      try {
        const parsedOrigin = new URL(src, window.location.href).origin;
        isTrusted = TRUSTED_IFRAME_ORIGINS.includes(parsedOrigin);
      } catch {
        isTrusted = false;
      }
      if (!isTrusted) {
        node.remove();
      } else {
        // Enforce safe sandbox attributes
        node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
        node.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        node.setAttribute('allowfullscreen', '');
        node.setAttribute('loading', 'lazy');
        node.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      }
    }

    // Remove event handlers
    const eventAttrs = ['onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover', 
      'onmousemove', 'onmouseout', 'onkeypress', 'onkeydown', 'onkeyup', 'onfocus', 
      'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'onload', 'onerror'];
    eventAttrs.forEach(attr => {
      if (node.hasAttribute(attr)) {
        node.removeAttribute(attr);
      }
    });
  });

  hooksInitialized = true;
}

/**
 * Enhanced HTML sanitization with stricter defaults
 */
export const sanitizeHtml = (html: string | null | undefined, options?: { 
  allowIframes?: boolean;
  allowImages?: boolean;
  maxLength?: number;
}): string => {
  if (!html) return '';

  // Check max length
  if (options?.maxLength && html.length > options.maxLength) {
    console.warn(`HTML content exceeded max length of ${options.maxLength}`);
    html = html.substring(0, options.maxLength);
  }

  ensureHooksInitialized();

  const allowedTags = [
    // Text structure
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'blockquote', 'pre', 'code', 'hr', 'br',
    'div', 'span', 'details', 'summary',
    'nav', 'section', 'article', 'header', 'footer', 'main', 'aside',
    // Inline formatting
    'b', 'i', 'strong', 'em', 'strike', 'u', 'mark', 'sub', 'sup', 's',
    // Lists
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    // Links
    'a',
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'caption', 'tr', 'th', 'td', 'colgroup', 'col',
    // Media (conditional)
    ...(options?.allowImages !== false ? ['img', 'figure', 'figcaption'] : []),
    // Video
    'video', 'source',
    // Embeds (conditional)
    ...(options?.allowIframes !== false ? ['iframe'] : []),
  ];

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: [
      // Universal
      'id', 'class', 'dir', 'lang', 'title',
      // Links, images & videos
      'href', 'src', 'alt', 'name', 'target', 'rel', 'type',
      // Images & videos
      'width', 'height', 'loading',
      'data-width', 'data-align',
      // Video specific
      'controls', 'poster', 'preload', 'autoplay', 'muted', 'loop', 'playsinline',
      // Iframes
      'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'sandbox', 'referrerpolicy',
      // Tables
      'colspan', 'rowspan', 'scope', 'align',
      // Details
      'open',
    ],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: true,
    KEEP_CONTENT: true,
  });
};

/**
 * Strict sanitization for plain text only - strips ALL HTML
 */
export const sanitizePlainText = (text: string | null | undefined): string => {
  if (!text) return '';
  
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

/**
 * Sanitization for SVG content (Mermaid diagrams)
 */
export const sanitizeSvg = (svg: string | null | undefined): string => {
  if (!svg) return '';

  ensureHooksInitialized();

  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['foreignObject', 'script', 'audio', 'video', 'iframe'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick'],
    ADD_ATTR: ['class', 'style', 'xlink:href'],
  });
};

/**
 * Sanitize a URL to prevent javascript: protocol injection
 */
export const sanitizeUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  const trimmed = url.trim();
  
  // Check for dangerous protocols (case-insensitive)
  const dangerousPattern = /^(javascript|data|vbscript|file|about|blob|ftp):/i;
  if (dangerousPattern.test(trimmed)) {
    console.warn('Blocked dangerous URL protocol:', trimmed.substring(0, 50));
    return null;
  }

  // Only allow http:, https:, mailto:, tel:, and relative URLs
  try {
    // Try to parse as absolute URL
    const parsed = new URL(trimmed, window.location.href);
    
    // Allow http and https
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    
    // Allow mailto: and tel: with validation
    if (parsed.protocol === 'mailto:') {
      // Basic email validation in mailto
      const emailPart = parsed.pathname || parsed.href.replace('mailto:', '');
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPart.split('?')[0])) {
        return parsed.toString();
      }
      return null;
    }
    
    if (parsed.protocol === 'tel:') {
      // Basic phone validation - only allow digits, spaces, +, -, (, )
      const phonePart = parsed.pathname || parsed.href.replace('tel:', '');
      if (/^[\d\s\+\-\(\)]+$/.test(phonePart)) {
        return parsed.toString();
      }
      return null;
    }
    
    // Block other protocols
    return null;
  } catch {
    // If it's not a valid URL but looks like a relative path, allow it
    if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
      // Validate relative path doesn't contain dangerous characters
      if (!/[<>'"`]/.test(trimmed)) {
        return trimmed;
      }
    }
    return null;
  }
};

// ============================================================================
// OUTPUT ENCODING
// ============================================================================

/**
 * HTML entity encoding - for text content in HTML
 */
export const encodeHtml = (text: string | null | undefined): string => {
  if (!text) return '';
  
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return text.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
};

/**
 * HTML attribute encoding - for attribute values
 */
export const encodeHtmlAttribute = (value: string | null | undefined): string => {
  if (!value) return '';
  
  // More restrictive encoding for attributes
  return encodeHtml(value).replace(/\s/g, '&#32;');
};

/**
 * JavaScript string encoding - for use in JS strings
 */
export const encodeJs = (text: string | null | undefined): string => {
  if (!text) return '';
  
  const jsEscapes: Record<string, string> = {
    '\\': '\\\\',
    '"': '\\"',
    "'": "\\'",
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '<': '\\u003c',
    '>': '\\u003e',
    '&': '\\u0026',
    '=': '\\u003d',
    '`': '\\`',
    '$': '\\$',
  };

  return text.replace(/[\\"'\n\r\t<>&=`$]/g, (char) => jsEscapes[char] || char);
};

/**
 * CSS string encoding - for use in CSS
 */
export const encodeCss = (value: string | null | undefined): string => {
  if (!value) return '';
  
  // Remove potentially dangerous CSS characters/sequences
  return value
    .replace(/[<>'"]/g, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/behavior\s*:/gi, '');
};

/**
 * URL encoding - for use in URLs
 */
export const encodeUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  try {
    // Use built-in encodeURIComponent for query parameters
    return encodeURI(url);
  } catch {
    return '';
  }
};

/**
 * URL component encoding - for query parameters
 */
export const encodeUrlComponent = (component: string | null | undefined): string => {
  if (!component) return '';
  
  return encodeURIComponent(component);
};

/**
 * Universal encoding function
 */
export const encode = (text: string | null | undefined, context: EncodingContext): string => {
  switch (context) {
    case 'html':
      return encodeHtml(text);
    case 'htmlAttribute':
      return encodeHtmlAttribute(text);
    case 'js':
      return encodeJs(text);
    case 'css':
      return encodeCss(text);
    case 'url':
      return encodeUrl(text);
    case 'urlComponent':
      return encodeUrlComponent(text);
    default:
      return encodeHtml(text);
  }
};

// ============================================================================
// CSRF PROTECTION
// ============================================================================

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export interface CsrfToken {
  token: string;
  timestamp: number;
}

// Note: generateCsrfToken is imported from './security-middleware'

/**
 * Get or create CSRF token
 */
export const getCsrfToken = (): string => {
  try {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
    if (stored) {
      const data: CsrfToken = JSON.parse(stored);
      const now = Date.now();
      // Check if token is still valid
      if (now - data.timestamp < CSRF_TOKEN_EXPIRY) {
        return data.token;
      }
    }
  } catch {
    // Ignore storage errors
  }
  
  // Generate new token
  const token = generateToken();
  try {
    const data: CsrfToken = { token, timestamp: Date.now() };
    sessionStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
  return token;
};

/**
 * Validate CSRF token
 */
export const validateCsrfToken = (token: string): boolean => {
  try {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
    if (!stored) return false;
    
    const data: CsrfToken = JSON.parse(stored);
    const now = Date.now();
    
    // Check expiry and match
    return (now - data.timestamp < CSRF_TOKEN_EXPIRY) && data.token === token;
  } catch {
    return false;
  }
};

/**
 * Clear CSRF token
 */
export const clearCsrfToken = (): void => {
  try {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
  } catch {
    // Ignore
  }
};

/**
 * Get headers with CSRF token for API requests
 */
export const getSecureHeaders = (): Record<string, string> => {
  return {
    'X-CSRF-Token': getCsrfToken(),
    'X-Requested-With': 'XMLHttpRequest',
  };
};

// ============================================================================
// SAFE ERROR HANDLING
// ============================================================================

/**
 * Generic error messages to prevent information disclosure
 */
export const SAFE_ERROR_MESSAGES = {
  generic: 'An error occurred. Please try again later.',
  network: 'Network error. Please check your connection and try again.',
  validation: 'Invalid input. Please check your data and try again.',
  authentication: 'Authentication failed. Please sign in again.',
  authorization: 'You do not have permission to perform this action.',
  notFound: 'The requested resource was not found.',
  server: 'Server error. Please try again later.',
  timeout: 'Request timed out. Please try again.',
};

/**
 * Sanitize error message for user display
 * - Returns generic message in production
 * - Returns detailed message in development (if safe)
 */
export const sanitizeErrorMessage = (
  error: unknown, 
  context?: string,
  options?: { allowDetailedInDev?: boolean }
): string => {
  // In production, always return generic messages
  const isDev = import.meta.env?.DEV || process.env.NODE_ENV === 'development';
  
  if (!isDev || options?.allowDetailedInDev === false) {
    return SAFE_ERROR_MESSAGES.generic;
  }

  // In development, provide more context for debugging
  if (error instanceof Error) {
    // Sanitize the error message to prevent XSS
    const sanitized = sanitizePlainText(error.message);
    return `[${context || 'Error'}] ${sanitized}`;
  }

  if (typeof error === 'string') {
    return `[${context || 'Error'}] ${sanitizePlainText(error)}`;
  }

  return SAFE_ERROR_MESSAGES.generic;
};

/**
 * Get user-friendly error message based on error type
 */
export const getUserFriendlyError = (error: unknown): { message: string; shouldRetry: boolean } => {
  // Log full error for debugging (in dev)
  if (import.meta.env?.DEV) {
    console.error('Error details:', error);
  }

  // Check for specific error types
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return { message: SAFE_ERROR_MESSAGES.network, shouldRetry: true };
  }

  if (error instanceof Error) {
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return { message: SAFE_ERROR_MESSAGES.timeout, shouldRetry: true };
    }
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return { message: SAFE_ERROR_MESSAGES.authentication, shouldRetry: false };
    }
    
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return { message: SAFE_ERROR_MESSAGES.authorization, shouldRetry: false };
    }
    
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return { message: SAFE_ERROR_MESSAGES.notFound, shouldRetry: false };
    }
    
    if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
      return { message: SAFE_ERROR_MESSAGES.server, shouldRetry: true };
    }
  }

  // Default to generic message
  return { message: SAFE_ERROR_MESSAGES.generic, shouldRetry: true };
};

// ============================================================================
// INPUT VALIDATION HELPERS
// ============================================================================

/**
 * Validate and sanitize input length
 */
export const validateLength = (
  value: string, 
  options: { min?: number; max?: number; fieldName?: string }
): ValidationResult<string> => {
  const { min = 0, max = Infinity, fieldName = 'Field' } = options;
  
  const trimmed = value.trim();
  
  if (trimmed.length < min) {
    return {
      success: false,
      error: `${fieldName} must be at least ${min} characters`,
      field: fieldName,
    };
  }
  
  if (trimmed.length > max) {
    return {
      success: false,
      error: `${fieldName} must be no more than ${max} characters`,
      field: fieldName,
    };
  }
  
  return { success: true, data: trimmed };
};

/**
 * Validate that input doesn't contain HTML/script tags
 * Uses simple pattern detection - DOMPurify is used for actual sanitization when needed
 */
export const validateNoHtml = (value: string, fieldName = 'Field'): ValidationResult<string> => {
  // Simple pattern to detect potential HTML tags
  const htmlPattern = /<[^>]+>/;
  // Check for script tag patterns (case-insensitive, various forms)
  const scriptPattern = /<\s*script\b/i;
  
  if (scriptPattern.test(value)) {
    return {
      success: false,
      error: `${fieldName} contains unsafe content`,
      field: fieldName,
    };
  }
  
  if (htmlPattern.test(value)) {
    // Allow if it's just for formatting, but warn
    const sanitized = sanitizePlainText(value);
    // Use recursive sanitization to prevent bypass attempts
    let previous;
    let stripped = value;
    do {
      previous = stripped;
      stripped = previous.replace(/<[^>]*>/g, '');
    } while (stripped !== previous);
    
    if (sanitized !== stripped) {
      return {
        success: false,
        error: `${fieldName} contains invalid characters`,
        field: fieldName,
      };
    }
  }
  
  return { success: true, data: value };
};

/**
 * Safe JSON parse with error handling
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

/**
 * Safe JSON stringify with circular reference handling
 */
export const safeJsonStringify = (obj: unknown, space?: number): string => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  }, space);
};

// ============================================================================
// SECURE STORAGE HELPERS
// ============================================================================

/**
 * Safely store data in localStorage/sessionStorage with serialization
 */
export const secureStorage = {
  set: (key: string, value: unknown, storage: Storage = localStorage): boolean => {
    try {
      const serialized = safeJsonStringify(value);
      storage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error('Storage error:', error);
      return false;
    }
  },
  
  get: <T>(key: string, fallback: T, storage: Storage = localStorage): T => {
    try {
      const item = storage.getItem(key);
      if (!item) return fallback;
      return JSON.parse(item) as T;
    } catch {
      return fallback;
    }
  },
  
  remove: (key: string, storage: Storage = localStorage): boolean => {
    try {
      storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};

// ============================================================================
// REACT-SPECIFIC HELPERS
// ============================================================================

/**
 * Create safe innerHTML object for dangerouslySetInnerHTML
 * This is a convenience wrapper that ensures sanitization
 */
export const createSafeHtml = (html: string | null | undefined, options?: {
  allowIframes?: boolean;
  allowImages?: boolean;
}): { __html: string } => ({
  __html: sanitizeHtml(html, options),
});

/**
 * Check if content contains potentially dangerous patterns
 */
export const containsDangerousContent = (content: string): boolean => {
  const dangerousPatterns = [
    /<script\b/i,
    /javascript\s*:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*src\s*=\s*["']?javascript:/i,
    /data\s*:\s*text\/html/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(content));
};
