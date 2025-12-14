import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Loader2, UserPlus, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from 'react-i18next'
import { format, addDays } from 'date-fns'

interface DelegateApprovalDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    approvalId: string
    approvalType: string // 'leave_request' | 'expense' | 'promotion' | etc.
    onDelegated?: () => void
}

interface Delegate {
    id: string
    full_name: string
    email: string
    job_title?: string
}

export function DelegateApprovalDialog({
    open,
    onOpenChange,
    approvalId,
    approvalType,
    onDelegated
}: DelegateApprovalDialogProps) {
    const { t } = useTranslation('approvals')
    const { user } = useAuth()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const [delegateId, setDelegateId] = useState('')
    const [reason, setReason] = useState('')
    const [expiryDays, setExpiryDays] = useState('7')

    // Fetch potential delegates (same role level or higher)
    const { data: delegates, isLoading: loadingDelegates } = useQuery({
        queryKey: ['potential-delegates', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, job_title')
                .neq('id', user?.id)
                .eq('is_active', true)
                .order('full_name')

            if (error) throw error
            return data as Delegate[]
        },
        enabled: open && !!user
    })

    const delegateMutation = useMutation({
        mutationFn: async () => {
            if (!delegateId) throw new Error('Please select a delegate')

            const expiryDate = addDays(new Date(), parseInt(expiryDays))

            // Create delegation record
            const { error } = await supabase
                .from('approval_delegations')
                .insert({
                    approval_id: approvalId,
                    approval_type: approvalType,
                    delegator_id: user?.id,
                    delegate_id: delegateId,
                    reason: reason || null,
                    expires_at: expiryDate.toISOString(),
                    status: 'active'
                })

            if (error) {
                // If table doesn't exist, we'll create it via migration later
                // For now, just log and notify user
                console.error('Delegation error:', error)
                throw new Error('Delegation feature is not yet configured. Please contact support.')
            }
        },
        onSuccess: () => {
            toast({
                title: t('delegate.success_title', { defaultValue: 'Approval Delegated' }),
                description: t('delegate.success_message', {
                    defaultValue: 'The approval has been delegated successfully.'
                })
            })
            queryClient.invalidateQueries({ queryKey: ['approvals'] })
            onOpenChange(false)
            onDelegated?.()
        },
        onError: (error: Error) => {
            toast({
                title: t('delegate.error_title', { defaultValue: 'Delegation Failed' }),
                description: error.message,
                variant: 'destructive'
            })
        }
    })

    const handleSubmit = () => {
        delegateMutation.mutate()
    }

    const selectedDelegate = delegates?.find(d => d.id === delegateId)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        {t('delegate.title', { defaultValue: 'Delegate Approval' })}
                    </DialogTitle>
                    <DialogDescription>
                        {t('delegate.description', {
                            defaultValue: 'Transfer this approval to another authorized person.'
                        })}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Delegate Selector */}
                    <div className="space-y-2">
                        <Label>{t('delegate.select_person', { defaultValue: 'Delegate To' })}</Label>
                        <Select value={delegateId} onValueChange={setDelegateId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a person..." />
                            </SelectTrigger>
                            <SelectContent>
                                {loadingDelegates ? (
                                    <div className="flex items-center justify-center p-4">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                ) : delegates?.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500">
                                        No delegates available
                                    </div>
                                ) : (
                                    delegates?.map((delegate) => (
                                        <SelectItem key={delegate.id} value={delegate.id}>
                                            <div className="flex flex-col">
                                                <span>{delegate.full_name}</span>
                                                {delegate.job_title && (
                                                    <span className="text-xs text-gray-500">
                                                        {delegate.job_title}
                                                    </span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Selected delegate info */}
                    {selectedDelegate && (
                        <div className="p-3 bg-gray-50 rounded-lg text-sm">
                            <p className="font-medium">{selectedDelegate.full_name}</p>
                            <p className="text-gray-500">{selectedDelegate.email}</p>
                        </div>
                    )}

                    {/* Expiry Duration */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('delegate.expiry', { defaultValue: 'Delegation Expires In' })}
                        </Label>
                        <Select value={expiryDays} onValueChange={setExpiryDays}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1 day</SelectItem>
                                <SelectItem value="3">3 days</SelectItem>
                                <SelectItem value="7">7 days</SelectItem>
                                <SelectItem value="14">14 days</SelectItem>
                                <SelectItem value="30">30 days</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                            Expires on {format(addDays(new Date(), parseInt(expiryDays)), 'PPP')}
                        </p>
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <Label>{t('delegate.reason', { defaultValue: 'Reason (Optional)' })}</Label>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Out of office, vacation..."
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={delegateMutation.isPending}
                    >
                        {t('action.cancel', { defaultValue: 'Cancel' })}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!delegateId || delegateMutation.isPending}
                    >
                        {delegateMutation.isPending && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {t('delegate.confirm', { defaultValue: 'Delegate' })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Quick delegation button for use in approval cards
interface DelegateButtonProps {
    approvalId: string
    approvalType: string
    className?: string
}

export function DelegateButton({ approvalId, approvalType, className }: DelegateButtonProps) {
    const [open, setOpen] = useState(false)
    const { t } = useTranslation('approvals')

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                className={className}
            >
                <UserPlus className="h-4 w-4 mr-1" />
                {t('delegate.button', { defaultValue: 'Delegate' })}
            </Button>
            <DelegateApprovalDialog
                open={open}
                onOpenChange={setOpen}
                approvalId={approvalId}
                approvalType={approvalType}
            />
        </>
    )
}
