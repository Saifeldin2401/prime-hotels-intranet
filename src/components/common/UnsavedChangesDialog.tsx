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
import { useTranslation } from "react-i18next";

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
    return (
        <AlertDialog open={open} onOpenChange={onCancel}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel}>{t('common:cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={onContinue} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        Leave Page
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
