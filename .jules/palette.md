## 2025-05-15 - Tooltip Accessibility for Icon-only Buttons
**Learning:** Icon-only interactive elements (like sidebar toggles and notification bells) require both an `aria-label` for screen readers and a `Tooltip` for visual clarity to ensure universal accessibility. Using the `asChild` prop on `TooltipTrigger` is essential to avoid invalid semantic HTML (nested buttons) when wrapping existing `Button` components.
**Action:** Always wrap icon-only buttons with a `Tooltip` using `TooltipTrigger asChild` and ensure a corresponding `aria-label` is present.

## 2025-05-15 - Global Tooltip Provider Integration
**Learning:** The `TooltipProvider` was missing from the global application context, requiring local wrapping in every component using tooltips.
**Action:** Integrated `TooltipProvider` globally in `src/App.tsx` wrapping the `RouterProvider` to enable seamless tooltip usage across the entire platform.
