/**
 * SmartModuleWizard
 * 
 * Step-by-step wizard for creating training modules with AI assistance.
 * Steps: Select Topic/Documents → AI Generates Outline → Configure Course → Review & Create
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useAITrainingContent, type CourseConfiguration } from '@/hooks/training/useAITrainingContent'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import * as QuestionService from '@/services/questionService'
import { useQuery } from '@tanstack/react-query'
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CheckCircle,
    Clock,
    FileText,
    Lightbulb,
    Loader2,
    Sparkles,
    Target,
    Settings,
    Users,
    Award,
    Calendar,
    Bell,
    Shield,
    GraduationCap,
    ListChecks
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface SmartModuleWizardProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onModuleCreated?: (moduleId: string) => void
}

type WizardStep = 'topic' | 'documents' | 'outline' | 'configure' | 'review'

interface ModuleOutline {
    title: string
    description: string
    category: string
    difficulty: 'easy' | 'medium' | 'hard'
    estimatedDuration: string
    suggestedQuizQuestions?: number
    sections: {
        title: string
        type: string
        description: string
        suggestedContent?: string
    }[]
}

// Course Configuration Interface
interface CourseSetupConfig {
    // Assignment Rules
    assignmentType: 'manual' | 'auto_assign' | 'onboarding' | 'role_based'
    targetDepartments: string[]
    targetRoles: string[]
    assignToAll: boolean
    
    // Completion Rules
    requireQuiz: boolean
    requireAllSections: boolean
    minQuizScore: number
    maxQuizAttempts: number
    timeLimitMinutes: number
    allowRetake: boolean
    
    // Certificate Settings
    issueCertificate: boolean
    certificateTemplate: string
    validityPeriod: 'no_expiration' | '1_year' | '2_years' | '3_years' | '5_years' | null
    
    // Due Date & Scheduling
    hasDueDate: boolean
    dueDaysAfterAssignment: number
    validFrom: string | null
    expiresAt: string | null
    
    // Automation
    sendReminders: boolean
    reminderDays: number[]
    autoEscalate: boolean
    escalationDays: number
    
    // Prerequisites
    requirePrerequisites: boolean
    prerequisiteModules: string[]
    
    // Advanced Settings
    isMandatory: boolean
    priority: 'low' | 'normal' | 'high' | 'compliance'
    trackOffline: boolean
}

const CATEGORIES = [
    { key: 'front_office', label: 'Front Office' },
    { key: 'housekeeping', label: 'Housekeeping' },
    { key: 'food_beverage', label: 'Food & Beverage' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'security', label: 'Security' },
    { key: 'human_resources', label: 'Human Resources' },
    { key: 'sales_marketing', label: 'Sales & Marketing' },
    { key: 'management', label: 'Management' },
    { key: 'safety_compliance', label: 'Safety & Compliance' },
    { key: 'customer_service', label: 'Customer Service' },
    { key: 'general', label: 'General' }
]

const DEPARTMENTS = [
    { id: 'front_office', name: 'Front Office' },
    { id: 'housekeeping', name: 'Housekeeping' },
    { id: 'food_beverage', name: 'Food & Beverage' },
    { id: 'maintenance', name: 'Maintenance' },
    { id: 'security', name: 'Security' },
    { id: 'hr', name: 'Human Resources' },
    { id: 'sales', name: 'Sales & Marketing' },
    { id: 'management', name: 'Management' },
    { id: 'spa', name: 'Spa & Wellness' },
    { id: 'kitchen', name: 'Kitchen' }
]

const ROLES = [
    { id: 'front_desk', name: 'Front Desk Agent' },
    { id: 'supervisor', name: 'Supervisor' },
    { id: 'manager', name: 'Manager' },
    { id: 'housekeeper', name: 'Housekeeper' },
    { id: 'server', name: 'Server' },
    { id: 'bartender', name: 'Bartender' },
    { id: 'chef', name: 'Chef' },
    { id: 'security_guard', name: 'Security Guard' },
    { id: 'maintenance_tech', name: 'Maintenance Technician' },
    { id: 'all_staff', name: 'All Staff' }
]

const CERTIFICATE_TEMPLATES = [
    { id: 'standard', name: 'Standard Certificate' },
    { id: 'completion', name: 'Completion Certificate' },
    { id: 'excellence', name: 'Excellence Award' },
    { id: 'compliance', name: 'Compliance Certificate' },
    { id: 'mastery', name: 'Mastery Certificate' }
]

const stripHtml = (html: string) => {
    // Use recursive sanitization to prevent bypass attempts with nested tags
    let previous: string;
    let result = html;
    do {
      previous = result;
      result = previous.replace(/<[^>]*>/g, ' ');
    } while (result !== previous);
    return result
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim()
}

const buildQuizSourceContent = async (documentIds: string[], outline: ModuleOutline) => {
    let documentText = ''
    if (documentIds.length > 0) {
        const { data } = await supabase
            .from('documents')
            .select('title, content, description')
            .in('id', documentIds)

        documentText = (data || [])
            .map(d => `# ${d.title}\n${stripHtml(d.content || d.description || '')}`)
            .join('\n\n')
    }

    const sectionText = outline.sections
        .map(section => {
            const parts = [
                section.title,
                section.description || '',
                section.suggestedContent ? stripHtml(section.suggestedContent) : ''
            ].filter(Boolean)
            return parts.join('\n')
        })
        .join('\n\n')

    return [documentText, sectionText].filter(Boolean).join('\n\n').slice(0, 8000)
}

const defaultCourseConfig: CourseSetupConfig = {
    assignmentType: 'manual',
    targetDepartments: [],
    targetRoles: [],
    assignToAll: false,
    
    requireQuiz: true,
    requireAllSections: true,
    minQuizScore: 80,
    maxQuizAttempts: 3,
    timeLimitMinutes: 30,
    allowRetake: true,
    
    issueCertificate: true,
    certificateTemplate: '1e01b7e9-798d-477d-9577-5343e924e37b', // Default template ID
    validityPeriod: 'no_expiration',
    
    hasDueDate: true,
    dueDaysAfterAssignment: 14,
    validFrom: null,
    expiresAt: null,
    
    sendReminders: true,
    reminderDays: [7, 3, 1],
    autoEscalate: false,
    escalationDays: 7,
    
    requirePrerequisites: false,
    prerequisiteModules: [],
    
    isMandatory: false,
    priority: 'normal',
    trackOffline: false
}

export function SmartModuleWizard({ open, onOpenChange, onModuleCreated }: SmartModuleWizardProps) {
    const { t, i18n } = useTranslation('training')
    const isRTL = i18n.dir() === 'rtl'
    const navigate = useNavigate()
    const { profile } = useAuth()
    const { generateFullModuleContent, generateCourseConfiguration, generating, progress } = useAITrainingContent()

    const [step, setStep] = useState<WizardStep>('topic')
    const [topic, setTopic] = useState('')
    const [category, setCategory] = useState('')
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
    const [outline, setOutline] = useState<ModuleOutline | null>(null)
    const [creating, setCreating] = useState(false)
    const [aiLanguage, setAiLanguage] = useState('English')
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
    const [estimatedDuration, setEstimatedDuration] = useState(45)
    
    // Course Configuration State
    const [courseConfig, setCourseConfig] = useState<CourseSetupConfig>(defaultCourseConfig)
    const [aiSuggestedConfig, setAiSuggestedConfig] = useState<Partial<CourseSetupConfig> | null>(null)

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
            return data || []
        },
        enabled: open
    })

    // Fetch existing modules for prerequisites
    const { data: existingModules } = useQuery({
        queryKey: ['modules-for-prerequisites'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('training_modules')
                .select('id, title, category')
                .eq('status', 'published')
                .order('title')
            if (error) throw error
            return data || []
        },
        enabled: open && step === 'configure'
    })

    // Reset on close
    useEffect(() => {
        if (!open) {
            setStep('topic')
            setTopic('')
            setCategory('')
            setSelectedDocIds([])
            setOutline(null)
            setCourseConfig(defaultCourseConfig)
            setAiSuggestedConfig(null)
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
        const result = await generateFullModuleContent(
            topic, 
            selectedDocIds, 
            category || 'General', 
            aiLanguage,
            {
                difficulty,
                estimatedDuration,
                includeScenarios: true,
                includeAssessment: true
            }
        )
        if (result) {
            setOutline({
                title: result.title || topic,
                description: result.description || `Training module for ${topic}`,
                category: category || 'General',
                difficulty: difficulty,
                estimatedDuration: result.estimatedDuration || `${estimatedDuration} minutes`,
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

    const handleApplyAISuggestions = async () => {
        // Generate AI-suggested configuration based on content
        const result = await generateCourseConfiguration(
            topic,
            category,
            difficulty,
            outline?.sections || []
        )
        
        if (result) {
            setAiSuggestedConfig(result)
            setCourseConfig(prev => ({
                ...prev,
                ...result,
                // Ensure validityPeriod is properly typed
                validityPeriod: result.validityPeriod && 
                    ['no_expiration', '1_year', '2_years', '3_years', '5_years'].includes(result.validityPeriod)
                    ? result.validityPeriod as CourseSetupConfig['validityPeriod']
                    : prev.validityPeriod,
                // Don't override certificate template with invalid values
                certificateTemplate: result.certificateTemplate && 
                    result.certificateTemplate.match(/^[0-9a-f-]{36}$/i)
                    ? result.certificateTemplate
                    : prev.certificateTemplate
            }))
        }
    }

    const handleCreateModule = async () => {
        if (!outline) return

        try {
            setCreating(true)

            // Create the training module with full configuration
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
                    updated_by: profile?.id,
                    // Course configuration
                    is_mandatory: courseConfig.isMandatory,
                    priority: courseConfig.priority,
                    validity_period: courseConfig.validityPeriod,
                    require_prerequisites: courseConfig.requirePrerequisites,
                    allow_retake: courseConfig.allowRetake,
                    track_offline: courseConfig.trackOffline
                })
                .select()
                .single()

            if (moduleError) throw moduleError

            // Create prerequisite relationships if any
            if (courseConfig.requirePrerequisites && courseConfig.prerequisiteModules.length > 0) {
                const prerequisites = courseConfig.prerequisiteModules.map(prereqId => ({
                    module_id: module.id,
                    prerequisite_module_id: prereqId,
                    is_required: true
                }))
                
                await supabase
                    .from('training_module_prerequisites')
                    .insert(prerequisites)
            }

            // Create the quiz if required
            let createdQuizId: string | null = null
            const hasQuizSection = outline.sections.some(s =>
                s.type === 'quiz' || s.type === 'inline_quiz' || s.title.toLowerCase().includes('knowledge')
            )

            if (hasQuizSection && courseConfig.requireQuiz) {
                const { data: quiz, error: quizError } = await supabase
                    .from('learning_quizzes')
                    .insert({
                        title: `${outline.title} - Assessment`,
                        description: `Knowledge assessment for ${outline.title}`,
                        training_module_id: module.id,
                        time_limit_minutes: courseConfig.timeLimitMinutes,
                        passing_score_percentage: courseConfig.minQuizScore,
                        max_attempts: courseConfig.maxQuizAttempts,
                        randomize_questions: true,
                        show_feedback_during: true,
                        status: 'published',
                        created_by: profile?.id
                    })
                    .select()
                    .single()

                if (!quizError && quiz) {
                    createdQuizId = quiz.id

                    // Generate quiz questions with AI
                    await generateQuizQuestions(quiz.id, module.id)
                }
            }

            // Create content blocks for each section
            const contentBlocks = outline.sections.map((section, index) => {
                let content = section.suggestedContent || ''
                const isQuizSection = section.type === 'quiz' || section.type === 'inline_quiz' ||
                    section.title.toLowerCase().includes('knowledge')

                // Generate default content based on section type/title
                if (!content) {
                    content = generateDefaultContent(section, outline.title)
                }

                // Map section.type to valid content_block_type enum
                const validTypes = ['text', 'image', 'video', 'document_link', 'quiz', 'sop_reference', 'audio', 'interactive'] as const
                const blockType = isQuizSection ? 'quiz' : validTypes.includes(section.type as any) ? section.type : 'text'

                return {
                    training_module_id: module.id,
                    type: blockType as any,
                    title: section.title,
                    content: content,
                    order: index + 1,
                    ai_generated: true,
                    duration_seconds: isQuizSection ? courseConfig.timeLimitMinutes * 60 : 600,
                    points: isQuizSection ? 10 : 0,
                    content_data: isQuizSection && createdQuizId ? { quiz_id: createdQuizId } : {},
                    is_mandatory: courseConfig.requireAllSections
                }
            })

            await supabase.from('training_content_blocks').insert(contentBlocks)

            // Create assignment rules if auto-assign is enabled
            if (courseConfig.assignmentType === 'auto_assign') {
                try {
                    await createAssignmentRules(module.id)
                } catch (err: any) {
                    console.error('Assignment rules error:', err.message, err.details, err.hint)
                }
            }

            // Create automation rules for reminders
            if (courseConfig.sendReminders) {
                try {
                    await createAutomationRules(module.id)
                } catch (err: any) {
                    console.error('Automation rules error:', err.message, err.details, err.hint)
                }
            }

            // Create certificate template if enabled
            if (courseConfig.issueCertificate) {
                try {
                    await createCertificateSettings(module.id)
                } catch (err: any) {
                    console.error('Certificate settings error:', err.message, err.details, err.hint)
                }
            }

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

                await supabase.from('training_module_resources').insert(resources)
            }

            onOpenChange(false)
            onModuleCreated?.(module.id)
            navigate(`/training/hub/${module.id}?view=builder`)

        } catch (error) {
            console.error('Module creation error:', error)
        } finally {
            setCreating(false)
        }
    }

    const generateQuizQuestions = async (quizId: string, moduleId: string) => {
        try {
            const sourceContent = await buildQuizSourceContent(selectedDocIds, outline!)
            if (sourceContent && sourceContent.trim().length >= 50) {
                const language = aiLanguage.toLowerCase().includes('arab') ? 'ar' : 'en'
                const aiQuestions = await QuestionService.generateQuestionsWithAI({
                    sop_content: sourceContent,
                    sop_id: selectedDocIds[0],
                    sop_title: outline!.title,
                    source_title: outline!.title,
                    count: outline?.suggestedQuizQuestions || 5,
                    types: ['mcq', 'true_false'],
                    difficulty: difficulty,
                    include_hints: true,
                    include_explanations: true,
                    language,
                    grounded_only: true,
                    include_citations: true
                })

                for (let i = 0; i < aiQuestions.length; i++) {
                    const q = aiQuestions[i]
                    const correctOption = q.options?.find(o => o.is_correct)
                    
                    const { data: question } = await supabase
                        .from('knowledge_questions')
                        .insert({
                            question_text: q.question_text,
                            question_type: q.question_type,
                            difficulty_level: difficulty,
                            correct_answer: correctOption?.text || q.correct_answer || '',
                            explanation: q.explanation,
                            hint: q.hint,
                            training_module_id: moduleId,
                            points: 2,
                            estimated_time_seconds: 60,
                            ai_generated: true,
                            status: 'published',
                            created_by: profile?.id
                        })
                        .select()
                        .single()

                    if (question && q.options) {
                        const options = q.options.map((opt, idx) => ({
                            question_id: question.id,
                            option_text: opt.text,
                            is_correct: opt.is_correct,
                            display_order: idx + 1
                        }))
                        await supabase.from('knowledge_question_options').insert(options)

                        await supabase.from('learning_quiz_questions').insert({
                            quiz_id: quizId,
                            question_id: question.id,
                            display_order: i + 1,
                            points_override: 2
                        })
                    }
                }
            }
        } catch (error) {
            console.error('Quiz generation failed:', error)
        }
    }

    const createAssignmentRules = async (moduleId: string) => {
        // For now, skip assignments - requires fetching actual department/role UUIDs
        return
    }

    const createAutomationRules = async (moduleId: string) => {
        // Create reminder rules
        for (const days of courseConfig.reminderDays) {
            await supabase.from('training_automation_rules').insert({
                module_id: moduleId,
                trigger_type: 'reminder',
                trigger_condition: `due_date_minus_${days}_days`,
                action_type: 'send_notification',
                action_config: {
                    message: `Reminder: Complete "${outline?.title}" - Due in ${days} days`,
                    channels: ['email', 'in_app']
                },
                is_active: true,
                created_by: profile?.id
            })
        }

        // Create escalation rule if enabled
        if (courseConfig.autoEscalate) {
            await supabase.from('training_automation_rules').insert({
                module_id: moduleId,
                trigger_type: 'overdue',
                trigger_condition: `overdue_by_${courseConfig.escalationDays}_days`,
                action_type: 'notify_manager',
                action_config: {
                    message: `Training overdue: "${outline?.title}" - Employee has not completed within required timeframe`,
                    escalate_to: 'direct_manager'
                },
                is_active: true,
                created_by: profile?.id
            })
        }
    }

    const createCertificateSettings = async (moduleId: string) => {
        // Ensure valid UUID - use default if invalid
        const templateId = courseConfig.certificateTemplate?.match(/^[0-9a-f-]{36}$/i) 
            ? courseConfig.certificateTemplate 
            : '1e01b7e9-798d-477d-9577-5343e924e37b'
        
        const { error } = await supabase.from('training_certificate_settings').insert({
            module_id: moduleId,
            template_id: templateId,
            issue_on_completion: true,
            require_passing_score: courseConfig.requireQuiz,
            minimum_score: courseConfig.minQuizScore,
            validity_period: courseConfig.validityPeriod,
            include_completion_date: true,
            include_score: true,
            created_by: profile?.id
        })
        if (error) {
            console.error('Certificate settings insert error:', error)
            throw error
        }
    }

    const generateDefaultContent = (section: any, moduleTitle: string) => {
        if (section.title.toLowerCase().includes('introduction')) {
            return `<h2>Learning Objectives</h2>
<p>By the end of this module, you will:</p>
<ul>
<li>Understand the key concepts of ${moduleTitle}</li>
<li>Be able to apply these concepts in your daily work</li>
<li>Know the best practices and procedures</li>
</ul>
<h2>Overview</h2>
<p>${outline?.description}</p>`
        } else if (section.title.toLowerCase().includes('quiz') || section.title.toLowerCase().includes('assessment')) {
            return `<h2>Knowledge Check</h2>
<p>Test your understanding of the material covered in this training module.</p>
<p>This quiz contains ${outline?.suggestedQuizQuestions || 5} questions and requires a ${courseConfig.minQuizScore}% passing score.</p>`
        } else {
            return `<h2>${section.title}</h2>
<p>${section.description || 'This section covers important training content.'}</p>
<p><em>Content to be added by the training administrator.</em></p>`
        }
    }

    const getStepProgress = () => {
        switch (step) {
            case 'topic': return 20
            case 'documents': return 40
            case 'outline': return 60
            case 'configure': return 80
            case 'review': return 100
        }
    }

    const renderStep = () => {
        switch (step) {
            case 'topic':
                return (
                    <div className={`space-y-6 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="text-center mb-6">
                            <Lightbulb className="h-12 w-12 mx-auto text-hotel-gold mb-3" />
                            <h3 className="text-lg font-medium">{t('wizard.topicQuestion')}</h3>
                            <p className="text-sm text-gray-500">{t('wizard.topicSubtitle')}</p>
                        </div>

                        <div>
                            <Label className={isRTL ? 'text-right block w-full' : ''}>{t('wizard.trainingTopic')}</Label>
                            <Input
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder={t('wizard.topicPlaceholder')}
                                className={`text-lg py-6 ${isRTL ? 'text-right' : ''}`}
                            />
                        </div>

                        <div className={`grid grid-cols-2 gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                                <Label className={isRTL ? 'text-right block w-full' : ''}>{t('wizard.category')}</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className={isRTL ? 'flex-row-reverse' : ''}>
                                        <SelectValue placeholder={t('wizard.selectCategory')} />
                                    </SelectTrigger>
                                    <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                                        {CATEGORIES.map(cat => (
                                            <SelectItem key={cat.key} value={cat.label}>{t(`categories.${cat.key}`)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className={isRTL ? 'text-right block w-full' : ''}>{t('wizard.difficulty')}</Label>
                                <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="easy">Beginner</SelectItem>
                                        <SelectItem value="medium">Intermediate</SelectItem>
                                        <SelectItem value="hard">Advanced</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className={`grid grid-cols-2 gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                                <Label className={isRTL ? 'text-right block w-full' : ''}>{t('wizard.contentLanguage')}</Label>
                                <Select value={aiLanguage} onValueChange={setAiLanguage}>
                                    <SelectTrigger className={isRTL ? 'flex-row-reverse' : ''}>
                                        <SelectValue placeholder={t('wizard.selectLanguage')} />
                                    </SelectTrigger>
                                    <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                                        <SelectItem value="English">{t('wizard.englishOnly')}</SelectItem>
                                        <SelectItem value="Arabic">{t('wizard.arabicOnly')}</SelectItem>
                                        <SelectItem value="English and Arabic">{t('wizard.bilingual')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className={isRTL ? 'text-right block w-full' : ''}>Estimated Duration (minutes)</Label>
                                <Input
                                    type="number"
                                    value={estimatedDuration}
                                    onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 30)}
                                    min={5}
                                    max={180}
                                />
                            </div>
                        </div>
                    </div>
                )

            case 'documents':
                return (
                    <div className={`space-y-4 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="text-center mb-4">
                            <FileText className="h-10 w-10 mx-auto text-hotel-navy mb-2" />
                            <h3 className="text-lg font-medium">{t('wizard.selectDocs')}</h3>
                            <p className="text-sm text-gray-500">
                                {t('wizard.selectDocsSubtitle')}
                            </p>
                        </div>

                        <ScrollArea className="h-[300px] border rounded-lg p-2">
                            {loadingDocs ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                                    {t('wizard.loadingDocs')}
                                </div>
                            ) : docsError ? (
                                <div className="text-center py-8 text-red-500">
                                    {t('wizard.errorDocs')}
                                </div>
                            ) : !documents || documents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    {t('wizard.noDocs')}
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
                                            role="button"
                                            tabIndex={0}
                                            aria-pressed={selectedDocIds.includes(doc.id)}
                                        >
                                            <Checkbox
                                                checked={selectedDocIds.includes(doc.id)}
                                                className="mt-1"
                                            />
                                            <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                                {t('wizard.docsSelected', { count: selectedDocIds.length })}
                            </p>
                        )}
                    </div>
                )

            case 'outline':
                return (
                    <div className={`space-y-4 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="text-center mb-4">
                            <Target className="h-10 w-10 mx-auto text-green-600 mb-2" />
                            <h3 className="text-lg font-medium">{t('wizard.reviewOutline')}</h3>
                            <p className="text-sm text-gray-500">
                                {t('wizard.reviewOutlineSubtitle')}
                            </p>
                        </div>

                        {outline && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>{t('common:title')}</Label>
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
                                    <Label>{t('common:description')}</Label>
                                    <Textarea
                                        value={outline.description}
                                        onChange={(e) => setOutline({ ...outline, description: e.target.value })}
                                        rows={2}
                                    />
                                </div>

                                <div>
                                    <Label className={isRTL ? 'text-right block w-full' : ''}>{t('wizard.sections')}</Label>
                                    <div className="space-y-2 mt-2">
                                        {outline.sections.map((section, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                            >
                                                <span className="text-sm font-medium text-gray-500 w-6">
                                                    {index + 1}
                                                </span>
                                                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
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

            case 'configure':
                return (
                    <div className={`space-y-4 py-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="text-center mb-4">
                            <Settings className="h-10 w-10 mx-auto text-hotel-navy mb-2" />
                            <h3 className="text-lg font-medium">Course Setup & Configuration</h3>
                            <p className="text-sm text-gray-500">
                                Configure assignment rules, completion requirements, and automation
                            </p>
                        </div>

                        {/* AI Suggestions Button */}
                        <div className="flex justify-center mb-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleApplyAISuggestions}
                                disabled={generating}
                                className="gap-2"
                            >
                                <Sparkles className="h-4 w-4" />
                                Apply AI-Suggested Configuration
                            </Button>
                        </div>

                        <ScrollArea className="h-[400px]">
                            <Accordion type="multiple" defaultValue={['assignment', 'completion']} className="space-y-4">
                                
                                {/* Assignment Rules */}
                                <AccordionItem value="assignment" className="border rounded-lg px-4">
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-blue-500" />
                                            <span className="font-medium">Assignment Rules</span>
                                            {aiSuggestedConfig?.assignmentType && (
                                                <Badge variant="secondary" className="text-xs">AI Suggested</Badge>
                                            )}
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-2">
                                        <div>
                                            <Label>Assignment Type</Label>
                                            <Select 
                                                value={courseConfig.assignmentType} 
                                                onValueChange={(v: any) => setCourseConfig({...courseConfig, assignmentType: v})}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="manual">Manual Assignment</SelectItem>
                                                    <SelectItem value="auto_assign">Auto-Assign to Selected Groups</SelectItem>
                                                    <SelectItem value="onboarding">Assign to New Hires (Onboarding)</SelectItem>
                                                    <SelectItem value="role_based">Role-Based Assignment</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {courseConfig.assignmentType === 'auto_assign' && (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={courseConfig.assignToAll}
                                                        onCheckedChange={(v) => setCourseConfig({...courseConfig, assignToAll: v})}
                                                    />
                                                    <Label className="cursor-pointer">Assign to All Staff</Label>
                                                </div>

                                                {!courseConfig.assignToAll && (
                                                    <>
                                                        <div>
                                                            <Label>Target Departments</Label>
                                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                                {DEPARTMENTS.map(dept => (
                                                                    <div key={dept.id} className="flex items-center gap-2">
                                                                        <Checkbox
                                                                            checked={courseConfig.targetDepartments.includes(dept.id)}
                                                                            onCheckedChange={(checked) => {
                                                                                setCourseConfig(prev => ({
                                                                                    ...prev,
                                                                                    targetDepartments: checked
                                                                                        ? [...prev.targetDepartments, dept.id]
                                                                                        : prev.targetDepartments.filter(id => id !== dept.id)
                                                                                }))
                                                                            }}
                                                                        />
                                                                        <span className="text-sm">{dept.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <Label>Target Roles</Label>
                                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                                {ROLES.map(role => (
                                                                    <div key={role.id} className="flex items-center gap-2">
                                                                        <Checkbox
                                                                            checked={courseConfig.targetRoles.includes(role.id)}
                                                                            onCheckedChange={(checked) => {
                                                                                setCourseConfig(prev => ({
                                                                                    ...prev,
                                                                                    targetRoles: checked
                                                                                        ? [...prev.targetRoles, role.id]
                                                                                        : prev.targetRoles.filter(id => id !== role.id)
                                                                                }))
                                                                            }}
                                                                        />
                                                                        <span className="text-sm">{role.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}

                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={courseConfig.isMandatory}
                                                onCheckedChange={(v) => setCourseConfig({...courseConfig, isMandatory: v})}
                                            />
                                            <Label className="cursor-pointer flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-red-500" />
                                                Mandatory Training
                                            </Label>
                                        </div>

                                        <div>
                                            <Label>Priority Level</Label>
                                            <Select 
                                                value={courseConfig.priority} 
                                                onValueChange={(v: any) => setCourseConfig({...courseConfig, priority: v})}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="low">Low</SelectItem>
                                                    <SelectItem value="normal">Normal</SelectItem>
                                                    <SelectItem value="high">High</SelectItem>
                                                    <SelectItem value="compliance">Compliance (Critical)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Completion Requirements */}
                                <AccordionItem value="completion" className="border rounded-lg px-4">
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                            <ListChecks className="h-5 w-5 text-green-500" />
                                            <span className="font-medium">Completion Requirements</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-2">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={courseConfig.requireAllSections}
                                                onCheckedChange={(v) => setCourseConfig({...courseConfig, requireAllSections: v})}
                                            />
                                            <Label className="cursor-pointer">Require All Sections to be Viewed</Label>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={courseConfig.requireQuiz}
                                                onCheckedChange={(v) => setCourseConfig({...courseConfig, requireQuiz: v})}
                                            />
                                            <Label className="cursor-pointer">Require Quiz/Assessment</Label>
                                        </div>

                                        {courseConfig.requireQuiz && (
                                            <>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label>Minimum Pass Score (%)</Label>
                                                        <Input
                                                            type="number"
                                                            value={courseConfig.minQuizScore}
                                                            onChange={(e) => setCourseConfig({...courseConfig, minQuizScore: parseInt(e.target.value) || 70})}
                                                            min={0}
                                                            max={100}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>Max Attempts</Label>
                                                        <Input
                                                            type="number"
                                                            value={courseConfig.maxQuizAttempts}
                                                            onChange={(e) => setCourseConfig({...courseConfig, maxQuizAttempts: parseInt(e.target.value) || 3})}
                                                            min={1}
                                                            max={10}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label>Time Limit (minutes)</Label>
                                                        <Input
                                                            type="number"
                                                            value={courseConfig.timeLimitMinutes}
                                                            onChange={(e) => setCourseConfig({...courseConfig, timeLimitMinutes: parseInt(e.target.value) || 30})}
                                                            min={5}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-6">
                                                        <Switch
                                                            checked={courseConfig.allowRetake}
                                                            onCheckedChange={(v) => setCourseConfig({...courseConfig, allowRetake: v})}
                                                        />
                                                        <Label className="cursor-pointer">Allow Retakes</Label>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Due Date & Scheduling */}
                                <AccordionItem value="scheduling" className="border rounded-lg px-4">
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-5 w-5 text-purple-500" />
                                            <span className="font-medium">Due Date & Scheduling</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-2">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={courseConfig.hasDueDate}
                                                onCheckedChange={(v) => setCourseConfig({...courseConfig, hasDueDate: v})}
                                            />
                                            <Label className="cursor-pointer">Set Due Date</Label>
                                        </div>

                                        {courseConfig.hasDueDate && (
                                            <div>
                                                <Label>Due After (days from assignment)</Label>
                                                <Input
                                                    type="number"
                                                    value={courseConfig.dueDaysAfterAssignment}
                                                    onChange={(e) => setCourseConfig({...courseConfig, dueDaysAfterAssignment: parseInt(e.target.value) || 14})}
                                                    min={1}
                                                    max={365}
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <Label>Valid From (optional)</Label>
                                            <Input
                                                type="datetime-local"
                                                value={courseConfig.validFrom || ''}
                                                onChange={(e) => setCourseConfig({...courseConfig, validFrom: e.target.value || null})}
                                            />
                                        </div>

                                        <div>
                                            <Label>Expires At (optional)</Label>
                                            <Input
                                                type="datetime-local"
                                                value={courseConfig.expiresAt || ''}
                                                onChange={(e) => setCourseConfig({...courseConfig, expiresAt: e.target.value || null})}
                                            />
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Certificate Settings */}
                                <AccordionItem value="certificate" className="border rounded-lg px-4">
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                            <Award className="h-5 w-5 text-yellow-500" />
                                            <span className="font-medium">Certificate Settings</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-2">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={courseConfig.issueCertificate}
                                                onCheckedChange={(v) => setCourseConfig({...courseConfig, issueCertificate: v})}
                                            />
                                            <Label className="cursor-pointer">Issue Certificate on Completion</Label>
                                        </div>

                                        {courseConfig.issueCertificate && (
                                            <>
                                                <div>
                                                    <Label>Certificate Template</Label>
                                                    <Select 
                                                        value={courseConfig.certificateTemplate} 
                                                        onValueChange={(v) => setCourseConfig({...courseConfig, certificateTemplate: v})}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {CERTIFICATE_TEMPLATES.map(template => (
                                                                <SelectItem key={template.id} value={template.id}>
                                                                    {template.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div>
                                                    <Label>Validity Period (optional)</Label>
                                                    <Select 
                                                        value={courseConfig.validityPeriod === 'no_expiration' ? 'no_expiration' : courseConfig.validityPeriod || 'no_expiration'} 
                                                        onValueChange={(v) => setCourseConfig({...courseConfig, validityPeriod: v as CourseSetupConfig['validityPeriod']})}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="No expiration" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="no_expiration">No expiration</SelectItem>
                                                            <SelectItem value="1_year">1 Year</SelectItem>
                                                            <SelectItem value="2_years">2 Years</SelectItem>
                                                            <SelectItem value="3_years">3 Years</SelectItem>
                                                            <SelectItem value="5_years">5 Years</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Automation & Reminders */}
                                <AccordionItem value="automation" className="border rounded-lg px-4">
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                            <Bell className="h-5 w-5 text-orange-500" />
                                            <span className="font-medium">Automation & Reminders</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-2">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={courseConfig.sendReminders}
                                                onCheckedChange={(v) => setCourseConfig({...courseConfig, sendReminders: v})}
                                            />
                                            <Label className="cursor-pointer">Send Reminder Notifications</Label>
                                        </div>

                                        {courseConfig.sendReminders && (
                                            <div>
                                                <Label>Reminder Schedule (days before due)</Label>
                                                <div className="flex gap-2 mt-2">
                                                    {[1, 3, 7, 14].map(days => (
                                                        <Badge
                                                            key={days}
                                                            variant={courseConfig.reminderDays.includes(days) ? 'default' : 'outline'}
                                                            className="cursor-pointer"
                                                            onClick={() => {
                                                                setCourseConfig(prev => ({
                                                                    ...prev,
                                                                    reminderDays: prev.reminderDays.includes(days)
                                                                        ? prev.reminderDays.filter(d => d !== days)
                                                                        : [...prev.reminderDays, days].sort((a, b) => b - a)
                                                                }))
                                                            }}
                                                        >
                                                            {days} days
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={courseConfig.autoEscalate}
                                                onCheckedChange={(v) => setCourseConfig({...courseConfig, autoEscalate: v})}
                                            />
                                            <Label className="cursor-pointer">Auto-Escalate Overdue to Manager</Label>
                                        </div>

                                        {courseConfig.autoEscalate && (
                                            <div>
                                                <Label>Escalate After (days overdue)</Label>
                                                <Input
                                                    type="number"
                                                    value={courseConfig.escalationDays}
                                                    onChange={(e) => setCourseConfig({...courseConfig, escalationDays: parseInt(e.target.value) || 7})}
                                                    min={1}
                                                    max={30}
                                                />
                                            </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Prerequisites */}
                                <AccordionItem value="prerequisites" className="border rounded-lg px-4">
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                            <GraduationCap className="h-5 w-5 text-indigo-500" />
                                            <span className="font-medium">Prerequisites</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-2">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={courseConfig.requirePrerequisites}
                                                onCheckedChange={(v) => setCourseConfig({...courseConfig, requirePrerequisites: v})}
                                            />
                                            <Label className="cursor-pointer">Require Prerequisite Modules</Label>
                                        </div>

                                        {courseConfig.requirePrerequisites && (
                                            <div>
                                                <Label>Select Prerequisite Modules</Label>
                                                <ScrollArea className="h-[150px] border rounded-lg p-2 mt-2">
                                                    {existingModules?.length === 0 ? (
                                                        <p className="text-sm text-gray-500 text-center py-4">
                                                            No published modules available
                                                        </p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {existingModules?.map(mod => (
                                                                <div key={mod.id} className="flex items-center gap-2">
                                                                    <Checkbox
                                                                        checked={courseConfig.prerequisiteModules.includes(mod.id)}
                                                                        onCheckedChange={(checked) => {
                                                                            setCourseConfig(prev => ({
                                                                                ...prev,
                                                                                prerequisiteModules: checked
                                                                                    ? [...prev.prerequisiteModules, mod.id]
                                                                                    : prev.prerequisiteModules.filter(id => id !== mod.id)
                                                                            }))
                                                                        }}
                                                                    />
                                                                    <span className="text-sm">{mod.title}</span>
                                                                    <Badge variant="outline" className="text-xs ml-auto">
                                                                        {mod.category}
                                                                    </Badge>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </ScrollArea>
                                            </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>

                            </Accordion>
                        </ScrollArea>
                    </div>
                )

            case 'review':
                return (
                    <div className={`space-y-4 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="text-center">
                            <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-3" />
                            <h3 className="text-lg font-medium">Ready to Create!</h3>
                            <p className="text-sm text-gray-500">
                                Review your training module configuration before creating
                            </p>
                        </div>

                        {outline && (
                            <div className="space-y-4">
                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="h-5 w-5 text-hotel-navy" />
                                        <span className="font-medium">{outline.title}</span>
                                    </div>
                                    <p className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{outline.description}</p>
                                    <div className={`flex gap-3 text-sm text-gray-500 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <span className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <Clock className="h-4 w-4" />
                                            {outline.estimatedDuration}
                                        </span>
                                        <span>{outline.sections.length} sections</span>
                                        {selectedDocIds.length > 0 && (
                                            <span>{selectedDocIds.length} linked documents</span>
                                        )}
                                    </div>
                                </div>

                                {/* Configuration Summary */}
                                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                                    <h4 className="font-medium text-blue-900 flex items-center gap-2">
                                        <Settings className="h-4 w-4" />
                                        Configuration Summary
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-600">Assignment:</span>
                                            <span className="ml-2 font-medium">
                                                {courseConfig.assignmentType === 'manual' ? 'Manual' : 
                                                 courseConfig.assignmentType === 'auto_assign' ? 'Auto-Assign' :
                                                 courseConfig.assignmentType === 'onboarding' ? 'Onboarding' : 'Role-Based'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Quiz Required:</span>
                                            <span className="ml-2 font-medium">{courseConfig.requireQuiz ? `Yes (${courseConfig.minQuizScore}%)` : 'No'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Certificate:</span>
                                            <span className="ml-2 font-medium">{courseConfig.issueCertificate ? 'Yes' : 'No'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Due Date:</span>
                                            <span className="ml-2 font-medium">
                                                {courseConfig.hasDueDate ? `${courseConfig.dueDaysAfterAssignment} days` : 'None'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Reminders:</span>
                                            <span className="ml-2 font-medium">{courseConfig.sendReminders ? 'Yes' : 'No'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Priority:</span>
                                            <span className="ml-2 font-medium capitalize">{courseConfig.priority}</span>
                                        </div>
                                    </div>
                                    {courseConfig.isMandatory && (
                                        <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                                            <Shield className="h-4 w-4" />
                                            <span className="font-medium">Mandatory Training</span>
                                        </div>
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
            case 'configure': return true
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
                setStep('configure')
                break
            case 'configure':
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
            case 'configure': setStep('outline'); break
            case 'review': setStep('configure'); break
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
                <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
                    <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Sparkles className="h-5 w-5 text-hotel-gold" />
                        {step === 'configure' ? 'Course Setup & Configuration' : t('wizard.title')}
                    </DialogTitle>
                    <DialogDescription className={isRTL ? 'text-right' : ''}>
                        {step === 'configure' 
                            ? 'Configure assignment rules, completion requirements, and automation settings'
                            : t('wizard.topicSubtitle')
                        }
                    </DialogDescription>
                </DialogHeader>

                <Progress value={getStepProgress()} className="h-2" />

                {generating && (
                    <div className={`flex items-center justify-center gap-3 py-4 text-hotel-navy ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm font-medium">{progress || t('wizard.generatingContent')}</span>
                    </div>
                )}

                {renderStep()}

                <div className="flex justify-between pt-4 border-t">
                    {step !== 'topic' ? (
                        <Button variant="outline" onClick={handleBack} disabled={generating || creating} className={isRTL ? 'flex-row-reverse' : ''}>
                            <ArrowLeft className={cn("h-4 w-4", isRTL ? "ml-2 rotate-180" : "mr-2")} />
                            {t('common:action.back')}
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
                                <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />
                                {generating ? t('wizard.generating') : t('wizard.creating')}
                            </>
                        ) : step === 'review' ? (
                            <div className={isRTL ? 'flex-row-reverse' : ''}>
                                {t('wizard.createModule')}
                                <CheckCircle className={cn("h-4 w-4", isRTL ? "mr-2" : "ml-2")} />
                            </div>
                        ) : step === 'documents' ? (
                            <div className={isRTL ? 'flex-row-reverse' : ''}>
                                <Sparkles className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                {t('wizard.generateOutline')}
                            </div>
                        ) : (
                            <div className={isRTL ? 'flex-row-reverse' : ''}>
                                {t('common:action.next')}
                                <ArrowRight className={cn("h-4 w-4", isRTL ? "mr-2 rotate-180" : "ml-2")} />
                            </div>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
