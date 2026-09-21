import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import type { DocumentTag } from './types'

export function useDocumentTags() {
  return useQuery({
    queryKey: ['document-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_tags')
        .select(`
          *,
          usage_count:document_tag_assignments(count)
        `)
        .order('name', { ascending: true })

      if (error) throw error

      return (data || []).map(tag => ({
        ...tag,
        description: null,
        usage_count: tag.usage_count?.[0]?.count || 0
      })) as DocumentTag[]
    },
  })
}
