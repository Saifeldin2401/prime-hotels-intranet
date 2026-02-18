import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
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
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Loader2, UserPlus } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from 'react-i18next'
import { useProperty } from '@/contexts/PropertyContext'
import { format, addDays, differenceInMinutes } from 'date-fns'
import { getUserFriendlyError } from '@/lib/errorMessages'

const toLocalInputValue = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

const getDurationLabel = (start: Date, end: Date) => {
    const totalMinutes = differenceInMinutes(end, start)
    if (totalMinutes <= 0) return 'Invalid range'
    const days = Math.floor(totalMinutes / (60 * 24))
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
    const minutes = totalMinutes % 60
    const parts = []
    if (days) parts.push(`${days}d`)
    if (hours) parts.push(`${hours}h`)
    if (minutes) parts.push(`${minutes}m`)
    return parts.join(' ')
}

const reasonTemplates = [
    'Out of office',
    'On vacation',
    'Coverage for leave',
    'Urgent approval coverage',
]

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
    const { currentProperty } = useProperty()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const [delegateId, setDelegateId] = useState('')
    const [reason, setReason] = useState('')
    const [expiryDays, setExpiryDays] = useState('7')
    const [scopeMode, setScopeMode] = useState<'item' | 'type' | 'scope'>(approvalId ? 'item' : 'scope')
    const [startMode, setStartMode] = useState<'now' | 'scheduled'>('now')
    const [startAt, setStartAt] = useState(() => toLocalInputValue(new Date()))
    const [endMode, setEndMode] = useState<'preset' | 'custom'>('preset')
    const [customEndAt, setCustomEndAt] = useState(() => toLocalInputValue(addDays(new Date(), 7)))
    const [maxApprovals, setMaxApprovals] = useState('')
    const [allowRedelegate, setAllowRedelegate] = useState(false)
    const [fallbackDelegateIds, setFallbackDelegateIds] = useState<string[]>([])
    const [notifyDelegate, setNotifyDelegate] = useState(true)
    const [notifyDelegator, setNotifyDelegator] = useState(true)
    const [notifyOnAction, setNotifyOnAction] = useState(true)
    const [notifyOnExpiry, setNotifyOnExpiry] = useState(true)

    useEffect(() => {
        if (!open) return
        setDelegateId('')
        setReason('')
        setExpiryDays('7')
        setScopeMode(approvalId ? 'item' : 'scope')
        setStartMode('now')
        setStartAt(toLocalInputValue(new Date()))
        setEndMode('preset')
        setCustomEndAt(toLocalInputValue(addDays(new Date(), 7)))
        setMaxApprovals('')
        setAllowRedelegate(false)
        setFallbackDelegateIds([])
        setNotifyDelegate(true)
        setNotifyDelegator(true)
        setNotifyOnAction(true)
        setNotifyOnExpiry(true)
    }, [open, approvalId])

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

    const previewStart = useMemo(() => {
        if (startMode === 'scheduled' && startAt) {
            return new Date(startAt)
        }
        return new Date()
    }, [startMode, startAt])

    const previewEnd = useMemo(() => {
        if (endMode === 'custom' && customEndAt) {
            return new Date(customEndAt)
        }
        const days = Number(expiryDays) || 0
        return addDays(previewStart, days)
    }, [customEndAt, endMode, expiryDays, previewStart])

    const durationLabel = useMemo(() => getDurationLabel(previewStart, previewEnd), [previewStart, previewEnd])

    const validationErrors = useMemo(() => {
        const errors: string[] = []
        if (!delegateId) errors.push('Select a delegate.')
        if (startMode === 'scheduled' && !startAt) errors.push('Choose a start time.')
        if (endMode === 'custom' && !customEndAt) errors.push('Choose an end time.')
        if (previewEnd <= previewStart) errors.push('End time must be after the start time.')
        if (maxApprovals && Number(maxApprovals) < 1) errors.push('Max approvals must be at least 1.')
        return errors
    }, [customEndAt, delegateId, endMode, previewEnd, previewStart, startAt, startMode, maxApprovals])

    const delegateMutation = useMutation({
        mutationFn: async () => {
            if (!delegateId) throw new Error(t('delegate.errors.select_delegate', { defaultValue: 'Please select a delegate.' }))

            const resolvedStart = startMode === 'scheduled' && startAt ? new Date(startAt) : new Date()
            const resolvedEnd = endMode === 'custom' && customEndAt
                ? new Date(customEndAt)
                : addDays(resolvedStart, parseInt(expiryDays))

            if (resolvedEnd <= resolvedStart) {
                throw new Error('End time must be after the start time.')
            }

            // Determine scope: if approvalId is provided, this is approval-specific delegation
            // Otherwise, fall back to property-based scope
            const scopeType = currentProperty?.id && currentProperty.id !== 'all' ? 'property' : 'all'
            const scopeId = scopeType === 'property' ? currentProperty?.id : null
            const resolvedScope = approvalId ? scopeMode : 'scope'

            const entityType = resolvedScope === 'item' || resolvedScope === 'type' ? approvalType : null
            const entityId = resolvedScope === 'item' ? approvalId : null

            // Create delegation record
            // If approvalId is provided, create approval-specific delegation
            // Otherwise, create scope-based delegation (property/department/all)
            const { error } = await supabase
                .from('temporary_approvers')
                .insert({
                    delegator_id: user?.id,
                    delegate_id: delegateId,
                    entity_type: entityType,
                    entity_id: entityId,
                    scope_type: scopeType,
                    scope_id: scopeId,
                    start_at: resolvedStart.toISOString(),
                    end_at: resolvedEnd.toISOString(),
                    max_approvals: maxApprovals ? Number(maxApprovals) : null,
                    allow_redelegate: allowRedelegate,
                    fallback_delegate_ids: fallbackDelegateIds,
                    notify_delegate: notifyDelegate,
                    notify_delegator: notifyDelegator,
                    notify_on_action: notifyOnAction,
                    notify_on_expiry: notifyOnExpiry,
                    reason: reason.trim() || null
                })
                .select()

            if (error) {
                const errorDetails = getUserFriendlyError(error)
                throw new Error(errorDetails.message)
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
        onError: (error: unknown) => {
            const errorDetails = getUserFriendlyError(error)
            toast({
                title: t('delegate.error_title', { defaultValue: 'Delegation Failed' }),
                description: errorDetails.message,
                variant: 'destructive'
            })
        }
    })

    const handleSubmit = () => {
        if (validationErrors.length > 0) return
        delegateMutation.mutate()
    }

    const selectedDelegate = delegates?.find(d => d.id === delegateId)
    const fallbackOptions = delegates?.filter(d => d.id !== delegateId) || []

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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

                <div className="space-y-6 py-4">
                    {validationErrors.length > 0 && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                            {validationErrors.map((message) => (
                                <p key={message}>{message}</p>
                            ))}
                        </div>
                    )}

                    <div className="space-y-3">
                        <Label>{t('delegate.select_person', { defaultValue: 'Delegate To' })}</Label>
                        <Select value={delegateId} onValueChange={setDelegateId}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('delegate.select_person_placeholder', { defaultValue: 'Select a person' })} />
                            </SelectTrigger>
                            <SelectContent>
                                {loadingDelegates ? (
                                    <div className="flex items-center justify-center p-4">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                ) : delegates?.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500">
                                        {t('delegate.no_delegates', { defaultValue: 'No delegates available.' })}
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
                        {selectedDelegate && (
                            <div className="rounded-md border bg-muted/20 p-3 text-xs">
                                <p className="font-medium">{selectedDelegate.full_name}</p>
                                <p className="text-muted-foreground">{selectedDelegate.email}</p>
                            </div>
                        )}
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <Label>Delegation Scope</Label>
                        <RadioGroup
                            value={scopeMode}
                            onValueChange={(value) => setScopeMode(value as 'item' | 'type' | 'scope')}
                            className="space-y-2"
                        >
                            {approvalId && (
                                <div className="flex items-start gap-3 rounded-md border p-3">
                                    <RadioGroupItem value="item" id="scope-item" className="mt-1" />
                                    <div>
                                        <Label htmlFor="scope-item" className="text-sm font-medium">
                                            This approval only
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Limit delegation to the selected approval item.
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-3 rounded-md border p-3">
                                <RadioGroupItem value="type" id="scope-type" className="mt-1" />
                                <div>
                                    <Label htmlFor="scope-type" className="text-sm font-medium">
                                        All {approvalType.replace(/_/g, ' ')} approvals
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Delegate approvals of this type in your scope.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 rounded-md border p-3">
                                <RadioGroupItem value="scope" id="scope-scope" className="mt-1" />
                                <div>
                                    <Label htmlFor="scope-scope" className="text-sm font-medium">
                                        All approvals in my scope
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Applies to {currentProperty?.id && currentProperty.id !== 'all' ? (currentProperty.name || 'current property') : 'all properties'}.
                                    </p>
                                </div>
                            </div>
                        </RadioGroup>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <Label>Schedule</Label>
                        <RadioGroup
                            value={startMode}
                            onValueChange={(value) => setStartMode(value as 'now' | 'scheduled')}
                            className="space-y-2"
                        >
                            <div className="flex items-start gap-3 rounded-md border p-3">
                                <RadioGroupItem value="now" id="start-now" className="mt-1" />
                                <div>
                                    <Label htmlFor="start-now" className="text-sm font-medium">
                                        Start immediately
                                    </Label>
                                    <p className="text-xs text-muted-foreground">Delegation becomes active right away.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 rounded-md border p-3">
                                <RadioGroupItem value="scheduled" id="start-scheduled" className="mt-1" />
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="start-scheduled" className="text-sm font-medium">
                                        Schedule a start time
                                    </Label>
                                    <input
                                        type="datetime-local"
                                        value={startAt}
                                        onChange={(e) => setStartAt(e.target.value)}
                                        disabled={startMode !== 'scheduled'}
                                        className="w-full px-3 py-2 border rounded-md text-sm"
                                    />
                                </div>
                            </div>
                        </RadioGroup>

                        <RadioGroup
                            value={endMode}
                            onValueChange={(value) => setEndMode(value as 'preset' | 'custom')}
                            className="space-y-2"
                        >
                            <div className="flex items-start gap-3 rounded-md border p-3">
                                <RadioGroupItem value="preset" id="end-preset" className="mt-1" />
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="end-preset" className="text-sm font-medium">
                                        Duration
                                    </Label>
                                    <Select value={expiryDays} onValueChange={setExpiryDays} disabled={endMode !== 'preset'}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">{t('delegate.expiry_options.1', { defaultValue: '1 day' })}</SelectItem>
                                            <SelectItem value="3">{t('delegate.expiry_options.3', { defaultValue: '3 days' })}</SelectItem>
                                            <SelectItem value="7">{t('delegate.expiry_options.7', { defaultValue: '7 days' })}</SelectItem>
                                            <SelectItem value="14">{t('delegate.expiry_options.14', { defaultValue: '14 days' })}</SelectItem>
                                            <SelectItem value="30">{t('delegate.expiry_options.30', { defaultValue: '30 days' })}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 rounded-md border p-3">
                                <RadioGroupItem value="custom" id="end-custom" className="mt-1" />
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="end-custom" className="text-sm font-medium">
                                        Custom end time
                                    </Label>
                                    <input
                                        type="datetime-local"
                                        value={customEndAt}
                                        onChange={(e) => setCustomEndAt(e.target.value)}
                                        disabled={endMode !== 'custom'}
                                        className="w-full px-3 py-2 border rounded-md text-sm"
                                    />
                                </div>
                            </div>
                        </RadioGroup>

                        <p className="text-xs text-muted-foreground">
                            {t('delegate.expires_on', {
                                defaultValue: 'Expires on {{date}}',
                                date: format(previewEnd, 'PPP p')
                            })}
                        </p>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">Controls & Notifications</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="max-approvals">Max approvals (optional)</Label>
                                <Input
                                    id="max-approvals"
                                    type="number"
                                    min={1}
                                    value={maxApprovals}
                                    onChange={(e) => setMaxApprovals(e.target.value)}
                                    placeholder="e.g., 5"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fallback delegates</Label>
                                <div className="max-h-32 overflow-y-auto rounded-md border bg-muted/20 p-2">
                                    {fallbackOptions.length > 0 ? (
                                        fallbackOptions.map((delegate) => (
                                            <label key={delegate.id} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-white">
                                                <Checkbox
                                                    checked={fallbackDelegateIds.includes(delegate.id)}
                                                    onCheckedChange={(checked) => {
                                                        setFallbackDelegateIds((prev) => {
                                                            if (checked) return prev.includes(delegate.id) ? prev : [...prev, delegate.id]
                                                            return prev.filter((id) => id !== delegate.id)
                                                        })
                                                    }}
                                                />
                                                <span>{delegate.full_name || delegate.email}</span>
                                            </label>
                                        ))
                                    ) : (
                                        <p className="text-xs text-muted-foreground">No fallback options.</p>
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground">{fallbackDelegateIds.length} selected</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <label className="flex items-center gap-2 rounded-md border p-2">
                                <Checkbox checked={allowRedelegate} onCheckedChange={(val) => setAllowRedelegate(!!val)} />
                                Allow re-delegation
                            </label>
                            <label className="flex items-center gap-2 rounded-md border p-2">
                                <Checkbox checked={notifyDelegate} onCheckedChange={(val) => setNotifyDelegate(!!val)} />
                                Notify delegate on creation
                            </label>
                            <label className="flex items-center gap-2 rounded-md border p-2">
                                <Checkbox checked={notifyDelegator} onCheckedChange={(val) => setNotifyDelegator(!!val)} />
                                Notify delegator on changes
                            </label>
                            <label className="flex items-center gap-2 rounded-md border p-2">
                                <Checkbox checked={notifyOnAction} onCheckedChange={(val) => setNotifyOnAction(!!val)} />
                                Notify on approval actions
                            </label>
                            <label className="flex items-center gap-2 rounded-md border p-2">
                                <Checkbox checked={notifyOnExpiry} onCheckedChange={(val) => setNotifyOnExpiry(!!val)} />
                                Notify on expiry
                            </label>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <Label>{t('delegate.reason', { defaultValue: 'Reason (Optional)' })}</Label>
                        <div className="flex flex-wrap gap-2">
                            {reasonTemplates.map((template) => (
                                <Button
                                    key={template}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setReason(template)}
                                >
                                    {template}
                                </Button>
                            ))}
                        </div>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t('delegate.reason_placeholder', { defaultValue: 'e.g., Out of office, vacation...' })}
                            rows={2}
                        />
                    </div>

                    <Separator />

                    <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Summary</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <p className="text-muted-foreground">Delegate</p>
                                <p className="font-medium">{selectedDelegate?.full_name || selectedDelegate?.email || 'Not selected'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Scope</p>
                                <p className="font-medium">
                                    {scopeMode === 'item'
                                        ? 'This approval only'
                                        : scopeMode === 'type'
                                            ? `All ${approvalType.replace(/_/g, ' ')} approvals`
                                            : 'All approvals in scope'}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Start</p>
                                <p className="font-medium">{format(previewStart, 'PPP p')}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">End</p>
                                <p className="font-medium">{format(previewEnd, 'PPP p')}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Max approvals</p>
                                <p className="font-medium">{maxApprovals ? maxApprovals : 'Unlimited'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Fallbacks</p>
                                <p className="font-medium">{fallbackDelegateIds.length} selected</p>
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Duration: {durationLabel}</p>
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
                        disabled={validationErrors.length > 0 || delegateMutation.isPending}
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
