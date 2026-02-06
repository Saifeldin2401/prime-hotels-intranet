import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed } from '@/components/social/SocialFeed'
import { Icons } from '@/components/icons'
import type { User } from '@/lib/rbac'
import { OverdueBadge } from '@/components/escalation/OverdueBadge'
import { KnowledgeComplianceWidget } from '@/components/knowledge/KnowledgeComplianceWidget'
import { useDepartmentHeadStats } from '@/hooks/useDashboardStats'
import { useUnifiedSocialFeed } from '@/hooks/useUnifiedSocialFeed'

import { DepartmentTeamList } from '@/components/dashboard/DepartmentTeamList'
import { AIDigestWidget } from '@/components/dashboard/AIDigestWidget'
import { EmptyState } from '@/components/shared/EmptyState'
import { useTranslation } from 'react-i18next'
import { EnhancedCard } from '@/components/ui/enhanced-card'
import { PageHeader } from '@/components/layout/PageHeader'
import { ClipboardList, BookOpen, Users, CheckSquare } from 'lucide-react'
import { useRecentAuditLogs } from '@/hooks/useAuditLogs'
import { OperationsControlCenter } from '@/components/operations/OperationsControlCenter'
import { ReportsControlCenter } from '@/components/reports/ReportsControlCenter'
import { AuditsControlCenter } from '@/components/audits/AuditsControlCenter'

export function DepartmentHeadDashboard() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const { currentUser, feedItems, onReact, onComment, onShare } = useUnifiedSocialFeed()
  const { data: stats, isLoading: statsLoading } = useDepartmentHeadStats()
  const { data: auditLogs = [] } = useRecentAuditLogs(5)

  const loading = statsLoading

  // Use real stats or defaults
  const teamStats = stats || {
    totalStaff: 0,
    presentToday: 0,
    trainingCompliance: 0,
    pendingApprovals: 0,
    performanceScore: 0,
    departmentIds: []
  }

  const quickActions = [
    {
      title: t('cards.quick_actions.approvals', 'Approvals'),
      description: t('cards.quick_actions.approvals_desc', 'Review pending requests.'),
      icon: CheckSquare,
      onClick: () => navigate('/approvals'),
      badge: teamStats.pendingApprovals
    },
    {
      title: t('cards.quick_actions.tasks', 'Team Tasks'),
      description: t('cards.quick_actions.tasks_desc', 'Track and delegate work.'),
      icon: ClipboardList,
      onClick: () => navigate('/tasks')
    },
    {
      title: t('cards.quick_actions.training', 'Training'),
      description: t('cards.quick_actions.training_desc', 'Boost compliance scores.'),
      icon: BookOpen,
      onClick: () => navigate('/training'),
      badge: `${teamStats.trainingCompliance}%`
    },
    {
      title: t('cards.quick_actions.team', 'Team'),
      description: t('cards.quick_actions.team_desc', 'View roster and roles.'),
      icon: Users,
      onClick: () => navigate('/dashboard/my-team')
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="loading-skeleton h-24 sm:h-32" />
          ))}
        </div>
      </div>
    )
  }


  return (
    <div className="space-y-8">
      <PageHeader
        title={t('cards.department_dashboard_title')}
        description={t('cards.department_dashboard_subtitle')}
        actions={
          <>
            <OverdueBadge type="tasks" />
            <Badge className="text-xs sm:text-sm bg-green-100 text-green-800">
              {t('cards.team_members_badge', { count: teamStats.totalStaff })}
            </Badge>
          </>
        }
      />

      {/* Department Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        <EnhancedCard className="role-department-head" clickable onClick={() => navigate('/department/team')} padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('cards.team_present_today')}</p>
            <p className="text-2xl font-bold text-green-600">{teamStats.presentToday}/{teamStats.totalStaff}</p>
            <Progress value={teamStats.totalStaff > 0 ? (teamStats.presentToday / teamStats.totalStaff) * 100 : 0} className="mt-2" />
            <p className="text-xs text-muted-foreground">{t('cards.pending_attendance_integration')}</p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="role-department-head" clickable onClick={() => navigate('/training')} padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('cards.training_compliance')}</p>
            <p className="text-2xl font-bold text-blue-600">{teamStats.trainingCompliance}%</p>
            <Progress value={teamStats.trainingCompliance} className="mt-2" />
            <p className="text-xs text-muted-foreground">{t('cards.completion_rate')}</p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="role-department-head" clickable onClick={() => navigate('/approvals')} padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('cards.approvals')}</p>
            <p className="text-2xl font-bold text-orange-600">{teamStats.pendingApprovals}</p>
            <p className="text-xs text-muted-foreground">{t('cards.pending_approvals_subtitle')}</p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="role-department-head" padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('cards.team_performance')}</p>
            <p className="text-2xl font-bold text-purple-600">{teamStats.performanceScore}%</p>
            <Progress value={teamStats.performanceScore} className="mt-2" />
            <p className="text-xs text-muted-foreground">{t('cards.task_completion_rate')}</p>
          </div>
        </EnhancedCard>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('cards.quick_actions_title', 'Quick Actions')}</h2>
          <p className="text-sm text-muted-foreground">{t('cards.quick_actions_subtitle', 'Focus the team on today’s priorities.')}</p>
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-6 h-auto">
            <TabsTrigger value="feed" className="text-xs sm:text-sm whitespace-nowrap">{t('tabs.feed')}</TabsTrigger>
            <TabsTrigger value="team" className="text-xs sm:text-sm whitespace-nowrap">{t('cards.team')}</TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs sm:text-sm whitespace-nowrap">{t('cards.approvals')}</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm whitespace-nowrap">{t('tabs.reports')}</TabsTrigger>
            <TabsTrigger value="operations" className="text-xs sm:text-sm whitespace-nowrap">{t('tabs.operations', 'Operations')}</TabsTrigger>
            <TabsTrigger value="audits" className="text-xs sm:text-sm whitespace-nowrap">{t('tabs.audits', 'Audits')}</TabsTrigger>
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

        <TabsContent value="team" className="space-y-6">
          {/* SOP Compliance Widget */}
          <KnowledgeComplianceWidget variant="user" />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.Users className="h-5 w-5" />
                <span>{t('cards.department_staff')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DepartmentTeamList departmentIds={teamStats.departmentIds} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.CheckCircle className="h-5 w-5" />
                <span>{t('cards.approvals')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {teamStats.pendingApprovals > 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>{t('cards.pending_approvals_message', { count: teamStats.pendingApprovals })} <Button variant="link" onClick={() => navigate('/approvals')}>{t('actions.view_all')}</Button></p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Icons.CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>{t('cards.no_pending_approvals')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* AI Manager Insights */}
          <AIDigestWidget />

          <ReportsControlCenter />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.BarChart3 className="h-5 w-5" />
                <span>{t('cards.department_reports_title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EmptyState
                icon={Icons.BarChart3}
                title={t('cards.department_reports_title')}
                description={t('cards.no_department_reports')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <OperationsControlCenter />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnhancedCard padding="lg">
              <h4 className="text-base font-semibold text-foreground mb-2">{t('cards.operations_snapshot', 'Operations Snapshot')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('cards.pending_approvals', 'Pending Approvals')}</span>
                  <Badge className="bg-blue-50 text-blue-700 border border-blue-100">{teamStats.pendingApprovals}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('cards.training_compliance')}</span>
                  <Badge className="bg-green-50 text-green-700 border border-green-100">{teamStats.trainingCompliance}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('cards.team_performance')}</span>
                  <Badge className="bg-purple-50 text-purple-700 border border-purple-100">{teamStats.performanceScore}%</Badge>
                </div>
              </div>
            </EnhancedCard>
            <EnhancedCard padding="lg">
              <h4 className="text-base font-semibold text-foreground mb-2">{t('cards.operations_actions', 'Operations Actions')}</h4>
              <p className="text-sm text-muted-foreground mb-3">{t('cards.operations_actions_subtitle', 'Quick access to daily operations tools.')}</p>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 rounded-md border text-sm hover:bg-accent transition" onClick={() => navigate('/tasks')}>
                  {t('actions.review_tasks', 'Review Tasks')}
                </button>
                <button className="w-full px-3 py-2 rounded-md border text-sm hover:bg-accent transition" onClick={() => navigate('/approvals')}>
                  {t('actions.review_approvals', 'Review Approvals')}
                </button>
                <button className="w-full px-3 py-2 rounded-md border text-sm hover:bg-accent transition" onClick={() => navigate('/training')}>
                  {t('actions.view_training', 'View Training')}
                </button>
              </div>
            </EnhancedCard>
          </div>
        </TabsContent>

        <TabsContent value="audits" className="space-y-6">
          <AuditsControlCenter />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnhancedCard padding="lg">
              <h4 className="text-base font-semibold text-foreground mb-2">{t('cards.audit_readiness', 'Audit Readiness')}</h4>
              <p className="text-sm text-muted-foreground mb-4">{t('cards.audit_readiness_subtitle', 'Track SOP and compliance coverage.')}</p>
              <KnowledgeComplianceWidget variant="user" />
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
                    <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
