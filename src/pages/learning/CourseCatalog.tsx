import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/contexts/TenantContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Award,
    BookOpen,
    CheckCircle2,
    Clock,
    Compass,
    GraduationCap,
    LayoutGrid,
    List,
    Loader2,
    Play,
    RotateCcw,
    Search,
    Sparkles,
    X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { CurriculumCard, type CurriculumItem } from '@/components/learner/CurriculumCard'
import { CurriculumTable } from '@/components/learner/CurriculumTable'
import { toSimpleT } from '@/lib/simpleT'

interface CatalogModule {
    id: string
    title: string
    description?: string | null
    estimated_duration_minutes?: number | null
    difficulty_level?: string | null
    category?: string | null
    status: string
    certificate_enabled?: boolean
    created_at: string
    training_blocks_count?: number
}

const TRACKS = [
    { id: 'all', labelEn: 'All Curriculum', labelAr: 'جميع المسارات' },
    { id: 'guest_service', labelEn: 'Guest Experience & Concierge', labelAr: 'الاستقبال وتجربة النزيل' },
    { id: 'culinary', labelEn: 'Culinary & F&B Excellence', labelAr: 'الأغذية والمشروبات' },
    { id: 'housekeeping', labelEn: 'Rooms & Housekeeping Standards', labelAr: 'خدمة الغرف والإشراف الداخلي' },
    { id: 'compliance', labelEn: 'Safety & Regulatory Standards', labelAr: 'الأمن والسلامة والامتثال' },
    { id: 'leadership', labelEn: 'Hospitality Leadership', labelAr: 'القيادة الفندقية والعمليات' },
]

export default function CourseCatalog() {
    const { t: _t, i18n } = useTranslation(['training', 'common', 'dashboard'])
    const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { user, primaryRole } = useAuth()
    const { currentOrganization } = useTenant()

    const canManageLMS = ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'administrator', 'super_admin'].includes(primaryRole || '')

    // State
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTrack, setSelectedTrack] = useState('all')
    const [difficultyFilter, setDifficultyFilter] = useState('all')
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
    const [previewModule, setPreviewModule] = useState<CatalogModule | null>(null)
    const [enrollingId, setEnrollingId] = useState<string | null>(null)

    // 1. Fetch all published training modules
    const { data: rawModules, isLoading: modulesLoading } = useQuery({
        queryKey: ['catalog-published-modules', currentOrganization?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('training_modules')
                .select('id, title, description, estimated_duration_minutes, difficulty_level, status, certificate_enabled, created_at')
                .eq('status', 'published')
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })

            if (error) throw error
            return (data || []) as CatalogModule[]
        },
    })

    // 2. Fetch user existing progress to show enrollment status
    const { data: userProgressList } = useQuery({
        queryKey: ['catalog-user-progress', user?.id],
        queryFn: async () => {
            if (!user?.id) return []
            const { data, error } = await supabase
                .from('training_progress')
                .select('id, training_id, status, progress_percentage, completed_at, score_percentage')
                .eq('user_id', user.id)

            if (error) throw error
            return data || []
        },
        enabled: !!user?.id,
    })

    const progressMap = useMemo(() => {
        const map = new Map<string, { id: string; status: string; progress_percentage: number; completed_at?: string | null; score_percentage?: number | null }>()
        ;(userProgressList || []).forEach((p) => {
            if (p.training_id) {
                map.set(p.training_id, p)
            }
        })
        return map
    }, [userProgressList])

    // Filter modules
    const filteredModules = useMemo(() => {
        return (rawModules || []).filter((mod) => {
            const matchesSearch =
                searchQuery.trim() === '' ||
                mod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (mod.description || '').toLowerCase().includes(searchQuery.toLowerCase())

            if (!matchesSearch) return false

            if (difficultyFilter !== 'all') {
                if ((mod.difficulty_level || 'beginner').toLowerCase() !== difficultyFilter.toLowerCase()) {
                    return false
                }
            }

            if (selectedTrack !== 'all') {
                const titleLower = mod.title.toLowerCase()
                const descLower = (mod.description || '').toLowerCase()
                const combined = `${titleLower} ${descLower}`

                if (selectedTrack === 'guest_service') {
                    return combined.includes('استقبال') || combined.includes('نزيل') || combined.includes('ضيف') || combined.includes('guest') || combined.includes('reception') || combined.includes('concierge') || combined.includes('خدمة')
                }
                if (selectedTrack === 'culinary') {
                    return combined.includes('طعام') || combined.includes('أغذية') || combined.includes('مشروبات') || combined.includes('f&b') || combined.includes('culinary') || combined.includes('dining') || combined.includes('مطعم')
                }
                if (selectedTrack === 'housekeeping') {
                    return combined.includes('غرف') || combined.includes('نظافة') || combined.includes('housekeeping') || combined.includes('اشراف') || combined.includes('مفقودات')
                }
                if (selectedTrack === 'compliance') {
                    return combined.includes('سلامة') || combined.includes('أمن') || combined.includes('طوارئ') || combined.includes('compliance') || combined.includes('safety') || combined.includes('معايير')
                }
                if (selectedTrack === 'leadership') {
                    return combined.includes('قيادة') || combined.includes('ادارة') || combined.includes('leadership') || combined.includes('مدير') || combined.includes('ضغوطات') || combined.includes('أولويات')
                }
            }

            return true
        })
    }, [rawModules, searchQuery, difficultyFilter, selectedTrack])

    // Map to CurriculumItem models
    const curriculumItems: CurriculumItem[] = useMemo(() => {
        return filteredModules.map((mod) => {
            const userProg = progressMap.get(mod.id)

            return {
                id: mod.id,
                title: mod.title,
                description: mod.description || undefined,
                category: isRTL ? 'أكاديمية آلتوس' : 'ALTUS Academy',
                contentType: 'module',
                estimatedDurationMinutes: mod.estimated_duration_minutes || 20,
                progressPercentage: userProg?.progress_percentage || 0,
                isMandatory: false,
                isOverdue: false,
                actionUrl: `/courses/${mod.id}`,
            }
        })
    }, [filteredModules, progressMap, isRTL])

    // Self-enroll & Launch
    const handleLaunchCourse = async (moduleId: string) => {
        if (!user?.id) {
            navigate(`/training/player/${moduleId}`)
            return
        }

        try {
            setEnrollingId(moduleId)
            const existingProgress = progressMap.get(moduleId)
            if (!existingProgress) {
                // Initialize progress row
                await supabase
                    .from('training_progress')
                    .insert({
                        user_id: user.id,
                        training_id: moduleId,
                        status: 'in_progress',
                        progress_percentage: 0,
                        lp_content_type: 'module',
                        last_accessed_at: new Date().toISOString(),
                    })
                queryClient.invalidateQueries({ queryKey: ['catalog-user-progress'] })
                queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
            }
            navigate(`/training/player/${moduleId}`)
        } catch (err) {
            console.error('Error starting module:', err)
            navigate(`/training/player/${moduleId}`)
        } finally {
            setEnrollingId(null)
            setPreviewModule(null)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 sm:p-6 lg:p-10">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Cockpit Banner */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 p-8 sm:p-10 text-white shadow-2xl border border-amber-500/20">
                    <img
                        src="/assets/altus/concierge-frontdesk.jpg"
                        alt="ALTUS Luxury Academy"
                        className="absolute inset-0 h-full w-full object-cover opacity-15 mix-blend-luminosity pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,119,6,0.15),transparent_50%)] pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-400 backdrop-blur-md">
                                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                                <span>{isRTL ? 'أكاديمية آلتوس للضيافة الفاخرة' : 'ALTUS Hospitality Academy'}</span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-serif">
                                {isRTL ? 'كتالوج الدورات والمعايير الفندقية' : 'Curriculum & Operational Standards Catalog'}
                            </h1>
                            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                                {isRTL
                                    ? 'استكشف كافة البرامج التدريبية المعتمدة، معايير الخدمة الراقية، وإجراءات التشغيل القياسية المصممة وفقاً لأرقى معايير الضيافة السعودية والعالمية.'
                                    : 'Explore verified operational masterclasses, luxury guest etiquette, and standard operating procedures tailored for world-class hotel operations in KSA.'}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                asChild
                                variant="outline"
                                className="border-amber-500/30 bg-white/5 text-white hover:bg-white/10 hover:border-amber-400 rounded-xl"
                            >
                                <Link to="/learning/my">
                                    <BookOpen className="h-4 w-4 me-2 text-amber-400" />
                                    {isRTL ? 'دوراتي المسجلة' : 'My Learning'}
                                </Link>
                            </Button>

                            {canManageLMS && (
                                <Button
                                    asChild
                                    variant="outline"
                                    className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 rounded-xl"
                                >
                                    <Link to="/training/hub">
                                        <GraduationCap className="h-4 w-4 me-2 text-amber-400" />
                                        {isRTL ? 'لوحة تحكم الأكاديمية' : 'LMS Control Center'}
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats Strip */}
                    <div className="relative z-10 mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10 text-xs">
                        <div>
                            <span className="text-slate-400 block">{isRTL ? 'إجمالي البرامج المنشورة' : 'Total Published Courses'}</span>
                            <span className="text-2xl font-bold text-amber-400">{rawModules?.length || 0}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">{isRTL ? 'دوراتك قيد التقدم' : 'Enrolled & In Progress'}</span>
                            <span className="text-2xl font-bold text-emerald-400">
                                {userProgressList?.filter((p) => p.status === 'in_progress').length || 0}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">{isRTL ? 'دورات أتممتها بنجاح' : 'Completed Modules'}</span>
                            <span className="text-2xl font-bold text-cyan-400">
                                {userProgressList?.filter((p) => p.status === 'completed').length || 0}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">{isRTL ? 'شهادات الاعتماد' : 'Accredited Certificates'}</span>
                            <span className="text-2xl font-bold text-hotel-gold">
                                {rawModules?.filter((m) => m.certificate_enabled).length || (rawModules?.length || 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Track Selector Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {TRACKS.map((track) => {
                        const isSelected = selectedTrack === track.id
                        return (
                            <button
                                key={track.id}
                                onClick={() => setSelectedTrack(track.id)}
                                className={cn(
                                    'whitespace-nowrap px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm',
                                    isSelected
                                        ? 'bg-hotel-gold text-slate-950 shadow-amber-500/20 shadow-md font-bold'
                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-amber-400/50'
                                )}
                            >
                                {isRTL ? track.labelAr : track.labelEn}
                            </button>
                        )
                    })}
                </div>

                {/* Search & Filter Toolbar */}
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                            {/* Search Input */}
                            <div className="relative w-full sm:w-96">
                                <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={isRTL ? 'ابحث عن دورة، معيار فندقي، أو موضوع...' : 'Search courses, standards, or topics...'}
                                    className="ps-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-amber-500"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Filters & View Toggle */}
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                                    <SelectTrigger className="w-36 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
                                        <SelectValue placeholder={isRTL ? 'المستوى' : 'Level'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{isRTL ? 'جميع المستويات' : 'All Levels'}</SelectItem>
                                        <SelectItem value="beginner">{isRTL ? 'تأسيسي / مبتدئ' : 'Foundational'}</SelectItem>
                                        <SelectItem value="intermediate">{isRTL ? 'متوسط / تطبيقي' : 'Intermediate'}</SelectItem>
                                        <SelectItem value="advanced">{isRTL ? 'متقدم / تنفيذي' : 'Executive'}</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setViewMode('grid')}
                                        className={cn(
                                            'h-7 px-2.5 rounded-lg text-xs',
                                            viewMode === 'grid' && 'bg-white dark:bg-slate-900 shadow-sm font-bold text-amber-600 dark:text-amber-400'
                                        )}
                                    >
                                        <LayoutGrid className="h-3.5 w-3.5 me-1" />
                                        {isRTL ? 'شبكي' : 'Grid'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setViewMode('table')}
                                        className={cn(
                                            'h-7 px-2.5 rounded-lg text-xs',
                                            viewMode === 'table' && 'bg-white dark:bg-slate-900 shadow-sm font-bold text-amber-600 dark:text-amber-400'
                                        )}
                                    >
                                        <List className="h-3.5 w-3.5 me-1" />
                                        {isRTL ? 'قائمة' : 'Table'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Section */}
                {modulesLoading ? (
                    <div className="py-24 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                        <p className="text-sm text-slate-500">{isRTL ? 'جاري تحميل كتالوج الدورات...' : 'Loading ALTUS curriculum catalog...'}</p>
                    </div>
                ) : filteredModules.length === 0 ? (
                    <div className="py-16 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
                        <BookOpen className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            {isRTL ? 'لم يتم العثور على دورات مطابقة' : 'No matching courses found'}
                        </h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                            {isRTL
                                ? 'جرب البحث بكلمات مختلفة أو إزالة عوامل التصفية لعرض جميع برامج الأكاديمية.'
                                : 'Try adjusting your search criteria or resetting filters to see all available hospitality courses.'}
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSearchQuery('')
                                setSelectedTrack('all')
                                setDifficultyFilter('all')
                            }}
                            className="mt-4 rounded-xl"
                        >
                            <RotateCcw className="h-4 w-4 me-2" />
                            {isRTL ? 'إعادة ضبط التصفية' : 'Reset Filters'}
                        </Button>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {curriculumItems.map((item) => {
                            const raw = filteredModules.find((m) => m.id === item.id)
                            const userProg = progressMap.get(item.id)
                            const isCompleted = userProg?.status === 'completed'

                            return (
                                <div key={item.id} className="relative group">
                                    <CurriculumCard item={item} isRTL={isRTL} t={toSimpleT(_t)} />
                                    
                                    {/* Overlay Quick Preview Button */}
                                    <div className="mt-2 flex items-center justify-between px-1">
                                        <button
                                            onClick={() => raw && setPreviewModule(raw)}
                                            className="text-xs font-semibold text-slate-500 hover:text-amber-600 transition-colors flex items-center gap-1"
                                        >
                                            <Compass className="h-3.5 w-3.5" />
                                            {isRTL ? 'نظرة سريعة على المحتوى' : 'Quick Syllabus'}
                                        </button>

                                        {isCompleted && (
                                            <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                {isRTL ? 'مكتمل ومعتمد' : 'Completed'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <CurriculumTable items={curriculumItems} isRTL={isRTL} t={toSimpleT(_t)} />
                )}

                {/* Course Preview Dialog */}
                <Dialog open={!!previewModule} onOpenChange={(open) => !open && setPreviewModule(null)}>
                    <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-8">
                        {previewModule && (
                            <div className="space-y-6">
                                <DialogHeader className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                            {isRTL ? 'أكاديمية آلتوس' : 'ALTUS Academy'}
                                        </Badge>
                                        <Badge variant="outline">
                                            {previewModule.difficulty_level || (isRTL ? 'تأسيسي' : 'Foundational')}
                                        </Badge>
                                    </div>
                                    <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white font-serif">
                                        {previewModule.title}
                                    </DialogTitle>
                                    <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {previewModule.description ||
                                            (isRTL
                                                ? 'دورة تدريبية احترافية تهدف إلى تعزيز المهارات الفندقية والمعايير القياسية لتقديم خدمة استثنائية لضيوف فنادق آلتوس.'
                                                : 'Professional training module designed to enhance hospitality service delivery and compliance with 5-star operational benchmarks.')}
                                    </DialogDescription>
                                </DialogHeader>

                                {/* Meta details */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                                    <div>
                                        <span className="text-slate-400 block">{isRTL ? 'المدة التقديرية' : 'Estimated Time'}</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                                            {previewModule.estimated_duration_minutes || 20} {isRTL ? 'دقيقة' : 'mins'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">{isRTL ? 'الاعتماد والشهادة' : 'Accreditation'}</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                                            <Award className="h-3.5 w-3.5 text-amber-500" />
                                            {isRTL ? 'شهادة رقمية معتمدة' : 'Official Certificate'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">{isRTL ? 'حالة التسجيل' : 'Enrollment Status'}</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                                            {progressMap.get(previewModule.id)?.status === 'completed'
                                                ? (isRTL ? 'مكتمل بنجاح' : 'Completed')
                                                : progressMap.get(previewModule.id)?.status === 'in_progress'
                                                ? (isRTL ? 'قيد الدراسة' : 'In Progress')
                                                : (isRTL ? 'متاح للتسجيل' : 'Ready to Enroll')}
                                        </span>
                                    </div>
                                </div>

                                <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setPreviewModule(null)}
                                        className="rounded-xl"
                                    >
                                        {isRTL ? 'إغلاق' : 'Close'}
                                    </Button>
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="rounded-xl border-amber-500/30 hover:border-amber-400"
                                    >
                                        <Link to={`/courses/${previewModule.id}`}>
                                            <BookOpen className="h-4 w-4 me-2 text-amber-500" />
                                            {isRTL ? 'صفحة تفاصيل الدورة والمنهج' : 'Course Details & Syllabus'}
                                        </Link>
                                    </Button>
                                    <Button
                                        onClick={() => handleLaunchCourse(previewModule.id)}
                                        disabled={enrollingId === previewModule.id}
                                        className="rounded-xl bg-hotel-gold text-slate-950 hover:bg-hotel-gold-dark font-bold shadow-md"
                                    >
                                        {enrollingId === previewModule.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin me-2" />
                                        ) : (
                                            <Play className="h-4 w-4 me-2 fill-current" />
                                        )}
                                        {progressMap.get(previewModule.id)?.status === 'in_progress'
                                            ? (isRTL ? 'متابعة التعلم الآن' : 'Resume Learning Now')
                                            : progressMap.get(previewModule.id)?.status === 'completed'
                                            ? (isRTL ? 'مراجعة محتوى الدورة' : 'Review Course Content')
                                            : (isRTL ? 'بدء الدورة والتسجيل' : 'Enroll & Start Learning')}
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
