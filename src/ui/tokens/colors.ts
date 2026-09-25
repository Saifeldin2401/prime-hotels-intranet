/**
 * Ratified color tokens for Altus Connect design system.
 * Reference: Section 4 & 6 of Technical UI/UX Design Implementation Specification.
 *
 * All pairs are WCAG AA compliant on their respective ground:
 * - ink on background: ~15:1
 * - muted on surface: >= 4.9:1
 */

export const colors = {
  light: {
    ink: '#15212E',
    inkSecondary: '#3B4754',
    muted: '#667080',
    background: '#F6F6F3',
    surface: '#FFFFFF',
    surfaceSubtle: '#F0F1EE',
    border: '#DDDBD4',
    borderStrong: '#C8C7C1',
    brass: '#86672C',
    accent: '#86672C',
    accentHover: '#6F5424',
    accentSoft: '#F2EBDD',
    success: '#2C6A4B',
    successSoft: '#E8F2EC',
    warning: '#A85A14',
    warningSoft: '#F8EBDD',
    danger: '#A5302A',
    dangerSoft: '#F8E9E8',
    info: '#46637A',
    infoSoft: '#EAF0F4',
    onInk: '#FFFFFF',
  },
  dark: {
    ink: '#F0F3F7',
    inkSecondary: '#B4BFCB',
    muted: '#7D8B9B',
    background: '#101419',
    surface: '#18202A',
    surfaceSubtle: '#1C2935',
    border: '#2C3644',
    borderStrong: '#30404D',
    brass: '#D4AA55',
    accent: '#B79A62',
    accentHover: '#9E834F',
    accentSoft: '#242A28',
    success: '#48A375',
    successSoft: '#14281E',
    warning: '#DCA038',
    warningSoft: '#2A2314',
    danger: '#E25850',
    dangerSoft: '#2C1615',
    info: '#6FA4C7',
    infoSoft: '#15232D',
    onInk: '#15212E',
  },
} as const

export type ColorTokens = typeof colors.light
export type ThemeMode = 'light' | 'dark'
