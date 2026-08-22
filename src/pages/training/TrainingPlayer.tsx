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
import { useCheckAchievement, type AchievementType } from '@/hooks/useAchievements'
import type { TranslationTargetLanguage } from '@/hooks/useTranslationAI'
import { SUPPORTED_TRANSLATION_LANGUAGES, useTranslationAI } from '@/hooks/useTranslationAI'
import { createCertificate, type CertificateData } from '@/services/certificateService'
import { awardCertificationPathCertificates } from '@/services/certificationPathService'
import { getUserFriendlyError } from '@/lib/errorMessages'
import { sanitizeHtml } from '@/lib/sanitize'
import { resolveStorageUrl, resolveHtmlStorageUrls } from '@/lib/secureFileAccess'
import { safeLocalStorage } from '@/lib/storage'
import { evaluateTrainingCompletion, getQuizProgressKey } from '@/lib/trainingCompletion'
import {
    evaluateModuleProgression,
    getNextRequiredLearningItem,
    validateNavigationTarget,
    type LearnerProgressState,
    type LearningItemState,
    type ModuleProgressionResult
} from '@/lib/trainingProgressionEngine'
import type { TrainingContentBlock } from '@/lib/types'
import { cn } from '@/lib/utils'
import { QuizComponentEnhanced } from '@/pages/learning/components/QuizComponentEnhanced'
import { learningService } from '@/services/learningService'
import { skillsService } from '@/services/skillsService'
import {
    AlertCircle,
    Award,
    ArrowLeft,
    BookOpen,
    Bot,
    CheckCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Circle,
    Eye,
    FileText,
    Gamepad2,
    Headphones,
    HelpCircle,
    Image as ImageIcon,
    Languages,
    Link as LinkIcon,
    Loader2,
    Lock,
    Maximize2,
    Minimize2,
    Menu,
    MousePointer2,
    RotateCcw,
    Sparkles,
    Trophy,
    Type,
    Video as VideoIcon,
    Volume2,
    X,
    XCircle
} from 'lucide-react'
import { PlayerAudioNarrator } from '@/components/training/player/PlayerAudioNarrator'
import { PlayerTutorDrawer } from '@/components/training/player/PlayerTutorDrawer'
import { PlayerNotesDrawer } from '@/components/training/player/PlayerNotesDrawer'
import { PlayerCelebrationModal } from '@/components/training/player/PlayerCelebrationModal'
import { FlashcardDeckWidget } from '@/components/training/player/widgets/FlashcardDeckWidget'
import { ScenarioBranchSimulator } from '@/components/training/player/widgets/ScenarioBranchSimulator'
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

// Only these two achievement types have real, implemented qualification logic server-side
// (check_and_award_achievement) that a training completion can actually satisfy.
const TRAINING_ACHIEVEMENT_LABELS: Record<string, { title: string; description: string; icon: typeof Award }> = {
    training_master: { title: 'Training Master', description: 'Completed 10 training modules', icon: Award },
    perfect_completion: { title: 'Perfect Score', description: 'Scored 100% on a training module', icon: Sparkles },
}

const isValidUuid = (value?: string | null) =>
    !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

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

const getAggregatedQuizScore = (quizBlockIds: string[], quizScoresByBlockId: Record<string, number>) => {
    if (quizBlockIds.length === 0) return null
    const scores = quizBlockIds
        .map((blockId) => quizScoresByBlockId[blockId])
        .filter((score): score is number => typeof score === 'number')

    if (scores.length !== quizBlockIds.length) return null
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

const restoreQuizProgressByBlock = <T,>(
    blocks: TrainingContentBlock[],
    value: Record<string, T>
) => blocks.reduce<Record<string, T>>((restored, block) => {
    if (block.type !== 'quiz') return restored
    const quizId = (block.content_data as Record<string, unknown> | null)?.quiz_id
    const currentValue = value[block.id]
    // Older progress snapshots used quiz IDs as keys. Keep them readable while
    // persisting all new results by block ID, which supports repeated placements.
    const legacyValue = typeof quizId === 'string' ? value[quizId] : undefined
    const result = currentValue ?? legacyValue
    if (result !== undefined) restored[block.id] = result
    return restored
}, {})

function useResolvedHtmlContent(rawContent: string | null | undefined): string {
    const [resolved, setResolved] = useState<string>(() => {
        if (!rawContent) return ''
        const isHtml = /<\/?[a-z][\s\S]*>/i.test(rawContent)
        const initial = isHtml ? rawContent : (marked.parse(rawContent, { async: false }) as string)
        return sanitizeHtml(initial)
    })

    useEffect(() => {
        let cancelled = false
        if (!rawContent) {
            setResolved('')
            return
        }

        const isHtml = /<\/?[a-z][\s\S]*>/i.test(rawContent)
        const htmlToProcess = isHtml
            ? rawContent
            : (marked.parse(rawContent, { async: false }) as string)

        resolveHtmlStorageUrls(htmlToProcess, 3600).then((processed) => {
            if (!cancelled) {
                setResolved(sanitizeHtml(processed))
            }
        })

        return () => { cancelled = true }
    }, [rawContent])

    return resolved
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
    const originalMarkup = useResolvedHtmlContent(originalHtml)
    const translatedMarkup = useResolvedHtmlContent(translatedHtml)

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

function getBlockMediaUrl(block: TrainingContentBlock | undefined | null): string | null {
    if (!block) return null
    if (block.content_url && typeof block.content_url === 'string' && block.content_url.trim().length > 0) {
        return block.content_url.trim()
    }
    const data = block.content_data as Record<string, unknown> | null
    if (!data) return null
    const candidate = data.url || data.content_url || data.video_url || data.image_url || data.audio_url || data.file_url || data.public_url || data.src
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim()
    }
    return null
}

/**
 * Convert a YouTube or Vimeo URL to a proper embeddable iframe URL.
 * Regular youtube.com/watch URLs refuse iframe embedding – we need
 * youtube-nocookie.com/embed/ instead.
 */
function toEmbedUrl(url: string): string {
    try {
        const parsed = new URL(url)
        const h = parsed.hostname

        // YouTube
        if (['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(h)) {
            let videoId: string | null = null

            if (h === 'youtu.be' || h === 'www.youtu.be') {
                videoId = parsed.pathname.replace('/', '').trim() || null
            } else if (parsed.pathname.startsWith('/watch')) {
                videoId = parsed.searchParams.get('v')
            } else if (parsed.pathname.startsWith('/shorts/')) {
                videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0] || null
            } else if (parsed.pathname.startsWith('/embed/')) {
                // Already an embed URL — normalise to nocookie domain
                videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0] || null
            } else if (parsed.pathname.startsWith('/live/')) {
                videoId = parsed.pathname.split('/live/')[1]?.split('/')[0] || null
            }

            // Fallback regex
            if (!videoId) {
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/
                const match = url.match(regExp)
                videoId = match?.[2] || null
            }

            if (!videoId || videoId.length < 8) return url

            const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' })
            return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`
        }

        // Vimeo
        if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(h)) {
            const match = parsed.pathname.match(/(\/video\/)?(\d+)/)
            const id = match?.[2]
            if (id) return `https://player.vimeo.com/video/${id}`
        }
    } catch {
        // URL parsing failed — return as-is
    }
    return url
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
    const { resolvedSrc, resolving } = useResolvedStorageUrl(src)
    const [videoError, setVideoError] = useState<string | null>(null)
    const [videoLoading, setVideoLoading] = useState(true)
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        setVideoError(null)
        setVideoLoading(true)
    }, [resolvedSrc])

    if (resolving) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 z-10 bg-slate-900">
                <Loader2 className="animate-spin h-10 w-10 text-white mb-3" />
                <span className="text-sm">{t('loadingVideo', 'Loading video...')}</span>
            </div>
        )
    }

    if (!resolvedSrc || videoError) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 z-10 p-6 text-center bg-slate-900">
                <VideoIcon className="h-12 w-12 mb-3 opacity-50" />
                <span className="text-sm mb-2">{videoError || t('videoLoadError', 'Unable to load video. The file may be missing or unsupported.')}</span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setVideoError(null)
                        setVideoLoading(true)
                        videoRef.current?.load()
                    }}
                    className="mt-2 border-white/30 text-white hover:bg-white/10"
                >
                    {t('retry', 'Retry')}
                </Button>
            </div>
        )
    }

    return (
        <>
            {videoLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 z-10 pointer-events-none bg-black/40">
                    <Loader2 className="animate-spin h-10 w-10 text-white mb-3" />
                    <span className="text-sm">{t('loadingVideo', 'Loading video...')}</span>
                </div>
            )}
            <video
                ref={videoRef}
                src={resolvedSrc}
                className={cn("w-full h-full", videoLoading && "opacity-0")}
                controls
                controlsList="nodownload"
                onLoadedData={() => setVideoLoading(false)}
                onError={() => {
                    setVideoLoading(false)
                    setVideoError(t('videoLoadError', 'Unable to load video. The file may be missing or unsupported.'))
                }}
                onEnded={() => onMarkWatched(blockId)}
                onTimeUpdate={(e) => onTrackProgress(blockId, e.currentTarget.currentTime, e.currentTarget.duration)}
                onSeeking={(e) => onRegisterSeek(blockId, e.currentTarget.currentTime)}
            />
        </>
    )
}


// Images/audio uploaded through the Training Builder are stored in the private 'documents'
// bucket with a URL that never resolves on its own (see resolveStorageUrl) - unlike video,
// neither element has a natural error-triggered recovery path, so resolve proactively.
function useResolvedStorageUrl(src: string | undefined) {
    const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)
    const [resolving, setResolving] = useState(!!src)

    useEffect(() => {
        let cancelled = false
        setResolving(!!src)
        if (!src) {
            setResolvedSrc(null)
            return
        }
        // Builder uploads are stored as a bare path in the private 'documents'
        // bucket; external URLs (YouTube etc.) pass through untouched.
        resolveStorageUrl(src, 300, 'documents').then((url) => {
            if (!cancelled) {
                setResolvedSrc(url)
                setResolving(false)
            }
        })
        return () => { cancelled = true }
    }, [src])

    return { resolvedSrc, resolving }
}

type ImageBlockProps = {
    src: string
    alt: string
    t: TFunction<'training', undefined>
}

function ImageBlock({ src, alt, t }: ImageBlockProps) {
    const { resolvedSrc, resolving } = useResolvedStorageUrl(src)
    const [imageError, setImageError] = useState(false)

    if (resolving) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            </div>
        )
    }

    if (imageError || !resolvedSrc) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
                <ImageIcon className="h-10 w-10" />
                <span className="text-sm">{t('imageLoadError', 'Unable to load this image.')}</span>
            </div>
        )
    }

    return (
        <div className="relative group">
            <img
                src={resolvedSrc}
                alt={alt}
                onError={() => setImageError(true)}
                className="rounded-2xl shadow-xl max-h-[600px] w-auto mx-auto border border-slate-200 transition-transform duration-500 group-hover:scale-[1.01]"
            />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10 pointer-events-none" />
        </div>
    )
}

type AudioPlayerProps = {
    src: string
    blockId: string
    onTrackProgress: (blockId: string, currentTime: number, duration: number) => void
    onRegisterSeek: (blockId: string, currentTime: number) => void
    t: TFunction<'training', undefined>
}

function AudioPlayer({ src, blockId, onTrackProgress, onRegisterSeek, t }: AudioPlayerProps) {
    const { resolvedSrc, resolving } = useResolvedStorageUrl(src)
    const [audioError, setAudioError] = useState(false)

    if (resolving) {
        return (
            <div className="flex items-center gap-3 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t('loadingAudio', 'Loading audio...')}</span>
            </div>
        )
    }

    if (audioError || !resolvedSrc) {
        return (
            <div className="flex items-center gap-3 text-slate-500">
                <Headphones className="h-6 w-6" />
                <span>{t('audioLoadError', 'Unable to load this audio file.')}</span>
            </div>
        )
    }

    return (
        <audio
            className="w-full"
            controls
            src={resolvedSrc}
            onError={() => setAudioError(true)}
            onTimeUpdate={(e) => {
                const target = e.currentTarget
                onTrackProgress(blockId, target.currentTime, target.duration)
            }}
            onSeeking={(e) => onRegisterSeek(blockId, e.currentTarget.currentTime)}
        />
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
    const [newlyEarnedAchievements, setNewlyEarnedAchievements] = useState<string[]>([])
    const checkAchievement = useCheckAchievement()

    // Luxury Player Upgrades State
    const [isZenMode, setIsZenMode] = useState(false)
    const [showAudioNarrator, setShowAudioNarrator] = useState(false)
    const [showTutorDrawer, setShowTutorDrawer] = useState(false)
    const [showNotesDrawer, setShowNotesDrawer] = useState(false)
    const [fontSizeModifier, setFontSizeModifier] = useState<'sm' | 'base' | 'lg'>('base')
    const [showCelebrationModal, setShowCelebrationModal] = useState(false)

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
        setNewlyEarnedAchievements([])
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

        const restoredCompleted = new Set<string>(
            Array.isArray(progress.metadata?.completed_blocks) ? progress.metadata.completed_blocks : []
        )
        const restoredMediaCompleted = new Set<string>(
            Array.isArray(progress.metadata?.completed_media_blocks) ? progress.metadata.completed_media_blocks : []
        )

        const restoredQuizScores = restoreQuizProgressByBlock(
            blocks,
            getValidQuizScoresMap(progress.metadata?.quiz_scores_by_id)
        )
        let restoredAggregatedScore: number | null = null
        if (Object.keys(restoredQuizScores).length > 0) {
            setQuizScoresById(restoredQuizScores)
            quizScoresByIdRef.current = restoredQuizScores
            const aggregatedScore = getAggregatedQuizScore(
                blocks.filter(block => block.type === 'quiz').map(getQuizProgressKey),
                restoredQuizScores
            )
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
        let normalizedResults: Record<string, PersistedQuizResult> = {}
        if (restoredQuizResults && typeof restoredQuizResults === 'object' && !Array.isArray(restoredQuizResults)) {
            normalizedResults = restoreQuizProgressByBlock(
                blocks,
                restoredQuizResults as Record<string, PersistedQuizResult>
            )
            setQuizResultsById(normalizedResults)
            quizResultsByIdRef.current = normalizedResults
        } else {
            setQuizResultsById({})
            quizResultsByIdRef.current = {}
        }

        setCompletedBlocks(restoredCompleted)
        setCompletedMediaBlocks(restoredMediaCompleted)

        if (typeof progress.time_spent_seconds === 'number') {
            totalTimeRef.current = progress.time_spent_seconds
            setTimeSpentSeconds(progress.time_spent_seconds)
        } else {
            totalTimeRef.current = 0
            setTimeSpentSeconds(0)
        }

        const wasCompleted = progress.status === 'completed' || Boolean(progress.completed_at)
        setIsFinished(wasCompleted)
        setCompletionPassed(wasCompleted && typeof progress.passed === 'boolean' ? progress.passed : null)
        setCompletionScore(
            wasCompleted
                ? (typeof progress.score_percentage === 'number' ? progress.score_percentage : restoredAggregatedScore)
                : null
        )

        // Evaluate smart resume position using progression engine
        if (!wasCompleted) {
            const restoredLearnerState: LearnerProgressState = {
                completedBlockIds: restoredCompleted,
                completedMediaBlockIds: restoredMediaCompleted,
                quizResultsByBlockId: normalizedResults
            }
            const smartNext = getNextRequiredLearningItem(moduleData?.module, blocks, restoredLearnerState)
            const targetIndex = smartNext.index >= 0 ? smartNext.index : 0
            setActiveBlockIndex(targetIndex)
            if (targetIndex > 0) {
                const targetTitle = smartNext.item?.title || t('blockTitle', { number: targetIndex + 1 })
                setResumeNotice(t('resumeNoticeSpecific', {
                    item: targetTitle,
                    defaultValue: `Resumed from: ${targetTitle}`
                }))
            }
        }
    }, [resetModuleInteractionState, t, moduleData?.module])

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
                .select('id, training_module_id, created_at, title, block_type, content, block_order, content_url, content_data, is_mandatory, is_deleted, linked_training_id, ai_generated, ai_source_content, duration_seconds, points')
                .eq('content_type', 'training_block')
                .eq('training_module_id', id)
                .eq('is_deleted', false)
                .order('block_order', { ascending: true })

            if (blocksError) throw blocksError

            // Map raw DB column names to TrainingContentBlock shape
            const mappedBlocks = (blocks || []).map(b => {
                const contentData = b.content_data as Record<string, unknown> | null
                const resolvedSourceDocId =
                    (contentData?.sop_id as string | undefined) ||
                    (contentData?.source_document_id as string | undefined) ||
                    (contentData?.document_id as string | undefined) ||
                    b.linked_training_id ||
                    null

                return {
                    ...b,
                    type: b.block_type,
                    order: b.block_order,
                    source_document_id: resolvedSourceDocId,
                }
            }) as TrainingContentBlock[]

            // Fetch referenced content titles (SOPs, Quizzes) to show in sidebar
            const sopIds = mappedBlocks
                .filter(b => b.type === 'sop_reference')
                .map(b => {
                    const contentData = b.content_data as Record<string, unknown> | null
                    const inlineId = contentData?.sop_id as string | undefined
                    const legacyDocId = contentData?.document_id as string | undefined
                    return inlineId || b.source_document_id || legacyDocId
                })
                .filter(Boolean) as string[]

            const quizIds = mappedBlocks
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
                blocks: mappedBlocks,
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
    const quizBlockIds = useMemo(
        () => (moduleData?.blocks || [])
            .filter(block => block.type === 'quiz')
            .map(getQuizProgressKey),
        [moduleData?.blocks]
    )

    const learnerState: LearnerProgressState = useMemo(() => ({
        completedBlockIds: completedBlocks,
        completedMediaBlockIds: completedMediaBlocks,
        quizResultsByBlockId: quizResultsById,
        quizAttemptsByBlockId: {},
        activeBlockId: activeBlock?.id || null,
    }), [completedBlocks, completedMediaBlocks, quizResultsById, activeBlock?.id])

    const progression = useMemo(() => evaluateModuleProgression({
        module: moduleData?.module,
        blocks: moduleData?.blocks || [],
        learnerState,
        mode: (moduleData?.module?.template_id === 'flexible' || (moduleData?.module as any)?.progression_mode === 'flexible') ? 'flexible' : 'sequential'
    }), [moduleData?.module, moduleData?.blocks, learnerState])

    const trainingCompletion = useMemo(() => evaluateTrainingCompletion({
        blocks: moduleData?.blocks || [],
        completedBlockIds: completedBlocks,
        completedMediaBlockIds: completedMediaBlocks,
        quizResultsByBlockId: quizResultsById,
    }), [moduleData?.blocks, completedBlocks, completedMediaBlocks, quizResultsById])

    const isLastBlock = activeBlockIndex === totalBlocks - 1
    const activeBlockState = activeBlock ? progression.blockStates[activeBlock.id] || 'AVAILABLE' : 'AVAILABLE'
    const activeQuizResult = activeBlock && activeBlock.type === 'quiz' ? quizResultsById[getQuizProgressKey(activeBlock)] : undefined
    const activeQuizPassed = Boolean(activeQuizResult?.passed)

    const canProceedToNext = useMemo(() => {
        if (!activeBlock) return true
        if (activeBlock.type === 'quiz') {
            if (activeBlock.is_mandatory === false) return true
            return activeQuizPassed
        }
        if (activeBlock.type === 'video' || activeBlock.type === 'audio' || activeBlock.type === 'interactive') {
            if (activeBlock.is_mandatory && !completedMediaBlocks.has(activeBlock.id) && !completedBlocks.has(activeBlock.id)) {
                return false
            }
        }
        return true
    }, [activeBlock, activeQuizPassed, completedMediaBlocks, completedBlocks])

    const progressPercentage = progression.realProgressPercentage
    const persistedProgressPercentage = isFinished ? 100 : Math.min(progressPercentage, 99)
    const translationTargetMeta = translationTarget
        ? SUPPORTED_TRANSLATION_LANGUAGES.find(lang => lang.code === translationTarget)
        : null
    const translationDir = translationTargetMeta?.direction || 'ltr'
    const displayModuleTitle = translationTarget && moduleTitleTranslations[translationTarget]
        ? moduleTitleTranslations[translationTarget] as string
        : moduleData?.module.title

    const handleSelectBlock = useCallback((targetIndex: number) => {
        if (!moduleData?.blocks) return
        const validation = validateNavigationTarget({
            targetIndex,
            blocks: moduleData.blocks,
            progression
        })

        if (validation.allowed) {
            setActiveBlockIndex(targetIndex)
            window.scrollTo(0, 0)
            scheduleProgressSave(300)
        } else {
            toast({
                title: t('lessonLocked', 'Lesson Locked'),
                description: validation.reason || t('completePrereqFirst', 'Please complete the previous required lesson or quiz first.'),
                variant: 'destructive'
            })
            if (validation.safeIndex !== activeBlockIndex && validation.safeIndex >= 0) {
                setActiveBlockIndex(validation.safeIndex)
            }
        }
    }, [moduleData?.blocks, progression, activeBlockIndex, t, toast])

    const handleNext = () => {
        if (!moduleData) return

        if (activeBlock && activeBlock.type !== 'quiz') {
            setCompletedBlocks(prev => new Set(prev).add(activeBlock.id))
            void recordBlockCompletion(activeBlock.id)
        }

        const nextCompleted = activeBlock && activeBlock.type !== 'quiz'
            ? new Set([...completedBlocks, activeBlock.id])
            : completedBlocks

        const evalProgression = evaluateModuleProgression({
            module: moduleData.module,
            blocks: moduleData.blocks,
            learnerState: {
                ...learnerState,
                completedBlockIds: nextCompleted
            }
        })

        if (evalProgression.isModuleComplete) {
            handleCompleteModule({
                completedBlocks: nextCompleted
            })
        } else if (evalProgression.nextRequiredIndex >= 0) {
            setActiveBlockIndex(evalProgression.nextRequiredIndex)
            window.scrollTo(0, 0)
            scheduleProgressSave(300)
        } else if (activeBlockIndex < totalBlocks - 1) {
            handleSelectBlock(activeBlockIndex + 1)
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

        // Cancel any pending background save so it cannot race with the
        // completion RPC and overwrite progress_percentage back to 99%.
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
            saveTimeoutRef.current = null
        }

        try {
            const nowIso = new Date().toISOString()
            const timeSpent = totalTimeRef.current + Math.max(0, Math.floor((Date.now() - blockStartRef.current) / 1000))
            let resolvedCompletedBlocks = Array.from(overrides.completedBlocks ?? completedBlocks)
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

            const latestQuizScores = resolvedQuizScores
            const completionState = evaluateTrainingCompletion({
                blocks: moduleData.blocks,
                completedBlockIds: resolvedCompletedBlocks,
                completedMediaBlockIds: completedMediaBlocks,
                quizResultsByBlockId: resolvedQuizResults,
            })
            const aggregatedPartScore = getAggregatedQuizScore(quizBlockIds, latestQuizScores)
            const effectiveScore = aggregatedPartScore ?? overrides.quizScore ?? quizScore ?? linkedTrainingQuizScore
            if (!completionState.complete) {
                const quizBlockers = completionState.blockers.filter(b => b.reason.startsWith('quiz'))
                if (quizBlockers.length === 0) {
                    // All mandatory quizzes are completed/passed. Auto-include remaining content blocks.
                    const allBlockIds = moduleData.blocks.map(b => b.id)
                    resolvedCompletedBlocks = Array.from(new Set([...resolvedCompletedBlocks, ...allBlockIds]))
                    setCompletedBlocks(new Set(resolvedCompletedBlocks))
                } else {
                    const firstBlocker = quizBlockers[0] || completionState.blockers[0]
                    const blockerDescription = firstBlocker?.reason === 'quiz-not-passed'
                        ? t('requiredQuizPassNeeded', { defaultValue: `Pass "${firstBlocker.label}" before finishing.` })
                        : firstBlocker?.reason === 'quiz-not-submitted'
                            ? t('requiredQuizStillNeeded', { defaultValue: `Complete "${firstBlocker.label}" before finishing.` })
                            : t('requiredContentStillNeeded', { defaultValue: `Complete "${firstBlocker?.label || 'required content'}" before finishing.` })
                    toast({
                        title: t('requirementsRemaining', 'Requirements remaining'),
                        description: blockerDescription,
                        variant: 'destructive'
                    })
                    return
                }
            }

            // complete_training_module raises if any mandatory requirement
            // isn't server-verified yet, so a successful await here already
            // means the module is genuinely complete - but the score/passed
            // values used below come from what the RPC actually persisted,
            // not from client-side aggregation, so they can never drift from
            // the row a certificate or completion screen would later re-read.
            const rpcResult = await learningService.completeTrainingModuleRPC(moduleData.module.id, {
                assignmentId: assignmentId || undefined,
                completedBlockIds: resolvedCompletedBlocks,
                lastBlockId: resolvedLastBlockId,
                lastBlockIndex: resolvedLastBlockIndex,
                timeSpentSeconds: timeSpent,
            })

            const isPassed = rpcResult.passed
            const finalScore = rpcResult.score_percentage ?? effectiveScore

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
                            score: finalScore,
                            passingScore: moduleData.module.passing_score_percentage ?? undefined,
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

            setCompletionScore(typeof finalScore === 'number' ? finalScore : null)
            setCompletionPassed(isPassed)
            setIsFinished(true)
            setShowCelebrationModal(true)

            // Clear any local-storage fallback so a stale 99% snapshot is never
            // restored on page reload after the module was completed.
            if (storageKey) {
                safeLocalStorage.removeItem(storageKey)
            }

            // Achievement checks run against real persisted progress (see
            // check_and_award_achievement), so they're safe to fire right after the
            // training_progress row above lands. Only the two types with real server-side
            // qualification logic are checked here - the rest are permanently unearnable
            // today and would just be a silent no-op.
            try {
                const results = await Promise.all(
                    Object.keys(TRAINING_ACHIEVEMENT_LABELS).map(async (type) => {
                        const awarded = await checkAchievement.mutateAsync(type as AchievementType)
                        return awarded ? type : null
                    })
                )
                const awardedTypes = results.filter((type): type is string => type !== null)
                if (awardedTypes.length > 0) {
                    setNewlyEarnedAchievements(awardedTypes)
                }
            } catch (_achievementError) {
                // Achievement awarding is a nice-to-have, never block or dirty the
                // completion flow if it fails.
            }
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
                .eq('lp_content_type', 'module')
                .eq('training_id', moduleData.module.id)
                .maybeSingle()

            if (!isActive) return

            if (data) {
                const localUpdated = localData?.saved_at ? new Date(localData.saved_at).getTime() : 0
                const dbUpdated = data.updated_at ? new Date(data.updated_at).getTime() : 0
                if (!localData || dbUpdated >= localUpdated) {
                    applyRestoredProgress(data as any, moduleData.blocks)
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
                    lp_content_type?: string
                    training_id?: string
                }

                if (next?.lp_content_type !== 'module' || next?.training_id !== moduleData.module.id) {
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

                {block.type === 'video' && (() => {
                    const videoUrl = getBlockMediaUrl(block)
                    const isDirectVideo = (() => {
                        if (!videoUrl) return false
                        try {
                            const pathname = new URL(videoUrl).pathname
                            return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(pathname)
                        } catch {
                            return true
                        }
                    })()

                    return (
                        <div className="space-y-6">
                            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 relative group">
                                {videoUrl ? (
                                    isDirectVideo ? (
                                        <VideoPlayer
                                            src={videoUrl}
                                            blockId={block.id}
                                            onMarkWatched={handleMarkWatched}
                                            onTrackProgress={trackMediaProgress}
                                            onRegisterSeek={registerMediaSeek}
                                            t={t}
                                        />
                                    ) : (
                                        <iframe
                                            src={toEmbedUrl(videoUrl)}
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                                            allowFullScreen
                                            sandbox="allow-scripts allow-same-origin allow-presentation"
                                            referrerPolicy="strict-origin-when-cross-origin"
                                            loading="lazy"
                                            title={t('training_video_content', { defaultValue: 'Training video content' })}
                                        />
                                    )
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
                    )
                })()}

                {block.type === 'audio' && (() => {
                    const audioUrl = getBlockMediaUrl(block)
                    return (
                        <div className="space-y-6">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                {audioUrl ? (
                                    <AudioPlayer
                                        src={audioUrl}
                                        blockId={block.id}
                                        onTrackProgress={trackMediaProgress}
                                        onRegisterSeek={registerMediaSeek}
                                        t={t}
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
                    )
                })()}

                {block.type === 'interactive' && (() => {
                    const interactiveUrl = getBlockMediaUrl(block)
                    const contentData = block.content_data as Record<string, unknown> | null
                    const flashcards = contentData?.flashcards as any[] | undefined
                    const scenario = contentData?.scenario as any | undefined

                    // Shared trailing sections (mandatory-completion gate + authored
                    // rich text) rendered under whichever primary widget below applies.
                    const trailingSections = (
                        <>
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
                        </>
                    )

                    if (flashcards && flashcards.length > 0) {
                        return (
                            <div className="space-y-6">
                                <FlashcardDeckWidget
                                    title={block.title}
                                    cards={flashcards}
                                    isRTL={isRTL}
                                />
                                {trailingSections}
                            </div>
                        )
                    }

                    if (scenario && scenario.options) {
                        return (
                            <div className="space-y-6">
                                <ScenarioBranchSimulator
                                    title={block.title}
                                    scenarioText={scenario.scenarioText || block.content}
                                    scenarioText_ar={scenario.scenarioText_ar}
                                    guestRole={scenario.guestRole}
                                    options={scenario.options}
                                    isRTL={isRTL}
                                />
                                {trailingSections}
                            </div>
                        )
                    }

                    return (
                        <div className="space-y-6">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                {interactiveUrl ? (
                                    <div className="aspect-video rounded-xl overflow-hidden bg-slate-900">
                                        <iframe
                                            src={interactiveUrl}
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
                            {trailingSections}
                        </div>
                    )
                })()}

                {block.type === 'image' && (() => {
                    const imageUrl = getBlockMediaUrl(block)
                    return (
                        <div className="space-y-6">
                            {imageUrl && (
                                <ImageBlock src={imageUrl} alt={t('content')} t={t} />
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
                    )
                })()}

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
                                {trainingCompletion.totalQuizzes > 1 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {`Quizzes completed: ${trainingCompletion.completedQuizzes}/${trainingCompletion.totalQuizzes}`}
                                    </p>
                                )}
                            </div>
                        </div>
                        <QuizComponentEnhanced
                            quizId={block.content_data?.quiz_id as string}
                            contextType="training_module"
                            contextEntityId={block.id}
                            assignmentId={assignmentId}
                            certificateEnabled={false}
                            translationTarget={translationTarget}
                            showBilingual={showBilingual}
                            onComplete={(result) => {
                                const currentQuizId = (block.content_data?.quiz_id as string) || ''
                                const progressKey = getQuizProgressKey(block)
                                const nextCompletedBlocks = new Set(completedBlocks)
                                if (result.passed) {
                                    nextCompletedBlocks.add(block.id)
                                }
                                let nextAggregatedScore = result.score
                                let nextQuizScores = quizScoresByIdRef.current
                                let nextQuizResults = quizResultsByIdRef.current

                                if (currentQuizId) {
                                    const previousResult = quizResultsByIdRef.current[progressKey]
                                    const preservedSuccessfulResult = previousResult?.passed && !result.passed
                                        ? previousResult
                                        : null
                                    const resultToPersist = preservedSuccessfulResult || {
                                        quizId: currentQuizId,
                                        quizTitle: block.title || t('knowledgeCheck', 'Knowledge Check'),
                                        score: result.score,
                                        passed: result.passed,
                                        correctCount: result.correctCount,
                                        totalQuestions: result.totalQuestions,
                                        completedAt: new Date().toISOString(),
                                        reviewItems: result.reviewItems
                                    }
                                    nextQuizScores = {
                                        ...quizScoresByIdRef.current,
                                        [progressKey]: Math.max(quizScoresByIdRef.current[progressKey] ?? 0, result.score)
                                    }
                                    quizScoresByIdRef.current = nextQuizScores
                                    const calculatedAggregated = getAggregatedQuizScore(quizBlockIds, nextQuizScores)
                                    nextAggregatedScore = calculatedAggregated ?? result.score
                                    setQuizScoresById(nextQuizScores)
                                    setQuizScore(nextAggregatedScore)

                                    nextQuizResults = {
                                        ...quizResultsByIdRef.current,
                                        [progressKey]: resultToPersist
                                    }
                                    quizResultsByIdRef.current = nextQuizResults
                                    setQuizResultsById(nextQuizResults)
                                } else {
                                    setQuizScore(result.score)
                                }
                                setCompletedBlocks(nextCompletedBlocks)
                                if (result.passed) {
                                    void recordBlockCompletion(block.id)
                                }
                                scheduleProgressSave(0)
                                if (result.passed) {
                                    toast({
                                        title: t('moduleQuizPassed', 'Quiz Passed!'),
                                        description: t('quizScoreProceed', {
                                            score: result.score,
                                            defaultValue: `Great job! You scored ${result.score}%. Proceeding to the next lesson.`
                                        })
                                    })
                                } else {
                                    const passingScore = (block.content_data as Record<string, unknown> | null)?.passing_score_percentage ?? moduleData?.module.passing_score_percentage ?? 80
                                    toast({
                                        title: t('quizNotPassed', 'Quiz Not Passed'),
                                        description: t('quizScoreReview', {
                                            score: result.score,
                                            defaultValue: `You scored ${result.score}%. A passing score of ${passingScore}% is required to unlock subsequent lessons.`
                                        }),
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

                    return (
                        <EmbeddedArticleViewer
                            sopId={resolvedSopId || block.id}
                            fallbackTitle={block.title}
                            fallbackContent={block.content}
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

    const finalScore = completionScore ?? quizScore
    const finalPassed = completionPassed ?? true
    const canViewCertificate = finalPassed && moduleData.module.certificate_enabled

    if (isFinished) {
        const quizBreakdown = moduleData.blocks
            .filter(block => block.type === 'quiz')
            .map(block => ({ block, result: quizResultsById[getQuizProgressKey(block)] }))
            .filter((entry): entry is { block: TrainingContentBlock; result: PersistedQuizResult } => !!entry.result)

        return (
            <LazyMotion features={domAnimation}>
                <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                    className="min-h-screen bg-slate-50 flex items-center justify-center p-6 py-12"
                >
                    <Card className="max-w-xl w-full text-center p-6 sm:p-12 shadow-2xl border-0 overflow-hidden relative">
                        <div className="absolute top-0 start-0 w-full h-2 bg-hotel-gold"></div>
                        <m.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.25, delay: 0.1 }}
                            className="h-24 w-24 bg-hotel-gold/10 rounded-full flex items-center justify-center mx-auto mb-8 relative"
                        >
                            <Trophy className="h-12 w-12 text-hotel-gold-dark" />
                            {finalPassed && (
                                <m.span
                                    initial={{ scale: 0.9, opacity: 0.6 }}
                                    animate={{ scale: 1.4, opacity: 0 }}
                                    transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
                                    className="absolute inset-0 rounded-full border-2 border-hotel-gold/50"
                                />
                            )}
                        </m.div>

                    <h2 className="text-3xl font-bold text-hotel-navy mb-4 font-serif">
                        {t('congratulations')}
                    </h2>
                    <p className="text-slate-600 mb-8 text-lg">
                        {t('trainingCompletedMessage', { module: moduleData.module.title })}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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

                    {quizBreakdown.length > 1 && (
                        <div className="mb-6 rounded-xl border border-slate-100 overflow-hidden text-start">
                            <div className="bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                {t('quizBreakdown', 'Quiz results')}
                            </div>
                            <div className="divide-y divide-slate-100">
                                {quizBreakdown.map(({ block, result }, idx) => (
                                    <m.div
                                        key={block.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: 0.15 + idx * 0.04, ease: "easeOut" }}
                                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {result.passed
                                                ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                                : <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
                                            <span className="text-sm text-slate-700 truncate">{result.quizTitle}</span>
                                        </div>
                                        <span className={cn("text-sm font-semibold tabular-nums shrink-0", result.passed ? "text-emerald-600" : "text-rose-500")}>
                                            {result.score}%
                                        </span>
                                    </m.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {newlyEarnedAchievements.length > 0 && (
                        <div className="mb-8 space-y-2">
                            {newlyEarnedAchievements.map((type, idx) => {
                                const meta = TRAINING_ACHIEVEMENT_LABELS[type]
                                if (!meta) return null
                                const Icon = meta.icon
                                return (
                                    <m.div
                                        key={type}
                                        initial={{ opacity: 0, scale: 0.92, y: 6 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ type: "spring", duration: 0.45, bounce: 0.3, delay: 0.3 + idx * 0.08 }}
                                        className="flex items-center gap-3 rounded-xl border border-hotel-gold/30 bg-gradient-to-r from-hotel-gold/10 to-transparent px-4 py-3 text-start"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-hotel-gold/20 flex items-center justify-center shrink-0">
                                            <Icon className="h-5 w-5 text-hotel-gold-dark" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-hotel-navy">
                                                {t('achievementUnlocked', 'Achievement unlocked')}: {meta.title}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">{meta.description}</p>
                                        </div>
                                    </m.div>
                                )
                            })}
                        </div>
                    )}

                        <div className="space-y-3">
                            {canViewCertificate && (
                                <Button
                                    className="w-full bg-hotel-navy hover:bg-hotel-navy-light text-white h-12 transition-transform active:scale-[0.98]"
                                    onClick={() => navigate('/training/certificates')}
                                >
                                    {t('viewCertificate', 'View Certificate')}
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                className="w-full h-12 transition-transform active:scale-[0.98]"
                                onClick={() => navigate('/learning/my')}
                            >
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
                            isRTL ? "end-0 border-l border-white/5" : "start-0 border-r border-white/5",
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
                                {moduleData.blocks.map((block, idx) => {
                                    const itemState = progression.blockStates[block.id] || 'AVAILABLE'
                                    const isLocked = itemState === 'LOCKED'
                                    const isActive = idx === activeBlockIndex

                                    return (
                                        <button
                                            key={block.id}
                                            onClick={() => handleSelectBlock(idx)}
                                            className={cn(
                                                "w-full flex items-start gap-4 p-4 rounded-xl text-sm transition-all duration-200 group relative overflow-hidden",
                                                isActive
                                                    ? "bg-hotel-gold/15 text-white ring-1 ring-hotel-gold/30"
                                                    : isLocked
                                                        ? "text-white/40 opacity-60 hover:bg-white/5 cursor-pointer"
                                                        : "text-white/70 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            {isActive && (
                                                <m.div
                                                    layoutId="active-pill"
                                                    className={cn(
                                                        "absolute top-0 bottom-0 w-1 bg-hotel-gold",
                                                        isRTL ? "end-0" : "start-0"
                                                    )}
                                                />
                                            )}
                                            <div className={cn(
                                                "mt-0.5 shrink-0 transition-colors",
                                                isActive
                                                    ? "text-hotel-gold"
                                                    : isLocked
                                                        ? "text-white/30"
                                                        : "text-white/40 group-hover:text-white/60"
                                            )}>
                                                {isLocked ? (
                                                    <Lock className="w-4 h-4" />
                                                ) : block.type === 'video' ? (
                                                    <VideoIcon className="w-4 h-4" />
                                                ) : block.type === 'audio' ? (
                                                    <Headphones className="w-4 h-4" />
                                                ) : block.type === 'interactive' ? (
                                                    <Gamepad2 className="w-4 h-4" />
                                                ) : block.type === 'quiz' ? (
                                                    <HelpCircle className="w-4 h-4" />
                                                ) : block.type === 'image' ? (
                                                    <ImageIcon className="w-4 h-4" />
                                                ) : block.type === 'text' ? (
                                                    <FileText className="w-4 h-4" />
                                                ) : block.type === 'document_link' ? (
                                                    <LinkIcon className="w-4 h-4" />
                                                ) : (
                                                    <BookOpen className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div className={cn(
                                                "flex-1 text-left",
                                                isRTL && "text-right"
                                            )}>
                                                <p className={cn(
                                                    "font-medium leading-tight line-clamp-2",
                                                    isActive ? "text-white" : isLocked ? "text-white/50" : ""
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
                                            {isLocked ? (
                                                <Lock className="w-3.5 h-3.5 text-white/30 shrink-0 mt-0.5" />
                                            ) : itemState === 'COMPLETED' ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                            ) : itemState === 'RETRY_REQUIRED' || itemState === 'FAILED' ? (
                                                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                            ) : null}
                                        </button>
                                    )
                                })}
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

                    <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="hidden sm:flex bg-slate-100 px-3 py-1.5 rounded-full items-center gap-2 me-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-hotel-gold animate-pulse" />
                            <span className="text-xs font-bold text-hotel-navy tabular-nums">
                                {activeBlockIndex + 1} / {moduleData.blocks.length}
                            </span>
                        </div>

                        {/* Voice Audio Narrator */}
                        <Button
                            variant={showAudioNarrator ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowAudioNarrator(prev => !prev)}
                            className={cn(
                                "h-9 px-2.5 gap-1.5 border-slate-200 shrink-0",
                                showAudioNarrator
                                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-500 font-semibold"
                                    : "bg-white text-slate-700 hover:bg-slate-50"
                            )}
                            title={isRTL ? 'القارئ الصوتي الذكي' : 'AI Voice Read-Aloud'}
                        >
                            <Volume2 className="h-4 w-4" />
                            <span className="hidden lg:inline text-xs">{isRTL ? 'استماع' : 'Listen'}</span>
                        </Button>

                        {/* AI Tutor */}
                        <Button
                            variant={showTutorDrawer ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowTutorDrawer(prev => !prev)}
                            className={cn(
                                "h-9 px-2.5 gap-1.5 border-slate-200 shrink-0",
                                showTutorDrawer
                                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-500 font-semibold"
                                    : "bg-white text-slate-700 hover:bg-slate-50"
                            )}
                            title={isRTL ? 'المرشد الذكي ألتوس' : 'Ask Altus AI Coach'}
                        >
                            <Bot className="h-4 w-4 text-amber-500" />
                            <span className="hidden lg:inline text-xs">{isRTL ? 'المرشد الذكي' : 'AI Tutor'}</span>
                        </Button>

                        {/* Study Notes */}
                        <Button
                            variant={showNotesDrawer ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowNotesDrawer(prev => !prev)}
                            className={cn(
                                "h-9 px-2.5 gap-1.5 border-slate-200 shrink-0",
                                showNotesDrawer
                                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-500 font-semibold"
                                    : "bg-white text-slate-700 hover:bg-slate-50"
                            )}
                            title={isRTL ? 'مفكرتي وملاحظاتي' : 'Study Notes'}
                        >
                            <FileText className="h-4 w-4" />
                            <span className="hidden lg:inline text-xs">{isRTL ? 'ملاحظاتي' : 'Notes'}</span>
                        </Button>

                        {/* Font Size Sizer */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-2 gap-1 border-slate-200 bg-white text-slate-700 shrink-0"
                                    title={isRTL ? 'حجم الخط' : 'Font Size'}
                                >
                                    <Type className="h-4 w-4" />
                                    <span className="text-xs uppercase font-bold">{fontSizeModifier}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                                <DropdownMenuItem onClick={() => setFontSizeModifier('sm')}>
                                    Small (A-)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFontSizeModifier('base')}>
                                    Default (A)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFontSizeModifier('lg')}>
                                    Large (A+)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Zen / Theater Mode */}
                        <Button
                            variant={isZenMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                                setIsZenMode(prev => !prev)
                                if (!isZenMode) setSidebarOpen(false)
                            }}
                            className={cn(
                                "h-9 px-2.5 gap-1.5 border-slate-200 shrink-0",
                                isZenMode
                                    ? "bg-slate-900 text-amber-400 border-slate-800"
                                    : "bg-white text-slate-700 hover:bg-slate-50"
                            )}
                            title={isRTL ? 'وضع التركيز' : 'Zen Focus Mode'}
                        >
                            {isZenMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                            <span className="hidden lg:inline text-xs">{isRTL ? 'تركيز' : 'Zen'}</span>
                        </Button>

                        {/* Translation Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 gap-1.5 border-slate-200 bg-white shrink-0"
                                    disabled={isTranslating}
                                >
                                    {isTranslating ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Languages className="h-4 w-4" />
                                    )}
                                    <span className="hidden md:inline text-xs">
                                        {translationTargetMeta
                                            ? translationTargetMeta.label
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
                            className="text-hotel-navy hover:bg-slate-50 font-medium hidden sm:flex h-9"
                        >
                            <ArrowLeft className={cn("h-4 w-4", isRTL ? "ms-2 rotate-180" : "me-2")} />
                            <span className="hidden md:inline text-xs">{t('exitLearning')}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/learning/my')}
                            className="sm:hidden h-9 w-9 text-hotel-navy"
                            aria-label={t('accessibility.exitTraining', 'Exit training')}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </header>

                {/* Audio Narrator Bar */}
                {showAudioNarrator && activeBlock && (
                    <PlayerAudioNarrator
                        text={activeBlock.content || activeBlock.title || ''}
                        title={activeBlock.title}
                        isRTL={isRTL}
                        targetLang={translationTarget}
                        onClose={() => setShowAudioNarrator(false)}
                    />
                )}

                {/* Top Reading Progress Scrubber */}
                <div className="w-full bg-slate-100 h-1 shrink-0 overflow-hidden">
                    <div
                        className="bg-amber-400 h-full transition-all duration-300 shadow-sm shadow-amber-400/50"
                        style={{ width: `${persistedProgressPercentage}%` }}
                    />
                </div>

                {/* Content Area */}
                <SmartObserver
                    className={cn(
                        "flex-1 overflow-y-auto custom-scrollbar-light pt-4 pb-12 relative transition-colors duration-500",
                        isZenMode ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"
                    )}
                    onFocusChange={setIsFocused}
                    onIdleChange={setIsIdle}
                    idleTimeoutMs={60000}
                >
                    {/* Ambient Glow in Zen Mode */}
                    {isZenMode && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                    )}

                    {/* Anti-Cheat Status Toast/Indicator (Dev/User Feedback) */}
                    {(!isFocused || isIdle) && (
                        <div className="absolute top-4 start-4 end-4 sm:start-auto sm:end-4 z-50 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-sm animate-pulse">
                            {isIdle ? <MousePointer2 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {isIdle ? t('sessionPausedIdle', 'Session Paused (Idle)') : t('sessionPausedFocus', 'Session Paused (Focus lost)')}
                        </div>
                    )}
                    <div className={cn(
                        "max-w-4xl mx-auto py-4 md:py-12 px-4 md:px-12 lg:px-16 min-h-full flex flex-col transition-all",
                        fontSizeModifier === 'sm' ? "text-sm" : fontSizeModifier === 'lg' ? "text-lg" : "text-base"
                    )}>
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

                {!isFinished && !trainingCompletion.complete && trainingCompletion.blockers.length > 0 && (() => {
                    const blocker = trainingCompletion.blockers[0]
                    const blockerIndex = moduleData.blocks.findIndex(b => b.id === blocker.blockId)
                    const isOnBlockerAlready = blockerIndex === activeBlockIndex
                    return (
                        <div className="border-t border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900 md:px-12 flex flex-wrap items-center justify-between gap-2" role="status">
                            <span>
                                <span className="font-semibold">{t('requirementsRemaining', 'Requirements remaining')}:</span>{' '}
                                {blocker.reason === 'quiz-not-passed'
                                    ? t('requiredQuizPassNeeded', { defaultValue: `Pass "${blocker.label}" to finish.` })
                                    : blocker.reason === 'quiz-not-submitted'
                                        ? t('requiredQuizStillNeeded', { defaultValue: `Complete "${blocker.label}" to finish.` })
                                        : t('requiredContentStillNeeded', { defaultValue: `Complete "${blocker.label}" to finish.` })}
                            </span>
                            {blockerIndex !== -1 && !isOnBlockerAlready && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100 transition-transform active:scale-95"
                                    onClick={() => {
                                        setActiveBlockIndex(blockerIndex)
                                        window.scrollTo(0, 0)
                                    }}
                                >
                                    {t('goToRequirement', 'Go to it')}
                                    <ChevronRight className={cn("h-3 w-3 ms-1", isRTL && "rotate-180")} />
                                </Button>
                            )}
                        </div>
                    )
                })()}

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
                            "h-10 md:h-12 px-3 sm:px-4 md:px-6 text-sm md:text-base font-bold tracking-wide border-2 hover:bg-slate-50 transition-all duration-150 ease-out active:scale-[0.97] rounded-xl",
                            isRTL ? "flex-row-reverse" : ""
                        )}
                    >
                        <ChevronLeft className={cn(
                            "h-4 w-4 md:h-5 md:w-5",
                            isRTL ? "ms-2 md:ms-3 rotate-180" : "me-2 md:me-3"
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
                            "h-10 md:h-12 min-w-[7.5rem] sm:min-w-[10rem] justify-center px-3 sm:px-4 md:px-8 text-sm md:text-base font-bold tracking-wide transition-all duration-150 ease-out shadow-lg hover:shadow-xl active:scale-[0.97] rounded-xl",
                            isLastBlock
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-hotel-navy hover:bg-hotel-navy-light text-white",
                            isRTL ? "flex-row-reverse" : "",
                        )}
                    >
                        {/* Intelligent Button Content */}
                        {(() => {
                            if (progression.isModuleComplete || (isLastBlock && canProceedToNext && (!activeBlock || activeBlock.type !== 'quiz' || activeQuizPassed))) {
                                return (
                                    <>
                                        <CheckCircle className={cn("h-4 w-4 md:h-5 md:w-5", isRTL ? "ms-2 md:ms-3" : "me-2 md:me-3")} />
                                        <span>{t('completeModule', 'Complete Module')}</span>
                                    </>
                                )
                            }

                            if (activeBlock?.type === 'quiz') {
                                if (activeQuizPassed) {
                                    return (
                                        <>
                                            <span className="hidden md:inline">{t('continueToNextLesson', 'Next Lesson')}</span>
                                            <span className="md:hidden">{t('next', 'Next')}</span>
                                            <ChevronRight className={cn(
                                                "h-4 w-4 md:h-5 md:w-5",
                                                isRTL ? "me-2 md:me-3 rotate-180" : "ms-2 md:ms-3"
                                            )} />
                                        </>
                                    )
                                }
                                if (activeBlockState === 'RETRY_REQUIRED' || activeBlockState === 'FAILED') {
                                    return (
                                        <>
                                            <RotateCcw className={cn("h-4 w-4 md:h-5 md:w-5", isRTL ? "ms-2 md:ms-3" : "me-2 md:me-3")} />
                                            <span>{t('retryQuiz', 'Retry Quiz')}</span>
                                        </>
                                    )
                                }
                                return (
                                    <>
                                        <HelpCircle className={cn("h-4 w-4 md:h-5 md:w-5", isRTL ? "ms-2 md:ms-3" : "me-2 md:me-3")} />
                                        <span>{t('takeQuiz', 'Take Quiz')}</span>
                                    </>
                                )
                            }

                            return (
                                <>
                                    <span className="hidden md:inline">{t('nextStep', 'Next Step')}</span>
                                    <span className="md:hidden">{t('next', 'Next')}</span>
                                    <ChevronRight className={cn(
                                        "h-4 w-4 md:h-5 md:w-5",
                                        isRTL ? "me-2 md:me-3 rotate-180" : "ms-2 md:ms-3"
                                    )} />
                                </>
                            )
                        })()}
                    </Button>
                </footer>
                </div>

                {/* AI Tutor Drawer */}
                <PlayerTutorDrawer
                    isOpen={showTutorDrawer}
                    onClose={() => setShowTutorDrawer(false)}
                    moduleTitle={moduleData?.module?.title}
                    blockTitle={activeBlock?.title}
                    blockContentText={activeBlock?.content || ''}
                    isRTL={isRTL}
                />

                {/* Study Notes Drawer */}
                <PlayerNotesDrawer
                    isOpen={showNotesDrawer}
                    onClose={() => setShowNotesDrawer(false)}
                    moduleId={moduleData?.module?.id || ''}
                    moduleTitle={moduleData?.module?.title}
                    activeBlockId={activeBlock?.id}
                    activeBlockTitle={activeBlock?.title}
                    isRTL={isRTL}
                />

                {/* Luxury Celebration Modal */}
                <PlayerCelebrationModal
                    isOpen={showCelebrationModal}
                    onClose={() => setShowCelebrationModal(false)}
                    moduleTitle={moduleData?.module?.title || 'Hospitality Module'}
                    recipientName={profile?.full_name || user?.email || 'Hospitality Professional'}
                    score={completionScore}
                    passed={completionPassed}
                    timeSpentSeconds={timeSpentSeconds}
                    isRTL={isRTL}
                    onBackToDashboard={() => navigate('/learning/my')}
                />
            </div>
        </LazyMotion>
    )
}

