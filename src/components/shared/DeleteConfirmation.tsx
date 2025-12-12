import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'

interface DeleteConfirmationProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void | Promise<void>
    itemName: string
    itemType?: string
    isLoading?: boolean
}

export function DeleteConfirmation({
    open,
    onOpenChange,
    onConfirm,
    itemName,
    itemType = 'item',
    isLoading = false,
}: DeleteConfirmationProps) {
    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            onConfirm={onConfirm}
            title={`Delete ${itemType}?`}
            description={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            variant="danger"
            isLoading={isLoading}
        />
    )
}
