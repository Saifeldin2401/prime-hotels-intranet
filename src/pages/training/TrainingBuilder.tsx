import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
// Lazy load heavy RichTextEditor
const RichTextEditor = lazy(() => import('@/components/ui/RichTextEditor'))
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  Plus,
  Upload,
  FileQuestion,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
  ListChecks,
  Trash2
} from 'lucide-react'
import type { TrainingModule } from '@/lib/types'
import type { LearningQuiz } from '@/types/learning'
import { useTranslation } from 'react-i18next'
import { AIQuestionGenerator } from '@/components/questions/AIQuestionGenerator'
import { KnowledgeBaseSidebar, SmartModuleWizard } from '@/components/training'
import { ModuleSkillsEditor } from '@/components/training/ModuleSkillsEditor'
import { getUserFriendlyError } from '@/lib/errorMessages'
import { BuilderHeader } from '@/components/training/builder/BuilderHeader'
import { BuilderSidebar } from '@/components/training/builder/BuilderSidebar'
import { BuilderCanvas } from '@/components/training/builder/BuilderCanvas'
import { BuilderPreview } from '@/components/training/builder/BuilderPreview'
import { analytics } from '@/services/analyticsService'

type ContentType = 'text' | 'image' | 'video' | 'document_link' | 'audio' | 'quiz' | 'interactive' | 'sop_reference'
type QuestionType = 'mcq' | 'true_false' | 'fill_blank'
type BuilderStep = 'setup' | 'structure' | 'content' | 'rules' | 'preview' | 'publish'

interface ContentBlockForm {
  id: string
  type: ContentType
  content: string
  content_url: string
  content_data: Record<string, unknown>
  is_mandatory: boolean
  title: string
  duration?: number
  points?: number
  order: number
}

interface QuestionForm {
  question: string
  type: QuestionType
  options: string[]
  correct_answer: string
  points: number
  explanation?: string
}

interface TrainingSection {
  id: string
  title: string
  description?: string
  items: ContentBlockForm[]
  order: number
}

interface TrainingTemplate {
  id: string
  name: string
  description?: string | null
  category?: string | null
  template_structure?: any
}

// Reusable utility functions moved outside of component to avoid hoisting issues
const normalizeDurationMinutes = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return undefined
  if (value <= 0) return undefined
  if (value > 120) return Math.round(value / 60)
  return value
}

const toDurationSeconds = (minutes?: number | null) => {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return null
  if (minutes <= 0) return null
  return Math.round(minutes * 60)
}

const normalizeEstimatedDuration = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  if (value <= 0) return ''
  if (value > 240) return Math.max(1, Math.round(value / 60))
  return Math.round(value)
}

const estimateBlockDurationMinutes = (block: ContentBlockForm) => {
  if (block.duration && block.duration > 0) return block.duration
  if (block.type === 'text') {
    const text = (block.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const words = text ? text.split(' ').length : 0
    if (!words) return 0
    return Math.max(1, Math.round(words / 180))
  }
  switch (block.type) {
    case 'image':
      return 2
    case 'document_link':
      return 3
    case 'quiz':
      return 5
    case 'sop_reference':
      return 4
    case 'audio':
    case 'video':
    case 'interactive':
      return 5
    default:
      return 0
  }
}

const deriveTitleFromUrl = (value: string) => {
  if (!value) return ''
  try {
    const url = new URL(value)
    const path = url.pathname.split('/').filter(Boolean)
    const last = path[path.length - 1]
    if (last) {
      return decodeURIComponent(last)
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim()
    }
    return url.hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

const stripHtml = (value: string) => {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

const buildSectionSourceText = (section: TrainingSection) => {
  const sectionParts = [section.title, section.description || ''].filter(Boolean)

  const itemParts = section.items.map(item => {
    if (item.type === 'text') {
      return stripHtml(item.content || '')
    }
    if (item.type === 'sop_reference') {
      return item.title ? `SOP Reference: ${item.title}` : 'SOP Reference'
    }
    if (item.title) return item.title
    return item.type
  })

  return [...sectionParts, ...itemParts].filter(Boolean).join('\n')
}

const buildModuleSourceText = (sections: TrainingSection[]) => {
  return sections
    .map(section => buildSectionSourceText(section))
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 8000)
}

function getBlockValidation(block: ContentBlockForm, t: (key: string, options?: any) => string) {
  if (block.type === 'quiz' && !(block.content_data as any)?.quiz_id) {
    return { ok: false, message: t('builder.missingQuiz') }
  }
  if (block.type === 'sop_reference' && !(block.content_data as any)?.sop_id) {
    return { ok: false, message: t('builder.missingSop') }
  }
  if (['video', 'audio', 'image', 'document_link', 'interactive'].includes(block.type) && !block.content_url) {
    return { ok: false, message: t('builder.missingUrl') }
  }
  if (block.type === 'text' && !block.content.trim()) {
    return { ok: false, message: t('builder.missingContent') }
  }
  return { ok: true, message: t('builder.readyToSave', { defaultValue: 'Ready to save' }) }
}

export function TrainingBuilder() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { t, i18n } = useTranslation('training')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isRTL = i18n.dir() === 'rtl'
  const isNewRoute = id === 'new'
  const isValidUuid = (value?: string | null) =>
    !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

  // Fetch available quizzes for the Quiz Block
  const { data: availableQuizzes } = useQuery({
    queryKey: ['available-quizzes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_quizzes')
        .select('*')
        // Show all quizzes (published and draft) so users can preview/select
        .order('title')

      if (error) throw error
      return data as LearningQuiz[]
    }
  })

  // Fetch available SOPs for the SOP Reference Block
  const { data: availableSOPs } = useQuery({
    queryKey: ['available-sops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents') // Updated to documents
        .select('id, title') // Removed category, department_id
        .eq('status', 'PUBLISHED')
        .order('title')

      if (error) throw error
      return data as { id: string; title: string; category?: string; department_id?: string }[]
    }
  })

  const {
    data: availableTemplates,
    isLoading: isTemplatesLoading,
    isError: isTemplatesError
  } = useQuery({
    queryKey: ['training-content-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_content_templates')
        .select('id, name, description, category, template_structure')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as TrainingTemplate[]
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false
  })

  // Module state
  const [createdModuleId, setCreatedModuleId] = useState<string | null>(null)
  const rawModuleId = isNewRoute ? createdModuleId : id || null
  const moduleId = isValidUuid(rawModuleId) ? rawModuleId : null
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [useEstimatedDuration, setUseEstimatedDuration] = useState(false)
  const [validityPeriod, setValidityPeriod] = useState('')
  const [passingScore, setPassingScore] = useState('80')
  const [maxAttempts, setMaxAttempts] = useState('3')
  const [allowRetake, setAllowRetake] = useState(true)
  const [category, setCategory] = useState('')
  const [difficultyLevel, setDifficultyLevel] = useState('beginner')
  const [audience, setAudience] = useState('all')
  const [contentLanguage, setContentLanguage] = useState('bilingual')
  const [templatePreset, setTemplatePreset] = useState('none')
  const [certificateEnabled, setCertificateEnabled] = useState(true)
  const templateFromQuery = searchParams.get('template')
  const templateAppliedRef = useRef(false)

  useEffect(() => {
    if (!isNewRoute) {
      setCreatedModuleId(null)
    }
  }, [isNewRoute])

  // Load module data if editing (moved up and assigned)
  const { data: moduleData } = useQuery({
    queryKey: ['training-module', moduleId],
    queryFn: async () => {
      if (!moduleId) return null
      const { data, error } = await supabase
        .from('training_modules')
        .select('*')
        .eq('id', moduleId)
        .single()
      if (error) throw error
      return data as TrainingModule
    },
    enabled: !!moduleId
  })

  // Sync state with loaded module data
  useEffect(() => {
    if (moduleData) {
      setTitle(moduleData.title)
      setDescription(moduleData.description || '')
      const normalizedEstimate = normalizeEstimatedDuration(moduleData.estimated_duration_minutes)
      setEstimatedDuration(normalizedEstimate ? normalizedEstimate.toString() : '')
      setUseEstimatedDuration(!!normalizedEstimate)
      setValidityPeriod(moduleData.validity_period_days?.toString() || '')
      setCategory(moduleData.category || '')
      setDifficultyLevel(moduleData.difficulty_level || 'beginner')
      setCertificateEnabled(moduleData.certificate_enabled ?? true)
      setPassingScore(moduleData.passing_score_percentage?.toString() || '80')
      setAllowRetake(moduleData.allow_retake ?? true)
      setMaxAttempts(moduleData.max_attempts?.toString() || '3')
      setAutoAdvance(moduleData.auto_advance ?? false)
      setShowFeedback(moduleData.show_feedback ?? true)
      setRandomizeQuestions(moduleData.randomize_questions ?? false)
      setShowAnswers(moduleData.show_answers ?? false)
      setTimeLimit(moduleData.time_limit_minutes ?? null)
      setAudience(moduleData.audience || 'all')
      setContentLanguage(moduleData.content_language || 'bilingual')
      setTemplatePreset(moduleData.template_id || 'none')
    }
  }, [moduleData])

  useEffect(() => {
    try {
      const storedBlocks = localStorage.getItem(savedBlocksKey)
      if (storedBlocks) {
        const parsed = JSON.parse(storedBlocks)
        if (Array.isArray(parsed)) {
          setSavedBlocks(parsed)
        }
      }
    } catch {
      // ignore storage issues
    }

    try {
      const storedUploads = localStorage.getItem(recentUploadsKey)
      if (storedUploads) {
        const parsed = JSON.parse(storedUploads)
        if (Array.isArray(parsed)) {
          setRecentUploads(parsed)
        }
      }
    } catch {
      // ignore storage issues
    }
  }, [])

  // Fetch content blocks for module
  const { data: contentBlocksData } = useQuery({
    queryKey: ['training-content-blocks', moduleId],
    queryFn: async () => {
      if (!moduleId) return []
      const { data, error } = await supabase
        .from('training_content_blocks')
        .select('*')
        .eq('training_module_id', moduleId)
        .order('order', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!moduleId
  })

  const isLoadedRef = useRef(false)

  // Populate sections when content blocks are loaded
  useEffect(() => {
    if (contentBlocksData && contentBlocksData.length > 0 && !isLoadedRef.current) {
      // Convert flat content blocks into sections
      // For now, create a single "Main Content" section with all blocks
      const blocks: ContentBlockForm[] = contentBlocksData.map((block, index) => ({
        id: block.id,
        type: block.type as ContentType,
        title: block.title || '',
        content: block.content || '',
        content_url: block.content_url || '',
        content_data: block.content_data || {},
        is_mandatory: block.is_mandatory ?? true,
        duration: normalizeDurationMinutes(block.duration_seconds),
        points: block.points,
        order: block.order || index
      }))

      setSections([{
        id: 'main-section',
        title: t('mainContent'),
        description: t('mainContentDescription'),
        items: blocks,
        order: 0
      }])

      setContentBlocks(blocks)
      isLoadedRef.current = true
    }
  }, [contentBlocksData])

  // Enhanced state for drag-and-drop
  const [sections, setSections] = useState<TrainingSection[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [builderStep, setBuilderStep] = useState<BuilderStep>(() => (moduleId ? 'content' : 'setup'))
  const [selectedContent, setSelectedContent] = useState<ContentBlockForm | null>(null)
  const [showTitleField, setShowTitleField] = useState(true)
  const [showAdvancedBlockOptions, setShowAdvancedBlockOptions] = useState(false)
  const [mediaInputMode, setMediaInputMode] = useState<'upload' | 'link'>('upload')
  const [savedBlocks, setSavedBlocks] = useState<ContentBlockForm[]>([])
  const [recentUploads, setRecentUploads] = useState<Array<{ url: string; name: string; type: 'image' | 'audio' | 'document' }>>([])
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const [showTemplateApplyConfirm, setShowTemplateApplyConfirm] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<TrainingTemplate | null>(null)

  // Training settings
  const [timeLimit, setTimeLimit] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(true)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [randomizeQuestions, setRandomizeQuestions] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)

  // Content blocks state (legacy - will be migrated to sections)
  const [contentBlocks, setContentBlocks] = useState<ContentBlockForm[]>([])
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null)
  const [showContentDialog, setShowContentDialog] = useState(false)

  // Quiz state
  const [questions, setQuestions] = useState<QuestionForm[]>([])
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [showAIDialog, setShowAIDialog] = useState(false)
  const [aiPrefillContent, setAiPrefillContent] = useState('')
  const [aiPrefillTitle, setAiPrefillTitle] = useState('')
  const [aiTargetSectionId, setAiTargetSectionId] = useState<string | null>(null)
  const [showKBSidebar, setShowKBSidebar] = useState(false)
  const [showSmartWizard, setShowSmartWizard] = useState(false)

  // Current form states
  const [currentBlock, setCurrentBlock] = useState<ContentBlockForm>({
    id: '',
    type: 'text',
    content: '',
    content_url: '',
    content_data: {},
    is_mandatory: true,
    title: '',
    order: 0
  })

  const [currentQuestion, setCurrentQuestion] = useState<QuestionForm>({
    question: '',
    type: 'mcq',
    options: ['', ''],
    correct_answer: '',
    points: 1
  })

  // Calculate total stats
  const calculatedDuration = sections.reduce((acc, section) =>
    acc + section.items.reduce((itemAcc, item) => itemAcc + estimateBlockDurationMinutes(item), 0), 0
  )

  const totalPoints = sections.reduce((acc, section) =>
    acc + section.items.reduce((itemAcc, item) => itemAcc + (item.points || 0), 0), 0
  )

  const totalItems = sections.reduce((acc, section) => acc + section.items.length, 0)
  const overrideDuration = useEstimatedDuration && estimatedDuration ? Number(estimatedDuration) : null
  const displayDuration = overrideDuration ?? calculatedDuration
  const blockValidation = getBlockValidation(currentBlock, t)
  const recentUploadsForType = recentUploads.filter(upload => {
    if (currentBlock.type === 'image') return upload.type === 'image'
    if (currentBlock.type === 'audio') return upload.type === 'audio'
    if (currentBlock.type === 'document_link') return upload.type === 'document'
    return false
  })
  const durationPresets = ['10', '15', '30', '45', '60', '90']
  const validityPresets = ['30', '90', '180', '365']
  const scorePresets = ['70', '80', '85', '90']
  const templateOptions = useMemo(
    () => (availableTemplates || []).filter(template => template?.id),
    [availableTemplates]
  )
  const quizOptions = useMemo(
    () => (availableQuizzes || []).filter(quiz => quiz?.id),
    [availableQuizzes]
  )
  const sopOptions = useMemo(
    () => (availableSOPs || []).filter(sop => sop?.id),
    [availableSOPs]
  )
  const selectedTemplate = templateOptions.find(template => template.id === templatePreset) || null
  const templateStats = getTemplateStats(selectedTemplate)
  const activeSectionName = sections.find(section => section.id === activeSection)?.title

  const openAIGenerator = (content: string, title: string, targetSectionId: string | null) => {
    setAiPrefillContent(content)
    setAiPrefillTitle(title)
    setAiTargetSectionId(targetSectionId)
    setShowAIDialog(true)
  }

  const openAIGeneratorForSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return
    const content = buildSectionSourceText(section)
    openAIGenerator(content, section.title, sectionId)
  }

  const openAIGeneratorForModule = () => {
    const content = buildModuleSourceText(sections)
    openAIGenerator(content, title || t('builder.untitledModule'), null)
  }

  const steps = [
    { key: 'setup', label: t('builder.steps.setup'), description: t('builder.steps.setupDesc') },
    { key: 'structure', label: t('builder.steps.structure'), description: t('builder.steps.structureDesc') },
    { key: 'content', label: t('builder.steps.content'), description: t('builder.steps.contentDesc') },
    { key: 'rules', label: t('builder.steps.rules'), description: t('builder.steps.rulesDesc') },
    { key: 'preview', label: t('builder.steps.preview'), description: t('builder.steps.previewDesc') },
    { key: 'publish', label: t('builder.steps.publish'), description: t('builder.steps.publishDesc') }
  ] as const

  const blockLibrary: Array<{ type: ContentType; label: string; hint: string }> = [
    { type: 'text', label: t('wizard.type_text', 'Text'), hint: t('builder.blockHints.text') },
    { type: 'video', label: t('wizard.type_video', 'Video'), hint: t('builder.blockHints.video') },
    { type: 'quiz', label: t('wizard.type_quiz', 'Quiz'), hint: t('builder.blockHints.quiz') },
    { type: 'document_link', label: t('wizard.type_document_link', 'Document'), hint: t('builder.blockHints.document') },
    { type: 'sop_reference', label: t('wizard.type_sop_reference', 'Policy'), hint: t('builder.blockHints.policy') },
    { type: 'image', label: t('wizard.type_image', 'Image'), hint: t('builder.blockHints.image') },
    { type: 'audio', label: t('wizard.type_audio', 'Audio'), hint: t('builder.blockHints.audio') },
    { type: 'interactive', label: t('wizard.type_interactive', 'Interactive'), hint: t('builder.blockHints.interactive') }
  ]
  const contentTypeLabelMap = useMemo(() => {
    return blockLibrary.reduce((acc, block) => {
      acc[block.type] = block.label
      return acc
    }, {} as Record<ContentType, string>)
  }, [blockLibrary])

  const applyTemplateToSections = (template: TrainingTemplate) => {
    const structure = template?.template_structure || {}
    const templateSections = Array.isArray(structure.sections)
      ? structure.sections
      : Array.isArray(structure.blocks)
        ? [{ title: template.name, items: structure.blocks }]
        : []

    if (templateSections.length === 0) {
      toast({
        title: t('builder.templateEmpty'),
        description: t('builder.templateEmptyDesc'),
        variant: 'destructive'
      })
      return
    }

    const timestamp = Date.now()
    const mappedSections: TrainingSection[] = templateSections.map((section: any, sectionIndex: number) => {
      const items = (section.items || section.content || section.blocks || []).map((item: any, itemIndex: number) => ({
        id: `content-${timestamp}-${sectionIndex}-${itemIndex}`,
        type: (item.type || 'text') as ContentType,
        title: item.title || '',
        content: item.content || '',
        content_url: item.content_url || '',
        content_data: item.content_data || {},
        is_mandatory: item.is_mandatory ?? true,
        duration: normalizeDurationMinutes(item.duration ?? item.duration_seconds),
        points: item.points,
        order: itemIndex
      }))

      return {
        id: `section-${timestamp}-${sectionIndex}`,
        title: section.title || t('builder.sectionLabel', { number: sectionIndex + 1 }),
        description: section.description || '',
        items,
        order: sectionIndex
      }
    })

    setSections(mappedSections)
    setActiveSection(mappedSections[0]?.id || null)

    if (!title.trim()) {
      setTitle(template.name)
    }
    if (!description.trim() && template.description) {
      setDescription(template.description)
    }
    if (!category && template.category) {
      setCategory(template.category)
    }

    toast({
      title: t('builder.templateApplied'),
      description: t('builder.templateAppliedDesc')
    })
  }

  function getTemplateStats(template?: TrainingTemplate | null) {
    if (!template) return { sectionsCount: 0, itemsCount: 0, sections: [] as Array<{ title: string; count: number }> }
    const structure = template?.template_structure || {}
    const templateSections = Array.isArray(structure.sections)
      ? structure.sections
      : Array.isArray(structure.blocks)
        ? [{ title: template.name, items: structure.blocks }]
        : []
    const sections = templateSections.map((section: any, index: number) => ({
      title: section.title || t('builder.sectionLabel', { number: index + 1 }),
      count: Array.isArray(section.items || section.content || section.blocks)
        ? (section.items || section.content || section.blocks).length
        : 0
    }))
    const itemsCount = sections.reduce((acc, s) => acc + s.count, 0)
    return { sectionsCount: sections.length, itemsCount, sections }
  }

  const handleTemplateSelection = (value: string) => {
    if (!value || value === 'none') {
      setTemplatePreset('none')
      return
    }

    const template = availableTemplates?.find(item => item.id === value)
    if (!template) return
    if (sections.length > 0) {
      toast({
        title: t('builder.templateNotApplied'),
        description: t('builder.templateNotAppliedDesc'),
        variant: 'destructive'
      })
      return
    }

    setTemplatePreset(value)
    applyTemplateToSections(template)
  }

  const requestApplyTemplate = (template: TrainingTemplate | null) => {
    if (!template) return
    if (sections.length === 0) {
      setTemplatePreset(template.id)
      applyTemplateToSections(template)
      setShowTemplatePreview(false)
      return
    }
    setPendingTemplate(template)
    setShowTemplateApplyConfirm(true)
  }

  const confirmApplyTemplate = () => {
    if (!pendingTemplate) {
      setShowTemplateApplyConfirm(false)
      return
    }
    setSections([])
    setActiveSection(null)
    setTemplatePreset(pendingTemplate.id)
    applyTemplateToSections(pendingTemplate)
    setPendingTemplate(null)
    setShowTemplateApplyConfirm(false)
    setShowTemplatePreview(false)
  }

  const setupComplete = title.trim().length > 0 && !!category
  const structureComplete = sections.length > 0
  const contentComplete = totalItems > 0
  const rulesComplete = !certificateEnabled || (Number(passingScore) > 0 && Number(passingScore) <= 100)
  const publishReady = setupComplete && structureComplete && contentComplete && rulesComplete

  const stepStatus: Record<BuilderStep, boolean> = {
    setup: setupComplete,
    structure: structureComplete,
    content: contentComplete,
    rules: rulesComplete,
    preview: publishReady,
    publish: publishReady
  }

  const currentStepIndex = steps.findIndex(step => step.key === builderStep)
  const canAccessStep = (target: BuilderStep) => {
    const targetIndex = steps.findIndex(step => step.key === target)
    if (targetIndex <= currentStepIndex) return true
    return steps.slice(0, targetIndex).every(step => stepStatus[step.key])
  }

  const handleStepChange = (target: BuilderStep) => {
    if (!canAccessStep(target)) {
      toast({
        title: t('builder.stepLocked'),
        description: t('builder.completePrevious'),
        variant: 'destructive'
      })
      return
    }
    setBuilderStep(target)
  }

  const goNextStep = async () => {
    const next = steps[currentStepIndex + 1]?.key
    if (!next) return
    if (!canAccessStep(next)) {
      handleStepChange(next)
      return
    }
    await handleSave()
    setBuilderStep(next)
  }

  const goPrevStep = () => {
    const prev = steps[currentStepIndex - 1]?.key
    if (!prev) return
    setBuilderStep(prev)
  }

  const validationChecklist = [
    { key: 'title', label: t('builder.validation.title'), ok: title.trim().length > 0 },
    { key: 'category', label: t('builder.validation.category'), ok: !!category },
    { key: 'structure', label: t('builder.validation.structure'), ok: sections.length > 0 },
    { key: 'content', label: t('builder.validation.content'), ok: totalItems > 0 },
    { key: 'rules', label: t('builder.validation.rules'), ok: rulesComplete }
  ]

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const savedBlocksKey = 'training_builder_saved_blocks_v1'
  const recentUploadsKey = 'training_builder_recent_uploads_v1'

  // No changes needed here, just removing the old definitions

  // getBlockValidation moved outside

  const addRecentUpload = (upload: { url: string; name: string; type: 'image' | 'audio' | 'document' }) => {
    setRecentUploads(prev => {
      const next = [upload, ...prev.filter(item => item.url !== upload.url)]
      const trimmed = next.slice(0, 8)
      try {
        localStorage.setItem(recentUploadsKey, JSON.stringify(trimmed))
      } catch {
        // ignore storage issues
      }
      return trimmed
    })
  }

  // deriveTitleFromUrl moved outside

  useEffect(() => {
    if (!showContentDialog) return
    setShowAdvancedBlockOptions(false)
    setShowTitleField(currentBlock.type === 'text')
    if (currentBlock.type === 'video' || currentBlock.type === 'interactive') {
      setMediaInputMode('link')
      return
    }
    if (currentBlock.type === 'image' || currentBlock.type === 'audio' || currentBlock.type === 'document_link') {
      setMediaInputMode(currentBlock.content_url ? 'link' : 'upload')
    }
  }, [showContentDialog, currentBlock.type])

  const draftKey = moduleId ? `training_builder_draft_${moduleId}` : 'training_builder_draft_new'
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [lastAutosaveAt, setLastAutosaveAt] = useState<Date | null>(null)
  const draftRestoreRef = useRef(false)
  const skipAutosaveRef = useRef(true)

  useEffect(() => {
    if (!isNewRoute || moduleId || draftRestoreRef.current || templateFromQuery) {
      skipAutosaveRef.current = false
      return
    }

    const stored = localStorage.getItem(draftKey)
    if (stored) {
      try {
        const draft = JSON.parse(stored)
        setTitle(draft.title || '')
        setDescription(draft.description || '')
        setCategory(draft.category || '')
        setDifficultyLevel(draft.difficultyLevel || 'beginner')
        setEstimatedDuration(draft.estimatedDuration || '')
        setUseEstimatedDuration(draft.useEstimatedDuration ?? !!draft.estimatedDuration)
        setValidityPeriod(draft.validityPeriod || '')
        setPassingScore(draft.passingScore || '80')
        setCertificateEnabled(draft.certificateEnabled ?? true)
        setAudience(draft.audience || 'all')
        setContentLanguage(draft.contentLanguage || 'bilingual')
        setTemplatePreset(draft.templatePreset || 'none')
        setSections(draft.sections || [])
        setActiveSection(draft.activeSection || null)
        toast({
          title: t('builder.draftRestored'),
          description: t('builder.draftRestoredDesc')
        })
      } catch (error) {
        console.error('Failed to restore draft:', error)
      }
    }

    draftRestoreRef.current = true
    skipAutosaveRef.current = false
  }, [draftKey, isNewRoute, moduleId, t, toast])

  useEffect(() => {
    if (skipAutosaveRef.current) return
    setAutosaveStatus('saving')

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = setTimeout(() => {
      const draftPayload = {
        title,
        description,
        category,
        difficultyLevel,
        estimatedDuration,
        useEstimatedDuration,
        validityPeriod,
        passingScore,
        certificateEnabled,
        audience,
        contentLanguage,
        templatePreset,
        sections,
        activeSection
      }

      try {
        localStorage.setItem(draftKey, JSON.stringify(draftPayload))
        setAutosaveStatus('saved')
        setLastAutosaveAt(new Date())
      } catch (error) {
        console.error('Failed to autosave draft:', error)
        setAutosaveStatus('idle')
      }
    }, 1200)

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    }
  }, [
    title,
    description,
    category,
    difficultyLevel,
    estimatedDuration,
    useEstimatedDuration,
    validityPeriod,
    passingScore,
    certificateEnabled,
    audience,
    contentLanguage,
    templatePreset,
    sections,
    activeSection,
    draftKey
  ])

  useEffect(() => {
    if (templateAppliedRef.current) return
    if (!templateFromQuery || moduleId) return
    if (templateOptions.length === 0) return
    if (sections.length > 0) return
    const template = templateOptions.find(item => item.id === templateFromQuery)
    if (template) {
      setTemplatePreset(template.id)
      applyTemplateToSections(template)
      templateAppliedRef.current = true
    }
  }, [templateOptions, moduleId, templateFromQuery, sections.length])

  const lastStepRef = useRef<BuilderStep | null>(null)

  useEffect(() => {
    analytics.track('lms_builder_opened', {
      module_id: moduleId || null,
      is_new: !moduleId
    })

    return () => {
      analytics.track('lms_builder_exit', {
        module_id: moduleId || null,
        last_step: lastStepRef.current
      })
    }
  }, [])

  useEffect(() => {
    if (lastStepRef.current === builderStep) return
    analytics.track('lms_builder_step_enter', {
      module_id: moduleId || null,
      step: builderStep,
      is_new: !moduleId,
      template_id: templatePreset && templatePreset !== 'none' ? templatePreset : null
    })
    lastStepRef.current = builderStep
  }, [builderStep, moduleId, templatePreset])

  const historyRef = useRef<TrainingSection[][]>([])
  const historyIndexRef = useRef(-1)
  const skipHistoryRef = useRef(false)
  const [historyIndex, setHistoryIndex] = useState(-1)

  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false
      return
    }
    const snapshot = JSON.parse(JSON.stringify(sections)) as TrainingSection[]
    const history = historyRef.current.slice(0, historyIndexRef.current + 1)
    history.push(snapshot)
    if (history.length > 30) history.shift()
    historyRef.current = history
    historyIndexRef.current = history.length - 1
    setHistoryIndex(historyIndexRef.current)
  }, [sections])

  const handleUndo = () => {
    if (historyIndexRef.current <= 0) return
    skipHistoryRef.current = true
    historyIndexRef.current -= 1
    setHistoryIndex(historyIndexRef.current)
    const prev = historyRef.current[historyIndexRef.current]
    setSections(prev)
    setActiveSection(prev[0]?.id || null)
  }

  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    skipHistoryRef.current = true
    historyIndexRef.current += 1
    setHistoryIndex(historyIndexRef.current)
    const next = historyRef.current[historyIndexRef.current]
    setSections(next)
    setActiveSection(next[0]?.id || null)
  }

  // Content management functions
  const addSection = () => {
    const newSection: TrainingSection = {
      id: `section-${Date.now()}`,
      title: `${t('builder.untitled')} ${sections.length + 1}`,
      items: [],
      order: sections.length
    }
    setSections([...sections, newSection])
    setActiveSection(newSection.id)
    return newSection.id
  }

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId))
    if (activeSection === sectionId) {
      setActiveSection(null)
    }
  }

  const persistSavedBlocks = (blocks: ContentBlockForm[]) => {
    setSavedBlocks(blocks)
    try {
      localStorage.setItem(savedBlocksKey, JSON.stringify(blocks))
    } catch {
      // ignore storage issues
    }
  }

  const handleSaveBlockToLibrary = () => {
    const validation = getBlockValidation(currentBlock, t)
    if (!validation.ok) {
      toast({
        title: t('error', 'Error'),
        description: validation.message,
        variant: 'destructive'
      })
      return
    }

    const entry: ContentBlockForm = {
      ...currentBlock,
      id: `saved-${Date.now()}`,
      order: 0
    }
    const next = [entry, ...savedBlocks.filter(block => block.id !== entry.id)].slice(0, 20)
    persistSavedBlocks(next)
    toast({
      title: t('builder.savedBlockTitle', 'Saved to library'),
      description: t('builder.savedBlockDesc', 'You can reuse this block in any module.')
    })
  }

  const handleRemoveSavedBlock = (blockId: string) => {
    const next = savedBlocks.filter(block => block.id !== blockId)
    persistSavedBlocks(next)
  }

  const insertSavedBlock = (block: ContentBlockForm) => {
    let targetSectionId = activeSection
    setSections(prev => {
      let updated = [...prev]
      if (!targetSectionId) {
        targetSectionId = `section-${Date.now()}`
        updated = [
          ...updated,
          {
            id: targetSectionId,
            title: `${t('builder.untitled')} ${updated.length + 1}`,
            items: [],
            order: updated.length
          }
        ]
      }
      return updated.map(section => {
        if (section.id !== targetSectionId) return section
        const newItem = {
          ...block,
          id: `content-${Date.now()}`,
          order: section.items.length
        }
        return { ...section, items: [...section.items, newItem] }
      })
    })
    setActiveSection(targetSectionId || null)
  }

  const addContent = (type: ContentType, sectionId?: string) => {
    let targetSection = sectionId || activeSection
    if (!targetSection) {
      targetSection = addSection()
    }

    setSelectedContent(null)
    setCurrentBlock({
      id: '',
      type,
      content: '',
      content_url: '',
      content_data: {},
      is_mandatory: true,
      title: '',
      order: 0
    })
    setActiveSection(targetSection || null)
    setShowContentDialog(true)
  }

  const saveContent = () => {
    if (!activeSection) return
    const validation = getBlockValidation(currentBlock, t)
    if (!validation.ok) {
      toast({
        title: t('error', 'Error'),
        description: validation.message,
        variant: 'destructive'
      })
      return
    }

    const normalizedTitle = currentBlock.title?.trim() || ''
    const fallbackTitle = normalizedTitle || contentTypeLabelMap[currentBlock.type] || t('builder.untitledContent', 'Content')
    const normalizedContent = currentBlock.type === 'text'
      ? currentBlock.content.trim()
      : (currentBlock.content?.trim() || fallbackTitle)

    const newContent: ContentBlockForm = {
      ...currentBlock,
      id: selectedContent?.id || `content-${Date.now()}`,
      title: fallbackTitle,
      content: normalizedContent,
      order: selectedContent?.order || 0
    }

    setSections(sections.map(section => {
      if (section.id === activeSection) {
        if (selectedContent) {
          // Update existing content
          return {
            ...section,
            items: section.items.map(item =>
              item.id === selectedContent.id ? newContent : item
            )
          }
        } else {
          // Add new content
          return {
            ...section,
            items: [...section.items, newContent]
          }
        }
      }
      return section
    }))

    setShowContentDialog(false)
    setSelectedContent(null)
    setCurrentBlock({
      id: '',
      type: 'text',
      content: '',
      content_url: '',
      content_data: {},
      is_mandatory: true,
      title: '',
      order: 0
    })
  }

  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document' | 'audio') => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `training/${type === 'audio' ? 'audios' : `${type}s`}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type // Explicitly set content type
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('documents').getPublicUrl(filePath)

      const displayName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim()
      setCurrentBlock(prev => ({
        ...prev,
        content_url: data.publicUrl,
        title: prev.title?.trim() ? prev.title : displayName
      }))
      addRecentUpload({ url: data.publicUrl, name: file.name, type })

      toast({
        title: t('uploadSuccessful'),
        description: type === 'image' ? t('imageUploaded') : t('documentUploaded')
      })
    } catch (error) {
      const errorDetails = getUserFriendlyError(error)
      toast({
        title: t('uploadFailed'),
        description: errorDetails.message,
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  const deleteContent = (sectionId: string, contentId: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: section.items.filter(item => item.id !== contentId)
        }
      }
      return section
    }))
  }

  const saveTraining = async () => {
    if (!title.trim()) {
      alert(`${t('title')} ${t('isRequired')}`)
      return
    }

    try {
      // Note: training_modules table only has basic columns.
      // Sections/content are stored separately in training_content_blocks
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        estimated_duration_minutes: useEstimatedDuration && estimatedDuration
          ? Number(estimatedDuration)
          : (calculatedDuration || null),
        validity_period_days: validityPeriod ? Number(validityPeriod) : null,
        category: category || null,
        difficulty_level: difficultyLevel || null,
        certificate_enabled: certificateEnabled,
        passing_score_percentage: passingScore ? Number(passingScore) : 80,
        allow_retake: allowRetake,
        max_attempts: allowRetake ? Number(maxAttempts) : null,
        auto_advance: autoAdvance,
        show_feedback: showFeedback,
        randomize_questions: randomizeQuestions,
        show_answers: showAnswers,
        time_limit_minutes: timeLimit,
        audience: audience || null,
        content_language: contentLanguage || null,
        template_id: templatePreset && templatePreset !== 'none' ? templatePreset : null,
        created_by: profile?.id ?? null
      }

      let currentModuleId = moduleId

      if (moduleId) {
        const { error } = await supabase
          .from('training_modules')
          .update(payload)
          .eq('id', moduleId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('training_modules')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        currentModuleId = data.id
        setCreatedModuleId(data.id)
      }

      // Save content blocks from sections
      if (currentModuleId) {
        // Delete existing blocks
        await supabase
          .from('training_content_blocks')
          .delete()
          .eq('training_module_id', currentModuleId)
        // Flatten sections into content blocks
        const allBlocks: any[] = []
        let orderIndex = 0

        for (const section of sections) {
          for (const item of section.items) {
            allBlocks.push({
              training_module_id: currentModuleId,
              type: item.type,
              content: item.content || item.title || '',
              content_url: item.content_url || null,
              content_data: item.content_data || {},
              order: orderIndex++,
              is_mandatory: item.is_mandatory ?? true,
              duration_seconds: toDurationSeconds(item.duration),
              points: item.points
            })
          }
        }

        // Also include any standalone content blocks only if sections are empty
        if (allBlocks.length === 0) {
          for (const block of contentBlocks) {
            allBlocks.push({
              training_module_id: currentModuleId,
              type: block.type,
              content: block.content || block.title || '',
              content_url: block.content_url || null,
              content_data: block.content_data || {},
              order: orderIndex++,
              is_mandatory: block.is_mandatory ?? true,
              duration_seconds: toDurationSeconds(block.duration),
              points: block.points
            })
          }
        }

        if (allBlocks.length > 0) {
          const { error: blocksError } = await supabase
            .from('training_content_blocks')
            .insert(allBlocks)
          if (blocksError) {
            const errorDetails = getUserFriendlyError(blocksError)
            toast({
              title: t('error'),
              description: errorDetails.message,
              variant: 'destructive'
            })
            throw blocksError
          }
        }

        // VERIFY PERSISTENCE
        const { count, error: verifyError } = await supabase
          .from('training_content_blocks')
          .select('*', { count: 'exact', head: true })
          .eq('training_module_id', currentModuleId)

        if (verifyError) {
          const errorDetails = getUserFriendlyError(verifyError)
          toast({
            title: t('verificationFailed'),
            description: errorDetails.message,
            variant: 'destructive'
          })
        }
        toast({
          title: t('moduleSaved'),
          description: t('moduleSavedDescription', { count: count || 0, defaultValue: `${count || 0} items saved` })
        })
      } else {
        alert(t('moduleSaved'))
      }
    } catch (error: unknown) {
      const errorDetails = getUserFriendlyError(error)
      toast({
        title: t('error'),
        description: errorDetails.message,
        variant: 'destructive'
      })
    }
  }

  const publishTraining = async () => {
    if (!publishReady) {
      toast({
        title: t('builder.publishBlocked'),
        description: t('builder.publishBlockedDesc'),
        variant: 'destructive'
      })
      return
    }

    try {
      const savedModuleId = await saveModuleMutation.mutateAsync()
      await saveContentBlocksMutation.mutateAsync(savedModuleId)
      await saveQuestionsMutation.mutateAsync(savedModuleId)

      if (savedModuleId) {
        const { error } = await supabase
          .from('training_modules')
          .update({
            status: 'published',
            updated_at: new Date().toISOString(),
            updated_by: profile?.id
          })
          .eq('id', savedModuleId)
        if (error) throw error
      }

      localStorage.removeItem(draftKey)

      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      queryClient.invalidateQueries({ queryKey: ['training-content-blocks', savedModuleId] })
      queryClient.invalidateQueries({ queryKey: ['training-module-full', savedModuleId] })

      toast({
        title: t('modulePublished'),
        description: t('builder.publishSuccess')
      })

      analytics.track('lms_builder_publish', {
        module_id: savedModuleId,
        template_id: templatePreset && templatePreset !== 'none' ? templatePreset : null,
        total_sections: sections.length,
        total_items: totalItems
      })

      // After publishing, move users to assignment flow to avoid editing confusion.
      const next = new URLSearchParams()
      next.set('view', 'assignments')
      if (savedModuleId) {
        next.set('assignModuleId', savedModuleId)
      }
      next.set('openAssign', '1')
      navigate(`/training/hub?${next.toString()}`)
    } catch (error: unknown) {
      const errorDetails = getUserFriendlyError(error)
      toast({
        title: t('error'),
        description: errorDetails.message,
        variant: 'destructive'
      })
    }
  }

  // Load module data if editing
  useQuery({
    queryKey: ['training-module', moduleId],
    queryFn: async () => {
      if (!moduleId) return null
      const { data, error } = await supabase
        .from('training_modules')
        .select('*')
        .eq('id', moduleId)
        .single()
      if (error) throw error
      return data as TrainingModule
    },
    enabled: !!moduleId
  })

  // Save module mutation
  const saveModuleMutation = useMutation({
    mutationFn: async () => {
      const safeTitle = title.trim() || t('builder.untitledModule') || 'Untitled Module'

      const payload = {
        title: safeTitle,
        description: description.trim() || null,
        estimated_duration_minutes: useEstimatedDuration && estimatedDuration
          ? Number(estimatedDuration)
          : (calculatedDuration || null),
        validity_period_days: validityPeriod ? Number(validityPeriod) : null,
        category: category || null,
        difficulty_level: difficultyLevel || null,
        certificate_enabled: certificateEnabled,
        passing_score_percentage: passingScore ? Number(passingScore) : 80,
        allow_retake: allowRetake,
        max_attempts: allowRetake ? Number(maxAttempts) : null,
        auto_advance: autoAdvance,
        show_feedback: showFeedback,
        randomize_questions: randomizeQuestions,
        show_answers: showAnswers,
        time_limit_minutes: timeLimit,
        audience: audience || null,
        content_language: contentLanguage || null,
        template_id: templatePreset && templatePreset !== 'none' ? templatePreset : null,
        created_by: profile?.id ?? null,
      }

      if (moduleId) {
        const { error } = await supabase
          .from('training_modules')
          .update(payload)
          .eq('id', moduleId)
        if (error) throw error
        return moduleId
      } else {
        const { data, error } = await supabase
          .from('training_modules')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        return data.id
      }
    },
    onSuccess: (newModuleId) => {
      setCreatedModuleId(newModuleId)
    }
  })

  // Save content blocks mutation
  const saveContentBlocksMutation = useMutation({
    mutationFn: async (idToUse?: string) => {
      const targetId = idToUse || moduleId
      if (!targetId) return

      // Delete existing blocks
      const { error: deleteError } = await supabase
        .from('training_content_blocks')
        .delete()
        .eq('training_module_id', targetId)
      if (deleteError) throw deleteError

      // Insert new blocks
      // Use sections to build the blocks list to ensure we capture the current UI state
      const blocksToInsert: any[] = []
      let orderIndex = 0

      for (const section of sections) {
        for (const item of section.items) {
          blocksToInsert.push({
            training_module_id: targetId,
            type: item.type,
            title: item.title || null,
            content: item.content || item.title || '',
            content_url: item.content_url || null,
            content_data: item.content_data || {},
            source_document_id: (item.content_data as Record<string, unknown> | undefined)?.sop_id as string | undefined || null,
            order: orderIndex++,
            is_mandatory: item.is_mandatory ?? true,
            duration_seconds: toDurationSeconds(item.duration),
            points: item.points
          })
        }
      }

      // Fallback for legacy flows that still populate flat contentBlocks.
      if (blocksToInsert.length === 0) {
        for (const block of contentBlocks) {
          blocksToInsert.push({
            training_module_id: targetId,
            type: block.type,
            title: block.title || null,
            content: block.content || block.title || '',
            content_url: block.content_url || null,
            content_data: block.content_data || {},
            source_document_id: (block.content_data as Record<string, unknown> | undefined)?.sop_id as string | undefined || null,
            order: orderIndex++,
            is_mandatory: block.is_mandatory ?? true,
            duration_seconds: toDurationSeconds(block.duration),
            points: block.points
          })
        }
      }

      if (blocksToInsert.length > 0) {
        const { error } = await supabase
          .from('training_content_blocks')
          .insert(blocksToInsert)
        if (error) throw error
      }
    }
  })

  // Save quiz questions mutation (legacy/manual questions)
  const saveQuestionsMutation = useMutation({
    mutationFn: async (idToUse?: string) => {
      const targetId = idToUse || moduleId
      if (!targetId) return

      // Delete existing questions
      await supabase
        .from('training_quizzes')
        .delete()
        .eq('training_module_id', targetId)

      // Insert new questions
      if (questions.length > 0) {
        const questionsToInsert = questions.map((question, index) => ({
          training_module_id: targetId,
          question: question.question,
          type: question.type,
          options: question.type === 'mcq' ? question.options : null,
          correct_answer: question.correct_answer,
          order: index
        }))

        const { error } = await supabase
          .from('training_quizzes')
          .insert(questionsToInsert)
        if (error) throw error
      }
    }
  })

  const handleSave = async () => {
    try {
      // First save the module
      const savedModuleId = await saveModuleMutation.mutateAsync()

      // Then save content blocks using the NEW ID
      await saveContentBlocksMutation.mutateAsync(savedModuleId)

      // Then save questions using the NEW ID
      await saveQuestionsMutation.mutateAsync(savedModuleId)

      toast({
        title: t('moduleSaved'),
        description: t('moduleSavedDescription', { defaultValue: 'Your training module has been saved successfully.' })
      })
    } catch (error: unknown) {
      const errorDetails = getUserFriendlyError(error)
      toast({
        title: t('error'),
        description: errorDetails.message,
        variant: 'destructive'
      })
    }
  }

  const handleAddContentBlock = () => {
    setEditingBlockIndex(null)
    setCurrentBlock({
      id: '',
      type: 'text',
      content: '',
      content_url: '',
      content_data: {},
      is_mandatory: true,
      title: '',
      order: contentBlocks.length
    })
    setShowContentDialog(true)
  }

  const handleEditContentBlock = (index: number) => {
    const block = contentBlocks[index]
    setCurrentBlock({ ...block })
    setEditingBlockIndex(index)
    setShowContentDialog(true)
  }

  const handleSaveContentBlock = () => {
    if (!currentBlock.content.trim()) return

    if (editingBlockIndex !== null) {
      const updated = [...contentBlocks]
      updated[editingBlockIndex] = currentBlock
      setContentBlocks(updated)
    } else {
      setContentBlocks([...contentBlocks, currentBlock])
    }

    setShowContentDialog(false)
    setCurrentBlock({
      id: '',
      type: 'text',
      content: '',
      content_url: '',
      content_data: {},
      is_mandatory: true,
      title: '',
      order: 0
    })
    setEditingBlockIndex(null)
  }

  const handleAddQuestion = () => {
    setCurrentQuestion({
      question: '',
      type: 'mcq',
      options: ['', ''],
      correct_answer: '',
      points: 1
    })
    setEditingQuestionIndex(null)
    setShowQuestionDialog(true)
  }

  const handleEditQuestion = (index: number) => {
    const question = questions[index]
    setCurrentQuestion({ ...question })
    setEditingQuestionIndex(index)
    setShowQuestionDialog(true)
  }

  const handleSaveQuestion = () => {
    if (!currentQuestion.question.trim()) return

    if (editingQuestionIndex !== null) {
      const updated = [...questions]
      updated[editingQuestionIndex] = currentQuestion
      setQuestions(updated)
    } else {
      setQuestions([...questions, currentQuestion])
    }

    setShowQuestionDialog(false)
    setCurrentQuestion({
      question: '',
      type: 'mcq',
      options: ['', ''],
      correct_answer: '',
      points: 1
    })
    setEditingQuestionIndex(null)
  }

  const handleQuestionOptionChange = (index: number, value: string) => {
    const updated = [...currentQuestion.options]
    updated[index] = value
    setCurrentQuestion({ ...currentQuestion, options: updated })
  }

  const addQuestionOption = () => {
    setCurrentQuestion({
      ...currentQuestion,
      options: [...currentQuestion.options, '']
    })
  }

  const removeQuestionOption = (index: number) => {
    if (currentQuestion.options.length <= 2) return
    const updated = currentQuestion.options.filter((_, i) => i !== index)
    setCurrentQuestion({ ...currentQuestion, options: updated })
  }





  const handleReorderSection = (dragIndex: number, hoverIndex: number) => {
    const newSections = [...sections]
    const [removed] = newSections.splice(dragIndex, 1)
    newSections.splice(hoverIndex, 0, removed)
    const updated = newSections.map((s, i) => ({ ...s, order: i }))
    setSections(updated)
  }

  const handleRenameSection = (sectionId: string, value: string) => {
    setSections(prev => prev.map(section => (
      section.id === sectionId ? { ...section, title: value } : section
    )))
  }

  const moveSection = (index: number, direction: number) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= sections.length) return
    handleReorderSection(index, targetIndex)
  }

  const handleReorderContent = (sectionId: string, dragIndex: number, hoverIndex: number) => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId)
    if (sectionIndex === -1) return

    const newSections = [...sections]
    const section = newSections[sectionIndex]
    const newItems = [...section.items]
    const [removed] = newItems.splice(dragIndex, 1)
    newItems.splice(hoverIndex, 0, removed)

    newSections[sectionIndex] = {
      ...section,
      items: newItems.map((item, i) => ({ ...item, order: i }))
    }
    setSections(newSections)
  }

  const renderStepContent = () => {
    if (builderStep === 'setup') {
      return (
        <div className="p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className={cn("text-lg font-semibold", isRTL ? 'text-right' : 'text-left')}>{t('builder.courseSetup')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('title')}</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('builder.untitledModule')}
                      className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.audience')}</Label>
                    <Select value={audience} onValueChange={setAudience}>
                      <SelectTrigger className={cn("bg-white border-slate-200", isRTL ? "flex-row-reverse" : "")}>
                        <SelectValue placeholder={t('builder.audiencePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.audienceAll')}</SelectItem>
                        <SelectItem value="new_hires" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.audienceNew')}</SelectItem>
                        <SelectItem value="front_desk" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.audienceFrontDesk')}</SelectItem>
                        <SelectItem value="housekeeping" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.audienceHousekeeping')}</SelectItem>
                        <SelectItem value="food_beverage" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.audienceFood')}</SelectItem>
                        <SelectItem value="maintenance" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.audienceMaintenance')}</SelectItem>
                        <SelectItem value="management" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.audienceManagement')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('description')}</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('builder.descriptionHint')}
                    rows={3}
                    className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('category')}</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className={cn("bg-white border-slate-200", isRTL ? "flex-row-reverse" : "")}>
                        <SelectValue placeholder={t('builder.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onboarding" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.onboarding')}</SelectItem>
                        <SelectItem value="compliance" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.compliance')}</SelectItem>
                        <SelectItem value="skills" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.skills')}</SelectItem>
                        <SelectItem value="operations" className={isRTL ? "flex-row-reverse" : ""}>{t('operations')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.difficulty')}</Label>
                    <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                      <SelectTrigger className={cn("bg-white border-slate-200", isRTL ? "flex-row-reverse" : "")}>
                        <SelectValue placeholder={t('builder.difficultyPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner" className={isRTL ? "flex-row-reverse" : ""}>{t('beginner')}</SelectItem>
                        <SelectItem value="intermediate" className={isRTL ? "flex-row-reverse" : ""}>{t('intermediate')}</SelectItem>
                        <SelectItem value="advanced" className={isRTL ? "flex-row-reverse" : ""}>{t('advanced')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.contentLanguage')}</Label>
                    <Select value={contentLanguage} onValueChange={setContentLanguage}>
                      <SelectTrigger className={cn("bg-white border-slate-200", isRTL ? "flex-row-reverse" : "")}>
                        <SelectValue placeholder={t('wizard.selectLanguage')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english" className={isRTL ? "flex-row-reverse" : ""}>{t('wizard.englishOnly')}</SelectItem>
                        <SelectItem value="arabic" className={isRTL ? "flex-row-reverse" : ""}>{t('wizard.arabicOnly')}</SelectItem>
                        <SelectItem value="bilingual" className={isRTL ? "flex-row-reverse" : ""}>{t('wizard.bilingual')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
                      <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('duration')} ({t('min')})</Label>
                      <div className={cn("flex items-center gap-2 text-xs text-slate-500", isRTL ? "flex-row-reverse" : "")}>
                        <span>{t('builder.overrideDuration', 'Override')}</span>
                        <Switch checked={useEstimatedDuration} onCheckedChange={setUseEstimatedDuration} />
                      </div>
                    </div>
                    <Input
                      type="number"
                      value={estimatedDuration}
                      onChange={(e) => {
                        setEstimatedDuration(e.target.value)
                        setUseEstimatedDuration(!!e.target.value)
                      }}
                      placeholder="30"
                      disabled={!useEstimatedDuration}
                      className={cn(
                        "bg-white border-slate-200 focus:ring-hotel-gold",
                        !useEstimatedDuration && "opacity-60",
                        isRTL ? "text-right" : ""
                      )}
                    />
                    <div className={cn("flex flex-wrap gap-2", isRTL ? "flex-row-reverse" : "")}>
                      {durationPresets.map(preset => (
                        <Button
                          key={preset}
                          type="button"
                          size="sm"
                          variant={estimatedDuration === preset && useEstimatedDuration ? 'default' : 'outline'}
                          onClick={() => {
                            setEstimatedDuration(preset)
                            setUseEstimatedDuration(true)
                          }}
                          className="h-7 text-xs"
                          disabled={!useEstimatedDuration}
                        >
                          {preset}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">{t('builder.calculatedDuration', { count: calculatedDuration })}</p>
                  </div>
                  <div className="space-y-3">
                    <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.validity')} ({t('builder.days')})</Label>
                    <Input
                      type="number"
                      value={validityPeriod}
                      onChange={(e) => setValidityPeriod(e.target.value)}
                      placeholder="365"
                      className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                    />
                    <div className={cn("flex flex-wrap gap-2", isRTL ? "flex-row-reverse" : "")}>
                      {validityPresets.map(preset => (
                        <Button
                          key={preset}
                          type="button"
                          size="sm"
                          variant={validityPeriod === preset ? 'default' : 'outline'}
                          onClick={() => setValidityPeriod(preset)}
                          className="h-7 text-xs"
                        >
                          {preset}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed border-2 bg-white/60">
              <CardHeader>
                <CardTitle className={cn("text-sm font-semibold text-slate-700", isRTL ? 'text-right' : 'text-left')}>{t('builder.smartDefaults')}</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4 text-sm text-slate-600">
                <div className="space-y-3">
                  <Label className={cn("text-xs font-semibold text-slate-500", isRTL ? "text-right block" : "")}>{t('builder.template')}</Label>
                  <Select value={templatePreset} onValueChange={handleTemplateSelection}>
                    <SelectTrigger className={cn("bg-white border-slate-200", isRTL ? "flex-row-reverse" : "")}>
                      <SelectValue placeholder={t('builder.templatePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.templateNone')}</SelectItem>
                      {isTemplatesLoading ? (
                        <div className="p-2 text-xs text-muted-foreground text-center">
                          {t('builder.templatesLoading', 'Loading templates...')}
                        </div>
                      ) : isTemplatesError ? (
                        <div className="p-2 text-xs text-red-500 text-center">
                          {t('builder.templatesError', 'Failed to load templates')}
                        </div>
                      ) : templateOptions.length > 0 ? (
                        templateOptions.map((template) => (
                          <SelectItem key={template.id} value={template.id} className={isRTL ? "flex-row-reverse" : ""}>
                            {template.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-xs text-muted-foreground text-center">
                          {t('builder.noTemplates')}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && templatePreset !== 'none' && (
                    <div className="rounded-lg border bg-white/70 p-3">
                      <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
                        <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.templatePreview', 'Template preview')}</div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowTemplatePreview(true)}
                        >
                          {t('preview')}
                        </Button>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        <div>{t('builder.templateSections', { count: templateStats.sectionsCount })}</div>
                        <div>{t('builder.templateItems', { count: templateStats.itemsCount })}</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-slate-50/70 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.recommendations')}</div>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <div>{t('builder.recommendationOne')}</div>
                    <div>{t('builder.recommendationTwo')}</div>
                    <div>{t('builder.recommendationThree')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    if (builderStep === 'structure') {
      return (
        <div className="p-6">
          <div className="max-w-4xl mx-auto space-y-5">
            <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{t('builder.structureTitle')}</h3>
                <p className="text-sm text-muted-foreground">{t('builder.structureDesc')}</p>
              </div>
              <Button onClick={addSection} className={cn("bg-hotel-gold hover:bg-hotel-gold-dark text-white", isRTL ? "flex-row-reverse" : "")}>
                <Plus className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                {t('builder.addSection')}
              </Button>
            </div>

            {sections.length === 0 ? (
              <Card className="border-dashed border-2 bg-slate-50/50">
                <CardContent className="text-center py-16 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Plus className="w-8 h-8 text-slate-300" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-700 mb-2">{t('builder.startStructure')}</h4>
                  <p className="text-slate-500 mb-6 max-w-sm">{t('builder.startStructureDesc')}</p>
                  <Button onClick={addSection} variant="outline" className={cn("border-dashed border-slate-300 hover:border-hotel-gold hover:text-hotel-gold", isRTL ? "flex-row-reverse" : "")}>
                    <Plus className={cn("w-4 h-4", isRTL ? "ml-1" : "mr-1")} />
                    {t('builder.addSection')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sections.map((section, index) => (
                  <Card key={section.id} className="border-slate-200 shadow-sm">
                    <CardContent className="py-4 space-y-3">
                      <div className={cn("flex items-center justify-between gap-4", isRTL ? "flex-row-reverse" : "")}>
                        <div className="flex-1 space-y-2">
                          <Label className={cn("text-xs font-semibold text-slate-500", isRTL ? "text-right block" : "")}>
                            {t('builder.sectionLabel', { number: index + 1 })}
                          </Label>
                          <Input
                            value={section.title}
                            onChange={(e) => handleRenameSection(section.id, e.target.value)}
                            className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                          />
                        </div>
                        <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal">
                            {section.items.length} {t('builder.items')}
                          </Badge>
                          <div className={cn("flex items-center gap-1", isRTL ? "flex-row-reverse" : "")}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => moveSection(index, -1)}
                              disabled={index === 0}
                            >
                              {t('builder.moveUp')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => moveSection(index, 1)}
                              disabled={index === sections.length - 1}
                            >
                              {t('builder.moveDown')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => deleteSection(section.id)}
                            >
                              {t('delete')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }

    if (builderStep === 'content') {
      return (
        <BuilderCanvas
          sections={sections}
          activeSection={activeSection}
          onSectionClick={(id) => setActiveSection(id)}
          onAddSection={addSection}
          onDeleteSection={deleteSection}
          onAddContent={(type, sectionId) => addContent(type, sectionId)}
          onEditContent={(sectionId, contentId) => {
            const contentIndex = contentBlocks.findIndex(c => c.id === contentId)
            if (contentIndex !== -1) handleEditContentBlock(contentIndex)
            const section = sections.find(s => s.id === sectionId)
            const item = section?.items.find(i => i.id === contentId)
            if (item) {
              setSelectedContent(item)
              setCurrentBlock(item)
              setShowContentDialog(true)
            }
          }}
          onDeleteContent={deleteContent}
          onReorderSection={handleReorderSection}
          onReorderContent={handleReorderContent}
          onGenerateQuizFromSection={openAIGeneratorForSection}
        />
      )
    }

    if (builderStep === 'rules') {
      return (
        <div className="p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className={cn("text-lg font-semibold", isRTL ? 'text-right' : 'text-left')}>{t('builder.rulesTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">{t('builder.certificate')}</Label>
                    <p className="text-xs text-muted-foreground">{t('builder.certificateHint')}</p>
                  </div>
                  <Switch checked={certificateEnabled} onCheckedChange={setCertificateEnabled} />
                </div>

                {certificateEnabled && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.passingScore')}</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={passingScore}
                        onChange={(e) => setPassingScore(e.target.value)}
                        className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                      />
                      <div className={cn("flex flex-wrap gap-2", isRTL ? "flex-row-reverse" : "")}>
                        {scorePresets.map(preset => (
                          <Button
                            key={preset}
                            type="button"
                            size="sm"
                            variant={passingScore === preset ? 'default' : 'outline'}
                            onClick={() => setPassingScore(preset)}
                            className="h-7 text-xs"
                          >
                            {preset}%
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.validity')}</Label>
                      <Input
                        type="number"
                        value={validityPeriod}
                        onChange={(e) => setValidityPeriod(e.target.value)}
                        className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                      />
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">{t('builder.allowRetake')}</Label>
                      <p className="text-xs text-muted-foreground">{t('builder.allowRetakeHint')}</p>
                    </div>
                    <Switch checked={allowRetake} onCheckedChange={setAllowRetake} />
                  </div>
                  <div className="space-y-2">
                    <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.maxAttempts')}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={maxAttempts}
                      onChange={(e) => setMaxAttempts(e.target.value)}
                      disabled={!allowRetake}
                      className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">{t('builder.autoAdvance')}</Label>
                      <p className="text-xs text-muted-foreground">{t('builder.autoAdvanceHint')}</p>
                    </div>
                    <Switch checked={autoAdvance} onCheckedChange={setAutoAdvance} />
                  </div>
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">{t('builder.showFeedback')}</Label>
                      <p className="text-xs text-muted-foreground">{t('builder.showFeedbackHint')}</p>
                    </div>
                    <Switch checked={showFeedback} onCheckedChange={setShowFeedback} />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">{t('builder.randomizeQuestions')}</Label>
                      <p className="text-xs text-muted-foreground">{t('builder.randomizeQuestionsHint')}</p>
                    </div>
                    <Switch checked={randomizeQuestions} onCheckedChange={setRandomizeQuestions} />
                  </div>
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">{t('builder.showAnswers')}</Label>
                      <p className="text-xs text-muted-foreground">{t('builder.showAnswersHint')}</p>
                    </div>
                    <Switch checked={showAnswers} onCheckedChange={setShowAnswers} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.timeLimit')}</Label>
                  <Input
                    type="number"
                    value={timeLimit ?? ''}
                    onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : null)}
                    placeholder={t('builder.timeLimitPlaceholder')}
                    className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    if (builderStep === 'preview') {
      return (
        <div className="p-6">
          <BuilderPreview
            title={title}
            description={description}
            sections={sections}
          />
        </div>
      )
    }

    if (builderStep === 'publish') {
      return (
        <div className="p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className={cn("text-lg font-semibold", isRTL ? 'text-right' : 'text-left')}>{t('builder.publishTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-lg border bg-slate-50/70 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.summary')}</div>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <div>{t('builder.summarySections', { count: sections.length })}</div>
                      <div>{t('builder.summaryItems', { count: totalItems })}</div>
                      <div>{t('builder.summaryDuration', { count: displayDuration || 0 })}</div>
                      {overrideDuration !== null && Math.round(overrideDuration) !== Math.round(calculatedDuration) && (
                        <div className="text-xs text-slate-500">{t('builder.calculatedDuration', { count: calculatedDuration })}</div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-slate-50/70 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.rulesSummary')}</div>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <div>{certificateEnabled ? t('builder.certEnabled') : t('builder.certDisabled')}</div>
                      <div>{t('builder.passScoreSummary', { score: passingScore || 80 })}</div>
                      <div>{t('builder.retakeSummary', { count: allowRetake ? Number(maxAttempts) : 0 })}</div>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-slate-50/70 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.publishChecklist')}</div>
                    <div className="mt-3 space-y-2 text-sm">
                      {validationChecklist.map(item => (
                        <div key={item.key} className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                          {item.ok ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                          <span className={item.ok ? 'text-slate-700' : 'text-amber-700'}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={cn("flex items-center justify-end gap-3", isRTL ? "flex-row-reverse" : "")}>
                  <Button variant="outline" onClick={handleSave}>
                    {t('builder.saveDraft')}
                  </Button>
                  <Button
                    onClick={publishTraining}
                    disabled={!publishReady}
                    className="bg-hotel-gold hover:bg-hotel-gold-dark text-white"
                  >
                    {t('builder.publish')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    return null
  }

  const renderRightPanel = () => {
    if (builderStep === 'setup') {
      return (
        <div className="p-4 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className={cn("text-sm font-semibold flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                <ListChecks className="w-4 h-4 text-slate-500" />
                {t('builder.setupChecklist')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {validationChecklist.slice(0, 2).map(item => (
                <div key={item.key} className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                  {item.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                  <span>{item.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-dashed border-2 bg-slate-50/50">
            <CardContent className="text-xs text-slate-600 space-y-2">
              <div>{t('builder.tipOne')}</div>
              <div>{t('builder.tipTwo')}</div>
              <div>{t('builder.tipThree')}</div>
            </CardContent>
          </Card>
        </div>
      )
    }

    if (builderStep === 'structure') {
      return (
        <div className="p-4 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className={cn("text-sm font-semibold", isRTL ? 'text-right' : 'text-left')}>{t('builder.structureGuide')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <div>{t('builder.structureTipOne')}</div>
              <div>{t('builder.structureTipTwo')}</div>
              <div>{t('builder.structureTipThree')}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-200">
            <CardContent className="text-sm text-slate-600 space-y-2">
              <div>{t('builder.summarySections', { count: sections.length })}</div>
              <div>{t('builder.summaryItems', { count: totalItems })}</div>
            </CardContent>
          </Card>
        </div>
      )
    }

    if (builderStep === 'content') {
      return (
        <div className="p-4 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className={cn("text-sm font-semibold", isRTL ? 'text-right' : 'text-left')}>{t('builder.courseSnapshot')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <div>{t('builder.summarySections', { count: sections.length })}</div>
              <div>{t('builder.summaryItems', { count: totalItems })}</div>
              <div>{t('builder.summaryDuration', { count: displayDuration || 0 })}</div>
              {overrideDuration !== null && Math.round(overrideDuration) !== Math.round(calculatedDuration) && (
                <div className="text-xs text-slate-500">{t('builder.calculatedDuration', { count: calculatedDuration })}</div>
              )}
              <div>{t('builder.summaryPoints', { count: totalPoints })}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-purple-100 bg-purple-50/50">
            <CardHeader className="pb-3">
              <CardTitle className={cn("text-sm font-medium uppercase tracking-wider text-purple-600 flex items-center gap-2", isRTL ? 'flex-row-reverse' : '')}>
                <Sparkles className="w-4 h-4" />
                {t('builder.aiTools')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className={cn("w-full justify-start bg-white border-purple-200 text-purple-700 hover:bg-purple-100", isRTL ? "flex-row-reverse" : "")}
                onClick={openAIGeneratorForModule}
              >
                <FileQuestion className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                {t('builder.generateQuiz')}
              </Button>
              <Button
                variant="outline"
                className={cn("w-full justify-start bg-white border-purple-200 text-purple-700 hover:bg-purple-100", isRTL ? "flex-row-reverse" : "")}
                onClick={() => setShowSmartWizard(true)}
              >
                <Layers className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                {t('builder.smartWizard')}
              </Button>
            </CardContent>
          </Card>
          <ModuleSkillsEditor moduleId={moduleId || ''} />
        </div>
      )
    }

    if (builderStep === 'rules') {
      return (
        <div className="p-4 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className={cn("text-sm font-semibold", isRTL ? 'text-right' : 'text-left')}>{t('builder.rulesSummary')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <div>{certificateEnabled ? t('builder.certEnabled') : t('builder.certDisabled')}</div>
              <div>{t('builder.passScoreSummary', { score: passingScore || 80 })}</div>
              <div>{t('builder.retakeSummary', { count: allowRetake ? Number(maxAttempts) : 0 })}</div>
            </CardContent>
          </Card>
        </div>
      )
    }

    if (builderStep === 'preview' || builderStep === 'publish') {
      return (
        <div className="p-4 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className={cn("text-sm font-semibold flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                <ListChecks className="w-4 h-4 text-slate-500" />
                {t('builder.publishChecklist')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {validationChecklist.map(item => (
                <div key={item.key} className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                  {item.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className={item.ok ? 'text-slate-700' : 'text-amber-700'}>{item.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )
    }

    return null
  }

  return (
    <div className={`min-h-screen bg-background flex flex-col ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Header */}
      <BuilderHeader
        title={title}
        isSaving={saveModuleMutation.isPending || saveContentBlocksMutation.isPending}
        hasUnsavedChanges={saveModuleMutation.isPending || saveContentBlocksMutation.isPending}
        onSave={handleSave}
        onPreview={() => handleStepChange('preview')}
        onMagic={() => setShowSmartWizard(true)}
        onTitleChange={setTitle}
      />

      <div className="border-b bg-white/80">
        <div className={`container py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className="flex flex-col gap-3">
            <div className={cn("flex items-center justify-between gap-4", isRTL ? "flex-row-reverse" : "")}>
              <div className={cn("flex flex-wrap items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                {steps.map((step, index) => {
                  const isActive = builderStep === step.key
                  const isDone = stepStatus[step.key]
                  const locked = !canAccessStep(step.key as BuilderStep)
                  return (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() => handleStepChange(step.key as BuilderStep)}
                      disabled={locked}
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        isActive ? "border-hotel-gold bg-hotel-gold/10 text-hotel-navy" : "border-slate-200 text-slate-600",
                        locked && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                        isDone ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                      )}>
                        {index + 1}
                      </span>
                      {step.label}
                    </button>
                  )
                })}
              </div>
              <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className={isRTL ? "flex-row-reverse" : ""}
                >
                  <RotateCcw className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                  {t('builder.undo')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={historyIndex >= historyRef.current.length - 1}
                  className={isRTL ? "flex-row-reverse" : ""}
                >
                  <RotateCw className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                  {t('builder.redo')}
                </Button>
                <div className="text-xs text-muted-foreground">
                  {autosaveStatus === 'saving' && t('builder.autosaveSaving')}
                  {autosaveStatus === 'saved' && t('builder.autosaveSaved', { time: lastAutosaveAt ? formatTime(lastAutosaveAt) : '' })}
                  {autosaveStatus === 'idle' && t('builder.autosaveIdle')}
                </div>
              </div>
            </div>
            <div className={cn("flex items-center justify-between gap-4", isRTL ? "flex-row-reverse" : "")}>
              <div className="text-xs text-muted-foreground">
                {steps[currentStepIndex]?.description}
              </div>
              <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goPrevStep}
                  disabled={currentStepIndex === 0}
                  className={isRTL ? "flex-row-reverse" : ""}
                >
                  <ChevronLeft className={cn("h-4 w-4", isRTL ? "ml-2 rotate-180" : "mr-2")} />
                  {t('builder.back')}
                </Button>
                <Button
                  size="sm"
                  onClick={goNextStep}
                  disabled={currentStepIndex === steps.length - 1}
                  className={isRTL ? "flex-row-reverse" : ""}
                >
                  {t('builder.next')}
                  <ChevronRight className={cn("h-4 w-4", isRTL ? "mr-2 rotate-180" : "ml-2")} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {builderStep === 'content' && (
          <aside className="hidden xl:flex w-64 border-r bg-white">
            <div className="p-4 space-y-4 w-full">
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.blockLibrary')}</div>
                <div className="text-xs text-slate-500">
                  {t('builder.activeSectionLabel')}: {activeSectionName || t('builder.noSectionSelected')}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addSection}
                className={cn("w-full", isRTL ? "flex-row-reverse" : "")}
              >
                <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                {t('builder.addSection')}
              </Button>
              <div className="space-y-2">
                {savedBlocks.length > 0 && (
                  <div className="space-y-2 pb-2 border-b border-slate-200">
                    <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.savedBlocks', 'Saved blocks')}</div>
                    {savedBlocks.slice(0, 5).map(block => (
                      <div
                        key={block.id}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left",
                          isRTL ? "text-right" : "text-left"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => insertSavedBlock(block)}
                          className="flex-1 text-left"
                        >
                          <div className="text-xs font-semibold text-slate-700">{block.title || contentTypeLabelMap[block.type]}</div>
                          <div className="text-[11px] text-slate-400">{contentTypeLabelMap[block.type]}</div>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-red-500"
                          onClick={() => handleRemoveSavedBlock(block.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {blockLibrary.map(block => (
                  <button
                    key={block.type}
                    type="button"
                    onClick={() => addContent(block.type)}
                    className={cn(
                      "w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-hotel-gold hover:bg-hotel-gold/5",
                      isRTL ? "text-right" : "text-left"
                    )}
                  >
                    <div className="text-sm font-semibold text-slate-700">{block.label}</div>
                    <div className="text-xs text-slate-500">{block.hint}</div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-y-auto">
          {renderStepContent()}
        </main>

        <BuilderSidebar className="hidden lg:flex w-[320px] border-l bg-slate-50/50">
          {renderRightPanel()}
        </BuilderSidebar>
      </div>


      {/* Content Dialog */}
      <Dialog open={showContentDialog} onOpenChange={setShowContentDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={isRTL ? 'text-right' : ''}>
              {selectedContent ? t('builder.editContent') : t('builder.addContent')}
            </DialogTitle>
            <DialogDescription className={isRTL ? 'text-right' : ''}>
              {t('builder.contentDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-xs",
            blockValidation.ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
            isRTL ? "flex-row-reverse" : ""
          )}>
            {blockValidation.ok ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <span>{blockValidation.message}</span>
          </div>
          <div className="space-y-5 py-4">
            {(currentBlock.type === 'text' || showTitleField) && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('title')}</Label>
                <Input
                  value={currentBlock.title}
                  onChange={(e) => setCurrentBlock({ ...currentBlock, title: e.target.value })}
                  placeholder={currentBlock.type === 'text' ? t('title') : t('builder.labelOptionalHint', 'Optional display label')}
                  className={isRTL ? 'text-right' : ''}
                />
                {currentBlock.type !== 'text' && (
                  <p className="text-xs text-gray-500 mt-1">{t('builder.labelOptionalHint', 'Optional display label')}</p>
                )}
              </div>
            )}
            {currentBlock.type !== 'text' && !showTitleField && (
              <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
                <span className="text-xs text-gray-500">{t('builder.labelOptionalHint', 'Optional display label')}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTitleField(true)}
                  className={cn("h-8 px-3 text-xs", isRTL ? "flex-row-reverse" : "")}
                >
                  {currentBlock.title?.trim() ? t('builder.editLabel', 'Edit label') : t('builder.addLabel', 'Add label')}
                </Button>
              </div>
            )}

            {currentBlock.type === 'quiz' && (
              <div className={cn("bg-blue-50 p-4 rounded-md border border-blue-100", isRTL ? 'text-right' : '')}>
                <Label className="text-blue-900">{t('builder.selectQuiz')}</Label>
                <div className="mt-1.5 text-left">
                  <Select
                    value={(currentBlock.content_data?.quiz_id as string) || ''}
                    onValueChange={(val) => {
                      const quiz = availableQuizzes?.find(q => q.id === val)
                      setCurrentBlock({
                        ...currentBlock,
                        // Only update title if it's generic/empty
                        title: (!currentBlock.title || currentBlock.title === 'Quiz') ? (quiz?.title || '') : currentBlock.title,
                        content_data: { ...currentBlock.content_data, quiz_id: val }
                      })
                    }}
                  >
                    <SelectTrigger className={cn("bg-white border-blue-200", isRTL ? "flex-row-reverse" : "")}>
                      <SelectValue placeholder={t('builder.selectQuizPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {quizOptions.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500 text-center">{t('builder.noQuizzesFound')}</div>
                      ) : (
                        quizOptions.map(q => (
                          <SelectItem key={q.id} value={q.id} className={isRTL ? "flex-row-reverse" : ""}>
                            <span className="font-medium">{q.title}</span>
                            <span className={cn("text-xs text-gray-400", isRTL ? "mr-2" : "ml-2")}>({q.question_count || 0} qs)</span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  {t('builder.quizEmbedHint')}
                </p>
              </div>
            )}

            {currentBlock.type === 'sop_reference' && (
              <div className={cn("bg-emerald-50 p-4 rounded-md border border-emerald-100", isRTL ? 'text-right' : '')}>
                <Label className="text-emerald-900">{t('builder.selectSop')}</Label>
                <div className="mt-1.5 text-left">
                  <Select
                    value={(currentBlock.content_data?.sop_id as string) || ''}
                    onValueChange={(val) => {
                      const sop = availableSOPs?.find(s => s.id === val)
                      setCurrentBlock({
                        ...currentBlock,
                        title: (!currentBlock.title || currentBlock.title === 'SOP Reference') ? (sop?.title || '') : currentBlock.title,
                        content_data: { ...currentBlock.content_data, sop_id: val }
                      })
                    }}
                  >
                    <SelectTrigger className={cn("bg-white border-emerald-200", isRTL ? "flex-row-reverse" : "")}>
                      <SelectValue placeholder={t('builder.selectSopPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {sopOptions.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500 text-center">{t('builder.noSopsFound')}</div>
                      ) : (
                        sopOptions.map(s => (
                          <SelectItem key={s.id} value={s.id} className={isRTL ? "flex-row-reverse" : ""}>
                            <span className="font-medium">{s.title}</span>
                            {/* s.category removed */}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-emerald-600 mt-2">
                  {t('builder.sopEmbedHint')}
                </p>
              </div>
            )}

            {currentBlock.type === 'text' && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('content')}</Label>
                <RichTextEditor
                  value={currentBlock.content}
                  onChange={(val) => setCurrentBlock({ ...currentBlock, content: val })}
                  placeholder={t('content')}
                  className="mt-2 text-left"
                  minHeight={300}
                  direction={isRTL ? 'rtl' : 'ltr'}
                />
                <p className="text-xs text-gray-500 mt-1">{t('builder.contentHint')}</p>
              </div>
            )}

            {currentBlock.type === 'video' && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('builder.embedUrl')}</Label>
                <Input
                  value={currentBlock.content_url}
                  onChange={(e) => setCurrentBlock({ ...currentBlock, content_url: e.target.value })}
                  onBlur={(e) => {
                    const derived = deriveTitleFromUrl(e.target.value)
                    if (!currentBlock.title?.trim() && derived) {
                      setCurrentBlock({ ...currentBlock, title: derived })
                    }
                  }}
                  placeholder="https://youtube.com/watch?v=..."
                  className={isRTL ? 'text-right' : ''}
                />
              </div>
            )}

            {currentBlock.type === 'audio' && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('builder.audioUrl', 'Audio URL')}</Label>
                <div className="space-y-3">
                  <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                    <Button
                      type="button"
                      size="sm"
                      variant={mediaInputMode === 'upload' ? 'default' : 'outline'}
                      onClick={() => setMediaInputMode('upload')}
                    >
                      {t('builder.uploadFile', 'Upload file')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={mediaInputMode === 'link' ? 'default' : 'outline'}
                      onClick={() => setMediaInputMode('link')}
                    >
                      {t('builder.useLink', 'Use link')}
                    </Button>
                  </div>
                  {mediaInputMode === 'link' && (
                    <Input
                      value={currentBlock.content_url}
                      onChange={(e) => setCurrentBlock({ ...currentBlock, content_url: e.target.value })}
                      onBlur={(e) => {
                        const derived = deriveTitleFromUrl(e.target.value)
                        if (!currentBlock.title?.trim() && derived) {
                          setCurrentBlock({ ...currentBlock, title: derived })
                        }
                      }}
                      placeholder="https://example.com/audio.mp3"
                      className={isRTL ? 'text-right' : ''}
                    />
                  )}
                  {mediaInputMode === 'upload' && (
                    <div className={`flex items-center gap-2 ${isRTL ? 'justify-end' : ''}`}>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => handleFileUpload(e, 'audio')}
                          disabled={uploading}
                          className="hidden"
                          id="audio-upload"
                        />
                        <label
                          htmlFor="audio-upload"
                          className={`flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <Upload className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{uploading ? t('uploading') : t('builder.uploadAudio', 'Upload Audio')}</span>
                        </label>
                      </div>
                    </div>
                  )}
                  {recentUploadsForType.length > 0 && (
                    <div className="rounded-md border border-slate-200 bg-white/80 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.recentUploads', 'Recent uploads')}</div>
                      <div className="mt-2 space-y-2">
                        {recentUploadsForType.map(item => (
                          <button
                            key={item.url}
                            type="button"
                            onClick={() => setCurrentBlock({ ...currentBlock, content_url: item.url, title: currentBlock.title?.trim() ? currentBlock.title : item.name })}
                            className={cn("w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 hover:border-hotel-gold", isRTL ? "text-right" : "text-left")}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentBlock.type === 'interactive' && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('builder.interactiveUrl', 'Interactive URL')}</Label>
                <Input
                  value={currentBlock.content_url}
                  onChange={(e) => setCurrentBlock({ ...currentBlock, content_url: e.target.value })}
                  onBlur={(e) => {
                    const derived = deriveTitleFromUrl(e.target.value)
                    if (!currentBlock.title?.trim() && derived) {
                      setCurrentBlock({ ...currentBlock, title: derived })
                    }
                  }}
                  placeholder="https://example.com/interactive"
                  className={isRTL ? 'text-right' : ''}
                />
              </div>
            )}

            {/* Image Support */}
            {currentBlock.type === 'image' && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('builder.imageUrl')}</Label>
                <div className="space-y-3">
                  <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                    <Button
                      type="button"
                      size="sm"
                      variant={mediaInputMode === 'upload' ? 'default' : 'outline'}
                      onClick={() => setMediaInputMode('upload')}
                    >
                      {t('builder.uploadFile', 'Upload file')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={mediaInputMode === 'link' ? 'default' : 'outline'}
                      onClick={() => setMediaInputMode('link')}
                    >
                      {t('builder.useLink', 'Use link')}
                    </Button>
                  </div>
                  {mediaInputMode === 'link' && (
                    <Input
                      value={currentBlock.content_url}
                      onChange={(e) => setCurrentBlock({ ...currentBlock, content_url: e.target.value })}
                      onBlur={(e) => {
                        const derived = deriveTitleFromUrl(e.target.value)
                        if (!currentBlock.title?.trim() && derived) {
                          setCurrentBlock({ ...currentBlock, title: derived })
                        }
                      }}
                      placeholder="https://example.com/image.jpg"
                      className={isRTL ? 'text-right' : ''}
                    />
                  )}
                  {mediaInputMode === 'upload' && (
                    <div className={`flex items-center gap-2 ${isRTL ? 'justify-end' : ''}`}>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'image')}
                          disabled={uploading}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className={`flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <Upload className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{uploading ? t('uploading') : t('uploadImage')}</span>
                        </label>
                      </div>
                    </div>
                  )}
                  {recentUploadsForType.length > 0 && (
                    <div className="rounded-md border border-slate-200 bg-white/80 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.recentUploads', 'Recent uploads')}</div>
                      <div className="mt-2 space-y-2">
                        {recentUploadsForType.map(item => (
                          <button
                            key={item.url}
                            type="button"
                            onClick={() => setCurrentBlock({ ...currentBlock, content_url: item.url, title: currentBlock.title?.trim() ? currentBlock.title : item.name })}
                            className={cn("w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 hover:border-hotel-gold", isRTL ? "text-right" : "text-left")}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentBlock.type === 'document_link' && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('builder.documentUrl')}</Label>
                <div className="space-y-3">
                  <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                    <Button
                      type="button"
                      size="sm"
                      variant={mediaInputMode === 'upload' ? 'default' : 'outline'}
                      onClick={() => setMediaInputMode('upload')}
                    >
                      {t('builder.uploadFile', 'Upload file')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={mediaInputMode === 'link' ? 'default' : 'outline'}
                      onClick={() => setMediaInputMode('link')}
                    >
                      {t('builder.useLink', 'Use link')}
                    </Button>
                  </div>
                  {mediaInputMode === 'link' && (
                    <Input
                      value={currentBlock.content_url}
                      onChange={(e) => setCurrentBlock({ ...currentBlock, content_url: e.target.value })}
                      onBlur={(e) => {
                        const derived = deriveTitleFromUrl(e.target.value)
                        if (!currentBlock.title?.trim() && derived) {
                          setCurrentBlock({ ...currentBlock, title: derived })
                        }
                      }}
                      placeholder="https://example.com/document.pdf"
                      className={isRTL ? 'text-right' : ''}
                    />
                  )}
                  {mediaInputMode === 'upload' && (
                    <div className={`flex items-center gap-2 ${isRTL ? 'justify-end' : ''}`}>
                      <div className="relative">
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx"
                          onChange={(e) => handleFileUpload(e, 'document')}
                          disabled={uploading}
                          className="hidden"
                          id="doc-upload"
                        />
                        <label
                          htmlFor="doc-upload"
                          className={`flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <Upload className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{uploading ? t('uploading') : t('uploadDocument')}</span>
                        </label>
                      </div>
                    </div>
                  )}
                  {recentUploadsForType.length > 0 && (
                    <div className="rounded-md border border-slate-200 bg-white/80 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.recentUploads', 'Recent uploads')}</div>
                      <div className="mt-2 space-y-2">
                        {recentUploadsForType.map(item => (
                          <button
                            key={item.url}
                            type="button"
                            onClick={() => setCurrentBlock({ ...currentBlock, content_url: item.url, title: currentBlock.title?.trim() ? currentBlock.title : item.name })}
                            className={cn("w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 hover:border-hotel-gold", isRTL ? "text-right" : "text-left")}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50/40">
              <button
                type="button"
                onClick={() => setShowAdvancedBlockOptions(prev => !prev)}
                className={cn(
                  "w-full px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center justify-between",
                  isRTL ? "flex-row-reverse text-right" : "text-left"
                )}
              >
                <span>{t('builder.optionalSettings', 'Optional settings')}</span>
                <span className="text-[11px] text-slate-400">
                  {showAdvancedBlockOptions ? t('builder.hideOptionalSettings', 'Hide') : t('builder.showOptionalSettings', 'Show')}
                </span>
              </button>
              {showAdvancedBlockOptions && (
                <div className={`grid grid-cols-2 gap-6 px-4 pb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={isRTL ? 'text-right' : ''}>
                    <Label>{t('duration')}</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={currentBlock.duration || ''}
                        onChange={(e) => setCurrentBlock({ ...currentBlock, duration: parseInt(e.target.value) })}
                        placeholder="10"
                        className={cn(isRTL ? "pl-8 text-right" : "pr-8")}
                      />
                      <span className={cn("absolute top-2.5 text-gray-400 text-sm", isRTL ? "left-3" : "right-3")}>{t('min')}</span>
                    </div>
                  </div>
                  <div className={isRTL ? 'text-right' : ''}>
                    <Label>{t('points')}</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={currentBlock.points || ''}
                        onChange={(e) => setCurrentBlock({ ...currentBlock, points: parseInt(e.target.value) })}
                        placeholder="1"
                        className={cn(isRTL ? "pl-8 text-right" : "pr-8")}
                      />
                      <span className={cn("absolute top-2.5 text-gray-400 text-sm", isRTL ? "left-3" : "right-3")}>{t('pts')}</span>
                    </div>
                  </div>
                  {currentBlock.type !== 'text' && currentBlock.type !== 'quiz' && currentBlock.type !== 'sop_reference' && (
                    <div className={`col-span-2 ${isRTL ? 'text-right' : ''}`}>
                      <Label>{t('builder.optionalNotes', 'Optional notes')}</Label>
                      <Textarea
                        value={currentBlock.content}
                        onChange={(e) => setCurrentBlock({ ...currentBlock, content: e.target.value })}
                        placeholder={t('builder.optionalNotesHint', 'Add short guidance if needed')}
                        rows={3}
                        className={cn("mt-2 bg-white", isRTL ? 'text-right' : '')}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={cn("flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3", isRTL ? "flex-row-reverse" : "")}>
              <div>
                <div className="text-sm font-semibold text-slate-700">{t('builder.mandatory')}</div>
                <div className="text-xs text-slate-500">{t('builder.mandatoryHint', 'Require completion before proceeding.')}</div>
              </div>
              <Switch checked={currentBlock.is_mandatory} onCheckedChange={(checked) => setCurrentBlock({ ...currentBlock, is_mandatory: checked })} />
            </div>

            <div className={`flex items-center justify-between gap-3 pt-4 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button variant="ghost" size="sm" onClick={handleSaveBlockToLibrary}>
                {t('builder.saveToLibrary', 'Save to library')}
              </Button>
              <div className={cn("flex items-center gap-3", isRTL ? "flex-row-reverse" : "")}>
                <Button variant="outline" onClick={() => setShowContentDialog(false)}>
                  {t('cancel')}
                </Button>
                <Button onClick={saveContent} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                  {selectedContent ? t('save') : t('builder.addContent')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog >

      {/* Template Preview Dialog */}
      <Dialog open={showTemplatePreview} onOpenChange={setShowTemplatePreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
              <Layers className="w-5 h-5 text-hotel-gold" />
              {t('builder.templatePreviewTitle', { name: selectedTemplate?.name || t('builder.template') })}
            </DialogTitle>
            <DialogDescription className={isRTL ? 'text-right' : ''}>
              {selectedTemplate?.description || t('builder.templatePreviewDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">{t('builder.templateSections', { count: templateStats.sectionsCount })}</div>
                <div className="mt-1 text-sm font-semibold text-slate-700">{templateStats.sectionsCount}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">{t('builder.templateItems', { count: templateStats.itemsCount })}</div>
                <div className="mt-1 text-sm font-semibold text-slate-700">{templateStats.itemsCount}</div>
              </div>
            </div>
            <div className="space-y-2">
              {templateStats.sections.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">
                  {t('builder.templateEmptyDesc')}
                </div>
              ) : (
                templateStats.sections.map((section, index) => (
                  <div
                    key={`${section.title}-${index}`}
                    className={cn("flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700", isRTL ? "flex-row-reverse text-right" : "")}
                  >
                    <span className="font-medium">{section.title}</span>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal">
                      {section.count} {t('builder.items')}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className={cn("flex items-center justify-between pt-4", isRTL ? "flex-row-reverse" : "")}>
            <Button
              variant="outline"
              onClick={() => setShowTemplatePreview(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={() => requestApplyTemplate(selectedTemplate)}
              disabled={!selectedTemplate || templatePreset === 'none'}
              className="bg-hotel-gold hover:bg-hotel-gold-dark text-white"
            >
              {t('builder.applyTemplate', 'Apply template')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Apply Confirmation */}
      <Dialog open={showTemplateApplyConfirm} onOpenChange={setShowTemplateApplyConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {t('builder.templateReplaceTitle', 'Replace current structure?')}
            </DialogTitle>
            <DialogDescription className={isRTL ? 'text-right' : ''}>
              {t('builder.templateReplaceDesc', 'Applying this template will clear your existing sections and content.')}
            </DialogDescription>
          </DialogHeader>
          <div className={cn("flex items-center justify-end gap-3 pt-4", isRTL ? "flex-row-reverse" : "")}>
            <Button variant="outline" onClick={() => setShowTemplateApplyConfirm(false)}>
              {t('builder.keepExisting', 'Keep existing')}
            </Button>
            <Button onClick={confirmApplyTemplate} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
              {t('builder.applyTemplate', 'Apply template')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Question Generator Dialog */}
      < Dialog open={showAIDialog} onOpenChange={setShowAIDialog} >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Sparkles className="w-5 h-5 text-purple-600" />
              {t('builder.aiQuestionGenerator')}
            </DialogTitle>
            <DialogDescription className={isRTL ? 'text-right' : ''}>
              {t('builder.aiDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* 
              The AIQuestionGenerator uses sopContent. 
              For Training Builder, we allow "general" mode where user pastes content.
              In Phase 2.5, we could auto-extract from linked SOPs.
            */}
            <AIQuestionGenerator
              sopId="general"
              sopTitle={aiPrefillTitle || title || t('builder.untitledModule')}
              sopContent={aiPrefillContent}
              initialContent={aiPrefillContent}
              initialSourceType="text"
              defaultGroundedOnly={aiPrefillContent.trim().length > 0}
              defaultIncludeCitations={aiPrefillContent.trim().length > 0}
              onQuestionsCreated={async (count, ids) => {
                setShowAIDialog(false)
                setAiTargetSectionId(null)
                setAiPrefillContent('')
                setAiPrefillTitle('')

                // Add quiz block to the active section (or first section) with the generated question IDs
                if (ids && ids.length > 0) {
                  // Check if module is saved (has ID)
                  if (!moduleId) {
                    toast({
                      title: t('common:error'),
                      description: t('saveModuleFirstBeforeQuiz'),
                      variant: 'destructive'
                    })
                    return
                  }

                  try {
                    // First, create a quiz entity in learning_quizzes
                    const { data: quizData, error: quizError } = await supabase
                      .from('learning_quizzes')
                      .insert({
                        title: `${title || t('builder.untitledModule')} - Quiz`,
                        description: `Auto-generated quiz with ${count} questions`,
                        status: 'published',
                        training_module_id: moduleId,
                        passing_score_percentage: Number(passingScore) || 80,
                        time_limit_minutes: null,
                        created_by: profile?.id
                      })
                      .select()
                      .single()

                    if (quizError) {
                      const errorDetails = getUserFriendlyError(quizError)
                      toast({
                        title: t('error'),
                        description: errorDetails.message,
                        variant: 'destructive'
                      })
                      throw quizError
                    }

                    // Link the questions to this quiz via the junction table
                    for (let i = 0; i < ids.length; i++) {
                      const questionId = ids[i]
                      await supabase
                        .from('learning_quiz_questions')
                        .insert({
                          quiz_id: quizData.id,
                          question_id: questionId,
                          display_order: i + 1,
                          points_override: 2
                        })
                    }

                    // Create the quiz content block with the proper quiz_id reference
                    const quizBlock: ContentBlockForm = {
                      id: `quiz-${Date.now()}`,
                      type: 'quiz' as ContentType,
                      title: t('builder.aiGeneratedQuiz'),
                      content: '',
                      content_url: '',
                      content_data: { quiz_id: quizData.id, question_ids: ids },
                      is_mandatory: true,
                      order: 0
                    }

                    // Determine target section: activeSection, or first section, or create a new one
                    const targetSectionId = aiTargetSectionId || activeSection || sections[0]?.id

                    if (targetSectionId) {
                      // Add to existing section
                      setSections(prevSections => prevSections.map(section => {
                        if (section.id === targetSectionId) {
                          return {
                            ...section,
                            items: [...section.items, { ...quizBlock, order: section.items.length }]
                          }
                        }
                        return section
                      }))
                    } else {
                      // Create a new section with the quiz block
                      const newSection: TrainingSection = {
                        id: `section-${Date.now()}`,
                        title: t('mainContent'),
                        description: '',
                        items: [quizBlock],
                        order: 0
                      }
                      setSections([newSection])
                      setActiveSection(newSection.id)
                    }

                    // Invalidate the quizzes cache so the new quiz appears in the dropdown
                    await queryClient.invalidateQueries({ queryKey: ['available-quizzes'] })

                    toast({
                      title: t('builder.questionsGenerated'),
                      description: t('builder.questionsAdded', { count })
                    })
                  } catch (error) {
                    const errorDetails = getUserFriendlyError(error)
                    toast({
                      title: t('common:error'),
                      description: errorDetails.message,
                      variant: 'destructive'
                    })
                  }
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog >

      {/* Smart Module Wizard */}
      < SmartModuleWizard
        open={showSmartWizard}
        onOpenChange={setShowSmartWizard}
        onModuleCreated={(newId) => {
          setCreatedModuleId(newId)
        }}
      />

      {/* Knowledge Base Floating Sidebar */}
      {
        showKBSidebar && (
          <div className="fixed inset-x-0 sm:inset-x-auto sm:right-0 top-16 bottom-0 w-full sm:w-80 z-40 shadow-xl border-l bg-white">
            <KnowledgeBaseSidebar
              moduleId={moduleId || undefined}
              moduleTopic={title}
              onInsertContent={(content) => {
                // Add content block
                const newBlock: ContentBlockForm = {
                  id: `block_${Date.now()}`,
                  type: content.type === 'ai_generated' ? 'text' : content.type as ContentType,
                  title: content.title,
                  content: content.content,
                  content_url: '',
                  content_data: content.sourceId ? { source_document_id: content.sourceId } : {},
                  is_mandatory: true,
                  order: contentBlocks.length
                }
                setContentBlocks([...contentBlocks, newBlock])
              }}
              onLinkDocument={(docId) => {
                const sop = availableSOPs?.find(s => s.id === docId)
                if (!sop) return

                const newBlock: ContentBlockForm = {
                  id: `sop-${Date.now()}`,
                  type: 'sop_reference',
                  title: sop.title,
                  content: '',
                  content_url: '',
                  content_data: { sop_id: docId },
                  is_mandatory: true,
                  order: 0
                }

                // Add to active section or first section
                const targetSectionId = activeSection || sections[0]?.id
                if (targetSectionId) {
                  setSections(prev => prev.map(s =>
                    s.id === targetSectionId
                      ? { ...s, items: [...s.items, { ...newBlock, order: s.items.length }] }
                      : s
                  ))
                  toast({
                    title: t('builder.added'),
                    description: t('builder.sopAdded', { title: sop.title })
                  })
                }
              }}
              onLinkQuiz={(quizId) => {
                const quiz = availableQuizzes?.find(q => q.id === quizId)
                if (!quiz) return

                const newBlock: ContentBlockForm = {
                  id: `quiz-${Date.now()}`,
                  type: 'quiz',
                  title: quiz.title,
                  content: '',
                  content_url: '',
                  content_data: { quiz_id: quizId },
                  is_mandatory: true,
                  order: 0
                }

                const targetSectionId = activeSection || sections[0]?.id
                if (targetSectionId) {
                  setSections(prev => prev.map(s =>
                    s.id === targetSectionId
                      ? { ...s, items: [...s.items, { ...newBlock, order: s.items.length }] }
                      : s
                  ))
                  toast({
                    title: t('builder.added'),
                    description: t('builder.quizAdded', { title: quiz.title })
                  })
                }
              }}
              onAddQuestions={async (questionIds) => {
                if (!questionIds.length) return
                if (!moduleId) {
                  toast({
                    title: t('common:error'),
                    description: t('saveModuleFirst'),
                    variant: 'destructive'
                  })
                  return
                }

                try {
                  // Create a new quiz from these questions
                  const { data: quizData, error: quizError } = await supabase
                    .from('learning_quizzes')
                    .insert({
                      title: `${title || t('builder.untitledModule')} - Generated Quiz`,
                      description: `Created from Knowledge Base questions`,
                      status: 'published',
                      training_module_id: moduleId,
                      passing_score_percentage: 80,
                      created_by: profile?.id
                    })
                    .select()
                    .single()

                  if (quizError) throw quizError

                  // Link questions
                  const quizQuestions = questionIds.map((qId, idx) => ({
                    quiz_id: quizData.id,
                    question_id: qId,
                    display_order: idx + 1,
                    points_override: 1
                  }))

                  const { error: linkError } = await supabase
                    .from('learning_quiz_questions')
                    .insert(quizQuestions)

                  if (linkError) throw linkError

                  // Add quiz block
                  const newBlock: ContentBlockForm = {
                    id: `quiz-${Date.now()}`,
                    type: 'quiz',
                    title: quizData.title,
                    content: '',
                    content_url: '',
                    content_data: { quiz_id: quizData.id },
                    is_mandatory: true,
                    order: 0
                  }

                  const targetSectionId = activeSection || sections[0]?.id
                  if (targetSectionId) {
                    setSections(prev => prev.map(s =>
                      s.id === targetSectionId
                        ? { ...s, items: [...s.items, { ...newBlock, order: s.items.length }] }
                        : s
                    ))

                    // Refresh quizzes list
                    queryClient.invalidateQueries({ queryKey: ['available-quizzes'] })

                    toast({
                      title: t('builder.added'),
                      description: t('builder.questionsAdded', { count: questionIds.length })
                    })
                  }

                } catch (err) {
                  toast({
                    title: t('common:error'),
                    description: 'Failed to create quiz from questions.',
                    variant: 'destructive'
                  })
                }
              }}
              className="h-full"
            />
          </div>
        )
      }
    </div >
  )
}

// Default export for backward compatibility
export default TrainingBuilder
