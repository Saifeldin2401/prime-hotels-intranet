import { useQuery } from '@tanstack/react-query'

import { useTenant } from '@/contexts/TenantContext'
import { supabase } from '@/lib/supabase'

export interface PopularArticle {
  id: string
  title: string
  title_ar: string | null
  content_type: string | null
  readers: number
}

/** Most-read published knowledge in the last `days`, limited to what the caller may read. */
export async function fetchPopularArticles(organizationId: string, days = 7, limit = 5): Promise<PopularArticle[]> {
  const { data, error } = await supabase.rpc('get_popular_articles', { p_org_id: organizationId, p_days: days, p_limit: limit })
  if (error) throw error
  return (data ?? []) as PopularArticle[]
}

export function usePopularArticles(days = 7, limit = 5) {
  const { currentOrganization } = useTenant()
  const orgId = currentOrganization?.id ?? null
  return useQuery({
    queryKey: ['knowledge-popular', orgId, days, limit],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchPopularArticles(orgId as string, days, limit),
  })
}
