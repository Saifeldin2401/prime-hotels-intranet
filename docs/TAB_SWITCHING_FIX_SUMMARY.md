# PHG Connect Tab Switching Fix Summary

## Changes Applied

### 1. `src/lib/supabase.ts` - Storage Mode Fix
**Problem:** Production used `sessionStorage` (cleared on tab close/backgrounding) while dev used `localStorage`.

**Fix:** Changed to always use `localStorage` for consistent session persistence:
```typescript
// Before:
storage: isDevMode ? createSafeStorage('local') : createSafeStorage('session')

// After:
storage: createSafeStorage('local')
```

**Impact:** Session now persists across tab switches, browser backgrounding, and multiple tabs.

---

### 2. `src/contexts/AuthContext.tsx` - Smart Session Validation
**Problems:**
- Session validation triggered on EVERY `window` focus event
- No distinction between auth errors (401) vs network errors (timeout/offline)
- Immediately logged out users for ANY error
- Race conditions possible with multiple simultaneous validation requests

**Fixes Applied:**

#### a) Skip validation when offline
```typescript
if (!navigator.onLine) {
  console.log('[Auth] Device offline, skipping session validation')
  return
}
```

#### b) Distinguish error types
```typescript
const isNetworkError = !errorStatus || errorStatus === 0 || 
                       errorMessage.includes('timeout') || 
                       errorMessage.includes('network')
const isAuthExpired = errorStatus === 401 || errorStatus === 403

if (isAuthExpired) {
  await clearLocalSession(...)  // Only logout on real auth errors
} else if (isNetworkError) {
  // Keep session on network errors
  console.warn('[Auth] Network error during resume check, keeping session')
}
```

#### c) Removed `window` focus listener
```typescript
// Removed:
window.addEventListener('focus', handleWindowFocus)

// Kept only:
document.addEventListener('visibilitychange', handleVisibilityChange)
```

#### d) Added 500ms delay before validation
```typescript
setTimeout(() => {
  if (document.visibilityState === 'visible') {
    void verifySessionOnResume()
  }
}, 500)
```

#### e) Increased debounce from 2s to 5s
```typescript
if (now - lastResumeValidationAtRef.current < 5000) return  // Was 2000
```

#### f) Prevent race conditions
```typescript
const sessionClearInProgressRef = useRef(false)
// Guards against multiple simultaneous session clears
```

---

### 3. `src/App.tsx` - React Query Focus Manager Debouncing
**Problem:** React Query refetched all queries immediately on every focus event, causing data request storms.

**Fix:** Added 500ms debounce to focus events:
```typescript
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const onFocus = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  
  debounceTimer = setTimeout(() => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      handleFocus()
    }
  }, 500)
}
```

Also added 1s delay for online events to let network stabilize:
```typescript
const onOnline = () => {
  setTimeout(() => handleOnline(true), 1000)
}
```

---

## Expected Behavior After Fixes

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| Quick tab switching | Could logout | No logout |
| Return from background | Could logout/refresh | Session persists |
| Offline then online | Logout | Session persists |
| Slow network | Random logout | Session persists |
| Multiple tabs | Isolated sessions | Shared session |
| Mobile app switch | Could logout | Session persists |

---

## Testing Checklist

After deploying these fixes, test the following scenarios:

### Desktop Chrome
- [ ] Rapid tab switching (10x in 5 seconds) - should stay logged in
- [ ] Minimize browser for 5 minutes - should stay logged in
- [ ] Open app in 2 tabs - both should show logged in state
- [ ] DevTools → Network → Offline → wait 10s → Online - should stay logged in

### Mobile Chrome/Safari
- [ ] Background app for 2 minutes - should stay logged in
- [ ] Switch between 3 apps and return - should stay logged in
- [ ] Lock phone for 5 minutes, unlock - should stay logged in

### Edge Cases
- [ ] Sleep laptop, wake after 10 minutes - should stay logged in
- [ ] Disconnect WiFi for 30s, reconnect - should stay logged in
- [ ] Slow 3G throttling - should not logout on slow requests

---

## Files Modified

1. `src/lib/supabase.ts` - Storage configuration
2. `src/contexts/AuthContext.tsx` - Session validation logic
3. `src/App.tsx` - React Query focus management

---

## Rollback Plan

If issues occur, revert these specific changes:

```bash
# Revert individual files
git checkout src/lib/supabase.ts
git checkout src/contexts/AuthContext.tsx
git checkout src/App.tsx
```

Or view the original code in git history:
```bash
git diff HEAD~1 src/contexts/AuthContext.tsx
```

---

## Monitoring

Watch browser console for these log messages after fix:

- ✅ `[Auth] Device offline, skipping session validation` - Normal when offline
- ✅ `[Auth] Network error during resume check, keeping session` - Network issues handled gracefully
- ⚠️ `[Auth] Session expired (401/403), clearing session` - Actual auth expiration (expected)
- ❌ `Session is no longer valid after tab resume` - Old message (should no longer appear)

---

## Related Documentation

- Full analysis: `docs/TAB_SWITCHING_ISSUE_ANALYSIS.md`
- Patch file: `docs/TAB_SWITCHING_FIXES.patch`
