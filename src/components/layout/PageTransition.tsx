import { motion, useReducedMotion } from 'framer-motion'
import { forwardRef } from 'react'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
    children: React.ReactNode
    className?: string
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(({ children, className }, ref) => {
    const location = useLocation()
    const shouldReduceMotion = useReducedMotion()

    const variants = {
        initial: { opacity: 0, y: shouldReduceMotion ? 0 : 8, scale: shouldReduceMotion ? 1 : 0.995 },
        animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: shouldReduceMotion ? 0.15 : 0.3, ease: 'easeOut' as const },
        },
        exit: {
            opacity: 0,
            y: 0,
            scale: 1,
            transition: { duration: 0.15, ease: 'easeOut' as const },
        },
    }

    return (
        <motion.div
            ref={ref}
            key={location.pathname}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
            className={className}
            // Accessibility: Ensure content doesn't trap focus during transition
            aria-live="polite"
        >
            {children}
        </motion.div>
    )
})

PageTransition.displayName = 'PageTransition'
