import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface RejectionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (reason: string) => void
    isPending?: boolean
    title?: string
    description?: string
}

export function RejectionDialog({
    open,
    onOpenChange,
    onConfirm,
    isPending = false,
    title,
    description
}: RejectionDialogProps) {
    const { t } = useTranslation('approvals')
    const [reason, setReason] = useState('')
    const [error, setError] = useState('')

    const handleDialogOpenChange = (nextOpen: boolean) => {
        if (nextOpen) {
            setReason('')
            setError('')
        }
        onOpenChange(nextOpen)
    }

    const handleConfirm = () => {
        if (!reason.trim()) {
            setError(t('reject_reason_required', 'Reason is required'))
            return
        }
        onConfirm(reason)
    }

    return (
        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title || t('reject_dialog_title_document', 'Reject Document')}</DialogTitle>
                    <DialogDescription>
                        {description || t('reject_dialog_desc_document', 'Please provide a reason for rejecting this document.')}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="reason">
                            {t('reject_reason_prompt', 'Please provide a reason for rejection:')}
                        </Label>
                        <Textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value)
                                if (e.target.value.trim()) setError('')
                            }}
                            placeholder={t('reject_reason_placeholder', 'Reason for rejection (required)...')}
                            className={error ? 'border-red-500' : ''}
                        />
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        {t('action.cancel', 'Cancel')}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isPending}
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('reject', 'Reject')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
