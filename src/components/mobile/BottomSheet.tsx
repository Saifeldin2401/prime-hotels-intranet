/**
 * BottomSheet Component
 * 
 * Mobile-optimized modal that slides up from the bottom.
 * More natural touch pattern than centered modals on mobile.
 */

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BottomSheetProps {
    open: boolean
    onClose: () => void
    children: ReactNode
    title?: string
    className?: string
    showHandle?: boolean
    snapPoints?: ('content' | 'half' | 'full')[]
    defaultSnap?: 'content' | 'half' | 'full'
}

export function BottomSheet({
    open,
    onClose,
    children,
    title,
    className,
    showHandle = true,
    snapPoints = ['content'],
    defaultSnap = 'content'
}: BottomSheetProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [translateY, setTranslateY] = useState(0)
    const sheetRef = useRef<HTMLDivElement>(null)
    const startY = useRef(0)
    const currentY = useRef(0)

    useEffect(() => {
        if (open) {
            setIsVisible(true)
            document.body.style.overflow = 'hidden'
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300)
            document.body.style.overflow = ''
            return () => clearTimeout(timer)
        }

        return () => {
            document.body.style.overflow = ''
        }
    }, [open])

    const handleTouchStart = (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY
        setIsDragging(true)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return
        currentY.current = e.touches[0].clientY
        const diff = currentY.current - startY.current

        if (diff > 0) {
            setTranslateY(diff)
        }
    }

    const handleTouchEnd = () => {
        setIsDragging(false)

        // If dragged more than 100px, close the sheet
        if (translateY > 100) {
            onClose()
        }

        setTranslateY(0)
    }

    const getSnapHeight = () => {
        const snap = defaultSnap
        switch (snap) {
            case 'half':
                return 'max-h-[50vh]'
            case 'full':
                return 'max-h-[90vh]'
            default:
                return 'max-h-[85vh]'
        }
    }

    if (!isVisible) return null

    return createPortal(
        <div className="fixed inset-0 z-[200] lg:hidden">
            {/* Backdrop */}
            <div
                className={cn(
                    "absolute inset-0 bg-black/60 transition-opacity duration-300",
                    open ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className={cn(
                    "absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out",
                    getSnapHeight(),
                    open ? "translate-y-0" : "translate-y-full",
                    className
                )}
                style={{
                    transform: isDragging ? `translateY(${translateY}px)` : undefined,
                    transition: isDragging ? 'none' : undefined,
                    paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
                }}
            >
                {/* Handle */}
                {showHandle && (
                    <div
                        className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-target"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                    </div>
                )}

                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-4 pb-3 border-b">
                        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="touch-target"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                )}

                {/* Content */}
                <div className="overflow-y-auto overscroll-contain px-4 py-4">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}
