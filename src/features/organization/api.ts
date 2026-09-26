import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.generated'

export type SetupGapRow = Database['public']['Functions']['get_org_setup_gaps']['Returns'][number]

/**
 * What is blocking people in this organization from being assigned and
 * followed up: unplaced members, open invitations, hotels without an admin,
 * departments without a manager, missing branding. Server-checked for
 * org.admin / people.manage (hint ORG_ADMIN_REQUIRED otherwise).
 */
export async function fetchSetupGaps(organizationId: string): Promise<SetupGapRow[]> {
  const { data, error } = await supabase.rpc('get_org_setup_gaps', { p_org_id: organizationId })
  if (error) throw error
  return data ?? []
}
