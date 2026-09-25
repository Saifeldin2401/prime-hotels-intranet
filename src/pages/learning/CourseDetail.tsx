import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
    ArrowLeft,
    ArrowRight,
    Award,
    BookOpen,
    CheckCircle2,
    Clock,
    FileCheck,
    FileQuestion,
    GraduationCap,
    Layers,
    Play,
    Shield,
    Sparkles,
    Users,
    Video,
    Volume2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveAssetForTrack } from '@/lib/altusAssetRegistry'

interface CourseModule {
    id: string
    title: string
    description?: string | null
    estimated_duration_minutes?: number | null
    difficulty_level?: string | null
    category?: string | null
    status: string
    certificate_enabled?: boolean
    cover_image_url?: string | null
    created_at: string
    content?: any
}

interface TrainingBlock {
    id: string
    title: string
    block_type: string
    block_order: number
    duration_seconds?: number | null
    is_mandatory?: boolean
    content_data?: any
}

interface TrainingProgress {
    id: string
    training_id: string
    user_id: string
    status: string
    progress_percentage: number
    completed_at?: string | null
    score_percentage?: number | null
    metadata?: {
        completed_blocks?: string[]
        quiz_scores_by_id?: Record<string, number>
    }
}

function resolveCourseThumbnail(course: Partial<CourseModule>): string {
    if (course.cover_image_url) return course.cover_image_url
    return resolveAssetForTrack({
        title: course.title,
        description: course.description || undefined,
        category: course.category,
        id: course.id,
    })
}

function getBlockIcon(blockType: string) {
    switch (blockType?.toLowerCase()) {
        case 'video':
            return Video
        case 'audio':
            return Volume2
        case 'quiz':
        case 'assessment':
            return FileQuestion
        case 'sop':
        case 'sop_document':
            return FileCheck
        case 'interactive':
        case 'simulation':
            return Sparkles
        default:
            return BookOpen
    }
}

export default function CourseDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { toast } = useToast()
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const { t, i18n } = useTranslation(['training', 'common', 'dashboard'])
    const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

    const [activeTab, setActiveTab] = useState<'syllabus' | 'outcomes' | 'accreditation'>('syllabus')

    // 1. Fetch Course Module Details
    const {
        data: course,
        isLoading: courseLoading,
        isError: courseError
    } = useQuery({
        queryKey: ['altus-course-detail', id],
        queryFn: async () => {
            if (!id) throw new Error('Missing course ID')
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('id', id)
                .maybeSingle()

            if (error) throw error
            return data as CourseModule | null
        },
        enabled: !!id
    })

    // 2. Fetch Course Lessons / Content Blocks
    const {
        data: blocks = [],
        isLoading: blocksLoading
    } = useQuery({
        queryKey: ['altus-course-blocks', id],
        queryFn: async () => {
            if (!id) return []
            const { data, error } = await supabase
                .from('lessons')
                .select('id, title, block_type, block_order, duration_seconds, is_mandatory, content_data')
                .eq('training_module_id', id)
                .order('block_order', { ascending: true })

            if (error) throw error
            return (data || []) as TrainingBlock[]
        },
        enabled: !!id
    })

    // 3. Fetch Learner's Progress for this Course
    const {
        data: progress,
        isLoading: progressLoading,
        refetch: refetchProgress
    } = useQuery({
        queryKey: ['altus-course-user-progress', id, user?.id],
        queryFn: async () => {
            if (!id || !user?.id) return null
            const { data, error } = await supabase
                .from('training_progress')
                .select('*')
                .eq('training_id', id)
                .eq('user_id', user.id)
                .maybeSingle()

            if (error && error.code !== 'PGRST116') throw error
            return data as TrainingProgress | null
        },
        enabled: !!id && !!user?.id
    })

    // Enrollment Mutation
    const enrollMutation = useMutation({
        mutationFn: async () => {
            if (!user?.id || !id) throw new Error('User not authenticated')

            if (progress) {
                return progress
            }

            const { data, error } = await supabase
                .from('training_progress')
                .insert({
                    user_id: user.id,
                    training_id: id,
                    status: 'in_progress',
                    progress_percentage: 0,
                    metadata: { completed_blocks: [] }
                })
                .select()
                .single()

            if (error) throw error
            return data as TrainingProgress
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['altus-course-user-progress', id, user?.id] })
            queryClient.invalidateQueries({ queryKey: ['catalog-user-progress', user?.id] })
            navigate(`/learn/player/${id}`)
        },
        onError: (err: any) => {
            toast({
                title: isRTL ? 'خطأ في التسجيل' : 'Enrollment Error',
                description: err?.message || (isRTL ? 'تعذر بدء الدورة. يرجى المحاولة مرة أخرى.' : 'Could not initialize training progress.'),
                variant: 'destructive'
            })
        }
    })

    const handleActionClick = (targetBlockIndex?: number) => {
        if (!user) {
            navigate('/login')
            return
        }

        const blockParam = typeof targetBlockIndex === 'number' ? `?block=${targetBlockIndex}` : ''

        if (progress) {
            navigate(`/learn/player/${id}${blockParam}`)
        } else {
            enrollMutation.mutate()
        }
    }

    const completedBlockIds = useMemo(() => {
        return new Set(progress?.metadata?.completed_blocks || [])
    }, [progress])

    const isEnrolled = !!progress
    const isCompleted = progress?.status === 'completed' || (progress?.progress_percentage ?? 0) >= 100
    const progressPercent = Math.min(100, Math.max(0, Math.round(progress?.progress_percentage ?? 0)))

    // Fallback effective blocks
    const effectiveBlocks = useMemo(() => {
        if (blocks.length > 0) return blocks
        // If no blocks found in documents, check if course.content has array of blocks
        if (Array.isArray(course?.content)) {
            return course.content.map((b: any, idx: number) => ({
                id: b.id || `block-${idx}`,
                title: b.title || `Lesson ${idx + 1}`,
                block_type: b.type || b.block_type || 'text',
                block_order: b.order ?? idx,
                duration_seconds: b.duration_seconds || 300,
                is_mandatory: b.is_mandatory ?? true,
                content_data: b
            })) as TrainingBlock[]
        }
        return []
    }, [blocks, course?.content])

    const totalDurationMinutes = useMemo(() => {
        if (course?.estimated_duration_minutes) return course.estimated_duration_minutes
        const seconds = effectiveBlocks.reduce((acc, b) => acc + (b.duration_seconds || 300), 0)
        return Math.max(10, Math.round(seconds / 60))
    }, [course?.estimated_duration_minutes, effectiveBlocks])

    // Loading Skeleton
    if (courseLoading) {
        return (
            <div className="container max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-pulse">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-24 rounded-lg" />
                    <Skeleton className="h-6 w-4 rounded-lg" />
                    <Skeleton className="h-6 w-48 rounded-lg" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-10 w-3/4 rounded-xl" />
                        <Skeleton className="h-20 w-full rounded-2xl" />
                        <div className="flex gap-4">
                            <Skeleton className="h-8 w-28 rounded-full" />
                            <Skeleton className="h-8 w-28 rounded-full" />
                            <Skeleton className="h-8 w-28 rounded-full" />
                        </div>
                    </div>
                    <Skeleton className="h-72 w-full rounded-3xl" />
                </div>
            </div>
        )
    }

    // 404 Not Found State
    if (courseError || !course) {
        return (
            <div className="container max-w-4xl mx-auto py-16 px-4 text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <BookOpen className="w-8 h-8" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                    {isRTL ? 'لم يتم العثور على البرنامج التدريبي' : 'Training Course Not Found'}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    {isRTL
                        ? 'البرنامج المطلوب غير متوفر حالياً أو تم تعديل مساره. يرجى تصفح كتالوج الدورات المتاحة.'
                        : 'The requested course could not be located or may have been archived. Please explore our active catalog.'}
                </p>
                <Button asChild className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold">
                    <Link to="/learn/courses">
                        {isRTL ? <ArrowRight className="h-4 w-4 ms-2" /> : <ArrowLeft className="h-4 w-4 me-2" />}
                        {isRTL ? 'العودة لكتالوج الدورات' : 'Back to Course Catalog'}
                    </Link>
                </Button>
            </div>
        )
    }

    const heroThumbnail = resolveCourseThumbnail(course)

    return (
        <div className="min-h-screen pb-24">
            {/* Ambient Background & Top Breadcrumb Header */}
            <div className="relative bg-gradient-to-b from-[#061434] via-[#0b1e4c] to-background pt-8 pb-16 text-white border-b border-blue-900/30 overflow-hidden">
                <div className="absolute -top-24 start-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 end-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="container max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-200/80 mb-6">
                        <Link to="/learn/courses" className="hover:text-white transition-colors flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>{isRTL ? 'كتالوج الأكاديمية' : 'Course Catalog'}</span>
                        </Link>
                        <span>/</span>
                        <span className="text-amber-400 truncate max-w-xs">{course.title}</span>
                    </div>

                    {/* Main Hero Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left Info Column */}
                        <div className="lg:col-span-7 space-y-5">
                            {/* Badges strip */}
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs px-3 py-1 font-bold">
                                    <Sparkles className="h-3 w-3 me-1.5" />
                                    {isRTL ? 'أكاديمية آلتوس للضيافة' : 'ALTUS Luxury Hospitality'}
                                </Badge>

                                {course.difficulty_level && (
                                    <Badge variant="outline" className="text-xs border-white/20 text-blue-100 px-3 py-1 capitalize">
                                        {course.difficulty_level}
                                    </Badge>
                                )}

                                {course.certificate_enabled !== false && (
                                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-3 py-1 font-medium">
                                        <Award className="h-3 w-3 me-1" />
                                        {isRTL ? 'شهادة معتمدة' : 'Accredited Certificate'}
                                    </Badge>
                                )}
                            </div>

                            {/* Title */}
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-serif leading-tight">
                                {course.title}
                            </h1>

                            {/* Short Description */}
                            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-2xl font-normal">
                                {course.description || (isRTL
                                    ? 'برنامج تدريبي متخصص مصمم لرفع كفاءة ومعايير الخدمة الفندقية الفاخرة وفق أرقى المعايير العالمية ومعايير فوربس للضيافة.'
                                    : 'A premier masterclass designed to elevate 5-star hospitality service standards and operational excellence in Saudi Arabia.')}
                            </p>

                            {/* Key Operational Highlights */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                                    <div className="flex items-center gap-2 text-amber-400 mb-1">
                                        <Clock className="h-4 w-4" />
                                        <span className="text-xs font-bold">{isRTL ? 'المدة التقديرية' : 'Duration'}</span>
                                    </div>
                                    <span className="text-base font-extrabold text-white">
                                        {totalDurationMinutes} {isRTL ? 'دقيقة' : 'mins'}
                                    </span>
                                </div>

                                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                                    <div className="flex items-center gap-2 text-blue-300 mb-1">
                                        <Layers className="h-4 w-4" />
                                        <span className="text-xs font-bold">{isRTL ? 'المحتوى' : 'Syllabus'}</span>
                                    </div>
                                    <span className="text-base font-extrabold text-white">
                                        {effectiveBlocks.length} {isRTL ? 'محاضرة وتطبيق' : 'Lessons & Checks'}
                                    </span>
                                </div>

                                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md col-span-2 sm:col-span-1">
                                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                                        <Shield className="h-4 w-4" />
                                        <span className="text-xs font-bold">{isRTL ? 'المعايير' : 'Standard'}</span>
                                    </div>
                                    <span className="text-base font-extrabold text-white">
                                        {isRTL ? 'فوربس 5 نجوم' : 'Forbes 5-Star'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right Enrollment & Action Card */}
                        <div className="lg:col-span-5 w-full">
                            <Card className="rounded-3xl border border-white/15 bg-slate-900/80 backdrop-blur-2xl shadow-2xl overflow-hidden text-white">
                                {/* Thumbnail Header */}
                                <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
                                    <img
                                        src={heroThumbnail}
                                        alt={course.title}
                                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <button
                                            onClick={() => handleActionClick()}
                                            className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/30 transition-transform active:scale-95 group"
                                            aria-label="Play course"
                                        >
                                            <Play className="h-6 w-6 fill-current transition-transform group-hover:scale-110 ms-0.5" />
                                        </button>
                                    </div>

                                    {isCompleted && (
                                        <div className="absolute top-3 end-3 px-3 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            <span>{isRTL ? 'مكتمل بنجاح' : 'Completed'}</span>
                                        </div>
                                    )}
                                </div>

                                <CardContent className="p-6 space-y-6">
                                    {/* Progress Bar (if enrolled) */}
                                    {isEnrolled && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs font-bold">
                                                <span className="text-slate-300">{isRTL ? 'تقدمك في الدورة' : 'Your Progress'}</span>
                                                <span className={cn(isCompleted ? 'text-emerald-400' : 'text-amber-400')}>
                                                    {progressPercent}%
                                                </span>
                                            </div>
                                            <Progress value={progressPercent} className="h-2 bg-slate-800" />
                                            {progress?.completed_at && (
                                                <p className="text-[11px] text-emerald-400/90 flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    {isRTL ? 'أتممت متطلبات الدورة' : 'Finished on'}{' '}
                                                    {new Date(progress.completed_at).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Main Call to Action Button */}
                                    <div className="space-y-3">
                                        <Button
                                            onClick={() => handleActionClick()}
                                            disabled={enrollMutation.isPending}
                                            size="lg"
                                            className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
                                        >
                                            {enrollMutation.isPending ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                                    {isRTL ? 'جاري التهيئة...' : 'Enrolling...'}
                                                </span>
                                            ) : isCompleted ? (
                                                <span className="flex items-center gap-2">
                                                    <Play className="h-4 w-4 fill-current" />
                                                    {isRTL ? 'مراجعة محتوى الدورة' : 'Review Course Content'}
                                                </span>
                                            ) : isEnrolled ? (
                                                <span className="flex items-center gap-2">
                                                    <Play className="h-4 w-4 fill-current" />
                                                    {isRTL ? 'متابعة التعلم' : 'Continue Learning'}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <GraduationCap className="h-5 w-5" />
                                                    {isRTL ? 'التسجيل وبدء الدورة الآن' : 'Enroll & Begin Course'}
                                                </span>
                                            )}
                                        </Button>

                                        {isCompleted && (
                                            <Button
                                                asChild
                                                variant="outline"
                                                className="w-full rounded-2xl border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                                            >
                                                <Link to="/learn/certificates">
                                                    <Award className="h-4 w-4 me-2" />
                                                    {isRTL ? 'عرض الشهادة المعتمدة' : 'View Accredited Certificate'}
                                                </Link>
                                            </Button>
                                        )}
                                    </div>

                                    <Separator className="bg-slate-800" />

                                    {/* Guarantee Perks */}
                                    <div className="space-y-2.5 text-xs text-slate-300">
                                        <div className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                                            <span>{isRTL ? 'شهادة رقمية معتمدة قابلة للتحقق الفوري' : 'Verifiable digital accreditation badge'}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                                            <span>{isRTL ? 'تطبيق عملي واختبارات لتقييم الكفاءة' : 'Practical scenario checkpoints & quizzes'}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                                            <span>{isRTL ? 'متوافق مع الأجهزة المحمولة والأجهزة اللوحية' : 'Optimized for mobile & desktop learning'}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Tabs Container */}
            <div className="container max-w-6xl mx-auto px-4 sm:px-6 mt-8">
                <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-8">
                    <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 max-w-md w-full grid grid-cols-3">
                        <TabsTrigger value="syllabus" className="rounded-xl text-xs sm:text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                            {isRTL ? 'المنهج والدروس' : 'Syllabus'}
                        </TabsTrigger>
                        <TabsTrigger value="outcomes" className="rounded-xl text-xs sm:text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                            {isRTL ? 'المخرجات' : 'Outcomes'}
                        </TabsTrigger>
                        <TabsTrigger value="accreditation" className="rounded-xl text-xs sm:text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                            {isRTL ? 'الاعتماد' : 'Accreditation'}
                        </TabsTrigger>
                    </TabsList>

                    {/* TAB 1: SYLLABUS */}
                    <TabsContent value="syllabus" className="space-y-6 focus-visible:outline-hidden">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {isRTL ? 'محتوى البرنامج التدريبي' : 'Course Curriculum & Lessons'}
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                                    {isRTL
                                        ? `يتضمن البرنامج ${effectiveBlocks.length} دروس تفاعلية ومحطات تقييم عملية.`
                                        : `Includes ${effectiveBlocks.length} interactive modules, scenario drills, and knowledge evaluations.`}
                                </p>
                            </div>
                        </div>

                        {effectiveBlocks.length === 0 ? (
                            <Card className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                                <BookOpen className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                                <p className="text-sm font-medium">
                                    {isRTL ? 'يتم إعداد تفاصيل المنهج لهذا البرنامج حالياً.' : 'Syllabus modules are currently being prepared.'}
                                </p>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {effectiveBlocks.map((block, index) => {
                                    const BlockIcon = getBlockIcon(block.block_type)
                                    const isBlockDone = completedBlockIds.has(block.id)
                                    const lessonDurationMins = Math.max(2, Math.round((block.duration_seconds || 300) / 60))

                                    return (
                                        <div
                                            key={block.id || index}
                                            onClick={() => handleActionClick(index)}
                                            className={cn(
                                                "group flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer",
                                                isBlockDone
                                                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40 hover:border-emerald-400"
                                                    : "bg-card border-border hover:border-amber-500/50 hover:shadow-md"
                                            )}
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                {/* Sequence Number / Completion Icon */}
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm transition-transform group-hover:scale-105",
                                                    isBlockDone
                                                        ? "bg-emerald-500 text-white shadow-xs"
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                                )}>
                                                    {isBlockDone ? (
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    ) : (
                                                        <span>{index + 1}</span>
                                                    )}
                                                </div>

                                                {/* Block Details */}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <BlockIcon className="h-4 w-4 text-amber-500 shrink-0" />
                                                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                            {block.block_type || 'Lesson'}
                                                        </span>
                                                        {block.is_mandatory && (
                                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400">
                                                                {isRTL ? 'إلزامي' : 'Mandatory'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate mt-0.5">
                                                        {block.title}
                                                    </h4>
                                                </div>
                                            </div>

                                            {/* Action / Duration */}
                                            <div className="flex items-center gap-3 shrink-0 ms-4">
                                                <span className="text-xs font-medium text-slate-400 hidden sm:inline-flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {lessonDurationMins} {isRTL ? 'د' : 'min'}
                                                </span>

                                                <Button
                                                    size="sm"
                                                    variant={isBlockDone ? "outline" : "default"}
                                                    className={cn(
                                                        "rounded-xl text-xs font-bold h-8 px-3 transition-transform active:scale-95",
                                                        isBlockDone
                                                            ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                                            : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                                                    )}
                                                >
                                                    {isBlockDone ? (
                                                        <span>{isRTL ? 'مراجعة' : 'Review'}</span>
                                                    ) : (
                                                        <span className="flex items-center gap-1">
                                                            <Play className="h-3 w-3 fill-current" />
                                                            {isRTL ? 'بدء' : 'Start'}
                                                        </span>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* TAB 2: LEARNING OUTCOMES */}
                    <TabsContent value="outcomes" className="space-y-6 focus-visible:outline-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="rounded-3xl border border-border p-6 space-y-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {isRTL ? 'المهارات والكفاءات المكتسبة' : 'Mastered Competencies'}
                                </h4>
                                <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                                    <li className="flex items-start gap-2.5">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{isRTL ? 'معايير فوربس العالمية في تقديم الخدمات الفندقية الراقية' : 'Forbes Global Luxury Hospitality Service Protocols'}</span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{isRTL ? 'إتقان إجراءات التشغيل القياسية (SOPs) وضمان سلامة النزلاء' : 'Standard Operating Procedure (SOP) mastery & guest safety compliance'}</span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{isRTL ? 'مهارات التواصل الفعال وحل المواقف التشغيلية الاستثنائية بمهنية' : 'Advanced guest communication & proactive issue resolution'}</span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{isRTL ? 'التوافق التام مع اللوائح والأنظمة السياحية المعتمدة في المملكة العربية السعودية' : 'KSA Tourism Ministry standards & cultural etiquette excellence'}</span>
                                    </li>
                                </ul>
                            </Card>

                            <Card className="rounded-3xl border border-border p-6 space-y-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                    <Users className="w-5 h-5" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {isRTL ? 'الفئات المستهدفة' : 'Target Audience'}
                                </h4>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {isRTL
                                        ? 'هذا البرنامج مصمم خصيصاً لموظفي الفنادق، المشرفين، ورؤساء الأقسام الساعين لتحقيق التميز التشغيلي ورفع مستوى رضا النزلاء إلى أعلى التقييمات.'
                                        : 'Designed for front-of-house staff, supervisors, and department leaders striving to achieve peak guest satisfaction scores and flawless Forbes audit compliance.'}
                                </p>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* TAB 3: ACCREDITATION */}
                    <TabsContent value="accreditation" className="space-y-6 focus-visible:outline-hidden">
                        <Card className="rounded-3xl border border-border overflow-hidden bg-gradient-to-br from-card to-card/50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 sm:p-8 items-center">
                                <div className="aspect-square w-40 sm:w-48 mx-auto rounded-2xl overflow-hidden border border-amber-500/30 shadow-xl bg-slate-950">
                                    <img
                                        src="/assets/altus/cert-badge.jpg"
                                        alt="ALTUS Accreditation Badge"
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-4 text-center md:text-start">
                                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold">
                                        {isRTL ? 'اعتماد أكاديمية آلتوس' : 'ALTUS Executive Accreditation'}
                                    </Badge>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-serif">
                                        {isRTL ? 'شهادة إتمام معتمدة وموثقة رقمياً' : 'Officially Verified Digital Certificate'}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {isRTL
                                            ? 'عند اجتياز جميع متطلبات الدورة والاختبارات بنجاح، تُمنح شهادة معتمدة موثقة برمز تحقق مشفر (QR Code) تُسجل في سجلك المهني بالأكاديمية ويمكن تحميلها بصيغة PDF عالية الجودة.'
                                            : 'Upon successful completion of all lessons and assessments, you will be awarded an officially verified digital certificate equipped with cryptographic QR verification, permanently stored on your profile and downloadable as high-resolution PDF.'}
                                    </p>

                                    <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-4">
                                        <Button asChild variant="outline" className="rounded-xl border-amber-500/30">
                                            <Link to="/learn/certificates">
                                                <Award className="h-4 w-4 me-2 text-amber-500" />
                                                {isRTL ? 'مركز الشهادات والإنجازات' : 'Accreditations & Certificates Hub'}
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
