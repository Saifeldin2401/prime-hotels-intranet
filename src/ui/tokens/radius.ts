/**
 * Ratified border radius tokens for Altus Connect.
 * Reference: Section 11 of Technical UI/UX Design Implementation Specification.
 *
 * Restrained geometry:
 * - Controls: 6px
 * - Cards: 8px
 * - Dialogs: 10px
 * - Sheets: 12px
 * - Tables: 0px / minimal
 * - Pills: 9999px (reserved for status, category, compact metadata)
 */

export const radius = {
  control: '6px',
  card: '8px',
  dialog: '10px',
  sheet: '12px',
  table: '0px',
  pill: '9999px',
  classNames: {
    control: 'rounded-[6px]',
    card: 'rounded-[8px]',
    dialog: 'rounded-[10px]',
    sheet: 'rounded-[12px]',
    table: 'rounded-none',
    pill: 'rounded-full',
  },
} as const

export type RadiusToken = keyof typeof radius.classNames
