import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

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
    X
} from 'lucide-react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { QuizComponent } from '@/pages/learning/components/QuizComponent'
import { learningService } from '@/services/learningService'
import { skillsService } from '@/services/skillsService'
import { createCertificate, type CertificateData } from '@/lib/certificateService'
import type { TrainingModule, TrainingContentBlock } from '@/lib/types'
import { DocumentBlockRenderer } from '@/components/training/DocumentBlockRenderer'

export default function TrainingPlayer() {
    const { t } = useTranslation('training')
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
    const [quizScore, setQuizScore] = useState<number | null>(null) // Track embedded quiz score

    // Fetch Module and Blocks
    const { data: moduleData, isLoading } = useQuery({
        queryKey: ['training-module-full', id],
        queryFn: async () => {
            if (!id) throw new Error('No ID')

            // Fetch Module
            const { data: module, error: moduleError } = await supabase
                .from('training_modules')
                .select('*')
                .eq('id', id)
                .single()

            if (moduleError) throw moduleError

            // Fetch Blocks
            const { data: blocks, error: blocksError } = await supabase
                .from('training_content_blocks')
                .select('*')
                .eq('training_module_id', id)
                .order('order', { ascending: true })

            if (blocksError) throw blocksError

            // Fetch Linked Quiz ID (Standalone Certification)
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

    // Fetch Progress (Recycle existing or create new)
    useQuery({
        queryKey: ['training-progress', id],
        queryFn: async () => {
            if (!id || !user) return null
            // This is just to check previous completion, actual logic handled locally for session
            // In a real app, we'd sync block progress to DB. 
            // For now, we assume simple "start to finish" session or rely on assignment status.
            return null
        },
        enabled: !!id && !!user
    })

    const activeBlock = moduleData?.blocks[activeBlockIndex]
    const isLastBlock = activeBlockIndex === (moduleData?.blocks.length || 0) - 1
    const progressPercentage = ((activeBlockIndex + 1) / (moduleData?.blocks.length || 1)) * 100

    const handleNext = () => {
        if (!moduleData) return

        // Mark current as completed locally
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
            // Register completion in learning_progress
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

            // Award Skills
            try {
                await skillsService.awardModuleSkills(user.id, moduleData.module.id)
            } catch (skillError) {
                console.error('Failed to award skills:', skillError)
                // Don't fail the module completion
            }

            // 🏆 AUTO-GENERATE CERTIFICATE for 100% quiz score in training module!
            if (quizScore === 100 && user && moduleData.module) {
                try {
                    const certificateData: CertificateData = {
                        userId: user.id,
                        recipientName: profile?.full_name || user.email || 'Training Participant',
                        recipientEmail: user.email,
                        certificateType: 'training',
                        title: moduleData.module.title,
                        description: `Successfully completed ${moduleData.module.title} with a perfect score.`,
                        completionDate: new Date(),
                        score: 100,
                        trainingModuleId: moduleData.module.id
                    }

                    const certificate = await createCertificate(certificateData)

                    if (certificate) {
                        toast({
                            title: '🏆 Certificate Earned!',
                            description: t('certificateEarned', { moduleName: moduleData.module.title }),
                            variant: 'default'
                        })
                    }
                } catch (certError) {
                    console.error('Certificate generation failed:', certError)
                    // Don't fail the module completion if certificate fails
                }
            }

            toast({
                title: t('trainingCompleted'),
                description: t('trainingCompletedDescription'),
                variant: 'default'
            })

            // If there's a linked quiz, ask if they want to take it now
            if (moduleData.linkedQuizId) {
                if (window.confirm("Module Completed! Would you like to take the certification quiz now?")) {
                    navigate(`/learning/quizzes/${moduleData.linkedQuizId}/take`)
                    return
                }
            }

            navigate('/learning/my')

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
        switch (block.type) {
            case 'text':
                return (
                    <div className="prose max-w-none dark:prose-invert">
                        <div dangerouslySetInnerHTML={{ __html: block.content }} />
                    </div>
                )
            case 'video':
                // Check if it's an embed URL or direct file (simplified)
                return (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                        {block.content_url ? (
                            <iframe
                                src={block.content_url}
                                className="w-full h-full"
                                allowFullScreen
                                title={t('videoContent')}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-white">{t('videoUrlMissing')}</div>
                        )}
                        <div className="mt-4 prose max-w-none dark:prose-invert">
                            <div dangerouslySetInnerHTML={{ __html: block.content }} />
                        </div>
                    </div>
                )
            case 'image':
                return (
                    <div className="space-y-4">
                        {block.content_url && (
                            <img
                                src={block.content_url}
                                alt={t('content')}
                                className="rounded-lg shadow-md max-h-[600px] w-auto mx-auto"
                            />
                        )}
                        <div className="prose max-w-none dark:prose-invert">
                            <div dangerouslySetInnerHTML={{ __html: block.content }} />
                        </div>
                    </div>
                )
            case 'quiz':
                const quizId = block.content_data?.quiz_id as string
                if (!quizId) return <div className="text-red-500">{t('quizConfigurationMissing')}</div>

                return (
                    <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-purple-600" />
                            {t('knowledgeCheck')}
                        </h3>
                        {/* We use QuizComponent but we handle completion differently */}
                        <QuizComponent
                            quizId={quizId}
                            assignmentId={assignmentId} // Pass assignment so actual quiz progress is tracked too? 
                            // If we pass assignmentId, the quiz result overwrites the module result? 
                            // Only if they share the same assignment record. 
                            // Usually a module assignment is one thing. The embedded quiz is a sub-part.
                            // We probably shouldn't pass assignmentId to simple embedded quizzes unless we want them to count as the assignment itself.
                            // BUT, the user might want the quiz score to be the module score.
                            // For now, let's NOT pass assignmentId to embedded quiz to avoid overwriting the 'module' progress with 'quiz' progress type.
                            // Just let the quiz be a "check".
                            onComplete={(result) => {
                                // Track the quiz score for certificate generation
                                setQuizScore(result.score)

                                if (result.passed) {
                                    toast({ title: t('moduleQuizPassed'), description: t('quizScoreProceed', { score: result.score }) })
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
                )
            case 'document_link':
                return <DocumentBlockRenderer block={block} />
            case 'sop_reference':
                const sopId = block.content_data?.sop_id as string
                if (!sopId) return <div className="text-red-500">{t('sopReferenceNotConfigured')}</div>

                // Note: For a full implementation, we would fetch SOP content here.
                // Currently showing a placeholder with a link.
                return (
                    <div className="p-6 border rounded-lg bg-emerald-50 flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                            <LinkIcon className="h-5 w-5" />
                            {t('sopReference')}
                        </div>
                        <p className="text-sm text-gray-600">
                            {t('thisSectionReferencesSop', { sopId })}
                            <a
                                href={`/documents/${sopId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 text-emerald-600 underline"
                            >
                                {t('viewSop')}
                            </a>
                        </p>
                        {/* Render any additional content/notes stored with this block */}
                        {block.content && (
                            <div className="prose max-w-none dark:prose-invert mt-2 text-sm">
                                <div dangerouslySetInnerHTML={{ __html: block.content }} />
                            </div>
                        )}
                    </div>
                )
            default:
                return <div>{t('unknownContentType')}</div>
        }
    }

    if (isLoading) return <div className="flex justify-center p-20">{t('loadingTraining')}</div>
    if (!moduleData) return <div className="p-20 text-center">{t('trainingNotFound')}</div>

    return (
        <div className="flex h-[calc(100vh-4rem)]">
            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 border-r bg-slate-50 relative overflow-hidden flex flex-col`}>
                <div className="p-4 border-b bg-white">
                    <h2 className="font-semibold line-clamp-1">{moduleData.module.title}</h2>
                    <Progress value={progressPercentage} className="h-2 mt-4" />
                    <p className="text-xs text-muted-foreground mt-2 text-right">
                        {Math.round(progressPercentage)}% {t('complete')}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-2">
                        {moduleData.blocks.map((block, idx) => (
                            <button
                                key={block.id}
                                onClick={() => setActiveBlockIndex(idx)}
                                className={`w-full text-left p-3 rounded-md text-sm transition-colors flex items-start gap-3
                                    ${idx === activeBlockIndex ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-gray-100 text-slate-600'}
                                `}
                            >
                                <div className="mt-0.5 shrink-0">
                                    {block.type === 'video' && <PlayCircle className="w-4 h-4" />}
                                    {block.type === 'quiz' && <HelpCircle className="w-4 h-4" />}
                                    {block.type === 'image' && <ImageIcon className="w-4 h-4" />}
                                    {block.type === 'text' && <FileText className="w-4 h-4" />}
                                </div>
                                <span className="line-clamp-2">
                                    {/* We don't have titles for blocks in standard schema, using content snippet or type */}
                                    {t('block', { number: idx + 1 })}
                                </span>
                                {completedBlocks.has(block.id) && (
                                    <CheckCircle className="w-4 h-4 text-green-500 ml-auto shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                <div className="h-16 border-b flex items-center px-6 justify-between shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                    <div className="font-medium text-lg">
                        {t('pageOf', { current: activeBlockIndex + 1, total: moduleData.blocks.length })}
                    </div>
                    <Button variant="ghost" onClick={() => navigate('/learning/my')}>
                        {t('exitTraining')}
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto p-8 lg:p-12">
                        <Card className="shadow-none border-0">
                            <CardContent className="p-0">
                                {activeBlock && renderBlockContent(activeBlock)}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="h-20 border-t flex items-center justify-between px-8 bg-slate-50 shrink-0">
                    <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={activeBlockIndex === 0}
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" /> {t('previous')}
                    </Button>

                    <Button
                        onClick={handleNext}
                        className={isLastBlock ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                        {isLastBlock ? t('finishTraining') : t('next')}
                        {!isLastBlock && <ChevronRight className="ml-2 h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
    )
}
