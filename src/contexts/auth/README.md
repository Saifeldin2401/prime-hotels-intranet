# Auth Context Refactoring

## Overview

The monolithic `AuthContext.tsx` (865 lines, 20+ state properties) has been refactored into **4 focused contexts** to eliminate unnecessary re-renders and improve maintainability.

## The 4 Focused Contexts

### 1. AuthIdentityContext (`AuthIdentityContext.tsx` ~260 lines)
**Responsibility:** Core authentication state

**State:**
- `user: User | null` - Supabase user object
- `loading: boolean` - Initial auth loading state

**Key Features:**
- Initial session restoration
- Auth state change listening
- Tab visibility session recovery
- Token refresh on session expiry

**Hook:** `useAuthIdentity()`

**When to use:**
```tsx
// Only re-renders when user or loading changes
const { user, loading } = useAuthIdentity()
```

---

### 2. AuthSecurityContext (`AuthSecurityContext.tsx` ~170 lines)
**Responsibility:** Security features

**State:**
- `isMFAVerified: boolean` - MFA verification status
- `pendingMFAUserId: string | null` - User awaiting MFA
- `securityRequirements: SecurityRequirements | null` - MFA requirements, password rotation

**Key Features:**
- Session binding validation (IP/User-Agent)
- Periodic security checks (every 60s)
- Session limit enforcement

**Hook:** `useAuthSecurity()`

**When to use:**
```tsx
// Only re-renders when security state changes
const { isMFAVerified, securityRequirements } = useAuthSecurity()
```

---

### 3. UserDataContext (`UserDataContext.tsx` ~150 lines)
**Responsibility:** User profile and organization data

**State:**
- `profile: Profile | null` - User profile
- `roles: UserRole[]` - User roles
- `properties: Property[]` - Accessible properties
- `departments: Department[]` - Accessible departments
- `rolesLoading: boolean` - User data loading state
- `primaryRole: AppRole | null` - Highest privilege role

**Key Features:**
- Lazy data loading after auth
- Background refresh support
- Primary role calculation

**Hook:** `useUserData()`

**When to use:**
```tsx
// Only re-renders when user data changes
const { profile, roles, primaryRole } = useUserData()
```

---

### 4. AuthActionsContext (`AuthActionsContext.tsx` ~330 lines)
**Responsibility:** Authentication actions

**Actions:**
- `signIn(email, password, captchaToken?)` - Authenticate user
- `signOut()` - Log out user
- `refreshSession()` - Refresh access token
- `verifyMFA(code)` - Verify MFA code

**Key Features:**
- ⚠️ **STABLE REFERENCE** - Context value never changes!
- Rate limiting
- Brute force protection
- Password breach checking
- MFA flow handling

**Hook:** `useAuthActions()`

**When to use:**
```tsx
// NEVER causes re-renders - safe for any dependency array
const { signIn, signOut, refreshSession, verifyMFA } = useAuthActions()
```

---

## Backward Compatibility

### Existing Code Still Works

```tsx
// Old way (still works, but re-renders on ANY auth change)
import { useAuth } from '@/hooks/useAuth'
const { user, profile, signIn, isMFAVerified } = useAuth()
```

### New Recommended Approach

```tsx
// New way (optimal performance - only re-renders when needed)
import { useAuthIdentity, useUserData, useAuthActions } from '@/contexts/auth'

function UserGreeting() {
  const { user } = useAuthIdentity() // Only re-renders when user changes
  return <h1>Hello {user?.email}</h1>
}

function RoleBadge() {
  const { primaryRole } = useUserData() // Only re-renders when roles change
  return <span>{primaryRole}</span>
}

function LoginButton() {
  const { signIn } = useAuthActions() // NEVER causes re-renders
  return <button onClick={() => signIn(email, password)}>Login</button>
}
```

---

## File Structure

```
src/contexts/
├── AuthContext.tsx           # Backward-compatible wrapper (~130 lines)
└── auth/
    ├── index.ts              # Barrel exports
    ├── README.md             # This file
    ├── AuthIdentityContext.tsx
    ├── AuthSecurityContext.tsx
    ├── UserDataContext.tsx
    ├── AuthActionsContext.tsx
    ├── useAuthSession.ts     # Shared session utilities
    └── useUserDataLoader.ts  # User data loading logic
```

---

## Provider Hierarchy

```tsx
<AuthIdentityProvider>     {/* Must be first - provides user/setUser */}
  <AuthSecurityProvider>   {/* Depends on AuthIdentityContext */}
    <UserDataProvider>     {/* Depends on AuthIdentityContext */}
      <AuthActionsProvider> {/* Depends on all above */}
        <AuthProviderInternal> {/* Combines all for backward compat */}
          {children}
        </AuthProviderInternal>
      </AuthActionsProvider>
    </UserDataProvider>
  </AuthSecurityProvider>
</AuthIdentityProvider>
```

---

## Performance Benefits

| Scenario | Before | After |
|----------|--------|-------|
| User data refresh | Entire app re-renders | Only UserDataContext consumers |
| Security check | Entire app re-renders | Only AuthSecurityContext consumers |
| Sign in action | Entire app re-renders | Actions only (stable ref) |
| Profile update | Entire app re-renders | Only UserDataContext consumers |

---

## Migration Guide

### Step 1: Identify what you need

```tsx
// Need just the user?
const { user } = useAuthIdentity()

// Need just actions?
const { signIn } = useAuthActions()

// Need profile/roles?
const { profile, roles } = useUserData()

// Need MFA state?
const { isMFAVerified } = useAuthSecurity()
```

### Step 2: Update imports

```tsx
// Before
import { useAuth } from '@/hooks/useAuth'

// After (granular)
import { useAuthIdentity, useAuthActions } from '@/contexts/auth'
// or
import { useAuthIdentity, useAuthActions } from '@/hooks/auth'
```

### Step 3: Optimize dependency arrays

```tsx
// Before - causes re-renders when any auth state changes
const handleSubmit = useCallback(async () => {
  await signIn(email, password)
}, [signIn, email, password]) // signIn reference changes often!

// After - never causes re-renders from auth
const { signIn } = useAuthActions()
const handleSubmit = useCallback(async () => {
  await signIn(email, password)
}, [signIn, email, password]) // signIn reference is STABLE
```

---

## TypeScript Types

All types are exported from the barrel:

```tsx
import type { 
  AuthIdentityContextType,
  AuthSecurityContextType,
  SecurityRequirements,
  UserDataContextType,
  AuthActionsContextType,
  SignInResult 
} from '@/contexts/auth'
```
