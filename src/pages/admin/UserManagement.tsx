import { UserBulkActionsBar } from '@/components/admin/UserBulkActionsBar'
import { UserForm } from '@/components/admin/UserForm'
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
import {
    Sheet,
    SheetContent
} from '@/components/ui/sheet'
import { AlertTriangle, CheckSquare, Edit, KeyRound, Loader2, MailPlus, MoreVertical, Plus, Search, ShieldAlert, ShieldCheck, ShieldOff, Square, Trash2, Unlock, Upload, UserX, Users, XCircle, Mail, Building, Briefcase, Shield } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { WorkspaceHeader, headerActionClass } from '@/ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { membershipToAppRole } from '@/lib/membershipRoles'
import { useTenant } from '@/contexts/TenantContext'
import { useAccountContext } from '@/contexts/auth/AccountContext'
import { platformService } from '@/services/platformService'
import type { Profile, AppRole } from '@/lib/types'
import { ROLE_HIERARCHY, ROLES } from '@/lib/constants'

type AccountStatusFilter = 'all' | 'active' | 'suspended' | 'locked' | 'inactive' | 'pending_approval'
type RoleCategoryFilter = 'all' | 'learners' | 'instructors' | 'admins'

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
  const { t, i18n } = useTranslation('users')
  const isRTL = i18n.language === 'ar'
  const { currentOrganization, organizations, isPlatformAdmin, isPlatformScope } = useTenant()
  const { isPlatformOperator } = useAccountContext()
  const isPlatformUser = isPlatformAdmin || isPlatformOperator
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: entitlements, refetch: refetchEntitlements } = useQuery({
    queryKey: ['org-effective-entitlements', currentOrganization?.id],
    queryFn: () => currentOrganization?.id ? platformService.getEffectiveEntitlements(currentOrganization.id) : null,
    enabled: !!currentOrganization?.id,
  })

  // A seat limit applies only when the plan sets one - never an assumed default.
  const isSeatLimitReached = !isPlatformOperator && !!entitlements?.max_learners && (entitlements.usage?.learners ?? 0) >= entitlements.max_learners

  const [showForm, setShowForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleCategoryFilter, setRoleCategoryFilter] = useState<RoleCategoryFilter>('all')
  const [statusFilter, setStatusFilter] = useState<AccountStatusFilter>('all')
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<AppRole | ''>('staff')
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
    queryKey: ['users', currentOrganization?.id],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      if (!currentOrganization?.id) return []

      const { data, error } = await supabase
        .from('organization_memberships')
        .select(`
          id,
          organization_id,
          user_id,
          department_id,
          role,
          is_primary,
          is_active,
          created_at,
          user:profiles!organization_memberships_user_id_fkey (*),
          department:departments!organization_memberships_department_id_fkey (
            id,
            name,
            name_ar
          ),
          organization:organizations!organization_memberships_organization_id_fkey (
            id,
            name,
            name_ar
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || [])
        .filter((m: any) => m.user)
        .map((m: any) => {
          const p = m.user
          const appRole = membershipToAppRole(m.role)
          const dept = m.department
            ? [
                {
                  id: m.department.id,
                  name: isRTL && m.department.name_ar ? m.department.name_ar : m.department.name,
                },
              ]
            : []

          const orgInfo = m.organization || currentOrganization

          return {
            ...p,
            role: appRole,
            is_active: m.is_active,
            membership_id: m.id,
            organizations: orgInfo,
            departments: dept,
            organization_memberships: [m],
          } as Profile
        })
    },
  })

  const { data: departments } = useQuery({
    queryKey: ['departments', 'invite', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return []
      const query = supabase
        .from('departments')
        .select('id, name, name_ar, organization_id')
        .eq('is_active', true)
        .eq('organization_id', currentOrganization.id)
        .order('name', { ascending: true })

      const { data, error } = await query
      if (error) throw error
      return (data || []) as Array<{ id: string; name: string; name_ar?: string | null }>
    },
    enabled: !!currentOrganization?.id,
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organization_memberships' }, scheduleInvalidate)
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
      if (!currentOrganization?.id) {
        throw new Error(t('form.error.select_org', 'Tenant context required.'))
      }
      const { data, error } = await supabase.rpc('remove_tenant_member', {
        p_org_id: currentOrganization.id,
        p_user_id: id,
      })

      if (error) throw error
      if (!data) {
        throw new Error('Member not found or already deactivated in this organization.')
      }
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

  const activateUserMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) {
        throw new Error(t('form.error.select_org', 'Tenant context required.'))
      }
      const { data, error } = await supabase.rpc('activate_tenant_member', {
        p_org_id: currentOrganization.id,
        p_user_id: id,
      })
      if (error) throw error
      if (!data) {
        throw new Error('Member not found in this organization.')
      }
    },
    onSuccess: () => {
      refetch()
      toast({
        title: t('user_management.activated_title', 'Member Activated'),
        description: t('user_management.activated_desc', 'User was activated in this organization successfully.'),
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('bulk.activate_failed_title', 'Activation Failed'),
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

      if (!currentOrganization?.id) {
        throw new Error(t('form.error.select_org', 'Tenant context required.'))
      }

      const appUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')
      const { data, error: fnError } = await supabase.functions.invoke('create-user', {
        body: {
          email: trimmedEmail,
          role,
          provisioningMethod: 'invite',
          appUrl,
          organizationId: currentOrganization.id,
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
      setInviteDepartmentId('')
    }
  }

  // Filter users by search + role category + status
  const filteredUsers = useMemo(() => {
    return users?.filter((user) => {
      const includesSearch = (value?: string | null) =>
        (value || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSearch =
        includesSearch(user.full_name) ||
        includesSearch(user.email) ||
        includesSearch(user.staff_id) ||
        includesSearch(user.job_title)

      if (!matchesSearch) return false

      // Role category filter (Academy mental model)
      if (roleCategoryFilter === 'learners') {
        const isLearner = ['learner', 'staff'].includes(user.role || '') || !user.role
        if (!isLearner) return false
      } else if (roleCategoryFilter === 'instructors') {
        const isInstructor = ['training_manager', 'manager', 'department_head', 'author', 'knowledge_manager', 'property_manager'].includes(user.role || '')
        if (!isInstructor) return false
      } else if (roleCategoryFilter === 'admins') {
        const isAdmin = ['administrator', 'super_admin', 'corporate_admin', 'regional_admin', 'property_hr', 'regional_hr'].includes(user.role || '')
        if (!isAdmin) return false
      }

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
  }, [users, searchTerm, roleCategoryFilter, statusFilter])

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
          <Badge variant="destructive" className="text-xs gap-1 border-ds-danger/30 bg-ds-danger-soft text-ds-danger font-bold">
            <ShieldOff className="w-3 h-3" />
            {t('status.suspended')}
          </Badge>
        )
      case 'locked':
        return (
          <Badge variant="outline" className="text-xs gap-1 border-ds-warning/30 bg-ds-warning-soft text-ds-warning font-bold">
            <AlertTriangle className="w-3 h-3" />
            {t('status.locked')}
          </Badge>
        )
      default:
        return (
          <Badge className="text-xs gap-1 border-ds-success/30 bg-ds-success-soft text-ds-success font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-ds-success animate-pulse" />
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
          <Badge className="text-[11px] font-bold border-ds-warning/30 bg-ds-warning-soft text-ds-warning">
            {roleKey ? ROLES[roleKey as AppRole]?.label || roleKey : 'Corporate Admin'}
          </Badge>
        )
      case 'training_manager':
      case 'regional_hr':
      case 'property_hr':
        return (
          <Badge className="text-[11px] font-bold border-ds-accent/30 bg-ds-accent-soft text-ds-accent">
            {roleKey ? ROLES[roleKey as AppRole]?.label || roleKey : 'L&D Director'}
          </Badge>
        )
      case 'knowledge_manager':
        return (
          <Badge className="text-[11px] font-bold border-ds-success/30 bg-ds-success-soft text-ds-success">
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

  // Role category counts (Academy mental model)
  const roleCounts = useMemo(() => ({
    all: users?.length || 0,
    learners: users?.filter(u => ['learner', 'staff'].includes(u.role || '') || !u.role).length || 0,
    instructors: users?.filter(u => ['training_manager', 'manager', 'department_head', 'author', 'knowledge_manager', 'property_manager'].includes(u.role || '')).length || 0,
    admins: users?.filter(u => ['administrator', 'super_admin', 'corporate_admin', 'regional_admin', 'property_hr', 'regional_hr'].includes(u.role || '')).length || 0,
  }), [users])

  const seatUsage = entitlements?.usage?.learners ?? users?.length ?? 0
  const maxSeats = entitlements?.max_learners ?? 0
  const percentUsed = Math.min(100, Math.round((seatUsage / (maxSeats || 1)) * 100))
  const seatsAvailable = Math.max(0, maxSeats - seatUsage)
  const isNearSeatLimit = percentUsed >= 90

  const selectedResetCount = useMemo(() => filteredUsers
    ? filteredUsers.filter((u) => selectedUserIds.has(u.id) && u.force_password_reset).length
    : 0, [filteredUsers, selectedUserIds])

  if (!currentOrganization?.id) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center animate-in fade-in duration-300">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-ds-warning-soft border border-ds-warning/30 flex items-center justify-center mb-4">
          <Building className="h-7 w-7 text-ds-warning" />
        </div>
        <h2 className="text-xl font-bold font-serif text-foreground">
          {t('no_tenant_selected_title', 'Tenant Organization Context Required')}
        </h2>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-md mx-auto">
          {t(
            'no_tenant_selected_desc',
            'Organization User Management manages team members, learners, and role assignments for an active tenant organization.'
          )}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {isPlatformUser && (
            <Link to="/platform/users">
              <Button className="bg-ds-warning hover:bg-ds-warning text-ds-ink font-bold text-xs gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>{t('go_to_global_directory', 'Go to Platform User Directory')}</span>
              </Button>
            </Link>
          )}
          <Link to="/platform/organizations">
            <Button variant="outline" className="text-xs gap-1.5">
              <Building className="h-3.5 w-3.5" />
              <span>{t('select_organization', 'Select Customer Organization')}</span>
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (showForm) {
    return (
      <UserForm
        user={selectedUser || undefined}
        initialOrgId={currentOrganization.id}
        onClose={handleCloseForm}
      />
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <WorkspaceHeader
        eyebrow={t('people.eyebrow', 'Organization')}
        title={t('people.title', 'Team members')}
        context={maxSeats
          ? t('people.contextSeats', '{{count}} members · {{used}} of {{max}} seats used', { count: users?.length || 0, used: seatUsage, max: maxSeats })
          : t('people.context', '{{count}} members', { count: users?.length || 0 })}
        actions={
          <>
            {isPlatformUser && (
              <Link to="/platform/users" className={headerActionClass.secondary}>
                <Shield aria-hidden="true" className="h-4 w-4" />{t('platform_directory_button', 'Platform directory')}
              </Link>
            )}
            <Link data-tour="users-bulk-btn" to="/admin/users/bulk" className={headerActionClass.secondary}>
              <Upload aria-hidden="true" className="h-4 w-4" />{t('people.bulk', 'Import from CSV')}
            </Link>
            <button type="button" data-tour="users-invite-btn" onClick={() => setInviteDialogOpen(true)} disabled={isSeatLimitReached} className={`${headerActionClass.secondary} disabled:opacity-50`}>
              <MailPlus aria-hidden="true" className="h-4 w-4" />{t('people.invite', 'Invite by email')}
            </button>
            <button type="button" data-tour="users-add-btn" onClick={openCreateForm} disabled={isSeatLimitReached} className={`${headerActionClass.primary} disabled:opacity-50`}>
              <Plus aria-hidden="true" className="h-4 w-4" />{t('people.add', 'Add member')}
            </button>
          </>
        }
      />

      {maxSeats > 0 && percentUsed >= 90 && (
        <div role="status" className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-s-[3px] px-4 py-2.5 text-sm ${isSeatLimitReached ? 'border-ds-danger bg-ds-danger-soft text-ds-danger' : 'border-ds-warning bg-ds-warning-soft text-ds-ink'}`}>
          <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="font-semibold">
            {isSeatLimitReached
              ? t('people.seatsFull', 'All {{max}} seats are in use. New people cannot be added until seats are freed or the plan grows.', { max: maxSeats })
              : t('people.seatsNear', '{{available}} seats left of {{max}}.', { available: seatsAvailable, max: maxSeats })}
          </span>
        </div>
      )}

      {/* Pending User Approvals */}
      <PendingUserApprovals onCountChange={setPendingApprovalCount} />

      {/* Filters: role (underline tabs), status (chips), search */}
      <div className="space-y-3">
        <div role="tablist" aria-label={t('people.roleFilter', 'Filter by role')} className="flex gap-1 overflow-x-auto border-b border-ds-border">
          {(['all', 'learners', 'instructors', 'admins'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={roleCategoryFilter === cat}
              onClick={() => setRoleCategoryFilter(cat)}
              className={`-mb-px inline-flex min-h-[40px] shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent ${
                roleCategoryFilter === cat ? 'border-ds-ink text-ds-ink' : 'border-transparent text-ds-muted hover:text-ds-ink'
              }`}
            >
              {t(`role_filters.${cat}`, cat === 'all' ? 'Everyone' : cat === 'learners' ? 'Learners' : cat === 'instructors' ? 'Instructors' : 'Admins')}
              <span className="font-mono text-xs tabular-nums">{roleCounts[cat]}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label={t('people.statusFilter', 'Filter by status')} className="flex flex-wrap items-center gap-2">
            {(['all', 'active', 'suspended', 'locked', 'inactive'] as const)
              .filter((status) => status === 'all' || status === 'active' || statusCounts[status] > 0)
              .map((status) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={statusFilter === status}
                  onClick={() => setStatusFilter(status)}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent ${
                    statusFilter === status ? 'border-ds-ink bg-ds-ink text-ds-on-ink' : 'border-ds-border bg-ds-surface text-ds-ink hover:border-ds-border-strong'
                  }`}
                >
                  {status === 'all' ? t('people.anyStatus', 'Any status') : t(`status.${status}`)}
                  <span className="font-mono text-xs tabular-nums opacity-70">{statusCounts[status]}</span>
                </button>
              ))}
          </div>

          <div className="relative w-full lg:w-80">
            <label htmlFor="people-search" className="sr-only">{t('search_placeholder', 'Search by name, email, or staff ID...')}</label>
            <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-muted" />
            <input
              id="people-search"
              type="search"
              placeholder={t('people.search', 'Name, email or staff ID')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-h-[40px] w-full rounded-md border border-ds-border bg-ds-surface ps-9 pe-3 text-sm text-ds-ink placeholder:text-ds-muted focus:border-ds-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
            />
          </div>
        </div>
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

      {/* Roster */}
      {isLoading ? (
        <div className="space-y-px overflow-hidden rounded-[6px] border border-ds-border" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse bg-ds-surface-subtle" />)}
        </div>
      ) : filteredUsers && filteredUsers.length > 0 ? (
        <div data-tour="users-table" className="overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
          <div className="flex items-center gap-3 border-b border-ds-border px-4 py-2 text-xs text-ds-muted">
            <button
              type="button"
              onClick={selectedUserIds.size === filteredUsers.length ? deselectAll : selectAllVisible}
              aria-label={selectedUserIds.size === filteredUsers.length ? t('bulk.deselect_all', 'Deselect all') : t('bulk.select_all', 'Select all visible')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-ds-surface-subtle"
            >
              {selectedUserIds.size === filteredUsers.length
                ? <CheckSquare aria-hidden="true" className="h-4 w-4 text-ds-ink" />
                : <Square aria-hidden="true" className="h-4 w-4" />}
            </button>
            <span>{t('people.showing', '{{count}} people', { count: filteredUsers.length })}</span>
          </div>
          <ul className="divide-y divide-ds-border">
            {filteredUsers.map((user) => {
              const selected = selectedUserIds.has(user.id)
              const place = user.departments && user.departments.length > 0
                ? user.departments.map((d) => d.name).join(', ')
                : null
              return (
                <li
                  key={user.id}
                  className={`group flex items-center gap-3 px-4 py-3 ${selected ? 'bg-ds-accent-soft' : 'hover:bg-ds-surface-subtle'}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleUserSelection(user.id)}
                    aria-label={t('people.select', 'Select {{name}}', { name: user.full_name || user.email })}
                    aria-pressed={selected}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ds-muted hover:text-ds-ink"
                  >
                    {selected ? <CheckSquare aria-hidden="true" className="h-4 w-4 text-ds-ink" /> : <Square aria-hidden="true" className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailUser(user)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={user.avatar_url || ''} className="object-cover" alt="" />
                      <AvatarFallback className="bg-ds-surface-subtle text-xs font-semibold text-ds-ink">
                        {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="truncate text-sm font-medium text-ds-ink">{user.full_name || t('no_name', 'Unnamed')}</span>
                        {user.staff_id && <span className="font-mono text-xs text-ds-muted">{user.staff_id}</span>}
                      </span>
                      <span className="block truncate text-xs text-ds-muted">
                        {[user.job_title, place].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </button>

                  <span className="hidden shrink-0 md:block">{getRoleBadge(user.role)}</span>
                  <span className="hidden w-24 shrink-0 text-end text-xs text-ds-muted lg:block">
                    {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : t('people.neverSignedIn', 'Never signed in')}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {(user.account_status && user.account_status !== 'active') || !user.is_active ? getStatusBadge(user) : null}
                    {user.force_password_reset && (
                      <span className="hidden rounded-[3px] bg-ds-warning-soft px-1.5 py-0.5 text-[11px] font-medium text-ds-warning sm:inline">
                        {t_ext('reset', 'Reset required')}
                      </span>
                    )}
                  </span>

                  <span className="flex shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-ds-muted hover:text-ds-ink"
                      onClick={() => handleEdit(user)}
                      aria-label={t('actions.edit', 'Edit user')}
                    >
                      <Edit aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-ds-muted hover:text-ds-ink" aria-label={t('actions.more', 'More actions')}>
                          <MoreVertical aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.account_status === 'suspended' ? (
                          <DropdownMenuItem onClick={() => openActionDialog(user, 'reactivate')} className="gap-2">
                            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                            {t('account_actions.reactivate', 'Reactivate account')}
                          </DropdownMenuItem>
                        ) : user.is_active && (
                          <DropdownMenuItem onClick={() => openActionDialog(user, 'suspend')} className="gap-2">
                            <ShieldOff aria-hidden="true" className="h-4 w-4" />
                            {t('account_actions.suspend', 'Suspend account')}
                          </DropdownMenuItem>
                        )}
                        {user.account_status === 'locked' && (
                          <DropdownMenuItem onClick={() => openActionDialog(user, 'unlock')} className="gap-2">
                            <Unlock aria-hidden="true" className="h-4 w-4" />
                            {t('account_actions.unlock', 'Unlock account')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => openActionDialog(user, 'force_password_reset')} className="gap-2">
                          <KeyRound aria-hidden="true" className="h-4 w-4" />
                          {t('account_actions.force_password_reset', 'Require a new password')}
                        </DropdownMenuItem>
                        {user.force_password_reset && (
                          <DropdownMenuItem onClick={() => openActionDialog(user, 'cancel_password_reset')} className="gap-2">
                            <XCircle aria-hidden="true" className="h-4 w-4" />
                            {t('account_actions.cancel_password_reset', 'Cancel password reset')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => openActionDialog(user, 'resend_credentials')} className="gap-2">
                          <MailPlus aria-hidden="true" className="h-4 w-4" />
                          {t('account_actions.resend_credentials', 'Resend sign-in details')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.is_active ? (
                          <DropdownMenuItem onClick={() => { setUserToDelete(user); setDeleteConfirmOpen(true) }} className="gap-2 text-ds-danger focus:text-ds-danger">
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                            {t('bulk.deactivate', 'Deactivate')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => activateUserMutation.mutate(user.id)} className="gap-2 text-ds-success focus:text-ds-success">
                            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                            {t('bulk.activate', 'Activate')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => { setUserToHardDelete(user); setHardDeleteConfirmOpen(true) }} className="gap-2 text-ds-danger focus:text-ds-danger">
                          <UserX aria-hidden="true" className="h-4 w-4" />
                          {t('bulk.hard_delete', 'Delete permanently')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={searchTerm || statusFilter !== 'all' || roleCategoryFilter !== 'all' ? t('people.noMatch', 'Nobody matches these filters') : t('empty.title', 'No people yet')}
          description={searchTerm || statusFilter !== 'all' || roleCategoryFilter !== 'all' ? t('people.noMatchBody', 'Try another role, status or search.') : t('empty.description', 'Invite colleagues or add them directly.')}
          action={{
            label: t('add_user', 'Add a person'),
            onClick: openCreateForm,
            icon: Plus
          }}
        />
      )}

      {/* Slide-over User Profile Detail Drawer */}
      <Sheet open={!!detailUser} onOpenChange={(open) => !open && setDetailUser(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto bg-card/95 backdrop-blur-2xl border-s border-ds-warning/30 shadow-2xl">
          {detailUser && (
            <div className="flex flex-col h-full">
              {/* Drawer Header Banner */}
              <div className="relative p-6 border-b border-border/40">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 rounded-2xl border-2 border-ds-warning/30 shadow-md">
                    <AvatarImage src={detailUser.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="bg-ds-warning-soft text-ds-warning font-bold text-xl">
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
                    <Mail className="h-3.5 w-3.5 text-ds-warning" />
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

                {/* Department */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-ds-accent" />
                    <span>Organizational Scope</span>
                  </h4>
                  <div className="rounded-2xl border border-border/50 bg-background/50 p-4 space-y-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block mb-1">{t('users:organization', 'Organization')}:</span>
                      <Badge variant="secondary" className="text-xs font-semibold gap-1.5 py-1">
                        <Building className="h-3.5 w-3.5 text-ds-warning" />
                        {isRTL && (detailUser.organizations as any)?.name_ar 
                          ? (detailUser.organizations as any).name_ar 
                          : (detailUser.organizations?.name || organizations.find(o => o.id === detailUser.organization_id)?.name || t('users:organization', 'Organization'))}
                      </Badge>
                    </div>

                    <div>
                      <span className="text-muted-foreground block mb-1">{t('people.departments', 'Departments')}:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {detailUser.departments && detailUser.departments.length > 0 ? (
                          detailUser.departments.map(d => (
                            <Badge key={d.id} variant="outline" className="text-[11px] border-ds-accent/30 bg-ds-accent-soft text-foreground">
                              <Briefcase className="h-3 w-3 me-1 text-ds-accent" />
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
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ds-danger flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Security Flag Telemetry</span>
                    </h4>
                    <div className="rounded-2xl border border-ds-danger/30 bg-ds-danger/[0.06] p-4 space-y-2 text-xs">
                      {detailUser.account_status === 'suspended' && (
                        <div>
                          <span className="font-bold text-ds-danger block">Account Suspended</span>
                          {detailUser.suspend_reason && (
                            <p className="text-muted-foreground mt-0.5">{detailUser.suspend_reason}</p>
                          )}
                        </div>
                      )}
                      {detailUser.force_password_reset && (
                        <div className="text-ds-warning font-semibold">
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
                  className="w-full h-10 rounded-xl text-ds-on-ink font-bold text-xs shadow-md shadow-amber-500/20 bg-ds-ink"
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
                      <><ShieldCheck className="h-3.5 w-3.5 me-1 text-ds-success" />Reactivate</>
                    ) : (
                      <><ShieldOff className="h-3.5 w-3.5 me-1 text-ds-danger" />Suspend</>
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
                    <KeyRound className="h-3.5 w-3.5 me-1 text-ds-warning" />
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
              <MailPlus className="w-5 h-5 text-ds-brass" />
              {t('form.invite_user', 'Invite User')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'form.invite_description',
                'Send an invitation email. The user will set a password and complete their profile from the link.'
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Target Organization Badge */}
          {currentOrganization && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border text-xs my-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-ds-warning" />
                {t('users:organization', 'Organization')}:
              </span>
              <Badge variant="secondary" className="font-semibold text-xs">
                {isRTL && (currentOrganization as any).name_ar ? (currentOrganization as any).name_ar : currentOrganization.name}
              </Badge>
            </div>
          )}

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
            <Label htmlFor="invite-department">{t('form.departments', 'Department')}</Label>
            <select
              id="invite-department"
              value={inviteDepartmentId}
              onChange={(e) => setInviteDepartmentId(e.target.value)}
              disabled={inviteUserMutation.isPending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">
                {t('form.select_department', 'Select department (optional)')}
              </option>
              {(departments || []).map((department) => (
                <option key={department.id} value={department.id}>
                  {isRTL && (department as any).name_ar ? (department as any).name_ar : department.name}
                </option>
              ))}
            </select>
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
              {actionType === 'suspend' && <ShieldOff className="w-5 h-5 text-ds-danger" />}
              {actionType === 'reactivate' && <ShieldCheck className="w-5 h-5 text-ds-success" />}
              {actionType === 'force_password_reset' && <KeyRound className="w-5 h-5 text-ds-warning" />}
              {actionType === 'cancel_password_reset' && <XCircle className="w-5 h-5 text-ds-muted" />}
              {actionType === 'unlock' && <Unlock className="w-5 h-5 text-ds-accent" />}
              {actionType === 'resend_credentials' && <MailPlus className="w-5 h-5 text-ds-accent" />}
              {actionType && t(`account_actions.${actionType}`)}
            </DialogTitle>
            <DialogDescription>
              {actionTargetUser && (
                <span className="font-medium">{actionTargetUser.full_name || actionTargetUser.email}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-ds-muted">
              {actionType && t(`account_actions.confirm_${actionType === 'force_password_reset'
                ? 'force_reset'
                : actionType === 'cancel_password_reset'
                  ? 'cancel_reset'
                  : actionType}`)}
            </p>

            {actionType === 'suspend' && (
              <div>
                <label className="block text-sm font-medium text-ds-ink mb-1">
                  {t('account_actions.suspend_reason')}
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder={t('account_actions.suspend_reason_placeholder')}
                  className="w-full px-3 py-2 border border-ds-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ds-brass focus:border-ds-brass resize-none"
                  rows={3}
                />
              </div>
            )}

            {actionType === 'suspend' && (
              <div>
                <Label className="text-sm font-medium text-ds-ink mb-1">{t_ext('suspend_until_optional', 'Suspend Until (Optional)')}</Label>
                <input
                  type="datetime-local"
                  value={suspendUntil}
                  onChange={(e) => setSuspendUntil(e.target.value)}
                  className="w-full px-3 py-2 border border-ds-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ds-brass focus:border-ds-brass"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="notify-user" checked={notifyUser} onCheckedChange={(checked) => setNotifyUser(!!checked)} />
                <Label htmlFor="notify-user" className="text-sm">{t_ext('notify_user_about_this_action', 'Notify user about this action')}</Label>
              </div>
              <div>
                <Label className="text-sm font-medium text-ds-ink mb-1">{t_ext('internal_note_optional', 'Internal Note (Optional)')}</Label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={t_ext('add_a_note_for_the_audit_trail', 'Add a note for the audit trail')}
                  className="w-full px-3 py-2 border border-ds-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ds-brass focus:border-ds-brass resize-none"
                  rows={2}
                />
              </div>
            </div>

            {actionTargetUser?.account_status === 'suspended' && actionTargetUser?.suspend_reason && (
              <div className="bg-ds-danger-soft border border-ds-danger/30 rounded-md p-3">
                <p className="text-xs font-medium text-ds-danger mb-1">{t('account_actions.suspend_reason')}:</p>
                <p className="text-sm text-ds-danger">{actionTargetUser.suspend_reason}</p>
                {actionTargetUser.suspended_at && (
                  <p className="text-xs text-ds-danger mt-1">
                    {t('account_actions.suspended_at')}: {new Date(actionTargetUser.suspended_at).toLocaleString()}
                  </p>
                )}
                {actionTargetUser.suspended_until && (
                  <p className="text-xs text-ds-danger mt-1">
                    {t_ext('suspended_until', 'Suspended until:')}{new Date(actionTargetUser.suspended_until).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {actionNotesQuery.data && actionNotesQuery.data.length > 0 && (
              <div className="border rounded-md p-3">
                <p className="text-xs font-medium text-ds-muted mb-2">{t_ext('recent_admin_notes', 'Recent Admin Notes')}</p>
                <div className="space-y-2">
                  {actionNotesQuery.data.map((note: AccountActionNote) => (
                    <div key={note.id} className="text-xs text-ds-muted">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{note.action.replace(/_/g, ' ')}</span>
                        <span>{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-ds-ink">{note.note}</div>
                      {note.created_by && (
                        <div className="text-[10px] text-ds-muted">
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
