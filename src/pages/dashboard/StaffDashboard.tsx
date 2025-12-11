import { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed, type FeedItem } from '@/components/social/SocialFeed'
import type { User } from '@/lib/rbac'
import { EnhancedCard } from '@/components/ui/enhanced-card'
import { EnhancedButton } from '@/components/ui/enhanced-button'
import { EnhancedBadge } from '@/components/ui/enhanced-badge'
import { 
  Calendar, 
  Clock, 
  FileText, 
  Award,
  Bell,
  Target,
  Activity
} from 'lucide-react'

interface StaffDashboardProps {
  user: User
}

export function StaffDashboard({ user }: StaffDashboardProps) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for staff dashboard
    const mockFeedItems: FeedItem[] = [
      {
        id: '1',
        type: 'sop_update',
        author: {
          id: '2',
          name: 'Sarah Johnson',
          email: 'sarah.j@primehotels.com',
          role: 'department_head',
          department: 'Front Desk',
          property: 'Riyadh Downtown',
          permissions: []
        },
        title: 'Updated Guest Check-in Procedure',
        content: 'The guest check-in procedure has been updated to include new digital signature requirements. Please review and acknowledge by end of week.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        tags: ['front-desk', 'check-in', 'digital'],
        priority: 'high',
        reactions: { like: 12, love: 3, clap: 8 },
        comments: [
          {
            id: '1',
            author: {
              id: '3',
              name: 'Mike Wilson',
              email: 'mike.w@primehotels.com',
              role: 'staff',
              department: 'Front Desk',
              property: 'Riyadh Downtown',
              permissions: []
            },
            content: 'Thanks for the update! The digital signature process is much smoother now.',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
            reactions: { like: 5 }
          }
        ],
        actionButton: {
          text: 'Acknowledge SOP',
          onClick: () => console.log('Acknowledge SOP')
        }
      },
      {
        id: '2',
        type: 'training',
        author: {
          id: '3',
          name: 'Training Department',
          email: 'training@primehotels.com',
          role: 'property_hr',
          department: 'Human Resources',
          property: 'Riyadh Downtown',
          permissions: []
        },
        title: 'New Customer Service Training Available',
        content: 'Advanced customer service techniques training is now available. This 2-hour course covers handling difficult guests and upselling strategies.',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        tags: ['training', 'customer-service', 'mandatory'],
        priority: 'medium',
        reactions: { like: 8, clap: 4 },
        comments: [],
        actionButton: {
          text: 'Start Training',
          onClick: () => console.log('Start Training')
        }
      },
      {
        id: '3',
        type: 'announcement',
        author: {
          id: '4',
          name: 'Emily Wilson',
          email: 'emily.w@primehotels.com',
          role: 'property_manager',
          department: 'Management',
          property: 'Riyadh Downtown',
          permissions: []
        },
        title: 'Employee of the Month - Congratulations!',
        content: 'Congratulations to John Smith from Front Desk for being selected as Employee of the Month! Exceptional guest satisfaction scores and teamwork.',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        tags: ['achievement', 'recognition', 'front-desk'],
        priority: 'low',
        reactions: { like: 45, love: 20, clap: 30 },
        comments: [
          {
            id: '2',
            author: {
              id: '5',
              name: 'Lisa Chen',
              email: 'lisa.c@primehotels.com',
              role: 'staff',
              department: 'Housekeeping',
              property: 'Riyadh Downtown',
              permissions: []
            },
            content: 'Well deserved John! Always helpful and professional.',
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
            reactions: { like: 10 }
          }
        ]
      },
      {
        id: '4',
        type: 'task',
        author: {
          id: '1',
          name: 'System',
          email: 'system@primehotels.com',
          role: 'corporate_admin',
          department: 'IT',
          property: 'System',
          permissions: []
        },
        title: 'Daily Tasks Reminder',
        content: 'You have 3 tasks due today: Complete room inspection checklist, Update guest preferences, Review incident reports.',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        tags: ['tasks', 'daily', 'reminder'],
        priority: 'high',
        reactions: {},
        comments: [],
        actionButton: {
          text: 'View Tasks',
          onClick: () => console.log('View Tasks')
        }
      },
      {
        id: '5',
        type: 'hr_reminder',
        author: {
          id: '3',
          name: 'HR Department',
          email: 'hr@primehotels.com',
          role: 'property_hr',
          department: 'Human Resources',
          property: 'Riyadh Downtown',
          permissions: []
        },
        title: 'Timesheet Submission Reminder',
        content: 'Please submit your timesheet for this week by Friday 5 PM. Ensure all overtime is properly documented.',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        tags: ['hr', 'timesheet', 'deadline'],
        priority: 'medium',
        reactions: { like: 3 },
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
      author: user,
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
            <EnhancedCard key={i} className="loading-skeleton h-32">
              <div className="animate-pulse bg-muted rounded-md h-full"></div>
            </EnhancedCard>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <EnhancedCard key={i} className="loading-skeleton h-64">
              <div className="animate-pulse bg-muted rounded-md h-full"></div>
            </EnhancedCard>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <EnhancedCard variant="glass" className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 gradient-text-navy">Welcome back, {user.email}!</h1>
            <p className="text-gray-600 mt-1">Here's what's happening at Prime Hotels today</p>
          </div>
          <div className="flex items-center gap-3">
            <EnhancedBadge variant="gold" size="lg">
              {user.role.replace('_', ' ').toUpperCase()}
            </EnhancedBadge>
            <EnhancedButton variant="outline" size="sm" icon={<Bell />}>
              Notifications
            </EnhancedButton>
          </div>
        </div>
      </EnhancedCard>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedCard variant="elevated" padding="lg" hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Tasks</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
              <p className="text-xs text-green-600 mt-1">+2 from yesterday</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </EnhancedCard>

        <EnhancedCard variant="elevated" padding="lg" hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Training Progress</p>
              <p className="text-2xl font-bold text-gray-900">75%</p>
              <Progress value={75} className="mt-2" />
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Award className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </EnhancedCard>

        <EnhancedCard variant="elevated" padding="lg" hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
              <p className="text-xs text-gray-500 mt-1">Next: Team Meeting</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </EnhancedCard>

        <EnhancedCard variant="elevated" padding="lg" hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Performance Score</p>
              <p className="text-2xl font-bold text-gray-900">92%</p>
              <p className="text-xs text-orange-600 mt-1">Above average</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </EnhancedCard>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <EnhancedCard variant="gold" padding="lg" hover clickable>
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-hotel-gold/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-hotel-gold" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Clock In/Out</h3>
            <p className="text-sm text-gray-600 mb-4">Track your work hours</p>
            <EnhancedButton variant="navy" size="sm" fullWidth>
              Time Tracking
            </EnhancedButton>
          </div>
        </EnhancedCard>

        <EnhancedCard variant="glass" padding="lg" hover clickable>
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Documents</h3>
            <p className="text-sm text-gray-600 mb-4">Access company documents</p>
            <EnhancedButton variant="primary" size="sm" fullWidth>
              View Documents
            </EnhancedButton>
          </div>
        </EnhancedCard>

        <EnhancedCard variant="default" padding="lg" hover clickable>
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Award className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Training</h3>
            <p className="text-sm text-gray-600 mb-4">Complete your training modules</p>
            <EnhancedButton variant="outline" size="sm" fullWidth>
              Continue Learning
            </EnhancedButton>
          </div>
        </EnhancedCard>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="feed">Activity Feed</TabsTrigger>
          <TabsTrigger value="tasks">My Tasks</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-4">
          <EnhancedCard variant="default" padding="lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <SocialFeed 
              user={user}
              feedItems={feedItems}
              onReact={handleReact}
              onComment={handleComment}
              onShare={handleShare}
            />
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <EnhancedCard variant="default" padding="lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Tasks</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  <div>
                    <p className="font-medium text-gray-900">Complete safety training module</p>
                    <p className="text-sm text-gray-500">Due today at 5:00 PM</p>
                  </div>
                </div>
                <EnhancedBadge variant="destructive" size="sm">Urgent</EnhancedBadge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                  <div>
                    <p className="font-medium text-gray-900">Review updated SOP documents</p>
                    <p className="text-sm text-gray-500">Due tomorrow</p>
                  </div>
                </div>
                <EnhancedBadge variant="warning" size="sm">High</EnhancedBadge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <div>
                    <p className="font-medium text-gray-900">Submit weekly timesheet</p>
                    <p className="text-sm text-gray-500">Due Friday</p>
                  </div>
                </div>
                <EnhancedBadge variant="success" size="sm">Normal</EnhancedBadge>
              </div>
            </div>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <EnhancedCard variant="default" padding="lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">This Week's Schedule</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg">
                <div>
                  <p className="font-medium text-gray-900">Morning Shift</p>
                  <p className="text-sm text-gray-500">Today, 7:00 AM - 3:00 PM</p>
                </div>
                <EnhancedBadge variant="default" size="sm">Today</EnhancedBadge>
              </div>
              <div className="flex items-center justify-between p-3 border-l-4 border-gray-300 bg-gray-50 rounded-r-lg">
                <div>
                  <p className="font-medium text-gray-900">Team Meeting</p>
                  <p className="text-sm text-gray-500">Tomorrow, 10:00 AM - 11:00 AM</p>
                </div>
                <EnhancedBadge variant="secondary" size="sm">Meeting</EnhancedBadge>
              </div>
              <div className="flex items-center justify-between p-3 border-l-4 border-green-500 bg-green-50 rounded-r-lg">
                <div>
                  <p className="font-medium text-gray-900">Training Session</p>
                  <p className="text-sm text-gray-500">Wednesday, 2:00 PM - 4:00 PM</p>
                </div>
                <EnhancedBadge variant="success" size="sm">Training</EnhancedBadge>
              </div>
            </div>
          </EnhancedCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
