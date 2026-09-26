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
    GraduationCap,
    Grid3X3,
    HelpCircle,
    Image,
    Laptop,
    Layers,
    Leaf,
    List,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    Star,
    Trash2,
    Utensils,
    Video,
    Wrench,
    X
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { WorkspaceHeader, headerActionClass } from '@/ui'
import { SearchField } from '@/ui/components/SearchField'
import { DeleteConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { KnowledgeSidebar, AIArticleStudioModal } from '@/components/knowledge'
import { MasterVersionSyncModal } from '@/components/platform/MasterVersionSyncModal'
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
import {
    useArticles,
    useBookmarks,
    useDepartmentContentCounts,
    useFeaturedArticles,
    useRecentArticles,
    useRequiredReading,
    useToggleBookmark
} from '@/hooks/useKnowledge'
import { platformService } from '@/services/platformService'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { KnowledgeArticle } from '@/types/knowledge'
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

const VISUAL_CATEGORIES: { id: string; nameKey: string; defaultName: string; matchTerms: string[]; icon: any }[] = [
    { id: 'all', nameKey: 'library.all_departments', defaultName: 'All Departments', matchTerms: ['all'], icon: Layers },
    { id: 'front-office', nameKey: 'departments.front_office', defaultName: 'Front Office', matchTerms: ['front', 'reception', 'concierge'], icon: Building2 },
    { id: 'housekeeping', nameKey: 'departments.housekeeping', defaultName: 'Housekeeping', matchTerms: ['housekeeping', 'clean'], icon: Sparkles },
    { id: 'fb', nameKey: 'departments.fb', defaultName: 'F&B', matchTerms: ['f&b', 'food', 'beverage', 'kitchen', 'dining', 'restaurant'], icon: Utensils },
    { id: 'safety', nameKey: 'departments.safety', defaultName: 'Safety', matchTerms: ['safety', 'security'], icon: ShieldCheck },
    { id: 'maintenance', nameKey: 'departments.maintenance', defaultName: 'Maintenance', matchTerms: ['maintenance', 'engineering'], icon: Wrench },
    { id: 'sustainability', nameKey: 'departments.sustainability', defaultName: 'Sustainability', matchTerms: ['sustainability', 'green', 'eco'], icon: Leaf },
    { id: 'hr-training', nameKey: 'departments.hr_training', defaultName: 'HR & Training', matchTerms: ['hr', 'human resources', 'training', 'learning', 'people'], icon: GraduationCap },
    { id: 'technology', nameKey: 'departments.technology', defaultName: 'Technology', matchTerms: ['technology', 'it', 'systems'], icon: Laptop },
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
    const { data: deptCounts } = useDepartmentContentCounts()
    const toggleBookmark = useToggleBookmark()

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

    const handleCategoryClick = (cat: typeof VISUAL_CATEGORIES[0]) => {
        const newParams = new URLSearchParams(searchParams)
        if (cat.id === 'all') {
            newParams.delete('department')
        } else {
            const matched = departmentsList.find(d => 
                cat.matchTerms.some(term => d.name.toLowerCase().includes(term.toLowerCase()))
            )
            if (matched) {
                newParams.set('department', matched.id)
            } else {
                newParams.set('q', cat.defaultName)
                setLocalSearch(cat.defaultName)
            }
        }
        setSearchParams(newParams)
    }

    const isCategoryActive = (cat: typeof VISUAL_CATEGORIES[0]) => {
        if (cat.id === 'all') return !activeDept
        if (!activeDept) return false
        const activeDeptObj = departmentsList.find(d => d.id === activeDept)
        if (!activeDeptObj) return false
        return cat.matchTerms.some(term => activeDeptObj.name.toLowerCase().includes(term.toLowerCase()))
    }

    const canManage = primaryRole !== 'staff' && primaryRole !== 'learner'

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

    const departmentsList = useMemo(() => {
        if (!deptCounts) return []
        return Object.entries(deptCounts).map(([id, dept]) => ({
            id,
            name: dept.name,
            total: dept.total
        }))
    }, [deptCounts])

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <WorkspaceHeader
                eyebrow={t('articleLibrary.eyebrow', 'Studio')}
                title={
                    activeDept ? t('library.browsing_dept', 'Browsing department') :
                    activeType ? t('library.browsing_type', 'Browsing {{type}}', { type: t(`content_types.${activeType}`, activeType) }) :
                    activeMaster ? t('viewer.master_sop', 'Master procedures') :
                    activeRequired ? t('library.required_reading', 'Required reading') :
                    searchQuery ? t('library.search_results_title', 'Search results') :
                    t('articleLibrary.title', 'Articles')
                }
                context={t('articleLibrary.context', 'Every procedure, policy and guide in your organization: drafts, in review and published.')}
                actions={canManage ? (
                    <>
                        <button type="button" onClick={() => setIsAiStudioOpen(true)} className={`${headerActionClass.secondary} hidden sm:inline-flex`}>
                            <Sparkles aria-hidden="true" className="h-4 w-4" />{t('articleLibrary.draftWithAi', 'Draft with AI')}
                        </button>
                        <Link to="/studio/articles/new" data-tour="knowledge-create-sop-btn" className={headerActionClass.primary}>
                            <Plus aria-hidden="true" className="h-4 w-4" />{t('library.create_new', 'New article')}
                        </Link>
                    </>
                ) : undefined}
            />

            {/* Controlled Search & Category Section */}
            <div className="space-y-4">
                <div data-tour="knowledge-search-bar" className="w-full">
                    <SearchField
                        placeholder={t('search_placeholder', 'Search SOPs, luxury benchmarks, checklists, policies...')}
                        value={localSearch}
                        onChange={(e) => handleSearch(e.target.value)}
                        onClear={clearSearch}
                        className="w-full"
                    />
                </div>

                {/* Visual Category Chips (Front Office, Housekeeping, F&B, Safety, Maintenance, Sustainability, HR & Training, Technology) */}
                <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-muted">
                        {t('library.categories', 'Categories')}
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                        {VISUAL_CATEGORIES.map(cat => {
                            const Icon = cat.icon
                            const active = isCategoryActive(cat)
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => handleCategoryClick(cat)}
                                    className={cn(
                                        "shrink-0 inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent",
                                        active
                                            ? "border-ds-ink bg-ds-ink text-ds-on-ink"
                                            : "border-ds-border bg-ds-surface text-ds-ink hover:border-ds-border-strong"
                                    )}
                                >
                                    <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                    <span>{t(cat.nameKey, cat.defaultName)}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Content Type Chips */}
                <div data-tour="knowledge-categories" className="flex items-center gap-1 overflow-x-auto border-b border-ds-border scrollbar-thin">
                    {CATEGORY_CHIPS.map(chip => {
                        const Icon = chip.icon
                        const isActive = isCurrentChipActive(chip.type)
                        return (
                            <button
                                key={chip.type}
                                type="button"
                                onClick={() => setChipFilter(chip.type)}
                                className={cn(
                                    "-mb-px shrink-0 inline-flex min-h-[40px] items-center gap-1.5 border-b-2 px-3 text-sm whitespace-nowrap transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent",
                                    isActive
                                        ? "border-ds-ink text-ds-ink"
                                        : "border-transparent text-ds-muted hover:text-ds-ink"
                                )}
                            >
                                <Icon className="h-3 w-3 shrink-0" />
                                <span>{t(chip.labelKey, chip.defaultLabel)}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Toolbar & Controls Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 lg:hidden border-ds-border rounded-[6px]"
                        onClick={() => setMobileSidebarOpen(true)}
                    >
                        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                        {t('library.filters', 'Filters')}
                    </Button>

                    <div className="text-xs font-medium text-muted-foreground">
                        {isLoading ? (
                            <span>{t('common.loading', 'Loading articles...')}</span>
                        ) : (
                            <span className="flex items-center gap-1.5 font-semibold text-foreground">
                                                                {t(filteredArticles.length === 1 ? 'article_count' : 'article_count_plural', {
                                    count: filteredArticles.length,
                                    defaultValue: `${filteredArticles.length} articles`
                                })}
                            </span>
                        )}
                    </div>

                    {hasAnyFilter && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="h-9 gap-1.5 text-sm text-ds-muted hover:text-ds-ink"
                        >
                            <FilterX className="h-3.5 w-3.5" />
                            <span>{t('library.clear_filters', 'Clear filters')}</span>
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-2.5 flex-wrap justify-between sm:justify-end">
                    {/* Department Dropdown Filter */}
                    {departmentsList.length > 0 && (
                        <Select
                            value={activeDept || 'all'}
                            onValueChange={(val) => {
                                const newParams = new URLSearchParams(searchParams)
                                if (val === 'all') newParams.delete('department')
                                else newParams.set('department', val)
                                setSearchParams(newParams)
                            }}
                        >
                            <SelectTrigger className="h-9 w-[170px] bg-muted/60 border-ds-border text-xs font-medium text-foreground rounded-[6px]">
                                <Building2 className="h-3.5 w-3.5 me-2 text-ds-accent" />
                                <SelectValue placeholder={t('library.all_departments', 'All Departments')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">{t('library.all_departments', 'All Departments')}</SelectItem>
                                {departmentsList.map(dept => (
                                    <SelectItem key={dept.id} value={dept.id} className="text-xs">
                                        {dept.name} ({dept.total})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Sort Selector */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="h-9 w-[155px] bg-muted/60 border-ds-border text-xs font-medium text-foreground rounded-[6px]">
                            <ArrowUpDown className="h-3.5 w-3.5 me-2 text-muted-foreground" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SORT_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* View Mode Toggle */}
                    <div className="flex bg-muted p-0.5 rounded-[6px] border border-ds-border">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-7 w-7 rounded-[4px]", viewMode === 'grid' ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground")}
                            onClick={() => setViewMode('grid')}
                            aria-label={t('library.grid_view', 'Grid view')}
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-7 w-7 rounded-[4px]", viewMode === 'list' ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground")}
                            onClick={() => setViewMode('list')}
                            aria-label={t('library.list_view', 'List view')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Featured / Recent Bento Blocks (when on default hub view) */}
            {showHub && (featured?.length || recentArticles?.length) ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {featured && featured.length > 0 && (
                        <section className="rounded-[8px] border border-ds-border bg-ds-surface p-5">
                            <h2 className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ds-accent">
                                <span className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-ds-accent fill-ds-accent" />
                                    {t('featured', 'Featured Procedures')}
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground">{featured.length} VIP standards</span>
                            </h2>
                            <div className="divide-y divide-[#DDDBD4] dark:divide-[#30404D] overflow-hidden rounded-[6px] border border-ds-border bg-card">
                                {featured.slice(0, 5).map(a => (
                                    <Link
                                        key={a.id}
                                        to={`/knowledge/${a.id}`}
                                        className="group flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-[6px] bg-ds-accent/10 flex items-center justify-center text-ds-accent shrink-0">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-foreground group-hover:text-ds-accent transition-colors truncate">{a.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">{a.department?.name || t('general_category', 'General')}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-ds-accent transition-colors shrink-0 rtl:rotate-180" />
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {recentArticles && recentArticles.length > 0 && (
                        <section className="rounded-[8px] border border-ds-border bg-ds-surface p-5">
                            <h2 className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-foreground">
                                <span className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-ds-accent" />
                                    {t('recent', 'Recently Updated')}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">Live Sync</span>
                            </h2>
                            <div className="divide-y divide-[#DDDBD4] dark:divide-[#30404D] overflow-hidden rounded-[6px] border border-ds-border bg-card">
                                {recentArticles.slice(0, 5).map(a => (
                                    <Link
                                        key={a.id}
                                        to={`/knowledge/${a.id}`}
                                        className="group flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-[6px] bg-ds-ink flex items-center justify-center text-ds-muted shrink-0">
                                                <Clock className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-foreground group-hover:text-ds-accent transition-colors truncate">{a.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">{new Date(a.updated_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-ds-accent transition-colors shrink-0 rtl:rotate-180" />
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            ) : null}

            {/* SOP Articles Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {showHub ? t('library.all_articles', 'All Standard Procedures') : t('search_results', 'Filtered Repository')}
                    </h2>
                    <span className="text-xs font-mono text-muted-foreground">
                        {filteredArticles.length} {filteredArticles.length === 1 ? 'document' : 'documents'}
                    </span>
                </div>

                {isLoading || !bookmarks ? (
                    <div className={cn(
                        "grid gap-6",
                        viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
                    )}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} className="h-56 rounded-[8px] bg-muted/70" />
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
                                            "h-full overflow-hidden transition-colors duration-150 border border-ds-border hover:border-ds-accent/40 bg-ds-surface rounded-[8px] flex flex-col justify-between shadow-none",
                                            viewMode === 'list' && "sm:flex-row sm:items-center sm:p-0"
                                        )}>
                                            <CardContent className={cn(
                                                "p-5 sm:p-6 flex flex-col justify-between flex-1",
                                                viewMode === 'list' && "gap-4 sm:flex-row sm:items-center sm:gap-6 sm:flex-1 sm:py-5"
                                            )}>
                                                <div className="space-y-3">
                                                    {/* Top Badge Row */}
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {/* Content Type Pill */}
                                                            <Badge className="bg-ds-accent/10 text-ds-accent border border-ds-accent/20 text-[10px] font-semibold uppercase tracking-wider h-5 px-2 py-0 rounded-[4px]">
                                                                <Icon className="h-3 w-3 me-1" />
                                                                {t(`content_types.${article.content_type}`, article.content_type)}
                                                            </Badge>

                                                            {/* Department Badge */}
                                                            {article.department?.name && (
                                                                <Badge variant="outline" className="bg-muted/60 text-muted-foreground border-ds-border text-[10px] font-medium h-5 px-2 py-0 rounded-[4px]">
                                                                    <Briefcase className="h-2.5 w-2.5 me-1 text-muted-foreground" />
                                                                    {article.department.name}
                                                                </Badge>
                                                            )}

                                                            {/* Master SOP Indicators */}
                                                            {article.is_master_template && (
                                                                <Badge className="bg-ds-warning-soft text-ds-warning border-ds-warning/30 text-[10px] h-5 py-0 flex items-center gap-1 font-semibold rounded-[4px]">
                                                                    <Sparkles className="h-2.5 w-2.5 text-ds-warning" />
                                                                    {t('viewer.master_sop', 'Master SOP')}
                                                                </Badge>
                                                            )}
                                                            {article.master_source_id && (
                                                                <Badge className="bg-ds-accent-soft text-ds-accent border-ds-accent/30 text-[10px] h-5 py-0 flex items-center gap-1 font-semibold rounded-[4px]">
                                                                    <Crown className="h-2.5 w-2.5 text-ds-accent" />
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
                                                                    className="bg-ds-warning hover:bg-ds-warning text-white text-[10px] h-5 py-0 flex items-center gap-1 font-semibold cursor-pointer shadow-none rounded-[4px]"
                                                                >
                                                                    <span>Update Available</span>
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {/* Top Right Highlights */}
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {isPendingAck && (
                                                                <Badge className="bg-ds-danger-soft text-ds-danger border-ds-danger/30 text-[10px] font-semibold h-5 py-0 rounded-[4px]">
                                                                    {t('library.required', 'Required')}
                                                                </Badge>
                                                            )}
                                                            {article.featured && (
                                                                <span title="Featured procedure">
                                                                    <Star className="h-4 w-4 text-ds-accent fill-ds-accent" />
                                                                </span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    e.stopPropagation()
                                                                    toggleBookmark.mutate(article.id)
                                                                }}
                                                                className="p-1 rounded text-muted-foreground hover:text-ds-accent transition-colors"
                                                                title={isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
                                                            >
                                                                <Star className={cn("h-4 w-4", isBookmarked ? "text-ds-accent fill-ds-accent" : "text-muted-foreground hover:text-ds-accent")} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Title & Description */}
                                                    <div>
                                                        <h3 className="font-sans text-base sm:text-lg font-bold text-foreground group-hover:text-ds-accent transition-colors line-clamp-2 leading-snug">
                                                            {article.title}
                                                        </h3>
                                                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                                                            {article.description || t('common:no_description_provided', 'Standard operational procedures and quality compliance guide.')}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Bottom Metadata & Authorship */}
                                                <div className="mt-4 pt-3 border-t border-ds-border flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Avatar className="h-5 w-5 border border-ds-border">
                                                            <AvatarImage src={article.author?.avatar_url} />
                                                            <AvatarFallback className="bg-ds-ink text-white text-[9px] font-bold">
                                                                {article.author?.full_name?.charAt(0) || 'A'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="truncate max-w-[120px] font-medium text-foreground">
                                                            {article.author?.full_name || t('library.unknown_author', 'System Admin')}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-3 font-semibold text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                                            {minutesToRead} {t('article.min_read', 'min')}
                                                        </span>
                                                        <span className="flex items-center gap-1 font-mono text-[10px]">
                                                            v{article.current_version || article.version || 1}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Eye className="h-3 w-3 text-muted-foreground" />
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
                                                "absolute z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                                                isRTL ? "start-3" : "end-3",
                                                viewMode === 'grid' ? "top-3" : "top-3 sm:top-4"
                                            )}
                                        >
                                            <Link
                                                to={`/studio/articles/${article.id}/edit`}
                                                className="inline-flex"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 bg-card shadow-sm border border-ds-border text-foreground hover:bg-ds-ink hover:text-white transition-colors rounded-[6px]"
                                                    title={t('library.edit', { defaultValue: 'Edit Procedure' })}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                            </Link>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 bg-card shadow-sm border border-ds-border text-ds-danger hover:bg-ds-danger hover:text-white transition-colors rounded-[6px]"
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
                    /* Architectural Empty State */
                    <div className="rounded-[8px] border border-ds-border bg-ds-surface p-10 text-center max-w-xl mx-auto shadow-none">
                        <div className="w-12 h-12 bg-ds-accent/10 rounded-[6px] flex items-center justify-center mx-auto mb-4 text-ds-accent border border-ds-accent/20">
                            {activeBookmarks ? <Star className="h-6 w-6 text-ds-accent" /> :
                                activeRequired ? <CheckCircle2 className="h-6 w-6 text-ds-success" /> :
                                    <Search className="h-6 w-6 text-ds-accent" />}
                        </div>
                        <h3 className="text-lg font-bold text-foreground">
                            {activeBookmarks ? t('library.no_bookmarks', 'No saved bookmarks yet') :
                                activeRequired ? t('library.no_required', 'All required reading is up to date') :
                                    t('library.no_results', 'No operational procedures found')}
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 leading-relaxed">
                            {activeBookmarks ? t('library.no_bookmarks_desc', 'Star frequently referenced SOPs and checklists to build your personalized quick-reference shelf.') :
                                activeRequired ? t('library.no_required_desc', 'You have acknowledged all mandatory hotel policies and compliance standards.') :
                                    t('library.no_results_desc', 'Try adjusting your search keywords, clearing department filters, or browsing Master SOPs.')}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                            {hasAnyFilter && (
                                <Button
                                    variant="outline"
                                    className="border-ds-border text-foreground hover:bg-muted font-medium rounded-[6px]"
                                    onClick={clearFilters}
                                >
                                    <RefreshCw className="h-4 w-4 me-2" />
                                    {t('library.clear_filters', 'Clear All Filters')}
                                </Button>
                            )}
                            {canManage && (
                                <Link to="/studio/articles/new">
                                    <Button className="bg-ds-ink hover:bg-[#725725] text-ds-on-ink font-medium rounded-[6px] shadow-none">
                                        <Plus className="h-4 w-4 me-2" />
                                        {t('library.create_new', 'Draft New SOP')}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Filter Sheet */}
            <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                <SheetContent side={isRTL ? 'right' : 'left'} className="w-[88vw] max-w-sm p-0">
                    <KnowledgeSidebar className="h-full w-full border-e-0" />
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

                        formattedContent = `<div class="ai-schematic-card my-6 p-4 rounded-xl border bg-ds-ink text-center text-ds-muted">\n${svgOrImg}\n<p class="text-xs text-ds-muted mt-2 italic">${article.visual_asset.caption || 'Operational SOP Vector Schematic'}</p>\n</div>\n\n${formattedContent}`
                    }

                    navigate('/studio/articles/new', {
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
        </div>
    )
}

