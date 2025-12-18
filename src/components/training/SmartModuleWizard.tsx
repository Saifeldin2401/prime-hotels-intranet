/**
 * SmartModuleWizard
 * 
 * Step-by-step wizard for creating training modules with AI assistance.
 * Steps: Select Topic/Documents → AI Generates Outline → Review & Create
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    ArrowLeft,
    ArrowRight,
    Sparkles,
    FileText,
    CheckCircle,
    Loader2,
    Lightbulb,
    BookOpen,
    Clock,
    Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAITrainingContent } from '@/hooks/training/useAITrainingContent'
import { useAuth } from '@/hooks/useAuth'

interface SmartModuleWizardProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onModuleCreated?: (moduleId: string) => void
}

type WizardStep = 'topic' | 'documents' | 'outline' | 'review'

interface ModuleOutline {
    title: string
    description: string
    category: string
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    estimatedDuration: string
    sections: {
        title: string
        type: string
        description: string
        suggestedContent?: string
    }[]
}

const CATEGORIES = [
    'Front Office',
    'Housekeeping',
    'Food & Beverage',
    'Maintenance',
    'Security',
    'Human Resources',
    'Sales & Marketing',
    'Management',
    'Safety & Compliance',
    'Customer Service',
    'General'
]

export function SmartModuleWizard({ open, onOpenChange, onModuleCreated }: SmartModuleWizardProps) {
    const navigate = useNavigate()
    const { profile } = useAuth()
    const { generateFullModuleContent, generating, progress } = useAITrainingContent()

    const [step, setStep] = useState<WizardStep>('topic')
    const [topic, setTopic] = useState('')
    const [category, setCategory] = useState('')
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
    const [outline, setOutline] = useState<ModuleOutline | null>(null)
    const [creating, setCreating] = useState(false)
    const [aiLanguage, setAiLanguage] = useState('English')

    // Fetch documents for selection
    const { data: documents, isLoading: loadingDocs, error: docsError } = useQuery({
        queryKey: ['documents-for-wizard'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('documents')
                .select('id, title, description, content_type')
                .in('status', ['PUBLISHED', 'APPROVED'])
                .order('title')
            if (error) {
                console.error('Documents query error:', error)
                throw error
            }
            console.log('Documents fetched:', data)
            return data || []
        },
        enabled: open
    })

    // Reset on close
    useEffect(() => {
        if (!open) {
            setStep('topic')
            setTopic('')
            setCategory('')
            setSelectedDocIds([])
            setOutline(null)
        }
    }, [open])

    const handleDocToggle = (docId: string) => {
        setSelectedDocIds(prev =>
            prev.includes(docId)
                ? prev.filter(id => id !== docId)
                : [...prev, docId]
        )
    }

    const handleGenerateOutline = async () => {
        const result = await generateFullModuleContent(topic, selectedDocIds, category || 'General', aiLanguage)
        if (result) {
            setOutline({
                title: result.title || topic,
                description: result.description || `Training module for ${topic}`,
                category: category || 'General',
                difficulty: 'beginner',
                estimatedDuration: result.estimatedDuration || '30 minutes',
                sections: result.sections.map(s => ({
                    title: s.title,
                    type: s.type,
                    description: s.description,
                    suggestedContent: s.content
                }))
            })
            setStep('outline')
        }
    }

    const handleCreateModule = async () => {
        if (!outline) return

        try {
            setCreating(true)

            // Create the training module
            const { data: module, error: moduleError } = await supabase
                .from('training_modules')
                .insert({
                    title: outline.title,
                    description: outline.description,
                    category: outline.category,
                    difficulty_level: outline.difficulty,
                    estimated_duration: outline.estimatedDuration,
                    status: 'draft',
                    created_by: profile?.id,
                    updated_by: profile?.id
                })
                .select()
                .single()

            if (moduleError) throw moduleError

            // First, check if we need to create a quiz and create it before content blocks
            const hasQuizSection = outline.sections.some(s =>
                s.type === 'quiz' || s.type === 'inline_quiz' || s.title.toLowerCase().includes('knowledge')
            )

            let createdQuizId: string | null = null

            if (hasQuizSection) {
                // Create the learning quiz FIRST
                const { data: quiz, error: quizError } = await supabase
                    .from('learning_quizzes')
                    .insert({
                        title: `${outline.title} - Knowledge Check`,
                        description: `Assessment quiz for the ${outline.title} training module`,
                        training_module_id: module.id,
                        time_limit_minutes: 10,
                        passing_score_percentage: 80,
                        max_attempts: 3,
                        randomize_questions: true,
                        show_feedback_during: true,
                        status: 'published',
                        created_by: profile?.id
                    })
                    .select()
                    .single()

                if (!quizError && quiz) {
                    createdQuizId = quiz.id

                    // Generate quiz questions based on the topic
                    const defaultQuestions = [
                        {
                            text: `What is the primary purpose of ${topic}?`,
                            type: 'mcq' as const,
                            options: [
                                { text: 'To improve guest satisfaction', correct: true },
                                { text: 'To reduce costs', correct: false },
                                { text: 'To simplify operations', correct: false },
                                { text: 'To meet legal requirements', correct: false }
                            ],
                            explanation: `The primary purpose of ${topic} is to ensure excellent guest experiences and maintain high service standards.`
                        },
                        {
                            text: `Which of the following is a best practice for ${topic}?`,
                            type: 'mcq' as const,
                            options: [
                                { text: 'Following established procedures consistently', correct: true },
                                { text: 'Taking shortcuts when busy', correct: false },
                                { text: 'Skipping steps for repeat guests', correct: false },
                                { text: 'Delegating all tasks to others', correct: false }
                            ],
                            explanation: `Consistency in following established procedures for ${topic} ensures quality and guest satisfaction.`
                        },
                        {
                            text: `It is important to follow the standard operating procedures for ${topic}.`,
                            type: 'true_false' as const,
                            options: [
                                { text: 'True', correct: true },
                                { text: 'False', correct: false }
                            ],
                            explanation: `Standard operating procedures for ${topic} ensure consistency, quality, and compliance across all operations.`
                        },
                        {
                            text: `When should you ask your supervisor for guidance regarding ${topic}?`,
                            type: 'mcq' as const,
                            options: [
                                { text: 'When you are unsure about the correct procedure', correct: true },
                                { text: 'Only when something goes wrong', correct: false },
                                { text: 'Never - you should figure it out yourself', correct: false },
                                { text: 'Only during training periods', correct: false }
                            ],
                            explanation: `Always seek guidance when uncertain about ${topic} to ensure correct procedures are followed.`
                        },
                        {
                            text: `Guest confidentiality should be maintained at all times when handling ${topic}.`,
                            type: 'true_false' as const,
                            options: [
                                { text: 'True', correct: true },
                                { text: 'False', correct: false }
                            ],
                            explanation: `Maintaining guest confidentiality is a fundamental principle of hospitality, especially regarding ${topic}.`
                        }
                    ]

                    // Insert questions into knowledge_questions
                    for (let i = 0; i < defaultQuestions.length; i++) {
                        const q = defaultQuestions[i]
                        const { data: question, error: questionError } = await supabase
                            .from('knowledge_questions')
                            .insert({
                                question_text: q.text,
                                question_type: q.type,
                                difficulty_level: 'easy',
                                correct_answer: q.options.find(o => o.correct)?.text || '',
                                explanation: q.explanation,
                                training_module_id: module.id,
                                points: 2,
                                estimated_time_seconds: 60,
                                ai_generated: true,
                                status: 'published',
                                created_by: profile?.id
                            })
                            .select()
                            .single()

                        if (!questionError && question) {
                            const options = q.options.map((opt, optIndex) => ({
                                question_id: question.id,
                                option_text: opt.text,
                                is_correct: opt.correct,
                                display_order: optIndex + 1
                            }))

                            await supabase
                                .from('knowledge_question_options')
                                .insert(options)

                            // Link question to quiz
                            await supabase
                                .from('learning_quiz_questions')
                                .insert({
                                    quiz_id: quiz.id,
                                    question_id: question.id,
                                    display_order: i + 1,
                                    points_override: 2
                                })
                        }
                    }
                }
            }

            // Create content blocks for each section with meaningful content
            // Now we include the quiz_id in content_data for quiz sections
            const contentBlocks = outline.sections.map((section, index) => {
                let content = section.suggestedContent || ''
                const isQuizSection = section.type === 'quiz' || section.type === 'inline_quiz' ||
                    section.title.toLowerCase().includes('knowledge')

                // Generate default content based on section type/title
                if (!content) {
                    if (section.title.toLowerCase().includes('introduction')) {
                        content = `<h2>Learning Objectives</h2>
<p>By the end of this module, you will:</p>
<ul>
<li>Understand the key concepts of ${outline.title}</li>
<li>Be able to apply these concepts in your daily work</li>
<li>Know the best practices and procedures</li>
</ul>
<h2>Overview</h2>
<p>${outline.description}</p>`
                    } else if (isQuizSection) {
                        content = `<h2>Knowledge Check</h2>
<p>Test your understanding of the material covered in this training module.</p>
<p>This quiz contains 5 questions and requires an 80% passing score.</p>`
                    } else {
                        content = `<h2>${section.title}</h2>
<p>${section.description || 'This section covers important training content.'}</p>
<p><em>Content to be added by the training administrator.</em></p>`
                    }
                }

                return {
                    training_module_id: module.id,
                    type: isQuizSection ? 'quiz' : 'text',
                    title: section.title,
                    content: content,
                    order: index + 1,
                    ai_generated: true,
                    duration_seconds: isQuizSection ? 300 : 600,
                    points: isQuizSection ? 10 : 0,
                    // Link the quiz to this content block via content_data
                    content_data: isQuizSection && createdQuizId ? { quiz_id: createdQuizId } : {}
                }
            })

            await supabase
                .from('training_content_blocks')
                .insert(contentBlocks)

            // Link selected documents as resources
            if (selectedDocIds.length > 0) {
                const resources = selectedDocIds.map((docId, index) => ({
                    training_module_id: module.id,
                    resource_type: 'document',
                    resource_id: docId,
                    title: documents?.find(d => d.id === docId)?.title || 'Document',
                    display_order: index + 1,
                    is_required: false
                }))

                await supabase
                    .from('training_module_resources')
                    .insert(resources)
            }


            onOpenChange(false)
            onModuleCreated?.(module.id)
            navigate(`/training/builder/${module.id}`)

        } catch (error) {
            console.error('Module creation error:', error)
        } finally {
            setCreating(false)
        }
    }

    const getStepProgress = () => {
        switch (step) {
            case 'topic': return 25
            case 'documents': return 50
            case 'outline': return 75
            case 'review': return 100
        }
    }

    const renderStep = () => {
        switch (step) {
            case 'topic':
                return (
                    <div className="space-y-6 py-4">
                        <div className="text-center mb-6">
                            <Lightbulb className="h-12 w-12 mx-auto text-hotel-gold mb-3" />
                            <h3 className="text-lg font-medium">What do you want to train on?</h3>
                            <p className="text-sm text-gray-500">Enter a topic and we'll help you build a training module</p>
                        </div>

                        <div>
                            <Label>Training Topic</Label>
                            <Input
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g., Guest Check-in Procedures, Fire Safety, Customer Service Excellence"
                                className="text-lg py-6"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Category</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Content Language</Label>
                                <Select value={aiLanguage} onValueChange={setAiLanguage}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="English">English Only</SelectItem>
                                        <SelectItem value="Arabic">Arabic Only</SelectItem>
                                        <SelectItem value="English and Arabic">Bilingual (En/Ar)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )

            case 'documents':
                return (
                    <div className="space-y-4 py-4">
                        <div className="text-center mb-4">
                            <FileText className="h-10 w-10 mx-auto text-hotel-navy mb-2" />
                            <h3 className="text-lg font-medium">Select Reference Documents</h3>
                            <p className="text-sm text-gray-500">
                                Choose documents to include in your training (optional)
                            </p>
                        </div>

                        <ScrollArea className="h-[300px] border rounded-lg p-2">
                            {loadingDocs ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                                    Loading documents...
                                </div>
                            ) : docsError ? (
                                <div className="text-center py-8 text-red-500">
                                    Error loading documents
                                </div>
                            ) : !documents || documents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No published documents available
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {documents?.map(doc => (
                                        <div
                                            key={doc.id}
                                            className={cn(
                                                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                                selectedDocIds.includes(doc.id)
                                                    ? "border-hotel-gold bg-hotel-gold/5"
                                                    : "border-gray-100 hover:border-gray-200"
                                            )}
                                            onClick={() => handleDocToggle(doc.id)}
                                        >
                                            <Checkbox
                                                checked={selectedDocIds.includes(doc.id)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{doc.title}</p>
                                                {doc.description && (
                                                    <p className="text-xs text-gray-500 line-clamp-2">
                                                        {doc.description}
                                                    </p>
                                                )}
                                                <Badge variant="outline" className="mt-1 text-xs">
                                                    {doc.content_type}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>

                        {selectedDocIds.length > 0 && (
                            <p className="text-sm text-gray-600">
                                {selectedDocIds.length} document(s) selected
                            </p>
                        )}
                    </div>
                )

            case 'outline':
                return (
                    <div className="space-y-4 py-4">
                        <div className="text-center mb-4">
                            <Target className="h-10 w-10 mx-auto text-green-600 mb-2" />
                            <h3 className="text-lg font-medium">Review Module Outline</h3>
                            <p className="text-sm text-gray-500">
                                AI has generated an outline based on your topic
                            </p>
                        </div>

                        {outline && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Title</Label>
                                        <Input
                                            value={outline.title}
                                            onChange={(e) => setOutline({ ...outline, title: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Duration</Label>
                                        <Input
                                            value={outline.estimatedDuration}
                                            onChange={(e) => setOutline({ ...outline, estimatedDuration: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label>Description</Label>
                                    <Textarea
                                        value={outline.description}
                                        onChange={(e) => setOutline({ ...outline, description: e.target.value })}
                                        rows={2}
                                    />
                                </div>

                                <div>
                                    <Label>Sections</Label>
                                    <div className="space-y-2 mt-2">
                                        {outline.sections.map((section, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                            >
                                                <span className="text-sm font-medium text-gray-500 w-6">
                                                    {index + 1}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">{section.title}</p>
                                                    <p className="text-xs text-gray-500">{section.description}</p>
                                                </div>
                                                <Badge variant="outline">{section.type}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )

            case 'review':
                return (
                    <div className="space-y-4 py-4">
                        <div className="text-center">
                            <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-3" />
                            <h3 className="text-lg font-medium">Ready to Create!</h3>
                            <p className="text-sm text-gray-500">
                                Your training module will be created as a draft
                            </p>
                        </div>

                        {outline && (
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-hotel-navy" />
                                    <span className="font-medium">{outline.title}</span>
                                </div>
                                <p className="text-sm text-gray-600">{outline.description}</p>
                                <div className="flex gap-3 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        {outline.estimatedDuration}
                                    </span>
                                    <span>{outline.sections.length} sections</span>
                                    {selectedDocIds.length > 0 && (
                                        <span>{selectedDocIds.length} linked documents</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )
        }
    }

    const canProceed = () => {
        switch (step) {
            case 'topic': return topic.trim().length > 3
            case 'documents': return true
            case 'outline': return outline !== null
            case 'review': return true
        }
    }

    const handleNext = async () => {
        switch (step) {
            case 'topic':
                setStep('documents')
                break
            case 'documents':
                await handleGenerateOutline()
                break
            case 'outline':
                setStep('review')
                break
            case 'review':
                await handleCreateModule()
                break
        }
    }

    const handleBack = () => {
        switch (step) {
            case 'documents': setStep('topic'); break
            case 'outline': setStep('documents'); break
            case 'review': setStep('outline'); break
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-hotel-gold" />
                        Smart Module Wizard
                    </DialogTitle>
                </DialogHeader>

                <Progress value={getStepProgress()} className="h-2" />

                {generating && (
                    <div className="flex items-center justify-center gap-3 py-4 text-hotel-navy">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm font-medium">{progress || 'Generating content...'}</span>
                    </div>
                )}

                {renderStep()}

                <div className="flex justify-between pt-4 border-t">
                    {step !== 'topic' ? (
                        <Button variant="outline" onClick={handleBack} disabled={generating || creating}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    ) : (
                        <div />
                    )}

                    <Button
                        onClick={handleNext}
                        disabled={!canProceed() || generating || creating}
                    >
                        {generating || creating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {generating ? 'Generating...' : 'Creating...'}
                            </>
                        ) : step === 'review' ? (
                            <>
                                Create Module
                                <CheckCircle className="h-4 w-4 ml-2" />
                            </>
                        ) : step === 'documents' ? (
                            <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate Outline
                            </>
                        ) : (
                            <>
                                Next
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
