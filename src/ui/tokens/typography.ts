/**
 * Ratified typography scale for Altus Connect.
 * Uses IBM Plex Sans with native companion IBM Plex Sans Arabic and IBM Plex Mono.
 * Reference: Section 7 & 8 of Technical UI/UX Design Implementation Specification.
 */

export const typography = {
  fontFamilies: {
    sans: "'IBM Plex Sans', 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
