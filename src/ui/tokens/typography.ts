/**
 * Ratified typography scale for Altus Connect.
 * DM Sans for the Latin interface, IBM Plex Sans Arabic as a first-class Arabic
 * face, Cormorant Garamond for rare editorial moments (greeting, course and
 * article titles), IBM Plex Mono for codes and aligned figures.
 * Reference: Section 7 & 8 of Technical UI/UX Design Implementation Specification.
 */

export const typography = {
  fontFamilies: {
    sans: "'DM Sans', 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    arabic: "'IBM Plex Sans Arabic', 'DM Sans', sans-serif",
    editorial: "'Cormorant Garamond', 'IBM Plex Sans Arabic', Georgia, serif",
    mono: "'IBM Plex Mono', monospace",
  },
  scale: {
    display: {
      size: '32px',
      lineHeight: '40px',
      weight: 600,
      className: 'text-[32px] leading-[40px] font-semibold',
    },
    h1: {
      size: '24px',
      lineHeight: '32px',
      weight: 600,
      className: 'text-[24px] leading-[32px] font-semibold',
    },
    h2: {
      size: '18px',
      lineHeight: '26px',
      weight: 600,
      className: 'text-[18px] leading-[26px] font-semibold',
    },
    h3: {
      size: '16px',
      lineHeight: '24px',
      weight: 600,
      className: 'text-[16px] leading-[24px] font-semibold',
    },
    body: {
      size: '15px',
      lineHeight: '24px',
      weight: 400,
      className: 'text-[15px] leading-[24px] font-normal',
    },
    bodyStrong: {
      size: '15px',
      lineHeight: '24px',
      weight: 600,
      className: 'text-[15px] leading-[24px] font-semibold',
    },
    label: {
      size: '12px',
      lineHeight: '16px',
      weight: 600,
      className: 'text-[12px] leading-[16px] font-semibold uppercase tracking-wider',
    },
    metadata: {
      size: '12px',
      lineHeight: '18px',
      weight: 400,
      className: 'text-[12px] leading-[18px] font-normal',
    },
    data: {
      size: '13px',
      lineHeight: '18px',
      weight: 500,
      className: 'font-mono text-[13px] leading-[18px] font-medium',
    },
  },
} as const
