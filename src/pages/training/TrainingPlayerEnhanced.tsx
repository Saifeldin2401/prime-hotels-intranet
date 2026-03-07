/**
 * Enhanced Training Player with Engagement Features
 * 
 * Enhancements over base TrainingPlayer:
 * - Progress milestone celebrations (25%, 50%, 75%, 100%)
 * - Focus mode (cinema-style distraction-free reading)
 * - Note-taking per block
 * - Enhanced video controls
 * - Reading time estimates
 * - Social proof nudges
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    Video as VideoIcon,
    ArrowLeft,
    Trophy,
    Clock,
    BookOpen,
    Languages,
    Loader2,
    Maximize2,
    Minimize2,
    StickyNote,
    Users,
    Sparkles,
    PartyPopper,
    Target,
    Flame,
    Bookmark,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { QuizComponentEnhanced } from '@/pages/learning/components/QuizComponentEnhanced'
import { learningService } from '@/services/learningService'
import { skillsService } from '@/services/skillsService'
import { createCertificate } from '@/lib/certificateService'
import { sanitizeHtml } from '@/lib/sanitize'
import { getEncryptedLocalStorage, setEncryptedLocalStorage } from '@/lib/secureStorage'
import type { TrainingContentBlock } from '@/lib/types'
import { DocumentBlockRenderer } from '@/components/training/DocumentBlockRenderer'
import { EmbeddedArticleViewer } from '@/components/training/EmbeddedArticleViewer'
import { cn } from '@/lib/utils'
import { SUPPORTED_TRANSLATION_LANGUAGES, useTranslationAI } from '@/hooks/useTranslationAI'
import type { TranslationTargetLanguage } from '@/hooks/useTranslationAI'
import { getUserFriendlyError } from '@/lib/errorMessages'

// --- Types ---

type Note = {
    blockId: string
    content: string
    createdAt: string
}

type Milestone = {
    percentage: number
    title: string
    message: string
    icon: React.ReactNode
}

const isValidUuid = (value?: string | null) =>
    !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

// --- Components ---

export default function TrainingPlayerEnhanced() {
    const { t: t_ext } = useTranslation('extracted');
    const { t } = useTranslation('training')
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const assignmentId = searchParams.get('assignment')
    const navigate = useNavigate()
    const { toast } = useToast()
    const { user, profile } = useAuth()
    const isValidModuleId = isValidUuid(id)

    useEffect(() => {
        if (id && !isValidModuleId) {
            toast({
                title: t('error', 'Error'),
                description: t('invalidModuleId', 'Invalid training module ID.'),
                variant: 'destructive'
            })
            navigate('/learning/my', { replace: true })
        }
    }, [id, isValidModuleId, navigate, t, toast])

    // Core state
    const [activeBlockIndex, setActiveBlockIndex] = useState(0)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [completedBlocks, setCompletedBlocks] = useState<Set<string>>(new Set())
    const [completedMediaBlocks, setCompletedMediaBlocks] = useState<Set<string>>(new Set())
    const [isFinished, setIsFinished] = useState(false)
    const [quizScore, setQuizScore] = useState<number | null>(null)

    // Enhanced state
    const [focusMode, setFocusMode] = useState(false)
    const [notes, setNotes] = useState<Record<string, Note>>({})
    const [showNotePanel, setShowNotePanel] = useState(false)
    const [celebratedMilestones, setCelebratedMilestones] = useState<Set<number>>(new Set())
    const [showMilestone, setShowMilestone] = useState<Milestone | null>(null)
    const [estimatedReadTime, setEstimatedReadTime] = useState<number>(0)
    const [readingSpeed] = useState<number>(200) // words per minute

    // Translation
    const [translationTarget, setTranslationTarget] = useState<TranslationTargetLanguage | null>(null)
    const [showBilingual, setShowBilingual] = useState(false)
    const [isTranslating, setIsTranslating] = useState(false)
    const [blockTranslations, setBlockTranslations] = useState<Record<string, Partial<Record<TranslationTargetLanguage, string>>>>({})
    const [moduleTitleTranslations, setModuleTitleTranslations] = useState<Partial<Record<TranslationTargetLanguage, string>>>({})

    // Time tracking
    const [timeSpentSeconds, setTimeSpentSeconds] = useState(0)
    const [sessionStartTime] = useState<number>(() => Date.now())

    // Refs
    const totalTimeRef = useRef<number>(0)

    const translateAI = useTranslationAI()

    // Close sidebar on mobile
    useEffect(() => {
        const syncSidebar = () => {
            if (window.innerWidth < 1024) {
                setSidebarOpen(false)
            }
        }
        syncSidebar()
        window.addEventListener('resize', syncSidebar)
        return () => window.removeEventListener('resize', syncSidebar)
    }, [])

    // Fetch module
    const { data: moduleData, isLoading } = useQuery({
        queryKey: ['training-module-full', id],
        queryFn: async () => {
            if (!id || !isValidModuleId) throw new Error('Invalid module ID')

            const { data: module, error: moduleError } = await supabase
                .from('training_modules')
                .select('*')
                .eq('id', id)
                .maybeSingle()

            if (moduleError) throw moduleError
            if (!module) return null

            const { data: blocks, error: blocksError } = await supabase
                .from('training_content_blocks')
                .select('*')
                .eq('training_module_id', id)
                .order('order', { ascending: true })

            if (blocksError) throw blocksError

            // Fetch completion stats for social proof
            const { count: completionCount } = await supabase
                .from('learning_progress')
                .select('*', { count: 'exact', head: true })
                .eq('content_id', id)
                .eq('status', 'completed')

            // Fetch average completion time
            const { data: avgTimeData } = await supabase
                .from('learning_progress')
                .select('time_spent_seconds')
                .eq('content_id', id)
                .eq('status', 'completed')
                .limit(100)

            const avgTime = avgTimeData && avgTimeData.length > 0
                ? Math.round(avgTimeData.reduce((a, b) => a + (b.time_spent_seconds || 0), 0) / avgTimeData.length)
                : null

            return {
                module,
                blocks: blocks as TrainingContentBlock[],
                stats: {
                    completionCount: completionCount || 0,
                    avgCompletionTimeSeconds: avgTime
                }
            }
        },
        enabled: !!id && isValidModuleId
    })

    const activeBlock = moduleData?.blocks[activeBlockIndex]
    const totalBlocks = moduleData?.blocks.length || 1
    const hasQuizBlock = (moduleData?.blocks || []).some(block => block.type === 'quiz')
    const progressPercentage = Math.min(100, Math.round(((activeBlockIndex + 1) / totalBlocks) * 100))

    // Calculate reading time for text blocks
    useEffect(() => {
        if (!activeBlock) return

        const mediaDurationSeconds = (activeBlock as TrainingContentBlock & { duration_seconds?: number }).duration_seconds

        if (['text', 'sop_reference', 'document_link'].includes(activeBlock.type)) {
            const wordCount = (activeBlock.content || '').split(/\s+/).length
            const minutes = Math.ceil(wordCount / readingSpeed)
            setEstimatedReadTime(minutes)
        } else if (activeBlock.type === 'video' && mediaDurationSeconds) {
            setEstimatedReadTime(Math.ceil(mediaDurationSeconds / 60))
        } else {
            setEstimatedReadTime(0)
        }
    }, [activeBlock, readingSpeed])

    // Milestone detection
    useEffect(() => {
        const milestones: Milestone[] = [
            { percentage: 25, title: 'Great Start!', message: 'You\'re making progress!', icon: <Sparkles className="h-8 w-8" /> },
            { percentage: 50, title: 'Halfway There!', message: 'Keep up the momentum!', icon: <Target className="h-8 w-8" /> },
            { percentage: 75, title: 'Almost Done!', message: 'Final stretch ahead!', icon: <Flame className="h-8 w-8" /> },
            { percentage: 100, title: 'Completed!', message: 'Amazing work!', icon: <PartyPopper className="h-8 w-8" /> },
        ]

        const currentMilestone = milestones.find(m => {
            const prevPercentage = Math.min(100, Math.round((activeBlockIndex / totalBlocks) * 100))
            return progressPercentage >= m.percentage &&
                prevPercentage < m.percentage &&
                !celebratedMilestones.has(m.percentage)
        })

        if (currentMilestone && !focusMode) {
            setShowMilestone(currentMilestone)
            setCelebratedMilestones(prev => new Set(prev).add(currentMilestone.percentage))
        }
    }, [progressPercentage, activeBlockIndex, totalBlocks, celebratedMilestones, focusMode])

    // Time tracking
    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000)
            setTimeSpentSeconds(() => elapsed + totalTimeRef.current)
        }, 1000)
        return () => clearInterval(interval)
    }, [sessionStartTime])

    // Load saved notes from localStorage
    useEffect(() => {
        if (!user || !id) return
        let isActive = true

        const loadNotes = async () => {
            const savedNotes = await getEncryptedLocalStorage<Record<string, Note>>(`training-notes:${user.id}:${id}`)
            if (!isActive || !savedNotes) return
            setNotes(savedNotes)
        }

        void loadNotes()
        return () => {
            isActive = false
        }
    }, [user, id])

    // Save notes
    const saveNote = useCallback((blockId: string, content: string) => {
        const newNotes = {
            ...notes,
            [blockId]: {
                blockId,
                content,
                createdAt: new Date().toISOString()
            }
        }
        setNotes(newNotes)
        if (user && id) {
            void setEncryptedLocalStorage(`training-notes:${user.id}:${id}`, newNotes)
        }
    }, [notes, user, id])

    const handleNext = () => {
        if (!moduleData) return

        if (activeBlock) {
            setCompletedBlocks(prev => new Set(prev).add(activeBlock.id))
        }

        if (activeBlockIndex === totalBlocks - 1) {
            handleCompleteModule()
        } else {
            setActiveBlockIndex(prev => prev + 1)
            window.scrollTo(0, 0)
        }
    }

    const handlePrevious = () => {
        setActiveBlockIndex(prev => Math.max(0, prev - 1))
    }

    const handleMarkWatched = (blockId: string) => {
        setCompletedMediaBlocks(prev => new Set(prev).add(blockId))
        setCompletedBlocks(prev => new Set(prev).add(blockId))
    }

    const handleCompleteModule = async () => {
        if (!user || !moduleData) return

        try {
            const timeSpent = timeSpentSeconds + totalTimeRef.current

            let linkedTrainingProgressId: string | undefined
            let linkedTrainingQuizScore: number | undefined
            try {
                const { data: syncedTrainingProgress } = await supabase
                    .from('training_progress')
                    .select('id, quiz_score')
                    .eq('user_id', user.id)
                    .eq('training_id', moduleData.module.id)
                    .eq('is_deleted', false)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                linkedTrainingProgressId = syncedTrainingProgress?.id
                if (typeof syncedTrainingProgress?.quiz_score === 'number') {
                    linkedTrainingQuizScore = syncedTrainingProgress.quiz_score
                }
            } catch (error) {
                // Certificate generation can continue without training_progress linkage
                console.error('Failed to link training progress for certificate:', error)
            }

            // Award skills
            try {
                await skillsService.awardModuleSkills(user.id, moduleData.module.id)
            } catch (error) {
                console.error('Failed to award module skills:', error)
            }

            const passingScore = moduleData.module.passing_score_percentage || 80
            const effectiveScore = quizScore ?? linkedTrainingQuizScore

            if (hasQuizBlock && typeof effectiveScore !== 'number') {
                toast({
                    title: t('quizNotPassed'),
                    description: t('completeQuizBeforeFinish', 'Please complete the quiz before finishing this module.'),
                    variant: 'destructive'
                })
                return
            }

            const isPassed = !hasQuizBlock || (typeof effectiveScore === 'number' && effectiveScore >= passingScore)

            await learningService.submitQuizProgress({
                assignment_id: assignmentId || undefined,
                content_id: moduleData.module.id,
                content_type: 'module',
                user_id: user.id,
                status: 'completed',
                progress_percentage: 100,
                passed: isPassed,
                score_percentage: typeof effectiveScore === 'number' ? effectiveScore : undefined,
                completed_at: new Date().toISOString(),
                time_spent_seconds: timeSpent,
            })

            if (isPassed && moduleData.module.certificate_enabled) {
                try {
                    await createCertificate({
                        userId: user.id,
                        recipientName: profile?.full_name || user.email || 'Training Participant',
                        recipientEmail: user.email,
                        certificateType: 'training',
                        title: moduleData.module.title,
                        description: t('certificateEarned', { moduleName: moduleData.module.title }),
                        completionDate: new Date(),
                        score: effectiveScore,
                        passingScore,
                        trainingModuleId: moduleData.module.id,
                        trainingProgressId: linkedTrainingProgressId
                    })
                    toast({
                        title: '🎉 Certificate Earned!',
                        description: 'You can view it in your profile.',
                    })
                } catch (error) {
                    console.error('Failed to create certificate:', error)
                }
            }

            setIsFinished(true)
        } catch (error) {
            toast({
                title: t('error'),
                description: getUserFriendlyError(error).message,
                variant: 'destructive'
            })
        }
    }

    const handleTranslate = async (targetLang: TranslationTargetLanguage) => {
        setTranslationTarget(targetLang)
        if (!moduleData || !activeBlock) return

        setIsTranslating(true)
        try {
            // Translate module title
            if (moduleData.module.title && !moduleTitleTranslations[targetLang]) {
                const res = await translateAI.mutateAsync({
                    text: moduleData.module.title,
                    target_lang: targetLang,
                    source_lang: 'auto'
                })
                setModuleTitleTranslations(prev => ({ ...prev, [targetLang]: res.translated_text }))
            }

            // Translate active block
            if (activeBlock.content && !blockTranslations[activeBlock.id]?.[targetLang]) {
                const res = await translateAI.mutateAsync({
                    text: activeBlock.content,
                    target_lang: targetLang,
                    source_lang: 'auto'
                })
                setBlockTranslations(prev => ({
                    ...prev,
                    [activeBlock.id]: { ...prev[activeBlock.id], [targetLang]: res.translated_text }
                }))
            }

            toast({
                title: 'Translation complete',
                description: SUPPORTED_TRANSLATION_LANGUAGES.find(l => l.code === targetLang)?.label
            })
        } catch {
            toast({
                title: 'Translation failed',
                variant: 'destructive'
            })
        } finally {
            setIsTranslating(false)
        }
    }

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const hrs = Math.floor(mins / 60)
        if (hrs > 0) return `${hrs}h ${mins % 60}m`
        return `${mins}m`
    }

    // Render helpers
    const displayModuleTitle = translationTarget && moduleTitleTranslations[translationTarget]
        ? moduleTitleTranslations[translationTarget] as string
        : moduleData?.module.title

    const getTranslatedBlockContent = (block: TrainingContentBlock) => {
        if (!translationTarget) return undefined
        return blockTranslations[block.id]?.[translationTarget]
    }

    const milestoneCelebration = showMilestone ? (
        <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowMilestone(null)}
        >
            <m.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="bg-gradient-to-br from-hotel-gold to-hotel-gold-dark text-white p-8 rounded-3xl text-center max-w-sm shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <m.div
                    initial={{ rotate: -180, scale: 0.95, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                    {showMilestone.icon}
                </m.div>
                <h3 className="text-2xl font-bold mb-2">{showMilestone.title}</h3>
                <p className="text-white/80 mb-6">{showMilestone.message}</p>
                <div className="text-4xl font-bold mb-6">{showMilestone.percentage}%</div>
                <Button
                    onClick={() => setShowMilestone(null)}
                    className="bg-white text-hotel-gold-dark hover:bg-white/90 px-8"
                >
                    {t_ext('continue', 'Continue')}
                </Button>
            </m.div>
        </m.div>
    ) : null

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-hotel-gold" />
                    <p className="text-slate-500">{t_ext('loading_training_module', 'Loading training module...')}</p>
                </div>
            </div>
        )
    }

    if (!moduleData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-500">{t_ext('module_not_found', 'Module not found')}</p>
                    <Button onClick={() => navigate('/training')} className="mt-4">
                        {t_ext('back_to_training', 'Back to Training')}</Button>
                </div>
            </div>
        )
    }

    if (isFinished) {
        return (
            <LazyMotion features={domAnimation}>
                <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
                    <m.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full text-center space-y-6"
                    >
                        <m.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200 }}
                            className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto"
                        >
                            <Trophy className="h-12 w-12 text-emerald-600" />
                        </m.div>
                        <div>
                            <h1 className="text-3xl font-bold text-hotel-navy mb-2">{t_ext('module_complete', 'Module Complete!')}</h1>
                            <p className="text-slate-600">{t_ext('you_ve_successfully_completed', 'You\'ve successfully completed')}{displayModuleTitle}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <Clock className="h-5 w-5 text-hotel-gold mx-auto mb-2" />
                                <div className="text-2xl font-bold">{formatDuration(timeSpentSeconds)}</div>
                                <div className="text-xs text-slate-500">{t_ext('time_spent', 'Time spent')}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
                                <div className="text-2xl font-bold">{totalBlocks}</div>
                                <div className="text-xs text-slate-500">{t_ext('blocks_completed', 'Blocks completed')}</div>
                            </div>
                        </div>
                        <Button onClick={() => navigate('/training')} className="w-full bg-hotel-navy">
                            {t_ext('continue_learning', 'Continue Learning')}</Button>
                    </m.div>
                </div>
            </LazyMotion>
        )
    }

    return (
        <LazyMotion features={domAnimation}>
            <div className={cn(
                "min-h-screen transition-colors duration-300",
                focusMode ? "bg-slate-950" : "bg-slate-50"
            )}>
                {/* Header */}
                <header className={cn(
                    "sticky top-0 z-40 border-b transition-colors duration-300",
                    focusMode
                        ? "bg-slate-900/95 border-slate-800 text-white"
                        : "bg-white/95 border-slate-200 backdrop-blur"
                )}>
                    <div className="flex items-center justify-between h-14 px-4">
                        {/* Left: Back & Title */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/training')}
                                className={focusMode ? "text-white hover:bg-slate-800" : ""}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {!focusMode && 'Back'}
                            </Button>

                            {!focusMode && (
                                <div className="hidden md:block min-w-0">
                                    <h1 className="font-semibold truncate">{displayModuleTitle}</h1>
                                    {estimatedReadTime > 0 && (
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {estimatedReadTime} {t_ext('min_read', 'min read')}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Center: Progress */}
                        <div className="flex-1 max-w-md mx-4">
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className={focusMode ? "text-slate-400" : "text-slate-500"}>
                                    {progressPercentage}%
                                </span>
                                <span className={focusMode ? "text-slate-400" : "text-slate-500"}>
                                    {t_ext('block', 'Block')}{activeBlockIndex + 1} of {totalBlocks}
                                </span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 flex-1 justify-end">
                            {/* Focus Mode Toggle */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFocusMode(!focusMode)}
                                className={focusMode ? "text-white hover:bg-slate-800" : ""}
                            >
                                {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                            </Button>

                            {/* Notes Toggle */}
                            {!focusMode && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowNotePanel(!showNotePanel)}
                                    className={notes[activeBlock?.id || ''] ? "text-hotel-gold" : ""}
                                >
                                    <Bookmark className="h-4 w-4" />
                                </Button>
                            )}

                            {/* Translation */}
                            {!focusMode && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" disabled={isTranslating}>
                                            {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {SUPPORTED_TRANSLATION_LANGUAGES.map(lang => (
                                            <DropdownMenuItem key={lang.code} onClick={() => handleTranslate(lang.code)}>
                                                {lang.label}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuCheckboxItem checked={showBilingual} onCheckedChange={setShowBilingual}>
                                            {t_ext('show_bilingual', 'Show Bilingual')}</DropdownMenuCheckboxItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            {/* Sidebar Toggle */}
                            {!focusMode && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                    className="lg:hidden"
                                >
                                    <BookOpen className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </header>

            {/* Main Content */}
            <div className="flex content-contain">
                {/* Sidebar */}
                <AnimatePresence>
                    {sidebarOpen && !focusMode && (
                        <m.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 280, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="hidden lg:block border-r border-slate-200 bg-white h-[calc(100vh-3.5rem)] overflow-y-auto"
                        >
                            <div className="p-4">
                                <h2 className="font-semibold text-sm text-slate-500 uppercase tracking-wider mb-4">
                                    {t_ext('module_contents', 'Module Contents')}</h2>
                                <div className="space-y-1">
                                    {moduleData.blocks.map((block, idx) => {
                                        const isActive = idx === activeBlockIndex
                                        const isCompleted = completedBlocks.has(block.id) || completedMediaBlocks.has(block.id)

                                        return (
                                            <button
                                                key={block.id}
                                                onClick={() => setActiveBlockIndex(idx)}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                                                    isActive
                                                        ? "bg-hotel-navy text-white"
                                                        : isCompleted
                                                            ? "text-emerald-600 hover:bg-emerald-50"
                                                            : "text-slate-600 hover:bg-slate-100"
                                                )}
                                            >
                                                {isCompleted ? (
                                                    <CheckCircle className="h-4 w-4 shrink-0" />
                                                ) : (
                                                    <span className="w-4 h-4 rounded-full border-2 border-current shrink-0 flex items-center justify-center text-[10px]">
                                                        {idx + 1}
                                                    </span>
                                                )}
                                                <span className="truncate">
                                                    {block.type === 'text' && 'Reading'}
                                                    {block.type === 'video' && 'Video'}
                                                    {block.type === 'audio' && 'Audio'}
                                                    {block.type === 'quiz' && 'Quiz'}
                                                    {block.type === 'interactive' && 'Activity'}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Social Proof */}
                                {moduleData.stats.completionCount > 0 && (
                                    <div className="mt-6 p-3 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Users className="h-4 w-4" />
                                            <span>{moduleData.stats.completionCount} {t_ext('people_completed', 'people completed')}</span>
                                        </div>
                                        {moduleData.stats.avgCompletionTimeSeconds && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                {t_ext('avg_time', 'Avg time:')}{formatDuration(moduleData.stats.avgCompletionTimeSeconds)}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </m.aside>
                    )}
                </AnimatePresence>

                {/* Content Area */}
                <main className={cn(
                    "flex-1 transition-all duration-300",
                    focusMode ? "max-w-3xl mx-auto px-6 py-8" : "p-6 lg:p-8"
                )}>
                    <div className={cn(
                        "max-w-4xl mx-auto",
                        focusMode && "text-slate-200"
                    )}>
                        {/* Block Content */}
                        <AnimatePresence mode="wait">
                            {activeBlock && (
                                <m.div
                                    key={activeBlock.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {/* Text Block */}
                                    {activeBlock.type === 'text' && (
                                        <div className={cn(
                                            "prose max-w-none",
                                            focusMode ? "prose-invert" : ""
                                        )}>
                                            <div
                                                dangerouslySetInnerHTML={{
                                                    __html: sanitizeHtml(
                                                        getTranslatedBlockContent(activeBlock) || activeBlock.content
                                                    )
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Video Block */}
                                    {activeBlock.type === 'video' && (
                                        <div className="space-y-4">
                                            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
                                                {activeBlock.content_url ? (
                                                    <video
                                                        src={activeBlock.content_url}
                                                        className="w-full h-full"
                                                        controls
                                                        onTimeUpdate={(e) => {
                                                            const target = e.currentTarget
                                                            if (target.duration && target.currentTime / target.duration >= 0.9) {
                                                                handleMarkWatched(activeBlock.id)
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-white/50">
                                                        <VideoIcon className="h-12 w-12" />
                                                    </div>
                                                )}
                                            </div>
                                            {activeBlock.is_mandatory && !completedMediaBlocks.has(activeBlock.id) && (
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <VideoIcon className="h-5 w-5 text-amber-600" />
                                                        <span className="text-sm text-amber-800">
                                                            {t_ext('watch_the_video_to_continue', 'Watch the video to continue')}</span>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleMarkWatched(activeBlock.id)}
                                                    >
                                                        {t_ext('mark_as_watched', 'Mark as watched')}</Button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Audio Block */}
                                    {activeBlock.type === 'audio' && (
                                        <div className="space-y-4">
                                            <div className={cn(
                                                "rounded-2xl p-8",
                                                focusMode ? "bg-slate-900" : "bg-white border border-slate-200"
                                            )}>
                                                <audio
                                                    src={activeBlock.content_url}
                                                    className="w-full"
                                                    controls
                                                    onTimeUpdate={(e) => {
                                                        const target = e.currentTarget
                                                        if (target.duration && target.currentTime / target.duration >= 0.9) {
                                                            handleMarkWatched(activeBlock.id)
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Quiz Block */}
                                    {activeBlock.type === 'quiz' && ((activeBlock.content_data as Record<string, unknown> | null)?.quiz_id as string | undefined) && (
                                        <div className={focusMode ? "bg-slate-900 rounded-2xl p-6" : ""}>
                                            <QuizComponentEnhanced
                                                quizId={(activeBlock.content_data as Record<string, unknown>).quiz_id as string}
                                                assignmentId={assignmentId}
                                                enableImmediateFeedback={true}
                                                enablePowerUps={true}
                                                onComplete={(result) => {
                                                    setQuizScore(result.score)
                                                    handleMarkWatched(activeBlock.id)
                                                }}
                                                onExit={() => { }}
                                            />
                                        </div>
                                    )}

                                    {/* SOP Reference */}
                                    {activeBlock.type === 'sop_reference' && (() => {
                                        const contentData = activeBlock.content_data as Record<string, unknown> | null
                                        const resolvedSopId =
                                            (contentData?.sop_id as string | undefined) ||
                                            (activeBlock as TrainingContentBlock).source_document_id ||
                                            (contentData?.document_id as string | undefined)

                                        if (!resolvedSopId) return null

                                        return <EmbeddedArticleViewer sopId={resolvedSopId} />
                                    })()}

                                    {/* Document Link */}
                                    {activeBlock.type === 'document_link' && (
                                        <DocumentBlockRenderer block={activeBlock} />
                                    )}
                                </m.div>
                            )}
                        </AnimatePresence>

                        {/* Note Panel */}
                        <AnimatePresence>
                            {showNotePanel && !focusMode && (
                                <m.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-8 border-t border-slate-200 pt-6"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <StickyNote className="h-4 w-4 text-hotel-gold" />
                                        <span className="font-medium text-sm">{t_ext('your_notes', 'Your Notes')}</span>
                                    </div>
                                    <Textarea
                                        placeholder={t_ext('take_notes_for_this_section', 'Take notes for this section...')}
                                        value={notes[activeBlock?.id || '']?.content || ''}
                                        onChange={(e) => saveNote(activeBlock?.id || '', e.target.value)}
                                        className="min-h-[120px]"
                                    />
                                </m.div>
                            )}
                        </AnimatePresence>

                        {/* Navigation */}
                        {!focusMode && activeBlock?.type !== 'quiz' && (
                            <div className="flex items-center justify-between mt-12 pt-6 border-t border-slate-200">
                                <Button
                                    variant="outline"
                                    disabled={activeBlockIndex === 0}
                                    onClick={handlePrevious}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    {t_ext('previous', 'Previous')}</Button>

                                <Button
                                    onClick={handleNext}
                                    className="bg-hotel-navy hover:bg-hotel-navy-dark"
                                >
                                    {activeBlockIndex === totalBlocks - 1 ? 'Complete' : 'Next'}
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Milestone Celebration */}
            <AnimatePresence>
                {milestoneCelebration}
            </AnimatePresence>
            </div>
        </LazyMotion>
    )
}

