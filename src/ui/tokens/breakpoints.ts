/**
 * Ratified layout and breakpoint tokens for Altus Connect.
 * Reference: Section 16 & 37 of Technical UI/UX Design Implementation Specification.
 */

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

export const layoutTokens = {
  sidebar: {
    width: '248px',
    collapsedWidth: '72px',
    className: 'w-[248px]',
    collapsedClassName: 'w-[72px]',
  },
  touchTarget: {
    minHeight: 'min-h-[44px]',
    minWidth: 'min-w-[44px]',
  },
} as const
