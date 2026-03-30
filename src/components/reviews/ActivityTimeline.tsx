import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare,
  Edit3,
  Send,
  RotateCcw,
  Ban
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

type ActivityType = 'created' | 'assigned' | 'acknowledged' | 'responded' | 'reanalyzed' | 'status_changed' | 'commented' | 'escalated' | 'closed'

interface Activity {
  id: string
  timestamp: string
  type: ActivityType
  user: {
    name: string
    role?: string
  }
  description: string
  metadata?: Record<string, string>
}

interface ActivityTimelineProps {
  reviewId?: string
  className?: string
}

const ACTIVITY_CONFIG: Record<ActivityType, { icon: typeof Clock; color: string; label: string }> = {
  created: { icon: Clock, color: 'bg-blue-500', label: 'Created' },
  assigned: { icon: UserPlus, color: 'bg-indigo-500', label: 'Assigned' },
  acknowledged: { icon: CheckCircle2, color: 'bg-green-500', label: 'Acknowledged' },
  responded: { icon: Send, color: 'bg-emerald-500', label: 'Responded' },
  reanalyzed: { icon: RotateCcw, color: 'bg-purple-500', label: 'Reanalyzed' },
  status_changed: { icon: Edit3, color: 'bg-orange-500', label: 'Status Changed' },
  commented: { icon: MessageSquare, color: 'bg-gray-500', label: 'Commented' },
  escalated: { icon: AlertCircle, color: 'bg-red-500', label: 'Escalated' },
  closed: { icon: Ban, color: 'bg-gray-500', label: 'Closed' },
}

// Map database action to activity type
function mapActionToType(action: string): ActivityType {
  const mapping: Record<string, ActivityType> = {
    'status_changed': 'status_changed',
    'responded': 'responded',
    'assigned': 'assigned',
    'assignment_updated': 'status_changed',
    'response_created': 'responded',
    'response_posted_externally': 'responded',
    'reanalyzed': 'reanalyzed',
    'escalated': 'escalated',
    'commented': 'commented',
    'closed': 'closed',
    'created': 'created',
  }
  return mapping[action] || 'status_changed'
}

// Generate description from activity data
function generateDescription(action: string, details: any): string {
  const descriptions: Record<string, (d: any) => string> = {
    'status_changed': (d) => `Status changed from "${d?.old_status || 'unknown'}" to "${d?.new_status || 'unknown'}"`,
    'responded': () => 'Review was responded to',
    'assigned': (d) => `Assigned to ${d?.responsibility_code || 'team member'}`,
    'assignment_updated': (d) => `Assignment status updated to "${d?.new_status || 'updated'}"`,
    'response_created': () => 'Response draft created',
    'response_posted_externally': () => 'Response posted externally',
    'reanalyzed': () => 'AI re-analysis requested',
    'escalated': () => 'Review escalated',
    'commented': () => 'New comment added',
    'closed': () => 'Review closed',
    'created': () => 'Review collected from platform',
  }
  return descriptions[action]?.(details) || `Action: ${action}`
}

export function ActivityTimeline({ reviewId, className }: ActivityTimelineProps) {
  // Fetch activities from backend
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['guest-review-activity', reviewId],
    queryFn: async () => {
      if (!reviewId) return []
      
      const { data, error } = await supabase
        .from('guest_review_activity')
        .select(`
          id,
          review_id,
          user_id,
          action,
          details,
          created_at,
          profiles:user_id (full_name, job_title)
        `)
        .eq('review_id', reviewId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return (data || []).map((item: any) => ({
        id: item.id,
        timestamp: item.created_at,
        type: mapActionToType(item.action),
        user: {
          name: item.profiles?.full_name || item.user_id ? 'User' : 'System',
          role: item.profiles?.job_title || (item.user_id ? 'Staff' : 'Automated'),
        },
        description: generateDescription(item.action, item.details),
        metadata: item.details ? Object.entries(item.details).reduce((acc: any, [key, value]) => {
          acc[key] = String(value)
          return acc
        }, {}) : undefined,
      })) as Activity[]
    },
    enabled: !!reviewId,
  })

  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {}
    
    activities.forEach((activity) => {
      const date = format(new Date(activity.timestamp), 'yyyy-MM-dd')
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(activity)
    })
    
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [activities])

  return (
    <Card className={cn("border-none shadow-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-6 pt-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Loading activity...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity yet</p>
                <p className="text-xs">Activity will be logged as actions are taken</p>
              </div>
            ) : (
              <>
                {groupedActivities.map(([date, dayActivities]) => (
                  <div key={date} className="mb-6 last:mb-0">
                    <div className="flex items-center gap-3 mb-4">
                      <Badge variant="secondary" className="text-xs font-medium">
                        {format(new Date(date), 'MMM d, yyyy')}
                      </Badge>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    
                    <div className="relative space-y-4">
                      {dayActivities.map((activity, index) => {
                        const config = ACTIVITY_CONFIG[activity.type]
                        const Icon = config.icon
                        
                        return (
                          <div key={activity.id} className="flex gap-4 relative">
                            {index < dayActivities.length - 1 && (
                              <div className="absolute left-4 top-8 w-px h-[calc(100%+16px)] bg-border" />
                            )}
                            
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                              config.color
                            )}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            
                            <div className="flex-1 pt-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium">{activity.description}</p>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <span>{activity.user.name}</span>
                                    {activity.user.role && (
                                      <>
                                        <span>•</span>
                                        <span>{activity.user.role}</span>
                                      </>
                                    )}
                                    <span>•</span>
                                    <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-[10px] flex-shrink-0">
                                  {config.label}
                                </Badge>
                              </div>
                              
                              {activity.metadata && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {Object.entries(activity.metadata).map(([key, value]) => (
                                    <span key={key} className="text-[10px] px-2 py-0.5 bg-muted rounded">
                                      {key}: {value}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
