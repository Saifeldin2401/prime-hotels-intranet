import { motion } from 'framer-motion'
import { Newspaper, ExternalLink, Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useNews } from '@/hooks/useNews'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useTranslation } from "react-i18next";

export function HospitalityNewsWidget() {
    const { data: news, isLoading } = useNews()
    const { t, i18n } = useTranslation('dashboard');
    const isRTL = i18n.dir() === 'rtl';

    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2].map(i => <Skeleton key={i} className="h-32" />)}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-full border-0 shadow-lg bg-gradient-to-b from-white to-slate-50/50">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <a 
                        href="https://www.hoteliermiddleeast.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <Newspaper className="w-5 h-5 text-blue-600" />
                        {t('hospitality_news.title', 'Hospitality News')}
                    </a>
                </CardTitle>
                <CardDescription>{t('hospitality_news.subtitle', 'Latest industry updates')}</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px]">
                    <div className="space-y-4 pr-4">
                        {news?.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>{t('hospitality_news.no_news', 'No news available')}</p>
                            </div>
                        ) : (
                            news?.map((item: any, index: number) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="group relative bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-md transition-all"
                                >
                                    <a
                                        href={item.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block p-4"
                                    >
                                        <div className="flex gap-4">
                                            {item.image_url && (
                                                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.title_en || item.original_title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none'
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Badge variant="outline" className="text-[10px] h-5 bg-blue-50 text-blue-700 border-blue-100">
                                                        {item.category}
                                                    </Badge>
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <ClockIcon className="w-3 h-3" />
                                                        {formatDistanceToNow(new Date(item.published_at), { addSuffix: true, locale: isRTL ? ar : undefined })}
                                                    </span>
                                                </div>

                                                <h4 className="font-semibold text-sm leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                                                    {item.title_en || item.original_title}
                                                </h4>

                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Globe className="w-3 h-3" />
                                                    {item.source}
                                                    <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                        </div>
                                    </a>
                                </motion.div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

function ClockIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}
