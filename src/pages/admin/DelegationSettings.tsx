import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useDelegations, type Delegation } from '@/hooks/useDelegations'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions, type Permission } from '@/hooks/usePermissions'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Plus,
    Loader2,
    Clock,
    ShieldCheck,
    ShieldOff,
    CalendarRange,
    UserCheck,
    XCircle,
    AlertTriangle,
    ArrowRightLeft,
    PauseCircle,
    PlayCircle,
    Pencil,
    CalendarPlus,
} from 'lucide-react'
import { addDays, differenceInMinutes, format } from 'date-fns'
import { ALL_PERMISSIONS, PERMISSION_CATEGORIES, PERMISSION_CATEGORY_LABELS, formatPermissionLabel } from '@/lib/permissionCatalog'

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
        return errors
    }, [delegateId, startsAt, endsAt, startDate, endDate, delegationType, selectedPermissions.length, maxApprovals])

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
        if (!showDialog) return
        if (editingDelegation) {
            setDelegateId(editingDelegation.delegate_id)
            setDelegationType(editingDelegation.delegation_type)
            setSelectedPermissions(editingDelegation.permissions || [])
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
                return <Badge variant="destructive" className="text-[10px]">Full Access</Badge>
            case 'specific_permissions':
                return <Badge variant="default" className="text-[10px]">Specific Permissions</Badge>
            case 'approval_authority':
                return <Badge variant="secondary" className="text-[10px]">Approval Authority</Badge>
        }
    }

    const getStatusBadge = (delegation: Delegation) => {
        if (delegation.revoked_at) {
            return <Badge variant="outline" className="text-[10px] border-red-300 text-red-500 gap-0.5"><XCircle className="w-3 h-3" /> Revoked</Badge>
        }
        if (delegation.auto_expired || new Date(delegation.ends_at) <= new Date()) {
            return <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-500 gap-0.5"><Clock className="w-3 h-3" /> Expired</Badge>
        }
        if (!delegation.is_active) {
            return <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 gap-0.5"><PauseCircle className="w-3 h-3" /> Paused</Badge>
        }
        if (new Date(delegation.starts_at) > new Date()) {
            return <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 gap-0.5"><CalendarRange className="w-3 h-3" /> Scheduled</Badge>
        }
        return <Badge variant="default" className="text-[10px] gap-0.5 bg-green-100 text-green-700 border-0"><ShieldCheck className="w-3 h-3" /> Active</Badge>
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
                                {delegation.approvals_used ?? 0}/{delegation.max_approvals} approvals
                            </span>
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
                        Pause
                    </Button>
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
                        Resume
                    </Button>
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
                        Edit
                    </Button>
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
                        Extend 7d
                    </Button>
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
                        Revoke
                    </Button>
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
                title="Delegation Management"
                description="Manage temporary delegation of administrative permissions"
                actions={
                    <Button
                        onClick={() => {
                            setEditingDelegation(null)
                            setShowDialog(true)
                        }}
                        className="gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Delegation
                    </Button>
                }
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{activeDelegations.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Active</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-gray-400">{expiredDelegations.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Expired/Revoked</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-amber-600">{pausedDelegations.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Paused</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">
                            {activeDelegations.filter(d => d.delegator_id === user?.id).length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Delegated by Me</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-amber-600">
                            {activeDelegations.filter(d => d.delegate_id === user?.id).length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Received</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="active" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="active">
                        <ShieldCheck className="w-4 h-4 me-1" />
                        Active ({activeDelegations.length})
                    </TabsTrigger>
                    <TabsTrigger value="paused">
                        <PauseCircle className="w-4 h-4 me-1" />
                        Paused ({pausedDelegations.length})
                    </TabsTrigger>
                    <TabsTrigger value="expired">
                        <Clock className="w-4 h-4 me-1" />
                        History ({expiredDelegations.length})
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
                                <p className="text-sm text-muted-foreground">No active delegations</p>
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
                                <p className="text-sm text-muted-foreground">No paused delegations</p>
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
                                <p className="text-sm text-muted-foreground">No delegation history</p>
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
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <h4 className="text-sm font-semibold">Delegate</h4>
                                <p className="text-xs text-muted-foreground">Choose who will receive your permissions.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Delegate To</label>
                                <Select value={delegateId} onValueChange={setDelegateId}>
                                    <SelectTrigger disabled={!!editingDelegation}>
                                        <SelectValue placeholder="Select a user..." />
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
                                    <h4 className="text-sm font-semibold">Delegation Type</h4>
                                    <p className="text-xs text-muted-foreground">Define the level of access you are granting.</p>
                                </div>
                                {getDelegationTypeBadge(delegationType)}
                            </div>
                            <Select value={delegationType} onValueChange={(v) => setDelegationType(v as Delegation['delegation_type'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="approval_authority">Approval Authority</SelectItem>
                                    <SelectItem value="specific_permissions">Specific Permissions</SelectItem>
                                    <SelectItem value="full_access">Full Access</SelectItem>
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
                                    Full access grants all your permissions to the delegate.
                                </div>
                            )}
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-sm font-semibold">Schedule</h4>
                                    <p className="text-xs text-muted-foreground">Set the start and end time for this delegation.</p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={setStartNow}>
                                    Start now
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Starts At</label>
                                    <input
                                        type="datetime-local"
                                        value={startsAt}
                                        onChange={(e) => setStartsAt(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-hotel-navy"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Ends At</label>
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
                            <p className="text-[11px] text-muted-foreground">Time zone: {timeZone}</p>
                        </div>

                        {delegationType === 'specific_permissions' && (
                            <>
                                <Separator />
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h4 className="text-sm font-semibold">Permissions</h4>
                                            <p className="text-xs text-muted-foreground">Grant only the permissions needed for coverage.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedPermissions(availablePermissions)}
                                            >
                                                Select all
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedPermissions([])}
                                            >
                                                Clear
                                            </Button>
                                        </div>
                                    </div>

                                    {permissionGroups.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">No permissions available for your role.</p>
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
                                <h4 className="text-sm font-semibold">Controls & Notifications</h4>
                                <p className="text-xs text-muted-foreground">Add safeguards and decide who gets notified.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label htmlFor="max-approvals" className="text-sm font-medium">Max approvals (optional)</label>
                                    <Input
                                        id="max-approvals"
                                        type="number"
                                        min={1}
                                        value={maxApprovals}
                                        onChange={(e) => setMaxApprovals(e.target.value)}
                                        placeholder="e.g., 10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Fallback delegates</Label>
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
                                            <p className="text-xs text-muted-foreground">No fallback candidates.</p>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">{fallbackDelegateIds.length} selected</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <label className="flex items-center gap-2 rounded-md border p-2">
                                    <Checkbox checked={allowRedelegate} onCheckedChange={(val) => setAllowRedelegate(!!val)} />
                                    Allow delegate to re-delegate
                                </label>
                                <label className="flex items-center gap-2 rounded-md border p-2">
                                    <Checkbox checked={notifyDelegate} onCheckedChange={(val) => setNotifyDelegate(!!val)} />
                                    Notify delegate when created
                                </label>
                                <label className="flex items-center gap-2 rounded-md border p-2">
                                    <Checkbox checked={notifyDelegator} onCheckedChange={(val) => setNotifyDelegator(!!val)} />
                                    Notify me on changes
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
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-sm font-semibold">Reason</h4>
                                    <p className="text-xs text-muted-foreground">Optional context shown in audit logs.</p>
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
                                placeholder="e.g., On vacation, covering for leave..."
                                className="w-full px-3 py-2 border rounded-md text-sm resize-none focus:ring-2 focus:ring-hotel-navy"
                                rows={3}
                            />
                        </div>

                        <Separator />

                        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Summary</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="text-muted-foreground">Delegate</p>
                                    <p className="font-medium">
                                        {selectedDelegate?.full_name || selectedDelegate?.email || 'Not selected'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Access Level</p>
                                    <p className="font-medium">{summaryPermissionsLabel}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Duration</p>
                                    <p className="font-medium">{durationLabel}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Type</p>
                                    <p className="font-medium capitalize">{delegationType.replace(/_/g, ' ')}</p>
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
                            Cancel
                        </Button>
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
