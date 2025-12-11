import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed, type FeedItem } from '@/components/social/SocialFeed'
import { Icons } from '@/components/icons'
import type { User } from '@/lib/rbac'

interface PropertyHRDashboardProps {
  user: User
}

export function PropertyHRDashboard({ user }: PropertyHRDashboardProps) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hrStats] = useState({
    totalStaff: 85,
    presentToday: 78,
    pendingLeaveRequests: 5,
    newHiresThisMonth: 3,
    trainingCompliance: 92,
    openPositions: 4
  })

  useEffect(() => {
    // Mock data for Property HR dashboard
    const mockFeedItems: FeedItem[] = [
      {
        id: '1',
        type: 'hr_reminder',
        author: {
          id: '3',
          name: 'HR System',
          email: 'hr@primehotels.com',
          role: 'property_hr',
          department: 'Human Resources',
          property: 'Riyadh Downtown',
          permissions: []
        },
        title: 'Performance Review Cycle Starting',
        content: 'Q4 performance review cycle begins next week. Please ensure all managers have completed their team assessments.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        tags: ['performance', 'reviews', 'deadline'],
        priority: 'high',
        reactions: { like: 8 },
        comments: [],
        actionButton: {
          text: 'Prepare Reviews',
          onClick: () => console.log('Prepare Reviews')
        }
      },
      {
        id: '2',
        type: 'announcement',
        author: {
          id: '4',
          name: 'Lisa Anderson',
          email: 'lisa.a@primehotels.com',
          role: 'corporate_admin',
          department: 'Corporate',
          property: 'Head Office',
          permissions: []
        },
        title: 'New HR Policy Updates',
        content: 'Updated remote work policy and employee handbook now available. Please review and acknowledge by month end.',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        tags: ['policy', 'handbook', 'mandatory'],
        priority: 'medium',
        reactions: { like: 15, clap: 8 },
        comments: []
      },
      {
        id: '3',
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
        title: 'Onboarding Schedule - New Hires',
        content: '3 new hires starting next week. Prepare onboarding materials and schedule orientation sessions.',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        tags: ['onboarding', 'new-hires', 'schedule'],
        priority: 'medium',
        reactions: {},
        comments: [],
        actionButton: {
          text: 'View Schedule',
          onClick: () => console.log('View Schedule')
        }
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
      author: user,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="loading-skeleton h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HR Dashboard</h1>
          <p className="text-gray-600">Human Resources • {user.property}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="text-sm">
            {user.role.replace('_', ' ').toUpperCase()}
          </Badge>
          <Badge className="text-sm bg-blue-100 text-blue-800">
            {hrStats.totalStaff} Total Staff
          </Badge>
        </div>
      </div>

      {/* HR Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="role-property-hr">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Staff Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{hrStats.presentToday}/{hrStats.totalStaff}</div>
            <Progress value={(hrStats.presentToday / hrStats.totalStaff) * 100} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">92% attendance rate</p>
          </CardContent>
        </Card>

        <Card className="role-property-hr">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{hrStats.pendingLeaveRequests}</div>
            <p className="text-xs text-gray-600 mt-1">2 urgent, 3 regular</p>
          </CardContent>
        </Card>

        <Card className="role-property-hr">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Training Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{hrStats.trainingCompliance}%</div>
            <Progress value={hrStats.trainingCompliance} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">Above target (90%)</p>
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
      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-6">
          <SocialFeed
            user={user}
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
              {[
                { employee: 'John Smith', type: 'Annual Leave', dates: 'Oct 15-17', status: 'pending', priority: 'regular' },
                { employee: 'Sarah Johnson', type: 'Sick Leave', dates: 'Oct 12', status: 'pending', priority: 'urgent' },
                { employee: 'Mike Wilson', type: 'Personal Leave', dates: 'Oct 20', status: 'pending', priority: 'regular' },
                { employee: 'Lisa Chen', type: 'Maternity Leave', dates: 'Nov 1 - Feb 28', status: 'approved', priority: 'low' }
              ].map((request, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{request.employee}</p>
                    <p className="text-sm text-gray-600">{request.type} • {request.dates}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={
                      request.status === 'approved' 
                        ? 'bg-green-100 text-green-800'
                        : request.status === 'pending'
                        ? request.priority === 'urgent' 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }>
                      {request.status}
                    </Badge>
                    {request.status === 'pending' && (
                      <div className="flex space-x-1">
                        <button className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
                          Approve
                        </button>
                        <button className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.Users className="h-5 w-5" />
                <span>Staff Directory</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'John Smith', department: 'Front Desk', role: 'Receptionist', status: 'active', hireDate: '2022-03-15' },
                { name: 'Sarah Johnson', department: 'Front Desk', role: 'Team Lead', status: 'active', hireDate: '2021-08-20' },
                { name: 'Mike Wilson', department: 'Housekeeping', role: 'Supervisor', status: 'active', hireDate: '2020-11-10' },
                { name: 'Lisa Chen', department: 'Food & Beverage', role: 'Server', status: 'on-leave', hireDate: '2023-01-05' }
              ].map((staff, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div>
                      <p className="font-medium">{staff.name}</p>
                      <p className="text-sm text-gray-600">{staff.role} • {staff.department}</p>
                      <p className="text-xs text-gray-500">Hired: {staff.hireDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={
                      staff.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }>
                      {staff.status}
                    </Badge>
                    <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                      View
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recruitment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.UserPlus className="h-5 w-5" />
                <span>Recruitment Pipeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { position: 'Front Desk Agent', department: 'Front Desk', applicants: 12, stage: 'interview', urgency: 'high' },
                { position: 'Housekeeping Staff', department: 'Housekeeping', applicants: 8, stage: 'screening', urgency: 'medium' },
                { position: 'Restaurant Server', department: 'Food & Beverage', applicants: 15, stage: 'final-round', urgency: 'high' },
                { position: 'Maintenance Technician', department: 'Maintenance', applicants: 5, stage: 'assessment', urgency: 'low' }
              ].map((position, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{position.position}</p>
                    <p className="text-sm text-gray-600">{position.department} • {position.applicants} applicants</p>
                    <p className="text-xs text-gray-500">Stage: {position.stage}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={
                      position.urgency === 'high' 
                        ? 'bg-red-100 text-red-800'
                        : position.urgency === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }>
                      {position.urgency}
                    </Badge>
                    <button className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.Shield className="h-5 w-5" />
                <span>Compliance Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { item: 'Safety Training Completion', percentage: 95, status: 'compliant', deadline: '2024-12-31' },
                { item: 'HR Policy Acknowledgment', percentage: 88, status: 'attention', deadline: '2024-10-31' },
                { item: 'Background Checks', percentage: 100, status: 'compliant', deadline: 'Completed' },
                { item: 'Certification Renewals', percentage: 72, status: 'critical', deadline: '2024-11-15' }
              ].map((item, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{item.item}</p>
                    <Badge className={
                      item.status === 'compliant' 
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'attention'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }>
                      {item.status}
                    </Badge>
                  </div>
                  <Progress value={item.percentage} className="mb-2" />
                  <p className="text-sm text-gray-600">{item.percentage}% complete • Deadline: {item.deadline}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
