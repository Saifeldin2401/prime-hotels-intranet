# Security Quick Reference Guide

## Altus Connect Intranet Platform - Developer Security Cheat Sheet

---

## 🔒 Input Validation Patterns

### Zod Schema Templates

```typescript
// User Input
const userInputSchema = z.object({
  name: z.string().min(2).max(50).regex(/^[a-zA-Z\s'-]+$/),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  department: z.enum(['hr', 'finance', 'ops', 'front_office'])
})

// UUID Validation
const uuidSchema = z.string().uuid()

// Safe Search
const searchSchema = z.object({
  query: z.string().min(1).max(100).regex(/^[\w\s-]+$/),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
})

// File Upload
const fileSchema = z.instanceof(File)
  .refine(f => f.size < 5 * 1024 * 1024, 'Max 5MB')
  .refine(f => ['image/jpeg', 'image/png'].includes(f.type), 'Only images')
```

### Validate Function

```typescript
async function safeQuery<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    logSecurityEvent('validation_failed', { errors: result.error.issues })
    throw new Error('Invalid input')
  }
  return result.data
}
```

---

## 🔐 Authentication & Session

### Login Pattern

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: validatedEmail,
  password: validatedPassword
})

if (error) {
  // Generic error - don't reveal if email exists
  throw new Error('Invalid credentials')
}

await auditLog.login()
```

### Password Change

```typescript
const passwordSchema = z.object({
  current: z.string().min(1),
  new: z.string()
    .min(8)
    .regex(/[A-Z]/, 'Uppercase required')
    .regex(/[a-z]/, 'Lowercase required')
    .regex(/\d/, 'Number required')
    .regex(/[@$!%*?&]/, 'Special char required'),
  confirm: z.string()
}).refine(d => d.new === d.confirm, "Passwords don't match")
```

### Session Timeout Hook

```typescript
export function useSessionTimeout(minutes: number = 30) {
  const { signOut } = useAuth()
  
  useEffect(() => {
    let timeout: NodeJS.Timeout
    
    const reset = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        signOut()
        toast.info('Session expired')
      }, minutes * 60 * 1000)
    }
    
    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown', reset)
    reset()
    
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('keydown', reset)
    }
  }, [signOut, minutes])
}
```

---

## 🛡️ XSS Prevention

### Sanitize HTML

```typescript
import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a']
const ALLOWED_ATTR = ['href', 'target', 'rel']

function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false
  })
}
```

### Safe Link Rendering

```typescript
function SafeLink({ href, children }: { href: string; children: React.ReactNode }) {
  // Block javascript: URLs
  if (href.startsWith('javascript:') || href.startsWith('data:')) {
    return <span>{children}</span>
  }
  
  const isExternal = href.startsWith('http')
  
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  )
}
```

### Escape for Different Contexts

```typescript
// HTML content
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// HTML attribute
function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// CSS value (never use user input in CSS!)
// ❌ DON'T: style={{ color: userInput }}
// ✅ DO: Use predefined classes only
```

---

## 🗄️ Database Security

### RLS Policy Template

```sql
-- Basic ownership check
CREATE POLICY "Users own their data" ON table_name
  FOR ALL USING (user_id = auth.uid());

-- Role-based access
CREATE POLICY "Admins can access all" ON table_name
  FOR ALL USING (is_admin(auth.uid()));

-- Property-scoped access
CREATE POLICY "Users can access their property data" ON table_name
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_properties up
      WHERE up.user_id = auth.uid()
      AND up.property_id = table_name.property_id
    )
  );
```

### Atomic Operations

```typescript
// Optimistic locking with version
const { data, error } = await supabase
  .from('documents')
  .update({
    content: newContent,
    version: currentVersion + 1,
    updated_at: new Date().toISOString()
  })
  .eq('id', documentId)
  .eq('version', currentVersion) // Prevent conflicts
  .select()
  .single()

if (error) {
  throw new ConflictError('Document was modified by another user')
}
```

---

## 📁 File Upload Security

### Client-Side Validation

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type' }
  }
  
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File too large (max 5MB)' }
  }
  
  // Extension check
  const ext = file.name.split('.').pop()?.toLowerCase()
  const validExts: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'application/pdf': ['pdf']
  }
  
  if (!validExts[file.type]?.includes(ext || '')) {
    return { valid: false, error: 'Extension mismatch' }
  }
  
  return { valid: true }
}
```

### Secure Upload Flow

```typescript
async function uploadFile(file: File): Promise<string> {
  // 1. Validate
  const validation = validateFile(file)
  if (!validation.valid) throw new Error(validation.error)
  
  // 2. Generate secure filename
  const ext = file.name.split('.').pop()
  const filename = `${crypto.randomUUID()}.${ext}`
  
  // 3. Upload
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(filename, file, {
      contentType: file.type,
      upsert: false
    })
  
  if (error) throw error
  return data.path
}
```

---

## 🔍 Audit Logging

### Quick Log Patterns

```typescript
import { logAuditEvent } from '@/lib/auditLog'

// User actions
await logAuditEvent({
  event_type: 'user.login',
  entity_type: 'user',
  description: 'User logged in'
})

// Data access
await logAuditEvent({
  event_type: 'document.viewed',
  entity_type: 'document',
  entity_id: docId,
  description: `Viewed: ${docTitle}`,
  metadata: { doc_title: docTitle }
})

// Permission denied
await logAuditEvent({
  event_type: 'permission_denied',
  entity_type: 'security',
  description: `Access denied: ${action}`,
  severity: 'warning'
})

// Data export
await logAuditEvent({
  event_type: 'export.data',
  entity_type: 'export',
  description: `Exported ${count} records`,
  metadata: { type, count, filters },
  severity: 'info'
})
```

---

## 🚨 Error Handling

### Safe Error Pattern

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
  }
}

function handleApiError(error: unknown): { message: string; code: string } {
  // Log full error (with PII redaction)
  if (error instanceof Error) {
    Sentry.captureException(error)
    console.error('[Error]', error.message)
  }
  
  // Return safe message to user
  if (error instanceof AppError) {
    return { message: error.message, code: error.code }
  }
  
  return {
    message: 'An error occurred. Please try again.',
    code: 'INTERNAL_ERROR'
  }
}
```

### Error Boundary

```typescript
class SecurityErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, { extra: info })
    logAuditEvent({
      event_type: 'client.error',
      description: 'React error boundary caught error',
      metadata: { error: error.message }
    })
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorMessage message="Something went wrong" />
    }
    return this.props.children
  }
}
```

---

## 🌐 API Security

### Rate Limiting Pattern

```typescript
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimits.get(key)
  
  if (!record || now > record.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  
  if (record.count >= maxRequests) {
    return false
  }
  
  record.count++
  return true
}

// Usage
if (!checkRateLimit(`login:${email}`, 5, 15 * 60 * 1000)) {
  throw new Error('Too many attempts. Try again later.')
}
```

### CSRF Protection

```typescript
// Generate token
const csrfToken = crypto.randomUUID()
sessionStorage.setItem('csrf_token', csrfToken)

// Include in form
<form>
  <input type="hidden" name="csrf_token" value={csrfToken} />
</form>

// Verify on submit
const stored = sessionStorage.getItem('csrf_token')
if (formToken !== stored) {
  throw new Error('Invalid request')
}
```

---

## 🧪 Security Testing Checklist

### Manual Tests

```markdown
## Input Validation
- [ ] Submit empty strings in required fields
- [ ] Submit strings > max length
- [ ] Submit special characters: < > " ' & ; 
- [ ] Submit SQL keywords: DROP, DELETE, UNION
- [ ] Submit JavaScript: <script>alert(1)</script>
- [ ] Submit path traversal: ../../../etc/passwd

## Authentication
- [ ] Try SQL injection in login fields
- [ ] Test account lockout after failed attempts
- [ ] Verify session expires correctly
- [ ] Test password reset token expiration
- [ ] Attempt concurrent session limits

## Authorization
- [ ] Access resources with different user IDs in URL
- [ ] Try admin functions as regular user
- [ ] Access deleted/archived resources
- [ ] Test cross-property data access

## File Upload
- [ ] Upload .exe disguised as .jpg
- [ ] Upload large files (> limit)
- [ ] Upload PHP/JS files
- [ ] Test file type spoofing
- [ ] Upload SVG with embedded scripts

## API Security
- [ ] Test rate limiting
- [ ] Send invalid JSON
- [ ] Send oversized payloads
- [ ] Test without authentication
- [ ] Test with expired tokens
```

---

## 📋 Code Review Security Checklist

### Before Merging

```markdown
- [ ] All user inputs validated with Zod
- [ ] No `dangerouslySetInnerHTML` without DOMPurify
- [ ] Database queries use parameterized statements
- [ ] RLS policies exist for new tables
- [ ] Sensitive data encrypted (not just base64)
- [ ] No secrets in code or logs
- [ ] Error messages are generic
- [ ] Audit logging added for sensitive operations
- [ ] Rate limiting considered
- [ ] CSRF protection in place
- [ ] File uploads validated
- [ ] No hardcoded credentials
- [ ] HTTPS enforced for external calls
```

---

## 🔧 Security Utils

### PII Detection

```typescript
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b(?:\d{4}[- ]?){3}\d{4}\b/g
}

function detectPII(text: string): string[] {
  const found: string[] = []
  
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    if (pattern.test(text)) {
      found.push(type)
    }
  }
  
  return found
}

function sanitizeForLogging(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitive = ['password', 'token', 'secret', 'key', 'ssn', 'credit_card']
  const sanitized: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}
```

### Secure Random

```typescript
// Cryptographically secure random
function secureRandom(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

// Secure token generation
function generateToken(): string {
  return crypto.randomUUID()
}
```

---

## 📚 Quick Links

- [OWASP Top 10](https://owasp.org/Top10/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Supabase Security](https://supabase.com/docs/guides/security)
- [MDN Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [React Security](https://react.dev/reference/react)

---

**Print this page and keep it handy while coding!**

Last Updated: April 2025
