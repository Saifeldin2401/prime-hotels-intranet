import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed, type FeedItem } from '@/components/social/SocialFeed'
import { Icons } from '@/components/icons'
import { useProperty } from '@/contexts/PropertyContext'
import type { User } from '@/lib/rbac'

export function CorporateAdminDashboard() {
  const { currentProperty } = useProperty()
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  // Mock user object for SocialFeed component
  const mockUser: User = {
    id: 'admin-1',
    name: 'Corporate Admin',
    email: 'admin@primehotels.com',
    role: 'corporate_admin',
    property: 'Corporate HQ',
    permissions: []
  }

  // Base stats (Total)
  const baseStats = {
    totalProperties: 12,
    totalStaff: 1250,
    totalRevenue: 28.5,
    avgOccupancy: 83,
    guestSatisfaction: 4.4,
    systemHealth: 98
  }

  const [stats, setStats] = useState(baseStats)

  // Update stats when property changes
  useEffect(() => {
    if (currentProperty?.id === 'all') {
      setStats(baseStats)
    } else {
      // Scale down stats for individual property view (Simulation)
      setStats({
        totalProperties: 1,
        totalStaff: Math.floor(baseStats.totalStaff / 12),
        totalRevenue: Number((baseStats.totalRevenue / 12).toFixed(1)),
        avgOccupancy: baseStats.avgOccupancy + (Math.random() * 4 - 2), // Random variation
        guestSatisfaction: 4.5,
        systemHealth: 99
      })
    }
  }, [currentProperty])

  useEffect(() => {
    // Mock data for Corporate Admin dashboard
    const mockFeedItems: FeedItem[] = [
      {
        id: '1',
        type: 'announcement',
        author: {
          id: '6',
          name: 'Corporate Office',
          email: 'corporate@primehotels.com',
          role: 'corporate_admin',
          department: 'Executive',
          property: 'Head Office',
          permissions: []
        },
        title: 'Q3 Corporate Performance Review',
        content: 'Quarterly corporate performance review completed. All areas showing strong growth with Riyadh cluster leading performance metrics.',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        tags: ['quarterly', 'corporate', 'performance'],
        priority: 'high',
        reactions: { like: 25, clap: 15, heart: 10 },
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
          department: 'IT',
          property: 'System',
          permissions: []
        },
        title: 'Annual Budget Planning Cycle',
        content: '2025 annual budget planning initiated. All area managers to submit proposals by end of month. Corporate targets: 15% revenue growth.',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        tags: ['budget', 'annual', 'planning'],
        priority: 'high',
        reactions: {},
        comments: [],
        actionButton: {
          text: 'Start Planning',
          onClick: () => console.log('Start Planning')
        }
      },
      {
        id: '3',
        type: 'sop_update',
        author: {
          id: '6',
          name: 'Corporate Compliance',
          email: 'compliance@primehotels.com',
          role: 'corporate_admin',
          department: 'Compliance',
          property: 'Head Office',
          permissions: []
        },
        title: 'New Corporate Compliance Standards',
        content: 'Updated corporate compliance framework and audit procedures. Implementation across all properties required by Q1 2025.',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        tags: ['compliance', 'corporate', 'standards'],
        priority: 'high',
        reactions: { like: 18, shield: 8 },
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
          <h1 className="text-3xl font-bold text-gray-900">
            {currentProperty?.id === 'all' ? 'Corporate Dashboard' : `${currentProperty?.name} Dashboard`}
          </h1>
          <p className="text-gray-600">
            {currentProperty?.id === 'all'
              ? 'Enterprise-wide oversight and analytics'
              : `Property overview for ${currentProperty?.name}`}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="gold" className="text-sm px-3 py-1">
            {stats.totalProperties} {stats.totalProperties === 1 ? 'Property' : 'Properties'}
          </Badge>
        </div>
      </div>

      {/* Corporate KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-t-4 border-t-hotel-gold shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-hotel-navy">${stats.totalRevenue}M</div>
            <p className="text-xs text-hotel-gold-dark mt-1 font-medium">YTD • +18% vs last year</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-hotel-navy shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Average Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-hotel-navy">{Number(stats.avgOccupancy).toFixed(1)}%</div>
            <Progress value={stats.avgOccupancy} className="mt-2 h-2 [&>div]:bg-hotel-navy" />
            <p className="text-xs text-gray-500 mt-1">
              {currentProperty?.id === 'all' ? 'Across all properties' : 'Current occupancy'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-hotel-gold shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Guest Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-hotel-navy">{stats.guestSatisfaction}/5.0</div>
            <div className="flex space-x-1 mt-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Icons.Star
                  key={star}
                  className={`h-4 w-4 ${star <= Math.floor(stats.guestSatisfaction) ? 'text-hotel-gold fill-current' : 'text-gray-200'}`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {currentProperty?.id === 'all' ? 'Corporate average' : 'Property score'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-hotel-navy shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-hotel-navy">{stats.systemHealth}%</div>
            <Progress value={stats.systemHealth} className="mt-2 h-2 [&>div]:bg-green-600" />
            <p className="text-xs text-green-600 mt-1 font-medium">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="areas">Areas</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
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

        <TabsContent value="areas" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              { name: 'Riyadh Cluster', properties: 3, revenue: 6.8, occupancy: 85, manager: 'David Miller' },
              { name: 'Jeddah Cluster', properties: 2, revenue: 4.2, occupancy: 82, manager: 'Sarah Johnson' },
              { name: 'Dammam Cluster', properties: 2, revenue: 3.8, occupancy: 80, manager: 'Mike Wilson' },
              { name: 'Eastern Province', properties: 5, revenue: 13.7, occupancy: 84, manager: 'Lisa Chen' }
            ].map((area, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="bg-hotel-navy/5 border-b border-hotel-navy/10 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-hotel-navy">{area.name}</CardTitle>
                    <Badge variant="outline-gold">
                      {area.properties} Properties
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">Area Manager: <span className="font-medium text-hotel-navy">{area.manager}</span></p>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 uppercase text-xs font-semibold">Revenue</p>
                      <p className="font-bold text-lg text-hotel-navy">${area.revenue}M</p>
                    </div>
                    <div>
                      <p className="text-gray-500 uppercase text-xs font-semibold">Occupancy</p>
                      <p className="font-bold text-lg text-hotel-navy">{area.occupancy}%</p>
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button variant="navy" className="flex-1 h-9">
                      View Details
                    </Button>
                    <Button variant="outline" className="h-9">
                      Reports
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icons.TrendingUp className="h-5 w-5" />
                  <span>Revenue Trends</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { period: 'Q1 2024', revenue: 6.2, growth: '+12%' },
                  { period: 'Q2 2024', revenue: 7.1, growth: '+15%' },
                  { period: 'Q3 2024', revenue: 8.3, growth: '+17%' },
                  { period: 'Q4 2024 (proj)', revenue: 6.9, growth: '+11%' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{item.period}</p>
                      <p className="text-sm text-gray-600">${item.revenue}M</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {item.growth}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icons.Users className="h-5 w-5" />
                  <span>Staff Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { metric: 'Total Staff Count', value: 1250, change: '+85', trend: '+7%' },
                  { metric: 'Training Completion', value: 92, change: '+5', trend: '+5%' },
                  { metric: 'Staff Retention', value: 94, change: '+2', trend: '+2%' },
                  { metric: 'Compliance Rate', value: 88, change: '+8', trend: '+10%' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{item.metric}</p>
                      <p className="text-sm text-gray-600">{item.value}{item.metric.includes('Staff') ? '' : '%'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">{item.trend}</p>
                      <p className="text-xs text-gray-500">{item.change}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.Shield className="h-5 w-5" />
                <span>Corporate Compliance Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { area: 'Safety Standards', compliance: 96, status: 'compliant', issues: 2 },
                { area: 'HR Policies', compliance: 92, status: 'compliant', issues: 5 },
                { area: 'Financial Controls', compliance: 98, status: 'compliant', issues: 1 },
                { area: 'Data Protection', compliance: 88, status: 'attention', issues: 8 },
                { area: 'Environmental Standards', compliance: 85, status: 'attention', issues: 12 }
              ].map((item, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{item.area}</p>
                    <div className="flex items-center space-x-2">
                      <Badge className={
                        item.status === 'compliant'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }>
                        {item.status}
                      </Badge>
                      <span className="text-sm font-medium">{item.compliance}%</span>
                    </div>
                  </div>
                  <Progress value={item.compliance} className="mb-2" />
                  <p className="text-xs text-gray-600">{item.issues} open issues</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icons.Server className="h-5 w-5" />
                  <span>System Health</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { service: 'Intranet Platform', status: 'operational', uptime: 99.8, response: '120ms' },
                  { service: 'Database Systems', status: 'operational', uptime: 99.9, response: '45ms' },
                  { service: 'API Services', status: 'operational', uptime: 99.5, response: '200ms' },
                  { service: 'Backup Systems', status: 'maintenance', uptime: 98.2, response: 'N/A' }
                ].map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{service.service}</p>
                      <p className="text-sm text-gray-600">Uptime: {service.uptime}% • Response: {service.response}</p>
                    </div>
                    <Badge className={
                      service.status === 'operational'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }>
                      {service.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icons.AlertTriangle className="h-5 w-5" />
                  <span>System Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { alert: 'Scheduled maintenance - Backup systems', time: '2 hours ago', priority: 'low' },
                  { alert: 'High memory usage on API server', time: '4 hours ago', priority: 'medium' },
                  { alert: 'Database optimization completed', time: '6 hours ago', priority: 'info' },
                  { alert: 'Security patch deployed successfully', time: '1 day ago', priority: 'info' }
                ].map((alert, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">{alert.alert}</p>
                      <p className="text-xs text-gray-600">{alert.time}</p>
                    </div>
                    <Badge className={
                      alert.priority === 'low'
                        ? 'bg-blue-100 text-blue-800'
                        : alert.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }>
                      {alert.priority}
                    </Badge>
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
                <span>Corporate Reports</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Quarterly Financial Report', period: 'Q3 2024', status: 'ready', type: 'financial' },
                { name: 'Annual Performance Review', period: '2024', status: 'processing', type: 'performance' },
                { name: 'Compliance Audit Report', period: 'September 2024', status: 'ready', type: 'compliance' },
                { name: 'System Performance Analysis', period: 'Last 30 days', status: 'ready', type: 'technical' },
                { name: 'Staff Engagement Survey', period: 'Q3 2024', status: 'ready', type: 'hr' },
                { name: 'Market Analysis Report', period: 'Q3 2024', status: 'processing', type: 'market' }
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
      </Tabs>
    </div>
  )
}
