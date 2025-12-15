import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed, type FeedItem } from '@/components/social/SocialFeed'
import { Icons } from '@/components/icons'
import type { User } from '@/lib/rbac'
import { useTeamLeaveRequests, useApproveLeaveRequest, useRejectLeaveRequest } from '@/hooks/useLeaveRequests'
import { format } from 'date-fns'
import { CheckCircle, XCircle } from 'lucide-react'
import { useProperty } from '@/contexts/PropertyContext'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { useAuth } from '@/hooks/useAuth'
import { useHRStats } from '@/hooks/useDashboardStats'
import JobPostings from '@/pages/jobs/JobPostings'
import { KnowledgeComplianceWidget } from '@/components/knowledge/KnowledgeComplianceWidget'
import { useProfiles } from '@/hooks/useUsers'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export function PropertyHRDashboard() {
  const { currentProperty } = useProperty()
  const { user, profile, primaryRole } = useAuth()
  const { data: announcements = [], isLoading: announcementsLoading } = useAnnouncements({ limit: 5 })
  const { data: hrStatsData, isLoading: statsLoading } = useHRStats(currentProperty?.id)
  const { data: staffMembers = [], isLoading: staffLoading } = useProfiles({ property_id: currentProperty?.id })
  const [staffSearchTerm, setStaffSearchTerm] = useState('')
  const navigate = useNavigate()

  // Create real user object from auth context
  const currentUser: User = {
    id: user?.id || 'guest',
    name: profile?.full_name || user?.email || 'Property HR',
    email: user?.email || '',
    role: (primaryRole as User['role']) || 'property_hr',
    property: currentProperty?.name || '',
    permissions: []
  }

  // Transform announcements to feed items format
  const feedItems: FeedItem[] = announcements.map(announcement => ({
    id: announcement.id,
    type: 'announcement' as const,
    author: {
      id: announcement.created_by || 'system',
      name: announcement.created_by_profile?.full_name || 'HR System',
      email: '',
      role: 'property_hr' as const,
      department: 'Human Resources',
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

  const handleApprove = (requestId: string) => {
    approveMutation.mutate({ requestId })
  }

  const handleReject = (requestId: string) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (reason && reason.trim()) {
      rejectMutation.mutate({ requestId, reason })
    }
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">HR Dashboard</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage human resources and staff operations</p>
        </div>
        <div className="flex items-center">
          <Badge className="text-xs sm:text-sm bg-blue-100 text-blue-800">
            {hrStats.totalStaff} Total Staff
          </Badge>
        </div>
      </div>

      {/* HR Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        <Card className="role-property-hr">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Staff Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{hrStats.presentToday}/{hrStats.totalStaff}</div>
            <Progress value={hrStats.totalStaff > 0 ? (hrStats.presentToday / hrStats.totalStaff) * 100 : 0} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">Daily attendance</p>
          </CardContent>
        </Card>

        <Card className="role-property-hr">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{hrStats.pendingLeaveRequests}</div>
            <p className="text-xs text-gray-600 mt-1">Pending approval</p>
          </CardContent>
        </Card>

        <Card className="role-property-hr">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Training Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{hrStats.trainingCompliance}%</div>
            <Progress value={hrStats.trainingCompliance} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">Completion rate</p>
          </CardContent>
        </Card>

        <Card className="role-property-hr">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{hrStats.openPositions}</div>
            <p className="text-xs text-gray-600 mt-1">{hrStats.newHiresThisMonth} hired this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-5 h-auto">
            <TabsTrigger value="feed" className="text-xs sm:text-sm whitespace-nowrap">Feed</TabsTrigger>
            <TabsTrigger value="leave" className="text-xs sm:text-sm whitespace-nowrap">Leave</TabsTrigger>
            <TabsTrigger value="staff" className="text-xs sm:text-sm whitespace-nowrap">Staff</TabsTrigger>
            <TabsTrigger value="recruitment" className="text-xs sm:text-sm whitespace-nowrap">Recruit</TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs sm:text-sm whitespace-nowrap">Compliance</TabsTrigger>
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

        <TabsContent value="leave" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.Calendar className="h-5 w-5" />
                <span>Leave Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {leaveLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading leave requests...</p>
                </div>
              ) : !leaveRequests || leaveRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Icons.Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No leave requests</h3>
                  <p className="text-gray-600">
                    No leave requests from your team at this time.
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
                          <div className="truncate">Reason: {request.reason}</div>
                        )}
                        <div>Department: {request.department?.name || 'Not assigned'}</div>
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
      </Tabs>
    </div>
  )
}
