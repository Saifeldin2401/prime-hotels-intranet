import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { platformService } from '@/services/platformService'
import type { Organization } from '@/lib/types/tenant'
import { format } from 'date-fns'
import {
  Building2,
  Users,
  ShieldAlert,
  ShieldCheck,
  Activity,
  ArrowRight,
  RefreshCw,
  Crown,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react'

export function PlatformOverviewCockpit() {
  const { t, i18n } = useTranslation(['admin', 'dashboard', 'common'])
  const isRtl = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { organizations, enterOrganization } = useTenant()

  // Audited break-glass entry state
  const [selectedOrgForEnter, setSelectedOrgForEnter] = useState<Organization | null>(null)
  const [enterReason, setEnterReason] = useState('')
  const [actingRole, setActingRole] = useState('organization_admin')
  const [isEntering, setIsEntering] = useState(false)

  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['platform-dashboard-stats'],
    queryFn: () => platformService.getPlatformStats(),
    staleTime: 1000 * 30,
  })

  const { data: operations, isLoading: isLoadingOps, refetch: refetchOps } = useQuery({
    queryKey: ['platform-dashboard-ops'],
    queryFn: () => platformService.getPlatformOperationsSummary(),
    staleTime: 1000 * 15,
  })

  const { data: recentAudit = [], isLoading: isLoadingAudit } = useQuery({
    queryKey: ['platform-dashboard-recent-audit'],
    queryFn: () => platformService.getPlatformAuditLogs(5),
    staleTime: 1000 * 60,
  })

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => platformService.retryFailedJob(jobId),
    onSuccess: () => {
      toast({ title: t('common:success', 'Job Requeued'), description: 'The failed job was reset to pending status.' })
      queryClient.invalidateQueries({ queryKey: ['platform-dashboard-ops'] })
    },
    onError: (err: unknown) => {
      const error = err as { message?: string }
      toast({ title: t('common:error', 'Retry Failed'), description: error?.message || 'Failed to retry job', variant: 'destructive' })
    }
  })

  const handleConfirmEnterOrg = async () => {
    if (!selectedOrgForEnter) return
    if (!enterReason || enterReason.trim().length < 10) {
      toast({
        title: t('common:error', 'Error'),
        description: t('admin:reason_min_chars', 'At least 10 characters required for the immutable audit log'),
        variant: 'destructive',
      })
      return
    }

    try {
      setIsEntering(true)
      await enterOrganization(selectedOrgForEnter.id, enterReason.trim(), actingRole)
      toast({
        title: t('admin:entering', 'Customer Environment Entered'),
        description: `${selectedOrgForEnter.name} (${actingRole})`,
      })
      setSelectedOrgForEnter(null)
      navigate('/dashboard')
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to enter organization',
        variant: 'destructive',
      })
    } finally {
      setIsEntering(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Platform Control Deck Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-hotel-navy-dark via-hotel-navy to-hotel-navy-light p-6 sm:p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono uppercase tracking-wider">
                <Crown className="h-3.5 w-3.5 text-amber-400" />
                {t('admin:global_saas_scope', 'Global SaaS Scope')}
              </span>
              <Badge variant="outline" className="text-[11px] text-emerald-400 border-emerald-500/40 bg-emerald-500/10">
                System Healthy
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-hotel-gold">
              {t('admin:platform_control_plane', 'Platform Control Center')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {t('admin:platform_control_plane_desc', 'Executive SaaS control, multi-tenant governance, and global operations')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => { refetchStats(); refetchOps() }}
              className="border-hotel-gold/30 text-white bg-white/5 hover:bg-white/10 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 me-1.5" />
              <span>{t('common:refresh', 'Refresh')}</span>
            </Button>
            <Button
              onClick={() => navigate('/platform')}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md"
            >
              <span>{t('admin:platform_control_plane', 'Open Full Platform Hub')}</span>
              <ArrowRight className="h-3.5 w-3.5 ms-1.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Real Platform Statistics Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('admin:customer_tenants', 'Customer Tenants')}
            </CardTitle>
            <Building2 className="h-4 w-4 text-hotel-gold" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-serif text-foreground">
                {stats?.totalOrganizations ?? organizations.length}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              {stats?.activeOrganizations ?? organizations.length} Active Organizations
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Intranet Users
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-serif text-foreground">
                {stats?.totalUsers?.toLocaleString() ?? '—'}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Across all enterprise tenants</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Background System Jobs
            </CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoadingOps ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-serif text-foreground">
                {operations?.totalJobs ?? 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              {operations?.failedJobs ? `${operations.failedJobs} failed jobs require attention` : 'All background workers healthy'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Audited Break-Glass
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-serif text-foreground">
                {stats?.activeSessions ?? 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Active break-glass sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Environments Directory */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold font-serif flex items-center gap-2">
              <Building2 className="h-4 w-4 text-hotel-gold" />
              <span>{t('admin:customer_tenants', 'Customer Environments (Audited Access)')}</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Direct break-glass entry into customer tenant environments with mandatory audit justification
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/platform/organizations')}
            className="text-xs text-hotel-gold hover:text-hotel-gold-light"
          >
            <span>View All</span>
            <ExternalLink className="h-3 w-3 ms-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="p-4 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">{org.name}</span>
                    <Badge variant="outline" className="text-[10px] text-hotel-gold border-hotel-gold/30">
                      {org.tier_plan || 'Enterprise'}
                    </Badge>
                  </div>
                  {org.name_ar && (
                    <p className="text-xs text-muted-foreground font-sans">{org.name_ar}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground font-mono">
                    ID: {org.organization_code}
                  </p>
                </div>

                <Button
                  onClick={() => {
                    setSelectedOrgForEnter(org)
                    setEnterReason('')
                    setActingRole('organization_admin')
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                >
                  <ShieldAlert className="h-3.5 w-3.5 me-1.5 text-amber-500" />
                  <span>{t('admin:enter_tenant_audited', 'Enter Environment')}</span>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Grid: Recent Audit Logs & System Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audit Logs */}
        <Card className="border-border/60 bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-bold font-serif flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Recent Operator Security Audits</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/platform/audit-logs')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <span>{t('admin:audit_logs.title', 'Audit Logs')}</span>
              <ArrowRight className="h-3 w-3 ms-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingAudit ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : recentAudit.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No recent audit log entries recorded.
              </p>
            ) : (
              recentAudit.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <div>
                      <div className="font-medium text-foreground">{log.action}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {log.admin_user?.email || 'Platform Operator'} • {log.target_organization?.name || 'Global'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Failed Background Jobs Queue */}
        <Card className="border-border/60 bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-bold font-serif flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              <span>Background Queues & Workers</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/platform/operations')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <span>Operations Hub</span>
              <ArrowRight className="h-3 w-3 ms-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingOps ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (operations?.failedJobDetails?.length ?? 0) === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Zero queue failures. All background automation jobs completed successfully.</span>
              </div>
            ) : (
              operations?.failedJobDetails?.map((job) => (
                <div
                  key={job.id}
                  className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-red-600 dark:text-red-400">{job.job_type}</div>
                    <div className="text-[10px] text-muted-foreground truncate max-w-[280px]">
                      {job.error_message || 'Unexpected worker error'}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={retryMutation.isPending}
                    onClick={() => retryMutation.mutate(job.id)}
                    className="h-7 text-[11px] border-red-400/40 text-red-500"
                  >
                    <RefreshCw className="h-3 w-3 me-1" />
                    Retry
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Audited Break-Glass Modal */}
      <Dialog open={!!selectedOrgForEnter} onOpenChange={(open) => !open && setSelectedOrgForEnter(null)}>
        <DialogContent className="max-w-lg bg-hotel-navy-dark text-white border-hotel-gold/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-hotel-gold text-lg">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              {t('admin:enter_tenant_audited', 'Enter Customer Environment (Audited)')}
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs">
              {t('admin:enter_tenant_dialog_desc', 'Accessing a customer environment starts an audited break-glass session with mandatory security logging and TTL expiration.')}
            </DialogDescription>
          </DialogHeader>

          {selectedOrgForEnter && (
            <div className="space-y-4 py-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 text-hotel-gold" />
                  <span className="font-semibold text-sm">{selectedOrgForEnter.name}</span>
                </div>
                <Badge variant="outline" className="text-hotel-gold border-hotel-gold/30">
                  {selectedOrgForEnter.tier_plan || 'Enterprise'}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="platform-acting-role" className="text-xs text-slate-200">
                  {t('admin:acting_role', 'Acting Role')}
                </Label>
                <Select value={actingRole} onValueChange={setActingRole}>
                  <SelectTrigger id="platform-acting-role" className="bg-slate-900 border-white/10 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-hotel-navy-dark border-white/20 text-white">
                    <SelectItem value="organization_admin">Organization Administrator (Full Tenant Admin)</SelectItem>
                    <SelectItem value="training_manager">Training & L&D Director</SelectItem>
                    <SelectItem value="property_gm">Hotel General Manager</SelectItem>
                    <SelectItem value="auditor">Compliance Auditor (Read-Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="platform-enter-reason" className="text-xs text-slate-200">
                  {t('admin:access_reason', 'Access Justification / Reason')} *
                </Label>
                <Textarea
                  id="platform-enter-reason"
                  value={enterReason}
                  onChange={(e) => setEnterReason(e.target.value)}
                  placeholder={t('admin:access_reason_placeholder', 'State substantive business or support justification (min 10 characters)...')}
                  rows={3}
                  className="bg-slate-900 border-white/10 text-white text-xs placeholder:text-slate-500 focus-visible:ring-hotel-gold"
                />
                <p className="text-[11px] text-amber-300/80">
                  {t('admin:reason_min_chars', 'At least 10 characters required for the immutable audit log')}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedOrgForEnter(null)}
              className="text-slate-300 hover:text-white hover:bg-white/10 text-xs"
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              disabled={isEntering || enterReason.trim().length < 10}
              onClick={handleConfirmEnterOrg}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
            >
              {isEntering ? t('admin:entering', 'Starting Audited Session...') : t('admin:enter_environment', 'Enter Customer Environment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default PlatformOverviewCockpit
