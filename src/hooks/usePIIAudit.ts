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
      let query = supabase
        .from('pii_access_logs')
        .select(`
          *,
          accessed_by_profile:profiles!pii_access_logs_actor_id_fkey(full_name, email),
          user:profiles!pii_access_logs_target_user_id_fkey(full_name, email),
          approved_by_profile:profiles!pii_access_logs_approved_by_fkey(full_name, email)
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

export function usePIIAccessSummary(dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ['pii-access-summary', dateRange],
    queryFn: async (): Promise<PIIAccessSummary> => {
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

      const logs = data || []
      const uniqueUsers = new Set(logs.map(l => l.accessed_by))
      const allPiiFields = logs.flatMap(l => l.pii_fields || [])
      const sensitiveFields = [...new Set(allPiiFields)]

      const accessByType = logs.reduce((acc, log) => {
        acc[log.access_type] = (acc[log.access_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const accessByResource = logs.reduce((acc, log) => {
        acc[log.resource_type] = (acc[log.resource_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

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
        access_by_type: accessByType,
        access_by_resource: accessByResource,
        recent_accesses: [], // Not used in summary cards
        high_risk_accesses: highRiskAccesses as any // The UI only needs .length usually
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

export function useExportPIIAccessLogs() {
  return useMutation({
    mutationFn: async (filters?: {
      user_id?: string
      resource_type?: string
      access_type?: string
      date_from?: string
      date_to?: string
    }) => {
      let query = supabase
        .from('pii_access_logs')
        .select(`
          *,
          accessed_by_profile:profiles!pii_access_logs_actor_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })

      if (filters?.user_id) query = query.eq('user_id', filters.user_id)
      if (filters?.resource_type) query = query.eq('resource_type', filters.resource_type)
      if (filters?.access_type) query = query.eq('access_type', filters.access_type)
      if (filters?.date_from) query = query.gte('created_at', filters.date_from)
      if (filters?.date_to) query = query.lte('created_at', filters.date_to)

      const { data, error } = await query
      if (error) throw error

      // Simple CSV generation
      const headers = ['Timestamp', 'Accessed By', 'Target User', 'Resource Type', 'Access Type', 'Fields', 'Justification', 'IP Address']
      const rows = (data || []).map(log => [
        log.created_at,
        log.accessed_by_profile?.full_name || log.accessed_by,
        log.user_id,
        log.resource_type,
        log.access_type,
        log.pii_fields?.join(', '),
        log.justification || '',
        log.ip_address || ''
      ])

      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `pii_access_logs_${new Date().toISOString()}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      return data
    }
  })
}

export async function logPIIAccess(accessData: {
  user_id: string
  resource_type: PIIAccessLog['resource_type']
  resource_id: string
  access_type: PIIAccessLog['access_type']
  pii_fields: string[]
  justification?: string
}) {
  return supabase.rpc('log_pii_access', {
    p_user_id: accessData.user_id,
    p_resource_type: accessData.resource_type,
    p_resource_id: accessData.resource_id,
    p_access_type: accessData.access_type,
    p_pii_fields: accessData.pii_fields,
    p_justification: accessData.justification
  })
}
