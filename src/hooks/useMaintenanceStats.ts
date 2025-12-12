import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function useMaintenanceStats() {
  const { user, roles, properties } = useAuth()

  return useQuery({
    queryKey: ['maintenance-stats', user?.id, properties],
    queryFn: async () => {
      if (!user?.id) return null

      const userRole = roles[0]?.role
      const canManageAll = ['regional_admin', 'regional_hr'].includes(userRole || '')

      let baseQuery = supabase.from('maintenance_tickets').select('*')

      // Filter based on user role
      if (!canManageAll && properties.length > 0) {
        baseQuery = baseQuery.in('property_id', properties.map(p => p.id))
      }

      const { data: tickets, error } = await baseQuery

      if (error) throw error

      // Calculate statistics
      const stats = {
        total: tickets?.length || 0,
        open: tickets?.filter(t => t.status === 'open').length || 0,
        inProgress: tickets?.filter(t => t.status === 'in_progress').length || 0,
        pendingParts: tickets?.filter(t => t.status === 'pending_parts').length || 0,
        completed: tickets?.filter(t => t.status === 'completed').length || 0,
        cancelled: tickets?.filter(t => t.status === 'cancelled').length || 0,
        
        // Priority breakdown
        critical: tickets?.filter(t => t.priority === 'critical').length || 0,
        urgent: tickets?.filter(t => t.priority === 'urgent').length || 0,
        high: tickets?.filter(t => t.priority === 'high').length || 0,
        medium: tickets?.filter(t => t.priority === 'medium').length || 0,
        low: tickets?.filter(t => t.priority === 'low').length || 0,
        
        // Category breakdown
        plumbing: tickets?.filter(t => t.category === 'plumbing').length || 0,
        electrical: tickets?.filter(t => t.category === 'electrical').length || 0,
        hvac: tickets?.filter(t => t.category === 'hvac').length || 0,
        appliance: tickets?.filter(t => t.category === 'appliance').length || 0,
        structural: tickets?.filter(t => t.category === 'structural').length || 0,
        cosmetic: tickets?.filter(t => t.category === 'cosmetic').length || 0,
        safety: tickets?.filter(t => t.category === 'safety').length || 0,
        other: tickets?.filter(t => t.category === 'other').length || 0,
        
        // Personal stats
        myTickets: tickets?.filter(t => t.reported_by_id === user.id).length || 0,
        assignedToMe: tickets?.filter(t => t.assigned_to_id === user.id).length || 0,
        
        // Performance metrics
        avgResolutionTime: 0, // Will calculate below
        overdueCount: 0, // Tickets older than 7 days and not completed
        costEstimate: 0, // Sum of estimated costs
      }

      // Calculate average resolution time (in days)
      const completedTickets = tickets?.filter(t => t.status === 'completed' && t.completed_at)
      if (completedTickets && completedTickets.length > 0) {
        const totalDays = completedTickets.reduce((sum, ticket) => {
          const created = new Date(ticket.created_at)
          const completed = new Date(ticket.completed_at!)
          return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        }, 0)
        stats.avgResolutionTime = Math.round(totalDays / completedTickets.length * 10) / 10
      }

      // Calculate overdue tickets (older than 7 days and not completed)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      stats.overdueCount = tickets?.filter(t => 
        t.status !== 'completed' && 
        t.status !== 'cancelled' && 
        new Date(t.created_at) < sevenDaysAgo
      ).length || 0

      // Calculate cost estimate
      stats.costEstimate = tickets?.reduce((sum, ticket) => {
        return sum + (ticket.estimated_cost || 0)
      }, 0) || 0

      return stats
    },
    enabled: !!user?.id
  })
}

export function useMaintenanceTrends(days = 30) {
  const { user, roles, properties } = useAuth()

  return useQuery({
    queryKey: ['maintenance-trends', days, user?.id, properties],
    queryFn: async () => {
      if (!user?.id) return null

      const userRole = roles[0]?.role
      const canManageAll = ['regional_admin', 'regional_hr'].includes(userRole || '')

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      let baseQuery = supabase
        .from('maintenance_tickets')
        .select('*')
        .gte('created_at', startDate.toISOString())

      // Filter based on user role
      if (!canManageAll && properties.length > 0) {
        baseQuery = baseQuery.in('property_id', properties.map(p => p.id))
      }

      const { data: tickets, error } = await baseQuery

      if (error) throw error

      // Group tickets by date
      const trends: Record<string, {
        date: string
        created: number
        completed: number
        critical: number
        urgent: number
      }> = {}
      const now = new Date()

      for (let i = 0; i < days; i++) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dateKey = date.toISOString().split('T')[0]
        trends[dateKey] = {
          date: dateKey,
          created: 0,
          completed: 0,
          critical: 0,
          urgent: 0,
        }
      }

      // Fill in actual data
      tickets?.forEach(ticket => {
        const createdDate = ticket.created_at.split('T')[0]
        if (trends[createdDate]) {
          trends[createdDate].created++
          if (ticket.priority === 'critical') trends[createdDate].critical++
          if (ticket.priority === 'urgent') trends[createdDate].urgent++
        }

        if (ticket.completed_at) {
          const completedDate = ticket.completed_at.split('T')[0]
          if (trends[completedDate]) {
            trends[completedDate].completed++
          }
        }
      })

      return Object.values(trends).reverse() // Return in chronological order
    },
    enabled: !!user?.id
  })
}
