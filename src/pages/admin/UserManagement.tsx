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
import { EmployeeTransferModal } from '@/components/directory/EmployeeTransferModal'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { AlertTriangle, ArrowRightLeft, CheckSquare, Clock, Edit, KeyRound, Loader2, MailPlus, MoreVertical, Plus, ShieldAlert, ShieldCheck, ShieldOff, Square, Trash2, Unlock, Upload, UserX, Users, XCircle, Eye, Mail, Phone, Building, Briefcase, Calendar, Shield, Sparkles, ExternalLink, UserCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/contexts/TenantContext'
import { useAccountContext } from '@/contexts/auth/AccountContext'
import { platformService } from '@/services/platformService'
import type { Profile, AppRole } from '@/lib/types'


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
  const { currentOrganization } = useTenant()
  const { isPlatformOperator } = useAccountContext()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: entitlements, refetch: refetchEntitlements } = useQuery({
    queryKey: ['org-effective-entitlements', currentOrganization?.id],
    queryFn: () => currentOrganization?.id ? platformService.getEffectiveEntitlements(currentOrganization.id) : null,
    enabled: !!currentOrganization?.id,
  })

  const isSeatLimitReached = !isPlatformOperator && !!entitlements && (entitlements.usage?.learners ?? 0) >= (entitlements.max_learners ?? 100)

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
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [transferTargetUser, setTransferTargetUser] = useState<Profile | null>(null)

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
      return (data || []) as unknown as Profile[]
    },
  })

  const { data: properties } = useQuery({
    queryKey: ['properties', 'invite'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotels')
        .select('id, name')
        .eq('is_active', true)
        .eq('is_deleted', false)
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
        .select('id, action, note, created_at, created_by:profiles!account_action_notes_created_by_fkey(id, full_name, email)')
        .eq('user_id', actionTargetUser.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      return ((data || []) as unknown as AccountActionNoteRow[]).map((note) => ({
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
    },
    onError: (error: Error) => {
      toast({
        title: t('bulk.deactivate_failed_title', 'Deactivation Failed'),
        description: error.message,
        variant: 'destructive',
      })
    },
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
      if (isSeatLimitReached) {
        throw new Error('User seat limit reached for this subscription plan. Contact your platform administrator to upgrade.')
      }

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
      refetchEntitlements()
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
    if (isSeatLimitReached) {
      toast({
        title: t('form.error.create_failed', 'Action Blocked'),
        description: t('seat_limit_reached', 'User seat limit reached for this subscription plan. Contact your platform administrator to upgrade.'),
        variant: 'destructive',
      })
      return
    }
    setSelectedUser(null)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedUser(null)
    refetch()
    refetchEntitlements()
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

  // Slide-over detail drawer state
  const [detailUser, setDetailUser] = useState<Profile | null>(null)

  // Status badge renderer
  const getStatusBadge = (user: Profile) => {
    if (!user.is_active) {
      return (
        <Badge variant="secondary" className="text-xs border border-border/60 bg-muted/60 text-muted-foreground font-semibold">
          {t('status.inactive')}
        </Badge>
      )
    }
    switch (user.account_status) {
      case 'suspended':
        return (
          <Badge variant="destructive" className="text-xs gap-1 border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
            <ShieldOff className="w-3 h-3" />
            {t('status.suspended')}
          </Badge>
        )
      case 'locked':
        return (
          <Badge variant="outline" className="text-xs gap-1 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
            <AlertTriangle className="w-3 h-3" />
            {t('status.locked')}
          </Badge>
        )
      default:
        return (
          <Badge className="text-xs gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t('status.active')}
          </Badge>
        )
    }
  }

  // Role badge renderer
  const getRoleBadge = (roleKey?: string) => {
    switch (roleKey) {
      case 'administrator':
      case 'super_admin':
      case 'corporate_admin':
        return (
          <Badge className="text-[11px] font-bold border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300">
            {roleKey ? ROLES[roleKey as AppRole]?.label || roleKey : 'Corporate Admin'}
          </Badge>
        )
      case 'training_manager':
      case 'regional_hr':
      case 'property_hr':
        return (
          <Badge className="text-[11px] font-bold border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">
            {roleKey ? ROLES[roleKey as AppRole]?.label || roleKey : 'L&D Director'}
          </Badge>
        )
      case 'knowledge_manager':
        return (
          <Badge className="text-[11px] font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            {roleKey ? ROLES[roleKey as AppRole]?.label || roleKey : 'Knowledge Manager'}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[11px] font-medium border-border/60 text-muted-foreground">
            {roleKey && ROLES[roleKey as AppRole] ? ROLES[roleKey as AppRole].label : (roleKey || 'Staff Member')}
          </Badge>
        )
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Executive Welcome & Operations Header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-card/95 via-card/75 to-card/40 p-6 sm:p-8 backdrop-blur-2xl shadow-lg">
        <div className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full bg-amber-500/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -start-24 h-72 w-72 rounded-full bg-emerald-500/[0.06] blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-0.5">
                <Users className="me-1.5 h-3.5 w-3.5" />
                {t('title', 'Employee Directory & Access Control')}
              </Badge>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs font-mono text-muted-foreground">
                {users?.length || 0} Total Staff Records
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl font-serif">
              {t('title', 'Employee Directory & Access Control')}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm font-normal max-w-2xl leading-relaxed">
              {t('description', 'Comprehensive personnel directory, security credentials, property assignments, and role-based permissions.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
            <Link
              to="/admin/users/bulk"
              className="inline-flex h-9 items-center justify-center rounded-2xl border border-border/60 bg-background/70 px-3.5 text-xs font-semibold text-foreground backdrop-blur-xl hover:border-amber-500/40 hover:bg-background/90 shadow-xs transition-colors"
            >
              <Upload className="me-1.5 h-3.5 w-3.5 text-blue-500" />
              <span>{t('form.bulk_provisioning', 'Bulk Provisioning')}</span>
            </Link>

            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(true)}
              disabled={isSeatLimitReached}
              title={isSeatLimitReached ? 'Plan seat limit reached. Upgrade to invite users.' : undefined}
              className="h-9 rounded-2xl border-amber-500/30 bg-amber-500/10 px-3.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shadow-xs"
            >
              <MailPlus className="me-1.5 h-3.5 w-3.5 text-amber-500" />
              <span>{t('form.invite_user', 'Invite User')}</span>
            </Button>

            <Button
              onClick={openCreateForm}
              disabled={isSeatLimitReached}
              title={isSeatLimitReached ? 'Plan seat limit reached. Upgrade to add employees.' : undefined}
              className="h-9 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/15 hover:from-amber-400 hover:to-amber-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="me-1.5 h-3.5 w-3.5" />
              <span>{t('add_user', 'Add Employee')}</span>
            </Button>
          </div>
        </div>

        {isSeatLimitReached && (
          <div className="mt-4 p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-700 dark:text-amber-300 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              User seat limit reached ({entitlements?.usage?.learners ?? 0} / {entitlements?.max_learners ?? 100} seats used). Contact your platform administrator to upgrade subscription tier.
            </span>
          </div>
        )}
      </div>

      {/* Pending User Approvals */}
      <PendingUserApprovals onCountChange={setPendingApprovalCount} />

      {/* Status Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {(['all', 'active', 'suspended', 'locked', 'inactive'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
                statusFilter === status
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-amber-500/20'
                  : 'bg-card/80 text-muted-foreground border border-border/60 hover:border-amber-500/40 hover:text-foreground'
              }`}
            >
              <span>{status === 'all' ? 'All Personnel' : t(`status.${status}`)}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${statusFilter === status ? 'bg-slate-950/20 text-slate-950' : 'bg-muted text-muted-foreground'}`}>
                {statusCounts[status]}
              </span>
            </button>
          ))}
        </div>

        {filteredUsers && filteredUsers.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={selectedUserIds.size === filteredUsers.length ? deselectAll : selectAllVisible}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground h-8"
          >
            {selectedUserIds.size === filteredUsers.length ? (
              <><CheckSquare className="w-3.5 h-3.5 me-1.5 text-amber-500" />{t('bulk.deselect_all', 'Deselect All')}</>
            ) : (
              <><Square className="w-3.5 h-3.5 me-1.5" />{t('bulk.select_all', 'Select All Visible')}</>
            )}
          </Button>
        )}
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

      {/* Employee Directory Luxury Table Card */}
      <div className="rounded-3xl border border-border/60 bg-gradient-to-b from-card/95 via-card/75 to-card/45 p-6 shadow-md backdrop-blur-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              <span>{t('directory', 'Employee Master Records')}</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              {filteredUsers?.length || 0} employees matching filter criteria. Click any row for slide-over detail.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('search_placeholder', 'Search by name, email, or staff ID...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full ps-9 pe-3 rounded-xl border border-border/60 bg-background/70 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>
        </div>

        <div className="mt-4">


          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  role="button"
                  tabIndex={0}
                  className={`group flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-2xl border transition-all duration-200 gap-4 cursor-pointer backdrop-blur-xl ${
                    selectedUserIds.has(user.id)
                      ? 'border-amber-500/50 bg-amber-500/[0.08] shadow-sm'
                      : 'border-border/60 bg-card/60 hover:border-amber-500/40 hover:bg-card/90 hover:shadow-md'
                  }`}
                  onClick={() => setDetailUser(user)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setDetailUser(user)
                    }
                  }}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleUserSelection(user.id)
                      }}
                      aria-label="Select user"
                      className="shrink-0 text-muted-foreground/60 hover:text-amber-500 transition-colors"
                    >
                      {selectedUserIds.has(user.id) ? (
                        <CheckSquare className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    {/* Luxury Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className="h-11 w-11 rounded-2xl border-2 border-amber-500/30 shadow-xs">
                        <AvatarImage src={user.avatar_url || ''} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-600 dark:text-amber-400 font-bold text-sm">
                          {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {user.is_active && (
                        <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-foreground text-xs sm:text-sm capitalize group-hover:text-amber-500 transition-colors">
                          {user.full_name || t('no_name', 'Unnamed Employee')}
                        </p>
                        {user.staff_id && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-muted/60 text-muted-foreground font-mono">
                            {user.staff_id}
                          </Badge>
                        )}
                        {getRoleBadge(user.role)}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono text-[11px] text-muted-foreground/90">{user.email}</span>
                        {user.job_title && (
                          <>
                            <span>•</span>
                            <span className="text-muted-foreground font-medium">{user.job_title}</span>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {user.properties && user.properties.length > 0 ? (
                          user.properties.map((p) => (
                            <span
                              key={p.id}
                              className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                            >
                              <Building className="h-2.5 w-2.5 text-amber-500" />
                              {p.name}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                            <Building className="h-2.5 w-2.5 text-amber-500" />
                            All Properties
                          </span>
                        )}

                        {user.departments && user.departments.length > 0 && (
                          user.departments.map((d) => (
                            <span
                              key={d.id}
                              className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                            >
                              <Briefcase className="h-2.5 w-2.5 text-blue-500" />
                              {d.name}
                            </span>
                          ))
                        )}

                        {user.last_login_at && (
                          <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1 ms-1">
                            <Clock className="w-3 h-3 text-muted-foreground/60" />
                            {new Date(user.last_login_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(user)}

                      {user.force_password_reset && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                          <KeyRound className="w-3 h-3" />
                          {t_ext('reset', 'Reset Required')}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-xl px-2.5 text-xs font-semibold text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDetailUser(user)
                        }}
                      >
                        <Eye className="w-3.5 h-3.5 me-1" />
                        <span>{t('actions.view', 'Inspect')}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(user)
                        }}
                        aria-label={t('actions.edit', 'Edit user')}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>

                      {/* Account Actions Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={t('actions.more', 'More actions')}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-border/60 bg-card/95 backdrop-blur-xl shadow-xl" onClick={(e) => e.stopPropagation()}>
                          {user.account_status === 'suspended' ? (
                            <DropdownMenuItem onClick={() => openActionDialog(user, 'reactivate')} className="gap-2 text-xs font-semibold">
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              {t('account_actions.reactivate', 'Reactivate Account')}
                            </DropdownMenuItem>
                          ) : user.is_active && (
                            <DropdownMenuItem onClick={() => openActionDialog(user, 'suspend')} className="gap-2 text-xs font-semibold text-rose-600">
                              <ShieldOff className="w-4 h-4" />
                              {t('account_actions.suspend', 'Suspend Account')}
                            </DropdownMenuItem>
                          )}

                          {user.account_status === 'locked' && (
                            <DropdownMenuItem onClick={() => openActionDialog(user, 'unlock')} className="gap-2 text-xs font-semibold">
                              <Unlock className="w-4 h-4 text-blue-600" />
                              {t('account_actions.unlock', 'Unlock Account')}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem onClick={() => openActionDialog(user, 'force_password_reset')} className="gap-2 text-xs font-semibold">
                            <KeyRound className="w-4 h-4 text-amber-600" />
                            {t('account_actions.force_password_reset', 'Force Password Reset')}
                          </DropdownMenuItem>

                          {user.force_password_reset && (
                            <DropdownMenuItem onClick={() => openActionDialog(user, 'cancel_password_reset')} className="gap-2 text-xs font-semibold">
                              <XCircle className="w-4 h-4 text-muted-foreground" />
                              {t('account_actions.cancel_password_reset', 'Cancel Password Reset')}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem onClick={() => openActionDialog(user, 'resend_credentials')} className="gap-2 text-xs font-semibold">
                            <MailPlus className="w-4 h-4 text-sky-600" />
                            {t('account_actions.resend_credentials', 'Resend Credentials')}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setTransferTargetUser(user)
                              setTransferModalOpen(true)
                            }}
                            className="gap-2 text-xs font-semibold text-primary focus:text-primary"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                            {t('transfer.action_title', 'Transfer Employee')}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => {
                              setUserToDelete(user)
                              setDeleteConfirmOpen(true)
                            }}
                            className="gap-2 text-xs font-semibold text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                            {t('bulk.deactivate', 'Deactivate')}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setUserToHardDelete(user)
                              setHardDeleteConfirmOpen(true)
                            }}
                            className="gap-2 text-xs font-semibold text-rose-700 focus:text-rose-700"
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
              title={t('empty.title', 'No employees found')}
              description={searchTerm ? t('empty.no_results', 'No users matching the query') : t('empty.description', 'Get started by inviting or creating staff accounts.')}
              action={{
                label: t('add_user', 'Add Employee'),
                onClick: openCreateForm,
                icon: Plus
              }}
            />
          )}
        </div>
      </div>

      {/* Slide-over User Profile Detail Drawer */}
      <Sheet open={!!detailUser} onOpenChange={(open) => !open && setDetailUser(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto bg-card/95 backdrop-blur-2xl border-s border-amber-500/20 shadow-2xl">
          {detailUser && (
            <div className="flex flex-col h-full">
              {/* Drawer Header Banner */}
              <div className="relative p-6 border-b border-border/40 bg-gradient-to-br from-amber-500/10 via-card to-card/50">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 rounded-2xl border-2 border-amber-500/40 shadow-md">
                    <AvatarImage src={detailUser.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xl">
                      {(detailUser.full_name || detailUser.email || '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground capitalize font-serif">
                        {detailUser.full_name || t('no_name', 'Unnamed Employee')}
                      </h3>
                      {detailUser.staff_id && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono font-bold text-muted-foreground">
                          {detailUser.staff_id}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{detailUser.job_title || 'Staff Member'}</p>
                    <div className="pt-1 flex flex-wrap items-center gap-1.5">
                      {getRoleBadge(detailUser.role)}
                      {getStatusBadge(detailUser)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Body Telemetry & Info */}
              <div className="p-6 space-y-6 flex-1">
                {/* Contact & Credentials */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-amber-500" />
                    <span>Contact &amp; Account Identity</span>
                  </h4>
                  <div className="rounded-2xl border border-border/50 bg-background/50 p-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Email Address</span>
                      <span className="font-mono font-semibold text-foreground">{detailUser.email}</span>
                    </div>
                    {detailUser.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Phone Number</span>
                        <span className="font-mono text-foreground">{detailUser.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Staff / Employee ID</span>
                      <span className="font-mono font-semibold text-foreground">{detailUser.staff_id || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Member Since</span>
                      <span className="text-foreground">{new Date(detailUser.created_at).toLocaleDateString()}</span>
                    </div>
                    {detailUser.last_login_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Last Portal Login</span>
                        <span className="text-foreground">{new Date(detailUser.last_login_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Property & Department Scope */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-blue-500" />
                    <span>Organizational Scope</span>
                  </h4>
                  <div className="rounded-2xl border border-border/50 bg-background/50 p-4 space-y-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block mb-1">Assigned Properties:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {detailUser.properties && detailUser.properties.length > 0 ? (
                          detailUser.properties.map(p => (
                            <Badge key={p.id} variant="outline" className="text-[11px] border-amber-500/30 bg-amber-500/5 text-foreground">
                              <Building className="h-3 w-3 me-1 text-amber-500" />
                              {p.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground italic">All Properties (Consolidated)</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground block mb-1">Assigned Departments:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {detailUser.departments && detailUser.departments.length > 0 ? (
                          detailUser.departments.map(d => (
                            <Badge key={d.id} variant="outline" className="text-[11px] border-blue-500/30 bg-blue-500/5 text-foreground">
                              <Briefcase className="h-3 w-3 me-1 text-blue-500" />
                              {d.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground italic">General / Unassigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Audit State if Suspended or Reset Required */}
                {(detailUser.account_status === 'suspended' || detailUser.force_password_reset) && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Security Flag Telemetry</span>
                    </h4>
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-4 space-y-2 text-xs">
                      {detailUser.account_status === 'suspended' && (
                        <div>
                          <span className="font-bold text-rose-600 block">Account Suspended</span>
                          {detailUser.suspend_reason && (
                            <p className="text-muted-foreground mt-0.5">{detailUser.suspend_reason}</p>
                          )}
                        </div>
                      )}
                      {detailUser.force_password_reset && (
                        <div className="text-amber-700 dark:text-amber-400 font-semibold">
                          Password reset is mandatory on next login session.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Action Footer */}
              <div className="p-6 border-t border-border/40 bg-card/60 space-y-2">
                <Button
                  onClick={() => {
                    const u = detailUser
                    setDetailUser(null)
                    handleEdit(u)
                  }}
                  className="w-full h-10 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500"
                >
                  <Edit className="h-4 w-4 me-1.5" />
                  <span>Edit Profile &amp; Permissions</span>
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const u = detailUser
                      setDetailUser(null)
                      openActionDialog(u, u.account_status === 'suspended' ? 'reactivate' : 'suspend')
                    }}
                    className="h-9 rounded-xl text-xs font-semibold"
                  >
                    {detailUser.account_status === 'suspended' ? (
                      <><ShieldCheck className="h-3.5 w-3.5 me-1 text-emerald-500" />Reactivate</>
                    ) : (
                      <><ShieldOff className="h-3.5 w-3.5 me-1 text-rose-500" />Suspend</>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      const u = detailUser
                      setDetailUser(null)
                      openActionDialog(u, 'force_password_reset')
                    }}
                    className="h-9 rounded-xl text-xs font-semibold"
                  >
                    <KeyRound className="h-3.5 w-3.5 me-1 text-amber-500" />
                    <span>Reset Pass</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>


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

      <EmployeeTransferModal
        isOpen={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false)
          setTransferTargetUser(null)
        }}
        user={transferTargetUser}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
