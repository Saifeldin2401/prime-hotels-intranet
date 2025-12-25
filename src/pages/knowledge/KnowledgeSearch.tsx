/**
 * KnowledgeSearch
 * 
 * Full-text search page for Knowledge Base with filters and sorting.
 */

import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    Search,
    Filter,
    X,
    FileText,
    BookOpen,
    CheckSquare,
    HelpCircle,
    Video,
    Image,
    ClipboardList,
    Link2,
    ChevronDown,
    Grid3X3,
    List,
    Clock,
    Eye,
    Star,
    Bookmark,
    ArrowUpDown,
    Sparkles,
    Loader2,
    ChevronRight
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useArticles, useCategories } from '@/hooks/useKnowledge'
import { useDepartments } from '@/hooks/useDepartments'
import type { KnowledgeContentType } from '@/types/knowledge'

const CONTENT_TYPE_CONFIG: Record<KnowledgeContentType, { icon: any; label: string; color: string }> = {
    sop: { icon: ClipboardList, label: 'SOP', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    policy: { icon: FileText, label: 'Policy', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    guide: { icon: BookOpen, label: 'Guide', color: 'bg-green-100 text-green-700 border-green-200' },
    checklist: { icon: CheckSquare, label: 'Checklist', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    reference: { icon: Link2, label: 'Reference', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    faq: { icon: HelpCircle, label: 'FAQ', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    video: { icon: Video, label: 'Video', color: 'bg-red-100 text-red-700 border-red-200' },
    visual: { icon: Image, label: 'Visual', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    document: { icon: FileText, label: 'Document', color: 'bg-gray-100 text-gray-700 border-gray-200' },
}

export default function KnowledgeSearch() {
    const { t, i18n } = useTranslation(['knowledge', 'common'])
    const isRTL = i18n.dir() === 'rtl'

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTypes, setSelectedTypes] = useState<KnowledgeContentType[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
    const [sortBy, setSortBy] = useState('relevance')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

    const SORT_OPTIONS = [
        { value: 'relevance', label: t('search_page.sort.relevance') },
        { value: 'updated', label: t('search_page.sort.updated') },
        { value: 'views', label: t('search_page.sort.views') },
        { value: 'title', label: t('search_page.sort.az') },
    ]

    const { data: articles, isLoading } = useArticles({
        search: searchQuery || undefined,
        type: selectedTypes.length === 1 ? selectedTypes[0] : undefined,
        limit: 50
    })

    const { data: categories } = useCategories()
    const { departments } = useDepartments()

    // Filter articles client-side for multi-type filtering
    const filteredArticles = useMemo(() => {
        if (!articles) return []

        let filtered = [...articles]

        // Filter by multiple types
        if (selectedTypes.length > 0) {
            filtered = filtered.filter(a => selectedTypes.includes(a.content_type as KnowledgeContentType))
        }

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(a => a.category_id === selectedCategory)
        }

        // Filter by department
        if (selectedDepartment !== 'all') {
            filtered = filtered.filter(a => a.department_id === selectedDepartment)
        }

        // Sort
        switch (sortBy) {
            case 'updated':
                filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                break
            case 'views':
                filtered.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
                break
            case 'title':
                filtered.sort((a, b) => a.title.localeCompare(b.title))
                break
        }

        return filtered
    }, [articles, selectedTypes, selectedCategory, selectedDepartment, sortBy])

    const toggleTypeFilter = useCallback((type: KnowledgeContentType) => {
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        )
    }, [])

    const clearFilters = () => {
        setSelectedTypes([])
        setSelectedCategory('all')
        setSelectedDepartment('all')
        setSortBy('relevance')
        setSearchQuery('')
    }

    const hasActiveFilters = selectedTypes.length > 0 || selectedCategory !== 'all' || selectedDepartment !== 'all' || searchQuery.length > 0

    // Get trending articles (most viewed)
    const trendingArticles = useMemo(() => {
        if (!articles) return []
        return [...articles]
            .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
            .slice(0, 4)
    }, [articles])

    return (
        <div className="space-y-8 pb-20">
            {/* Hero Search Section */}
            <div className="relative overflow-hidden rounded-3xl bg-hotel-navy text-white px-8 py-16 mb-8">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <BookOpen className="h-64 w-64 rotate-12" />
                </div>

                <div className="relative z-10 max-w-2xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                        {t('search_page.title', 'Knowledge Library')}
                    </h1>
                    <p className="text-blue-100 text-lg mb-8 opacity-90">
                        {t('search_page.subtitle', 'Search standard operating procedures, policies, and guides.')}
                    </p>

                    <div className="relative group">
                        <Search className={cn(
                            "absolute top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 group-focus-within:text-hotel-gold transition-colors",
                            isRTL ? "right-4" : "left-4"
                        )} />
                        <Input
                            type="text"
                            placeholder={t('search_page.placeholder', 'Type to search... (SOP, Policy, Guide)')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={cn(
                                "h-16 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white focus:text-gray-900 rounded-2xl transition-all shadow-2xl backdrop-blur-md",
                                isRTL ? "pr-12" : "pl-12"
                            )}
                        />
                        {searchQuery && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn("absolute top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-white/60 hover:text-white", isRTL ? "left-3" : "right-3")}
                                onClick={() => setSearchQuery('')}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Trending / Featured Carousel */}
            {!searchQuery && trendingArticles.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-hotel-navy flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-hotel-gold" />
                            {t('search_page.trending', 'Trending Articles')}
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {trendingArticles.map(article => (
                            <Link key={article.id} to={`/knowledge/${article.id}`}>
                                <Card className="h-full hover:shadow-xl hover:-translate-y-1 transition-all border-none bg-hotel-gold/5 group">
                                    <CardContent className="p-5 flex flex-col h-full">
                                        <div className="flex items-center gap-2 mb-3 text-hotel-gold">
                                            <Star className="h-4 w-4 fill-current" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{t(`content_types.${article.content_type}`)}</span>
                                        </div>
                                        <h3 className="font-bold text-hotel-navy group-hover:text-hotel-gold line-clamp-2 mb-2">{article.title}</h3>
                                        <div className="mt-auto pt-4 flex items-center justify-between text-[10px] text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Eye className="h-3 w-3" />
                                                {article.view_count} views
                                            </span>
                                            <span>{new Date(article.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-8">
                {/* Sidebar Filters */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="space-y-6">
                        {/* Type Filters */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Content Types</h3>
                            <div className="space-y-1">
                                {Object.entries(CONTENT_TYPE_CONFIG).map(([type, config]) => {
                                    const Icon = config.icon
                                    const isActive = selectedTypes.includes(type as KnowledgeContentType)

                                    return (
                                        <button
                                            key={type}
                                            onClick={() => toggleTypeFilter(type as KnowledgeContentType)}
                                            className={cn(
                                                "flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm transition-all",
                                                isActive
                                                    ? "bg-hotel-navy text-white font-medium shadow-lg shadow-hotel-navy/20"
                                                    : "text-gray-600 hover:bg-gray-100"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-1.5 rounded-lg", !isActive && config.color)}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                {t(`content_types.${type}`, config.label)}
                                            </div>
                                            {isActive && <CheckSquare className="h-3.5 w-3.5" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Dropdown Filters */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <div>
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Department</h3>
                                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                                    <SelectTrigger className="w-full bg-white border-gray-200">
                                        <SelectValue placeholder={t('search_page.filters.all_departments')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('search_page.filters.all_departments')}</SelectItem>
                                        {departments?.map(dept => (
                                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Category</h3>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="w-full bg-white border-gray-200">
                                        <SelectValue placeholder={t('search_page.filters.all_categories')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('search_page.filters.all_categories')}</SelectItem>
                                        {categories?.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {hasActiveFilters && (
                            <Button variant="outline" className="w-full border-dashed border-gray-300 text-gray-500 hover:text-hotel-navy" onClick={clearFilters}>
                                <X className="h-4 w-4 mr-2" />
                                Reset All Filters
                            </Button>
                        )}
                    </div>
                </div>

                {/* Main Content Areas */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-900">
                                {t('search_page.results_count', { count: filteredArticles.length })}
                            </span>
                            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-hotel-gold" />}
                        </div>

                        <div className="flex gap-2">
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-[160px] h-9 text-xs">
                                    <ArrowUpDown className="h-3.5 w-3.5 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SORT_OPTIONS.map(option => (
                                        <SelectItem key={option.value} value={option.value} className="text-xs">
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <Button
                                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-7 px-2 rounded-md"
                                    onClick={() => setViewMode('list')}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-7 px-2 rounded-md"
                                    onClick={() => setViewMode('grid')}
                                >
                                    <Grid3X3 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    {isLoading ? (
                        <div className={cn(
                            viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'
                        )}>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <Card key={i} className="animate-pulse">
                                    <CardContent className="p-4 flex gap-4">
                                        <Skeleton className="h-12 w-12 rounded-xl" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-3 w-1/2" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : filteredArticles.length === 0 ? (
                        <div className="bg-white rounded-3xl border-2 border-dashed border-gray-100 py-20 text-center">
                            <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search className="h-10 w-10 text-gray-300" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('search_page.no_results')}</h3>
                            <p className="text-gray-500 max-w-xs mx-auto">{t('search_page.no_results_hint')}</p>
                        </div>
                    ) : (
                        <div className={cn(
                            viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'
                        )}>
                            {filteredArticles.map(article => {
                                const typeConfig = CONTENT_TYPE_CONFIG[article.content_type as KnowledgeContentType] || CONTENT_TYPE_CONFIG.sop
                                const Icon = typeConfig.icon
                                const typeLabel = t(`content_types.${article.content_type}`, typeConfig.label)

                                if (viewMode === 'grid') {
                                    return (
                                        <Link key={article.id} to={`/knowledge/${article.id}`}>
                                            <Card className="group hover:shadow-2xl hover:border-hotel-gold/30 transition-all cursor-pointer h-full border-none shadow-sm flex flex-col">
                                                <CardContent className="p-6 flex flex-col h-full">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", typeConfig.color)}>
                                                            <Icon className="h-6 w-6" />
                                                        </div>
                                                        {article.featured && <Star className="h-4 w-4 text-hotel-gold fill-current" />}
                                                    </div>
                                                    <h3 className="font-bold text-xl text-hotel-navy group-hover:text-hotel-gold transition-colors mb-2 line-clamp-2">
                                                        {article.title}
                                                    </h3>
                                                    {article.description && (
                                                        <p className="text-sm text-gray-500 line-clamp-3 mb-6">
                                                            {article.description}
                                                        </p>
                                                    )}
                                                    <div className="mt-auto pt-6 border-t border-gray-50 flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        <span className="text-hotel-gold">{typeLabel}</span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {new Date(article.updated_at).toLocaleDateString()}
                                                        </span>
                                                        {article.view_count !== undefined && article.view_count > 0 && (
                                                            <span className="flex items-center gap-1">
                                                                <Eye className="h-3 w-3" />
                                                                {article.view_count}
                                                            </span>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    )
                                }

                                return (
                                    <Link key={article.id} to={`/knowledge/${article.id}`}>
                                        <div className="group bg-white p-4 rounded-2xl hover:bg-hotel-gold/5 border border-transparent hover:border-hotel-gold/20 transition-all flex items-center gap-4">
                                            <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105", typeConfig.color)}>
                                                <Icon className="h-7 w-7" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h3 className="font-bold text-gray-900 group-hover:text-hotel-navy transition-colors truncate">
                                                        {article.title}
                                                    </h3>
                                                    {article.featured && <Star className="h-3.5 w-3.5 text-hotel-gold fill-current" />}
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium whitespace-nowrap overflow-hidden">
                                                    <span className="text-hotel-gold font-bold uppercase">{typeLabel}</span>
                                                    <Separator orientation="vertical" className="h-2" />
                                                    <span>{article.category?.name || 'Uncategorized'}</span>
                                                    <Separator orientation="vertical" className="h-2" />
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(article.updated_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-300 group-hover:text-hotel-gold transition-colors">
                                                <ChevronRight className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
