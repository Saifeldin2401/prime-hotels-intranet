# PHG Connect Tab Switching Issue - Root Cause Analysis

## Executive Summary

PHG Connect exhibits unwanted behavior (refresh, logout, flickering) when users switch browser tabs or return from background. This document identifies the root causes and provides recommended solutions.

---

## Root Causes Identified

### 1. **Aggressive Session Validation on Tab Resume** (CRITICAL)

**Location:** `src/contexts/AuthContext.tsx` (lines 169-200)

**Problem:**
```typescript
const verifySessionOnResume = async () => {
  // ...
  const { data: { user: verifiedUser }, error } = await supabase.auth.getUser()
  if (error || !verifiedUser) {
    if (isAuthError(error) || !verifiedUser) {
      await clearLocalSession('Session is no longer valid after tab resume', resetLocalAuthState)
      // ...
    }
  }
}
```

- Triggers on EVERY `window` focus and `visibilitychange` event
- No distinction between **auth errors** (401/403) vs **network errors** (timeout, offline)
- Immediately logs out users if `getUser()` fails for ANY reason
- No grace period or retry mechanism for transient failures

**Why it causes issues:**
- When a tab becomes active after being backgrounded, Chrome may throttle network briefly
- Race condition with Supabase's own auto-refresh token mechanism
- On slow/mobile networks, the API call may timeout even with valid session

---

### 2. **Storage Mode Mismatch** (HIGH PRIORITY)

**Location:** `src/lib/supabase.ts` (line 72)

**Problem:**
```typescript
storage: isDevMode ? createSafeStorage('local') : createSafeStorage('session')
```

- **Production** uses `sessionStorage` (tab-specific, cleared when tab closes)
- **Development** uses `localStorage` (persists across tabs)
- Meanwhile, `useInactivityTimeout.ts` uses `localStorage` for cross-tab sync

**Why it causes issues:**
- Session tokens stored in sessionStorage are not shared between tabs
- If user opens multiple tabs, each has isolated auth state
- When returning from background, sessionStorage may be purged by browser on memory pressure

---

### 3. **React Query Focus Manager + Reconnect Storm** (MEDIUM PRIORITY)

**Location:** `src/App.tsx` (lines 135-159)

**Problem:**
```typescript
focusManager.setEventListener((handleFocus) => {
  const onFocus = () => {
    if (document.visibilityState === 'visible') {
      handleFocus()  // Triggers ALL queries to refetch
    }
  }
  window.addEventListener('focus', onFocus)
  // ...
})
```

- Custom focus manager triggers React Query refetch on every focus event
- Combined with `refetchOnReconnect: true`, this can cause multiple simultaneous refetches
- Each refetch could fail with auth errors during the brief window when token is being refreshed

---

### 4. **No Network Error Handling in Session Recovery** (HIGH PRIORITY)

**Location:** `src/contexts/AuthContext.tsx` (lines 180-188)

**Problem:**
```typescript
if (error || !verifiedUser) {
  if (isAuthError(error) || !verifiedUser) {
    await clearLocalSession(...)  // Clears on ANY error, including network
  }
}
```

- Does not distinguish between:
  - `401 Unauthorized` (actual session expired)
  - `0 Network Error` (offline/temporarily disconnected)
  - `504 Timeout` (slow network)
- Immediately clears session and logs out user even for recoverable network issues

---

### 5. **Multiple Parallel Auth Requests Can Race** (MEDIUM PRIORITY)

**Location:** `src/contexts/auth/useUserDataLoader.ts` (lines 119-128)

**Problem:**
```typescript
const [rolesResult, propertiesResult, departmentsResult] = await Promise.allSettled([
  withTimeout(rolesPromise as any, 10000, 'Roles load'),
  withTimeout(propertiesPromise as any, 10000, 'Properties load'),
  withTimeout(departmentsPromise as any, 10000, 'Departments load'),
])
```

- Multiple parallel requests each can trigger independent `clearLocalSession` calls
- If token refresh happens mid-request, multiple auth errors fire simultaneously
- Can cause cascading re-renders and flickering

---

## Impact Matrix

| Issue | Desktop Chrome | Desktop Safari | Mobile Chrome | Mobile Safari |
|-------|---------------|----------------|---------------|---------------|
| Aggressive Session Validation | HIGH | MEDIUM | HIGH | HIGH |
| Storage Mode Mismatch | LOW | LOW | HIGH | MEDIUM |
| React Query Focus Storm | MEDIUM | LOW | HIGH | MEDIUM |
| Network Error Handling | HIGH | HIGH | HIGH | HIGH |

---

## Recommended Solutions

### Solution 1: Smart Session Validation with Network Awareness

Replace the aggressive `verifySessionOnResume` with a resilient version that distinguishes auth errors from network errors.

```typescript
// src/contexts/AuthContext.tsx - Modified verifySessionOnResume

const verifySessionOnResume = async () => {
  if (!mounted || document.visibilityState === 'hidden') return
  if (resumeValidationInFlightRef.current) return
  
  const now = Date.now()
  if (now - lastResumeValidationAtRef.current < 5000) return // Increased from 2s

  resumeValidationInFlightRef.current = true
  lastResumeValidationAtRef.current = now
  
  try {
    const { data: { user: verifiedUser }, error } = await supabase.auth.getUser()
    
    if (!mounted) return
    
    if (error) {
      // Only logout on definitive auth errors, not network issues
      const isNetworkError = !error.status || error.status === 0 || error.message?.includes('timeout')
      const isAuthExpired = error.status === 401 || error.status === 403
      
      if (isAuthExpired) {
        // Only clear session on actual auth expiration
        await clearLocalSession('Session expired (401)', resetLocalAuthState)
      } else if (isNetworkError) {
        // Don't clear session on network errors - session may still be valid
        console.warn('[Auth] Network error during resume check, keeping session')
        // Optionally schedule a retry
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            void verifySessionOnResume()
          }
        }, 30000) // Retry in 30 seconds
      }
      return
    }
    
    if (!verifiedUser) {
      // No user returned - this is a real logout situation
      await clearLocalSession('No user after tab resume', resetLocalAuthState)
      return
    }
    
    // Success - update user if changed
    authRecoveryInProgressRef.current = false
    setUser((current) => (current?.id === verifiedUser.id ? current : verifiedUser))
    
    if (shouldRefreshUserData(verifiedUser.id)) {
      loadUserData(verifiedUser.id).catch(() => {
        console.warn('Error in loadUserData (resume validation).')
      })
    }
  } catch (error) {
    // Unexpected errors - don't auto-logout
    console.error('[Auth] Unexpected error in resume validation:', error)
  } finally {
    resumeValidationInFlightRef.current = false
  }
}
```

### Solution 2: Use localStorage in Production for Session Persistence

**Location:** `src/lib/supabase.ts`

Change from:
```typescript
storage: isDevMode ? createSafeStorage('local') : createSafeStorage('session')
```

To:
```typescript
storage: createSafeStorage('local')  // Always use localStorage for persistence
```

**Rationale:**
- `sessionStorage` is too aggressive about clearing data
- Modern browsers can purge sessionStorage when tabs are backgrounded for long periods
- localStorage provides consistent behavior across tabs and survives backgrounding

### Solution 3: Debounced Focus Management for React Query

**Location:** `src/App.tsx`

Replace the immediate focus handler with a debounced version:

```typescript
useEffect(() => {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  
  focusManager.setEventListener((handleFocus) => {
    const onFocus = () => {
      if (document.visibilityState !== 'visible') return
      
      // Clear existing timer
      if (debounceTimer) clearTimeout(debounceTimer)
      
      // Debounce: wait 500ms after focus stabilizes
      debounceTimer = setTimeout(() => {
        // Only refetch if we're still visible and online
        if (document.visibilityState === 'visible' && navigator.onLine) {
          handleFocus()
        }
      }, 500)
    }
    
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  })
  
  onlineManager.setEventListener((handleOnline) => {
    const onOnline = () => {
      // Small delay to let network stabilize
      setTimeout(() => handleOnline(true), 1000)
    }
    const onOffline = () => handleOnline(false)
    
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  })
}, [])
```

### Solution 4: Add Retry Logic with Exponential Backoff

**Location:** `src/contexts/auth/useAuthSession.ts`

Add a resilient `getUserWithRetry` method:

```typescript
export function useAuthSession() {
  // ... existing code ...
  
  const getUserWithRetry = useCallback(async (
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<{ user: User | null; error: Error | null }> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { data, error } = await supabase.auth.getUser()
      
      if (!error) {
        return { user: data.user, error: null }
      }
      
      // Don't retry auth errors (401/403)
      if (isAuthError(error) && error.status !== 0) {
        return { user: null, error }
      }
      
      // Retry network errors with exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    return { user: null, error: new Error('Max retries exceeded') }
  }, [isAuthError])
  
  return {
    // ... existing exports ...
    getUserWithRetry,
  }
}
```

Then use it in `verifySessionOnResume`.

### Solution 5: Prevent Multiple Simultaneous Session Clears

**Location:** `src/contexts/AuthContext.tsx`

Add a "session clearing in progress" flag:

```typescript
const sessionClearInProgressRef = useRef(false)

const verifySessionOnResume = async () => {
  if (sessionClearInProgressRef.current) return
  // ... rest of logic
}

// In clearLocalSession wrapper:
const clearLocalSessionWithGuard = async (reason: string, onCleared: () => void) => {
  if (sessionClearInProgressRef.current) return
  sessionClearInProgressRef.current = true
  try {
    await clearLocalSession(reason, onCleared)
  } finally {
    sessionClearInProgressRef.current = false
  }
}
```

---

## Quick Wins (Immediate Implementation)

### 1. Reduce Session Validation Frequency

In `AuthContext.tsx`, change:
```typescript
if (now - lastResumeValidationAtRef.current < 2000) return
```
To:
```typescript
if (now - lastResumeValidationAtRef.current < 10000) return  // 10 seconds
```

### 2. Don't Validate on Every Focus

Only validate on `visibilitychange`, not on every `window` focus:

```typescript
// Remove this:
// window.addEventListener('focus', handleWindowFocus)

// Keep only:
document.addEventListener('visibilitychange', handleVisibilityChange)
```

### 3. Add Online/Offline Detection

```typescript
const verifySessionOnResume = async () => {
  // Don't attempt validation if offline
  if (!navigator.onLine) {
    console.log('[Auth] Device offline, skipping session validation')
    return
  }
  // ... rest of logic
}
```

---

## Testing Checklist

After implementing fixes, verify:

- [ ] Switch tabs quickly (5+ times in 10 seconds) - no logout
- [ ] Open app, switch to different app for 5 minutes, return - session persists
- [ ] Simulate offline (Chrome DevTools), return online - session persists
- [ ] Mobile: background the app, return after 10 minutes - session persists
- [ ] Multiple tabs: sign in on tab A, open tab B - both show authenticated
- [ ] Slow 3G throttling: tab switching doesn't cause logout
- [ ] Sleep/wake laptop - session persists

---

## Implementation Priority

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| P0 | Network error handling in verifySessionOnResume | Low | Critical |
| P0 | Change sessionStorage to localStorage | Low | High |
| P1 | Debounce focus manager | Low | Medium |
| P1 | Add retry logic | Medium | High |
| P2 | Prevent race conditions | Medium | Medium |
| P2 | Reduce validation frequency | Low | Low |

---

## Related Files

- `src/contexts/AuthContext.tsx` - Main auth state management
- `src/contexts/auth/useAuthSession.ts` - Session utilities
- `src/contexts/auth/useUserDataLoader.ts` - User data loading
- `src/lib/supabase.ts` - Supabase client configuration
- `src/App.tsx` - React Query configuration
- `src/hooks/useInactivityTimeout.ts` - Session timeout handling
