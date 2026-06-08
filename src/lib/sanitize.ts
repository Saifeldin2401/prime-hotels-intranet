/**
 * HTML Sanitization Module
 * 
 * Re-exports enhanced security utilities from security.ts for backward compatibility.
 * All sanitization functions now use the comprehensive security implementation.
 * 
 * @deprecated Consider importing directly from security.ts for new code
 */

export {
  // Core sanitization functions
  sanitizeHtml,
  sanitizePlainText,
  sanitizeSvg,
  sanitizeUrl,
  
  // Encoding functions
  encodeHtml,
  encodeHtmlAttribute,
  encodeJs,
  encodeCss,
  encodeUrl,
  encodeUrlComponent,
  encode,
  
  // CSRF protection
  generateCsrfToken,
  getCsrfToken,
  validateCsrfToken,
  clearCsrfToken,
  getSecureHeaders,
  
  // Error handling
  SAFE_ERROR_MESSAGES,
  sanitizeErrorMessage,
  getUserFriendlyError,
  
  // Validation helpers
  validateLength,
  validateNoHtml,
  safeJsonParse,
  safeJsonStringify,
  
  // Storage
  secureStorage,
  
  // React helpers
  createSafeHtml,
  containsDangerousContent,
  
  // Types
  type EncodingContext,
  type SecurityConfig,
  type ValidationResult,
  type CsrfToken,
} from './security';

// For backward compatibility - default export
import { sanitizeHtml } from './security';
export default sanitizeHtml;
