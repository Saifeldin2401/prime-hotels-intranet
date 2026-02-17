/**
 * KnowledgeSearch — Knowledge Library Search Page (Full Redesign)
 * Premium search + filter experience to match the redesigned KnowledgeHome.
 */

import { useState, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search,
    X,
    FileText,
    BookOpen,
    CheckSquare,
    HelpCircle,
    Video,
    Image,
    ClipboardList,
    Link2,
    List,
    LayoutGrid,
    Clock,
    Eye,
    Star,
    ArrowUpDown,
    Loader2,
    ChevronRight,
    ShieldCheck,
    SlidersHorizontal,
    ArrowLeft,
    Building2,
    Sparkles
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
import { Skeleton } from '@/components/ui/skeleton'
import { GroupedDepartmentSelector } from '@/components/shared/GroupedDepartmentSelector'
import { cn } from '@/lib/utils'
import { useArticles, useCategories } from '@/hooks/useKnowledge'
import { useDepartments } from '@/hooks/useDepartments'
import { useProperties } from '@/hooks/useProperties'
import type { KnowledgeContentType } from '@/types/knowledge'

/* ─── Type Configuration ───────────────────────────────────── */
const TYPE_CONFIG: Record<KnowledgeContentType, {
    icon: React.ElementType
    label: string
    gradient: string
    accent: string
    bg: string
    text: string
    ring: string
}> = {
    sop: { icon: ClipboardList, label: 'SOP', gradient: 'from-blue-500 to-blue-600', accent: 'text-blue-600', bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200' },
    policy: { icon: ShieldCheck, label: 'Policy', gradient: 'from-violet-500 to-purple-600', accent: 'text-violet-600', bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200' },
    guide: { icon: BookOpen, label: 'Guide', gradient: 'from-emerald-500 to-teal-600', accent: 'text-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
    checklist: { icon: CheckSquare, label: 'Checklist', gradient: 'from-amber-500 to-orange-500', accent: 'text-amber-600', bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
    reference: { icon: Link2, label: 'Reference', gradient: 'from-slate-500 to-gray-600', accent: 'text-slate-600', bg: 'bg-slate-50', text: 'text-slate-700', ring: 'ring-slate-200' },
    faq: { icon: HelpCircle, label: 'FAQ', gradient: 'from-sky-500 to-cyan-500', accent: 'text-sky-600', bg: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-200' },
    video: { icon: Video, label: 'Video', gradient: 'from-rose-500 to-red-600', accent: 'text-rose-600', bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200' },
    visual: { icon: Image, label: 'Visual', gradient: 'from-pink-500 to-fuchsia-500', accent: 'text-pink-600', bg: 'bg-pink-50', text: 'text-pink-700', ring: 'ring-pink-200' },
    document: { icon: FileText, label: 'Document', gradient: 'from-gray-500 to-gray-600', accent: 'text-gray-600', bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-200' },
}

/* ─── Helpers ──────────────────────────────────────────────── */
function readTime(content?: string): number {
    if (!content) return 2
    return Math.max(1, Math.round(content.split(/\s+/).length / 200))
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
}

const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.04, duration: 0.35, ease: 'easeOut' as const }
    })
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function KnowledgeSearch() {
    const { t, i18n } = useTranslation(['knowledge', 'common'])
    const isRTL = i18n.dir() === 'rtl'
    const [searchParams] = useSearchParams()

    /* State */
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
    const [selectedTypes, setSelectedTypes] = useState<KnowledgeContentType[]>(
        searchParams.get('type') ? [searchParams.get('type') as KnowledgeContentType] : []
    )
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedDepartment, setSelectedDepartment] = useState<string>(searchParams.get('department') || 'all')
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
    const [showFilters, setShowFilters] = useState(false)

    const SORT_OPTIONS = [
        { value: 'relevance', label: t('search_page.sort.relevance', 'Relevance') },
        { value: 'updated', label: t('search_page.sort.updated', 'Recently Updated') },
        { value: 'views', label: t('search_page.sort.views', 'Most Viewed') },
        { value: 'title', label: t('search_page.sort.az', 'A → Z') },
    ]

    /* Data */
    const { data: articles, isLoading } = useArticles({
        search: searchQuery || undefined,
        type: selectedTypes.length === 1 ? selectedTypes[0] : undefined,
        limit: 50
    })
    const { data: categories } = useCategories()
    const { departments } = useDepartments()
    const { data: properties } = useProperties()

    /* Filter + sort */
    const filteredArticles = useMemo(() => {
        if (!articles) return []
        let filtered = [...articles]

        if (selectedTypes.length > 0) {
            filtered = filtered.filter(a => selectedTypes.includes(a.content_type as KnowledgeContentType))
        }
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(a => a.category_id === selectedCategory)
        }
        if (selectedDepartment !== 'all') {
            filtered = filtered.filter(a => a.department_id === selectedDepartment)
        }

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

    /* Trending (when no search) */
    const trendingArticles = useMemo(() => {
        if (!articles || searchQuery) return []
        return [...articles].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 4)
    }, [articles, searchQuery])

    const toggleTypeFilter = useCallback((type: KnowledgeContentType) => {
        setSelectedTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        )
    }, [])

    const clearFilters = () => {
        setSelectedTypes([])
        setSelectedCategory('all')
        setSelectedDepartment('all')
        setSortBy('relevance')
        setSearchQuery('')
    }

    const hasActiveFilters = selectedTypes.length > 0 || selectedCategory !== 'all' || selectedDepartment !== 'all'
    const activeFilterCount = selectedTypes.length + (selectedCategory !== 'all' ? 1 : 0) + (selectedDepartment !== 'all' ? 1 : 0)

    /* ─── Render ─────────────────────────────────────────────── */
    return (
        <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-slate-50 to-white pb-16">

            {/* ═══ HEADER ══════════════════════════════════════════ */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950" />
                <div className="absolute top-1/2 start-1/3 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/8 rounded-full blur-[100px]" />
                <div className="absolute inset-0 opacity-[0.02]" style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }} />

                <div className="relative container mx-auto px-4 md:px-6 pt-8 pb-16 md:pt-10 md:pb-20">
                    {/* Back link */}
                    <Link to="/knowledge" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        {t('title')}
                    </Link>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl"
                    >
                        <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">
                            {t('search_page.title', 'Knowledge Library')}
                        </h1>
                        <p className="text-white/40 text-sm md:text-base mb-8">
                            {t('search_page.subtitle', 'Search standard operating procedures, policies, and guides')}
                        </p>
                    </motion.div>

                    {/* Search Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="max-w-2xl"
                    >
                        <div className="relative group">
                            <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-purple-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />
                            <div className="relative flex items-center bg-white/[0.07] backdrop-blur-xl border border-white/[0.1] rounded-2xl px-5 py-1 focus-within:bg-white/[0.12] transition-colors">
                                <Search className="w-5 h-5 text-white/30 shrink-0" />
                                <Input
                                    type="text"
                                    placeholder={t('search_page.placeholder', 'Type to search...')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="border-0 shadow-none focus-visible:ring-0 text-base md:text-lg py-5 text-white placeholder:text-white/25 bg-transparent flex-1"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="text-white/30 hover:text-white/60 transition-colors p-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="container mx-auto px-4 md:px-6 -mt-6 relative z-10">

                {/* ═══ TRENDING (when no search) ═══════════════════ */}
                {!searchQuery && trendingArticles.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            {t('search_page.trending', 'Trending')}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {trendingArticles.map((article, idx) => {
                                const cfg = TYPE_CONFIG[article.content_type as KnowledgeContentType] || TYPE_CONFIG.document
                                const Icon = cfg.icon
                                return (
                                    <motion.div key={article.id} custom={idx} variants={fadeUp} initial="hidden" animate="visible">
                                        <Link to={`/knowledge/${article.id}`} className="group block">
                                            <div className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 p-4 hover:shadow-md transition-all group-hover:-translate-y-0.5 h-full">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', cfg.bg)}>
                                                        <Icon className={cn('w-3.5 h-3.5', cfg.accent)} />
                                                    </div>
                                                    <span className={cn('text-[10px] font-bold uppercase tracking-wider', cfg.accent)}>
                                                        {t(`content_types.${article.content_type}`, cfg.label)}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-3 leading-snug">
                                                    {article.title}
                                                </h3>
                                                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                                    {article.view_count > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <Eye className="w-3 h-3" /> {article.view_count}
                                                        </span>
                                                    )}
                                                    <span>{timeAgo(article.updated_at)}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </motion.section>
                )}

                {/* ═══ TOOLBAR ═════════════════════════════════════ */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
                    <div className="flex items-center justify-between px-5 py-3.5 gap-4">
                        {/* Left: Result count + filter toggle */}
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-800">
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400 inline" />
                                ) : (
                                    t('search_page.results_count', { count: filteredArticles.length })
                                )}
                            </span>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border',
                                    showFilters || hasActiveFilters
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                        : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                                )}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                {t('search_page.filters_label', 'Filters')}
                                {activeFilterCount > 0 && (
                                    <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" /> {t('search_page.clear_filters', 'Clear')}
                                </button>
                            )}
                        </div>

                        {/* Right: Sort + view toggle */}
                        <div className="flex items-center gap-2">
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-[150px] h-8 text-xs border-gray-200 bg-gray-50">
                                    <ArrowUpDown className="w-3 h-3 me-1.5 text-gray-400" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SORT_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="flex bg-gray-100 p-0.5 rounded-lg">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        'p-1.5 rounded-md transition-colors',
                                        viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
                                    )}
                                >
                                    <List className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        'p-1.5 rounded-md transition-colors',
                                        viewMode === 'grid' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
                                    )}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Expandable Filter Panel ──────────────────── */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                            >
                                <div className="border-t border-gray-100 px-5 py-4 space-y-5">
                                    {/* Type pills */}
                                    <div>
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                                            {t('search_page.filters.content_type', 'Content Type')}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                                                const Icon = cfg.icon
                                                const isActive = selectedTypes.includes(type as KnowledgeContentType)
                                                return (
                                                    <button
                                                        key={type}
                                                        onClick={() => toggleTypeFilter(type as KnowledgeContentType)}
                                                        className={cn(
                                                            'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                                                            isActive
                                                                ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                        )}
                                                    >
                                                        <Icon className="w-3.5 h-3.5" />
                                                        {t(`content_types.${type}`, cfg.label)}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Department + Category row */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                                                {t('search_page.filters.department_label', 'Department')}
                                            </h3>
                                            <GroupedDepartmentSelector
                                                departments={departments as any}
                                                properties={properties as any}
                                                value={selectedDepartment}
                                                onValueChange={setSelectedDepartment}
                                                placeholder={t('search_page.filters.all_departments')}
                                                generalLabel={t('search_page.filters.all_departments', 'All Departments')}
                                                generalValue="all"
                                                className="w-full h-9 text-xs bg-white border-gray-200"
                                            />
                                        </div>
                                        <div>
                                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                                                {t('search_page.filters.category_label', 'Category')}
                                            </h3>
                                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                                <SelectTrigger className="w-full h-9 text-xs bg-white border-gray-200">
                                                    <SelectValue placeholder={t('search_page.filters.all_categories')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">{t('search_page.filters.all_categories', 'All Categories')}</SelectItem>
                                                    {categories?.map(cat => (
                                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Active filter chips */}
                    {hasActiveFilters && !showFilters && (
                        <div className="border-t border-gray-50 px-5 py-2.5 flex flex-wrap gap-2">
                            {selectedTypes.map(type => {
                                const cfg = TYPE_CONFIG[type]
                                return (
                                    <button
                                        key={type}
                                        onClick={() => toggleTypeFilter(type)}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors',
                                            cfg.bg, cfg.text
                                        )}
                                    >
                                        {t(`content_types.${type}`, cfg.label)}
                                        <X className="w-3 h-3" />
                                    </button>
                                )
                            })}
                            {selectedDepartment !== 'all' && (
                                <button
                                    onClick={() => setSelectedDepartment('all')}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700"
                                >
                                    {departments?.find(d => d.id === selectedDepartment)?.name}
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                            {selectedCategory !== 'all' && (
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700"
                                >
                                    {categories?.find(c => c.id === selectedCategory)?.name}
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ═══ RESULTS ═════════════════════════════════════ */}
                {isLoading ? (
                    <div className={cn(
                        viewMode === 'grid'
                            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                            : 'space-y-3'
                    )}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                                <div className="flex gap-4">
                                    <Skeleton className="w-10 h-10 rounded-lg" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredArticles.length === 0 ? (
                    /* Empty State */
                    <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-5">
                            <Search className="w-7 h-7 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{t('search_page.no_results', 'No results found')}</h3>
                        <p className="text-sm text-gray-400 max-w-xs mx-auto mb-6">
                            {t('search_page.no_results_hint', 'Try adjusting your search or filters')}
                        </p>
                        <Button variant="outline" onClick={clearFilters} className="rounded-xl">
                            {t('search_page.clear_filters', 'Clear all filters')}
                        </Button>
                    </div>
                ) : (
                    /* Results */
                    <div className={cn(
                        viewMode === 'grid'
                            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                            : 'bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden'
                    )}>
                        {filteredArticles.map((article, idx) => {
                            const cfg = TYPE_CONFIG[article.content_type as KnowledgeContentType] || TYPE_CONFIG.document
                            const Icon = cfg.icon
                            const typeLabel = t(`content_types.${article.content_type}`, cfg.label)

                            if (viewMode === 'grid') {
                                return (
                                    <motion.div key={article.id} custom={idx} variants={fadeUp} initial="hidden" animate="visible">
                                        <Link to={`/knowledge/${article.id}`} className="group block h-full">
                                            <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all bg-white overflow-hidden group-hover:-translate-y-0.5">
                                                <CardContent className="p-0 flex flex-col h-full">
                                                    <div className={cn('h-1 bg-gradient-to-r', cfg.gradient)} />
                                                    <div className="p-5 flex flex-col h-full">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', cfg.bg)}>
                                                                <Icon className={cn('w-5 h-5', cfg.accent)} />
                                                            </div>
                                                            {article.featured && (
                                                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                                            )}
                                                        </div>
                                                        <Badge className={cn('text-[10px] font-bold uppercase tracking-wider py-0 border-0 w-fit mb-2', cfg.bg, cfg.text)}>
                                                            {typeLabel}
                                                        </Badge>
                                                        <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2 leading-snug">
                                                            {article.title}
                                                        </h3>
                                                        {article.description && (
                                                            <p className="text-xs text-gray-400 line-clamp-2 mb-4">{article.description}</p>
                                                        )}
                                                        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center gap-3 text-[10px] text-gray-400">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> {readTime(article.content)} {t('article.min_read', 'min')}
                                                            </span>
                                                            {article.view_count > 0 && (
                                                                <span className="flex items-center gap-1">
                                                                    <Eye className="w-3 h-3" /> {article.view_count}
                                                                </span>
                                                            )}
                                                            <span className="ms-auto">
                                                                {timeAgo(article.updated_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    </motion.div>
                                )
                            }

                            /* List view */
                            return (
                                <Link
                                    key={article.id}
                                    to={`/knowledge/${article.id}`}
                                    className="group flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors"
                                >
                                    <div className={cn(
                                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                                        cfg.bg
                                    )}>
                                        <Icon className={cn('w-4 h-4', cfg.accent)} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className="text-sm font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors truncate">
                                                {article.title}
                                            </h3>
                                            {article.featured && (
                                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                                            <span className={cn('font-bold uppercase tracking-wider', cfg.accent)}>{typeLabel}</span>
                                            <span>·</span>
                                            <span>{article.category?.name || article.department?.name || t('general_category')}</span>
                                            <span>·</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {readTime(article.content)} {t('article.min_read', 'min')}
                                            </span>
                                            {article.view_count > 0 && (
                                                <>
                                                    <span>·</span>
                                                    <span className="flex items-center gap-1">
                                                        <Eye className="w-3 h-3" /> {article.view_count}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-[11px] text-gray-400 hidden sm:block">
                                            {timeAgo(article.updated_at)}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
