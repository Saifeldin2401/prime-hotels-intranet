import { motion, type PanInfo, useAnimation } from 'framer-motion'
import { CheckCircle, Trash2 } from 'lucide-react'
import { type ReactNode } from 'react'

interface SwipeableItemProps {
    children: ReactNode
    onSwipeLeft?: () => void
    onSwipeRight?: () => void
    leftActionColor?: string
    rightActionColor?: string
    leftIcon?: ReactNode
    rightIcon?: ReactNode
    threshold?: number
}

export function SwipeableItem({
    children,
    onSwipeLeft,
    onSwipeRight,
    leftActionColor = 'bg-blue-500',
    rightActionColor = 'bg-red-500',
    leftIcon = <CheckCircle className="text-white w-6 h-6" />,
    rightIcon = <Trash2 className="text-white w-6 h-6" />,
    threshold = 100
}: SwipeableItemProps) {
    const controls = useAnimation()

    const handleDragEnd = async (event, info: PanInfo) => {
        const offset = info.offset.x

        if (offset < -threshold && onSwipeRight) {
            // Swiped Left (trigger right action)
            await controls.start({ x: -500, opacity: 0, transition: { duration: 0.2 } })
            onSwipeRight()
        } else if (offset > threshold && onSwipeLeft) {
            // Swiped Right (trigger left action)
            await controls.start({ x: 500, opacity: 0, transition: { duration: 0.2 } })
            onSwipeLeft()
        } else {
            // Return to start
            controls.start({ x: 0, opacity: 1 })
        }
    }

    return (
        <div className="relative overflow-hidden rounded-xl">
            {/* Background Actions */}
            <div className="absolute inset-0 flex">
                {onSwipeLeft && (
                    <div className={`flex-1 flex items-center justify-start ps-6 ${leftActionColor}`}>
                        {leftIcon}
                    </div>
                )}
                {onSwipeRight && (
                    <div className={`flex-1 flex items-center justify-end pe-6 ${rightActionColor}`}>
                        {rightIcon}
                    </div>
                )}
            </div>

            {/* Foreground Content */}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }} // Constraints are 0 to simulate "tough" resistance or snap back unless we want free drag
                // Actually for a list item swipe, we usually want minimal constraints but spring back
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                animate={controls}
                className="relative bg-white z-10"
                style={{ touchAction: 'pan-y' }} // Allow vertical scrolling
            >
                {children}
            </motion.div>
        </div>
    )
}
