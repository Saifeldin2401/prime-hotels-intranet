/**
 * KnowledgeHome - Knowledge Base Homepage (Full Redesign)
 * Premium, content-forward design inspired by modern documentation platforms.
 */

import { KnowledgeAIAssistant } from '@/components/knowledge/KnowledgeAIAssistant'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import {
    useArticles,
    useFeaturedArticles,
    useRecentArticles,
    useRequiredReading
} from '@/hooks/useKnowledge'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
    AlertCircle,
    ArrowRight,
    BookMarked,
    BookOpen,
    Building2,
    ChevronRight,
    ClipboardList,
    Clock,
    Eye,
    FileText,
    Flame,
    GraduationCap,
    HelpCircle,
    Layers,
    Library,
    ListChecks,
    Pencil,
    Plus,
    Search,
    ShieldCheck,
    Sparkles,
    Star,
    TrendingUp,
    Users,
    Video
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

/* â”€â”€â”€ Content Type Configuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const TYPE_CONFIG: Record<string, {
    icon: React.ElementType
    gradient: string
    accent: string
    bg: string
    text: string
}> = {
    sop: { icon: ClipboardList, gradient: 'from-blue-500 to-blue-600', accent: 'text-blue-600', bg: 'bg-blue-50', text: 'text-blue-700' },
    policy: { icon: ShieldCheck, gradient: 'from-violet-500 to-purple-600', accent: 'text-violet-600', bg: 'bg-violet-50', text: 'text-violet-700' },
    guide: { icon: BookOpen, gradient: 'from-emerald-500 to-teal-600', accent: 'text-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    checklist: { icon: ListChecks, gradient: 'from-amber-500 to-orange-500', accent: 'text-amber-600', bg: 'bg-amber-50', text: 'text-amber-700' },
    faq: { icon: HelpCircle, gradient: 'from-sky-500 to-cyan-500', accent: 'text-sky-600', bg: 'bg-sky-50', text: 'text-sky-700' },
    reference: { icon: FileText, gradient: 'from-slate-500 to-gray-600', accent: 'text-slate-600', bg: 'bg-slate-50', text: 'text-slate-700' },
    video: { icon: Video, gradient: 'from-rose-500 to-red-600', accent: 'text-rose-600', bg: 'bg-rose-50', text: 'text-rose-700' },
}

const fadeUp = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] }
    })
}

/* â”€â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function readTime(article: { estimated_read_time?: number; content?: string }): number {
    if (article.estimated_read_time && article.estimated_read_time > 0) return article.estimated_read_time
    if (!article.content) return 2
    return Math.max(1, Math.round(article.content.split(/\s+/).length / 200))
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   COMPONENT
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export default function KnowledgeHome() {
    const { t } = useTranslation('knowledge')
    const navigate = useNavigate()
    const { primaryRole, departments } = useAuth()
    const [searchQuery, setSearchQuery] = useState('')
    const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)

    const primaryDept = departments?.[0]

    /* Data hooks */
    const { data: featured } = useFeaturedArticles(6)
    const { data: recentArticles } = useRecentArticles(8)
    const { data: required } = useRequiredReading()
    const { documents: recentlyViewed } = useRecentlyViewed(5)
    const { data: deptArticles } = useArticles({ departmentId: primaryDept?.id, limit: 5 })

    const pendingRequired = required?.filter(r => !r.is_acknowledged) || []
    const canCreate = primaryRole !== 'staff'

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            navigate(`/knowledge/search?q=${encodeURIComponent(searchQuery.trim())}`)
        }
    }

    const categoryCards = useMemo(() => [
        { type: 'sop', label: t('content_types.sop'), desc: t('content_type_desc.sop') },
        { type: 'policy', label: t('content_types.policy'), desc: t('content_type_desc.policy') },
        { type: 'guide', label: t('content_types.guide'), desc: t('content_type_desc.guide') },
        { type: 'checklist', label: t('content_types.checklist'), desc: t('content_type_desc.checklist') },
        { type: 'faq', label: t('content_types.faq'), desc: t('content_type_desc.faq') },
        { type: 'video', label: t('content_types.video'), desc: t('content_type_desc.video') },
    ], [t])

    /* â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    return (
        <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-slate-50 to-white pb-16">
            {/* â•â•â• HERO â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            <div className="relative overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950" />
                {/* Glow decorations */}
                <div className="absolute top-1/2 start-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/8 rounded-full blur-[120px]" />
                <div className="absolute -bottom-32 end-0 w-[500px] h-[500px] bg-violet-500/6 rounded-full blur-[100px]" />
                {/* Grid pattern overlay */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }} />

                <div className="relative container mx-auto px-4 md:px-6 pt-12 pb-20 md:pt-16 md:pb-28">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }}
                        className="text-center max-w-3xl mx-auto"
                    >
                        <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-xs font-medium text-indigo-300 tracking-wide uppercase">
                                {t('title')}
                            </span>
                        </div>

                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-5 leading-[1.1] tracking-tight">
                            {t('subtitle', 'Your centralized hub for operational knowledge')}
                        </h1>
                        <p className="text-base md:text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
                            {t('hero_description', 'Access SOPs, policies, guides, and training materials â€” everything your team needs in one place.')}
                        </p>
                    </motion.div>

                    {/* Search */}
                    <motion.form
                        onSubmit={handleSearch}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="max-w-2xl mx-auto"
                    >
                        <div className="relative group">
                            <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-indigo-500/30 via-violet-500/30 to-purple-500/30 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />
                            <div className="relative flex items-center gap-2 bg-white/[0.07] backdrop-blur-xl border border-white/[0.1] rounded-2xl px-4 sm:px-5 py-1 focus-within:bg-white/[0.1] transition-colors">
                                <Search className="w-5 h-5 text-white/30 shrink-0" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('search_placeholder')}
                                    className="border-0 shadow-none focus-visible:ring-0 text-base md:text-lg py-4 md:py-6 text-white placeholder:text-white/30 bg-transparent flex-1"
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl px-3 sm:px-5 py-3 sm:py-5 text-xs sm:text-sm font-semibold transition-[transform,opacity,box-shadow] duration-200 active:scale-[0.97] shadow-lg shadow-indigo-500/20 shrink-0"
                                >
                                    {t('search_button')}
                                </Button>
                            </div>
                        </div>
                    </motion.form>

                    {/* Quick Stats Row */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 md:gap-10 mt-10 text-white/30 text-xs text-center"
                    >
                        {featured && (
                            <span className="flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 text-amber-400/60" />
                                {featured.length} {t('featured')}
                            </span>
                        )}
                        {pendingRequired.length > 0 && (
                            <span className="flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-red-400/60" />
                                {pendingRequired.length} {t('requiredReading')}
                            </span>
                        )}
                        {primaryDept && (
                            <span className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-indigo-400/60" />
                                {primaryDept.name}
                            </span>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* â•â•â• MAIN CONTENT (Negative margin overlap) â•â•â•â•â•â•â• */}
            <div className="container mx-auto px-4 md:px-6 -mt-10 relative z-10">

                {/* â”€â”€ Required Reading Alert â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                {pendingRequired.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-8"
                    >
                        <div className="bg-gradient-to-r from-orange-500 via-red-500 to-rose-500 rounded-2xl p-[1px] shadow-xl shadow-red-500/10">
                            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-rose-500 rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                                        <ShieldCheck className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="text-white">
                                        <h3 className="font-bold text-base">{t('requiredReading')}</h3>
                                        <p className="text-white/70 text-sm">{pendingRequired.length} {t('required_reading_desc')}</p>
                                    </div>
                                </div>
                                <Button asChild size="sm" className="bg-white text-red-600 hover:bg-white/90 font-bold rounded-xl shadow-lg shrink-0">
                                    <Link to="/knowledge/search?f=required">
                                        {t('view_all')} <ArrowRight className="ms-1.5 w-4 h-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* â”€â”€ Category Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <section className="mb-12">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {categoryCards.map((cat, idx) => {
                            const cfg = TYPE_CONFIG[cat.type]
                            const Icon = cfg?.icon || FileText
                            return (
                                <motion.div
                                    key={cat.type}
                                    custom={idx}
                                    variants={fadeUp}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    <Link to={`/knowledge/search?type=${cat.type}`}>
                                        <div className="group relative bg-white rounded-2xl border border-gray-100 hover:border-gray-200 p-5 text-center transition-[transform,opacity,box-shadow] duration-200 active:scale-[0.97] hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                                            {/* Hover gradient glow */}
                                            <div className={cn(
                                                'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl',
                                                `bg-gradient-to-br ${cfg?.gradient || 'from-gray-400 to-gray-500'}`
                                            )} style={{ transform: 'scale(0.85)', filter: 'blur(20px)', opacity: 0 }} />

                                            <div className={cn(
                                                'w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-3 transition-transform group-hover:scale-110',
                                                cfg?.bg || 'bg-gray-100'
                                            )}>
                                                <Icon className={cn('w-5 h-5', cfg?.accent || 'text-gray-500')} />
                                            </div>
                                            <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 mb-0.5 line-clamp-1">
                                                {cat.label}
                                            </p>
                                            <p className="text-[11px] text-gray-400 line-clamp-1">{cat.desc}</p>
                                        </div>
                                    </Link>
                                </motion.div>
                            )
                        })}
                    </div>
                </section>

                {/* â”€â”€ Two-Column Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* â–ŒLEFT COLUMN (8 cols) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    <div className="lg:col-span-8 space-y-10">

                        {/* Gateway Tiles */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Browse Library */}
                            <Link to="/knowledge/search" className="group">
                                <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                                    <Card className="h-full border-0 shadow-md hover:shadow-xl transition-[transform,opacity,box-shadow] duration-200 active:scale-[0.97] bg-white overflow-hidden group-hover:-translate-y-1">
                                        <CardContent className="p-0">
                                            <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
                                            <div className="p-6 md:p-7">
                                                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                                                    <Library className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 mb-2">{t('library.title')}</h3>
                                                <p className="text-sm text-gray-500 mb-5 leading-relaxed line-clamp-2">
                                                    {t('library.description')}
                                                </p>
                                                <span className="inline-flex items-center text-sm font-semibold text-indigo-600 group-hover:gap-2 gap-1.5 transition-all">
                                                    {t('library.enter')} <ArrowRight className="w-4 h-4" />
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </Link>

                            {/* Create Article */}
                            {canCreate && (
                                <Link to="/knowledge/create" className="group">
                                    <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
                                        <Card className="h-full border-0 shadow-md hover:shadow-xl transition-[transform,opacity,box-shadow] duration-200 active:scale-[0.97] bg-gradient-to-br from-gray-900 to-indigo-950 overflow-hidden group-hover:-translate-y-1">
                                            <CardContent className="p-0">
                                                <div className="h-1.5 bg-gradient-to-r from-violet-400 to-indigo-400" />
                                                <div className="p-6 md:p-7">
                                                    <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                                                        <Plus className="w-5 h-5 text-indigo-300" />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-white mb-2">{t('create_article')}</h3>
                                                    <p className="text-sm text-white/50 mb-5 leading-relaxed line-clamp-2">
                                                        {t('create_article_desc')}
                                                    </p>
                                                    <span className="inline-flex items-center text-sm font-semibold text-indigo-300 group-hover:gap-2 gap-1.5 transition-all">
                                                        {t('start_drafting')} <ArrowRight className="w-4 h-4" />
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                </Link>
                            )}
                        </div>

                        {/* â”€â”€ Featured Articles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                        {featured && featured.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                                            <Star className="w-4 h-4 text-amber-500" />
                                        </div>
                                        {t('featured')}
                                    </h2>
                                    <Link to="/knowledge/search?f=featured" className="text-sm text-gray-400 hover:text-indigo-600 font-medium flex items-center gap-1 transition-colors">
                                        {t('view_all')} <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </div>

                                {/* Feature card â€” first article large, rest in grid */}
                                <div className="space-y-4">
                                    {/* Hero Feature */}
                                    {featured[0] && (() => {
                                        const article = featured[0]
                                        const cfg = TYPE_CONFIG[article.content_type] || TYPE_CONFIG.reference
                                        const Icon = cfg?.icon || BookOpen
                                        return (
                                            <Link to={`/knowledge/${article.id}`} className="group block">
                                                <Card className="border-0 shadow-md hover:shadow-lg transition-[transform,opacity,box-shadow] duration-200 active:scale-[0.97] bg-white overflow-hidden group-hover:-translate-y-0.5">
                                                    <CardContent className="p-0">
                                                        <div className={cn('h-1 bg-gradient-to-r', cfg?.gradient || 'from-gray-400 to-gray-500')} />
                                                        <div className="p-6 md:p-7 flex gap-5">
                                                            <div className={cn(
                                                                'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
                                                                cfg?.bg || 'bg-gray-100'
                                                            )}>
                                                                <Icon className={cn('w-6 h-6', cfg?.accent)} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <Badge className={cn('text-[10px] font-bold uppercase tracking-wider py-0 border-0', cfg?.bg, cfg?.text)}>
                                                                        {t(`content_types.${article.content_type}`)}
                                                                    </Badge>
                                                                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" /> {readTime(article)} {t('article.min_read', 'min read')}
                                                                    </span>
                                                                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                                        <Eye className="w-3 h-3" /> {article.view_count || 0}
                                                                    </span>
                                                                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                                        <Pencil className="w-3 h-3" /> v{article.current_version || article.version || 1}
                                                                    </span>
                                                                </div>
                                                                <h3 className="text-base md:text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1 line-clamp-1">
                                                                    {article.title}
                                                                </h3>
                                                                <p className="text-sm text-gray-500 line-clamp-2">
                                                                    {article.description || article.summary || ''}
                                                                </p>
                                                                <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                                                                    <span className="flex items-center gap-1">
                                                                        <Users className="w-3 h-3" /> {article.author?.full_name || t('home.unknown_author', 'System admin')}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <Pencil className="w-3 h-3" /> {article.last_editor?.full_name || t('home.unknown_editor', 'System admin')}
                                                                    </span>
                                                                    {article.department?.name && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Building2 className="w-3 h-3" /> {article.department.name}
                                                                        </span>
                                                                    )}
                                                                    <span>{timeAgo(article.updated_at)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </Link>
                                        )
                                    })()}

                                    {/* Rest of featured */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {featured.slice(1).map((article, idx) => {
                                            const cfg = TYPE_CONFIG[article.content_type] || TYPE_CONFIG.reference
                                            const Icon = cfg?.icon || BookOpen
                                            return (
                                                <motion.div
                                                    key={article.id}
                                                    custom={idx + 2}
                                                    variants={fadeUp}
                                                    initial="hidden"
                                                    animate="visible"
                                                >
                                                    <Link to={`/knowledge/${article.id}`} className="group block h-full">
                                                        <div className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md p-4 transition-[transform,opacity,box-shadow] duration-200 active:scale-[0.97] group-hover:-translate-y-0.5 h-full flex gap-3.5">
                                                            <div className={cn(
                                                                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                                                                cfg?.bg
                                                            )}>
                                                                <Icon className={cn('w-4 h-4', cfg?.accent)} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className={cn('text-[10px] font-bold uppercase tracking-wider', cfg?.accent)}>
                                                                        {t(`content_types.${article.content_type}`)}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400">
                                                                        {readTime(article)} {t('article.min_read', 'min')}
                                                                    </span>
                                                                </div>
                                                                <h4 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                                                                    {article.title}
                                                                </h4>
                                                                <span className="text-[11px] text-gray-400 mt-1.5 block">
                                                                    {article.department?.name && `${article.department.name} · `}
                                                                    {(article.last_editor?.full_name || t('home.unknown_editor', 'System admin')) && `${article.last_editor?.full_name || t('home.unknown_editor', 'System admin')} · `}
                                                                    v{article.current_version || article.version || 1} · {timeAgo(article.updated_at)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* â”€â”€ Recently Updated â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                        {recentArticles && recentArticles.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        {t('recent')}
                                    </h2>
                                    <Link to="/knowledge/search?sort=updated" className="text-sm text-gray-400 hover:text-indigo-600 font-medium flex items-center gap-1 transition-colors">
                                        {t('view_all')} <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
                                    {recentArticles.slice(0, 6).map((article) => {
                                        const cfg = TYPE_CONFIG[article.content_type] || TYPE_CONFIG.reference
                                        const Icon = cfg?.icon || FileText
                                        return (
                                            <Link
                                                key={article.id}
                                                to={`/knowledge/${article.id}`}
                                                className="group flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors"
                                            >
                                                <div className={cn(
                                                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                                                    cfg?.bg
                                                )}>
                                                    <Icon className={cn('w-4 h-4', cfg?.accent)} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-medium text-gray-800 group-hover:text-indigo-600 transition-colors truncate">
                                                        {article.title}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={cn('text-[10px] font-semibold uppercase tracking-wider', cfg?.accent)}>
                                                            {t(`content_types.${article.content_type}`)}
                                                        </span>
                                                        {article.department?.name && (
                                                            <span className="text-[10px] text-gray-400">Â· {article.department.name}</span>
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
                            </section>
                        )}
                    </div>

                    {/* â–ŒRIGHT COLUMN (4 cols) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* AI Assistant */}
                        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                            <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 overflow-hidden">
                                <CardContent className="p-6 relative">
                                    {/* Subtle glow */}
                                    <div className="absolute top-0 end-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                                    <div className="relative">
                                        <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center mb-4">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2">{t('ai_assistant_title')}</h3>
                                        <p className="text-white/60 text-sm mb-5 leading-relaxed">
                                            {t('ai_assistant_desc')}
                                        </p>
                                        <button
                                            onClick={() => setIsAIAssistantOpen(true)}
                                            className="w-full bg-white/15 hover:bg-white/25 border border-white/10 text-white font-semibold py-2.5 px-4 rounded-xl transition-[transform,opacity,box-shadow] duration-200 active:scale-[0.97] text-sm backdrop-blur"
                                        >
                                            {t('ask_assistant')}
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Department Hub */}
                        {primaryDept && (
                            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
                                <Card className="border-0 shadow-md bg-white overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="px-6 py-5 border-b border-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                                                    <Layers className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-gray-900">{primaryDept.name}</h3>
                                                    <p className="text-[11px] text-gray-400">{t('dept_hub_desc')}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-1">
                                            {deptArticles?.slice(0, 5).map(art => (
                                                <Link
                                                    key={art.id}
                                                    to={`/knowledge/${art.id}`}
                                                    className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors group"
                                                >
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 shrink-0" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-gray-700 truncate group-hover:text-indigo-600 transition-colors">
                                                            {art.title}
                                                        </p>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 shrink-0">
                                                        {timeAgo(art.updated_at)}
                                                    </span>
                                                </Link>
                                            ))}
                                            {(!deptArticles || deptArticles.length === 0) && (
                                                <p className="text-sm text-gray-400 text-center py-4">{t('no_dept_content')}</p>
                                            )}
                                        </div>
                                        <div className="px-4 pb-4">
                                            <Button asChild variant="outline" size="sm" className="w-full border-gray-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-[transform,opacity,box-shadow] duration-200 active:scale-[0.97] rounded-xl">
                                                <Link to={`/knowledge/search?department=${primaryDept.id}`}>
                                                    {t('explore_dept')} <ArrowRight className="ms-1.5 w-3.5 h-3.5" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* Recently Viewed */}
                        {recentlyViewed && recentlyViewed.length > 0 && (
                            <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
                                <Card className="border-0 shadow-md bg-white overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="px-6 py-4 border-b border-gray-50">
                                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                {t('your_recently_viewed')}
                                            </h3>
                                        </div>
                                        <div className="p-4 space-y-1">
                                            {recentlyViewed.map(article => (
                                                <Link
                                                    key={article.id}
                                                    to={`/knowledge/${article.id}`}
                                                    className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors group"
                                                >
                                                    <BookMarked className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                                    <p className="text-sm text-gray-600 truncate group-hover:text-indigo-600 transition-colors flex-1">
                                                        {article.title}
                                                    </p>
                                                </Link>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* Quick Links */}
                        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">{t('browse_by_type')}</h3>
                                <div className="space-y-1.5">
                                    {[
                                        { icon: BookMarked, label: t('bookmarks'), href: '/knowledge/search?f=bookmarked', color: 'text-amber-500' },
                                        { icon: GraduationCap, label: t('requiredReading'), href: '/knowledge/search?f=required', color: 'text-red-500' },
                                        { icon: Flame, label: t('recent'), href: '/knowledge/search?sort=updated', color: 'text-orange-500' },
                                    ].map(link => (
                                        <Link
                                            key={link.href}
                                            to={link.href}
                                            className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors group text-sm"
                                        >
                                            <link.icon className={cn('w-4 h-4', link.color)} />
                                            <span className="text-gray-600 group-hover:text-gray-900 font-medium">{link.label}</span>
                                            <ChevronRight className="w-3.5 h-3.5 text-gray-300 ms-auto" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* AI Knowledge Assistant Modal */}
            <KnowledgeAIAssistant
                isOpen={isAIAssistantOpen}
                onClose={() => setIsAIAssistantOpen(false)}
            />
        </div>
    )
}


