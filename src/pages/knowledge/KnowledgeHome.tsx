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
    useContentTypeCounts
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

    const canManage = ['regional_admin', 'regional_hr', 'property_hr', 'property_manager'].includes(primaryRole || '')

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            navigate(`/knowledge/search?q=${encodeURIComponent(searchQuery)}`)
        }
    }

    const pendingRequired = required?.filter(r => !r.is_acknowledged) || []

    return (
        <div className="min-h-screen bg-gradient-to-b from-hotel-navy/5 to-transparent">
            {/* Hero Section */}
            <div className="bg-hotel-navy text-white py-12 px-4">
                <div className="container mx-auto max-w-4xl text-center">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 font-serif">
                        Knowledge Base
                    </h1>
                    <p className="text-hotel-gold-light mb-8 text-lg">
                        Your centralized hub for SOPs, policies, guides, and operational knowledge
                    </p>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search articles, SOPs, policies..."
                            className="pl-12 pr-4 py-6 text-lg rounded-xl bg-white text-gray-900 border-0 shadow-lg"
                        />
                        <Button
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-hotel-gold hover:bg-hotel-gold-dark text-hotel-navy"
                        >
                            Search
                        </Button>
                    </form>

                    {/* Quick Filters */}
                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                        {CONTENT_TYPE_CONFIG.slice(0, 6).map(config => {
                            const Icon = CONTENT_TYPE_ICONS[config.type]
                            return (
                                <Link
                                    key={config.type}
                                    to={`/knowledge/browse?type=${config.type}`}
                                    className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-2 text-sm"
                                >
                                    <Icon className="h-4 w-4" />
                                    {config.label}
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
                                    <CardTitle className="text-lg">Required Reading</CardTitle>
                                </div>
                                <Badge variant="secondary" className="bg-orange-200 text-orange-800">
                                    {pendingRequired.length} pending
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
                                        +{pendingRequired.length - 3} more
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
                            <h2 className="text-xl font-bold">Featured</h2>
                        </div>
                        <Link to="/knowledge/browse?featured=true" className="text-sm text-hotel-gold hover:underline flex items-center gap-1">
                            View all <ArrowRight className="h-4 w-4" />
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
                                                        {article.content_type}
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

                {/* Browse by Type */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="h-5 w-5 text-gray-600" />
                        <h2 className="text-xl font-bold">Browse by Type</h2>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {CONTENT_TYPE_CONFIG.map(config => {
                            const Icon = CONTENT_TYPE_ICONS[config.type]
                            const count = typeCounts?.[config.type] || 0
                            return (
                                <Link
                                    key={config.type}
                                    to={`/knowledge/browse?type=${config.type}`}
                                    className="p-4 rounded-xl border bg-white hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={cn(
                                            "w-12 h-12 rounded-lg flex items-center justify-center",
                                            `bg-${config.color}-100`
                                        )}>
                                            <Icon className={cn("h-6 w-6", `text-${config.color}-600`)} />
                                        </div>
                                        {count > 0 && (
                                            <Badge variant="secondary" className="text-xs">
                                                {count}
                                            </Badge>
                                        )}
                                    </div>
                                    <h3 className="font-semibold group-hover:text-hotel-gold transition-colors">
                                        {config.label}
                                    </h3>
                                    <p className="text-sm text-gray-500">{config.description}</p>
                                </Link>
                            )
                        })}
                    </div>
                </section>

                {/* Recently Updated */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-gray-600" />
                            <h2 className="text-xl font-bold">Recently Updated</h2>
                        </div>
                        <Link to="/knowledge/browse?sort=updated" className="text-sm text-hotel-gold hover:underline flex items-center gap-1">
                            View all <ArrowRight className="h-4 w-4" />
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
                            <h2 className="text-xl font-bold">Manage Knowledge Base</h2>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <Link to="/knowledge/create">
                                <Button className="bg-hotel-gold hover:bg-hotel-gold-dark text-hotel-navy">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Article
                                </Button>
                            </Link>
                            <Link to="/knowledge/review">
                                <Button variant="outline">
                                    Review Pending
                                </Button>
                            </Link>
                            <Link to="/knowledge/analytics">
                                <Button variant="outline">
                                    View Analytics
                                </Button>
                            </Link>
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}
