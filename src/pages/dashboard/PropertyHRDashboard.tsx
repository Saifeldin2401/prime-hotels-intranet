import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed } from '@/components/social/SocialFeed'
import { Icons } from '@/components/icons'
import type { User } from '@/lib/rbac'
import { useTeamLeaveRequests, useApproveLeaveRequest, useRejectLeaveRequest } from '@/hooks/useLeaveRequests'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Users, ClipboardCheck, Briefcase, ShieldCheck } from 'lucide-react'
import { useProperty } from '@/contexts/PropertyContext'
import { useHRStats } from '@/hooks/useDashboardStats'
import { useUnifiedSocialFeed } from '@/hooks/useUnifiedSocialFeed'
import JobPostings from '@/pages/jobs/JobPostings'
import { KnowledgeComplianceWidget } from '@/components/knowledge/KnowledgeComplianceWidget'
import { useProfiles } from '@/hooks/useUsers'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EnhancedCard } from '@/components/ui/enhanced-card'
import { PageHeader } from '@/components/layout/PageHeader'
import { MotivationWidget } from "@/components/dashboard/MotivationWidget"
import { ActiveUsersWidget } from "@/components/dashboard/ActiveUsersWidget"
import { NewsWidget } from "@/components/dashboard/NewsWidget"
import { EmployeeOfMonthWidget } from "@/components/dashboard/EmployeeOfMonthWidget"
import { BirthdayWidget } from "@/components/dashboard/BirthdayWidget"
import { DepartmentControlCenter } from '@/components/departments/DepartmentControlCenter'
import { ReportsControlCenter } from '@/components/reports/ReportsControlCenter'
import { AuditsControlCenter } from '@/components/audits/AuditsControlCenter'

export function PropertyHRDashboard() {
  const { t } = useTranslation('dashboard')
  const { currentProperty } = useProperty()
  const { currentUser, feedItems, onReact, onComment, onShare } = useUnifiedSocialFeed()
  const { data: hrStatsData, isLoading: statsLoading } = useHRStats(currentProperty?.id)
  const { data: staffMembers = [], isLoading: staffLoading } = useProfiles({ property_id: currentProperty?.id })
  const [staffSearchTerm, setStaffSearchTerm] = useState('')
  const navigate = useNavigate()

  const loading = statsLoading

  // Use real stats or defaults
  const hrStats = hrStatsData || {
    totalStaff: 0,
    presentToday: 0,
    pendingLeaveRequests: 0,
    newHiresThisMonth: 0,
    trainingCompliance: 0,
    openPositions: 0
  }

  const { data: leaveRequests, isLoading: leaveLoading } = useTeamLeaveRequests()
  const approveMutation = useApproveLeaveRequest()
  const rejectMutation = useRejectLeaveRequest()

  const quickActions = [
    {
      title: t('cards.quick_actions.leave', 'Leave Requests'),
      description: t('cards.quick_actions.leave_desc', 'Review and approve time off.'),
      icon: ClipboardCheck,
      onClick: () => navigate('/hr/leave'),
      badge: hrStats.pendingLeaveRequests
    },
    {
      title: t('cards.quick_actions.staff', 'Staff Directory'),
      description: t('cards.quick_actions.staff_desc', 'Manage profiles and assignments.'),
      icon: Users,
      onClick: () => navigate('/directory')
    },
    {
      title: t('cards.quick_actions.recruitment', 'Recruitment'),
      description: t('cards.quick_actions.recruitment_desc', 'Open roles and hiring pipeline.'),
      icon: Briefcase,
      onClick: () => navigate('/jobs'),
      badge: hrStats.openPositions
    },
    {
      title: t('cards.quick_actions.compliance', 'Compliance'),
      description: t('cards.quick_actions.compliance_desc', 'Track training and SOP coverage.'),
      icon: ShieldCheck,
      onClick: () => navigate('/training/hub'),
      badge: `${hrStats.trainingCompliance}%`
    }
  ]

  const staffSpotlight = staffMembers.slice(0, 3)
  const pendingLeave = (leaveRequests || []).filter(r => r.status === 'pending').slice(0, 3)

  const handleApprove = (requestId: string) => {
    approveMutation.mutate({ requestId })
  }

  const handleReject = (requestId: string) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (reason && reason.trim()) {
      rejectMutation.mutate({ requestId, reason })
    }
  }

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
        title={t('cards.hr_dashboard_title')}
        description={t('cards.hr_dashboard_subtitle')}
        actions={
          <Badge className="text-xs sm:text-sm bg-blue-100 text-blue-800">
            {t('cards.active_staff_badge', { count: hrStats.totalStaff })}
          </Badge>
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

      {/* HR Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        <EnhancedCard className="role-property-hr" padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('cards.staff_attendance')}</p>
            <p className="text-2xl font-bold text-green-600">{hrStats.presentToday}/{hrStats.totalStaff}</p>
            <Progress value={hrStats.totalStaff > 0 ? (hrStats.presentToday / hrStats.totalStaff) * 100 : 0} className="mt-2" />
            <p className="text-xs text-muted-foreground">{t('cards.daily_attendance')}</p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="role-property-hr" padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('cards.leave_requests')}</p>
            <p className="text-2xl font-bold text-orange-600">{hrStats.pendingLeaveRequests}</p>
            <p className="text-xs text-muted-foreground">{t('cards.pending_approval')}</p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="role-property-hr" padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('cards.training_compliance')}</p>
            <p className="text-2xl font-bold text-blue-600">{hrStats.trainingCompliance}%</p>
            <Progress value={hrStats.trainingCompliance} className="mt-2" />
            <p className="text-xs text-muted-foreground">{t('cards.completion_rate')}</p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="role-property-hr" padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('cards.open_positions')}</p>
            <p className="text-2xl font-bold text-purple-600">{hrStats.openPositions}</p>
            <p className="text-xs text-muted-foreground">{t('cards.hired_this_month', { count: hrStats.newHiresThisMonth })}</p>
          </div>
        </EnhancedCard>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('cards.quick_actions_title', 'Quick Actions')}</h2>
          <p className="text-sm text-muted-foreground">{t('cards.quick_actions_subtitle', 'Keep HR workflows moving fast.')}</p>
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

      {/* People Pulse */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Icons.Users className="h-5 w-5" />
              <span>{t('cards.staff_spotlight', 'Staff Spotlight')}</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/directory')}>
              {t('actions.view_all', 'View all')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {staffSpotlight.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {t('cards.no_staff_found', 'No staff found yet.')}
              </div>
            ) : staffSpotlight.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.avatar_url || ''} />
                    <AvatarFallback>{member.full_name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{member.job_title || t('cards.job_title_missing', 'No job title')}</p>
                  </div>
                </div>
                <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                  {member.status || t('cards.status_unknown', 'Unknown')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Icons.Calendar className="h-5 w-5" />
              <span>{t('cards.leave_queue', 'Leave Queue')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingLeave.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {t('cards.no_pending_leave', 'No pending leave requests.')}
              </div>
            ) : pendingLeave.map(request => (
              <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">{request.requester?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(request.start_date), 'MMM dd')} - {format(new Date(request.end_date), 'MMM dd')}
                  </p>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                  {t('cards.pending', 'Pending')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-7 h-auto">
            <TabsTrigger value="feed" className="text-xs sm:text-sm whitespace-nowrap">{t('tabs.feed')}</TabsTrigger>
            <TabsTrigger value="leave" className="text-xs sm:text-sm whitespace-nowrap">{t('cards.leave', 'Leave')}</TabsTrigger>
            <TabsTrigger value="staff" className="text-xs sm:text-sm whitespace-nowrap">{t('cards.staff', 'Staff')}</TabsTrigger>
            <TabsTrigger value="recruitment" className="text-xs sm:text-sm whitespace-nowrap">{t('cards.recruitment')}</TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs sm:text-sm whitespace-nowrap">{t('tabs.compliance')}</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm whitespace-nowrap">{t('tabs.reports')}</TabsTrigger>
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

        <TabsContent value="leave" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.Calendar className="h-5 w-5" />
                <span>{t('cards.leave_management')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {leaveLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-gray-600">{t('cards.loading_leave_requests')}</p>
                </div>
              ) : !leaveRequests || leaveRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Icons.Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('cards.no_leave_requests')}</h3>
                  <p className="text-gray-600">
                    {t('cards.no_leave_requests_desc')}
                  </p>
                </div>
              ) : (
                leaveRequests.map((request) => (
                  <div key={request.id} className="flex flex-col sm:flex-row sm:items-start justify-between p-3 border rounded-lg gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h4 className="font-medium text-sm sm:text-base">{request.requester?.full_name}</h4>
                        <Badge className={
                          request.status === 'approved'
                            ? 'bg-green-100 text-green-800 text-xs'
                            : request.status === 'rejected'
                              ? 'bg-red-100 text-red-800 text-xs'
                              : request.status === 'cancelled'
                                ? 'bg-gray-100 text-gray-800 text-xs'
                                : 'bg-yellow-100 text-yellow-800 text-xs'
                        }>
                          {request.status}
                        </Badge>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                        <div className="capitalize">
                          {request.type.replace('_', ' ')} • {format(new Date(request.start_date), 'MMM dd')} - {format(new Date(request.end_date), 'MMM dd, yyyy')}
                        </div>
                        {request.reason && (
                          <div className="truncate">{t('cards.reason_label', { reason: request.reason })}</div>
                        )}
                        <div>{t('cards.department_label', { name: request.department?.name || 'Not assigned' })}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {request.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            className="px-2.5 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 min-h-touch sm:min-h-0"
                            onClick={() => handleApprove(request.id)}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            Approve
                          </button>
                          <button
                            className="px-2.5 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 min-h-touch sm:min-h-0"
                            onClick={() => handleReject(request.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="w-3 h-3 inline mr-1" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Icons.Users className="h-5 w-5" />
                <span>Staff Directory</span>
              </CardTitle>
              <div className="w-1/3">
                <Input
                  placeholder="Search staff..."
                  value={staffSearchTerm}
                  onChange={(e) => setStaffSearchTerm(e.target.value)}
                  className="h-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              {staffLoading ? (
                <div className="text-center py-8 text-gray-500">Loading staff...</div>
              ) : staffMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Icons.Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No staff members found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {staffMembers
                    .filter(m =>
                      m.full_name?.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
                      m.email?.toLowerCase().includes(staffSearchTerm.toLowerCase())
                    )
                    .map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={member.avatar_url || ''} />
                            <AvatarFallback>{member.full_name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">{member.full_name}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>{member.job_title || 'No Job Title'}</span>
                              <span>•</span>
                              <span>{member.departments?.[0]?.name || 'No Dept'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                            {member.status || 'Unknown'}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/profile/${member.id}`)}>
                            View Profile
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          <DepartmentControlCenter propertyId={currentProperty?.id} />
        </TabsContent>

        <TabsContent value="recruitment" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <JobPostings embedded />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <KnowledgeComplianceWidget propertyId={currentProperty?.id} variant="department" />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ReportsControlCenter />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnhancedCard padding="lg">
              <h4 className="text-base font-semibold text-foreground mb-2">{t('cards.hr_reports', 'HR Reports')}</h4>
              <p className="text-sm text-muted-foreground mb-4">{t('cards.hr_reports_subtitle', 'Generate workforce, leave, and compliance reports.')}</p>
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
              <h4 className="text-base font-semibold text-foreground mb-2">{t('cards.people_insights', 'People Insights')}</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('cards.present_today', 'Present Today')}</span>
                  <Badge className="bg-green-50 text-green-700 border border-green-100">{hrStats.presentToday}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('cards.pending_leave', 'Pending Leave')}</span>
                  <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-100">{hrStats.pendingLeaveRequests}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('cards.open_positions')}</span>
                  <Badge className="bg-blue-50 text-blue-700 border border-blue-100">{hrStats.openPositions}</Badge>
                </div>
              </div>
            </EnhancedCard>
          </div>
        </TabsContent>

        <TabsContent value="audits" className="space-y-6">
          <AuditsControlCenter />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnhancedCard padding="lg">
              <h4 className="text-base font-semibold text-foreground mb-2">{t('cards.audit_readiness', 'Audit Readiness')}</h4>
              <p className="text-sm text-muted-foreground mb-4">{t('cards.audit_readiness_subtitle', 'Verify HR compliance and policy coverage.')}</p>
              <KnowledgeComplianceWidget propertyId={currentProperty?.id} variant="department" />
            </EnhancedCard>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icons.Shield className="h-5 w-5" />
                  <span>{t('cards.audit_checklist', 'Audit Checklist')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between border rounded-md p-2">
                  <span>{t('cards.policy_acknowledgments', 'Policy acknowledgments')}</span>
                  <Badge variant="secondary">{t('cards.in_review', 'In review')}</Badge>
                </div>
                <div className="flex items-center justify-between border rounded-md p-2">
                  <span>{t('cards.training_records', 'Training records')}</span>
                  <Badge variant="secondary">{t('cards.in_review', 'In review')}</Badge>
                </div>
                <div className="flex items-center justify-between border rounded-md p-2">
                  <span>{t('cards.leave_approvals', 'Leave approvals')}</span>
                  <Badge variant="secondary">{t('cards.in_review', 'In review')}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
