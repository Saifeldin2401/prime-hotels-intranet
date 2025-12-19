/**
 * KnowledgeAnalytics
 * 
 * Analytics dashboard for Knowledge Base content performance.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    BarChart3,
    Eye,
    FileText,
    TrendingUp,
    TrendingDown,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Search,
    Users,
    BookOpen,
    RefreshCw,
    ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useArticles } from '@/hooks/useKnowledge'

export default function KnowledgeAnalytics() {
    const { t } = useTranslation(['knowledge', 'common'])

    const { data: articles, isLoading } = useArticles({ limit: 500 })

    // Calculate analytics
    const analytics = useMemo(() => {
        if (!articles) return null

        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

        // Content counts
        const totalArticles = articles.length
        const publishedArticles = articles.filter(a => ['approved', 'published', 'APPROVED', 'PUBLISHED'].includes(a.status)).length
        const draftArticles = articles.filter(a => ['draft', 'DRAFT'].includes(a.status)).length
        const pendingReview = articles.filter(a => ['under_review', 'pending_review', 'PENDING_REVIEW'].includes(a.status)).length

        // View stats
        const totalViews = articles.reduce((sum, a) => sum + (a.view_count || 0), 0)
        const avgViews = totalArticles > 0 ? Math.round(totalViews / totalArticles) : 0

        // Recent activity
        const recentlyUpdated = articles.filter(a => new Date(a.updated_at) > thirtyDaysAgo).length
        const staleContent = articles.filter(a => new Date(a.updated_at) < ninetyDaysAgo).length

        // Acknowledgment stats
        const requiresAck = articles.filter(a => a.requires_acknowledgment).length

        // Content by type
        const byType: Record<string, number> = {}
        articles.forEach(a => {
            byType[a.content_type] = (byType[a.content_type] || 0) + 1
        })

        // Top viewed
        const topViewed = [...articles]
            .filter(a => a.view_count && a.view_count > 0)
            .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
            .slice(0, 5)

        // Least viewed (potential issues)
        const leastViewed = [...articles]
            .filter(a => ['approved', 'published', 'APPROVED', 'PUBLISHED'].includes(a.status))
            .sort((a, b) => (a.view_count || 0) - (b.view_count || 0))
            .slice(0, 5)

        // Stale articles
        const staleArticles = [...articles]
            .filter(a => new Date(a.updated_at) < ninetyDaysAgo)
            .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
            .slice(0, 5)

        return {
            totalArticles,
            publishedArticles,
            draftArticles,
            pendingReview,
            totalViews,
            avgViews,
            recentlyUpdated,
            staleContent,
            requiresAck,
            byType,
            topViewed,
            leastViewed,
            staleArticles
        }
    }, [articles])

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i}>
                            <CardContent className="pt-6">
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-8 w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    if (!analytics) {
        return <div>{t('common.no_data', 'No data available')}</div>
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    {t('analytics.title')}
                </h1>
                <p className="text-gray-600 mt-1">
                    {t('analytics.subtitle')}
                </p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">{t('analytics.total_articles')}</p>
                                <p className="text-3xl font-bold text-gray-900">{analytics.totalArticles}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {analytics.publishedArticles} {t('status.published')}
                            </Badge>
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                {analytics.draftArticles} {t('status.draft')}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">{t('analytics.total_views')}</p>
                                <p className="text-3xl font-bold text-gray-900">{analytics.totalViews.toLocaleString()}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <Eye className="h-5 w-5 text-green-600" />
                            </div>
                        </div>
                        <p className="mt-3 text-xs text-gray-500">
                            {t('analytics.avg_views', { count: analytics.avgViews })}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">{t('analytics.recently_updated')}</p>
                                <p className="text-3xl font-bold text-gray-900">{analytics.recentlyUpdated}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <RefreshCw className="h-5 w-5 text-purple-600" />
                            </div>
                        </div>
                        <p className="mt-3 text-xs text-gray-500">
                            {t('analytics.last_30_days')}
                        </p>
                    </CardContent>
                </Card>

                <Card className={analytics.staleContent > 5 ? 'border-orange-200' : ''}>
                    <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">{t('analytics.needs_review')}</p>
                                <p className="text-3xl font-bold text-orange-600">{analytics.staleContent}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-orange-600" />
                            </div>
                        </div>
                        <p className="mt-3 text-xs text-gray-500">
                            {t('analytics.not_updated_90_days')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Content by Type */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('analytics.content_by_type')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Object.entries(analytics.byType)
                            .sort((a, b) => b[1] - a[1])
                            .map(([type, count]) => {
                                const percentage = (count / analytics.totalArticles) * 100
                                const typeLabel = t(`content_types.${type}`, type)
                                return (
                                    <div key={type} className="flex items-center gap-4">
                                        <div className="w-24 text-sm font-medium text-gray-600 capitalize">
                                            {typeLabel}
                                        </div>
                                        <div className="flex-1">
                                            <Progress value={percentage} className="h-2" />
                                        </div>
                                        <div className="w-16 text-sm text-gray-500 text-right">
                                            {count} ({Math.round(percentage)}%)
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Viewed */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                                {t('analytics.top_viewed')}
                            </CardTitle>
                            <CardDescription>{t('analytics.top_viewed_desc')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {analytics.topViewed.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">{t('analytics.no_view_data')}</p>
                            ) : (
                                analytics.topViewed.map((article, index) => (
                                    <Link
                                        key={article.id}
                                        to={`/knowledge/${article.id}`}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center text-green-700 font-bold">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{article.title}</p>
                                            <p className="text-xs text-gray-500">{article.category?.name || t('general_category')}</p>
                                        </div>
                                        <Badge variant="secondary">
                                            <Eye className="h-3 w-3 mr-1" />
                                            {article.view_count}
                                        </Badge>
                                    </Link>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Stale Content */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="h-5 w-5 text-orange-600" />
                                {t('analytics.stale_content')}
                            </CardTitle>
                            <CardDescription>{t('analytics.stale_content_desc')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {analytics.staleArticles.length === 0 ? (
                                <div className="text-center py-4">
                                    <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                                    <p className="text-gray-500">{t('analytics.all_up_to_date')}</p>
                                </div>
                            ) : (
                                analytics.staleArticles.map(article => {
                                    const daysSinceUpdate = Math.floor(
                                        (Date.now() - new Date(article.updated_at).getTime()) / (1000 * 60 * 60 * 24)
                                    )
                                    return (
                                        <Link
                                            key={article.id}
                                            to={`/knowledge/${article.id}/edit`}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-orange-50 transition-colors border border-transparent hover:border-orange-200"
                                        >
                                            <div className="w-8 h-8 rounded bg-orange-100 flex items-center justify-center">
                                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{article.title}</p>
                                                <p className="text-xs text-orange-600">
                                                    {t('analytics.days_since_update', { count: daysSinceUpdate })}
                                                </p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                        </Link>
                                    )
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pending Review */}
            {analytics.pendingReview > 0 && (
                <Card className="border-yellow-200 bg-yellow-50/50">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            {t('analytics.pending_review_count', { count: analytics.pendingReview })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Link to="/knowledge/review">
                            <Badge className="bg-yellow-600 hover:bg-yellow-700">
                                {t('analytics.review_now')} <ChevronRight className="h-3 w-3 ml-1" />
                            </Badge>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
