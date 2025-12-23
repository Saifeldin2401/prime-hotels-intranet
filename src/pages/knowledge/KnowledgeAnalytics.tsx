/**
 * KnowledgeAnalytics
 * 
 * Analytics dashboard for Knowledge Base content performance.
 */

import { useMemo, useState } from 'react'
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
    ChevronRight,
    ArrowUpRight,
    Filter,
    Download
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useArticles } from '@/hooks/useKnowledge'
import { CONTENT_TYPE_CONFIG } from '@/types/knowledge'

export default function KnowledgeAnalytics() {
    const { t } = useTranslation(['knowledge', 'common'])
    const [timeRange, setTimeRange] = useState('90') // days

    const { data: articles, isLoading } = useArticles({ limit: 1000 })

    // Calculate analytics
    const analytics = useMemo(() => {
        if (!articles) return null

        const now = new Date()
        const rangeDate = new Date(now.getTime() - parseInt(timeRange) * 24 * 60 * 60 * 1000)
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

        // Filter articles based on range (for some metrics)
        // Note: Total counts usually consider all content, but "Activity" considers range.
        // We'll calculate totals globally, and "New" metrics by range.

        // GLOBAL STATS
        const totalArticles = articles.length
        const totalViews = articles.reduce((sum, a) => sum + (a.view_count || 0), 0)
        const avgViews = totalArticles > 0 ? Math.round(totalViews / totalArticles) : 0

        const publishedArticles = articles.filter(a => ['approved', 'published', 'APPROVED', 'PUBLISHED'].includes(a.status)).length
        const draftArticles = articles.filter(a => ['draft', 'DRAFT'].includes(a.status)).length

        // BY DEPARTMENT (Global)
        const deptStats: Record<string, { name: string, count: number, views: number }> = {}
        articles.forEach(a => {
            const deptId = a.department_id || 'general'
            const deptName = a.department?.name || t('general_category', 'General')

            if (!deptStats[deptId]) {
                deptStats[deptId] = { name: deptName, count: 0, views: 0 }
            }
            deptStats[deptId].count += 1
            deptStats[deptId].views += (a.view_count || 0)
        })
        const deptRanking = Object.values(deptStats).sort((a, b) => b.views - a.views)

        // BY TYPE (Global)
        const typeStats: Record<string, { count: number, views: number }> = {}
        articles.forEach(a => {
            if (!typeStats[a.content_type]) {
                typeStats[a.content_type] = { count: 0, views: 0 }
            }
            typeStats[a.content_type].count += 1
            typeStats[a.content_type].views += (a.view_count || 0)
        })

        // TIME RANGE STATS
        const newInPeriod = articles.filter(a => new Date(a.created_at) > rangeDate).length
        const updatedInPeriod = articles.filter(a => new Date(a.updated_at) > rangeDate).length

        // HEALTH
        const staleContent = articles.filter(a => new Date(a.updated_at) < ninetyDaysAgo).length
        const noViews = articles.filter(a => !a.view_count || a.view_count === 0).length

        // Top viewed (Global)
        const topViewed = [...articles]

            .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
            .slice(0, 10)

        return {
            totalArticles,
            publishedArticles,
            draftArticles,
            totalViews,
            avgViews,
            newInPeriod,
            updatedInPeriod,
            staleContent,
            noViews,
            deptRanking,
            typeStats,
            topViewed
        }
    }, [articles, timeRange, t])

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
                    ))}
                </div>
            </div>
        )
    }

    if (!analytics) return <div>{t('common.no_data')}</div>

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        {t('analytics.title')}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {t('analytics.subtitle', 'Track content performance, engagement, and health')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Time Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="30">{t('analytics.last_30_days')}</SelectItem>
                            <SelectItem value="90">{t('analytics.last_90_days')}</SelectItem>
                            <SelectItem value="180">{t('analytics.last_180_days')}</SelectItem>
                            <SelectItem value="365">{t('analytics.last_year')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600">{t('analytics.total_views')}</p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-gray-900">{analytics.totalViews.toLocaleString()}</span>
                                    <span className="text-sm text-gray-500">views</span>
                                </div>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Eye className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs text-blue-600 font-medium">
                            <Users className="h-3 w-3 mr-1" />
                            {analytics.avgViews} avg per article
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600">{t('analytics.published_content')}</p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-gray-900">{analytics.publishedArticles.toLocaleString()}</span>
                                    <span className="text-sm text-gray-500">articles</span>
                                </div>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-green-600" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs text-green-700 font-medium">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            {t('analytics.new_in_period', { count: analytics.newInPeriod })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-600">{t('analytics.content_freshness')}</p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-gray-900">{analytics.updatedInPeriod.toLocaleString()}</span>
                                    <span className="text-sm text-gray-500">updates</span>
                                </div>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                <RefreshCw className="h-5 w-5 text-purple-600" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-purple-600">
                            {t('analytics.updates_in_period', { count: parseInt(timeRange) })}
                        </div>
                    </CardContent>
                </Card>

                <Card className={cn("bg-gradient-to-br from-orange-50 to-white border-orange-100", analytics.staleContent > 10 && "border-l-4 border-l-orange-500")}>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-orange-600">{t('analytics.needs_attention')}</p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-gray-900">{analytics.staleContent}</span>
                                    <span className="text-sm text-gray-500">stale</span>
                                </div>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-orange-600" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-orange-600 flex items-center">
                            {t('analytics.unread_count_desc', { count: analytics.noViews })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Department Performance */}
                <Card className="lg:row-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-hotel-gold" />
                            {t('analytics.dept_performance')}
                        </CardTitle>
                        <CardDescription>
                            {t('analytics.dept_performance_desc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {analytics.deptRanking.slice(0, 8).map((dept, idx) => {
                                const maxViews = analytics.deptRanking[0].views || 1
                                const percent = (dept.views / maxViews) * 100
                                return (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="font-medium text-gray-700 flex items-center gap-2">
                                                <span className="w-5 text-gray-400 text-xs">{idx + 1}.</span>
                                                {dept.name}
                                            </div>
                                            <div className="text-gray-900 font-semibold">{dept.views.toLocaleString()} <span className="text-gray-400 font-normal text-xs ml-1">views</span></div>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-hotel-navy rounded-full transition-all duration-500"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-end text-xs text-gray-500">
                                            {dept.count} articles
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Content Type Breakdown */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{t('analytics.content_distribution')}</CardTitle>
                            <Badge variant="outline">{analytics.totalArticles} {t('common.total', 'Total')}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {CONTENT_TYPE_CONFIG.map(config => {
                                const stats = analytics.typeStats[config.type] || { count: 0, views: 0 }
                                if (stats.count === 0) return null
                                const percent = (stats.count / analytics.totalArticles) * 100

                                return (
                                    <div key={config.type} className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-md bg-opacity-10", `bg-${config.color}-100 text-${config.color}-700`)}>
                                            {/* Using a generic icon approach since we can't dynamically render lucide icons purely by string easily without map */}
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium text-gray-700">{config.label}</span>
                                                <span className="text-gray-500">{stats.count} ({Math.round(percent)}%)</span>
                                            </div>
                                            <Progress value={percent} className={cn("h-1.5", `text-${config.color}-600`)} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Health Check */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('analytics.library_health')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-center">
                                <div className="text-2xl font-bold text-red-600 mb-1">{analytics.staleContent}</div>
                                <div className="text-xs text-red-800 font-medium">{t('analytics.stale_articles_label')}</div>
                            </div>
                            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 text-center">
                                <div className="text-2xl font-bold text-yellow-600 mb-1">{analytics.draftArticles}</div>
                                <div className="text-xs text-yellow-800 font-medium">{t('analytics.drafts_pending')}</div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                                <div className="text-2xl font-bold text-gray-600 mb-1">{analytics.noViews}</div>
                                <div className="text-xs text-gray-800 font-medium">{t('analytics.unread_content')}</div>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-center">
                                <div className="text-2xl font-bold text-blue-600 mb-1">{Math.round((analytics.publishedArticles / analytics.totalArticles) * 100 || 0)}%</div>
                                <div className="text-xs text-blue-800 font-medium">{t('analytics.publication_rate')}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Content Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                                {t('analytics.top_performing_title')}
                            </CardTitle>
                            <CardDescription>{t('analytics.top_performing_desc')}</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link to="/knowledge/search?sort=popular">{t('view_all')}</Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('analytics.table.article')}</TableHead>
                                <TableHead>{t('analytics.table.department')}</TableHead>
                                <TableHead className="text-right">{t('analytics.table.views')}</TableHead>
                                <TableHead className="text-right">{t('analytics.table.last_updated')}</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analytics.topViewed.map((article) => (
                                <TableRow key={article.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">{article.title}</span>
                                            <span className="text-xs text-gray-500 capitalize">{article.content_type}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-normal text-xs">
                                            {article.department?.name || 'General'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {article.view_count?.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-gray-500">
                                        {new Date(article.updated_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link to={`/knowledge/${article.id}`}>{t('analytics.table.view_action')}</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
