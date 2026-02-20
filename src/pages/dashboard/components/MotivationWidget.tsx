import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Quote, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuotes } from '@/hooks/useQuotes'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export const MotivationWidget = memo(function MotivationWidget() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'
    const { quote, isLoading, refresh } = useQuotes()

    if (isLoading && !quote) {
        return (
            <Card className="h-full bg-gradient-to-br from-hotel-navy/5 to-hotel-gold/5 border-none shadow-sm min-h-[160px]">
                <CardContent className="flex flex-col items-center justify-center p-6 h-full space-y-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardContent>
            </Card>
        )
    }

    if (!quote) return null

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full"
        >
            <Card className="h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900/40 dark:to-slate-800/40 border-none shadow-sm relative overflow-hidden group min-h-[160px]">
                {/* Background micro-decoration */}
                <div className={cn(
                    "absolute -bottom-6 -right-6 w-32 h-32 bg-hotel-gold/10 rounded-full blur-2xl transition-transform duration-700 group-hover:scale-150",
                    isRTL && "-right-auto -left-6"
                )} />

                <div className={cn(
                    "absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-20",
                    isRTL && "right-auto left-2"
                )}>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={refresh}
                        className="h-8 w-8 rounded-full bg-white/50 backdrop-blur-sm dark:bg-white/10 hover:bg-white dark:hover:bg-white/20"
                        title={t('dashboard.motivation.refresh')}
                    >
                        <RefreshCw className={cn("h-4 w-4 text-primary", isLoading && "animate-spin")} />
                    </Button>
                </div>

                <CardContent className="flex flex-col items-center justify-center p-8 h-full text-center relative z-10">
                    <Quote className={cn(
                        "h-10 w-10 text-hotel-gold/20 mb-4 absolute top-4 opacity-50",
                        isRTL ? "right-4" : "left-4 rotate-180"
                    )} />

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={quote.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <blockquote className="text-lg md:text-xl font-medium text-foreground italic leading-relaxed text-balance">
                                "{isRTL ? quote.content_ar : quote.content_en}"
                            </blockquote>

                            <cite className="block text-sm font-semibold text-muted-foreground not-italic tracking-wide">
                                — {isRTL ? quote.author_ar : quote.author_en}
                            </cite>
                        </motion.div>
                    </AnimatePresence>
                </CardContent>
            </Card>
        </motion.div>
    )
})
