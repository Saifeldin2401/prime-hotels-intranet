/**
 * MobileConfirmDialog Component
 * 
 * Uses BottomSheet on mobile, falls back to regular dialog on desktop.
 * Provides consistent confirmation UX across devices.
 */

import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import { BottomSheet } from './BottomSheet'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileConfirmDialogProps {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description?: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'success' | 'info'
    loading?: boolean
    children?: ReactNode
}

const variantConfig = {
    danger: {
        icon: XCircle,
        iconClass: 'text-red-500 bg-red-100',
        buttonClass: 'bg-red-500 hover:bg-red-600 text-white'
    },
    warning: {
        icon: AlertTriangle,
        iconClass: 'text-amber-500 bg-amber-100',
        buttonClass: 'bg-amber-500 hover:bg-amber-600 text-white'
    },
    success: {
        icon: CheckCircle,
        iconClass: 'text-green-500 bg-green-100',
        buttonClass: 'bg-green-500 hover:bg-green-600 text-white'
    },
    info: {
        icon: Info,
        iconClass: 'text-blue-500 bg-blue-100',
        buttonClass: 'bg-blue-500 hover:bg-blue-600 text-white'
    }
}

export function MobileConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'info',
    loading = false,
    children
}: MobileConfirmDialogProps) {
    const [isMobile, setIsMobile] = useState(false)
    const config = variantConfig[variant]
    const Icon = config.icon

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const content = (
        <div className="space-y-4">
            {/* Icon and Title */}
            <div className="flex flex-col items-center text-center">
                <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center mb-3",
                    config.iconClass
                )}>
                    <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                {description && (
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
            </div>

            {/* Custom content */}
            {children}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
                <Button
                    onClick={onConfirm}
                    disabled={loading}
                    className={cn("w-full touch-target", config.buttonClass)}
                >
                    {loading ? 'Loading...' : confirmText}
                </Button>
                <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={loading}
                    className="w-full touch-target"
                >
                    {cancelText}
                </Button>
            </div>
        </div>
    )

    // Use BottomSheet on mobile
    if (isMobile) {
        return (
            <BottomSheet open={open} onClose={onClose} showHandle>
                {content}
            </BottomSheet>
        )
    }

    // Desktop: use a simpler centered modal (could be replaced with Radix Dialog)
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-background rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
                {content}
            </div>
        </div>
    )
}
