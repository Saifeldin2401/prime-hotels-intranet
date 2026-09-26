import { supabase } from '@/lib/supabase'

export interface CatalogCourse {
  id: string
  title: string
  description: string | null
  estimated_duration_minutes: number | null
  difficulty_level: string | null
  certificate_enabled: boolean | null
  created_at: string
}

/**
 * Published courses the member can see in the current organization: its own
 * courses plus Altus master courses. RLS still decides what is returned.
 */
export async function fetchCatalog(organizationId: string): Promise<CatalogCourse[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, description, estimated_duration_minutes, difficulty_level, certificate_enabled, created_at')
    .eq('status', 'published')
    .eq('is_deleted', false)
    .or(`organization_id.eq.${organizationId},is_master_template.eq.true`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CatalogCourse[]
}
