# Tab Switching Fixes - Testing Guide

## Quick Start

1. Start the dev server: `npm run dev`
2. Open browser and sign in
3. Open DevTools console
4. Run tests below

## Console Commands

```javascript
// Check all feature flags are enabled
getAllFlags()
// Expected: All flags show enabled: true

// Check current session health
reportAuthHealth()
// Expected: healthy: true, no concerns
```

## Test Scenarios

### Test 1: Rapid Tab Switching
**Purpose:** Ensure no logout when switching tabs quickly

**Steps:**
1. Sign in to the app
2. Open 3 more tabs with the same app
3. Rapidly switch between tabs 10 times in 5 seconds
4. Check console: `reportAuthHealth()`

**Expected Result:**
- Session remains valid
- `validationAttempts` should be low (throttled)
- No logout occurred

**Console Check:**
```javascript
reportAuthHealth()
// Should show: healthy: true
// Should NOT show: concerns: ['Multiple failed validation attempts']
```

---

### Test 2: Background Tab Recovery
**Purpose:** Ensure session persists after tab is backgrounded

**Steps:**
1. Sign in to the app
2. Switch to a different browser tab for 2 minutes
3. Return to the app tab

**Expected Result:**
- Session still valid
- No login screen shown
- Console shows: `[Auth] Device offline, skipping session validation` (if offline)
  OR validation success

**Console Check:**
```javascript
getRecentEvents(5)
// Should show recent 'tab_resume' or 'session_validation' events
```

---

### Test 3: Offline/Online Transition
**Purpose:** Ensure no logout when going offline then online

**Steps:**
1. Sign in to the app
2. Open DevTools → Network tab
3. Set throttling to "Offline"
4. Wait 5 seconds
5. Set throttling back to "No throttling"
6. Switch to another tab and back

**Expected Result:**
- Session preserved during offline period
- No logout occurred
- Console shows: `[Auth] Network error during resume check, keeping session`

**Console Check:**
```javascript
reportAuthHealth()
// May show network errors, but session should be healthy
```

---

### Test 4: Multiple Browser Tabs
**Purpose:** Ensure session is shared across tabs

**Steps:**
1. Sign in to the app in Tab 1
2. Open the same URL in Tab 2
3. Both tabs should show logged-in state
4. Background both tabs for 1 minute
5. Return to Tab 1

**Expected Result:**
- Both tabs remain logged in
- No unexpected logouts

---

### Test 5: Slow Network
**Purpose:** Ensure slow network doesn't cause logout

**Steps:**
1. Sign in to the app
2. Open DevTools → Network tab
3. Set throttling to "Slow 3G"
4. Switch to another tab for 30 seconds
5. Return to the app tab

**Expected Result:**
- Session preserved
- May see retry attempts in console
- No logout

**Console Check:**
```javascript
getRecentEvents(10)
// May see multiple validation attempts with retries
```

---

### Test 6: Feature Flag Toggle
**Purpose:** Verify feature flags work correctly

**Steps:**
1. Sign in to the app
2. Disable fixes:
   ```javascript
   localStorage.setItem('ff_tabSwitchingFixes', 'false')
   ```
3. Refresh the page
4. Test rapid tab switching - may see more aggressive validation
5. Re-enable:
   ```javascript
   localStorage.setItem('ff_tabSwitchingFixes', 'true')
   ```
6. Refresh and test again

**Expected Result:**
- Feature flag toggle affects behavior
- When disabled, may see more validation events

---

### Test 7: Actual Session Expiration
**Purpose:** Ensure real session expiration still works

**Steps:**
1. Sign in to the app
2. Open DevTools → Application → Local Storage
3. Find `sb-htsvjfrofcpkfzvjpwvx-auth-token`
4. Modify the token (add random characters)
5. Switch to another tab and back

**Expected Result:**
- User is logged out
- Redirected to login page
- Console shows: `[Auth] Session expired, clearing session`

---

## Automated Test Script

Paste this in console to run basic checks:

```javascript
async function runAuthTests() {
  console.group('🔍 Auth System Tests')
  
  // Test 1: Feature flags
  const flags = getAllFlags()
  const allEnabled = Object.values(flags).every(f => f.enabled)
  console.log(allEnabled ? '✅ All feature flags enabled' : '⚠️ Some flags disabled', flags)
  
  // Test 2: Session health
  const health = isSessionHealthy()
  console.log(health.healthy ? '✅ Session healthy' : '❌ Session concerns:', health.concerns)
  
  // Test 3: Metrics
  const metrics = getSessionMetrics()
  console.log('📊 Metrics:', metrics)
  
  // Test 4: Network status
  console.log(navigator.onLine ? '✅ Online' : '⚠️ Offline')
  
  // Test 5: Visibility state
  console.log('📱 Visibility:', document.visibilityState)
  
  console.groupEnd()
  
  return { flags, health, metrics }
}

runAuthTests()
```

## Regression Tests

### Test Login Flow
1. Sign out
2. Sign in with valid credentials
3. Verify dashboard loads
4. Verify user data loads

### Test Logout Flow
1. Click sign out
2. Verify redirect to login
3. Verify localStorage cleared

### Test Token Refresh
1. Stay logged in for > 1 hour
2. Verify session refreshed automatically
3. Check console for `token_refresh` events

## Browser-Specific Tests

### Chrome
- Test with "Memory Saver" enabled
- Test with "Performance" mode

### Safari
- Test with Intelligent Tracking Prevention
- Test with Private Browsing

### Firefox
- Test with Enhanced Tracking Protection
- Test with containers

### Mobile Chrome/Safari
- Test app backgrounding
- Test with low power mode
- Test with data saver

## Debugging Issues

### Issue: User still being logged out unexpectedly

**Check:**
1. Run `reportAuthHealth()`
2. Look for:
   - High `authErrors` count
   - `Multiple authentication errors` in concerns
3. Check if actual 401 errors:
   ```javascript
   getRecentEvents(20).filter(e => e.error?.includes('401'))
   ```

**Possible Causes:**
- Token actually expired (expected behavior)
- Supabase session configuration too short
- Clock skew between client and server

### Issue: Too many network errors

**Check:**
1. Verify internet connection
2. Check if API endpoint accessible:
   ```javascript
   fetch(`${env.VITE_SUPABASE_URL}/auth/v1/user`, {
     headers: { 'Authorization': `Bearer ${session.access_token}` }
   })
   ```
3. Check CORS headers

### Issue: Feature flags not working

**Check:**
1. Verify localStorage access:
   ```javascript
   localStorage.setItem('test', '1')
   localStorage.getItem('test')
   ```
2. Check feature flag system:
   ```javascript
   isEnabled('tabSwitchingFixes')
   ```
3. Clear and reset:
   ```javascript
   localStorage.removeItem('ff_tabSwitchingFixes')
   ```

## Performance Profiling

### Check for Memory Leaks
1. Open DevTools → Memory tab
2. Take heap snapshot
3. Perform tab switching 20 times
4. Take another heap snapshot
5. Compare - should see minimal increase

### Check for Excessive Re-renders
1. Open DevTools → React DevTools Profiler
2. Record while switching tabs
3. Check that AuthProvider doesn't re-render excessively

## Load Testing

### Simulate Many Tab Switches
```javascript
// Simulate rapid tab visibility changes
let count = 0
const interval = setInterval(() => {
  // Dispatch visibility change event
  Object.defineProperty(document, 'visibilityState', {
    value: count % 2 === 0 ? 'hidden' : 'visible',
    writable: true
  })
  document.dispatchEvent(new Event('visibilitychange'))
  count++
  if (count > 20) clearInterval(interval)
}, 100)
```

**Check:** System should remain stable, no memory leaks.

## Success Criteria

All tests pass when:
- [ ] No unexpected logouts during tab switching
- [ ] No unexpected logouts during offline/online transitions
- [ ] Session shared correctly across tabs
- [ ] Feature flags work as expected
- [ ] Session still expires correctly when token invalid
- [ ] No console errors (except expected warnings)
- [ ] Memory usage stable over time
- [ ] No excessive re-renders

## Sign-off

| Tester | Date | Result | Notes |
|--------|------|--------|-------|
|        |      | ⬜ PASS / ⬜ FAIL |       |
|        |      | ⬜ PASS / ⬜ FAIL |       |
|        |      | ⬜ PASS / ⬜ FAIL |       |

Ready for production when:
- 3 testers have signed off with PASS
- No critical issues found
- Feature flags tested and working
