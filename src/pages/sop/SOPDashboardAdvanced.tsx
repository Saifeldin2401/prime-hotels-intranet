import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { formatDate } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

const mockAnalytics = {
  totalDocuments: 156,
  activeDocuments: 142,
  draftDocuments: 14,
  underReview: 8,
  approved: 120,
  obsolete: 14,
  overdueForReview: 23,
  complianceRate: 87.5,
  averageReviewTime: 3.2,
  trainingCompletion: 92.3,
  emergencyProcedures: 18,
  criticalDocuments: 12,
  departmentStats: [
    { department: 'Front Desk', total: 45, compliant: 42, overdue: 3 },
    { department: 'Housekeeping', total: 38, compliant: 35, overdue: 2 },
    { department: 'Food & Beverage', total: 32, compliant: 28, overdue: 4 },
    { department: 'Maintenance', total: 28, compliant: 25, overdue: 3 },
    { department: 'Management', total: 13, compliant: 12, overdue: 1 }
  ],
  monthlyTrends: [
    { month: 'Jan', created: 12, reviewed: 18, approved: 15 },
    { month: 'Feb', created: 15, reviewed: 14, approved: 16 },
    { month: 'Mar', created: 18, reviewed: 22, approved: 20 },
    { month: 'Apr', created: 14, reviewed: 16, approved: 18 },
    { month: 'May', created: 20, reviewed: 19, approved: 22 },
    { month: 'Jun', created: 16, reviewed: 21, approved: 19 }
  ],
  categoryDistribution: [
    { name: 'Operations', value: 45, color: '#0088FE' },
    { name: 'Safety', value: 28, color: '#00C49F' },
    { name: 'Service', value: 32, color: '#FFBB28' },
    { name: 'Admin', value: 21, color: '#FF8042' },
    { name: 'Emergency', value: 18, color: '#8884D8' },
    { name: 'Maintenance', value: 12, color: '#82CA9D' }
  ],
  recentActivity: [
    { id: 1, action: 'created', document: 'Guest Check-in Procedure v2.1', user: 'John Doe', time: '2 hours ago', status: 'draft' },
    { id: 2, action: 'approved', document: 'Emergency Fire Protocol', user: 'Jane Smith', time: '4 hours ago', status: 'approved' },
    { id: 3, action: 'reviewed', document: 'Housekeeping Standards v3.0', user: 'Mike Johnson', time: '6 hours ago', status: 'under_review' },
    { id: 4, action: 'updated', document: 'Food Safety Guidelines', user: 'Sarah Wilson', time: '1 day ago', status: 'approved' },
    { id: 5, action: 'submitted', document: 'Maintenance Request Form', user: 'Tom Brown', time: '2 days ago', status: 'under_review' }
  ],
  upcomingReviews: [
    { id: 1, title: 'Guest Check-in Procedure', department: 'Front Desk', dueDate: new Date('2024-12-15'), priority: 'high', lastReviewed: new Date('2024-09-15') },
    { id: 2, title: 'Emergency Fire Protocol', department: 'Safety', dueDate: new Date('2024-12-20'), priority: 'critical', lastReviewed: new Date('2024-06-20') },
    { id: 3, title: 'Housekeeping Standards', department: 'Housekeeping', dueDate: new Date('2024-12-25'), priority: 'medium', lastReviewed: new Date('2024-09-25') },
    { id: 4, title: 'Food Safety Guidelines', department: 'Food & Beverage', dueDate: new Date('2024-12-28'), priority: 'high', lastReviewed: new Date('2024-06-28') }
  ],
  complianceIssues: [
    { id: 1, type: 'overdue', document: 'Guest Check-in Procedure', daysOverdue: 15, department: 'Front Desk', severity: 'high' },
    { id: 2, type: 'training', document: 'Emergency Fire Protocol', staffNotTrained: 8, department: 'Safety', severity: 'critical' },
    { id: 3, type: 'approval', document: 'Maintenance Request Form', pendingDays: 5, department: 'Maintenance', severity: 'medium' },
    { id: 4, type: 'review', document: 'Food Safety Guidelines', daysSinceReview: 180, department: 'Food & Beverage', severity: 'high' }
  ]
}

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
}

const severityColors: Record<string, string> = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-orange-500',
  critical: 'border-l-red-500'
}

export function SOPDashboardAdvanced() {
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [dateRange, setDateRange] = useState('30days')
  const [selectedMetric, setSelectedMetric] = useState('compliance')

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'default' }: {
    title: string
    value: string | number
    subtitle?: string
    icon: React.ComponentType<{ className?: string }>
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
    color?: 'default' | 'success' | 'warning' | 'danger'
  }) => {
    const colorClasses = {
      default: 'bg-blue-50 text-blue-600 border-blue-200',
      success: 'bg-green-50 text-green-600 border-green-200',
      warning: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      danger: 'bg-red-50 text-red-600 border-red-200'
    }

    return (
      <Card className={colorClasses[color]}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {subtitle && <p className="text-xs opacity-80">{subtitle}</p>}
          {trend && trendValue && (
            <div className={`flex items-center text-xs mt-1 ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend === 'up' && <Icons.TrendingUp className="h-3 w-3 mr-1" />}
              {trend === 'down' && <Icons.TrendingDown className="h-3 w-3 mr-1" />}
              {trendValue}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SOP Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of Standard Operating Procedures
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="front-desk">Front Desk</SelectItem>
              <SelectItem value="housekeeping">Housekeeping</SelectItem>
              <SelectItem value="food-beverage">Food & Beverage</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="management">Management</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Icons.Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Documents"
          value={mockAnalytics.totalDocuments}
          subtitle={`${mockAnalytics.activeDocuments} active`}
          icon={Icons.FileText}
          trend="up"
          trendValue="12% from last month"
          color="default"
        />
        <StatCard
          title="Compliance Rate"
          value={`${mockAnalytics.complianceRate}%`}
          subtitle="Across all departments"
          icon={Icons.Shield}
          trend="up"
          trendValue="3.2% improvement"
          color="success"
        />
        <StatCard
          title="Avg Review Time"
          value={`${mockAnalytics.averageReviewTime} days`}
          subtitle="From submission to approval"
          icon={Icons.Clock}
          trend="down"
          trendValue="0.8 days faster"
          color="success"
        />
        <StatCard
          title="Overdue Reviews"
          value={mockAnalytics.overdueForReview}
          subtitle="Require immediate attention"
          icon={Icons.AlertTriangle}
          trend="down"
          trendValue="5 fewer than last week"
          color="warning"
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Department Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockAnalytics.departmentStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="compliant" fill="#00C49F" name="Compliant" />
                      <Bar dataKey="overdue" fill="#FF8042" name="Overdue" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Document Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mockAnalytics.categoryDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {mockAnalytics.categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockAnalytics.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="created" stroke="#8884d8" name="Created" />
                    <Line type="monotone" dataKey="reviewed" stroke="#82ca9d" name="Reviewed" />
                    <Line type="monotone" dataKey="approved" stroke="#ffc658" name="Approved" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockAnalytics.upcomingReviews.map((review) => (
                  <div key={review.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{review.title}</div>
                      <div className="text-sm text-muted-foreground">{review.department}</div>
                    </div>
                    <div className="text-right">
                      <Badge className={priorityColors[review.priority]}>
                        {review.priority}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        Due {formatDate(review.dueDate)}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Issues</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockAnalytics.complianceIssues.map((issue) => (
                  <div key={issue.id} className={`p-3 border rounded-lg border-l-4 ${severityColors[issue.severity]}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{issue.document}</div>
                        <div className="text-sm text-muted-foreground">{issue.department}</div>
                      </div>
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        {issue.type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {issue.type === 'overdue' && `${issue.daysOverdue} days overdue`}
                      {issue.type === 'training' && `${issue.staffNotTrained} staff not trained`}
                      {issue.type === 'approval' && `Pending ${issue.pendingDays} days`}
                      {issue.type === 'review' && `${issue.daysSinceReview} days since review`}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAnalytics.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'approved' ? 'bg-green-500' :
                        activity.status === 'under_review' ? 'bg-yellow-500' :
                        activity.status === 'draft' ? 'bg-gray-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <div className="font-medium">{activity.document}</div>
                        <div className="text-sm text-muted-foreground">
                          {activity.action} by {activity.user}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {activity.time}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
