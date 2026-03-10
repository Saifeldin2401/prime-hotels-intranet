import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUserBulkOperations } from '@/hooks/useUserBulkOperations'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ShieldOff, ShieldCheck, KeyRound, UserCog, Loader2, X } from 'lucide-react'
import { ROLES, type AppRole } from '@/lib/constants'

interface UserBulkActionsBarProps {
    selectedIds: Set<string>
    onClearSelection: () => void
    userNames?: Map<string, string> // userId → displayName for confirmation
}

export function UserBulkActionsBar({ selectedIds, onClearSelection, userNames }: UserBulkActionsBarProps) {
    const { t } = useTranslation(['users', 'common'])
    const { bulkAssignRole, bulkDeactivate, bulkActivate, bulkForcePasswordReset, isLoading } = useUserBulkOperations()

    const [dialogOpen, setDialogOpen] = useState(false)
    const [dialogAction, setDialogAction] = useState<'assign_role' | 'deactivate' | 'activate' | 'reset_password' | null>(null)
    const [selectedRole, setSelectedRole] = useState<AppRole | ''>('')
    const [bulkReason, setBulkReason] = useState('')
    const [suspendUntil, setSuspendUntil] = useState('')
    const [notifyUser, setNotifyUser] = useState(true)
    const [actionNote, setActionNote] = useState('')

    const count = selectedIds.size
    if (count === 0) return null

    const openDialog = (action: typeof dialogAction) => {
        setDialogAction(action)
        setSelectedRole('')
        setBulkReason('')
        setSuspendUntil('')
        setNotifyUser(true)
        setActionNote('')
        setDialogOpen(true)
    }

    const executeAction = async () => {
        const ids = Array.from(selectedIds)

        switch (dialogAction) {
            case 'assign_role':
                if (!selectedRole) return
                await bulkAssignRole.mutateAsync({ userIds: ids, role: selectedRole as AppRole })
                break
            case 'deactivate':
                await bulkDeactivate.mutateAsync({
                    userIds: ids,
                    reason: bulkReason || undefined,
                    suspendUntil: suspendUntil ? new Date(suspendUntil).toISOString() : undefined,
                    notifyUser,
                    note: actionNote || undefined
                })
                break
            case 'activate':
                await bulkActivate.mutateAsync({ userIds: ids, notifyUser, note: actionNote || undefined })
                break
            case 'reset_password':
                await bulkForcePasswordReset.mutateAsync({ userIds: ids, notifyUser, note: actionNote || undefined })
                break
        }

        setDialogOpen(false)
        onClearSelection()
    }

    return (
        <TooltipProvider>
            <div className="bg-hotel-navy text-white rounded-lg p-3 flex flex-wrap items-center gap-3 shadow-lg animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                        {t('bulk.selected', { count })}
                    </Badge>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10"
                                onClick={onClearSelection}
                                aria-label={t('common:clearselection')}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {t('common:clearselection')}
                        </TooltipContent>
                    </Tooltip>
                </div>

                <div className="flex items-center gap-2 ms-auto flex-wrap">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs gap-1.5 bg-white/10 hover:bg-white/20 text-white border-0"
                        onClick={() => openDialog('assign_role')}
                        disabled={isLoading}
                    >
                        <UserCog className="w-3.5 h-3.5" />
                        {t('bulk.assign_role')}
                    </Button>

                    <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs gap-1.5 bg-white/10 hover:bg-white/20 text-white border-0"
                        onClick={() => openDialog('activate')}
                        disabled={isLoading}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {t('bulk.activate')}
                    </Button>

                    <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs gap-1.5 bg-white/10 hover:bg-white/20 text-white border-0"
                        onClick={() => openDialog('reset_password')}
                        disabled={isLoading}
                    >
                        <KeyRound className="w-3.5 h-3.5" />
                        {t('bulk.reset_password')}
                    </Button>

                    <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 border-0"
                        onClick={() => openDialog('deactivate')}
                        disabled={isLoading}
                    >
                        <ShieldOff className="w-3.5 h-3.5" />
                        {t('bulk.deactivate')}
                    </Button>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {dialogAction && t(`bulk.${dialogAction}`)}
                        </DialogTitle>
                        <DialogDescription>
                            {t('bulk.confirm_bulk', { count })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* User list preview */}
                        {userNames && userNames.size > 0 && (
                            <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
                                <p className="text-xs font-medium text-gray-500 mb-1">Affected Users:</p>
                                <div className="flex flex-wrap gap-1">
                                    {Array.from(selectedIds).slice(0, 10).map(id => (
                                        <Badge key={id} variant="outline" className="text-[10px]">
                                            {userNames.get(id) || id.slice(0, 8)}
                                        </Badge>
                                    ))}
                                    {selectedIds.size > 10 && (
                                        <Badge variant="outline" className="text-[10px]">
                                            +{selectedIds.size - 10} more
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}

                        {dialogAction === 'assign_role' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('bulk.assign_role')}
                                </label>
                                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('form.select_role', 'Select a role')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(ROLES).map(([key, val]) => (
                                            <SelectItem key={key} value={key}>{val.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {dialogAction === 'deactivate' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('account_actions.suspend_reason')}
                                </label>
                                <textarea
                                    value={bulkReason}
                                    onChange={(e) => setBulkReason(e.target.value)}
                                    placeholder={t('account_actions.suspend_reason_placeholder')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-hotel-navy focus:border-hotel-navy resize-none"
                                    rows={3}
                                />
                            </div>
                        )}

                        {(dialogAction === 'deactivate') && (
                            <div>
                                <Label className="text-sm font-medium text-gray-700 mb-1">Suspend Until (Optional)</Label>
                                <input
                                    type="datetime-local"
                                    value={suspendUntil}
                                    onChange={(e) => setSuspendUntil(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-hotel-navy focus:border-hotel-navy"
                                />
                            </div>
                        )}

                        {dialogAction !== 'assign_role' && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox id="notify-users" checked={notifyUser} onCheckedChange={(checked) => setNotifyUser(!!checked)} />
                                    <Label htmlFor="notify-users" className="text-sm">Notify affected users</Label>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-1">Internal Note (Optional)</Label>
                                    <textarea
                                        value={actionNote}
                                        onChange={(e) => setActionNote(e.target.value)}
                                        placeholder="Add a note for audit trail"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-hotel-navy focus:border-hotel-navy resize-none"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button
                            onClick={executeAction}
                            disabled={isLoading || (dialogAction === 'assign_role' && !selectedRole)}
                            variant={dialogAction === 'deactivate' ? 'destructive' : 'default'}
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                            {dialogAction && t(`bulk.${dialogAction}`)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}
