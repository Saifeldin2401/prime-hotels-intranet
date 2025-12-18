import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { DURATION, EASING } from '@/lib/motion'

interface ScrollRevealProps {
    children: ReactNode
    variant?: 'fade' | 'slide' | 'scale'
    direction?: 'up' | 'down' | 'left' | 'right'
    delay?: number
    className?: string
    viewportAmount?: number
}

export function ScrollReveal({
    children,
    variant = 'slide',
    direction = 'up',
    delay = 0,
    className,
    viewportAmount = 0.3
}: ScrollRevealProps) {

    const getVariants = () => {
        const distance = 50

        const variants = {
            hidden: { opacity: 0 } as any,
            visible: {
                opacity: 1,
                transition: {
                    duration: DURATION.MEDIUM,
                    ease: EASING.DEFAULT,
                    delay: delay
                }
            } as any
        }

        if (variant === 'slide') {
            switch (direction) {
                case 'up': variants.hidden.y = distance; variants.visible.y = 0; break;
                case 'down': variants.hidden.y = -distance; variants.visible.y = 0; break;
                case 'left': variants.hidden.x = distance; variants.visible.x = 0; break;
                case 'right': variants.hidden.x = -distance; variants.visible.x = 0; break;
            }
        } else if (variant === 'scale') {
            variants.hidden.scale = 0.8
            variants.visible.scale = 1
        }

        return variants
    }

    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ amount: viewportAmount, once: true }}
            variants={getVariants()}
            className={className}
        >
            {children}
        </motion.div>
    )
}
