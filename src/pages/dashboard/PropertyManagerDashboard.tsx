import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed, type FeedItem } from '@/components/social/SocialFeed'
import { Icons } from '@/components/icons'
import type { User } from '@/lib/rbac'
import { useProperty } from '@/contexts/PropertyContext'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { OverdueBadge } from '@/components/escalation/OverdueBadge'
import { DepartmentKPIWidget } from '@/components/dashboard/DepartmentKPIWidget'
import { LeaveCoverageCalendar } from '@/components/leave/LeaveCoverageCalendar'
import { KnowledgeComplianceWidget } from '@/components/knowledge/KnowledgeComplianceWidget'
import { useAuth } from '@/hooks/useAuth'
import { usePropertyManagerStats } from '@/hooks/useDashboardStats'
import { useDepartments } from '@/hooks/useDepartments'
import { useAssignedMaintenanceTickets } from '@/hooks/useMaintenanceTickets'
import { useDepartmentKPIs } from '@/hooks/useDepartmentKPIs'
import { Users, Building2, CheckSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AIDigestWidget } from '@/components/dashboard/AIDigestWidget'

export function PropertyManagerDashboard() {
  const { t } = useTranslation('dashboard')
  const { currentProperty } = useProperty()
  const { user, profile, primaryRole } = useAuth()
  const { data: announcements = [], isLoading: announcementsLoading } = useAnnouncements({ limit: 5 })

  // Create real user object from auth context
  const currentUser: User = {
    id: user?.id || 'guest',
    name: profile?.full_name || user?.email || 'Property Manager',
    email: user?.email || '',
    role: (primaryRole as User['role']) || 'property_manager',
    property: currentProperty?.name || '',
    permissions: []
  }

  const navigate = useNavigate()

  const feedItems: FeedItem[] = announcements.map(announcement => ({
    id: announcement.id,
    type: 'announcement' as const,
    author: {
      id: announcement.created_by || 'system',
      name: announcement.created_by_profile?.full_name || 'System',
      email: '',
      role: 'property_manager' as const,
      department: 'Management',
      property: currentProperty?.name || '',
      permissions: []
    },
    title: announcement.title,
    content: announcement.content,
    timestamp: new Date(announcement.created_at),
    tags: announcement.pinned ? ['pinned'] : [],
    priority: (announcement.priority === 'critical' ? 'high' : announcement.priority === 'important' ? 'medium' : 'low') as 'high' | 'medium' | 'low',
    reactions: {},
    comments: []
  }))

  // Use real stats from database
  const { data: propertyStats, isLoading: statsLoading } = usePropertyManagerStats()
  const { departments, isLoading: deptsLoading } = useDepartments()
  const { data: maintenanceTickets = [] } = useAssignedMaintenanceTickets()
  const { data: departmentKPIs } = useDepartmentKPIs(currentProperty?.id)
  const loading = announcementsLoading || statsLoading || deptsLoading

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


  const handleReact = (_itemId: string, _reaction: string) => {
    // Reaction functionality placeholder - to be implemented
  }

  const handleComment = (_itemId: string, _content: string) => {
    // Comment functionality placeholder - to be implemented
  }

  const handleShare = (_itemId: string) => {
    // Share functionality placeholder - to be implemented
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Icons.Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('cards.property_dashboard_title', { name: currentProperty?.name || 'Property' })}</h1>
          <p className="text-gray-600">{t('cards.property_dashboard_subtitle')}</p>
        </div>
        <div className="flex items-center space-x-4">
          <OverdueBadge type="total" />
          <Badge className="text-sm bg-blue-100 text-blue-800">
            {t('cards.active_staff_badge', { count: stats.totalStaff })}
          </Badge>
        </div>
      </div>

      {/* Property KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="role-property-manager cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/directory')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              {t('cards.total_staff')}
              <Users className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalStaff}</div>
            <p className="text-xs text-gray-600 mt-1">{t('cards.active_team_members')}</p>
          </CardContent>
        </Card>

        <Card className="role-property-manager cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/settings')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              {t('tabs.departments')}
              <Building2 className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeDepartments}</div>
            <p className="text-xs text-gray-600 mt-1">{t('cards.operational_departments')}</p>
          </CardContent>
        </Card>

        <Card className="role-property-manager cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/tasks')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              {t('cards.pending_tasks')}
              <CheckSquare className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.pendingTasks}</div>
            <p className="text-xs text-gray-600 mt-1">{t('cards.tasks_requiring_attention')}</p>
          </CardContent>
        </Card>

        <Card className="role-property-manager cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/training')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('cards.staff_compliance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.staffCompliance}%</div>
            <Progress value={stats.staffCompliance} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">{t('cards.training_sop_compliance')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="feed">{t('tabs.feed')}</TabsTrigger>
          <TabsTrigger value="departments">{t('tabs.departments')}</TabsTrigger>
          <TabsTrigger value="operations">{t('tabs.operations')}</TabsTrigger>
          <TabsTrigger value="reports">{t('tabs.reports')}</TabsTrigger>
          <TabsTrigger value="audits">{t('tabs.audits')}</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-6">
          <SocialFeed
            user={currentUser}
            feedItems={feedItems}
            onReact={handleReact}
            onComment={handleComment}
            onShare={handleShare}
          />
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          {/* Real Department KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DepartmentKPIWidget propertyId={currentProperty?.id} />
            <KnowledgeComplianceWidget variant="department" propertyId={currentProperty?.id} />
          </div>

          {/* Leave Coverage Calendar */}
          <LeaveCoverageCalendar />

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
