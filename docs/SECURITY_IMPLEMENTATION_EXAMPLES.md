# Security Implementation Examples

## Real-World Patterns from PHG Connect Codebase

This document provides concrete examples of security implementations used throughout the PHG Connect intranet platform.

---

## Table of Contents

1. [Row Level Security (RLS) Implementation](#1-row-level-security-rls-implementation)
2. [Input Validation with Zod](#2-input-validation-with-zod)
3. [XSS Prevention with DOMPurify](#3-xss-prevention-with-dompurify)
4. [Secure Storage Implementation](#4-secure-storage-implementation)
5. [Audit Logging](#5-audit-logging)
6. [Session Management](#6-session-management)
7. [Error Handling](#7-error-handling)
8. [File Upload Security](#8-file-upload-security)
9. [API Rate Limiting](#9-api-rate-limiting)
10. [CSRF Protection](#10-csrf-protection)

---

## 1. Row Level Security (RLS) Implementation

### Document Access Policy

```sql
-- From: supabase/migrations/20251212180705_fix_draft_visibility_strict_rls.sql

-- Users can only see documents they have access to
CREATE POLICY "Users can view accessible documents" ON documents
  FOR SELECT USING (
    -- User is the author
    created_by = auth.uid()
    
    -- OR document is approved and user has property access
    OR (
      status = 'approved'
      AND (
        is_public = true
        OR property_id IS NULL
        OR EXISTS (
          SELECT 1 FROM user_properties up
          WHERE up.user_id = auth.uid()
          AND up.property_id = documents.property_id
        )
      )
    )
    
    -- OR user is admin
    OR is_admin(auth.uid())
  );
```

### Property-Scoped Training Modules

```sql
-- From: supabase/migrations/20251221020625_resolve_training_module_write_target.sql

CREATE POLICY "Users can view modules in their property" ON training_modules
  FOR SELECT USING (
    -- Global modules
    is_global = true
    
    -- OR modules in user's property
    OR EXISTS (
      SELECT 1 FROM user_properties up
      WHERE up.user_id = auth.uid()
      AND (
        up.property_id = training_modules.property_id
        OR training_modules.property_id IS NULL
      )
    )
    
    -- OR user is admin/corporate
    OR has_role(auth.uid(), 'regional_admin')
    OR has_role(auth.uid(), 'regional_hr')
  );
```

### Approval Workflow Security

```sql
-- From: supabase/migrations/20260204012736_add_atomic_document_approval.sql

-- Only authorized approvers can approve
CREATE POLICY "Only authorized approvers can update approvals" ON document_approvals
  FOR UPDATE USING (
    -- User is the assigned approver
    approver_id = auth.uid()
    
    -- OR user is delegated approver
    OR EXISTS (
      SELECT 1 FROM approval_delegations ad
      WHERE ad.approval_id = document_approvals.id
      AND ad.delegated_to = auth.uid()
      AND ad.status = 'active'
      AND (ad.expires_at IS NULL OR ad.expires_at > NOW())
    )
    
    -- OR user is admin
    OR is_admin(auth.uid())
  );
```

---

## 2. Input Validation with Zod

### User Schema Validation

```typescript
// From: src/lib/validation.ts

import { z } from 'zod'

// Common patterns
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const phonePattern = /^[+]?[1-9][\d]{0,15}$/
export const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
export const namePattern = /^[a-zA-Z\s'-]{2,50}$/

// User creation schema
export const userSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .regex(emailPattern, 'Invalid email format'),
  full_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .regex(namePattern, 'Invalid name format'),
  phone: z.string()
    .regex(phonePattern, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  role: z.enum([
    'regional_admin',
    'regional_hr',
    'property_manager',
    'property_hr',
    'department_head',
    'staff'
  ]),
  property_id: z.string()
    .uuid('Invalid property ID')
    .optional(),
  department_id: z.string()
    .uuid('Invalid department ID')
    .optional(),
  employee_id: z.string()
    .regex(/^[A-Z]{2}\d{4,6}$/, 'Invalid employee ID format (e.g., AB1234)'),
  is_active: z.boolean()
    .default(true)
})

// Password change with strong requirements
export const passwordChangeSchema = z.object({
  current_password: z.string()
    .min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordPattern, 'Password must contain uppercase, lowercase, number, and special character'),
  confirm_password: z.string()
    .min(1, 'Password confirmation is required')
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
})
```

### Form Validation Utility

```typescript
// From: src/lib/validation.ts

export const validateForm = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } => {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.issues.forEach((err) => {
        const path = err.path.join('.')
        errors[path] = err.message
      })
      return { success: false, errors }
    }
    return { success: false, errors: { _form: 'Validation failed' } }
  }
}

// Usage in component:
function UserForm() {
  const handleSubmit = (rawData: unknown) => {
    const result = validateForm(userSchema, rawData)
    
    if (!result.success) {
      setErrors(result.errors)
      return
    }
    
    // result.data is now typed and validated
    saveUser(result.data)
  }
}
```

---

## 3. XSS Prevention with DOMPurify

### HTML Sanitization

```typescript
// From: src/lib/sanitize.ts

import DOMPurify from 'dompurify'

// Trusted video embed domains
const TRUSTED_IFRAME_ORIGINS = [
  'https://www.youtube.com',
  'https://youtube.com',
  'https://www.youtube-nocookie.com',
  'https://player.vimeo.com',
  'https://vimeo.com',
  'https://htsvjfrofcpkfzvjpwvx.supabase.co',
]

// Configure DOMPurify hooks
function ensureHooksInitialized() {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node instanceof Element) {
      // Sanitize class names
      const sanitizedClassName = sanitizeClassNameList(node.getAttribute('class'))
      if (sanitizedClassName) node.setAttribute('class', sanitizedClassName)
      else node.removeAttribute('class')
    }

    // Secure anchor tags opened in new tabs
    if (node instanceof HTMLAnchorElement) {
      const target = node.getAttribute('target')
      if (target === '_blank') {
        const existingRel = node.getAttribute('rel')
        const relParts = new Set((existingRel || '').split(' ').map(s => s.trim()).filter(Boolean))
        relParts.add('noopener')
        relParts.add('noreferrer')
        node.setAttribute('rel', Array.from(relParts).join(' '))
      }
    }

    // Validate iframe src
    if (node instanceof HTMLIFrameElement) {
      const src = node.getAttribute('src') || ''
      const isTrusted = TRUSTED_IFRAME_ORIGINS.some(origin => src.startsWith(origin))
      if (!isTrusted) {
        node.remove() // Remove untrusted iframes
      } else {
        // Enforce safe sandbox attributes
        node.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture')
        node.setAttribute('allowfullscreen', '')
        node.setAttribute('loading', 'lazy')
      }
    }
  })
}

export const sanitizeHtml = (html: string | null | undefined): string => {
  if (!html) return ''

  ensureHooksInitialized()

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      // Text structure
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'blockquote', 'pre', 'code', 'hr', 'br',
      'div', 'span', 'details', 'summary',
      // Inline formatting
      'b', 'i', 'strong', 'em', 'strike', 'u', 'mark', 'sub', 'sup',
      // Lists
      'ul', 'ol', 'li',
      // Links
      'a',
      // Tables
      'table', 'thead', 'tbody', 'tfoot', 'caption', 'tr', 'th', 'td',
      // Media
      'img', 'figure', 'figcaption',
      // Video
      'video', 'source',
      'iframe', // Validated in hook
    ],
    ALLOWED_ATTR: [
      'id', 'class', 'dir', 'lang', 'title',
      // Links, images & videos
      'href', 'src', 'alt', 'name', 'target', 'rel', 'type',
      // Media attributes
      'width', 'height', 'loading',
      'controls', 'poster', 'preload', 'autoplay', 'muted', 'loop',
      // Iframes
      'allow', 'allowfullscreen', 'frameborder',
      // Tables
      'colspan', 'rowspan', 'scope', 'align',
    ],
    ALLOW_DATA_ATTR: false, // Block data-* attributes
    ADD_TAGS: ['iframe', 'video', 'source'],
    ADD_ATTR: ['allowfullscreen', 'allow', 'loading', 'controls', 'poster', 'preload', 'autoplay', 'muted', 'loop'],
  })
}
```

### Usage in Rich Text Editor

```typescript
// From: src/components/knowledge/ContentRenderers.tsx

import { sanitizeHtml } from '@/lib/sanitize'

function RichTextContent({ html }: { html: string }) {
  // Always sanitize before rendering
  const sanitizedHtml = useMemo(() => sanitizeHtml(html), [html])
  
  return (
    <div 
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}
```

---

## 4. Secure Storage Implementation

### Encrypted Local Storage

```typescript
// From: src/lib/secureStorage.ts

const SECURE_STORAGE_KEY = 'prime_secure_storage_key_v1'

const encodeBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

const decodeBase64 = (value: string): Uint8Array => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const getOrCreateKey = async (): Promise<CryptoKey | null> => {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null

  // Try to get existing key from storage
  const existing = localStorage.getItem(SECURE_STORAGE_KEY)
    ?? sessionStorage.getItem(SECURE_STORAGE_KEY)

  if (existing) {
    const rawKey = decodeBase64(existing)
    return window.crypto.subtle.importKey(
      'raw',
      rawKey.buffer,
      'AES-GCM',
      false,
      ['encrypt', 'decrypt']
    )
  }

  // Generate new 256-bit key
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  
  const raw = new Uint8Array(await window.crypto.subtle.exportKey('raw', key))
  const encodedKey = encodeBase64(raw)
  
  // Store in both local and session storage for redundancy
  localStorage.setItem(SECURE_STORAGE_KEY, encodedKey)
  sessionStorage.setItem(SECURE_STORAGE_KEY, encodedKey)
  
  return key
}

const encryptPayload = async (payload: unknown): Promise<string | null> => {
  const key = await getOrCreateKey()
  if (!key) return null

  // Generate random IV (12 bytes for AES-GCM)
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(JSON.stringify(payload))
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer },
    key,
    data
  )
  
  const cipherBytes = new Uint8Array(encrypted)
  
  // Format: version:iv:ciphertext
  return `v1:${encodeBase64(iv)}:${encodeBase64(cipherBytes)}`
}

export const setEncryptedLocalStorage = async (key: string, value: unknown): Promise<void> => {
  try {
    const encrypted = await encryptPayload(value)
    if (encrypted) {
      localStorage.setItem(key, encrypted)
      return
    }
  } catch {
    // Fall through to plaintext if encryption fails
  }

  // Fallback: store as plaintext JSON
  localStorage.setItem(key, JSON.stringify(value))
}

export const getEncryptedLocalStorage = async <T>(key: string): Promise<T | null> => {
  const raw = localStorage.getItem(key)
  if (!raw) return null

  // Try to decrypt
  if (raw.startsWith('v1:')) {
    const decrypted = await decryptPayload<T>(raw)
    if (decrypted !== null) return decrypted
  }

  // Try plaintext fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
```

---

## 5. Audit Logging

### Audit Log Implementation

```typescript
// From: src/lib/auditLog.ts

export type AuditEventType =
  | 'user.login' | 'user.logout' | 'user.password_change' | 'user.profile_update'
  | 'document.created' | 'document.updated' | 'document.deleted' | 'document.viewed' | 'document.downloaded'
  | 'approval.created' | 'approval.approved' | 'approval.rejected' | 'approval.delegated'
  | 'training.completed' | 'training.assigned'
  | 'export.data' | 'admin.action' | 'permission_denied'

export interface AuditLogEntry {
  event_type: AuditEventType
  entity_type?: string
  entity_id?: string
  description?: string
  metadata?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
}

// UUID validation helper
function isUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    // Ensure valid entity_id
    const entityId = isUuid(entry.entity_id) 
      ? entry.entity_id 
      : (entry.entity_type === 'user' && isUuid(userId)) 
        ? userId 
        : crypto.randomUUID()

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: entry.event_type,
        entity_type: entry.entity_type || 'system',
        entity_id: entityId,
        details: {
          description: entry.description,
          metadata: entry.metadata || {},
        },
        ip_address: entry.ip_address,
        user_agent: entry.user_agent || navigator.userAgent
      })

    if (error) {
      console.error('Audit log error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown audit log error'
    console.error('Audit log exception:', err)
    return { success: false, error: errorMessage }
  }
}

// Convenience methods
export const auditLog = {
  login: () => logAuditEvent({
    event_type: 'user.login',
    entity_type: 'user',
    description: 'User logged in'
  }),

  logout: () => logAuditEvent({
    event_type: 'user.logout',
    entity_type: 'user',
    description: 'User logged out'
  }),

  passwordChange: () => logAuditEvent({
    event_type: 'user.password_change',
    entity_type: 'user',
    description: 'Password changed'
  }),

  documentViewed: (docId: string, docName: string) => logAuditEvent({
    event_type: 'document.viewed',
    entity_type: 'document',
    entity_id: docId,
    description: `Viewed document: ${docName}`,
    metadata: { document_name: docName }
  }),

  documentDownloaded: (docId: string, docName: string) => logAuditEvent({
    event_type: 'document.downloaded',
    entity_type: 'document',
    entity_id: docId,
    description: `Downloaded document: ${docName}`,
    metadata: { document_name: docName }
  }),

  dataExported: (exportType: string, recordCount: number) => logAuditEvent({
    event_type: 'export.data',
    entity_type: 'export',
    description: `Exported ${recordCount} ${exportType} records`,
    metadata: { export_type: exportType, record_count: recordCount }
  }),

  adminAction: (action: string, details?: object) => logAuditEvent({
    event_type: 'admin.action',
    entity_type: 'admin',
    description: action,
    metadata: details
  })
}
```

### Usage in Components

```typescript
// Document viewer with audit logging
function DocumentViewer({ documentId }: { documentId: string }) {
  const { data: document } = useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()
      
      // Log view event
      if (data) {
        await auditLog.documentViewed(documentId, data.title)
      }
      
      return data
    }
  })
  
  const handleDownload = async () => {
    // Perform download
    await downloadDocument(document)
    
    // Log download
    await auditLog.documentDownloaded(documentId, document.title)
  }
  
  return (
    <div>
      <h1>{document?.title}</h1>
      <button onClick={handleDownload}>Download</button>
    </div>
  )
}
```

---

## 6. Session Management

### Supabase Client Configuration

```typescript
// From: src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js'
import { validateEnvironment } from './env-validation'

const env = validateEnvironment()

// Validate HTTPS in production
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl.startsWith('https://')) {
  throw new Error('Supabase URL must use HTTPS for security')
}

// Safe storage wrapper with fallback
const createSafeStorage = (preferred: 'local' | 'session') => {
  const memoryStore = new Map<string, string>()

  const getNativeStorage = (): Storage | null => {
    if (typeof window === 'undefined') return null
    try {
      const storage = preferred === 'local' ? window.localStorage : window.sessionStorage
      const testKey = '__storage_test__'
      storage.setItem(testKey, '1')
      storage.removeItem(testKey)
      return storage
    } catch {
      return null
    }
  }

  return {
    getItem: (key: string) => {
      const nativeStorage = getNativeStorage()
      if (nativeStorage) return nativeStorage.getItem(key)
      return memoryStore.get(key) ?? null
    },
    setItem: (key: string, value: string) => {
      const nativeStorage = getNativeStorage()
      if (nativeStorage) {
        nativeStorage.setItem(key, value)
        return
      }
      memoryStore.set(key, value)
    },
    removeItem: (key: string) => {
      const nativeStorage = getNativeStorage()
      if (nativeStorage) {
        nativeStorage.removeItem(key)
        return
      }
      memoryStore.delete(key)
    },
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,        // Automatically refresh session
    persistSession: true,          // Store session in storage
    detectSessionInUrl: false,     // Disabled: prevent token leakage in URL
    storage: createSafeStorage('local'),
  },
  global: {
    headers: {
      'X-Client-Info': 'phg-connect/1.0.0'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10          // Rate limit real-time events
    }
  }
})
```

### Inactivity Timeout Hook

```typescript
// From: src/hooks/useInactivityTimeout.ts

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const WARNING_BEFORE = 2 * 60 * 1000      // 2 minutes warning

export function useInactivityTimeout() {
  const { signOut } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const warningRef = useRef<NodeJS.Timeout>()
  
  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    
    setShowWarning(false)
    
    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true)
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE)
    
    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      signOut()
      toast.info('You have been logged out due to inactivity')
    }, INACTIVITY_TIMEOUT)
  }, [signOut])
  
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    
    const handleActivity = () => resetTimer()
    
    events.forEach(e => document.addEventListener(e, handleActivity))
    resetTimer()
    
    return () => {
      events.forEach(e => document.removeEventListener(e, handleActivity))
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
    }
  }, [resetTimer])
  
  return { showWarning, dismissWarning: resetTimer }
}
```

---

## 7. Error Handling

### Secure Error Handler

```typescript
// From: src/hooks/useErrorHandler.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export function useErrorHandler() {
  const handleError = useCallback((error: Error | AppError, context?: object) => {
    // Log full error internally
    if (import.meta.env.PROD) {
      Sentry.captureException(error, { extra: context })
    } else {
      console.group('🚨 Error Details')
      console.error(error)
      if (context) console.table(context)
      console.groupEnd()
    }
    
    // Return safe message for UI
    if (error instanceof AppError && error.isOperational) {
      toast.error(error.message)
      return {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      }
    }
    
    // Unknown error - generic message
    toast.error('An unexpected error occurred. Please try again.')
    return {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      statusCode: 500
    }
  }, [])
  
  return { handleError }
}
```

### Error Boundary

```typescript
// From: src/components/common/ErrorBoundary.tsx

import { Component, ErrorInfo, ReactNode } from 'react'
import * as Sentry from '@sentry/react'
import { auditLog } from '@/lib/auditLog'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry
    Sentry.captureException(error, { extra: errorInfo })
    
    // Log to audit system
    auditLog.adminAction('client_error', {
      error_message: error.message,
      component_stack: errorInfo.componentStack
    })
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center">
          <h2 className="text-lg font-semibold text-red-600">Something went wrong</h2>
          <p className="text-gray-600">Please refresh the page or contact support.</p>
          {import.meta.env.DEV && (
            <pre className="mt-4 text-left text-sm bg-gray-100 p-4 rounded overflow-auto">
              {this.state.error?.stack}
            </pre>
          )}
        </div>
      )
    }
    
    return this.props.children
  }
}
```

---

## 8. File Upload Security

### File Upload Validation

```typescript
// From: src/components/documents/DocumentUploader.tsx

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

interface FileValidation {
  valid: boolean
  error?: string
}

function validateFile(file: File): FileValidation {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `File type not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}` 
    }
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` 
    }
  }
  
  // Verify extension matches MIME type
  const extension = file.name.split('.').pop()?.toLowerCase()
  const expectedExtensions: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'application/pdf': ['pdf'],
    'text/plain': ['txt'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx']
  }
  
  if (!expectedExtensions[file.type]?.includes(extension || '')) {
    return { 
      valid: false, 
      error: 'File extension does not match content type' 
    }
  }
  
  return { valid: true }
}

export function DocumentUploader() {
  const [uploading, setUploading] = useState(false)
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    
    // Validate
    const validation = validateFile(file)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }
    
    setUploading(true)
    
    try {
      // Generate secure filename (no original name)
      const fileExt = file.name.split('.').pop()
      const secureName = `${crypto.randomUUID()}.${fileExt}`
      
      // Upload with metadata
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(secureName, file, {
          contentType: file.type,
          upsert: false,
          cacheControl: '3600'
        })
      
      if (error) throw error
      
      // Save document record
      await supabase.from('documents').insert({
        title: file.name, // Original name for display only
        file_path: data.path,
        file_size: file.size,
        mime_type: file.type,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      
      toast.success('Document uploaded successfully')
    } catch (error) {
      toast.error('Upload failed')
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }, [])
  
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: ALLOWED_TYPES.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: MAX_FILE_SIZE,
    multiple: false
  })
  
  return (
    <div {...getRootProps()} className="border-2 border-dashed p-8">
      <input {...getInputProps()} />
      <p>Drag & drop or click to upload</p>
      {uploading && <LoadingSpinner />}
    </div>
  )
}
```

---

## 9. API Rate Limiting

### Edge Function with Rate Limiting

```typescript
// From: supabase/functions/send-email/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
}

// Simple in-memory rate limit store
// In production, use Redis or database
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)
  
  if (!record || now > record.resetAt) {
    // Reset or new entry
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT.windowMs
    })
    return { allowed: true }
  }
  
  if (record.count >= RATE_LIMIT.maxRequests) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((record.resetAt - now) / 1000)
    }
  }
  
  record.count++
  return { allowed: true }
}

serve(async (req) => {
  // Get client identifier (IP + user ID)
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  
  // Create Supabase client with service role
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // Get user from JWT
  const { data: { user } } = await supabase.auth.getUser(
    req.headers.get('authorization')?.replace('Bearer ', '') || ''
  )
  
  const identifier = `${ip}:${user?.id || 'anonymous'}`
  
  // Check rate limit
  const rateLimit = checkRateLimit(identifier)
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { 
        status: 429, 
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.retryAfter)
        } 
      }
    )
  }
  
  // Process request...
  const body = await req.json()
  
  // Validate input
  const emailSchema = z.object({
    to: z.string().email(),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(10000)
  })
  
  const validation = emailSchema.safeParse(body)
  if (!validation.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  // Send email...
  
  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
```

---

## 10. CSRF Protection

### CSRF Token Implementation

```typescript
// From: src/lib/security-config.ts

export function generateCSRFToken(): string {
  return crypto.randomUUID()
}

export function validateCSRFToken(token: string): boolean {
  const stored = sessionStorage.getItem('csrf_token')
  return token === stored && token.length === 36
}

// React hook for CSRF protection
export function useCSRF() {
  const [token, setToken] = useState<string>('')
  
  useEffect(() => {
    let stored = sessionStorage.getItem('csrf_token')
    if (!stored) {
      stored = generateCSRFToken()
      sessionStorage.setItem('csrf_token', stored)
    }
    setToken(stored)
  }, [])
  
  const validate = useCallback((submittedToken: string): boolean => {
    return submittedToken === sessionStorage.getItem('csrf_token')
  }, [])
  
  return { token, validate }
}

// Usage in form
function SecureForm() {
  const { token } = useCSRF()
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const csrfToken = formData.get('csrf_token') as string
    
    if (!validateCSRFToken(csrfToken)) {
      toast.error('Invalid form submission')
      return
    }
    
    // Proceed with submission
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="csrf_token" value={token} />
      {/* Form fields */}
    </form>
  )
}
```

### SameSite Cookie Configuration

```typescript
// Supabase Auth automatically sets secure cookies with:
// - HttpOnly (prevents XSS access)
// - Secure (HTTPS only)
// - SameSite=Lax (CSRF protection)

// Additional cookie security headers in edge functions
// supabase/functions/_shared/cors.ts

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Configure to specific origin in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Credentials': 'true',
  // Security headers
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}
```

---

## Additional Security Patterns

### Environment Validation

```typescript
// From: src/lib/env-validation.ts

import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string()
    .url()
    .refine(url => url.startsWith('https://'), {
      message: 'Supabase URL must use HTTPS'
    }),
  VITE_SUPABASE_ANON_KEY: z.string()
    .min(1, 'Supabase Anon Key is required'),
  VITE_APP_URL: z.string()
    .url()
    .refine(url => !import.meta.env.PROD || url.startsWith('https://'), {
      message: 'App URL must use HTTPS in production'
    }),
  VITE_ALLOWED_ORIGINS: z.string()
    .optional()
    .default('https://phg-connect.com')
})

export function validateEnvironment() {
  const result = envSchema.safeParse(import.meta.env)
  
  if (!result.success) {
    const errors = result.error.issues
      .map(i => `${i.path}: ${i.message}`)
      .join('\n')
    throw new Error(`Environment validation failed:\n${errors}`)
  }
  
  return result.data
}
```

### Security Headers Configuration

```typescript
// From: src/lib/security-config.ts

export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}
```

---

## Testing Security Implementations

### Unit Test Examples

```typescript
// tests/security/validation.test.ts

import { userSchema, validateForm } from '@/lib/validation'
import { sanitizeHtml } from '@/lib/sanitize'

describe('Input Validation', () => {
  it('should reject SQL injection attempts', () => {
    const malicious = {
      email: "test@test.com'; DROP TABLE users; --",
      name: 'Valid Name'
    }
    
    const result = validateForm(userSchema, malicious)
    expect(result.success).toBe(false)
  })
  
  it('should reject XSS attempts', () => {
    const malicious = {
      email: 'test@test.com',
      name: '<script>alert("xss")</script>'
    }
    
    const result = validateForm(userSchema, malicious)
    expect(result.success).toBe(false)
  })
  
  it('should validate UUID format', () => {
    const invalidUuid = 'not-a-uuid'
    const result = z.string().uuid().safeParse(invalidUuid)
    expect(result.success).toBe(false)
  })
})

describe('HTML Sanitization', () => {
  it('should remove script tags', () => {
    const dirty = '<p>Hello</p><script>alert("xss")</script>'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toContain('<script>')
  })
  
  it('should allow safe HTML', () => {
    const safe = '<p>Hello <strong>world</strong></p>'
    const clean = sanitizeHtml(safe)
    expect(clean).toBe(safe)
  })
})
```

---

## Security Checklist for Code Reviews

When reviewing code, ensure:

- [ ] All user inputs are validated with Zod schemas
- [ ] Database queries use parameterized statements (Supabase query builder)
- [ ] RLS policies exist for all new tables
- [ ] HTML rendering uses DOMPurify sanitization
- [ ] Sensitive data is encrypted before storage
- [ ] Error messages don't expose internal details
- [ ] Audit logging is added for sensitive operations
- [ ] Rate limiting is implemented for public endpoints
- [ ] CSRF tokens are used for state-changing operations
- [ ] File uploads validate type and size
- [ ] Session timeout is handled properly
- [ ] HTTPS is enforced in production
- [ ] No secrets are hardcoded in source code
- [ ] Dependencies are scanned for vulnerabilities

---

**Document Version:** 1.0  
**Last Updated:** April 2025  
**Owner:** PHG Security Team
