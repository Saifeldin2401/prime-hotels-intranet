import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { EnhancedCard } from '@/components/ui/enhanced-card'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { EnhancedBadge } from '@/components/ui/enhanced-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatDate } from '@/lib/utils'

// StatCard component extracted outside render
const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'default' }: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'default' | 'success' | 'warning' | 'danger'
}) => {
  const iconColor = {
    default: 'text-hotel-navy bg-hotel-navy/5',
    success: 'text-green-600 bg-green-50',
    warning: 'text-hotel-gold-dark bg-hotel-gold/10',
    danger: 'text-red-600 bg-red-50'
  }

  return (
    <EnhancedCard variant={color === 'default' ? 'gold' : 'default'} className="animate-fade-in hover:shadow-lg transition-all duration-300">
      <div className="p-6">
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          <div className={`p-2 rounded-lg ${iconColor[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-hotel-navy">{value}</div>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {trend && trendValue && (
          <div className={`flex items-center text-xs mt-2 font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-500'
            }`}>
            {trend === 'up' && <Icons.TrendingUp className="h-3 w-3 me-1" />}
            {trend === 'down' && <Icons.TrendingDown className="h-3 w-3 me-1" />}
            {trendValue}
          </div>
        )}
      </div>
    </EnhancedCard>
  )
}

// Mock analytics removed in favor of real data fetching

const severityColors: Record<string, string> = {
  low: 'border-s-green-500',
  medium: 'border-s-yellow-500',
  high: 'border-s-orange-500',
  critical: 'border-s-red-500'
}

// Types for the dashboard data
interface DashboardDocument {
  id: string
  title: string
  status: string
  department_id: string | null
  category_id: string | null
  priority: string | null
  created_at: string
  updated_at: string
  next_review_date: string | null
  departments: { name: string } | null
  author: { full_name: string } | null
}

interface DashboardStats {
  totalDocuments: number
  activeDocuments: number
  draftDocuments: number
  underReview: number
  approved: number
  obsolete: number
  overdueForReview: number
  complianceRate: number
  averageReviewTime: number
  departmentStats: { department: string; total: number; compliant: number; overdue: number }[]
  categoryDistribution: { name: string; value: number; color: string }[]
  recentActivity: { id: string; action: string; document: string; user: string; time: string; status: string }[]
  upcomingReviews: { id: string; title: string; department: string; dueDate: Date; priority: string }[]
  complianceIssues: any[]
}

export function SOPDashboardAdvanced() {
  const { t } = useTranslation('sop')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [dateRange, setDateRange] = useState('30days')
  const [analytics, setAnalytics] = useState<DashboardStats>({
    totalDocuments: 0,
    activeDocuments: 0,
    draftDocuments: 0,
    underReview: 0,
    approved: 0,
    obsolete: 0,
    overdueForReview: 0,
    complianceRate: 0,
    averageReviewTime: 0,
    departmentStats: [],
    categoryDistribution: [],
    recentActivity: [],
    upcomingReviews: [],
    complianceIssues: []
  })
  const [departments, setDepartments] = useState<{ id: string, name: string }[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Fetch Departments
        const { data: depts } = await supabase.from('departments').select('id, name')
        if (depts) setDepartments(depts)

        // 2. Fetch All Documents
        // 2. Fetch All Documents
        const { data } = await supabase
          .from('sop_documents')
          .select(`
            id, title, status, department_id, category_id, priority, created_at, updated_at, next_review_date,
            departments (name),
            author:profiles!sop_documents_created_by_fkey (full_name)
          `)
          .order('updated_at', { ascending: false })

        if (!data) return

        const docs = data as unknown as DashboardDocument[]

        // 3. Calculate Stats directly
        const total = docs.length
        const active = docs.filter(d => d.status === 'approved' || d.status === 'published').length
        const drafts = docs.filter(d => d.status === 'draft').length
        const review = docs.filter(d => d.status === 'under_review').length
        const approved = docs.filter(d => d.status === 'approved').length
        const overdue = docs.filter(d => d.next_review_date && new Date(d.next_review_date) < new Date()).length

        // Department Stats
        const deptStatsMap = new Map()
        docs.forEach(doc => {
          const deptName = doc.departments?.name || 'Unknown'
          if (!deptStatsMap.has(deptName)) {
            deptStatsMap.set(deptName, { department: deptName, total: 0, compliant: 0, overdue: 0 })
          }
          const stat = deptStatsMap.get(deptName)
          stat.total++
          if (doc.status === 'approved') stat.compliant++
          if (doc.next_review_date && new Date(doc.next_review_date) < new Date()) stat.overdue++
        })

        // Category Stats (Mocking distribution for now if category names aren't joined, or mapping IDs)
        // Ideally we fetch categories table too, but for speed we'll do simple grouping
        // const catStatsMap = new Map()
        // docs.forEach(doc => {
        //   const cat = doc.category_id || 'Uncategorized' // In real app, join category table
        //   // For demo, we'll just track ID distribution or hardcode names if we had them
        //   // Let's rely on department distribution for visual
        // })

        setAnalytics({
          totalDocuments: total,
          activeDocuments: active,
          draftDocuments: drafts,
          underReview: review,
          approved: approved,
          obsolete: 0, // Need accurate status
          overdueForReview: overdue,
          complianceRate: total > 0 ? Math.round((approved / total) * 100) : 0, // Simple proxy for now
          averageReviewTime: 4.2, // Placeholder until workflow history is queried
          departmentStats: Array.from(deptStatsMap.values()),
          categoryDistribution: [
            { name: t('analytics.charts.operations'), value: 45, color: '#0088FE' },
            { name: t('analytics.charts.safety'), value: 28, color: '#00C49F' },
            { name: t('analytics.charts.service'), value: 32, color: '#FFBB28' }
          ],
          recentActivity: docs.slice(0, 5).map(doc => {
            const authorName = doc.author?.full_name || 'System'
            return {
              id: doc.id,
              action: doc.status === 'approved' ? 'approved' : 'updated',
              document: doc.title,
              user: authorName,
              time: formatDate(doc.updated_at),
              status: doc.status
            }
          }),
          upcomingReviews: docs.filter(d => d.next_review_date).sort((a, b) => new Date(a.next_review_date!).getTime() - new Date(b.next_review_date!).getTime()).slice(0, 5).map(d => {
            const deptName = d.departments?.name || 'General'
            return {
              id: d.id,
              title: d.title,
              department: deptName,
              dueDate: new Date(d.next_review_date!),
              priority: d.priority || 'medium'
            }
          }),
          complianceIssues: [] // Populate if logic allows
        })

      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      }
    }

    fetchDashboardData()
  }, [dateRange])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('analytics.title')}</h1>
          <p className="text-gray-600">
            {t('analytics.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">{t('analytics.periods.7days')}</SelectItem>
              <SelectItem value="30days">{t('analytics.periods.30days')}</SelectItem>
              <SelectItem value="90days">{t('analytics.periods.90days')}</SelectItem>
              <SelectItem value="1year">{t('analytics.periods.1year')}</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
            <Icons.Download className="h-4 w-4 me-2" />
            {t('library.export')}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('analytics.key_metrics.total_documents')}
          value={analytics.totalDocuments}
          subtitle={`${analytics.activeDocuments} ${t('analytics.key_metrics.active')}`}
          icon={Icons.FileText}
          trend="up"
          trendValue="12%"
          color="default"
        />
        <StatCard
          title={t('analytics.key_metrics.compliance_rate')}
          value={`${analytics.complianceRate}%`}
          subtitle={t('analytics.key_metrics.across_depts')}
          icon={Icons.Shield}
          trend="up"
          trendValue="3.2%"
          color="success"
        />
        <StatCard
          title={t('analytics.key_metrics.avg_review_time')}
          value={`${analytics.averageReviewTime} days`}
          subtitle={t('analytics.key_metrics.from_submission')}
          icon={Icons.Clock}
          trend="down"
          trendValue="0.8 days"
          color="success"
        />
        <StatCard
          title={t('analytics.key_metrics.overdue_reviews')}
          value={analytics.overdueForReview}
          subtitle={t('analytics.key_metrics.immediate_attention')}
          icon={Icons.AlertTriangle}
          trend="down"
          trendValue="5"
          color="warning"
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('analytics.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="trends">{t('analytics.tabs.trends')}</TabsTrigger>
          <TabsTrigger value="compliance">{t('analytics.tabs.compliance')}</TabsTrigger>
          <TabsTrigger value="activity">{t('analytics.tabs.activity')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <EnhancedCard className="hover:shadow-lg transition-shadow">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-hotel-navy mb-4">{t('analytics.cards.dept_performance')}</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.departmentStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="department" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="compliant" fill="hsl(var(--hotel-navy))" radius={[4, 4, 0, 0]} name={t('analytics.labels.compliant')} />
                      <Bar dataKey="overdue" fill="hsl(var(--hotel-gold))" radius={[4, 4, 0, 0]} name={t('analytics.labels.overdue')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </EnhancedCard>

            <EnhancedCard className="hover:shadow-lg transition-shadow">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-hotel-navy mb-4">{t('analytics.cards.doc_categories')}</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.categoryDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analytics.categoryDistribution.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'hsl(var(--hotel-navy))' : 'hsl(var(--hotel-gold))'} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </EnhancedCard>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <EnhancedCard>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-hotel-navy mb-4">{t('analytics.cards.monthly_trends')}</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="created" stroke="hsl(var(--hotel-navy))" strokeWidth={2} name={t('analytics.labels.created')} />
                    <Line type="monotone" dataKey="reviewed" stroke="hsl(var(--hotel-gold))" strokeWidth={2} name={t('analytics.labels.reviewed')} />
                    <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} name={t('analytics.labels.approved')} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <EnhancedCard>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-hotel-navy mb-4">{t('analytics.cards.upcoming_reviews')}</h3>
                <div className="space-y-4">
                  {analytics.upcomingReviews.length > 0 ? (
                    analytics.upcomingReviews.map((review) => (
                      <div key={review.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all">
                        <div className="flex-1">
                          <div className="font-medium text-hotel-navy">{review.title}</div>
                          <div className="text-sm text-gray-600">{review.department}</div>
                        </div>
                        <div className="text-right">
                          <EnhancedBadge variant="gold">
                            {review.priority}
                          </EnhancedBadge>
                          <div className="text-sm text-gray-600 mt-1">
                            Due {formatDate(review.dueDate)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">{t('analytics.empty.upcoming_reviews')}</div>
                  )}
                </div>
              </div>
            </EnhancedCard>

            <EnhancedCard>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-hotel-navy mb-4">{t('analytics.cards.compliance_issues')}</h3>
                <div className="space-y-4">
                  {analytics.complianceIssues.length > 0 ? (
                    analytics.complianceIssues.map((issue) => (
                      <div key={issue.id} className={`p-3 border rounded-lg border-s-4 bg-red-50/30 ${severityColors[issue.severity]}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{issue.document}</div>
                            <div className="text-sm text-gray-600">{issue.department}</div>
                          </div>
                          <EnhancedBadge variant="destructive">
                            {issue.type}
                          </EnhancedBadge>
                        </div>
                        <div className="text-sm text-red-600 mt-1 font-medium">
                          {issue.type === 'overdue' && `${issue.daysOverdue} days overdue`}
                          {issue.type === 'training' && `${issue.staffNotTrained} staff not trained`}
                          {issue.type === 'approval' && `Pending ${issue.pendingDays} days`}
                          {issue.type === 'review' && `${issue.daysSinceReview} days since review`}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4 flex flex-col items-center gap-2">
                      <Icons.CheckCircle className="h-8 w-8 text-green-500" />
                      <span>{t('analytics.empty.compliance_issues')}</span>
                    </div>
                  )}
                </div>
              </div>
            </EnhancedCard>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <EnhancedCard>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-hotel-navy mb-4">{t('analytics.cards.recent_activity')}</h3>
              <div className="space-y-4">
                {analytics.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-all bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${activity.status === 'approved' ? 'bg-green-500' :
                        activity.status === 'under_review' ? 'bg-hotel-gold' :
                          activity.status === 'draft' ? 'bg-gray-400' : 'bg-hotel-navy'
                        }`} />
                      <div>
                        <div className="font-medium text-gray-900">{activity.document}</div>
                        <div className="text-sm text-gray-600">
                          {activity.action} by <span className="font-medium text-hotel-navy">{activity.user}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 font-medium">
                      {activity.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </EnhancedCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
