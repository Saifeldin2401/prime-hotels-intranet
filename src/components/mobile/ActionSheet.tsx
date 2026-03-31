import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { X } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

interface ActionSheetProps {
    trigger?: React.ReactNode
    title?: string
    description?: string
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    footer?: React.ReactNode
    /**
     * Visual variant of the action sheet
     * - default: Standard white background
     * - premium: Dark gradient with gold accents (for Quick Actions)
     */
    variant?: 'default' | 'premium'
    /**
     * Show close button in header
     */
    showCloseButton?: boolean
}

/**
 * ActionSheet Component
 * 
 * A mobile-first bottom drawer for menus, forms, and quick actions.
 * Features:
 * - Smooth spring animations
 * - Premium variant for special menus
 * - Enhanced visual design
 * - Backdrop blur effect
 */
export function ActionSheet({
    trigger,
    title,
    description,
    children,
    open,
    onOpenChange,
    footer,
    variant = 'default',
    showCloseButton = true
}: ActionSheetProps) {
    const { t } = useTranslation('common');

    const isPremium = variant === 'premium';

    return (
        <LazyMotion features={domAnimation}>
            <Drawer 
                open={open} 
                onOpenChange={onOpenChange}
                modal={true}
            >
                {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
                <DrawerContent 
                    className={cn(
                        "border-0 outline-none",
                        isPremium 
                            ? "bg-gradient-to-b from-slate-900 to-slate-950" 
                            : "bg-white"
                    )}
                >
                    {/* Handle bar */}
                    <div className="flex justify-center pt-3 pb-1">
                        <div className={cn(
                            "w-12 h-1.5 rounded-full",
                            isPremium ? "bg-white/20" : "bg-slate-300"
                        )} />
                    </div>

                    {/* Header */}
                    {(title || description || showCloseButton) && (
                        <DrawerHeader className={cn(
                            "relative pb-2",
                            isPremium && "text-white"
                        )}>
                            {/* Close button */}
                            {showCloseButton && (
                                <DrawerClose asChild>
                                    <button 
                                        className={cn(
                                            "absolute right-4 top-2 p-2 rounded-full transition-colors",
                                            isPremium 
                                                ? "text-white/50 hover:text-white hover:bg-white/10" 
                                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </DrawerClose>
                            )}
                            
                            {title && (
                                <DrawerTitle className={cn(
                                    "text-xl font-bold",
                                    isPremium && "text-white font-serif"
                                )}>
                                    {title}
                                </DrawerTitle>
                            )}
                            {description && (
                                <DrawerDescription className={cn(
                                    "text-sm",
                                    isPremium ? "text-white/60" : "text-slate-500"
                                )}>
                                    {description}
                                </DrawerDescription>
                            )}
                        </DrawerHeader>
                    )}

                    {/* Content */}
                    <div className={cn(
                        "p-4 overflow-y-auto max-h-[60vh]",
                        isPremium && "pb-safe"
                    )}>
                        {children}
                    </div>

                    {/* Footer */}
                    {(footer || !isPremium) && (
                        <DrawerFooter className={cn(
                            "pt-2",
                            isPremium && "border-t border-white/10"
                        )}>
                            {footer}
                            {!isPremium && (
                                <DrawerClose asChild>
                                    <Button variant="outline" className="w-full">
                                        {t('actions.close', 'Close')}
                                    </Button>
                                </DrawerClose>
                            )}
                        </DrawerFooter>
                    )}
                </DrawerContent>
            </Drawer>
        </LazyMotion>
    )
}

/**
 * QuickActionButton - Individual action button for the Quick Actions grid
 */
interface QuickActionButtonProps {
    icon: React.ReactNode
    label: string
    description?: string
    color: 'blue' | 'amber' | 'green' | 'purple' | 'red' | 'indigo' | 'pink' | 'teal'
    onClick: () => void
    disabled?: boolean
}

export function QuickActionButton({ 
    icon, 
    label, 
    description,
    color, 
    onClick,
    disabled = false
}: QuickActionButtonProps) {
    const colorClasses = {
        blue: {
            bg: 'bg-blue-50 hover:bg-blue-100',
            border: 'border-blue-200',
            icon: 'bg-blue-100 text-blue-600',
            text: 'text-blue-700',
            desc: 'text-blue-500'
        },
        amber: {
            bg: 'bg-amber-50 hover:bg-amber-100',
            border: 'border-amber-200',
            icon: 'bg-amber-100 text-amber-600',
            text: 'text-amber-700',
            desc: 'text-amber-500'
        },
        green: {
            bg: 'bg-emerald-50 hover:bg-emerald-100',
            border: 'border-emerald-200',
            icon: 'bg-emerald-100 text-emerald-600',
            text: 'text-emerald-700',
            desc: 'text-emerald-500'
        },
        purple: {
            bg: 'bg-purple-50 hover:bg-purple-100',
            border: 'border-purple-200',
            icon: 'bg-purple-100 text-purple-600',
            text: 'text-purple-700',
            desc: 'text-purple-500'
        },
        red: {
            bg: 'bg-red-50 hover:bg-red-100',
            border: 'border-red-200',
            icon: 'bg-red-100 text-red-600',
            text: 'text-red-700',
            desc: 'text-red-500'
        },
        indigo: {
            bg: 'bg-indigo-50 hover:bg-indigo-100',
            border: 'border-indigo-200',
            icon: 'bg-indigo-100 text-indigo-600',
            text: 'text-indigo-700',
            desc: 'text-indigo-500'
        },
        pink: {
            bg: 'bg-pink-50 hover:bg-pink-100',
            border: 'border-pink-200',
            icon: 'bg-pink-100 text-pink-600',
            text: 'text-pink-700',
            desc: 'text-pink-500'
        },
        teal: {
            bg: 'bg-teal-50 hover:bg-teal-100',
            border: 'border-teal-200',
            icon: 'bg-teal-100 text-teal-600',
            text: 'text-teal-700',
            desc: 'text-teal-500'
        }
    }

    const colors = colorClasses[color]

    return (
        <m.button
            whileTap={{ scale: 0.96 }}
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "flex flex-col items-center justify-center gap-3 p-5 rounded-2xl",
                "border-2 transition-all duration-200",
                "touch-target",
                colors.bg,
                colors.border,
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <div className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center",
                colors.icon
            )}>
                {icon}
            </div>
            <div className="text-center">
                <p className={cn("text-sm font-semibold", colors.text)}>
                    {label}
                </p>
                {description && (
                    <p className={cn("text-xs mt-0.5", colors.desc)}>
                        {description}
                    </p>
                )}
            </div>
        </m.button>
    )
}

/**
 * QuickActionGrid - Grid container for quick action buttons
 */
interface QuickActionGridProps {
    children: React.ReactNode
    className?: string
}

export function QuickActionGrid({ children, className }: QuickActionGridProps) {
    return (
        <div className={cn(
            "grid grid-cols-2 gap-3",
            className
        )}>
            {children}
        </div>
    )
}
