/**
 * KnowledgeBrowse
 * 
 * Browse Knowledge Base by content type with visual grid.
 */

import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    FileText,
    BookOpen,
    CheckSquare,
    HelpCircle,
    Video,
    Image,
    ClipboardList,
    Link2,
    ChevronRight,
    TrendingUp,
    Clock,
    Star
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useArticles } from '@/hooks/useKnowledge'
import type { KnowledgeContentType } from '@/types/knowledge'

const CONTENT_TYPES: {
    type: KnowledgeContentType
    icon: any
    color: string
    gradient: string
}[] = [
        {
            type: 'sop',
            icon: ClipboardList,
            color: 'text-blue-600',
            gradient: 'from-blue-500 to-blue-600'
        },
        {
            type: 'policy',
            icon: FileText,
            color: 'text-purple-600',
            gradient: 'from-purple-500 to-purple-600'
        },
        {
            type: 'guide',
            icon: BookOpen,
            color: 'text-green-600',
            gradient: 'from-green-500 to-green-600'
        },
        {
            type: 'checklist',
            icon: CheckSquare,
            color: 'text-orange-600',
            gradient: 'from-orange-500 to-orange-600'
        },
        {
            type: 'reference',
            icon: Link2,
            color: 'text-gray-600',
            gradient: 'from-gray-500 to-gray-600'
        },
        {
            type: 'faq',
            icon: HelpCircle,
            color: 'text-yellow-600',
            gradient: 'from-yellow-500 to-yellow-600'
        },
        {
            type: 'video',
            icon: Video,
            color: 'text-red-600',
            gradient: 'from-red-500 to-red-600'
        },
        {
            type: 'visual',
            icon: Image,
            color: 'text-pink-600',
            gradient: 'from-pink-500 to-pink-600'
        },
        {
            type: 'document',
            icon: FileText,
            color: 'text-gray-600',
            gradient: 'from-gray-500 to-gray-600'
        },
    ]

export default function KnowledgeBrowse() {
    const { t } = useTranslation(['knowledge', 'common'])
    const [searchParams] = useSearchParams()
    const departmentId = searchParams.get('department')
    const typeFilter = searchParams.get('type')

    const { data: articles, isLoading } = useArticles({
        limit: 100,
        departmentId: departmentId || undefined,
        type: typeFilter || undefined
    })

    // Count articles by type
    const typeCounts = articles?.reduce((acc, article) => {
        const type = article.content_type as KnowledgeContentType
        acc[type] = (acc[type] || 0) + 1
        return acc
    }, {} as Record<KnowledgeContentType, number>) || {}

    // Get most viewed articles
    const popularArticles = articles
        ?.filter(a => a.view_count && a.view_count > 0)
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 5) || []

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('browse.title')}</h1>
                <p className="text-gray-600 mt-1">{t('browse.subtitle')}</p>

                {/* Active Filters */}
                {(departmentId || typeFilter) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {departmentId && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {t('search_page.filters.all_departments')} {/* Placeholder for Active Dept Name if available, or just generic */}
                                <Link
                                    to="/knowledge/browse"
                                    className="ml-1 hover:text-red-600"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        window.location.href = '/knowledge/browse'
                                    }}
                                >
                                    ×
                                </Link>
                            </Badge>
                        )}
                        {typeFilter && (
                            <Badge variant="secondary" className="flex items-center gap-1 capitalize">
                                {t(`content_types.${typeFilter}` as any)}
                                <Link
                                    to="/knowledge/browse"
                                    className="ml-1 hover:text-red-600"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        window.location.href = '/knowledge/browse'
                                    }}
                                >
                                    ×
                                </Link>
                            </Badge>
                        )}
                    </div>
                )}
            </div>

            {/* Content Type Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CONTENT_TYPES.map(({ type, icon: Icon, color, gradient }) => {
                    const count = typeCounts[type] || 0
                    const typeLabel = t(`content_types.${type}`, type)
                    const typeDesc = t(`content_type_desc.${type}`, '') // Assumes description keys exist or fallback

                    return (
                        <Link key={type} to={`/knowledge/search?type=${type}`}>
                            <Card className="group hover:shadow-lg transition-all cursor-pointer h-full overflow-hidden">
                                <CardContent className="p-0">
                                    {/* Gradient Header */}
                                    <div className={cn(
                                        "h-20 bg-gradient-to-br flex items-center justify-center",
                                        gradient
                                    )}>
                                        <Icon className="h-10 w-10 text-white opacity-90" />
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-gray-900 group-hover:text-hotel-gold transition-colors line-clamp-1">
                                                {typeLabel}
                                            </h3>
                                            <Badge variant="secondary" className="text-xs">
                                                {isLoading ? <Skeleton className="h-3 w-4" /> : count}
                                            </Badge>
                                        </div>
                                        {/* Optional: Add descriptions to knowledge.json if needed, currently reusing logic or omitting */}
                                        {/* <p className="text-xs text-gray-500 line-clamp-2">
                                            {typeDesc}
                                        </p> */}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>

            {/* Most Popular Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-hotel-gold" />
                        {t('browse.most_popular')}
                    </CardTitle>
                    <Link to="/knowledge/search?sort=views" className="text-sm text-hotel-gold hover:underline flex items-center">
                        {t('view_all')} <ChevronRight className="h-4 w-4" />
                    </Link>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded" />
                                    <div className="flex-1">
                                        <Skeleton className="h-4 w-3/4 mb-2" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : popularArticles.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">{t('search_page.no_results')}</p>
                    ) : (
                        <div className="space-y-3">
                            {popularArticles.map((article, index) => {
                                const typeConfig = CONTENT_TYPES.find(t => t.type === article.content_type)
                                const Icon = typeConfig?.icon || FileText

                                return (
                                    <Link
                                        key={article.id}
                                        to={`/knowledge/${article.id}`}
                                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 rounded bg-gray-100 text-gray-600">
                                            <span className="font-bold text-lg">{index + 1}</span>
                                        </div>
                                        <div className={cn(
                                            "w-10 h-10 rounded flex items-center justify-center",
                                            `bg-${typeConfig?.color.replace('text-', '')}/10`
                                        )}>
                                            <Icon className={cn("h-5 w-5", typeConfig?.color)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-gray-900 truncate">{article.title}</h4>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{t('viewer.views_count', { count: article.view_count })}</span>
                                                <span>•</span>
                                                <span>{article.category?.name || t('general_category')}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recently Updated */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-hotel-gold" />
                        {t('browse.recently_updated')}
                    </CardTitle>
                    <Link to="/knowledge/search?sort=updated" className="text-sm text-hotel-gold hover:underline flex items-center">
                        {t('view_all')} <ChevronRight className="h-4 w-4" />
                    </Link>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <Card key={i}>
                                    <CardContent className="p-4">
                                        <Skeleton className="h-4 w-3/4 mb-2" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {articles?.slice(0, 6).map(article => {
                                const typeConfig = CONTENT_TYPES.find(t => t.type === article.content_type)
                                const Icon = typeConfig?.icon || FileText

                                return (
                                    <Link key={article.id} to={`/knowledge/${article.id}`}>
                                        <Card className="hover:shadow-md hover:border-hotel-gold/50 transition-all h-full">
                                            <CardContent className="p-4 flex items-start gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded flex items-center justify-center flex-shrink-0",
                                                    typeConfig?.color.replace('text-', 'bg-').replace('600', '100')
                                                )}>
                                                    <Icon className={cn("h-5 w-5", typeConfig?.color)} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start gap-2">
                                                        <h4 className="font-medium text-gray-900 line-clamp-1">{article.title}</h4>
                                                        {article.featured && <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {t('viewer.updated_at', { date: new Date(article.updated_at).toLocaleDateString() })}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
