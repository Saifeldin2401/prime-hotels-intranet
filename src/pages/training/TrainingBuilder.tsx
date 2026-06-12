import { SmartModuleWizard } from '@/components/training'
import { BuilderCanvas } from '@/components/training/builder/BuilderCanvas'
import { BuilderHeader } from '@/components/training/builder/BuilderHeader'
import { BuilderPreview } from '@/components/training/builder/BuilderPreview'
import { BuilderSidebar } from '@/components/training/builder/BuilderSidebar'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { getUserFriendlyError } from '@/lib/errorMessages'
import { getEncryptedLocalStorage, removeEncryptedLocalStorage, setEncryptedLocalStorage } from '@/lib/secureStorage'
import { useFormPersistence } from '@/hooks/useFormPersistence'
import { supabase } from '@/lib/supabase'
import type { TrainingModule } from '@/lib/types'
import { cn } from '@/lib/utils'
import { analytics } from '@/services/analyticsService'
import { quizIntegrityService } from '@/services/quizIntegrityService'
import type { LearningQuiz } from '@/types/learning'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RotateCcw,
  RotateCw,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { AIQuizDialog } from './components/builder/AIQuizDialog'
import { ContentBlockDialog } from './components/builder/ContentBlockDialog'
import { KBSidebarPanel } from './components/builder/KBSidebarPanel'
import { RightPanel } from './components/builder/RightPanel'
import { StepPublish } from './components/builder/StepPublish'
import { StepRules } from './components/builder/StepRules'
import { StepSetup } from './components/builder/StepSetup'
import { StepStructure } from './components/builder/StepStructure'
import { TemplateApplyConfirmDialog, TemplatePreviewDialog } from './components/builder/TemplateDialogs'
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  TRAINING_BUILDER_RECENT_UPLOADS_KEY,
  TRAINING_BUILDER_SAVED_BLOCKS_KEY,
} from './components/builder/trainingBuilderConstants'
import type {
  BuilderDraftPayload,
  BuilderStep,
  ContentBlockForm,
  ContentType,
  RecentUpload,
  TemplateStructure,
  TemplateStructureSection,
  TrainingContentBlockInsert,
  TrainingSection,
  TrainingTemplate,
} from './components/builder/trainingBuilderTypes'
import {
  buildModuleSourceText,
  buildSectionSourceText,
  cloneSections,
  estimateBlockDurationMinutes,
  getBlockValidation,
  normalizeEstimatedDuration,
  normalizeDurationMinutes,
  toDurationSeconds,
} from './components/builder/trainingBuilderUtils'

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

  const { data: availableQuizzes } = useQuery({
    queryKey: ['available-quizzes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_quizzes')
        .select('*')
        .order('title')
      if (error) throw error
      return data as LearningQuiz[]
    }
  })

  const { data: availableSOPs } = useQuery({
    queryKey: ['available-sops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title')
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

  const [createdModuleId, setCreatedModuleId] = useState<string | null>(null)
  const rawModuleId = isNewRoute ? createdModuleId : id || null
  const moduleId = isValidUuid(rawModuleId) ? rawModuleId : null
  const [moduleStatus, setModuleStatus] = useState('draft')
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
  const [timeLimit, setTimeLimit] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(true)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [randomizeQuestions, setRandomizeQuestions] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)
  const templateFromQuery = searchParams.get('template')
  const templateAppliedRef = useRef(false)
  const hydratedModuleRef = useRef<string | null>(null)

  const hydrateModuleState = useCallback((loadedModule: TrainingModule) => {
    setModuleStatus(loadedModule.status || 'draft')
    setTitle(loadedModule.title)
    setDescription(loadedModule.description || '')
    const normalizedEstimate = normalizeEstimatedDuration(loadedModule.estimated_duration_minutes)
    setEstimatedDuration(normalizedEstimate ? normalizedEstimate.toString() : '')
    setUseEstimatedDuration(!!normalizedEstimate)
    setValidityPeriod(loadedModule.validity_period_days?.toString() || '')
    setCategory(loadedModule.category || '')
    setDifficultyLevel(loadedModule.difficulty_level || 'beginner')
    setCertificateEnabled(loadedModule.certificate_enabled ?? true)
    setPassingScore(loadedModule.passing_score_percentage?.toString() || '80')
    setAllowRetake(loadedModule.allow_retake ?? true)
    setMaxAttempts(loadedModule.max_attempts?.toString() || '3')
    setAutoAdvance(loadedModule.auto_advance ?? false)
    setShowFeedback(loadedModule.show_feedback ?? true)
    setRandomizeQuestions(loadedModule.randomize_questions ?? false)
    setShowAnswers(loadedModule.show_answers ?? false)
    setTimeLimit(loadedModule.time_limit_minutes ?? null)
    setAudience(loadedModule.audience || 'all')
    setContentLanguage(loadedModule.content_language || 'bilingual')
    setTemplatePreset(loadedModule.template_id || 'none')
  }, [])

  useEffect(() => {
    if (isNewRoute) {
      hydratedModuleRef.current = null
      setModuleStatus('draft')
      return
    }
    setCreatedModuleId(null)
  }, [isNewRoute])

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
      const loadedModule = data as TrainingModule
      if (hydratedModuleRef.current !== loadedModule.id) {
        hydrateModuleState(loadedModule)
        hydratedModuleRef.current = loadedModule.id
      }
      return loadedModule
    },
    enabled: !!moduleId
  })

  useEffect(() => {
    let isActive = true

    const restoreBuilderLibrary = async () => {
      const storedBlocks = await getEncryptedLocalStorage<ContentBlockForm[]>(TRAINING_BUILDER_SAVED_BLOCKS_KEY)
      if (isActive && Array.isArray(storedBlocks)) {
        setSavedBlocks(storedBlocks)
      }

      const storedUploads = await getEncryptedLocalStorage<RecentUpload[]>(TRAINING_BUILDER_RECENT_UPLOADS_KEY)
      if (isActive && Array.isArray(storedUploads)) {
        setRecentUploads(storedUploads)
      }
    }

    void restoreBuilderLibrary()

    return () => {
      isActive = false
    }
  }, [])

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

  useEffect(() => {
    if (contentBlocksData && contentBlocksData.length > 0 && !isLoadedRef.current) {
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
  }, [contentBlocksData, t])

  const [sections, setSections] = useState<TrainingSection[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [builderStep, setBuilderStep] = useState<BuilderStep>(() => (moduleId ? 'content' : 'setup'))
  const [selectedContent, setSelectedContent] = useState<ContentBlockForm | null>(null)
  const [showTitleField, setShowTitleField] = useState(true)
  const [showAdvancedBlockOptions, setShowAdvancedBlockOptions] = useState(false)
  const [mediaInputMode, setMediaInputMode] = useState<'upload' | 'link' | 'library'>('upload')
  const [savedBlocks, setSavedBlocks] = useState<ContentBlockForm[]>([])
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([])
  const [showVideoMediaPicker, setShowVideoMediaPicker] = useState(false)
  const [showDocumentPicker, setShowDocumentPicker] = useState(false)
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const [showTemplateApplyConfirm, setShowTemplateApplyConfirm] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<TrainingTemplate | null>(null)

  const [hasMounted, setHasMounted] = useState(false)
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)
  const restoredDraftRef = useRef(false)

  const formPersistence = useFormPersistence<{
    title: string
    description: string
    estimatedDuration: string
    useEstimatedDuration: boolean
    validityPeriod: string
    passingScore: string
    maxAttempts: string
    allowRetake: boolean
    category: string
    difficultyLevel: string
    audience: string
    contentLanguage: string
    templatePreset: string
    certificateEnabled: boolean
    timeLimit: number | null
    showFeedback: boolean
    autoAdvance: boolean
    randomizeQuestions: boolean
    showAnswers: boolean
    sections: TrainingSection[]
  }>({
    key: `training_builder_${id || 'new'}`,
    enabled: isNewRoute,
    debounceMs: 1000,
    version: 1,
  })
  const { loadDraft, saveDraft, clearDraft } = formPersistence

  useEffect(() => {
    if (!isNewRoute) {
      setHasMounted(true)
      return
    }

    const draft = loadDraft()
    if (draft) {
      if (draft.title) setTitle(draft.title)
      if (draft.description) setDescription(draft.description)
      if (draft.estimatedDuration) setEstimatedDuration(draft.estimatedDuration)
      if (draft.useEstimatedDuration !== undefined) setUseEstimatedDuration(draft.useEstimatedDuration)
      if (draft.validityPeriod) setValidityPeriod(draft.validityPeriod)
      if (draft.passingScore) setPassingScore(draft.passingScore)
      if (draft.maxAttempts) setMaxAttempts(draft.maxAttempts)
      if (draft.allowRetake !== undefined) setAllowRetake(draft.allowRetake)
      if (draft.category) setCategory(draft.category)
      if (draft.difficultyLevel) setDifficultyLevel(draft.difficultyLevel)
      if (draft.audience) setAudience(draft.audience)
      if (draft.contentLanguage) setContentLanguage(draft.contentLanguage)
      if (draft.templatePreset) setTemplatePreset(draft.templatePreset)
      if (draft.certificateEnabled !== undefined) setCertificateEnabled(draft.certificateEnabled)
      if (draft.timeLimit !== undefined) setTimeLimit(draft.timeLimit)
      if (draft.showFeedback !== undefined) setShowFeedback(draft.showFeedback)
      if (draft.autoAdvance !== undefined) setAutoAdvance(draft.autoAdvance)
      if (draft.randomizeQuestions !== undefined) setRandomizeQuestions(draft.randomizeQuestions)
      if (draft.showAnswers !== undefined) setShowAnswers(draft.showAnswers)
      if (draft.sections && draft.sections.length > 0) {
        setSections(draft.sections)
      }

      if (!restoredDraftRef.current) {
        restoredDraftRef.current = true
        setShowRestorePrompt(true)
        setTimeout(() => setShowRestorePrompt(false), 8000)
      }
    }
    setHasMounted(true)
  }, [isNewRoute, loadDraft])

  useEffect(() => {
    if (!hasMounted || !isNewRoute) return

    saveDraft({
      title,
      description,
      estimatedDuration,
      useEstimatedDuration,
      validityPeriod,
      passingScore,
      maxAttempts,
      allowRetake,
      category,
      difficultyLevel,
      audience,
      contentLanguage,
      templatePreset,
      certificateEnabled,
      timeLimit,
      showFeedback,
      autoAdvance,
      randomizeQuestions,
      showAnswers,
      sections,
    })
  }, [
    hasMounted, isNewRoute, saveDraft,
    title, description, estimatedDuration, useEstimatedDuration,
    validityPeriod, passingScore, maxAttempts, allowRetake,
    category, difficultyLevel, audience, contentLanguage, templatePreset,
    certificateEnabled, timeLimit, showFeedback, autoAdvance,
    randomizeQuestions, showAnswers, sections,
  ])

  const [contentBlocks, setContentBlocks] = useState<ContentBlockForm[]>([])
  const [showContentDialog, setShowContentDialog] = useState(false)

  const [questions, _setQuestions] = useState<Array<{
    question: string; type: 'mcq' | 'true_false' | 'fill_blank'; options: string[];
    correct_answer: string; points: number; explanation?: string
  }>>([])
  const [showAIDialog, setShowAIDialog] = useState(false)
  const [aiPrefillContent, setAiPrefillContent] = useState('')
  const [aiPrefillTitle, setAiPrefillTitle] = useState('')
  const [aiTargetSectionId, setAiTargetSectionId] = useState<string | null>(null)
  const [showKBSidebar, _setShowKBSidebar] = useState(false)
  const [showSmartWizard, setShowSmartWizard] = useState(false)
  const [isValidatingQuizzes, setIsValidatingQuizzes] = useState(false)

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
  const linkedQuizIds = useMemo(
    () => Array.from(new Set(
      sections.flatMap(section =>
        section.items
          .filter(item => item.type === 'quiz')
          .map(item => ((item.content_data as { quiz_id?: string }).quiz_id || '').trim())
          .filter((quizId): quizId is string => quizId.length > 0)
      )
    )),
    [sections]
  )

  const openAIGenerator = (content: string, aiTitle: string, targetSectionId: string | null) => {
    setAiPrefillContent(content)
    setAiPrefillTitle(aiTitle)
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

  const blockLibrary = useMemo<Array<{ type: ContentType; label: string; hint: string }>>(
    () => [
      { type: 'text', label: t('wizard.type_text', 'Text'), hint: t('builder.blockHints.text') },
      { type: 'video', label: t('wizard.type_video', 'Video'), hint: t('builder.blockHints.video') },
      { type: 'quiz', label: t('wizard.type_quiz', 'Quiz'), hint: t('builder.blockHints.quiz') },
      { type: 'document_link', label: t('wizard.type_document_link', 'Document'), hint: t('builder.blockHints.document') },
      { type: 'sop_reference', label: t('wizard.type_sop_reference', 'Policy'), hint: t('builder.blockHints.policy') },
      { type: 'image', label: t('wizard.type_image', 'Image'), hint: t('builder.blockHints.image') },
      { type: 'audio', label: t('wizard.type_audio', 'Audio'), hint: t('builder.blockHints.audio') },
      { type: 'interactive', label: t('wizard.type_interactive', 'Interactive'), hint: t('builder.blockHints.interactive') }
    ],
    [t]
  )
  const contentTypeLabelMap = useMemo(() => {
    return blockLibrary.reduce((acc, block) => {
      acc[block.type] = block.label
      return acc
    }, {} as Record<ContentType, string>)
  }, [blockLibrary])

  const applyTemplateToSections = useCallback((template: TrainingTemplate) => {
    const structure = (
      template?.template_structure && typeof template.template_structure === 'object'
        ? template.template_structure
        : {}
    ) as TemplateStructure
    const templateSections: TemplateStructureSection[] = Array.isArray(structure.sections)
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
    const mappedSections: TrainingSection[] = templateSections.map((section, sectionIndex) => {
      const rawItems = Array.isArray(section.items)
        ? section.items
        : Array.isArray(section.content)
          ? section.content
          : Array.isArray(section.blocks)
            ? section.blocks
            : []

      const items = rawItems.map((item, itemIndex) => ({
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
  }, [category, description, t, title, toast])

  function getTemplateStats(template?: TrainingTemplate | null) {
    if (!template) return { sectionsCount: 0, itemsCount: 0, sections: [] as Array<{ title: string; count: number }> }
    const structure = (
      template?.template_structure && typeof template.template_structure === 'object'
        ? template.template_structure
        : {}
    ) as TemplateStructure
    const templateSections: TemplateStructureSection[] = Array.isArray(structure.sections)
      ? structure.sections
      : Array.isArray(structure.blocks)
        ? [{ title: template.name, items: structure.blocks }]
        : []
    const sects = templateSections.map((section, index: number) => ({
      title: section.title || t('builder.sectionLabel', { number: index + 1 }),
      count: Array.isArray(section.items)
        ? section.items.length
        : Array.isArray(section.content)
          ? section.content.length
          : Array.isArray(section.blocks)
            ? section.blocks.length
            : 0
    }))
    const itemsCount = sects.reduce((acc, s) => acc + s.count, 0)
    return { sectionsCount: sects.length, itemsCount, sections: sects }
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

  const ensureLinkedQuizzesIntegrity = useCallback(async (mode: 'save' | 'publish') => {
    if (linkedQuizIds.length === 0) {
      return true
    }

    setIsValidatingQuizzes(true)

    try {
      const moduleContext = buildModuleSourceText(sections)
      const reports = await Promise.all(
        linkedQuizIds.map(quizId => quizIntegrityService.ensureQuizIntegrity(quizId, {
          autoRepair: true,
          autoPublish: mode === 'publish',
          moduleTitle: title.trim() || t('builder.untitledModule'),
          moduleContext
        }))
      )

      const repairedCount = reports.reduce((count, report) => count + report.repairedQuestionIds.length, 0)
      const publishedCount = reports.filter(report => report.autoPublished).length
      const blockingIssues = reports.flatMap(report =>
        report.issues
          .filter(issue => issue.severity === 'error')
          .map(issue => `${report.quizTitle}: ${issue.message}`)
      )

      if (repairedCount > 0) {
        toast({
          title: 'Quiz issues fixed automatically',
          description: `${repairedCount} linked question${repairedCount === 1 ? '' : 's'} were repaired with AI before ${mode === 'publish' ? 'publishing' : 'saving'}.`
        })
      }

      if (publishedCount > 0) {
        toast({
          title: 'Linked quizzes published',
          description: `${publishedCount} linked quiz${publishedCount === 1 ? '' : 'zes'} moved to published status with the module.`
        })
      }

      if (blockingIssues.length > 0) {
        toast({
          title: 'Quiz configuration needs review',
          description: blockingIssues.slice(0, 2).join(' '),
          variant: 'destructive'
        })
        return false
      }

      return true
    } catch (error) {
      const errorDetails = getUserFriendlyError(error)
      toast({
        title: 'Quiz validation failed',
        description: errorDetails.message,
        variant: 'destructive'
      })
      return false
    } finally {
      setIsValidatingQuizzes(false)
    }
  }, [linkedQuizIds, sections, t, title, toast])

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const addRecentUpload = (upload: RecentUpload) => {
    setRecentUploads(prev => {
      const next = [upload, ...prev.filter(item => item.url !== upload.url)]
      const trimmed = next.slice(0, 8)
      void setEncryptedLocalStorage(TRAINING_BUILDER_RECENT_UPLOADS_KEY, trimmed)
      return trimmed
    })
  }

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
    let isActive = true

    const restoreDraft = async () => {
      try {
        const draft = await getEncryptedLocalStorage<BuilderDraftPayload>(draftKey)
        if (!isActive || !draft) {
          return
        }

        setTitle(draft.title || '')
        setDescription(draft.description || '')
        setCategory(draft.category || '')
        setDifficultyLevel(draft.difficultyLevel || 'beginner')
        setEstimatedDuration(String(draft.estimatedDuration || ''))
        setUseEstimatedDuration(draft.useEstimatedDuration ?? !!draft.estimatedDuration)
        setValidityPeriod(String(draft.validityPeriod || ''))
        setPassingScore(String(draft.passingScore || '80'))
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
        const errorDetails = getUserFriendlyError(error)
        console.warn('Failed to restore training draft:', errorDetails.message)
      } finally {
        draftRestoreRef.current = true
        skipAutosaveRef.current = false
      }
    }

    void restoreDraft()

    return () => {
      isActive = false
    }
  }, [draftKey, isNewRoute, moduleId, templateFromQuery, t, toast])

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
      void (async () => {
        try {
          await setEncryptedLocalStorage(draftKey, draftPayload)
          setAutosaveStatus('saved')
          setLastAutosaveAt(new Date())
        } catch (error) {
          const errorDetails = getUserFriendlyError(error)
          console.warn('Failed to autosave training draft:', errorDetails.message)
          setAutosaveStatus('idle')
        }
      })()
    }, 1200)

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    }
  }, [
    title, description, category, difficultyLevel, estimatedDuration, useEstimatedDuration,
    validityPeriod, passingScore, certificateEnabled, audience, contentLanguage,
    templatePreset, sections, activeSection, draftKey
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
  }, [applyTemplateToSections, templateOptions, moduleId, templateFromQuery, sections.length])

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
  }, [moduleId])

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
    const snapshot = cloneSections(sections)
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
    void setEncryptedLocalStorage(TRAINING_BUILDER_SAVED_BLOCKS_KEY, blocks)
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

  const openContentDialogForBlock = useCallback(
    (block: ContentBlockForm, options?: { selected?: ContentBlockForm | null; sectionId?: string | null }) => {
      setShowAdvancedBlockOptions(false)
      setShowTitleField(block.type === 'text')
      if (block.type === 'video' || block.type === 'interactive') {
        setMediaInputMode('link')
      } else if (block.type === 'image' || block.type === 'audio' || block.type === 'document_link') {
        setMediaInputMode(block.content_url ? 'link' : 'upload')
      } else {
        setMediaInputMode('upload')
      }
      setSelectedContent(options?.selected ?? null)
      setCurrentBlock(block)
      if (options?.sectionId !== undefined) {
        setActiveSection(options.sectionId || null)
      }
      setShowContentDialog(true)
    },
    []
  )

  const addContent = (type: ContentType, sectionId?: string) => {
    let targetSection = sectionId || activeSection
    if (!targetSection) {
      targetSection = addSection()
    }

    const newBlock: ContentBlockForm = {
      id: '',
      type,
      content: '',
      content_url: '',
      content_data: {},
      is_mandatory: true,
      title: '',
      order: 0
    }
    openContentDialogForBlock(newBlock, { selected: null, sectionId: targetSection || null })
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
          return {
            ...section,
            items: section.items.map(item =>
              item.id === selectedContent.id ? newContent : item
            )
          }
        } else {
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

  const isSupportedUpload = (file: File, type: 'image' | 'document' | 'audio' | 'video') => {
    const extension = (file.name.split('.').pop() || '').toLowerCase()
    const allowedMimes = ALLOWED_UPLOAD_MIME_TYPES[type]
    const allowedExtensions = ALLOWED_UPLOAD_EXTENSIONS[type]
    const mimeAllowed = !!file.type && allowedMimes.includes(file.type.toLowerCase())
    const extensionAllowed = allowedExtensions.includes(extension)
    return mimeAllowed || extensionAllowed
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document' | 'audio' | 'video') => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      if (!isSupportedUpload(file, type)) {
        toast({
          title: t('uploadFailed'),
          description: t('builder.invalidUploadType', {
            defaultValue: 'Unsupported file type. Please upload a valid file format.'
          }),
          variant: 'destructive'
        })
        return
      }

      if (type !== 'video' && file.size > MAX_UPLOAD_SIZE_BYTES[type]) {
        toast({
          title: t('uploadFailed'),
          description: t('builder.uploadTooLarge', {
            defaultValue: 'File is too large for this content type.'
          }),
          variant: 'destructive'
        })
        return
      }

      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `training/${type === 'audio' ? 'audios' : `${type}s`}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
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

  const buildBlocksPayload = useCallback((targetId: string) => {
    const blocksToInsert: TrainingContentBlockInsert[] = []
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

    return blocksToInsert
  }, [contentBlocks, sections])

  const replaceModuleBlocksSafely = useCallback(async (targetId: string, blocksToInsert: TrainingContentBlockInsert[]) => {
    const { data: existingBlocks, error: fetchError } = await supabase
      .from('training_content_blocks')
      .select('*')
      .eq('training_module_id', targetId)
      .order('order', { ascending: true })
    if (fetchError) throw fetchError

    const previousRows = Array.isArray(existingBlocks) ? existingBlocks : []

    const { error: deleteError } = await supabase
      .from('training_content_blocks')
      .delete()
      .eq('training_module_id', targetId)
    if (deleteError) throw deleteError

    if (blocksToInsert.length === 0) return

    const { error: insertError } = await supabase
      .from('training_content_blocks')
      .insert(blocksToInsert)

    if (!insertError) return

    if (previousRows.length > 0) {
      const restoreRows = previousRows.map((row: Record<string, unknown>) => {
        const { id, created_at, updated_at, ...rest } = row
        void id
        void created_at
        void updated_at
        return rest
      })

      const { error: restoreError } = await supabase
        .from('training_content_blocks')
        .insert(restoreRows)

      if (restoreError) {
        console.error('Failed to restore previous training blocks after save error:', restoreError)
      }
    }

    throw insertError
  }, [])

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

  const saveContentBlocksMutation = useMutation({
    mutationFn: async (idToUse?: string) => {
      const targetId = idToUse || moduleId
      if (!targetId) return

      const blocksToInsert = buildBlocksPayload(targetId)
      await replaceModuleBlocksSafely(targetId, blocksToInsert)
    }
  })

  const saveQuestionsMutation = useMutation({
    mutationFn: async (idToUse?: string) => {
      const targetId = idToUse || moduleId
      if (!targetId) return

      await supabase
        .from('training_quizzes')
        .delete()
        .eq('training_module_id', targetId)

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
      const integrityMode = moduleStatus === 'published' ? 'publish' : 'save'
      const quizzesReady = await ensureLinkedQuizzesIntegrity(integrityMode)
      if (!quizzesReady) return

      const savedModuleId = await saveModuleMutation.mutateAsync()

      await Promise.all([
        saveContentBlocksMutation.mutateAsync(savedModuleId),
        saveQuestionsMutation.mutateAsync(savedModuleId)
      ])

      toast({
        title: t('moduleSaved'),
        description: t('moduleSavedDescription', { defaultValue: 'Your training module has been saved successfully.' })
      })

      clearDraft()
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
      const quizzesReady = await ensureLinkedQuizzesIntegrity('publish')
      if (!quizzesReady) return

      const savedModuleId = await saveModuleMutation.mutateAsync()
      await Promise.all([
        saveContentBlocksMutation.mutateAsync(savedModuleId),
        saveQuestionsMutation.mutateAsync(savedModuleId)
      ])

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

      setModuleStatus('published')

      removeEncryptedLocalStorage(draftKey)

      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      queryClient.invalidateQueries({ queryKey: ['training-modules', 'assignable'] })
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

  const handleEditContentBlock = (index: number) => {
    const block = contentBlocks[index]
    openContentDialogForBlock({ ...block }, { selected: block })
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

  if (!hasMounted && isNewRoute) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const builderBusy = isValidatingQuizzes || saveModuleMutation.isPending || saveContentBlocksMutation.isPending || saveQuestionsMutation.isPending

  const renderStepContent = () => {
    if (builderStep === 'setup') {
      return (
        <StepSetup
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          audience={audience}
          setAudience={setAudience}
          category={category}
          setCategory={setCategory}
          difficultyLevel={difficultyLevel}
          setDifficultyLevel={setDifficultyLevel}
          contentLanguage={contentLanguage}
          setContentLanguage={setContentLanguage}
          estimatedDuration={estimatedDuration}
          setEstimatedDuration={setEstimatedDuration}
          useEstimatedDuration={useEstimatedDuration}
          setUseEstimatedDuration={setUseEstimatedDuration}
          calculatedDuration={calculatedDuration}
          validityPeriod={validityPeriod}
          setValidityPeriod={setValidityPeriod}
          templatePreset={templatePreset}
          handleTemplateSelection={handleTemplateSelection}
          selectedTemplate={selectedTemplate}
          templateStats={templateStats}
          isTemplatesLoading={isTemplatesLoading}
          isTemplatesError={isTemplatesError}
          templateOptions={templateOptions}
          setShowTemplatePreview={setShowTemplatePreview}
          validationChecklist={validationChecklist}
          isRTL={isRTL}
        />
      )
    }

    if (builderStep === 'structure') {
      return (
        <StepStructure
          sections={sections}
          addSection={addSection}
          deleteSection={deleteSection}
          handleRenameSection={handleRenameSection}
          moveSection={moveSection}
          isRTL={isRTL}
        />
      )
    }

    if (builderStep === 'content') {
      return (
        <BuilderCanvas
          sections={sections}
          activeSection={activeSection}
          onSectionClick={(sectionId) => setActiveSection(sectionId)}
          onAddSection={addSection}
          onDeleteSection={deleteSection}
          onAddContent={(type, sectionId) => addContent(type, sectionId)}
          onEditContent={(sectionId, contentId) => {
            const contentIndex = contentBlocks.findIndex(c => c.id === contentId)
            if (contentIndex !== -1) handleEditContentBlock(contentIndex)
            const section = sections.find(s => s.id === sectionId)
            const item = section?.items.find(i => i.id === contentId)
            if (item) {
              openContentDialogForBlock(item, { selected: item, sectionId })
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
        <StepRules
          certificateEnabled={certificateEnabled}
          setCertificateEnabled={setCertificateEnabled}
          passingScore={passingScore}
          setPassingScore={setPassingScore}
          validityPeriod={validityPeriod}
          setValidityPeriod={setValidityPeriod}
          allowRetake={allowRetake}
          setAllowRetake={setAllowRetake}
          maxAttempts={maxAttempts}
          setMaxAttempts={setMaxAttempts}
          autoAdvance={autoAdvance}
          setAutoAdvance={setAutoAdvance}
          showFeedback={showFeedback}
          setShowFeedback={setShowFeedback}
          randomizeQuestions={randomizeQuestions}
          setRandomizeQuestions={setRandomizeQuestions}
          showAnswers={showAnswers}
          setShowAnswers={setShowAnswers}
          timeLimit={timeLimit}
          setTimeLimit={setTimeLimit}
          isRTL={isRTL}
        />
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
        <StepPublish
          sections={sections}
          totalItems={totalItems}
          displayDuration={displayDuration}
          overrideDuration={overrideDuration}
          calculatedDuration={calculatedDuration}
          certificateEnabled={certificateEnabled}
          passingScore={passingScore}
          allowRetake={allowRetake}
          maxAttempts={maxAttempts}
          validationChecklist={validationChecklist}
          publishReady={publishReady}
          builderBusy={builderBusy}
          handleSave={handleSave}
          publishTraining={publishTraining}
          isRTL={isRTL}
        />
      )
    }

    return null
  }

  return (
    <div className={`min-h-screen bg-background flex flex-col ${isRTL ? 'text-right' : 'text-left'}`}>
      {isNewRoute && showRestorePrompt && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-amber-800 dark:text-amber-300">
                Draft training module restored from previous session
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowRestorePrompt(false)}>
                Keep
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearDraft()
                  setTitle('')
                  setDescription('')
                  setSections([])
                  setShowRestorePrompt(false)
                  toast({ title: 'Draft cleared' })
                }}
              >
                Clear Draft
              </Button>
            </div>
          </div>
        </div>
      )}

      <BuilderHeader
        title={title}
        isSaving={builderBusy}
        hasUnsavedChanges={builderBusy}
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
                          aria-label={t('accessibility.removeSavedBlock', 'Remove saved block')}
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
          <RightPanel
            builderStep={builderStep}
            sections={sections}
            totalItems={totalItems}
            totalPoints={totalPoints}
            displayDuration={displayDuration}
            overrideDuration={overrideDuration}
            calculatedDuration={calculatedDuration}
            certificateEnabled={certificateEnabled}
            passingScore={passingScore}
            allowRetake={allowRetake}
            maxAttempts={maxAttempts}
            validationChecklist={validationChecklist}
            moduleId={moduleId}
            openAIGeneratorForModule={openAIGeneratorForModule}
            setShowSmartWizard={setShowSmartWizard}
            isRTL={isRTL}
          />
        </BuilderSidebar>
      </div>

      <ContentBlockDialog
        open={showContentDialog}
        onOpenChange={setShowContentDialog}
        currentBlock={currentBlock}
        setCurrentBlock={setCurrentBlock}
        selectedContent={selectedContent}
        showTitleField={showTitleField}
        setShowTitleField={setShowTitleField}
        showAdvancedBlockOptions={showAdvancedBlockOptions}
        setShowAdvancedBlockOptions={setShowAdvancedBlockOptions}
        mediaInputMode={mediaInputMode}
        setMediaInputMode={setMediaInputMode}
        blockValidation={blockValidation}
        recentUploadsForType={recentUploadsForType}
        availableQuizzes={availableQuizzes}
        quizOptions={quizOptions}
        availableSOPs={availableSOPs}
        sopOptions={sopOptions}
        uploading={uploading}
        handleFileUpload={handleFileUpload}
        showVideoMediaPicker={showVideoMediaPicker}
        setShowVideoMediaPicker={setShowVideoMediaPicker}
        showDocumentPicker={showDocumentPicker}
        setShowDocumentPicker={setShowDocumentPicker}
        handleSaveBlockToLibrary={handleSaveBlockToLibrary}
        saveContent={saveContent}
        isRTL={isRTL}
      />

      <TemplatePreviewDialog
        open={showTemplatePreview}
        onOpenChange={setShowTemplatePreview}
        selectedTemplate={selectedTemplate}
        templatePreset={templatePreset}
        templateStats={templateStats}
        requestApplyTemplate={requestApplyTemplate}
        isRTL={isRTL}
      />

      <TemplateApplyConfirmDialog
        open={showTemplateApplyConfirm}
        onOpenChange={setShowTemplateApplyConfirm}
        confirmApplyTemplate={confirmApplyTemplate}
        isRTL={isRTL}
      />

      <AIQuizDialog
        open={showAIDialog}
        onOpenChange={setShowAIDialog}
        aiPrefillTitle={aiPrefillTitle}
        aiPrefillContent={aiPrefillContent}
        aiTargetSectionId={aiTargetSectionId}
        setAiTargetSectionId={setAiTargetSectionId}
        setAiPrefillContent={setAiPrefillContent}
        setAiPrefillTitle={setAiPrefillTitle}
        moduleId={moduleId}
        title={title}
        passingScore={passingScore}
        activeSection={activeSection}
        sections={sections}
        setSections={setSections}
        setActiveSection={setActiveSection}
        isRTL={isRTL}
      />

      <SmartModuleWizard
        open={showSmartWizard}
        onOpenChange={setShowSmartWizard}
        onModuleCreated={(newId) => {
          setCreatedModuleId(newId)
        }}
      />

      {showKBSidebar && (
        <KBSidebarPanel
          moduleId={moduleId}
          title={title}
          activeSection={activeSection}
          sections={sections}
          setSections={setSections}
          contentBlocks={contentBlocks}
          setContentBlocks={setContentBlocks}
          availableSOPs={availableSOPs}
          availableQuizzes={availableQuizzes}
        />
      )}
    </div>
  )
}

export default TrainingBuilder
