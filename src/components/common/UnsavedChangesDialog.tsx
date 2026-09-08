import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface UnsavedChangesDialogProps {
    open: boolean
    onContinue: () => void
    onCancel: () => void
}

export function UnsavedChangesDialog({
    open,
    onContinue,
    onCancel,
}: UnsavedChangesDialogProps) {
    const { t } = useTranslation('common')
    const isContinuingRef = useRef(false)

    useEffect(() => {
        if (open) {
            isContinuingRef.current = false
        }
    }, [open])

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            if (!isContinuingRef.current) {
                onCancel()
            }
        }
    }

    const handleContinue = (e: React.MouseEvent) => {
        e.preventDefault()
        isContinuingRef.current = true
        onContinue()
    }

    const handleCancel = () => {
        isContinuingRef.current = false
        onCancel()
    }

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {t('confirm.unsaved_changes_title', 'Unsaved Changes')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('confirm.unsaved_changes_message', 'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel onClick={handleCancel}>
                        {t('action.cancel', 'Cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleContinue}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                        {t('confirm.leave_page', 'Leave Page')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
