/**
 * MobileTrainingPlayer Component
 * 
 * A mobile-optimized training player with:
 * - Swipe gestures for block navigation
 * - Bottom sheet for module contents
 * - Pull-to-refresh
 * - Mobile-optimized video player
 * - Swipeable quiz interface
 * - Floating progress indicator
 * - Haptic feedback
 * - Offline progress support
 */

import { MobileHeader } from '@/components/layout/MobileHeader'
import { ActionSheet } from '@/components/mobile/ActionSheet'
import { PullToRefresh } from '@/components/mobile/PullToRefresh'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, LazyMotion, domAnimation, m, PanInfo, useAnimation } from 'framer-motion'
import {
    BookOpen,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    FileText,
    Headphones,
    Languages,
    List,
    Loader2,
    MoreVertical,
    Play,
    Trophy,
    Video
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

interface MobileTrainingPlayerProps {
    moduleId: string
    assignmentId?: string
    onComplete?: () => void
}

interface TrainingBlock {
    id: string
    type: 'text' | 'video' | 'audio' | 'quiz' | 'sop_reference' | 'document_link'
    title?: string
    content?: string
    content_url?: string
    is_mandatory?: boolean
    order: number
}

interface TrainingModule {
    id: string
    title: string
    description?: string
    status: string
    passing_score_percentage?: number
    certificate_enabled: boolean
}

/**
 * MobileTrainingPlayer - Optimized training experience for mobile
 */
export function MobileTrainingPlayer({ moduleId, assignmentId, onComplete }: MobileTrainingPlayerProps) {
    const { t } = useTranslation('training')
    const navigate = useNavigate()
    const { toast } = useToast()
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const isMobile = useIsMobile()

    // State
    const [activeBlockIndex, setActiveBlockIndex] = useState(0)
    const [completedBlocks, setCompletedBlocks] = useState<Set<string>>(new Set())
    const [isTOCOpen, setIsTOCOpen] = useState(false)
    const [isTranslating, setIsTranslating] = useState(false)
    const [showCompletionModal, setShowCompletionModal] = useState(false)
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)

    // Refs
    const contentRef = useRef<HTMLDivElement>(null)
    const controls = useAnimation()

    // Fetch module data
    const { data: moduleData, isLoading, refetch } = useQuery({
        queryKey: ['mobile-training-module', moduleId],
        queryFn: async () => {
            // Simulated API call - replace with actual Supabase query
            const response = await fetch(`/api/training/modules/${moduleId}`)
            if (!response.ok) throw new Error('Failed to load module')
            return response.json() as Promise<{ module: TrainingModule; blocks: TrainingBlock[] }>
        },
        enabled: !!moduleId
    })

    const module = moduleData?.module
    const blocks = moduleData?.blocks || []
    const activeBlock = blocks[activeBlockIndex]
    const totalBlocks = blocks.length
    const progressPercentage = totalBlocks > 0 ? Math.round(((activeBlockIndex + 1) / totalBlocks) * 100) : 0

    // Swipe handling
    const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 50
        const velocity = 0.5

        if (info.offset.x < -threshold && info.velocity.x < -velocity) {
            // Swiped left - go next
            if (activeBlockIndex < totalBlocks - 1) {
                handleNext()
                setSwipeDirection('left')
            }
        } else if (info.offset.x > threshold && info.velocity.x > velocity) {
            // Swiped right - go previous
            if (activeBlockIndex > 0) {
                handlePrevious()
                setSwipeDirection('right')
            }
        }
    }, [activeBlockIndex, totalBlocks])

    const handleNext = useCallback(() => {
        if (!activeBlock || activeBlockIndex >= totalBlocks - 1) return

        // Mark current block as completed
        setCompletedBlocks(prev => new Set(prev).add(activeBlock.id))

        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(10)
        }

        setActiveBlockIndex(prev => prev + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [activeBlock, activeBlockIndex, totalBlocks])

    const handlePrevious = useCallback(() => {
        if (activeBlockIndex <= 0) return

        if (navigator.vibrate) {
            navigator.vibrate(10)
        }

        setActiveBlockIndex(prev => prev - 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [activeBlockIndex])

    const handleBlockSelect = useCallback((index: number) => {
        setActiveBlockIndex(index)
        setIsTOCOpen(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [])

    const handleComplete = useCallback(async () => {
        if (!user || !module) return

        try {
            // Simulate completion API call
            await new Promise(resolve => setTimeout(resolve, 1000))

            setShowCompletionModal(true)
            onComplete?.()
        } catch (error) {
            toast({
                title: t('error'),
                description: t('completion_error'),
                variant: 'destructive'
            })
        }
    }, [user, module, onComplete, t, toast])

    // Pull to refresh
    const handleRefresh = useCallback(async () => {
        await refetch()
    }, [refetch])

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">{t('loading_module')}</p>
                </div>
            </div>
        )
    }

    if (!module || blocks.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-sm text-center p-6">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-lg font-semibold mb-2">{t('module_not_found')}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{t('module_not_found_desc')}</p>
                    <Button onClick={() => navigate('/training')} className="w-full">
                        {t('back_to_training')}
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <LazyMotion features={domAnimation}>
            <div className="min-h-screen bg-background">
                {/* Sticky Header */}
                <MobileHeader
                    title={module.title}
                    subtitle={`${t('block')} ${activeBlockIndex + 1} ${t('of')} ${totalBlocks}`}
                    showBack
                    actions={
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="touch-target"
                                onClick={() => setIsTOCOpen(true)}
                            >
                                <List className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="touch-target"
                                disabled={isTranslating}
                            >
                                <Languages className="h-5 w-5" />
                            </Button>
                        </div>
                    }
                />

                {/* Progress Bar */}
                <div className="sticky top-14 z-30 bg-background/95 backdrop-blur border-b">
                    <div className="flex items-center gap-3 px-4 py-2">
                        <Progress value={progressPercentage} className="flex-1 h-2" />
                        <span className="text-xs font-medium text-muted-foreground min-w-[40px]">
                            {progressPercentage}%
                        </span>
                    </div>
                </div>

                {/* Main Content */}
                <PullToRefresh onRefresh={handleRefresh}>
                    <main className="has-bottom-nav">
                        <div className="max-w-2xl mx-auto">
                            {/* Block Content with Swipe */}
                            <AnimatePresence mode="wait" initial={false}>
                                <m.div
                                    key={activeBlock?.id || 'empty'}
                                    ref={contentRef}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.2}
                                    onDragEnd={handleDragEnd}
                                    initial={{ opacity: 0, x: swipeDirection === 'left' ? 50 : -50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: swipeDirection === 'left' ? -50 : 50 }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                    className="min-h-[calc(100vh-200px)] pb-32"
                                >
                                    {activeBlock && (
                                        <div className="p-4 space-y-4">
                                            {/* Block Type Indicator */}
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <BlockTypeIcon type={activeBlock.type} />
                                                <span className="capitalize">{t(activeBlock.type)}</span>
                                                {activeBlock.is_mandatory && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {t('mandatory')}
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Block Title */}
                                            {activeBlock.title && (
                                                <h1 className="text-xl font-semibold">{activeBlock.title}</h1>
                                            )}

                                            {/* Block Content Renderer */}
                                            <MobileBlockRenderer
                                                block={activeBlock}
                                                onComplete={() => setCompletedBlocks(prev => new Set(prev).add(activeBlock.id))}
                                            />
                                        </div>
                                    )}
                                </m.div>
                            </AnimatePresence>

                            {/* Navigation Controls */}
                            <div className="fixed bottom-20 left-0 right-0 px-4 z-20">
                                <div className="flex items-center justify-between gap-3">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="flex-1 touch-target-lg"
                                        disabled={activeBlockIndex === 0}
                                        onClick={handlePrevious}
                                    >
                                        <ChevronLeft className="h-5 w-5 mr-2" />
                                        {t('previous')}
                                    </Button>

                                    {activeBlockIndex === totalBlocks - 1 ? (
                                        <Button
                                            size="lg"
                                            className="flex-1 touch-target-lg bg-primary"
                                            onClick={handleComplete}
                                        >
                                            <Trophy className="h-5 w-5 mr-2" />
                                            {t('complete')}
                                        </Button>
                                    ) : (
                                        <Button
                                            size="lg"
                                            className="flex-1 touch-target-lg bg-primary"
                                            onClick={handleNext}
                                        >
                                            {t('next')}
                                            <ChevronRight className="h-5 w-5 ml-2" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </main>
                </PullToRefresh>

                {/* Table of Contents Sheet */}
                <TOCSheet
                    isOpen={isTOCOpen}
                    onClose={() => setIsTOCOpen(false)}
                    blocks={blocks}
                    activeIndex={activeBlockIndex}
                    completedBlocks={completedBlocks}
                    onSelect={handleBlockSelect}
                />

                {/* Completion Modal */}
                <CompletionModal
                    isOpen={showCompletionModal}
                    onClose={() => {
                        setShowCompletionModal(false)
                        navigate('/training')
                    }}
                    module={module}
                />
            </div>
        </LazyMotion>
    )
}

/**
 * Block Type Icon
 */
function BlockTypeIcon({ type }: { type: TrainingBlock['type'] }) {
    switch (type) {
        case 'text':
            return <FileText className="h-4 w-4" />
        case 'video':
            return <Video className="h-4 w-4" />
        case 'audio':
            return <Headphones className="h-4 w-4" />
        case 'quiz':
            return <List className="h-4 w-4" />
        case 'sop_reference':
            return <BookOpen className="h-4 w-4" />
        default:
            return <FileText className="h-4 w-4" />
    }
}

/**
 * Mobile Block Renderer
 */
interface MobileBlockRendererProps {
    block: TrainingBlock
    onComplete: () => void
}

function MobileBlockRenderer({ block, onComplete }: MobileBlockRendererProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const video = videoRef.current
        if (!video || block.type !== 'video') return

        const handleTimeUpdate = () => {
            const percent = (video.currentTime / video.duration) * 100
            setProgress(percent)

            if (percent >= 90 && block.is_mandatory) {
                onComplete()
            }
        }

        video.addEventListener('timeupdate', handleTimeUpdate)
        return () => video.removeEventListener('timeupdate', handleTimeUpdate)
    }, [block, onComplete])

    switch (block.type) {
        case 'text':
            return (
                <Card className="overflow-hidden">
                    <CardContent className="p-4 prose prose-sm max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: block.content || '' }} />
                    </CardContent>
                </Card>
            )

        case 'video':
            return (
                <div className="space-y-3">
                    <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                        {block.content_url ? (
                            <video
                                ref={videoRef}
                                src={block.content_url}
                                className="w-full h-full"
                                controls
                                playsInline
                                preload="metadata"
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-white/50">
                                <Video className="h-16 w-16" />
                            </div>
                        )}
                    </div>

                    {/* Mobile Video Progress */}
                    {block.is_mandatory && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                    Watch progress
                                </span>
                                <span className="font-medium">
                                    {Math.round(progress)}%
                                </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            {progress < 90 && (
                                <p className="text-xs text-amber-600 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Watch 90% to continue
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )

        case 'audio':
            return (
                <Card className="p-4">
                    <audio
                        src={block.content_url}
                        className="w-full"
                        controls
                        preload="metadata"
                    />
                </Card>
            )

        case 'quiz':
            return (
                <MobileQuizBlock
                    block={block}
                    onComplete={onComplete}
                />
            )

        default:
            return (
                <Card className="p-4">
                    <p className="text-muted-foreground">
                        This content type is not supported on mobile yet.
                    </p>
                </Card>
            )
    }
}

/**
 * Mobile Quiz Block
 */
interface MobileQuizBlockProps {
    block: TrainingBlock
    onComplete: () => void
}

function MobileQuizBlock({ block, onComplete }: MobileQuizBlockProps) {
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState<Record<number, string>>({})
    const [showResults, setShowResults] = useState(false)

    // Mock questions - replace with actual data
    const questions = [
        {
            id: 1,
            text: 'What is the primary purpose of this training?',
            options: [
                { id: 'a', text: 'To understand safety procedures' },
                { id: 'b', text: 'To learn about company history' },
                { id: 'c', text: 'To improve customer service' },
            ],
            correctAnswer: 'a'
        },
        {
            id: 2,
            text: 'Which of the following is NOT a key principle?',
            options: [
                { id: 'a', text: 'Safety first' },
                { id: 'b', text: 'Customer satisfaction' },
                { id: 'c', text: 'Ignore feedback' },
            ],
            correctAnswer: 'c'
        }
    ]

    const handleAnswer = (questionId: number, answerId: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: answerId }))
    }

    const handleSubmit = () => {
        setShowResults(true)
        onComplete()
    }

    if (showResults) {
        const score = Object.entries(answers).filter(([qId, aId]) => {
            const q = questions.find(q => q.id === parseInt(qId))
            return q?.correctAnswer === aId
        }).length

        return (
            <Card className="p-6 text-center">
                <Trophy className="h-16 w-16 mx-auto text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Quiz Complete!</h3>
                <p className="text-3xl font-bold text-primary mb-2">
                    {score} / {questions.length}
                </p>
                <p className="text-muted-foreground">
                    {score === questions.length ? 'Perfect score!' : 'Good effort!'}
                </p>
            </Card>
        )
    }

    const currentQ = questions[currentQuestion]
    const isLastQuestion = currentQuestion === questions.length - 1
    const hasAnswered = answers[currentQ.id] !== undefined

    return (
        <div className="space-y-4">
            {/* Question Progress */}
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                    Question {currentQuestion + 1} of {questions.length}
                </span>
                <Progress 
                    value={((currentQuestion + 1) / questions.length) * 100} 
                    className="w-24 h-2" 
                />
            </div>

            {/* Question Card */}
            <Card className="p-4">
                <h3 className="text-lg font-medium mb-4">{currentQ.text}</h3>
                <div className="space-y-2">
                    {currentQ.options.map(option => (
                        <button
                            key={option.id}
                            onClick={() => handleAnswer(currentQ.id, option.id)}
                            className={cn(
                                'w-full p-4 rounded-lg text-left border-2 transition-all',
                                'touch-target',
                                answers[currentQ.id] === option.id
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                                    answers[currentQ.id] === option.id
                                        ? 'border-primary'
                                        : 'border-muted-foreground'
                                )}>
                                    {answers[currentQ.id] === option.id && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                    )}
                                </div>
                                <span>{option.text}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </Card>

            {/* Navigation */}
            <div className="flex gap-3">
                {currentQuestion > 0 && (
                    <Button
                        variant="outline"
                        className="flex-1 touch-target"
                        onClick={() => setCurrentQuestion(prev => prev - 1)}
                    >
                        Previous
                    </Button>
                )}
                {isLastQuestion ? (
                    <Button
                        className="flex-1 touch-target"
                        disabled={!hasAnswered}
                        onClick={handleSubmit}
                    >
                        Submit Quiz
                    </Button>
                ) : (
                    <Button
                        className="flex-1 touch-target"
                        disabled={!hasAnswered}
                        onClick={() => setCurrentQuestion(prev => prev + 1)}
                    >
                        Next Question
                    </Button>
                )}
            </div>
        </div>
    )
}

/**
 * Table of Contents Sheet
 */
interface TOCSheetProps {
    isOpen: boolean
    onClose: () => void
    blocks: TrainingBlock[]
    activeIndex: number
    completedBlocks: Set<string>
    onSelect: (index: number) => void
}

function TOCSheet({ isOpen, onClose, blocks, activeIndex, completedBlocks, onSelect }: TOCSheetProps) {
    return (
        <ActionSheet
            open={isOpen}
            onOpenChange={onClose}
            title="Module Contents"
            description="Jump to any section"
        >
            <div className="space-y-1 py-2">
                {blocks.map((block, index) => {
                    const isActive = index === activeIndex
                    const isCompleted = completedBlocks.has(block.id)

                    return (
                        <button
                            key={block.id}
                            onClick={() => onSelect(index)}
                            className={cn(
                                'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                                'touch-target',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : isCompleted
                                        ? 'text-green-600 hover:bg-green-50'
                                        : 'hover:bg-muted'
                            )}
                        >
                            <div className="shrink-0">
                                {isCompleted ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                    <span className={cn(
                                        'w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs',
                                        isActive ? 'border-current' : 'border-muted-foreground'
                                    )}>
                                        {index + 1}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                    {block.title || `${block.type} Block`}
                                </p>
                                <p className={cn(
                                    'text-xs capitalize',
                                    isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                )}>
                                    {block.type}
                                </p>
                            </div>
                        </button>
                    )
                })}
            </div>
        </ActionSheet>
    )
}

/**
 * Completion Modal
 */
interface CompletionModalProps {
    isOpen: boolean
    onClose: () => void
    module: TrainingModule
}

function CompletionModal({ isOpen, onClose, module }: CompletionModalProps) {
    if (!isOpen) return null

    return (
        <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <m.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-background rounded-2xl p-6 max-w-sm w-full text-center"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-xl font-bold mb-2">Module Complete!</h2>
                <p className="text-muted-foreground mb-6">
                    You've successfully completed {module.title}
                </p>
                <div className="space-y-2">
                    <Button onClick={onClose} className="w-full">
                        Continue Learning
                    </Button>
                    {module.certificate_enabled && (
                        <Button variant="outline" className="w-full">
                            <Download className="h-4 w-4 mr-2" />
                            View Certificate
                        </Button>
                    )}
                </div>
            </m.div>
        </m.div>
    )
}
