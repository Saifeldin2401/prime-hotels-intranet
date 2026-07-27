/**
 * Security Module
 * 
 * Centralized security utilities for the Altus Advisory Intranet application.
 * 
 * @module security
 * 
 * Usage:
 * ```typescript
 * import { sanitizeHtml, getCsrfToken, validateForm } from '@/lib/security';
 * ```
 */

// Core sanitization
export {
  sanitizeHtml,
  sanitizePlainText,
  sanitizeSvg,
  sanitizeUrl,
  createSafeHtml,
  containsDangerousContent,
} from '../security';

// Encoding
export {
  encodeHtml,
  encodeHtmlAttribute,
  encodeJs,
  encodeCss,
  encodeUrl,
  encodeUrlComponent,
  encode,
  encodeJson,
  encodeBase64,
  decodeBase64,
  encodeSqlLike,
  encodeDataAttribute,
  encodeForTextarea,
} from '../encoding';

// CSRF Protection
export {
  generateCsrfToken,
  getCsrfToken,
  validateCsrfToken,
  clearCsrfToken,
  getSecureHeaders,
  CsrfProtection,
  useCsrfProtection,
} from '../security-middleware';

// Error Handling
export {
  SAFE_ERROR_MESSAGES,
  sanitizeErrorMessage,
  getUserFriendlyError,
} from '../security';

// Validation helpers
export {
  validateLength,
  validateNoHtml,
  safeJsonParse,
  safeJsonStringify,
  secureStorage,
} from '../security';

// Security middleware
export {
  SecurityMiddleware,
  rateLimitConfig,
  useRateLimiter,
} from '../security-middleware';

// Types
export type {
  EncodingContext,
  SecurityConfig,
  ValidationResult,
  CsrfToken,
} from '../security';
