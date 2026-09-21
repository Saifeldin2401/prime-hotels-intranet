const fs = require('fs');

if (!fs.existsSync('src/components/platform')) {
  fs.mkdirSync('src/components/platform', { recursive: true });
}

// 1. PlatformControlCenter.tsx
const p1 = `import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { platformService } from '@/services/platformService'
import {
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Activity,
  Search,
  ArrowRight,
  Cpu,
  RefreshCw,
  CheckCircle2,
  Settings,
  ShieldAlert
} from 'lucide-react'
import { format } from 'date-fns'

export default function PlatformControlCenter() {
  const { t, i18n } = useTranslation(['admin', 'common'])
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')

  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['platform-executive-stats'],
    queryFn: () => platformService.getPlatformStats(),
    staleTime: 1000 * 30,
  })

  const { data: operations, isLoading: isLoadingOps, refetch: refetchOps } = useQuery({
    queryKey: ['platform-operations-summary'],
    queryFn: () => platformService.getPlatformOperationsSummary(),
    staleTime: 1000 * 15,
  })

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['platform-global-search', searchQuery],
    queryFn: () => platformService.getPlatformGlobalSearch(searchQuery),
    enabled: searchQuery.trim().length >= 2,
    staleTime: 1000 * 10,
  })

  const { data: recentAudit = [] } = useQuery({
    queryKey: ['platform-recent-audit-preview'],
    queryFn: () => platformService.getPlatformAuditLogs(6),
    staleTime: 1000 * 60,
  })

  const retryMutation = useMutation({
    mutationFn: (jobId) => platformService.retryFailedJob(jobId),
    onSuccess: () => {
      toast({ title: 'Job Requeued', description: 'The failed job was reset to pending status.' })
      queryClient.invalidateQueries({ queryKey: ['platform-operations-summary'] })
    },
    onError: (err) => {
      toast({ title: 'Retry Failed', description: err.message, variant: 'destructive' })
    }
  })

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -end-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <span>Platform Control Center</span>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/40 text-[10px] uppercase font-bold tracking-wider">
                  SaaS Operator Plane
                </Badge>
              </h1>
              <p className="text-xs text-slate-300">
                Multi-tenant governance, organizational lifecycle, master content distribution, and system operations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 relative z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchStats()
              refetchOps()
            }}
            className="bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200 text-xs h-9"
          >
            <RefreshCw className="h-3.5 w-3.5 me-1.5" />
            <span>Refresh Telemetry</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/platform/organizations')}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 shadow-lg shadow-amber-500/20"
          >
            <Building2 className="h-3.5 w-3.5 me-1.5" />
            <span>Manage Organizations</span>
          </Button>
        </div>
      </div>

      <div className="relative">
        <div className="relative">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Global search across all customer tenants, hotels, staff, master SOPs, and master courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-11 h-12 bg-card border-slate-200 dark:border-slate-800 shadow-sm text-sm rounded-xl"
          />
          {isSearching && (
            <div className="absolute end-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Searching...</span>
            </div>
          )}
        </div>

        {searchQuery.trim().length >= 2 && searchResults && (
          <Card className="absolute top-14 start-0 end-0 z-50 shadow-2xl border bg-card/95 backdrop-blur-lg max-h-96 overflow-y-auto">
            <CardContent className="p-4 space-y-4 text-xs">
              {searchResults.organizations.length > 0 && (
                <div>
                  <div className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-amber-500" /> Organizations ({searchResults.organizations.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {searchResults.organizations.map((org) => (
                      <div
                        key={org.id}
                        onClick={() => navigate('/platform/organizations')}
                        className="p-2.5 rounded-lg border hover:bg-accent/50 cursor-pointer flex items-center justify-between"
                      >
                        <div className="font-semibold">{org.name}</div>
                        <Badge variant="outline" className="text-[10px]">{org.hotel_count} Hotels</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.users.length > 0 && (
                <div>
                  <div className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-500" /> Staff & Learners ({searchResults.users.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {searchResults.users.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => navigate('/platform/users')}
                        className="p-2.5 rounded-lg border hover:bg-accent/50 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold">{u.full_name}</div>
                          <div className="text-[10px] text-muted-foreground">{u.email}</div>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{u.primary_org || 'Platform'}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.master_courses.length > 0 && (
                <div>
                  <div className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-emerald-500" /> Master Courses ({searchResults.master_courses.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {searchResults.master_courses.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => navigate('/platform/master-library')}
                        className="p-2.5 rounded-lg border hover:bg-accent/50 cursor-pointer flex items-center justify-between"
                      >
                        <div className="font-semibold">{c.title}</div>
                        <Badge variant="outline" className="text-[10px] capitalize">{c.difficulty_level || 'General'}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 hover:border-amber-500/40 transition-all shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Active Customer Tenants</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {isLoadingStats ? <Skeleton className="h-8 w-12" /> : stats?.totalOrganizations || 0}
              </span>
              <span className="text-xs text-green-600 dark:text-green-400 font-bold">
                {stats?.activeOrganizations || 0} Healthy
              </span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t">
              <span>{stats?.totalHotels || 0} Hotel Properties</span>
              <button onClick={() => navigate('/platform/organizations')} className="text-amber-600 hover:underline font-semibold">
                Manage &rarr;
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 hover:border-blue-500/40 transition-all shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Enrolled Learners & Staff</span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {isLoadingStats ? <Skeleton className="h-8 w-12" /> : stats?.totalLearners || 0}
              </span>
              <span className="text-xs text-blue-600 font-bold">Platform-wide</span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t">
              <span>Multi-Tenant Directory</span>
              <button onClick={() => navigate('/platform/users')} className="text-blue-600 hover:underline font-semibold">
                Directory &rarr;
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-all shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Master SOP & Course Library</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {isLoadingStats ? <Skeleton className="h-8 w-12" /> : (stats?.totalMasterCourses || 0) + (stats?.totalMasterSops || 0)}
              </span>
              <span className="text-xs text-emerald-600 font-bold">
                {stats?.totalDeployments || 0} Deployed
              </span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t">
              <span>{stats?.totalMasterSops || 0} SOPs • {stats?.totalMasterCourses || 0} Courses</span>
              <button onClick={() => navigate('/platform/master-library')} className="text-emerald-600 hover:underline font-semibold">
                Library &rarr;
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 hover:border-purple-500/40 transition-all shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Background Operations Queue</span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Cpu className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {isLoadingOps ? <Skeleton className="h-8 w-12" /> : operations?.active_jobs || 0}
              </span>
              <span className="text-xs text-purple-600 font-bold">Processing</span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t">
              <span className={operations?.failed_jobs ? 'text-rose-600 font-bold' : ''}>
                {operations?.failed_jobs || 0} Failed • {operations?.completed_jobs || 0} Succeeded
              </span>
              <button onClick={() => navigate('/platform/operations')} className="text-purple-600 hover:underline font-semibold">
                Queue &rarr;
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-600" />
                  <span>Real-Time Job Queue & AI Generation Pipeline</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Inspect background course generation, document processing, and vector synchronization tasks.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/platform/operations')} className="text-xs h-8">
                <span>View Full Queue</span>
                <ArrowRight className="h-3.5 w-3.5 ms-1" />
              </Button>
            </CardHeader>

            <CardContent className="p-5 pt-2">
              {isLoadingOps ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : operations?.recent_jobs && operations.recent_jobs.length > 0 ? (
                <div className="space-y-2.5">
                  {operations.recent_jobs.slice(0, 5).map((job) => (
                    <div
                      key={job.id}
                      className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={\`w-2 h-2 rounded-full shrink-0 \${
                          job.status === 'completed' || job.status === 'success'
                            ? 'bg-green-500'
                            : job.status === 'failed' || job.status === 'error'
                            ? 'bg-rose-500'
                            : 'bg-amber-500 animate-pulse'
                        }\`} />
                        <div className="truncate">
                          <div className="font-bold text-slate-900 dark:text-white capitalize truncate">
                            {job.mode || 'Course Generation'} Job
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {format(new Date(job.created_at), 'dd MMM yyyy HH:mm:ss')} • Duration: {job.duration_ms ? \`\${(job.duration_ms / 1000).toFixed(1)}s\` : 'Running'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={\`text-[10px] capitalize \${
                            job.status === 'completed' || job.status === 'success'
                              ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30'
                              : job.status === 'failed' || job.status === 'error'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          }\`}
                        >
                          {job.status}
                        </Badge>

                        {(job.status === 'failed' || job.status === 'error') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryMutation.mutate(job.id)}
                            disabled={retryMutation.isPending}
                            className="h-7 text-[11px] px-2 text-rose-600 border-rose-300 hover:bg-rose-50"
                          >
                            <RefreshCw className="h-3 w-3 me-1" />
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-1 opacity-70" />
                  <span>All platform queues are clear. 0 active or failed jobs.</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card
              onClick={() => navigate('/platform/organizations')}
              className="p-4 rounded-xl border hover:border-amber-500/50 hover:bg-amber-500/5 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <Building2 className="h-5 w-5 text-amber-600 mb-2" />
                <h4 className="font-bold text-xs">Customer Tenants</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Lifecycle, quotas, assisted access sessions, and org structure.
                </p>
              </div>
              <div className="mt-3 font-semibold text-[11px] text-amber-600 flex items-center gap-1">
                <span>Manage Tenants</span> &rarr;
              </div>
            </Card>

            <Card
              onClick={() => navigate('/platform/users')}
              className="p-4 rounded-xl border hover:border-blue-500/50 hover:bg-blue-500/5 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <Users className="h-5 w-5 text-blue-600 mb-2" />
                <h4 className="font-bold text-xs">Global User Directory</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Platform operators, tenant admins, permissions, and status control.
                </p>
              </div>
              <div className="mt-3 font-semibold text-[11px] text-blue-600 flex items-center gap-1">
                <span>User Directory</span> &rarr;
              </div>
            </Card>

            <Card
              onClick={() => navigate('/platform/master-library')}
              className="p-4 rounded-xl border hover:border-emerald-500/50 hover:bg-emerald-500/5 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <BookOpen className="h-5 w-5 text-emerald-600 mb-2" />
                <h4 className="font-bold text-xs">Master SOP & Course Deployer</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Publish platform master standard content to target organizations.
                </p>
              </div>
              <div className="mt-3 font-semibold text-[11px] text-emerald-600 flex items-center gap-1">
                <span>Deploy Content</span> &rarr;
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  <span>Platform Security Audit</span>
                </CardTitle>
                <CardDescription className="text-xs">Immutable operator audit trail.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/platform/audit')} className="text-xs h-8">
                <span>Full Audit</span>
                <ArrowRight className="h-3.5 w-3.5 ms-1" />
              </Button>
            </CardHeader>

            <CardContent className="p-5 pt-2">
              <div className="space-y-3">
                {recentAudit.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-lg border text-xs bg-card space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white capitalize">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(log.created_at), 'HH:mm:ss')}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      Actor: <span className="font-semibold text-slate-700 dark:text-slate-300">{log.actor_name}</span> &bull; Tenant: {log.target_organization_name}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-amber-400" />
                <span className="font-bold text-xs">Platform Configuration</span>
              </div>
              <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-300">
                Production GA
              </Badge>
            </div>
            <p className="text-[11px] text-slate-300">
              Control feature flags, AI model routing priorities, and tenant quota limits.
            </p>
            <Button
              size="sm"
              onClick={() => navigate('/platform/settings')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold h-8"
            >
              Open Platform Settings &rarr;
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
`

fs.writeFileSync('src/pages/platform/PlatformControlCenter.tsx', p1, 'utf8')
console.log('p1 written')

// 2. PlatformUserDirectory.tsx
const p2 = `import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { platformService } from '@/services/platformService'
import {
  Users,
  Search,
  Building2,
  ShieldCheck,
  ShieldAlert,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'

export default function PlatformUserDirectory() {
  const { t, i18n } = useTranslation(['admin', 'common'])
  const { toast } = useToast()
  const { user: currentActor } = useAuth()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState('all')
  const [selectedRole, setSelectedRole] = useState('all')
  const [editingUser, setEditingUser] = useState(null)
  const [newPlatformRole, setNewPlatformRole] = useState('super_admin')

  const { data: orgs = [] } = useQuery({
    queryKey: ['platform-orgs-filter'],
    queryFn: () => platformService.getOrganizations(),
    staleTime: 1000 * 60 * 5,
  })

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

  const toggleStatusMutation = useMutation({
    mutationFn: (params) =>
      platformService.toggleUserActiveStatus({
        userId: params.userId,
        isActive: params.isActive,
        actorId: currentActor?.id,
      }),
    onSuccess: (_, vars) => {
      toast({
        title: vars.isActive ? 'User Activated' : 'User Suspended',
        description: 'The user account status has been updated across the platform.',
      })
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
    },
    onError: (err) => {
      toast({ title: 'Status Update Failed', description: err.message, variant: 'destructive' })
    },
  })

  const assignRoleMutation = useMutation({
    mutationFn: (params) =>
      platformService.setUserPlatformRole({
        userId: params.userId,
        role: params.role,
        actorId: currentActor?.id,
      }),
    onSuccess: () => {
      toast({
        title: 'Platform Role Granted',
        description: 'Assigned platform operator role to user.',
      })
      setEditingUser(null)
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
    },
    onError: (err) => {
      toast({ title: 'Role Assignment Failed', description: err.message, variant: 'destructive' })
    },
  })

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Global User Directory & Access Governance</h1>
              <p className="text-xs text-muted-foreground">
                Platform-wide multi-tenant user directory, internal platform roles, and tenant memberships.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-9">
            <RefreshCw className="h-3.5 w-3.5 me-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 h-9 text-xs"
          />
        </div>

        <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="All Customer Organizations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customer Organizations</SelectItem>
            {orgs.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All App & Tenant Roles</SelectItem>
            <SelectItem value="super_admin">Platform Super Admin</SelectItem>
            <SelectItem value="corporate_admin">Corporate Admin</SelectItem>
            <SelectItem value="organization_owner">Organization Owner</SelectItem>
            <SelectItem value="organization_admin">Organization Admin</SelectItem>
            <SelectItem value="training_manager">Training Manager</SelectItem>
            <SelectItem value="hotel_admin">Hotel Admin</SelectItem>
            <SelectItem value="department_manager">Department Manager</SelectItem>
            <SelectItem value="learner">Frontline Learner</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-bold">User & Contact</TableHead>
              <TableHead className="text-xs font-bold">Primary Tenant / Memberships</TableHead>
              <TableHead className="text-xs font-bold">Platform Role</TableHead>
              <TableHead className="text-xs font-bold">Account Status</TableHead>
              <TableHead className="text-xs font-bold">Created</TableHead>
              <TableHead className="text-xs font-bold text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                  Loading global user directory...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                  No users found matching query filters.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs uppercase text-slate-700 dark:text-slate-300">
                        {u.full_name?.slice(0, 2) || 'U'}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{u.full_name || 'Anonymous User'}</span>
                          {u.is_platform_user && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[9px] px-1 py-0 font-bold">
                              Operator
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {u.primary_organization_name || 'Global SaaS Platform'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {u.membership_count > 0 ? (
                          <span>{u.membership_count} Active Tenant Memberships</span>
                        ) : (
                          <span className="text-slate-400">Direct Platform Account</span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {u.platform_role ? (
                      <Badge variant="secondary" className="text-[10px] font-bold capitalize">
                        <ShieldCheck className="h-3 w-3 me-1 text-blue-600" />
                        {u.platform_role.replace(/_/g, ' ')}
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">None (Tenant User)</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={\`text-[10px] font-semibold \${
                        u.is_active
                          ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                      }\`}
                    >
                      {u.is_active ? 'Active' : 'Suspended'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-[11px] text-muted-foreground">
                    {format(new Date(u.created_at), 'dd MMM yyyy')}
                  </TableCell>

                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingUser(u)
                          setNewPlatformRole(u.platform_role || 'super_admin')
                        }}
                        className="h-7 text-[11px] px-2"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 me-1" />
                        Role
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
                        className={\`h-7 text-[11px] px-2 \${u.is_active ? 'text-rose-600 hover:bg-rose-50' : 'text-green-600 hover:bg-green-50'}\`}
                      >
                        {u.is_active ? 'Suspend' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                <span>Manage Platform Operator Role</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Grant or modify platform-wide operator privileges for <strong>{editingUser.full_name}</strong> ({editingUser.email}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Platform Role Level</Label>
                <Select value={newPlatformRole} onValueChange={setNewPlatformRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Platform Super Admin (Full Root Control)</SelectItem>
                    <SelectItem value="corporate_admin">Corporate Admin</SelectItem>
                    <SelectItem value="regional_admin">Regional Admin</SelectItem>
                    <SelectItem value="administrator">System Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  Privileged Operator Access
                </div>
                <div className="text-[11px] leading-relaxed">
                  Platform operators can enter customer tenants in assisted mode, deploy master content, and access all global telemetry.
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  assignRoleMutation.mutate({
                    userId: editingUser.id,
                    role: newPlatformRole,
                  })
                }
                disabled={assignRoleMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {assignRoleMutation.isPending ? 'Granting...' : 'Grant Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
`
fs.writeFileSync('src/pages/platform/PlatformUserDirectory.tsx', p2, 'utf8')
console.log('p2 written')

// 3. PlatformOperationsHub.tsx
const p3 = `import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { platformService } from '@/services/platformService'
import {
  Activity,
  Cpu,
  RefreshCw,
  RotateCcw
} from 'lucide-react'
import { format } from 'date-fns'

export default function PlatformOperationsHub() {
  const { t } = useTranslation(['admin', 'common'])
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filterTab, setFilterTab] = useState('all')

  const { data: operations, isLoading, refetch } = useQuery({
    queryKey: ['platform-operations-full-queue'],
    queryFn: () => platformService.getPlatformOperationsSummary(),
    refetchInterval: 10000,
  })

  const retryMutation = useMutation({
    mutationFn: (jobId) => platformService.retryFailedJob(jobId),
    onSuccess: () => {
      toast({ title: 'Job Requeued', description: 'The job has been reset to pending status.' })
      queryClient.invalidateQueries({ queryKey: ['platform-operations-full-queue'] })
    },
    onError: (err) => {
      toast({ title: 'Retry Failed', description: err.message, variant: 'destructive' })
    },
  })

  const jobs = operations?.recent_jobs || []
  const filteredJobs = jobs.filter((j) => {
    if (filterTab === 'active') return ['pending', 'processing', 'in_progress', 'queued'].includes(j.status)
    if (filterTab === 'failed') return ['failed', 'error'].includes(j.status)
    if (filterTab === 'completed') return ['completed', 'success'].includes(j.status)
    return true
  })

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Platform Operations & Background Task Queue</h1>
            <p className="text-xs text-muted-foreground">
              Monitor AI course generation, document vector ingestion, and sync pipelines across all tenants.
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-9">
          <RefreshCw className="h-3.5 w-3.5 me-1.5" />
          Refresh Pipeline
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border shadow-sm">
          <span className="text-xs text-muted-foreground font-semibold">Total Pipeline Tasks</span>
          <div className="text-2xl font-black mt-1">{operations?.total_jobs || 0}</div>
        </Card>
        <Card className="p-4 border shadow-sm bg-amber-500/5 border-amber-500/20">
          <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold">Actively Processing</span>
          <div className="text-2xl font-black mt-1 text-amber-700 dark:text-amber-300">{operations?.active_jobs || 0}</div>
        </Card>
        <Card className="p-4 border shadow-sm bg-green-500/5 border-green-500/20">
          <span className="text-xs text-green-700 dark:text-green-300 font-semibold">Successfully Completed</span>
          <div className="text-2xl font-black mt-1 text-green-700 dark:text-green-300">{operations?.completed_jobs || 0}</div>
        </Card>
        <Card className="p-4 border shadow-sm bg-rose-500/5 border-rose-500/20">
          <span className="text-xs text-rose-700 dark:text-rose-300 font-semibold">Failed Tasks</span>
          <div className="text-2xl font-black mt-1 text-rose-700 dark:text-rose-300">{operations?.failed_jobs || 0}</div>
        </Card>
      </div>

      <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v)} className="space-y-4">
        <TabsList className="bg-card border">
          <TabsTrigger value="all" className="text-xs font-semibold">All Tasks ({jobs.length})</TabsTrigger>
          <TabsTrigger value="active" className="text-xs font-semibold">In Progress ({operations?.active_jobs || 0})</TabsTrigger>
          <TabsTrigger value="failed" className="text-xs font-semibold">Failed ({operations?.failed_jobs || 0})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs font-semibold">Completed ({operations?.completed_jobs || 0})</TabsTrigger>
        </TabsList>

        <Card className="border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold">Task Mode & ID</TableHead>
                <TableHead className="text-xs font-bold">Models & Providers</TableHead>
                <TableHead className="text-xs font-bold">Status</TableHead>
                <TableHead className="text-xs font-bold">Duration</TableHead>
                <TableHead className="text-xs font-bold">Dispatched</TableHead>
                <TableHead className="text-xs font-bold text-end">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-purple-500" />
                    Loading operations queue...
                  </TableCell>
                </TableRow>
              ) : filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    No jobs matching selected filter tab.
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((j) => (
                  <TableRow key={j.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-semibold text-xs capitalize">{j.mode || 'AI Course Generation'}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{j.id}</div>
                      {j.error_message && (
                        <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 max-w-sm truncate font-mono">
                          {j.error_message}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {j.models_used && j.models_used.length > 0 ? (
                          j.models_used.map((m, idx) => (
                            <Badge key={idx} variant="outline" className="text-[9px] font-mono">
                              {m}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Automated Cascade</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={\`text-[10px] capitalize \${
                          j.status === 'completed' || j.status === 'success'
                            ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30'
                            : j.status === 'failed' || jobStatusColor(j.status)
                        }\`}
                      >
                        {j.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs font-mono">
                      {j.duration_ms ? \`\${(j.duration_ms / 1000).toFixed(1)}s\` : '—'}
                    </TableCell>

                    <TableCell className="text-[11px] text-muted-foreground">
                      {format(new Date(j.created_at), 'dd MMM HH:mm:ss')}
                    </TableCell>

                    <TableCell className="text-end">
                      {(j.status === 'failed' || j.status === 'error') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryMutation.mutate(j.id)}
                          disabled={retryMutation.isPending}
                          className="h-7 text-[11px] text-rose-600 border-rose-300 hover:bg-rose-50"
                        >
                          <RotateCcw className="h-3 w-3 me-1" />
                          Retry
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </Tabs>
    </div>
  )
}

function jobStatusColor(status) {
  if (status === 'failed' || status === 'error') return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
  return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
}
`
fs.writeFileSync('src/pages/platform/PlatformOperationsHub.tsx', p3, 'utf8')
console.log('p3 written')

// 4. PlatformSettings.tsx
const p4 = `import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { platformService } from '@/services/platformService'
import {
  Settings,
  ShieldCheck,
  Sparkles,
  RefreshCw
} from 'lucide-react'

export default function PlatformSettings() {
  const { t } = useTranslation(['admin', 'common'])
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: settings = [], isLoading, refetch } = useQuery({
    queryKey: ['platform-system-settings'],
    queryFn: () => platformService.getSystemSettings(),
    staleTime: 1000 * 60,
  })

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Platform Configuration & Feature Flags</h1>
            <p className="text-xs text-muted-foreground">
              Production runtime governance, AI provider routing defaults, and tenant isolation parameters.
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-9">
          <RefreshCw className="h-3.5 w-3.5 me-1.5" />
          Refresh Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border shadow-sm">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>AI Multi-Provider Gateway & Fallbacks</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Edge gateway failover cascades between Gemini, Groq, and Cloudflare.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2 space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl border">
              <div>
                <div className="font-semibold">Automatic Provider Cascading</div>
                <div className="text-[10px] text-muted-foreground">Fallback to Groq/Cloudflare upon 429 rate limit</div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 text-[10px]">
                Enabled
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border">
              <div>
                <div className="font-semibold">Bilingual Arabic Localization Shield</div>
                <div className="text-[10px] text-muted-foreground">Enforce RTL syntax and dual language blueprints</div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 text-[10px]">
                Enforced
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>Multi-Tenant Security & Operator Access</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Row-Level Security boundaries and operator impersonation parameters.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2 space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl border">
              <div>
                <div className="font-semibold">Platform Assisted Access TTL</div>
                <div className="text-[10px] text-muted-foreground">Maximum duration for cross-tenant operator sessions</div>
              </div>
              <Badge variant="secondary" className="font-mono text-[11px]">60 Minutes</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border">
              <div>
                <div className="font-semibold">Mandatory Operator Audit Reason</div>
                <div className="text-[10px] text-muted-foreground">Require formal reason logging before tenant entry</div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 text-[10px]">
                Mandatory
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
`
fs.writeFileSync('src/pages/platform/PlatformSettings.tsx', p4, 'utf8')
console.log('p4 written')

// 5. PlatformAdminBanner.tsx
const p5 = `import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { platformService } from '@/services/platformService'
import { ShieldAlert, LogOut, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function PlatformAdminBanner() {
  const { currentOrganization } = useTenant()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: activeSession } = useQuery({
    queryKey: ['active-platform-operator-session'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_access_sessions')
        .select('*')
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !data) return null
      return data
    },
    refetchInterval: 15000,
  })

  const exitSessionMutation = useMutation({
    mutationFn: async (sessionId) => {
      await platformService.endPlatformAccessSession(sessionId)
    },
    onSuccess: () => {
      toast({ title: 'Exited Customer Environment', description: 'Returned to Platform Control Center.' })
      queryClient.invalidateQueries({ queryKey: ['active-platform-operator-session'] })
      navigate('/platform')
    },
    onError: (err) => {
      toast({ title: 'Exit Error', description: err.message, variant: 'destructive' })
    },
  })

  if (!activeSession) return null

  return (
    <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-2 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-lg border-b border-amber-700/30 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="p-1 rounded bg-black/20 text-white">
          <ShieldAlert className="h-4 w-4" />
        </div>
        <span>Platform Administration Mode:</span>
        <span className="bg-black/15 px-2 py-0.5 rounded text-black font-extrabold flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          {currentOrganization?.name || 'Customer Organization'}
        </span>
        <span className="hidden sm:inline text-[11px] font-normal opacity-90">
          (Acting as {activeSession.acting_role || 'Organization Admin'} • Reason: {activeSession.access_reason})
        </span>
      </div>

      <Button
        size="sm"
        onClick={() => exitSessionMutation.mutate(activeSession.id)}
        disabled={exitSessionMutation.isPending}
        className="h-7 text-[11px] bg-slate-950 hover:bg-slate-900 text-white font-bold px-3 border border-black/30"
      >
        <LogOut className="h-3 w-3 me-1" />
        Exit to Platform Control Center
      </Button>
    </div>
  )
}
`
fs.writeFileSync('src/components/platform/PlatformAdminBanner.tsx', p5, 'utf8')
console.log('p5 written')
console.log('All platform files written successfully!')