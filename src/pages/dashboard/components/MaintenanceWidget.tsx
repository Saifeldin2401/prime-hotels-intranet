import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useAssignedMaintenanceTickets } from '@/hooks/useMaintenanceTickets'
import { cn } from '@/lib/utils'
import { differenceInHours, format } from 'date-fns'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { AlertTriangle, ArrowRight, CheckCircle2, Clock as ClockIcon, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'

const maintenanceSkeletonKeys = ['maintenance-skeleton-1', 'maintenance-skeleton-2', 'maintenance-skeleton-3']

const priorityConfig: Record<string, { color: string; bg: string; label: string; border: string }> = {
  urgent: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', label: 'Urgent' },
  high: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'High' },
  medium: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Medium' },
  low: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Low' },
}

const statusConfig: Record<string, { icon; color: string; bg: string; border: string; label: string }> = {
  open: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', label: 'Open' },
  in_progress: { icon: ClockIcon, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', label: 'In Progress' },
  resolved: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'Resolved' },
}

export function MaintenanceWidget() {
  const { data: assignedTickets, isLoading } = useAssignedMaintenanceTickets()
  const tickets = (assignedTickets || []).filter((ticket) => ticket.status === 'open').slice(0, 5)

  if (isLoading) {
    return (
      <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white p-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="space-y-4">
          {maintenanceSkeletonKeys.map((skeletonKey) => <Skeleton key={skeletonKey} className="h-20 w-full rounded-xl" />)}
        </div>
      </Card>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6 px-6 relative z-10 bg-white border-b border-slate-100/50">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg">
                <Wrench className="w-5 h-5" />
              </div>
              <Link to="/maintenance" className="hover:text-rose-500 transition-colors">
                Maintenance
              </Link>
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500 mt-1">
              Open tickets requiring attention
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-slate-500 hover:text-slate-900 font-semibold h-8 rounded-full px-4 hover:bg-slate-100 transition-colors">
            <Link to="/maintenance">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-0 flex-1 relative bg-slate-50/30">
          <ScrollArea className="h-[340px] px-6 pb-6 pt-4">
            <div className="space-y-3">
              {tickets?.length === 0 ? (
                <m.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 flex flex-col items-center justify-center h-full"
                >
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-emerald-100 shadow-sm">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-slate-800 font-bold text-lg">All systems operational</p>
                  <p className="text-sm text-slate-500 font-medium mt-1">No open maintenance tickets</p>
                </m.div>
              ) : (
                tickets?.map((ticket, index: number) => {
                  const priority = priorityConfig[ticket.priority] || priorityConfig.medium
                  const StatusIcon = statusConfig[ticket.status]?.icon || AlertTriangle
                  const hoursOpen = differenceInHours(new Date(), new Date(ticket.created_at))
                  const isOverdue = hoursOpen > 48 && ticket.priority !== 'low'

                  return (
                    <m.div
                      key={ticket.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, ease: "easeOut" }}
                    >
                      <Link
                        to={`/maintenance/${ticket.id}`}
                        className={cn(
                          "group flex items-start gap-4 p-4 rounded-2xl border bg-white shadow-[0_2px_8px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_16px_rgb(0,0,0,0.04)] transition-all ease-out hover:-translate-y-0.5",
                          isOverdue ? "border-rose-100 hover:border-rose-300" : "border-slate-100 hover:border-slate-300"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border",
                          statusConfig[ticket.status]?.bg || 'bg-slate-50',
                          statusConfig[ticket.status]?.border || 'border-slate-100'
                        )}>
                          <StatusIcon className={cn("w-5 h-5", statusConfig[ticket.status]?.color || 'text-slate-500')} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <p className="font-bold text-[15px] text-slate-800 line-clamp-1 group-hover:text-rose-600 transition-colors">
                              {ticket.title}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] uppercase tracking-wider font-bold h-6 px-2 shrink-0 border",
                                priority.bg, priority.color, priority.border
                              )}
                            >
                              {priority.label}
                            </Badge>
                          </div>

                          <p className="text-sm font-medium text-slate-500 line-clamp-1 mb-2">
                            {ticket.location} <span className="text-slate-300 mx-1">•</span> {ticket.category}
                          </p>

                          <div className="flex items-center gap-3 text-xs font-semibold">
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-500">
                              <ClockIcon className="w-3.5 h-3.5" />
                              {hoursOpen < 24 ? `${hoursOpen}h open` : format(new Date(ticket.created_at), 'MMM d')}
                            </span>
                            {isOverdue && (
                              <span className="text-rose-600 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Overdue
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </m.div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </LazyMotion>
  )
}
