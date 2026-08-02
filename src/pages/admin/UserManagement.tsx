import { UserBulkActionsBar } from '@/components/admin/UserBulkActionsBar'
import { UserForm } from '@/components/admin/UserForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { DeleteConfirmation } from '@/components/shared/DeleteConfirmation'
import { EmptyState } from '@/components/shared/EmptyState'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAccountActions } from '@/hooks/useAccountActions'
import { PendingUserApprovals } from '@/components/admin/PendingUserApprovals'
import type { AppRole } from '@/lib/constants'
import { ROLES, ROLE_HIERARCHY } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckSquare, Clock, Edit, KeyRound, Loader2, MailPlus, MoreVertical, Plus, ShieldAlert, ShieldCheck, ShieldOff, Square, Trash2, Unlock, Upload, UserX, Users, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

type AccountStatusFilter = 'all' | 'active' | 'suspended' | 'locked' | 'inactive' | 'pending_approval'

interface AccountActionNote {
  id: string
  action: string
  note: string | null
  created_at: string
  created_by: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

type AccountActionNoteRow = Omit<AccountActionNote, 'created_by'> & {
  created_by: AccountActionNote['created_by'] | AccountActionNote['created_by'][]
}

export default function UserManagement() {
  const { t: t_ext } = useTranslation('extracted');
  const { t } = useTranslation('users')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<AccountStatusFilter>('all')
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<AppRole | ''>('staff')
  const [invitePropertyId, setInvitePropertyId] = useState('')
  const [inviteDepartmentId, setInviteDepartmentId] = useState('')

  // Account action dialog state
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'suspend' | 'reactivate' | 'force_password_reset' | 'cancel_password_reset' | 'unlock' | 'resend_credentials' | null>(null)
  const [actionTargetUser, setActionTargetUser] = useState<Profile | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendUntil, setSuspendUntil] = useState('')
  const [notifyUser, setNotifyUser] = useState(true)
  const [actionNote, setActionNote] = useState('')

  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0)

  const { suspendAccount, reactivateAccount, forcePasswordReset, cancelPasswordReset, unlockAccount, resendCredentials, isLoading: isActionLoading } = useAccountActions()

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

  const { data: properties } = useQuery({
    queryKey: ['properties', 'invite'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return (data || []) as Array<{ id: string; name: string }>
    },
  })

  const { data: departments } = useQuery({
    queryKey: ['departments', 'invite', invitePropertyId],
    queryFn: async () => {
      let query = supabase
        .from('departments')
        .select('id, name, property_id')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (invitePropertyId) {
        query = query.eq('property_id', invitePropertyId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as Array<{ id: string; name: string; property_id: string }>
    },
  })

  useEffect(() => {
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleInvalidate = () => {
      if (invalidateTimer) return
      invalidateTimer = setTimeout(() => {
        invalidateTimer = null
        queryClient.invalidateQueries({ queryKey: ['users'] })
      }, 400)
    }

    const channel = supabase
      .channel('admin-users-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, scheduleInvalidate)
      .subscribe()

    return () => {
      if (invalidateTimer) {
        clearTimeout(invalidateTimer)
      }
      void supabase.removeChannel(channel)
    }
  }, [queryClient])

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
      return ((data || []) as AccountActionNoteRow[]).map((note) => ({
        ...note,
        created_by: Array.isArray(note.created_by) ? (note.created_by[0] ?? null) : note.created_by
      }))
    }
  })

  // Delete/Deactivate Logic
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null)
  const [hardDeleteConfirmOpen, setHardDeleteConfirmOpen] = useState(false)
  const [userToHardDelete, setUserToHardDelete] = useState<Profile | null>(null)

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

  const hardDeleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error: fnError } = await supabase.functions.invoke('delete-user', {
        body: { userId: id },
      })

      if (fnError) {
        const maybeContext = fnError as unknown as { context?: Response | { response?: Response } }
        const response = maybeContext?.context instanceof Response
          ? maybeContext.context
          : maybeContext?.context?.response
        if (response) {
          const text = await response.text().catch(() => '')
          let parsedError: string | undefined
          if (text) {
            try {
              const parsed = JSON.parse(text) as { error?: string }
              parsedError = parsed?.error
            } catch {
              parsedError = text
            }
          }
          throw new Error(parsedError || fnError.message || 'Failed to permanently delete user')
        }
        throw new Error(fnError.message || 'Failed to permanently delete user')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      return data as { success?: boolean; hardDeleted?: boolean; userId?: string }
    },
    onSuccess: (_data, deletedUserId) => {
      toast({
        title: t('bulk.hard_delete_success_title', 'User Permanently Deleted'),
        description: t(
          'bulk.hard_delete_success_description',
          'The user account and authentication record were permanently removed.'
        ),
      })
      setSelectedUserIds((prev) => {
        const next = new Set(prev)
        next.delete(deletedUserId)
        return next
      })
      refetch()
      setHardDeleteConfirmOpen(false)
      setUserToHardDelete(null)
    },
    onError: (error: Error) => {
      toast({
        title: t('bulk.hard_delete_failed_title', 'Hard Delete Failed'),
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const inviteUserMutation = useMutation({
    mutationFn: async (params: { email: string; role: AppRole | '' }) => {
      const { email, role } = params
      const trimmedEmail = email.trim().toLowerCase()
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        throw new Error('Please enter a valid email address.')
      }
      if (!role) {
        throw new Error('Please select a role for the invited user.')
      }

      const appUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')
      const { data, error: fnError } = await supabase.functions.invoke('create-user', {
        body: {
          email: trimmedEmail,
          role,
          provisioningMethod: 'invite',
          appUrl,
          propertyIds: invitePropertyId ? [invitePropertyId] : [],
          departmentIds: inviteDepartmentId ? [inviteDepartmentId] : [],
        },
      })

      if (fnError) {
        const maybeContext = fnError as unknown as { context?: Response | { response?: Response } }
        const response = maybeContext?.context instanceof Response
          ? maybeContext.context
          : maybeContext?.context?.response
        if (response) {
          const text = await response.text().catch(() => '')
          let parsedError: string | undefined
          if (text) {
            try {
              const parsed = JSON.parse(text) as { error?: string }
              parsedError = parsed?.error
            } catch {
              parsedError = text
            }
          }
          throw new Error(parsedError || fnError.message || 'Failed to send invitation')
        }
        throw new Error(fnError.message || 'Failed to send invitation')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      return data as { userId?: string; invitationSent?: boolean }
    },
    onSuccess: () => {
      toast({
        title: t('form.success.invite_sent_title', 'Invitation Sent'),
        description: t(
          'form.success.invite_sent_message',
          'An invite email was sent. The user should open the link, set a password, and complete their profile.'
        ),
      })
      setInviteDialogOpen(false)
      setInviteEmail('')
      setInviteRole('staff')
      setInvitePropertyId('')
      setInviteDepartmentId('')
      refetch()
    },
    onError: (error: Error) => {
      toast({
        title: t('form.error.create_failed'),
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleInviteDialogOpenChange = (open: boolean) => {
    setInviteDialogOpen(open)
    if (!open) {
      setInviteEmail('')
      setInviteRole('staff')
      setInvitePropertyId('')
      setInviteDepartmentId('')
    }
  }

  // Filter users by search + status
  const filteredUsers = useMemo(() => {
    return users?.filter((user) => {
      const includesSearch = (value?: string | null) =>
        (value || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSearch =
        includesSearch(user.full_name) ||
        includesSearch(user.email)

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
  }, [users, searchTerm, statusFilter])

  const handleEdit = (user: Profile) => {
    setSelectedUser(user)
    setShowForm(true)
  }

  const openCreateForm = () => {
    setSelectedUser(null)
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
        case 'cancel_password_reset':
          await cancelPasswordReset(actionTargetUser.id, {
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
        case 'resend_credentials':
          await resendCredentials(actionTargetUser.id, {
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
  const statusCounts = useMemo(() => ({
    all: users?.length || 0,
    active: users?.filter(u => u.is_active && (u.account_status === 'active' || !u.account_status)).length || 0,
    suspended: users?.filter(u => u.account_status === 'suspended').length || 0,
    locked: users?.filter(u => u.account_status === 'locked').length || 0,
    inactive: users?.filter(u => !u.is_active).length || 0,
  }), [users])

  const selectedResetCount = useMemo(() => filteredUsers
    ? filteredUsers.filter((u) => selectedUserIds.has(u.id) && u.force_password_reset).length
    : 0, [filteredUsers, selectedUserIds])

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
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Link
              to="/admin/users/bulk"
              className="border border-hotel-navy text-hotel-navy px-4 py-2.5 rounded-md text-sm hover:bg-hotel-navy/10 transition-colors flex items-center gap-2 min-h-touch w-full sm:w-auto justify-center"
            >
              <Upload className="w-4 h-4" />
              {t('form.bulk_provisioning', 'Bulk Provisioning')}
            </Link>
            <button
              onClick={() => setInviteDialogOpen(true)}
              className="border border-hotel-gold text-hotel-gold px-4 py-2.5 rounded-md text-sm hover:bg-hotel-gold/10 transition-colors flex items-center gap-2 min-h-touch w-full sm:w-auto justify-center"
            >
              <MailPlus className="w-4 h-4" />
              {t('form.invite_user', 'Invite User')}
            </button>
            <button
              onClick={openCreateForm}
              className="bg-hotel-gold text-white px-4 py-2.5 rounded-md text-sm hover:bg-hotel-gold-dark transition-colors flex items-center gap-2 min-h-touch w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              {t('add_user')}
            </button>
          </div>
        }
      />

      {/* Pending User Approvals */}
      <PendingUserApprovals onCountChange={setPendingApprovalCount} />

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
          resetRequiredCount={selectedResetCount}
        />
      )}

      <div className="altus-card">
        <div className="altus-card-header flex items-center justify-between">
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
        <div className="altus-card-body">
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
                  role="button"
                  tabIndex={0}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors gap-3 sm:gap-4 min-h-touch active:bg-gray-100 ${selectedUserIds.has(user.id)
                    ? 'border-hotel-navy/40 bg-hotel-navy/5'
                    : 'border-gray-200'
                    }`}
                  onClick={() => handleEdit(user)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleEdit(user)
                    }
                  }}
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

                    <Avatar className="h-10 w-10 border border-hotel-gold/40 flex-shrink-0">
                      <AvatarImage src={user.avatar_url || ''} className="object-cover" />
                      <AvatarFallback className="bg-hotel-gold/20 text-hotel-gold font-bold">
                        {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 capitalize">{user.full_name || t('no_name')}</p>
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
                        {t_ext('reset', 'Reset')}</Badge>
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
                        aria-label={t('actions.edit', 'Edit user')}
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
                            aria-label={t('actions.more', 'More actions')}
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

                          {user.force_password_reset && (
                            <DropdownMenuItem onClick={() => openActionDialog(user, 'cancel_password_reset')} className="gap-2">
                              <XCircle className="w-4 h-4 text-gray-500" />
                              {t('account_actions.cancel_password_reset')}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem onClick={() => openActionDialog(user, 'resend_credentials')} className="gap-2">
                            <MailPlus className="w-4 h-4 text-sky-600" />
                            {t('account_actions.resend_credentials', 'Resend Credentials')}
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

                          <DropdownMenuItem
                            onClick={() => {
                              setUserToHardDelete(user)
                              setHardDeleteConfirmOpen(true)
                            }}
                            className="gap-2 text-red-700 focus:text-red-700"
                          >
                            <UserX className="w-4 h-4" />
                            {t('bulk.hard_delete', 'Hard Delete')}
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
                onClick: openCreateForm,
                icon: Plus
              }}
            />
          )}
        </div>
      </div>

      {/* Email Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={handleInviteDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MailPlus className="w-5 h-5 text-hotel-gold" />
              {t('form.invite_user', 'Invite User')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'form.invite_description',
                'Send an invitation email. The user will set a password and complete their profile from the link.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="invite-email">{t('form.email')}</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="name@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={inviteUserMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (inviteEmail.trim()) {
                    inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole })
                  }
                }
              }}
            />
          </div>

          <div className="space-y-2 py-2">
            <Label htmlFor="invite-role">{t('form.permission_level', 'Permission Level')}</Label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as AppRole)}
              disabled={inviteUserMutation.isPending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">{t('form.select_role', 'Select role')}</option>
              {ROLE_HIERARCHY.map((roleKey) => (
                <option key={roleKey} value={roleKey}>
                  {ROLES[roleKey].label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {t(
                'form.invite_role_description',
                'This role is enforced before the account is created.'
              )}
            </p>
          </div>

          <div className="space-y-2 py-2">
            <Label htmlFor="invite-property">{t('form.properties', 'Property')}</Label>
            <select
              id="invite-property"
              value={invitePropertyId}
              onChange={(e) => {
                const nextPropertyId = e.target.value
                setInvitePropertyId(nextPropertyId)
                setInviteDepartmentId('')
              }}
              disabled={inviteUserMutation.isPending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{t('form.select_property', 'Select property (optional)')}</option>
              {(properties || []).map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {t('form.invite_property_description', 'Assign a property now or let the user select one during invite completion.')}
            </p>
          </div>

          <div className="space-y-2 py-2">
            <Label htmlFor="invite-department">{t('form.departments', 'Department')}</Label>
            <select
              id="invite-department"
              value={inviteDepartmentId}
              onChange={(e) => setInviteDepartmentId(e.target.value)}
              disabled={inviteUserMutation.isPending || !invitePropertyId}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">
                {invitePropertyId
                  ? t('form.select_department', 'Select department (optional)')
                  : t('form.select_property_first', 'Select a property first')}
              </option>
              {(departments || []).map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {t('form.invite_department_description', 'Departments are filtered by the selected property.')}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleInviteDialogOpenChange(false)}
              disabled={inviteUserMutation.isPending}
            >
              {t('form.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() => inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole })}
              disabled={inviteUserMutation.isPending || !inviteEmail.trim() || !inviteRole}
            >
              {inviteUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {t('form.send_invite', 'Send Invite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete/Deactivate Confirmation */}
      <DeleteConfirmation
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={async () => {
          if (userToDelete) {
            await deleteUserMutation.mutateAsync(userToDelete.id)
          }
        }}
        itemName={userToDelete?.full_name || userToDelete?.email || ''}
        itemType={t('user', 'User')}
        isLoading={deleteUserMutation.isPending}
      />

      {/* Hard Delete Confirmation */}
      <DeleteConfirmation
        open={hardDeleteConfirmOpen}
        onOpenChange={setHardDeleteConfirmOpen}
        onConfirm={async () => {
          if (userToHardDelete) {
            await hardDeleteUserMutation.mutateAsync(userToHardDelete.id)
          }
        }}
        itemName={userToHardDelete?.full_name || userToHardDelete?.email || ''}
        itemType={t('user', 'User')}
        title={t('bulk.hard_delete_confirm_title', 'Permanently delete user?')}
        description={t(
          'bulk.hard_delete_confirm_description',
          `This will permanently delete "${userToHardDelete?.full_name || userToHardDelete?.email || ''}" and remove their authentication account. This action cannot be undone.`
        )}
        isLoading={hardDeleteUserMutation.isPending}
      />

      {/* Account Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'suspend' && <ShieldOff className="w-5 h-5 text-red-600" />}
              {actionType === 'reactivate' && <ShieldCheck className="w-5 h-5 text-green-600" />}
              {actionType === 'force_password_reset' && <KeyRound className="w-5 h-5 text-amber-600" />}
              {actionType === 'cancel_password_reset' && <XCircle className="w-5 h-5 text-gray-500" />}
              {actionType === 'unlock' && <Unlock className="w-5 h-5 text-blue-600" />}
              {actionType === 'resend_credentials' && <MailPlus className="w-5 h-5 text-sky-600" />}
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
              {actionType && t(`account_actions.confirm_${actionType === 'force_password_reset'
                ? 'force_reset'
                : actionType === 'cancel_password_reset'
                  ? 'cancel_reset'
                  : actionType}`)}
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
                <Label className="text-sm font-medium text-gray-700 mb-1">{t_ext('suspend_until_optional', 'Suspend Until (Optional)')}</Label>
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
                <Label htmlFor="notify-user" className="text-sm">{t_ext('notify_user_about_this_action', 'Notify user about this action')}</Label>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1">{t_ext('internal_note_optional', 'Internal Note (Optional)')}</Label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={t_ext('add_a_note_for_the_audit_trail', 'Add a note for the audit trail')}
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
                    {t_ext('suspended_until', 'Suspended until:')}{new Date(actionTargetUser.suspended_until).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {actionNotesQuery.data && actionNotesQuery.data.length > 0 && (
              <div className="border rounded-md p-3">
                <p className="text-xs font-medium text-gray-600 mb-2">{t_ext('recent_admin_notes', 'Recent Admin Notes')}</p>
                <div className="space-y-2">
                  {actionNotesQuery.data.map((note: AccountActionNote) => (
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
