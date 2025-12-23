import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    Search,
    Grid3X3,
    List,
    Clock,
    Eye,
    Star,
    ArrowUpDown,
    Plus,
    FilterX,
    Briefcase,
    RefreshCw,
    ChevronRight,
    FileText,
    ClipboardList,
    BookOpen,
    CheckSquare,
    FileSearch,
    HelpCircle,
    Video,
    Image,
    File
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useArticles, useBookmarks } from '@/hooks/useKnowledge'
import { useAuth } from '@/contexts/AuthContext'
import { KnowledgeSidebar } from '@/components/knowledge'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { CONTENT_TYPE_CONFIG, type KnowledgeContentType } from '@/types/knowledge'

const ICON_MAP: Record<string, any> = {
    ClipboardList,
    FileText,
    BookOpen,
    CheckSquare,
    FileSearch,
    HelpCircle,
    Video,
    Image,
    File,
}

export default function KnowledgeLibrary() {
    const { t, i18n } = useTranslation(['knowledge', 'common'])
    const { primaryRole } = useAuth()
    const isRTL = i18n.dir() === 'rtl'
    const [searchParams, setSearchParams] = useSearchParams()

    // Filters from search params
    const activeType = searchParams.get('type')
    const activeDept = searchParams.get('department')
    const activeFeatured = searchParams.get('featured') === 'true'
    const activeBookmarks = searchParams.get('bookmarks') === 'true'
    const searchQuery = searchParams.get('q') || ''

    const [sortBy, setSortBy] = useState('updated')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    const SORT_OPTIONS = [
        { value: 'relevance', label: t('search_page.sort.relevance') },
        { value: 'updated', label: t('search_page.sort.updated') },
        { value: 'views', label: t('search_page.sort.views') },
        { value: 'title', label: t('search_page.sort.az') },
    ]

    const { data: articles, isLoading } = useArticles({
        search: searchQuery || undefined,
        type: activeType || undefined,
        departmentId: activeDept || undefined,
        limit: 100
    })
    const { data: bookmarks } = useBookmarks()

    const filteredArticles = useMemo(() => {
        if (!articles) return []
        let filtered = [...articles]

        if (activeFeatured) {
            filtered = filtered.filter(a => a.featured)
        }

        if (activeBookmarks && bookmarks) {
            const bookmarkedIds = new Set(bookmarks.map(b => b.document_id))
            filtered = filtered.filter(a => bookmarkedIds.has(a.id))
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
    }, [articles, activeFeatured, activeBookmarks, bookmarks, sortBy])

    const handleSearch = (val: string) => {
        const newParams = new URLSearchParams(searchParams)
        if (val) newParams.set('q', val)
        else newParams.delete('q')
        setSearchParams(newParams)
    }

    const clearFilters = () => {
        setSearchParams(new URLSearchParams())
    }

    const breadcrumbItems = useMemo(() => {
        const items = [{ label: t('library.title', 'Knowledge Library'), href: '/knowledge/search' }]
        if (activeDept) items.push({ label: t('library.department', 'Department'), href: undefined })
        if (activeType) items.push({ label: t(`content_types.${activeType}`, activeType), href: undefined })
        if (activeFeatured) items.push({ label: t('library.featured', 'Featured'), href: undefined })
        if (activeBookmarks) items.push({ label: t('library.bookmarks', 'My Bookmarks'), href: undefined })
        if (searchQuery) items.push({ label: t('library.search_results', 'Search: {{q}}', { q: searchQuery }), href: undefined })
        return items
    }, [activeDept, activeType, activeFeatured, activeBookmarks, searchQuery, t])

    return (
        <div className="flex h-[calc(100vh-120px)] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
            {/* Sidebar */}
            <KnowledgeSidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-50/30">
                {/* Header Tray */}
                <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <Breadcrumbs items={breadcrumbItems} className="mb-1" />
                        <h1 className="text-xl font-bold text-hotel-navy truncate">
                            {activeDept ? t('library.browsing_dept', 'Browsing Department') :
                                activeType ? t('library.browsing_type', 'Browsing {{type}}', { type: t(`content_types.${activeType}`) }) :
                                    searchQuery ? t('library.search_results_title', 'Search Results') :
                                        t('library.master_library', 'Master Knowledge Library')}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {primaryRole !== 'staff' && (
                            <Link to="/knowledge/create">
                                <Button className="bg-hotel-navy text-white hover:bg-hotel-navy/90 gap-2 shadow-md">
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden sm:inline">{t('library.create_new', 'New Article')}</span>
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Filter & View Controls */}
                <div className="bg-white/50 backdrop-blur-sm px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100/50">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative flex-1 max-w-md">
                            <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 font-bold", isRTL ? "right-3" : "left-3")} />
                            <Input
                                placeholder={t('library.filter_within', 'Filter within these results...')}
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className={cn("h-10 border-none bg-white shadow-sm ring-1 ring-gray-100 focus-visible:ring-hotel-gold/50", isRTL ? "pr-10" : "pl-10")}
                            />
                        </div>
                        {searchParams.toString() && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 hover:text-red-500 gap-1">
                                <FilterX className="h-4 w-4" />
                                <span className="hidden md:inline">{t('library.clear_filters', 'Clear Filters')}</span>
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="h-10 w-[140px] bg-white border-none shadow-sm ring-1 ring-gray-100">
                                <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-gray-400" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {SORT_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex bg-white rounded-lg p-1 shadow-sm ring-1 ring-gray-100">
                            <Button
                                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                size="icon"
                                className={cn("h-8 w-8 rounded-md", viewMode === 'grid' ? "bg-hotel-navy text-white" : "text-gray-400")}
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid3X3 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="icon"
                                className={cn("h-8 w-8 rounded-md", viewMode === 'list' ? "bg-hotel-navy text-white" : "text-gray-400")}
                                onClick={() => setViewMode('list')}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                <ScrollArea className="flex-1">
                    <div className="p-6">
                        {isLoading || !bookmarks ? (
                            <div className={cn(
                                "grid gap-6",
                                viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
                            )}>
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <Skeleton key={i} className="h-48 rounded-xl" />
                                ))}
                            </div>
                        ) : filteredArticles.length > 0 ? (
                            <div className={cn(
                                "grid gap-6",
                                viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
                            )}>
                                {filteredArticles.map(article => {
                                    const typeConfig = CONTENT_TYPE_CONFIG.find(c => c.type === article.content_type)
                                    const Icon = typeConfig ? ICON_MAP[typeConfig.icon] : FileText
                                    const isBookmarked = bookmarks?.some(b => b.document_id === article.id)

                                    return (
                                        <Link key={article.id} to={`/knowledge/${article.id}`} className="group">
                                            <Card className={cn(
                                                "h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-gray-100",
                                                viewMode === 'list' && "flex flex-row items-center p-0"
                                            )}>
                                                <div className={cn(
                                                    "relative",
                                                    viewMode === 'grid' ? "h-1.5 w-full bg-gradient-to-r from-hotel-navy to-hotel-gold" : "h-full w-1.5 bg-hotel-navy"
                                                )} />

                                                <CardContent className={cn("p-5 flex flex-col h-full", viewMode === 'list' && "flex-row items-center gap-6 flex-1 py-4")}>
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors group-hover:bg-hotel-navy group-hover:text-white",
                                                        viewMode === 'list' && "mb-0",
                                                        "bg-hotel-navy/5 text-hotel-navy"
                                                    )}>
                                                        <Icon className="h-5 w-5" />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <h3 className="font-bold text-hotel-navy group-hover:text-hotel-gold transition-colors line-clamp-2">
                                                                {article.title}
                                                            </h3>
                                                            {article.featured && <Star className="h-4 w-4 text-hotel-gold fill-hotel-gold flex-shrink-0" />}
                                                            {isBookmarked && <Star className="h-4 w-4 text-hotel-gold fill-hotel-gold invisible group-hover:visible" />}
                                                        </div>

                                                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                                                            {article.description || t('library.no_description', 'No description provided')}
                                                        </p>

                                                        <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase font-bold tracking-wider text-gray-400">
                                                            <Badge variant="secondary" className="bg-hotel-navy/5 text-hotel-navy border-none px-2 py-0 h-5">
                                                                {t(`content_types.${article.content_type}`)}
                                                            </Badge>
                                                            {article.department?.name && (
                                                                <span className="flex items-center gap-1">
                                                                    <Briefcase className="h-3 w-3" />
                                                                    {article.department.name}
                                                                </span>
                                                            )}
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {new Date(article.updated_at).toLocaleDateString()}
                                                            </span>
                                                            {article.view_count > 0 && (
                                                                <span className="flex items-center gap-1">
                                                                    <Eye className="h-3 w-3" />
                                                                    {article.view_count}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {viewMode === 'list' && (
                                                        <div className="flex items-center gap-2 text-hotel-gold opacity-0 group-hover:opacity-100 transition-opacity pr-4">
                                                            <span className="text-xs font-bold">{t('library.view', 'View')}</span>
                                                            <ChevronRight className="h-4 w-4" />
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <Search className="h-8 w-8 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-bold text-hotel-navy">
                                    {activeBookmarks ? t('library.no_bookmarks', 'No bookmarks yet') : t('library.no_results', 'No results found')}
                                </h3>
                                <p className="text-gray-500 max-w-xs mx-auto mt-1">
                                    {activeBookmarks ? t('library.no_bookmarks_desc', 'Save articles you use frequently for quick access.') : t('library.no_results_desc', 'Try adjusting your search or filters.')}
                                </p>
                                {(searchQuery || activeType || activeDept || activeFeatured || activeBookmarks) && (
                                    <Button
                                        variant="outline"
                                        className="mt-6 border-hotel-navy/20 text-hotel-navy hover:bg-hotel-navy/5"
                                        onClick={clearFilters}
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        {t('library.clear_filters', 'Clear All Filters')}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}
