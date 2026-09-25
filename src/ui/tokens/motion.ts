/**
 * Ratified motion tokens for Altus Connect.
 * Reference: Section 48 of Technical UI/UX Design Implementation Specification.
 *
 * Subtle, purposeful motion:
 * - Duration: 150ms - 200ms
 * - Properties: opacity, slight translation
 * - Respects prefers-reduced-motion
 */

export const motion = {
  durations: {
    fast: '150ms',
    normal: '200ms',
  },
  easings: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  },
  classNames: {
    transition: 'transition-all duration-150 motion-reduce:transition-none',
    transitionFast: 'transition-all duration-150 motion-reduce:transition-none',
    transitionNormal: 'transition-all duration-200 motion-reduce:transition-none',
    fadeIn: 'animate-in fade-in duration-150 motion-reduce:animate-none',
    slideInFromTop: 'animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none',
    slideInFromBottom: 'animate-in fade-in slide-in-from-bottom-1 duration-150 motion-reduce:animate-none',
  },
} as const
