import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { platformService } from '@/services/platformService'
import { supabase } from '@/lib/supabase'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Users,
  Search,
  Building2,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Shield,
  Crown,
  UserPlus,
  Activity,
  CheckCircle2,
  GraduationCap,
  Loader2,
  X,
  Lock,
  Unlock,
  KeyRound,
  MailPlus,
  Eye,
  MoreVertical,
  AlertTriangle,
  Download,
  UserX,
  UserCheck,
  FileText,
  Clock,
  Briefcase,
  Phone,
  Calendar,
  Sparkles,
  Edit,
  Ban,
  History,
  Mail,
} from 'lucide-react'
import { format } from 'date-fns'

export default function PlatformUserDirectory() {
  const { t, i18n } = useTranslation(['admin', 'common'])
  const { toast } = useToast()
  const { user: currentActor } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'platform_team' | 'customer_directory'>('platform_team')
  const [search, setSearch] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState('all')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'suspended' | 'locked'>('all')
  const [selectedSecurityFilter, setSelectedSecurityFilter] = useState<'all' | 'locked' | 'reset_pending' | 'suspended'>('all')
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<'all' | 'operators_only' | 'learners_only'>('all')

  // Bulk Selection & Operations
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false)
  const [bulkActionType, setBulkActionType] = useState<'suspend' | 'reactivate' | 'force_password_reset' | null>(null)
  const [bulkReason, setBulkReason] = useState('reason_policy_violation')
  const [bulkNote, setBulkNote] = useState('')
  const [bulkSuspendUntil, setBulkSuspendUntil] = useState('')

  // Single Action Modal State
  const [actionUser, setActionUser] = useState<any | null>(null)
  const [actionType, setActionType] = useState<'suspend' | 'reactivate' | 'force_password_reset' | 'unlock' | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [suspendReason, setSuspendReason] = useState('reason_policy_violation')
  const [suspendUntil, setSuspendUntil] = useState('')
  const [actionNote, setActionNote] = useState('')

  // User Inspection Drawer State
  const [inspectUserId, setInspectUserId] = useState<string | null>(null)
  const [inspectedUser, setInspectedUser] = useState<any | null>(null)
  const [inspectDrawerOpen, setInspectDrawerOpen] = useState(false)

  // Edit Profile Modal State
  const [editingProfileUser, setEditingProfileUser] = useState<any | null>(null)
  const [editProfileName, setEditProfileName] = useState('')
  const [editProfileJobTitle, setEditProfileJobTitle] = useState('')
  const [editProfilePhone, setEditProfilePhone] = useState('')

  const [sortBy, setSortBy] = useState<'name' | 'newest' | 'tenants'>('name')
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [newPlatformRole, setNewPlatformRole] = useState<string>('platform_support')
  const [detachTenantOnPromote, setDetachTenantOnPromote] = useState(false)
  // Tenant-membership management modal
  const [managingTenantsUser, setManagingTenantsUser] = useState<any | null>(null)
  const [addTenantOrgId, setAddTenantOrgId] = useState('')
  const [addTenantRole, setAddTenantRole] = useState('learner')

  // Add operator modal state
  const [addOperatorOpen, setAddOperatorOpen] = useState(false)
  const [addOperatorMode, setAddOperatorMode] = useState<'promote' | 'invite'>('promote')
  const [candidateSearch, setCandidateSearch] = useState('')
  const [selectedCandidateUserId, setSelectedCandidateUserId] = useState('')
  const [selectedCandidateUser, setSelectedCandidateUser] = useState<{
    id: string
    full_name?: string | null
    email: string
    job_title?: string | null
    avatar_url?: string | null
  } | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFullName, setInviteFullName] = useState('')
  const [addOperatorRole, setAddOperatorRole] = useState('platform_admin')

  // 1. Fetch Internal Platform Operators (Our Team)
  const { data: platformOperators = [], isLoading: isLoadingOperators, refetch: refetchOperators } = useQuery({
    queryKey: ['platform-internal-operators'],
    queryFn: () => platformService.listPlatformUsers(),
    staleTime: 1000 * 30,
  })

  // 2. Fetch Customer Organizations for filter & stats
  const { data: orgs = [] } = useQuery({
    queryKey: ['platform-orgs-filter'],
    queryFn: () => platformService.getOrganizations(),
    staleTime: 1000 * 60 * 5,
  })

  // 3. Fetch Cross-Tenant Customer & Learner Directory
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['platform-global-user-directory', search, selectedOrgId, selectedRole],
    queryFn: () =>
      platformService.getPlatformUserDirectory({
        search: search || undefined,
        organizationId: selectedOrgId !== 'all' ? selectedOrgId : undefined,
        role: selectedRole !== 'all' ? selectedRole : undefined,
        limit: 100,
      }),
    staleTime: 1000 * 15,
  })

  // 4. Fetch Platform Live Statistics
  const { data: platformStats } = useQuery({
    queryKey: ['platform-stats-telemetry'],
    queryFn: () => platformService.getPlatformStats(),
    staleTime: 1000 * 60 * 2,
  })

  // Candidate users for promotion search
  const { data: candidateUsers = [], isLoading: isLoadingCandidates } = useQuery({
    queryKey: ['candidate-users-search', candidateSearch],
    enabled: addOperatorOpen && addOperatorMode === 'promote',
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, job_title, avatar_url, organization_id')
        .order('created_at', { ascending: false })
        .limit(10)

      const term = candidateSearch.trim()
      if (term.length > 0) {
        query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`)
      }

      const { data, error } = await query
      if (error) {
        console.error('Failed to search candidate profiles:', error)
        return []
      }
      return data || []
    },
    staleTime: 1000 * 10,
  })

  // Detect if invite email belongs to an existing registered user
  const { data: matchedInviteProfile } = useQuery({
    queryKey: ['check-invite-email-exists', inviteEmail],
    enabled: addOperatorOpen && addOperatorMode === 'invite' && inviteEmail.trim().includes('@'),
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .ilike('email', inviteEmail.trim().toLowerCase())
        .maybeSingle()
      return data
    },
    staleTime: 1000 * 5,
  })

  // Telemetry inspection query for selected user
  const { data: inspectedUserData, isLoading: isLoadingInspection, refetch: refetchInspection } = useQuery({
    queryKey: ['platform-user-inspection', inspectUserId],
    enabled: inspectDrawerOpen && !!inspectUserId,
    queryFn: () => platformService.getUserSecurityProfile(inspectUserId!),
    staleTime: 1000 * 10,
  })

  const suspendUserMutation = useMutation({
    mutationFn: (params: { userId: string; reason: string; suspendUntil?: string; note?: string }) =>
      platformService.suspendPlatformUser({
        userId: params.userId,
        reason: params.reason,
        suspendUntil: params.suspendUntil || null,
        note: params.note || null,
        actorId: currentActor?.id,
      }),
    onSuccess: () => {
      toast({
        title: t('admin:platform_user_mgmt.toast_suspend_success', 'Account suspended successfully'),
      })
      setActionDialogOpen(false)
      setActionUser(null)
      setActionNote('')
      setSuspendUntil('')
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
      queryClient.invalidateQueries({ queryKey: ['platform-internal-operators'] })
      if (inspectUserId) queryClient.invalidateQueries({ queryKey: ['platform-user-inspection', inspectUserId] })
    },
    onError: (err: any) => {
      toast({ title: t('admin:status_update_failed', 'Status Update Failed'), description: err.message, variant: 'destructive' })
    },
  })

  const reactivateUserMutation = useMutation({
    mutationFn: (params: { userId: string; note?: string }) =>
      platformService.reactivatePlatformUser({
        userId: params.userId,
        note: params.note || null,
        actorId: currentActor?.id,
      }),
    onSuccess: () => {
      toast({
        title: t('admin:platform_user_mgmt.toast_reactivate_success', 'Account reactivated successfully'),
      })
      setActionDialogOpen(false)
      setActionUser(null)
      setActionNote('')
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
      queryClient.invalidateQueries({ queryKey: ['platform-internal-operators'] })
      if (inspectUserId) queryClient.invalidateQueries({ queryKey: ['platform-user-inspection', inspectUserId] })
    },
    onError: (err: any) => {
      toast({ title: t('admin:status_update_failed', 'Status Update Failed'), description: err.message, variant: 'destructive' })
    },
  })

  const forcePasswordResetMutation = useMutation({
    mutationFn: (params: { userId: string; note?: string }) =>
      platformService.forceUserPasswordReset({
        userId: params.userId,
        note: params.note || null,
        actorId: currentActor?.id,
      }),
    onSuccess: () => {
      toast({
        title: t('admin:platform_user_mgmt.toast_reset_success', 'Password reset enforced'),
      })
      setActionDialogOpen(false)
      setActionUser(null)
      setActionNote('')
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
      if (inspectUserId) queryClient.invalidateQueries({ queryKey: ['platform-user-inspection', inspectUserId] })
    },
    onError: (err: any) => {
      toast({ title: t('admin:status_update_failed', 'Status Update Failed'), description: err.message, variant: 'destructive' })
    },
  })

  const unlockUserMutation = useMutation({
    mutationFn: (params: { userId: string }) =>
      platformService.unlockUserAccount({
        userId: params.userId,
        actorId: currentActor?.id,
      }),
    onSuccess: () => {
      toast({
        title: t('admin:platform_user_mgmt.toast_unlock_success', 'Account unlocked successfully'),
      })
      setActionDialogOpen(false)
      setActionUser(null)
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
      if (inspectUserId) queryClient.invalidateQueries({ queryKey: ['platform-user-inspection', inspectUserId] })
    },
    onError: (err: any) => {
      toast({ title: t('admin:status_update_failed', 'Status Update Failed'), description: err.message, variant: 'destructive' })
    },
  })

  const bulkActionMutation = useMutation({
    mutationFn: (params: { userIds: string[]; action: 'suspend' | 'reactivate' | 'force_password_reset'; reason?: string; suspendUntil?: string; note?: string }) =>
      platformService.bulkExecuteUserAction({
        userIds: params.userIds,
        action: params.action,
        reason: params.reason,
        suspendUntil: params.suspendUntil,
        note: params.note,
        actorId: currentActor?.id,
      }),
    onSuccess: (result) => {
      toast({
        title: t('admin:platform_user_mgmt.toast_bulk_success', 'Bulk action completed'),
        description: `Successfully processed ${result.successCount} accounts.${result.failCount > 0 ? ` (${result.failCount} failed)` : ''}`,
      })
      setBulkActionDialogOpen(false)
      setSelectedUserIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
      queryClient.invalidateQueries({ queryKey: ['platform-internal-operators'] })
    },
    onError: (err: any) => {
      toast({ title: t('admin:status_update_failed', 'Status Update Failed'), description: err.message, variant: 'destructive' })
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: (params: { userId: string; updates: any }) =>
      platformService.updateUserProfileDetails({
        userId: params.userId,
        updates: params.updates,
        actorId: currentActor?.id,
      }),
    onSuccess: () => {
      toast({ title: t('common:saved', 'Saved successfully') })
      setEditingProfileUser(null)
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
      if (inspectUserId) queryClient.invalidateQueries({ queryKey: ['platform-user-inspection', inspectUserId] })
    },
    onError: (err: any) => {
      toast({ title: t('admin:status_update_failed', 'Status Update Failed'), description: err.message, variant: 'destructive' })
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (params: { userId: string; isActive: boolean }) =>
      platformService.toggleUserActiveStatus({
        userId: params.userId,
        isActive: params.isActive,
        actorId: currentActor?.id,
      }),
    onSuccess: (_, vars) => {
      toast({
        title: vars.isActive ? t('admin:user_activated_toast', 'User Activated') : t('admin:user_suspended_toast', 'User Suspended'),
        description: t('admin:user_status_updated_desc', 'The user account status has been updated across the platform.'),
      })
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
    },
    onError: (err: any) => {
      toast({ title: t('admin:status_update_failed', 'Status Update Failed'), description: err.message, variant: 'destructive' })
    },
  })

  const assignRoleMutation = useMutation({
    mutationFn: async (params: { userId: string; role: string; detachTenant?: boolean }) => {
      await platformService.assignPlatformRole({ userId: params.userId, role: params.role })
      if (params.detachTenant) {
        await platformService.detachUserFromTenant({
          userId: params.userId,
          actorId: currentActor?.id,
          role: params.role,
        })
      }
    },
    onSuccess: () => {
      toast({
        title: editingUser?.is_platform_user
          ? t('admin:platform_role_granted_toast', 'Platform Role Granted')
          : t('admin:platform_user_mgmt.toast_promote_success', 'User successfully promoted to platform operator'),
        description: t('admin:platform_role_granted_desc', 'The user is now an internal platform operator with the selected role.'),
      })
      setEditingUser(null)
      setDetachTenantOnPromote(false)
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
      queryClient.invalidateQueries({ queryKey: ['platform-internal-operators'] })
      if (inspectUserId) queryClient.invalidateQueries({ queryKey: ['platform-user-inspection', inspectUserId] })
    },
    onError: (err: any) => {
      toast({ title: t('admin:role_assignment_failed', 'Role Assignment Failed'), description: err.message, variant: 'destructive' })
    },
  })

  const revokeRoleMutation = useMutation({
    mutationFn: (params: { userId: string; role: string }) =>
      platformService.revokePlatformRole({ userId: params.userId, role: params.role }),
    onSuccess: () => {
      toast({ title: t('admin:operator_access_revoked_toast', 'Operator Access Revoked'), description: t('admin:operator_access_revoked_desc', 'The platform role was removed.') })
      setEditingUser(null)
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
      queryClient.invalidateQueries({ queryKey: ['platform-internal-operators'] })
    },
    onError: (err: any) => {
      toast({ title: t('admin:revoke_failed', 'Revoke Failed'), description: err.message, variant: 'destructive' })
    },
  })

  // Add / change role / remove a user's tenant membership (audited via platform_set_membership)
  const setMembershipMutation = useMutation({
    mutationFn: (params: { orgId: string; userId: string; role: string; active: boolean }) =>
      platformService.setTenantMembership({
        orgId: params.orgId,
        userId: params.userId,
        role: params.role,
        active: params.active,
      }),
    onSuccess: (_, vars) => {
      toast({
        title: vars.active
          ? t('admin:membership_updated_toast', 'Tenant membership updated')
          : t('admin:membership_removed_toast', 'Removed from tenant'),
        description: t('admin:membership_updated_desc', 'The change is recorded in the platform audit log.'),
      })
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
      setManagingTenantsUser((prev: any) =>
        prev
          ? {
              ...prev,
              memberships: (prev.memberships || [])
                .filter((m: any) => !(m.organization_id === vars.orgId && !vars.active))
                .map((m: any) =>
                  m.organization_id === vars.orgId ? { ...m, role: vars.role, is_active: vars.active } : m,
                )
                .concat(
                  vars.active && !(prev.memberships || []).some((m: any) => m.organization_id === vars.orgId)
                    ? [{
                        organization_id: vars.orgId,
                        organization_name: orgs.find((o) => o.id === vars.orgId)?.name || 'Organization',
                        role: vars.role,
                        is_active: true,
                      }]
                    : [],
                ),
            }
          : prev,
      )
      setAddTenantOrgId('')
      setAddTenantRole('learner')
    },
    onError: (err: any) => {
      toast({ title: t('admin:membership_update_failed', 'Membership update failed'), description: err.message, variant: 'destructive' })
    },
  })

  const setOperatorActiveMutation = useMutation({
    mutationFn: (params: { userId: string; active: boolean }) =>
      platformService.setPlatformUserActive(params),
    onSuccess: () => {
      toast({
        title: t('admin:operator_status_toggled', 'Operator Status Updated'),
        description: t('admin:user_status_updated_desc', 'The platform operator active status has been updated.'),
      })
      queryClient.invalidateQueries({ queryKey: ['platform-internal-operators'] })
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
    },
    onError: (err: any) => {
      toast({ title: t('admin:status_update_failed', 'Status Update Failed'), description: err.message, variant: 'destructive' })
    },
  })

  const addOperatorMutation = useMutation({
    mutationFn: async () => {
      let targetUserId = selectedCandidateUserId

      if (addOperatorMode === 'invite') {
        const trimmedEmail = inviteEmail.trim().toLowerCase()
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
          throw new Error('Please enter a valid operator email address.')
        }

        // Check if user already exists in profiles first
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .ilike('email', trimmedEmail)
          .maybeSingle()

        if (existingProfile?.id) {
          targetUserId = existingProfile.id
        } else {
          const appUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')
          const { data, error } = await supabase.functions.invoke('create-user', {
            body: {
              email: trimmedEmail,
              fullName: inviteFullName.trim() || 'Platform Operator',
              role: 'staff',
              provisioningMethod: 'invite',
              appUrl,
            },
          })

          if (error || data?.error) {
            let detail = error?.message || data?.error || 'Failed to create platform operator account.'
            if (error && typeof (error as any).context?.json === 'function') {
              try {
                const errJson = await (error as any).context.json()
                if (errJson?.error) detail = errJson.error
              } catch {
                // Keep default detail
              }
            }
            throw new Error(detail)
          }

          targetUserId = data?.userId
        }
      }

      if (!targetUserId) {
        throw new Error('Target user account is required to assign platform role.')
      }

      await platformService.assignPlatformRole({
        userId: targetUserId,
        role: addOperatorRole,
        scopeType: 'global',
      })
    },
    onSuccess: () => {
      toast({
        title: t('admin:operator_added_success', 'Platform Operator Assigned'),
        description: t('admin:platform_role_granted_desc', 'The user is now an internal platform operator with the selected role.'),
      })
      setAddOperatorOpen(false)
      setSelectedCandidateUserId('')
      setSelectedCandidateUser(null)
      setCandidateSearch('')
      setInviteEmail('')
      setInviteFullName('')
      queryClient.invalidateQueries({ queryKey: ['platform-internal-operators'] })
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
    },
    onError: (err: any) => {
      toast({ title: t('admin:role_assignment_failed', 'Role Assignment Failed'), description: err.message, variant: 'destructive' })
    },
  })

  const PLATFORM_ROLE_OPTIONS: Array<{ value: string; label: string; description: string }> = [
    { value: 'system_owner', label: 'System Owner', description: 'Full root access, platform database governance, operator grants' },
    { value: 'platform_admin', label: 'Platform Admin', description: 'Tenants, operators, billing plans, and master content' },
    { value: 'platform_training_manager', label: 'Platform Training Manager', description: 'Global master curriculum, course deployments, and templates' },
    { value: 'platform_knowledge_manager', label: 'Platform Knowledge Manager', description: 'Global master SOPs, regulatory policies, compliance library' },
    { value: 'platform_operations', label: 'Platform Operations', description: 'AI gateways, background queues, telemetry and system health' },
    { value: 'platform_support', label: 'Platform Support', description: 'Assisted tenant access, troubleshooting, ticket resolution' },
    { value: 'platform_instructor', label: 'Platform Instructor', description: 'Master course authoring and global instructional delivery' },
  ]

  const TENANT_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'organization_owner', label: 'Organization Owner' },
    { value: 'organization_admin', label: 'Organization Admin' },
    { value: 'brand_admin', label: 'Brand Admin' },
    { value: 'hotel_admin', label: 'Hotel / Branch Admin' },
    { value: 'department_manager', label: 'Department Manager' },
    { value: 'training_manager', label: 'Training Manager' },
    { value: 'instructor', label: 'Instructor' },
    { value: 'knowledge_manager', label: 'Knowledge Manager' },
    { value: 'author', label: 'Author' },
    { value: 'learner', label: 'Learner' },
  ]

  // Status filter + security filter + operator filter + sort are applied client-side
  const displayedUsers = useMemo(() => {
    let list = users
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active') {
        list = list.filter((u) => u.is_active && (u.account_status === 'active' || !u.account_status))
      } else if (selectedStatus === 'suspended') {
        list = list.filter((u) => u.account_status === 'suspended' || !u.is_active)
      } else if (selectedStatus === 'locked') {
        list = list.filter((u) => u.account_status === 'locked' || (u.locked_until && new Date(u.locked_until) > new Date()))
      }
    }
    if (selectedSecurityFilter !== 'all') {
      if (selectedSecurityFilter === 'locked') {
        list = list.filter((u) => u.account_status === 'locked' || (u.failed_login_attempts && u.failed_login_attempts > 0) || (u.locked_until && new Date(u.locked_until) > new Date()))
      } else if (selectedSecurityFilter === 'reset_pending') {
        list = list.filter((u) => !!u.force_password_reset)
      } else if (selectedSecurityFilter === 'suspended') {
        list = list.filter((u) => u.account_status === 'suspended' || !u.is_active)
      }
    }
    if (selectedOperatorFilter !== 'all') {
      if (selectedOperatorFilter === 'operators_only') {
        list = list.filter((u) => !!u.is_platform_user || !!u.platform_role)
      } else if (selectedOperatorFilter === 'learners_only') {
        list = list.filter((u) => !u.is_platform_user && !u.platform_role)
      }
    }
    const sorted = [...list]
    if (sortBy === 'name') {
      sorted.sort((a, b) => (a.full_name || a.email || '').localeCompare(b.full_name || b.email || ''))
    } else if (sortBy === 'newest') {
      sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    } else if (sortBy === 'tenants') {
      sorted.sort((a, b) => (b.membership_count || 0) - (a.membership_count || 0))
    }
    return sorted
  }, [users, selectedStatus, selectedSecurityFilter, selectedOperatorFilter, sortBy])

  const filteredOperators = useMemo(() => {
    if (!search) return platformOperators
    const q = search.toLowerCase()
    return platformOperators.filter(
      (op) =>
        op.full_name?.toLowerCase().includes(q) ||
        op.email?.toLowerCase().includes(q) ||
        op.roles?.some((r) => r.toLowerCase().includes(q))
    )
  }, [platformOperators, search])

  const totalUsersCount = users.length
  const totalOperatorsCount = platformOperators.length
  const totalLearnersCount = platformStats?.totalLearners ?? users.filter((u) => !u.is_platform_user).length
  const suspendedCount = users.filter((u) => u.account_status === 'suspended' || !u.is_active).length
  const lockedOrRiskCount = users.filter((u) => u.account_status === 'locked' || !!u.force_password_reset || (u.failed_login_attempts && u.failed_login_attempts > 0)).length
  const activeUsersCount = users.filter((u) => u.is_active && u.account_status !== 'suspended').length
  const healthRatio = users.length > 0 ? Math.round((activeUsersCount / users.length) * 100) : 100

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedUserIds.size === displayedUsers.length) {
      setSelectedUserIds(new Set())
    } else {
      setSelectedUserIds(new Set(displayedUsers.map((u) => u.id)))
    }
  }

  const handleToggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // CSV Export Handler
  const handleExportCsv = (usersToExport = displayedUsers) => {
    const headers = [
      'User ID',
      'Full Name',
      'Email',
      'Job Title',
      'Phone',
      'Primary Organization',
      'Platform Role',
      'Account Status',
      'Active',
      'Failed Logins',
      'Locked Until',
      'Force Password Reset',
      'Joined Date'
    ]

    const rows = usersToExport.map((u) => [
      `"${u.id}"`,
      `"${(u.full_name || '').replace(/"/g, '""')}"`,
      `"${u.email || ''}"`,
      `"${(u.job_title || '').replace(/"/g, '""')}"`,
      `"${u.phone || ''}"`,
      `"${(u.primary_organization_name || '').replace(/"/g, '""')}"`,
      `"${u.platform_role || 'None'}"`,
      `"${u.account_status || (u.is_active ? 'active' : 'suspended')}"`,
      u.is_active ? 'Yes' : 'No',
      u.failed_login_attempts || 0,
      u.locked_until ? `"${u.locked_until}"` : '""',
      u.force_password_reset ? 'Yes' : 'No',
      `"${u.created_at || ''}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `platform_users_export_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Platform Executive Header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-card/95 via-card/80 to-card/50 p-6 sm:p-8 backdrop-blur-2xl shadow-lg">
        <div className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full bg-amber-500/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -start-24 h-72 w-72 rounded-full bg-purple-500/[0.06] blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold px-3 py-0.5 flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5" />
                <span>{t('admin:platform_saas_scope', 'Platform SaaS Operations')}</span>
              </Badge>
              <Badge variant="outline" className="border-border/60 text-xs font-medium px-2.5 py-0.5 text-muted-foreground">
                <Shield className="me-1.5 h-3.5 w-3.5 text-purple-500" />
                <span>Super-Admin & Cross-Tenant Oversight</span>
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-serif">
              {t('admin:platform_user_dir_title', 'Platform User & Operator Management')}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm font-normal max-w-2xl leading-relaxed">
              {t('admin:platform_user_dir_desc', 'Separate surfaces for our internal platform engineering & operations team and cross-tenant customer organization learners.')}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchOperators()
                refetch()
              }}
              className="text-xs h-9 rounded-xl border-border/60 hover:bg-muted/60"
            >
              <RefreshCw className="h-3.5 w-3.5 me-1.5" />
              <span>{t('common:refresh', 'Refresh')}</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setAddOperatorOpen(true)}
              className="text-xs h-9 font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/15"
            >
              <UserPlus className="h-3.5 w-3.5 me-1.5" />
              <span>{t('admin:add_platform_operator', 'Add Platform Operator')}</span>
            </Button>
          </div>
        </div>

        {/* Real-time Telemetry Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-border/40">
          <div className="p-4 rounded-2xl bg-card/80 border border-border/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{t('admin:stat_operators_count', 'Platform Operators (Us)')}</span>
              <Crown className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1.5 text-foreground">{platformOperators.length}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{t('admin:stat_operators_sub', 'Internal Operations Staff')}</div>
          </div>

          <div className="p-4 rounded-2xl bg-card/80 border border-border/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{t('admin:stat_orgs_count', 'Customer Tenants')}</span>
              <Building2 className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1.5 text-foreground">{orgs.length}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{t('admin:stat_orgs_sub', 'Active Client Accounts')}</div>
          </div>

          <div className="p-4 rounded-2xl bg-card/80 border border-border/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{t('admin:stat_learners_count', 'Cross-Tenant Learners')}</span>
              <GraduationCap className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1.5 text-foreground">{totalLearnersCount}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{t('admin:stat_learners_sub', 'Enrolled Across Academies')}</div>
          </div>

          <div className="p-4 rounded-2xl bg-card/80 border border-border/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{t('admin:stat_status_active', 'Active Status Rate')}</span>
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1.5 text-foreground">{healthRatio}%</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Healthy SaaS Accounts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dual-Surface Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <TabsList className="bg-muted/70 p-1 rounded-2xl border border-border/60 h-11">
            <TabsTrigger
              value="platform_team"
              className="rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-sm"
            >
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              <span>{t('admin:platform_team_tab', 'Platform Operators (Our Team)')}</span>
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 bg-amber-500/10 text-amber-600 border border-amber-500/20">
                {platformOperators.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="customer_directory"
              className="rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm"
            >
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span>{t('admin:customer_directory_tab', 'Customer Organizations & Learners')}</span>
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 bg-blue-500/10 text-blue-600 border border-blue-500/20">
                {users.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Quick Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t('admin:search_users_placeholder', 'Search by name or email...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 h-10 text-xs rounded-xl border-border/60 bg-background/80"
            />
          </div>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* TAB 1: OUR PLATFORM TEAM (INTERNAL OPERATORS)                             */}
        {/* ------------------------------------------------------------------------- */}
        <TabsContent value="platform_team" className="space-y-4 mt-2">
          <Card className="border border-border/60 shadow-md rounded-3xl overflow-hidden backdrop-blur-2xl bg-card/90">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-500" />
                    <span>Internal Platform Operator Directory</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Internal personnel authorized to manage cross-tenant settings, database maintenance, master content, and support tickets.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setAddOperatorOpen(true)}
                  className="text-xs h-8 rounded-xl font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
                >
                  <UserPlus className="h-3.5 w-3.5 me-1.5" />
                  <span>{t('admin:add_platform_operator', 'Add Operator')}</span>
                </Button>
              </div>
            </CardHeader>

            <Table className="hidden md:table">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold">{t('admin:user_and_contact', 'Operator & Contact')}</TableHead>
                  <TableHead className="text-xs font-bold">{t('admin:platform_role', 'Platform Role & Authority')}</TableHead>
                  <TableHead className="text-xs font-bold">{t('admin:employment_type_label', 'Scope / Affiliation')}</TableHead>
                  <TableHead className="text-xs font-bold">{t('admin:account_status', 'Status')}</TableHead>
                  <TableHead className="text-xs font-bold">{t('admin:created_date', 'Granted Date')}</TableHead>
                  <TableHead className="text-xs font-bold text-end">{t('admin:actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingOperators ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-500" />
                      <span>Loading internal platform operators...</span>
                    </TableCell>
                  </TableRow>
                ) : filteredOperators.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                      <ShieldAlert className="h-6 w-6 mx-auto mb-2 text-amber-500/60" />
                      <p className="font-semibold text-foreground">{t('admin:no_operators_found', 'No platform operators found.')}</p>
                      <p className="text-[11px] mt-1">Assign an existing user or invite an internal team member.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddOperatorOpen(true)}
                        className="mt-3 text-xs h-8 rounded-xl border-amber-500/40 text-amber-600"
                      >
                        <UserPlus className="h-3.5 w-3.5 me-1.5" />
                        <span>Add First Operator</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOperators.map((op) => (
                    <TableRow key={op.user_id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center font-bold text-xs uppercase text-amber-700 dark:text-amber-300">
                            {op.full_name?.slice(0, 2) || op.email?.slice(0, 2) || 'OP'}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                              <span>{op.full_name || 'Platform Staff'}</span>
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[9px] px-1 py-0 font-bold">
                                {t('admin:operator_internal_badge', 'Platform Staff')}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">{op.email}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {op.roles && op.roles.length > 0 ? (
                            op.roles.map((r) => (
                              <Badge
                                key={r}
                                className="text-[10px] font-bold capitalize bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                              >
                                <ShieldCheck className="h-3 w-3 me-1 text-amber-600" />
                                {r.replace(/_/g, ' ')}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Platform Member
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-[10px] border-border/60 bg-muted/40 font-mono">
                          {op.employment_type || 'Platform Core Staff'}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            op.is_active
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {op.is_active ? t('admin:operator_status_active', 'Active Operator') : t('admin:operator_status_inactive', 'Inactive')}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-[11px] text-muted-foreground font-mono">
                        {op.created_at ? format(new Date(op.created_at), 'dd MMM yyyy') : '—'}
                      </TableCell>

                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t('admin:platform_user_mgmt.inspect', 'Inspect & Telemetry')}
                            onClick={() => {
                              setInspectedUser({
                                id: op.user_id,
                                full_name: op.full_name,
                                email: op.email,
                                platform_role: op.roles?.[0] || 'platform_admin',
                                is_platform_user: true,
                                is_active: op.is_active,
                              })
                              setInspectUserId(op.user_id)
                              setInspectDrawerOpen(true)
                            }}
                            className="h-7 text-[11px] px-2 rounded-lg text-primary hover:bg-primary/10"
                          >
                            <Eye className="h-3.5 w-3.5 me-1" />
                            <span>{t('admin:platform_user_mgmt.inspect', 'Inspect')}</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingUser({
                                id: op.user_id,
                                full_name: op.full_name,
                                email: op.email,
                                platform_role: op.roles?.[0] || 'platform_admin',
                              })
                              setNewPlatformRole(op.roles?.[0] || 'platform_admin')
                            }}
                            className="h-7 text-[11px] px-2 text-amber-600 hover:bg-amber-500/10"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 me-1" />
                            <span>{t('admin:platform_role', 'Manage Role')}</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={setOperatorActiveMutation.isPending}
                            onClick={() =>
                              setOperatorActiveMutation.mutate({
                                userId: op.user_id,
                                active: !op.is_active,
                              })
                            }
                            className={`h-7 text-[11px] px-2 ${
                              op.is_active
                                ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            }`}
                          >
                            {op.is_active ? t('admin:status_suspended', 'Deactivate') : t('admin:status_active', 'Activate')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Mobile Cards for Operators */}
            <div className="md:hidden divide-y divide-border/60">
              {isLoadingOperators ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-500" />
                  <span>Loading internal platform operators...</span>
                </div>
              ) : filteredOperators.length === 0 ? (
                <div className="text-center py-10 px-4 text-xs text-muted-foreground">
                  <ShieldAlert className="h-6 w-6 mx-auto mb-2 text-amber-500/60" />
                  <p className="font-semibold text-foreground">{t('admin:no_operators_found', 'No platform operators found.')}</p>
                  <p className="text-[11px] mt-1">Assign an existing user or invite an internal team member.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddOperatorOpen(true)}
                    className="mt-3 text-xs h-8 rounded-xl border-amber-500/40 text-amber-600"
                  >
                    <UserPlus className="h-3.5 w-3.5 me-1.5" />
                    <span>Add First Operator</span>
                  </Button>
                </div>
              ) : (
                filteredOperators.map((op) => (
                  <div key={op.user_id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center font-bold text-xs uppercase text-amber-700 dark:text-amber-300 shrink-0">
                          {op.full_name?.slice(0, 2) || op.email?.slice(0, 2) || 'OP'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-foreground truncate">
                            {op.full_name || 'Platform Staff'}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate">{op.email}</div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 font-semibold ${
                          op.is_active
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {op.is_active ? t('admin:operator_status_active', 'Active') : t('admin:operator_status_inactive', 'Inactive')}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {op.roles && op.roles.length > 0 ? (
                        op.roles.map((r) => (
                          <Badge
                            key={r}
                            className="text-[10px] font-bold capitalize bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                          >
                            <ShieldCheck className="h-3 w-3 me-1 text-amber-600" />
                            {r.replace(/_/g, ' ')}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Platform Member
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] border-border/60 bg-muted/40 font-mono">
                        {op.employment_type || 'Platform Core Staff'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {op.created_at ? format(new Date(op.created_at), 'dd MMM yyyy') : '—'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setInspectedUser({
                              id: op.user_id,
                              full_name: op.full_name,
                              email: op.email,
                              platform_role: op.roles?.[0] || 'platform_admin',
                              is_platform_user: true,
                              is_active: op.is_active,
                            })
                            setInspectUserId(op.user_id)
                            setInspectDrawerOpen(true)
                          }}
                          className="h-8 text-xs px-2 text-primary hover:bg-primary/10 min-h-touch"
                        >
                          <Eye className="h-3.5 w-3.5 me-1" />
                          <span>{t('admin:platform_user_mgmt.inspect', 'Inspect')}</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingUser({
                              id: op.user_id,
                              full_name: op.full_name,
                              email: op.email,
                              platform_role: op.roles?.[0] || 'platform_admin',
                            })
                            setNewPlatformRole(op.roles?.[0] || 'platform_admin')
                          }}
                          className="h-8 text-xs px-2 text-amber-600 hover:bg-amber-500/10 min-h-touch"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 me-1" />
                          <span>{t('admin:platform_role', 'Role')}</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={setOperatorActiveMutation.isPending}
                          onClick={() =>
                            setOperatorActiveMutation.mutate({
                              userId: op.user_id,
                              active: !op.is_active,
                            })
                          }
                          className={`h-8 text-xs px-2 min-h-touch ${
                            op.is_active
                              ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          }`}
                        >
                          {op.is_active ? t('admin:status_suspended', 'Deactivate') : t('admin:status_active', 'Activate')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------------- */}
        {/* TAB 2: CLIENT ORGANIZATIONS & LEARNERS DIRECTORY                         */}
        {/* ------------------------------------------------------------------------- */}
        <TabsContent value="customer_directory" className="space-y-4 mt-2">
          {/* Real-time Security Telemetry Header Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-card/80 border border-border/60 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">
                  {t('admin:platform_user_mgmt.kpi_total_users', 'Global Users')}
                </span>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold font-mono mt-1.5 text-foreground">{totalUsersCount}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {t('admin:platform_user_mgmt.kpi_total_users_sub', 'Across All Organizations')}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card/80 border border-border/60 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">
                  {t('admin:platform_user_mgmt.kpi_operators', 'Platform Operators')}
                </span>
                <Crown className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono mt-1.5 text-foreground">{totalOperatorsCount}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {t('admin:platform_user_mgmt.kpi_operators_sub', 'Root & Super Admins')}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card/80 border border-border/60 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">
                  {t('admin:platform_user_mgmt.kpi_suspended', 'Suspended Accounts')}
                </span>
                <Ban className="h-4 w-4 text-rose-500" />
              </div>
              <div className="text-2xl font-bold font-mono mt-1.5 text-rose-600 dark:text-rose-400">{suspendedCount}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {t('admin:platform_user_mgmt.kpi_suspended_sub', 'Restricted Access')}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card/80 border border-border/60 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">
                  {t('admin:platform_user_mgmt.kpi_locked', 'Locked / At Risk')}
                </span>
                <ShieldAlert className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono mt-1.5 text-amber-600 dark:text-amber-400">{lockedOrRiskCount}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {t('admin:platform_user_mgmt.kpi_locked_sub', 'Exceeded Failed Logins')}
              </div>
            </div>
          </div>

          {/* Extended Multi-Dimensional Filters Bar */}
          <div className="p-4 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  {t('admin:all_orgs_filter', 'Filter by Organization')}
                </Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background/70">
                    <SelectValue placeholder={t('admin:all_orgs_filter', 'All Organizations')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin:all_orgs_filter', 'All Customer Organizations')}</SelectItem>
                    {orgs.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {i18n.language === 'ar' && (o as any).name_ar ? (o as any).name_ar : o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  {t('admin:all_roles_filter', 'Filter by Role')}
                </Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background/70">
                    <SelectValue placeholder={t('admin:all_roles_filter', 'All Roles')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin:all_roles_filter', 'All Roles')}</SelectItem>
                    <SelectItem value="organization_owner">Tenant · Organization Owner</SelectItem>
                    <SelectItem value="organization_admin">Tenant · Organization Admin</SelectItem>
                    <SelectItem value="training_manager">Tenant · Training Manager</SelectItem>
                    <SelectItem value="hotel_admin">Tenant · Hotel / Branch Admin</SelectItem>
                    <SelectItem value="department_manager">Tenant · Department Manager</SelectItem>
                    <SelectItem value="learner">Tenant · Learner</SelectItem>
                    <SelectItem value="staff">Tenant · Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  {t('admin:filter_by_status', 'Account Status')}
                </Label>
                <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin:all_statuses', 'All Statuses')}</SelectItem>
                    <SelectItem value="active">{t('admin:status_active', 'Active')}</SelectItem>
                    <SelectItem value="suspended">{t('admin:status_suspended', 'Suspended')}</SelectItem>
                    <SelectItem value="locked">{t('admin:platform_user_mgmt.locked', 'Locked')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  {t('admin:platform_user_mgmt.filter_security', 'Security Filter')}
                </Label>
                <Select value={selectedSecurityFilter} onValueChange={(v) => setSelectedSecurityFilter(v as any)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin:platform_user_mgmt.filter_security_all', 'All Security States')}</SelectItem>
                    <SelectItem value="locked">{t('admin:platform_user_mgmt.filter_security_locked', 'Locked Accounts Only')}</SelectItem>
                    <SelectItem value="reset_pending">{t('admin:platform_user_mgmt.filter_security_reset_pending', 'Password Reset Pending')}</SelectItem>
                    <SelectItem value="suspended">{t('admin:platform_user_mgmt.filter_security_suspended', 'Suspended Only')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  {t('admin:platform_user_mgmt.filter_operator_type', 'Account Type')}
                </Label>
                <Select value={selectedOperatorFilter} onValueChange={(v) => setSelectedOperatorFilter(v as any)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin:platform_user_mgmt.filter_operator_all', 'All Account Types')}</SelectItem>
                    <SelectItem value="operators_only">{t('admin:platform_user_mgmt.filter_operator_only', 'Platform Operators Only')}</SelectItem>
                    <SelectItem value="learners_only">{t('admin:platform_user_mgmt.filter_tenant_only', 'Tenant Users Only')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  {t('admin:sort_by', 'Sort by')}
                </Label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">{t('admin:sort_name', 'Name (A–Z)')}</SelectItem>
                    <SelectItem value="newest">{t('admin:sort_newest', 'Newest first')}</SelectItem>
                    <SelectItem value="tenants">{t('admin:sort_tenants', 'Most tenants')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
              <div className="text-xs text-muted-foreground font-mono">
                <span>{displayedUsers.length} accounts found</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCsv(displayedUsers)}
                  className="h-8 text-xs rounded-xl border-border/60 hover:bg-muted/60"
                >
                  <Download className="h-3.5 w-3.5 me-1.5 text-blue-500" />
                  <span>{t('admin:platform_user_mgmt.export_csv', 'Export CSV')}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedOrgId('all')
                    setSelectedRole('all')
                    setSelectedStatus('all')
                    setSelectedSecurityFilter('all')
                    setSelectedOperatorFilter('all')
                    setSortBy('name')
                    setSearch('')
                  }}
                  className="h-8 text-xs rounded-xl border-border/60 hover:bg-muted/60 text-muted-foreground"
                >
                  {t('admin:clear_filters', 'Clear Filters')}
                </Button>
              </div>
            </div>
          </div>

          {/* Floating Bulk Operations Toolbar */}
          {selectedUserIds.size > 0 && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500 text-white border-0 text-xs font-mono font-bold px-2 py-0.5">
                  {selectedUserIds.size}
                </Badge>
                <span className="text-xs font-medium">
                  {t('admin:platform_user_mgmt.bulk_toolbar_title', 'users selected')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setBulkActionType('suspend')
                    setBulkReason('reason_policy_violation')
                    setBulkNote('')
                    setBulkSuspendUntil('')
                    setBulkActionDialogOpen(true)
                  }}
                  className="h-8 text-xs rounded-xl font-bold gap-1.5"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>{t('admin:platform_user_mgmt.bulk_suspend', 'Bulk Suspend')}</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    setBulkActionType('reactivate')
                    setBulkNote('')
                    setBulkActionDialogOpen(true)
                  }}
                  className="h-8 text-xs rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>{t('admin:platform_user_mgmt.bulk_reactivate', 'Bulk Reactivate')}</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    setBulkActionType('force_password_reset')
                    setBulkNote('')
                    setBulkActionDialogOpen(true)
                  }}
                  className="h-8 text-xs rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>{t('admin:platform_user_mgmt.bulk_force_reset', 'Bulk Force Reset')}</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const selectedList = displayedUsers.filter((u) => selectedUserIds.has(u.id))
                    handleExportCsv(selectedList)
                  }}
                  className="h-8 text-xs rounded-xl border-slate-600 text-slate-200 hover:bg-slate-800 gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t('admin:platform_user_mgmt.export_csv', 'Export Selected')}</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedUserIds(new Set())}
                  className="h-8 text-xs rounded-xl text-slate-400 hover:text-white"
                >
                  {t('admin:platform_user_mgmt.clear_selection', 'Clear')}
                </Button>
              </div>
            </div>
          )}

          <Card className="border border-border/60 shadow-md rounded-3xl overflow-hidden backdrop-blur-2xl bg-card/90">
            <Table className="hidden md:table">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={displayedUsers.length > 0 && selectedUserIds.size === displayedUsers.length}
                      onCheckedChange={handleToggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="text-xs font-bold">{t('admin:user_and_contact', 'User & Identity')}</TableHead>
                  <TableHead className="text-xs font-bold">{t('admin:primary_tenant_memberships', 'Primary Organization')}</TableHead>
                  <TableHead className="text-xs font-bold">{t('admin:platform_role', 'Platform Role')}</TableHead>
                  <TableHead className="text-xs font-bold">{t('admin:platform_user_mgmt.account_status_label', 'Status & Telemetry')}</TableHead>
                  <TableHead className="text-xs font-bold">{t('admin:created_date', 'Joined')}</TableHead>
                  <TableHead className="text-xs font-bold text-end">{t('admin:actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                      <span>{t('admin:loading_user_directory', 'Loading global customer directory...')}</span>
                    </TableCell>
                  </TableRow>
                ) : displayedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                      {t('admin:no_users_found', 'No users found matching query filters.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedUsers.map((u) => {
                    const isSuspended = u.account_status === 'suspended' || !u.is_active
                    const isLocked = u.account_status === 'locked' || (u.locked_until && new Date(u.locked_until) > new Date())
                    const isSelected = selectedUserIds.has(u.id)

                    return (
                      <TableRow key={u.id} className={`hover:bg-muted/30 ${isSelected ? 'bg-muted/40' : ''}`}>
                        <TableCell className="w-10">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelectUser(u.id)}
                            aria-label={`Select ${u.full_name || u.email}`}
                          />
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-xs uppercase text-blue-700 dark:text-blue-300">
                              {u.full_name?.slice(0, 2) || u.email?.slice(0, 2) || 'U'}
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                <span>{u.full_name || 'Anonymous User'}</span>
                                {u.is_platform_user && (
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[9px] px-1 py-0 font-bold">
                                    Operator
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">{u.email}</div>
                              {u.job_title && (
                                <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-0.5">
                                  <Briefcase className="h-2.5 w-2.5 text-blue-500" />
                                  <span>{u.job_title}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span>{u.primary_organization_name || t('admin:direct_platform_account', 'Global SaaS Platform')}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {u.membership_count > 0 ? (
                                <span>{t('admin:active_memberships_count', { count: u.membership_count, defaultValue: `${u.membership_count} Active Tenant Memberships` })}</span>
                              ) : (
                                <span className="text-slate-400">{t('admin:direct_platform_account', 'Direct Platform Account')}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {u.platform_role ? (
                            <Badge variant="secondary" className="text-[10px] font-bold capitalize bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              <ShieldCheck className="h-3 w-3 me-1 text-amber-600" />
                              {u.platform_role.replace(/_/g, ' ')}
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">{t('admin:no_operator_role', 'None (Tenant User)')}</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${
                                isSuspended
                                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                  : isLocked
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {isSuspended ? (
                                <span className="flex items-center gap-1">
                                  <Ban className="h-3 w-3 text-rose-600" />
                                  <span>{t('admin:platform_user_mgmt.suspended', 'Suspended')}</span>
                                </span>
                              ) : isLocked ? (
                                <span className="flex items-center gap-1">
                                  <Lock className="h-3 w-3 text-amber-600" />
                                  <span>{t('admin:platform_user_mgmt.locked', 'Locked')}</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <UserCheck className="h-3 w-3 text-emerald-600" />
                                  <span>{t('admin:platform_user_mgmt.active', 'Active')}</span>
                                </span>
                              )}
                            </Badge>

                            {u.force_password_reset && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30 font-semibold" title={t('admin:platform_user_mgmt.password_reset_required', 'Password Reset Required')}>
                                <KeyRound className="h-2.5 w-2.5 me-0.5" />
                                <span>Reset Req</span>
                              </Badge>
                            )}

                            {u.failed_login_attempts && u.failed_login_attempts > 0 ? (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-rose-500/10 text-rose-600 border-rose-500/30 font-mono" title={`${u.failed_login_attempts} failed login attempts`}>
                                <span>{u.failed_login_attempts} fails</span>
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell className="text-[11px] text-muted-foreground font-mono">
                          {u.created_at ? format(new Date(u.created_at), 'dd MMM yyyy') : '—'}
                        </TableCell>

                        <TableCell className="text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              title={t('admin:platform_user_mgmt.inspect', 'Inspect & Telemetry')}
                              onClick={() => {
                                setInspectedUser(u)
                                setInspectUserId(u.id)
                                setInspectDrawerOpen(true)
                              }}
                              className="h-7 text-[11px] px-2 rounded-lg text-primary hover:bg-primary/10"
                            >
                              <Eye className="h-3.5 w-3.5 me-1" />
                              <span>{t('admin:platform_user_mgmt.inspect', 'Inspect')}</span>
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-2xl border-border/60 text-xs w-48 shadow-xl bg-card/95 backdrop-blur-xl">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setInspectedUser(u)
                                    setInspectUserId(u.id)
                                    setInspectDrawerOpen(true)
                                  }}
                                  className="gap-2 font-medium"
                                >
                                  <Eye className="h-3.5 w-3.5 text-primary" />
                                  <span>{t('admin:platform_user_mgmt.inspect', 'Inspect & Telemetry')}</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => {
                                    setManagingTenantsUser(u)
                                    setAddTenantOrgId('')
                                    setAddTenantRole('learner')
                                  }}
                                  className="gap-2 font-medium"
                                >
                                  <Building2 className="h-3.5 w-3.5 text-blue-500" />
                                  <span>{t('admin:platform_user_mgmt.manage_tenants', 'Tenant Memberships')}</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingUser(u)
                                    setNewPlatformRole(u.platform_role || 'platform_support')
                                    setDetachTenantOnPromote(false)
                                  }}
                                  className="gap-2 font-medium"
                                >
                                  {!u.is_platform_user ? (
                                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                                  ) : (
                                    <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                                  )}
                                  <span>
                                    {!u.is_platform_user
                                      ? t('admin:platform_user_mgmt.promote_to_operator_btn', 'Promote to Platform Operator')
                                      : t('admin:platform_user_mgmt.change_platform_role_btn', 'Change Platform Role')}
                                  </span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingProfileUser(u)
                                    setEditProfileName(u.full_name || '')
                                    setEditProfileJobTitle(u.job_title || '')
                                    setEditProfilePhone(u.phone || '')
                                  }}
                                  className="gap-2 font-medium"
                                >
                                  <Edit className="h-3.5 w-3.5 text-emerald-500" />
                                  <span>{t('admin:platform_user_mgmt.edit_profile', 'Edit Profile')}</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                {isSuspended ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setActionUser(u)
                                      setActionType('reactivate')
                                      setActionNote('')
                                      setActionDialogOpen(true)
                                    }}
                                    className="gap-2 font-bold text-emerald-600 focus:text-emerald-600"
                                  >
                                    <UserCheck className="h-3.5 w-3.5" />
                                    <span>{t('admin:platform_user_mgmt.reactivate_account', 'Reactivate Account')}</span>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setActionUser(u)
                                      setActionType('suspend')
                                      setSuspendReason('reason_policy_violation')
                                      setSuspendUntil('')
                                      setActionNote('')
                                      setActionDialogOpen(true)
                                    }}
                                    className="gap-2 font-bold text-rose-600 focus:text-rose-600"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                    <span>{t('admin:platform_user_mgmt.suspend_account', 'Suspend Account')}</span>
                                  </DropdownMenuItem>
                                )}

                                {(isLocked || (u.failed_login_attempts && u.failed_login_attempts > 0)) && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setActionUser(u)
                                      setActionType('unlock')
                                      setActionDialogOpen(true)
                                    }}
                                    className="gap-2 font-bold text-blue-600 focus:text-blue-600"
                                  >
                                    <Unlock className="h-3.5 w-3.5" />
                                    <span>{t('admin:platform_user_mgmt.unlock_account', 'Unlock Account')}</span>
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() => {
                                    setActionUser(u)
                                    setActionType('force_password_reset')
                                    setActionNote('')
                                    setActionDialogOpen(true)
                                  }}
                                  className="gap-2 font-medium text-amber-600 focus:text-amber-600"
                                >
                                  <KeyRound className="h-3.5 w-3.5" />
                                  <span>{t('admin:platform_user_mgmt.force_password_reset', 'Force Password Reset')}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>

            {/* Mobile Cards for Learner Directory */}
            <div className="md:hidden divide-y divide-border/60">
              {isLoading ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                  <span>{t('admin:loading_user_directory', 'Loading global customer directory...')}</span>
                </div>
              ) : displayedUsers.length === 0 ? (
                <div className="text-center py-10 px-4 text-xs text-muted-foreground">
                  {t('admin:no_users_found', 'No users found matching query filters.')}
                </div>
              ) : (
                displayedUsers.map((u) => {
                  const isSuspended = u.account_status === 'suspended' || !u.is_active
                  const isLocked = u.account_status === 'locked' || (u.locked_until && new Date(u.locked_until) > new Date())
                  const isSelected = selectedUserIds.has(u.id)

                  return (
                    <div key={u.id} className={`p-4 space-y-3 ${isSelected ? 'bg-muted/40' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelectUser(u.id)}
                            aria-label={`Select ${u.full_name || u.email}`}
                            className="mt-0.5"
                          />
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs uppercase text-slate-700 dark:text-slate-300 shrink-0">
                            {u.full_name?.slice(0, 2) || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-foreground truncate flex items-center gap-1.5">
                              <span>{u.full_name || 'Anonymous User'}</span>
                              {u.is_platform_user && (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[9px] px-1 py-0 font-bold">
                                  Operator
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono truncate">{u.email}</div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 font-semibold ${
                            isSuspended
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                              : isLocked
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {isSuspended ? t('admin:platform_user_mgmt.suspended', 'Suspended') : isLocked ? t('admin:platform_user_mgmt.locked', 'Locked') : t('admin:status_active', 'Active')}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs pt-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <span className="font-medium text-foreground truncate">{u.primary_organization_name || t('admin:direct_platform_account', 'Global SaaS Platform')}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground font-mono">
                          {u.membership_count > 0 && (
                            <span>{t('admin:active_memberships_count', { count: u.membership_count, defaultValue: `${u.membership_count} Tenants` })}</span>
                          )}
                          {u.platform_role && (
                            <Badge variant="secondary" className="text-[9px] font-bold capitalize bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              {u.platform_role.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {u.force_password_reset && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                              Reset Req
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-border/40">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setInspectedUser(u)
                            setInspectUserId(u.id)
                            setInspectDrawerOpen(true)
                          }}
                          className="h-8 text-xs px-2.5 rounded-lg text-primary hover:bg-primary/10"
                        >
                          <Eye className="h-3.5 w-3.5 me-1" />
                          <span>{t('admin:platform_user_mgmt.inspect', 'Inspect')}</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setManagingTenantsUser(u)
                            setAddTenantOrgId('')
                            setAddTenantRole('learner')
                          }}
                          className="h-8 text-xs px-2.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 min-h-touch"
                        >
                          <Building2 className="h-3.5 w-3.5 me-1" />
                          <span>{t('admin:tenants', 'Tenants')}</span>
                        </Button>

                        {isSuspended ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActionUser(u)
                              setActionType('reactivate')
                              setActionNote('')
                              setActionDialogOpen(true)
                            }}
                            className="h-8 text-xs px-2 rounded-lg text-emerald-600 hover:bg-emerald-50 min-h-touch font-bold"
                          >
                            <UserCheck className="h-3.5 w-3.5 me-1" />
                            <span>{t('admin:platform_user_mgmt.reactivate_account', 'Reactivate')}</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActionUser(u)
                              setActionType('suspend')
                              setSuspendReason('reason_policy_violation')
                              setSuspendUntil('')
                              setActionNote('')
                              setActionDialogOpen(true)
                            }}
                            className="h-8 text-xs px-2 rounded-lg text-rose-600 hover:bg-rose-50 min-h-touch font-bold"
                          >
                            <Ban className="h-3.5 w-3.5 me-1" />
                            <span>{t('admin:platform_user_mgmt.suspend_account', 'Suspend')}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 1: ADD PLATFORM OPERATOR (PROMOTE OR INVITE)                       */}
      {/* ------------------------------------------------------------------------- */}
      <Dialog
        open={addOperatorOpen}
        onOpenChange={(open) => {
          setAddOperatorOpen(open)
          if (!open) {
            setSelectedCandidateUserId('')
            setSelectedCandidateUser(null)
            setCandidateSearch('')
            setInviteEmail('')
            setInviteFullName('')
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Crown className="h-5 w-5 text-amber-500" />
              <span>{t('admin:add_operator_modal_title', 'Assign / Invite Platform Operator')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t(
                'admin:add_operator_modal_desc',
                'Grant internal platform operational and supervisory authority. Operators manage cross-tenant configurations and infrastructure.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex rounded-xl bg-muted/60 p-1 border border-border/60">
              <button
                type="button"
                onClick={() => setAddOperatorMode('promote')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  addOperatorMode === 'promote'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('admin:promote_existing_user', 'Promote Existing User')}
              </button>
              <button
                type="button"
                onClick={() => setAddOperatorMode('invite')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  addOperatorMode === 'invite'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('admin:invite_new_operator', 'Invite New Operator')}
              </button>
            </div>

            {addOperatorMode === 'promote' ? (
              <div className="space-y-3">
                {selectedCandidateUser ? (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                        {selectedCandidateUser.full_name?.charAt(0).toUpperCase() ||
                          selectedCandidateUser.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate flex items-center gap-1.5 text-foreground">
                          <span>{selectedCandidateUser.full_name || 'Unnamed User'}</span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal border-amber-500/40 text-amber-700 dark:text-amber-300">
                            {t('admin:selected', 'Selected')}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate">{selectedCandidateUser.email}</div>
                        {selectedCandidateUser.job_title && (
                          <div className="text-[10px] text-muted-foreground truncate">{selectedCandidateUser.job_title}</div>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCandidateUserId('')
                        setSelectedCandidateUser(null)
                      }}
                      className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
                    >
                      <X className="h-3.5 w-3.5 me-1" />
                      {t('common:change', 'Change')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">{t('admin:select_user_to_promote', 'Select Registered User')}</Label>
                      <div className="relative">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder={t('admin:search_user_to_promote', 'Search by name or email...')}
                          value={candidateSearch}
                          onChange={(e) => setCandidateSearch(e.target.value)}
                          className="ps-9 pe-8 h-9 text-xs rounded-xl"
                          autoFocus
                        />
                        {candidateSearch && (
                          <button
                            type="button"
                            onClick={() => setCandidateSearch('')}
                            className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isLoadingCandidates ? (
                      <div className="flex items-center justify-center gap-2 py-6 rounded-xl border bg-muted/20 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                        <span>{t('admin:searching_users', 'Searching registered users...')}</span>
                      </div>
                    ) : candidateUsers.length > 0 ? (
                      <div className="max-h-52 overflow-y-auto space-y-1 p-1.5 rounded-xl border bg-muted/30">
                        {candidateUsers.map((u) => {
                          const isSelected = selectedCandidateUserId === u.id
                          return (
                            <div
                              key={u.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSelectedCandidateUserId(u.id)
                                setSelectedCandidateUser(u)
                              }}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                                isSelected
                                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-900 dark:text-amber-200'
                                  : 'hover:bg-muted/60'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center font-bold text-[11px] shrink-0 border">
                                  {u.full_name?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">{u.full_name || 'Unnamed User'}</div>
                                  <div className="text-[10px] text-muted-foreground font-mono truncate">{u.email}</div>
                                </div>
                              </div>
                              {isSelected ? (
                                <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                                  {t('admin:click_to_select', 'Select')}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center rounded-xl border border-dashed bg-muted/20 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {candidateSearch.trim()
                            ? t('admin:no_users_found_search', 'No registered users match "{{query}}"', { query: candidateSearch })
                            : t('admin:no_registered_users', 'No registered users found')}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAddOperatorMode('invite')
                            if (candidateSearch.includes('@')) {
                              setInviteEmail(candidateSearch.trim())
                            }
                          }}
                          className="text-xs h-7 rounded-lg"
                        >
                          <UserPlus className="h-3 w-3 me-1" />
                          {t('admin:invite_new_instead', 'Invite as new operator instead')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{t('admin:operator_full_name', 'Full Name')}</Label>
                  <Input
                    placeholder="e.g. Sarah Al-Rashid"
                    value={inviteFullName}
                    onChange={(e) => setInviteFullName(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{t('admin:operator_email', 'Operator Email')}</Label>
                  <Input
                    type="email"
                    placeholder="operator@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                  {matchedInviteProfile && (
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium animate-in fade-in">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>
                        Existing account found ({matchedInviteProfile.full_name || matchedInviteProfile.email}). Platform role will be granted directly.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Platform Role Selector */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-bold">{t('admin:platform_role_label', 'Platform Role')}</Label>
              <Select value={addOperatorRole} onValueChange={setAddOperatorRole}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="py-0.5">
                        <div className="font-semibold">{opt.label}</div>
                        <div className="text-[10px] text-muted-foreground">{opt.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex gap-2.5">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px]">
                {t(
                  'admin:operator_privilege_notice',
                  'Operators are internal platform staff — separate from any tenant account. Depending on role they can open audited sessions into customer environments, deploy master content, and view cross-tenant telemetry.'
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAddOperatorOpen(false)} className="rounded-xl text-xs">
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              size="sm"
              disabled={
                addOperatorMutation.isPending ||
                (addOperatorMode === 'promote' && !selectedCandidateUserId) ||
                (addOperatorMode === 'invite' && !inviteEmail.trim())
              }
              onClick={() => addOperatorMutation.mutate()}
              className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
            >
              {addOperatorMutation.isPending ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t('common:processing', 'Processing…')}</span>
                </span>
              ) : (
                t('admin:grant_role', 'Grant Platform Role')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 2: MANAGE / PROMOTE OPERATOR ROLE                                    */}
      {/* ------------------------------------------------------------------------- */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="sm:max-w-lg rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                {!editingUser.is_platform_user ? (
                  <Crown className="h-5 w-5 text-amber-600" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-amber-600" />
                )}
                <span>
                  {!editingUser.is_platform_user
                    ? t('admin:platform_user_mgmt.promote_dialog_title', 'Promote User to Platform Operator')
                    : t('admin:manage_operator_role', 'Manage Platform Operator Role')}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                {!editingUser.is_platform_user
                  ? t('admin:platform_user_mgmt.promote_dialog_desc', {
                      name: editingUser.full_name || editingUser.email,
                      defaultValue: `Elevate ${editingUser.full_name || editingUser.email} to an internal platform operator with cross-tenant administrative authority.`
                    })
                  : t('admin:manage_operator_role_desc', {
                      name: editingUser.full_name || editingUser.email,
                      email: editingUser.email,
                      defaultValue: `Grant or modify platform-wide operator privileges for ${editingUser.full_name || editingUser.email}.`
                    })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t('admin:platform_role', 'Platform Operator Role')}</Label>
                <Select value={newPlatformRole} onValueChange={setNewPlatformRole}>
                  <SelectTrigger className="rounded-xl h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editingUser.is_platform_user && editingUser.platform_role && (
                <div className="text-[11px] text-muted-foreground">
                  Currently holds: <strong className="capitalize">{String(editingUser.platform_role).replace(/_/g, ' ')}</strong>.
                  Granting a new role replaces it.
                </div>
              )}

              {/* Option to fully migrate user by deactivating tenant memberships */}
              {!editingUser.is_platform_user && (
                <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                    <Checkbox
                      checked={detachTenantOnPromote}
                      onCheckedChange={(checked) => setDetachTenantOnPromote(!!checked)}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground">
                        {t('admin:platform_user_mgmt.detach_tenant_label', 'Deactivate customer tenant memberships (full migration to platform staff)')}
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {t('admin:platform_user_mgmt.detach_tenant_desc', 'The user will become dedicated internal platform staff and will no longer be listed as an active customer tenant member.')}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  <span>Privileged Operator Access</span>
                </div>
                <div className="text-[11px] leading-relaxed">
                  {t('admin:operator_privilege_notice', 'Operators are internal staff — separate from any tenant account. Every grant is logged to platform audit logs.')}
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 w-full pt-4">
              {editingUser.is_platform_user && editingUser.platform_role ? (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() =>
                    revokeRoleMutation.mutate({ userId: editingUser.id, role: editingUser.platform_role })
                  }
                  disabled={revokeRoleMutation.isPending}
                  className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs shrink-0 w-full sm:w-auto"
                >
                  {revokeRoleMutation.isPending ? 'Revoking…' : t('admin:revoke_operator_access', 'Revoke operator access')}
                </Button>
              ) : (
                <div className="hidden sm:block" />
              )}

              <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl text-xs shrink-0"
                >
                  {t('common:cancel', 'Cancel')}
                </Button>
                <Button
                  size="sm"
                  type="button"
                  onClick={() =>
                    assignRoleMutation.mutate({
                      userId: editingUser.id,
                      role: newPlatformRole,
                      detachTenant: detachTenantOnPromote,
                    })
                  }
                  disabled={assignRoleMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs gap-1.5 shrink-0"
                >
                  {!editingUser.is_platform_user ? (
                    <Crown className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {assignRoleMutation.isPending
                      ? t('common:processing', 'Processing…')
                      : !editingUser.is_platform_user
                      ? t('admin:platform_user_mgmt.promote_to_operator_btn', 'Promote to Platform Operator')
                      : t('admin:grant_role', 'Grant Role')}
                  </span>
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 3: MANAGE TENANT MEMBERSHIPS                                       */}
      {/* ------------------------------------------------------------------------- */}
      {managingTenantsUser && (
        <Dialog open={!!managingTenantsUser} onOpenChange={(open) => !open && setManagingTenantsUser(null)}>
          <DialogContent className="max-w-lg rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span>{t('admin:manage_tenant_memberships', 'Manage Tenant Memberships')}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t('admin:manage_tenant_memberships_desc', {
                  name: managingTenantsUser.full_name || managingTenantsUser.email,
                  defaultValue: `Add, re-role, or remove ${managingTenantsUser.full_name || managingTenantsUser.email} across customer organizations. Every change is written to the platform audit log.`,
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {/* Current memberships */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-muted-foreground">
                  {t('admin:current_memberships', 'Current memberships')}
                </Label>
                {(managingTenantsUser.memberships || []).filter((m: any) => m.is_active !== false).length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">
                    {t('admin:no_tenant_memberships', 'Not a member of any tenant.')}
                  </p>
                ) : (
                  (managingTenantsUser.memberships || [])
                    .filter((m: any) => m.is_active !== false)
                    .map((m: any) => (
                      <div key={m.organization_id} className="flex items-center gap-2 p-2 rounded-xl border border-border/60 bg-muted/20">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground truncate">{m.organization_name}</div>
                          {m.hotel_name && <div className="text-[10px] text-muted-foreground truncate">{m.hotel_name}</div>}
                        </div>
                        <Select
                          value={m.role}
                          onValueChange={(role) =>
                            setMembershipMutation.mutate({
                              orgId: m.organization_id,
                              userId: managingTenantsUser.id,
                              role,
                              active: true,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-[150px] text-[11px] rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TENANT_ROLE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          title={t('admin:remove_from_tenant', 'Remove from tenant')}
                          disabled={setMembershipMutation.isPending}
                          onClick={() =>
                            setMembershipMutation.mutate({
                              orgId: m.organization_id,
                              userId: managingTenantsUser.id,
                              role: m.role,
                              active: false,
                            })
                          }
                          className="h-8 w-8 p-0 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                )}
              </div>

              {/* Add to a tenant */}
              <div className="pt-2 border-t border-border/50 space-y-2">
                <Label className="text-[11px] font-bold text-muted-foreground">
                  {t('admin:add_to_tenant', 'Add to a tenant')}
                </Label>
                <div className="flex items-center gap-2">
                  <Select value={addTenantOrgId} onValueChange={setAddTenantOrgId}>
                    <SelectTrigger className="h-9 flex-1 text-xs rounded-xl">
                      <SelectValue placeholder={t('admin:select_organization', 'Select organization')} />
                    </SelectTrigger>
                    <SelectContent>
                      {orgs
                        .filter(
                          (o) =>
                            !(managingTenantsUser.memberships || []).some(
                              (m: any) => m.organization_id === o.id && m.is_active !== false,
                            ),
                        )
                        .map((o) => (
                          <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Select value={addTenantRole} onValueChange={setAddTenantRole}>
                    <SelectTrigger className="h-9 w-[150px] text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TENANT_ROLE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  disabled={!addTenantOrgId || setMembershipMutation.isPending}
                  onClick={() =>
                    setMembershipMutation.mutate({
                      orgId: addTenantOrgId,
                      userId: managingTenantsUser.id,
                      role: addTenantRole,
                      active: true,
                    })
                  }
                  className="w-full h-9 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {setMembershipMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    t('admin:add_membership', 'Add membership')
                  )}
                </Button>
              </div>

              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 text-[11px] leading-relaxed flex gap-2">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  {t(
                    'admin:membership_move_note',
                    'To move someone between tenants, add them to the new tenant and remove the old membership. Only platform operators may assign the Organization Owner role.',
                  )}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setManagingTenantsUser(null)} className="rounded-xl text-xs">
                {t('common:done', 'Done')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 4: SECURITY ACTION (SUSPEND, REACTIVATE, FORCE RESET, UNLOCK)       */}
      {/* ------------------------------------------------------------------------- */}
      <Dialog
        open={actionDialogOpen}
        onOpenChange={(open) => {
          setActionDialogOpen(open)
          if (!open) {
            setActionUser(null)
            setActionType(null)
            setActionNote('')
            setSuspendUntil('')
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              {actionType === 'suspend' && <Ban className="h-5 w-5 text-rose-600" />}
              {actionType === 'reactivate' && <UserCheck className="h-5 w-5 text-emerald-600" />}
              {actionType === 'force_password_reset' && <KeyRound className="h-5 w-5 text-amber-600" />}
              {actionType === 'unlock' && <Unlock className="h-5 w-5 text-blue-600" />}
              <span>
                {actionType === 'suspend' && t('admin:platform_user_mgmt.suspend_dialog_title', 'Suspend Platform Account')}
                {actionType === 'reactivate' && t('admin:platform_user_mgmt.reactivate_dialog_title', 'Reactivate User Account')}
                {actionType === 'force_password_reset' && t('admin:platform_user_mgmt.force_reset_dialog_title', 'Force Password Reset')}
                {actionType === 'unlock' && t('admin:platform_user_mgmt.unlock_dialog_title', 'Unlock User Account')}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {actionType === 'suspend' && t('admin:platform_user_mgmt.suspend_dialog_desc', 'Suspending this user revokes login access and pauses active sessions immediately across the platform.')}
              {actionType === 'reactivate' && t('admin:platform_user_mgmt.reactivate_dialog_desc', 'Restoring this user will re-enable access to the intranet and their assigned organizations.')}
              {actionType === 'force_password_reset' && t('admin:platform_user_mgmt.force_reset_dialog_desc', 'The user will be required to choose a new password upon their next login session.')}
              {actionType === 'unlock' && t('admin:platform_user_mgmt.unlock_dialog_desc', 'Clear failed login attempts and reset the lockout timer for this account.')}
            </DialogDescription>
          </DialogHeader>

          {actionUser && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                  {actionUser.full_name?.charAt(0).toUpperCase() || actionUser.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate text-foreground">{actionUser.full_name || 'Anonymous User'}</div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">{actionUser.email}</div>
                </div>
              </div>

              {actionType === 'suspend' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">{t('admin:platform_user_mgmt.suspend_reason_label', 'Reason for Suspension')}</Label>
                    <Select value={suspendReason} onValueChange={setSuspendReason}>
                      <SelectTrigger className="h-9 text-xs rounded-xl">
                        <SelectValue placeholder={t('admin:platform_user_mgmt.suspend_reason_placeholder', 'Select reason...')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reason_policy_violation">{t('admin:platform_user_mgmt.reason_policy_violation', 'Policy / SOP Violation')}</SelectItem>
                        <SelectItem value="reason_security_investigation">{t('admin:platform_user_mgmt.reason_security_investigation', 'Security / Compromise Investigation')}</SelectItem>
                        <SelectItem value="reason_offboarding">{t('admin:platform_user_mgmt.reason_offboarding', 'Offboarding / Employment Termination')}</SelectItem>
                        <SelectItem value="reason_unpaid_leave">{t('admin:platform_user_mgmt.reason_unpaid_leave', 'Extended Unpaid Leave')}</SelectItem>
                        <SelectItem value="reason_administrative_review">{t('admin:platform_user_mgmt.reason_administrative_review', 'Administrative Review')}</SelectItem>
                        <SelectItem value="reason_other">{t('admin:platform_user_mgmt.reason_other', 'Other (Specify in notes)')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">{t('admin:platform_user_mgmt.suspend_until_label', 'Suspended Until (Optional)')}</Label>
                    <Input
                      type="date"
                      value={suspendUntil}
                      onChange={(e) => setSuspendUntil(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </>
              )}

              {actionType !== 'unlock' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{t('admin:platform_user_mgmt.audit_note_label', 'Internal Audit Note')}</Label>
                  <Textarea
                    placeholder={t('admin:platform_user_mgmt.audit_note_placeholder', 'Record rationale for compliance logs...')}
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    rows={3}
                    className="text-xs rounded-xl resize-none"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActionDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              {t('common:cancel', 'Cancel')}
            </Button>

            {actionType === 'suspend' && (
              <Button
                size="sm"
                disabled={suspendUserMutation.isPending}
                onClick={() => {
                  if (!actionUser) return
                  suspendUserMutation.mutate({
                    userId: actionUser.id,
                    reason: suspendReason,
                    suspendUntil: suspendUntil || undefined,
                    note: actionNote || undefined,
                  })
                }}
                className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                {suspendUserMutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{t('common:processing', 'Processing…')}</span>
                  </span>
                ) : (
                  t('admin:platform_user_mgmt.confirm_suspend_btn', 'Confirm Suspension')
                )}
              </Button>
            )}

            {actionType === 'reactivate' && (
              <Button
                size="sm"
                disabled={reactivateUserMutation.isPending}
                onClick={() => {
                  if (!actionUser) return
                  reactivateUserMutation.mutate({
                    userId: actionUser.id,
                    note: actionNote || undefined,
                  })
                }}
                className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {reactivateUserMutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{t('common:processing', 'Processing…')}</span>
                  </span>
                ) : (
                  t('admin:platform_user_mgmt.confirm_reactivate_btn', 'Reactivate Account')
                )}
              </Button>
            )}

            {actionType === 'force_password_reset' && (
              <Button
                size="sm"
                disabled={forcePasswordResetMutation.isPending}
                onClick={() => {
                  if (!actionUser) return
                  forcePasswordResetMutation.mutate({
                    userId: actionUser.id,
                    note: actionNote || undefined,
                  })
                }}
                className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
              >
                {forcePasswordResetMutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{t('common:processing', 'Processing…')}</span>
                  </span>
                ) : (
                  t('admin:platform_user_mgmt.confirm_force_reset_btn', 'Enforce Reset')
                )}
              </Button>
            )}

            {actionType === 'unlock' && (
              <Button
                size="sm"
                disabled={unlockUserMutation.isPending}
                onClick={() => {
                  if (!actionUser) return
                  unlockUserMutation.mutate({ userId: actionUser.id })
                }}
                className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                {unlockUserMutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{t('common:processing', 'Processing…')}</span>
                  </span>
                ) : (
                  t('admin:platform_user_mgmt.confirm_unlock_btn', 'Unlock Account')
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 5: BULK ACTIONS MODAL                                               */}
      {/* ------------------------------------------------------------------------- */}
      <Dialog
        open={bulkActionDialogOpen}
        onOpenChange={(open) => {
          setBulkActionDialogOpen(open)
          if (!open) {
            setBulkActionType(null)
            setBulkNote('')
            setBulkSuspendUntil('')
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              {bulkActionType === 'suspend' && <Ban className="h-5 w-5 text-rose-600" />}
              {bulkActionType === 'reactivate' && <UserCheck className="h-5 w-5 text-emerald-600" />}
              {bulkActionType === 'force_password_reset' && <KeyRound className="h-5 w-5 text-amber-600" />}
              <span>
                {bulkActionType === 'suspend' && t('admin:platform_user_mgmt.bulk_suspend', 'Bulk Suspend')}
                {bulkActionType === 'reactivate' && t('admin:platform_user_mgmt.bulk_reactivate', 'Bulk Reactivate')}
                {bulkActionType === 'force_password_reset' && t('admin:platform_user_mgmt.bulk_force_reset', 'Bulk Force Reset')}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t('admin:platform_user_mgmt.bulk_confirm_desc', {
                count: selectedUserIds.size,
                defaultValue: `This action will immediately apply to ${selectedUserIds.size} selected accounts.`,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {t(
                  'admin:platform_user_mgmt.bulk_warning_note',
                  'Every selected account will be individually audited and updated. All platform sessions and permissions will be updated in real time.',
                )}
              </span>
            </div>

            {bulkActionType === 'suspend' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{t('admin:platform_user_mgmt.suspend_reason_label', 'Reason for Suspension')}</Label>
                  <Select value={bulkReason} onValueChange={setBulkReason}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reason_policy_violation">{t('admin:platform_user_mgmt.reason_policy_violation', 'Policy / SOP Violation')}</SelectItem>
                      <SelectItem value="reason_security_investigation">{t('admin:platform_user_mgmt.reason_security_investigation', 'Security / Compromise Investigation')}</SelectItem>
                      <SelectItem value="reason_offboarding">{t('admin:platform_user_mgmt.reason_offboarding', 'Offboarding / Employment Termination')}</SelectItem>
                      <SelectItem value="reason_administrative_review">{t('admin:platform_user_mgmt.reason_administrative_review', 'Administrative Review')}</SelectItem>
                      <SelectItem value="reason_other">{t('admin:platform_user_mgmt.reason_other', 'Other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{t('admin:platform_user_mgmt.suspend_until_label', 'Suspended Until (Optional)')}</Label>
                  <Input
                    type="date"
                    value={bulkSuspendUntil}
                    onChange={(e) => setBulkSuspendUntil(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t('admin:platform_user_mgmt.audit_note_label', 'Internal Audit Note')}</Label>
              <Textarea
                placeholder={t('admin:platform_user_mgmt.audit_note_placeholder', 'Record rationale for compliance logs...')}
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                rows={3}
                className="text-xs rounded-xl resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBulkActionDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              size="sm"
              disabled={bulkActionMutation.isPending || !bulkActionType}
              onClick={() => {
                if (!bulkActionType) return
                bulkActionMutation.mutate({
                  userIds: Array.from(selectedUserIds),
                  action: bulkActionType,
                  reason: bulkActionType === 'suspend' ? bulkReason : undefined,
                  suspendUntil: bulkSuspendUntil || undefined,
                  note: bulkNote || undefined,
                })
              }}
              className={`rounded-xl text-xs font-bold text-white ${
                bulkActionType === 'suspend'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : bulkActionType === 'reactivate'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {bulkActionMutation.isPending ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t('common:processing', 'Processing…')}</span>
                </span>
              ) : (
                t('common:confirm', 'Execute Bulk Action')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 6: EDIT PROFILE DETAILS                                            */}
      {/* ------------------------------------------------------------------------- */}
      {editingProfileUser && (
        <Dialog open={!!editingProfileUser} onOpenChange={(open) => !open && setEditingProfileUser(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Edit className="h-5 w-5 text-emerald-600" />
                <span>{t('admin:platform_user_mgmt.edit_profile', 'Edit Profile Details')}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t('admin:platform_user_mgmt.edit_profile_desc', {
                  name: editingProfileUser.full_name || editingProfileUser.email,
                  defaultValue: `Update profile metadata and contact information for ${editingProfileUser.full_name || editingProfileUser.email}.`,
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t('admin:full_name', 'Full Name')}</Label>
                <Input
                  value={editProfileName}
                  onChange={(e) => setEditProfileName(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                  placeholder="e.g. Sarah Al-Rashid"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t('admin:platform_user_mgmt.job_title', 'Job Title')}</Label>
                <Input
                  value={editProfileJobTitle}
                  onChange={(e) => setEditProfileJobTitle(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                  placeholder="e.g. Front Office Manager"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t('admin:platform_user_mgmt.phone', 'Phone Number')}</Label>
                <Input
                  value={editProfilePhone}
                  onChange={(e) => setEditProfilePhone(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                  placeholder="e.g. +966 50 123 4567"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingProfileUser(null)} className="rounded-xl text-xs">
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                disabled={updateProfileMutation.isPending}
                onClick={() =>
                  updateProfileMutation.mutate({
                    userId: editingProfileUser.id,
                    updates: {
                      full_name: editProfileName,
                      job_title: editProfileJobTitle,
                      phone: editProfilePhone,
                    },
                  })
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
              >
                {updateProfileMutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{t('common:saving', 'Saving…')}</span>
                  </span>
                ) : (
                  t('common:save', 'Save Changes')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* DRAWER: USER DEEP-INSPECTION & SECURITY TELEMETRY                         */}
      {/* ------------------------------------------------------------------------- */}
      <Sheet open={inspectDrawerOpen} onOpenChange={setInspectDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6 space-y-6">
          {(() => {
            const activeProfile = inspectedUserData?.profile || inspectedUser
            const activeMemberships = (inspectedUserData?.memberships && inspectedUserData.memberships.length > 0)
              ? inspectedUserData.memberships
              : (activeProfile?.memberships || [])

            if (!activeProfile) {
              return (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs font-medium">{t('common:loading', 'Loading user telemetry profile...')}</span>
                </div>
              )
            }

            return (
              <>
                <SheetHeader className="text-start space-y-3 pb-4 border-b border-border/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-base uppercase text-blue-700 dark:text-blue-300 shadow-sm">
                        {activeProfile.full_name?.slice(0, 2) || activeProfile.email?.slice(0, 2) || 'U'}
                      </div>
                      <div>
                        <SheetTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                          <span>{activeProfile.full_name || 'Anonymous User'}</span>
                          {activeProfile.is_platform_user && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-bold">
                              Operator
                            </Badge>
                          )}
                        </SheetTitle>
                        <SheetDescription className="text-xs font-mono text-muted-foreground mt-0.5">
                          {activeProfile.email}
                        </SheetDescription>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          activeProfile.account_status === 'suspended' || !activeProfile.is_active
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                            : activeProfile.account_status === 'locked' ||
                              (activeProfile.locked_until && new Date(activeProfile.locked_until) > new Date())
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {activeProfile.account_status === 'suspended' || !activeProfile.is_active
                          ? t('admin:platform_user_mgmt.suspended', 'Suspended')
                          : activeProfile.account_status === 'locked' ||
                            (activeProfile.locked_until && new Date(activeProfile.locked_until) > new Date())
                          ? t('admin:platform_user_mgmt.locked', 'Locked')
                          : t('admin:platform_user_mgmt.active', 'Active')}
                      </Badge>

                      {activeProfile.force_password_reset && (
                        <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                          Reset Req
                        </Badge>
                      )}
                    </div>
                  </div>
                </SheetHeader>

                <Tabs defaultValue="profile" className="w-full space-y-4">
                  <TabsList className="grid grid-cols-4 w-full h-9 p-1 rounded-xl bg-muted/60 border border-border/50 text-[11px]">
                    <TabsTrigger value="profile" className="rounded-lg font-bold">
                      {t('admin:platform_user_mgmt.drawer_tab_profile', 'Profile')}
                    </TabsTrigger>
                    <TabsTrigger value="security" className="rounded-lg font-bold">
                      {t('admin:platform_user_mgmt.drawer_tab_security', 'Security')}
                    </TabsTrigger>
                    <TabsTrigger value="memberships" className="rounded-lg font-bold">
                      {t('admin:platform_user_mgmt.drawer_tab_memberships', 'Tenants')}
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="rounded-lg font-bold">
                      {t('admin:platform_user_mgmt.drawer_tab_audit', 'Audit')}
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Profile & Affiliations */}
                  <TabsContent value="profile" className="space-y-4 pt-1">
                    <Card className="rounded-2xl border-border/60 bg-muted/20">
                      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-xs font-bold text-foreground">
                            {t('admin:platform_user_mgmt.drawer_tab_profile', 'Profile & Affiliations')}
                          </CardTitle>
                          <CardDescription className="text-[11px]">
                            {t('admin:profile_metadata_desc', 'Operational and organizational affiliations')}
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingProfileUser(activeProfile)
                            setEditProfileName(activeProfile.full_name || '')
                            setEditProfileJobTitle(activeProfile.job_title || '')
                            setEditProfilePhone(activeProfile.phone || '')
                          }}
                          className="h-7 text-xs rounded-lg gap-1 border-border/70 hover:bg-card"
                        >
                          <Edit className="h-3 w-3 text-emerald-500" />
                          <span>{t('admin:platform_user_mgmt.edit_profile', 'Edit')}</span>
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            {t('admin:platform_user_mgmt.job_title', 'Job Title')}
                          </div>
                          <div className="font-semibold text-foreground">
                            {activeProfile.job_title || t('admin:platform_user_mgmt.not_specified', 'Not specified')}
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            {t('admin:platform_user_mgmt.phone', 'Phone Number')}
                          </div>
                          <div className="font-mono text-foreground">
                            {activeProfile.phone || t('admin:platform_user_mgmt.not_specified', 'Not specified')}
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            {t('admin:platform_user_mgmt.department', 'Department')}
                          </div>
                          <div className="font-semibold text-foreground">
                            {activeProfile.department || t('admin:platform_user_mgmt.not_specified', 'Not specified')}
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            {t('admin:platform_user_mgmt.property', 'Hotel / Property')}
                          </div>
                          <div className="font-semibold text-foreground">
                            {activeProfile.property || t('admin:platform_user_mgmt.not_specified', 'Not specified')}
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            Primary Organization
                          </div>
                          <div className="font-semibold text-foreground">
                            {activeProfile.primary_organization_name || activeProfile.organization_name || 'Global SaaS Platform'}
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            {t('admin:platform_user_mgmt.hire_date', 'Hire Date')}
                          </div>
                          <div className="font-semibold text-foreground">
                            {activeProfile.hire_date
                              ? format(new Date(activeProfile.hire_date), 'dd MMM yyyy')
                              : t('admin:platform_user_mgmt.not_specified', 'Not specified')}
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            {t('admin:created_at', 'Account Created')}
                          </div>
                          <div className="font-mono text-muted-foreground text-[11px]">
                            {activeProfile.created_at
                              ? format(new Date(activeProfile.created_at), 'dd MMM yyyy, HH:mm')
                              : '—'}
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            {t('admin:platform_user_mgmt.last_login', 'Last Login Timestamp')}
                          </div>
                          <div className="font-mono text-muted-foreground text-[11px]">
                            {activeProfile.last_login_at
                              ? format(new Date(activeProfile.last_login_at), 'dd MMM yyyy, HH:mm')
                              : t('admin:never', 'Never recorded')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Direct quick action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setManagingTenantsUser(activeProfile)
                          setAddTenantOrgId('')
                          setAddTenantRole('learner')
                        }}
                        className="text-xs h-8 rounded-xl gap-1.5"
                      >
                        <Building2 className="h-3.5 w-3.5 text-blue-500" />
                        <span>{t('admin:platform_user_mgmt.manage_tenants', 'Manage Tenant Memberships')}</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingUser(activeProfile)
                          setNewPlatformRole(activeProfile.platform_role || 'platform_support')
                          setDetachTenantOnPromote(false)
                        }}
                        className="text-xs h-8 rounded-xl gap-1.5"
                      >
                        {!activeProfile.is_platform_user ? (
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        <span>
                          {!activeProfile.is_platform_user
                            ? t('admin:platform_user_mgmt.promote_to_operator_btn', 'Promote to Platform Operator')
                            : t('admin:platform_user_mgmt.change_platform_role_btn', 'Change Platform Role')}
                        </span>
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Tab 2: Security Telemetry */}
                  <TabsContent value="security" className="space-y-4 pt-1">
                    {/* Account Status Card */}
                    <Card className="rounded-2xl border-border/60 bg-muted/20">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold flex items-center justify-between text-foreground">
                          <span>{t('admin:platform_user_mgmt.account_status_label', 'Account Status')}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              activeProfile.account_status === 'suspended' || !activeProfile.is_active
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                : activeProfile.account_status === 'locked' ||
                                  (activeProfile.locked_until && new Date(activeProfile.locked_until) > new Date())
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {activeProfile.account_status === 'suspended' || !activeProfile.is_active
                              ? t('admin:platform_user_mgmt.suspended', 'Suspended')
                              : activeProfile.account_status === 'locked' ||
                                (activeProfile.locked_until && new Date(activeProfile.locked_until) > new Date())
                              ? t('admin:platform_user_mgmt.locked', 'Locked')
                              : t('admin:platform_user_mgmt.active', 'Active')}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 space-y-2 text-xs">
                        {(activeProfile.account_status === 'suspended' || !activeProfile.is_active) && (
                          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Ban className="h-3.5 w-3.5 text-rose-600" />
                              <span>{t('admin:suspension_details', 'Suspension Record')}</span>
                            </div>
                            <div className="text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-rose-500/20">
                              <div>
                                <span className="text-muted-foreground">{t('admin:platform_user_mgmt.suspend_reason_label', 'Reason')}: </span>
                                <span className="font-semibold capitalize">
                                  {activeProfile.suspend_reason
                                    ? t(`admin:platform_user_mgmt.${activeProfile.suspend_reason}`, activeProfile.suspend_reason.replace(/_/g, ' '))
                                    : t('admin:platform_user_mgmt.not_specified', 'Not specified')}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t('admin:suspended_at', 'Date')}: </span>
                                <span className="font-mono">
                                  {activeProfile.suspended_at
                                    ? format(new Date(activeProfile.suspended_at), 'dd MMM yyyy, HH:mm')
                                    : '—'}
                                </span>
                              </div>
                              {activeProfile.suspended_until && (
                                <div>
                                  <span className="text-muted-foreground">{t('admin:platform_user_mgmt.suspend_until_label', 'Suspended Until')}: </span>
                                  <span className="font-mono font-semibold">
                                    {format(new Date(activeProfile.suspended_until), 'dd MMM yyyy')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Lockout & Brute Force Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div className="p-3 rounded-xl border border-border/60 bg-card/60 space-y-1">
                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center justify-between">
                              <span>{t('admin:platform_user_mgmt.failed_logins', 'Failed Login Attempts')}</span>
                              <Lock className="h-3.5 w-3.5 text-amber-500" />
                            </div>
                            <div className="text-xl font-bold font-mono text-foreground">
                              {activeProfile.failed_login_attempts || 0}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {activeProfile.failed_login_attempts && activeProfile.failed_login_attempts > 0
                                ? t('admin:warning_failed_logins', 'Multiple failed attempts recorded')
                                : t('admin:normal_clean_logins', 'No authentication failures')}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl border border-border/60 bg-card/60 space-y-1">
                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center justify-between">
                              <span>{t('admin:platform_user_mgmt.locked_until', 'Lockout Expiration')}</span>
                              <Clock className="h-3.5 w-3.5 text-rose-500" />
                            </div>
                            <div className="text-xs font-mono font-semibold text-foreground pt-1">
                              {activeProfile.locked_until
                                ? format(new Date(activeProfile.locked_until), 'dd MMM yyyy, HH:mm')
                                : t('admin:none', 'None (Account Not Locked)')}
                            </div>
                          </div>
                        </div>

                        {/* Password Policy */}
                        <div className="p-3 rounded-xl border border-border/60 bg-card/60 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                              <span>{t('admin:platform_user_mgmt.password_reset_required', 'Password Reset Required')}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {activeProfile.force_password_reset
                                ? t('admin:reset_enforced_desc', 'User must change their password on next sign in')
                                : t('admin:reset_normal_desc', 'Credentials active and in good standing')}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              activeProfile.force_password_reset
                                ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                                : 'bg-muted/40 text-muted-foreground'
                            }
                          >
                            {activeProfile.force_password_reset ? 'Pending' : 'Cleared'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Security Action Buttons */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-muted-foreground">
                        {t('admin:quick_security_actions', 'Quick Security Controls')}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeProfile.account_status === 'suspended' || !activeProfile.is_active ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setActionUser(activeProfile)
                              setActionType('reactivate')
                              setActionNote('')
                              setActionDialogOpen(true)
                            }}
                            className="text-xs h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>{t('admin:platform_user_mgmt.reactivate_account', 'Reactivate Account')}</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              setActionUser(activeProfile)
                              setActionType('suspend')
                              setSuspendReason('reason_policy_violation')
                              setSuspendUntil('')
                              setActionNote('')
                              setActionDialogOpen(true)
                            }}
                            className="text-xs h-8 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            <span>{t('admin:platform_user_mgmt.suspend_account', 'Suspend Account')}</span>
                          </Button>
                        )}

                        {(activeProfile.account_status === 'locked' ||
                          (activeProfile.failed_login_attempts && activeProfile.failed_login_attempts > 0) ||
                          activeProfile.locked_until) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActionUser(activeProfile)
                              setActionType('unlock')
                              setActionDialogOpen(true)
                            }}
                            className="text-xs h-8 rounded-xl border-blue-500/40 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold gap-1.5"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            <span>{t('admin:platform_user_mgmt.unlock_account', 'Unlock Account')}</span>
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActionUser(activeProfile)
                            setActionType('force_password_reset')
                            setActionNote('')
                            setActionDialogOpen(true)
                          }}
                          className="text-xs h-8 rounded-xl border-amber-500/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold gap-1.5"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>{t('admin:platform_user_mgmt.force_password_reset', 'Force Password Reset')}</span>
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab 3: Tenants & Roles */}
                  <TabsContent value="memberships" className="space-y-4 pt-1">
                    <Card className="rounded-2xl border-border/60 bg-muted/20">
                      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-xs font-bold text-foreground">
                            {t('admin:platform_user_mgmt.drawer_tab_memberships', 'Tenant Memberships')}
                          </CardTitle>
                          <CardDescription className="text-[11px]">
                            {t('admin:assigned_customer_tenants_desc', 'Assigned organizations and property permissions')}
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setManagingTenantsUser(activeProfile)
                            setAddTenantOrgId('')
                            setAddTenantRole('learner')
                          }}
                          className="h-7 text-xs rounded-lg gap-1 border-border/70 hover:bg-card"
                        >
                          <Building2 className="h-3 w-3 text-blue-500" />
                          <span>{t('admin:manage', 'Manage')}</span>
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 space-y-2 text-xs">
                        {activeMemberships.length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted-foreground italic">
                            {t('admin:no_tenant_memberships', 'Not a member of any customer organization.')}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {activeMemberships.map((m: any) => (
                              <div
                                key={m.id || m.organization_id}
                                className="p-3 rounded-xl border border-border/60 bg-card/60 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                    <span>{m.organization_name || m.organizations?.name || 'Organization'}</span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                                    {m.hotel_name || m.hotels?.name || t('admin:all_properties', 'All Properties')}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="secondary" className="capitalize text-[10px] font-bold">
                                    {m.role}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] ${
                                      m.is_active !== false
                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                        : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                    }`}
                                  >
                                    {m.is_active !== false ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {activeProfile.is_platform_user && (
                      <Card className="rounded-2xl border-border/60 bg-amber-500/5 border-amber-500/20">
                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                          <div>
                            <CardTitle className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                              <Crown className="h-4 w-4 text-amber-600" />
                              <span>Platform Operator Authority</span>
                            </CardTitle>
                            <CardDescription className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                              Internal cross-tenant supervisory role
                            </CardDescription>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingUser(activeProfile)
                              setNewPlatformRole(activeProfile.platform_role || 'platform_support')
                            }}
                            className="h-7 text-xs rounded-lg gap-1 border-amber-500/30 hover:bg-amber-500/10 text-amber-800 dark:text-amber-200"
                          >
                            <ShieldCheck className="h-3 w-3 text-amber-600" />
                            <span>{t('admin:change_role', 'Change Role')}</span>
                          </Button>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 text-xs">
                          <div className="font-semibold text-foreground capitalize">
                            {activeProfile.platform_role?.replace(/_/g, ' ') || 'Platform Support'}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Tab 4: Audit History */}
                  <TabsContent value="audit" className="space-y-4 pt-1">
                    {isLoadingInspection ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-xs font-medium">Loading compliance notes and audit trail...</span>
                      </div>
                    ) : (
                      <>
                        {/* Section 1: Action Notes */}
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            <span>Administrative Action & Compliance Notes</span>
                          </div>
                          {(!inspectedUserData?.actionNotes || inspectedUserData.actionNotes.length === 0) ? (
                            <div className="p-4 text-center text-xs text-muted-foreground rounded-xl border border-dashed bg-muted/20">
                              No administrative action notes recorded.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {inspectedUserData.actionNotes.map((note: any) => (
                                <div key={note.id} className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1 text-xs">
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                    <span className="font-bold text-foreground capitalize">
                                      {(note.action || note.action_type || 'Action').replace(/_/g, ' ')}
                                    </span>
                                    <span className="font-mono">{note.created_at ? format(new Date(note.created_at), 'dd MMM yyyy, HH:mm') : '—'}</span>
                                  </div>
                                  <p className="text-muted-foreground text-[11px] leading-relaxed whitespace-pre-wrap">{note.note}</p>
                                  {note.created_by && (
                                    <div className="text-[10px] text-muted-foreground/80 font-mono pt-1">
                                      Recorded by ID: {note.created_by}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Section 2: Platform Audit Logs */}
                        <div className="space-y-2 pt-2 border-t border-border/60">
                          <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <History className="h-3.5 w-3.5 text-blue-500" />
                            <span>System Audit Trail Events</span>
                          </div>
                          {(!inspectedUserData?.auditLogs || inspectedUserData.auditLogs.length === 0) ? (
                            <div className="p-4 text-center text-xs text-muted-foreground rounded-xl border border-dashed bg-muted/20">
                              No audit events recorded for this user.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {inspectedUserData.auditLogs.map((log: any) => (
                                <div key={log.id} className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1 text-xs">
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                    <Badge variant="outline" className="font-mono text-[9px]">
                                      {log.action}
                                    </Badge>
                                    <span className="font-mono">{log.created_at ? format(new Date(log.created_at), 'dd MMM yyyy, HH:mm') : '—'}</span>
                                  </div>
                                  {log.details && (
                                    <pre className="text-[10px] font-mono bg-background/60 p-1.5 rounded-lg overflow-x-auto text-muted-foreground">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>
    </div>
  )
}
