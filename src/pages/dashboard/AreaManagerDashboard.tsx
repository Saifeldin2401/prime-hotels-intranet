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
export function AreaManagerDashboard() {
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
    avgOccupancy: 0,
    totalRevenue: 0,
    guestSatisfaction: 0,
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
          <h1 className="text-3xl font-bold text-gray-900">Area Management Dashboard</h1>
          <p className="text-gray-600">Area Manager • {areaStats.totalProperties} Properties</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge className="bg-gray-100 text-gray-800 border border-gray-600 rounded-md text-sm">
            REGIONAL ADMIN
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
            <p className="text-xs text-gray-600 mt-1">Across all properties</p>
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
            <p className="text-xs text-gray-600 mt-1">Combined rating</p>
          </CardContent>
        </Card>

        <Card className="role-area-manager">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">${areaStats.totalRevenue}M</div>
            <p className="text-xs text-gray-600 mt-1">Monthly revenue</p>
          </CardContent>
        </Card>

        <Card className="role-area-manager">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Open Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{areaStats.openIssues}</div>
            <p className="text-xs text-gray-600 mt-1">Pending resolution</p>
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
                      {property.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-lg">{property.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Icons.MapPin className="h-4 w-4" />
                      <span>{property.address || 'No address set'}</span>
                    </div>
                    <div className="text-xs text-gray-400 pt-2 border-t mt-3 flex justify-between">
                      <span>ID: {property.id.substring(0, 8)}...</span>
                      <span className="text-blue-600 hover:underline">View Details</span>
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
                <span>Area Performance Metrics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Icons.BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Detailed performance metrics coming soon.</p>
              </div>
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
              <div className="text-center py-8 text-gray-500">
                <Icons.FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Area reports module coming soon.</p>
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
                  <span>Budget Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 text-gray-500">
                  <Icons.DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Budget tracking module coming soon.</p>
                </div>
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
                <div className="text-center py-8 text-gray-500">
                  <Icons.TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Revenue analysis module coming soon.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
