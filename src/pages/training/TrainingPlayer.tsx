import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'

import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    PlayCircle,
    FileText,
    Image as ImageIcon,
    Video as VideoIcon,
    Link as LinkIcon,
    HelpCircle,
    Menu,
    X,
    ArrowLeft,
    Trophy,
    Award,
    Clock,
    BookOpen,
    Languages,
    Loader2,
    Headphones,
    Gamepad2
} from 'lucide-react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { QuizComponent } from '@/pages/learning/components/QuizComponent'
import { learningService } from '@/services/learningService'
import { skillsService } from '@/services/skillsService'
import { createCertificate, type CertificateData } from '@/lib/certificateService'
import { sanitizeHtml } from '@/lib/sanitize'
import type { TrainingModule, TrainingContentBlock } from '@/lib/types'
import { DocumentBlockRenderer } from '@/components/training/DocumentBlockRenderer'
import { cn } from '@/lib/utils'
import { SUPPORTED_TRANSLATION_LANGUAGES, useTranslationAI } from '@/hooks/useTranslationAI'
import type { TranslationTargetLanguage } from '@/hooks/useTranslationAI'
import { getUserFriendlyError } from '@/lib/errorMessages'

export default function TrainingPlayer() {
    const { t, i18n } = useTranslation('training')
    const isRTL = i18n.dir() === 'rtl'
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const assignmentId = searchParams.get('assignment')
    const navigate = useNavigate()
    const { toast } = useToast()
    const { user, profile } = useAuth()
    const queryClient = useQueryClient()

    const [activeBlockIndex, setActiveBlockIndex] = useState(0)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [completedBlocks, setCompletedBlocks] = useState<Set<string>>(new Set())
    const [quizScore, setQuizScore] = useState<number | null>(null)
    const [isFinished, setIsFinished] = useState(false)
    const [translationTarget, setTranslationTarget] = useState<TranslationTargetLanguage | null>(null)
    const [showBilingual, setShowBilingual] = useState(false)
    const [isTranslating, setIsTranslating] = useState(false)
    const [blockTranslations, setBlockTranslations] = useState<Record<string, Partial<Record<TranslationTargetLanguage, string>>>>({})
    const [moduleTitleTranslations, setModuleTitleTranslations] = useState<Partial<Record<TranslationTargetLanguage, string>>>({})
    const [completedMediaBlocks, setCompletedMediaBlocks] = useState<Set<string>>(new Set())
    const [timeSpentSeconds, setTimeSpentSeconds] = useState(0)
    const [resumeNotice, setResumeNotice] = useState<string | null>(null)

    const blockStartRef = useRef<number>(Date.now())
    const lastBlockIdRef = useRef<string | null>(null)
    const totalTimeRef = useRef<number>(0)
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hasRestoredRef = useRef(false)
    const timeByBlockRef = useRef<Record<string, number>>({})

    const translateAI = useTranslationAI()

    // Close sidebar on mobile by default
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setSidebarOpen(false)
        }
    }, [])

    // Fetch Module and Blocks
    const { data: moduleData, isLoading } = useQuery({
        queryKey: ['training-module-full', id],
        queryFn: async () => {
            if (!id) throw new Error('No ID')

            const { data: module, error: moduleError } = await supabase
                .from('training_modules')
                .select('*')
                .eq('id', id)
                .single()

            if (moduleError) throw moduleError

            const { data: blocks, error: blocksError } = await supabase
                .from('training_content_blocks')
                .select('*')
                .eq('training_module_id', id)
                .order('order', { ascending: true })

            if (blocksError) throw blocksError

            const { data: linkedQuizzes } = await supabase
                .from('learning_quizzes')
                .select('id')
                .eq('training_module_id', id)
                .eq('status', 'published')
                .limit(1)

            return {
                module,
                blocks: blocks as TrainingContentBlock[],
                linkedQuizId: linkedQuizzes?.[0]?.id
            }
        },
        enabled: !!id
    })

    useEffect(() => {
        hasRestoredRef.current = false
        totalTimeRef.current = 0
        timeByBlockRef.current = {}
        blockStartRef.current = Date.now()
        lastBlockIdRef.current = null
        setTimeSpentSeconds(0)
        setCompletedBlocks(new Set())
        setCompletedMediaBlocks(new Set())
        setResumeNotice(null)
        setTranslationTarget(null)
        setShowBilingual(false)
        setBlockTranslations({})
        setModuleTitleTranslations({})
    }, [moduleData?.module.id])

    const activeBlock = moduleData?.blocks[activeBlockIndex]
    const totalBlocks = moduleData?.blocks.length || 1
    const isLastBlock = activeBlockIndex === totalBlocks - 1
    const completedCount = new Set([...completedBlocks, ...completedMediaBlocks]).size
    const progressSteps = Math.max(completedCount, activeBlockIndex + 1)
    const progressPercentage = Math.min(100, Math.round((progressSteps / totalBlocks) * 100))
    const translationTargetMeta = translationTarget
        ? SUPPORTED_TRANSLATION_LANGUAGES.find(lang => lang.code === translationTarget)
        : null
    const translationDir = translationTargetMeta?.direction || 'ltr'
    const displayModuleTitle = translationTarget && moduleTitleTranslations[translationTarget]
        ? moduleTitleTranslations[translationTarget] as string
        : moduleData?.module.title

    const handleNext = () => {
        if (!moduleData) return

        if (activeBlock) {
            setCompletedBlocks(prev => new Set(prev).add(activeBlock.id))
            void recordBlockCompletion(activeBlock.id)
        }

        if (isLastBlock) {
            handleCompleteModule()
        } else {
            setActiveBlockIndex(prev => prev + 1)
            window.scrollTo(0, 0)
            scheduleProgressSave(400)
        }
    }

    const handlePrevious = () => {
        setActiveBlockIndex(prev => Math.max(0, prev - 1))
        scheduleProgressSave(400)
    }

    const handleMarkWatched = (blockId: string) => {
        setCompletedMediaBlocks(prev => new Set(prev).add(blockId))
        setCompletedBlocks(prev => new Set(prev).add(blockId))
        void recordBlockCompletion(blockId)
        scheduleProgressSave(200)
    }

    const handleCompleteModule = async () => {
        if (!user || !moduleData) return

        try {
            const nowIso = new Date().toISOString()
            const timeSpent = totalTimeRef.current + Math.max(0, Math.floor((Date.now() - blockStartRef.current) / 1000))
            await learningService.submitQuizProgress({
                assignment_id: assignmentId || undefined,
                content_id: moduleData.module.id,
                content_type: 'module',
                user_id: user.id,
                status: 'completed',
                progress_percentage: 100,
                passed: true,
                score_percentage: quizScore !== null ? quizScore : undefined,
                completed_at: nowIso,
                last_accessed_at: nowIso,
                last_activity_at: nowIso,
                last_block_index: activeBlockIndex,
                last_block_id: activeBlock?.id || null,
                time_spent_seconds: timeSpent,
                metadata: {
                    completed_blocks: Array.from(completedBlocks),
                    completed_media_blocks: Array.from(completedMediaBlocks),
                    active_block_id: activeBlock?.id || null
                }
            })

            try {
                await skillsService.awardModuleSkills(user.id, moduleData.module.id)
            } catch (skillError) {
                // Silently fail - skills are optional, don't block completion
                // Error is logged but doesn't prevent certificate generation
            }

            // Grant certificate when quiz score meets or exceeds passing score
            const passingScore = moduleData.module.passing_score_percentage || 80
            const isPassed = quizScore !== null && quizScore >= passingScore

            if (isPassed && user && moduleData.module && moduleData.module.certificate_enabled) {
                try {
                    const certificateData: CertificateData = {
                        userId: user.id,
                        recipientName: profile?.full_name || user.email || 'Training Participant',
                        recipientEmail: user.email,
                        certificateType: 'training',
                        title: moduleData.module.title,
                        description: t('certificateEarned', { moduleName: moduleData.module.title }),
                        completionDate: new Date(),
                        score: quizScore,
                        trainingModuleId: moduleData.module.id
                    }
                    await createCertificate(certificateData)
                } catch (certError) {
                    // Certificate generation is optional - don't block completion
                    // Error is logged but doesn't prevent training completion
                    const errorDetails = getUserFriendlyError(certError)
                    toast({
                        title: t('certificateGenerationFailed'),
                        description: errorDetails.message,
                        variant: 'destructive'
                    })
                }
            }

            setIsFinished(true)
        } catch (error) {
            const errorDetails = getUserFriendlyError(error)
            toast({
                title: t('error'),
                description: errorDetails.message,
                variant: 'destructive'
            })
        }
    }

    const formatDuration = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        if (mins <= 0) return `${secs}s`
        return `${mins}m ${secs.toString().padStart(2, '0')}s`
    }, [])

    const storageKey = useMemo(() => {
        if (!user || !moduleData) return null
        return `training-player-progress:${user.id}:${moduleData.module.id}`
    }, [user?.id, moduleData?.module.id])

    const getCurrentSessionSeconds = useCallback(() => {
        const inBlock = Math.max(0, Math.floor((Date.now() - blockStartRef.current) / 1000))
        return totalTimeRef.current + inBlock
    }, [])

    const persistProgress = useCallback(async (statusOverride?: 'assigned' | 'in_progress' | 'completed') => {
        if (!user || !moduleData) return

        const status = statusOverride || (isFinished ? 'completed' : 'in_progress')
        const nowIso = new Date().toISOString()
        const timeSpent = getCurrentSessionSeconds()
        const metadata = {
            completed_blocks: Array.from(completedBlocks),
            completed_media_blocks: Array.from(completedMediaBlocks),
            active_block_id: activeBlock?.id || null
        }

        try {
            await learningService.submitQuizProgress({
                assignment_id: assignmentId || undefined,
                content_id: moduleData.module.id,
                content_type: 'module',
                user_id: user.id,
                status,
                progress_percentage: progressPercentage,
                last_accessed_at: nowIso,
                last_activity_at: nowIso,
                last_block_index: activeBlockIndex,
                last_block_id: activeBlock?.id || null,
                time_spent_seconds: timeSpent,
                metadata
            })

            if (storageKey) {
                localStorage.removeItem(storageKey)
            }
        } catch (error) {
            // Progress persistence failure is non-critical - continue silently
            // Progress is saved to localStorage as fallback
            if (storageKey) {
                localStorage.setItem(storageKey, JSON.stringify({
                    assignment_id: assignmentId || null,
                    content_id: moduleData.module.id,
                    content_type: 'module',
                    user_id: user.id,
                    status,
                    progress_percentage: progressPercentage,
                    last_accessed_at: nowIso,
                    last_activity_at: nowIso,
                    last_block_index: activeBlockIndex,
                    last_block_id: activeBlock?.id || null,
                    time_spent_seconds: timeSpent,
                    metadata,
                    saved_at: nowIso
                }))
            }
        }
    }, [
        user,
        moduleData,
        isFinished,
        getCurrentSessionSeconds,
        completedBlocks,
        completedMediaBlocks,
        activeBlock,
        assignmentId,
        progressPercentage,
        activeBlockIndex,
        storageKey
    ])

    const scheduleProgressSave = useCallback((delayMs = 1200) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }
        saveTimeoutRef.current = setTimeout(() => {
            void persistProgress()
        }, delayMs)
    }, [persistProgress])

    const recordBlockCompletion = useCallback(async (blockId: string) => {
        if (!user || !moduleData) return
        try {
            const nowIso = new Date().toISOString()
            let blockTime = timeByBlockRef.current[blockId] || 0
            if (activeBlock?.id === blockId) {
                blockTime += Math.max(0, Math.floor((Date.now() - blockStartRef.current) / 1000))
            }
            await supabase
                .from('training_block_progress')
                .upsert({
                    user_id: user.id,
                    training_module_id: moduleData.module.id,
                    block_id: blockId,
                    completed_at: nowIso,
                    last_viewed_at: nowIso,
                    time_spent_seconds: blockTime
                }, { onConflict: 'user_id,block_id' })
        } catch (error) {
            // Block completion recording is non-critical - continue silently
            // Main progress tracking will still work
        }
    }, [user, moduleData, activeBlock?.id])

    const canTranslateBlock = (block?: TrainingContentBlock) => {
        return !!block?.content && block.content.trim().length > 0
    }

    const translateCurrentContext = async (targetLang: TranslationTargetLanguage) => {
        if (!moduleData) return
        const targetMeta = SUPPORTED_TRANSLATION_LANGUAGES.find(lang => lang.code === targetLang)

        const tasks: Promise<void>[] = []

        if (moduleData.module.title && !moduleTitleTranslations[targetLang]) {
            tasks.push(
                translateAI.mutateAsync({ text: moduleData.module.title, target_lang: targetLang, source_lang: 'auto' })
                    .then(res => {
                        setModuleTitleTranslations(prev => ({ ...prev, [targetLang]: res.translated_text }))
                    })
            )
        }

        if (activeBlock && canTranslateBlock(activeBlock) && !blockTranslations[activeBlock.id]?.[targetLang]) {
            tasks.push(
                translateAI.mutateAsync({ text: activeBlock.content, target_lang: targetLang, source_lang: 'auto' })
                    .then(res => {
                        setBlockTranslations(prev => ({
                            ...prev,
                            [activeBlock.id]: {
                                ...prev[activeBlock.id],
                                [targetLang]: res.translated_text
                            }
                        }))
                    })
            )
        }

        if (tasks.length === 0) return

        setIsTranslating(true)
        try {
            await Promise.all(tasks)
            toast({
                title: t('translationComplete', 'Translation complete'),
                description: targetMeta?.label
                    ? t('translatedTo', { language: targetMeta.label })
                    : undefined
            })
        } catch (error) {
            const errorDetails = getUserFriendlyError(error)
            toast({
                title: t('translationFailed', 'Translation failed'),
                description: errorDetails.message,
                variant: 'destructive'
            })
            setTranslationTarget(null)
        } finally {
            setIsTranslating(false)
        }
    }

    const handleTranslate = async (targetLang: TranslationTargetLanguage) => {
        setTranslationTarget(targetLang)
        await translateCurrentContext(targetLang)
    }

    const handleClearTranslation = () => {
        setTranslationTarget(null)
        setShowBilingual(false)
    }

    useEffect(() => {
        if (!translationTarget || !activeBlock || !canTranslateBlock(activeBlock)) return
        if (blockTranslations[activeBlock.id]?.[translationTarget]) return
        if (isTranslating) return
        void translateCurrentContext(translationTarget)
    }, [translationTarget, activeBlock?.id])

    useEffect(() => {
        if (!user || !moduleData || hasRestoredRef.current) return

        let isActive = true
        const restoreProgress = async () => {
            const localPayload = storageKey ? localStorage.getItem(storageKey) : null
            const localData = localPayload ? JSON.parse(localPayload) : null

            const applyProgress = (progress: any) => {
                if (!progress || !moduleData) return
                const nextIndex = typeof progress.last_block_index === 'number'
                    ? Math.min(Math.max(progress.last_block_index, 0), moduleData.blocks.length - 1)
                    : 0
                if (nextIndex > 0) {
                    setActiveBlockIndex(nextIndex)
                    setResumeNotice(t('resumeNotice', 'Resumed from where you left off.'))
                }

                if (progress.metadata?.completed_blocks && Array.isArray(progress.metadata.completed_blocks)) {
                    setCompletedBlocks(new Set(progress.metadata.completed_blocks))
                } else if (nextIndex > 0) {
                    const completedIds = moduleData.blocks.slice(0, nextIndex).map(b => b.id)
                    setCompletedBlocks(new Set(completedIds))
                }

                if (progress.metadata?.completed_media_blocks && Array.isArray(progress.metadata.completed_media_blocks)) {
                    setCompletedMediaBlocks(new Set(progress.metadata.completed_media_blocks))
                }

                if (typeof progress.time_spent_seconds === 'number') {
                    totalTimeRef.current = progress.time_spent_seconds
                    setTimeSpentSeconds(progress.time_spent_seconds)
                }
            }

            if (localData && isActive) {
                applyProgress(localData)
            }

            const { data } = await supabase
                .from('learning_progress')
                .select('id, status, progress_percentage, last_block_index, last_block_id, time_spent_seconds, metadata, updated_at')
                .eq('user_id', user.id)
                .eq('content_type', 'module')
                .eq('content_id', moduleData.module.id)
                .maybeSingle()

            if (!isActive) return

            if (data) {
                const localUpdated = localData?.saved_at ? new Date(localData.saved_at).getTime() : 0
                const dbUpdated = data.updated_at ? new Date(data.updated_at).getTime() : 0
                if (!localData || dbUpdated >= localUpdated) {
                    applyProgress(data)
                }
            }
        }

        hasRestoredRef.current = true
        void restoreProgress()

        return () => {
            isActive = false
        }
    }, [user, moduleData, storageKey, t])

    useEffect(() => {
        if (!activeBlock) return
        const now = Date.now()
        if (lastBlockIdRef.current) {
            const elapsed = Math.max(0, Math.floor((now - blockStartRef.current) / 1000))
            if (elapsed > 0) {
                totalTimeRef.current += elapsed
                const lastId = lastBlockIdRef.current
                timeByBlockRef.current[lastId] = (timeByBlockRef.current[lastId] || 0) + elapsed
            }
        }
        blockStartRef.current = now
        lastBlockIdRef.current = activeBlock.id
        setTimeSpentSeconds(getCurrentSessionSeconds())

        if (user && moduleData) {
            const nowIso = new Date().toISOString()
            void supabase
                .from('training_block_progress')
                .upsert({
                    user_id: user.id,
                    training_module_id: moduleData.module.id,
                    block_id: activeBlock.id,
                    last_viewed_at: nowIso
                }, { onConflict: 'user_id,block_id' })
        }

        scheduleProgressSave()
    }, [activeBlock?.id, user, moduleData, getCurrentSessionSeconds, scheduleProgressSave])

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeSpentSeconds(getCurrentSessionSeconds())
            scheduleProgressSave(0)
        }, 45000)
        return () => clearInterval(interval)
    }, [getCurrentSessionSeconds, scheduleProgressSave])

    useEffect(() => {
        const handleBeforeUnload = () => {
            void persistProgress()
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [persistProgress])

    const getTranslatedBlockContent = (block: TrainingContentBlock) => {
        if (!translationTarget) return undefined
        return blockTranslations[block.id]?.[translationTarget]
    }

    const isGateBlock = !!(activeBlock && ['video', 'audio', 'interactive'].includes(activeBlock.type))
    const isGateCompletionRequired = !!(activeBlock && activeBlock.is_mandatory && isGateBlock)
    const isGateCompleted = !!(activeBlock && completedMediaBlocks.has(activeBlock.id))
    const canProceedToNext = !isGateCompletionRequired || isGateCompleted

    const renderRichText = (originalHtml: string, translatedHtml?: string) => {
        const originalMarkup = sanitizeHtml(originalHtml)
        const translatedMarkup = translatedHtml ? sanitizeHtml(translatedHtml) : ''

        if (!translationTarget || !translatedHtml) {
            return (
                <div className="prose md:prose-lg max-w-none dark:prose-invert leading-relaxed">
                    <div dangerouslySetInnerHTML={{ __html: originalMarkup }} />
                </div>
            )
        }

        if (showBilingual) {
            return (
                <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
                            {t('original', 'Original')}
                        </div>
                        <div className="prose md:prose-lg max-w-none dark:prose-invert leading-relaxed">
                            <div dangerouslySetInnerHTML={{ __html: originalMarkup }} />
                        </div>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4" dir={translationDir}>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-700 mb-2">
                            {t('translatedTo', { language: translationTargetMeta?.label || t('translated', 'Translated') })}
                        </div>
                        <div className="prose md:prose-lg max-w-none dark:prose-invert leading-relaxed whitespace-pre-wrap">
                            <div dangerouslySetInnerHTML={{ __html: translatedMarkup }} />
                        </div>
                    </div>
                </div>
            )
        }

        return (
            <div className="prose md:prose-lg max-w-none dark:prose-invert leading-relaxed whitespace-pre-wrap" dir={translationDir}>
                <div dangerouslySetInnerHTML={{ __html: translatedMarkup }} />
            </div>
        )
    }

    const renderBlockContent = (block: TrainingContentBlock) => {
        const variants = {
            initial: { opacity: 0, x: isRTL ? -20 : 20 },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: isRTL ? 20 : -20 }
        }
        const translatedBlockContent = getTranslatedBlockContent(block)

        return (
            <motion.div
                key={block.id}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-6"
            >
                {block.type === 'text' && renderRichText(block.content, translatedBlockContent)}

                {block.type === 'video' && (
                    <div className="space-y-6">
                        <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 relative group">
                            {block.content_url ? (
                                (() => {
                                    const isDirectVideo = /\.(mp4|webm|ogg)$/i.test(block.content_url)
                                    if (isDirectVideo) {
                                        return (
                                            <video
                                                src={block.content_url}
                                                className="w-full h-full"
                                                controls
                                                onTimeUpdate={(e) => {
                                                    const target = e.currentTarget
                                                    if (target.duration && target.currentTime / target.duration >= 0.9) {
                                                        if (!completedMediaBlocks.has(block.id)) {
                                                            handleMarkWatched(block.id)
                                                        }
                                                    }
                                                }}
                                            />
                                        )
                                    }
                                    return (
                                        <iframe
                                            src={block.content_url}
                                            className="w-full h-full"
                                            allowFullScreen
                                            title={t('videoContent')}
                                        />
                                    )
                                })()
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-white/50">
                                    <VideoIcon className="h-12 w-12 mb-4 animate-pulse" />
                                    <span>{t('videoUrlMissing')}</span>
                                </div>
                            )}
                        </div>
                        {block.is_mandatory && (
                            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                                <div>
                                    <p className="text-sm font-semibold text-hotel-navy">
                                        {completedMediaBlocks.has(block.id)
                                            ? t('videoCompleted', 'Video completed')
                                            : t('videoRequired', 'Watch the video to continue')}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {t('videoCompletionHint', 'You can mark it as watched if the player does not support tracking.')}
                                    </p>
                                </div>
                                {!completedMediaBlocks.has(block.id) && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleMarkWatched(block.id)}
                                    >
                                        {t('markWatched', 'Mark as watched')}
                                    </Button>
                                )}
                            </div>
                        )}
                        {block.content && (
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                {renderRichText(block.content, translatedBlockContent)}
                            </div>
                        )}
                    </div>
                )}

                {block.type === 'audio' && (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            {block.content_url ? (
                                <audio
                                    className="w-full"
                                    controls
                                    src={block.content_url}
                                    onTimeUpdate={(e) => {
                                        const target = e.currentTarget
                                        if (target.duration && target.currentTime / target.duration >= 0.9) {
                                            if (!completedMediaBlocks.has(block.id)) {
                                                handleMarkWatched(block.id)
                                            }
                                        }
                                    }}
                                />
                            ) : (
                                <div className="flex items-center gap-3 text-slate-500">
                                    <Headphones className="h-6 w-6" />
                                    <span>{t('audioUrlMissing', 'Audio URL missing')}</span>
                                </div>
                            )}
                        </div>
                        {block.is_mandatory && (
                            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                                <div>
                                    <p className="text-sm font-semibold text-hotel-navy">
                                        {completedMediaBlocks.has(block.id)
                                            ? t('audioCompleted', 'Audio completed')
                                            : t('audioRequired', 'Listen to the audio to continue')}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {t('audioCompletionHint', 'You can mark it as listened if the player does not support tracking.')}
                                    </p>
                                </div>
                                {!completedMediaBlocks.has(block.id) && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleMarkWatched(block.id)}
                                    >
                                        {t('markListened', 'Mark as listened')}
                                    </Button>
                                )}
                            </div>
                        )}
                        {block.content && (
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                {renderRichText(block.content, translatedBlockContent)}
                            </div>
                        )}
                    </div>
                )}

                {block.type === 'interactive' && (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            {block.content_url ? (
                                <div className="aspect-video rounded-xl overflow-hidden bg-slate-900">
                                    <iframe
                                        src={block.content_url}
                                        className="w-full h-full"
                                        allow="clipboard-read; clipboard-write; fullscreen"
                                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                                        title={block.title || t('interactiveBlock', 'Interactive content')}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 text-slate-500">
                                    <Gamepad2 className="h-6 w-6" />
                                    <span>{t('interactiveUrlMissing', 'Interactive URL missing')}</span>
                                </div>
                            )}
                        </div>
                        {block.is_mandatory && (
                            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                                <div>
                                    <p className="text-sm font-semibold text-hotel-navy">
                                        {completedMediaBlocks.has(block.id)
                                            ? t('interactiveCompleted', 'Activity completed')
                                            : t('interactiveRequired', 'Complete the activity to continue')}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {t('interactiveCompletionHint', 'Mark complete once finished to unlock the next step.')}
                                    </p>
                                </div>
                                {!completedMediaBlocks.has(block.id) && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleMarkWatched(block.id)}
                                    >
                                        {t('markCompleted', 'Mark as completed')}
                                    </Button>
                                )}
                            </div>
                        )}
                        {block.content && (
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                {renderRichText(block.content, translatedBlockContent)}
                            </div>
                        )}
                    </div>
                )}

                {block.type === 'image' && (
                    <div className="space-y-6">
                        {block.content_url && (
                            <div className="relative group">
                                <img
                                    src={block.content_url}
                                    alt={t('content')}
                                    className="rounded-2xl shadow-xl max-h-[600px] w-auto mx-auto border border-slate-200 transition-transform duration-500 group-hover:scale-[1.01]"
                                />
                                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10 pointer-events-none" />
                            </div>
                        )}
                        {block.content && (
                            <div>
                                {renderRichText(block.content, translatedBlockContent)}
                            </div>
                        )}
                    </div>
                )}

                {block.type === 'quiz' && (
                    <div className="py-8">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-12 w-12 rounded-xl bg-hotel-gold/20 flex items-center justify-center">
                                <HelpCircle className="h-6 w-6 text-hotel-gold-dark" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-hotel-navy leading-none mb-1">
                                    {t('knowledgeCheck')}
                                </h3>
                                <p className="text-sm text-muted-foreground">{t('validateYourLearning')}</p>
                            </div>
                        </div>
                        <QuizComponent
                            quizId={block.content_data?.quiz_id as string}
                            certificateEnabled={moduleData.module.certificate_enabled}
                            onComplete={(result) => {
                                setQuizScore(result.score)
                                if (result.passed) {
                                    toast({
                                        title: t('moduleQuizPassed'),
                                        description: t('quizScoreProceed', { score: result.score })
                                    })
                                } else {
                                    toast({
                                        title: t('quizNotPassed'),
                                        description: t('quizScoreReview', { score: result.score }),
                                        variant: 'destructive'
                                    })
                                }
                            }}
                        />
                    </div>
                )}

                {block.type === 'document_link' && (
                    <DocumentBlockRenderer
                        block={block}
                        translatedContent={translatedBlockContent}
                        showBilingual={showBilingual}
                        translationLabel={translationTargetMeta?.label}
                        translationDir={translationDir}
                    />
                )}

                {block.type === 'sop_reference' && (
                    <div className="p-8 border-l-4 border-emerald-500 rounded-xl bg-emerald-50/50 shadow-sm">
                        <div className="flex items-center gap-3 text-emerald-700 font-bold mb-4">
                            <BookOpen className="h-6 w-6" />
                            {t('sopReference')}
                        </div>
                        <p className="text-slate-700 mb-6 leading-relaxed">
                            {t('thisSectionReferencesSop', { sopId: block.content_data?.sop_id })}
                        </p>
                        <Button
                            asChild
                            variant="outline"
                            className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                            <a href={`/documents/${block.content_data?.sop_id}`} target="_blank" rel="noreferrer">
                                <LinkIcon className="mr-2 h-4 w-4" />
                                {t('viewSop')}
                            </a>
                        </Button>
                        {block.content && (
                            <div className="mt-6 pt-6 border-t border-emerald-100">
                                {renderRichText(block.content, translatedBlockContent)}
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        )
    }

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
            <div className="animate-spin h-12 w-12 border-4 border-hotel-gold border-t-transparent rounded-full mb-4"></div>
            <p className="text-hotel-navy font-medium animate-pulse">{t('loadingTraining')}</p>
        </div>
    )

    if (!moduleData) return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <X className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-xl font-medium">{t('trainingNotFound')}</p>
            <Button variant="link" onClick={() => navigate('/learning/my')}>{t('backToList')}</Button>
        </div>
    )

    if (isFinished) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-screen bg-slate-50 flex items-center justify-center p-6"
            >
                <Card className="max-w-xl w-full text-center p-12 shadow-2xl border-0 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-hotel-gold"></div>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.2 }}
                        className="h-24 w-24 bg-hotel-gold/10 rounded-full flex items-center justify-center mx-auto mb-8"
                    >
                        <Trophy className="h-12 w-12 text-hotel-gold-dark" />
                    </motion.div>

                    <h2 className="text-3xl font-bold text-hotel-navy mb-4 font-serif">
                        {t('congratulations')}
                    </h2>
                    <p className="text-slate-600 mb-8 text-lg">
                        {t('trainingCompletedMessage', { module: moduleData.module.title })}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-10">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{t('finalScore')}</p>
                            <p className="text-2xl font-bold text-hotel-navy">{quizScore !== null ? `${quizScore}%` : t('n_a')}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{t('status')}</p>
                            <p className="text-2xl font-bold text-emerald-600">{t('passed')}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {moduleData.linkedQuizId && (
                            <Button className="w-full bg-hotel-navy hover:bg-hotel-navy-light text-white h-12" onClick={() => navigate(`/learning/quizzes/${moduleData.linkedQuizId}/take`)}>
                                {t('takeFinalCertification')}
                            </Button>
                        )}
                        <Button variant="outline" className="w-full h-12" onClick={() => navigate('/learning/my')}>
                            {t('backToMyLearning')}
                        </Button>
                    </div>
                </Card>
            </motion.div>
        )
    }

    return (
        <div className={cn(
            "flex h-[calc(100vh-0rem)] bg-white overflow-hidden",
            isRTL ? "flex-row-reverse" : "flex-row"
        )}>
            {/* Sidebar */}
            <AnimatePresence mode="wait">
                {sidebarOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 320, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className={cn(
                            "flex flex-col bg-hotel-navy-dark text-white shrink-0 relative z-[60] shadow-2xl transition-all duration-300",
                            "fixed inset-y-0 lg:static lg:h-full",
                            isRTL ? "right-0 border-l border-white/5" : "left-0 border-r border-white/5",
                            sidebarOpen ? "translate-x-0 w-[280px] md:w-[320px]" : (isRTL ? "translate-x-full w-0" : "-translate-x-full w-0"),
                            "lg:translate-x-0 lg:w-[320px]"
                        )}
                    >
                        <div className="p-8 border-b border-white/10 bg-hotel-navy/50">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-lg bg-hotel-gold/20 flex items-center justify-center shrink-0">
                                <BookOpen className="h-5 w-5 text-hotel-gold" />
                            </div>
                            <h2 className="font-bold text-lg font-serif leading-tight line-clamp-2">
                                {displayModuleTitle || moduleData.module.title}
                            </h2>
                        </div>
                        {showBilingual && translationTarget && moduleTitleTranslations[translationTarget] && (
                            <div className="text-xs text-white/60 mb-4" dir={translationDir}>
                                {moduleData.module.title}
                            </div>
                        )}

                            <div className="space-y-2">
                                <div className="flex justify-between items-end text-xs mb-1.5">
                                    <span className="text-white/60 uppercase tracking-widest font-semibold">{t('overallProgress')}</span>
                                    <span className="text-hotel-gold font-bold">{Math.round(progressPercentage)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-hotel-gold to-hotel-gold-light"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercentage}%` }}
                                        transition={{ duration: 1, ease: "circOut" }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
                            <div className="space-y-1">
                                {moduleData.blocks.map((block, idx) => (
                                    <button
                                        key={block.id}
                                        onClick={() => setActiveBlockIndex(idx)}
                                        className={cn(
                                            "w-full flex items-start gap-4 p-4 rounded-xl text-sm transition-all duration-200 group relative overflow-hidden",
                                            idx === activeBlockIndex
                                                ? "bg-hotel-gold/15 text-white ring-1 ring-hotel-gold/30"
                                                : "text-white/70 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        {idx === activeBlockIndex && (
                                            <motion.div
                                                layoutId="active-pill"
                                                className={cn(
                                                    "absolute top-0 bottom-0 w-1 bg-hotel-gold",
                                                    isRTL ? "right-0" : "left-0"
                                                )}
                                            />
                                        )}
                                        <div className={cn(
                                            "mt-0.5 shrink-0 transition-colors",
                                            idx === activeBlockIndex ? "text-hotel-gold" : "text-white/40 group-hover:text-white/60"
                                        )}>
                                        {block.type === 'video' && <VideoIcon className="w-4 h-4" />}
                                        {block.type === 'audio' && <Headphones className="w-4 h-4" />}
                                        {block.type === 'interactive' && <Gamepad2 className="w-4 h-4" />}
                                        {block.type === 'quiz' && <HelpCircle className="w-4 h-4" />}
                                        {block.type === 'image' && <ImageIcon className="w-4 h-4" />}
                                        {block.type === 'text' && <FileText className="w-4 h-4" />}
                                        {block.type === 'document_link' && <LinkIcon className="w-4 h-4" />}
                                            {block.type === 'sop_reference' && <BookOpen className="w-4 h-4" />}
                                        </div>
                                        <div className={cn(
                                            "flex-1 text-left",
                                            isRTL && "text-right"
                                        )}>
                                            <p className={cn(
                                                "font-medium leading-tight",
                                                idx === activeBlockIndex ? "text-white" : ""
                                            )}>
                                                {t('blockTitle', { number: idx + 1 })}
                                            </p>
                                            <p className="text-[10px] text-white/40 uppercase mt-1 tracking-wider">
                                                {block.type.replace('_', ' ')}
                                            </p>
                                        </div>
                                        {(completedBlocks.has(block.id) || completedMediaBlocks.has(block.id)) && (
                                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/60 z-50 lg:hidden backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Main Player Component */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 overflow-hidden">
                {/* Header */}
                <header className={cn(
                    "h-16 md:h-20 bg-white border-b border-slate-100 flex items-center px-4 md:px-10 justify-between shrink-0 sticky top-0 z-20",
                    isRTL ? "flex-row-reverse" : "flex-row"
                )}>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="bg-slate-50 hover:bg-slate-100 h-10 w-10 rounded-full"
                        >
                            <Menu className="h-5 w-5 text-hotel-navy" />
                        </Button>
                        <div className="hidden xs:block">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-hotel-gold font-bold block mb-0.5">
                                {t('learningInProgressBar')}
                            </span>
                            <h1 className="text-sm font-bold text-hotel-navy line-clamp-1">{moduleData.module.title}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="bg-slate-100 px-4 py-2 rounded-full flex items-center gap-2 mr-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-hotel-gold animate-pulse" />
                            <span className="text-xs font-bold text-hotel-navy tabular-nums">
                                {activeBlockIndex + 1} / {moduleData.blocks.length}
                            </span>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 border-slate-200 bg-white"
                                    disabled={isTranslating}
                                >
                                    {isTranslating ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Languages className="h-4 w-4" />
                                    )}
                                    <span className="hidden sm:inline">
                                        {translationTargetMeta
                                            ? t('translatedTo', { language: translationTargetMeta.label })
                                            : t('translate', 'Translate')}
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                    {t('translateTo', 'Translate to')}
                                </div>
                                {SUPPORTED_TRANSLATION_LANGUAGES.map(lang => (
                                    <DropdownMenuItem key={lang.code} onClick={() => handleTranslate(lang.code)}>
                                        {lang.label}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={showBilingual}
                                    onCheckedChange={() => setShowBilingual(prev => !prev)}
                                >
                                    {t('showBilingual', 'Show bilingual')}
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuItem onClick={handleClearTranslation}>
                                    {t('viewOriginal', 'View original')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/learning/my')}
                            className="text-hotel-navy hover:bg-slate-50 font-medium hidden sm:flex"
                        >
                            <ArrowLeft className={cn("h-4 w-4", isRTL ? "ml-2 rotate-180" : "mr-2")} />
                            <span className="hidden md:inline">{t('exitLearning')}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/learning/my')}
                            className="sm:hidden h-10 w-10 text-hotel-navy"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto custom-scrollbar-light bg-white pt-4 pb-12">
                    <div className="max-w-4xl mx-auto py-4 md:py-12 px-4 md:px-12 lg:px-16 min-h-full flex flex-col">
                        <div className="mb-6 space-y-3">
                            {resumeNotice && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                    {resumeNotice}
                                </div>
                            )}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400 font-semibold">
                                            {t('pageOf', { current: activeBlockIndex + 1, total: totalBlocks })}
                                        </p>
                                        <h2 className="text-lg font-semibold text-hotel-navy flex items-center gap-2">
                                            {t('blockTitle', { number: activeBlockIndex + 1 })}
                                            {activeBlock?.type && (
                                                <Badge variant="secondary" className="capitalize">
                                                    {activeBlock.type.replace('_', ' ')}
                                                </Badge>
                                            )}
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                            <span>{t('estimatedDuration', 'Estimated duration')}</span>
                                            <span className="font-semibold text-slate-700">
                                                {moduleData.module.estimated_duration_minutes
                                                    ? `${moduleData.module.estimated_duration_minutes} ${t('min', 'min')}`
                                                    : t('unknown', 'Unknown')}
                                            </span>
                                            <span className="text-slate-300">•</span>
                                            <span>{t('timeSpent', 'Time spent')}</span>
                                            <span className="font-semibold text-slate-700">{formatDuration(timeSpentSeconds)}</span>
                                        </div>
                                    </div>
                                    <div className="w-full md:max-w-[220px] space-y-2">
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                            <span>{t('overallProgress', 'Overall progress')}</span>
                                            <span className="font-semibold text-slate-700">{progressPercentage}%</span>
                                        </div>
                                        <Progress value={progressPercentage} className="h-2 bg-slate-200" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeBlock?.id || 'no-content'}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.4, ease: "circOut" }}
                                className="flex-1"
                            >
                                {activeBlock ? (
                                    renderBlockContent(activeBlock)
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                                            <BookOpen className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-hotel-navy mb-2">
                                            {t('noContentYet', 'No Content Yet')}
                                        </h3>
                                        <p className="text-muted-foreground max-w-md">
                                            {t('moduleEmptyDescription', 'This module does not have any content blocks yet. Please add content in the Training Builder.')}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        <div className="h-12 shrink-0" /> {/* Spacer */}
                    </div>
                </main>

                {/* Navigation Bar */}
                <footer className={cn(
                    "h-20 md:h-24 bg-white border-t border-slate-100 flex items-center justify-between px-4 md:px-12 shrink-0 z-20 sticky bottom-0",
                    isRTL ? "flex-row-reverse" : "flex-row"
                )}>
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={handlePrevious}
                        disabled={activeBlockIndex === 0}
                        className={cn(
                            "h-10 md:h-12 px-4 md:px-6 text-sm md:text-base font-bold tracking-wide border-2 hover:bg-slate-50 transition-all rounded-xl",
                            isRTL ? "flex-row-reverse" : ""
                        )}
                    >
                        <ChevronLeft className={cn(
                            "h-4 w-4 md:h-5 md:w-5",
                            isRTL ? "ml-2 md:ml-3 rotate-180" : "mr-2 md:mr-3"
                        )} />
                        <span className="hidden xs:inline">{t('previous')}</span>
                        <ChevronLeft className="h-4 w-4 xs:hidden" />
                    </Button>

                    <div className="hidden md:flex flex-col items-center">
                        <div className="flex gap-2 mb-2">
                            {moduleData.blocks.map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "h-1.5 rounded-full transition-all duration-300",
                                        i === activeBlockIndex ? "w-8 bg-hotel-gold" : "w-1.5 bg-slate-200"
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    <Button
                        size="lg"
                        onClick={handleNext}
                        disabled={!canProceedToNext}
                        className={cn(
                            "h-10 md:h-12 px-4 md:px-8 text-sm md:text-base font-bold tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl",
                            isLastBlock
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-hotel-navy hover:bg-hotel-navy-light text-white",
                            isRTL ? "flex-row-reverse" : "",
                            !canProceedToNext && "opacity-60 pointer-events-none"
                        )}
                    >
                        {isLastBlock ? (
                            <>
                                <CheckCircle className={cn("h-4 w-4 md:h-5 md:w-5", isRTL ? "ml-2 md:ml-3" : "mr-2 md:mr-3")} />
                                <span>{t('completeModule')}</span>
                            </>
                        ) : (
                            <>
                                <span className="hidden xs:inline">{t('nextStep')}</span>
                                <ChevronRight className={cn(
                                    "h-4 w-4 md:h-5 md:w-5",
                                    isRTL ? "mr-2 md:mr-3 rotate-180" : "ml-2 md:ml-3"
                                )} />
                                <ChevronRight className="h-4 w-4 xs:hidden" />
                            </>
                        )}
                    </Button>
                </footer>
            </div>
        </div>
    )
}
