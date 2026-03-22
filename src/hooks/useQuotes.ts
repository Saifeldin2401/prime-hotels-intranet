import { supabase } from '@/lib/supabase'
import { useCallback, useEffect, useState } from 'react'

export interface MotivationalQuote {
    id: string
    content_en: string
    content_ar: string
    author_en: string
    author_ar: string
    category: string
}

export function useQuotes() {
    const [quote, setQuote] = useState<MotivationalQuote | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const fetchRandomQuote = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            // Workaround for random selection in Supabase:
            // Fetch total count, pick a random offset, and fetch 1 record.
            const { count, error: countError } = await supabase
                .from('motivational_content')
                .select('*', { count: 'exact', head: true })

            if (countError) throw countError

            if (count && count > 0) {
                const randomOffset = Math.floor(Math.random() * count)
                const { data, error: fetchError } = await supabase
                    .from('motivational_content')
                    .select('*')
                    .range(randomOffset, randomOffset)
                    .single()

                if (fetchError) throw fetchError
                setQuote(data)
            }
        } catch (err) {
            console.error('Error fetching motivational quote:', err)
            setError(err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchRandomQuote()
    }, [fetchRandomQuote])

    return {
        quote,
        isLoading,
        error,
        refresh: fetchRandomQuote
    }
}
