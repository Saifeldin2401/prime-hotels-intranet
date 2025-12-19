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
    ArrowUpDown
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('search_page.title')}</h1>
                <p className="text-gray-600 mt-1">{t('search_page.subtitle')}</p>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className={cn(
                        "absolute top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400",
                        isRTL ? "right-3" : "left-3"
                    )} />
                    <Input
                        type="text"
                        placeholder={t('search_page.placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={cn("h-12 text-base", isRTL ? "pr-10" : "pl-10")}
                    />
                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn("absolute top-1/2 -translate-y-1/2 h-8 w-8 p-0", isRTL ? "left-2" : "right-2")}
                            onClick={() => setSearchQuery('')}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Sort & View Toggle */}
                <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[180px] h-12">
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SORT_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex border rounded-lg overflow-hidden">
                        <Button
                            variant={viewMode === 'list' ? 'default' : 'ghost'}
                            size="icon"
                            className="rounded-none h-12 w-12"
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-5 w-5" />
                        </Button>
                        <Button
                            variant={viewMode === 'grid' ? 'default' : 'ghost'}
                            size="icon"
                            className="rounded-none h-12 w-12"
                            onClick={() => setViewMode('grid')}
                        >
                            <Grid3X3 className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Type Quick Filters */}
                {Object.entries(CONTENT_TYPE_CONFIG).map(([type, config]) => {
                    const Icon = config.icon
                    const isActive = selectedTypes.includes(type as KnowledgeContentType)

                    return (
                        <Button
                            key={type}
                            variant={isActive ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleTypeFilter(type as KnowledgeContentType)}
                            className={cn(
                                "transition-all",
                                isActive && "bg-hotel-navy text-white"
                            )}
                        >
                            <Icon className="h-4 w-4 mr-1" />
                            {t(`content_types.${type}`, config.label)}
                        </Button>
                    )
                })}

                <div className="h-6 w-px bg-gray-300 mx-2" />

                {/* Category Filter */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder={t('search_page.filters.all_categories')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('search_page.filters.all_categories')}</SelectItem>
                        {categories?.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Department Filter */}
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder={t('search_page.filters.all_departments')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('search_page.filters.all_departments')}</SelectItem>
                        {departments?.map(dept => (
                            <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
                        <X className="h-4 w-4 mr-1" />
                        {t('search_page.filters.clear_all')}
                    </Button>
                )}
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                    {isLoading ? (
                        <Skeleton className="h-4 w-32" />
                    ) : (
                        t('search_page.results_count', { count: filteredArticles.length })
                    )}
                </span>
            </div>

            {/* Results */}
            {isLoading ? (
                <div className={cn(
                    viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'
                )}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Card key={i}>
                            <CardContent className="p-4">
                                <Skeleton className="h-5 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-full mb-3" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-6 w-16" />
                                    <Skeleton className="h-6 w-24" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : filteredArticles.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Search className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {t('search_page.no_results')}
                        </h3>
                        <p className="text-gray-500 mb-4">
                            {t('search_page.no_results_hint')}
                        </p>
                        <Button variant="outline" onClick={clearFilters}>
                            {t('search_page.filters.clear_filters')}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className={cn(
                    viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'
                )}>
                    {filteredArticles.map(article => {
                        const typeConfig = CONTENT_TYPE_CONFIG[article.content_type as KnowledgeContentType] || CONTENT_TYPE_CONFIG.sop
                        const Icon = typeConfig.icon
                        const typeLabel = t(`content_types.${article.content_type}`, typeConfig.label)

                        return (
                            <Link key={article.id} to={`/knowledge/${article.id}`}>
                                <Card className="hover:shadow-md hover:border-hotel-gold/50 transition-all cursor-pointer h-full">
                                    <CardContent className={cn(
                                        "p-4 h-full flex",
                                        viewMode === 'grid' ? 'flex-col' : 'flex-row items-start gap-4'
                                    )}>
                                        {/* Icon */}
                                        <div className={cn(
                                            "rounded-lg p-2 flex-shrink-0",
                                            typeConfig.color
                                        )}>
                                            <Icon className="h-5 w-5" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-medium text-gray-900 line-clamp-2">
                                                    {article.title}
                                                </h3>
                                                {article.featured && (
                                                    <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                                )}
                                            </div>

                                            {article.description && (
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                    {article.description}
                                                </p>
                                            )}

                                            {/* Meta */}
                                            <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                                                <Badge variant="outline" className={cn("text-xs", typeConfig.color)}>
                                                    {typeLabel}
                                                </Badge>
                                                {article.category?.name && (
                                                    <span>{article.category.name}</span>
                                                )}
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
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
