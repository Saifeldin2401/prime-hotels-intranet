import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/contexts/ThemeContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Users, 
  FileText, 
  BookOpen, 
  Settings, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Calendar,
  Download,
  Target,
  Award,
  Briefcase,
  Building
} from 'lucide-react'
import { formatRelativeTime, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function AnalyticsDashboard() {
  const { profile, properties, primaryRole } = useAuth()
  const [timeRange, setTimeRange] = useState('30days')
  const [selectedProperty, setSelectedProperty] = useState('all')

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics-dashboard', timeRange, selectedProperty],
    queryFn: async () => {
      const now = new Date()
      let startDate = new Date()
      
      switch (timeRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case '7days':
          startDate.setDate(now.getDate() - 7)
          break
        case '30days':
          startDate.setDate(now.getDate() - 30)
          break
        case '90days':
          startDate.setDate(now.getDate() - 90)
          break
        default:
          startDate.setDate(now.getDate() - 30)
      }

      // Get user metrics
      const { data: users } = await supabase
        .from('profiles')
        .select('created_at, is_active')
        .gte('created_at', startDate.toISOString())

      // Get document metrics
      const { data: documents } = await supabase
        .from('documents')
        .select('created_at, status, visibility')
        .gte('created_at', startDate.toISOString())

      // Get training metrics
      const { data: training } = await supabase
        .from('training_assignments')
        .select('created_at, status, due_date')
        .gte('created_at', startDate.toISOString())

      // Get maintenance metrics
      const { data: maintenance } = await supabase
        .from('maintenance_tickets')
        .select('created_at, status, priority')
        .gte('created_at', startDate.toISOString())

      // Get referral metrics
      const { data: referrals } = await supabase
        .from('employee_referrals')
        .select('created_at, status, bonus_amount')
        .gte('created_at', startDate.toISOString())

      // Get audit metrics
      const { data: audit } = await supabase
        .from('audit_logs')
        .select('created_at, action')
        .gte('created_at', startDate.toISOString())

      return {
        users: {
          total: users?.length || 0,
          active: users?.filter(u => u.is_active).length || 0,
          new: users?.length || 0
        },
        documents: {
          total: documents?.length || 0,
          published: documents?.filter(d => d.status === 'published').length || 0,
          draft: documents?.filter(d => d.status === 'draft').length || 0
        },
        training: {
          total: training?.length || 0,
          completed: training?.filter(t => t.status === 'completed').length || 0,
          pending: training?.filter(t => t.status === 'pending').length || 0,
          overdue: training?.filter(t => 
            t.status === 'pending' && 
            new Date(t.due_date) < now
          ).length || 0
        },
        maintenance: {
          total: maintenance?.length || 0,
          open: maintenance?.filter(m => m.status === 'open').length || 0,
          resolved: maintenance?.filter(m => m.status === 'resolved').length || 0,
          critical: maintenance?.filter(m => m.priority === 'critical').length || 0
        },
        referrals: {
          total: referrals?.length || 0,
          hired: referrals?.filter(r => r.status === 'hired').length || 0,
          pending: referrals?.filter(r => r.status === 'pending').length || 0,
          bonusPaid: referrals?.filter(r => r.status === 'hired').reduce((sum, r) => sum + (r.bonus_amount || 0), 0) || 0
        },
        audit: {
          total: audit?.length || 0,
          logins: audit?.filter(a => a.action === 'login').length || 0,
          creates: audit?.filter(a => a.action === 'create').length || 0
        }
      }
    }
  })

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user:profiles(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data
    }
  })

  const exportAnalytics = () => {
    const csv = [
      ['Metric', 'Value', 'Period'],
      ...Object.entries(analytics || {}).flatMap(([category, metrics]) =>
        Object.entries(metrics).map(([metric, value]) => [`${category}.${metric}`, value.toString(), timeRange])
      )
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics Dashboard"
        description="System-wide metrics and performance analytics"
        actions={
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportAnalytics} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      {/* Enhanced Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover animate-fade-in border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-sm font-semibold text-blue-900 dark:text-blue-100">Total Users</CardTitle>
            </div>
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs font-medium">+12%</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{analytics?.users.total || 0}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {analytics?.users.active || 0} active now
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover animate-fade-in border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900" style={{animationDelay: '100ms'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-sm font-semibold text-green-900 dark:text-green-100">Documents</CardTitle>
            </div>
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs font-medium">+8%</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">{analytics?.documents.total || 0}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-green-700 dark:text-green-300">
                {analytics?.documents.published || 0} published
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover animate-fade-in border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900" style={{animationDelay: '200ms'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-sm font-semibold text-purple-900 dark:text-purple-100">Training</CardTitle>
            </div>
            <div className="flex items-center gap-1 text-orange-600">
              <TrendingDown className="h-3 w-3" />
              <span className="text-xs font-medium">-3%</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{analytics?.training.completed || 0}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                {analytics?.training.overdue || 0} overdue
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover animate-fade-in border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900" style={{animationDelay: '300ms'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-sm font-semibold text-orange-900 dark:text-orange-100">Maintenance</CardTitle>
            </div>
            <div className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs font-medium">+5</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">{analytics?.maintenance.open || 0}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                {analytics?.maintenance.critical || 0} critical
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Detailed Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="card-hover animate-fade-in border-0 shadow-lg" style={{animationDelay: '400ms'}}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              User Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-accent/50 rounded-lg hover:bg-accent/70 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">New Users</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                {analytics?.users.new || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-accent/50 rounded-lg hover:bg-accent/70 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Active Users</span>
              </div>
              <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                {analytics?.users.active || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-accent/50 rounded-lg hover:bg-accent/70 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Total Logins</span>
              </div>
              <Badge variant="outline" className="border-purple-200 text-purple-800 dark:border-purple-800 dark:text-purple-200">
                {analytics?.audit.logins || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover animate-fade-in border-0 shadow-lg" style={{animationDelay: '500ms'}}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              Referral Program
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-accent/50 rounded-lg hover:bg-accent/70 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Total Referrals</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                {analytics?.referrals.total || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-accent/50 rounded-lg hover:bg-accent/70 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Hired</span>
              </div>
              <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                {analytics?.referrals.hired || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-accent/50 rounded-lg hover:bg-accent/70 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Bonuses Paid</span>
              </div>
              <Badge variant="outline" className="border-yellow-200 text-yellow-800 dark:border-yellow-800 dark:text-yellow-200">
                ${analytics?.referrals.bonusPaid || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Recent Activity */}
      <Card className="card-hover animate-fade-in border-0 shadow-lg" style={{animationDelay: '600ms'}}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity?.map((activity: any, index: number) => (
              <div 
                key={activity.id} 
                className="flex items-center justify-between p-4 bg-accent/30 rounded-lg hover:bg-accent/50 transition-all duration-200 hover:shadow-md animate-slide-up"
                style={{animationDelay: `${700 + index * 100}ms`}}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-lg shadow-sm">
                    <Activity className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground capitalize">{activity.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">
                        {activity.user?.full_name}
                      </span>
                      <span className="text-xs text-muted-foreground/70">•</span>
                      <Badge variant="outline" className="text-xs">
                        {activity.entity_type}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm text-muted-foreground font-medium">
                    {formatRelativeTime(activity.created_at)}
                  </span>
                  <div className="h-1 w-1 bg-muted-foreground/50 rounded-full"></div>
                </div>
              </div>
            ))}
            
            {recentActivity?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground animate-fade-in">
                <div className="p-3 bg-accent/50 rounded-lg w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium">No recent activity found</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Activity will appear here as users interact with the system</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
