import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'

import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/contexts/AuthContext'
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
    BookOpen
} from 'lucide-react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { QuizComponent } from '@/pages/learning/components/QuizComponent'
import { learningService } from '@/services/learningService'
import { skillsService } from '@/services/skillsService'
import { createCertificate, type CertificateData } from '@/lib/certificateService'
import type { TrainingModule, TrainingContentBlock } from '@/lib/types'
import { DocumentBlockRenderer } from '@/components/training/DocumentBlockRenderer'
import { cn } from '@/lib/utils'

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

    const activeBlock = moduleData?.blocks[activeBlockIndex]
    const isLastBlock = activeBlockIndex === (moduleData?.blocks.length || 0) - 1
    const progressPercentage = ((activeBlockIndex + 1) / (moduleData?.blocks.length || 1)) * 100

    const handleNext = () => {
        if (!moduleData) return

        if (activeBlock) {
            setCompletedBlocks(prev => new Set(prev).add(activeBlock.id))
        }

        if (isLastBlock) {
            handleCompleteModule()
        } else {
            setActiveBlockIndex(prev => prev + 1)
            window.scrollTo(0, 0)
        }
    }

    const handlePrevious = () => {
        setActiveBlockIndex(prev => Math.max(0, prev - 1))
    }

    const handleCompleteModule = async () => {
        if (!user || !moduleData) return

        try {
            await learningService.submitQuizProgress({
                assignment_id: assignmentId || undefined,
                content_id: moduleData.module.id,
                content_type: 'module',
                user_id: user.id,
                status: 'completed',
                progress_percentage: 100,
                passed: true,
                score_percentage: quizScore !== null ? quizScore : undefined,
                completed_at: new Date().toISOString()
            })

            try {
                await skillsService.awardModuleSkills(user.id, moduleData.module.id)
            } catch (skillError) {
                console.error('Failed to award skills:', skillError)
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
                    console.error('Certificate generation failed:', certError)
                }
            }

            setIsFinished(true)
        } catch (error) {
            console.error('Completion error:', error)
            toast({
                title: t('error'),
                description: t('failedToRecordCompletion'),
                variant: 'destructive'
            })
        }
    }

    const renderBlockContent = (block: TrainingContentBlock) => {
        const variants = {
            initial: { opacity: 0, x: isRTL ? -20 : 20 },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: isRTL ? 20 : -20 }
        }

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
                {block.type === 'text' && (
                    <div className="prose md:prose-lg max-w-none dark:prose-invert leading-relaxed">
                        <div dangerouslySetInnerHTML={{ __html: block.content }} />
                    </div>
                )}

                {block.type === 'video' && (
                    <div className="space-y-6">
                        <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 relative group">
                            {block.content_url ? (
                                <iframe
                                    src={block.content_url}
                                    className="w-full h-full"
                                    allowFullScreen
                                    title={t('videoContent')}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-white/50">
                                    <VideoIcon className="h-12 w-12 mb-4 animate-pulse" />
                                    <span>{t('videoUrlMissing')}</span>
                                </div>
                            )}
                        </div>
                        {block.content && (
                            <div className="prose prose-lg max-w-none dark:prose-invert bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <div dangerouslySetInnerHTML={{ __html: block.content }} />
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
                            <div className="prose prose-lg max-w-none dark:prose-invert">
                                <div dangerouslySetInnerHTML={{ __html: block.content }} />
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

                {block.type === 'document_link' && <DocumentBlockRenderer block={block} />}

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
                            <div className="prose prose-sm max-w-none dark:prose-invert mt-6 pt-6 border-t border-emerald-100">
                                <div dangerouslySetInnerHTML={{ __html: block.content }} />
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
                                    {moduleData.module.title}
                                </h2>
                            </div>

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
                                        {completedBlocks.has(block.id) && (
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
                        className={cn(
                            "h-10 md:h-12 px-4 md:px-8 text-sm md:text-base font-bold tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl",
                            isLastBlock
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-hotel-navy hover:bg-hotel-navy-light text-white",
                            isRTL ? "flex-row-reverse" : ""
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
