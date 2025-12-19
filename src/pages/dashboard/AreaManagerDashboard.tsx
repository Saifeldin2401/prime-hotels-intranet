import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed, type FeedItem } from '@/components/social/SocialFeed'
import { Icons } from '@/components/icons'
import type { User } from '@/lib/rbac'
import { useProperty } from '@/contexts/PropertyContext'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { useAuth } from '@/hooks/useAuth'
import { useAreaManagerStats } from '@/hooks/useDashboardStats'

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function AreaManagerDashboard() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const { currentProperty, availableProperties } = useProperty()
  const { user, profile, primaryRole } = useAuth()
  const { data: announcements = [], isLoading: announcementsLoading } = useAnnouncements({ limit: 5 })
  const { data: stats, isLoading: statsLoading } = useAreaManagerStats()

  // Create real user object from auth context
  const currentUser: User = {
    id: user?.id || 'guest',
    name: profile?.full_name || user?.email || 'Area Manager',
    email: user?.email || '',
    role: (primaryRole as User['role']) || 'area_manager',
    property: currentProperty?.name || 'Region Central',
    permissions: []
  }

  // Transform announcements to feed items format
  const feedItems: FeedItem[] = announcements.map(announcement => ({
    id: announcement.id,
    type: 'announcement' as const,
    author: {
      id: announcement.created_by || 'system',
      name: announcement.created_by_profile?.full_name || 'System',
      email: '',
      role: 'area_manager' as const,
      department: 'Management',
      property: currentProperty?.name || 'Region Central',
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
  const areaStats = stats || {
    totalProperties: 0,
    maintenanceEfficiency: 0,
    openVacancies: 0,
    staffCompliance: 0,
    openIssues: 0
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
          <h1 className="text-3xl font-bold text-gray-900">{t('cards.area_dashboard_title')}</h1>
          <p className="text-gray-600">{t('cards.area_dashboard_subtitle', { count: areaStats.totalProperties })}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge className="bg-gray-100 text-gray-800 border border-gray-600 rounded-md text-sm">
            {t('cards.regional_admin_badge')}
          </Badge>
          <Badge className="text-sm bg-green-100 text-green-800">
            {t('cards.active_properties_badge', { count: areaStats.totalProperties })}
          </Badge>
        </div>
      </div>

      {/* Area KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="role-area-manager">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('cards.maintenance_efficiency')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{areaStats.maintenanceEfficiency}%</div>
            <Progress value={areaStats.maintenanceEfficiency} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">{t('cards.maintenance_efficiency_subtitle')}</p>
          </CardContent>
        </Card>

        <Card className="role-area-manager">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('cards.recruitment')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{areaStats.openVacancies}</div>
            <p className="text-sm font-medium mt-1">{t('cards.open_positions')}</p>
            <p className="text-xs text-gray-600 mt-1">{t('cards.active_job_postings')}</p>
          </CardContent>
        </Card>

        <Card className="role-area-manager">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('cards.training_compliance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{areaStats.staffCompliance}%</div>
            <Progress value={areaStats.staffCompliance} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">{t('cards.completion_rate')}</p>
          </CardContent>
        </Card>

        <Card className="role-area-manager">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('cards.open_issues')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{areaStats.openIssues}</div>
            <p className="text-xs text-gray-600 mt-1">{t('cards.pending_tasks_tickets')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="feed">{t('tabs.feed')}</TabsTrigger>
          <TabsTrigger value="properties">{t('tabs.properties')}</TabsTrigger>
          <TabsTrigger value="performance">{t('cards.performance')}</TabsTrigger>
          <TabsTrigger value="reports">{t('tabs.reports')}</TabsTrigger>
          <TabsTrigger value="budget">{t('cards.budget')}</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-6">
          <SocialFeed
            user={currentUser}
            feedItems={feedItems}
            onReact={handleReact}
            onComment={handleComment}
            onShare={handleShare}
          />
        </TabsContent>

        <TabsContent value="properties" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(availableProperties || []).filter(p => p.id !== 'all').map((property) => (
              <Card key={property.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/properties/${property.id}`)}>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center text-blue-700">
                      <Icons.Building className="h-6 w-6" />
                    </div>
                    <Badge variant={property.is_active ? "default" : "secondary"}>
                      {property.is_active ? t('cards.active_status') : t('cards.inactive_status')}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-lg">{property.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Icons.MapPin className="h-4 w-4" />
                      <span>{property.address || t('cards.no_address_set')}</span>
                    </div>
                    <div className="text-xs text-gray-400 pt-2 border-t mt-3 flex justify-between">
                      <span>ID: {property.id.substring(0, 8)}...</span>
                      <span className="text-blue-600 hover:underline">{t('cards.view_details')}</span>
                    </div>
                  </div>
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
                <span>{t('cards.area_performance_metrics')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Icons.BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>{t('cards.detailed_performance_coming_soon')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icons.FileText className="h-5 w-5" />
                <span>{t('cards.area_reports_title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Icons.FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>{t('cards.area_reports_coming_soon')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icons.DollarSign className="h-5 w-5" />
                  <span>{t('cards.budget_overview')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 text-gray-500">
                  <Icons.DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>{t('cards.budget_tracking_coming_soon')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icons.TrendingUp className="h-5 w-5" />
                  <span>{t('cards.revenue_analysis')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 text-gray-500">
                  <Icons.TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>{t('cards.revenue_analysis_coming_soon')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
