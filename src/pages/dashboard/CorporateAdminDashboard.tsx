import { useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed, type FeedItem } from '@/components/social/SocialFeed'
import { Icons } from '@/components/icons'
import { useProperty } from '@/contexts/PropertyContext'
import type { User } from '@/lib/rbac'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { useAuth } from '@/hooks/useAuth'
import { useCorporateStats } from '@/hooks/useDashboardStats'

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function CorporateAdminDashboard() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const { currentProperty, availableProperties } = useProperty()
  const { user, profile, primaryRole } = useAuth()
  const { data: announcements = [], isLoading: announcementsLoading } = useAnnouncements({ limit: 5 })
  const { data: corporateStats, isLoading: statsLoading } = useCorporateStats()

  // Memoize currentUser to prevent unnecessary re-renders
  const currentUser: User = useMemo(() => ({
    id: user?.id || 'guest',
    name: profile?.full_name || user?.email || 'Corporate Admin',
    email: user?.email || '',
    role: (primaryRole as User['role']) || 'corporate_admin',
    property: 'Corporate HQ',
    permissions: []
  }), [user?.id, user?.email, profile?.full_name, primaryRole])

  // Memoize feedItems transformation to prevent infinite re-renders
  const feedItems: FeedItem[] = useMemo(() => announcements.map(announcement => ({
    id: announcement.id,
    type: 'announcement' as const,
    author: {
      id: announcement.created_by || 'system',
      name: announcement.created_by_profile?.full_name || 'Corporate Office',
      email: '',
      role: 'corporate_admin' as const,
      department: 'Executive',
      property: 'Head Office',
      permissions: []
    },
    title: announcement.title,
    content: announcement.content,
    timestamp: new Date(announcement.created_at),
    tags: announcement.pinned ? ['pinned'] : [],
    priority: (announcement.priority === 'critical' ? 'high' : announcement.priority === 'important' ? 'medium' : 'low') as 'high' | 'medium' | 'low',
    reactions: {},
    comments: []
  })), [announcements])

  const loading = announcementsLoading || statsLoading

  // Memoize stats to prevent unnecessary re-renders
  const stats = useMemo(() => corporateStats || {
    totalProperties: 0,
    totalStaff: 0,
    maintenanceEfficiency: 0,
    openVacancies: 0,
    complianceRate: 0
  }, [corporateStats])

  // Memoize handlers to prevent unnecessary re-renders
  const handleReact = useCallback((_itemId: string, _reaction: string) => {
    // Reaction functionality placeholder - to be implemented
  }, [])

  const handleComment = useCallback((_itemId: string, _content: string) => {
    // Comment functionality placeholder - to be implemented
  }, [])

  const handleShare = useCallback((_itemId: string) => {
    // Share functionality placeholder - to be implemented
  }, [])


  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Icons.Loader className="h-8 w-8 animate-spin text-blue-600" />
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
          <p className="text-muted-foreground mt-1">
            {currentProperty?.id === 'all'
              ? t('property_overview', { name: 'Prime Hotel - Main' })
              : t('property_overview', { name: currentProperty?.name })}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="gold" className="text-sm px-3 py-1">
            {stats.totalProperties} {stats.totalProperties === 1 ? t('widgets.property') : t('widgets.properties')}
          </Badge>
        </div>
      </div>

      {/* Corporate KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-t-4 border-t-hotel-gold shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">{t('cards.total_staff_revenue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-3xl font-bold text-hotel-navy">{stats.totalStaff}</div>
                <p className="text-xs text-hotel-gold-dark mt-1 font-medium">{t('cards.headcount')}</p>
              </div>
              {/* Revenue Placeholder (if needed technically we removed it, but preserving structure/look) 
                     Actually removing revenue entirely as per request 
                 */}
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-hotel-navy shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">{t('cards.maintenance_efficiency')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-hotel-navy">{stats.maintenanceEfficiency}%</div>
            <Progress value={stats.maintenanceEfficiency} className="mt-2 h-2 [&>div]:bg-hotel-navy" />
            <p className="text-xs text-gray-500 mt-1">
              {currentProperty?.id === 'all' ? t('cards.system_resolution_rate') : t('cards.ticket_resolution_rate')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-hotel-gold shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">{t('cards.recruitment')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-hotel-navy">{stats.openVacancies}</div>
            <div className="text-sm text-gray-500 mt-2 font-medium">{t('cards.open_positions')}</div>
            <p className="text-xs text-gray-500 mt-1">
              {t('cards.active_job_postings')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-hotel-navy shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">{t('cards.training_compliance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-hotel-navy">{stats.complianceRate}%</div>
            <Progress value={stats.complianceRate} className="mt-2 h-2 [&>div]:bg-green-600" />
            <p className="text-xs text-green-600 mt-1 font-medium">{t('cards.completion_rate')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="feed">{t('tabs.feed')}</TabsTrigger>
          <TabsTrigger value="properties">{t('tabs.properties')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('tabs.analytics')}</TabsTrigger>
          <TabsTrigger value="compliance">{t('tabs.compliance')}</TabsTrigger>
          <TabsTrigger value="system">{t('tabs.system')}</TabsTrigger>
          <TabsTrigger value="reports">{t('tabs.reports')}</TabsTrigger>
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
            {availableProperties.filter(p => p.id !== 'all').map((property) => (
              <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gray-50 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{property.name}</CardTitle>
                    <Badge variant={property.is_active ? "outline" : "secondary"}>
                      {property.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{property.address || 'No address provided'}</p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">ID: {property.id.substring(0, 8)}...</span>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/properties/${property.id}`)}>View Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {availableProperties.length <= 1 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                <p>No properties found.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Icons.TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Detailed analytics module coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Icons.Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Compliance dashboard coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Icons.Server className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>System health monitoring coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Icons.FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Corporate reports module coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
