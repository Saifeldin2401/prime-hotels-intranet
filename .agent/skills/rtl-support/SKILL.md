---
name: RTL Support
description: Guidelines for Right-to-Left layout support for Arabic
---

# RTL Support Skill

## Overview
PRIME Hotels supports Arabic (RTL) and English (LTR) layouts.

## Automatic Handling
Direction changes automatically on language switch in `src/i18n/i18n.ts`.

## CSS Classes (TailwindCSS)

### Use Logical Properties
```css
/* ✅ RTL-aware */
ms-4    /* margin-start (RTL: right, LTR: left) */
me-4    /* margin-end */
ps-4    /* padding-start */
pe-4    /* padding-end */
start-0 /* left in LTR, right in RTL */
end-0   /* right in LTR, left in RTL */
text-start
text-end

/* ❌ Not RTL-aware */
ml-4, mr-4, pl-4, pr-4
left-0, right-0
text-left, text-right
```

## Hook
```typescript
import { useRTL } from '@/hooks/useRTL';

const { isRTL, direction } = useRTL();

// direction: 'rtl' | 'ltr'
```

## RTL CSS File
Additional RTL overrides in `src/rtl.css`.

## Icon Mirroring
Some icons need mirroring in RTL:
- Arrow icons
- Chevron icons
- Navigation icons

```tsx
<ChevronRight className={cn(isRTL && 'rotate-180')} />
```

## Testing
1. Switch to Arabic in settings
2. Verify layout mirrors correctly
3. Check text alignment
4. Verify icon directions
5. Test form inputs
