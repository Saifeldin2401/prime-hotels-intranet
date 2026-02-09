import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'

interface DeleteConfirmationProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void | Promise<void>
    itemName: string
    itemType?: string
    title?: string
    description?: string
    isLoading?: boolean
}

export function DeleteConfirmation({
    open,
    onOpenChange,
    onConfirm,
    itemName,
    itemType = 'item',
    title,
    description,
    isLoading = false,
}: DeleteConfirmationProps) {
    const fallbackTitle = `Delete ${itemType}?`
    const fallbackDescription = `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            onConfirm={onConfirm}
            title={title || fallbackTitle}
            description={description || fallbackDescription}
            confirmText="Delete"
            cancelText="Cancel"
            variant="danger"
            isLoading={isLoading}
        />
    )
}
