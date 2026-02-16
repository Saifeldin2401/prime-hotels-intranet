import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed } from '@/components/social/SocialFeed'
import { Icons } from '@/components/icons'
import type { User } from '@/lib/rbac'
import { useProperty } from '@/contexts/PropertyContext'
import { OverdueBadge } from '@/components/escalation/OverdueBadge'
import { DepartmentKPIWidget } from '@/components/dashboard/DepartmentKPIWidget'
import { LeaveCoverageCalendar } from '@/components/leave/LeaveCoverageCalendar'
import { KnowledgeComplianceWidget } from '@/components/knowledge/KnowledgeComplianceWidget'
import { usePropertyManagerStats } from '@/hooks/useDashboardStats'
import { useUnifiedSocialFeed } from '@/hooks/useUnifiedSocialFeed'
import { useDepartments } from '@/hooks/useDepartments'
import { useAssignedMaintenanceTickets } from '@/hooks/useMaintenanceTickets'
import { useDepartmentKPIs } from '@/hooks/useDepartmentKPIs'
import { useRecentAuditLogs } from '@/hooks/useAuditLogs'
import { EnhancedCard } from '@/components/ui/enhanced-card'
import { PageHeader } from '@/components/layout/PageHeader'
import { MotivationWidget } from "@/components/dashboard/MotivationWidget"
import { ActiveUsersWidget } from "@/components/dashboard/ActiveUsersWidget"
import { NewsWidget } from "@/components/dashboard/NewsWidget"
import { EmployeeOfMonthWidget } from "@/components/dashboard/EmployeeOfMonthWidget"
import { BirthdayWidget } from "@/components/dashboard/BirthdayWidget"
import { Users, Building2, CheckSquare, Wrench, BookOpen, ClipboardList, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AIDigestWidget } from '@/components/dashboard/AIDigestWidget'
import { DepartmentControlCenter } from '@/components/departments/DepartmentControlCenter'
import { OperationsControlCenter } from '@/components/operations/OperationsControlCenter'
import { ReportsControlCenter } from '@/components/reports/ReportsControlCenter'
import { AuditsControlCenter } from '@/components/audits/AuditsControlCenter'
import { CollapsibleSection } from '@/components/ui/collapsible-section'

export function PropertyManagerDashboard() {
  const { t } = useTranslation('dashboard')
  const { currentProperty } = useProperty()
  const { currentUser, feedItems, onReact, onComment, onShare } = useUnifiedSocialFeed()

  const navigate = useNavigate()

  // Use real stats from database
  const { data: propertyStats, isLoading: statsLoading } = usePropertyManagerStats()
  const { departments, isLoading: deptsLoading } = useDepartments(currentProperty?.id)
  const { data: maintenanceTickets = [] } = useAssignedMaintenanceTickets()
  const { data: departmentKPIs } = useDepartmentKPIs(currentProperty?.id)
  const { data: auditLogs = [] } = useRecentAuditLogs(6)
  const loading = statsLoading || deptsLoading

  // Default stats while loading
  // Default stats while loading
  const stats = propertyStats || {
    totalStaff: 0,
    pendingTasks: 0,
    activeDepartments: 0,
    staffCompliance: 0,
    maintenanceIssues: 0,
    trainingCompletion: 0
  }

  // Build department details from real data
  const departmentDetails = departments.map(dept => {
    const kpi = departmentKPIs?.find(k => k.department_id === dept.id)
    return {
      id: dept.id,
      name: dept.name,
      head: kpi?.head_name || 'Not assigned',
      staff: kpi?.staff_count || 0,
      performance: kpi?.overall_score ? (kpi.overall_score / 20).toFixed(1) : 'N/A',
      compliance: kpi?.metrics?.sop_compliance_rate || 0,
      attendance: kpi?.metrics?.attendance_rate || 0
    }
  })

  const lowComplianceDepartments = [...departmentDetails]
    .sort((a, b) => (a.compliance || 0) - (b.compliance || 0))
    .slice(0, 3)

  const quickActions = [
    {
      title: t('cards.quick_actions.tasks', 'Tasks & Approvals'),
      description: t('cards.quick_actions.tasks_desc', 'Track and assign high priority work.'),
      icon: CheckSquare,
      onClick: () => navigate('/tasks'),
      badge: stats.pendingTasks
    },
    {
      title: t('cards.quick_actions.maintenance', 'Maintenance'),
      description: t('cards.quick_actions.maintenance_desc', 'Resolve urgent facility issues.'),
      icon: Wrench,
      onClick: () => navigate('/maintenance'),
      badge: stats.maintenanceIssues
    },
    {
      title: t('cards.quick_actions.training', 'Training'),
      description: t('cards.quick_actions.training_desc', 'Lift compliance and completion.'),
      icon: BookOpen,
      onClick: () => navigate('/training/hub'),
      badge: stats.trainingCompletion ? `${stats.trainingCompletion}%` : undefined
    },
    {
      title: t('cards.quick_actions.team', 'Team & Departments'),
      description: t('cards.quick_actions.team_desc', 'Manage staffing and department KPIs.'),
      icon: Building2,
      onClick: () => navigate('/dashboard/my-team')
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
      <PageHeader
        title={t('cards.property_dashboard_title', { name: currentProperty?.name || 'Property' })}
        description={t('cards.property_dashboard_subtitle')}
        actions={
          <>
            <OverdueBadge type="total" />
            <Badge className="text-sm bg-blue-100 text-blue-800">
              {t('cards.active_staff_badge', { count: stats.totalStaff })}
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

      {/* Property KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <EnhancedCard clickable onClick={() => navigate('/directory')} className="role-property-manager" padding="lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('cards.total_staff')}</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalStaff}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('cards.active_team_members')}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </EnhancedCard>

        <EnhancedCard clickable onClick={() => navigate('/dashboard/my-team')} className="role-property-manager" padding="lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('tabs.departments')}</p>
              <p className="text-2xl font-bold text-blue-700">{stats.activeDepartments}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('cards.operational_departments')}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
        </EnhancedCard>

        <EnhancedCard clickable onClick={() => navigate('/tasks')} className="role-property-manager" padding="lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('cards.pending_tasks')}</p>
              <p className="text-2xl font-bold text-purple-700">{stats.pendingTasks}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('cards.tasks_requiring_attention')}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
        </EnhancedCard>

        <EnhancedCard clickable onClick={() => navigate('/training/hub')} className="role-property-manager" padding="lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('cards.staff_compliance')}</p>
              <p className="text-2xl font-bold text-orange-600">{stats.staffCompliance}%</p>
              <Progress value={stats.staffCompliance} className="mt-2" />
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Target className="h-5 w-5" />
            </div>
          </div>
        </EnhancedCard>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('cards.quick_actions_title', 'Quick Actions')}</h2>
          <p className="text-sm text-muted-foreground">{t('cards.quick_actions_subtitle', 'Move fast on today’s operational priorities.')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {quickActions.map((action) => (
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-6">
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-5 h-auto">
            <TabsTrigger value="feed">{t('tabs.feed')}</TabsTrigger>
            <TabsTrigger value="departments">{t('tabs.departments')}</TabsTrigger>
            <TabsTrigger value="operations">{t('tabs.operations')}</TabsTrigger>
            <TabsTrigger value="reports">{t('tabs.reports')}</TabsTrigger>
            <TabsTrigger value="audits">{t('tabs.audits')}</TabsTrigger>
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

        <TabsContent value="departments" className="space-y-6">
          <CollapsibleSection
            title={t('cards.department_performance', 'Department Performance')}
            description={t('cards.department_performance_subtitle', 'KPIs, compliance, and staffing coverage.')}
            defaultOpen={true}
          >
            {/* Real Department KPIs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <DepartmentKPIWidget propertyId={currentProperty?.id} />
              <KnowledgeComplianceWidget variant="department" propertyId={currentProperty?.id} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <EnhancedCard padding="lg" className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">{t('cards.department_focus', 'Department Focus')}</h4>
                    <p className="text-sm text-muted-foreground">{t('cards.department_focus_subtitle', 'Lowest compliance areas requiring attention.')}</p>
                  </div>
                  <Badge className="bg-blue-50 text-blue-700 border border-blue-100">
                    {t('cards.action_needed', 'Action needed')}
                  </Badge>
                </div>
                {lowComplianceDepartments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t('cards.no_departments_found')}</p>
                ) : (
                  <div className="space-y-3">
                    {lowComplianceDepartments.map(dept => (
                      <div key={dept.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">{dept.name}</p>
                          <p className="text-xs text-muted-foreground">{t('cards.head_label', { name: dept.head })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{dept.compliance}%</p>
                          <p className="text-xs text-muted-foreground">{t('cards.compliance_label', { score: dept.compliance })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </EnhancedCard>
              <EnhancedCard padding="lg">
                <div className="space-y-3">
                  <h4 className="text-base font-semibold text-foreground">{t('cards.department_controls', 'Department Controls')}</h4>
                  <p className="text-sm text-muted-foreground">{t('cards.department_controls_subtitle', 'Manage team structure and training goals.')}</p>
                  <div className="space-y-2">
                    <button className="w-full px-3 py-2 rounded-md border text-sm hover:bg-accent transition" onClick={() => navigate('/dashboard/my-team')}>
                      {t('actions.manage_teams', 'Manage Teams')}
                    </button>
                    <button className="w-full px-3 py-2 rounded-md border text-sm hover:bg-accent transition" onClick={() => navigate('/training/paths')}>
                      {t('actions.manage_training_paths', 'Training Paths')}
                    </button>
                    <button className="w-full px-3 py-2 rounded-md border text-sm hover:bg-accent transition" onClick={() => navigate('/knowledge')}>
                      {t('actions.review_sops', 'Review SOPs')}
                    </button>
                  </div>
                </div>
              </EnhancedCard>
            </div>

            <DepartmentControlCenter propertyId={currentProperty?.id} />

            {/* Leave Coverage Calendar */}
            <div className="mt-6">
              <LeaveCoverageCalendar />
            </div>
          </CollapsibleSection>

          {/* Department Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.Building className="h-5 w-5" />
                <span>{t('cards.department_details')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {departmentDetails.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">{t('cards.no_departments_found')}</p>
              ) : departmentDetails.map((dept, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(`/departments/${dept.id}`)}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{dept.name}</p>
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        {t('cards.active_staff_badge', { count: dept.staff })}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{t('cards.head_label', { name: dept.head })}</p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span>{t('cards.performance_label', { score: dept.performance })}</span>
                      <span>{t('cards.compliance_label', { score: dept.compliance })}</span>
                    </div>
                  </div>
                  <button className="ml-4 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700" onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/departments/${dept.id}`)
                  }}>
                    {t('cards.view_details')}
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <OperationsControlCenter />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <EnhancedCard padding="lg">
              <h4 className="text-base font-semibold text-foreground mb-2">{t('cards.operations_overview', 'Operations Overview')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('cards.pending_tasks')}</span>
                  <Badge className="bg-blue-50 text-blue-700 border border-blue-100">{stats.pendingTasks}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('cards.maintenance_issues', 'Maintenance Issues')}</span>
                  <Badge className="bg-orange-50 text-orange-700 border border-orange-100">{stats.maintenanceIssues}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('cards.training_completion', 'Training Completion')}</span>
                  <Badge className="bg-green-50 text-green-700 border border-green-100">
                    {stats.trainingCompletion ? `${stats.trainingCompletion}%` : '0%'}
                  </Badge>
                </div>
              </div>
            </EnhancedCard>
            <EnhancedCard padding="lg" className="lg:col-span-2">
              <h4 className="text-base font-semibold text-foreground mb-2">{t('cards.operations_playbook', 'Operations Playbook')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button className="w-full px-3 py-2 rounded-md border text-sm hover:bg-accent transition" onClick={() => navigate('/maintenance')}>
                  {t('actions.review_maintenance', 'Review Maintenance')}
                </button>
                <button className="w-full px-3 py-2 rounded-md border text-sm hover:bg-accent transition" onClick={() => navigate('/tasks')}>
                  {t('actions.review_tasks', 'Review Tasks')}
                </button>
                <button className="w-full px-3 py-2 rounded-md border text-sm hover:bg-accent transition" onClick={() => navigate('/approvals')}>
                  {t('actions.view_approvals', 'View Approvals')}
                </button>
                <button className="w-full px-3 py-2 rounded-md border text-sm hover:bg-accent transition" onClick={() => navigate('/reports')}>
                  {t('actions.view_reports', 'View Reports')}
                </button>
              </div>
            </EnhancedCard>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icons.AlertTriangle className="h-5 w-5" />
                  <span>Maintenance Issues</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {maintenanceTickets.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No maintenance tickets</p>
                ) : maintenanceTickets.slice(0, 5).map((ticket, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/maintenance/tickets/${ticket.id}`)}>
                    <div>
                      <p className="text-sm font-medium">{ticket.title}</p>
                      <p className="text-xs text-gray-600">
                        {ticket.room_number ? `Room ${ticket.room_number}` : 'Common Area'} • {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={
                      ticket.priority === 'high'
                        ? 'bg-red-100 text-red-800'
                        : ticket.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                    }>
                      {ticket.priority}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icons.Users className="h-5 w-5" />
                  <span>Staff Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {departmentDetails.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No staff data available</p>
                ) : departmentDetails.map((dept, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">{dept.name}</p>
                      <p className="text-xs text-gray-600">{dept.staff} total staff</p>
                    </div>
                    {/* Real attendance data from shifts */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Attendance</span>
                      <Progress value={dept.attendance || 0} className="w-16" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* AI Manager Insights */}
          <AIDigestWidget />

          <ReportsControlCenter />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnhancedCard padding="lg">
              <h4 className="text-base font-semibold text-foreground mb-2">{t('cards.report_builder', 'Report Builder')}</h4>
              <p className="text-sm text-muted-foreground mb-4">{t('cards.report_builder_subtitle', 'Create and export operational summaries.')}</p>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 rounded-md border text-sm hover:bg-accent transition" onClick={() => navigate('/reports')}>
                  {t('actions.open_reports_center', 'Open Reports Center')}
                </button>
                <button className="w-full px-3 py-2 rounded-md border text-sm hover:bg-accent transition" onClick={() => navigate('/dashboard')}>
                  {t('actions.view_analytics', 'View Analytics')}
                </button>
              </div>
            </EnhancedCard>
            <EnhancedCard padding="lg">
              <h4 className="text-base font-semibold text-foreground mb-2">{t('cards.scheduled_reports', 'Scheduled Reports')}</h4>
              <p className="text-sm text-muted-foreground mb-4">{t('cards.scheduled_reports_subtitle', 'Automated updates for stakeholders.')}</p>
              <div className="text-sm text-muted-foreground text-center py-6">
                {t('cards.no_scheduled_reports', 'No scheduled reports yet.')}
              </div>
            </EnhancedCard>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.FileText className="h-5 w-5" />
                <span>Management Reports</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Icons.FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No reports generated for this period.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits" className="space-y-6">
          <AuditsControlCenter />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnhancedCard padding="lg">
              <h4 className="text-base font-semibold text-foreground mb-2">{t('cards.audit_readiness', 'Audit Readiness')}</h4>
              <p className="text-sm text-muted-foreground mb-4">{t('cards.audit_readiness_subtitle', 'Monitor SOP and compliance readiness.')}</p>
              <KnowledgeComplianceWidget variant="department" propertyId={currentProperty?.id} />
            </EnhancedCard>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icons.Shield className="h-5 w-5" />
                  <span>{t('cards.audit_activity', 'Audit Activity')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    {t('cards.no_audit_logs', 'No audit logs available.')}
                  </div>
                ) : auditLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between text-sm p-2 border rounded-lg">
                    <div>
                      <p className="font-medium">{log.profile?.full_name || t('common:common.system')}</p>
                      <p className="text-xs text-muted-foreground">{log.action} - {log.entity_type}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.Shield className="h-5 w-5" />
                <span>Compliance & Audits</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Icons.Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No upcoming audits scheduled.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
