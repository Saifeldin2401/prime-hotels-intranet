# Altus Connect Tab Switching Fixes - Production Readiness

## Overview

This document outlines the production-ready implementation of fixes for tab switching issues that were causing unexpected logouts and flickering.

## Changes Summary

### 1. New Utilities Created

#### `src/lib/authErrorUtils.ts`
Error classification utilities that distinguish between:
- **Auth expired** (401/403) → Logout required
- **Network errors** (timeout, offline) → Keep session, retry
- **Server errors** (5xx) → Keep session, may retry
- **Client errors** (4xx) → Don't retry

**Key Functions:**
- `classifyAuthError(error)` - Returns error type, logout necessity, and retryability
- `getRetryDelay(attempt)` - Exponential backoff with jitter
- `shouldRetry(error, attempt, maxAttempts)` - Retry decision logic
- `getErrorMessage(error)` / `getErrorCode(error)` - Safe error extraction

#### `src/lib/featureFlags.ts`
Feature flag system for gradual rollout:
- `isEnabled(flag)` - Check if feature is enabled
- `setLocalOverride(flag, enabled)` - Override for testing
- `getAllFlags()` - Get all flag statuses
- Supports percentage-based rollouts
- Sticky per session for consistency

**Available Flags:**
- `tabSwitchingFixes` - Master flag for all fixes
- `smartSessionValidation` - Debounced validation on tab resume
- `networkAwareLogout` - Don't logout on network errors
- `debouncedFocusManager` - Debounced React Query refetching

#### `src/lib/authMonitor.ts`
Auth event monitoring and metrics:
- Tracks session validation attempts
- Records logout reasons
- Monitors network error patterns
- Buffers recent events (last 50)
- Reports session health

**Usage:**
```typescript
// Events are recorded automatically
// To check health in console:
reportAuthHealth()

// In development, type in console:
reportAuthHealth()
```

### 2. Modified Files

#### `src/contexts/AuthContext.tsx`
**Production Improvements:**
- ✅ Uses error classification for intelligent logout decisions
- ✅ Implements retry with exponential backoff for network errors
- ✅ Adds proper cleanup for all timers
- ✅ Records events to auth monitor
- ✅ Configurable via constants
- ✅ Feature flag integration
- ✅ Exposes `reportAuthHealth()` in dev console

**Configuration Constants:**
```typescript
const CONFIG = {
  visibilityDebounceMs: 500,    // Delay before validating on visibility change
  validationThrottleMs: 5000,   // Minimum time between validations
  maxRetries: 3,                // Max retry attempts for network errors
  baseRetryDelayMs: 1000,       // Base retry delay (exponential backoff)
  loadingTimeoutMs: 5000,       // Loading state timeout
}
```

#### `src/App.tsx`
**Production Improvements:**
- ✅ Feature flag controlled debouncing
- ✅ Proper cleanup of focus manager
- ✅ Consistent event listener management

#### `src/lib/supabase.ts`
**Change:**
- Changed storage from `sessionStorage` to `localStorage` for consistent session persistence across tabs

## Production Deployment Checklist

### Pre-Deployment

- [ ] All TypeScript types compile without errors
- [ ] Unit tests pass (if available)
- [ ] Feature flags set to appropriate rollout percentage
- [ ] Monitoring dashboards ready

### Deployment

- [ ] Deploy with feature flags at 0% initially
- [ ] Verify no console errors in production
- [ ] Gradually increase rollout to 10%, 50%, 100%
- [ ] Monitor auth-related metrics

### Post-Deployment Monitoring

Watch for these metrics:

| Metric | Expected | Alert If |
|--------|----------|----------|
| Session validation success rate | > 95% | < 90% |
| Network error rate | < 5% | > 10% |
| Unexpected logouts | Decreasing | Increasing |
| Token refresh failures | < 1% | > 5% |

## Feature Flag Configuration

### Gradual Rollout Strategy

1. **Phase 1 (0% - Testing)**
   ```javascript
   // Enable for specific users via console
   localStorage.setItem('ff_tabSwitchingFixes', 'true')
   ```

2. **Phase 2 (10% Rollout)**
   ```typescript
   // In featureFlags.ts
   tabSwitchingFixes: { enabled: true, rolloutPercent: 10 }
   ```

3. **Phase 3 (50% Rollout)**
   ```typescript
   tabSwitchingFixes: { enabled: true, rolloutPercent: 50 }
   ```

4. **Phase 4 (100% Rollout)**
   ```typescript
   tabSwitchingFixes: { enabled: true, rolloutPercent: 100 }
   ```

### Emergency Rollback

If issues are detected, disable immediately:

```typescript
// In featureFlags.ts - set enabled: false
tabSwitchingFixes: { enabled: false, rolloutPercent: 0 }
```

Or for specific users:
```javascript
localStorage.setItem('ff_tabSwitchingFixes', 'false')
```

## Testing in Production

### Safe Testing Approach

1. **Enable for yourself only:**
   ```javascript
   localStorage.setItem('ff_tabSwitchingFixes', 'true')
   localStorage.setItem('ff_smartSessionValidation', 'true')
   localStorage.setItem('ff_networkAwareLogout', 'true')
   localStorage.setItem('ff_debouncedFocusManager', 'true')
   ```

2. **Test scenarios:**
   - Rapid tab switching (10x)
   - Background app for 5 minutes
   - Airplane mode on/off
   - Slow network (3G throttling)

3. **Check health report:**
   ```javascript
   reportAuthHealth()
   ```

4. **Disable after testing:**
   ```javascript
   localStorage.removeItem('ff_tabSwitchingFixes')
   localStorage.removeItem('ff_smartSessionValidation')
   localStorage.removeItem('ff_networkAwareLogout')
   localStorage.removeItem('ff_debouncedFocusManager')
   ```

## Console Commands for Debugging

### Development/Staging

```javascript
// Check feature flags
getAllFlags()

// Check auth health
reportAuthHealth()

// Get session metrics
getSessionMetrics()

// Get recent auth events
getRecentEvents(10)

// Check if session is healthy
isSessionHealthy()
```

### Production (limited)

```javascript
// Check feature flags (if enabled in prod)
getAllFlags()

// Check auth health
reportAuthHealth()
```

## Error Handling Strategy

### Network Errors
- **Behavior:** Retry up to 3 times with exponential backoff
- **User Impact:** None (session preserved)
- **Log Level:** Warn in dev, silent in prod (tracked via monitor)

### Auth Errors (401/403)
- **Behavior:** Clear session, redirect to login
- **User Impact:** Logout, must re-authenticate
- **Log Level:** Warn, tracked in analytics

### Server Errors (5xx)
- **Behavior:** Retry once, then keep session
- **User Impact:** None (session preserved)
- **Log Level:** Error, tracked in analytics

### Unknown Errors
- **Behavior:** Log but don't logout
- **User Impact:** None
- **Log Level:** Error

## Performance Considerations

### Memory
- Event buffer limited to 50 entries
- All timers properly cleaned up on unmount
- Refs used to prevent unnecessary re-renders

### Network
- Validation throttled to max once per 5 seconds
- Retry delays prevent thundering herd (jitter added)
- Offline detection prevents unnecessary requests

### CPU
- Debounced focus events reduce re-renders
- Throttled validation prevents CPU spikes
- Memoized callbacks and values

## Security Considerations

1. **Session Storage:** Changed to localStorage for persistence
   - Trade-off: Slightly less secure per-tab isolation
   - Benefit: Consistent behavior, fewer unexpected logouts
   - Mitigation: Short session TTL, proper logout handling

2. **Error Information:** 
   - Safe error message extraction prevents information leakage
   - Full error details only in development

3. **Retry Logic:**
   - Limited retries prevent brute force amplification
   - Exponential backoff prevents DoS

## Rollback Plan

### If Critical Issues Found

1. **Immediate (via feature flags):**
   ```typescript
   // featureFlags.ts
   tabSwitchingFixes: { enabled: false, rolloutPercent: 0 }
   ```

2. **Code Rollback (if needed):**
   ```bash
   git revert HEAD
   # Or revert specific commits
   ```

3. **Clear client storage:**
   ```javascript
   // In browser console for affected users
   localStorage.clear()
   sessionStorage.clear()
   ```

## Monitoring and Alerting

### Recommended Alerts

1. **High logout rate:**
   - Trigger: > 10% increase in logout events
   - Action: Check feature flags, consider rollback

2. **High network error rate:**
   - Trigger: > 20% of validations fail with network errors
   - Action: Check API health, CDN status

3. **Multiple validation failures:**
   - Trigger: User has > 3 failed validations without success
   - Action: Log for investigation

### Dashboard Queries

```javascript
// Example: Users with multiple network errors in last hour
// (Send to your analytics platform)
analytics.track('Auth Network Error', {
  error: errorMessage,
  retry_count: attempt,
  user_agent: navigator.userAgent,
})
```

## Support Playbook

### User Reports "Unexpected Logout"

1. Ask user to check console:
   ```javascript
   reportAuthHealth()
   ```

2. Check for:
   - High network error count
   - Multiple failed validations
   - Auth errors (401/403)

3. If network errors:
   - Check user's internet connection
   - Check if corporate firewall blocking requests

4. If auth errors:
   - Check session expiration settings in Supabase
   - Verify user's session hasn't actually expired

### User Reports "App Not Loading"

1. Check feature flags are accessible
2. Ask user to hard refresh (Ctrl+F5 / Cmd+Shift+R)
3. If persists, ask user to clear site data

## Future Improvements

- [ ] Add unit tests for error classification
- [ ] Add integration tests for tab switching scenarios
- [ ] Implement server-side session health endpoint
- [ ] Add real-time session status indicator in UI
- [ ] Implement automatic session recovery on network restore
