import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { getUserFriendlyError } from '@/lib/errorMessages'
import { safeLocalStorage } from '@/lib/storage'
import { useFormPersistence } from '@/hooks/useFormPersistence'
import { supabase } from '@/lib/supabase'
import type { TrainingModule } from '@/lib/types'
import { analytics } from '@/services/analyticsService'
import { quizIntegrityService } from '@/services/quizIntegrityService'
import type { LearningQuiz } from '@/types/learning'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import {
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  TRAINING_BUILDER_RECENT_UPLOADS_KEY,
  TRAINING_BUILDER_SAVED_BLOCKS_KEY,
} from '../components/builder/trainingBuilderConstants'
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
} from '../components/builder/trainingBuilderTypes'
import {
  buildModuleSourceText,
  buildSectionSourceText,
  cloneSections,
  estimateBlockDurationMinutes,
  getBlockValidation,
  normalizeEstimatedDuration,
  normalizeDurationMinutes,
  toDurationSeconds,
} from '../components/builder/trainingBuilderUtils'

// ---------------------------------------------------------------------------
// Context value shape
// ---------------------------------------------------------------------------

export interface TrainingBuilderContextValue {
  // Routing / IDs
  id: string | undefined
  moduleId: string | null
  isNewRoute: boolean
  isRTL: boolean

  // Module metadata
  moduleStatus: string
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  estimatedDuration: string
  setEstimatedDuration: (v: string) => void
  useEstimatedDuration: boolean
  setUseEstimatedDuration: (v: boolean) => void
  validityPeriod: string
  setValidityPeriod: (v: string) => void
  passingScore: string
  setPassingScore: (v: string) => void
  maxAttempts: string
  setMaxAttempts: (v: string) => void
  allowRetake: boolean
  setAllowRetake: (v: boolean) => void
  category: string
  setCategory: (v: string) => void
  difficultyLevel: string
  setDifficultyLevel: (v: string) => void
  audience: string
  setAudience: (v: string) => void
  contentLanguage: string
  setContentLanguage: (v: string) => void
  templatePreset: string
  setTemplatePreset: (v: string) => void
  certificateEnabled: boolean
  setCertificateEnabled: (v: boolean) => void
  timeLimit: number | null
  setTimeLimit: (v: number | null) => void
  showFeedback: boolean
  setShowFeedback: (v: boolean) => void
  autoAdvance: boolean
  setAutoAdvance: (v: boolean) => void
  randomizeQuestions: boolean
  setRandomizeQuestions: (v: boolean) => void
  showAnswers: boolean
  setShowAnswers: (v: boolean) => void

  // Sections / content blocks
  sections: TrainingSection[]
  setSections: React.Dispatch<React.SetStateAction<TrainingSection[]>>
  activeSection: string | null
  setActiveSection: (v: string | null) => void
  contentBlocks: ContentBlockForm[]
  setContentBlocks: React.Dispatch<React.SetStateAction<ContentBlockForm[]>>

  // Builder navigation
  builderStep: BuilderStep
  setBuilderStep: (v: BuilderStep) => void
  steps: readonly { key: BuilderStep; label: string; description: string }[]
  currentStepIndex: number
  stepStatus: Record<BuilderStep, boolean>
  canAccessStep: (target: BuilderStep) => boolean
  handleStepChange: (target: BuilderStep) => void
  goNextStep: () => Promise<void>
  goPrevStep: () => void

  // Undo / redo
  historyIndex: number
  historyRef: React.MutableRefObject<TrainingSection[][]>
  handleUndo: () => void
  handleRedo: () => void

  // Autosave
  autosaveStatus: 'idle' | 'saving' | 'saved'
  lastAutosaveAt: Date | null
  formatTime: (date: Date) => string

  // Draft restore prompt
  showRestorePrompt: boolean
  setShowRestorePrompt: (v: boolean) => void
  clearDraft: () => void

  // Content block dialog
  showContentDialog: boolean
  setShowContentDialog: (v: boolean) => void
  currentBlock: ContentBlockForm
  setCurrentBlock: (v: ContentBlockForm) => void
  selectedContent: ContentBlockForm | null
  showTitleField: boolean
  setShowTitleField: (v: boolean) => void
  showAdvancedBlockOptions: boolean
  setShowAdvancedBlockOptions: React.Dispatch<React.SetStateAction<boolean>>
  mediaInputMode: 'upload' | 'link' | 'library'
  setMediaInputMode: (v: 'upload' | 'link' | 'library') => void
  blockValidation: { ok: boolean; message: string }
  recentUploadsForType: RecentUpload[]
  uploading: boolean
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document' | 'audio' | 'video') => void
  showVideoMediaPicker: boolean
  setShowVideoMediaPicker: (v: boolean) => void
  showDocumentPicker: boolean
  setShowDocumentPicker: (v: boolean) => void
  handleSaveBlockToLibrary: () => void
  saveContent: () => void

  // AI dialog
  showAIDialog: boolean
  setShowAIDialog: (v: boolean) => void
  aiPrefillContent: string
  setAiPrefillContent: (v: string) => void
  aiPrefillTitle: string
  setAiPrefillTitle: (v: string) => void
  aiTargetSectionId: string | null
  setAiTargetSectionId: (v: string | null) => void
  openAIGeneratorForSection: (sectionId: string) => void
  openAIGeneratorForModule: () => void

  // Smart wizard
  showSmartWizard: boolean
  setShowSmartWizard: (v: boolean) => void
  setCreatedModuleId: (id: string | null) => void

  // KB sidebar
  showKBSidebar: boolean

  // Templates
  availableTemplates: TrainingTemplate[] | undefined
  isTemplatesLoading: boolean
  isTemplatesError: boolean
  templateOptions: TrainingTemplate[]
  selectedTemplate: TrainingTemplate | null
  templateStats: { sectionsCount: number; itemsCount: number; sections: Array<{ title: string; count: number }> }
  handleTemplateSelection: (v: string) => void
  requestApplyTemplate: (template: TrainingTemplate | null) => void
  confirmApplyTemplate: () => void
  showTemplatePreview: boolean
  setShowTemplatePreview: (v: boolean) => void
  showTemplateApplyConfirm: boolean
  setShowTemplateApplyConfirm: (v: boolean) => void

  // Quizzes / SOPs
  availableQuizzes: LearningQuiz[] | undefined
  quizOptions: LearningQuiz[]
  availableSOPs: { id: string; title: string }[] | undefined
  sopOptions: { id: string; title: string }[]

  // Saved block library
  savedBlocks: ContentBlockForm[]
  handleRemoveSavedBlock: (blockId: string) => void
  insertSavedBlock: (block: ContentBlockForm) => void

  // Content mutations helpers
  addSection: () => string
  deleteSection: (sectionId: string) => void
  handleRenameSection: (sectionId: string, value: string) => void
  moveSection: (index: number, direction: number) => void
  addContent: (type: ContentType, sectionId?: string) => void
  deleteContent: (sectionId: string, contentId: string) => void
  handleReorderSection: (dragIndex: number, hoverIndex: number) => void
  handleReorderContent: (sectionId: string, dragIndex: number, hoverIndex: number) => void
  openContentDialogForBlock: (block: ContentBlockForm, options?: { selected?: ContentBlockForm | null; sectionId?: string | null }) => void

  // Derived values
  calculatedDuration: number
  displayDuration: number
  overrideDuration: number | null
  totalItems: number
  totalPoints: number
  contentTypeLabelMap: Record<ContentType, string>
  blockLibrary: Array<{ type: ContentType; label: string; hint: string }>
  activeSectionName: string | undefined
  validationChecklist: Array<{ key: string; label: string; ok: boolean }>
  publishReady: boolean
  builderBusy: boolean
  isValidatingQuizzes: boolean

  // Save / publish
  handleSave: () => Promise<void>
  publishTraining: () => Promise<void>

  // Hasmounted (loading guard)
  hasMounted: boolean
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TrainingBuilderContext = createContext<TrainingBuilderContextValue | null>(null)

export function useTrainingBuilderContext(): TrainingBuilderContextValue {
  const ctx = useContext(TrainingBuilderContext)
  if (!ctx) {
    throw new Error('useTrainingBuilderContext must be used inside <TrainingBuilderProvider>')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function TrainingBuilderProvider({ children }: { children: React.ReactNode }) {
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

  // -------------------------------------------------------------------------
  // Remote data queries
  // -------------------------------------------------------------------------

  const { data: availableQuizzes } = useQuery({
    queryKey: ['available-quizzes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_quizzes')
        .select('*')
        .eq('is_deleted', false)
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
      // training_content_templates still has its own table (13 seed rows kept).
      // Once fully migrated, this query will move to documents with content_type='training_template'.
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

  // -------------------------------------------------------------------------
  // Core module identity state
  // -------------------------------------------------------------------------

  const [createdModuleId, setCreatedModuleId] = useState<string | null>(null)
  const rawModuleId = isNewRoute ? createdModuleId : id || null
  const moduleId = isValidUuid(rawModuleId) ? rawModuleId : null

  // -------------------------------------------------------------------------
  // Module metadata state
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Saved blocks / recent uploads (localStorage)
  // -------------------------------------------------------------------------

  const [savedBlocks, setSavedBlocks] = useState<ContentBlockForm[]>([])
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([])

  useEffect(() => {
    let isActive = true

    const restoreBuilderLibrary = () => {
      const storedBlocks = safeLocalStorage.getObject<ContentBlockForm[]>(TRAINING_BUILDER_SAVED_BLOCKS_KEY)
      if (isActive && Array.isArray(storedBlocks)) {
        setSavedBlocks(storedBlocks)
      }

      const storedUploads = safeLocalStorage.getObject<RecentUpload[]>(TRAINING_BUILDER_RECENT_UPLOADS_KEY)
      if (isActive && Array.isArray(storedUploads)) {
        setRecentUploads(storedUploads)
      }
    }

    restoreBuilderLibrary()

    return () => {
      isActive = false
    }
  }, [])

  // -------------------------------------------------------------------------
  // Content blocks from DB
  // -------------------------------------------------------------------------

  const { data: contentBlocksData } = useQuery({
    queryKey: ['training-content-blocks', moduleId],
    queryFn: async () => {
      if (!moduleId) return []
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, block_type, content, block_order, created_at, content_url, content_data, is_mandatory, is_deleted, linked_training_id, ai_generated, ai_source_content, duration_seconds, points')
        .eq('content_type', 'training_block')
        .eq('training_module_id', moduleId)
        .order('block_order', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!moduleId
  })

  const isLoadedRef = useRef(false)

  const [sections, setSections] = useState<TrainingSection[]>([])
  const [contentBlocks, setContentBlocks] = useState<ContentBlockForm[]>([])

  useEffect(() => {
    if (contentBlocksData && contentBlocksData.length > 0 && !isLoadedRef.current) {
      const blocks: ContentBlockForm[] = contentBlocksData.map((block, index) => ({
        id: block.id,
        type: block.block_type as ContentType,
        title: block.title || '',
        content: block.content || '',
        content_url: block.content_url || '',
        content_data: block.content_data || {},
        is_mandatory: block.is_mandatory ?? true,
        duration: normalizeDurationMinutes(block.duration_seconds),
        points: block.points,
        order: block.block_order || index
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

  // -------------------------------------------------------------------------
  // Builder step / navigation
  // -------------------------------------------------------------------------

  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [builderStep, setBuilderStep] = useState<BuilderStep>(() => (moduleId ? 'content' : 'setup'))
  const [selectedContent, setSelectedContent] = useState<ContentBlockForm | null>(null)
  const [showTitleField, setShowTitleField] = useState(true)
  const [showAdvancedBlockOptions, setShowAdvancedBlockOptions] = useState(false)
  const [mediaInputMode, setMediaInputMode] = useState<'upload' | 'link' | 'library'>('upload')
  const [showVideoMediaPicker, setShowVideoMediaPicker] = useState(false)
  const [showDocumentPicker, setShowDocumentPicker] = useState(false)
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const [showTemplateApplyConfirm, setShowTemplateApplyConfirm] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<TrainingTemplate | null>(null)

  // -------------------------------------------------------------------------
  // Draft persistence state
  // -------------------------------------------------------------------------

  const [hasMounted, setHasMounted] = useState(true)
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)
  const restoredDraftRef = useRef(false)

  // -------------------------------------------------------------------------
  // AI dialog state
  // -------------------------------------------------------------------------

  const [showAIDialog, setShowAIDialog] = useState(false)
  const [aiPrefillContent, setAiPrefillContent] = useState('')
  const [aiPrefillTitle, setAiPrefillTitle] = useState('')
  const [aiTargetSectionId, setAiTargetSectionId] = useState<string | null>(null)
  const [showKBSidebar] = useState(false)
  const [showSmartWizard, setShowSmartWizard] = useState(false)
  const [isValidatingQuizzes, setIsValidatingQuizzes] = useState(false)

  // -------------------------------------------------------------------------
  // Current block (content dialog)
  // -------------------------------------------------------------------------

  const [showContentDialog, setShowContentDialog] = useState(false)
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

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // AI quiz helpers
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Steps / navigation
  // -------------------------------------------------------------------------

  const steps = [
    { key: 'setup' as BuilderStep, label: t('builder.steps.setup'), description: t('builder.steps.setupDesc') },
    { key: 'structure' as BuilderStep, label: t('builder.steps.structure'), description: t('builder.steps.structureDesc') },
    { key: 'content' as BuilderStep, label: t('builder.steps.content'), description: t('builder.steps.contentDesc') },
    { key: 'rules' as BuilderStep, label: t('builder.steps.rules'), description: t('builder.steps.rulesDesc') },
    { key: 'preview' as BuilderStep, label: t('builder.steps.preview'), description: t('builder.steps.previewDesc') },
    { key: 'publish' as BuilderStep, label: t('builder.steps.publish'), description: t('builder.steps.publishDesc') }
  ] as const

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

  // -------------------------------------------------------------------------
  // Quiz integrity
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Autosave (localStorage draft)
  // -------------------------------------------------------------------------

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const addRecentUpload = (upload: RecentUpload) => {
    setRecentUploads(prev => {
      const next = [upload, ...prev.filter(item => item.url !== upload.url)]
      const trimmed = next.slice(0, 8)
      safeLocalStorage.setObject(TRAINING_BUILDER_RECENT_UPLOADS_KEY, trimmed)
      return trimmed
    })
  }

  const draftKey = moduleId ? `training_builder_draft_${moduleId}` : 'training_builder_draft_new'
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [lastAutosaveAt, setLastAutosaveAt] = useState<Date | null>(null)
  const draftRestoreRef = useRef(false)
  const skipAutosaveRef = useRef(true)

  const clearDraft = useCallback(() => {
    try {
      const storage = (window as any).safeLocalStorage || { removeItem: (k: string) => localStorage.removeItem(k) }
      storage.removeItem(draftKey)
    } catch(e) {}
    setAutosaveStatus('idle')
    setLastAutosaveAt(null)
  }, [draftKey])

  useEffect(() => {
    if (!isNewRoute || moduleId || draftRestoreRef.current || templateFromQuery) {
      skipAutosaveRef.current = false
      return
    }
    let isActive = true

    const restoreDraft = () => {
      try {
        const draft = safeLocalStorage.getObject<BuilderDraftPayload>(draftKey)
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
        if (draft.activeSection) {
            setActiveSection(draft.activeSection)
        }
        setShowRestorePrompt(true)
        setTimeout(() => setShowRestorePrompt(false), 8000)
      } catch (error) {
        const errorDetails = getUserFriendlyError(error)
        console.warn('Failed to restore training draft:', errorDetails.message)
      } finally {
        draftRestoreRef.current = true
        skipAutosaveRef.current = false
      }
    }

    restoreDraft()

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
      try {
        safeLocalStorage.setObject(draftKey, draftPayload)
        setAutosaveStatus('saved')
        setLastAutosaveAt(new Date())
      } catch (error) {
        const errorDetails = getUserFriendlyError(error)
        console.warn('Failed to autosave training draft:', errorDetails.message)
        setAutosaveStatus('idle')
      }
    }, 1200)

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    }
  }, [
    title, description, category, difficultyLevel, estimatedDuration, useEstimatedDuration,
    validityPeriod, passingScore, certificateEnabled, audience, contentLanguage,
    templatePreset, sections, activeSection, draftKey
  ])

  // -------------------------------------------------------------------------
  // Template auto-apply from query param
  // -------------------------------------------------------------------------

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // -------------------------------------------------------------------------
  // Analytics
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Undo / redo
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Section / content mutations
  // -------------------------------------------------------------------------

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
    safeLocalStorage.setObject(TRAINING_BUILDER_SAVED_BLOCKS_KEY, blocks)
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

    // Fallback removed to prevent sync issues where clearing sections restores initial contentBlocks

    return blocksToInsert
  }, [contentBlocks, sections])

  const replaceModuleBlocksSafely = useCallback(async (targetId: string, blocksToInsert: TrainingContentBlockInsert[]) => {
    // training_content_blocks has been consolidated into documents (content_type='training_block').
    const { data: existingBlocks, error: fetchError } = await supabase
      .from('documents')
      .select('id, title, block_type, content, block_order, content_url, content_data, is_mandatory, is_deleted, ai_generated, ai_source_content, duration_seconds, points')
      .eq('content_type', 'training_block')
      .eq('training_module_id', targetId)
      .order('block_order', { ascending: true })
    if (fetchError) throw fetchError

    const previousRows = Array.isArray(existingBlocks) ? existingBlocks : []

    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('content_type', 'training_block')
      .eq('training_module_id', targetId)
    if (deleteError) throw deleteError

    if (blocksToInsert.length === 0) return

    // Map TrainingContentBlockInsert fields to the unified documents columns.
    // documents has no `type`/`order`/`source_document_id` columns (they are
    // block_type/block_order/linked_training_id), and title is NOT NULL.
    const docRows = blocksToInsert.map((b) => {
      const rec = b as unknown as Record<string, unknown>
      return {
        training_module_id: rec.training_module_id ?? null,
        content_type: 'training_block',
        block_type: rec.type,
        block_order: rec.order,
        title: (rec.title as string) || 'Content block',
        content: (rec.content as string) ?? '',
        content_url: rec.content_url ?? null,
        content_data: rec.content_data ?? {},
        linked_training_id: rec.source_document_id ?? null,
        is_mandatory: rec.is_mandatory ?? true,
        duration_seconds: rec.duration_seconds ?? null,
        points: rec.points ?? null,
      }
    })

    const { error: insertError } = await supabase
      .from('documents')
      .insert(docRows)

    if (!insertError) return

    if (previousRows.length > 0) {
      const restoreRows = previousRows.map((row: Record<string, unknown>) => {
        const { id, created_at, updated_at, ...rest } = row
        void id
        void created_at
        void updated_at
        return { ...rest, content_type: 'training_block' }
      })

      const { error: restoreError } = await supabase
        .from('documents')
        .insert(restoreRows)

      if (restoreError) {
        console.error('Failed to restore previous training blocks after save error:', restoreError)
      }
    }

    throw insertError
  }, [])

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

  // -------------------------------------------------------------------------
  // Section reordering helpers
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

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

  const builderBusy = isValidatingQuizzes || saveModuleMutation.isPending || saveContentBlocksMutation.isPending

  const handleSave = async () => {
    try {
      const integrityMode = moduleStatus === 'published' ? 'publish' : 'save'
      const quizzesReady = await ensureLinkedQuizzesIntegrity(integrityMode)
      if (!quizzesReady) return

      const savedModuleId = await saveModuleMutation.mutateAsync()

      await saveContentBlocksMutation.mutateAsync(savedModuleId)

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
      await saveContentBlocksMutation.mutateAsync(savedModuleId)

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

      safeLocalStorage.removeItem(draftKey)

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

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const value: TrainingBuilderContextValue = {
    // Routing / IDs
    id,
    moduleId,
    isNewRoute,
    isRTL,

    // Module metadata
    moduleStatus,
    title,
    setTitle,
    description,
    setDescription,
    estimatedDuration,
    setEstimatedDuration,
    useEstimatedDuration,
    setUseEstimatedDuration,
    validityPeriod,
    setValidityPeriod,
    passingScore,
    setPassingScore,
    maxAttempts,
    setMaxAttempts,
    allowRetake,
    setAllowRetake,
    category,
    setCategory,
    difficultyLevel,
    setDifficultyLevel,
    audience,
    setAudience,
    contentLanguage,
    setContentLanguage,
    templatePreset,
    setTemplatePreset,
    certificateEnabled,
    setCertificateEnabled,
    timeLimit,
    setTimeLimit,
    showFeedback,
    setShowFeedback,
    autoAdvance,
    setAutoAdvance,
    randomizeQuestions,
    setRandomizeQuestions,
    showAnswers,
    setShowAnswers,

    // Sections / content blocks
    sections,
    setSections,
    activeSection,
    setActiveSection,
    contentBlocks,
    setContentBlocks,

    // Builder navigation
    builderStep,
    setBuilderStep,
    steps,
    currentStepIndex,
    stepStatus,
    canAccessStep,
    handleStepChange,
    goNextStep,
    goPrevStep,

    // Undo / redo
    historyIndex,
    historyRef,
    handleUndo,
    handleRedo,

    // Autosave
    autosaveStatus,
    lastAutosaveAt,
    formatTime,

    // Draft restore prompt
    showRestorePrompt,
    setShowRestorePrompt,
    clearDraft,

    // Content block dialog
    showContentDialog,
    setShowContentDialog,
    currentBlock,
    setCurrentBlock,
    selectedContent,
    showTitleField,
    setShowTitleField,
    showAdvancedBlockOptions,
    setShowAdvancedBlockOptions,
    mediaInputMode,
    setMediaInputMode,
    blockValidation,
    recentUploadsForType,
    uploading,
    handleFileUpload,
    showVideoMediaPicker,
    setShowVideoMediaPicker,
    showDocumentPicker,
    setShowDocumentPicker,
    handleSaveBlockToLibrary,
    saveContent,

    // AI dialog
    showAIDialog,
    setShowAIDialog,
    aiPrefillContent,
    setAiPrefillContent,
    aiPrefillTitle,
    setAiPrefillTitle,
    aiTargetSectionId,
    setAiTargetSectionId,
    openAIGeneratorForSection,
    openAIGeneratorForModule,

    // Smart wizard
    showSmartWizard,
    setShowSmartWizard,
    setCreatedModuleId,

    // KB sidebar
    showKBSidebar,

    // Templates
    availableTemplates,
    isTemplatesLoading,
    isTemplatesError,
    templateOptions,
    selectedTemplate,
    templateStats,
    handleTemplateSelection,
    requestApplyTemplate,
    confirmApplyTemplate,
    showTemplatePreview,
    setShowTemplatePreview,
    showTemplateApplyConfirm,
    setShowTemplateApplyConfirm,

    // Quizzes / SOPs
    availableQuizzes,
    quizOptions,
    availableSOPs,
    sopOptions,

    // Saved block library
    savedBlocks,
    handleRemoveSavedBlock,
    insertSavedBlock,

    // Content mutations helpers
    addSection,
    deleteSection,
    handleRenameSection,
    moveSection,
    addContent,
    deleteContent,
    handleReorderSection,
    handleReorderContent,
    openContentDialogForBlock,

    // Derived values
    calculatedDuration,
    displayDuration,
    overrideDuration,
    totalItems,
    totalPoints,
    contentTypeLabelMap,
    blockLibrary,
    activeSectionName,
    validationChecklist,
    publishReady,
    builderBusy,
    isValidatingQuizzes,

    // Save / publish
    handleSave,
    publishTraining,

    // Hasmounted (loading guard)
    hasMounted,
  }

  return (
    <TrainingBuilderContext.Provider value={value}>
      {children}
    </TrainingBuilderContext.Provider>
  )
}
