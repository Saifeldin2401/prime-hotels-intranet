import { supabase } from '@/lib/supabase'

/** Learning momentum of the people a manager oversees (derived from real learning records). */
export interface TeamMomentum {
  members: number
  active_this_week: number
  learning_now: number
  weeks: { week_start: string; points: number; active_learners: number }[]
  top_learners: { user_id: string; full_name: string | null; avatar_url: string | null; points: number }[]
}

export async function fetchTeamMomentum(organizationId: string, weeks = 8, departmentId?: string | null): Promise<TeamMomentum> {
  const { data, error } = await supabase.rpc('get_team_momentum', {
    p_org_id: organizationId,
    p_weeks: weeks,
    p_department_id: departmentId ?? undefined,
  })
  if (error) throw error
  return data as unknown as TeamMomentum
}
