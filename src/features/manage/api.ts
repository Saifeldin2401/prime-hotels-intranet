import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.generated'

export type RiskQueueRow = Database['public']['Functions']['get_risk_queue']['Returns'][number]

/**
 * Items that need a manager's attention in one organization: overdue course
 * assignments, quizzes failed without a later pass, and certificates expiring
 * within 30 days. The server checks reports.view / assignment.manage for this
 * organization (hint REPORTS_NOT_ALLOWED otherwise).
 */
export async function fetchRiskQueue(organizationId: string): Promise<RiskQueueRow[]> {
  const { data, error } = await supabase.rpc('get_risk_queue', { p_org_id: organizationId })
  if (error) throw error
  return data ?? []
}
