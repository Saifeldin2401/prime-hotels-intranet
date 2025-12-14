import { useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, Trash2, LogOut, Archive } from 'lucide-react'
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
                        {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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

export function LogoutConfirmationDialog({
    open,
    onOpenChange,
    onConfirm
}: LogoutDialogProps) {
    const { t } = useTranslation('common')

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t('confirm.logout_title', { defaultValue: 'Log Out?' })}
            description={t('confirm.logout_message', {
                defaultValue: 'Are you sure you want to log out? You will need to sign in again to access the system.'
            })}
            confirmLabel={t('confirm.logout', { defaultValue: 'Log Out' })}
            cancelLabel={t('action.cancel', { defaultValue: 'Cancel' })}
            variant="warning"
            onConfirm={onConfirm}
        />
    )
}

interface ArchiveDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    itemName: string
    onConfirm: () => void | Promise<void>
    isLoading?: boolean
}

export function ArchiveConfirmationDialog({
    open,
    onOpenChange,
    itemName,
    onConfirm,
    isLoading
}: ArchiveDialogProps) {
    const { t } = useTranslation('common')

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t('confirm.archive_title', { defaultValue: 'Archive {{item}}?', item: itemName })}
            description={t('confirm.archive_message', {
                defaultValue: 'This will archive the item and hide it from active views. You can restore it later if needed.'
            })}
            confirmLabel={t('confirm.archive', { defaultValue: 'Archive' })}
            cancelLabel={t('action.cancel', { defaultValue: 'Cancel' })}
            variant="warning"
            onConfirm={onConfirm}
            isLoading={isLoading}
        />
    )
}

interface DiscardChangesDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
}

export function DiscardChangesDialog({
    open,
    onOpenChange,
    onConfirm
}: DiscardChangesDialogProps) {
    const { t } = useTranslation('common')

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t('confirm.discard_title', { defaultValue: 'Discard Changes?' })}
            description={t('confirm.discard_message', {
                defaultValue: 'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.'
            })}
            confirmLabel={t('confirm.discard', { defaultValue: 'Discard' })}
            cancelLabel={t('confirm.keep_editing', { defaultValue: 'Keep Editing' })}
            variant="warning"
            onConfirm={onConfirm}
        />
    )
}
