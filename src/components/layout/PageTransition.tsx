import { motion } from 'framer-motion'
import { pageVariants } from '@/lib/motion'
import { useLocation } from 'react-router-dom'
import { forwardRef } from 'react'

interface PageTransitionProps {
    children: React.ReactNode
    className?: string
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(({ children, className }, ref) => {
    const location = useLocation()

    return (
        <motion.div
            ref={ref}
            key={location.pathname}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            className={className}
            // Accessibility: Ensure content doesn't trap focus during transition
            aria-live="polite"
        >
            {children}
        </motion.div>
    )
})

PageTransition.displayName = 'PageTransition'
