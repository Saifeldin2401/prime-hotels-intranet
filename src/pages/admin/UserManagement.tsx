import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { UserForm } from '@/components/admin/UserForm'
import { EmptyState } from '@/components/shared/EmptyState'
import { Plus, Users, Loader2, Trash2, Edit, MoreVertical, ShieldOff, ShieldCheck, KeyRound, Unlock, AlertTriangle, Clock, CheckSquare, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeleteConfirmation } from '@/components/shared/DeleteConfirmation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useAccountActions } from '@/hooks/useAccountActions'
import { UserBulkActionsBar } from '@/components/admin/UserBulkActionsBar'
import type { Profile } from '@/lib/types'
import { useTranslation } from 'react-i18next'

type AccountStatusFilter = 'all' | 'active' | 'suspended' | 'locked' | 'inactive'

export default function UserManagement() {
  const { t } = useTranslation('users')
  const [showForm, setShowForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<AccountStatusFilter>('all')

  // Account action dialog state
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'suspend' | 'reactivate' | 'force_password_reset' | 'unlock' | null>(null)
  const [actionTargetUser, setActionTargetUser] = useState<Profile | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendUntil, setSuspendUntil] = useState('')
  const [notifyUser, setNotifyUser] = useState(true)
  const [actionNote, setActionNote] = useState('')

  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  const { suspendAccount, reactivateAccount, forcePasswordReset, unlockAccount, isLoading: isActionLoading } = useAccountActions()

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Profile[]
    },
  })

  const actionNotesQuery = useQuery({
    queryKey: ['account-action-notes', actionTargetUser?.id],
    enabled: !!actionTargetUser?.id && actionDialogOpen,
    queryFn: async () => {
      if (!actionTargetUser?.id) return []
      const { data, error } = await supabase
        .from('account_action_notes')
        .select('id, action, note, created_at, created_by:profiles(id, full_name, email)')
        .eq('user_id', actionTargetUser.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      return data || []
    }
  })

  // Delete/Deactivate Logic
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null)

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      refetch()
      setDeleteConfirmOpen(false)
      setUserToDelete(null)
    }
  })

  // Filter users by search + status
  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    switch (statusFilter) {
      case 'active':
        return user.is_active && (user.account_status === 'active' || !user.account_status)
      case 'suspended':
        return user.account_status === 'suspended'
      case 'locked':
        return user.account_status === 'locked'
      case 'inactive':
        return !user.is_active
      default:
        return true
    }
  })

  const handleEdit = (user: Profile) => {
    setSelectedUser(user)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedUser(null)
    refetch()
  }

  // Account action handlers
  const openActionDialog = (user: Profile, action: typeof actionType) => {
    setActionTargetUser(user)
    setActionType(action)
    setSuspendReason('')
    setSuspendUntil('')
    setNotifyUser(true)
    setActionNote('')
    setActionDialogOpen(true)
  }

  const executeAction = async () => {
    if (!actionTargetUser || !actionType) return

    try {
      switch (actionType) {
        case 'suspend':
          await suspendAccount(actionTargetUser.id, suspendReason, {
            suspendUntil: suspendUntil ? new Date(suspendUntil).toISOString() : undefined,
            notifyUser,
            note: actionNote || undefined
          })
          break
        case 'reactivate':
          await reactivateAccount(actionTargetUser.id, {
            notifyUser,
            note: actionNote || undefined
          })
          break
        case 'force_password_reset':
          await forcePasswordReset(actionTargetUser.id, {
            notifyUser,
            note: actionNote || undefined
          })
          break
        case 'unlock':
          await unlockAccount(actionTargetUser.id, {
            notifyUser,
            note: actionNote || undefined
          })
          break
      }
      setActionDialogOpen(false)
      setActionTargetUser(null)
      setActionType(null)
      setSuspendReason('')
      setSuspendUntil('')
      setNotifyUser(true)
      setActionNote('')
    } catch {
      // Error handled by hook
    }
  }

  // Bulk selection handlers
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const selectAllVisible = () => {
    if (!filteredUsers) return
    setSelectedUserIds(new Set(filteredUsers.map(u => u.id)))
  }

  const deselectAll = () => {
    setSelectedUserIds(new Set())
  }

  // Status badge renderer
  const getStatusBadge = (user: Profile) => {
    if (!user.is_active) {
      return <Badge variant="secondary" className="text-xs">{t('status.inactive')}</Badge>
    }
    switch (user.account_status) {
      case 'suspended':
        return (
          <Badge variant="destructive" className="text-xs gap-1">
            <ShieldOff className="w-3 h-3" />
            {t('status.suspended')}
          </Badge>
        )
      case 'locked':
        return (
          <Badge variant="outline" className="text-xs gap-1 border-orange-400 text-orange-600">
            <AlertTriangle className="w-3 h-3" />
            {t('status.locked')}
          </Badge>
        )
      default:
        return <Badge variant="default" className="text-xs">{t('status.active')}</Badge>
    }
  }

  // Status counts
  const statusCounts = {
    all: users?.length || 0,
    active: users?.filter(u => u.is_active && (u.account_status === 'active' || !u.account_status)).length || 0,
    suspended: users?.filter(u => u.account_status === 'suspended').length || 0,
    locked: users?.filter(u => u.account_status === 'locked').length || 0,
    inactive: users?.filter(u => !u.is_active).length || 0,
  }

  if (showForm) {
    return (
      <UserForm user={selectedUser || undefined} onClose={handleCloseForm} />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="bg-hotel-gold text-white px-4 py-2.5 rounded-md text-sm hover:bg-hotel-gold-dark transition-colors flex items-center gap-2 min-h-touch w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            {t('add_user')}
          </button>
        }
      />

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'active', 'suspended', 'locked', 'inactive'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === status
              ? 'bg-hotel-navy text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {status === 'all' ? 'All' : t(`status.${status}`)}
            <span className="ms-1.5 bg-white/20 text-inherit px-1.5 py-0.5 rounded-full">
              {statusCounts[status]}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {selectedUserIds.size > 0 && (
        <UserBulkActionsBar
          selectedIds={selectedUserIds}
          onClearSelection={deselectAll}
          userNames={new Map(filteredUsers?.map(u => [u.id, u.full_name || u.email]) || [])}
        />
      )}

      <div className="prime-card">
        <div className="prime-card-header flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('directory')}</h3>
          {filteredUsers && filteredUsers.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={selectedUserIds.size === filteredUsers.length ? deselectAll : selectAllVisible}
              className="text-xs text-gray-500"
            >
              {selectedUserIds.size === filteredUsers.length ? (
                <><CheckSquare className="w-3.5 h-3.5 me-1" />{t('bulk.deselect_all')}</>
              ) : (
                <><Square className="w-3.5 h-3.5 me-1" />{t('bulk.select_all')}</>
              )}
            </Button>
          )}
        </div>
        <div className="prime-card-body">
          <div className="mb-4">
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-hotel-navy focus:border-hotel-navy"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors gap-3 sm:gap-4 min-h-touch active:bg-gray-100 ${selectedUserIds.has(user.id)
                    ? 'border-hotel-navy/40 bg-hotel-navy/5'
                    : 'border-gray-200'
                    }`}
                  onClick={() => handleEdit(user)}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleUserSelection(user.id)
                      }}
                      className="flex-shrink-0 text-gray-400 hover:text-hotel-navy"
                    >
                      {selectedUserIds.has(user.id) ? (
                        <CheckSquare className="w-5 h-5 text-hotel-navy" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div className="w-10 h-10 sm:w-10 sm:h-10 rounded-full bg-hotel-gold/20 flex items-center justify-center border border-hotel-gold/40 flex-shrink-0">
                      <span className="text-hotel-gold font-medium">
                        {(user.full_name || user.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{user.full_name || t('no_name')}</p>
                        {user.staff_id && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-gray-100 text-gray-600 font-mono">
                            {user.staff_id}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {user.properties && user.properties.length > 0 && (
                          user.properties.map(p => (
                            <Badge key={p.id} variant="outline" className="text-[10px] px-1 py-0 h-4 border-gray-300 text-gray-500">
                              {p.name}
                            </Badge>
                          ))
                        )}
                        {user.last_login_at && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(user.last_login_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:ms-auto ps-13 sm:ps-0">
                    {getStatusBadge(user)}

                    {user.force_password_reset && (
                      <Badge variant="outline" className="text-[10px] gap-0.5 border-amber-400 text-amber-600">
                        <KeyRound className="w-3 h-3" />
                        Reset
                      </Badge>
                    )}

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-hotel-gold hover:bg-gold-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(user)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      {/* Account Actions Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-gray-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          {user.account_status === 'suspended' ? (
                            <DropdownMenuItem onClick={() => openActionDialog(user, 'reactivate')} className="gap-2">
                              <ShieldCheck className="w-4 h-4 text-green-600" />
                              {t('account_actions.reactivate')}
                            </DropdownMenuItem>
                          ) : user.is_active && (
                            <DropdownMenuItem onClick={() => openActionDialog(user, 'suspend')} className="gap-2 text-red-600">
                              <ShieldOff className="w-4 h-4" />
                              {t('account_actions.suspend')}
                            </DropdownMenuItem>
                          )}

                          {user.account_status === 'locked' && (
                            <DropdownMenuItem onClick={() => openActionDialog(user, 'unlock')} className="gap-2">
                              <Unlock className="w-4 h-4 text-blue-600" />
                              {t('account_actions.unlock')}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem onClick={() => openActionDialog(user, 'force_password_reset')} className="gap-2">
                            <KeyRound className="w-4 h-4 text-amber-600" />
                            {t('account_actions.force_password_reset')}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => {
                              setUserToDelete(user)
                              setDeleteConfirmOpen(true)
                            }}
                            className="gap-2 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                            {t('bulk.deactivate')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title={t('empty.title')}
              description={searchTerm ? t('empty.no_results') : t('empty.description')}
              action={{
                label: t('add_user'),
                onClick: () => setShowForm(true),
                icon: Plus
              }}
            />
          )}
        </div>
      </div>

      {/* Delete/Deactivate Confirmation */}
      <DeleteConfirmation
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={async () => {
          if (userToDelete) {
            const { error } = await supabase
              .from('profiles')
              .update({ is_active: false })
              .eq('id', userToDelete.id)

            if (!error) {
              refetch()
              setDeleteConfirmOpen(false)
              setUserToDelete(null)
            }
          }
        }}
        itemName={userToDelete?.full_name || userToDelete?.email || ''}
        itemType={t('user', 'User')}
        isLoading={false}
      />

      {/* Account Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'suspend' && <ShieldOff className="w-5 h-5 text-red-600" />}
              {actionType === 'reactivate' && <ShieldCheck className="w-5 h-5 text-green-600" />}
              {actionType === 'force_password_reset' && <KeyRound className="w-5 h-5 text-amber-600" />}
              {actionType === 'unlock' && <Unlock className="w-5 h-5 text-blue-600" />}
              {actionType && t(`account_actions.${actionType}`)}
            </DialogTitle>
            <DialogDescription>
              {actionTargetUser && (
                <span className="font-medium">{actionTargetUser.full_name || actionTargetUser.email}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              {actionType && t(`account_actions.confirm_${actionType === 'force_password_reset' ? 'force_reset' : actionType}`)}
            </p>

            {actionType === 'suspend' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('account_actions.suspend_reason')}
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder={t('account_actions.suspend_reason_placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-hotel-navy focus:border-hotel-navy resize-none"
                  rows={3}
                />
              </div>
            )}

            {actionType === 'suspend' && (
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

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="notify-user" checked={notifyUser} onCheckedChange={(checked) => setNotifyUser(!!checked)} />
                <Label htmlFor="notify-user" className="text-sm">Notify user about this action</Label>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1">Internal Note (Optional)</Label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Add a note for the audit trail"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-hotel-navy focus:border-hotel-navy resize-none"
                  rows={2}
                />
              </div>
            </div>

            {actionTargetUser?.account_status === 'suspended' && actionTargetUser?.suspend_reason && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-xs font-medium text-red-700 mb-1">{t('account_actions.suspend_reason')}:</p>
                <p className="text-sm text-red-600">{actionTargetUser.suspend_reason}</p>
                {actionTargetUser.suspended_at && (
                  <p className="text-xs text-red-400 mt-1">
                    {t('account_actions.suspended_at')}: {new Date(actionTargetUser.suspended_at).toLocaleString()}
                  </p>
                )}
                {actionTargetUser.suspended_until && (
                  <p className="text-xs text-red-400 mt-1">
                    Suspended until: {new Date(actionTargetUser.suspended_until).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {actionNotesQuery.data && actionNotesQuery.data.length > 0 && (
              <div className="border rounded-md p-3">
                <p className="text-xs font-medium text-gray-600 mb-2">Recent Admin Notes</p>
                <div className="space-y-2">
                  {actionNotesQuery.data.map((note: any) => (
                    <div key={note.id} className="text-xs text-gray-600">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{note.action.replace(/_/g, ' ')}</span>
                        <span>{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-gray-700">{note.note}</div>
                      {note.created_by && (
                        <div className="text-[10px] text-gray-500">
                          by {note.created_by.full_name || note.created_by.email}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
              disabled={isActionLoading}
            >
              {t('form.error.validation_failed', 'Cancel')}
            </Button>
            <Button
              onClick={executeAction}
              disabled={isActionLoading || (actionType === 'suspend' && !suspendReason.trim())}
              variant={actionType === 'suspend' ? 'destructive' : 'default'}
            >
              {isActionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : null}
              {actionType && t(`account_actions.${actionType}`)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
