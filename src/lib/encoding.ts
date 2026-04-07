/**
 * Output Encoding Utilities
 * 
 * Provides context-aware encoding functions to prevent XSS attacks
 * when rendering dynamic content in different contexts.
 * 
 * Usage:
 * - encodeHtml(): For text content inside HTML elements
 * - encodeHtmlAttribute(): For HTML attribute values
 * - encodeJs(): For JavaScript string literals
 * - encodeCss(): For CSS values
 * - encodeUrl(): For complete URLs
 * - encodeUrlComponent(): For URL query parameters
 * - encodeJson(): For JSON string values
 */

// Re-export all encoding functions from security.ts for backward compatibility
export {
  encodeHtml,
  encodeHtmlAttribute,
  encodeJs,
  encodeCss,
  encodeUrl,
  encodeUrlComponent,
  encode,
  type EncodingContext,
} from './security';

/**
 * JSON string encoding - for use in JSON values
 * Prevents breaking out of JSON string context
 */
export const encodeJson = (value: string | null | undefined): string => {
  if (!value) return '';
  
  return JSON.stringify(value).slice(1, -1); // Remove surrounding quotes
};

/**
 * Base64 encoding utility with UTF-8 support
 */
export const encodeBase64 = (value: string): string => {
  try {
    return btoa(encodeURIComponent(value));
  } catch {
    return '';
  }
};

/**
 * Base64 decoding utility with UTF-8 support
 */
export const decodeBase64 = (value: string): string => {
  try {
    return decodeURIComponent(atob(value));
  } catch {
    return '';
  }
};

/**
 * Encode for SQL-like contexts (basic escaping)
 * Note: Always use parameterized queries instead of string concatenation
 */
export const encodeSqlLike = (value: string): string => {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[');
};

/**
 * Create a safe data attribute value
 * Ensures the value is safe to use in data-* attributes
 */
export const encodeDataAttribute = (value: string): string => {
  // Remove characters that could break out of attribute context
  return value
    .replace(/["']/g, '')
    .replace(/</g, '')
    .replace(/>/g, '')
    .trim();
};

/**
 * Encode content for use in a textarea
 */
export const encodeForTextarea = (value: string): string => {
  // Encode HTML entities and escape special textarea-related sequences
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};
