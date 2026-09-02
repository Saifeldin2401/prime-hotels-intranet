import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Award, Users, UserX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface TeamWidgetMember {
  id: string
  full_name: string | null
  avatar_url: string | null
  job_title: string | null
  role?: string | null
  department_name?: string | null
  department_id?: string | null
}

export function TeamWidget() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // "Open Team Hub" below routes to /hr/team (MyTeam.tsx), which shows the current
  // user's direct reports (profiles.reporting_to = user.id) - NOT department/property
  // colleagues. Query the same direct-reports set here so this preview accurately
  // reflects what the button actually opens.
  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['team-widget-direct-reports', user?.id],
    queryFn: async (): Promise<TeamWidgetMember[]> => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          job_title,
          department:user_departments(departments(id, name))
        `)
        .eq('reporting_to', user.id)
        .eq('is_active', true)
        .order('full_name')
        .limit(10)

      if (error) throw error

      return (data || []).map((member) => {
        const deptEntry = Array.isArray(member.department) ? member.department[0] : member.department
        const dept = Array.isArray(deptEntry?.departments) ? deptEntry.departments[0] : deptEntry?.departments
        return {
          id: member.id,
          full_name: member.full_name,
          avatar_url: member.avatar_url,
          job_title: member.job_title,
          department_name: dept?.name || null,
          department_id: dept?.id || null,
        }
      })
    },
    enabled: !!user?.id
  })
  
  // Get online status (in real app, this would come from a presence system)
  const getStatus = (index: number) => {
    const statuses = ['online', 'busy', 'away', 'offline']
    return statuses[index % statuses.length]
  }

  const statusColors: Record<string, string> = {
    online: 'bg-emerald-500',
    busy: 'bg-red-500',
    away: 'bg-amber-500',
    offline: 'bg-slate-400'
  }

  const statusLabels: Record<string, string> = {
    online: 'Online',
    busy: 'Busy',
    away: 'Away',
    offline: 'Offline'
  }

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 mb-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24 mt-1" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const onlineCount = teamMembers.filter((_, i: number) => getStatus(i) === 'online').length

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-b from-white to-slate-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Team Members
            </CardTitle>
            <CardDescription>
              Your direct reports - {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/hr/team')}>
            Open Team Hub
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px]">
          <div className="space-y-3 pe-4">
            {teamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserX className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No team members found</p>
              </div>
            ) : (
              teamMembers.map((member, index: number) => {
                const status = getStatus(index)
                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-primary/20 hover:shadow-md transition-all group bg-white cursor-pointer"
                    onClick={() => navigate(`/profile/${member.id}`)}
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white text-sm font-semibold">
                          {member.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full border-2 border-white",
                        statusColors[status]
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                          {member.full_name}
                        </p>
                        {index === 0 && (member.role === 'department_head' || member.role === 'author' || member.role === 'training_manager') && (
                          <Award className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.job_title || member.role || 'Staff Member'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {member.department_name && (
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {member.department_name}
                          </Badge>
                        )}
                        <span className={cn(
                          "text-[10px] flex items-center gap-1",
                          status === 'online' && "text-emerald-600"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", statusColors[status])} />
                          {statusLabels[status]}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </ScrollArea>

        {/* Quick Stats */}
        {teamMembers.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{onlineCount}</div>
              <div className="text-xs text-muted-foreground">Online</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{teamMembers.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(teamMembers.map((m) => m.department_id)).size}
              </div>
              <div className="text-xs text-muted-foreground">Departments</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

