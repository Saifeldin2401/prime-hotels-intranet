import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useDelegations, type Delegation } from '@/hooks/useDelegations'
import { usePermissions, type Permission } from '@/hooks/usePermissions'
import { ALL_PERMISSIONS, PERMISSION_CATEGORIES, PERMISSION_CATEGORY_LABELS, formatPermissionLabel } from '@/lib/permissionCatalog'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { addDays, differenceInMinutes, format } from 'date-fns'
import {
    AlertTriangle,
    ArrowRightLeft,
    CalendarPlus,
    CalendarRange,
    Clock,
    Loader2,
    PauseCircle,
    Pencil,
    PlayCircle,
    Plus,
    ShieldCheck,
    ShieldOff,
    UserCheck,
    XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from "react-i18next"

const toLocalInputValue = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

const roundToNextQuarterHour = (date: Date) => {
    const ms = 15 * 60 * 1000
    return new Date(Math.ceil(date.getTime() / ms) * ms)
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
    'On vacation',
    'Out of office',
    'Coverage for leave',
    'Training coverage',
]

const durationPresets = [
    { label: '1 day', days: 1 },
    { label: '3 days', days: 3 },
    { label: '1 week', days: 7 },
    { label: '2 weeks', days: 14 },
    { label: '1 month', days: 30 },
]

export default function DelegationSettings() {
    const { t: t_ext } = useTranslation('extracted');
    const { user } = useAuth()
    const { hasPermission } = usePermissions()
    const {
        activeDelegations,
        pausedDelegations,
        expiredDelegations,
        isLoading,
        createDelegation,
        updateDelegation,
        revokeDelegation,
        pauseDelegation,
        resumeDelegation,
        expireDelegations,
    } = useDelegations()

    const [showDialog, setShowDialog] = useState(false)
    const [editingDelegation, setEditingDelegation] = useState<Delegation | null>(null)
    const [delegateId, setDelegateId] = useState('')
    const [delegationType, setDelegationType] = useState<Delegation['delegation_type']>('approval_authority')
    const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([])
    const [permissionsInitialized, setPermissionsInitialized] = useState(false)
    const [maxApprovals, setMaxApprovals] = useState('')
    const [allowRedelegate, setAllowRedelegate] = useState(false)
    const [fallbackDelegateIds, setFallbackDelegateIds] = useState<string[]>([])
    const [notifyDelegate, setNotifyDelegate] = useState(true)
    const [notifyDelegator, setNotifyDelegator] = useState(true)
    const [notifyOnAction, setNotifyOnAction] = useState(true)
    const [notifyOnExpiry, setNotifyOnExpiry] = useState(true)
    const [reason, setReason] = useState('')
    const [startsAt, setStartsAt] = useState('')
    const [endsAt, setEndsAt] = useState('')
    const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false)

    // Auto-expire on mount
    useEffect(() => {
        expireDelegations.mutate()
    }, [expireDelegations])

    // Fetch staff for delegate picker
    const { data: staffOptions = [] } = useQuery({
        queryKey: ['delegation-staff'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('is_active', true)
                .neq('id', user?.id || '')
                .order('full_name')
                .limit(100)

            if (error) throw error
            return data
        },
    })

    const availablePermissions = useMemo(
        () => ALL_PERMISSIONS.filter(permission => hasPermission(permission)),
        [hasPermission]
    )

    const permissionGroups = useMemo(() => {
        return Object.entries(PERMISSION_CATEGORIES)
            .map(([category, permissions]) => {
                const allowed = permissions.filter(permission => availablePermissions.includes(permission))
                if (allowed.length === 0) return null
                return { category, permissions: allowed }
            })
            .filter(Boolean) as { category: string; permissions: Permission[] }[]
    }, [availablePermissions])

    const startDate = useMemo(() => (startsAt ? new Date(startsAt) : null), [startsAt])
    const endDate = useMemo(() => (endsAt ? new Date(endsAt) : null), [endsAt])

    const warningMessages = useMemo(() => {
        if (!delegateId || !startDate || !endDate) return []
        const warnings: string[] = []
        const overlaps = activeDelegations.filter((delegation) => {
            if (delegation.delegate_id !== delegateId) return false
            const existingStart = new Date(delegation.starts_at)
            const existingEnd = new Date(delegation.ends_at)
            return startDate <= existingEnd && endDate >= existingStart
        })
        if (overlaps.length > 0) {
            warnings.push('The selected delegate already has an overlapping active delegation.')
        }
        const myOverlaps = activeDelegations.filter((delegation) => {
            if (delegation.delegator_id !== user?.id) return false
            const existingStart = new Date(delegation.starts_at)
            const existingEnd = new Date(delegation.ends_at)
            return startDate <= existingEnd && endDate >= existingStart
        })
        if (myOverlaps.length > 0) {
            warnings.push('You already have another active delegation overlapping this timeframe.')
        }
        return warnings
    }, [activeDelegations, delegateId, endDate, startDate, user?.id])

    useEffect(() => {
        if (warningMessages.length === 0) {
            setAcknowledgeWarnings(false)
        }
    }, [warningMessages.length])

    const validationErrors = useMemo(() => {
        const errors: string[] = []
        if (!delegateId) errors.push('Select a delegate.')
        if (!startsAt) errors.push('Choose a start time.')
        if (!endsAt) errors.push('Choose an end time.')
        if (startDate && endDate && endDate <= startDate) errors.push('End time must be after the start time.')
        if (delegationType === 'specific_permissions' && selectedPermissions.length === 0) {
            errors.push('Select at least one permission or switch to another delegation type.')
        }
        if (maxApprovals && Number(maxApprovals) < 1) {
            errors.push('Max approvals must be at least 1.')
        }
        if (warningMessages.length > 0 && !reason.trim()) {
            errors.push('Add a reason because this delegation has warnings.')
        }
        if (warningMessages.length > 0 && !acknowledgeWarnings) {
            errors.push('Acknowledge the warnings to proceed.')
        }
        return errors
    }, [
        delegateId,
        startsAt,
        endsAt,
        startDate,
        endDate,
        delegationType,
        selectedPermissions.length,
        maxApprovals,
        warningMessages.length,
        reason,
        acknowledgeWarnings,
    ])

    useEffect(() => {
        if (!showDialog) return
        if (editingDelegation) {
            setDelegateId(editingDelegation.delegate_id)
            setDelegationType(editingDelegation.delegation_type)
            const normalizedPermissions = (editingDelegation.permissions || []).filter(
                (permission): permission is Permission => ALL_PERMISSIONS.includes(permission as Permission)
            )
            setSelectedPermissions(normalizedPermissions)
            setPermissionsInitialized(true)
            setMaxApprovals(editingDelegation.max_approvals ? String(editingDelegation.max_approvals) : '')
            setAllowRedelegate(!!editingDelegation.allow_redelegate)
            setFallbackDelegateIds(editingDelegation.fallback_delegate_ids || [])
            setNotifyDelegate(editingDelegation.notify_delegate ?? true)
            setNotifyDelegator(editingDelegation.notify_delegator ?? true)
            setNotifyOnAction(editingDelegation.notify_on_action ?? true)
            setNotifyOnExpiry(editingDelegation.notify_on_expiry ?? true)
            setReason(editingDelegation.reason || '')
            setStartsAt(toLocalInputValue(new Date(editingDelegation.starts_at)))
            setEndsAt(toLocalInputValue(new Date(editingDelegation.ends_at)))
            return
        }

        const start = roundToNextQuarterHour(new Date())
        const end = addDays(start, 7)
        setDelegateId('')
        setDelegationType('approval_authority')
        setSelectedPermissions([])
        setPermissionsInitialized(false)
        setMaxApprovals('')
        setAllowRedelegate(false)
        setFallbackDelegateIds([])
        setNotifyDelegate(true)
        setNotifyDelegator(true)
        setNotifyOnAction(true)
        setNotifyOnExpiry(true)
        setReason('')
        setAcknowledgeWarnings(false)
        setStartsAt(toLocalInputValue(start))
        setEndsAt(toLocalInputValue(end))
    }, [editingDelegation, showDialog])

    useEffect(() => {
        if (delegationType !== 'specific_permissions') return
        if (permissionsInitialized) return
        setSelectedPermissions(availablePermissions)
        setPermissionsInitialized(true)
    }, [delegationType, permissionsInitialized, availablePermissions])

    const handleSave = () => {
        if (validationErrors.length > 0) return

        const payload = {
            delegation_type: delegationType,
            permissions: delegationType === 'specific_permissions' ? selectedPermissions : undefined,
            max_approvals: maxApprovals ? Number(maxApprovals) : null,
            allow_redelegate: allowRedelegate,
            fallback_delegate_ids: fallbackDelegateIds,
            notify_delegate: notifyDelegate,
            notify_delegator: notifyDelegator,
            notify_on_action: notifyOnAction,
            notify_on_expiry: notifyOnExpiry,
            reason: reason || undefined,
            starts_at: new Date(startsAt).toISOString(),
            ends_at: new Date(endsAt).toISOString(),
        }

        const onSuccess = () => {
            setShowDialog(false)
            setEditingDelegation(null)
            setDelegateId('')
            setSelectedPermissions([])
            setPermissionsInitialized(false)
            setMaxApprovals('')
            setAllowRedelegate(false)
            setFallbackDelegateIds([])
            setNotifyDelegate(true)
            setNotifyDelegator(true)
            setNotifyOnAction(true)
            setNotifyOnExpiry(true)
            setReason('')
            setStartsAt('')
            setEndsAt('')
        }

        if (editingDelegation) {
            updateDelegation.mutate({ id: editingDelegation.id, updates: payload }, { onSuccess })
            return
        }

        createDelegation.mutate({ delegate_id: delegateId, ...payload }, { onSuccess })
    }

    const getDelegationTypeBadge = (type: Delegation['delegation_type']) => {
        switch (type) {
            case 'full_access':
                return <Badge variant="destructive" className="text-[10px]">{t_ext('full_access', 'Full Access')}</Badge>
            case 'specific_permissions':
                return <Badge variant="default" className="text-[10px]">{t_ext('specific_permissions', 'Specific Permissions')}</Badge>
            case 'approval_authority':
                return <Badge variant="secondary" className="text-[10px]">{t_ext('approval_authority', 'Approval Authority')}</Badge>
        }
    }

    const getStatusBadge = (delegation: Delegation) => {
        if (delegation.revoked_at) {
            return <Badge variant="outline" className="text-[10px] border-red-300 text-red-500 gap-0.5"><XCircle className="w-3 h-3" /> {t_ext('revoked', 'Revoked')}</Badge>
        }
        if (delegation.auto_expired || new Date(delegation.ends_at) <= new Date()) {
            return <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-500 gap-0.5"><Clock className="w-3 h-3" /> {t_ext('expired', 'Expired')}</Badge>
        }
        if (!delegation.is_active) {
            return <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 gap-0.5"><PauseCircle className="w-3 h-3" /> {t_ext('paused', 'Paused')}</Badge>
        }
        if (new Date(delegation.starts_at) > new Date()) {
            return <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 gap-0.5"><CalendarRange className="w-3 h-3" /> {t_ext('scheduled', 'Scheduled')}</Badge>
        }
        return <Badge variant="default" className="text-[10px] gap-0.5 bg-green-100 text-green-700 border-0"><ShieldCheck className="w-3 h-3" /> {t_ext('active', 'Active')}</Badge>
    }

    const renderDelegationCard = (delegation: Delegation, showRevoke: boolean = false) => (
        <div key={delegation.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 gap-3">
            <div className="flex items-center gap-3">
                <ArrowRightLeft className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                            {delegation.delegator?.full_name || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-400">→</span>
                        <span className="text-sm font-medium">
                            {delegation.delegate?.full_name || 'Unknown'}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        {getDelegationTypeBadge(delegation.delegation_type)}
                        {getStatusBadge(delegation)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                        <span className="flex items-center gap-0.5">
                            <CalendarRange className="w-3 h-3" />
                            {new Date(delegation.starts_at).toLocaleDateString()} — {new Date(delegation.ends_at).toLocaleDateString()}
                        </span>

                        {delegation.max_approvals ? (
                            <span className="flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                {delegation.approvals_used ?? 0}/{delegation.max_approvals} {t_ext('approvals', 'approvals')}</span>
                        ) : null}

                        {delegation.reason && (
                            <span className="truncate max-w-[200px]">{delegation.reason}</span>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 ps-8 sm:ps-0">
                {showRevoke && delegation.is_active && new Date(delegation.ends_at) > new Date() && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                        onClick={() => pauseDelegation.mutate(delegation.id)}
                        disabled={pauseDelegation.isPending}
                    >
                        <PauseCircle className="w-3.5 h-3.5 me-1" />
                        {t_ext('pause', 'Pause')}</Button>
                )}
                {showRevoke && !delegation.is_active && !delegation.revoked_at && new Date(delegation.ends_at) > new Date() && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => resumeDelegation.mutate(delegation.id)}
                        disabled={resumeDelegation.isPending}
                    >
                        <PlayCircle className="w-3.5 h-3.5 me-1" />
                        {t_ext('resume', 'Resume')}</Button>
                )}
                {showRevoke && new Date(delegation.ends_at) > new Date() && !delegation.revoked_at && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                            setEditingDelegation(delegation)
                            setShowDialog(true)
                        }}
                    >
                        <Pencil className="w-3.5 h-3.5 me-1" />
                        {t_ext('edit', 'Edit')}</Button>
                )}
                {showRevoke && delegation.is_active && new Date(delegation.ends_at) > new Date() && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                            const updatedEnd = addDays(new Date(delegation.ends_at), 7)
                            updateDelegation.mutate({
                                id: delegation.id,
                                updates: { ends_at: updatedEnd.toISOString() }
                            })
                        }}
                        disabled={updateDelegation.isPending}
                    >
                        <CalendarPlus className="w-3.5 h-3.5 me-1" />
                        {t_ext('extend_7d', 'Extend 7d')}</Button>
                )}
                {showRevoke && delegation.is_active && new Date(delegation.ends_at) > new Date() && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => revokeDelegation.mutate(delegation.id)}
                        disabled={revokeDelegation.isPending}
                    >
                        <ShieldOff className="w-3.5 h-3.5 me-1" />
                        {t_ext('revoke', 'Revoke')}</Button>
                )}
            </div>
        </div>
    )

    const selectedDelegate = staffOptions.find(option => option.id === delegateId)
    const fallbackOptions = staffOptions.filter(option => option.id !== delegateId)
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const durationLabel = startDate && endDate ? getDurationLabel(startDate, endDate) : '—'

    const summaryPermissionsLabel = delegationType === 'specific_permissions'
        ? `${selectedPermissions.length} selected`
        : delegationType === 'full_access'
            ? 'All permissions'
            : 'Approval authority scope'

    const applyDurationPreset = (days: number) => {
        const baseStart = startDate ?? roundToNextQuarterHour(new Date())
        setStartsAt(toLocalInputValue(baseStart))
        setEndsAt(toLocalInputValue(addDays(baseStart, days)))
    }

    const setStartNow = () => {
        const start = roundToNextQuarterHour(new Date())
        setStartsAt(toLocalInputValue(start))
        if (!endDate || endDate <= start) {
            setEndsAt(toLocalInputValue(addDays(start, 7)))
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t_ext('delegation_management', 'Delegation Management')}
                description={t_ext('manage_temporary_delegation_of_administr', 'Manage temporary delegation of administrative permissions')}
                actions={
                    <Button
                        onClick={() => {
                            setEditingDelegation(null)
                            setShowDialog(true)
                        }}
                        className="gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        {t_ext('new_delegation', 'New Delegation')}</Button>
                }
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{activeDelegations.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t_ext('active', 'Active')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-gray-400">{expiredDelegations.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t_ext('expired_revoked', 'Expired/Revoked')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-amber-600">{pausedDelegations.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t_ext('paused', 'Paused')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">
                            {activeDelegations.filter(d => d.delegator_id === user?.id).length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{t_ext('delegated_by_me', 'Delegated by Me')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-amber-600">
                            {activeDelegations.filter(d => d.delegate_id === user?.id).length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{t_ext('received', 'Received')}</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="active" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="active">
                        <ShieldCheck className="w-4 h-4 me-1" />
                        {t_ext('active_1', 'Active (')}{activeDelegations.length})
                    </TabsTrigger>
                    <TabsTrigger value="paused">
                        <PauseCircle className="w-4 h-4 me-1" />
                        {t_ext('paused_1', 'Paused (')}{pausedDelegations.length})
                    </TabsTrigger>
                    <TabsTrigger value="expired">
                        <Clock className="w-4 h-4 me-1" />
                        {t_ext('history', 'History (')}{expiredDelegations.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : activeDelegations.length > 0 ? (
                        <div className="space-y-2">
                            {activeDelegations.map(d => renderDelegationCard(d, true))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="py-8 text-center">
                                <UserCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">{t_ext('no_active_delegations', 'No active delegations')}</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="paused">
                    {pausedDelegations.length > 0 ? (
                        <div className="space-y-2">
                            {pausedDelegations.map(d => renderDelegationCard(d, true))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="py-8 text-center">
                                <PauseCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">{t_ext('no_paused_delegations', 'No paused delegations')}</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="expired">
                    {expiredDelegations.length > 0 ? (
                        <div className="space-y-2">
                            {expiredDelegations.map(d => renderDelegationCard(d, false))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="py-8 text-center">
                                <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">{t_ext('no_delegation_history', 'No delegation history')}</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Create Delegation Dialog */}
            <Dialog
                open={showDialog}
                onOpenChange={(open) => {
                    setShowDialog(open)
                    if (!open) setEditingDelegation(null)
                }}
            >
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowRightLeft className="w-5 h-5" />
                            {editingDelegation ? 'Edit Delegation' : 'Create New Delegation'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingDelegation
                                ? 'Update the delegation schedule, limits, and notifications.'
                                : 'Temporarily delegate your administrative permissions to another user'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-2">
                        {validationErrors.length > 0 && (
                            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div className="space-y-1">
                                        {validationErrors.map((message) => (
                                            <p key={message}>{message}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {warningMessages.length > 0 && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div className="space-y-1">
                                        {warningMessages.map((message) => (
                                            <p key={message}>{message}</p>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-3 flex items-start gap-2 text-amber-900">
                                    <Checkbox
                                        checked={acknowledgeWarnings}
                                        onCheckedChange={(value) => setAcknowledgeWarnings(value === true)}
                                        id="acknowledge-warnings"
                                    />
                                    <Label htmlFor="acknowledge-warnings" className="text-xs">
                                        {t_ext('i_understand_the_warnings_and_want_to_pr', 'I understand the warnings and want to proceed.')}</Label>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <h4 className="text-sm font-semibold">{t_ext('delegate', 'Delegate')}</h4>
                                <p className="text-xs text-muted-foreground">{t_ext('choose_who_will_receive_your_permissions', 'Choose who will receive your permissions.')}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t_ext('delegate_to', 'Delegate To')}</label>
                                <Select value={delegateId} onValueChange={setDelegateId}>
                                    <SelectTrigger disabled={!!editingDelegation}>
                                        <SelectValue placeholder={t_ext('select_a_user', 'Select a user...')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {staffOptions.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.full_name || s.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedDelegate && (
                                <div className="rounded-md border bg-muted/20 p-3 text-xs">
                                    <p className="font-medium">{selectedDelegate.full_name || selectedDelegate.email}</p>
                                    <p className="text-muted-foreground">{selectedDelegate.email}</p>
                                </div>
                            )}
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-sm font-semibold">{t_ext('delegation_type', 'Delegation Type')}</h4>
                                    <p className="text-xs text-muted-foreground">{t_ext('define_the_level_of_access_you_are_grant', 'Define the level of access you are granting.')}</p>
                                </div>
                                {getDelegationTypeBadge(delegationType)}
                            </div>
                            <Select value={delegationType} onValueChange={(v) => setDelegationType(v as Delegation['delegation_type'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="approval_authority">{t_ext('approval_authority', 'Approval Authority')}</SelectItem>
                                    <SelectItem value="specific_permissions">{t_ext('specific_permissions', 'Specific Permissions')}</SelectItem>
                                    <SelectItem value="full_access">{t_ext('full_access', 'Full Access')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {delegationType === 'approval_authority'
                                    ? 'Allow the delegate to act on approvals without broader system access.'
                                    : delegationType === 'specific_permissions'
                                        ? 'Select exactly which permissions to grant.'
                                        : 'Grant all permissions you currently hold.'}
                            </p>
                            {delegationType === 'full_access' && (
                                <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    {t_ext('full_access_grants_all_your_permissions_', 'Full access grants all your permissions to the delegate.')}</div>
                            )}
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-sm font-semibold">{t_ext('schedule', 'Schedule')}</h4>
                                    <p className="text-xs text-muted-foreground">{t_ext('set_the_start_and_end_time_for_this_dele', 'Set the start and end time for this delegation.')}</p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={setStartNow}>
                                    {t_ext('start_now', 'Start now')}</Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t_ext('starts_at', 'Starts At')}</label>
                                    <input
                                        type="datetime-local"
                                        value={startsAt}
                                        onChange={(e) => setStartsAt(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-hotel-navy"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t_ext('ends_at', 'Ends At')}</label>
                                    <input
                                        type="datetime-local"
                                        value={endsAt}
                                        onChange={(e) => setEndsAt(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-hotel-navy"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {durationPresets.map((preset) => (
                                    <Button
                                        key={preset.label}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyDurationPreset(preset.days)}
                                    >
                                        {preset.label}
                                    </Button>
                                ))}
                            </div>
                            <p className="text-[11px] text-muted-foreground">{t_ext('time_zone', 'Time zone:')}{timeZone}</p>
                        </div>

                        {delegationType === 'specific_permissions' && (
                            <>
                                <Separator />
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h4 className="text-sm font-semibold">{t_ext('permissions', 'Permissions')}</h4>
                                            <p className="text-xs text-muted-foreground">{t_ext('grant_only_the_permissions_needed_for_co', 'Grant only the permissions needed for coverage.')}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedPermissions(availablePermissions)}
                                            >
                                                {t_ext('select_all', 'Select all')}</Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedPermissions([])}
                                            >
                                                {t_ext('clear', 'Clear')}</Button>
                                        </div>
                                    </div>

                                    {permissionGroups.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">{t_ext('no_permissions_available_for_your_role', 'No permissions available for your role.')}</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {permissionGroups.map((group) => (
                                                <div key={group.category} className="space-y-2">
                                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                        {PERMISSION_CATEGORY_LABELS[group.category] || group.category}
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {group.permissions.map((permission) => {
                                                            const isChecked = selectedPermissions.includes(permission)
                                                            return (
                                                                <label
                                                                    key={permission}
                                                                    className="flex items-center gap-2 rounded-md border p-2 text-xs hover:bg-muted/30"
                                                                >
                                                                    <Checkbox
                                                                        checked={isChecked}
                                                                        onCheckedChange={(checked) => {
                                                                            setSelectedPermissions((prev) => {
                                                                                if (checked) {
                                                                                    return prev.includes(permission) ? prev : [...prev, permission]
                                                                                }
                                                                                return prev.filter((item) => item !== permission)
                                                                            })
                                                                        }}
                                                                    />
                                                                    <span className="capitalize">{formatPermissionLabel(permission)}</span>
                                                                </label>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <Separator />

                        <div className="space-y-3">
                            <div>
                                <h4 className="text-sm font-semibold">{t_ext('controls_notifications', 'Controls & Notifications')}</h4>
                                <p className="text-xs text-muted-foreground">{t_ext('add_safeguards_and_decide_who_gets_notif', 'Add safeguards and decide who gets notified.')}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label htmlFor="max-approvals" className="text-sm font-medium">{t_ext('max_approvals_optional', 'Max approvals (optional)')}</label>
                                    <Input
                                        id="max-approvals"
                                        type="number"
                                        min={1}
                                        value={maxApprovals}
                                        onChange={(e) => setMaxApprovals(e.target.value)}
                                        placeholder={t_ext('e_g_10', 'e.g., 10')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t_ext('fallback_delegates', 'Fallback delegates')}</Label>
                                    <div className="max-h-32 overflow-y-auto rounded-md border bg-muted/20 p-2">
                                        {fallbackOptions.length > 0 ? (
                                            fallbackOptions.map((option) => (
                                                <label key={option.id} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-white">
                                                    <Checkbox
                                                        checked={fallbackDelegateIds.includes(option.id)}
                                                        onCheckedChange={(checked) => {
                                                            setFallbackDelegateIds((prev) => {
                                                                if (checked) return prev.includes(option.id) ? prev : [...prev, option.id]
                                                                return prev.filter((id) => id !== option.id)
                                                            })
                                                        }}
                                                    />
                                                    <span>{option.full_name || option.email}</span>
                                                </label>
                                            ))
                                        ) : (
                                            <p className="text-xs text-muted-foreground">{t_ext('no_fallback_candidates', 'No fallback candidates.')}</p>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">{fallbackDelegateIds.length} {t_ext('selected', 'selected')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <label className="flex items-center gap-2 rounded-md border p-2">
                                    <Checkbox checked={allowRedelegate} onCheckedChange={(val) => setAllowRedelegate(!!val)} />
                                    {t_ext('allow_delegate_to_re_delegate', 'Allow delegate to re-delegate')}</label>
                                <label className="flex items-center gap-2 rounded-md border p-2">
                                    <Checkbox checked={notifyDelegate} onCheckedChange={(val) => setNotifyDelegate(!!val)} />
                                    {t_ext('notify_delegate_when_created', 'Notify delegate when created')}</label>
                                <label className="flex items-center gap-2 rounded-md border p-2">
                                    <Checkbox checked={notifyDelegator} onCheckedChange={(val) => setNotifyDelegator(!!val)} />
                                    {t_ext('notify_me_on_changes', 'Notify me on changes')}</label>
                                <label className="flex items-center gap-2 rounded-md border p-2">
                                    <Checkbox checked={notifyOnAction} onCheckedChange={(val) => setNotifyOnAction(!!val)} />
                                    {t_ext('notify_on_approval_actions', 'Notify on approval actions')}</label>
                                <label className="flex items-center gap-2 rounded-md border p-2">
                                    <Checkbox checked={notifyOnExpiry} onCheckedChange={(val) => setNotifyOnExpiry(!!val)} />
                                    {t_ext('notify_on_expiry', 'Notify on expiry')}</label>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-sm font-semibold">{t_ext('reason', 'Reason')}</h4>
                                    <p className="text-xs text-muted-foreground">{t_ext('optional_context_shown_in_audit_logs', 'Optional context shown in audit logs.')}</p>
                                </div>
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
                            </div>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={t_ext('e_g_on_vacation_covering_for_leave', 'e.g., On vacation, covering for leave...')}
                                className="w-full px-3 py-2 border rounded-md text-sm resize-none focus:ring-2 focus:ring-hotel-navy"
                                rows={3}
                            />
                        </div>

                        <Separator />

                        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t_ext('summary', 'Summary')}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="text-muted-foreground">{t_ext('delegate', 'Delegate')}</p>
                                    <p className="font-medium">
                                        {selectedDelegate?.full_name || selectedDelegate?.email || 'Not selected'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">{t_ext('access_level', 'Access Level')}</p>
                                    <p className="font-medium">{summaryPermissionsLabel}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">{t_ext('duration', 'Duration')}</p>
                                    <p className="font-medium">{durationLabel}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">{t_ext('type', 'Type')}</p>
                                    <p className="font-medium capitalize">{delegationType.replace(/_/g, ' ')}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">{t_ext('max_approvals', 'Max approvals')}</p>
                                    <p className="font-medium">{maxApprovals ? maxApprovals : 'Unlimited'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">{t_ext('fallbacks', 'Fallbacks')}</p>
                                    <p className="font-medium">{fallbackDelegateIds.length} {t_ext('selected', 'selected')}</p>
                                </div>
                            </div>
                            {startDate && endDate && (
                                <p className="text-[11px] text-muted-foreground">
                                    {format(startDate, 'PPpp')} — {format(endDate, 'PPpp')}
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDialog(false)
                                setEditingDelegation(null)
                            }}
                        >
                            {t_ext('cancel', 'Cancel')}</Button>
                        <Button
                            onClick={handleSave}
                            disabled={validationErrors.length > 0 || createDelegation.isPending || updateDelegation.isPending}
                        >
                            {(createDelegation.isPending || updateDelegation.isPending) && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                            {editingDelegation ? 'Save Changes' : 'Create Delegation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
