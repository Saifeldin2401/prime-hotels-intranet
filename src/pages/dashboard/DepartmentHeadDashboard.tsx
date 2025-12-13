import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed, type FeedItem } from '@/components/social/SocialFeed'
import { Icons } from '@/components/icons'
import type { User } from '@/lib/rbac'

export function DepartmentHeadDashboard() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  // Mock user object for SocialFeed component
  const mockUser: User = {
    id: 'dh-1',
    name: 'Department Head',
    email: 'dh@primehotels.com',
    role: 'department_head',
    department: 'Front Desk',
    permissions: []
  }
  const [teamStats] = useState({
    totalStaff: 12,
    presentToday: 10,
    trainingCompliance: 85,
    pendingApprovals: 3
  })

  useEffect(() => {
    // Mock data for department head dashboard
    const mockFeedItems: FeedItem[] = [
      {
        id: '1',
        type: 'sop_update',
        author: {
          id: '2',
          name: 'Sarah Johnson',
          email: 'sarah.j@primehotels.com',
          role: 'department_head',
          department: 'Front Desk',
          property: 'Riyadh Downtown',
          permissions: []
        },
        title: 'SOP Review Required: Guest Complaint Handling',
        content: 'New SOP for guest complaint handling needs your review and approval. Please provide feedback by end of week.',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        tags: ['sop-review', 'front-desk', 'urgent'],
        priority: 'high',
        reactions: { like: 5 },
        comments: [],
        actionButton: {
          text: 'Review SOP',
          onClick: () => console.log('Review SOP')
        }
      },
      {
        id: '2',
        type: 'task',
        author: {
          id: '3',
          name: 'System',
          email: 'system@primehotels.com',
          role: 'corporate_admin',
          department: 'Management',
          property: 'System',
          permissions: []
        },
        title: 'Team Performance Review Due',
        content: 'Monthly team performance reviews are due. Please complete assessments for all 12 team members.',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        tags: ['performance', 'review', 'deadline'],
        priority: 'high',
        reactions: {},
        comments: [],
        actionButton: {
          text: 'Start Reviews',
          onClick: () => console.log('Start Reviews')
        }
      },
      {
        id: '3',
        type: 'announcement',
        author: {
          id: '4',
          name: 'Emily Wilson',
          email: 'emily.w@primehotels.com',
          role: 'property_manager',
          department: 'Management',
          property: 'Riyadh Downtown',
          permissions: []
        },
        title: 'Department Meeting Tomorrow',
        content: 'Monthly department meeting tomorrow at 10 AM. Agenda: Q3 performance, upcoming events, staff training.',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        tags: ['meeting', 'department', 'mandatory'],
        priority: 'medium',
        reactions: { like: 8, clap: 4 },
        comments: []
      }
    ]

    setFeedItems(mockFeedItems)
    setLoading(false)
  }, [])

  const handleReact = (itemId: string, reaction: string) => {
    setFeedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const currentReactions = item.reactions[reaction] || 0
        return {
          ...item,
          reactions: {
            ...item.reactions,
            [reaction]: currentReactions + 1
          }
        }
      }
      return item
    }))
  }

  const handleComment = (itemId: string, content: string) => {
    const newComment = {
      id: Date.now().toString(),
      author: mockUser,
      content,
      timestamp: new Date(),
      reactions: {}
    }

    setFeedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          comments: [...item.comments, newComment]
        }
      }
      return item
    }))
  }

  const handleShare = (itemId: string) => {
    console.log('Share item:', itemId)
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
        <div className="flex items-center">
          <Badge className="text-xs sm:text-sm bg-green-100 text-green-800">
            {teamStats.totalStaff} Team Members
          </Badge>
        </div>
      </div>

      {/* Department Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        <Card className="role-department-head">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Team Present Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{teamStats.presentToday}/{teamStats.totalStaff}</div>
            <Progress value={(teamStats.presentToday / teamStats.totalStaff) * 100} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">83% attendance rate</p>
          </CardContent>
        </Card>

        <Card className="role-department-head">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Training Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{teamStats.trainingCompliance}%</div>
            <Progress value={teamStats.trainingCompliance} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">2 staff behind schedule</p>
          </CardContent>
        </Card>

        <Card className="role-department-head">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{teamStats.pendingApprovals}</div>
            <p className="text-xs text-gray-600 mt-1">2 urgent, 1 regular</p>
          </CardContent>
        </Card>

        <Card className="role-department-head">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">4.7</div>
            <p className="text-xs text-gray-600 mt-1">Average rating (5.0 scale)</p>
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
            user={mockUser}
            feedItems={feedItems}
            onReact={handleReact}
            onComment={handleComment}
            onShare={handleShare}
          />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.Users className="h-5 w-5" />
                <span>Team Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'John Smith', status: 'present', training: 95, performance: 4.8 },
                { name: 'Lisa Chen', status: 'present', training: 88, performance: 4.6 },
                { name: 'Mike Wilson', status: 'leave', training: 92, performance: 4.5 },
                { name: 'Sarah Davis', status: 'present', training: 78, performance: 4.9 }
              ].map((member, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2 sm:gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{member.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600">Training: {member.training}% • Rating: {member.performance}</p>
                    </div>
                  </div>
                  <Badge className={
                    member.status === 'present'
                      ? 'bg-green-100 text-green-800 text-xs'
                      : 'bg-yellow-100 text-yellow-800 text-xs'
                  }>
                    {member.status}
                  </Badge>
                </div>
              ))}
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
              {[
                { type: 'Leave Request', employee: 'Mike Wilson', days: '2 days', priority: 'urgent' },
                { type: 'SOP Update', employee: 'Lisa Chen', title: 'Check-in Process', priority: 'regular' },
                { type: 'Training Assignment', employee: 'John Smith', course: 'Safety Procedures', priority: 'urgent' }
              ].map((approval, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base">{approval.type}</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      {approval.employee} • {approval.days || approval.title || approval.course}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      approval.priority === 'urgent'
                        ? 'bg-red-100 text-red-800 text-xs'
                        : 'bg-blue-100 text-blue-800 text-xs'
                    }>
                      {approval.priority}
                    </Badge>
                    <button className="px-3 py-1.5 text-xs sm:text-sm bg-green-600 text-white rounded hover:bg-green-700 min-h-touch sm:min-h-0">
                      Approve
                    </button>
                  </div>
                </div>
              ))}
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
              {[
                { name: 'Monthly Performance Report', period: 'September 2024', status: 'ready' },
                { name: 'Training Compliance Summary', period: 'Q3 2024', status: 'processing' },
                { name: 'Staff Attendance Analysis', period: 'Last 30 days', status: 'ready' }
              ].map((report, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base">{report.name}</p>
                    <p className="text-xs sm:text-sm text-gray-600">{report.period}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      report.status === 'ready'
                        ? 'bg-green-100 text-green-800 text-xs'
                        : 'bg-yellow-100 text-yellow-800 text-xs'
                    }>
                      {report.status}
                    </Badge>
                    <button className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 min-h-touch sm:min-h-0">
                      View
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
