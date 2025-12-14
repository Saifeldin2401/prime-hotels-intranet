/**
 * SwipeableItem Component
 * 
 * Enables swipe gestures on list items for mobile actions.
 * Supports left/right swipe with customizable actions.
 */

import type { ReactNode } from 'react'
import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface SwipeAction {
    icon: ReactNode
    label: string
    color: string
    onClick: () => void
}

interface SwipeableItemProps {
    children: ReactNode
    leftActions?: SwipeAction[]
    rightActions?: SwipeAction[]
    threshold?: number // Minimum swipe distance to trigger action
    className?: string
    onSwipeStart?: () => void
    onSwipeEnd?: () => void
}

export function SwipeableItem({
    children,
    leftActions = [],
    rightActions = [],
    threshold = 80,
    className,
    onSwipeStart,
    onSwipeEnd
}: SwipeableItemProps) {
    const [translateX, setTranslateX] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [showLeftActions, setShowLeftActions] = useState(false)
    const [showRightActions, setShowRightActions] = useState(false)

    const startX = useRef(0)
    const startY = useRef(0)
    const currentX = useRef(0)
    const isHorizontalSwipe = useRef<boolean | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX
        startY.current = e.touches[0].clientY
        isHorizontalSwipe.current = null
        setIsDragging(true)
        onSwipeStart?.()
    }, [onSwipeStart])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging) return

        currentX.current = e.touches[0].clientX
        const currentY = e.touches[0].clientY
        const diffX = currentX.current - startX.current
        const diffY = currentY - startY.current

        // Determine if this is a horizontal or vertical swipe (once)
        if (isHorizontalSwipe.current === null) {
            isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY)
        }

        // Only handle horizontal swipes
        if (!isHorizontalSwipe.current) return

        // Prevent vertical scrolling while swiping horizontally
        e.preventDefault()

        // Limit swipe distance and add resistance
        const maxSwipe = 150
        const constrainedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diffX * 0.8))
        setTranslateX(constrainedDiff)

        // Show action indicators
        if (diffX > threshold / 2 && leftActions.length > 0) {
            setShowLeftActions(true)
            setShowRightActions(false)
        } else if (diffX < -threshold / 2 && rightActions.length > 0) {
            setShowRightActions(true)
            setShowLeftActions(false)
        } else {
            setShowLeftActions(false)
            setShowRightActions(false)
        }
    }, [isDragging, leftActions.length, rightActions.length, threshold])

    const handleTouchEnd = useCallback(() => {
        if (!isDragging) return

        const diff = translateX

        // Trigger action if threshold exceeded
        if (diff > threshold && leftActions.length > 0) {
            leftActions[0].onClick()
        } else if (diff < -threshold && rightActions.length > 0) {
            rightActions[0].onClick()
        }

        // Reset state
        setIsDragging(false)
        setTranslateX(0)
        setShowLeftActions(false)
        setShowRightActions(false)
        isHorizontalSwipe.current = null
        onSwipeEnd?.()
    }, [isDragging, translateX, threshold, leftActions, rightActions, onSwipeEnd])

    const actionButtonWidth = 80

    return (
        <div
            ref={containerRef}
            className={cn("relative overflow-hidden touch-pan-y", className)}
        >
            {/* Left Actions Background */}
            {leftActions.length > 0 && (
                <div
                    className={cn(
                        "absolute inset-y-0 left-0 flex items-center justify-start transition-opacity",
                        showLeftActions ? "opacity-100" : "opacity-0"
                    )}
                    style={{ width: actionButtonWidth }}
                >
                    {leftActions.map((action, index) => (
                        <button
                            key={index}
                            className={cn(
                                "h-full flex flex-col items-center justify-center px-4 text-white text-xs font-medium transition-transform",
                                action.color,
                                showLeftActions ? "scale-100" : "scale-75"
                            )}
                            onClick={action.onClick}
                            style={{ width: actionButtonWidth }}
                        >
                            <div className="mb-1">{action.icon}</div>
                            <span>{action.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Right Actions Background */}
            {rightActions.length > 0 && (
                <div
                    className={cn(
                        "absolute inset-y-0 right-0 flex items-center justify-end transition-opacity",
                        showRightActions ? "opacity-100" : "opacity-0"
                    )}
                    style={{ width: actionButtonWidth }}
                >
                    {rightActions.map((action, index) => (
                        <button
                            key={index}
                            className={cn(
                                "h-full flex flex-col items-center justify-center px-4 text-white text-xs font-medium transition-transform",
                                action.color,
                                showRightActions ? "scale-100" : "scale-75"
                            )}
                            onClick={action.onClick}
                            style={{ width: actionButtonWidth }}
                        >
                            <div className="mb-1">{action.icon}</div>
                            <span>{action.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Main Content */}
            <div
                className={cn(
                    "relative bg-background z-10",
                    isDragging ? "" : "transition-transform duration-200"
                )}
                style={{ transform: `translateX(${translateX}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>
        </div>
    )
}
