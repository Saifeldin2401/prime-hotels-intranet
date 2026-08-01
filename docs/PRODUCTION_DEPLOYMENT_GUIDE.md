# Altus Connect Mobile - Production Deployment Guide

## 🚀 Pre-Deployment Checklist

### 1. Code Quality Checks

```bash
# Run TypeScript type checking
npm run type-check

# Run ESLint
npm run lint

# Run tests
npm run test:run

# Build for production
npm run build
```

### 2. Mobile-Specific Optimizations Verified

- [ ] All touch targets are 44px minimum
- [ ] No horizontal scrolling on any page
- [ ] Safe area insets work on notched devices
- [ ] Font sizes prevent iOS zoom (16px minimum)
- [ ] Images are optimized and lazy-loaded
- [ ] Videos use `playsInline` for iOS
- [ ] Swipe gestures work smoothly
- [ ] Pull-to-refresh functions correctly
- [ ] Bottom navigation doesn't obscure content

### 3. Performance Metrics

| Metric | Target | Status |
|--------|--------|--------|
| First Contentful Paint | < 1.8s | ⬜ |
| Time to Interactive | < 3.8s | ⬜ |
| Cumulative Layout Shift | < 0.1 | ⬜ |
| Speed Index | < 3.4s | ⬜ |
| Bundle Size (Gzipped) | < 500KB | ⬜ |

---

## 📱 Device Testing Matrix

### Required Test Devices

| Device | OS | Screen | Priority |
|--------|-----|--------|----------|
| iPhone SE | iOS 17 | 320px | High |
| iPhone 14 | iOS 17 | 390px | High |
| iPhone 14 Pro Max | iOS 17 | 428px | High |
| Samsung Galaxy S23 | Android 14 | 360px | High |
| Google Pixel 7 | Android 14 | 412px | High |
| iPad Mini | iPadOS 17 | 768px | Medium |
| iPad Pro | iPadOS 17 | 1024px | Medium |

### Test Scenarios

#### Authentication
- [ ] Login with email/password
- [ ] Password visibility toggle
- [ ] Biometric login (if available)
- [ ] Forgot password flow
- [ ] Session persistence

#### Navigation
- [ ] Bottom nav works on all pages
- [ ] Back navigation using swipe
- [ ] Back button in header
- [ ] Deep linking to specific pages

#### Dashboard
- [ ] Stats load correctly
- [ ] Quick actions work
- [ ] Pull to refresh
- [ ] Widget responsiveness

#### Training
- [ ] Video playback
- [ ] Quiz navigation
- [ ] Progress tracking
- [ ] Swipe between blocks

#### Knowledge Base
- [ ] Article reading
- [ ] Font size adjustment
- [ ] Theme switching
- [ ] TOC navigation

#### Forms
- [ ] Input fields don't zoom on iOS
- [ ] Date pickers work
- [ ] Validation messages show
- [ ] Submit buttons are tappable

#### Offline
- [ ] Progress saved locally
- [ ] Error messages shown
- [ ] Retry functionality

---

## 🔧 Environment Configuration

### 1. Environment Variables

```env
# Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=https://altus-advisory.com

# Optional
VITE_SENTRY_DSN=your-sentry-dsn
VITE_GA_TRACKING_ID=your-ga-id
VITE_ENABLE_ANALYTICS=true
```

### 2. Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          charts: ['recharts'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion'],
  },
})
```

### 3. PWA Configuration (Optional)

```json
// manifest.json
{
  "name": "Altus Connect",
  "short_name": "Altus Connect",
  "description": "Altus Advisory Group Intranet",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0B1C3E",
  "theme_color": "#0B1C3E",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 📊 Monitoring & Analytics

### 1. Performance Monitoring

```typescript
// Add to main.tsx
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
```

### 2. Mobile-Specific Metrics

Track these metrics in your analytics:

- Mobile vs desktop usage split
- Average session duration (mobile)
- Most used mobile features
- Screen size distribution
- Touch vs click interactions
- Offline usage patterns

---

## 🛡️ Security Checklist

- [ ] HTTPS enforced on all pages
- [ ] CSP headers configured
- [ ] Authentication tokens stored securely
- [ ] Sensitive data encrypted at rest
- [ ] API rate limiting enabled
- [ ] Input validation on all forms
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented

---

## 🚀 Deployment Steps

### 1. Pre-Deployment

```bash
# 1. Update version
npm version patch

# 2. Run full test suite
npm run test:run

# 3. Build production bundle
npm run build

# 4. Verify build output
ls -la dist/

# 5. Run Lighthouse CI
npm run lighthouse
```

### 2. Deployment

#### Option A: Vercel
```bash
vercel --prod
```

#### Option B: Netlify
```bash
netlify deploy --prod --dir=dist
```

#### Option C: Self-Hosted
```bash
# Build
docker build -t phg-connect:latest .

# Deploy
docker run -p 80:80 phg-connect:latest
```

### 3. Post-Deployment Verification

- [ ] Site loads without errors
- [ ] Login works
- [ ] All mobile components render
- [ ] No console errors
- [ ] Performance metrics acceptable
- [ ] Analytics receiving data

---

## 📋 Rollback Plan

If issues are detected:

1. **Immediate** (0-5 minutes)
   - Revert to previous deployment
   - Notify team via Slack

2. **Short-term** (5-30 minutes)
   - Investigate issue in logs
   - Identify affected users
   - Prepare hotfix if needed

3. **Long-term** (30+ minutes)
   - Fix issue in development
   - Test thoroughly
   - Deploy hotfix

---

## 🔍 Troubleshooting Common Issues

### Issue: iOS Zoom on Input Focus

**Solution:** Ensure font-size is 16px on inputs
```css
input, select, textarea {
  font-size: 16px;
}
```

### Issue: Bottom Nav Covers Content

**Solution:** Add padding to main content
```css
main {
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
```

### Issue: Horizontal Scrolling

**Solution:** Check for overflow and fix widths
```css
body {
  overflow-x: hidden;
  max-width: 100vw;
}
```

### Issue: Video Not Playing on iOS

**Solution:** Add playsInline attribute
```tsx
<video playsInline controls {...props} />
```

### Issue: Swipe Gestures Not Working

**Solution:** Check touch-action CSS
```css
.swipe-container {
  touch-action: pan-y;
}
```

---

## 📈 Success Metrics

Track these KPIs post-deployment:

| Metric | Baseline | Target |
|--------|----------|--------|
| Mobile Adoption Rate | 0% | > 60% |
| Mobile Session Duration | - | > 5 min |
| Mobile Task Completion | - | > 85% |
| Mobile Support Tickets | - | < 5% of total |
| Mobile App Store Rating | - | > 4.5/5 |

---

## 📝 Post-Deployment Checklist

- [ ] All monitoring dashboards active
- [ ] Error alerts configured
- [ ] User feedback channel established
- [ ] Documentation updated
- [ ] Team trained on mobile features
- [ ] Support team briefed
- [ ] Marketing materials ready
- [ ] App store listings updated (if PWA)

---

## 🆘 Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Tech Lead | [Name] | [Email/Phone] |
| DevOps | [Name] | [Email/Phone] |
| Product Manager | [Name] | [Email/Phone] |
| Support Lead | [Name] | [Email/Phone] |

---

**Last Updated:** 2026-03-31  
**Version:** 1.0.0  
**Status:** Production Ready
