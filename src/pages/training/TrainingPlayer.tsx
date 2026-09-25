import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { fetchCourseWithContent, fetchLinkedTrainingProgress, recordLessonBlockCompletion, recordLessonBlockLastViewed, fetchPersistedProgress, subscribeToPlayerProgress } from '@/features/learn'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { CourseSourceDocuments } from '@/components/training/CourseSourceDocuments'
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
import { resolveStorageUrl, resolveHtmlStorageUrls } from '@/lib/secureFileAccess'
import { safeLocalStorage } from '@/lib/storage'
import { evaluateTrainingCompletion, getQuizProgressKey } from '@/lib/trainingCompletion'
import {
    evaluateModuleProgression,
    getNextRequiredLearningItem,
    validateNavigationTarget,
    type LearnerProgressState
} from '@/lib/trainingProgressionEngine'
import type { TrainingContentBlock } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { TrainingModule } from '@/lib/types/training'
import { QuizComponentEnhanced } from '@/pages/learning/components/QuizComponentEnhanced'
import { learningService } from '@/services/learningService'
import { skillsService } from '@/services/skillsService'
import {
    AlertCircle,
    BookOpen,
    CheckCircle,
    CheckCircle2,
    ChevronRight,
    Eye,
    Gamepad2,
    Headphones,
    HelpCircle,
    Image as ImageIcon,
    Loader2,
    MousePointer2,
    Sparkles,
    Trophy,
    Video as VideoIcon,
    X,
    XCircle
} from 'lucide-react'
import { PlayerAudioNarrator } from '@/components/training/player/PlayerAudioNarrator'
import { PlayerTutorDrawer } from '@/components/training/player/PlayerTutorDrawer'
import { PlayerNotesDrawer } from '@/components/training/player/PlayerNotesDrawer'
import { PlayerCelebrationModal } from '@/components/training/player/PlayerCelebrationModal'
import {
    PlayerShell,
    PlayerShellSkeleton,
    PlayerTopBar,
    PlayerToolsMenu,
    PlayerContextRail,
    PlayerActionBar,
    usePlayerShell,
    type LessonRailItem,
    type LessonRailItemState,
    type PlayerPrimaryAction,
    type PlayerSaveState,
} from '@/components/training/player/shell'
import { FlashcardDeckWidget } from '@/components/training/player/widgets/FlashcardDeckWidget'
import { ScenarioBranchSimulator } from '@/components/training/player/widgets/ScenarioBranchSimulator'
import { PracticalAssignmentBlockRenderer } from '@/components/training/player/PracticalAssignmentBlockRenderer'
import { RoleplaySimulationBlockRenderer } from '@/components/training/player/RoleplaySimulationBlockRenderer'
import { BlockCallout } from '@/components/training/player/BlockCallout'
import { BlockVisualAssets } from '@/components/training/player/BlockVisualAssets'
import {
    getBlockComponentTag,
    getBlockLearningOutcomes,
    getCourseBlueprintOutcomes,
    getEffectiveBlockTranslation,
    getAssignmentPrompt,
    groupVisualAssetsByBlock,
    groupVisualAssetsByLesson,
    isBlockContentEmpty,
    partitionVisualAssetsByPlacement,
    resolveBlockRenderer,
    selectBlockVisualAssets,
} from '@/lib/training/playerContent'
import type { CourseVisualAsset } from '@/types/aiCourseEngine'
import { assignmentSubmissionService, type TrainingAssignmentSubmission } from '@/services/assignmentSubmissionService'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
    PlayerCompletionView,
    type PersistedQuizResult,
    type PersistedQuizReviewItem,
} from '@/components/training/player/PlayerCompletionView'
import {
    RichTextBlockContent,
    VideoPlayer,
    AudioPlayer,
    ImageBlock,
    BlockChangeEffects,
    getBlockMediaUrl,
    toEmbedUrl,
    useOnlineStatus,
    useResolvedHtmlContent,
} from '@/components/training/player/PlayerMediaComponents'

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

    const canViewUnpublishedModules = ['administrator', 'super_admin', 'corporate_admin', 'training_manager', 'author', 'regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '')

    useEffect(() => {
        if (id && !isValidModuleId) {
            toast({
                title: t('error', 'Error'),
                description: t('invalidModuleId', 'Invalid training module ID.'),
                variant: 'destructive'
            })
            navigate('/learn/my', { replace: true })
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
    const [assignmentSubmissions, setAssignmentSubmissions] = useState<Record<string, TrainingAssignmentSubmission>>({})
    const [timeSpentSeconds, setTimeSpentSeconds] = useState(0)
    const [resumeNotice, setResumeNotice] = useState<string | null>(null)

    // Luxury Player Upgrades State
    const [isZenMode, setIsZenMode] = useState(false)
    const [showAudioNarrator, setShowAudioNarrator] = useState(false)
    const [showTutorDrawer, setShowTutorDrawer] = useState(false)
    const [showNotesDrawer, setShowNotesDrawer] = useState(false)
    const [fontSizeModifier, setFontSizeModifier] = useState<'sm' | 'base' | 'lg'>('base')
    const [showCelebrationModal, setShowCelebrationModal] = useState(false)
    const [saveState, setSaveState] = useState<PlayerSaveState>('idle')
    const saveStateResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const quizDirtyRef = useRef(false)
    const isOnline = useOnlineStatus()

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
        blocks: TrainingContentBlock[],
        moduleInfo?: Partial<TrainingModule> | null,
        // Only the first hydration (initial load / localStorage) may move the
        // learner's cursor. Realtime echoes of the learner's own saves must sync
        // completion/score state WITHOUT yanking activeBlockIndex — otherwise
        // pressing Next bounces straight back to the recomputed "resume" index.
        repositionCursor = false
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
        if (!wasCompleted && repositionCursor) {
            const restoredLearnerState: LearnerProgressState = {
                completedBlockIds: restoredCompleted,
                completedMediaBlockIds: restoredMediaCompleted,
                quizResultsByBlockId: normalizedResults
            }
            const smartNext = getNextRequiredLearningItem(moduleInfo, blocks, restoredLearnerState)
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
    const { data: moduleData, isLoading, isError, refetch } = useQuery({
        queryKey: ['training-module-full', id],
        queryFn: async () => {
            if (!id || !isValidModuleId) throw new Error('Invalid module ID')
            return fetchCourseWithContent({ id, canViewUnpublished: canViewUnpublishedModules })
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

    // Seed the runtime translation cache with any translations persisted on the
    // block itself (documents.content_ar, or content_data.translations keyed by
    // language). AI-generated courses ship bilingual content this way, so the
    // language toggle shows it instantly with no on-demand AI translation call.
    useEffect(() => {
        const blocks = moduleData?.blocks
        if (!blocks || blocks.length === 0) return
        const seed: Record<string, Partial<Record<TranslationTargetLanguage, string>>> = {}
        for (const block of blocks) {
            const entry: Partial<Record<TranslationTargetLanguage, string>> = {}
            const persistedAr = (block as { content_ar?: string | null }).content_ar
            if (typeof persistedAr === 'string' && persistedAr.trim()) {
                entry.ar = persistedAr
            }
            const translations = (block.content_data as Record<string, unknown> | null)?.translations
            if (translations && typeof translations === 'object' && !Array.isArray(translations)) {
                for (const [lang, value] of Object.entries(translations as Record<string, unknown>)) {
                    if (typeof value === 'string' && value.trim()) {
                        entry[lang as TranslationTargetLanguage] = value
                    }
                }
            }
            if (Object.keys(entry).length > 0) seed[block.id] = entry
        }
        if (Object.keys(seed).length > 0) {
            setBlockTranslations(prev => {
                const next = { ...prev }
                for (const [blockId, langs] of Object.entries(seed)) {
                    next[blockId] = { ...langs, ...next[blockId] }
                }
                return next
            })
        }
    }, [moduleData?.blocks])

    const totalBlocks = moduleData?.blocks.length || 1

    const visualAssetsByBlock = useMemo(
        () => groupVisualAssetsByBlock(moduleData?.visualAssets || []),
        [moduleData?.visualAssets]
    )
    const visualAssetsByLesson = useMemo(
        () => groupVisualAssetsByLesson(moduleData?.visualAssets || []),
        [moduleData?.visualAssets]
    )
    const courseOutcomes = useMemo(
        () => getCourseBlueprintOutcomes((moduleData?.module as { blueprint?: unknown } | undefined)?.blueprint),
        [moduleData?.module]
    )
    const componentTagsPresent = useMemo(() => {
        const tags = new Set<string>()
        for (const block of moduleData?.blocks || []) {
            const tag = getBlockComponentTag(block)
            if (tag) tags.add(tag)
        }
        return tags
    }, [moduleData?.blocks])

    const quizBlockIds = useMemo(
        () => (moduleData?.blocks || [])
            .filter(block => block.type === 'quiz')
            .map(getQuizProgressKey),
        [moduleData?.blocks]
    )

    useEffect(() => {
        if (!id || !user?.id) return
        assignmentSubmissionService.getModuleSubmissionsForUser(id, user.id)
            .then(subs => setAssignmentSubmissions(subs || {}))
            .catch(err => console.warn('Could not load assignment submissions:', err))
    }, [id, user?.id])

    const learnerState: LearnerProgressState = useMemo(() => ({
        completedBlockIds: completedBlocks,
        completedMediaBlockIds: completedMediaBlocks,
        quizResultsByBlockId: quizResultsById,
        quizAttemptsByBlockId: {},
        assignmentSubmissionsByBlockId: assignmentSubmissions,
        activeBlockId: activeBlock?.id || null,
    }), [completedBlocks, completedMediaBlocks, quizResultsById, assignmentSubmissions, activeBlock?.id])

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
        assignmentSubmissionsByBlockId: assignmentSubmissions,
    }), [moduleData?.blocks, completedBlocks, completedMediaBlocks, quizResultsById, assignmentSubmissions])

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
        const cd = activeBlock.content_data as Record<string, unknown> | null
        const isAssignment =
            activeBlock.type === 'assignment' ||
            activeBlock.type === 'practical' ||
            Boolean(cd?.is_assignment) ||
            Boolean(cd?.requires_submission)

        if (isAssignment && activeBlock.is_mandatory !== false) {
            const sub = assignmentSubmissions[activeBlock.id]
            const reqApproval = cd?.requires_instructor_approval !== false
            if (!sub) return false
            if (sub.status === 'draft' || sub.status === 'revision_required' || sub.status === 'rejected') return false
            if (reqApproval && sub.status !== 'approved') return false
        }
        if (activeBlock.type === 'video' || activeBlock.type === 'audio' || activeBlock.type === 'interactive') {
            if (activeBlock.is_mandatory && !completedMediaBlocks.has(activeBlock.id) && !completedBlocks.has(activeBlock.id)) {
                return false
            }
        }
        return true
    }, [activeBlock, activeQuizPassed, completedMediaBlocks, completedBlocks, assignmentSubmissions])

    const progressPercentage = progression.realProgressPercentage
    const persistedProgressPercentage = isFinished ? 100 : Math.min(progressPercentage, 99)
    const translationTargetMeta = translationTarget
        ? SUPPORTED_TRANSLATION_LANGUAGES.find(lang => lang.code === translationTarget)
        : null
    const translationDir = translationTargetMeta?.direction || 'ltr'
    const displayModuleTitle = translationTarget && moduleTitleTranslations[translationTarget]
        ? moduleTitleTranslations[translationTarget] as string
        : moduleData?.module.title

    const resolveBlockTitle = useCallback((block: TrainingContentBlock, idx: number) => {
        const cd = block.content_data as Record<string, unknown> | null
        const refKey = (cd?.sop_id as string)
            || (block as TrainingContentBlock).source_document_id
            || (cd?.document_id as string)
            || (block.type === 'quiz' ? (cd?.quiz_id as string) : '')
        return block.title
            || (refKey ? moduleData?.referencedTitles?.[refKey] : '')
            || t('blockTitle', { number: idx + 1 })
    }, [moduleData?.referencedTitles, t])

    const railItems = useMemo<LessonRailItem[]>(() => {
        const blocks = moduleData?.blocks || []
        const mapState = (raw: string | undefined, isActive: boolean): LessonRailItemState => {
            if (isActive) return 'current'
            switch (raw) {
                case 'LOCKED': return 'locked'
                case 'COMPLETED': return 'completed'
                case 'FAILED': return 'failed'
                case 'RETRY_REQUIRED': return 'retry'
                case 'PENDING_REVIEW': return 'pending-review'
                case 'EXEMPTED': return 'exempted'
                case 'SKIPPED': return 'skipped'
                default: return 'available'
            }
        }
        return blocks.map((block, idx) => ({
            id: block.id,
            index: idx,
            title: resolveBlockTitle(block, idx),
            subtitle: (block.type || '').replace('_', ' '),
            state: mapState(progression.blockStates[block.id], idx === activeBlockIndex),
        }))
    }, [moduleData?.blocks, progression.blockStates, activeBlockIndex, resolveBlockTitle])

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

    // The shell action bar's default primary action. Individual blocks (the quiz)
    // may override this by registering their own action via useRegisterPlayerAction.
    const defaultPrimaryAction = useMemo<PlayerPrimaryAction>(() => {
        const isModuleFinish = progression.isModuleComplete
            || (isLastBlock && canProceedToNext && (!activeBlock || activeBlock.type !== 'quiz' || activeQuizPassed))

        if (isModuleFinish) {
            return {
                id: 'module:complete',
                label: t('completeModule', 'Complete Module'),
                onPress: handleNext,
                icon: 'complete',
                intent: 'success',
            }
        }

        if (activeBlock?.type === 'quiz') {
            if (activeQuizPassed) {
                return { id: 'quiz:next', label: t('continueToNextLesson', 'Next Lesson'), onPress: handleNext, icon: 'next' }
            }
            return {
                id: 'quiz:blocked',
                label: t('takeQuiz', 'Take Quiz'),
                onPress: handleNext,
                icon: 'quiz',
                disabled: true,
                disabledReason: (activeBlockState === 'RETRY_REQUIRED' || activeBlockState === 'FAILED')
                    ? t('retryQuizToContinue', 'Retry and pass this quiz to continue.')
                    : t('passQuizToContinue', 'Pass this quiz to unlock the next lesson.'),
            }
        }

        let disabledReason: string | undefined
        if (!canProceedToNext && activeBlock) {
            const cd = activeBlock.content_data as Record<string, unknown> | null
            if (activeBlock.type === 'video') disabledReason = t('finishVideoToContinue', 'Finish the video to continue.')
            else if (activeBlock.type === 'audio') disabledReason = t('finishAudioToContinue', 'Finish the audio to continue.')
            else if (activeBlock.type === 'interactive') disabledReason = t('finishActivityToContinue', 'Complete the activity to continue.')
            else if (cd?.is_assignment || cd?.requires_submission || activeBlock.type === 'assignment' || activeBlock.type === 'practical') {
                disabledReason = t('submitAssignmentToContinue', 'Submit your assignment to continue.')
            }
        }

        return {
            id: 'block:next',
            label: t('nextStep', 'Next Step'),
            onPress: handleNext,
            icon: 'next',
            disabled: !canProceedToNext,
            disabledReason,
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progression.isModuleComplete, isLastBlock, canProceedToNext, activeBlock, activeQuizPassed, activeBlockState, t])

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
                const syncedTrainingProgress = await fetchLinkedTrainingProgress(user.id, moduleData.module.id)
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
                            organizationId: (moduleData.module as any).organization_id,
                            hotelId: (moduleData.module as any).hotel_id || primaryProperty?.id,
                            brandId: (moduleData.module as any).brand_id,
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

        if (saveStateResetRef.current) clearTimeout(saveStateResetRef.current)
        setSaveState('saving')

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
            setSaveState('saved')
            saveStateResetRef.current = setTimeout(() => setSaveState('idle'), 2200)
        } catch (_error) {
            // Progress persistence failure is non-critical - continue silently.
            // Keep a local fallback to preserve learner context.
            setSaveState('offline')
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
            let blockTime = timeByBlockRef.current[blockId] || 0
            if (activeBlock?.id === blockId) {
                blockTime += Math.max(0, Math.floor((Date.now() - blockStartRef.current) / 1000))
            }
            await recordLessonBlockCompletion(user.id, moduleData.module.id, blockId, blockTime)
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
                applyRestoredProgress(localData, moduleData.blocks, moduleData.module, true)
            }

            const data = await fetchPersistedProgress(user.id, moduleData.module.id)

            if (!isActive) return

            if (data) {
                const localUpdated = localData?.saved_at ? new Date(localData.saved_at).getTime() : 0
                const dbUpdated = data.updated_at ? new Date(data.updated_at).getTime() : 0
                if (!localData || dbUpdated >= localUpdated) {
                    applyRestoredProgress(data as any, moduleData.blocks, moduleData.module, true)
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

        const unsubscribe = subscribeToPlayerProgress(user.id, moduleData.module.id, (payload) => {
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

            applyRestoredProgress(next, moduleData.blocks, moduleData.module)
        })

        return () => {
            unsubscribe()
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
            void recordLessonBlockLastViewed(user.id, moduleData.module.id, activeBlockId)
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
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            void persistProgress()
            if (quizDirtyRef.current) {
                e.preventDefault()
                e.returnValue = ''
            }
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
        // On-the-fly translation wins, else fall back to any AR/i18n markup the
        // course generator persisted on content_data.
        const translatedBlockContent = getEffectiveBlockTranslation(
            block,
            translationTarget,
            getTranslatedBlockContent(block)
        )

        const rendererKind = resolveBlockRenderer(block)
        const componentTag = getBlockComponentTag(block)
        const blockAssets = selectBlockVisualAssets(block, visualAssetsByBlock, visualAssetsByLesson)
        const { leading: leadingAssets, trailing: trailingAssets } = partitionVisualAssetsByPlacement(blockAssets)

        // Distinctive callout for tagged leading/trailing lesson components
        // (module objectives, wrap-up summary, checkpoint list).
        if (componentTag) {
            return (
                <m.div
                    key={block.id}
                    variants={variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="space-y-6"
                >
                    {leadingAssets.length > 0 && <BlockVisualAssets assets={leadingAssets} isRTL={isRTL} />}
                    <BlockCallout
                        tag={componentTag}
                        title={block.title}
                        items={getBlockLearningOutcomes(block)}
                        bodyHtml={block.content}
                        translatedBodyHtml={translatedBlockContent}
                        showBilingual={showBilingual}
                        translationDir={translationDir}
                        isRTL={isRTL}
                    />
                    {trailingAssets.length > 0 && <BlockVisualAssets assets={trailingAssets} isRTL={isRTL} />}
                </m.div>
            )
        }

        // A block that would otherwise render a blank screen (unknown block_type,
        // or an AI lesson whose component generation failed).
        const showFallback =
            rendererKind === 'unknown' ||
            (rendererKind === 'text' && isBlockContentEmpty(block) && blockAssets.length === 0)

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
                {leadingAssets.length > 0 && <BlockVisualAssets assets={leadingAssets} isRTL={isRTL} />}

                {showFallback && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
                        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                        <p className="text-sm font-medium text-ds-ink dark:text-slate-200">
                            {t('blockContentUnavailable', 'This section is being prepared')}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            {t('blockContentUnavailableHint', 'Content for this step is not available yet. You can continue to the next step.')}
                        </p>
                    </div>
                )}

                {block.type === 'text' && !showFallback && (
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
                            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 ring-1 ring-amber-500/20 relative group">
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
                                    <div className="flex flex-col items-center justify-center h-full text-white/50 space-y-3">
                                        <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                            <VideoIcon className="h-8 w-8 text-amber-400 animate-pulse" />
                                        </div>
                                        <span className="text-sm font-medium font-sans">{t('videoUrlMissing')}</span>
                                    </div>
                                )}
                            </div>
                            {block.is_mandatory && (
                                <div className="flex flex-col items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 backdrop-blur-sm">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                            <Sparkles className="h-4 w-4 text-amber-500" />
                                            {completedMediaBlocks.has(block.id)
                                                ? t('videoCompleted', 'Video requirement completed')
                                                : t('videoRequired', 'Mandatory video walkthrough')}
                                        </p>
                                        <p className="text-xs text-muted-foreground font-sans">
                                            {t('videoCompletionHint', 'Watch the full video to unlock the next lesson or mark it as watched.')}
                                        </p>
                                    </div>
                                    {!completedMediaBlocks.has(block.id) && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleMarkWatched(block.id)}
                                            className="w-full sm:w-auto text-xs font-semibold border-amber-500/40 text-amber-600 hover:bg-amber-500/10 active:scale-95 transition-all"
                                        >
                                            <CheckCircle className="h-3.5 w-3.5 me-1.5" />
                                            {t('markWatched', 'Mark as watched')}
                                        </Button>
                                    )}
                                </div>
                            )}
                            {block.content && (
                                <div className="bg-card/70 p-6 rounded-2xl border border-border/60 shadow-sm backdrop-blur-sm">
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
                                        <p className="text-sm font-semibold text-ds-ink">
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
                                        <p className="text-sm font-semibold text-ds-ink">
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
                            <div className="h-12 w-12 rounded-xl bg-ds-brass/20 flex items-center justify-center">
                                <HelpCircle className="h-6 w-6 text-ds-brass" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-ds-ink leading-none mb-1">
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
                            surface="embedded"
                            onContinue={handleNext}
                            onDirtyChange={(dirty) => { quizDirtyRef.current = dirty }}
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
                                        description: t('quizScorePassedReview', {
                                            score: result.score,
                                            defaultValue: `Great job! You scored ${result.score}%. Review your answers, then continue.`
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

                {((block.type as string) === 'assignment' ||
                  (block.type as string) === 'practical' ||
                  Boolean((block.content_data as Record<string, unknown> | null)?.is_assignment) ||
                  Boolean((block.content_data as Record<string, unknown> | null)?.requires_submission)) && moduleData && (
                    <PracticalAssignmentBlockRenderer
                        block={block}
                        moduleId={moduleData.module.id}
                        assignmentId={assignmentId}
                        translatedPrompt={getAssignmentPrompt(block, translationTarget).translated}
                        showBilingual={showBilingual}
                        translationDir={translationDir}
                        initialSubmission={assignmentSubmissions[block.id]}
                        onSubmissionUpdated={(updatedSub) => {
                            setAssignmentSubmissions(prev => ({
                                ...prev,
                                [block.id]: updatedSub
                            }))
                            const reqApproval = (block.content_data as Record<string, unknown> | null)?.requires_instructor_approval !== false
                            if (updatedSub.status === 'approved' || (!reqApproval && updatedSub.status === 'submitted')) {
                                setCompletedBlocks(prev => new Set(prev).add(block.id))
                                void recordBlockCompletion(block.id)
                            }
                            scheduleProgressSave(200)
                        }}
                        isRTL={isRTL}
                    />
                )}

                {((block.type as string) === 'roleplay' ||
                  Boolean((block.content_data as Record<string, unknown> | null)?.is_roleplay) ||
                  (block.content_data as Record<string, unknown> | null)?.interactive_type === 'roleplay') && moduleData && (
                    <RoleplaySimulationBlockRenderer
                        block={block}
                        moduleId={moduleData.module.id}
                        onBlockComplete={(blockId, score) => {
                            setCompletedBlocks(prev => new Set(prev).add(blockId))
                            void recordBlockCompletion(blockId)
                            scheduleProgressSave(200)
                        }}
                        isRTL={isRTL}
                    />
                )}

                {trailingAssets.length > 0 && <BlockVisualAssets assets={trailingAssets} isRTL={isRTL} />}

            </m.div>
        )
    }

    if (isLoading) return <PlayerShellSkeleton />

    if (isError) return (
        <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-background p-6 text-center">
            <AlertCircle className="h-14 w-14 text-destructive" />
            <p className="text-xl font-medium">{t('trainingLoadFailed', 'Could not load this training')}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
                {t('trainingLoadFailedHint', 'Check your connection and try again. Your progress is safe.')}
            </p>
            <div className="flex items-center gap-2">
                <Button onClick={() => refetch()}>{t('retry', 'Retry')}</Button>
                <Button variant="link" onClick={() => navigate('/learn/my')}>{t('backToList')}</Button>
            </div>
        </div>
    )

    if (!moduleData) return (
        <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-background p-6 text-center">
            <X className="h-14 w-14 text-muted-foreground" />
            <p className="text-xl font-medium">{t('trainingNotFound')}</p>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => refetch()}>{t('retry', 'Retry')}</Button>
                <Button variant="link" onClick={() => navigate('/learn/my')}>{t('backToList')}</Button>
            </div>
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
            <PlayerCompletionView
                moduleId={moduleData.module.id}
                moduleTitle={moduleData.module.title}
                finalScore={finalScore}
                finalPassed={finalPassed}
                canViewCertificate={canViewCertificate}
                quizBreakdown={quizBreakdown}
                onViewCertificate={() => navigate('/learn/certificates')}
                onBackToMyLearning={() => navigate('/learn/my')}
            />
        )
    }

    return (
        <PlayerShell
            isRTL={isRTL}
            goNext={handleNext}
            goPrevious={handlePrevious}
            railOpen={sidebarOpen}
            onRailOpenChange={setSidebarOpen}
            contentWide
            contentClassName={cn(isZenMode && 'bg-slate-950 text-slate-100')}
            contentInnerClassName={cn(
                'flex min-h-full flex-col',
                fontSizeModifier === 'sm' ? 'text-sm' : fontSizeModifier === 'lg' ? 'text-lg' : 'text-base',
            )}
            topBar={
                <PlayerTopBar
                    title={displayModuleTitle || moduleData.module.title}
                    contextLabel={cn(
                        t('pageOf', { current: activeBlockIndex + 1, total: totalBlocks }),
                        activeBlock?.type ? `· ${activeBlock.type.replace('_', ' ')}` : '',
                    )}
                    progress={progressPercentage}
                    saveState={saveState}
                    onExit={() => navigate('/learn/my')}
                    onToggleRail={() => setSidebarOpen((o) => !o)}
                    railOpen={sidebarOpen}
                    tutor={{ active: showTutorDrawer, onToggle: () => setShowTutorDrawer((p) => !p) }}
                    tools={
                        <PlayerToolsMenu
                            fontSize={{ value: fontSizeModifier, onChange: setFontSizeModifier }}
                            focusMode={{
                                active: isZenMode,
                                onToggle: () => {
                                    setIsZenMode((p) => !p)
                                    if (!isZenMode) setSidebarOpen(false)
                                },
                            }}
                            audioNarrator={{ active: showAudioNarrator, onToggle: () => setShowAudioNarrator((p) => !p) }}
                            notes={{ active: showNotesDrawer, onToggle: () => setShowNotesDrawer((p) => !p) }}
                            translation={{
                                languages: SUPPORTED_TRANSLATION_LANGUAGES.map((l) => ({ code: l.code, label: l.label })),
                                active: translationTarget,
                                activeLabel: translationTargetMeta?.label,
                                onSelect: (code) => handleTranslate(code as TranslationTargetLanguage),
                                onClear: handleClearTranslation,
                                bilingual: showBilingual,
                                onToggleBilingual: () => setShowBilingual((p) => !p),
                                translating: isTranslating,
                            }}
                        />
                    }
                    isRTL={isRTL}
                />
            }
            rail={
                <PlayerContextRail
                    moduleTitle={displayModuleTitle || moduleData.module.title}
                    items={railItems}
                    activeIndex={activeBlockIndex}
                    onSelect={handleSelectBlock}
                    progress={progressPercentage}
                />
            }
            actionBar={
                <PlayerActionBar
                    isRTL={isRTL}
                    previousDisabled={activeBlockIndex === 0}
                    stepper={{ current: activeBlockIndex, total: totalBlocks }}
                    defaultPrimary={defaultPrimaryAction}
                />
            }
            banners={
                <>
                    {!isOnline && (
                        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 sm:px-6" role="status">
                            {t('offlineNotice', "You're offline — progress is saved on this device and will sync when you reconnect.")}
                        </div>
                    )}
                    {resumeNotice && (
                        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-800 sm:px-6" role="status">
                            {resumeNotice}
                        </div>
                    )}
                    {!isFinished && !trainingCompletion.complete && trainingCompletion.blockers.length > 0 && (() => {
                        const blocker = trainingCompletion.blockers[0]
                        const blockerIndex = moduleData.blocks.findIndex((b) => b.id === blocker.blockId)
                        const isOnBlockerAlready = blockerIndex === activeBlockIndex
                        return (
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-6" role="status">
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
                                        className="h-7 border-amber-300 text-xs text-amber-900 hover:bg-amber-100"
                                        onClick={() => setActiveBlockIndex(blockerIndex)}
                                    >
                                        {t('goToRequirement', 'Go to it')}
                                        <ChevronRight className={cn('ms-1 h-3 w-3', isRTL && 'rotate-180')} />
                                    </Button>
                                )}
                            </div>
                        )
                    })()}
                </>
            }
            overlays={
                <>
                    <PlayerTutorDrawer
                        isOpen={showTutorDrawer}
                        onClose={() => setShowTutorDrawer(false)}
                        moduleTitle={moduleData?.module?.title}
                        blockTitle={activeBlock?.title}
                        blockContentText={activeBlock?.content || ''}
                        isRTL={isRTL}
                    />
                    <PlayerNotesDrawer
                        isOpen={showNotesDrawer}
                        onClose={() => setShowNotesDrawer(false)}
                        moduleId={moduleData?.module?.id || ''}
                        moduleTitle={moduleData?.module?.title}
                        activeBlockId={activeBlock?.id}
                        activeBlockTitle={activeBlock?.title}
                        isRTL={isRTL}
                    />
                    <PlayerCelebrationModal
                        isOpen={showCelebrationModal}
                        onClose={() => setShowCelebrationModal(false)}
                        moduleTitle={moduleData?.module?.title || 'Hospitality Module'}
                        recipientName={profile?.full_name || user?.email || 'Hospitality Professional'}
                        score={completionScore}
                        passed={completionPassed}
                        timeSpentSeconds={timeSpentSeconds}
                        isRTL={isRTL}
                        onBackToDashboard={() => navigate('/learn/my')}
                    />
                </>
            }
        >
            <BlockChangeEffects blockKey={activeBlock?.id || 'no-content'} />

            {showAudioNarrator && activeBlock && (
                <div className="mb-6 -mt-2">
                    <PlayerAudioNarrator
                        text={activeBlock.content || activeBlock.title || ''}
                        title={activeBlock.title}
                        isRTL={isRTL}
                        targetLang={translationTarget}
                        onClose={() => setShowAudioNarrator(false)}
                    />
                </div>
            )}

            <SmartObserver
                className="relative flex-1"
                onFocusChange={setIsFocused}
                onIdleChange={setIsIdle}
                idleTimeoutMs={60000}
            >
                {(!isFocused || isIdle) && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 mx-auto flex w-fit items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 shadow-sm">
                        {isIdle ? <MousePointer2 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {isIdle ? t('sessionPausedIdle', 'Session Paused (Idle)') : t('sessionPausedFocus', 'Session Paused (Focus lost)')}
                    </div>
                )}

                {activeBlockIndex === 0 && !componentTagsPresent.has('objectives') && courseOutcomes.terminalObjectives.length > 0 && (
                    <BlockCallout tag="objectives" items={courseOutcomes.terminalObjectives} isRTL={isRTL} className="mb-6" />
                )}
                {isLastBlock && !componentTagsPresent.has('summary') && courseOutcomes.summaryTakeaways.length > 0 && (
                    <BlockCallout tag="summary" items={courseOutcomes.summaryTakeaways} isRTL={isRTL} className="mb-6" />
                )}

                <AnimatePresence mode="wait">
                    <m.div
                        key={activeBlock?.id || 'no-content'}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.28, ease: 'circOut' }}
                    >
                        <h2 data-player-heading tabIndex={-1} className="sr-only">
                            {activeBlock ? resolveBlockTitle(activeBlock, activeBlockIndex) : t('noContentYet', 'No Content Yet')}
                        </h2>
                        {activeBlock ? (
                            renderBlockContent(activeBlock)
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="mb-2 text-xl font-bold text-foreground">{t('noContentYet', 'No Content Yet')}</h3>
                                <p className="max-w-md text-muted-foreground">
                                    {t('moduleEmptyDescription', 'This module does not have any content blocks yet. Please add content in the Training Builder.')}
                                </p>
                            </div>
                        )}
                    </m.div>
                </AnimatePresence>

                {isLastBlock && (
                    <CourseSourceDocuments trainingModuleId={moduleData.module.id} variant="learner" className="mt-8" />
                )}

                <div className="h-8 shrink-0" />
            </SmartObserver>
        </PlayerShell>
    )
}
