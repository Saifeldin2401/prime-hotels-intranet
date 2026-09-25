/**
 * Ratified 8-point spacing system for Altus Connect.
 * Reference: Section 10 of Technical UI/UX Design Implementation Specification.
 */

export const spacing = {
  px: '1px',
  0: '0px',
  0.5: '2px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const

export type SpacingToken = keyof typeof spacing
