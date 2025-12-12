import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMyMaintenanceTickets, useAssignedMaintenanceTickets, useUpdateMaintenanceTicket, useCompleteMaintenanceTicket } from '@/hooks/useMaintenanceTickets'
import { useMaintenanceStats } from '@/hooks/useMaintenanceStats'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Wrench,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Zap,
  Droplets,
  Thermometer,
  Tv,
  Calendar,
  User
} from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import type { MaintenanceTicket } from '@/lib/types'
import { cn } from '@/lib/utils'
import emptyStateImage from '@/assets/maintenance-empty.png'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { useTranslation } from 'react-i18next'

const priorityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200 border-orange-200 dark:border-orange-800',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-200 dark:border-red-800',
  critical: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 animate-pulse'
}

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  pending_parts: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  resolved: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  completed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 line-through'
}

const categoryIcons: Record<string, any> = {
  plumbing: Droplets,
  electrical: Zap,
  hvac: Thermometer,
  internet: Tv,
  tv: Tv,
  furniture: Wrench,
  appliance: Wrench,
  structural: Wrench,
  cosmetic: Wrench,
  safety: AlertTriangle,
  general: Wrench,
  other: Wrench
}

export default function MaintenanceDashboard() {
  const { roles } = useAuth()
  const { t, i18n } = useTranslation('maintenance')
  const isRTL = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const { data: myTickets, isLoading: myLoading, error: myError } = useMyMaintenanceTickets()
  const { data: assignedTickets, isLoading: assignedLoading, error: assignedError } = useAssignedMaintenanceTickets()
  const { data: stats } = useMaintenanceStats()
  const updateMutation = useUpdateMaintenanceTicket()
  const completeMutation = useCompleteMaintenanceTicket()

  const userRole = roles[0]?.role
  const canManageTickets = ['regional_admin', 'regional_hr', 'property_manager', 'department_head'].includes(userRole || '')

  const filteredTickets = (tickets: MaintenanceTicket[]) => {
    return tickets?.filter(ticket => {
      const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter
      return matchesSearch && matchesStatus && matchesPriority
    })
  }

  const handleStatusUpdate = (ticketId: string, newStatus: string) => {
    updateMutation.mutate({ ticketId, updates: { status: newStatus as MaintenanceTicket['status'] } })
  }

  const handleComplete = (ticketId: string) => {
    completeMutation.mutate({ ticketId })
  }

  const TicketCard = ({ ticket, showActions = false }: { ticket: MaintenanceTicket, showActions?: boolean }) => {
    const Icon = categoryIcons[ticket.category] || Wrench

    return (
      <div className={cn("bg-card border border-border rounded-lg p-4 group hover:shadow-md transition-shadow duration-200", isRTL ? "border-r-4 border-r-primary/50" : "border-l-4 border-l-primary/50")}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 gap-3">
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-foreground">{ticket.title}</h4>
              <p className="text-xs text-gray-600 font-mono">#{ticket.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={cn("text-[10px] uppercase tracking-wider font-semibold border", priorityColors[ticket.priority])}>
              {t(ticket.priority)}
            </Badge>
            <Badge className={cn("text-[10px]", statusColors[ticket.status] || statusColors.closed)}>
              {t(ticket.status)}
            </Badge>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{ticket.description}</p>

        <div className="flex items-center justify-between text-xs text-gray-600 mt-auto pt-4 border-t border-border/50">
          <div className="flex items-center space-x-3 gap-3">
            {ticket.property && (
              <span className="flex items-center gap-1 font-medium text-foreground"><HomeIcon className="w-3 h-3" /> {ticket.property.name}</span>
            )}
            {ticket.room_number && (
              <span className="bg-accent/50 px-1.5 py-0.5 rounded">{t('room')} {ticket.room_number}</span>
            )}
          </div>
          <div className="flex items-center space-x-1 gap-1">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(ticket.created_at), 'MMM dd')}</span>
          </div>
        </div>

        {showActions && canManageTickets && (
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2">
            {ticket.status === 'open' && (
              <Button
                size="sm"
                className="flex-1 bg-primary/90 hover:bg-primary h-8 text-xs"
                onClick={(e) => { e.stopPropagation(); handleStatusUpdate(ticket.id, 'in_progress'); }}
                disabled={updateMutation.isPending}
              >
                {t('accept')}
              </Button>
            )}
            {ticket.status === 'in_progress' && (
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs"
                onClick={(e) => { e.stopPropagation(); handleComplete(ticket.id); }}
                disabled={completeMutation.isPending}
              >
                {t('complete')}
              </Button>
            )}
            <Button
              size="sm"
              className={cn("h-8 text-xs bg-hotel-gold text-white hover:bg-hotel-gold-dark border border-hotel-gold rounded-md transition-colors", ticket.status !== 'open' && ticket.status !== 'in_progress' ? "w-full" : "w-auto")}
              onClick={() => navigate(`/maintenance/tickets/${ticket.id}`)}
            >
              {t('view')}
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Only show full loading state if initial load and no error
  if ((myLoading || assignedLoading) && !myError && !assignedError) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title={t('dashboard.title')} description={t('dashboard.loading')} />
        <TableSkeleton rows={4} columns={4} showHeaders={false} />
      </div>
    )
  }

  const HomeIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  )

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('dashboard.title')}</h1>
          <p className="text-gray-600 mt-1">{t('dashboard.description')}</p>
        </div>
        <Button onClick={() => navigate('/maintenance/submit')} className="bg-hotel-gold text-white hover:bg-hotel-gold-dark shadow-sm rounded-md transition-colors">
          <Plus className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
          {t('new_ticket')}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card border border-border p-6 rounded-lg relative overflow-hidden shadow-sm">
          <div className={cn("absolute top-0 p-4 opacity-5", isRTL ? "left-0" : "right-0")}>
            <Wrench className="w-24 h-24" />
          </div>
          <p className="text-sm font-medium text-gray-600">{t('dashboard.my_active_tickets')}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{myTickets?.length || 0}</span>
            <span className="text-xs text-gray-600 font-medium">{t('dashboard.total_submitted')}</span>
          </div>
        </div>

        {canManageTickets && (
          <>
            <div className="bg-card border border-border p-6 rounded-lg relative overflow-hidden shadow-sm">
              <div className={cn("absolute top-0 p-4 opacity-5", isRTL ? "left-0" : "right-0")}>
                <User className="w-24 h-24" />
              </div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.assigned_me')}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{assignedTickets?.length || 0}</span>
                <span className="text-xs text-orange-600 font-medium">{stats?.inProgress || 0} {t('dashboard.in_progress')}</span>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-lg relative overflow-hidden shadow-sm">
              <div className={cn("absolute top-0 p-4 opacity-5", isRTL ? "left-0" : "right-0")}>
                <AlertTriangle className="w-24 h-24" />
              </div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.critical_issues')}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-destructive">{(stats?.critical || 0) + (stats?.urgent || 0)}</span>
                <span className="text-xs text-destructive font-medium">{t('dashboard.requires_attention')}</span>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-lg relative overflow-hidden shadow-sm">
              <div className={cn("absolute top-0 p-4 opacity-5", isRTL ? "left-0" : "right-0")}>
                <Clock className="w-24 h-24" />
              </div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.avg_resolution')}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{stats?.avgResolutionTime || 0}</span>
                <span className="text-xs text-gray-600 font-medium">{t('dashboard.days')}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters & Content */}
      <div className="space-y-4">
        <div className="bg-card border border-border p-4 rounded-lg flex flex-col md:flex-row gap-4 items-center shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className={cn("absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4", isRTL ? "right-3" : "left-3")} />
            <Input
              placeholder={t('dashboard.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn("bg-background border-input focus:border-primary transition-all", isRTL ? "pr-10" : "pl-10")}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40 bg-background border-input">
              <SelectValue placeholder={t('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_status')}</SelectItem>
              <SelectItem value="open">{t('dashboard.open')}</SelectItem>
              <SelectItem value="in_progress">{t('dashboard.in_progress')}</SelectItem>
              <SelectItem value="resolved">{t('dashboard.resolved')}</SelectItem>
              <SelectItem value="closed">{t('dashboard.closed')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full md:w-40 bg-background border-input">
              <SelectValue placeholder={t('priority')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_priority')}</SelectItem>
              <SelectItem value="critical">{t('critical')}</SelectItem>
              <SelectItem value="urgent">{t('urgent')}</SelectItem>
              <SelectItem value="high">{t('high')}</SelectItem>
              <SelectItem value="medium">{t('medium')}</SelectItem>
              <SelectItem value="low">{t('low')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="my-tickets" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-md">
            <TabsTrigger value="my-tickets" className="rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">{t('dashboard.my_tickets')} ({myTickets?.length || 0})</TabsTrigger>
            {canManageTickets && (
              <TabsTrigger value="assigned" className="rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">{t('dashboard.assigned_tickets')} ({assignedTickets?.length || 0})</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="my-tickets" className="space-y-4 animate-slide-up">
            {filteredTickets(myTickets || []).length === 0 ? (
              <div className="bg-card border border-border dashed border-2 p-12 rounded-lg text-center">
                <div className="w-48 h-48 mx-auto mb-6 opacity-90 transition-opacity duration-300">
                  <img
                    src={emptyStateImage}
                    alt="No tickets"
                    className="w-full h-full object-contain filter drop-shadow-sm"
                  />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">{t('dashboard.no_tickets')}</h3>
                <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                  {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? t('dashboard.adjust_filters')
                    : t('dashboard.no_tickets_submitted')
                  }
                </p>
                <Button onClick={() => navigate('/maintenance/submit')} className="rounded-md shadow-sm">
                  <Plus className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                  {t('new_ticket')}
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredTickets(myTickets || []).map(ticket => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </TabsContent>

          {canManageTickets && (
            <TabsContent value="assigned" className="space-y-4 animate-slide-up">
              {filteredTickets(assignedTickets || []).length === 0 ? (
                <div className="prime-card p-12 rounded-xl text-center border-dashed border-2 border-border/60">
                  <div className="w-48 h-48 mx-auto mb-6 opacity-90 hover:opacity-100 transition-opacity duration-300">
                    <img
                      src={emptyStateImage}
                      alt="No tickets"
                      className="w-full h-full object-contain filter drop-shadow-xl"
                    />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">{t('dashboard.no_assigned_tickets')}</h3>
                  <p className="text-gray-600 max-w-sm mx-auto">
                    {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                      ? t('dashboard.adjust_filters')
                      : t('dashboard.all_caught_up')
                    }
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredTickets(assignedTickets || []).map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} showActions />
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
