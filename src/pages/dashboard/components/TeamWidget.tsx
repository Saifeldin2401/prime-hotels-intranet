import { motion } from 'framer-motion'
import { Users, Award, UserX } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { useDepartmentStaff } from '@/hooks/useDepartmentStaff'
import { useProfiles } from '@/hooks/useUsers'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from "react-i18next";

export function TeamWidget() {
  const { profile } = useAuth()
  const { currentProperty } = useProperty()
  const navigate = useNavigate()
  
  // Get department staff if department exists
  const { staff: departmentStaff, loading: isLoadingDept } = useDepartmentStaff(
    profile?.department_id,
    currentProperty?.id
  )
  
  // Fallback to all profiles if no department
  const { data: allProfiles, isLoading: isLoadingAll } = useProfiles({
    property_id: currentProperty?.id,
    limit: 10
  })
  
  const isLoading = isLoadingDept || isLoadingAll
  const teamMembers = departmentStaff?.length > 0 ? departmentStaff : (allProfiles || [])
  
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

  const onlineCount = teamMembers.filter((_: any, i: number) => getStatus(i) === 'online').length

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
              {currentProperty?.name || 'Your team'} - {teamMembers.length} members
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/directory')}>
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px]">
          <div className="space-y-3 pr-4">
            {teamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserX className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No team members found</p>
              </div>
            ) : (
              teamMembers.map((member: any, index: number) => {
                const status = getStatus(index)
                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-primary/20 hover:shadow-md transition-all group bg-white cursor-pointer"
                    onClick={() => navigate(`/directory/${member.id}`)}
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white text-sm font-semibold">
                          {member.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                        statusColors[status]
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                          {member.full_name}
                        </p>
                        {index === 0 && member.role === 'department_head' && (
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
                {new Set(teamMembers.map((m: any) => m.department_id)).size}
              </div>
              <div className="text-xs text-muted-foreground">Departments</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

