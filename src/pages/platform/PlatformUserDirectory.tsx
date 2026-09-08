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
  X
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
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'suspended'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'newest' | 'tenants'>('name')
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [newPlatformRole, setNewPlatformRole] = useState<string>('platform_support')
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
    mutationFn: (params: { userId: string; role: string }) =>
      platformService.assignPlatformRole({ userId: params.userId, role: params.role }),
    onSuccess: () => {
      toast({
        title: t('admin:platform_role_granted_toast', 'Platform Role Granted'),
        description: t('admin:platform_role_granted_desc', 'The user is now an internal platform operator with the selected role.'),
      })
      setEditingUser(null)
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
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

  // Status filter + sort are applied client-side on top of the RPC's
  // search / org / role filters.
  const displayedUsers = useMemo(() => {
    let list = users
    if (selectedStatus !== 'all') {
      const wantActive = selectedStatus === 'active'
      list = list.filter((u) => !!u.is_active === wantActive)
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
  }, [users, selectedStatus, sortBy])

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

  const totalLearnersCount = platformStats?.totalLearners || users.length
  const activeUsersCount = users.filter((u) => u.is_active).length
  const healthRatio = users.length > 0 ? Math.round((activeUsersCount / users.length) * 100) : 100

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
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                {t('admin:all_orgs_filter', 'Filter by Customer Organization')}
              </Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background/70">
                  <SelectValue placeholder={t('admin:all_orgs_filter', 'All Customer Organizations')} />
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
                {t('admin:filter_by_status', 'Filter by Status')}
              </Label>
              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin:all_statuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="active">{t('admin:status_active', 'Active')}</SelectItem>
                  <SelectItem value="suspended">{t('admin:status_suspended', 'Suspended')}</SelectItem>
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

            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedOrgId('all')
                  setSelectedRole('all')
                  setSelectedStatus('all')
                  setSortBy('name')
                  setSearch('')
                }}
                className="w-full h-9 text-xs rounded-xl border-border/60 hover:bg-muted/60 text-muted-foreground"
              >
                {t('admin:clear_filters', 'Clear Filters')}
              </Button>
            </div>
          </div>

          <Card className="border border-border/60 shadow-md rounded-3xl overflow-hidden backdrop-blur-2xl bg-card/90">
            <Table className="hidden md:table">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold">{t('admin:user_and_contact', 'Learner & Contact')}</TableHead>
                  <TableHead className="text-xs font-bold">{t('admin:primary_tenant_memberships', 'Primary Tenant / Academy')}</TableHead>
                  <TableHead className="text-xs font-bold">{t('admin:platform_role', 'Platform Role')}</TableHead>
                  <TableHead className="text-xs font-bold">{t('admin:account_status', 'Status')}</TableHead>
                  <TableHead className="text-xs font-bold">{t('admin:created_date', 'Joined')}</TableHead>
                  <TableHead className="text-xs font-bold text-end">{t('admin:actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                      <span>{t('admin:loading_user_directory', 'Loading global customer directory...')}</span>
                    </TableCell>
                  </TableRow>
                ) : displayedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                      {t('admin:no_users_found', 'No users found matching query filters.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedUsers.map((u) => (
                    <TableRow key={u.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs uppercase text-slate-700 dark:text-slate-300">
                            {u.full_name?.slice(0, 2) || 'U'}
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
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            u.is_active
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {u.is_active ? t('admin:status_active', 'Active') : t('admin:status_suspended', 'Suspended')}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-[11px] text-muted-foreground font-mono">
                        {u.created_at ? format(new Date(u.created_at), 'dd MMM yyyy') : '—'}
                      </TableCell>

                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t('admin:manage_tenant_memberships', 'Manage tenant memberships')}
                            onClick={() => {
                              setManagingTenantsUser(u)
                              setAddTenantOrgId('')
                              setAddTenantRole('learner')
                            }}
                            className="h-7 text-[11px] px-2.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          >
                            <Building2 className="h-3.5 w-3.5 me-1" />
                            <span>{t('admin:tenants', 'Tenants')}</span>
                            {u.membership_count > 0 && (
                              <span className="ms-1 rounded bg-blue-500/15 px-1 text-[10px] font-mono">{u.membership_count}</span>
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingUser(u)
                              setNewPlatformRole(u.platform_role || 'platform_support')
                            }}
                            className="h-7 text-[11px] px-2 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 me-1" />
                            <span>{t('admin:platform_role', 'Role')}</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                userId: u.id,
                                isActive: !u.is_active,
                              })
                            }
                            className={`h-7 text-[11px] px-2 rounded-lg ${
                              u.is_active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {u.is_active ? t('admin:status_suspended', 'Suspend') : t('admin:status_active', 'Activate')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
                displayedUsers.map((u) => (
                  <div key={u.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
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
                          u.is_active
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {u.is_active ? t('admin:status_active', 'Active') : t('admin:status_suspended', 'Suspended')}
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
                        <span>• Joined {u.created_at ? format(new Date(u.created_at), 'dd MMM yyyy') : '—'}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-border/40">
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
                        {u.membership_count > 0 && (
                          <span className="ms-1 rounded bg-blue-500/15 px-1 text-[10px] font-mono">{u.membership_count}</span>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingUser(u)
                          setNewPlatformRole(u.platform_role || 'platform_support')
                        }}
                        className="h-8 text-xs px-2 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 min-h-touch"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 me-1" />
                        <span>{t('admin:platform_role', 'Role')}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleStatusMutation.mutate({
                            userId: u.id,
                            isActive: !u.is_active,
                          })
                        }
                        className={`h-8 text-xs px-2 rounded-lg min-h-touch ${
                          u.is_active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {u.is_active ? t('admin:status_suspended', 'Suspend') : t('admin:status_active', 'Activate')}
                      </Button>
                    </div>
                  </div>
                ))
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
      {/* MODAL 2: MANAGE OPERATOR ROLE                                            */}
      {/* ------------------------------------------------------------------------- */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                <span>{t('admin:manage_operator_role', 'Manage Platform Operator Role')}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t('admin:manage_operator_role_desc', {
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

              {editingUser.platform_role && (
                <div className="text-[11px] text-muted-foreground">
                  Currently holds: <strong className="capitalize">{String(editingUser.platform_role).replace(/_/g, ' ')}</strong>.
                  Granting a new role replaces it.
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

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {editingUser.platform_role && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    revokeRoleMutation.mutate({ userId: editingUser.id, role: editingUser.platform_role })
                  }
                  disabled={revokeRoleMutation.isPending}
                  className="text-rose-600 border-rose-300 hover:bg-rose-50 me-auto rounded-xl text-xs"
                >
                  {revokeRoleMutation.isPending ? 'Revoking…' : t('admin:revoke_operator_access', 'Revoke operator access')}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setEditingUser(null)} className="rounded-xl text-xs">
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  assignRoleMutation.mutate({ userId: editingUser.id, role: newPlatformRole })
                }
                disabled={assignRoleMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs"
              >
                {assignRoleMutation.isPending ? 'Granting…' : t('admin:grant_role', 'Grant Role')}
              </Button>
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
    </div>
  )
}
