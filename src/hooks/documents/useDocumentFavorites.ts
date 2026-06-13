import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useFavorites() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['document-favorites', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_favorites')
        .select('document_id')
        .eq('user_id', user!.id)

      if (error) throw error
      return new Set(data?.map(f => f.document_id) || [])
    }
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ documentId, isFavorite }: { documentId: string, isFavorite: boolean }) => {
      if (!user) throw new Error('User must be authenticated')

      if (isFavorite) {
        const { error } = await supabase
          .from('document_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('document_id', documentId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('document_favorites')
          .insert({
            user_id: user.id,
            document_id: documentId
          })

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-favorites'] })
    }
  })
}
