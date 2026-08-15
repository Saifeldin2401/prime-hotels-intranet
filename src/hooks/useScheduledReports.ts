/**
 * FORGE X: Enterprise Audit & Compliance Export System
 * React Hooks for Scheduled Reports
 */

import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database.generated'
import type {
    AuditExportFormat,
    ExportScope,
    ScheduledComplianceReport,
    ScheduledReportExecution,
    ScheduledReportType,
} from '@/types/audit'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const scheduledReportKeys = {
  all: ['scheduled-reports'] as const,
  lists: () => [...scheduledReportKeys.all, 'list'] as const,
  executions: (reportId: string) => [...scheduledReportKeys.all, 'executions', reportId] as const,
}

// =============================================================================
// SCHEDULED REPORTS
// =============================================================================

export function useScheduledReports() {
  return useQuery({
    queryKey: scheduledReportKeys.lists(),
    queryFn: async (): Promise<ScheduledComplianceReport[]> => {
      const { data, error } = await supabase
        .from('scheduled_compliance_reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []).map((r) => ({
        ...r,
        report_type: r.report_type as unknown as ScheduledReportType,
        report_scope: r.report_scope as unknown as ExportScope,
        delivery_config: r.delivery_config as unknown as ScheduledComplianceReport['delivery_config'],
        format: r.format as AuditExportFormat,
        created_at: r.created_at ?? new Date().toISOString(),
        updated_at: r.updated_at ?? new Date().toISOString(),
        is_active: r.is_active ?? true,
        failure_count: r.failure_count ?? 0,
        run_count: r.run_count ?? 0,
        recipient_roles: r.recipient_roles ?? [],
      }))
    },
  })
}

// =============================================================================
// CREATE SCHEDULED REPORT
// =============================================================================

interface CreateScheduledReportParams {
  reportName: string
  description?: string
  reportType: string
  scheduleCron: string
  scheduleTimezone?: string
  reportScope: ExportScope
  format: AuditExportFormat
  templateName?: string
  deliveryConfig: {
    email_recipients?: string[]
    email_subject?: string
    include_attachment?: boolean
  }
  recipientRoles?: string[]
}

export function useCreateScheduledReport() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateScheduledReportParams) => {
      const { data: authData } = await supabase.auth.getUser()
      const createdBy = authData?.user?.id ?? 'system'

      const { data, error } = await supabase
        .from('scheduled_compliance_reports')
        .insert({
          created_by: createdBy,
          report_name: params.reportName,
          description: params.description,
          report_type: params.reportType,
          schedule_cron: params.scheduleCron,
          schedule_timezone: params.scheduleTimezone || 'Asia/Riyadh',
          report_scope: params.reportScope as unknown as Json,
          format: params.format,
          template_name: params.templateName,
          delivery_config: params.deliveryConfig as unknown as Json,
          recipient_roles: params.recipientRoles || [],
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast({
        title: 'Scheduled Report Created',
        description: 'Your automated compliance report has been scheduled.',
      })
      queryClient.invalidateQueries({ queryKey: scheduledReportKeys.lists() })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// =============================================================================
// UPDATE SCHEDULED REPORT
// =============================================================================

interface UpdateScheduledReportParams {
  reportId: string
  isActive?: boolean
  scheduleCron?: string
  deliveryConfig?: Record<string, unknown>
}

export function useUpdateScheduledReport() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateScheduledReportParams) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (params.isActive !== undefined) updateData.is_active = params.isActive
      if (params.scheduleCron) updateData.schedule_cron = params.scheduleCron
      if (params.deliveryConfig) updateData.delivery_config = params.deliveryConfig

      const { data, error } = await supabase
        .from('scheduled_compliance_reports')
        .update(updateData)
        .eq('id', params.reportId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, params) => {
      toast({
        title: 'Report Updated',
        description: 'Scheduled report has been updated successfully.',
      })
      queryClient.invalidateQueries({ queryKey: scheduledReportKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: scheduledReportKeys.executions(params.reportId),
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// =============================================================================
// DELETE SCHEDULED REPORT
// =============================================================================

export function useDeleteScheduledReport() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('scheduled_compliance_reports')
        .delete()
        .eq('id', reportId)

      if (error) throw error
    },
    onSuccess: () => {
      toast({
        title: 'Report Deleted',
        description: 'Scheduled report has been deleted.',
      })
      queryClient.invalidateQueries({ queryKey: scheduledReportKeys.lists() })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// =============================================================================
// REPORT EXECUTIONS
// =============================================================================

export function useReportExecutions(reportId: string) {
  return useQuery({
    queryKey: scheduledReportKeys.executions(reportId),
    queryFn: async (): Promise<ScheduledReportExecution[]> => {
      const { data, error } = await supabase
        .from('scheduled_report_executions')
        .select('*')
        .eq('report_id', reportId)
        .order('started_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data as ScheduledReportExecution[]
    },
  })
}

// =============================================================================
// EXECUTE REPORT NOW (MANUAL TRIGGER)
// =============================================================================

export function useExecuteReportNow() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reportId: string): Promise<string> => {
      const { data, error } = await supabase.rpc('execute_scheduled_report', {
        p_report_id: reportId,
      })

      if (error) throw error
      return data as string
    },
    onSuccess: (executionId, reportId) => {
      toast({
        title: 'Report Execution Started',
        description: `Execution ID: ${executionId}`,
      })
      queryClient.invalidateQueries({
        queryKey: scheduledReportKeys.executions(reportId),
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Execution Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// =============================================================================
// SEED DEFAULT REPORTS
// =============================================================================

export function useSeedDefaultReports() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as unknown as { rpc: (fn: string) => Promise<{ error: { message: string } | null }> }).rpc('seed_default_scheduled_reports')
      if (error) throw error
    },
    onSuccess: () => {
      toast({
        title: 'Default Reports Created',
        description: 'Standard compliance reports have been scheduled.',
      })
      queryClient.invalidateQueries({ queryKey: scheduledReportKeys.lists() })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
