import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wrench, ArrowRight, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAssignedMaintenanceTickets } from '@/hooks/useMaintenanceTickets'
import { cn } from '@/lib/utils'
import { format, differenceInHours } from 'date-fns'

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  urgent: { color: 'text-red-600', bg: 'bg-red-50', label: 'Urgent' },
  high: { color: 'text-orange-600', bg: 'bg-orange-50', label: 'High' },
  medium: { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Medium' },
  low: { color: 'text-blue-600', bg: 'bg-blue-50', label: 'Low' },
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  open: { icon: AlertTriangle, color: 'text-red-500', label: 'Open' },
  in_progress: { icon: Clock, color: 'text-amber-500', label: 'In Progress' },
  resolved: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Resolved' },
}

export function MaintenanceWidget() {
  const { data: assignedTickets, isLoading } = useAssignedMaintenanceTickets()
  const tickets = (assignedTickets || []).filter((ticket: any) => ticket.status === 'open').slice(0, 5)

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full border-0 shadow-lg bg-gradient-to-b from-white to-slate-50/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link to="/maintenance" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Wrench className="w-5 h-5 text-red-500" />
              Maintenance
            </Link>
          </CardTitle>
          <CardDescription>Open tickets requiring attention</CardDescription>
        </div>
        <Link to="/maintenance">
          <Button variant="ghost" size="sm" className="gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px]">
          <div className="space-y-2 pr-4">
            {tickets?.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-muted-foreground font-medium">All systems operational</p>
                <p className="text-sm text-muted-foreground">No open maintenance tickets</p>
              </div>
            ) : (
              tickets?.map((ticket: any, index: number) => {
                const priority = priorityConfig[ticket.priority] || priorityConfig.medium
                const StatusIcon = statusConfig[ticket.status]?.icon || AlertTriangle
                const hoursOpen = differenceInHours(new Date(), new Date(ticket.created_at))
                
                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link 
                      to={`/maintenance/${ticket.id}`}
                      className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-red-200 hover:shadow-md transition-all group bg-white"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        priority.bg
                      )}>
                        <StatusIcon className={cn("w-5 h-5", priority.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                            {ticket.title}
                          </p>
                          <Badge 
                            variant="secondary" 
                            className={cn("text-[10px] h-5", priority.bg, priority.color)}
                          >
                            {priority.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {ticket.location} • {ticket.category}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {hoursOpen < 24 
                              ? `${hoursOpen}h ago` 
                              : format(new Date(ticket.created_at), 'MMM d')}
                          </span>
                          {hoursOpen > 48 && ticket.priority !== 'low' && (
                            <span className="text-red-500 font-medium">Overdue</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
