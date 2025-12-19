/**
 * KnowledgeHome - Main Knowledge Base Landing Page
 * 
 * Features:
 * - Hero search bar
 * - Featured articles
 * - Browse by category/type
 * - Required reading section
 * - Recently updated
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Search,
    BookOpen,
    FileText,
    CheckSquare,
    Video,
    HelpCircle,
    ArrowRight,
    Star,
    Clock,
    AlertCircle,
    Bookmark,
    TrendingUp,
    Plus,
    Filter,
    ClipboardList,
    Image,
    FileSearch
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
    useFeaturedArticles,
    useRecentArticles,
    useRequiredReading,
    useCategories,
    useContentTypeCounts,
    useDepartmentContentCounts
} from '@/hooks/useKnowledge'
import { CONTENT_TYPE_CONFIG, type KnowledgeContentType } from '@/types/knowledge'

const CONTENT_TYPE_ICONS: Record<KnowledgeContentType, any> = {
    sop: ClipboardList,
    policy: FileText,
    guide: BookOpen,
    checklist: CheckSquare,
    reference: FileSearch,
    faq: HelpCircle,
    video: Video,
    visual: Image,
    document: FileText
}

export default function KnowledgeHome() {
    const { t } = useTranslation('knowledge')
    const navigate = useNavigate()
    const { primaryRole } = useAuth()
    const [searchQuery, setSearchQuery] = useState('')

    const { data: featured, isLoading: featuredLoading } = useFeaturedArticles(6)
    const { data: recent, isLoading: recentLoading } = useRecentArticles(8)
    const { data: required, isLoading: requiredLoading } = useRequiredReading()
    const { data: categories } = useCategories()
    const { data: typeCounts } = useContentTypeCounts()
    const { data: deptCounts } = useDepartmentContentCounts()

    const canManage = ['regional_admin', 'regional_hr', 'property_hr', 'property_manager'].includes(primaryRole || '')

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            navigate(`/knowledge/search?q=${encodeURIComponent(searchQuery)}`)
        }
    }

    const pendingRequired = required?.filter(r => !r.is_acknowledged) || []

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Hero Section */}
            <div className="bg-hotel-navy relative overflow-hidden text-white py-16 md:py-20 px-4">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-hotel-gold blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-500 blur-3xl" />
                </div>

                <div className="container mx-auto max-w-4xl text-center relative z-10">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 font-serif tracking-tight text-white drop-shadow-sm">
                        {t('title')}
                    </h1>
                    <p className="text-white/90 mb-3 text-xl font-medium">
                        {t('subtitle')}
                    </p>
                    <p className="text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
                        {t('hero_description')}
                    </p>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto mb-8">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-hotel-gold to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative bg-white rounded-xl shadow-2xl flex items-center p-2">
                                <Search className="ml-4 h-6 w-6 text-gray-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('search_placeholder')}
                                    className="border-0 shadow-none focus-visible:ring-0 text-lg py-6 text-gray-900 placeholder:text-gray-400 bg-transparent flex-1"
                                />
                                <Button
                                    type="submit"
                                    className="bg-hotel-navy hover:bg-hotel-navy/90 text-white rounded-lg px-8 py-6 text-base font-medium transition-all duration-300 shadow-md hover:shadow-lg"
                                >
                                    {t('search_button')}
                                </Button>
                            </div>
                        </div>
                    </form>

                    {/* Quick Filters */}
                    <div className="flex flex-wrap justify-center gap-3">
                        {CONTENT_TYPE_CONFIG.slice(0, 6).map(config => {
                            const Icon = CONTENT_TYPE_ICONS[config.type]
                            return (
                                <Link
                                    key={config.type}
                                    to={`/knowledge/browse?type=${config.type}`}
                                    className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 hover:scale-105 backdrop-blur-sm border border-white/10 transition-all duration-300 flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow-md"
                                >
                                    <Icon className="h-4 w-4 text-hotel-gold" />
                                    {t(`content_types.${config.type}`, config.label)}
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="container mx-auto py-8 px-4 space-y-8">
                {/* Required Reading Alert */}
                {pendingRequired.length > 0 && (
                    <Card className="border-orange-200 bg-orange-50">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-orange-700">
                                    <AlertCircle className="h-5 w-5" />
                                    <CardTitle className="text-lg">{t('required_reading')}</CardTitle>
                                </div>
                                <Badge variant="secondary" className="bg-orange-200 text-orange-800">
                                    {t('pending_count', { count: pendingRequired.length })}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {pendingRequired.slice(0, 3).map(item => (
                                    <Link
                                        key={item.document_id}
                                        to={`/knowledge/${item.document_id}`}
                                        className="px-3 py-1.5 bg-white rounded-lg border border-orange-200 text-sm hover:bg-orange-100 transition-colors"
                                    >
                                        {item.title}
                                    </Link>
                                ))}
                                {pendingRequired.length > 3 && (
                                    <Link
                                        to="/knowledge/required"
                                        className="px-3 py-1.5 text-orange-700 text-sm hover:underline"
                                    >
                                        {t('more_count', { count: pendingRequired.length - 3 })}
                                    </Link>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Featured Articles */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-hotel-gold" />
                            <h2 className="text-xl font-bold">{t('featured')}</h2>
                        </div>
                        <Link to="/knowledge/browse?featured=true" className="text-sm text-hotel-gold hover:underline flex items-center gap-1">
                            {t('view_all')} <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    {featuredLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <Card key={i}>
                                    <CardContent className="p-4">
                                        <Skeleton className="h-4 w-20 mb-2" />
                                        <Skeleton className="h-6 w-full mb-2" />
                                        <Skeleton className="h-4 w-3/4" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {featured?.map(article => {
                                const Icon = CONTENT_TYPE_ICONS[article.content_type as KnowledgeContentType] || FileText
                                return (
                                    <Link key={article.id} to={`/knowledge/${article.id}`}>
                                        <Card className="h-full hover:shadow-lg transition-shadow border-l-4 border-l-hotel-gold">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Icon className="h-4 w-4 text-hotel-gold" />
                                                    <span className="text-xs uppercase text-gray-500 font-medium">
                                                        {t(`content_types.${article.content_type}`, article.content_type)}
                                                    </span>
                                                    {article.department?.name && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {article.department.name}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h3 className="font-semibold mb-1 line-clamp-2">{article.title}</h3>
                                                <p className="text-sm text-gray-600 line-clamp-2">{article.description}</p>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </section>

                {/* Browse by Department */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <BookOpen className="h-5 w-5 text-gray-600" />
                        <h2 className="text-xl font-bold">{t('browse_by_dept')}</h2>
                        <Badge variant="outline" className="text-xs">{t('personalized')}</Badge>
                    </div>

                    {Object.keys(deptCounts || {}).length === 0 ? (
                        <Card className="p-8 text-center">
                            <p className="text-gray-500">{t('no_dept_content')}</p>
                            <p className="text-sm text-gray-400 mt-2">{t('no_dept_content_desc')}</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(deptCounts || {}).map(([deptId, dept]: [string, any]) => (
                                <Link
                                    key={deptId}
                                    to={`/knowledge/browse?department=${deptId}`}
                                    className="p-6 rounded-xl border bg-white hover:shadow-lg transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-12 h-12 rounded-lg bg-hotel-navy/10 flex items-center justify-center">
                                            <BookOpen className="h-6 w-6 text-hotel-navy" />
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            {t(dept.total === 1 ? 'article_count' : 'article_count_plural', { count: dept.total })}
                                        </Badge>
                                    </div>

                                    <h3 className="font-semibold text-lg mb-2 group-hover:text-hotel-gold transition-colors">
                                        {dept.name}
                                    </h3>

                                    {/* Top 3 content types in this department */}
                                    <div className="flex flex-wrap gap-1">
                                        {Object.entries(dept.counts)
                                            .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
                                            .slice(0, 3)
                                            .map(([type, count]: [string, any]) => (
                                                <Badge key={type} variant="outline" className="text-xs capitalize">
                                                    {t(`content_types.${type}`, type)}: {count}
                                                </Badge>
                                            ))}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                {/* Recently Updated */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-gray-600" />
                            <h2 className="text-xl font-bold">{t('recent')}</h2>
                        </div>
                        <Link to="/knowledge/browse?sort=updated" className="text-sm text-hotel-gold hover:underline flex items-center gap-1">
                            {t('view_all')} <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    {recentLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4].map(i => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recent?.map(article => {
                                const Icon = CONTENT_TYPE_ICONS[article.content_type as KnowledgeContentType] || FileText
                                return (
                                    <Link
                                        key={article.id}
                                        to={`/knowledge/${article.id}`}
                                        className="flex items-center gap-4 p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                            <Icon className="h-5 w-5 text-gray-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium truncate">{article.title}</h4>
                                            <p className="text-sm text-gray-500 truncate">{article.description}</p>
                                        </div>
                                        <div className="text-xs text-gray-400 flex-shrink-0">
                                            {article.updated_at && new Date(article.updated_at).toLocaleDateString()}
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </section>

                {/* Admin Quick Actions */}
                {canManage && (
                    <section className="border-t pt-8">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="h-5 w-5 text-gray-600" />
                            <h2 className="text-xl font-bold">{t('manage')}</h2>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <Link to="/knowledge/create">
                                <Button className="bg-hotel-gold hover:bg-hotel-gold-dark text-hotel-navy">
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t('create_article')}
                                </Button>
                            </Link>
                            <Link to="/knowledge/review">
                                <Button variant="outline">
                                    {t('review_pending')}
                                </Button>
                            </Link>
                            <Link to="/knowledge/analytics">
                                <Button variant="outline">
                                    {t('analytics_action')}
                                </Button>
                            </Link>
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}
