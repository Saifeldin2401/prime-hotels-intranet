import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle, Trash2, CheckCircle, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ConfirmationVariant = 'danger' | 'warning' | 'info' | 'success'

interface ConfirmationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void | Promise<void>
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: ConfirmationVariant
    isLoading?: boolean
}

const variantConfig = {
    danger: {
        icon: Trash2,
        iconColor: 'text-red-600',
        iconBg: 'bg-red-100',
        buttonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-600',
    },
    warning: {
        icon: AlertTriangle,
        iconColor: 'text-orange-600',
        iconBg: 'bg-orange-100',
        buttonClass: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-600',
    },
    info: {
        icon: Info,
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-100',
        buttonClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-600',
    },
    success: {
        icon: CheckCircle,
        iconColor: 'text-green-600',
        iconBg: 'bg-green-100',
        buttonClass: 'bg-green-600 hover:bg-green-700 focus:ring-green-600',
    },
}

export function ConfirmationDialog({
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    isLoading = false,
}: ConfirmationDialogProps) {
    const config = variantConfig[variant]
    const Icon = config.icon

    const handleConfirm = async () => {
        await onConfirm()
        onOpenChange(false)
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="sm:max-w-[425px]">
                <AlertDialogHeader>
                    <div className="flex items-start gap-4">
                        <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', config.iconBg)}>
                            <Icon className={cn('h-6 w-6', config.iconColor)} />
                        </div>
                        <div className="flex-1">
                            <AlertDialogTitle className="text-left">{title}</AlertDialogTitle>
                            <AlertDialogDescription className="text-left mt-2">
                                {description}
                            </AlertDialogDescription>
                        </div>
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:space-x-2">
                    <AlertDialogCancel disabled={isLoading}>{cancelText}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={cn(config.buttonClass, 'text-white')}
                    >
                        {isLoading ? (
                            <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current" />
                                Processing...
                            </>
                        ) : (
                            confirmText
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

// Convenience hook for using confirmation dialogs
export function useConfirmation() {
    const [isOpen, setIsOpen] = React.useState(false)
    const [config, setConfig] = React.useState<Omit<ConfirmationDialogProps, 'open' | 'onOpenChange'>>({
        onConfirm: () => { },
        title: '',
        description: '',
    })

    const confirm = (options: Omit<ConfirmationDialogProps, 'open' | 'onOpenChange'>) => {
        return new Promise<boolean>((resolve) => {
            setConfig({
                ...options,
                onConfirm: async () => {
                    await options.onConfirm()
                    resolve(true)
                },
            })
            setIsOpen(true)
        })
    }

    const dialog = (
        <ConfirmationDialog
            {...config}
            open={isOpen}
            onOpenChange={(open) => {
                setIsOpen(open)
                if (!open) {
                    // User cancelled
                }
            }}
        />
    )

    return { confirm, dialog }
}

// Add React import
import React from 'react'
