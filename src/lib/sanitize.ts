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
  sanitizeSvg,
  sanitizeUrl,
  containsDangerousContent
} from './security';

// For backward compatibility - default export
import { sanitizeHtml } from './security';
export default sanitizeHtml;
