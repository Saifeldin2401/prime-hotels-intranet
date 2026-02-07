import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed } from '@/components/social/SocialFeed'
import { Icons } from '@/components/icons'
import type { User } from '@/lib/rbac'
import { useProperty } from '@/contexts/PropertyContext'
import { useAreaManagerStats } from '@/hooks/useDashboardStats'
import { useUnifiedSocialFeed } from '@/hooks/useUnifiedSocialFeed'

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/shared/EmptyState'
import { useRecentAuditLogs } from '@/hooks/useAuditLogs'
import { format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EnhancedCard } from '@/components/ui/enhanced-card'
import { PageHeader } from '@/components/layout/PageHeader'
import { MotivationWidget } from "@/components/dashboard/MotivationWidget"
import { ActiveUsersWidget } from "@/components/dashboard/ActiveUsersWidget"
import { NewsWidget } from "@/components/dashboard/NewsWidget"
import { EmployeeOfMonthWidget } from "@/components/dashboard/EmployeeOfMonthWidget"
import { BirthdayWidget } from "@/components/dashboard/BirthdayWidget"
import { Building2, ClipboardList, ShieldCheck, Users } from 'lucide-react'
import { OperationsControlCenter } from '@/components/operations/OperationsControlCenter'
import { ReportsControlCenter } from '@/components/reports/ReportsControlCenter'
import { AuditsControlCenter } from '@/components/audits/AuditsControlCenter'

export function AreaManagerDashboard() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const { currentProperty, availableProperties } = useProperty()
  const { currentUser, feedItems, onReact, onComment, onShare } = useUnifiedSocialFeed()
  const { data: stats, isLoading: statsLoading } = useAreaManagerStats(currentProperty?.id)
  const { data: auditLogs = [] } = useRecentAuditLogs(10)

  const loading = statsLoading

  // Use real stats or defaults
  const areaStats = stats || {
    totalProperties: 0,
    maintenanceEfficiency: 0,
    openVacancies: 0,
    staffCompliance: 0,
    openIssues: 0
  }

  const activeProperties = (availableProperties || []).filter(p => p.id !== 'all' && p.is_active)
  const inactiveProperties = (availableProperties || []).filter(p => p.id !== 'all' && !p.is_active)

  const quickActions = [
    {
      title: t('cards.quick_actions.portfolio', 'Portfolio'),
      description: t('cards.quick_actions.portfolio_desc', 'View cross-property teams and KPIs.'),
      icon: Building2,
      onClick: () => navigate('/dashboard/my-team'),
      badge: activeProperties.length
    },
    {
      title: t('cards.quick_actions.approvals', 'Approvals'),
      description: t('cards.quick_actions.approvals_desc', 'Review escalations and requests.'),
      icon: ClipboardList,
      onClick: () => navigate('/approvals'),
      badge: areaStats.openIssues
    },
    {
      title: t('cards.quick_actions.compliance', 'Compliance'),
      description: t('cards.quick_actions.compliance_desc', 'Track training and SOP coverage.'),
      icon: ShieldCheck,
      onClick: () => navigate('/training'),
      badge: `${areaStats.staffCompliance}%`
    },
    {
      title: t('cards.quick_actions.directory', 'Directory'),
      description: t('cards.quick_actions.directory_desc', 'Find leaders across properties.'),
      icon: Users,
      onClick: () => navigate('/directory')
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="loading-skeleton h-32" />
          ))}
        </div>
      </div>
    )
  }


  return (
    <div className="space-y-8">
      <PageHeader
        title={t('cards.area_dashboard_title')}
        description={t('cards.area_dashboard_subtitle', { count: areaStats.totalProperties })}
        actions={
          <>
            <Badge className="bg-gray-100 text-gray-800 border border-gray-600 rounded-md text-sm">
              {t('cards.regional_admin_badge')}
            </Badge>
            <Badge className="text-sm bg-green-100 text-green-800">
              {t('cards.active_properties_badge', { count: areaStats.totalProperties })}
            </Badge>
          </>
        }
      />

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

      <div className="grid gap-4 md:grid-cols-1 mb-6">
        <NewsWidget />
      </div>

      {/* Area KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <EnhancedCard className="role-area-manager" padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('cards.maintenance_efficiency')}</p>
            <p className="text-2xl font-bold text-green-600">{areaStats.maintenanceEfficiency}%</p>
            <Progress value={areaStats.maintenanceEfficiency} className="mt-2" />
            <p className="text-xs text-muted-foreground">{t('cards.maintenance_efficiency_subtitle')}</p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="role-area-manager" padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('cards.recruitment')}</p>
            <p className="text-2xl font-bold text-blue-600">{areaStats.openVacancies}</p>
            <p className="text-xs text-muted-foreground">{t('cards.active_job_postings')}</p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="role-area-manager" padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('cards.training_compliance')}</p>
            <p className="text-2xl font-bold text-purple-600">{areaStats.staffCompliance}%</p>
            <Progress value={areaStats.staffCompliance} className="mt-2" />
            <p className="text-xs text-muted-foreground">{t('cards.completion_rate')}</p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="role-area-manager" padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('cards.open_issues')}</p>
            <p className="text-2xl font-bold text-orange-600">{areaStats.openIssues}</p>
            <p className="text-xs text-muted-foreground">{t('cards.pending_tasks_tickets')}</p>
          </div>
        </EnhancedCard>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('cards.quick_actions_title', 'Quick Actions')}</h2>
          <p className="text-sm text-muted-foreground">{t('cards.quick_actions_subtitle', 'Stay ahead of regional priorities.')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {quickActions.map(action => (
            <EnhancedCard key={action.title} clickable onClick={action.onClick} padding="md" className="group">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{action.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                  <action.icon className="h-4 w-4" />
                </div>
              </div>
              {action.badge !== undefined && (
                <Badge className="mt-3 text-[11px] bg-blue-50 text-blue-700 border border-blue-100">
                  {action.badge}
                </Badge>
              )}
            </EnhancedCard>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <EnhancedCard padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t('cards.active_properties', 'Active Properties')}</p>
              <p className="text-xl font-semibold">{activeProperties.length}</p>
            </div>
            <Badge className="bg-green-100 text-green-800">{t('cards.active_status')}</Badge>
          </div>
        </EnhancedCard>
        <EnhancedCard padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t('cards.inactive_properties', 'Inactive Properties')}</p>
              <p className="text-xl font-semibold">{inactiveProperties.length}</p>
            </div>
            <Badge variant="secondary">{t('cards.inactive_status')}</Badge>
          </div>
        </EnhancedCard>
        <EnhancedCard padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t('cards.portfolio_coverage', 'Portfolio Coverage')}</p>
              <p className="text-xl font-semibold">
                {areaStats.totalProperties ? Math.round((activeProperties.length / areaStats.totalProperties) * 100) : 0}%
              </p>
            </div>
            <Badge className="bg-blue-100 text-blue-800">{t('cards.coverage', 'Coverage')}</Badge>
          </div>
        </EnhancedCard>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-6">
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-7 h-auto">
            <TabsTrigger value="feed">{t('tabs.feed')}</TabsTrigger>
            <TabsTrigger value="properties">{t('tabs.properties')}</TabsTrigger>
            <TabsTrigger value="operations">{t('tabs.operations', 'Operations')}</TabsTrigger>
            <TabsTrigger value="performance">{t('cards.performance')}</TabsTrigger>
            <TabsTrigger value="reports">{t('tabs.reports')}</TabsTrigger>
            <TabsTrigger value="audits">{t('tabs.audits', 'Audits')}</TabsTrigger>
            <TabsTrigger value="budget">{t('cards.budget')}</TabsTrigger>
          </TabsList>
        </div>

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
            {(availableProperties || []).filter(p => p.id !== 'all').map((property) => (
              <Card key={property.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/properties/${property.id}`)}>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center text-blue-700">
                      <Icons.Building className="h-6 w-6" />
                    </div>
                    <Badge variant={property.is_active ? "default" : "secondary"}>
                      {property.is_active ? t('cards.active_status') : t('cards.inactive_status')}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-lg">{property.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Icons.MapPin className="h-4 w-4" />
                      <span>{property.address || t('cards.no_address_set')}</span>
                    </div>
                    <div className="text-xs text-gray-400 pt-2 border-t mt-3 flex justify-between">
                      <span>ID: {property.id.substring(0, 8)}...</span>
                      <span className="text-blue-600 hover:underline">{t('cards.view_details')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <OperationsControlCenter />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnhancedCard padding="lg">
              <h4 className="text-base font-semibold text-foreground mb-2">{t('cards.operations_snapshot', 'Operations Snapshot')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('cards.open_issues')}</span>
                  <Badge className="bg-orange-50 text-orange-700 border border-orange-100">{areaStats.openIssues}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('cards.maintenance_efficiency')}</span>
                  <Badge className="bg-green-50 text-green-700 border border-green-100">{areaStats.maintenanceEfficiency}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('cards.training_compliance')}</span>
                  <Badge className="bg-purple-50 text-purple-700 border border-purple-100">{areaStats.staffCompliance}%</Badge>
                </div>
              </div>
            </EnhancedCard>
            <EnhancedCard padding="lg">
              <h4 className="text-base font-semibold text-foreground mb-2">{t('cards.operations_actions', 'Operations Actions')}</h4>
              <p className="text-sm text-muted-foreground mb-3">{t('cards.operations_actions_subtitle', 'Coordinate cross-property execution.')}</p>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 rounded-md border text-sm hover:bg-accent transition" onClick={() => navigate('/maintenance')}>
                  {t('actions.review_maintenance', 'Review Maintenance')}
                </button>
                <button className="w-full px-3 py-2 rounded-md border text-sm hover:bg-accent transition" onClick={() => navigate('/tasks')}>
                  {t('actions.review_tasks', 'Review Tasks')}
                </button>
                <button className="w-full px-3 py-2 rounded-md border text-sm hover:bg-accent transition" onClick={() => navigate('/approvals')}>
                  {t('actions.review_approvals', 'Review Approvals')}
                </button>
              </div>
            </EnhancedCard>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.BarChart3 className="h-5 w-5" />
                <span>{t('cards.area_performance_metrics')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EmptyState
                icon={Icons.BarChart3}
                title={t('cards.area_performance_metrics')}
                description={t('cards.detailed_performance_coming_soon')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ReportsControlCenter />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.FileText className="h-5 w-5" />
                <span>{t('cards.area_reports_title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {auditLogs.length > 0 ? (
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg border bg-card text-card-foreground">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={log.profile?.avatar_url || undefined} />
                        <AvatarFallback>{log.profile?.full_name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          <span className="text-blue-600">{log.profile?.full_name || t('common:common.system')}</span>
                          {" "}
                          <span className="text-muted-foreground">{log.action}</span>
                          {" "}
                          <span>{log.entity_type}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Icons.FileText}
                  title={t('cards.area_reports_title')}
                  description={t('cards.area_reports_coming_soon')}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits" className="space-y-6">
          <AuditsControlCenter />
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icons.DollarSign className="h-5 w-5" />
                  <span>{t('cards.budget_overview')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <EmptyState
                  icon={Icons.DollarSign}
                  title={t('cards.budget_overview')}
                  description={t('cards.budget_tracking_coming_soon')}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icons.TrendingUp className="h-5 w-5" />
                  <span>{t('cards.revenue_analysis')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <EmptyState
                  icon={Icons.TrendingUp}
                  title={t('cards.revenue_analysis')}
                  description={t('cards.revenue_analysis_coming_soon')}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
