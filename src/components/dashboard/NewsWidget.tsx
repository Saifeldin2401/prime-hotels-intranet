import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ExternalLink, Newspaper, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { arSA, enUS } from 'date-fns/locale'
import { useNews } from '@/hooks/useNews'
import { cn } from '@/lib/utils'

export function NewsWidget() {
    const { t, i18n } = useTranslation(['dashboard', 'common'])
    const { data: news, isLoading } = useNews()
    const isRTL = i18n.dir() === 'rtl'

    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Newspaper className="h-5 w-5 text-hotel-primary" />
                        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-2">
                                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                                <div className="h-3 w-full bg-muted animate-pulse rounded" />
                                <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-[400px] flex flex-col overflow-hidden border-t-4 border-t-hotel-gold bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-950 dark:to-gray-900/50">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-hotel-gold/10 flex items-center justify-center">
                            <Newspaper className="h-5 w-5 text-hotel-gold-dark" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-hotel-navy dark:text-gray-100">
                                {isRTL ? 'أخبار قطاع الضيافة' : 'Hospitality News'}
                            </h3>
                            <p className="text-xs text-muted-foreground font-normal">
                                {isRTL ? 'تحديثات مباشرة من المملكة' : 'Live updates from KSA'}
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-normal border-hotel-gold/30 text-hotel-gold-dark">
                        {isRTL ? 'مباشر' : 'LIVE'}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 min-h-0">
                <ScrollArea className="h-full">
                    <div className="space-y-6 px-6 py-4">
                        {news?.map((item) => (
                            <div key={item.id} className="group relative pl-4 rtl:pl-0 rtl:pr-4 border-l-2 rtl:border-l-0 rtl:border-r-2 border-gray-100 dark:border-gray-800 hover:border-hotel-gold transition-colors duration-300">
                                <div className="absolute -left-[5px] rtl:-left-auto rtl:-right-[5px] top-0 h-2 w-2 rounded-full bg-gray-200 dark:bg-gray-800 group-hover:bg-hotel-gold transition-colors duration-300" />

                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                            {t(`news_categories.${item.category?.toLowerCase().replace(/ & /g, '_and_').replace(/ /g, '_')}`, item.category)}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(item.published_at), {
                                                addSuffix: true,
                                                locale: isRTL ? arSA : enUS
                                            })}
                                        </span>
                                    </div>

                                    <a
                                        href={item.source_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block group-hover:text-hotel-primary transition-colors"
                                    >
                                        <h4 className="text-sm font-semibold leading-snug line-clamp-2 text-start">
                                            {isRTL ? (item.title_ar || item.title_en) : (item.title_en || item.title_ar)}
                                        </h4>
                                    </a>

                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed opacity-80 text-start">
                                        {isRTL ? (item.summary_ar || item.summary_en) : (item.summary_en || item.summary_ar)}
                                    </p>

                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 pt-1">
                                        <span>{item.source}</span>
                                        <span>•</span>
                                        <a
                                            href={item.source_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1 hover:text-hotel-primary transition-colors"
                                        >
                                            {t('actions.read_more', isRTL ? 'اقرأ المزيد' : 'Read more')}
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {!news?.length && (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                {t('common.no_news', isRTL ? 'لا توجد أخبار حالياً' : 'No news available at the moment')}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
