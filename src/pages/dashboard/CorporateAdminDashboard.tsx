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
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { useAuth } from '@/hooks/useAuth'
import { useCorporateStats } from '@/hooks/useDashboardStats'

import { useNavigate } from 'react-router-dom'
export function CorporateAdminDashboard() {
  const navigate = useNavigate()
  const { currentProperty, availableProperties } = useProperty()
  const { user, profile, primaryRole } = useAuth()
  const { data: announcements = [], isLoading: announcementsLoading } = useAnnouncements({ limit: 5 })
  const { data: corporateStats, isLoading: statsLoading } = useCorporateStats()

  // Create real user object from auth context
  const currentUser: User = {
    id: user?.id || 'guest',
    name: profile?.full_name || user?.email || 'Corporate Admin',
    email: user?.email || '',
    role: (primaryRole as User['role']) || 'corporate_admin',
    property: 'Corporate HQ',
    permissions: []
  }

  // Transform announcements to feed items format
  const feedItems: FeedItem[] = announcements.map(announcement => ({
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
  }))

  const loading = announcementsLoading || statsLoading

  const stats = corporateStats || {
    totalProperties: 0,
    totalStaff: 0,
    totalRevenue: 0,
    avgOccupancy: 0,
    avgGuestSatisfaction: 0,
    complianceRate: 0,
    systemHealth: 100
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
            <p className="text-xs text-hotel-gold-dark mt-1 font-medium">Monthly revenue</p>
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
            <div className="text-3xl font-bold text-hotel-navy">{stats.avgGuestSatisfaction}/5.0</div>
            <div className="flex space-x-1 mt-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Icons.Star
                  key={star}
                  className={`h-4 w-4 ${star <= Math.floor(stats.avgGuestSatisfaction) ? 'text-hotel-gold fill-current' : 'text-gray-200'}`}
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
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Compliance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-hotel-navy">{stats.complianceRate}%</div>
            <Progress value={stats.complianceRate} className="mt-2 h-2 [&>div]:bg-green-600" />
            <p className="text-xs text-green-600 mt-1 font-medium">Training & SOPs</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
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
