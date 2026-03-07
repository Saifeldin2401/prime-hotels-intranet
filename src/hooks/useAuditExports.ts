/**
 * FORGE X: Enterprise Audit & Compliance Export System
 * React Hooks for Audit Export Management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import type {
  AuditExport,
  CreateExportResponse,
  ExportScope,
  AuditExportFormat,
  IntegrityVerificationResult,
} from '@/types/audit'
import { AUDIT_ERROR_MESSAGES } from '@/lib/auditConstants'

// Query keys for caching
const auditKeys = {
  all: ['audit-exports'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (filters: { status?: string; limit?: number; offset?: number }) =>
    [...auditKeys.lists(), filters] as const,
  details: () => [...auditKeys.all, 'detail'] as const,
  detail: (id: string) => [...auditKeys.details(), id] as const,
  dashboard: () => [...auditKeys.all, 'dashboard'] as const,
  piiSummary: (days?: number) => [...auditKeys.all, 'pii-summary', days] as const,
  anomalies: () => [...auditKeys.all, 'anomalies'] as const,
}

const AUDIT_EXPORT_TIMEOUT_MS = 15000

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutId: number | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise]) as T
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  }
}

// =============================================================================
// CREATE EXPORT
// =============================================================================

interface CreateExportParams {
  exportName: string
  description?: string
  scope: ExportScope
  format: AuditExportFormat
  retentionDays?: number
}

export function useCreateAuditExport() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateExportParams): Promise<CreateExportResponse> => {
      const { data, error } = await withTimeout(
        supabase.rpc('create_audit_export', {
          p_export_name: params.exportName,
          p_description: params.description || '',
          p_scope: params.scope,
          p_format: params.format,
          p_retention_days: params.retentionDays || 90,
        }),
        AUDIT_EXPORT_TIMEOUT_MS,
        `Audit export request timed out after ${Math.floor(AUDIT_EXPORT_TIMEOUT_MS / 1000)}s`
      )

      if (error) throw error
      return data as CreateExportResponse
    },
    onSuccess: (data) => {
      if (data.status === 'pending') {
        toast({
          title: 'Export Queued',
          description: `Estimated ${data.estimated_records.toLocaleString()} records will be exported.`,
        })
        queryClient.invalidateQueries({ queryKey: auditKeys.lists() })
      } else {
        toast({
          title: 'Export Failed',
          description: data.message,
          variant: 'destructive',
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Export Error',
        description: error.message || AUDIT_ERROR_MESSAGES.insufficient_permissions,
        variant: 'destructive',
      })
    },
  })
}

// =============================================================================
// LIST EXPORTS
// =============================================================================

interface ListExportsFilters {
  status?: string
  limit?: number
  offset?: number
}

export function useAuditExports(filters: ListExportsFilters = {}) {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: async (): Promise<AuditExport[]> => {
      const { data, error } = await supabase.rpc('list_audit_exports', {
        p_status: filters.status || null,
        p_limit: filters.limit || 50,
        p_offset: filters.offset || 0,
      })

      if (error) throw error
      return data as AuditExport[]
    },
    staleTime: 30000, // 30 seconds
  })
}

// =============================================================================
// GET EXPORT DETAILS
// =============================================================================

export function useAuditExportDetails(exportId: string | null) {
  return useQuery({
    queryKey: auditKeys.detail(exportId || ''),
    queryFn: async (): Promise<AuditExport | null> => {
      if (!exportId) return null

      const { data, error } = await supabase.rpc('get_audit_export_details', {
        p_export_id: exportId,
      })

      if (error) throw error
      return data?.[0] as AuditExport || null
    },
    enabled: !!exportId,
    staleTime: 10000,
  })
}

// =============================================================================
// VERIFY EXPORT INTEGRITY
// =============================================================================

export function useVerifyExportIntegrity() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (exportId: string): Promise<IntegrityVerificationResult> => {
      const { data, error } = await supabase.rpc('verify_audit_export_integrity', {
        p_export_id: exportId,
      })

      if (error) throw error
      return data as IntegrityVerificationResult
    },
    onSuccess: (data, exportId) => {
      if (data.is_valid) {
        toast({
          title: 'Integrity Verified',
          description: 'The export file hash matches the stored checksum.',
        })
      } else {
        toast({
          title: 'Integrity Check Failed',
          description: data.message,
          variant: 'destructive',
        })
      }
      queryClient.invalidateQueries({ queryKey: auditKeys.detail(exportId) })
    },
    onError: (error: Error) => {
      toast({
        title: 'Verification Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// =============================================================================
// RECORD DOWNLOAD
// =============================================================================

export function useRecordExportDownload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (exportId: string): Promise<boolean> => {
      const { data, error } = await supabase.rpc('record_audit_export_download', {
        p_export_id: exportId,
      })

      if (error) throw error
      return data as boolean
    },
    onSuccess: (_, exportId) => {
      queryClient.invalidateQueries({ queryKey: auditKeys.detail(exportId) })
      queryClient.invalidateQueries({ queryKey: auditKeys.lists() })
    },
  })
}

// =============================================================================
// PII ACCESS SUMMARY
// =============================================================================

import type { PIIAccessSummary } from '@/types/audit'

interface PIISummaryParams {
  targetUserId?: string
  dateFrom?: Date
  dateTo?: Date
}

export function usePIIAccessSummary(params: PIISummaryParams = {}) {
  return useQuery({
    queryKey: auditKeys.piiSummary(),
    queryFn: async (): Promise<PIIAccessSummary[]> => {
      const { data, error } = await supabase.rpc('get_pii_access_summary', {
        p_target_user_id: params.targetUserId || null,
        p_date_from: params.dateFrom?.toISOString().split('T')[0] || null,
        p_date_to: params.dateTo?.toISOString().split('T')[0] || null,
      })

      if (error) throw error
      return data as PIIAccessSummary[]
    },
  })
}

// =============================================================================
// TOP PII ACCESSORS
// =============================================================================

import type { TopPIIAccessor } from '@/types/audit'

export function useTopPIIAccessors(days: number = 30, limit: number = 10) {
  return useQuery({
    queryKey: [...auditKeys.all, 'top-pii-accessors', days, limit],
    queryFn: async (): Promise<TopPIIAccessor[]> => {
      const { data, error } = await supabase.rpc('get_top_pii_accessors', {
        p_date_from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_date_to: new Date().toISOString().split('T')[0],
        p_limit: limit,
      })

      if (error) throw error
      return data as TopPIIAccessor[]
    },
  })
}

// =============================================================================
// ANOMALY DETECTION
// =============================================================================

import type { AnomalyDetection } from '@/types/audit'

export function useAnomalyDetection(lookbackDays: number = 7) {
  return useQuery({
    queryKey: auditKeys.anomalies(),
    queryFn: async (): Promise<AnomalyDetection[]> => {
      const { data, error } = await supabase.rpc('detect_pii_access_anomalies', {
        p_lookback_days: lookbackDays,
        p_threshold_multiplier: 3.0,
      })

      if (error) throw error
      return data as AnomalyDetection[]
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  })
}

// =============================================================================
// COMPLIANCE DASHBOARD METRICS
// =============================================================================

import type { ComplianceDashboardMetric } from '@/types/audit'

export function useComplianceDashboardMetrics(days: number = 30) {
  return useQuery({
    queryKey: auditKeys.dashboard(),
    queryFn: async (): Promise<ComplianceDashboardMetric[]> => {
      const { data, error } = await supabase.rpc('get_compliance_dashboard_metrics', {
        p_date_from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_date_to: new Date().toISOString().split('T')[0],
      })

      if (error) throw error
      return data as ComplianceDashboardMetric[]
    },
    staleTime: 300000, // 5 minutes
  })
}

// =============================================================================
// SUSPICIOUS ACTIVITY DETECTION
// =============================================================================

import type { SuspiciousActivity } from '@/types/audit'

export function useSuspiciousActivity(lookbackHours: number = 24) {
  return useQuery({
    queryKey: [...auditKeys.all, 'suspicious-activity', lookbackHours],
    queryFn: async (): Promise<SuspiciousActivity[]> => {
      const { data, error } = await supabase.rpc('detect_suspicious_export_activity', {
        p_lookback_hours: lookbackHours,
      })

      if (error) throw error
      return data as SuspiciousActivity[]
    },
    refetchInterval: 60000, // Refresh every minute for security
  })
}

// =============================================================================
// EXPORT TEMPLATES
// =============================================================================

import type { ExportTemplate } from '@/types/audit'

export function useExportTemplates(format?: AuditExportFormat) {
  return useQuery({
    queryKey: [...auditKeys.all, 'templates', format],
    queryFn: async (): Promise<ExportTemplate[]> => {
      const { data, error } = await supabase.rpc('list_audit_export_templates', {
        p_format: format || null,
      })

      if (error) throw error
      return data as ExportTemplate[]
    },
    staleTime: 60000, // 1 minute
  })
}

// =============================================================================
// CHAIN OF CUSTODY
// =============================================================================

import type { ChainOfCustodyEvent } from '@/types/audit'

export function useChainOfCustody(exportId: string | null) {
  return useQuery({
    queryKey: [...auditKeys.all, 'custody', exportId],
    queryFn: async (): Promise<ChainOfCustodyEvent[]> => {
      if (!exportId) return []

      const { data, error } = await supabase.rpc('get_audit_chain_of_custody', {
        p_export_id: exportId,
      })

      if (error) throw error
      return data as ChainOfCustodyEvent[]
    },
    enabled: !!exportId,
  })
}
