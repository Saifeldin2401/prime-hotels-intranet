import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/useDebounce'
import {
    ArrowUpDown,
    BookOpen,
    Briefcase,
    Building2,
    CheckCircle2,
    CheckSquare,
    ChevronRight,
    ClipboardList,
    Clock,
    Crown,
    Eye,
    File,
    FileSearch,
    FileText,
    FilterX,
    FolderOpen,
    Grid3X3,
    HelpCircle,
    Image,
    Layers,
    List,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    SlidersHorizontal,
    Sparkles,
    Star,
    Trash2,
    Video,
    X
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { DeleteConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { KnowledgeSidebar, AIArticleStudioModal } from '@/components/knowledge'
import { MasterVersionSyncModal } from '@/components/platform/MasterVersionSyncModal'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/contexts/TenantContext'
import { useArticles, useBookmarks, useFeaturedArticles, useRecentArticles, useRequiredReading } from '@/hooks/useKnowledge'
import { platformService } from '@/services/platformService'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { KnowledgeArticle, KnowledgeContentType } from '@/types/knowledge'
import { CONTENT_TYPE_CONFIG } from '@/types/knowledge'

const ICON_MAP = {
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

function readTime(article: { estimated_read_time?: number; content?: string }): number {
    if (article.estimated_read_time && article.estimated_read_time > 0) return article.estimated_read_time
    if (!article.content) return 2
    let previous: string
    let stripped = article.content
    do {
        previous = stripped
        stripped = previous.replace(/<[^>]*>/g, ' ')
    } while (stripped !== previous)
    stripped = stripped.replace(/\s+/g, ' ').trim()
    if (!stripped) return 2
    return Math.max(1, Math.round(stripped.split(' ').length / 200))
}

const CATEGORY_CHIPS: { type: string; labelKey: string; defaultLabel: string; icon: any }[] = [
    { type: 'all', labelKey: 'library.all_knowledge', defaultLabel: 'All Procedures', icon: Layers },
    { type: 'sop', labelKey: 'content_types.sop', defaultLabel: 'SOPs', icon: ClipboardList },
    { type: 'policy', labelKey: 'content_types.policy', defaultLabel: 'Policies', icon: FileText },
    { type: 'guide', labelKey: 'content_types.guide', defaultLabel: 'Guides', icon: BookOpen },
    { type: 'checklist', labelKey: 'content_types.checklist', defaultLabel: 'Checklists', icon: CheckSquare },
    { type: 'faq', labelKey: 'content_types.faq', defaultLabel: 'FAQs', icon: HelpCircle },
    { type: 'master', labelKey: 'viewer.master_sop', defaultLabel: 'Master SOPs', icon: Sparkles },
    { type: 'required', labelKey: 'library.required_reading', defaultLabel: 'Required Reading', icon: Clock },
    { type: 'bookmarks', labelKey: 'library.bookmarks', defaultLabel: 'Saved Articles', icon: Star },
]

export default function KnowledgeBrowse() {
    const { t, i18n } = useTranslation(['knowledge', 'common'])
    const { primaryRole } = useAuth()
    const navigate = useNavigate()
    const isRTL = i18n.dir() === 'rtl'
    const [searchParams, setSearchParams] = useSearchParams()

    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [isAiStudioOpen, setIsAiStudioOpen] = useState(false)

    // Filters from search params
    const activeType = searchParams.get('type')
    const activeDept = searchParams.get('department')
    const activeFeatured = searchParams.get('featured') === 'true'
    const activeBookmarks = searchParams.get('bookmarks') === 'true'
    const activeRequired = searchParams.get('f') === 'required'
    const activeMaster = searchParams.get('master') === 'true'
    const searchQuery = searchParams.get('q') || ''

    const [localSearch, setLocalSearch] = useState(searchQuery)
    const debouncedSearch = useDebounce(localSearch, 300)

    useEffect(() => {
        setLocalSearch(searchQuery)
    }, [searchQuery])

    const [sortBy, setSortBy] = useState('updated')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

    const SORT_OPTIONS = [
        { value: 'relevance', label: t('search_page.sort.relevance', 'Relevance') },
        { value: 'updated', label: t('search_page.sort.updated', 'Recently Updated') },
        { value: 'views', label: t('search_page.sort.views', 'Most Viewed') },
        { value: 'title', label: t('search_page.sort.az', 'Title A-Z') },
    ]

    const { data: articles, isLoading: articlesLoading } = useArticles({
        search: debouncedSearch || undefined,
        type: activeType || undefined,
        departmentId: activeDept || undefined,
        required: activeRequired || undefined,
        limit: 100
    })
    const { data: bookmarks } = useBookmarks()
    const { data: requiredReading, isLoading: requiredLoading } = useRequiredReading()

    // Master Content Deployments for SOP version sync
    const { currentOrganization } = useTenant()
    const { data: masterDeployments, refetch: refetchDeployments } = useQuery({
        queryKey: ['master-content-deployments-sop', currentOrganization?.id],
        queryFn: () => platformService.getDeploymentsForTenant(currentOrganization?.id || ''),
        enabled: !!currentOrganization?.id
    })

    const deploymentsByTargetId = useMemo(() => {
        const map = new Map<string, any>()
        masterDeployments?.forEach((dep) => {
            map.set(dep.target_content_id, dep)
        })
        return map
    }, [masterDeployments])

    // Sync with Master Modal State
    const [syncModalState, setSyncModalState] = useState<{
        open: boolean
        article: KnowledgeArticle | null
    }>({ open: false, article: null })

    const isLoading = articlesLoading || (activeRequired && requiredLoading)

    const filteredArticles = useMemo(() => {
        if (!articles) return []
        let filtered = [...articles]

        if (activeMaster) {
            filtered = filtered.filter(a => a.is_master_template || a.master_source_id)
        }

        if (activeFeatured) {
            filtered = filtered.filter(a => a.featured)
        }

        if (activeBookmarks && bookmarks) {
            const bookmarkedIds = new Set(bookmarks.map(b => b.document_id))
            filtered = filtered.filter(a => bookmarkedIds.has(a.id))
        }

        if (activeRequired && requiredReading) {
            const pendingIds = new Set(requiredReading.filter(r => !r.is_acknowledged).map(r => r.document_id))
            filtered = filtered.filter(a => pendingIds.has(a.id))
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
    }, [articles, activeMaster, activeFeatured, activeBookmarks, bookmarks, activeRequired, requiredReading, sortBy])

    // Featured / recent content for the idle hub (shown when nothing is filtered)
    const { data: featured } = useFeaturedArticles(6)
    const { data: recentArticles } = useRecentArticles(8)
    const hasAnyFilter = Boolean(
        activeType || activeDept || activeFeatured || activeBookmarks || activeRequired || activeMaster || debouncedSearch
    )
    const showHub = !hasAnyFilter

    const handleSearch = (val: string) => {
        setLocalSearch(val)
        const newParams = new URLSearchParams(searchParams)
        if (val) newParams.set('q', val)
        else newParams.delete('q')
        setSearchParams(newParams)
    }

    const clearSearch = () => {
        setLocalSearch('')
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('q')
        setSearchParams(newParams)
    }

    const clearFilters = () => {
        setLocalSearch('')
        setSearchParams(new URLSearchParams())
    }

    const setChipFilter = (filterType: string) => {
        const newParams = new URLSearchParams()
        if (searchQuery) newParams.set('q', searchQuery)
        if (activeDept) newParams.set('department', activeDept)

        if (filterType === 'all') {
            // clear specific type filters
        } else if (filterType === 'required') {
            newParams.set('f', 'required')
        } else if (filterType === 'bookmarks') {
            newParams.set('bookmarks', 'true')
        } else if (filterType === 'master') {
            newParams.set('master', 'true')
        } else {
            newParams.set('type', filterType)
        }
        setSearchParams(newParams)
    }

    const isCurrentChipActive = (chipType: string) => {
        if (chipType === 'all') return !activeType && !activeRequired && !activeBookmarks && !activeMaster
        if (chipType === 'required') return activeRequired
        if (chipType === 'bookmarks') return activeBookmarks
        if (chipType === 'master') return activeMaster
        return activeType === chipType
    }

    const canManage = primaryRole !== 'staff'

    const handleConfirmDelete = async () => {
        if (!deleteId) return
        try {
            setDeleting(true)
            const { error } = await supabase
                .from('documents')
                .update({ is_deleted: true })
                .eq('id', deleteId)

            if (error) throw error
            setDeleteId(null)
        } finally {
            setDeleting(false)
        }
    }

    const breadcrumbItems = useMemo(() => {
        const items = [{ label: t('library.title', 'Knowledge Library'), href: '/knowledge' }]
        if (activeDept) items.push({ label: t('library.department', 'Department'), href: undefined })
        if (activeType) items.push({ label: t(`content_types.${activeType}`, activeType), href: undefined })
        if (activeMaster) items.push({ label: t('viewer.master_sop', 'Master SOPs'), href: undefined })
        if (activeFeatured) items.push({ label: t('library.featured', 'Featured'), href: undefined })
        if (activeBookmarks) items.push({ label: t('library.bookmarks', 'My Bookmarks'), href: undefined })
        if (activeRequired) items.push({ label: t('library.required_reading', 'Required Reading'), href: undefined })
        if (searchQuery) items.push({ label: t('library.search_results', 'Search: {{q}}', { q: searchQuery }), href: undefined })
        return items
    }, [activeDept, activeType, activeMaster, activeFeatured, activeBookmarks, activeRequired, searchQuery, t])

    return (
        <>
            <div className="flex min-h-[calc(100vh-100px)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl lg:h-[calc(100vh-100px)] lg:flex-row">
                {/* Sidebar */}
                <div className="hidden lg:flex lg:h-full lg:shrink-0">
                    <KnowledgeSidebar />
                </div>

                {/* Main Content Pane */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 lg:min-h-0">
                    {/* Editorial Search Hero */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-hotel-navy via-[#1b2a47] to-[#0f172a] text-white px-5 py-6 sm:px-8 sm:py-8 border-b border-hotel-navy/20 shadow-md">
                        {/* Ambient decorative lighting */}
                        <div className="absolute -top-24 -end-24 w-80 h-80 rounded-full bg-hotel-gold/10 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-20 -start-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

                        <div className="relative z-10 space-y-4 max-w-5xl">
                            {/* Breadcrumbs & Controls */}
                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                <Breadcrumbs items={breadcrumbItems} className="text-slate-300 [&_a]:text-slate-300 [&_a:hover]:text-hotel-gold" />
                                {canManage && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => setIsAiStudioOpen(true)}
                                            size="sm"
                                            className="bg-purple-600/90 hover:bg-purple-600 text-white gap-1.5 shadow-sm font-semibold backdrop-blur-xs border border-purple-400/30"
                                        >
                                            <Sparkles className="h-3.5 w-3.5 text-purple-200 animate-pulse" />
                                            <span className="hidden sm:inline">AI Article Studio</span>
                                        </Button>
                                        <Link to="/knowledge/create">
                                            <Button size="sm" className="bg-hotel-gold hover:bg-hotel-gold-dark text-hotel-navy font-bold gap-1.5 shadow-sm border border-hotel-gold/40">
                                                <Plus className="h-3.5 w-3.5" />
                                                <span className="hidden sm:inline">{t('library.create_new', 'New Article')}</span>
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Hero Header Title */}
                            <div>
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black tracking-tight text-white flex items-center gap-3">
                                    <span>
                                        {activeDept ? t('library.browsing_dept', 'Browsing Department') :
                                            activeType ? t('library.browsing_type', 'Browsing {{type}}', { type: t(`content_types.${activeType}`) }) :
                                                activeMaster ? t('viewer.master_sop', 'Master Standard Operating Procedures') :
                                                    activeRequired ? t('library.required_reading', 'Required Reading') :
                                                        searchQuery ? t('library.search_results_title', 'Search Results') :
                                                            t('library.master_library', 'Knowledge Base & SOP Standards')}
                                    </span>
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-300/90 mt-1 max-w-2xl leading-relaxed">
                                    {t('hero_description', 'Access verified standard operating procedures, luxury service benchmarks, and brand policies across all hotel properties.')}
                                </p>
                            </div>

                            {/* Elevated Search Bar */}
                            <div className="relative w-full max-w-3xl">
                                <Search className={cn("absolute top-1/2 -translate-y-1/2 h-5 w-5 text-hotel-gold/80", isRTL ? "end-4" : "start-4")} />
                                <Input
                                    placeholder={t('search_placeholder', 'Search SOPs, luxury benchmarks, checklists, policies...')}
                                    value={localSearch}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className={cn(
                                        "h-12 text-sm sm:text-base bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder:text-white/50 rounded-xl shadow-inner focus-visible:ring-2 focus-visible:ring-hotel-gold focus-visible:border-hotel-gold/80 transition-all",
                                        isRTL ? "pe-12 ps-20" : "ps-12 pe-20"
                                    )}
                                />
                                <div className={cn("absolute top-1/2 -translate-y-1/2 flex items-center gap-1", isRTL ? "start-3" : "end-3")}>
                                    {localSearch && (
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                            title="Clear search"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                    <div className="hidden sm:flex items-center text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/15 text-white/80 border border-white/20">
                                        ⌘K
                                    </div>
                                </div>
                            </div>

                            {/* Instant Category Filter Badges */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
                                {CATEGORY_CHIPS.map(chip => {
                                    const Icon = chip.icon
                                    const isActive = isCurrentChipActive(chip.type)
                                    return (
                                        <button
                                            key={chip.type}
                                            onClick={() => setChipFilter(chip.type)}
                                            className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border",
                                                isActive
                                                    ? "bg-hotel-gold text-hotel-navy border-hotel-gold shadow-md font-bold scale-102"
                                                    : "bg-white/10 hover:bg-white/20 text-white/90 border-white/15 backdrop-blur-xs"
                                            )}
                                        >
                                            <Icon className={cn("h-3.5 w-3.5", isActive ? "text-hotel-navy" : "text-hotel-gold/90")} />
                                            <span>{t(chip.labelKey, chip.defaultLabel)}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* View Controls & Filter Bar */}
                    <div className="bg-white px-4 sm:px-6 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 shadow-2xs">
                        <div className="flex items-center gap-3 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 lg:hidden border-slate-200"
                                onClick={() => setMobileSidebarOpen(true)}
                            >
                                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                                {t('library.filters', 'Filters')}
                            </Button>

                            <div className="text-xs font-medium text-slate-500">
                                {isLoading ? (
                                    <span>{t('common.loading', 'Loading articles...')}</span>
                                ) : (
                                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        {filteredArticles.length} {t('article_count_plural', 'procedures found')}
                                    </span>
                                )}
                            </div>

                            {hasAnyFilter && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="h-8 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-1.5 font-semibold"
                                >
                                    <FilterX className="h-3.5 w-3.5" />
                                    <span>{t('library.clear_filters', 'Clear All Filters')}</span>
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 justify-between sm:justify-end">
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="h-9 w-[160px] bg-slate-50/80 border-slate-200 text-xs font-medium text-slate-700">
                                    <ArrowUpDown className="h-3.5 w-3.5 me-2 text-slate-400" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SORT_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn("h-7 w-7 rounded-md", viewMode === 'grid' ? "bg-white text-hotel-navy shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900")}
                                    onClick={() => setViewMode('grid')}
                                    aria-label={t('library.grid_view', 'Grid view')}
                                >
                                    <Grid3X3 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn("h-7 w-7 rounded-md", viewMode === 'list' ? "bg-white text-hotel-navy shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900")}
                                    onClick={() => setViewMode('list')}
                                    aria-label={t('library.list_view', 'List view')}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Content Scroll Surface */}
                    <ScrollArea className="flex-1 lg:min-h-0 bg-slate-50/60">
                        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                            {/* Hub view when no active filter */}
                            {showHub && (featured?.length || recentArticles?.length) ? (
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    {featured && featured.length > 0 && (
                                        <section className="rounded-2xl border border-amber-200/60 bg-gradient-to-b from-amber-50/40 to-white p-5 shadow-xs">
                                            <h2 className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-900">
                                                <span className="flex items-center gap-2">
                                                    <Star className="h-4 w-4 text-hotel-gold fill-hotel-gold" />
                                                    {t('featured', 'Featured Procedures')}
                                                </span>
                                                <span className="text-[10px] text-amber-700 font-mono">{featured.length} VIP standards</span>
                                            </h2>
                                            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                                                {featured.slice(0, 6).map(a => (
                                                    <Link
                                                        key={a.id}
                                                        to={`/knowledge/${a.id}`}
                                                        className="group flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-slate-50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
                                                                <FileText className="h-4 w-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-slate-800 group-hover:text-hotel-navy truncate">{a.title}</p>
                                                                <p className="text-xs text-slate-400 truncate">{a.department?.name || t('general_category', 'General')}</p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-hotel-gold transition-colors shrink-0" />
                                                    </Link>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {recentArticles && recentArticles.length > 0 && (
                                        <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-100/50 to-white p-5 shadow-xs">
                                            <h2 className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                                                <span className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-hotel-navy" />
                                                    {t('recent', 'Recently Updated')}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-mono">Live Sync</span>
                                            </h2>
                                            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                                                {recentArticles.slice(0, 6).map(a => (
                                                    <Link
                                                        key={a.id}
                                                        to={`/knowledge/${a.id}`}
                                                        className="group flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-slate-50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 shrink-0">
                                                                <Clock className="h-4 w-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-slate-800 group-hover:text-hotel-navy truncate">{a.title}</p>
                                                                <p className="text-xs text-slate-400 truncate">{new Date(a.updated_at).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-hotel-gold transition-colors shrink-0" />
                                                    </Link>
                                                ))}
                                            </div>
                                        </section>
                                    )}
                                </div>
                            ) : null}

                            {/* Section Heading */}
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    {showHub ? t('library.all_articles', 'All Standard Procedures') : t('search_results', 'Filtered Repository')}
                                </h2>
                                <span className="text-xs font-semibold text-slate-500">
                                    {filteredArticles.length} {filteredArticles.length === 1 ? 'document' : 'documents'}
                                </span>
                            </div>

                            {/* Article Grid / List */}
                            {isLoading || !bookmarks ? (
                                <div className={cn(
                                    "grid gap-6",
                                    viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
                                )}>
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <Skeleton key={i} className="h-56 rounded-2xl" />
                                    ))}
                                </div>
                            ) : filteredArticles.length > 0 ? (
                                <div className={cn(
                                    "grid gap-6",
                                    viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
                                )}>
                                    {filteredArticles.map(article => {
                                        const typeConfig = CONTENT_TYPE_CONFIG.find(c => c.type === article.content_type)
                                        const Icon = typeConfig ? (ICON_MAP as any)[typeConfig.icon] || FileText : FileText
                                        const isBookmarked = bookmarks?.some(b => b.document_id === article.id)
                                        const requiredItem = requiredReading?.find(r => r.document_id === article.id)
                                        const isPendingAck = requiredItem && !requiredItem.is_acknowledged
                                        const minutesToRead = readTime(article)

                                        return (
                                            <div key={article.id} className="group relative h-full">
                                                <Link to={`/knowledge/${article.id}`} className="block h-full">
                                                    <Card className={cn(
                                                        "h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-slate-200/80 hover:border-hotel-gold/50 bg-white rounded-2xl flex flex-col justify-between",
                                                        viewMode === 'list' && "sm:flex-row sm:items-center sm:p-0"
                                                    )}>
                                                        {/* Top Accent Luxury Stripe */}
                                                        <div className={cn(
                                                            "relative transition-all duration-300",
                                                            viewMode === 'grid'
                                                                ? "h-1.5 w-full bg-gradient-to-r from-hotel-navy via-indigo-600 to-hotel-gold"
                                                                : "h-1.5 w-full bg-hotel-navy sm:h-full sm:w-2"
                                                        )} />

                                                        <CardContent className={cn(
                                                            "p-5 sm:p-6 flex flex-col justify-between flex-1",
                                                            viewMode === 'list' && "gap-4 sm:flex-row sm:items-center sm:gap-6 sm:flex-1 sm:py-5"
                                                        )}>
                                                            <div className="space-y-3">
                                                                {/* Top Badge Row */}
                                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        {/* Content Type Pill */}
                                                                        <Badge className="bg-hotel-navy/5 hover:bg-hotel-navy/10 text-hotel-navy border border-hotel-navy/10 text-[10px] font-bold uppercase tracking-wider h-5 px-2 py-0">
                                                                            <Icon className="h-3 w-3 me-1" />
                                                                            {t(`content_types.${article.content_type}`, article.content_type)}
                                                                        </Badge>

                                                                        {/* Department Badge */}
                                                                        {article.department?.name && (
                                                                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-medium h-5 px-2 py-0">
                                                                                <Briefcase className="h-2.5 w-2.5 me-1 text-slate-400" />
                                                                                {article.department.name}
                                                                            </Badge>
                                                                        )}

                                                                        {/* Master SOP Indicators */}
                                                                        {article.is_master_template && (
                                                                            <Badge className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] h-5 py-0 flex items-center gap-1 font-bold">
                                                                                <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                                                                                {t('viewer.master_sop', 'Master SOP')}
                                                                            </Badge>
                                                                        )}
                                                                        {article.master_source_id && (
                                                                            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] h-5 py-0 flex items-center gap-1 font-semibold">
                                                                                <Crown className="h-2.5 w-2.5 text-indigo-600" />
                                                                                {t('from_master', 'From Master')}
                                                                            </Badge>
                                                                        )}
                                                                        {deploymentsByTargetId.get(article.id)?.has_update_available && (
                                                                            <Badge
                                                                                onClick={(e) => {
                                                                                    e.preventDefault()
                                                                                    e.stopPropagation()
                                                                                    setSyncModalState({ open: true, article })
                                                                                }}
                                                                                className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] h-5 py-0 flex items-center gap-1 font-bold cursor-pointer shadow-sm animate-pulse"
                                                                            >
                                                                                <span>Update Available 🔔</span>
                                                                            </Badge>
                                                                        )}
                                                                    </div>

                                                                    {/* Top Right Highlights */}
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        {isPendingAck && (
                                                                            <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold h-5 py-0">
                                                                                {t('library.required', 'Required')}
                                                                            </Badge>
                                                                        )}
                                                                        {article.featured && (
                                                                            <span title="Featured procedure">
                                                                                <Star className="h-4 w-4 text-hotel-gold fill-hotel-gold" />
                                                                            </span>
                                                                        )}
                                                                        {isBookmarked && (
                                                                            <span title="Bookmarked">
                                                                                <Star className="h-4 w-4 text-hotel-gold fill-hotel-gold" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Title & Description */}
                                                                <div>
                                                                    <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 group-hover:text-hotel-navy transition-colors line-clamp-2 leading-snug">
                                                                        {article.title}
                                                                    </h3>
                                                                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                                                                        {article.description || t('common:no_description_provided', 'Standard operational procedures and quality compliance guide.')}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Bottom Metadata & Authorship */}
                                                            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <Avatar className="h-5 w-5 border border-slate-200">
                                                                        <AvatarImage src={article.author?.avatar_url} />
                                                                        <AvatarFallback className="bg-hotel-navy text-white text-[9px] font-bold">
                                                                            {article.author?.full_name?.charAt(0) || 'A'}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="truncate max-w-[120px] font-medium text-slate-600">
                                                                        {article.author?.full_name || t('library.unknown_author', 'System Admin')}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-3 font-semibold text-slate-500">
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="h-3 w-3 text-slate-400" />
                                                                        {minutesToRead} {t('article.min_read', 'min')}
                                                                    </span>
                                                                    <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                                                                        v{article.current_version || article.version || 1}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <Eye className="h-3 w-3 text-slate-400" />
                                                                        {article.view_count || 0}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </Link>

                                                {/* Floating Quick Actions on Hover */}
                                                {canManage && (
                                                    <div
                                                        className={cn(
                                                            "absolute z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200",
                                                            isRTL ? "start-3" : "end-3",
                                                            viewMode === 'grid' ? "top-3" : "top-3 sm:top-4"
                                                        )}
                                                    >
                                                        <Link
                                                            to={`/knowledge/${article.id}/edit`}
                                                            className="inline-flex"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 bg-white/95 shadow-md border border-slate-200 text-slate-700 hover:bg-hotel-navy hover:text-white transition-colors rounded-lg"
                                                                title={t('library.edit', { defaultValue: 'Edit Procedure' })}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 bg-white/95 shadow-md border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors rounded-lg"
                                                            title={t('library.delete', { defaultValue: 'Delete Procedure' })}
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                setDeleteId(article.id)
                                                            }}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                /* Editorial Empty State */
                                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/80 p-12 text-center max-w-xl mx-auto shadow-xs">
                                    <div className="w-16 h-16 bg-gradient-to-br from-hotel-navy/10 to-hotel-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-hotel-navy border border-hotel-gold/30">
                                        {activeBookmarks ? <Star className="h-8 w-8 text-hotel-gold" /> :
                                            activeRequired ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> :
                                                <Search className="h-8 w-8 text-hotel-navy" />}
                                    </div>
                                    <h3 className="text-xl font-serif font-bold text-slate-900">
                                        {activeBookmarks ? t('library.no_bookmarks', 'No saved bookmarks yet') :
                                            activeRequired ? t('library.no_required', 'All required reading is up to date') :
                                                t('library.no_results', 'No operational procedures found')}
                                    </h3>
                                    <p className="text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
                                        {activeBookmarks ? t('library.no_bookmarks_desc', 'Star frequently referenced SOPs and checklists to build your personalized quick-reference shelf.') :
                                            activeRequired ? t('library.no_required_desc', 'You have acknowledged all mandatory hotel policies and compliance standards.') :
                                                t('library.no_results_desc', 'Try adjusting your search keywords, clearing department filters, or browsing Master SOPs.')}
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                                        {hasAnyFilter && (
                                            <Button
                                                variant="outline"
                                                className="border-hotel-navy/30 text-hotel-navy hover:bg-hotel-navy/5 font-semibold"
                                                onClick={clearFilters}
                                            >
                                                <RefreshCw className="h-4 w-4 me-2" />
                                                {t('library.clear_filters', 'Clear All Filters')}
                                            </Button>
                                        )}
                                        {canManage && (
                                            <Link to="/knowledge/create">
                                                <Button className="bg-hotel-navy text-white hover:bg-hotel-navy/90 font-bold shadow-md">
                                                    <Plus className="h-4 w-4 me-2" />
                                                    {t('library.create_new', 'Draft New SOP')}
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            {/* Mobile Filter Sheet */}
            <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                <SheetContent side={isRTL ? 'right' : 'left'} className="w-[88vw] max-w-sm p-0">
                    <KnowledgeSidebar className="h-full w-full border-r-0" />
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmationDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                itemName={t('library.article', { defaultValue: 'article' })}
                onConfirm={handleConfirmDelete}
                isLoading={deleting}
            />

            {/* AI Knowledge Article Studio Modal */}
            <AIArticleStudioModal
                isOpen={isAiStudioOpen}
                onClose={() => setIsAiStudioOpen(false)}
                defaultContentType={(activeType as any) || 'sop'}
                onApplyArticle={(article) => {
                    let formattedContent = article.content_html
                    if (article.visual_asset?.image_url && !formattedContent.includes(article.visual_asset.image_url)) {
                        const imgUrl = article.visual_asset.image_url
                        let svgOrImg = `<img src="${imgUrl}" alt="${article.title}" class="max-h-80 w-full object-contain rounded-lg my-4" />`
                        if (imgUrl.startsWith('<svg') || imgUrl.includes('xmlns="http://www.w3.org/2000/svg"')) {
                            svgOrImg = imgUrl
                        } else if (imgUrl.startsWith('data:image/svg+xml')) {
                            try {
                                const commaIdx = imgUrl.indexOf(',')
                                if (commaIdx !== -1) {
                                    const header = imgUrl.slice(0, commaIdx)
                                    const body = imgUrl.slice(commaIdx + 1)
                                    const decoded = header.includes('base64') ? decodeURIComponent(escape(atob(body))) : decodeURIComponent(body)
                                    svgOrImg = decoded
                                }
                            } catch {}
                        }

                        formattedContent = `<div class="ai-schematic-card my-6 p-4 rounded-xl border bg-slate-950 text-center text-slate-300">\n${svgOrImg}\n<p class="text-xs text-slate-400 mt-2 italic">${article.visual_asset.caption || 'Operational SOP Vector Schematic'}</p>\n</div>\n\n${formattedContent}`
                    }

                    navigate('/knowledge/create', {
                        state: {
                            prefillArticle: {
                                title: article.title,
                                description: article.description,
                                summary: article.summary,
                                content: formattedContent,
                                content_type: article.content_type,
                                checklist_items: article.checklist_items || [],
                                faq_items: article.faq_items || [],
                                ai_tags: article.suggested_tags || [],
                            }
                        }
                    })
                }}
            />

            {/* Master SOP Version Sync Modal */}
            <MasterVersionSyncModal
                open={syncModalState.open}
                onOpenChange={(open) => setSyncModalState((prev) => ({ ...prev, open }))}
                targetContentId={syncModalState.article?.id || ''}
                targetTitle={syncModalState.article?.title || ''}
                contentType="sop"
                onSyncComplete={() => {
                    refetchDeployments()
                }}
            />
        </>
    )
}
