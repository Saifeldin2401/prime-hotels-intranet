# Mobile Optimization - Integration Guide

## Overview

This guide shows how to integrate the mobile-optimized components into the existing PHG Connect application.

---

## 📁 File Structure

```
src/
├── components/
│   ├── auth/
│   │   └── MobileLogin.tsx          # Mobile login page
│   ├── dashboard/
│   │   ├── MobileDashboard.tsx      # Mobile dashboard
│   │   └── MobileStatsGrid.tsx      # Stats grid component
│   ├── knowledge/
│   │   └── MobileKnowledgeViewer.tsx # KB article viewer
│   ├── layout/
│   │   └── MobileHeader.tsx         # Mobile header
│   ├── mobile/                      # Core mobile components
│   │   ├── ActionSheet.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── MobileConfirmDialog.tsx
│   │   ├── MobileDataCard.tsx
│   │   ├── MobileForm.tsx
│   │   ├── MobileTable.tsx
│   │   ├── PullToRefresh.tsx
│   │   └── SwipeableItem.tsx
│   ├── profile/
│   │   └── MobileProfile.tsx        # Mobile profile
│   └── training/
│       ├── MobileQuizPlayer.tsx     # Mobile quiz
│       ├── MobileTrainingPlayer.tsx # Mobile training
│       └── MobileVideoPlayer.tsx    # Mobile video
├── hooks/
│   └── useMediaQuery.ts             # Responsive hooks
├── layouts/
│   └── MobileLayout.tsx             # Mobile layout wrapper
└── styles/
    └── mobile-optimizations.css     # Mobile CSS utilities
```

---

## 🔌 Integration Steps

### Step 1: Update Main Entry Points

#### Update `src/App.tsx` or Main Router

```tsx
import { useIsMobile } from '@/hooks/useMediaQuery'
import { MobileLayout } from '@/layouts/MobileLayout'
import { AppLayout } from '@/components/layout/AppLayout'

function App() {
  const isMobile = useIsMobile()
  
  return (
    <Router>
      <Routes>
        <Route
          path="/*"
          element={
            isMobile ? (
              <MobileLayout>
                <MobileRoutes />
              </MobileLayout>
            ) : (
              <AppLayout>
                <DesktopRoutes />
              </AppLayout>
            )
          }
        />
      </Routes>
    </Router>
  )
}
```

### Step 2: Create Mobile Route Components

#### `src/routes/MobileRoutes.tsx`

```tsx
import { Routes, Route } from 'react-router-dom'

// Mobile pages
import { MobileLogin } from '@/components/auth/MobileLogin'
import { MobileDashboard } from '@/components/dashboard/MobileDashboard'
import { MobileProfile } from '@/components/profile/MobileProfile'
import { MobileTrainingPlayer } from '@/components/training/MobileTrainingPlayer'
import { MobileKnowledgeViewer } from '@/components/knowledge/MobileKnowledgeViewer'

export function MobileRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<MobileLogin />} />
      
      {/* Dashboard */}
      <Route path="/" element={<MobileDashboard />} />
      <Route path="/dashboard" element={<MobileDashboard />} />
      
      {/* Profile */}
      <Route path="/profile" element={<MobileProfile />} />
      
      {/* Training */}
      <Route path="/training/play/:id" element={<MobileTrainingPlayer />} />
      
      {/* Knowledge */}
      <Route path="/knowledge/:id" element={<MobileKnowledgeViewer />} />
      
      {/* Fallback to desktop routes for unoptimized pages */}
      <Route path="*" element={<DesktopRoutes />} />
    </Routes>
  )
}
```

### Step 3: Conditional Rendering in Existing Pages

For pages that should use mobile components when on mobile:

```tsx
import { useIsMobile } from '@/hooks/useMediaQuery'
import { MobileTrainingPlayer } from '@/components/training/MobileTrainingPlayer'
import { TrainingPlayer } from '@/pages/training/TrainingPlayer'

export function TrainingPlayerPage() {
  const isMobile = useIsMobile()
  const { id } = useParams()
  
  if (isMobile) {
    return <MobileTrainingPlayer moduleId={id} />
  }
  
  return <TrainingPlayer />
}
```

### Step 4: Update Layout Components

#### `src/components/layout/AppLayout.tsx`

```tsx
import { useIsMobile } from '@/hooks/useMediaQuery'
import { MobileLayout } from '@/layouts/MobileLayout'

export function AppLayout({ children }) {
  const isMobile = useIsMobile()
  
  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>
  }
  
  return (
    <div className="desktop-layout">
      <Sidebar />
      <main>{children}</main>
    </div>
  )
}
```

---

## 🎨 CSS Integration

### Import Mobile CSS

In `src/index.css`:

```css
/* Import mobile optimizations */
@import './styles/mobile-optimizations.css';

/* Your existing styles */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Use Mobile Utilities in Components

```tsx
// Touch-friendly button
<button className="touch-target min-h-[44px]">
  Click me
</button>

// Safe area padding
<div className="safe-area-bottom pb-safe">
  Content
</div>

// Mobile-only visibility
<div className="md:hidden">
  Mobile content
</div>

// Desktop-only
<div className="hidden md:block">
  Desktop content
</div>
```

---

## 🧩 Component Usage Examples

### Mobile Form

```tsx
import { MobileForm, MobileFormField, MobileFormInput, MobileFormActions } from '@/components/mobile'

function MyForm() {
  return (
    <MobileForm onSubmit={handleSubmit}>
      <MobileFormSection title="Personal Info">
        <MobileFormInput
          label="Full Name"
          required
          error={errors.name?.message}
          {...register('name')}
        />
        <MobileFormInput
          label="Email"
          type="email"
          required
          {...register('email')}
        />
      </MobileFormSection>
      
      <MobileFormActions sticky>
        <Button type="button" variant="outline">Cancel</Button>
        <Button type="submit">Save</Button>
      </MobileFormActions>
    </MobileForm>
  )
}
```

### Mobile Data Table

```tsx
import { MobileDataCard } from '@/components/mobile'

function UserList() {
  return (
    <MobileDataCard
      items={users}
      keyExtractor={(user) => user.id}
      fields={[
        { key: 'name', label: 'Name', render: (u) => u.name, isPrimary: true },
        { key: 'email', label: 'Email', render: (u) => u.email, isSecondary: true },
        { key: 'role', label: 'Role', render: (u) => u.role },
      ]}
      onCardClick={(user) => navigate(`/users/${user.id}`)}
    />
  )
}
```

### Mobile Video

```tsx
import { MobileVideoPlayer } from '@/components/mobile'

function VideoBlock() {
  return (
    <MobileVideoPlayer
      src="/video.mp4"
      poster="/poster.jpg"
      title="Training Video"
      onProgress={(p) => console.log(`${p}% watched`)}
      onComplete={() => markComplete()}
      isMandatory
    />
  )
}
```

---

## 📱 Responsive Breakpoints

| Name | Width | Usage |
|------|-------|-------|
| xs | < 640px | Mobile phones |
| sm | ≥ 640px | Large phones |
| md | ≥ 768px | Tablets |
| lg | ≥ 1024px | Small laptops |
| xl | ≥ 1280px | Desktops |
| 2xl | ≥ 1536px | Large screens |

---

## 🔄 Migration Strategy

### Phase 1: Core Components (Week 1)
- [ ] Install mobile components
- [ ] Update CSS imports
- [ ] Add useMediaQuery hook
- [ ] Test on mobile devices

### Phase 2: Critical Pages (Week 2)
- [ ] Login page
- [ ] Dashboard
- [ ] Profile
- [ ] Training player

### Phase 3: Secondary Pages (Week 3)
- [ ] Knowledge base
- [ ] HR modules
- [ ] Document library
- [ ] Settings

### Phase 4: Polish (Week 4)
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] User testing
- [ ] Documentation

---

## 🐛 Common Integration Issues

### Issue: Mobile components not showing

**Cause:** useMediaQuery not detecting mobile

**Solution:**
```tsx
// Add initial check
const [isMobile, setIsMobile] = useState(false)

useEffect(() => {
  const check = () => setIsMobile(window.innerWidth < 768)
  check()
  window.addEventListener('resize', check)
  return () => window.removeEventListener('resize', check)
}, [])
```

### Issue: Swipe gestures not working

**Cause:** CSS touch-action preventing gestures

**Solution:**
```css
.swipe-container {
  touch-action: pan-y pinch-zoom;
}
```

### Issue: Bottom nav covers content

**Cause:** Missing padding for safe area

**Solution:**
```tsx
<main className="pb-24 pb-safe">
  {/* Content */}
</main>
```

### Issue: Font size zoom on iOS

**Cause:** Input font size < 16px

**Solution:**
```css
input, select, textarea {
  font-size: 16px;
}
```

---

## ✅ Testing Checklist

### Visual Testing
- [ ] All pages render correctly on mobile
- [ ] No horizontal scrolling
- [ ] Touch targets are large enough
- [ ] Text is readable without zooming
- [ ] Images scale properly

### Functional Testing
- [ ] All buttons are tappable
- [ ] Forms can be submitted
- [ ] Navigation works
- [ ] Swipe gestures function
- [ ] Pull-to-refresh works

### Performance Testing
- [ ] Pages load in < 3 seconds
- [ ] Animations are smooth (60fps)
- [ ] No memory leaks
- [ ] Video plays smoothly

---

## 📚 Additional Resources

- [Mobile Optimization Guide](./MOBILE_OPTIMIZATION_GUIDE.md)
- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Training & KB Guide](./MOBILE_TRAINING_KB_GUIDE.md)

---

## 🆘 Support

For questions or issues:
1. Check this guide
2. Review component documentation
3. Check existing implementations
4. Contact the frontend team

---

**Version:** 1.0.0  
**Last Updated:** 2026-03-31
