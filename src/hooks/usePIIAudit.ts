import { supabase } from '@/lib/supabase'
import type { PIIAccessLog, PIIAccessSummary } from '@/lib/types'
import type { Database } from '@/types/database.generated'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

type PiiLogRow = Database['public']['Views']['pii_access_logs_v']['Row']
type ProfileSnapshot = { full_name?: string; email?: string } | null

/**
 * pii_access_logs_v is a view over system_events (see log_pii_access RPC), not a
 * real "pii access log" table -- its columns are actor_id/target_user_id/
 * fields_accessed rather than the accessed_by/pii_fields/resource_id/ip_address/
 * user_agent/session_id shape the shared PIIAccessLog interface (lib/types/compliance.ts)
 * still declares. resource_id/ip_address/user_agent/session_id were never captured by
 * this consolidated view, so we map what the view actually has and leave those as ''.
 * The `user`/`accessed_by_profile`/`approved_by_profile` relations only carry a
 * {full_name, email} snapshot (not a full Profile row), so we leave those optional
 * fields unset rather than fabricate a Profile.
 */
function mapPiiLogRow(row: PiiLogRow): PIIAccessLog {
  return {
    id: row.id || '',
    user_id: row.user_id || row.target_user_id || '',
    accessed_by: row.actor_id || '',
    resource_type: (row.resource_type || 'profile') as PIIAccessLog['resource_type'],
    resource_id: row.user_id || row.target_user_id || '',
    access_type: (row.access_type || 'view') as PIIAccessLog['access_type'],
    pii_fields: row.fields_accessed || [],
    ip_address: '',
    user_agent: '',
    session_id: '',
    justification: row.justification,
    approved_by: row.approved_by,
    created_at: row.created_at || ''
  }
}

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
      // pii_access_logs_v already exposes accessed_by_profile / user /
      // approved_by_profile as JSON columns (a view cannot carry FK embeds).
      let query = supabase
        .from('pii_access_logs_v')
        .select('*')
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
      return (data || []).map(mapPiiLogRow)
    }
  })
}

export function usePIIAccessSummary(dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ['pii-access-summary', dateRange],
    queryFn: async (): Promise<PIIAccessSummary> => {
      let query = supabase
        .from('pii_access_logs_v')
        .select('id, actor_id, fields_accessed, access_type, resource_type')

      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from)
      }
      if (dateRange?.to) {
        query = query.lte('created_at', dateRange.to)
      }

      const { data, error } = await query
      if (error) throw error

      const logs = data || []
      const uniqueUsers = new Set(logs.map(l => l.actor_id))
      const allPiiFields = logs.flatMap(l => l.fields_accessed || [])
      const sensitiveFields = [...new Set(allPiiFields)]

      const accessByType = logs.reduce((acc, log) => {
        const type = log.access_type || 'unknown'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const accessByResource = logs.reduce((acc, log) => {
        const type = log.resource_type || 'unknown'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const highRiskAccesses = logs.filter(l =>
        l.access_type === 'delete' ||
        l.access_type === 'export' ||
        (l.fields_accessed || []).some((f: string) =>
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
        // UI only needs .length; map the partial select into the shared shape rather than `as any`.
        high_risk_accesses: highRiskAccesses.map(row => mapPiiLogRow(row as PiiLogRow))
      }
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
      // pii_access_logs_v is a read-only view over system_events; approval data
      // is persisted into the underlying system_events.metadata jsonb.
      const { data: existing, error: fetchError } = await supabase
        .from('system_events')
        .select('metadata')
        .eq('id', logId)
        .eq('event_type', 'pii_access')
        .single()
      if (fetchError) throw fetchError

      const mergedMetadata = {
        ...((existing?.metadata as Record<string, unknown>) || {}),
        approved_by: approvedBy,
        justification,
        approved_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('system_events')
        .update({ metadata: mergedMetadata })
        .eq('id', logId)
        .eq('event_type', 'pii_access')
        .select()
        .single()

      if (error) throw error
      return data as unknown as PIIAccessLog
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
      // pii_access_logs_v is a read-only view over system_events; delete the
      // underlying row directly, same pattern as useApprovePIIAccess's update.
      const { error } = await supabase
        .from('system_events')
        .delete()
        .eq('id', logId)
        .eq('event_type', 'pii_access')

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
        .from('pii_access_logs_v')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.user_id) query = query.eq('user_id', filters.user_id)
      if (filters?.resource_type) query = query.eq('resource_type', filters.resource_type)
      if (filters?.access_type) query = query.eq('access_type', filters.access_type)
      if (filters?.date_from) query = query.gte('created_at', filters.date_from)
      if (filters?.date_to) query = query.lte('created_at', filters.date_to)

      const { data, error } = await query
      if (error) throw error

      // Simple CSV generation
      const headers = ['Timestamp', 'Accessed By', 'Target User', 'Resource Type', 'Access Type', 'Fields', 'Justification']
      const rows = (data || []).map(log => {
        const accessedByProfile = log.accessed_by_profile as ProfileSnapshot
        return [
          log.created_at,
          accessedByProfile?.full_name || log.actor_id,
          log.user_id,
          log.resource_type,
          log.access_type,
          (log.fields_accessed || []).join(', '),
          log.justification || ''
        ]
      })

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
