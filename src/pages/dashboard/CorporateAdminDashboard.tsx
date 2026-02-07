import { useMemo, type ComponentType, type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed } from '@/components/social/SocialFeed'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import { QuickActionsWidget } from '@/components/dashboard/QuickActionsWidget'
import { PendingItemsWidget } from '@/components/dashboard/PendingItemsWidget'
import { MaintenanceWidget } from '@/components/dashboard/MaintenanceWidget'
import { DocumentsWidget, TrainingWidget, AnnouncementsWidget } from '@/components/dashboard/StatsWidgets'
import { TaskWidget } from '@/components/dashboard/TaskWidget'
import { AIDigestWidget } from '@/components/dashboard/AIDigestWidget'
import { DepartmentKPIWidget } from '@/components/dashboard/DepartmentKPIWidget'
import { KnowledgeComplianceWidget } from '@/components/knowledge/KnowledgeComplianceWidget'
import { DepartmentControlCenter } from '@/components/departments/DepartmentControlCenter'
import { OperationsControlCenter } from '@/components/operations/OperationsControlCenter'
import { ReportsControlCenter } from '@/components/reports/ReportsControlCenter'
import { MotivationWidget } from "@/components/dashboard/MotivationWidget"
import { ActiveUsersWidget } from "@/components/dashboard/ActiveUsersWidget"
import { NewsWidget } from "@/components/dashboard/NewsWidget"
import { EmployeeOfMonthWidget } from "@/components/dashboard/EmployeeOfMonthWidget"
import { BirthdayWidget } from "@/components/dashboard/BirthdayWidget"
import { AuditsControlCenter } from '@/components/audits/AuditsControlCenter'
import { Icons } from '@/components/icons'
import { useProperty } from '@/contexts/PropertyContext'
import type { User } from '@/lib/rbac'
import { useAreaManagerStats, useCorporateStats } from '@/hooks/useDashboardStats'
import { useUnifiedSocialFeed } from '@/hooks/useUnifiedSocialFeed'
import { PropertyManagerDashboard } from './PropertyManagerDashboard'
import {
  AlertTriangle,
  BarChart3,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  Hotel,
  LineChart,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  Wrench
} from 'lucide-react'

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function CorporateAdminDashboard() {
  const { currentProperty } = useProperty()

  // Simplified Switcher Component
  // This component acts as a router between the Corporate view and the Property view
  // It must rely on PropertyManagerDashboard to handle its own context
  if (currentProperty && currentProperty.id !== 'all') {
    return <PropertyManagerDashboard />
  }

  return <CorporateDashboardContent />
}

function CorporateDashboardContent() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const { currentProperty, availableProperties } = useProperty()
  const { currentUser, feedItems, isLoading: feedLoading, onReact, onComment, onShare } = useUnifiedSocialFeed()
  const { data: corporateStats, isLoading: statsLoading } = useCorporateStats(currentProperty?.id)
  const { data: areaStats, isLoading: areaLoading } = useAreaManagerStats(currentProperty?.id)

  const loading = feedLoading || statsLoading || areaLoading

  // Memoize stats to prevent unnecessary re-renders
  const stats = useMemo(() => corporateStats || {
    totalProperties: 0,
    totalStaff: 0,
    maintenanceEfficiency: 0,
    openVacancies: 0,
    complianceRate: 0,
    totalTraining: 0,
    totalTickets: 0
  }, [corporateStats])

  const openIssues = areaStats?.openIssues || 0
  const avgStaffPerProperty = stats.totalProperties > 0 ? Math.round(stats.totalStaff / stats.totalProperties) : 0
  const propertyScopeLabel = currentProperty?.id === 'all' ? t('cards.system_resolution_rate', 'System-wide resolution rate') : t('cards.ticket_resolution_rate', 'Ticket resolution rate')
  const executiveHighlightsTitle = t('cards.executive_highlights', 'Executive Highlights')
  const corporateHealthTitle = t('cards.corporate_health_snapshot', 'Corporate Health Snapshot')

  const complianceTrend = buildTrend(stats.complianceRate, 18)
  const maintenanceTrend = buildTrend(stats.maintenanceEfficiency, 14)
  const vacancyTrend = buildTrend(Math.min(stats.openVacancies * 10, 100), 22)
  const issueTrend = buildTrend(Math.min(openIssues * 5, 100), 20)

  const alerts = [
    // Only show compliance risk if there IS training assign but completion is low
    stats.totalTraining > 0 && stats.complianceRate < 70
      ? {
        level: 'critical',
        title: t('cards.alert_low_compliance', 'Compliance Risk'),
        description: t('cards.alert_low_compliance_desc', 'Training compliance is below 70%. Immediate follow-up required.'),
        value: `${stats.complianceRate}%`
      }
      : null,
    // Only show maintenance backlog if there ARE tickets but resolution is low
    stats.totalTickets > 0 && stats.maintenanceEfficiency < 80
      ? {
        level: 'warning',
        title: t('cards.alert_maintenance', 'Maintenance Backlog'),
        description: t('cards.alert_maintenance_desc', 'Resolution rate has dipped below target. Review high volume properties.'),
        value: `${stats.maintenanceEfficiency}%`
      }
      : null,
    openIssues > 15
      ? {
        level: 'critical',
        title: t('cards.alert_open_issues', 'Open Issues Spike'),
        description: t('cards.alert_open_issues_desc', 'Open issues are above the safety threshold. Escalate critical tasks.'),
        value: `${openIssues}`
      }
      : null,
    stats.openVacancies > 10
      ? {
        level: 'warning',
        title: t('cards.alert_vacancies', 'Recruitment Pressure'),
        description: t('cards.alert_vacancies_desc', 'Open vacancies exceed target staffing buffer.'),
        value: `${stats.openVacancies}`
      }
      : null
  ].filter(Boolean) as Array<{ level: 'critical' | 'warning' | 'info'; title: string; description: string; value?: string }>

  const riskIndex = Math.max(
    0,
    Math.min(
      100,
      Math.round(((100 - stats.complianceRate) * 0.5) + ((100 - stats.maintenanceEfficiency) * 0.3) + Math.min(openIssues * 2, 30))
    )
  )

  const focusItems = [
    {
      title: t('cards.focus_compliance', 'Lift training compliance'),
      note: stats.totalTraining === 0
        ? t('cards.focus_compliance_none', 'No training assigned yet')
        : stats.complianceRate < 85
          ? t('cards.focus_compliance_note', 'Prioritize overdue training assignments')
          : t('cards.focus_compliance_note_ok', 'Compliance on track')
    },
    {
      title: t('cards.focus_maintenance', 'Reduce maintenance backlog'),
      note: stats.totalTickets === 0
        ? t('cards.focus_maintenance_none', 'No maintenance tickets recorded')
        : openIssues > 0
          ? t('cards.focus_maintenance_note', 'Target top issue categories this week')
          : t('cards.focus_maintenance_note_ok', 'No backlog spikes detected')
    },
    {
      title: t('cards.focus_staffing', 'Stabilize staffing'),
      note: stats.openVacancies > 0 ? t('cards.focus_staffing_note', 'Accelerate open requisitions') : t('cards.focus_staffing_note_ok', 'Vacancies within target')
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Icons.Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* Executive Overview */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-hotel-navy via-[#0f172a] to-[#1f2937] text-white p-8 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.6)]">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-hotel-gold/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <Badge variant="gold" className="mb-3">{t('cards.executive_badge', 'Corporate Command')}</Badge>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                {currentProperty?.id === 'all' ? t('cards.corporate_dashboard_title', 'Corporate Dashboard') : `${currentProperty?.name} Dashboard`}
              </h1>
              <p className="text-white/70 mt-2">
                {currentProperty?.id === 'all'
                  ? t('property_overview', { name: 'PRIME GROUP (HEAD OFFICE)' })
                  : t('property_overview', { name: currentProperty?.name })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-white/30 text-white">
                {stats.totalProperties} {stats.totalProperties === 1 ? t('widgets.property') : t('widgets.properties')}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <div className="text-xs uppercase tracking-widest text-white/60">{t('cards.active_properties', 'Active Properties')}</div>
              <div className="text-2xl font-bold mt-2">{stats.totalProperties}</div>
              <div className="text-xs text-white/60 mt-1">{t('widgets.properties', 'Properties')}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <div className="text-xs uppercase tracking-widest text-white/60">{t('cards.total_staff', 'Total Staff')}</div>
              <div className="text-2xl font-bold mt-2">{stats.totalStaff}</div>
              <div className="text-xs text-white/60 mt-1">{t('cards.avg_staff_per_property', 'Avg per property')}: {avgStaffPerProperty}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <div className="text-xs uppercase tracking-widest text-white/60">{t('cards.training_compliance')}</div>
              <div className="text-2xl font-bold mt-2">{stats.complianceRate}%</div>
              <div className="text-xs text-white/60 mt-1">{t('cards.completion_rate')}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <div className="text-xs uppercase tracking-widest text-white/60">{t('cards.open_issues', 'Pending Actions')}</div>
              <div className="text-2xl font-bold mt-2">{openIssues}</div>
              <div className="text-xs text-white/60 mt-1">{t('cards.pending_tasks_tickets', 'Tasks & Tickets')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <MotivationWidget />
        </div>
        <div className="col-span-3">
          <ActiveUsersWidget />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-8">
          <EmployeeOfMonthWidget />
        </div>
        <div className="md:col-span-4">
          <BirthdayWidget />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <NewsWidget />
      </div>

      <SectionHeader
        title={t('cards.executive_kpis', 'Executive KPIs')}
        subtitle={t('cards.executive_kpis_subtitle', 'High-level metrics across the portfolio')}
        icon={BarChart3}
      />

      {/* Corporate KPIs */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <Card className="border-t-4 border-t-hotel-gold shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">{t('cards.total_staff_revenue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-3xl font-bold text-hotel-navy">{stats.totalStaff}</div>
                <p className="text-xs text-hotel-gold-dark mt-1 font-medium">{t('cards.headcount')}</p>
                <p className="text-xs text-gray-500 mt-2">{t('cards.avg_staff_per_property', 'Avg per property')}: {avgStaffPerProperty}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-hotel-navy shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">{t('cards.active_properties', 'Active Properties')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-hotel-navy">{stats.totalProperties}</div>
              <Hotel className="h-6 w-6 text-hotel-gold" />
            </div>
            <p className="text-xs text-gray-500 mt-2">{t('widgets.properties', 'Properties')}</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-hotel-gold shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">{t('cards.recruitment')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-hotel-navy">{stats.openVacancies}</div>
            <div className="text-sm text-gray-500 mt-2 font-medium">{t('cards.open_positions')}</div>
            <p className="text-xs text-gray-500 mt-1">
              {t('cards.active_job_postings')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-hotel-navy shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">{t('cards.training_compliance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-hotel-navy">{stats.complianceRate}%</div>
            <Progress value={stats.complianceRate} className="mt-2 h-2 [&>div]:bg-green-600" />
            <p className="text-xs text-green-600 mt-1 font-medium">{t('cards.completion_rate')}</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-hotel-gold shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">{t('cards.maintenance_efficiency')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-hotel-navy">{stats.maintenanceEfficiency}%</div>
            <Progress value={stats.maintenanceEfficiency} className="mt-2 h-2 [&>div]:bg-blue-600" />
            <p className="text-xs text-blue-600 mt-1 font-medium">{propertyScopeLabel}</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-hotel-navy shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">{t('cards.open_issues', 'Pending Tasks & Tickets')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-hotel-navy">{openIssues}</div>
              <Wrench className="h-6 w-6 text-orange-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">{t('cards.pending_tasks_tickets', 'Pending tasks/tickets')}</p>
          </CardContent>
        </Card>
      </div>


      <SectionHeader
        title={t('cards.executive_control_center', 'Executive Control Center')}
        subtitle={t('cards.executive_control_center_subtitle', 'Live risk signals, governance health, and leadership focus')}
        icon={ShieldAlert}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card className="border border-hotel-gold/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <LineChart className="h-4 w-4 text-hotel-gold" />
                {executiveHighlightsTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{t('cards.training_compliance')}</p>
                    <p className="text-xs text-gray-500">{t('cards.training_sop_compliance', 'Training & SOP compliance')}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-green-700">{stats.complianceRate}%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">{t('cards.maintenance_efficiency')}</p>
                    <p className="text-xs text-gray-500">{propertyScopeLabel}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-blue-700">{stats.maintenanceEfficiency}%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CalendarCheck className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">{t('cards.open_positions')}</p>
                    <p className="text-xs text-gray-500">{t('cards.active_job_postings')}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-purple-700">{stats.openVacancies}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-red-100">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                {t('cards.executive_alerts', 'Executive Alerts')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg border border-green-100 bg-green-50 p-3 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('cards.all_clear', 'All critical systems are within target.')}
                </div>
              ) : (
                alerts.map((alert, index) => {
                  const tone = alert.level === 'critical'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : alert.level === 'warning'
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-blue-200 bg-blue-50 text-blue-700'

                  return (
                    <div key={`${alert.title}-${index}`} className={`rounded-lg border p-3 ${tone}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{alert.title}</p>
                        {alert.value && (
                          <Badge variant="outline" className="text-xs">{alert.value}</Badge>
                        )}
                      </div>
                      <p className="text-xs mt-1 opacity-80">{alert.description}</p>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <PendingItemsWidget />
          <QuickActionsWidget />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-hotel-gold" />
                {t('cards.strategic_focus', 'Strategic Focus')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {focusItems.map((item) => (
                <div key={item.title} className="rounded-lg border p-3">
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.note}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-hotel-gold" />
                {corporateHealthTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t('cards.training_compliance')}</span>
                  <span className="font-semibold">{stats.complianceRate}%</span>
                </div>
                <Progress value={stats.complianceRate} className="mt-2 h-2 [&>div]:bg-green-600" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t('cards.maintenance_efficiency')}</span>
                  <span className="font-semibold">{stats.maintenanceEfficiency}%</span>
                </div>
                <Progress value={stats.maintenanceEfficiency} className="mt-2 h-2 [&>div]:bg-blue-600" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t('cards.open_issues', 'Open Issues')}</span>
                <span className="font-semibold text-orange-600">{openIssues}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-hotel-gold/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-hotel-gold" />
                {t('cards.risk_index', 'Operational Risk Index')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-hotel-navy">{riskIndex}</p>
                  <p className="text-xs text-gray-500">{t('cards.risk_index_hint', 'Lower is better')}</p>
                </div>
                <Sparkline data={issueTrend} colorClass="stroke-orange-500" />
              </div>
              <Progress value={Math.max(0, 100 - riskIndex)} className="h-2 [&>div]:bg-emerald-500" />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{t('cards.risk_index_scope', 'Portfolio-wide signals')}</span>
                <span>{t('cards.risk_index_updated', 'Updated hourly')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <SectionHeader
        title={t('cards.portfolio_trends', 'Portfolio Trends')}
        subtitle={t('cards.portfolio_trends_subtitle', 'Momentum across compliance, maintenance, and staffing')}
        icon={TrendingUp}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="border border-hotel-gold/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('cards.training_compliance')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-hotel-navy">{stats.complianceRate}%</span>
              <Sparkline data={complianceTrend} colorClass="stroke-green-500" />
            </div>
            <p className="text-xs text-gray-500">{t('cards.completion_rate')}</p>
          </CardContent>
        </Card>
        <Card className="border border-hotel-gold/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('cards.maintenance_efficiency')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-hotel-navy">{stats.maintenanceEfficiency}%</span>
              <Sparkline data={maintenanceTrend} colorClass="stroke-blue-500" />
            </div>
            <p className="text-xs text-gray-500">{propertyScopeLabel}</p>
          </CardContent>
        </Card>
        <Card className="border border-hotel-gold/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('cards.open_positions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-hotel-navy">{stats.openVacancies}</span>
              <Sparkline data={vacancyTrend} colorClass="stroke-purple-500" />
            </div>
            <p className="text-xs text-gray-500">{t('cards.active_job_postings')}</p>
          </CardContent>
        </Card>
        <Card className="border border-hotel-gold/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('cards.open_issues', 'Open Issues')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-hotel-navy">{openIssues}</span>
              <Sparkline data={issueTrend} colorClass="stroke-orange-500" />
            </div>
            <p className="text-xs text-gray-500">{t('cards.pending_tasks_tickets', 'Pending tasks/tickets')}</p>
          </CardContent>
        </Card>
      </div>

      <SectionHeader
        title={t('cards.operational_intelligence', 'Operational Intelligence')}
        subtitle={t('cards.operational_intelligence_subtitle', 'Cross-department signals and core execution metrics')}
        icon={Sparkles}
      />

      {/* Operational Intelligence */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MaintenanceWidget />
        <DocumentsWidget />
        <TrainingWidget />
      </div>

      <SectionHeader
        title={t('cards.workforce_knowledge', 'Workforce & Knowledge')}
        subtitle={t('cards.workforce_knowledge_subtitle', 'People operations, learning health, and frontline readiness')}
        icon={Target}
      />

      {/* Workforce & Knowledge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AnnouncementsWidget />
        <TaskWidget />
        {currentProperty?.id && currentProperty?.id !== 'all' ? (
          <DepartmentKPIWidget propertyId={currentProperty?.id} compact />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t('cards.departments_overview_title', 'Departments Overview')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">{t('cards.no_departments_in_property', 'Select a property to view department performance.')}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <SectionHeader
        title={t('cards.insights_compliance', 'Insights & Compliance')}
        subtitle={t('cards.insights_compliance_subtitle', 'Behavioral signals, AI intelligence, and compliance posture')}
        icon={ShieldCheck}
      />

      {/* Insights & Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed maxItems={6} />
        <AIDigestWidget />
      </div>

      <SectionHeader
        title={t('cards.finance_governance', 'Finance & Governance')}
        subtitle={t('cards.finance_governance_subtitle', 'Financial health indicators and portfolio governance readiness')}
        icon={Wallet}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border border-emerald-100">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              {t('cards.revenue_run_rate', 'Revenue Run Rate')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold text-gray-900">—</p>
            <p className="text-xs text-gray-500">{t('cards.revenue_analysis_coming_soon', 'Financial data sync required to view revenue analysis.')}</p>
            <Badge variant="outline" className="text-xs">{t('cards.pending_sync')}</Badge>
          </CardContent>
        </Card>
        <Card className="border border-blue-100">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Banknote className="h-4 w-4 text-blue-600" />
              {t('cards.payroll_exposure', 'Payroll Exposure')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold text-gray-900">—</p>
            <p className="text-xs text-gray-500">{t('cards.budget_tracking_coming_soon', 'Financial data sync required to view budget overview.')}</p>
            <Badge variant="outline" className="text-xs">{t('cards.pending_sync')}</Badge>
          </CardContent>
        </Card>
        <Card className="border border-purple-100">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4 text-purple-600" />
              {t('cards.budget_utilization', 'Budget Utilization')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold text-gray-900">—</p>
            <p className="text-xs text-gray-500">{t('cards.budget_tracking_coming_soon', 'Financial data sync required to view budget overview.')}</p>
            <Badge variant="outline" className="text-xs">{t('cards.pending_sync')}</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {currentProperty?.id && currentProperty?.id !== 'all' ? (
          <KnowledgeComplianceWidget variant="department" propertyId={currentProperty?.id} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t('cards.knowledge_compliance_card', 'Knowledge Compliance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">{t('cards.department_overview_subtitle', 'Select a property to see department-level compliance.')}</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('cards.revenue_analysis', 'Revenue Analysis')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">{t('cards.revenue_analysis_coming_soon', 'Financial data sync required to view revenue analysis.')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="feed">{t('tabs.feed')}</TabsTrigger>
          <TabsTrigger value="properties">{t('tabs.properties')}</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-6">
          {currentUser && (
            <SocialFeed
              user={currentUser as User}
              feedItems={feedItems}
              onReact={onReact}
              onComment={onComment}
              onShare={onShare}
            />
          )}
        </TabsContent>

        <TabsContent value="properties" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableProperties.filter(p => p.id !== 'all').map((property) => (
              <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gray-50 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{property.name}</CardTitle>
                    <Badge variant={property.is_active ? "outline" : "secondary"}>
                      {property.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{property.address || 'No address provided'}</p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">ID: {property.id.substring(0, 8)}...</span>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/properties/${property.id}`)}>View Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {availableProperties.length <= 1 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                <p className="text-muted-foreground italic">No properties found in this view.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <SectionHeader
        title="Governance & Control"
        subtitle="Enterprise controls for departments, operations, audits, and reporting."
        icon={ShieldAlert}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportsControlCenter />
        <AuditsControlCenter />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DepartmentControlCenter propertyId={currentProperty?.id} />
        <OperationsControlCenter />
      </div>
    </div>
  )
}

type SectionHeaderProps = {
  title: string
  subtitle?: string
  icon?: ComponentType<{ className?: string }>
  action?: ReactNode
}

function SectionHeader({ title, subtitle, icon: Icon, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="h-9 w-9 rounded-full bg-hotel-gold/15 flex items-center justify-center">
            <Icon className="h-4 w-4 text-hotel-gold" />
          </span>
        )}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

function buildTrend(base: number, spread: number) {
  const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))
  const steps = [base - spread, base - spread / 2, base - spread / 4, base, base + spread / 6, base - spread / 8]
  return steps.map(clamp)
}

function Sparkline({ data, colorClass }: { data: number[]; colorClass: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 30 - ((value - min) / range) * 26 - 2
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })

  return (
    <svg viewBox="0 0 100 30" className="h-7 w-20">
      <polyline
        points={points.join(' ')}
        className={`${colorClass} fill-none`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
