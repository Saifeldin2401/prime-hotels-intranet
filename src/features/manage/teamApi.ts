import { supabase } from '@/lib/supabase'

export interface DepartmentStanding {
  departmentId: string
  departmentName: string
  headName: string | null
  staffCount: number
  assigned: number
  completed: number
  overdue: number
  trainingRate: number | null
  sopRate: number | null
  overall: number | null
}

/**
 * Per-department completion, overdue and SOP acknowledgement for one
 * organization, computed on the server (get_department_compliance, gated by
 * reports.view).
 */
export async function fetchDepartmentStandings(organizationId: string): Promise<DepartmentStanding[]> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    params: Record<string, unknown>,
  ) => PromiseLike<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>

  const compliance = await rpc('get_department_compliance', { p_org_id: organizationId })
  if (compliance.error) throw new Error(compliance.error.message)

  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))
  return (compliance.data ?? []).map((r) => ({
    departmentId: String(r.department_id),
    departmentName: String(r.department_name ?? ''),
    headName: (r.head_name as string | null) ?? null,
    staffCount: Number(r.staff_count ?? 0),
    assigned: Number(r.assigned_count ?? 0),
    completed: Number(r.completed_count ?? 0),
    overdue: Number(r.overdue_count ?? 0),
    trainingRate: num(r.training_completion_rate),
    sopRate: num(r.sop_compliance_rate),
    overall: num(r.overall_score),
  }))
}
