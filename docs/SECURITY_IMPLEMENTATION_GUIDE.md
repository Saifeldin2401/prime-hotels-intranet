# Security Implementation Guide
## Altus Connect Intranet System

**Version:** 1.0  
**Last Updated:** 2026-04-07  
**Classification:** INTERNAL USE ONLY  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Security Architecture](#2-security-architecture)
3. [Application Security](#3-application-security)
4. [Database Security](#4-database-security)
5. [Infrastructure Security](#5-infrastructure-security)
6. [Incident Response Procedures](#6-incident-response-procedures)
7. [Security Monitoring](#7-security-monitoring)
8. [Compliance Mapping](#8-compliance-mapping)

---

## 1. System Overview

### 1.1 Technology Stack

| Layer | Technology | Security Responsibility |
|-------|------------|------------------------|
| **Frontend** | React + TypeScript + Vite | Input validation, XSS prevention, secure storage |
| **Backend** | Supabase (PostgreSQL + Edge Functions) | RLS policies, authentication, audit logging |
| **Database** | PostgreSQL (via Supabase) | Encryption, access controls, backups |
| **Hosting** | Netlify / Vercel | TLS, DDoS protection, WAF |
| **Storage** | Supabase Storage | Encryption, access policies |
| **Authentication** | Supabase Auth | MFA, session management, password policies |

### 1.2 Data Classification

| Data Type | Classification | Storage Location | Encryption |
|-----------|---------------|------------------|------------|
| **Guest PII** | Restricted | PostgreSQL (encrypted) | AES-256 at rest, TLS 1.3 in transit |
| **Employee Data** | Confidential | PostgreSQL (encrypted) | AES-256 at rest, TLS 1.3 in transit |
| **Financial Records** | Restricted | PostgreSQL (encrypted) | AES-256 at rest, TLS 1.3 in transit |
| **System Logs** | Internal | Supabase / External SIEM | TLS 1.3 in transit |
| **Public Content** | Public | Supabase Storage | TLS 1.3 in transit |

---

## 2. Security Architecture

### 2.1 Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER LAYER                                  │
│              MFA, Strong Passwords, Security Training               │
├─────────────────────────────────────────────────────────────────────┤
│                      APPLICATION LAYER                              │
│      Input Validation, Output Encoding, CSRF Protection, CSP        │
├─────────────────────────────────────────────────────────────────────┤
│                      AUTHENTICATION LAYER                           │
│         JWT Tokens, Session Management, RBAC, Row Level Security    │
├─────────────────────────────────────────────────────────────────────┤
│                        API LAYER                                    │
│         Rate Limiting, API Authentication, Request Validation       │
├─────────────────────────────────────────────────────────────────────┤
│                      DATABASE LAYER                                 │
│         Encryption at Rest, RLS Policies, Audit Logging             │
├─────────────────────────────────────────────────────────────────────┤
│                     INFRASTRUCTURE LAYER                            │
│         TLS 1.3, WAF, DDoS Protection, Network Segmentation         │
├─────────────────────────────────────────────────────────────────────┤
│                      MONITORING LAYER                               │
│         SIEM, Log Aggregation, Alerting, Threat Detection           │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Security Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET                                    │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│                      CDN / EDGE (DDoS/WAF)                          │
│                    Netlify / Vercel Edge                            │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│                    REACT APPLICATION                                 │
│         Static Hosting with Environment Configurations              │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│                      SUPABASE PLATFORM                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │     Auth    │  │   Database  │  │   Storage   │  │   Edge Fn   │ │
│  │   Service   │  │  PostgreSQL │  │   Objects   │  │   Compute   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Application Security

### 3.1 Authentication Implementation

#### 3.1.1 Supabase Auth Configuration

```typescript
// src/lib/supabase.ts - Security Hardened Configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Security: Auto-refresh tokens
    autoRefreshToken: true,
    // Security: Persist session securely
    persistSession: true,
    // Security: Detect session changes
    detectSessionInUrl: true,
    // Security: Short session lifetime
    storageKey: 'ph_intranet_session',
    // Security: Use secure storage
    storage: window.localStorage,
  },
  // Security: Type-safe database operations
  db: {
    schema: 'public',
  },
  // Security: Request timeout
  realtime: {
    timeout: 20000,
  },
});

// Security: Password strength validation
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 14) {
    errors.push('Password must be at least 14 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain numbers');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain special characters (!@#$%^&*)');
  }
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password must not contain repeated characters');
  }
  
  return { valid: errors.length === 0, errors };
};
```

#### 3.1.2 Multi-Factor Authentication (MFA) Implementation

```typescript
// src/lib/mfa.ts - MFA Implementation
export const setupMFA = async () => {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp', // Time-based One-Time Password
  });
  
  if (error) {
    throw new Error(`MFA enrollment failed: ${error.message}`);
  }
  
  return {
    qrCode: data.totp.qr_code, // Display to user
    secret: data.totp.secret,  // Backup secret
    factorId: data.id,
  };
};

export const verifyMFA = async (factorId: string, code: string) => {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    code,
  });
  
  if (error) {
    throw new Error(`MFA verification failed: ${error.message}`);
  }
  
  return data;
};

// Security: Require MFA for admin roles
export const requireMFAForAdmin = async (userId: string) => {
  const { data: factors, error } = await supabase.auth.mfa.listFactors();
  
  if (error) {
    throw new Error('Failed to check MFA status');
  }
  
  const totpFactor = factors.totp.find(f => f.status === 'verified');
  
  if (!totpFactor) {
    throw new Error('MFA is required for admin access. Please set up MFA.');
  }
  
  return true;
};
```

#### 3.1.3 Session Security

```typescript
// src/lib/session-security.ts
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes warning

class SessionManager {
  private warningTimer: NodeJS.Timeout | null = null;
  private logoutTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();

  constructor() {
    this.setupActivityTracking();
  }

  private setupActivityTracking() {
    // Reset timer on user activity
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, () => this.resetTimer());
    });
  }

  private resetTimer() {
    this.lastActivity = Date.now();
    
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.logoutTimer) clearTimeout(this.logoutTimer);
    
    this.warningTimer = setTimeout(() => {
      this.showTimeoutWarning();
    }, SESSION_TIMEOUT - WARNING_TIME);
    
    this.logoutTimer = setTimeout(() => {
      this.logout();
    }, SESSION_TIMEOUT);
  }

  private showTimeoutWarning() {
    // Show modal warning user
    console.warn('Session expiring in 5 minutes. Click anywhere to continue.');
  }

  private async logout() {
    await supabase.auth.signOut();
    window.location.href = '/login?reason=timeout';
  }

  // Security: Check session validity
  public async validateSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      this.logout();
      return false;
    }
    
    // Security: Check if session is expired
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    if (Date.now() > expiresAt) {
      this.logout();
      return false;
    }
    
    return true;
  }
}

export const sessionManager = new SessionManager();
```

### 3.2 Authorization and RBAC

#### 3.2.1 Role-Based Access Control

```typescript
// src/types/roles.ts
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
  VIEWER = 'viewer',
}

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
}

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    { resource: '*', action: 'manage' }, // All access
  ],
  [UserRole.ADMIN]: [
    { resource: 'users', action: 'manage' },
    { resource: 'hotels', action: 'manage' },
    { resource: 'rooms', action: 'manage' },
    { resource: 'bookings', action: 'manage' },
    { resource: 'settings', action: 'manage' },
    { resource: 'reports', action: 'read' },
  ],
  [UserRole.MANAGER]: [
    { resource: 'rooms', action: 'manage' },
    { resource: 'bookings', action: 'manage' },
    { resource: 'staff', action: 'manage' },
    { resource: 'reports', action: 'read' },
  ],
  [UserRole.STAFF]: [
    { resource: 'rooms', action: 'read' },
    { resource: 'rooms', action: 'update' }, // Status updates
    { resource: 'bookings', action: 'read' },
    { resource: 'bookings', action: 'create' },
  ],
  [UserRole.VIEWER]: [
    { resource: 'reports', action: 'read' },
    { resource: 'rooms', action: 'read' },
  ],
};

// Permission checking utility
export const hasPermission = (
  userRole: UserRole,
  resource: string,
  action: Permission['action']
): boolean => {
  const permissions = ROLE_PERMISSIONS[userRole];
  
  return permissions.some(
    p =>
      (p.resource === '*' || p.resource === resource) &&
      (p.action === 'manage' || p.action === action)
  );
};
```

#### 3.2.2 Protected Route Component

```typescript
// src/components/auth/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission, UserRole } from '@/types/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredResource?: string;
  requiredAction?: 'create' | 'read' | 'update' | 'delete' | 'manage';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredResource,
  requiredAction = 'read',
}) => {
  const { user, userRole, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Security: Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Security: Check role requirement
  if (requiredRole && userRole !== requiredRole) {
    // Log unauthorized access attempt
    logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
      userId: user.id,
      attemptedPath: location.pathname,
      requiredRole,
      actualRole: userRole,
    });
    
    return <Navigate to="/unauthorized" replace />;
  }

  // Security: Check fine-grained permission
  if (requiredResource && userRole) {
    if (!hasPermission(userRole, requiredResource, requiredAction)) {
      logSecurityEvent('PERMISSION_DENIED', {
        userId: user.id,
        resource: requiredResource,
        action: requiredAction,
        path: location.pathname,
      });
      
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};
```

### 3.3 Input Validation and Sanitization

#### 3.3.1 Validation Utilities

```typescript
// src/lib/validation.ts
import { z } from 'zod';
import DOMPurify from 'dompurify';

// Security: Strict input validation schemas
export const schemas = {
  // User input validation
  email: z
    .string()
    .min(5)
    .max(254)
    .email('Invalid email format')
    .transform(val => val.toLowerCase().trim()),
    
  password: z
    .string()
    .min(14, 'Password must be at least 14 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase')
    .regex(/[a-z]/, 'Password must contain lowercase')
    .regex(/[0-9]/, 'Password must contain numbers')
    .regex(/[!@#$%^&*]/, 'Password must contain special characters'),
    
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .transform(val => val.trim()),
    
  // Hotel data validation
  hotelName: z
    .string()
    .min(2)
    .max(100)
    .transform(val => DOMPurify.sanitize(val.trim())),
    
  phoneNumber: z
    .string()
    .regex(/^\+?[\d\s-()]+$/, 'Invalid phone number format')
    .transform(val => val.replace(/\s/g, '')),
    
  // ID validation
  uuid: z.string().uuid(),
  
  // Search query validation
  searchQuery: z
    .string()
    .max(100)
    .transform(val => DOMPurify.sanitize(val.trim())),
};

// Security: SQL injection prevention
export const sanitizeSearchTerm = (term: string): string => {
  // Remove SQL special characters
  return term
    .replace(/[%_\\]/g, '')
    .trim()
    .substring(0, 100);
};

// Security: XSS prevention for user content
export const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
};

// Security: File upload validation
export const validateFileUpload = (
  file: File,
  allowedTypes: string[],
  maxSizeMB: number
): { valid: boolean; error?: string } => {
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
  }
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File too large. Maximum size: ${maxSizeMB}MB` };
  }
  
  // Security: Check for double extensions
  const fileName = file.name.toLowerCase();
  if (fileName.split('.').length > 2) {
    return { valid: false, error: 'Invalid file name format' };
  }
  
  // Security: Block executable files
  const dangerousExtensions = ['.exe', '.dll', '.bat', '.sh', '.php', '.jsp', '.asp'];
  if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
    return { valid: false, error: 'Executable files are not allowed' };
  }
  
  return { valid: true };
};
```

#### 3.3.2 Form Security Component

```typescript
// src/components/forms/SecureForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface SecureFormProps {
  schema: z.ZodSchema;
  onSubmit: (data: any) => Promise<void>;
  children: React.ReactNode;
}

export const SecureForm: React.FC<SecureFormProps> = ({
  schema,
  onSubmit,
  children,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onBlur', // Validate on blur for immediate feedback
  });

  // Security: Rate limiting for form submissions
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);

  const handleSecureSubmit = async (data: any) => {
    // Check rate limiting
    if (lockoutUntil && new Date() < lockoutUntil) {
      throw new Error('Too many attempts. Please try again later.');
    }

    try {
      await onSubmit(data);
      setSubmitAttempts(0);
    } catch (error) {
      setSubmitAttempts(prev => {
        const newAttempts = prev + 1;
        if (newAttempts >= 5) {
          // Lock out for 15 minutes after 5 failed attempts
          setLockoutUntil(new Date(Date.now() + 15 * 60 * 1000));
          logSecurityEvent('FORM_SUBMISSION_LOCKOUT', {
            attempts: newAttempts,
            formData: Object.keys(data), // Log only keys, not values
          });
        }
        return newAttempts;
      });
      throw error;
    }
  };

  return (
    <form onSubmit={handleSubmit(handleSecureSubmit)} noValidate>
      {/* CSRF Token (handled by Supabase automatically) */}
      {children}
    </form>
  );
};
```

### 3.4 Output Encoding and XSS Prevention

```typescript
// src/lib/xss-prevention.ts
import DOMPurify from 'dompurify';

// Security: Content Security Policy
export const CSP_POLICY = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"], // Use nonce in production
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'"],
  'connect-src': [
    "'self'",
    process.env.VITE_SUPABASE_URL,
    'https://*.supabase.co',
  ],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

// Security: Sanitize HTML content
export const RichTextDisplay: React.FC<{ content: string }> = ({ content }) => {
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'target', 'src', 'alt', 'width', 'height', 'class'
    ],
    ALLOW_DATA_ATTR: false,
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />;
};

// Security: URL validation for links
export const SafeLink: React.FC<{ href: string; children: React.ReactNode }> = ({
  href,
  children,
}) => {
  // Validate URL
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return <span>{children}</span>;
  }

  // Security: Only allow http and https protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    return <span>{children}</span>;
  }

  // Security: Prevent tabnabbing
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow">
      {children}
    </a>
  );
};
```

---

## 4. Database Security

### 4.1 Row Level Security (RLS) Policies

#### 4.1.1 User Access Policies

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Security: Users can only see their own profile
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Security: Admins can see all users
CREATE POLICY users_select_admin ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Security: Users can only update their own profile (except role)
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Security: Only admins can create/delete users
CREATE POLICY users_admin_only ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
```

#### 4.1.2 Hotel Data Policies

```sql
-- Security: Staff can only see hotels they have access to
CREATE POLICY hotels_select_accessible ON hotels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hotel_staff
      WHERE hotel_id = hotels.id
      AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Security: Managers can update their assigned hotels
CREATE POLICY hotels_update_manager ON hotels
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM hotel_staff
      WHERE hotel_id = hotels.id
      AND user_id = auth.uid()
      AND role = 'manager'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Security: Room policies - staff can see rooms in their hotel
CREATE POLICY rooms_select_staff ON rooms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hotel_staff
      WHERE hotel_id = rooms.hotel_id
      AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Security: Bookings - staff can see bookings for their hotel
CREATE POLICY bookings_select_staff ON bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hotel_staff
      WHERE hotel_id = bookings.hotel_id
      AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
```

### 4.2 Audit Logging

#### 4.2.1 Audit Trail Implementation

```sql
-- Audit log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB
);

-- Security: Only system can insert audit logs
CREATE POLICY audit_logs_insert_system ON audit_logs
  FOR INSERT
  WITH CHECK (false); -- Only via trigger or service role

-- Security: Admins can read audit logs
CREATE POLICY audit_logs_select_admin ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Function to log changes
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, ip_address)
    VALUES (
      auth.uid(),
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      inet_client_addr()
    );
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data, ip_address)
    VALUES (
      auth.uid(),
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      inet_client_addr()
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data, ip_address)
    VALUES (
      auth.uid(),
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW),
      inet_client_addr()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers
CREATE TRIGGER users_audit
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER hotels_audit
  AFTER INSERT OR UPDATE OR DELETE ON hotels
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER bookings_audit
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION log_audit();
```

### 4.3 Data Encryption

```sql
-- Security: Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: Encrypt sensitive PII
CREATE TABLE guest_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  -- Encrypted fields
  phone_encrypted BYTEA,
  passport_number_encrypted BYTEA,
  credit_card_token TEXT, -- Reference to payment processor, not actual number
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive(data TEXT, key TEXT)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(data, key);
END;
$$ LANGUAGE plpgsql;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive(encrypted_data BYTEA, key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_data, key);
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Infrastructure Security

### 5.1 Supabase Security Configuration

#### 5.1.1 Network Security

```typescript
// supabase/config.toml - Security settings
[api]
# Security: Enable SSL only
scheme = "https"
port = 443

# Security: Restrict CORS origins
allowed_origins = [
  "https://altus-intranet.netlify.app",
  "https://admin.altus-advisory.com"
]

[auth]
# Security: Strong password policy
password_min_length = 14
password_required_characters = [
  "uppercase",
  "lowercase",
  "number",
  "special"
]

# Security: JWT configuration
jwt_expiry = 3600  # 1 hour
jwt_refresh_expiry = 604800  # 7 days

# Security: MFA settings
mfa_enabled = true
mfa_max_enrolled_factors = 3

# Security: Rate limiting
rate_limit_email_sent = 2  # per minute
rate_limit_verify = 10  # per minute
rate_limit_token_refresh = 10  # per minute

[db]
# Security: SSL mode
ssl_mode = "require"

[storage]
# Security: File size limits
file_size_limit = 52428800  # 50MB
allowed_mime_types = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/csv"
]
```

#### 5.1.2 IP Allowlist

```sql
-- Security: Restrict database access by IP
-- Configure in Supabase Dashboard > Settings > Database > Network Restrictions
-- Recommended: Only allow application servers and admin VPN IPs

-- Alternatively, use pg_hba.conf for self-hosted:
# TYPE  DATABASE        USER            ADDRESS                 METHOD
hostssl all             all             10.0.0.0/8              scram-sha-256
hostssl all             all             172.16.0.0/12           scram-sha-256
hostssl all             all             192.168.0.0/16          scram-sha-256
hostssl all             all             [ADMIN_VPN_IP]/32       scram-sha-256
hostssl all             all             [APP_SERVER_IP]/32      scram-sha-256
```

### 5.2 Frontend Security Headers

```typescript
// netlify.toml - Security headers for Netlify deployment
[[headers]]
  for = "/*"
  [headers.values]
    # Security: Content Security Policy
    Content-Security-Policy = """
      default-src 'self';
      script-src 'self' 'unsafe-inline' https://*.supabase.co;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob: https://*.supabase.co;
      font-src 'self';
      connect-src 'self' https://*.supabase.co wss://*.supabase.co;
      media-src 'self';
      object-src 'none';
      frame-ancestors 'none';
      base-uri 'self';
      form-action 'self';
    """
    
    # Security: Strict Transport Security
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    
    # Security: XSS Protection
    X-XSS-Protection = "1; mode=block"
    
    # Security: Content Type Options
    X-Content-Type-Options = "nosniff"
    
    # Security: Frame Options
    X-Frame-Options = "DENY"
    
    # Security: Referrer Policy
    Referrer-Policy = "strict-origin-when-cross-origin"
    
    # Security: Permissions Policy
    Permissions-Policy = """
      camera=(),
      microphone=(),
      geolocation=(),
      payment=(),
      usb=(),
      magnetometer=(),
      gyroscope=()
    """
```

### 5.3 Environment Security

```typescript
// .env.example - Secure environment template
# SECURITY WARNING: Never commit actual .env files to version control!

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Security: Only server-side keys (never expose in frontend)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Application Security
VITE_ENCRYPTION_KEY=your-encryption-key
VITE_SESSION_TIMEOUT=1800000

# Monitoring and Logging
VITE_SENTRY_DSN=your-sentry-dsn
VITE_LOG_LEVEL=warn

# Feature Flags
VITE_ENABLE_MFA=true
VITE_ENABLE_AUDIT_LOGGING=true
```

---

## 6. Incident Response Procedures

### 6.1 Detection and Alerting

#### 6.1.1 Security Event Types

```typescript
// src/lib/security-events.ts
export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  MFA_CHALLENGE_FAILED = 'MFA_CHALLENGE_FAILED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  
  // Authorization events
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PRIVILEGE_ESCALATION_ATTEMPT = 'PRIVILEGE_ESCALATION_ATTEMPT',
  
  // Data access events
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  BULK_DATA_EXPORT = 'BULK_DATA_EXPORT',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  
  // System events
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  SECURITY_SETTING_CHANGED = 'SECURITY_SETTING_CHANGED',
  AUDIT_LOG_CLEARED = 'AUDIT_LOG_CLEARED',
  
  // Threat indicators
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  SESSION_HIJACKING_ATTEMPT = 'SESSION_HIJACKING_ATTEMPT',
}

interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const logSecurityEvent = async (event: SecurityEvent): Promise<void> => {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log('[Security Event]', event);
  }
  
  // Send to logging service
  try {
    await supabase.from('security_events').insert({
      event_type: event.type,
      timestamp: event.timestamp,
      user_id: event.userId,
      session_id: event.sessionId,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      details: event.details,
      severity: event.severity,
    });
  } catch (error) {
    // Fallback: log to external service
    console.error('Failed to log security event:', error);
  }
  
  // Alert on high/critical events
  if (event.severity === 'high' || event.severity === 'critical') {
    await alertSecurityTeam(event);
  }
};

const alertSecurityTeam = async (event: SecurityEvent): Promise<void> => {
  // Send alert to security team
  await fetch('/api/security-alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
};
```

#### 6.1.2 Real-time Monitoring

```typescript
// src/lib/realtime-security.ts
import { supabase } from './supabase';

// Monitor for suspicious authentication patterns
export const setupAuthMonitoring = () => {
  const channel = supabase
    .channel('security-monitoring')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'auth',
        table: 'audit_log_entries',
      },
      (payload) => {
        analyzeSecurityEvent(payload.new);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
};

// Detect brute force attempts
const failedLoginAttempts = new Map<string, number[]>();

const analyzeSecurityEvent = (event: any) => {
  const { ip_address, action, created_at } = event;
  
  if (action === 'login_failed') {
    const now = Date.now();
    const attempts = failedLoginAttempts.get(ip_address) || [];
    
    // Keep only last 5 minutes of attempts
    const recentAttempts = attempts.filter(
      time => now - time < 5 * 60 * 1000
    );
    recentAttempts.push(now);
    
    failedLoginAttempts.set(ip_address, recentAttempts);
    
    // Alert if more than 5 failed attempts in 5 minutes
    if (recentAttempts.length >= 5) {
      logSecurityEvent({
        type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
        timestamp: new Date().toISOString(),
        ipAddress: ip_address,
        userAgent: event.user_agent || 'unknown',
        details: {
          failedAttempts: recentAttempts.length,
          timeWindow: '5 minutes',
        },
        severity: 'high',
      });
      
      // Trigger IP blocking (via edge function)
      blockIPAddress(ip_address);
    }
  }
};

const blockIPAddress = async (ip: string) => {
  await supabase.functions.invoke('block-ip', {
    body: { ip, reason: 'brute_force' },
  });
};
```

### 6.2 Response Playbooks

#### 6.2.1 Account Compromise Response

```typescript
// src/lib/incident-response.ts

/**
 * ACCOUNT COMPROMISE RESPONSE PLAYBOOK
 * Trigger: Suspicious login, MFA bypass attempt, impossible travel
 */
export const handleAccountCompromise = async (userId: string): Promise<void> => {
  // Step 1: Immediate containment
  // Invalidate all sessions
  await supabase.auth.admin.signOut(userId);
  
  // Step 2: Reset credentials
  await supabase.auth.admin.updateUserById(userId, {
    password: generateTemporaryPassword(),
    email_confirm: true,
  });
  
  // Step 3: Audit recent activity
  const { data: recentActivity } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: false });
  
  // Step 4: Check for data exfiltration
  const { data: dataAccess } = await supabase
    .from('security_events')
    .select('*')
    .eq('user_id', userId)
    .eq('event_type', 'BULK_DATA_EXPORT')
    .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  
  // Step 5: Notify security team
  await notifySecurityTeam({
    incident: 'ACCOUNT_COMPROMISE',
    userId,
    recentActivity,
    potentialDataExfiltration: dataAccess?.length > 0,
  });
  
  // Step 6: Require password reset on next login
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { require_password_change: true },
  });
  
  // Step 7: Force MFA re-enrollment if suspicious
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { mfa_reverification_required: true },
  });
};

/**
 * DATA BREACH RESPONSE PLAYBOOK
 * Trigger: Unauthorized data access, bulk export, insider threat
 */
export const handleDataBreach = async (details: {
  affectedUsers: string[];
  dataTypes: string[];
  timeRange: { start: string; end: string };
}): Promise<void> => {
  // Step 1: Preserve evidence
  const evidenceId = await preserveEvidence(details);
  
  // Step 2: Contain access
  for (const userId of details.affectedUsers) {
    await restrictUserAccess(userId);
  }
  
  // Step 3: Assess scope
  const scope = await assessBreachScope(details);
  
  // Step 4: Regulatory notification assessment
  const requiresNotification = await assessNotificationRequirements(scope);
  
  // Step 5: Create incident ticket
  const incidentId = await createIncidentTicket({
    type: 'DATA_BREACH',
    severity: 'critical',
    evidenceId,
    scope,
    requiresNotification,
  });
  
  // Step 6: Executive notification
  await notifyExecutives({
    incidentId,
    summary: scope,
    immediateActions: 'Access restricted, evidence preserved',
  });
};
```

---

## 7. Security Monitoring

### 7.1 Security Dashboard

```typescript
// src/components/security/SecurityDashboard.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SecurityMetrics {
  failedLoginsLast24h: number;
  activeSessions: number;
  mfaEnrollmentRate: number;
  pendingSecurityAlerts: number;
  recentSecurityEvents: SecurityEvent[];
}

export const SecurityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  
  useEffect(() => {
    fetchSecurityMetrics();
    
    // Real-time updates
    const subscription = supabase
      .channel('security-metrics')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_events',
      }, () => {
        fetchSecurityMetrics();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);
  
  const fetchSecurityMetrics = async () => {
    // Fetch metrics in parallel
    const [
      failedLogins,
      activeSessions,
      mfaStats,
      pendingAlerts,
      recentEvents,
    ] = await Promise.all([
      fetchFailedLoginsCount(),
      fetchActiveSessionsCount(),
      fetchMFAEnrollmentRate(),
      fetchPendingAlertsCount(),
      fetchRecentSecurityEvents(),
    ]);
    
    setMetrics({
      failedLoginsLast24h: failedLogins,
      activeSessions,
      mfaEnrollmentRate: mfaStats,
      pendingSecurityAlerts: pendingAlerts,
      recentSecurityEvents: recentEvents,
    });
  };
  
  return (
    <div className="security-dashboard">
      <h1>Security Dashboard</h1>
      
      <div className="metrics-grid">
        <MetricCard
          title="Failed Logins (24h)"
          value={metrics?.failedLoginsLast24h || 0}
          alert={metrics?.failedLoginsLast24h > 100}
        />
        <MetricCard
          title="Active Sessions"
          value={metrics?.activeSessions || 0}
        />
        <MetricCard
          title="MFA Enrollment"
          value={`${metrics?.mfaEnrollmentRate || 0}%`}
          alert={(metrics?.mfaEnrollmentRate || 0) < 80}
        />
        <MetricCard
          title="Pending Alerts"
          value={metrics?.pendingSecurityAlerts || 0}
          alert={(metrics?.pendingSecurityAlerts || 0) > 0}
        />
      </div>
      
      <SecurityEventsTable events={metrics?.recentSecurityEvents || []} />
    </div>
  );
};
```

### 7.2 Automated Response Actions

```sql
-- Security: Automated response triggers

-- Block IPs with excessive failed logins
CREATE OR REPLACE FUNCTION auto_block_ip()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if IP has more than 10 failed logins in last hour
  IF (
    SELECT COUNT(*)
    FROM auth.audit_log_entries
    WHERE ip_address = NEW.ip_address
    AND action = 'login_failed'
    AND created_at > NOW() - INTERVAL '1 hour'
  ) > 10 THEN
    
    -- Insert into blocked_ips table
    INSERT INTO blocked_ips (ip_address, reason, blocked_until)
    VALUES (
      NEW.ip_address,
      'excessive_failed_logins',
      NOW() + INTERVAL '24 hours'
    )
    ON CONFLICT (ip_address) DO UPDATE
    SET blocked_until = NOW() + INTERVAL '24 hours',
        blocked_count = blocked_ips.blocked_count + 1;
    
    -- Log the action
    INSERT INTO security_events (
      event_type,
      severity,
      details
    ) VALUES (
      'IP_AUTO_BLOCKED',
      'medium',
      jsonb_build_object(
        'ip_address', NEW.ip_address,
        'reason', 'excessive_failed_logins',
        'blocked_until', NOW() + INTERVAL '24 hours'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_block_on_failed_login
  AFTER INSERT ON auth.audit_log_entries
  FOR EACH ROW
  WHEN (NEW.action = 'login_failed')
  EXECUTE FUNCTION auto_block_ip();
```

---

## 8. Compliance Mapping

### 8.1 GDPR Compliance

| Requirement | Implementation | Evidence |
|-------------|----------------|----------|
| **Data Minimization** | Only collect necessary data | Data inventory |
| **Purpose Limitation** | Clear data usage policies | Privacy policy |
| **Storage Limitation** | Automated data retention policies | Retention schedules |
| **Accuracy** | User self-service data correction | Profile editing |
| **Integrity/Confidentiality** | Encryption, access controls | Security controls doc |
| **Lawful Basis** | Consent management | Consent logs |
| **Data Subject Rights** | Self-service portal | DSR implementation |
| **Breach Notification** | 72-hour notification process | IRP Section 3.1.5 |

### 8.2 PCI DSS Compliance (if handling payments)

| Requirement | Implementation | Evidence |
|-------------|----------------|----------|
| **1. Firewall** | Supabase network controls | Configuration docs |
| **2. Password Security** | Strong password policies | Password policy doc |
| **3. Protect Cardholder Data** | Encryption at rest/transit | Encryption verification |
| **4. Encrypt Transmission** | TLS 1.3 everywhere | SSL Labs scan |
| **5. Antivirus** | EDR on admin systems | EDR deployment |
| **6. Secure Systems** | Patch management | Patch logs |
| **7. Need-to-Know Access** | RBAC implementation | Access reviews |
| **8. Identify Users** | Unique accounts, MFA | Auth configuration |
| **9. Physical Security** | Cloud provider controls | AWS/Azure compliance |
| **10. Track Access** | Audit logging | Audit log review |
| **11. Security Testing** | Vulnerability scans | Scan reports |
| **12. Security Policy** | Security policies | Policy documentation |

### 8.3 SOC 2 Type II Controls

| Trust Service Criteria | Control | Evidence |
|------------------------|---------|----------|
| **Security (CC6.1)** | Logical access security | Access control matrix |
| **Security (CC6.2)** | Authentication | MFA implementation |
| **Security (CC6.3)** | Authorization | RBAC policies |
| **Security (CC7.1)** | Security monitoring | SIEM configuration |
| **Security (CC7.2)** | Incident detection | Alert configuration |
| **Security (CC7.3)** | Incident response | IRP documentation |
| **Availability (A1.2)** | System monitoring | Uptime monitoring |
| **Availability (A1.3)** | Incident recovery | DR procedures |

---

## Appendix: Security Checklists

### Pre-Deployment Security Checklist

```
□ Code Security Review
  □ No hardcoded secrets
  □ No debug logging in production
  □ Input validation on all endpoints
  □ Output encoding implemented
  □ CSRF protection enabled

□ Authentication & Authorization
  □ MFA enabled for all admin accounts
  □ Strong password policy enforced
  □ Session timeout configured
  □ RLS policies tested
  □ Permission checks verified

□ Infrastructure
  □ HTTPS only
  □ Security headers configured
  □ CSP policy implemented
  □ Rate limiting enabled
  □ IP restrictions configured

□ Monitoring
  □ Audit logging enabled
  □ Security alerts configured
  □ Error tracking enabled
  □ Performance monitoring active

□ Data Protection
  □ Encryption at rest enabled
  □ TLS 1.3 enforced
  □ Backup encryption verified
  □ Data retention configured
```

### Security Incident Response Checklist

```
IMMEDIATE (0-15 minutes):
□ Acknowledge incident
□ Assess severity
□ Notify IRT members
□ Begin documentation
□ Preserve evidence

CONTAINMENT (15-60 minutes):
□ Isolate affected systems
□ Block malicious IPs
□ Disable compromised accounts
□ Enable enhanced monitoring

INVESTIGATION (1-4 hours):
□ Determine scope
□ Identify root cause
□ Analyze logs
□ Document timeline

RECOVERY (4-24 hours):
□ Eradicate threat
□ Patch vulnerabilities
□ Restore systems
□ Verify integrity

POST-INCIDENT (24+ hours):
□ Finalize documentation
□ Conduct lessons learned
□ Update controls
□ Communicate to stakeholders
```

---

*This document should be reviewed quarterly and updated as the system evolves.*
