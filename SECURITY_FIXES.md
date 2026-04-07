# Security Fixes Documentation

## Overview

This document details all security fixes implemented to address XSS vulnerabilities and frontend security issues in the PRIME Hotels Intranet application.

## 1. XSS VULNERABILITY FIXES

### Files Modified

#### A. `src/lib/security.ts` (NEW FILE)
- **Purpose**: Comprehensive security utilities module
- **Key Features**:
  - Enhanced HTML sanitization using DOMPurify with strict defaults
  - URL sanitization to block `javascript:`, `data:`, `vbscript:` protocols
  - Multiple encoding functions for different contexts (HTML, JS, CSS, URL)
  - CSRF token generation and validation
  - Safe error handling with generic messages in production
  - Input validation helpers

#### B. `src/lib/sanitize.ts` (REFACTORED)
- **Changes**: Now re-exports from `security.ts` for backward compatibility
- **Impact**: All existing imports continue to work, but use enhanced implementations

#### C. `src/lib/encoding.ts` (NEW FILE)
- **Purpose**: Context-aware output encoding utilities
- **Functions**:
  - `encodeHtml()` - For HTML text content
  - `encodeHtmlAttribute()` - For HTML attribute values
  - `encodeJs()` - For JavaScript string literals
  - `encodeCss()` - For CSS values
  - `encodeUrl()` - For complete URLs
  - `encodeUrlComponent()` - For URL query parameters
  - `encodeJson()` - For JSON string values

#### D. `src/components/training/DocumentBlockRenderer.tsx`
**Before:**
```tsx
const getSafeUrl = (value?: string | null) => {
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString()
    }
    return null
  } catch {
    return null
  }
}
```

**After:**
```tsx
const getSafeUrl = (value?: string | null): string | null => {
  if (!value) return null
  const sanitized = sanitizeUrl(value)
  if (!sanitized) {
    console.warn('Blocked dangerous URL:', value.substring(0, 50))
  }
  return sanitized
}

// Sanitize HTML content before rendering
const originalMarkup = sanitizeHtml(block.content, { allowIframes: false })
const translatedMarkup = translatedContent ? sanitizeHtml(translatedContent, { allowIframes: false }) : ''
```

**Security Improvements:**
- Uses centralized `sanitizeUrl()` function
- Blocks dangerous URL protocols (javascript:, data:, vbscript:)
- Sanitizes HTML content with iframe restrictions
- Adds security comments for maintainers

#### E. `src/editor/ai/AIAssistPanel.tsx`
**Before:**
- AI-generated content was only sanitized at display time
- No validation for dangerous patterns before processing

**After:**
```tsx
const validateAiResponse = (html: string): { safe: boolean; sanitized: string } => {
  const hasDangerous = containsDangerousContent(html)
  if (hasDangerous) {
    console.warn('AI response contained potentially dangerous content')
  }
  
  const sanitized = sanitizeHtml(html, { 
    allowIframes: false,
    allowImages: true,
    maxLength: 50000,
  })
  
  return { safe: !hasDangerous, sanitized }
}
```

**Security Improvements:**
- Pre-validates AI-generated content for dangerous patterns
- Sanitizes both current and suggested content
- Prevents XSS via AI-generated responses

### Components Already Secure (Verified)

The following components already use `sanitizeHtml` correctly:
- `src/components/knowledge/ContentRenderers.tsx` - FAQAccordion
- `src/components/documents/DocumentViewer.tsx`
- `src/components/knowledge/MobileKnowledgeViewer.tsx`
- `src/pages/training/TrainingPlayer.tsx` - RichTextBlockContent
- `src/pages/training/TrainingPlayerEnhanced.tsx`

## 2. INPUT VALIDATION ENHANCEMENTS

### A. `src/lib/validation.ts` (ENHANCED)

**New Security Features:**

1. **HTML Injection Prevention**:
```typescript
const noHtmlCheck = (value: string): boolean => {
  const htmlPattern = /<[^>]*>/
  const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
  return !htmlPattern.test(value) && !scriptPattern.test(value)
}
```

2. **Safe URL Validation**:
```typescript
const safeUrlCheck = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
```

3. **Control Character Filtering**:
```typescript
const noControlCharsCheck = (value: string): boolean => {
  return !/[\x00-\x1F\x7F-\x9F]/.test(value)
}
```

4. **Enhanced Zod Schemas**:
- `knowledgeArticleSchema` - New schema with strict validation
- `documentSchema` - Enhanced with HTML check
- `userSchema` - Enhanced email validation
- All text fields now validate against HTML injection

**Example Schema Usage:**
```typescript
import { knowledgeArticleSchema, validateForm } from '@/lib/validation'

const result = validateForm(knowledgeArticleSchema, formData)
if (!result.success) {
  // Handle validation errors securely
  console.error(result.errors)
}
```

## 3. OUTPUT ENCODING UTILITIES

### `src/lib/encoding.ts` (NEW FILE)

Provides context-aware encoding to prevent XSS in different contexts:

```typescript
// For HTML content
encodeHtml('<script>alert("xss")</script>')
// Returns: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;

// For JavaScript strings
encodeJs('"; alert("xss"); //')
// Returns: \"; alert(\"xss\"); //

// For CSS values
encodeCss('expression(alert("xss"))')
// Returns: (filtered)

// For URLs
encodeUrlComponent('<script>')
// Returns: %3Cscript%3E
```

## 4. CSRF PROTECTION

### A. `src/lib/security.ts` - CSRF Utilities

```typescript
// Generate secure random token
export const generateCsrfToken = (): string => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Get or create token
export const getCsrfToken = (): string => { ... }

// Validate token
export const validateCsrfToken = (token: string): boolean => { ... }
```

### B. `src/lib/security-middleware.ts` - CsrfProtection Class

```typescript
export class CsrfProtection {
  static getToken(): string
  static validateToken(token: string): boolean
  static clearToken(): void
  static generateToken(): string
  static getHeaders(): Record<string, string>
  static refreshToken(): string
}

// React hook
export function useCsrfProtection() {
  return {
    token: CsrfProtection.getToken(),
    headers: CsrfProtection.getHeaders(),
    refresh: () => CsrfProtection.refreshToken(),
    validate: (token: string) => CsrfProtection.validateToken(token),
  }
}
```

### C. `src/lib/supabase.ts` - CSRF Headers

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'X-Client-Info': 'phg-connect/1.0.0',
      'X-CSRF-Token': getCsrfToken(),
      'X-Requested-With': 'XMLHttpRequest'
    }
  }
})
```

## 5. ERROR HANDLING IMPROVEMENTS

### Safe Error Messages

```typescript
export const SAFE_ERROR_MESSAGES = {
  generic: 'An error occurred. Please try again later.',
  network: 'Network error. Please check your connection and try again.',
  validation: 'Invalid input. Please check your data and try again.',
  authentication: 'Authentication failed. Please sign in again.',
  authorization: 'You do not have permission to perform this action.',
  notFound: 'The requested resource was not found.',
  server: 'Server error. Please try again later.',
  timeout: 'Request timed out. Please try again.',
}
```

### Error Sanitization

```typescript
export const sanitizeErrorMessage = (error: unknown, context?: string): string => {
  // In production, always return generic messages
  const isDev = import.meta.env?.DEV
  
  if (!isDev) {
    return SAFE_ERROR_MESSAGES.generic
  }

  // In development, sanitize before displaying
  if (error instanceof Error) {
    const sanitized = sanitizePlainText(error.message)
    return `[${context || 'Error'}] ${sanitized}`
  }

  return SAFE_ERROR_MESSAGES.generic
}
```

## 6. DEPENDENCY SECURITY

### Verified Dependencies

The following security-critical dependencies are present in `package.json`:

```json
{
  "dependencies": {
    "dompurify": "^3.3.1",      // HTML sanitization
    "zod": "^4.1.13"             // Schema validation
  },
  "devDependencies": {
    "@types/dompurify": "^3.0.5" // TypeScript types
  }
}
```

### DOMPurify Configuration

Default configuration in `security.ts`:

```typescript
return DOMPurify.sanitize(html, {
  ALLOWED_TAGS: [
    // Safe semantic HTML only
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'blockquote', 'pre', 'code', 'hr', 'br',
    'div', 'span', 'details', 'summary',
    'b', 'i', 'strong', 'em', 'strike', 'u', 'mark',
    'ul', 'ol', 'li',
    'a',
    'table', 'thead', 'tbody', 'tfoot', 'caption', 'tr', 'th', 'td',
    'img', 'figure', 'figcaption',
    'video', 'source',
    'iframe', // Only from trusted origins (validated in hook)
  ],
  ALLOWED_ATTR: [
    'id', 'class', 'dir', 'lang', 'title',
    'href', 'src', 'alt', 'name', 'target', 'rel', 'type',
    'width', 'height', 'loading',
    'controls', 'poster', 'preload',
    'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'sandbox',
    'colspan', 'rowspan', 'scope', 'align',
  ],
  ALLOW_DATA_ATTR: false,  // Block data-* attributes
  ALLOW_ARIA_ATTR: true,   // Allow accessibility attributes
  KEEP_CONTENT: true,
})
```

## 7. SECURITY INDEX

### `src/lib/security/index.ts`

Centralized export for all security utilities:

```typescript
// Core sanitization
export { sanitizeHtml, sanitizePlainText, sanitizeSvg, sanitizeUrl } from '../security'

// Encoding
export { encodeHtml, encodeJs, encodeCss, encodeUrl } from '../encoding'

// CSRF
export { getCsrfToken, validateCsrfToken, CsrfProtection } from '../security-middleware'

// Error handling
export { SAFE_ERROR_MESSAGES, getUserFriendlyError } from '../security'

// Middleware
export { SecurityMiddleware, useRateLimiter } from '../security-middleware'
```

## Summary of Changes

| Category | Files Created | Files Modified | Files Verified |
|----------|--------------|----------------|----------------|
| XSS Prevention | 2 (security.ts, encoding.ts) | 2 (DocumentBlockRenderer, AIAssistPanel) | 6 |
| Input Validation | 0 | 1 (validation.ts) | - |
| Output Encoding | 1 (encoding.ts) | 0 | - |
| CSRF Protection | 0 | 2 (security-middleware.ts, supabase.ts) | - |
| Error Handling | 0 | 1 (validation.ts) | - |
| Documentation | 1 (SECURITY_FIXES.md) | 0 | - |

## Security Checklist

- [x] All `dangerouslySetInnerHTML` usage reviewed and secured
- [x] DOMPurify configured with strict defaults
- [x] URL sanitization to prevent javascript: protocol injection
- [x] Input validation schemas with HTML injection prevention
- [x] Output encoding utilities for different contexts
- [x] CSRF token generation and validation
- [x] CSRF headers added to all API requests
- [x] Safe error messages (no information disclosure in production)
- [x] Security documentation created
- [x] Security utilities exported from centralized index

## Recommendations

1. **Regular Security Audits**: Run `npm audit` regularly to check for dependency vulnerabilities
2. **Content Security Policy**: Implement a strict CSP header on the server
3. **Security Headers**: Add security headers (X-Frame-Options, X-Content-Type-Options, etc.)
4. **Regular Penetration Testing**: Test the application with security scanning tools
5. **Developer Training**: Ensure all developers understand XSS prevention techniques
