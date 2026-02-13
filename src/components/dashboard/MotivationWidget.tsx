
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Quote, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { WidgetSkeleton } from '@/components/dashboard/WidgetSkeleton'

interface MotivationalQuote {
    id: string
    content_en: string
    content_ar: string
    author_en: string
    author_ar: string
    category: string
}

export function MotivationWidget() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'
    const [quote, setQuote] = useState<MotivationalQuote | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchQuote = async () => {
        setLoading(true)
        try {
            // Fetch a random active quote
            // Since Supabase doesn't have native random(), we can use a workaround or just fetch one
            // Ideally we'd use a postgres function for random, but for now let's fetch a small batch and pick one
            const { data, error } = await supabase
                .from('motivational_content')
                .select('*')
                .eq('is_active', true)
                .limit(20) // Fetch top 20 and pick random JS-side for simplicity

            if (error) throw error

            if (data && data.length > 0) {
                const randomIndex = Math.floor(Math.random() * data.length)
                setQuote(data[randomIndex])
            }
        } catch (error) {
            console.error('Error fetching quote:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchQuote()
    }, [])

    if (loading) {
        return <WidgetSkeleton rows={1} title={false} className="bg-gradient-to-br from-hotel-navy/5 to-hotel-gold/5 border-none shadow-sm" />
    }

    if (!quote) return null

    return (
        <Card className="col-span-1 h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-none shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={fetchQuote} className="h-8 w-8" title={t('dashboard:widgets.motivation.refresh', 'Refresh')}>
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </Button>
            </div>

            <CardContent className="flex flex-col items-center justify-center p-8 h-full text-center relative z-10">
                <Quote className="h-8 w-8 text-hotel-gold/40 mb-4 absolute top-4 left-4 rotate-180" />

                <blockquote className="text-lg md:text-xl font-medium text-foreground italic leading-relaxed mb-4">
                    "{isRTL ? quote.content_ar : quote.content_en}"
                </blockquote>

                <cite className="text-sm font-semibold text-muted-foreground not-italic">
                    — {isRTL ? quote.author_ar : quote.author_en}
                </cite>
            </CardContent>
            <div className="absolute bottom-0 right-0 p-32 bg-hotel-gold/5 rounded-full blur-3xl -z-0 translate-x-12 translate-y-12"></div>
        </Card>
    )
}
