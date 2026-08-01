# OWASP Top 10 2021 Secure Coding Guidelines

## Altus Connect Intranet Platform - Security Standards

**Version:** 1.0.0  
**Last Updated:** April 2025  
**Classification:** Internal Use Only

---

## Table of Contents

1. [OWASP Top 10 2021 Analysis](#1-owasp-top-10-2021-analysis)
2. [Secure Coding Guidelines with Examples](#2-secure-coding-guidelines-with-examples)
3. [Vulnerable vs Secure Code Comparison](#3-vulnerable-vs-secure-code-comparison)
4. [Security Checklist](#4-security-checklist)

---

## 1. OWASP Top 10 2021 Analysis

### A01:2021 - Broken Access Control

#### Risk Explanation
Broken Access Control occurs when users can act outside their intended permissions, accessing unauthorized functionality or data. This includes accessing other users' accounts, sensitive files, or performing unauthorized actions.

#### How It Manifests in Real Applications
- Users accessing admin functions by manipulating URLs (e.g., changing `/user/123` to `/user/124`)
- Elevation of privilege through parameter tampering
- Force browsing to protected endpoints
- CORS misconfiguration allowing unauthorized API access
- Missing function-level access control on the server

#### Specific Mitigation Strategies for Altus Connect

1. **Row Level Security (RLS) Policies**: Enforce at database level
2. **Role-Based Access Control (RBAC)**: Implement hierarchical permission system
3. **Server-Side Validation**: Never trust client-side checks alone
4. **Property Scoping**: Ensure users only access their assigned properties

#### Code Examples

```typescript
// ❌ VULNERABLE: Client-side only access control
function DocumentViewer({ documentId }) {
  const { user } = useAuth()
  
  // Dangerous: Only checking on client
  if (user.role !== 'admin') {
    return <AccessDenied />
  }
  
  return <Document id={documentId} />
}

// ✅ SECURE: Server-side enforcement with RLS
// In Supabase migration:
CREATE POLICY "Users can only view documents in their property" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_properties up
      WHERE up.user_id = auth.uid()
      AND up.property_id = documents.property_id
    )
    OR is_admin(auth.uid())
  );

// Client-side with proper error handling:
function DocumentViewer({ documentId }: { documentId: string }) {
  const { data: document, error } = useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()
      
      // RLS will return null if unauthorized
      if (error || !data) {
        throw new Error('Document not found or access denied')
      }
      return data
    }
  })
  
  if (error) return <AccessDenied message={error.message} />
  return <DocumentView document={document} />
}
```

---

### A02:2021 - Cryptographic Failures

#### Risk Explanation
Cryptographic failures expose sensitive data through weak encryption, improper key management, or transmitting data in cleartext. This includes passwords, credit card numbers, health records, and PII.

#### How It Manifests in Real Applications
- Storing passwords with weak hashing (MD5, SHA1)
- Transmitting sensitive data over HTTP
- Hardcoded encryption keys in source code
- Using deprecated cryptographic algorithms
- Insufficient entropy in tokens

#### Specific Mitigation Strategies for Altus Connect

1. **Use Supabase Auth**: Built-in secure password handling
2. **Encrypted Local Storage**: For sensitive client-side data
3. **HTTPS Only**: Enforce TLS for all communications
4. **Secure Token Storage**: Proper session management

#### Code Examples

```typescript
// ❌ VULNERABLE: Storing sensitive data in plaintext localStorage
function saveUserSettings(settings: UserSettings) {
  localStorage.setItem('userSettings', JSON.stringify(settings))
}

// ❌ VULNERABLE: Weak hashing
function hashPassword(password: string): string {
  return btoa(password) // Base64 is NOT encryption!
}

// ✅ SECURE: Encrypted local storage using Web Crypto API
// src/lib/secureStorage.ts
const SECURE_STORAGE_KEY = 'altus_secure_storage_key_v1'

const getOrCreateKey = async (): Promise<CryptoKey | null> => {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null

  const existing = readFromStorage(window.localStorage, SECURE_STORAGE_KEY)
    ?? readFromStorage(window.sessionStorage, SECURE_STORAGE_KEY)

  if (existing) {
    const rawKey = decodeBase64(existing)
    return window.crypto.subtle.importKey(
      'raw', 
      toArrayBuffer(rawKey), 
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
  writeToStorage(window.localStorage, SECURE_STORAGE_KEY, encodedKey)
  return key
}

export const setEncryptedLocalStorage = async (key: string, value: unknown): Promise<void> => {
  try {
    const encrypted = await encryptPayload(value)
    if (encrypted) {
      localStorage.setItem(key, encrypted)
      return
    }
  } catch {
    // Fall through to plaintext only if encryption fails
  }
  localStorage.setItem(key, JSON.stringify(value))
}

// ✅ SECURE: Password validation using Zod with strong requirements
// src/lib/validation.ts
export const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

export const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordPattern, 'Password must contain uppercase, lowercase, number, and special character'),
  confirm_password: z.string().min(1, 'Password confirmation is required')
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
})
```

---

### A03:2021 - Injection

#### Risk Explanation
Injection flaws occur when untrusted data is sent to an interpreter as part of a command or query. Attackers can inject malicious code to execute unintended commands or access data without authorization.

#### How It Manifests in Real Applications
- SQL Injection through string concatenation in queries
- NoSQL injection in document databases
- Command injection in shell executions
- LDAP injection in directory queries
- Path traversal in file operations

#### Specific Mitigation Strategies for Altus Connect

1. **Parameterized Queries**: Use Supabase's query builder
2. **Input Validation**: Strict whitelist validation with Zod
3. **ORM/Query Builder**: Never use raw SQL with user input
4. **Edge Function Security**: Validate all inputs in server functions

#### Code Examples

```typescript
// ❌ VULNERABLE: SQL Injection through string concatenation
async function searchUsers(searchTerm: string) {
  const { data } = await supabase.rpc('search_users', {
    query: `SELECT * FROM users WHERE name LIKE '%${searchTerm}%'` // DANGEROUS!
  })
  return data
}

// ❌ VULNERABLE: NoSQL injection in filters
function getUsersByRole(role: string) {
  return supabase
    .from('users')
    .select('*')
    .filter('role', 'eq', role) // Could be manipulated if role is object
}

// ✅ SECURE: Parameterized queries with strict validation
// src/lib/validation.ts
export const userSearchSchema = z.object({
  searchTerm: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9\s'-]+$/, 'Invalid characters in search term')
})

// Secure search implementation:
async function searchUsers(searchInput: unknown) {
  // Validate input first
  const validation = userSearchSchema.safeParse(searchInput)
  if (!validation.success) {
    throw new Error('Invalid search parameters')
  }
  
  const { searchTerm } = validation.data
  
  // Use parameterized query - Supabase escapes automatically
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    .limit(50)
  
  if (error) {
    console.error('Search error:', error)
    throw new Error('Search failed')
  }
  
  return data
}

// ✅ SECURE: Edge function with input validation
// supabase/functions/send-email/index.ts
import { z } from 'zod'

const emailRequestSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(50000),
  template_id: z.string().uuid().optional()
})

Deno.serve(async (req) => {
  // Validate request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const validation = emailRequestSchema.safeParse(body)
  if (!validation.success) {
    return new Response(
      JSON.stringify({ error: 'Validation failed', details: validation.error.issues }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  // Proceed with validated data only
  const { to, subject, body: emailBody } = validation.data
  // ... send email
})
```

---

### A04:2021 - Insecure Design

#### Risk Explanation
Insecure design refers to risks arising from fundamental architectural flaws in the application. Unlike implementation bugs, these are design-level weaknesses that cannot be fixed by simple code changes.

#### How It Manifests in Real Applications
- Business logic flaws allowing abuse of workflows
- Missing rate limiting on critical operations
- Insecure workflow designs
- Lack of integrity checks
- No abuse detection mechanisms

#### Specific Mitigation Strategies for Altus Connect

1. **Approval Workflows**: Multi-step verification for sensitive actions
2. **Rate Limiting**: Prevent abuse of APIs
3. **Audit Logging**: Comprehensive action tracking
4. **Input Throttling**: Limit repeated operations

#### Code Examples

```typescript
// ❌ VULNERABLE: No rate limiting on password reset
function ForgotPasswordForm() {
  const handleSubmit = async (email: string) => {
    await supabase.auth.resetPasswordForEmail(email)
    toast.success('Reset email sent')
  }
  // User can spam this endlessly
}

// ✅ SECURE: Rate limiting with client-side tracking and server enforcement
// src/hooks/useRateLimit.ts
interface RateLimitState {
  attempts: number
  lastAttempt: number
  lockedUntil: number | null
}

function useRateLimit(key: string, maxAttempts: number, windowMs: number) {
  const [state, setState] = useLocalStorage<RateLimitState>(`rate_limit_${key}`, {
    attempts: 0,
    lastAttempt: 0,
    lockedUntil: null
  })
  
  const now = Date.now()
  
  // Reset if window has passed
  if (now - state.lastAttempt > windowMs) {
    state.attempts = 0
  }
  
  const isLocked = state.lockedUntil ? now < state.lockedUntil : false
  const remainingAttempts = maxAttempts - state.attempts
  
  const recordAttempt = () => {
    const newAttempts = state.attempts + 1
    const locked = newAttempts >= maxAttempts ? now + windowMs : null
    
    setState({
      attempts: newAttempts,
      lastAttempt: now,
      lockedUntil: locked
    })
  }
  
  return { isLocked, remainingAttempts, recordAttempt, lockedUntil: state.lockedUntil }
}

// Usage in component:
function ForgotPasswordForm() {
  const { isLocked, remainingAttempts, recordAttempt, lockedUntil } = useRateLimit(
    'password_reset',
    3,      // 3 attempts
    900000  // per 15 minutes
  )
  
  const handleSubmit = async (email: string) => {
    if (isLocked) {
      toast.error(`Too many attempts. Try again at ${new Date(lockedUntil!).toLocaleTimeString()}`)
      return
    }
    
    recordAttempt()
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Reset email sent. ${remainingAttempts - 1} attempts remaining.`)
    }
  }
}

// ✅ SECURE: Approval workflow for sensitive operations
// src/lib/approvalService.ts
export async function requestPromotionTransfer(
  request: PromotionTransferRequest
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  // Validate request
  const validation = promotionTransferSchema.safeParse(request)
  if (!validation.success) {
    return { success: false, error: 'Invalid request data' }
  }
  
  // Create approval workflow
  const { data: approvalData, error: approvalError } = await supabase
    .from('approval_requests')
    .insert({
      type: 'promotion_transfer',
      requester_id: request.employee_id,
      current_property_id: request.current_property_id,
      target_property_id: request.target_property_id,
      status: 'pending',
      data: validation.data,
      // Multi-level approval required
      required_approvals: [
        { level: 1, role: 'department_head', approved: false },
        { level: 2, role: 'property_manager', approved: false },
        { level: 3, role: 'regional_hr', approved: false }
      ]
    })
    .select('id')
    .single()
  
  if (approvalError) {
    await logAuditEvent({
      event_type: 'approval.created',
      entity_type: 'approval',
      description: 'Failed to create approval request',
      metadata: { error: approvalError.message }
    })
    return { success: false, error: 'Failed to create approval request' }
  }
  
  // Notify approvers
  await notifyApprovers(approvalData.id)
  
  return { success: true, requestId: approvalData.id }
}
```

---

### A05:2021 - Security Misconfiguration

#### Risk Explanation
Security misconfiguration is the most commonly seen vulnerability. It includes insecure default configurations, incomplete configurations, open cloud storage, misconfigured HTTP headers, and verbose error messages.

#### How It Manifests in Real Applications
- Default credentials still active
- Unnecessary features enabled
- Directory listing enabled
- Information disclosure in error messages
- Missing security headers
- Overly permissive CORS

#### Specific Mitigation Strategies for Altus Connect

1. **Security Headers**: Implement CSP, HSTS, X-Frame-Options
2. **Environment Validation**: Strict env variable checking
3. **Error Handling**: Generic error messages to users
4. **Feature Hardening**: Disable unused features

#### Code Examples

```typescript
// ❌ VULNERABLE: Verbose error messages exposing internals
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack,  // NEVER expose stack traces!
    query: err.query   // NEVER expose database details!
  })
})

// ✅ SECURE: Generic error messages, detailed logging
// src/lib/errorHandler.ts
import { securityUtils } from './security-config'

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export function handleError(error: Error | AppError): { message: string; code: string } {
  // Log full error details internally
  securityUtils.logException(error, {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent
  })
  
  // Return generic message to user
  if (error instanceof AppError && error.isOperational) {
    return {
      message: error.message,
      code: error.code
    }
  }
  
  // Unknown errors - never expose details
  return {
    message: 'An unexpected error occurred. Please try again later.',
    code: 'INTERNAL_ERROR'
  }
}

// ✅ SECURE: Security headers configuration
// src/lib/security-config.ts
export const securityHeaders = {
  'Content-Security-Policy': Object.entries(securityConfig.csp.directives)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Resource-Policy': 'cross-origin'
}

// netlify.toml / vercel.json
/*
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none';"
*/

// ✅ SECURE: Environment validation
// src/lib/env-validation.ts
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
    .default('https://altus-advisory.com')
})

export function validateEnvironment() {
  const result = envSchema.safeParse(import.meta.env)
  
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path}: ${i.message}`).join('\n')
    throw new Error(`Environment validation failed:\n${errors}`)
  }
  
  return result.data
}
```

---

### A06:2021 - Vulnerable and Outdated Components

#### Risk Explanation
Components (libraries, frameworks, modules) run with the same privileges as the application. If a vulnerable component is exploited, it can facilitate serious data loss or server takeover.

#### How It Manifests in Real Applications
- Using libraries with known CVEs
- Not updating dependencies regularly
- Using deprecated/abandoned packages
- No inventory of dependencies
- Not scanning for vulnerabilities

#### Specific Mitigation Strategies for Altus Connect

1. **Automated Scanning**: npm audit in CI/CD
2. **Dependency Pinning**: Lockfile enforcement
3. **Update Policy**: Regular dependency updates
4. **Vulnerability Monitoring**: Snyk or Dependabot

#### Code Examples

```json
// ❌ VULNERABLE: No security scanning in package.json scripts
{
  "scripts": {
    "build": "vite build",
    "test": "vitest"
  }
}

// ✅ SECURE: Security audit in CI pipeline
// package.json
{
  "scripts": {
    "build": "npm run verify && vite build",
    "verify": "npm run lint && npm run typecheck && npm run test:run && npm run audit:ci",
    "audit:ci": "npm audit --omit=dev --audit-level=critical",
    "audit:fix": "npm audit fix"
  }
}

// ✅ SECURE: GitHub Actions workflow for security scanning
// .github/workflows/security.yml
/*
name: Security Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm audit --audit-level=high
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
*/

// ✅ SECURE: Dependency version constraints with security in mind
// package.json
{
  "dependencies": {
    // Pin exact versions for security-critical packages
    "dompurify": "3.3.1",
    "@supabase/supabase-js": "2.87.1",
    
    // Use ^ for non-critical with audit enforcement
    "react": "^19.2.0",
    "zod": "^4.1.13"
  },
  "overrides": {
    // Force security updates for transitive dependencies
    "semver": "^7.5.4",
    "tough-cookie": "^4.1.3"
  }
}
```

---

### A07:2021 - Identification and Authentication Failures

#### Risk Explanation
Authentication failures occur when functions related to authentication and session management are implemented incorrectly, allowing attackers to compromise passwords, keys, or session tokens.

#### How It Manifests in Real Applications
- Permitting automated attacks (credential stuffing)
- Weak password policies
- Storing passwords in plaintext
- Missing MFA options
- Session fixation vulnerabilities
- Improper session invalidation

#### Specific Mitigation Strategies for Altus Connect

1. **Strong Password Policy**: Enforce complexity requirements
2. **Account Lockout**: Prevent brute force attacks
3. **Session Management**: Secure tokens, proper timeout
4. **Password History**: Prevent reuse of old passwords

#### Code Examples

```typescript
// ❌ VULNERABLE: Weak password policy
function validatePassword(password: string): boolean {
  return password.length >= 6  // Too short, no complexity
}

// ❌ VULNERABLE: No rate limiting on login
async function login(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

// ✅ SECURE: Strong password enforcement
// src/components/auth/PasswordField.tsx
const passwordRequirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
  { label: 'One special character', test: (p: string) => /[@$!%*?&]/.test(p) }
]

function PasswordField({ value, onChange }: PasswordFieldProps) {
  const strength = useMemo(() => {
    return passwordRequirements.filter(r => r.test(value)).length
  }, [value])
  
  return (
    <div>
      <Input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={8}
        required
      />
      <PasswordStrengthIndicator strength={strength} />
      <ul className="text-sm text-gray-600">
        {passwordRequirements.map((req, i) => (
          <li key={i} className={req.test(value) ? 'text-green-600' : 'text-gray-400'}>
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ✅ SECURE: Account lockout and suspicious activity detection
// supabase/migrations/XXX_add_password_security_fields.sql
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email, created_at);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, created_at);

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  failed_count INTEGER;
  last_attempt TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*), MAX(created_at)
  INTO failed_count, last_attempt
  FROM login_attempts
  WHERE email = user_email
    AND success = false
    AND created_at > NOW() - INTERVAL '15 minutes';
  
  -- Lock after 5 failed attempts
  IF failed_count >= 5 THEN
    -- Check if 30 minute lockout has passed
    IF last_attempt > NOW() - INTERVAL '30 minutes' THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

// ✅ SECURE: Session timeout handling
// src/hooks/useInactivityTimeout.ts
const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const WARNING_BEFORE = 2 * 60 * 1000 // 2 minutes warning

export function useInactivityTimeout() {
  const { signOut } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    setShowWarning(false)
    
    // Set warning timer
    timeoutRef.current = setTimeout(() => {
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
    events.forEach(e => document.addEventListener(e, resetTimer))
    
    resetTimer()
    
    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimer))
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [resetTimer])
  
  return { showWarning, dismissWarning: resetTimer }
}
```

---

### A08:2021 - Software and Data Integrity Failures

#### Risk Explanation
Software and data integrity failures relate to code and infrastructure that do not protect against integrity violations. This includes insecure deserialization, untrusted CI/CD pipelines, and auto-update mechanisms without signature verification.

#### How It Manifests in Real Applications
- Unsigned software updates
- Insecure deserialization of user input
- Using untrusted sources in build pipelines
- Race conditions in critical operations
- Missing integrity checks on data

#### Specific Mitigation Strategies for Altus Connect

1. **Signed Updates**: Verify integrity of deployed code
2. **Atomic Operations**: Database transactions for critical updates
3. **CSRF Protection**: Tokens for state-changing operations
4. **Data Validation**: Verify data integrity on every access

#### Code Examples

```typescript
// ❌ VULNERABLE: Race condition in concurrent updates
async function updateDocument(id: string, changes: Partial<Document>) {
  const { data: current } = await supabase
    .from('documents')
    .select('version')
    .eq('id', id)
    .single()
  
  // Race condition: version could change between read and write!
  return supabase
    .from('documents')
    .update({ ...changes, version: current.version + 1 })
    .eq('id', id)
}

// ✅ SECURE: Optimistic locking with version checking
async function updateDocument(
  id: string, 
  changes: Partial<Document>,
  expectedVersion: number
) {
  const { data, error } = await supabase
    .from('documents')
    .update({
      ...changes,
      version: expectedVersion + 1,
      updated_at: new Date().toISOString(),
      updated_by: (await supabase.auth.getUser()).data.user?.id
    })
    .eq('id', id)
    .eq('version', expectedVersion) // Atomic check
    .select()
    .single()
  
  if (error) {
    if (error.message.includes('version')) {
      throw new ConflictError('Document was modified by another user. Please refresh.')
    }
    throw error
  }
  
  return data
}

// ✅ SECURE: CSRF protection for forms
// src/components/ui/form.tsx with CSRF token
function SecureForm({ onSubmit, children }: SecureFormProps) {
  const [csrfToken, setCsrfToken] = useState<string>('')
  
  useEffect(() => {
    // Generate CSRF token
    const token = crypto.randomUUID()
    setCsrfToken(token)
    
    // Store in session storage (not localStorage - scoped to tab)
    sessionStorage.setItem('csrf_token', token)
  }, [])
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    const storedToken = sessionStorage.getItem('csrf_token')
    if (csrfToken !== storedToken) {
      toast.error('Invalid form submission')
      return
    }
    
    await onSubmit()
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="csrf_token" value={csrfToken} />
      {children}
    </form>
  )
}

// ✅ SECURE: Atomic database operations
// supabase/migrations/XXX_atomic_operations.sql
CREATE OR REPLACE FUNCTION approve_document_atomic(
  p_document_id UUID,
  p_approver_id UUID,
  p_comments TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Start atomic transaction
  BEGIN
    -- Lock the row
    SELECT * FROM document_approvals 
    WHERE document_id = p_document_id 
    FOR UPDATE;
    
    -- Verify approver has permission
    IF NOT has_document_approval_permission(p_approver_id, p_document_id) THEN
      RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    
    -- Update approval status
    UPDATE document_approvals
    SET 
      status = 'approved',
      approver_id = p_approver_id,
      approved_at = NOW(),
      comments = p_comments
    WHERE document_id = p_document_id
      AND status = 'pending'; -- Only if still pending
    
    -- Update document status
    UPDATE documents
    SET 
      status = 'approved',
      approved_by = p_approver_id,
      approved_at = NOW()
    WHERE id = p_document_id;
    
    -- Log the action
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (p_approver_id, 'document.approved', 'document', p_document_id, 
            jsonb_build_object('comments', p_comments));
    
    v_result := jsonb_build_object('success', true);
    RETURN v_result;
  EXCEPTION WHEN OTHERS THEN
    ROLLBACK;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;
```

---

### A09:2021 - Security Logging and Monitoring Failures

#### Risk Explanation
Insufficient logging and monitoring, coupled with missing or ineffective incident response, allows attackers to further attack systems, maintain persistence, pivot to more systems, and tamper, extract, or destroy data.

#### How It Manifests in Real Applications
- No audit logs for sensitive operations
- Logs only stored locally
- No real-time alerting
- Missing context in logs (who, what, when, where)
- Logs containing sensitive data
- No log integrity protection

#### Specific Mitigation Strategies for Altus Connect

1. **Comprehensive Audit Logging**: All sensitive operations logged
2. **Structured Logging**: JSON format with consistent fields
3. **PII Tracking**: Special handling for sensitive data access
4. **Centralized Logging**: Integration with monitoring systems

#### Code Examples

```typescript
// ❌ VULNERABLE: No logging of sensitive operations
async function deleteUser(userId: string) {
  await supabase.from('users').delete().eq('id', userId)
}

// ❌ VULNERABLE: Logs containing sensitive data
console.log('User login:', { email, password, ssn }) // NEVER log passwords!

// ✅ SECURE: Comprehensive audit logging
// src/lib/auditLog.ts
export type AuditEventType =
  | 'user.login' | 'user.logout' | 'user.password_change'
  | 'document.created' | 'document.updated' | 'document.deleted' | 'document.viewed'
  | 'approval.created' | 'approval.approved' | 'approval.rejected'
  | 'export.data' | 'admin.action' | 'permission_denied' | 'suspicious_activity'

export interface AuditLogEntry {
  event_type: AuditEventType
  entity_type?: string
  entity_id?: string
  description?: string
  metadata?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  severity?: 'info' | 'warning' | 'critical'
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id
    
    // Sanitize metadata - remove any potential PII before logging
    const sanitizedMetadata = sanitizeForLogging(entry.metadata)
    
    const logRecord = {
      user_id: userId,
      action: entry.event_type,
      entity_type: entry.entity_type || 'system',
      entity_id: entry.entity_id || crypto.randomUUID(),
      details: {
        description: entry.description,
        metadata: sanitizedMetadata,
        severity: entry.severity || 'info'
      },
      ip_address: entry.ip_address || await getClientIP(),
      user_agent: entry.user_agent?.slice(0, 500) || navigator.userAgent?.slice(0, 500),
      created_at: new Date().toISOString()
    }
    
    // Insert to audit_logs table
    const { error } = await supabase.from('audit_logs').insert(logRecord)
    
    if (error) {
      // Fallback: Send to Sentry if database logging fails
      Sentry.captureException(error, { extra: { logRecord } })
    }
    
    // Real-time alerting for critical events
    if (entry.severity === 'critical' || entry.event_type === 'permission_denied') {
      await alertSecurityTeam(entry)
    }
  } catch (err) {
    // Last resort: console error (don't throw from logging)
    console.error('Failed to write audit log:', err)
  }
}

// PII sanitization helper
function sanitizeForLogging(metadata?: Record<string, unknown>): Record<string, unknown> {
  if (!metadata) return {}
  
  const sensitiveKeys = ['password', 'ssn', 'credit_card', 'cvv', 'token', 'secret', 'key']
  const sanitized: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(metadata)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

// Convenience methods
export const auditLog = {
  login: () => logAuditEvent({
    event_type: 'user.login',
    entity_type: 'user',
    description: 'User logged in'
  }),
  
  permissionDenied: (resource: string, action: string) => logAuditEvent({
    event_type: 'permission_denied',
    entity_type: 'security',
    description: `Access denied: ${action} on ${resource}`,
    severity: 'warning'
  }),
  
  suspiciousActivity: (description: string, metadata?: object) => logAuditEvent({
    event_type: 'suspicious_activity',
    entity_type: 'security',
    description,
    metadata,
    severity: 'critical'
  }),
  
  dataExported: (exportType: string, recordCount: number, filters?: object) => logAuditEvent({
    event_type: 'export.data',
    entity_type: 'export',
    description: `Exported ${recordCount} ${exportType} records`,
    metadata: { export_type: exportType, record_count: recordCount, filters },
    severity: 'info'
  })
}

// Integration with React Query for automatic logging
export function useAuditedMutation<TData, TVariables>(
  mutationFn: (vars: TVariables) => Promise<TData>,
  options: {
    action: string
    entityType: string
    getEntityId?: (vars: TVariables) => string
    getDescription?: (vars: TVariables) => string
  }
) {
  return useMutation({
    mutationFn,
    onSuccess: async (data, variables) => {
      await logAuditEvent({
        event_type: `${options.entityType}.${options.action}` as AuditEventType,
        entity_type: options.entityType,
        entity_id: options.getEntityId?.(variables),
        description: options.getDescription?.(variables) || `${options.action} ${options.entityType}`,
        metadata: { result: 'success' }
      })
    },
    onError: async (error, variables) => {
      await logAuditEvent({
        event_type: `${options.entityType}.${options.action}` as AuditEventType,
        entity_type: options.entityType,
        entity_id: options.getEntityId?.(variables),
        description: `Failed: ${options.getDescription?.(variables) || options.action}`,
        metadata: { error: error.message },
        severity: 'warning'
      })
    }
  })
}
```

---

### A10:2021 - Server-Side Request Forgery (SSRF)

#### Risk Explanation
SSRF flaws occur when a web application fetches a remote resource without validating the user-supplied URL. Attackers can force the application to send requests to unexpected destinations, even when protected by a firewall or VPN.

#### How It Manifests in Real Applications
- Fetching URLs based on user input without validation
- Allowing file:// protocol access
- Server-side requests to internal services
- Cloud metadata API access (169.254.169.254)
- Open redirects through URL parameters

#### Specific Mitigation Strategies for Altus Connect

1. **URL Whitelisting**: Only allow pre-approved domains
2. **Protocol Restrictions**: Block file://, ftp://, etc.
3. **Internal IP Blocking**: Prevent access to private ranges
4. **Indirect References**: Use mapping instead of direct URLs

#### Code Examples

```typescript
// ❌ VULNERABLE: Direct URL fetching from user input
async function fetchExternalData(url: string) {
  const response = await fetch(url) // Could access internal services!
  return response.json()
}

// ❌ VULNERABLE: Image proxy without validation
app.get('/proxy-image', async (req, res) => {
  const imageUrl = req.query.url
  const image = await fetch(imageUrl) // SSRF vulnerability
  res.send(image.body)
})

// ✅ SECURE: URL validation with allowlist
const ALLOWED_DOMAINS = [
  'api.open-meteo.com',
  'api.aladhan.com',
  'date.nager.at',
  'images.unsplash.com'
]

function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    
    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      return false
    }
    
    // Check against allowlist
    if (!ALLOWED_DOMAINS.includes(parsed.hostname)) {
      return false
    }
    
    // Block internal IPs
    const hostname = parsed.hostname
    if (/^(127\.|0\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.)/.test(hostname)) {
      return false
    }
    
    // Block localhost variations
    if (hostname === 'localhost' || hostname.endsWith('.local')) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}

async function fetchExternalData(url: string) {
  if (!isValidExternalUrl(url)) {
    throw new Error('Invalid or unauthorized URL')
  }
  
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ALTUS-Connect/1.0 (Internal Service)'
      }
    })
    
    // Limit response size
    const contentLength = parseInt(response.headers.get('content-length') || '0')
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Response too large')
    }
    
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

// ✅ SECURE: Edge function with strict URL validation
// supabase/functions/image-proxy/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ALLOWED_IMAGE_ORIGINS = [
  'https://images.unsplash.com',
  'https://htsvjfrofcpkfzvjpwvx.supabase.co' // Project storage
]

serve(async (req) => {
  const url = new URL(req.url)
  const imageUrl = url.searchParams.get('url')
  
  if (!imageUrl) {
    return new Response('Missing URL', { status: 400 })
  }
  
  let parsedUrl: URL
  try {
    parsedUrl = new URL(imageUrl)
  } catch {
    return new Response('Invalid URL', { status: 400 })
  }
  
  // Strict origin check
  const isAllowed = ALLOWED_IMAGE_ORIGINS.some(origin => 
    imageUrl.startsWith(origin)
  )
  
  if (!isAllowed) {
    return new Response('Unauthorized origin', { status: 403 })
  }
  
  try {
    const imageResponse = await fetch(imageUrl, {
      method: 'GET',
      // Prevent request smuggling
      headers: {
        'Accept': 'image/*'
      }
    })
    
    // Validate content type
    const contentType = imageResponse.headers.get('content-type')
    if (!contentType?.startsWith('image/')) {
      return new Response('Not an image', { status: 400 })
    }
    
    // Stream response with size limit
    const contentLength = parseInt(imageResponse.headers.get('content-length') || '0')
    if (contentLength > 5 * 1024 * 1024) { // 5MB limit
      return new Response('Image too large', { status: 413 })
    }
    
    return new Response(imageResponse.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    return new Response('Failed to fetch image', { status: 502 })
  }
})
```

---

## 2. Secure Coding Guidelines with Examples

### 2.1 SQL Injection Prevention

```typescript
// ❌ NEVER: String concatenation in queries
const query = `SELECT * FROM users WHERE email = '${email}'`

// ✅ ALWAYS: Use parameterized queries
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', email)
  .single()

// ✅ ALWAYS: Validate with Zod before querying
const emailSchema = z.string().email()
const validEmail = emailSchema.parse(userInput)

// ✅ ALWAYS: Use RPC for complex queries with strict parameter types
// supabase/migrations/XXX_search_users.sql
CREATE OR REPLACE FUNCTION search_users(search_term TEXT)
RETURNS SETOF users AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM users
  WHERE full_name ILIKE '%' || search_term || '%'
     OR email ILIKE '%' || search_term || '%'
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;
```

### 2.2 XSS Prevention (Context-Aware Output Encoding)

```typescript
// ❌ NEVER: Directly render user input as HTML
function Comment({ text }: { text: string }) {
  return <div dangerouslySetInnerHTML={{ __html: text }} /> // DANGEROUS!
}

// ✅ ALWAYS: Use DOMPurify for HTML content
// src/lib/sanitize.ts
import DOMPurify from 'dompurify'

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  })
}

// Usage in component:
function RichContent({ html }: { html: string }) {
  const sanitized = sanitizeHtml(html)
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />
}

// ✅ ALWAYS: Escape for different contexts
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function escapeAttribute(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ✅ ALWAYS: React escapes by default, but be careful with:
// - dangerouslySetInnerHTML
// - href with javascript: URLs
// - style attributes
function SafeLink({ href, children }: { href: string; children: React.ReactNode }) {
  // Prevent javascript: URLs
  const safeHref = href.startsWith('http') || href.startsWith('/') 
    ? href 
    : '#'
  
  return (
    <a 
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  )
}
```

### 2.3 CSRF Protection

```typescript
// ✅ ALWAYS: Use SameSite cookies (configured in Supabase Auth)
// Supabase Auth automatically sets SameSite=Lax cookies

// ✅ ALWAYS: Include CSRF tokens in forms
function SecureForm() {
  const [csrfToken] = useState(() => crypto.randomUUID())
  
  useEffect(() => {
    sessionStorage.setItem('csrf_token', csrfToken)
  }, [csrfToken])
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formToken = form.csrf_token.value
    
    if (formToken !== sessionStorage.getItem('csrf_token')) {
      toast.error('Invalid form submission')
      return
    }
    
    // Proceed with submission
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="csrf_token" value={csrfToken} />
      {/* form fields */}
    </form>
  )
}

// ✅ ALWAYS: Verify Origin header in Edge Functions
// supabase/functions/protected-action/index.ts
Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const allowedOrigins = ['https://altus-advisory.com', 'https://www.altus-advisory.com']
  
  if (!allowedOrigins.includes(origin)) {
    return new Response('Unauthorized origin', { status: 403 })
  }
  
  // Proceed with action
})
```

### 2.4 Authentication Security

```typescript
// ✅ ALWAYS: Strong password requirements
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/\d/, 'Must contain number')
  .regex(/[@$!%*?&]/, 'Must contain special character')

// ✅ ALWAYS: Password history to prevent reuse
// supabase/migrations/XXX_password_history.sql
CREATE TABLE password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION check_password_history(
  p_user_id UUID,
  p_new_password TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_old_hash TEXT;
BEGIN
  FOR v_old_hash IN 
    SELECT password_hash FROM password_history
    WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 year'
    ORDER BY created_at DESC
    LIMIT 5
  LOOP
    IF crypt(p_new_password, v_old_hash) = v_old_hash THEN
      RETURN false; -- Password was used before
    END IF;
  END LOOP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

// ✅ ALWAYS: Secure session management
// src/lib/supabase.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Prevent token leakage in URLs
    storage: createSafeStorage('local'),
  }
})
```

### 2.5 Input Validation (Whitelist Approach)

```typescript
// ❌ NEVER: Blacklist validation (easily bypassed)
function isValidInput(input: string): boolean {
  return !input.includes('<script>') // Can bypass with <SCRIPT>, <ScrIpT>, etc.
}

// ✅ ALWAYS: Whitelist validation with Zod
const userInputSchema = z.object({
  name: z.string()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z\s'-]+$/), // Only allow specific characters
  email: z.string().email(),
  age: z.number().int().min(18).max(120),
  role: z.enum(['staff', 'manager', 'admin']), // Whitelist of allowed values
  department_id: z.string().uuid()
})

// ✅ ALWAYS: Validate all inputs, including IDs
async function getUser(userId: string) {
  // Validate UUID format first
  const validUuid = z.string().uuid().safeParse(userId)
  if (!validUuid.success) {
    throw new Error('Invalid user ID format')
  }
  
  return supabase.from('users').select('*').eq('id', validUuid.data).single()
}

// ✅ ALWAYS: Sanitize file uploads
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf'
]

function validateFileUpload(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' }
  }
  
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'File size exceeds 5MB limit' }
  }
  
  // Verify file extension matches MIME type
  const extension = file.name.split('.').pop()?.toLowerCase()
  const expectedExtensions: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'application/pdf': ['pdf']
  }
  
  if (!expectedExtensions[file.type]?.includes(extension || '')) {
    return { valid: false, error: 'File extension does not match content type' }
  }
  
  return { valid: true }
}
```

### 2.6 Secure File Uploads

```typescript
// ✅ ALWAYS: Scan files for malware
// supabase/functions/scan-file/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const formData = await req.formData()
  const file = formData.get('file') as File
  
  if (!file) {
    return new Response('No file provided', { status: 400 })
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return new Response('Invalid file type', { status: 400 })
  }
  
  // Check file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return new Response('File too large', { status: 413 })
  }
  
  // Scan with ClamAV or similar (pseudo-code)
  const fileBuffer = await file.arrayBuffer()
  const scanResult = await scanForMalware(fileBuffer)
  
  if (!scanResult.clean) {
    await logAuditEvent({
      event_type: 'security.malware_detected',
      description: `Malware detected in upload: ${scanResult.threat}`,
      severity: 'critical'
    })
    return new Response('File contains malware', { status: 400 })
  }
  
  // Upload to storage with unique filename
  const uniqueName = `${crypto.randomUUID()}.${file.name.split('.').pop()}`
  const { error } = await supabase.storage
    .from('uploads')
    .upload(uniqueName, fileBuffer)
  
  if (error) {
    return new Response('Upload failed', { status: 500 })
  }
  
  return new Response(JSON.stringify({ filename: uniqueName }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

// ✅ ALWAYS: Store files with random names, not original filenames
function generateSecureFilename(originalName: string): string {
  const uuid = crypto.randomUUID()
  const extension = originalName.split('.').pop()?.toLowerCase()
  return `${uuid}.${extension}`
}

// ✅ ALWAYS: Set proper storage policies
-- supabase/migrations/XXX_storage_policies.sql
CREATE POLICY "Users can only access their property's files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT property_id::text FROM user_properties 
      WHERE user_id = auth.uid()
    )
  );
```

### 2.7 Cryptographic Practices

```typescript
// ✅ ALWAYS: Use Web Crypto API for client-side encryption
export async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder()
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )
  
  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  
  return btoa(String.fromCharCode(...combined))
}

// ✅ ALWAYS: Use bcrypt/Argon2 for password hashing (server-side)
-- supabase/migrations/XXX_password_hashing.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Store passwords using bcrypt (handled by Supabase Auth)
-- For custom hashing needs:
CREATE OR REPLACE FUNCTION hash_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(data, gen_salt('bf', 10)); -- bcrypt with 10 rounds
END;
$$ LANGUAGE plpgsql;

// ✅ NEVER: Roll your own crypto
// ❌ DON'T: Custom encryption algorithms
// ❌ DON'T: XOR "encryption"
// ❌ DON'T: MD5 or SHA1 for passwords
// ✅ DO: Use established libraries (libsodium, Web Crypto, bcrypt)

// ✅ ALWAYS: Use HTTPS in production
if (import.meta.env.PROD && !supabaseUrl.startsWith('https://')) {
  throw new Error('HTTPS required in production')
}
```

### 2.8 Error Handling

```typescript
// ❌ NEVER: Expose internal details
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack,     // NEVER!
    sql: err.query        // NEVER!
  })
})

// ✅ ALWAYS: Generic messages to users, detailed logs internally
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
  }
}

function handleError(error: Error): { userMessage: string; shouldLog: boolean } {
  // Log full details internally
  if (import.meta.env.PROD) {
    Sentry.captureException(error)
  } else {
    console.error('Error details:', error)
  }
  
  // Return safe message to user
  if (error instanceof AppError && error.isOperational) {
    return {
      userMessage: error.message,
      shouldLog: false
    }
  }
  
  return {
    userMessage: 'An unexpected error occurred. Please try again later.',
    shouldLog: true
  }
}

// ✅ ALWAYS: Validate error objects before logging
function safeErrorStringify(error: unknown): string {
  if (error instanceof Error) {
    return JSON.stringify({
      name: error.name,
      message: error.message,
      stack: import.meta.env.DEV ? error.stack : undefined
    })
  }
  return String(error)
}
```

### 2.9 Session Management

```typescript
// ✅ ALWAYS: Secure session cookie settings
// Supabase Auth handles this, but for custom cookies:
const COOKIE_OPTIONS = {
  httpOnly: true,      // Prevent XSS access
  secure: true,        // HTTPS only
  sameSite: 'strict',  // CSRF protection
  maxAge: 24 * 60 * 60 // 24 hours
}

// ✅ ALWAYS: Proper session invalidation
async function logout() {
  // Sign out from Supabase
  await supabase.auth.signOut()
  
  // Clear all sensitive local storage
  const keysToRemove = Object.keys(localStorage)
    .filter(k => k.startsWith('altus_secure_'))
  
  keysToRemove.forEach(key => localStorage.removeItem(key))
  
  // Clear session storage
  sessionStorage.clear()
  
  // Log the logout
  await auditLog.logout()
}

// ✅ ALWAYS: Concurrent session control
-- supabase/migrations/XXX_session_management.sql
CREATE TABLE active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL, -- Store hash, not token
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM active_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Run cleanup every hour
SELECT cron.schedule('cleanup-sessions', '0 * * * *', 
  'SELECT cleanup_expired_sessions()'
);
```

### 2.10 Dependency Management

```json
// ✅ ALWAYS: Pin exact versions for security-critical packages
{
  "dependencies": {
    "dompurify": "3.3.1",
    "@supabase/supabase-js": "2.87.1",
    "zod": "4.1.13"
  }
}

// ✅ ALWAYS: Regular security audits in CI
// .github/workflows/security.yml
{
  "scripts": {
    "audit:ci": "npm audit --omit=dev --audit-level=critical",
    "audit:fix": "npm audit fix"
  }
}

// ✅ ALWAYS: Use npm overrides for transitive vulnerabilities
{
  "overrides": {
    "semver": "^7.5.4",
    "tough-cookie": "^4.1.3"
  }
}
```

---

## 3. Vulnerable vs Secure Code Comparison

### 3.1 Authentication

```typescript
// ❌ VULNERABLE: Plaintext password comparison
async function login(email: string, password: string) {
  const user = await db.users.findOne({ email })
  if (user && user.password === password) { // NEVER compare plaintext!
    return user
  }
}

// ✅ SECURE: Use proper hashing (handled by Supabase Auth)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})

// Supabase internally uses bcrypt with proper salting
```

### 3.2 Data Access

```typescript
// ❌ VULNERABLE: Missing authorization check
app.get('/api/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id) // Can access any user!
  res.json(user)
})

// ✅ SECURE: Verify ownership with RLS
// The database enforces access control
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()

// RLS policy ensures users can only see their own data:
CREATE POLICY "Users can only view their own profile" ON profiles
  FOR SELECT USING (id = auth.uid());
```

### 3.3 XSS Prevention

```typescript
// ❌ VULNERABLE: Direct HTML rendering
function UserComment({ content }: { content: string }) {
  return <div dangerouslySetInnerHTML={{ __html: content }} />
  // Attack: content = "<img src=x onerror=alert('XSS')>"
}

// ✅ SECURE: Always sanitize HTML
import DOMPurify from 'dompurify'

function UserComment({ content }: { content: string }) {
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: []
  })
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />
}

// Even better - avoid dangerouslySetInnerHTML when possible:
function UserComment({ content }: { content: string }) {
  return <div>{content}</div> // React escapes by default
}
```

### 3.4 SQL Injection

```typescript
// ❌ VULNERABLE: String concatenation
async function searchUsers(searchTerm: string) {
  const query = `SELECT * FROM users WHERE name LIKE '%${searchTerm}%'`
  return db.query(query)
  // Attack: searchTerm = "'; DROP TABLE users; --"
}

// ✅ SECURE: Parameterized queries
async function searchUsers(searchTerm: string) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .ilike('name', `%${searchTerm}%`)
  return data
}

// The Supabase client properly escapes the parameter
```

### 3.5 File Upload

```typescript
// ❌ VULNERABLE: No validation, use original filename
app.post('/upload', (req, res) => {
  req.files.file.mv(`./uploads/${req.files.file.name}`) // Path traversal risk!
})

// ✅ SECURE: Validate and rename
async function handleFileUpload(file: File) {
  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type')
  }
  
  // Generate secure filename
  const secureName = `${crypto.randomUUID()}.${file.name.split('.').pop()}`
  
  // Scan for malware
  const scanResult = await scanFile(file)
  if (!scanResult.clean) {
    throw new Error('Malware detected')
  }
  
  // Upload with RLS protection
  await supabase.storage.from('uploads').upload(secureName, file)
  
  return secureName
}
```

### 3.6 Error Handling

```typescript
// ❌ VULNERABLE: Information disclosure
try {
  await database.query('SELECT * FROM secret_data')
} catch (error) {
  res.status(500).json({
    error: error.message,
    query: error.query,      // Leaks database structure!
    stack: error.stack       // Leaks file paths!
  })
}

// ✅ SECURE: Generic errors, detailed logs
try {
  await database.query('SELECT * FROM secret_data')
} catch (error) {
  // Log full details for debugging
  logger.error('Database query failed', {
    error: error.message,
    stack: error.stack,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  })
  
  // Return generic error to client
  res.status(500).json({
    error: 'An error occurred while processing your request',
    code: 'INTERNAL_ERROR'
  })
}
```

---

## 4. Security Checklist

### Pre-Deployment Checklist

- [ ] All RLS policies are enabled and tested
- [ ] No plaintext secrets in code or logs
- [ ] Security headers are configured
- [ ] HTTPS is enforced in production
- [ ] Rate limiting is implemented
- [ ] Audit logging is enabled
- [ ] Error messages are generic (no stack traces)
- [ ] CSRF protection is active
- [ ] Session timeout is configured
- [ ] File upload restrictions are in place
- [ ] npm audit shows no critical vulnerabilities
- [ ] CSP headers are configured
- [ ] CORS is properly restricted

### Code Review Checklist

- [ ] All user inputs are validated with Zod schemas
- [ ] No SQL string concatenation
- [ ] DOMPurify is used for HTML rendering
- [ ] Authentication checks exist on server-side
- [ ] Authorization checks exist at database level
- [ ] Sensitive data is encrypted at rest
- [ ] Passwords meet complexity requirements
- [ ] API endpoints validate all parameters
- [ ] No hardcoded credentials or keys
- [ ] All external URLs are validated
- [ ] Race conditions are handled with atomic operations
- [ ] Proper error handling without information leakage

### Testing Checklist

- [ ] Attempt SQL injection in all input fields
- [ ] Attempt XSS with `<script>` tags
- [ ] Test access control by changing URL parameters
- [ ] Verify rate limiting triggers correctly
- [ ] Test session timeout and renewal
- [ ] Attempt CSRF attacks without tokens
- [ ] Test file upload with malicious files
- [ ] Verify audit logs capture all sensitive actions
- [ ] Test concurrent modification scenarios
- [ ] Verify error messages don't leak internals

---

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Supabase Security Documentation](https://supabase.com/docs/guides/security)
- [React Security Best Practices](https://react.dev/reference/react)
- [Content Security Policy Reference](https://content-security-policy.com/)

---

**Document Owner:** ALTUS IT Security Team  
**Review Cycle:** Quarterly  
**Next Review:** July 2025
