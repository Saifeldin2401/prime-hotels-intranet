import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed, type FeedItem } from '@/components/social/SocialFeed'
import { Icons } from '@/components/icons'
import type { User } from '@/lib/rbac'
import { useProperty } from '@/contexts/PropertyContext'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { OverdueBadge } from '@/components/escalation/OverdueBadge'
import { KnowledgeComplianceWidget } from '@/components/knowledge/KnowledgeComplianceWidget'
import { useAuth } from '@/hooks/useAuth'
import { useDepartmentHeadStats } from '@/hooks/useDashboardStats'

import { DepartmentTeamList } from '@/components/dashboard/DepartmentTeamList'

export function DepartmentHeadDashboard() {
  const { currentProperty } = useProperty()
  const { user, profile, primaryRole } = useAuth()
  const navigate = useNavigate()
  const { data: announcements = [], isLoading: announcementsLoading } = useAnnouncements({ limit: 5 })
  const { data: stats, isLoading: statsLoading } = useDepartmentHeadStats()

  // Create real user object from auth context
  const currentUser: User = {
    id: user?.id || 'guest',
    name: profile?.full_name || user?.email || 'Department Head',
    email: user?.email || '',
    role: (primaryRole as User['role']) || 'department_head',
    department: 'Department',
    permissions: []
  }

  // Transform announcements to feed items format
  const feedItems: FeedItem[] = announcements.map(announcement => ({
    id: announcement.id,
    type: 'announcement' as const,
    author: {
      id: announcement.created_by || 'system',
      name: announcement.created_by_profile?.full_name || 'System',
      email: '',
      role: 'department_head' as const,
      department: 'Front Desk',
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

  const loading = announcementsLoading || statsLoading

  // Use real stats or defaults
  const teamStats = stats || {
    totalStaff: 0,
    presentToday: 0,
    trainingCompliance: 0,
    pendingApprovals: 0,
    performanceScore: 0,
    departmentIds: []
  }

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
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Department Dashboard</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage your team and department operations</p>
        </div>
        <div className="flex items-center gap-2">
          <OverdueBadge type="tasks" />
          <Badge className="text-xs sm:text-sm bg-green-100 text-green-800">
            {teamStats.totalStaff} Team Members
          </Badge>
        </div>
      </div>

      {/* Department Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        <Card className="role-department-head cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/department/team')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Team Present Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{teamStats.presentToday}/{teamStats.totalStaff}</div>
            <Progress value={teamStats.totalStaff > 0 ? (teamStats.presentToday / teamStats.totalStaff) * 100 : 0} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">Pending attendance integration</p>
          </CardContent>
        </Card>

        <Card className="role-department-head cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/training')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Training Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{teamStats.trainingCompliance}%</div>
            <Progress value={teamStats.trainingCompliance} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">Completion rate</p>
          </CardContent>
        </Card>

        <Card className="role-department-head cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/approvals')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{teamStats.pendingApprovals}</div>
            <p className="text-xs text-gray-600 mt-1">Urgent actions needed</p>
          </CardContent>
        </Card>

        <Card className="role-department-head">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{teamStats.performanceScore}%</div>
            <Progress value={teamStats.performanceScore} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">Task completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-4 h-auto">
            <TabsTrigger value="feed" className="text-xs sm:text-sm whitespace-nowrap">Feed</TabsTrigger>
            <TabsTrigger value="team" className="text-xs sm:text-sm whitespace-nowrap">Team</TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs sm:text-sm whitespace-nowrap">Approvals</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm whitespace-nowrap">Reports</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="feed" className="space-y-6">
          <SocialFeed
            user={currentUser}
            feedItems={feedItems}
            onReact={handleReact}
            onComment={handleComment}
            onShare={handleShare}
          />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          {/* SOP Compliance Widget */}
          <KnowledgeComplianceWidget variant="user" />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.Users className="h-5 w-5" />
                <span>Department Staff</span>
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
                <span>Pending Approvals</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {teamStats.pendingApprovals > 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>You have {teamStats.pendingApprovals} pending approvals. <Button variant="link" onClick={() => navigate('/approvals')}>View All</Button></p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Icons.CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No pending approvals.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.BarChart3 className="h-5 w-5" />
                <span>Department Reports</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Icons.BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No department reports generated.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
