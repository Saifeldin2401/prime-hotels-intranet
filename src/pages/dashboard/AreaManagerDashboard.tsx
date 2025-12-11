import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed, type FeedItem } from '@/components/social/SocialFeed'
import { Icons } from '@/components/icons'
import type { User } from '@/lib/rbac'

interface AreaManagerDashboardProps {
  user: User
}

export function AreaManagerDashboard({ user }: AreaManagerDashboardProps) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [areaStats] = useState({
    totalProperties: 3,
    avgOccupancy: 85,
    totalRevenue: 6.8,
    guestSatisfaction: 4.5,
    staffCompliance: 90,
    openIssues: 8
  })

  useEffect(() => {
    // Mock data for Area Manager dashboard
    const mockFeedItems: FeedItem[] = [
      {
        id: '1',
        type: 'announcement',
        author: {
          id: '5',
          name: 'David Miller',
          email: 'david.m@primehotels.com',
          role: 'area_manager',
          department: 'Management',
          property: 'Regional Office',
          permissions: []
        },
        title: 'Quarterly Area Performance Review',
        content: 'Q3 area performance review scheduled for next week. All property managers to submit their KPI reports by Friday.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        tags: ['quarterly', 'performance', 'mandatory'],
        priority: 'high',
        reactions: { like: 15, clap: 8 },
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
        title: 'Area Budget Review Required',
        content: 'Annual budget review for all properties in your area. Please submit budget proposals and performance forecasts.',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        tags: ['budget', 'annual', 'deadline'],
        priority: 'high',
        reactions: {},
        comments: [],
        actionButton: {
          text: 'Start Budget Review',
          onClick: () => console.log('Start Budget Review')
        }
      },
      {
        id: '3',
        type: 'sop_update',
        author: {
          id: '4',
          name: 'Corporate Office',
          email: 'corporate@primehotels.com',
          role: 'corporate_admin',
          department: 'Corporate',
          property: 'Head Office',
          permissions: []
        },
        title: 'New Area Management Standards',
        content: 'Updated area management standards and reporting requirements. Implementation deadline: End of month.',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        tags: ['standards', 'area-management', 'compliance'],
        priority: 'medium',
        reactions: { like: 12, heart: 6 },
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
          <h1 className="text-3xl font-bold text-gray-900">Area Management Dashboard</h1>
          <p className="text-gray-600">Area Manager • {areaStats.totalProperties} Properties</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="text-sm">
            {user.role.replace('_', ' ').toUpperCase()}
          </Badge>
          <Badge className="text-sm bg-green-100 text-green-800">
            ${areaStats.totalRevenue}M Total Revenue
          </Badge>
        </div>
      </div>

      {/* Area KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="role-area-manager">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{areaStats.avgOccupancy}%</div>
            <Progress value={areaStats.avgOccupancy} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">Across {areaStats.totalProperties} properties</p>
          </CardContent>
        </Card>

        <Card className="role-area-manager">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Guest Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{areaStats.guestSatisfaction}/5.0</div>
            <div className="flex space-x-1 mt-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Icons.Star 
                  key={star} 
                  className={`h-4 w-4 ${star <= Math.floor(areaStats.guestSatisfaction) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                />
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1">Area average rating</p>
          </CardContent>
        </Card>

        <Card className="role-area-manager">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">${areaStats.totalRevenue}M</div>
            <p className="text-xs text-gray-600 mt-1">YTD • +12% vs last year</p>
          </CardContent>
        </Card>

        <Card className="role-area-manager">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Open Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{areaStats.openIssues}</div>
            <p className="text-xs text-gray-600 mt-1">3 urgent, 5 regular</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
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

        <TabsContent value="properties" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              { name: 'Riyadh Downtown', manager: 'Emily Wilson', occupancy: 87, revenue: 2.3, satisfaction: 4.6, staff: 85 },
              { name: 'Riyadh Airport', manager: 'John Davis', occupancy: 82, revenue: 2.1, satisfaction: 4.4, staff: 72 },
              { name: 'Riyadh North', manager: 'Sarah Johnson', occupancy: 86, revenue: 2.4, satisfaction: 4.5, staff: 68 }
            ].map((property, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{property.name}</CardTitle>
                    <Badge className="bg-blue-100 text-blue-800">
                      {property.occupancy}% Occupancy
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">Manager: {property.manager}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Revenue</p>
                      <p className="font-medium">${property.revenue}M</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Satisfaction</p>
                      <p className="font-medium">{property.satisfaction}/5.0</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Staff Count</p>
                      <p className="font-medium">{property.staff}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Occupancy</p>
                      <p className="font-medium">{property.occupancy}%</p>
                    </div>
                  </div>
                  <button className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                    View Details
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.BarChart3 className="h-5 w-5" />
                <span>Area Performance Metrics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { metric: 'Occupancy Rate', area: 85, target: 82, status: 'above', trend: '+3%' },
                { metric: 'Guest Satisfaction', area: 4.5, target: 4.3, status: 'above', trend: '+0.2' },
                { metric: 'Revenue Growth', area: 12, target: 8, status: 'above', trend: '+4%' },
                { metric: 'Staff Compliance', area: 90, target: 85, status: 'above', trend: '+5%' },
                { metric: 'Cost Efficiency', area: 78, target: 80, status: 'below', trend: '-2%' }
              ].map((item, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{item.metric}</p>
                    <div className="flex items-center space-x-2">
                      <Badge className={
                        item.status === 'above' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }>
                        {item.status} target
                      </Badge>
                      <span className="text-sm font-medium text-green-600">{item.trend}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Actual: {item.area}{item.metric.includes('%') ? '%' : item.metric.includes('.') ? '' : '%'}</span>
                        <span>Target: {item.target}{item.metric.includes('%') ? '%' : item.metric.includes('.') ? '' : '%'}</span>
                      </div>
                      <Progress value={item.metric.includes('.') ? (item.area / 5) * 100 : item.area} />
                    </div>
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
                <Icons.FileText className="h-5 w-5" />
                <span>Area Management Reports</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Area Monthly Performance', period: 'September 2024', status: 'ready', type: 'performance' },
                { name: 'Property Comparison Analysis', period: 'Q3 2024', status: 'ready', type: 'comparison' },
                { name: 'Budget vs Actual Report', period: 'September 2024', status: 'processing', type: 'financial' },
                { name: 'Area Staff Summary', period: 'Last 30 days', status: 'ready', type: 'hr' },
                { name: 'Guest Feedback Analysis', period: 'Q3 2024', status: 'ready', type: 'guest' }
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

        <TabsContent value="budget" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icons.DollarSign className="h-5 w-5" />
                  <span>Budget Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { category: 'Operations', budget: 4.2, spent: 3.8, remaining: 0.4 },
                  { category: 'Staff Costs', budget: 2.8, spent: 2.6, remaining: 0.2 },
                  { category: 'Marketing', budget: 0.8, spent: 0.9, remaining: -0.1 },
                  { category: 'Maintenance', budget: 1.2, spent: 1.1, remaining: 0.1 }
                ].map((item, index) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{item.category}</p>
                      <span className="text-sm font-medium">${item.spent}M / ${item.budget}M</span>
                    </div>
                    <Progress value={(item.spent / item.budget) * 100} className="mb-1" />
                    <p className="text-xs text-gray-600">
                      Remaining: ${item.remaining}M
                      {item.remaining < 0 && <span className="text-red-600 ml-1"> (Over budget)</span>}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icons.TrendingUp className="h-5 w-5" />
                  <span>Revenue Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { source: 'Room Revenue', amount: 5.2, percentage: 76, growth: '+8%' },
                  { source: 'Food & Beverage', amount: 1.1, percentage: 16, growth: '+12%' },
                  { source: 'Other Services', amount: 0.5, percentage: 8, growth: '+15%' }
                ].map((item, index) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{item.source}</p>
                      <span className="text-sm font-medium text-green-600">{item.growth}</span>
                    </div>
                    <p className="text-lg font-bold">${item.amount}M</p>
                    <Progress value={item.percentage} className="mt-2" />
                    <p className="text-xs text-gray-600 mt-1">{item.percentage}% of total revenue</p>
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
