import { type Variants } from 'framer-motion'

// ==========================================
// MOTION PHILOSOPHY & CONSTANTS
// ==========================================
// Primary priority: usability, clarity, and performance.
// Rule: Motion is functional, not decorative.
// Rule: No bouncing, no elastic easing.
// Rule: Duration 200ms - 800ms.
//
// MUST USE: Dashboards, Settings, System Indicators (sync/process).
// MAY USE: Nav hover, Buttons, Page entry (soft fade/slide).
// MUST NOT USE: SOPs, Manuals, Forms, Tables, Data-heavy views.

const DURATION = {
    FAST: 0.15,   // 150ms - Taps, Exits
    MEDIUM: 0.25, // 250ms - Hovers, Slides
    SLOW: 0.35,   // 350ms - Page Transitions
    XL: 0.5       // 500ms - Reserved for complex sequences
}
// Standard transition preset
// ==========================================
// CENTRALIZED VARIANTS
// ==========================================

// Check simplified reduced motion (can be expanded with hooks)
const isReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

// 1. Page Transitions (Subtle fade + slight slide up)
// Enterprise Feel: Less bounce, more transparency flow
export const pageVariants: Variants = {
    initial: {
        opacity: 0,
        y: isReducedMotion ? 0 : 8, // Reduced movement distance
        scale: isReducedMotion ? 1 : 0.995 // Very subtle scale up
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: DURATION.SLOW,
            ease: "easeOut" // Smooth deceleration
        }
    },
    exit: {
        opacity: 0,
        y: isReducedMotion ? 0 : -4,
        scale: 1,
        transition: {
            duration: DURATION.FAST,
            ease: "easeIn"
        }
    }
}

// 2. Micro-interactions (Buttons, Cards)
// 3. Staggered List Children
// 4. Notification Bell Shake (Single shake, no loop)
export const bellVariants: Variants = {
    idle: { rotate: 0 },
    shake: {
        rotate: [0, -15, 15, -10, 10, -5, 5, 0],
        transition: {
            duration: 0.6,
            ease: "linear",
            times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]
        }
    }
}

// 5. Sidebar Item (Fade + Slide In)
// ==========================================
// UTILITY HELPERS
// ==========================================

// Combine standard transition with custom override
