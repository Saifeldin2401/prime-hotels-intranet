/**
 * Ratified shadow tokens for Altus Connect.
 * Reference: Section 12 of Technical UI/UX Design Implementation Specification.
 *
 * Default is strictly NO shadow. Elevation is reserved only for overlays:
 * dropdowns, dialogs, sheets, popovers.
 */

export const shadows = {
  none: 'none',
  overlay: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  overlayDark: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
  classNames: {
    none: 'shadow-none',
    overlay: 'shadow-lg shadow-black/10 dark:shadow-black/40',
    popover: 'shadow-md shadow-black/10 dark:shadow-black/40',
    dialog: 'shadow-xl shadow-black/15 dark:shadow-black/50',
    sheet: 'shadow-2xl shadow-black/20 dark:shadow-black/60',
  },
} as const
