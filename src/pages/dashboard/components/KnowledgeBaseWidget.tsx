import { PinButtonCompact } from '@/components/common/PinButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecentArticles } from '@/hooks/useKnowledge'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { ArrowRight, Book, Clock, FileText } from 'lucide-react'
import { useTranslation } from "react-i18next"
import { Link } from 'react-router-dom'

const knowledgeBaseSkeletonKeys = ['kb-skeleton-1', 'kb-skeleton-2', 'kb-skeleton-3']

export function KnowledgeBaseWidget() {
    const { data: articles, isLoading } = useRecentArticles(5)
    const { t, i18n } = useTranslation('dashboard')
    const isRTL = i18n.dir() === 'rtl'

    if (isLoading) {
        return (
            <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white p-6">
                <Skeleton className="h-6 w-32 mb-6" />
                <div className="space-y-4">
                    {knowledgeBaseSkeletonKeys.map((skeletonKey) => <Skeleton key={skeletonKey} className="h-20 w-full rounded-xl" />)}
                </div>
            </Card>
        )
    }

    return (
        <LazyMotion features={domAnimation}>
            <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col">
                <CardHeader className="pb-4 pt-6 px-6 relative z-10 bg-white border-b border-slate-100/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                                <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg">
                                    <Book className="w-5 h-5" />
                                </div>
                                <Link to="/knowledge" className="hover:text-indigo-600 transition-colors">
                                    {t('widgets.knowledge_base', 'Knowledge Base')}
                                </Link>
                            </CardTitle>
                            <CardDescription className="text-sm font-medium text-slate-500 mt-1">
                                {t('widgets.knowledge_base_desc', 'Recent articles and SOPs')}
                            </CardDescription>
                        </div>
                        <Button asChild variant="ghost" size="sm" className="gap-1 text-slate-500 hover:text-slate-900 font-semibold h-8 rounded-full px-4 hover:bg-slate-100 transition-colors">
                            <Link to="/knowledge">
                                {t('actions.view_all', 'View All')} <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
                            </Link>
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-0 flex-1 relative bg-slate-50/30">
                    <ScrollArea className="h-[340px] px-6 pb-6 pt-4">
                        <div className="space-y-3">
                            {articles?.length === 0 ? (
                                <m.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-12 flex flex-col items-center justify-center h-full"
                                >
                                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-indigo-100 shadow-sm">
                                        <Book className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <p className="text-slate-800 font-bold text-lg">{t('widgets.no_articles', 'No articles found')}</p>
                                    <p className="text-sm text-slate-500 font-medium mt-1">{t('widgets.no_articles_desc', 'New content will appear here.')}</p>
                                </m.div>
                            ) : (
                                articles?.map((article, index: number) => (
                                    <m.div
                                        key={article.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05, ease: "easeOut" }}
                                    >
                                        <div className="group relative">
                                            <Link
                                                to={`/knowledge/${article.id}`}
                                                className="flex flex-col gap-3 p-4 rounded-2xl border border-slate-100 bg-white shadow-[0_2px_8px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_16px_rgb(0,0,0,0.04)] hover:border-indigo-100 transition-all ease-out hover:-translate-y-0.5"
                                            >
                                                <div className="flex gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 border border-indigo-100/50 group-hover:bg-indigo-500 group-hover:border-indigo-600 transition-colors">
                                                        <FileText className="w-5 h-5 text-indigo-500 group-hover:text-white transition-colors" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 pe-8">
                                                        <p className="font-bold text-[15px] text-slate-800 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                                                            {article.title}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-slate-500">
                                                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-100">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {article.created_at && formatDistanceToNow(new Date(article.created_at), { addSuffix: true, locale: isRTL ? ar : undefined })}
                                                            </span>
                                                            {article.category_name && (
                                                                <Badge variant="outline" className="text-[10px] tracking-wider uppercase font-bold px-2 h-6 border-slate-200 bg-white text-slate-600">
                                                                    {article.category_name}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                            {/* Pin button */}
                                            <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PinButtonCompact
                                                    itemType="knowledge"
                                                    itemId={article.id}
                                                    title={article.title}
                                                />
                                            </div>
                                        </div>
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
