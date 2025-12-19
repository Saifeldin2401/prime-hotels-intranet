
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EnhancedCard } from '@/components/ui/enhanced-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Users,
  FileText,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Activity,
  Download
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface AnalyticsItem {
  id?: string
  created_at: string
  status?: string
  is_active?: boolean
  due_date?: string
  priority?: string
  bonus_amount?: number
  action?: string
  entity_type?: string
  user?: {
    full_name: string
  }
}

export default function AnalyticsDashboard() {
  const { t } = useTranslation('dashboard')
  const [timeRange, setTimeRange] = useState('30days')

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics-dashboard', timeRange],
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

      const isoDate = startDate.toISOString()

      // Execute queries in parallel with error handling
      const results = await Promise.allSettled([
        supabase.from('profiles').select('created_at, is_active').gte('created_at', isoDate),
        supabase.from('documents').select('created_at, status').gte('created_at', isoDate),
        supabase.from('learning_assignments').select('created_at, status, due_date').gte('created_at', isoDate),
        supabase.from('maintenance_tickets').select('created_at, status, priority').gte('created_at', isoDate),
        // Employee referrals table might not exist yet, so we skip it to prevent errors
        // supabase.from('employee_referrals').select('created_at, status, bonus_amount').gte('created_at', isoDate),
        Promise.resolve({ data: [], error: null }),
        supabase.from('audit_logs').select('created_at, action').gte('created_at', isoDate)
      ])

      // Helper to extract data or return empty array
      const getData = (index: number) => {
        const result = results[index]
        return result.status === 'fulfilled' && result.value.data ? result.value.data : []
      }



      const users = getData(0) as AnalyticsItem[]
      const documents = getData(1) as AnalyticsItem[]
      const training = getData(2) as AnalyticsItem[]
      const maintenance = getData(3) as AnalyticsItem[]
      const referrals = getData(4) as AnalyticsItem[]
      const audit = getData(5) as AnalyticsItem[]

      return {
        users: {
          total: users.length,
          active: users.filter((u: AnalyticsItem) => u.is_active).length,
          new: users.length
        },
        documents: {
          total: documents.length,
          published: documents.filter((d: AnalyticsItem) => d.status === 'published' || d.status === 'PUBLISHED').length,
          draft: documents.filter((d: AnalyticsItem) => d.status === 'draft' || d.status === 'DRAFT').length
        },
        training: {
          total: training.length,
          completed: training.filter((t: AnalyticsItem) => t.status === 'completed').length,
          pending: training.filter((t: AnalyticsItem) => t.status === 'pending').length,
          overdue: training.filter((t: AnalyticsItem) =>
            t.status === 'pending' &&
            t.due_date && new Date(t.due_date) < now
          ).length
        },
        maintenance: {
          total: maintenance.length,
          open: maintenance.filter((m: AnalyticsItem) => m.status === 'open').length,
          resolved: maintenance.filter((m: AnalyticsItem) => m.status === 'resolved').length,
          critical: maintenance.filter((m: AnalyticsItem) => m.priority === 'critical').length
        },
        referrals: {
          total: referrals.length,
          hired: referrals.filter((r: AnalyticsItem) => r.status === 'hired').length,
          pending: referrals.filter((r: AnalyticsItem) => r.status === 'pending').length,
          bonusPaid: referrals.filter((r: AnalyticsItem) => r.status === 'hired').reduce((sum: number, r: AnalyticsItem) => sum + (r.bonus_amount || 0), 0)
        },
        audit: {
          total: audit.length,
          logins: audit.filter((a: AnalyticsItem) => a.action === 'login').length,
          creates: audit.filter((a: AnalyticsItem) => a.action === 'create').length
        }
      }
    }
  })

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select(`
            *,
            user: profiles(full_name)
          `)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          console.warn('Recent activity fetch warning:', error)
          return []
        }
        return data
      } catch (err) {
        console.warn('Recent activity fetch error:', err)
        return []
      }
    }
  })

  const exportAnalytics = () => {
    const csv = [
      [t('cards.export_headers.metric'), t('cards.export_headers.value'), t('cards.export_headers.period')],
      ...Object.entries(analytics || {}).flatMap(([category, metrics]) =>
        Object.entries(metrics).map(([metric, value]) => [`${category}.${metric} `, value.toString(), timeRange])
      )
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics - ${timeRange} -${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 lg:gap-6">
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
        title={t('analytics.title')}
        description={t('analytics.subtitle')}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder={t('analytics.time_range')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t('analytics.ranges.today')}</SelectItem>
                <SelectItem value="7days">{t('analytics.ranges.7days')}</SelectItem>
                <SelectItem value="30days">{t('analytics.ranges.30days')}</SelectItem>
                <SelectItem value="90days">{t('analytics.ranges.90days')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportAnalytics} className="bg-hotel-gold text-white hover:bg-hotel-gold-dark border border-hotel-gold rounded-md transition-colors w-full sm:w-auto">
              <Download className="h-4 w-4 me-2" />
              {t('analytics.export')}
            </Button>
          </div>
        }
      />



      {/* Enhanced Key Metrics */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <EnhancedCard variant="gold" className="animate-fade-in hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#FDF8F0] border border-[#E5D5BC] rounded-lg">
                <Users className="h-5 w-5 text-hotel-gold-dark" />
              </div>
              <CardTitle className="text-sm font-semibold text-gray-700">{t('analytics.total_users')}</CardTitle>
            </div>
            <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs font-medium">+12%</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-hotel-navy">{analytics?.users.total || 0}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-gray-600">
                {analytics?.users.active || 0} {t('analytics.active_now')}
              </p>
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="default" className="animate-fade-in hover:border-hotel-navy transition-all duration-300" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#F0F4F8] border border-[#DCE4E9] rounded-lg">
                <FileText className="h-5 w-5 text-hotel-navy" />
              </div>
              <CardTitle className="text-sm font-semibold text-gray-700">{t('analytics.documents')}</CardTitle>
            </div>
            <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs font-medium">+8%</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-hotel-navy">{analytics?.documents.total || 0}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-gray-600">
                {analytics?.documents.published || 0} {t('analytics.published')}
              </p>
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="default" className="animate-fade-in hover:border-hotel-navy transition-all duration-300" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#F0F4F8] border border-[#DCE4E9] rounded-lg">
                <BookOpen className="h-5 w-5 text-hotel-navy" />
              </div>
              <CardTitle className="text-sm font-semibold text-gray-700">{t('analytics.training')}</CardTitle>
            </div>
            <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
              <TrendingDown className="h-3 w-3" />
              <span className="text-xs font-medium">-3%</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-hotel-navy">{analytics?.training.completed || 0}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-gray-600">
                {analytics?.training.overdue || 0} {t('analytics.overdue')}
              </p>
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="default" className="animate-fade-in hover:border-hotel-navy transition-all duration-300" style={{ animationDelay: '300ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <CardTitle className="text-sm font-semibold text-gray-700">{t('analytics.maintenance')}</CardTitle>
            </div>
            <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs font-medium">+5</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-hotel-navy">{analytics?.maintenance.open || 0}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-gray-600">
                {analytics?.maintenance.critical || 0} {t('analytics.critical')}
              </p>
            </div>
          </CardContent>
        </EnhancedCard>
      </div>

      {/* Enhanced Detailed Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        <EnhancedCard variant="default" className="card-hover animate-fade-in" style={{ animationDelay: '400ms' }}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-hotel-navy">
              <div className="p-2 bg-[#F0F4F8] border border-[#DCE4E9] rounded-lg">
                <Activity className="h-5 w-5 text-hotel-navy" />
              </div>
              {t('analytics.user_activity')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-green-500 rounded-full relative">
                  <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                </div>
                <span className="font-medium text-gray-700">{t('analytics.new_users')}</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-transparent">
                {analytics?.users.new || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-gray-700">{t('analytics.active_users')}</span>
              </div>
              <Badge variant="default" className="bg-blue-100 text-blue-800 border-transparent">
                {analytics?.users.active || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-hotel-gold rounded-full"></div>
                <span className="font-medium text-gray-700">{t('analytics.total_logins')}</span>
              </div>
              <Badge className="bg-[#FDF8F0] text-hotel-gold-dark border border-[#E5D5BC] rounded-md">
                {analytics?.audit.logins || 0}
              </Badge>
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="default" className="card-hover animate-fade-in" style={{ animationDelay: '500ms' }}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-hotel-navy">
              <div className="p-2 bg-[#FDF8F0] border border-[#E5D5BC] rounded-lg">
                <DollarSign className="h-5 w-5 text-hotel-gold-dark" />
              </div>
              {t('analytics.referral_program')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="font-medium text-gray-700">{t('analytics.total_referrals')}</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-transparent">
                {analytics?.referrals.total || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-gray-700">{t('analytics.hired')}</span>
              </div>
              <Badge variant="default" className="bg-blue-100 text-blue-800 border-transparent">
                {analytics?.referrals.hired || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-hotel-gold rounded-full"></div>
                <span className="font-medium text-gray-700">{t('analytics.bonuses_paid')}</span>
              </div>
              <Badge className="bg-[#FDF8F0] text-hotel-gold-dark border border-[#E5D5BC] rounded-md">
                ${analytics?.referrals.bonusPaid || 0}
              </Badge>
            </div>
          </CardContent>
        </EnhancedCard>
      </div>

      {/* Enhanced Recent Activity */}
      <Card className="card-hover animate-fade-in border border-border shadow-sm" style={{ animationDelay: '600ms' }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
            <div className="p-2 bg-[#F0F4F8] border border-[#DCE4E9] rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            {t('analytics.recent_activity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity?.map((activity: AnalyticsItem, index: number) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 bg-accent rounded-lg hover:bg-muted transition-all duration-200 hover:shadow-sm animate-slide-up"
                style={{ animationDelay: `${700 + index * 100} ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-[#F0F4F8] border border-[#DCE4E9] rounded-lg">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground capitalize">{activity.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">
                        {activity.user?.full_name}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <Badge className="bg-gray-100 text-gray-800 border border-gray-600 rounded-md text-xs">
                        {activity.entity_type}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm text-gray-600 font-medium">
                    {formatRelativeTime(activity.created_at)}
                  </span>
                  <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
                </div>
              </div>
            ))}

            {recentActivity?.length === 0 && (
              <div className="text-center py-12 text-gray-600 animate-fade-in">
                <div className="p-3 bg-accent rounded-lg w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium">{t('analytics.no_activity')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('analytics.activity_placeholder')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div >
  )
}
