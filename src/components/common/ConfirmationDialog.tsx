import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface ConfirmationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'warning' | 'default'
    onConfirm: () => void | Promise<void>
    isLoading?: boolean
}

export function ConfirmationDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    isLoading = false
}: ConfirmationDialogProps) {
    const [loading, setLoading] = useState(false)

    const handleConfirm = async () => {
        setLoading(true)
        try {
            await onConfirm()
            onOpenChange(false)
        } catch (error) {
            console.error('Confirmation action failed:', error)
        } finally {
            setLoading(false)
        }
    }

    const buttonClasses = {
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        default: 'bg-primary hover:bg-primary/90'
    }

    const isProcessing = loading || isLoading

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-center gap-3">
                        {variant === 'danger' && (
                            <div className="p-2 bg-red-100 rounded-full">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                        )}
                        {variant === 'warning' && (
                            <div className="p-2 bg-yellow-100 rounded-full">
                                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            </div>
                        )}
                        <AlertDialogTitle>{title}</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="pt-2">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isProcessing}>
                        {cancelLabel}
                    </AlertDialogCancel>
                    <Button
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className={buttonClasses[variant]}
                    >
                        {isProcessing && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                        {confirmLabel}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

// Pre-configured dialogs for common use cases

interface DeleteDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    itemName: string
    onConfirm: () => void | Promise<void>
    isLoading?: boolean
}

export function DeleteConfirmationDialog({
    open,
    onOpenChange,
    itemName,
    onConfirm,
    isLoading
}: DeleteDialogProps) {
    const { t } = useTranslation('common')

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t('confirm.delete_title', { defaultValue: 'Delete {{item}}?', item: itemName })}
            description={t('confirm.delete_message', {
                defaultValue: 'Are you sure you want to delete this? This action cannot be undone.'
            })}
            confirmLabel={t('confirm.delete', { defaultValue: 'Delete' })}
            cancelLabel={t('action.cancel', { defaultValue: 'Cancel' })}
            variant="danger"
            onConfirm={onConfirm}
            isLoading={isLoading}
        />
    )
}

interface LogoutDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void | Promise<void>
}

interface ArchiveDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    itemName: string
    onConfirm: () => void | Promise<void>
    isLoading?: boolean
}

interface DiscardChangesDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
}
