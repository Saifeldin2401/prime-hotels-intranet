import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Book, FileText, ArrowRight, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useRecentArticles } from '@/hooks/useKnowledge'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useTranslation } from "react-i18next";
import { cn } from '@/lib/utils';

export function KnowledgeBaseWidget() {
    const { data: articles, isLoading } = useRecentArticles(5)
    const { t, i18n } = useTranslation('dashboard');
    const isRTL = i18n.dir() === 'rtl';

    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-full border-0 shadow-lg bg-gradient-to-b from-white to-slate-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Link to="/knowledge" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <Book className="w-5 h-5 text-indigo-500" />
                            {t('widgets.knowledge_base', 'Knowledge Base')}
                        </Link>
                    </CardTitle>
                    <CardDescription>{t('widgets.knowledge_base_desc', 'Recent articles and SOPs')}</CardDescription>
                </div>
                <Link to="/knowledge">
                    <Button variant="ghost" size="sm" className="gap-1">
                        {t('actions.view_all', 'View All')} <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[320px]">
                    <div className="space-y-3 pr-4">
                        {articles?.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Book className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>{t('widgets.no_articles', 'No articles found')}</p>
                            </div>
                        ) : (
                            articles?.map((article: any, index: number) => (
                                <motion.div
                                    key={article.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Link
                                        to={`/knowledge/${article.id}`}
                                        className="flex gap-3 p-3 rounded-xl hover:bg-slate-100 transition-colors group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                                            <FileText className="w-5 h-5 text-indigo-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                                {article.title}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {article.created_at && formatDistanceToNow(new Date(article.created_at), { addSuffix: true, locale: isRTL ? ar : undefined })}
                                                </span>
                                                {article.category_name && (
                                                    <Badge variant="secondary" className="text-[10px] h-4">
                                                        {article.category_name}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
