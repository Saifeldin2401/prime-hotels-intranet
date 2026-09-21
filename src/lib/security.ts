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
// ============================================================================
// TYPES
// ============================================================================
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
// ============================================================================
// CSRF PROTECTION
// ============================================================================

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface CsrfToken {
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
// ============================================================================
// SAFE ERROR HANDLING
// ============================================================================
// ============================================================================
// INPUT VALIDATION HELPERS
// ============================================================================
// ============================================================================
// SECURE STORAGE HELPERS
// ============================================================================
// ============================================================================
// REACT-SPECIFIC HELPERS
// ============================================================================
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
