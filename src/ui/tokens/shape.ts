/**
 * Shape, depth, and motion rules.
 * - Radius: 6px (controls), 8px (panels), none on tables.
 * - Shadow: only on overlays (menus, dialogs, sheets).
 * - No gradients, no backdrop blur, no glass.
 * - Motion: 150-200 ms, opacity/translate only; honours reduced-motion.
 * - Touch targets >= 44 px; visible brass focus ring.
 */

export const shape = {
  radius: {
    control: 'rounded-[6px]',
    panel: 'rounded-[8px]',
    table: 'rounded-none',
  },
  shadow: {
    none: 'shadow-none',
    overlay: 'shadow-lg shadow-black/10 dark:shadow-black/40',
  },
  touchTarget: {
    minHeight: 'min-h-[44px]',
    minWidth: 'min-w-[44px]',
  },
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent dark:focus-visible:ring-ds-brass focus-visible:ring-offset-2',
  motion: {
    duration: 'duration-150',
    transition: 'transition-all duration-150 motion-reduce:transition-none',
  },
} as const
