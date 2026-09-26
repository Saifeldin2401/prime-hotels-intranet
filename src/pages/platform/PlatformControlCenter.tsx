import { Link } from 'react-router-dom'
import { WorkspaceHeader, headerActionClass } from '@/ui'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { platformService } from '@/services/platformService'
import {
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  Activity,
  Search,
  ArrowRight,
  Cpu,
  RefreshCw,
  CheckCircle2,
  Settings,
  ShieldAlert,
  Bot,
  Mail
} from 'lucide-react'
import { format } from 'date-fns'

export default function PlatformControlCenter() {
  const { t, i18n } = useTranslation(['admin', 'common'])
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  // The results overlay previously had no way to close except deleting the query text —
  // no click-outside or Escape handler. dismissed resets whenever the query text changes
  // (so typing again always reopens it) and is set on outside click / Escape / navigating
  // away via a result.
  const [searchOverlayDismissed, setSearchOverlayDismissed] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSearchOverlayDismissed(false)
  }, [searchQuery])

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOverlayDismissed(true)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOverlayDismissed(true)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const closeSearchOverlay = () => setSearchOverlayDismissed(true)

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
    mutationFn: (jobId: string) => platformService.retryFailedJob(jobId),
    onSuccess: () => {
      toast({ title: 'Job Requeued', description: 'The failed job was reset to pending status.' })
      queryClient.invalidateQueries({ queryKey: ['platform-operations-summary'] })
    },
    onError: (err: any) => {
      toast({ title: 'Retry Failed', description: err.message, variant: 'destructive' })
    }
  })

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <WorkspaceHeader
        eyebrow="Platform"
        title="Statistics"
        context="Organizations, people, content and jobs across the whole platform."
        actions={
          <>
            <button type="button" onClick={() => { refetchStats(); refetchOps() }} className={headerActionClass.secondary} aria-label="Refresh">
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
            </button>
            <Link to="/platform/organizations" className={headerActionClass.primary}>
              <Building2 aria-hidden="true" className="h-4 w-4" />Organizations
            </Link>
          </>
        }
      />

      {/* Cross-Tenant Global Search Bar */}
      <div className="relative" ref={searchContainerRef}>
        <div className="relative">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations, people and master content…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOverlayDismissed(false)}
            className="ps-11 h-12 rounded-md border border-ds-border bg-ds-surface text-sm shadow-none"
          />
          {isSearching && (
            <div className="absolute end-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Searching...</span>
            </div>
          )}
        </div>

        {/* Global Search Results Overlay */}
        {searchQuery.trim().length >= 2 && searchResults && !searchOverlayDismissed && (
          <Card className="absolute top-14 start-0 end-0 z-50 shadow-2xl border bg-card/95 backdrop-blur-lg max-h-[32rem] overflow-y-auto">
            <CardContent className="p-4 space-y-4 text-xs">
              {/* Organizations */}
              {searchResults.organizations?.length > 0 && (
                <div>
                  <div className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-ds-warning" /> Organizations ({searchResults.organizations.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {searchResults.organizations.map((org: any) => (
                      <div
                        key={org.id}
                        onClick={() => { closeSearchOverlay(); navigate(`/platform/organizations/${org.id}`) }}
                        className="p-2.5 rounded-lg border hover:bg-accent/50 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{org.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{org.slug}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] capitalize">{org.lifecycle_status || (org.is_active ? 'active' : 'inactive')}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Users */}
              {searchResults.users?.length > 0 && (
                <div>
                  <div className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-ds-accent" /> Staff & Learners ({searchResults.users.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {searchResults.users.map((u: any) => (
                      <div
                        key={u.id}
                        onClick={() => { closeSearchOverlay(); navigate('/platform/users') }}
                        className="p-2.5 rounded-lg border hover:bg-accent/50 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{u.full_name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {u.email} {u.organization_name ? `· ${u.organization_name}` : ''}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] capitalize">{u.role || 'Member'}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Master & Tenant Courses */}
              {((searchResults.master_courses?.length || 0) + (searchResults.tenant_courses?.length || 0)) > 0 && (
                <div>
                  <div className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-ds-success" /> Courses & Modules
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(searchResults.master_courses || []).map((c: any) => (
                      <div
                        key={c.id}
                        onClick={() => { closeSearchOverlay(); navigate('/platform/master-library') }}
                        className="p-2.5 rounded-lg border hover:bg-accent/50 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{c.title}</div>
                          <div className="text-[10px] text-muted-foreground">Master Template · {c.category || 'General'}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize bg-ds-accent-soft text-ds-accent">Master</Badge>
                      </div>
                    ))}
                    {(searchResults.tenant_courses || []).map((c: any) => (
                      <div
                        key={c.id}
                        onClick={() => { closeSearchOverlay(); navigate(c.organization_id ? `/platform/organizations/${c.organization_id}` : '/platform/organizations') }}
                        className="p-2.5 rounded-lg border hover:bg-accent/50 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{c.title}</div>
                          <div className="text-[10px] text-muted-foreground">{c.organization_name || 'Tenant'} · {c.category || 'General'}</div>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">Tenant</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assessments & Question Banks */}
              {((searchResults.assessments?.length || 0) + (searchResults.question_banks?.length || 0)) > 0 && (
                <div>
                  <div className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-ds-warning" /> Assessments & Question Banks
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(searchResults.assessments || []).map((a: any) => (
                      <div
                        key={a.id}
                        onClick={() => { closeSearchOverlay(); navigate(a.organization_id ? `/platform/organizations/${a.organization_id}` : '/platform/organizations') }}
                        className="p-2.5 rounded-lg border hover:bg-accent/50 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{a.title}</div>
                          <div className="text-[10px] text-muted-foreground">{a.organization_name || 'Global'} · Pass {a.passing_score}%</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">Assessment</Badge>
                      </div>
                    ))}
                    {(searchResults.question_banks || []).map((qb: any) => (
                      <div
                        key={qb.id}
                        onClick={() => { closeSearchOverlay(); navigate(qb.organization_id ? `/platform/organizations/${qb.organization_id}` : '/platform/organizations') }}
                        className="p-2.5 rounded-lg border hover:bg-accent/50 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{qb.name}</div>
                          <div className="text-[10px] text-muted-foreground">{qb.organization_name || 'Global'}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">Bank</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border bg-card hover:border-ds-accent/40 transition-colors shadow-none rounded-[8px]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Active Customer Tenants</span>
              <div className="w-9 h-9 rounded-[6px] bg-ds-warning-soft text-ds-warning flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-ds-ink dark:text-white">
                {isLoadingStats ? <Skeleton className="h-8 w-12" /> : stats?.totalOrganizations || 0}
              </span>
              <span className="text-xs text-ds-success font-bold">
                {stats?.activeOrganizations || 0} Healthy
              </span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t">
              <span>{stats?.trialOrganizations || 0} on trial</span>
              <button onClick={() => navigate('/platform/organizations')} className="text-ds-warning hover:underline font-semibold">
                Manage &rarr;
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card hover:border-ds-accent/30 transition-colors shadow-none rounded-[8px]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Enrolled Learners & Staff</span>
              <div className="w-9 h-9 rounded-[6px] bg-ds-accent-soft text-ds-accent flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-ds-ink dark:text-white">
                {isLoadingStats ? <Skeleton className="h-8 w-12" /> : stats?.totalLearners || 0}
              </span>
              <span className="text-xs text-ds-accent font-bold">Platform-wide</span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t">
              <span>Multi-Tenant Directory</span>
              <button onClick={() => navigate('/platform/users')} className="text-ds-accent hover:underline font-semibold">
                Directory &rarr;
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card hover:border-ds-success/30 transition-colors shadow-none rounded-[8px]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Master SOP & Course Library</span>
              <div className="w-9 h-9 rounded-[6px] bg-ds-success-soft text-ds-success flex items-center justify-center">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-ds-ink dark:text-white">
                {isLoadingStats ? <Skeleton className="h-8 w-12" /> : (stats?.totalMasterCourses || 0) + (stats?.totalMasterSops || 0)}
              </span>
              <span className="text-xs text-ds-success font-bold">
                {stats?.totalDeployments || 0} Deployed
              </span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t">
              <span>{stats?.totalMasterSops || 0} SOPs • {stats?.totalMasterCourses || 0} Courses</span>
              <button onClick={() => navigate('/platform/master-library')} className="text-ds-success hover:underline font-semibold">
                Library &rarr;
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card hover:border-ds-accent/30 transition-colors shadow-none rounded-[8px]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Background Operations Queue</span>
              <div className="w-9 h-9 rounded-[6px] bg-ds-accent-soft text-ds-accent flex items-center justify-center">
                <Cpu className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-ds-ink dark:text-white">
                {isLoadingOps ? <Skeleton className="h-8 w-12" /> : operations?.active_jobs || 0}
              </span>
              <span className="text-xs text-ds-accent font-bold">Processing</span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t">
              <span className={operations?.failed_jobs ? 'text-ds-danger font-bold' : ''}>
                {operations?.failed_jobs || 0} Failed • {operations?.completed_jobs || 0} Succeeded
              </span>
              <button onClick={() => navigate('/platform/operations')} className="text-ds-accent hover:underline font-semibold">
                Queue &rarr;
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Operations & Quick Access Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border bg-card shadow-none rounded-[8px]">
            <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-ds-accent" />
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
                      className="p-3 rounded-xl border border-ds-border bg-ds-surface-subtle flex items-center justify-between text-xs gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          job.status === 'completed' || job.status === 'success'
                            ? 'bg-ds-success'
                            : job.status === 'failed' || job.status === 'error'
                            ? 'bg-ds-danger'
                            : 'bg-ds-warning animate-pulse'
                        }`} />
                        <div className="truncate">
                          <div className="font-bold text-ds-ink dark:text-white capitalize truncate">
                            {job.mode || 'Course Generation'} Job
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {format(new Date(job.created_at), 'dd MMM yyyy HH:mm:ss')} • Duration: {job.duration_ms ? `${(job.duration_ms / 1000).toFixed(1)}s` : 'Running'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${
 job.status === 'completed' || job.status === 'success'
 ? 'bg-ds-success-soft text-ds-success border-ds-success/30'
 : job.status === 'failed' || job.status === 'error'
 ? 'bg-ds-danger-soft text-ds-danger border-ds-danger/30'
 : 'bg-ds-warning-soft text-ds-warning border-ds-warning/30'
 }`}
                        >
                          {job.status}
                        </Badge>

                        {(job.status === 'failed' || job.status === 'error') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryMutation.mutate(job.id)}
                            disabled={retryMutation.isPending}
                            className="h-7 text-[11px] px-2 text-ds-danger border-ds-danger/30 hover:bg-ds-danger-soft"
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
                  <CheckCircle2 className="h-6 w-6 text-ds-success mx-auto mb-1 opacity-70" />
                  <span>All platform queues are clear. 0 active or failed jobs.</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Card
              onClick={() => navigate('/platform/organizations')}
              className="p-4 rounded-xl border hover:border-ds-warning/30 hover:bg-ds-warning-soft cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <Building2 className="h-5 w-5 text-ds-warning mb-2" />
                <h4 className="font-bold text-xs">Customer Tenants</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Lifecycle, quotas, assisted access sessions, and org structure.
                </p>
              </div>
              <div className="mt-3 font-semibold text-[11px] text-ds-warning flex items-center gap-1">
                <span>Manage Tenants</span> &rarr;
              </div>
            </Card>

            <Card
              onClick={() => navigate('/platform/users')}
              className="p-4 rounded-xl border hover:border-ds-accent/30 hover:bg-ds-accent-soft cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <Users className="h-5 w-5 text-ds-accent mb-2" />
                <h4 className="font-bold text-xs">Global User Directory</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Platform operators, tenant admins, permissions, and status control.
                </p>
              </div>
              <div className="mt-3 font-semibold text-[11px] text-ds-accent flex items-center gap-1">
                <span>User Directory</span> &rarr;
              </div>
            </Card>

            <Card
              onClick={() => navigate('/platform/master-library')}
              className="p-4 rounded-xl border hover:border-ds-success/30 hover:bg-ds-success-soft cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <BookOpen className="h-5 w-5 text-ds-success mb-2" />
                <h4 className="font-bold text-xs">Master SOP & Course Deployer</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Publish platform master standard content to target organizations.
                </p>
              </div>
              <div className="mt-3 font-semibold text-[11px] text-ds-success flex items-center gap-1">
                <span>Deploy Content</span> &rarr;
              </div>
            </Card>

            <Card
              onClick={() => navigate('/platform/ai-settings')}
              className="p-4 rounded-xl border hover:border-ds-accent/30 hover:bg-ds-accent-soft cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <Bot className="h-5 w-5 text-ds-accent mb-2" />
                <h4 className="font-bold text-xs">AI Course Engine & Gateways</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Gemini, Groq, OpenRouter routing modes, spend caps, and edge diagnostics.
                </p>
              </div>
              <div className="mt-3 font-semibold text-[11px] text-ds-accent flex items-center gap-1">
                <span>Configure AI Engine</span> &rarr;
              </div>
            </Card>

            <Card
              onClick={() => navigate('/platform/email-templates')}
              className="p-4 rounded-xl border hover:border-ds-accent/30 hover:bg-ds-accent-soft cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <Mail className="h-5 w-5 text-ds-accent mb-2" />
                <h4 className="font-bold text-xs">System Email & Inbound Pipeline</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Transactional notification templates, delivery events, and inbound webhooks.
                </p>
              </div>
              <div className="mt-3 font-semibold text-[11px] text-ds-accent flex items-center gap-1">
                <span>Manage Templates</span> &rarr;
              </div>
            </Card>

            <Card
              onClick={() => navigate('/platform/operations')}
              className="p-4 rounded-xl border hover:border-ds-accent/30 hover:bg-ds-accent-soft cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <Cpu className="h-5 w-5 text-ds-accent mb-2" />
                <h4 className="font-bold text-xs">Operations & Task Queue</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Background job execution, vector sync, and AI generation pipeline status.
                </p>
              </div>
              <div className="mt-3 font-semibold text-[11px] text-ds-accent flex items-center gap-1">
                <span>Inspect Pipeline</span> &rarr;
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border border-border bg-card shadow-none rounded-[8px]">
            <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-ds-warning" />
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
                      <span className="font-bold text-ds-ink dark:text-white capitalize">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(log.created_at), 'HH:mm:ss')}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      Actor: <span className="font-semibold text-ds-ink">{log.actor_name}</span> &bull; Tenant: {log.target_organization_name}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card shadow-none rounded-[8px] text-ds-on-ink p-5 space-y-3 bg-ds-ink">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-ds-warning" />
                <span className="font-bold text-xs">Platform Configuration</span>
              </div>
              <Badge variant="outline" className="text-[10px] border-ds-warning/30 text-ds-warning">
                Production GA
              </Badge>
            </div>
            <p className="text-[11px] text-ds-muted">
              Control feature flags, AI model routing priorities, and tenant quota limits.
            </p>
            <Button
              size="sm"
              onClick={() => navigate('/platform/settings')}
              className="w-full bg-ds-ink hover:bg-ds-ink text-white border border-ds-border-strong text-xs font-semibold h-8"
            >
              Open Platform Settings &rarr;
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}