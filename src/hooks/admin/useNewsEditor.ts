import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { HospitalityNews } from '../useNews'

type CreateNewsPayload = Omit<HospitalityNews, 'id' | 'created_at' | 'updated_at'>

export function useNewsEditor() {
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const createNews = useMutation({
        mutationFn: async (payload: CreateNewsPayload) => {
            const { data, error } = await supabase
                .from('hospitality_news')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            toast({
                title: 'News Published',
                description: 'The news article has been successfully published to the dashboard.',
            })
            queryClient.invalidateQueries({ queryKey: ['hospitality-news'] })
            queryClient.invalidateQueries({ queryKey: ['admin-hospitality-news'] })
        },
        onError: (error) => {
            console.error('Failed to create news', error)
            toast({
                title: 'Error publishing news',
                description: error.message || 'An unexpected error occurred',
                variant: 'destructive',
            })
        }
    })

    const updateNews = useMutation({
        mutationFn: async ({ id, ...payload }: Partial<CreateNewsPayload> & { id: string }) => {
            const { data, error } = await supabase
                .from('hospitality_news')
                .update(payload)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            toast({
                title: 'News Updated',
                description: 'The news article has been successfully updated.',
            })
            queryClient.invalidateQueries({ queryKey: ['hospitality-news'] })
            queryClient.invalidateQueries({ queryKey: ['admin-hospitality-news'] })
        },
        onError: (error) => {
            console.error('Failed to update news', error)
            toast({
                title: 'Error updating news',
                description: error.message || 'An unexpected error occurred',
                variant: 'destructive',
            })
        }
    })

    const deleteNews = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('hospitality_news')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            toast({
                title: 'News Deleted',
                description: 'The news article has been removed.',
            })
            queryClient.invalidateQueries({ queryKey: ['hospitality-news'] })
            queryClient.invalidateQueries({ queryKey: ['admin-hospitality-news'] })
        },
        onError: (error) => {
            console.error('Failed to delete news', error)
            toast({
                title: 'Error deleting news',
                description: error.message || 'An unexpected error occurred',
                variant: 'destructive',
            })
        }
    })

    return {
        createNews,
        updateNews,
        deleteNews
    }
}
