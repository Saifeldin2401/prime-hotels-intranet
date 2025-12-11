import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { ROLES } from '@/lib/constants'
import { FileText, GraduationCap, Megaphone, Users, Clock, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatRelativeTime } from '@/lib/utils'
import { UserDataDebug } from '@/components/debug/UserDataDebug'

export default function Dashboard() {
  const { user, profile, primaryRole, properties, departments } = useAuth()

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const userId = profile?.id
      if (!userId) return null

      // Get documents count
      const { count: documentsCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PUBLISHED')

      // Get training progress
      const { data: trainingProgress } = await supabase
        .from('training_progress')
        .select('*')
        .eq('user_id', userId)

      const completedTraining = trainingProgress?.filter(t => t.status === 'completed').length || 0
      const inProgressTraining = trainingProgress?.filter(t => t.status === 'in_progress').length || 0

      // Get unread announcements
      const { data: announcements } = await supabase
        .from('announcements')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      const { data: readAnnouncements } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', userId)

      const readIds = new Set(readAnnouncements?.map(r => r.announcement_id) || [])
      const unreadAnnouncements = announcements?.filter(a => !readIds.has(a.id)).length || 0

      // Get pending approvals
      const { count: pendingApprovals } = await supabase
        .from('approval_requests')
        .select('*', { count: 'exact', head: true })
        .eq('current_approver_id', userId)
        .eq('status', 'pending')

      // Get unread notifications
      const { count: unreadNotifications } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null)

      return {
        documentsCount: documentsCount || 0,
        completedTraining,
        inProgressTraining,
        unreadAnnouncements,
        pendingApprovals: pendingApprovals || 0,
        unreadNotifications: unreadNotifications || 0,
      }
    },
    enabled: !!profile?.id,
  })

  const { data: recentActivity } = useQuery<{
    announcements: Array<{ id: string; title: string; created_at: string; priority: string }>
    assignments: Array<{ id: string; training_modules: { title: string } | null; deadline: string | null; created_at: string }>
  }>({
    queryKey: ['dashboard-recent-activity'],
    queryFn: async () => {
      const userId = profile?.id
      if (!userId) return { announcements: [], assignments: [] }

      // Get recent announcements
      const { data: announcements } = await supabase
        .from('announcements')
        .select('id, title, created_at, priority')
        .order('created_at', { ascending: false })
        .limit(5)

      // Get recent training assignments
      let assignments: any[] = []
      if (departments.length > 0 || properties.length > 0) {
        const conditions: string[] = [`assigned_to_user_id.eq.${userId}`]
        
        if (departments.length > 0) {
          conditions.push(`assigned_to_department_id.in.(${departments.map(d => d.id).join(',')})`)
        }
        if (properties.length > 0) {
          conditions.push(`assigned_to_property_id.in.(${properties.map(p => p.id).join(',')})`)
        }
        
        const { data: assignmentsData } = await supabase
          .from('training_assignments')
          .select('id, training_modules(title), deadline, created_at')
          .or(conditions.join(','))
          .order('created_at', { ascending: false })
          .limit(5)
        
        assignments = assignmentsData || []
      }

      return {
        announcements: (announcements || []).map((a: any) => ({
          id: a.id,
          title: a.title || 'Untitled',
          created_at: a.created_at,
          priority: a.priority || 'normal',
        })),
        assignments: (assignments || []).map((a: any) => ({
          id: a.id,
          training_modules: a.training_modules ? { title: a.training_modules.title || 'Untitled' } : null,
          deadline: a.deadline,
          created_at: a.created_at,
        })),
      }
    },
    enabled: !!profile?.id,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.full_name || profile?.email || user?.email || 'User'}
        </p>
      </div>

      <UserDataDebug />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {primaryRole ? ROLES[primaryRole].label : 'No role assigned'}
            </div>
            <p className="text-xs text-muted-foreground">
              {properties.length} property{properties.length !== 1 ? 's' : ''} • {departments.length} department{departments.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.documentsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Published documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedTraining || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.inProgressTraining || 0} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Announcements</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.unreadAnnouncements || 0}</div>
            <p className="text-xs text-muted-foreground">Unread announcements</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/documents">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                View Documents
              </Button>
            </Link>
            <Link to="/training">
              <Button variant="outline" className="w-full justify-start">
                <GraduationCap className="w-4 h-4 mr-2" />
                View Training
              </Button>
            </Link>
            <Link to="/announcements">
              <Button variant="outline" className="w-full justify-start">
                <Megaphone className="w-4 h-4 mr-2" />
                View Announcements
              </Button>
            </Link>
            {(primaryRole === 'regional_admin' || primaryRole === 'regional_hr') && (
              <Link to="/admin/users">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Pending Items */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Items</CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats?.pendingApprovals ? (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">Pending Approvals</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.pendingApprovals} item{stats.pendingApprovals !== 1 ? 's' : ''} waiting
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            {stats?.unreadNotifications ? (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Megaphone className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Unread Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.unreadNotifications} new notification{stats.unreadNotifications !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            {stats?.unreadAnnouncements ? (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Megaphone className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="font-medium">Unread Announcements</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.unreadAnnouncements} new announcement{stats.unreadAnnouncements !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            {(!stats?.pendingApprovals && !stats?.unreadNotifications && !stats?.unreadAnnouncements) && (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>All caught up! No pending items.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentActivity && recentActivity.announcements && recentActivity.assignments && (recentActivity.announcements.length > 0 || recentActivity.assignments.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates and assignments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.announcements.map((announcement: any) => (
              <div key={announcement.id} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Megaphone className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">{announcement.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatRelativeTime(announcement.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {recentActivity.assignments.map((assignment: any) => (
              <div key={assignment.id} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex items-start gap-3">
                  <GraduationCap className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {assignment.training_modules?.title || 'Training Assignment'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Assigned {formatRelativeTime(assignment.created_at)}
                      {assignment.deadline && ` • Due ${formatRelativeTime(assignment.deadline)}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
