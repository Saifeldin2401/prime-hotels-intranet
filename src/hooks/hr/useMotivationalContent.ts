import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type MotivationCategory = 'general' | 'leadership' | 'service' | 'wellness' | 'sales'

export interface MotivationalContent {
    id: string
    content_en: string
    content_ar: string
    author_en: string | null
    author_ar: string | null
    category: MotivationCategory
    is_active: boolean
    created_by: string | null
    created_at: string
    updated_at: string
}

export const useMotivationalContent = () => {
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const { data, isLoading, error } = useQuery({
        queryKey: ['motivational_content'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('motivational_content')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as MotivationalContent[]
        }
    })

    const createMutation = useMutation({
        mutationFn: async (content: Partial<MotivationalContent>) => {
            const { data, error } = await supabase
                .from('motivational_content')
                .insert([{
                    content_en: content.content_en,
                    content_ar: content.content_ar,
                    author_en: content.author_en,
                    author_ar: content.author_ar,
                    category: content.category || 'general',
                    is_active: content.is_active ?? true
                }])
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['motivational_content'] })
            toast({ title: 'Success', description: 'Motivational content mapped and published.' })
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    })

    const updateMutation = useMutation({
        mutationFn: async (content: Partial<MotivationalContent> & { id: string }) => {
            const { data, error } = await supabase
                .from('motivational_content')
                .update({
                    content_en: content.content_en,
                    content_ar: content.content_ar,
                    author_en: content.author_en,
                    author_ar: content.author_ar,
                    category: content.category,
                    is_active: content.is_active,
                    updated_at: new Date().toISOString()
                })
                .eq('id', content.id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['motivational_content'] })
            toast({ title: 'Updated', description: 'Quote details refreshed seamlessly.' })
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    })

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
            const { data, error } = await supabase
                .from('motivational_content')
                .update({ is_active, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['motivational_content'] })
            toast({ title: 'Status Changed', description: `Content is now ${vars.is_active ? 'active' : 'paused'} on dashboards.` })
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('motivational_content')
                .delete()
                .eq('id', id)

            if (error) throw error
            return id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['motivational_content'] })
            toast({ title: 'Deleted', description: 'Content securely removed from rotation.' })
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    })

    return {
        data,
        isLoading,
        error,
        createContent: createMutation,
        updateContent: updateMutation,
        deleteContent: deleteMutation,
        toggleStatus: toggleStatusMutation
    }
}
