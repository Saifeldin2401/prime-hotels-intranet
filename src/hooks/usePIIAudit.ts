import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PIIAccessLog, PIIAccessSummary } from '@/lib/types'

// PII Access Logs Hooks
export function usePIIAccessLogs(filters?: {
  user_id?: string
  resource_type?: string
  access_type?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['pii-access-logs', filters],
    queryFn: async () => {
      // Use explicit FK hints to avoid ambiguous relationship error
      let query = supabase
        .from('pii_access_logs')
        .select(`
          *,
          accessed_by_profile:profiles!pii_access_logs_accessed_by_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })

      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id)
      }
      if (filters?.resource_type) {
        query = query.eq('resource_type', filters.resource_type)
      }
      if (filters?.access_type) {
        query = query.eq('access_type', filters.access_type)
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) throw error
      return data as PIIAccessLog[]
    }
  })
}

// Compute summary client-side instead of using non-existent RPC
export function usePIIAccessSummary(dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ['pii-access-summary', dateRange],
    queryFn: async (): Promise<PIIAccessSummary> => {
      // Build query with date filters
      let query = supabase
        .from('pii_access_logs')
        .select('id, accessed_by, pii_fields, access_type, resource_type')

      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from)
      }
      if (dateRange?.to) {
        query = query.lte('created_at', dateRange.to)
      }

      const { data, error } = await query

      if (error) throw error

      // Compute summary from data
      const logs = data || []
      const uniqueUsers = new Set(logs.map(l => l.accessed_by))
      const allPiiFields = logs.flatMap(l => l.pii_fields || [])
      const sensitiveFields = [...new Set(allPiiFields)]

      // High risk = delete or export operations, or accessing salary/ssn fields
      const highRiskAccesses = logs.filter(l =>
        l.access_type === 'delete' ||
        l.access_type === 'export' ||
        (l.pii_fields || []).some((f: string) =>
          f.toLowerCase().includes('salary') ||
          f.toLowerCase().includes('ssn') ||
          f.toLowerCase().includes('national_id')
        )
      )

      return {
        total_accesses: logs.length,
        unique_users: uniqueUsers.size,
        sensitive_fields_accessed: sensitiveFields,
        high_risk_accesses: highRiskAccesses.map(l => l.id)
      }
    }
  })
}

export function useCreatePIIAccessLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (logData: Omit<PIIAccessLog, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('pii_access_logs')
        .insert(logData)
        .select()
        .single()

      if (error) throw error
      return data as PIIAccessLog
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pii-access-logs'] })
      queryClient.invalidateQueries({ queryKey: ['pii-access-summary'] })
    }
  })
}

export function useApprovePIIAccess() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ logId, approvedBy, justification }: {
      logId: string
      approvedBy: string
      justification: string
    }) => {
      const { data, error } = await supabase
        .from('pii_access_logs')
        .update({
          approved_by: approvedBy,
          justification
        })
        .eq('id', logId)
        .select()
        .single()

      if (error) throw error
      return data as PIIAccessLog
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pii-access-logs'] })
      queryClient.invalidateQueries({ queryKey: ['pii-access-summary'] })
    }
  })
}

export function useDeletePIIAccessLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase
        .from('pii_access_logs')
        .delete()
        .eq('id', logId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pii-access-logs'] })
      queryClient.invalidateQueries({ queryKey: ['pii-access-summary'] })
    }
  })
}

// Export as CSV client-side instead of using non-existent RPC
export function useExportPIIAccessLogs() {
  return useMutation({
    mutationFn: async (filters?: {
      user_id?: string
      resource_type?: string
      access_type?: string
      date_from?: string
      date_to?: string
    }) => {
      // Fetch all data matching filters
      let query = supabase
        .from('pii_access_logs')
        .select(`
          id, created_at, accessed_by, user_id, resource_type, resource_id, 
          access_type, pii_fields, ip_address, user_agent, session_id, justification,
          accessed_by_profile:profiles!pii_access_logs_accessed_by_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })

      if (filters?.user_id) query = query.eq('user_id', filters.user_id)
      if (filters?.resource_type) query = query.eq('resource_type', filters.resource_type)
      if (filters?.access_type) query = query.eq('access_type', filters.access_type)
      if (filters?.date_from) query = query.gte('created_at', filters.date_from)
      if (filters?.date_to) query = query.lte('created_at', filters.date_to)

      const { data, error } = await query
      if (error) throw error

      // Generate CSV
      const headers = ['Date', 'User', 'Email', 'Resource Type', 'Resource ID', 'Access Type', 'PII Fields', 'IP Address', 'Justification']
      const rows = (data || []).map(log => [
        new Date(log.created_at).toISOString(),
        log.accessed_by_profile?.full_name || 'Unknown',
        log.accessed_by_profile?.email || '',
        log.resource_type,
        log.resource_id,
        log.access_type,
        (log.pii_fields || []).join('; '),
        log.ip_address,
        log.justification || ''
      ])

      const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')

      // Trigger download
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pii_access_logs_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      return data
    }
  })
}

// Helper function to log PII access automatically
export function logPIIAccess(accessData: {
  user_id: string
  accessed_by: string
  resource_type: PIIAccessLog['resource_type']
  resource_id: string
  access_type: PIIAccessLog['access_type']
  pii_fields: string[]
  ip_address: string
  user_agent: string
  session_id: string
  justification?: string
}) {
  return supabase.from('pii_access_logs').insert({
    ...accessData,
    justification: accessData.justification || null
  })
}
