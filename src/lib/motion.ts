import { type Transition, type Variants, type Easing } from 'framer-motion'

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

export const DURATION = {
    FAST: 0.15,   // 150ms - Taps, Exits
    MEDIUM: 0.25, // 250ms - Hovers, Slides
    SLOW: 0.35,   // 350ms - Page Transitions
    XL: 0.5       // 500ms - Reserved for complex sequences
}

export const EASING = {
    // easeOut for most entrances
    DEFAULT: [0, 0, 0.2, 1] as Easing,
    // Linear for color/opacity changes
    LINEAR: 'linear' as Easing,
}

// Standard transition preset
export const TRANSITION_DEFAULT: Transition = {
    duration: DURATION.MEDIUM,
    ease: EASING.DEFAULT,
}

export const TRANSITION_FAST: Transition = {
    duration: DURATION.FAST,
    ease: EASING.DEFAULT,
}

// ==========================================
// CENTRALIZED VARIANTS
// ==========================================

// 1. Page Transitions (Subtle fade + slight slide up)
export const pageVariants: Variants = {
    initial: {
        opacity: 0,
        y: 4
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: TRANSITION_DEFAULT
    },
    exit: {
        opacity: 0,
        y: -4,
        transition: TRANSITION_FAST
    }
}

// 2. Micro-interactions (Buttons, Cards)
export const microInteractionVariants: Variants = {
    idle: { scale: 1 },
    hover: {
        scale: 1.02,
        transition: { duration: DURATION.MEDIUM, ease: EASING.DEFAULT }
    },
    tap: {
        scale: 0.98,
        transition: { duration: DURATION.FAST, ease: EASING.DEFAULT }
    }
}

// 3. Staggered List Children
export const listContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.05
        }
    }
}

export const listItemVariants: Variants = {
    hidden: { opacity: 0, y: 4 },
    visible: {
        opacity: 1,
        y: 0,
        transition: TRANSITION_FAST
    }
}

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
export const sidebarItemVariants: Variants = {
    hidden: { opacity: 0, x: -4 },
    visible: {
        opacity: 1,
        x: 0,
        transition: TRANSITION_FAST
    }
}

// ==========================================
// UTILITY HELPERS
// ==========================================

// Combine standard transition with custom override
export const withTransition = (
    variants: Variants,
    customTransition: Transition = TRANSITION_DEFAULT
): Variants => {
    return Object.keys(variants).reduce((acc, key) => {
        acc[key] = {
            ...variants[key],
            transition: customTransition
        }
        return acc
    }, {} as Variants)
}
