# PHG Connect Tab Switching Fixes - Deployment Checklist

## Pre-Deployment Verification

### Code Quality
- [x] TypeScript compilation passes (`npx tsc --noEmit`)
- [x] No ESLint errors in modified files
- [x] All imports resolved
- [x] No console.log statements in production paths (only dev)

### Files Created (7 files)
```
src/lib/authErrorUtils.ts        ✅
src/lib/featureFlags.ts          ✅
src/lib/authMonitor.ts           ✅
docs/TAB_SWITCHING_ISSUE_ANALYSIS.md    ✅
docs/PRODUCTION_READINESS.md           ✅
docs/TAB_SWITCHING_TESTING.md          ✅
docs/TAB_SWITCHING_PRODUCTION_COMPLETE.md  ✅
docs/DEPLOYMENT_CHECKLIST.md          ✅ (this file)
```

### Files Modified (3 files)
```
src/contexts/AuthContext.tsx     ✅ Major refactor with error handling
src/App.tsx                      ✅ Feature flag integration
src/lib/supabase.ts              ✅ Storage mode change
```

---

## Environment Configuration

### Required Environment Variables
```env
# Existing (should already be set)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_APP_URL=...

# New (optional, for feature flags)
# None required - flags use sessionStorage
```

### Feature Flag Defaults
```typescript
// All flags enabled by default
tabSwitchingFixes: { enabled: true, rolloutPercent: 100 }
smartSessionValidation: { enabled: true, rolloutPercent: 100 }
networkAwareLogout: { enabled: true, rolloutPercent: 100 }
debouncedFocusManager: { enabled: true, rolloutPercent: 100 }
```

---

## Deployment Steps

### Step 1: Pre-Deploy (Day -1)
- [ ] Create release branch
- [ ] Run full test suite
- [ ] Verify feature flags in staging
- [ ] Prepare rollback plan
- [ ] Notify team of deployment

### Step 2: Deploy to Staging
```bash
git checkout -b release/tab-switching-fixes
git push origin release/tab-switching-fixes
# Deploy to staging environment
```

- [ ] Deploy to staging
- [ ] Verify all feature flags work
- [ ] Run manual test scenarios
- [ ] Check monitoring dashboards

### Step 3: Gradual Production Rollout

#### Phase 1: 0% (Monitor Only)
```typescript
// featureFlags.ts - Keep at 0%
tabSwitchingFixes: { enabled: true, rolloutPercent: 0 }
```
- [ ] Deploy with 0% rollout
- [ ] Verify no errors in production
- [ ] Check baseline metrics

#### Phase 2: 10% Rollout
```typescript
tabSwitchingFixes: { enabled: true, rolloutPercent: 10 }
```
- [ ] Update rollout to 10%
- [ ] Monitor for 24 hours
- [ ] Check error rates
- [ ] Check user feedback

#### Phase 3: 50% Rollout
```typescript
tabSwitchingFixes: { enabled: true, rolloutPercent: 50 }
```
- [ ] Update rollout to 50%
- [ ] Monitor for 24 hours
- [ ] Compare metrics to baseline

#### Phase 4: 100% Rollout
```typescript
tabSwitchingFixes: { enabled: true, rolloutPercent: 100 }
```
- [ ] Update rollout to 100%
- [ ] Monitor for 48 hours
- [ ] Document final metrics

---

## Monitoring During Rollout

### Metrics to Watch

| Metric | Baseline | Alert Threshold | Current |
|--------|----------|-----------------|---------|
| Session validation success | ?% | < 90% | - |
| Unexpected logouts/day | ? | > baseline + 10% | - |
| Network error rate | ?% | > 10% | - |
| Token refresh failures | ? | > 5% | - |
| User complaints | ?/day | > baseline + 50% | - |

### Console Commands for Monitoring
```javascript
// Get current health status
reportAuthHealth()

// Get session metrics
getSessionMetrics()

// Check recent events
getRecentEvents(20)

// Check all feature flags
getAllFlags()
```

---

## Rollback Criteria

### Immediate Rollback Required If:
- [ ] Login success rate drops > 5%
- [ ] Error spike in auth system
- [ ] User complaints increase > 100%
- [ ] Performance degradation detected

### Rollback Steps
1. **Via Feature Flags (Fast - 1 minute):**
   ```typescript
   tabSwitchingFixes: { enabled: false, rolloutPercent: 0 }
   ```
   Deploy config change

2. **Via Code Revert (If needed - 10 minutes):**
   ```bash
   git revert HEAD
   git push
   ```

3. **Clear Client Cache (If issues persist):**
   Users may need to clear localStorage

---

## Post-Deployment Verification

### Immediate (0-1 hour)
- [ ] App loads without errors
- [ ] Login works
- [ ] No console errors in production
- [ ] Feature flags accessible

### Short-term (1-24 hours)
- [ ] Session persistence working
- [ ] No spike in logout events
- [ ] Network errors handled gracefully
- [ ] User feedback positive

### Long-term (1-7 days)
- [ ] Decrease in auth-related support tickets
- [ ] Improved session persistence metrics
- [ ] No regression in other auth features
- [ ] Performance metrics stable

---

## Success Criteria

### Technical
- [ ] Session validation success rate > 95%
- [ ] No unexpected logouts during tab switching
- [ ] Network errors don't cause logout
- [ ] Feature flags work correctly

### User Experience
- [ ] Users can switch tabs without re-authenticating
- [ ] Mobile app backgrounding works correctly
- [ ] No flickering or re-rendering on tab switch
- [ ] Fast reconnection after offline period

### Business
- [ ] Support tickets for "unexpected logout" decrease by 50%
- [ ] User satisfaction scores maintain or improve
- [ ] No negative impact on conversion/login rates

---

## Communication Plan

### Internal
- [ ] Notify team before deployment
- [ ] Post in #deployments channel
- [ ] Update status page if needed

### External
- [ ] Prepare support team with FAQ
- [ ] Draft user communication if needed
- [ ] Monitor social/support channels

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA Lead | | | |
| Product Manager | | | |
| DevOps | | | |

---

## Post-Deployment Actions

### Week 1
- [ ] Daily monitoring of auth metrics
- [ ] Review user feedback
- [ ] Check support ticket trends
- [ ] Document any issues

### Week 2
- [ ] Compare metrics to baseline
- [ ] Calculate improvement percentages
- [ ] Write post-mortem/lessons learned
- [ ] Plan next improvements

### Month 1
- [ ] Final success metrics report
- [ ] Feature flag cleanup (remove old code path)
- [ ] Documentation updates
- [ ] Team knowledge sharing

---

## Appendix: Quick Reference

### Feature Flag Commands
```javascript
// Enable for testing
localStorage.setItem('ff_tabSwitchingFixes', 'true')

// Disable for testing
localStorage.setItem('ff_tabSwitchingFixes', 'false')

// Reset to default
localStorage.removeItem('ff_tabSwitchingFixes')

// Check status
getAllFlags()
```

### Debug Commands
```javascript
// Full health report
reportAuthHealth()

// Session metrics
getSessionMetrics()

// Recent events
getRecentEvents(10)

// Check online status
navigator.onLine

// Check visibility
document.visibilityState
```

### Emergency Contacts
- On-call Engineer: [TBD]
- Product Manager: [TBD]
- Support Lead: [TBD]

---

**Deployment Ready: ⬜ YES / ⬜ NO**

*Last updated: 2026-03-31*
