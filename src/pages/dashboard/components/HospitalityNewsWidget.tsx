import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useNews } from '@/hooks/useNews'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { ClockIcon, ExternalLink, Globe, Newspaper } from 'lucide-react'
import { useTranslation } from "react-i18next"

const hospitalityNewsSkeletonKeys = ['hospitality-news-skeleton-1', 'hospitality-news-skeleton-2', 'hospitality-news-skeleton-3']

export function HospitalityNewsWidget() {
    const { data: news, isLoading } = useNews()
    const { t, i18n } = useTranslation('dashboard')
    const isRTL = i18n.dir() === 'rtl'

    if (isLoading) {
        return (
            <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white p-6">
                <Skeleton className="h-6 w-32 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {hospitalityNewsSkeletonKeys.map((skeletonKey) => <Skeleton key={skeletonKey} className="h-64 w-full rounded-2xl" />)}
                </div>
            </Card>
        )
    }

    return (
        <LazyMotion features={domAnimation}>
            <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col">
                <CardHeader className="pb-4 pt-6 px-6 relative z-10 bg-white border-b border-slate-100/50">
                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                            <Newspaper className="w-5 h-5" />
                        </div>
                        <a
                            href="https://www.hoteliermiddleeast.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 transition-colors"
                        >
                            {t('hospitality_news.title', 'Hospitality News')}
                        </a>
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-slate-500 mt-1">
                        {t('hospitality_news.subtitle', 'Latest industry updates')}
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-0 flex-1 relative bg-slate-50/30">
                    <ScrollArea className="h-[400px] px-6 pb-6 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {news?.length === 0 ? (
                                <m.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="col-span-full text-center py-12 flex flex-col items-center justify-center h-full"
                                >
                                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-blue-100 shadow-sm">
                                        <Newspaper className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <p className="text-slate-800 font-bold text-lg">{t('hospitality_news.no_news', 'No news available')}</p>
                                    <p className="text-sm text-slate-500 font-medium mt-1">{t('hospitality_news.no_news_desc', 'Check back later for industry updates.')}</p>
                                </m.div>
                            ) : (
                                news?.map((item, index: number) => (
                                    <m.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05, ease: "easeOut" }}
                                        className="h-full"
                                    >
                                        <a
                                            href={item.source_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group h-full bg-white border border-slate-100 rounded-2xl shadow-[0_2px_8px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_16px_rgb(0,0,0,0.04)] hover:border-slate-300 transition-all ease-out hover:-translate-y-0.5 overflow-hidden flex flex-col"
                                        >
                                            <div className="flex flex-col h-full">
                                                {item.image_url ? (
                                                    <div className="w-full h-40 flex-shrink-0 bg-slate-100 border-b border-slate-100 overflow-hidden relative">
                                                        <img
                                                            src={item.image_url}
                                                            alt={item.title_en || item.original_title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none'
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-40 flex-shrink-0 bg-slate-50 border-b border-slate-100 flex items-center justify-center">
                                                        <Newspaper className="w-10 h-10 text-slate-300" />
                                                    </div>
                                                )}

                                                <div className="flex-1 flex flex-col p-5">
                                                    <div className="flex items-center gap-2 mb-3 mt-1">
                                                        <Badge variant="outline" className="text-[10px] tracking-wider uppercase font-bold px-2 h-5 bg-blue-50 text-blue-600 border-blue-200">
                                                            {item.category || t('hospitality_news.category_news', 'News')}
                                                        </Badge>
                                                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                                                            <ClockIcon className="w-3.5 h-3.5" />
                                                            {item.published_at ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true, locale: isRTL ? ar : undefined }) : t('hospitality_news.recently', 'Recently')}
                                                        </span>
                                                    </div>

                                                    <h4 className="font-bold text-[15px] text-slate-800 leading-snug mb-4 group-hover:text-blue-600 transition-colors line-clamp-2">
                                                        {item.title_en || item.original_title}
                                                    </h4>

                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mt-auto pt-4 border-t border-slate-50">
                                                        <Globe className="w-3.5 h-3.5 group-hover:text-blue-500 transition-colors" />
                                                        <span className="group-hover:text-slate-700 transition-colors">{item.source}</span>
                                                        <ExternalLink className="w-3.5 h-3.5 text-slate-300 ms-auto opacity-0 group-hover:opacity-100 group-hover:text-blue-500 transition-all" />
                                                    </div>
                                                </div>
                                            </div>
                                        </a>
                                    </m.div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </LazyMotion>
    )
}
