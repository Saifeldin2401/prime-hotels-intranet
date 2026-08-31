import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

export interface HospitalityNews {
    id: string
    title_en: string | null
    title_ar: string | null
    original_title: string
    summary_en: string | null
    summary_ar: string | null
    source: string
    source_url: string
    image_url?: string
    published_at: string
    category: string
    original_language: string
    is_visible: boolean
    tags: string[] | null
}

export function useNews() {
    return useQuery({
        queryKey: ['hospitality-news'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('hospitality_news')
                .select('*')
                .eq('is_visible', true)
                .order('published_at', { ascending: false })
                .limit(10)

            if (error) {
                console.error('Error fetching news:', error)
                return []
            }

            return data as HospitalityNews[]
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    })
}
