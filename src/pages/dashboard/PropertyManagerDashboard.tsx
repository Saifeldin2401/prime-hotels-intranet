import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed, type FeedItem } from '@/components/social/SocialFeed'
import { Icons } from '@/components/icons'
import type { User } from '@/lib/rbac'

export function PropertyManagerDashboard() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  // Mock user object for SocialFeed component
  const mockUser: User = {
    id: 'pm-1',
    name: 'Property Manager',
    email: 'pm@primehotels.com',
    role: 'property_manager',
    property: 'Riyadh Downtown',
    permissions: []
  }
  const [propertyStats] = useState({
    occupancyRate: 87,
    guestSatisfaction: 4.6,
    revenueTarget: 92,
    staffCompliance: 95,
    maintenanceIssues: 5,
    trainingCompletion: 88
  })

  useEffect(() => {
    // Mock data for Property Manager dashboard
    const mockFeedItems: FeedItem[] = [
      {
        id: '1',
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
        title: 'Monthly Performance Review Meeting',
        content: 'Monthly performance review scheduled for Thursday 2 PM. All department heads required to attend with KPI reports.',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        tags: ['meeting', 'mandatory', 'performance'],
        priority: 'high',
        reactions: { like: 12, clap: 6 },
        comments: []
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
        title: 'Quarterly Audit Preparation',
        content: 'Corporate audit scheduled for next week. Please ensure all departmental reports and compliance documents are ready.',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        tags: ['audit', 'compliance', 'deadline'],
        priority: 'high',
        reactions: {},
        comments: [],
        actionButton: {
          text: 'Prepare Documents',
          onClick: () => console.log('Prepare Documents')
        }
      },
      {
        id: '3',
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
        title: 'Emergency Procedure Update Request',
        content: 'Request to update emergency evacuation procedures based on recent safety inspection recommendations.',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        tags: ['safety', 'emergency', 'procedures'],
        priority: 'medium',
        reactions: { like: 8 },
        comments: [],
        actionButton: {
          text: 'Review Request',
          onClick: () => console.log('Review Request')
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
          <h1 className="text-3xl font-bold text-gray-900">Property Dashboard</h1>
          <p className="text-gray-600">Oversee property operations and performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge className="text-sm bg-orange-100 text-orange-800">
            {propertyStats.occupancyRate}% Occupancy
          </Badge>
        </div>
      </div>

      {/* Property KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="role-property-manager">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Occupancy Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{propertyStats.occupancyRate}%</div>
            <Progress value={propertyStats.occupancyRate} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">Above target (85%)</p>
          </CardContent>
        </Card>

        <Card className="role-property-manager">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Guest Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{propertyStats.guestSatisfaction}/5.0</div>
            <div className="flex space-x-1 mt-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Icons.Star
                  key={star}
                  className={`h-4 w-4 ${star <= Math.floor(propertyStats.guestSatisfaction) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1">4.6 average rating</p>
          </CardContent>
        </Card>

        <Card className="role-property-manager">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Revenue Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{propertyStats.revenueTarget}%</div>
            <Progress value={propertyStats.revenueTarget} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">$2.3M of $2.5M target</p>
          </CardContent>
        </Card>

        <Card className="role-property-manager">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Staff Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{propertyStats.staffCompliance}%</div>
            <Progress value={propertyStats.staffCompliance} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">Training & SOP compliance</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="audits">Audits</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-6">
          <SocialFeed
            user={mockUser}
            feedItems={feedItems}
            onReact={handleReact}
            onComment={handleComment}
            onShare={handleShare}
          />
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.Building className="h-5 w-5" />
                <span>Department Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Front Desk', head: 'Sarah Johnson', staff: 12, performance: 4.8, compliance: 95 },
                { name: 'Housekeeping', head: 'Mike Wilson', staff: 18, performance: 4.6, compliance: 92 },
                { name: 'Food & Beverage', head: 'Lisa Chen', staff: 25, performance: 4.7, compliance: 88 },
                { name: 'Maintenance', head: 'Tom Davis', staff: 8, performance: 4.5, compliance: 100 }
              ].map((dept, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{dept.name}</p>
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        {dept.staff} staff
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Head: {dept.head}</p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span>Performance: {dept.performance}/5.0</span>
                      <span>Compliance: {dept.compliance}%</span>
                    </div>
                  </div>
                  <button className="ml-4 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                    View Details
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
                {[
                  { issue: 'Elevator B - Service Required', priority: 'high', location: 'Main Lobby', reported: '2 hours ago' },
                  { issue: 'Room 304 - AC Not Working', priority: 'medium', location: 'Floor 3', reported: '4 hours ago' },
                  { issue: 'Restaurant Kitchen - Equipment', priority: 'low', location: 'Restaurant', reported: '1 day ago' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">{item.issue}</p>
                      <p className="text-xs text-gray-600">{item.location} • {item.reported}</p>
                    </div>
                    <Badge className={
                      item.priority === 'high'
                        ? 'bg-red-100 text-red-800'
                        : item.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                    }>
                      {item.priority}
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
                {[
                  { department: 'Front Desk', present: 10, total: 12, absent: 2 },
                  { department: 'Housekeeping', present: 16, total: 18, absent: 2 },
                  { department: 'Food & Beverage', present: 22, total: 25, absent: 3 },
                  { department: 'Maintenance', present: 8, total: 8, absent: 0 }
                ].map((dept, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">{dept.department}</p>
                      <p className="text-xs text-gray-600">{dept.present}/{dept.total} present</p>
                    </div>
                    <Progress value={(dept.present / dept.total) * 100} className="w-20" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.FileText className="h-5 w-5" />
                <span>Management Reports</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Monthly Financial Report', period: 'September 2024', status: 'ready', type: 'financial' },
                { name: 'Guest Satisfaction Analysis', period: 'Q3 2024', status: 'ready', type: 'guest' },
                { name: 'Staff Performance Summary', period: 'September 2024', status: 'processing', type: 'hr' },
                { name: 'Operational Efficiency Report', period: 'Last 30 days', status: 'ready', type: 'operations' }
              ].map((report, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <p className="text-sm text-gray-600">{report.period} • {report.type}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={
                      report.status === 'ready'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }>
                      {report.status}
                    </Badge>
                    <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                      Download
                    </button>
                  </div>
                </div>
              ))}
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
              {[
                { audit: 'Corporate Quarterly Audit', date: 'Oct 15-20, 2024', status: 'upcoming', readiness: 75 },
                { audit: 'Safety Inspection', date: 'Oct 25, 2024', status: 'upcoming', readiness: 90 },
                { audit: 'Health Department Review', date: 'Nov 5, 2024', status: 'upcoming', readiness: 85 },
                { audit: 'Fire Safety Check', date: 'Completed Sep 28', status: 'completed', readiness: 100 }
              ].map((audit, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{audit.audit}</p>
                    <Badge className={
                      audit.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : audit.status === 'upcoming'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }>
                      {audit.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Date: {audit.date}</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Readiness:</span>
                    <Progress value={audit.readiness} className="flex-1" />
                    <span className="text-xs font-medium">{audit.readiness}%</span>
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
