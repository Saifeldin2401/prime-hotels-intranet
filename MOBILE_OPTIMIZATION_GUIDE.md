# PHG Connect Mobile Optimization Guide

## Overview

This guide documents the comprehensive mobile-first optimization implemented for PHG Connect. The optimizations ensure seamless mobile usability while maintaining all existing functionality.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Mobile-First Architecture](#mobile-first-architecture)
3. [Components](#components)
4. [Responsive Patterns](#responsive-patterns)
5. [Performance](#performance)
6. [Testing](#testing)

---

## Quick Start

### Using Mobile Components

```tsx
import { 
  MobileDataCard, 
  MobileTable, 
  MobileForm,
  MobileFormInput,
  MobileFormSection 
} from '@/components/mobile'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { MobileStatsGrid } from '@/components/dashboard/MobileStatsGrid'
```

### Using Responsive Hooks

```tsx
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/useMediaQuery'

function MyComponent() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  
  return (
    <div>
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  )
}
```

---

## Mobile-First Architecture

### CSS Foundation

The mobile optimizations are built on a CSS foundation (`src/styles/mobile-optimizations.css`) that provides:

- **Safe Area Support**: Automatic padding for notched devices
- **Touch Targets**: Minimum 44px touch targets everywhere
- **Fluid Typography**: Responsive font sizing
- **Mobile Utilities**: Helper classes for mobile layouts

### Layout System

```
src/
├── components/
│   ├── layout/
│   │   ├── MobileHeader.tsx      # Sticky mobile header
│   │   ├── MobileLayout.tsx      # Mobile layout wrapper
│   │   └── MobileNavigation.tsx  # Bottom navigation bar
│   └── mobile/
│       ├── MobileDataCard.tsx    # Card-based data display
│       ├── MobileForm.tsx        # Mobile-optimized forms
│       ├── MobileTable.tsx       # Responsive table/cards
│       └── ...
├── hooks/
│   └── useMediaQuery.ts          # Responsive detection hooks
└── styles/
    └── mobile-optimizations.css  # Mobile-first CSS
```

---

## Components

### 1. MobileHeader

Sticky header optimized for mobile with back navigation and action buttons.

```tsx
<MobileHeader
  title="User Profile"
  subtitle="Edit your information"
  showBack
  actions={<Button>Save</Button>}
/>
```

**Features:**
- Automatic back button (shows when not on home)
- Title truncation for long titles
- Safe area support for notched devices
- Loading skeleton state

### 2. MobileDataCard

Displays tabular data as cards on mobile, table on desktop.

```tsx
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
```

**Features:**
- Automatic card layout on mobile
- Primary/secondary field highlighting
- Action buttons support
- Badge support
- Loading skeletons

### 3. MobileTable

Powerful table component that switches to cards on mobile.

```tsx
<MobileTable
  data={data}
  columns={columns}
  onRowClick={handleRowClick}
  cardConfig={{
    primaryField: 'name',
    secondaryField: 'email',
    detailFields: ['role', 'department'],
    showChevron: true,
  }}
/>
```

**Features:**
- TanStack Table integration
- Sorting support
- Pagination
- Card view on mobile
- Row click handling

### 4. MobileForm

Mobile-optimized form layout with sections and sticky actions.

```tsx
<MobileForm onSubmit={handleSubmit} isSubmitting={isSubmitting}>
  <MobileFormSection title="Personal Info" collapsible>
    <MobileFormField label="Name" error={errors.name}>
      <Input {...register('name')} />
    </MobileFormField>
  </MobileFormSection>
  
  <MobileFormActions sticky>
    <Button type="submit">Save</Button>
  </MobileFormActions>
</MobileForm>
```

**Features:**
- Single-column layout
- Collapsible sections
- Sticky action buttons
- 16px font size (prevents iOS zoom)
- Touch-friendly inputs

### 5. MobileStatsGrid

Horizontal scrolling stats for mobile dashboards.

```tsx
<MobileStatsGrid
  variant="scroll"
  stats={[
    { 
      label: 'Revenue', 
      value: '$12.5k', 
      icon: DollarSign,
      trend: 'up',
      trendValue: '+12%'
    },
    // ...
  ]}
/>
```

**Variants:**
- `scroll`: Horizontal scroll
- `grid`: 2-column grid
- `compact`: Smaller cards

---

## Responsive Patterns

### Breakpoints

| Name | Value | Usage |
|------|-------|-------|
| xs | < 640px | Mobile phones |
| sm | ≥ 640px | Large phones |
| md | ≥ 768px | Tablets |
| lg | ≥ 1024px | Small laptops |
| xl | ≥ 1280px | Desktops |
| 2xl | ≥ 1536px | Large screens |

### Common Patterns

#### 1. Hide/Show Pattern

```tsx
// Show only on mobile
<div className="md:hidden">Mobile content</div>

// Show only on desktop
<div className="hidden md:block">Desktop content</div>
```

#### 2. Stack/Grid Pattern

```tsx
// Stack on mobile, grid on desktop
<div className="flex flex-col md:grid md:grid-cols-3 gap-4">
  {/* Content */}
</div>
```

#### 3. Touch Target Pattern

```tsx
// Ensure minimum touch target
<button className="min-h-[44px] min-w-[44px] p-3">
  Click me
</button>
```

#### 4. Safe Area Pattern

```tsx
// Add safe area padding for notched devices
<div className="pb-safe pt-safe">
  {/* Content */}
</div>
```

---

## Performance

### Mobile Optimizations Applied

1. **CSS Optimizations:**
   - `content-visibility: auto` for off-screen content
   - Hardware acceleration for animations
   - Reduced motion support

2. **Component Optimizations:**
   - Lazy loading of deferred components
   - Skeleton loading states
   - Virtual scrolling for long lists

3. **Image Optimizations:**
   - Lazy loading
   - Responsive images
   - WebP format where supported

### Best Practices

```tsx
// Use hardware acceleration for animations
<div className="gpu-accelerated animate-fade-in">

// Respect reduced motion preference
<div className={cn(
  "transition-transform",
  !prefersReducedMotion && "duration-300"
)}>

// Content visibility for performance
<div className="content-visibility-auto">
```

---

## Testing

### Device Testing Checklist

- [ ] iPhone SE (320px width)
- [ ] iPhone 12/13/14 (390px width)
- [ ] iPhone Pro Max (428px width)
- [ ] Android small (360px width)
- [ ] Android medium (400px width)
- [ ] Android large (480px width)
- [ ] iPad/tablet (768px+ width)

### Functional Testing

- [ ] Touch targets are 44px minimum
- [ ] No horizontal scrolling
- [ ] Safe areas work on notched devices
- [ ] Font size prevents iOS zoom
- [ ] Pull-to-refresh works
- [ ] Bottom nav doesn't obscure content
- [ ] Back navigation works correctly

### Performance Testing

- [ ] First Contentful Paint < 1.8s
- [ ] Time to Interactive < 3.8s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Smooth scrolling at 60fps

---

## Migration Guide

### Converting Existing Pages

#### Before (Desktop-First)

```tsx
export function UserList() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Users</h1>
      <table className="w-full">
        {/* Table content */}
      </table>
    </div>
  )
}
```

#### After (Mobile-First)

```tsx
import { MobileHeader } from '@/components/layout/MobileHeader'
import { MobileTable } from '@/components/mobile'

export function UserList() {
  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Users" showBack />
      
      <main className="p-4">
        <MobileTable
          data={users}
          columns={columns}
          cardConfig={{
            primaryField: 'name',
            secondaryField: 'email',
          }}
        />
      </main>
    </div>
  )
}
```

---

## CSS Utility Reference

### Touch Targets

| Class | Size |
|-------|------|
| `touch-target` | 44px × 44px |
| `touch-target-lg` | 48px × 48px |

### Safe Areas

| Class | Description |
|-------|-------------|
| `safe-area-top` | Top safe area padding |
| `safe-area-bottom` | Bottom safe area padding |
| `safe-area-x` | Left/right safe area padding |
| `has-bottom-nav` | Content padding for bottom nav |

### Text Truncation

| Class | Lines |
|-------|-------|
| `text-truncate-1` | 1 line |
| `text-truncate-2` | 2 lines |
| `text-truncate-3` | 3 lines |

### Scroll Behavior

| Class | Description |
|-------|-------------|
| `scroll-x-mobile` | Horizontal scroll with touch |
| `scroll-y-mobile` | Vertical scroll with momentum |
| `scrollbar-hide` | Hidden scrollbar |

### Performance

| Class | Description |
|-------|-------------|
| `gpu-accelerated` | GPU layer promotion |
| `content-visibility-auto` | Lazy render off-screen |
| `will-change-transform` | Optimize for transforms |

---

## Troubleshooting

### Common Issues

#### 1. iOS Zoom on Input Focus

**Problem:** iOS zooms in when focusing inputs

**Solution:** Use 16px font size minimum

```css
input, textarea, select {
  font-size: 16px;
}
```

#### 2. Bottom Nav Obscuring Content

**Problem:** Bottom nav covers content

**Solution:** Add `has-bottom-nav` class to main content

```tsx
<main className="has-bottom-nav">
```

#### 3. Horizontal Scrolling

**Problem:** Horizontal scroll appears

**Solution:** Check for fixed-width elements and use `no-horizontal-scroll`

```tsx
<div className="no-horizontal-scroll">
```

#### 4. Touch Targets Too Small

**Problem:** Buttons hard to tap

**Solution:** Use `touch-target` class

```tsx
<button className="touch-target">
```

---

## Browser Support

| Browser | Support |
|---------|---------|
| iOS Safari | ✅ Full |
| Chrome Android | ✅ Full |
| Samsung Internet | ✅ Full |
| Firefox Mobile | ✅ Full |
| Chrome Desktop | ✅ Full |
| Safari Desktop | ✅ Full |
| Edge | ✅ Full |

---

## Changelog

### v1.0.0 - Mobile Optimization Release

- Added mobile-first CSS foundation
- Created MobileHeader component
- Enhanced MobileNavigation with FAB
- Added MobileDataCard component
- Added MobileTable component
- Added MobileForm components
- Added MobileStatsGrid component
- Added useMediaQuery hooks
- Implemented safe area support
- Added touch target utilities

---

## Support

For questions or issues with mobile optimization:

1. Check this guide first
2. Review component stories in Storybook
3. Check the mobile test pages
4. Contact the frontend team
