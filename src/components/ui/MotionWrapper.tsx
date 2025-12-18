import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface MotionWrapperProps {
    children: ReactNode
    className?: string
    mode?: 'fade' | 'slide' | 'scale' | 'fade-slide-up'
}

export function MotionWrapper({ children, className, mode = 'fade-slide-up' }: MotionWrapperProps) {
    const getVariants = () => {
        switch (mode) {
            case 'fade':
                return {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    exit: { opacity: 0 }
                }
            case 'slide':
                return {
                    initial: { opacity: 0, x: 20 },
                    animate: { opacity: 1, x: 0 },
                    exit: { opacity: 0, x: -20 }
                }
            case 'scale':
                return {
                    initial: { opacity: 0, scale: 0.95 },
                    animate: { opacity: 1, scale: 1 },
                    exit: { opacity: 0, scale: 0.95 }
                }
            case 'fade-slide-up':
            default:
                return {
                    initial: { opacity: 0, y: 10 },
                    animate: { opacity: 1, y: 0 },
                    exit: { opacity: 0, y: -10 }
                }
        }
    }

    return (
        <motion.div
            {...getVariants()}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    )
}
