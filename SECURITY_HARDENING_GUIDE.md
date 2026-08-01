# Database Security Hardening Guide

## Executive Summary

This guide documents the comprehensive security hardening performed on the Altus Connect Intranet application to fix SQL injection vulnerabilities, strengthen Row Level Security (RLS), implement secure file access, and add server-side rate limiting.

## Critical Vulnerabilities Fixed

### 1. SQL Injection via PostgREST Filter Construction

#### Vulnerability
Multiple files used string interpolation to construct PostgREST filters, which is vulnerable to SQL injection:

```typescript
// VULNERABLE CODE - DO NOT USE
const escaped = escapeSearchQuery(userInput)
query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
```

The `escapeSearchQuery` function only escaped SQL wildcards (`%`, `_`) but did not escape PostgREST operators (`,`, `(`, `)`), allowing attackers to inject arbitrary filter conditions.

#### Attack Example
```typescript
// User input: "test%),(title.neq.test"
// Results in: title.ilike.%test%),(title.neq.test%
// This creates an OR condition that can expose unauthorized data
```

#### Files Affected
- `src/hooks/useDocuments.ts` - Lines 296, 377, 444
- `src/hooks/useTasks.ts` - Lines 70, 123, 158
- `src/hooks/useSearch.ts` - Multiple locations
- `src/hooks/useUsers.ts` - Line 46
- `src/services/knowledgeService.ts` - Multiple locations
- `src/pages/reviews/GuestReviews.tsx` - Line 324

#### Fix Applied
Created secure parameterized database functions and a secure search utility module:

```typescript
// SECURE REPLACEMENT
import { secureSearchDocuments } from '@/lib/secureSearch'

const results = await secureSearchDocuments({
  search: userInput,  // Safely parameterized
  property_id: propertyId,
  limit: 100
})
```

### 2. Client-Side Rate Limiting Bypass

#### Vulnerability
The original rate limiting was implemented in-memory on the client side, which is ineffective against malicious actors:

```typescript
// VULNERABLE CODE - DO NOT USE
const rateLimitStore: Record<string, { count: number; resetTime: number }> = {}
// This is per-browser, easily bypassed with multiple requests/incognito
```

#### Fix Applied
Implemented server-side rate limiting using Supabase:

```typescript
// SECURE: Server-side rate limiting
const allowed = await SecurityMiddleware.checkServerRateLimit(
  'document_search',
  100,  // max requests
  900   // window in seconds (15 minutes)
)
```

Database functions:
- `check_rate_limit(key, max_requests, window_seconds)`
- `check_user_rate_limit(action, max_requests, window_seconds)`
- `rate_limit_entries` table for distributed rate limiting

### 3. IDOR (Insecure Direct Object Reference) in File Access

#### Vulnerability
File URLs were generated without explicit permission validation:

```typescript
// VULNERABLE CODE
const { data } = await supabase.rpc('get_secure_document_url', { document_id })
// No explicit permission check before calling RPC
```

#### Fix Applied
Added explicit permission validation:

```typescript
// SECURE: Explicit validation
const hasAccess = await validateDocumentAccess(sanitizedId)
if (!hasAccess) {
  await logFileAccess('document', sanitizedId, false, 'Access denied')
  return fallbackUrl || null
}

const { data } = await supabase.rpc('get_secure_document_url', { 
  document_id: sanitizedId 
})
```

### 4. Inadequate Input Sanitization

#### Vulnerability
The `escapeSearchQuery` function was insufficient:

```typescript
// INSUFFICIENT - Only escapes SQL wildcards
export function escapeSearchQuery(query: string): string {
  return query
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
  // Missing: PostgREST operators (comma, parentheses)
}
```

#### Fix Applied
Created comprehensive sanitization functions:

```typescript
// SECURE: Removes dangerous characters
export function sanitizeSearchInput(input: string): string {
  if (!input) return ''
  return input
    .replace(/[^a-zA-Z0-9\s\-_@.]/g, '')  // Only allow safe characters
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}

// SECURE: Validates UUID format
export function sanitizeUUID(id: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id) ? id.toLowerCase() : null
}
```

## Security Implementation Details

### New Database Functions

#### 1. `secure_search_documents()`
Parameterized document search with comprehensive filtering:
- Full-text search with proper parameterization
- Property, department, and folder scoping
- Date range filtering
- Confidentiality level filtering
- Sorting and pagination

#### 2. `secure_count_documents()`
Secure document counting for pagination.

#### 3. `secure_search_tasks()`
Parameterized task search.

#### 4. `secure_search_users()`
Parameterized user directory search.

#### 5. `validate_document_access()`
IDOR protection for document access.

#### 6. `check_rate_limit()` / `check_user_rate_limit()`
Server-side rate limiting functions.

#### 7. `log_security_event()`
Audit logging for security events.

### New Security Tables

#### `security_audit_logs`
```sql
CREATE TABLE security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    user_role TEXT,
    ip_address INET,
    user_agent TEXT,
    table_name TEXT,
    record_id UUID,
    action TEXT,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB,
    severity TEXT DEFAULT 'info',
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `rate_limit_entries`
```sql
CREATE TABLE rate_limit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS Policy Hardening

#### Documents Table
```sql
-- Select: Users can view published documents in their scope
CREATE POLICY "documents_select_secure" ON documents
    FOR SELECT TO authenticated
    USING (
        created_by = auth.uid() OR
        owner_id = auth.uid() OR
        has_role(auth.uid(), 'regional_admin') OR
        (
            status = 'PUBLISHED' AND
            (
                visibility = 'all_properties' OR
                (visibility = 'property' AND has_property_access(auth.uid(), property_id)) OR
                (visibility = 'department' AND EXISTS (
                    SELECT 1 FROM user_departments 
                    WHERE user_id = auth.uid() AND department_id = documents.department_id
                ))
            )
        )
    );
```

### Secure TypeScript Modules

#### `src/lib/secureSearch.ts`
Secure search utilities that use parameterized RPC functions:
- `secureSearchDocuments()`
- `secureCountDocuments()`
- `secureSearchTasks()`
- `secureSearchUsers()`
- `checkRateLimit()`

#### `src/lib/security-middleware.ts`
Updated with server-side rate limiting:
- `SecurityMiddleware.checkServerRateLimit()`
- `SecurityMiddleware.logSecurityEvent()`
- `useRateLimiter()` hook

#### `src/lib/utils.ts`
Enhanced sanitization:
- `sanitizeSearchInput()` - Aggressive character filtering
- `sanitizeUUID()` - UUID validation
- `sanitizeUUIDArray()` - Array of UUIDs validation
- `buildSafeFilter()` - Safe filter builder for non-user data

#### `src/lib/secureFileAccess.ts`
Enhanced with:
- Explicit permission validation
- Access logging
- UUID sanitization
- Download tracking

## Migration Instructions

### Step 1: Apply Database Migration
```bash
supabase db push
# Or apply manually:
psql -f supabase/migrations/20260407000000_comprehensive_security_hardening.sql
```

### Step 2: Update Environment Variables
Add to `.env`:
```env
# Rate Limiting
VITE_RATE_LIMIT_MAX_REQUESTS=100
VITE_RATE_LIMIT_WINDOW_MS=900000

# Session Security
VITE_MAX_SESSION_AGE_MS=86400000
```

### Step 3: Regenerate Types (if needed)
```bash
npx supabase gen types typescript --project-id your-project-id --schema public > src/types/supabase.ts
```

### Step 4: Test Security Features
1. Verify SQL injection is blocked
2. Verify rate limiting works
3. Verify document access control
4. Verify audit logging

## Security Best Practices

### For Developers

1. **Never use string interpolation in PostgREST filters**
   ```typescript
   // WRONG
   query.or(`field.ilike.%${userInput}%`)
   
   // CORRECT
   query.ilike('field', `%${sanitizeSearchInput(userInput)}%`)
   // Or use RPC functions
   ```

2. **Always validate UUIDs before database operations**
   ```typescript
   const sanitizedId = sanitizeUUID(userInputId)
   if (!sanitizedId) throw new Error('Invalid ID')
   ```

3. **Use secure search functions for complex queries**
   ```typescript
   const results = await secureSearchDocuments({ search: userInput })
   ```

4. **Implement server-side rate limiting for sensitive operations**
   ```typescript
   const allowed = await SecurityMiddleware.checkServerRateLimit('action', 100, 900)
   if (!allowed) throw new Error('Rate limit exceeded')
   ```

5. **Log security events for audit trail**
   ```typescript
   await SecurityMiddleware.logSecurityEvent('access_denied', { resource: 'document', id })
   ```

### Security Checklist for New Features

- [ ] All user inputs are sanitized before database queries
- [ ] UUID inputs are validated with `sanitizeUUID()`
- [ ] Search functionality uses `secureSearchDocuments()` or similar
- [ ] Rate limiting is implemented for API endpoints
- [ ] File access validates permissions before generating URLs
- [ ] RLS policies are defined for new tables
- [ ] Security events are logged for sensitive operations
- [ ] No string interpolation in PostgREST filter methods (.or(), .ilike(), etc.)

## Testing Security

### SQL Injection Test Cases
```typescript
// These should be safely handled without exposing data
const injectionAttempts = [
  "test' OR '1'='1",
  "test%),(title.neq.test",
  "test' UNION SELECT * FROM users--",
  "test%'); DROP TABLE users;--",
  "test), (id.not.is.null",  // PostgREST injection
]

for (const attempt of injectionAttempts) {
  // Should not throw error but should not return unauthorized data
  const results = await secureSearchDocuments({ search: attempt })
  // Verify results only contain authorized documents
}
```

### Rate Limiting Test
```typescript
// Should block after limit exceeded
for (let i = 0; i < 105; i++) {
  const allowed = await SecurityMiddleware.checkServerRateLimit('test', 100, 900)
  if (i >= 100) {
    expect(allowed).toBe(false)
  }
}
```

### IDOR Test
```typescript
// Should not access document without permission
const url = await resolveDocumentUrl('unauthorized-doc-id')
expect(url).toBeNull()
```

## Monitoring and Alerts

### Security Events to Monitor
1. `rate_limit_exceeded` - Potential brute force attack
2. `file_access` denied - Potential IDOR attempt
3. `sql_injection_attempt` - Detected via WAF or logs
4. `invalid_uuid_format` - Potential probing

### Recommended Alerts
- More than 100 rate limit events per hour
- More than 10 failed file access attempts per user per hour
- Any SQL injection pattern in logs

## Contact and Support

For security concerns or questions about these hardening measures:
1. Review the secure search implementation in `src/lib/secureSearch.ts`
2. Check the database migration for function details
3. Consult the Supabase security documentation

---

**Last Updated:** 2026-04-07
**Security Review Status:** Complete
**Next Review Date:** 2026-07-07
