import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { DocumentBlockRenderer } from '@/components/training/DocumentBlockRenderer'
import { EmbeddedArticleViewer } from '@/components/training/EmbeddedArticleViewer'
import { SmartObserver } from '@/components/training/SmartObserver'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import type { TranslationTargetLanguage } from '@/hooks/useTranslationAI'
import { SUPPORTED_TRANSLATION_LANGUAGES, useTranslationAI } from '@/hooks/useTranslationAI'
import { createCertificate, type CertificateData } from '@/services/certificateService'
import { awardCertificationPathCertificates } from '@/services/certificationPathService'
import { getUserFriendlyError } from '@/lib/errorMessages'
import { sanitizeHtml } from '@/lib/sanitize'
import { safeLocalStorage } from '@/lib/storage'
import type { TrainingContentBlock } from '@/lib/types'
import { cn } from '@/lib/utils'
import { QuizComponentEnhanced } from '@/pages/learning/components/QuizComponentEnhanced'
import { learningService } from '@/services/learningService'
import { skillsService } from '@/services/skillsService'
import {
    ArrowLeft,
    BookOpen,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Eye,
    FileText,
    Gamepad2,
    Headphones,
    HelpCircle,
    Image as ImageIcon,
    Languages,
    Link as LinkIcon,
    Loader2,
    Menu,
    MousePointer2,
    Trophy,
    Video as VideoIcon,
    X
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { marked } from 'marked'

type PersistedModuleProgress = {
    status?: string
    progress_percentage?: number
    completed_at?: string | null
    passed?: boolean | null
    last_block_index?: number
    last_block_id?: string | null
    metadata?: {
        completed_blocks?: string[]
        completed_media_blocks?: string[]
        quiz_scores_by_id?: Record<string, number>
        quiz_results_by_id?: Record<string, PersistedQuizResult>
    }
    score_percentage?: number
    time_spent_seconds?: number
    saved_at?: string
    updated_at?: string
}

type PersistedQuizReviewItem = {
    questionId: string
    questionText: string
    selectedAnswer: string
    correctAnswer: string
    correct: boolean
    explanation?: string
    timeSpentSeconds: number
}

type PersistedQuizResult = {
    quizId: string
    quizTitle: string
    score: number
    passed: boolean
    correctCount: number
    totalQuestions: number
    completedAt: string
    reviewItems: PersistedQuizReviewItem[]
}

type RichTextBlockContentProps = {
    originalHtml: string
    translatedHtml?: string
    translationTarget: TranslationTargetLanguage | null
    showBilingual: boolean
    translationDir: 'ltr' | 'rtl'
    originalLabel: string
    translatedLabel: string
}

type MediaWatchState = {
    lastTime: number
    watchedSeconds: number
    markedComplete: boolean
}

type ModuleCompletionOverrides = {
    completedBlocks?: Set<string>
    quizScoresById?: Record<string, number>
    quizResultsById?: Record<string, PersistedQuizResult>
    quizScore?: number | null
    lastBlockId?: string | null
    lastBlockIndex?: number
}

const isValidUuid = (value?: string | null) =>
    !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

const getModuleQuizIds = (blocks: TrainingContentBlock[] = []) => {
    const ids = blocks
        .filter((block) => block.type === 'quiz')
        .map((block) => (block.content_data as Record<string, unknown> | null)?.quiz_id)
        .filter((quizId): quizId is string => typeof quizId === 'string' && quizId.length > 0)
    return Array.from(new Set(ids))
}

const isResetProgressSnapshot = (progress: PersistedModuleProgress | null | undefined) => {
    if (!progress) return false

    const completedBlocks = progress.metadata?.completed_blocks
    const completedMediaBlocks = progress.metadata?.completed_media_blocks
    const quizScores = progress.metadata?.quiz_scores_by_id
    const quizResults = progress.metadata?.quiz_results_by_id

    return progress.status === 'assigned'
        && (progress.progress_percentage ?? 0) === 0
        && (progress.last_block_index === null || progress.last_block_index === undefined)
        && (!completedBlocks || completedBlocks.length === 0)
        && (!completedMediaBlocks || completedMediaBlocks.length === 0)
        && (!quizScores || Object.keys(quizScores).length === 0)
        && (!quizResults || Object.keys(quizResults).length === 0)
}

const getAggregatedQuizScore = (quizIds: string[], quizScoresById: Record<string, number>) => {
    if (quizIds.length === 0) return null
    const scores = quizIds
        .map((quizId) => quizScoresById[quizId])
        .filter((score): score is number => typeof score === 'number')

    if (scores.length !== quizIds.length) return null
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length
    return Math.round(avg)
}

const getValidQuizScoresMap = (value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>((acc, [quizId, score]) => {
        if (typeof score === 'number' && Number.isFinite(score)) {
            acc[quizId] = score
        }
        return acc
    }, {})
}

function RichTextBlockContent({
    originalHtml,
    translatedHtml,
    translationTarget,
    showBilingual,
    translationDir,
    originalLabel,
    translatedLabel
}: RichTextBlockContentProps) {
    const originalMarkup = sanitizeHtml(marked.parse(originalHtml || '', { async: false }) as string)
    const translatedMarkup = translatedHtml ? sanitizeHtml(marked.parse(translatedHtml, { async: false }) as string) : ''

    if (!translationTarget || !translatedHtml) {
        return (
            <div className="prose md:prose-lg max-w-none dark:prose-invert leading-relaxed">
                <InlineErrorBoundary>
                    <div dangerouslySetInnerHTML={{ __html: originalMarkup }} />
                </InlineErrorBoundary>
            </div>
        )
    }

    if (showBilingual) {
        return (
            <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
                        {originalLabel}
                    </div>
                    <div className="prose md:prose-lg max-w-none dark:prose-invert leading-relaxed">
                        <InlineErrorBoundary>
                            <div dangerouslySetInnerHTML={{ __html: originalMarkup }} />
                        </InlineErrorBoundary>
                    </div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4" dir={translationDir}>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-700 mb-2">
                        {translatedLabel}
                    </div>
                    <div className="prose md:prose-lg max-w-none dark:prose-invert leading-relaxed whitespace-pre-wrap">
                        <InlineErrorBoundary>
                            <div dangerouslySetInnerHTML={{ __html: translatedMarkup }} />
                        </InlineErrorBoundary>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="prose md:prose-lg max-w-none dark:prose-invert leading-relaxed whitespace-pre-wrap" dir={translationDir}>
            <InlineErrorBoundary>
                <div dangerouslySetInnerHTML={{ __html: translatedMarkup }} />
            </InlineErrorBoundary>
        </div>
    )
}

type VideoPlayerProps = {
    src: string
    blockId: string
    onMarkWatched: (blockId: string) => void
    onTrackProgress: (blockId: string, currentTime: number, duration: number) => void
    onRegisterSeek: (blockId: string, currentTime: number) => void
    t: TFunction<'training', undefined>
}

function VideoPlayer({ src, blockId, onMarkWatched, onTrackProgress, onRegisterSeek, t }: VideoPlayerProps) {
    const [videoError, setVideoError] = useState<string | null>(null)
    const [videoLoading, setVideoLoading] = useState(true)
    const [refreshingUrl, setRefreshingUrl] = useState(false)
    const [currentSrc, setCurrentSrc] = useState(src)
    const videoRef = useRef<HTMLVideoElement>(null)

    // Detect if URL is a Supabase storage URL that needs refreshing
    const isSupabaseStorageUrl = (url: string): boolean => {
        return url.includes('.supabase.co/storage/') || 
               url.includes('/storage/v1/object/') ||
               url.includes('/storage/v1/s3/')
    }

    // Refresh signed URL for Supabase storage
    const refreshSignedUrl = useCallback(async (originalUrl: string): Promise<string | null> => {
        try {
            // Extract bucket and path from the URL
            const url = new URL(originalUrl)
            const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(signed|public)\/([^/]+)\/(.+)/)
            
            if (!pathMatch) {
                // Try S3-style URL pattern
                const s3Match = url.pathname.match(/\/storage\/v1\/s3\/(.+)/)
                if (s3Match) {
                    // For S3 URLs, we need to get the bucket from the hostname or use 'media' as default
                    const bucket = 'media' // Default bucket, adjust if needed
                    const path = s3Match[1]
                    const { data, error } = await supabase.storage
                        .from(bucket)
                        .createSignedUrl(path, 3600) // 1 hour expiry
                    
                    if (error) throw error
                    return data?.signedUrl || null
                }
                return null
            }

            const bucket = pathMatch[2]
            const path = decodeURIComponent(pathMatch[3])

            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(path, 3600) // 1 hour expiry

            if (error) throw error
            return data?.signedUrl || null
        } catch (err) {
            console.error('Failed to refresh signed URL:', err)
            return null
        }
    }, [])

    // Handle video load error - try to refresh the URL if it's a Supabase URL
    const handleVideoError = useCallback(async () => {
        if (isSupabaseStorageUrl(currentSrc) && !refreshingUrl) {
            setRefreshingUrl(true)
            const freshUrl = await refreshSignedUrl(currentSrc)
            
            if (freshUrl) {
                setCurrentSrc(freshUrl)
                setVideoLoading(true)
                setVideoError(null)
                // The video element will reload with the new src
            } else {
                setVideoLoading(false)
                setVideoError(t('videoLoadError', 'Unable to load video. The file may be missing or access has expired.'))
            }
            setRefreshingUrl(false)
        } else {
            setVideoLoading(false)
            setVideoError(t('videoLoadError', 'Unable to load video. The file may be missing or unsupported.'))
        }
    }, [currentSrc, refreshingUrl, refreshSignedUrl, t])

    return (
        <>
            {(videoLoading || refreshingUrl) && !videoError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 z-10">
                    <div className="animate-spin h-10 w-10 border-4 border-white/30 border-t-white rounded-full mb-3"></div>
                    <span className="text-sm">
                        {refreshingUrl ? t('refreshingVideo', 'Refreshing access...') : t('loadingVideo', 'Loading video...')}
                    </span>
                </div>
            )}
            {videoError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 z-10 p-6 text-center">
                    <VideoIcon className="h-12 w-12 mb-3 opacity-50" />
                    <span className="text-sm mb-2">{videoError}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setVideoError(null)
                            setVideoLoading(true)
                            // Try refreshing the URL again
                            if (isSupabaseStorageUrl(currentSrc)) {
                                void handleVideoError()
                            } else {
                                // For non-Supabase URLs, just reload
                                videoRef.current?.load()
                            }
                        }}
                        className="mt-2 border-white/30 text-white hover:bg-white/10"
                    >
                        {t('retry', 'Retry')}
                    </Button>
                </div>
            )}
            <video
                ref={videoRef}
                src={currentSrc}
                className={cn("w-full h-full", (videoError || refreshingUrl) && "opacity-0")}
                controls
                onLoadedData={() => setVideoLoading(false)}
                onError={handleVideoError}
                onTimeUpdate={(e) => {
                    const target = e.currentTarget
                    onTrackProgress(blockId, target.currentTime, target.duration)
                }}
                onSeeking={(e) => onRegisterSeek(blockId, e.currentTarget.currentTime)}
            />
        </>
    )
}

export default function TrainingPlayer() {
    const { t, i18n } = useTranslation('training')
    const isRTL = i18n.dir() === 'rtl'
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const assignmentId = searchParams.get('assignment')
    const navigate = useNavigate()
    const { toast } = useToast()
    const { user, profile, properties, departments, primaryRole } = useAuth()
    const isValidModuleId = isValidUuid(id)

    const canViewUnpublishedModules = ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '')

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

    const [activeBlockIndex, setActiveBlockIndex] = useState(0)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [completedBlocks, setCompletedBlocks] = useState<Set<string>>(new Set())
    const [quizScore, setQuizScore] = useState<number | null>(null)
    const [quizScoresById, setQuizScoresById] = useState<Record<string, number>>({})
    const [quizResultsById, setQuizResultsById] = useState<Record<string, PersistedQuizResult>>({})
    const [completionScore, setCompletionScore] = useState<number | null>(null)
    const [completionPassed, setCompletionPassed] = useState<boolean | null>(null)
    const [isFinished, setIsFinished] = useState(false)
    const [translationTarget, setTranslationTarget] = useState<TranslationTargetLanguage | null>(null)
    const [showBilingual, setShowBilingual] = useState(false)
    const [isTranslating, setIsTranslating] = useState(false)
    const [blockTranslations, setBlockTranslations] = useState<Record<string, Partial<Record<TranslationTargetLanguage, string>>>>({})
    const [moduleTitleTranslations, setModuleTitleTranslations] = useState<Partial<Record<TranslationTargetLanguage, string>>>({})
    const [completedMediaBlocks, setCompletedMediaBlocks] = useState<Set<string>>(new Set())
    const [timeSpentSeconds, setTimeSpentSeconds] = useState(0)
    const [resumeNotice, setResumeNotice] = useState<string | null>(null)

    // Engagement State
    const [isFocused, setIsFocused] = useState(true)
    const [isIdle, setIsIdle] = useState(false)

    const blockStartRef = useRef<number>(Date.now())
    const lastBlockIdRef = useRef<string | null>(null)
    const totalTimeRef = useRef<number>(0)
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hasRestoredRef = useRef(false)
    const timeByBlockRef = useRef<Record<string, number>>({})
    const quizScoresByIdRef = useRef<Record<string, number>>({})
    const quizResultsByIdRef = useRef<Record<string, PersistedQuizResult>>({})
    const mediaWatchProgressRef = useRef<Record<string, MediaWatchState>>({})
    const completionInFlightRef = useRef(false)

    const translateAI = useTranslationAI()

    const resetModuleInteractionState = useCallback(() => {
        setTimeSpentSeconds(0)
        setCompletedBlocks(new Set())
        setCompletedMediaBlocks(new Set())
        setQuizScore(null)
        setQuizScoresById({})
        setQuizResultsById({})
        setCompletionScore(null)
        setCompletionPassed(null)
        setIsFinished(false)
        setResumeNotice(null)
        setTranslationTarget(null)
        setShowBilingual(false)
        setBlockTranslations({})
        setModuleTitleTranslations({})
        quizScoresByIdRef.current = {}
        quizResultsByIdRef.current = {}
        mediaWatchProgressRef.current = {}
    }, [])

    useEffect(() => {
        quizScoresByIdRef.current = quizScoresById
    }, [quizScoresById])

    useEffect(() => {
        quizResultsByIdRef.current = quizResultsById
    }, [quizResultsById])

    const applyRestoredProgress = useCallback((
        progress: PersistedModuleProgress | null,
        blocks: TrainingContentBlock[]
    ) => {
        if (!progress) return

        if (isResetProgressSnapshot(progress)) {
            resetModuleInteractionState()
            setActiveBlockIndex(0)
            return
        }

        const maxIndex = Math.max(blocks.length - 1, 0)
        const nextIndex = typeof progress.last_block_index === 'number'
            ? Math.min(Math.max(progress.last_block_index, 0), maxIndex)
            : 0

        if (nextIndex > 0) {
            setActiveBlockIndex(nextIndex)
            setResumeNotice(t('resumeNotice', 'Resumed from where you left off.'))
        }

        if (progress.metadata?.completed_blocks && Array.isArray(progress.metadata.completed_blocks)) {
            setCompletedBlocks(new Set(progress.metadata.completed_blocks))
        } else if (nextIndex > 0) {
            const completedIds = blocks.slice(0, nextIndex).map(b => b.id)
            setCompletedBlocks(new Set(completedIds))
        } else {
            setCompletedBlocks(new Set())
        }

        if (progress.metadata?.completed_media_blocks && Array.isArray(progress.metadata.completed_media_blocks)) {
            setCompletedMediaBlocks(new Set(progress.metadata.completed_media_blocks))
        } else {
            setCompletedMediaBlocks(new Set())
        }

        if (typeof progress.time_spent_seconds === 'number') {
            totalTimeRef.current = progress.time_spent_seconds
            setTimeSpentSeconds(progress.time_spent_seconds)
        } else {
            totalTimeRef.current = 0
            setTimeSpentSeconds(0)
        }

        const restoredQuizScores = getValidQuizScoresMap(progress.metadata?.quiz_scores_by_id)
        let restoredAggregatedScore: number | null = null
        if (Object.keys(restoredQuizScores).length > 0) {
            setQuizScoresById(restoredQuizScores)
            quizScoresByIdRef.current = restoredQuizScores
            const aggregatedScore = getAggregatedQuizScore(getModuleQuizIds(blocks), restoredQuizScores)
            restoredAggregatedScore = aggregatedScore
            if (typeof aggregatedScore === 'number') {
                setQuizScore(aggregatedScore)
            }
        } else if (typeof progress.score_percentage === 'number') {
            setQuizScoresById({})
            quizScoresByIdRef.current = {}
            setQuizScore(progress.score_percentage)
        } else {
            setQuizScoresById({})
            quizScoresByIdRef.current = {}
            setQuizScore(null)
        }

        const restoredQuizResults = progress.metadata?.quiz_results_by_id
        if (restoredQuizResults && typeof restoredQuizResults === 'object' && !Array.isArray(restoredQuizResults)) {
            setQuizResultsById(restoredQuizResults as Record<string, PersistedQuizResult>)
            quizResultsByIdRef.current = restoredQuizResults as Record<string, PersistedQuizResult>
        } else {
            setQuizResultsById({})
            quizResultsByIdRef.current = {}
        }

        const wasCompleted = progress.status === 'completed' || Boolean(progress.completed_at)
        setIsFinished(wasCompleted)
        setCompletionPassed(wasCompleted && typeof progress.passed === 'boolean' ? progress.passed : null)
        setCompletionScore(
            wasCompleted
                ? (typeof progress.score_percentage === 'number' ? progress.score_percentage : restoredAggregatedScore)
                : null
        )
    }, [resetModuleInteractionState, t])

    // Close sidebar on mobile by default and when entering small breakpoints.
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

    // Fetch Module and Blocks
    const { data: moduleData, isLoading } = useQuery({
        queryKey: ['training-module-full', id],
        queryFn: async () => {
            if (!id || !isValidModuleId) throw new Error('Invalid module ID')

            let moduleQuery = supabase
                .from('training_modules')
                .select('*')
                .eq('id', id)

            if (!canViewUnpublishedModules) {
                moduleQuery = moduleQuery.eq('status', 'published')
            }

            const { data: module, error: moduleError } = await moduleQuery.maybeSingle()

            if (moduleError) throw moduleError
            if (!module) return null

            // training_content_blocks consolidated into documents (content_type='training_block').
            const { data: blocks, error: blocksError } = await supabase
                .from('documents')
                .select('id, title, block_type as type, content, block_order as "order", content_url, content_data, is_mandatory, is_deleted, linked_training_id as source_document_id, ai_generated, ai_source_content, duration_seconds, points')
                .eq('content_type', 'training_block')
                .eq('training_module_id', id)
                .eq('is_deleted', false)
                .order('block_order', { ascending: true })

            if (blocksError) throw blocksError

            const { data: linkedQuizzes } = await supabase
                .from('learning_quizzes')
                .select('id')
                .eq('training_module_id', id)
                .eq('status', 'published')
                .limit(1)

            // Fetch referenced content titles (SOPs, Quizzes) to show in sidebar
            const sopIds = blocks
                .filter(b => b.type === 'sop_reference')
                .map(b => {
                    const contentData = b.content_data as Record<string, unknown> | null
                    const inlineId = contentData?.sop_id as string | undefined
                    const legacyDocId = contentData?.document_id as string | undefined
                    return inlineId || (b as TrainingContentBlock).source_document_id || legacyDocId
                })
                .filter(Boolean) as string[]

            const quizIds = blocks
                .filter(b => b.type === 'quiz' && b.content_data?.quiz_id)
                .map(b => b.content_data!.quiz_id as string)

            const referencedTitles: Record<string, string> = {}

            if (sopIds.length > 0) {
                const { data: sops } = await supabase
                    .from('documents')
                    .select('id, title')
                    .in('id', sopIds)
                sops?.forEach(sop => { referencedTitles[sop.id] = sop.title })

                // sop_documents has been consolidated into documents (content_type='sop').
                // All SOP IDs that existed in sop_documents now live in documents.
                // The initial query above already covers the full documents table (all content types),
                // so any remaining missing IDs simply don't exist.
            }

            if (quizIds.length > 0) {
                const { data: quizzes } = await supabase
                    .from('learning_quizzes')
                    .select('id, title')
                    .in('id', quizIds)
                quizzes?.forEach(quiz => { referencedTitles[quiz.id] = quiz.title })
            }

            return {
                module,
                blocks: blocks as TrainingContentBlock[],
                linkedQuizId: linkedQuizzes?.[0]?.id,
                referencedTitles
            }
        },
        enabled: !!id && isValidModuleId,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        meta: { persist: false },
    })

    const activeBlock = moduleData?.blocks[activeBlockIndex]

    useEffect(() => {
        hasRestoredRef.current = false
        totalTimeRef.current = 0
        timeByBlockRef.current = {}
        blockStartRef.current = Date.now()
        lastBlockIdRef.current = null
        resetModuleInteractionState()
    }, [moduleData?.module.id, resetModuleInteractionState])

    const totalBlocks = moduleData?.blocks.length || 1
    const moduleQuizIds = useMemo(
        () => getModuleQuizIds(moduleData?.blocks || []),
        [moduleData?.blocks]
    )
    const hasQuizBlock = (moduleData?.blocks || []).some(block => block.type === 'quiz')
    const isLastBlock = activeBlockIndex === totalBlocks - 1
    const completedCount = new Set([...completedBlocks, ...completedMediaBlocks]).size
    const progressSteps = Math.max(completedCount, activeBlockIndex + 1)
    const progressPercentage = Math.min(100, Math.round((progressSteps / totalBlocks) * 100))
    const persistedProgressPercentage = isFinished ? 100 : Math.min(progressPercentage, 99)
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
        mediaWatchProgressRef.current[blockId] = {
            ...(mediaWatchProgressRef.current[blockId] || { lastTime: 0, watchedSeconds: 0 }),
            markedComplete: true
        }
        setCompletedMediaBlocks(prev => new Set(prev).add(blockId))
        setCompletedBlocks(prev => new Set(prev).add(blockId))
        void recordBlockCompletion(blockId)
        scheduleProgressSave(200)
    }

    const trackMediaProgress = (blockId: string, currentTime: number, duration: number) => {
        if (!duration || duration <= 0) return

        const state = mediaWatchProgressRef.current[blockId] || {
            lastTime: currentTime,
            watchedSeconds: 0,
            markedComplete: false
        }

        const delta = currentTime - state.lastTime
        if (delta >= 0 && delta <= 2.5) {
            state.watchedSeconds += delta
        }

        state.lastTime = currentTime
        mediaWatchProgressRef.current[blockId] = state

        if (!state.markedComplete && state.watchedSeconds >= duration * 0.9) {
            handleMarkWatched(blockId)
        }
    }

    const registerMediaSeek = (blockId: string, currentTime: number) => {
        const existing = mediaWatchProgressRef.current[blockId]
        mediaWatchProgressRef.current[blockId] = {
            lastTime: currentTime,
            watchedSeconds: existing?.watchedSeconds || 0,
            markedComplete: existing?.markedComplete || false
        }
    }

    const handleCompleteModule = async (overrides: ModuleCompletionOverrides = {}) => {
        if (!user || !moduleData || isFinished || completionInFlightRef.current) return

        completionInFlightRef.current = true

        try {
            const nowIso = new Date().toISOString()
            const timeSpent = totalTimeRef.current + Math.max(0, Math.floor((Date.now() - blockStartRef.current) / 1000))
            const resolvedCompletedBlocks = Array.from(overrides.completedBlocks ?? completedBlocks)
            const resolvedQuizScores = overrides.quizScoresById ?? quizScoresByIdRef.current
            const resolvedQuizResults = overrides.quizResultsById ?? quizResultsByIdRef.current
            const resolvedLastBlockId = overrides.lastBlockId ?? activeBlock?.id ?? null
            const resolvedLastBlockIndex = overrides.lastBlockIndex ?? activeBlockIndex

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
            } catch (_syncError) {
                // Certificate generation can continue without this linkage.
            }

            const passingScore = moduleData.module.passing_score_percentage || 80
            const latestQuizScores = resolvedQuizScores
            const aggregatedPartScore = getAggregatedQuizScore(moduleQuizIds, latestQuizScores)
            const effectiveScore = aggregatedPartScore ?? overrides.quizScore ?? quizScore ?? linkedTrainingQuizScore
            const completedQuizParts = moduleQuizIds.filter((quizId) => typeof latestQuizScores[quizId] === 'number').length

            if (moduleQuizIds.length > 1 && completedQuizParts < moduleQuizIds.length) {
                toast({
                    title: t('quizNotPassed'),
                    description: t('completeQuizBeforeFinish', 'Please complete the quiz before finishing this module.'),
                    variant: 'destructive'
                })
                return
            }

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
                completed_at: nowIso,
                last_accessed_at: nowIso,
                last_activity_at: nowIso,
                last_block_index: resolvedLastBlockIndex,
                last_block_id: resolvedLastBlockId,
                time_spent_seconds: timeSpent,
                metadata: {
                    completed_blocks: resolvedCompletedBlocks,
                    completed_media_blocks: Array.from(completedMediaBlocks),
                    quiz_scores_by_id: latestQuizScores,
                    quiz_results_by_id: resolvedQuizResults,
                    active_block_id: resolvedLastBlockId
                }
            })

            try {
                await skillsService.awardModuleSkills(user.id, moduleData.module.id)
            } catch (_skillError) {
                // Silently fail - skills are optional, don't block completion
                // Error is logged but doesn't prevent certificate generation
            }

            if (isPassed && user && moduleData.module) {
                const primaryProperty = properties?.[0]
                const primaryDepartment = departments?.[0]
                let certificateErrorMessage: string | null = null
                let pathErrorMessage: string | null = null

                if (moduleData.module.certificate_enabled) {
                    try {
                        const certificateData: CertificateData = {
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
                            trainingProgressId: linkedTrainingProgressId,
                            propertyId: primaryProperty?.id,
                            propertyName: primaryProperty?.name,
                            departmentId: primaryDepartment?.id,
                            departmentName: primaryDepartment?.name
                        }
                        await createCertificate(certificateData)
                    } catch (certError) {
                        certificateErrorMessage = getUserFriendlyError(certError).message
                    }
                }

                try {
                    let pathCertificates:
                        | Awaited<ReturnType<typeof awardCertificationPathCertificates>>
                        | null = null
                    let pathAttemptError: unknown = null

                    // Retries reduce transient completion/certificate race failures.
                    for (let attempt = 0; attempt < 3; attempt += 1) {
                        try {
                            pathCertificates = await awardCertificationPathCertificates({
                                userId: user.id,
                                completedModuleId: moduleData.module.id,
                                recipientName: profile?.full_name || user.email || 'Training Participant',
                                recipientEmail: user.email,
                                propertyId: primaryProperty?.id,
                                propertyName: primaryProperty?.name,
                                departmentId: primaryDepartment?.id,
                                departmentName: primaryDepartment?.name
                            })
                            pathAttemptError = null
                            break
                        } catch (attemptError) {
                            pathAttemptError = attemptError
                            if (attempt < 2) {
                                await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)))
                            }
                        }
                    }

                    if (pathAttemptError) {
                        throw pathAttemptError
                    }

                    if (pathCertificates?.awarded.length) {
                        toast({
                            title: t('certificateEarned', 'Certificate earned'),
                            description: t(
                                'pathCertificateAwarded',
                                `You earned ${pathCertificates.awarded.length} certification path certificate(s).`
                            )
                        })
                    }

                    if (pathCertificates?.errors.length) {
                        console.error('Certification path processing errors:', pathCertificates.errors)
                    }
                } catch (pathError) {
                    pathErrorMessage = getUserFriendlyError(pathError).message
                    console.error('Failed to process certification path completion:', pathError)
                }

                if (certificateErrorMessage) {
                    toast({
                        title: t('certificateGenerationFailed'),
                        description: certificateErrorMessage,
                        variant: 'destructive'
                    })
                }

                if (pathErrorMessage) {
                    toast({
                        title: t('pathCertificateProcessingFailed', 'Path certificate processing failed'),
                        description: pathErrorMessage,
                        variant: 'destructive'
                    })
                }
            }

            setCompletionScore(typeof effectiveScore === 'number' ? effectiveScore : null)
            setCompletionPassed(isPassed)
            setIsFinished(true)
        } catch (caughtError) {
            const errorDetails = getUserFriendlyError(caughtError)
            toast({
                title: t('error'),
                description: errorDetails.message,
                variant: 'destructive'
            })
        } finally {
            completionInFlightRef.current = false
        }
    }

    const formatDuration = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        if (mins <= 0) return `${secs}s`
        return `${mins}m ${secs.toString().padStart(2, '0')}s`
    }, [])

    const storageKey = user && moduleData
        ? `training-player-progress:${user.id}:${moduleData.module.id}`
        : null

    const getCurrentSessionSeconds = useCallback(() => {
        const inBlock = Math.max(0, Math.floor((Date.now() - blockStartRef.current) / 1000))
        return totalTimeRef.current + inBlock
    }, [])

    const persistProgress = useCallback(async (statusOverride?: 'assigned' | 'in_progress' | 'completed') => {
        if (!user || !moduleData) return

        const status = statusOverride || (isFinished ? 'completed' : 'in_progress')
        const nowIso = new Date().toISOString()
        const timeSpent = getCurrentSessionSeconds()
        const latestQuizScores = quizScoresByIdRef.current
        const metadata = {
            completed_blocks: Array.from(completedBlocks),
            completed_media_blocks: Array.from(completedMediaBlocks),
            quiz_scores_by_id: latestQuizScores,
            quiz_results_by_id: quizResultsByIdRef.current,
            active_block_id: activeBlock?.id || null
        }

        try {
            await learningService.submitQuizProgress({
                assignment_id: assignmentId || undefined,
                content_id: moduleData.module.id,
                content_type: 'module',
                user_id: user.id,
                status,
                progress_percentage: status === 'completed' ? 100 : persistedProgressPercentage,
                last_accessed_at: nowIso,
                last_activity_at: nowIso,
                last_block_index: activeBlockIndex,
                last_block_id: activeBlock?.id || null,
                time_spent_seconds: timeSpent,
                metadata
            })

            if (storageKey) {
                safeLocalStorage.removeItem(storageKey)
            }
        } catch (_error) {
            // Progress persistence failure is non-critical - continue silently.
            // Keep a local fallback to preserve learner context.
            if (storageKey) {
                safeLocalStorage.setObject(storageKey, {
                    assignment_id: assignmentId || null,
                    content_id: moduleData.module.id,
                    content_type: 'module',
                    user_id: user.id,
                    status,
                    progress_percentage: status === 'completed' ? 100 : persistedProgressPercentage,
                    last_accessed_at: nowIso,
                    last_activity_at: nowIso,
                    last_block_index: activeBlockIndex,
                    last_block_id: activeBlock?.id || null,
                    time_spent_seconds: timeSpent,
                    metadata,
                    saved_at: nowIso
                })
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
        persistedProgressPercentage,
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
        } catch (_error) {
            // Block completion recording is non-critical - continue silently
            // Main progress tracking will still work
        }
    }, [user, moduleData, activeBlock?.id])

    const canTranslateBlock = (block?: TrainingContentBlock) => {
        return !!block?.content && block.content.trim().length > 0
    }

    const translateCurrentContext = useCallback(async (targetLang: TranslationTargetLanguage) => {
        if (!moduleData) return
        const targetMeta = SUPPORTED_TRANSLATION_LANGUAGES.find(lang => lang.code === targetLang)

        const tasks: Promise<void>[] = []

        if (moduleData.module.title && !moduleTitleTranslations[targetLang]) {
            tasks.push(
                translateAI.mutateAsync({ 
                    text: moduleData.module.title, 
                    target_lang: targetLang, 
                    source_lang: 'auto',
                    preserve_format: false 
                })
                    .then(res => {
                        if (res.translated_text) {
                            setModuleTitleTranslations(prev => ({
                                ...prev,
                                [targetLang]: res.translated_text
                            }))
                        }
                    })
            )
        }

        const untranslatedBlocks = moduleData.blocks.filter(b => 
            canTranslateBlock(b) && !blockTranslations[b.id]?.[targetLang]
        )

        if (untranslatedBlocks.length > 0) {
            tasks.push(
                translateAI.mutateAsync({
                    texts: untranslatedBlocks.map(b => b.content || ''),
                    target_lang: targetLang,
                    source_lang: 'auto',
                    preserve_format: true
                })
                    .then(res => {
                        if (res.translated_texts) {
                            setBlockTranslations(prev => {
                                const next = { ...prev }
                                untranslatedBlocks.forEach((block, idx) => {
                                    const translated = res.translated_texts?.[idx]
                                    if (translated) {
                                        next[block.id] = {
                                            ...next[block.id],
                                            [targetLang]: translated
                                        }
                                    }
                                })
                                return next
                            })
                        }
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
    }, [blockTranslations, moduleData, moduleTitleTranslations, t, toast, translateAI])

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
    }, [translationTarget, activeBlock, blockTranslations, isTranslating, translateCurrentContext])

    useEffect(() => {
        if (!user || !moduleData || hasRestoredRef.current) return

        let isActive = true
        const restoreProgress = async () => {
            const localData = storageKey
                ? safeLocalStorage.getObject<PersistedModuleProgress>(storageKey)
                : null

            if (localData && isActive) {
                applyRestoredProgress(localData, moduleData.blocks)
            }

            const { data } = await supabase
                .from('training_progress')
                .select('id, status, progress_percentage, score_percentage, passed, completed_at, last_block_index, last_block_id, time_spent_seconds, metadata, updated_at')
                .eq('user_id', user.id)
                .eq('content_type', 'module')
                .eq('content_id', moduleData.module.id)
                .maybeSingle()

            if (!isActive) return

            if (data) {
                const localUpdated = localData?.saved_at ? new Date(localData.saved_at).getTime() : 0
                const dbUpdated = data.updated_at ? new Date(data.updated_at).getTime() : 0
                if (!localData || dbUpdated >= localUpdated) {
                    applyRestoredProgress(data, moduleData.blocks)
                }
            }
        }

        hasRestoredRef.current = true
        void restoreProgress()

        return () => {
            isActive = false
        }
    }, [user, moduleData, storageKey, applyRestoredProgress])

    useEffect(() => {
        if (!user || !moduleData) return

        const channel = supabase
            .channel(`training-player-progress:${user.id}:${moduleData.module.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'training_progress',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                const next = payload.new as PersistedModuleProgress & {
                    content_type?: string
                    content_id?: string
                }

                if (next?.content_type !== 'module' || next?.content_id !== moduleData.module.id) {
                    return
                }

                if (isResetProgressSnapshot(next) && storageKey) {
                    safeLocalStorage.removeItem(storageKey)
                }

                applyRestoredProgress(next, moduleData.blocks)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, moduleData, storageKey, applyRestoredProgress])

    const activeBlockId = activeBlock?.id

    useEffect(() => {
        if (!activeBlockId) return
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
        lastBlockIdRef.current = activeBlockId
        setTimeSpentSeconds(getCurrentSessionSeconds())

        if (user && moduleData) {
            const nowIso = new Date().toISOString()
            void supabase
                .from('training_block_progress')
                .upsert({
                    user_id: user.id,
                    training_module_id: moduleData.module.id,
                    block_id: activeBlockId,
                    last_viewed_at: nowIso
                }, { onConflict: 'user_id,block_id' })
        }

        scheduleProgressSave()
    }, [activeBlockId, user, moduleData, getCurrentSessionSeconds, scheduleProgressSave])

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
    const activeQuizId = activeBlock?.type === 'quiz'
        ? ((activeBlock.content_data?.quiz_id as string) || '')
        : ''
    const activeQuizResult = activeQuizId ? quizResultsById[activeQuizId] : null
    const activeQuizPassed = activeBlock?.type === 'quiz'
        ? Boolean(activeQuizResult?.passed)
        : true

    // Combined "Can Proceed" Logic
    const canProceedToNext = (!isGateCompletionRequired || isGateCompleted) && activeQuizPassed

    const renderBlockContent = (block: TrainingContentBlock) => {
        const variants = {
            initial: { opacity: 0, x: isRTL ? -20 : 20 },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: isRTL ? 20 : -20 }
        }
        const translatedBlockContent = getTranslatedBlockContent(block)

        return (
            <m.div
                key={block.id}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-6"
            >
                {block.type === 'text' && (
                    <RichTextBlockContent
                        originalHtml={block.content}
                        translatedHtml={translatedBlockContent}
                        translationTarget={translationTarget}
                        showBilingual={showBilingual}
                        translationDir={translationDir}
                        originalLabel={t('original', 'Original')}
                        translatedLabel={t('translatedTo', { language: translationTargetMeta?.label || t('translated', 'Translated') })}
                    />
                )}

                {block.type === 'video' && (
                    <div className="space-y-6">
                        <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 relative group">
                            {block.content_url ? (
                                (() => {
                                    // Check if this is a native video file.
                                    // Supabase Storage signed URLs have query params after the filename
                                    // (e.g. .../video.mp4?token=...), so we must check the pathname
                                    // rather than the full URL string.
                                    const isDirectVideo = (() => {
                                        try {
                                            const pathname = new URL(block.content_url!).pathname
                                            return /\.(mp4|webm|ogg|mov|m4v)$/i.test(pathname)
                                        } catch {
                                            // Fallback: match extension anywhere before a query string
                                            return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(block.content_url!)
                                        }
                                    })()
                                    if (isDirectVideo) {
                                        return (
                                            <VideoPlayer
                                                src={block.content_url!}
                                                blockId={block.id}
                                                onMarkWatched={handleMarkWatched}
                                                onTrackProgress={trackMediaProgress}
                                                onRegisterSeek={registerMediaSeek}
                                                t={t}
                                            />
                                        )
                                    }
                                    return (
                                        <iframe
                                            src={block.content_url!}
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                                            allowFullScreen
                                            sandbox="allow-scripts allow-same-origin allow-presentation"
                                            referrerPolicy="strict-origin-when-cross-origin"
                                            loading="lazy"
                                            title={t('training_video_content', { defaultValue: 'Training video content' })}
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
                            <div className="flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
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
                                        className="w-full sm:w-auto"
                                    >
                                        {t('markWatched', 'Mark as watched')}
                                    </Button>
                                )}
                            </div>
                        )}
                        {block.content && (
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <RichTextBlockContent
                                    originalHtml={block.content}
                                    translatedHtml={translatedBlockContent}
                                    translationTarget={translationTarget}
                                    showBilingual={showBilingual}
                                    translationDir={translationDir}
                                    originalLabel={t('original', 'Original')}
                                    translatedLabel={t('translatedTo', { language: translationTargetMeta?.label || t('translated', 'Translated') })}
                                />
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
                                        trackMediaProgress(block.id, target.currentTime, target.duration)
                                    }}
                                    onSeeking={(e) => registerMediaSeek(block.id, e.currentTarget.currentTime)}
                                />
                            ) : (
                                <div className="flex items-center gap-3 text-slate-500">
                                    <Headphones className="h-6 w-6" />
                                    <span>{t('audioUrlMissing', 'Audio URL missing')}</span>
                                </div>
                            )}
                        </div>
                        {block.is_mandatory && (
                            <div className="flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
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
                                        className="w-full sm:w-auto"
                                    >
                                        {t('markListened', 'Mark as listened')}
                                    </Button>
                                )}
                            </div>
                        )}
                        {block.content && (
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <RichTextBlockContent
                                    originalHtml={block.content}
                                    translatedHtml={translatedBlockContent}
                                    translationTarget={translationTarget}
                                    showBilingual={showBilingual}
                                    translationDir={translationDir}
                                    originalLabel={t('original', 'Original')}
                                    translatedLabel={t('translatedTo', { language: translationTargetMeta?.label || t('translated', 'Translated') })}
                                />
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
                                        sandbox="allow-same-origin allow-scripts"
                                        referrerPolicy="strict-origin-when-cross-origin"
                                        loading="lazy"
                                        title={t('interactive_training_content', { defaultValue: 'Interactive training content' })}
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
                            <div className="flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
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
                                        className="w-full sm:w-auto"
                                    >
                                        {t('markCompleted', 'Mark as completed')}
                                    </Button>
                                )}
                            </div>
                        )}
                        {block.content && (
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <RichTextBlockContent
                                    originalHtml={block.content}
                                    translatedHtml={translatedBlockContent}
                                    translationTarget={translationTarget}
                                    showBilingual={showBilingual}
                                    translationDir={translationDir}
                                    originalLabel={t('original', 'Original')}
                                    translatedLabel={t('translatedTo', { language: translationTargetMeta?.label || t('translated', 'Translated') })}
                                />
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
                                <RichTextBlockContent
                                    originalHtml={block.content}
                                    translatedHtml={translatedBlockContent}
                                    translationTarget={translationTarget}
                                    showBilingual={showBilingual}
                                    translationDir={translationDir}
                                    originalLabel={t('original', 'Original')}
                                    translatedLabel={t('translatedTo', { language: translationTargetMeta?.label || t('translated', 'Translated') })}
                                />
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
                                {moduleQuizIds.length > 1 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {`Quiz parts completed: ${moduleQuizIds.filter((quizId) => typeof quizScoresById[quizId] === 'number').length}/${moduleQuizIds.length}`}
                                    </p>
                                )}
                            </div>
                        </div>
                        <QuizComponentEnhanced
                            quizId={block.content_data?.quiz_id as string}
                            assignmentId={assignmentId}
                            certificateEnabled={false}
                            translationTarget={translationTarget}
                            showBilingual={showBilingual}
                            onComplete={(result) => {
                                const currentQuizId = (block.content_data?.quiz_id as string) || ''
                                const nextCompletedBlocks = new Set(completedBlocks)
                                nextCompletedBlocks.add(block.id)
                                let nextAggregatedScore = result.score
                                let nextQuizScores = quizScoresByIdRef.current
                                let nextQuizResults = quizResultsByIdRef.current

                                if (currentQuizId) {
                                    nextQuizScores = { ...quizScoresByIdRef.current, [currentQuizId]: result.score }
                                    quizScoresByIdRef.current = nextQuizScores
                                    const calculatedAggregated = getAggregatedQuizScore(moduleQuizIds, nextQuizScores)
                                    nextAggregatedScore = calculatedAggregated ?? result.score
                                    setQuizScoresById(nextQuizScores)
                                    setQuizScore(nextAggregatedScore)

                                    nextQuizResults = {
                                        ...quizResultsByIdRef.current,
                                        [currentQuizId]: {
                                            quizId: currentQuizId,
                                            quizTitle: block.title || t('knowledgeCheck', 'Knowledge Check'),
                                            score: result.score,
                                            passed: result.passed,
                                            correctCount: result.correctCount,
                                            totalQuestions: result.totalQuestions,
                                            completedAt: new Date().toISOString(),
                                            reviewItems: result.reviewItems
                                        }
                                    }
                                    quizResultsByIdRef.current = nextQuizResults
                                    setQuizResultsById(nextQuizResults)
                                } else {
                                    setQuizScore(result.score)
                                }
                                if (result.passed) {
                                    setCompletedBlocks(nextCompletedBlocks)
                                    void recordBlockCompletion(block.id)
                                    toast({
                                        title: t('moduleQuizPassed'),
                                        description: t('quizScoreProceed', { score: result.score })
                                    })
                                    if (isLastBlock) {
                                        void handleCompleteModule({
                                            completedBlocks: nextCompletedBlocks,
                                            quizScoresById: nextQuizScores,
                                            quizResultsById: nextQuizResults,
                                            quizScore: nextAggregatedScore,
                                            lastBlockId: block.id,
                                            lastBlockIndex: activeBlockIndex
                                        })
                                    }
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

                {block.type === 'sop_reference' && (() => {
                    const contentData = block.content_data as Record<string, unknown> | null
                    const resolvedSopId =
                        (contentData?.sop_id as string | undefined) ||
                        (block as TrainingContentBlock).source_document_id ||
                        (contentData?.document_id as string | undefined)

                    if (!resolvedSopId) return null

                    return (
                        <EmbeddedArticleViewer
                            sopId={resolvedSopId}
                            showBilingual={showBilingual}
                            translationDir={translationDir}
                            translationTarget={translationTarget}
                            className="mb-6"
                        />
                    )
                })()}

            </m.div>
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

    const passingScore = moduleData.module.passing_score_percentage || 80
    const finalScore = completionScore ?? quizScore
    const finalPassed = completionPassed ?? (!hasQuizBlock || (typeof finalScore === 'number' && finalScore >= passingScore))
    const canViewCertificate = finalPassed && moduleData.module.certificate_enabled
    const canRetakeFinalQuiz = !finalPassed && !!moduleData.linkedQuizId

    if (isFinished) {
        return (
            <LazyMotion features={domAnimation}>
                <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="min-h-screen bg-slate-50 flex items-center justify-center p-6"
                >
                    <Card className="max-w-xl w-full text-center p-6 sm:p-12 shadow-2xl border-0 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-hotel-gold"></div>
                        <m.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.2 }}
                            className="h-24 w-24 bg-hotel-gold/10 rounded-full flex items-center justify-center mx-auto mb-8"
                        >
                            <Trophy className="h-12 w-12 text-hotel-gold-dark" />
                        </m.div>

                    <h2 className="text-3xl font-bold text-hotel-navy mb-4 font-serif">
                        {t('congratulations')}
                    </h2>
                    <p className="text-slate-600 mb-8 text-lg">
                        {t('trainingCompletedMessage', { module: moduleData.module.title })}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{t('finalScore')}</p>
                            <p className="text-2xl font-bold text-hotel-navy">{finalScore !== null ? `${finalScore}%` : t('n_a')}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{t('status')}</p>
                            <p className={cn("text-2xl font-bold", finalPassed ? "text-emerald-600" : "text-rose-600")}>
                                {finalPassed ? t('passed') : t('quizNotPassed')}
                            </p>
                        </div>
                    </div>

                        <div className="space-y-4">
                            {canViewCertificate && (
                                <Button className="w-full bg-hotel-navy hover:bg-hotel-navy-light text-white h-12" onClick={() => navigate('/training/certificates')}>
                                    {t('viewCertificate', 'View Certificate')}
                                </Button>
                            )}
                            {canRetakeFinalQuiz && (
                                <Button className="w-full bg-hotel-navy hover:bg-hotel-navy-light text-white h-12" onClick={() => navigate(`/learning/quizzes/${moduleData.linkedQuizId}/take`)}>
                                    {t('retryFinalAssessment', { defaultValue: 'Retake Final Assessment' })}
                                </Button>
                            )}
                            <Button variant="outline" className="w-full h-12" onClick={() => navigate('/learning/my')}>
                                {t('backToMyLearning')}
                            </Button>
                        </div>
                    </Card>
                </m.div>
            </LazyMotion>
        )
    }

    return (
        <LazyMotion features={domAnimation}>
            <div className={cn(
                "flex h-[100dvh] min-h-[100dvh] bg-white overflow-hidden",
                isRTL ? "flex-row-reverse" : "flex-row"
            )}>
                {/* Sidebar */}
                <AnimatePresence mode="wait">
                {sidebarOpen && (
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                            "flex flex-col bg-hotel-navy-dark text-white shrink-0 relative z-[60] shadow-2xl transition-all duration-300",
                            "fixed inset-y-0 lg:static lg:h-full",
                            isRTL ? "right-0 border-l border-white/5" : "left-0 border-r border-white/5",
                            sidebarOpen ? "translate-x-0 w-[88vw] max-w-[320px]" : (isRTL ? "translate-x-full w-0" : "-translate-x-full w-0"),
                            "lg:translate-x-0 lg:w-[320px] lg:max-w-none"
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
                                    <m.div
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
                                            <m.div
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
                                                "font-medium leading-tight line-clamp-2",
                                                idx === activeBlockIndex ? "text-white" : ""
                                            )}>
                                                {block.title ||
                                                    (block.type === 'sop_reference'
                                                        ? moduleData.referencedTitles?.[
                                                            ((block.content_data as Record<string, unknown> | null)?.sop_id as string)
                                                            || (block as TrainingContentBlock).source_document_id
                                                            || ((block.content_data as Record<string, unknown> | null)?.document_id as string)
                                                          ] : '') ||
                                                    (block.type === 'quiz' && block.content_data?.quiz_id ? moduleData.referencedTitles?.[block.content_data.quiz_id as string] : '') ||
                                                    t('blockTitle', { number: idx + 1 })}
                                            </p>
                                            <p className="text-[10px] text-white/40 uppercase mt-1 tracking-wider">
                                                {(block.title ||
                                                    (block.type === 'sop_reference'
                                                        ? moduleData.referencedTitles?.[
                                                            ((block.content_data as Record<string, unknown> | null)?.sop_id as string)
                                                            || (block as TrainingContentBlock).source_document_id
                                                            || ((block.content_data as Record<string, unknown> | null)?.document_id as string)
                                                          ] : '') ||
                                                    (block.type === 'quiz' && block.content_data?.quiz_id ? moduleData.referencedTitles?.[block.content_data.quiz_id as string] : ''))
                                                    ? `${t('blockTitle', { number: idx + 1 })} • ${block.type.replace('_', ' ')}`
                                                    : block.type.replace('_', ' ')
                                                }
                                            </p>
                                        </div>
                                        {(completedBlocks.has(block.id) || completedMediaBlocks.has(block.id)) && (
                                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </m.div>
                )}
                </AnimatePresence>

            {/* Mobile Sidebar Overlay */}
                <AnimatePresence>
                {sidebarOpen && (
                    <m.div
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
                            aria-label={t('accessibility.toggleSidebar', 'Toggle sidebar')}
                        >
                            <Menu className="h-5 w-5 text-hotel-navy" />
                        </Button>
                        <div className="hidden sm:block">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-hotel-gold font-bold block mb-0.5">
                                {t('learningInProgressBar')}
                            </span>
                            <h1 className="text-sm font-bold text-hotel-navy line-clamp-1">{moduleData.module.title}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="hidden sm:flex bg-slate-100 px-4 py-2 rounded-full items-center gap-2 mr-2">
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
                            aria-label={t('accessibility.exitTraining', 'Exit training')}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </header>

                {/* Content Area */}
                <SmartObserver
                    className="flex-1 overflow-y-auto custom-scrollbar-light bg-white pt-4 pb-12 relative"
                    onFocusChange={setIsFocused}
                    onIdleChange={setIsIdle}
                    idleTimeoutMs={60000}
                >
                    {/* Anti-Cheat Status Toast/Indicator (Dev/User Feedback) */}
                    {(!isFocused || isIdle) && (
                        <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 z-50 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-sm animate-pulse">
                            {isIdle ? <MousePointer2 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {isIdle ? t('sessionPausedIdle', 'Session Paused (Idle)') : t('sessionPausedFocus', 'Session Paused (Focus lost)')}
                        </div>
                    )}
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
                            <m.div
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
                            </m.div>
                        </AnimatePresence>

                        <div className="h-12 shrink-0" /> {/* Spacer */}
                    </div>
                </SmartObserver>

                {/* Navigation Bar */}
                <footer className={cn(
                    "min-h-[5rem] md:min-h-[6rem] bg-white border-t border-slate-100 flex items-center justify-between gap-2 px-3 sm:px-4 md:px-12 py-2 md:py-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-0 shrink-0 z-20 sticky bottom-0",
                    isRTL ? "flex-row-reverse" : "flex-row"
                )}>
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={handlePrevious}
                        disabled={activeBlockIndex === 0}
                        className={cn(
                            "h-10 md:h-12 px-3 sm:px-4 md:px-6 text-sm md:text-base font-bold tracking-wide border-2 hover:bg-slate-50 transition-all rounded-xl",
                            isRTL ? "flex-row-reverse" : ""
                        )}
                    >
                        <ChevronLeft className={cn(
                            "h-4 w-4 md:h-5 md:w-5",
                            isRTL ? "ml-2 md:ml-3 rotate-180" : "mr-2 md:mr-3"
                        )} />
                        <span className="hidden md:inline">{t('previous')}</span>
                        <ChevronLeft className="h-4 w-4 md:hidden" />
                    </Button>

                    <div className="hidden md:flex flex-col items-center">
                        <div className="flex gap-2 mb-2">
                            {moduleData.blocks.map((block, i) => (
                                <div
                                    key={block.id}
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
                            "h-10 md:h-12 min-w-[7.5rem] sm:min-w-[10rem] justify-center px-3 sm:px-4 md:px-8 text-sm md:text-base font-bold tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl",
                            isLastBlock
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-hotel-navy hover:bg-hotel-navy-light text-white",
                            isRTL ? "flex-row-reverse" : "",
                        )}
                    >
                        {/* Intelligent Button Content */}
                        {(() => {
                            if (isLastBlock) {
                                return (
                                    <>
                                        <CheckCircle className={cn("h-4 w-4 md:h-5 md:w-5", isRTL ? "ml-2 md:ml-3" : "mr-2 md:mr-3")} />
                                        <span className="hidden sm:inline">
                                            {activeBlock?.type === 'quiz' && !activeQuizPassed
                                                ? t('completeQuizBeforeFinish', 'Please complete the quiz before finishing this module.')
                                                : t('completeModule')}
                                        </span>
                                        <span className="sm:hidden">
                                            {activeBlock?.type === 'quiz' && !activeQuizPassed
                                                ? t('completeQuiz', 'Complete quiz')
                                                : t('complete', 'Complete')}
                                        </span>
                                    </>
                                )
                            }

                            return (
                                <>
                                    <span className="hidden md:inline">
                                        {activeBlock?.type === 'quiz' && !activeQuizPassed
                                            ? t('completeQuiz', 'Complete quiz')
                                            : t('nextStep')}
                                    </span>
                                    <ChevronRight className={cn(
                                        "h-4 w-4 md:h-5 md:w-5",
                                        isRTL ? "mr-2 md:mr-3 rotate-180" : "ml-2 md:ml-3"
                                    )} />
                                    <ChevronRight className="h-4 w-4 md:hidden" />
                                </>
                            )
                        })()}
                    </Button>
                </footer>
                </div>
            </div>
        </LazyMotion>
    )
}

