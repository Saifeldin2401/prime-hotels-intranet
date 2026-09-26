import { supabase } from '@/lib/supabase'

/** Display names for the people who submitted or own items in the review queue. */
export async function fetchPeopleNames(ids: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (unique.length === 0) return new Map()
  const { data, error } = await supabase.from('profiles').select('id, full_name, email').in('id', unique)
  if (error) throw error
  return new Map((data ?? []).map((p) => [p.id, p.full_name || p.email || '']))
}
