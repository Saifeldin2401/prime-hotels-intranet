import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { crudToasts } from '@/lib/toastHelpers'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DocumentExpiryInfo } from './types'

export function useDocumentExpiry(status?: 'expiring_soon' | 'expired' | 'all') {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['document-expiry', status, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select(`
          id,
          title,
          expires_at,
          folder_id,
          folder:document_folders(id, name)
        `)
        .eq('is_deleted', false)
        .not('expires_at', 'is', null)

      const now = new Date()
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      if (status === 'expired') {
        query = query.lt('expires_at', now)
      } else if (status === 'expiring_soon') {
        query = query.gte('expires_at', now).lte('expires_at', thirtyDaysFromNow.toISOString())
      }

      query = query.order('expires_at', { ascending: true })

      const { data, error } = await query

      if (error) throw error

      return (data || []).map((doc) => {
        const expiryDate = new Date(doc.expires_at)
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

        return {
          ...doc,
          days_until_expiry: daysUntilExpiry,
          status: daysUntilExpiry < 0 ? 'expired' : daysUntilExpiry <= 30 ? 'expiring_soon' : 'active'
        } as DocumentExpiryInfo
      })
    },
  })
}

export function useExtendDocumentExpiry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ documentId, newExpiryDate }: { documentId: string; newExpiryDate: string }) => {
      const { data, error } = await supabase
        .from('documents')
        .update({
          expires_at: newExpiryDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-expiry'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
      crudToasts.update.success('Expiry date extended')
    },
    onError: () => crudToasts.update.error('expiry extension')
  })
}
