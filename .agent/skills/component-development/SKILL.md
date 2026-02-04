---
name: Component Development
description: Guidelines for creating React components in PRIME Hotels Intranet following shadcn/ui patterns
---

# Component Development Skill

## Overview
This skill provides comprehensive guidelines for developing React components in the PRIME Hotels Intranet application.

## Technology Stack
- **React 18+** with TypeScript
- **shadcn/ui** for UI primitives (located in `src/components/ui/`)
- **TailwindCSS** for styling
- **Framer Motion** for animations
- **React Query** for data fetching

## Directory Structure

```
src/components/
├── ui/                    # shadcn/ui primitives (DO NOT MODIFY directly)
├── common/                # Shared components (Breadcrumbs, LoadingState, etc.)
├── shared/                # Reusable business components (StatusBadge, RoleBadge, etc.)
├── layout/                # Layout components (AppLayout, Sidebar, Header, etc.)
├── forms/                 # Form-related components
├── {feature}/             # Feature-specific components (knowledge, training, tasks, etc.)
└── ErrorBoundary.tsx      # Global error boundary
```

## Component Creation Rules

### 1. File Naming
- Use **PascalCase** for component files: `MyComponent.tsx`
- Use **index.ts** for barrel exports in feature folders
- Avoid generic names; be specific (e.g., `KnowledgeArticleCard.tsx` not `Card.tsx`)

### 2. Component Structure Template

```tsx
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
// Import UI components from shadcn
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface MyComponentProps {
  /** Required: The main data to display */
  data: SomeType;
  /** Optional: Additional class names */
  className?: string;
  /** Optional: Callback when action is triggered */
  onAction?: (id: string) => void;
}

export function MyComponent({ data, className, onAction }: MyComponentProps) {
  const { t } = useTranslation('namespace');
  
  // Hooks must be called unconditionally (before any returns)
  const [state, setState] = useState<StateType>(initialValue);
  
  // Early returns AFTER all hooks
  if (!data) {
    return <EmptyState message={t('empty.message')} />;
  }

  return (
    <Card className={cn('default-classes', className)}>
      <CardHeader>
        <CardTitle>{t('component.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Component content */}
      </CardContent>
    </Card>
  );
}
```

### 3. TypeScript Requirements
- **Always define interfaces** for props
- **Never use `any`** type
- Export types from `src/lib/types.ts` for reusability
- Use proper generics where applicable

### 4. Translation Requirements
- **All user-facing text MUST use translations**
- Use the `useTranslation` hook with appropriate namespace
- Translation keys must exist in both `en` and `ar` JSON files

```tsx
// ✅ Correct
const { t } = useTranslation('knowledge');
<h1>{t('articles.title')}</h1>

// ❌ Wrong - Never hardcode English text
<h1>Knowledge Base Articles</h1>
```

### 5. RTL Support
- Use logical properties for spacing: `ms-4` instead of `ml-4`, `me-4` instead of `mr-4`
- Use `start`/`end` instead of `left`/`right` for positioning
- Test all layouts in Arabic mode

```tsx
// ✅ Correct - RTL-aware
<div className="ms-4 ps-2 text-start">

// ❌ Wrong - Not RTL-aware
<div className="ml-4 pl-2 text-left">
```

### 6. Loading and Error States
Every component that fetches data must handle:
- **Loading state**: Use `LoadingSkeleton` or shimmer effects
- **Error state**: Use `ErrorState` component with retry option
- **Empty state**: Use `EmptyState` component with helpful message

```tsx
if (isLoading) return <LoadingSkeleton />;
if (error) return <ErrorState error={error} onRetry={refetch} />;
if (!data?.length) return <EmptyState message={t('empty.noItems')} />;
```

### 7. Animations
Use Framer Motion for animations. Import from `@/lib/motion` for preset configurations:

```tsx
import { motion } from 'framer-motion';
import { fadeIn, staggerContainer } from '@/lib/motion';

<motion.div
  variants={fadeIn}
  initial="hidden"
  animate="visible"
>
  {/* Animated content */}
</motion.div>
```

## shadcn/ui Components Available

### Core Components (in `src/components/ui/`)
- `button.tsx` - Buttons with variants
- `card.tsx` - Card containers
- `dialog.tsx` - Modal dialogs
- `dropdown-menu.tsx` - Dropdown menus
- `form.tsx` - Form components with react-hook-form
- `input.tsx` - Text inputs
- `select.tsx` - Select dropdowns
- `table.tsx` - Data tables
- `tabs.tsx` - Tab navigation
- `toast.tsx` - Toast notifications
- `badge.tsx` - Status badges
- And many more...

### Enhanced Components
- `enhanced-button.tsx` - Button with loading state
- `enhanced-card.tsx` - Card with hover effects
- `enhanced-input.tsx` - Input with validation feedback
- `enhanced-toast.tsx` - Rich toast notifications
- `micro-interactions.tsx` - Subtle animation components

## Common Patterns

### Data Fetching with React Query
```tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

function MyComponent() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-data', filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table_name')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });
}
```

### Form Handling
```tsx
import { useForm } from '@/hooks/useForm';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';

function MyForm() {
  const form = useForm({
    defaultValues: { name: '', email: '' },
    onSubmit: async (values) => {
      // Handle submission
    }
  });
}
```

## Checklist Before Committing

- [ ] All props have TypeScript types
- [ ] All text uses translations (en + ar)
- [ ] RTL layout works correctly
- [ ] Loading/error/empty states implemented
- [ ] Component is responsive (mobile-first)
- [ ] Dark mode works correctly
- [ ] No console errors or warnings
- [ ] Accessibility: proper labels, keyboard navigation
