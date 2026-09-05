// Shared style constants for all public pages

// 01 PRIMARY DISPLAY: Canela (Hero headlines, quotes, editorial highlights)
export const canela = { fontFamily: "'Canela', 'Playfair Display', Georgia, 'Times New Roman', serif" };

// 02 EXECUTIVE SANS SERIF: Neue Haas Grotesk (Headings H1-H4, navigation, subtitles, labels)
export const neueHaas = { fontFamily: "'Neue Haas Grotesk', 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" };

// 03 READING TYPEFACE: Inter (Body copy, paragraphs, long-form content)
export const inter = { fontFamily: "'Inter', system-ui, sans-serif" };

// 04 TECHNICAL TYPEFACE: IBM Plex Mono (Data, metrics, KPIs, financial info)
export const mono = { fontFamily: "'IBM Plex Mono', Consolas, monospace" };

// 05 ARABIC LUXURY DISPLAY: Cairo (Headings, titles, badges, Arabic typography)
export const cairo = { fontFamily: "'Cairo', 'Tajawal', 'Plus Jakarta Sans', system-ui, sans-serif" };

// Bilingual font helpers
export const getHeadingFont = (isRTL: boolean) => isRTL ? cairo : canela;
export const getSansFont = (isRTL: boolean) => isRTL ? cairo : neueHaas;
export const getBodyFont = (isRTL: boolean) => isRTL ? cairo : inter;

// Legacy alias for compatibility
export const playfair = canela;

// ALTUS ADVISORY BRAND COLOR SYSTEM
export const COLOR = {
  creamyWhite: '#F7F5F1', // Primary light background, open space (60%)
  ivory: '#FAF7F2',       // Cards, elevated containers, subtle backgrounds (20%)
  copper: '#C45B2F',      // Signature Transformation Copper (10%) - CTAs, highlights, key metrics
  sand: '#D9C6A3',        // Warm Sand (5%) - Soft backgrounds, infographics, dividers
  slate: '#5B6775',       // Slate Gray (3%) - Body copy, supporting copy
  charcoal: '#1E2329',    // Executive Charcoal (1%) - Headings, strong text
  charcoalDeep: '#16191E',// Dark background surface
  emerald: '#2E7D5A',     // Success Emerald - Metrics, growth indicators
  // Mapped aliases for exact brand match
  navy: '#1E2329',
  navyDeep: '#16191E',
  cream: '#F7F5F1',
  gold: '#C45B2F',
  goldLight: '#C45B2F',
} as const;

// Animation easing
export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
export const EASE_IN_OUT: [number, number, number, number] = [0.77, 0, 0.175, 1];

// Framer Motion stagger item variant (sub-300ms responsive UI standard)
export const staggerItem = {
  hidden: { opacity: 0, transform: 'translateY(8px)' },
  visible: {
    opacity: 1,
    transform: 'translateY(0px)',
    transition: { duration: 0.25, ease: EASE_OUT },
  },
};
