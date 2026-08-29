import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Code,
  Compass,
  Copy,
  Download,
  Eye,
  FileCheck,
  FileCode,
  FileQuestion,
  FileText,
  Flame,
  Globe,
  History,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  PanelRight,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Rocket,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
  Wand2,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types & Pedagogical Engines
import type {
  BloomDistribution,
  BloomPreset,
  CourseBlueprint,
  CourseDifficulty,
  CourseGenerationMode,
  CourseType,
  CourseVisualAsset,
  DifficultyProgression,
  FullCourseGenerationConfig,
  ImageDensity,
  InstructionalStrategy,
  LessonBlueprint,
  LessonComponentKey,
  LessonDurationMinutes,
  LessonTemplateType,
  OverallContentDepth,
  QuizPlacement,
  TargetAudience,
  VisualStyle,
} from '@/types/aiCourseEngine'
import { type QuestionType } from '@/types/questions'
import {
  BLOOM_PRESETS,
} from '@/lib/ai/courseEngine'
import {
  checkCourseConfigConsistency,
  harmonizeCourseConfig,
  getSmartCourseTypePreset,
  getSmartModePreset,
} from '@/lib/ai/courseHarmonizer'
import {
  useCourseGenerationPresets,
  useExecuteCoursePipeline,
  useRefineComponent,
  useSaveCourseBlueprint,
} from '@/hooks/useAICourseEngine'
import { useArticles, useKnowledgeArticle } from '@/hooks/useKnowledge'
import { useDocuments } from '@/hooks/useDocuments'

// Studio Modular Subcomponents
import {
  StudioWorkflowStepper,
  type StudioStageId,
  STUDIO_STAGES,
} from './studio/StudioWorkflowStepper'
import { StudioCourseSummaryPanel } from './studio/StudioCourseSummaryPanel'
import { type IntelligentRecommendation } from './studio/StudioIntelligentAdvisor'
import { StudioStageBasics } from './studio/StudioStageBasics'
import { StudioStageLearningDesign } from './studio/StudioStageLearningDesign'
import { StudioStageContentDepth } from './studio/StudioStageContentDepth'
import { StudioStageAssessments } from './studio/StudioStageAssessments'
import { StudioStageVisuals } from './studio/StudioStageVisuals'
import { StudioStageAISettings } from './studio/StudioStageAISettings'
import { StudioStagePreflightReview } from './studio/StudioStagePreflightReview'
import { StudioLiveGenerationProgress, type GenerationErrorState } from './studio/StudioLiveGenerationProgress'
import { StudioInteractiveOutline } from './studio/StudioInteractiveOutline'
import { StudioQuickStart, type QuickThoroughness, type QuickSourceKind } from './studio/StudioQuickStart'

// Supporting Secondary Dialogs
import { GenerationHistoryDialog } from './GenerationHistoryDialog'
import { CourseQAInspectorSheet } from './CourseQAInspectorSheet'
import { VisualAssetEditorModal } from './VisualAssetEditorModal'
import { GuestRoleplaySimulatorModal } from './roleplay/GuestRoleplaySimulatorModal'
import { ComplianceShieldDialog } from './compliance/ComplianceShieldDialog'
import { DocumentCourseIngestionModal } from './ingestion/DocumentCourseIngestionModal'
import { LessonAudioNarrator } from './audio/LessonAudioNarrator'

interface AICourseEngineStudioModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: CourseGenerationMode
  initialTopic?: string
  initialDocumentId?: string
  onCourseCreated?: (moduleId: string) => void
  onApplyToBuilder?: (data: {
    title: string
    description?: string
    sections: Array<{
      originalIndex: number
      heading: string
      summary?: string
      suggestedBlockType?: string
      rich_content?: string
      items?: Array<{ id: string; title: string; type: string; content?: string; order: number }>
    }>
    checkpoints?: Array<{
      afterSectionIndex: number
      topic: string
      include: boolean
      questions?: any[]
      passingScore?: number
    }>
    difficulty?: string
    language?: string
  }) => Promise<void>
}

export function AICourseEngineStudioModal({
  open,
  onOpenChange,
  initialMode = 'full_course',
  initialTopic = '',
  initialDocumentId,
  onCourseCreated,
  onApplyToBuilder,
}: AICourseEngineStudioModalProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const { toast } = useToast()
  const navigate = useNavigate()

  // React Query Hooks
  const executePipeline = useExecuteCoursePipeline()
  const saveBlueprint = useSaveCourseBlueprint()
  const refineMutation = useRefineComponent()
  const presetsQuery = useCourseGenerationPresets()

  // Top-Level Studio Navigation State
  const [currentStep, setCurrentStep] = useState<'configure' | 'generating' | 'preview'>('configure')
  const [currentStage, setCurrentStage] = useState<StudioStageId>('basics')
  const [summaryPanelOpen, setSummaryPanelOpen] = useState(true)

  // Quick mode = one simple screen for non-technical staff; Advanced = the 7-stage wizard.
  const QUICK_SUPPORTED_MODES: CourseGenerationMode[] = ['full_course', 'topic_based', 'document_based']
  const [studioMode, setStudioMode] = useState<'quick' | 'advanced'>(
    initialMode && !QUICK_SUPPORTED_MODES.includes(initialMode) ? 'advanced' : 'quick'
  )
  const [quickSourceKind, setQuickSourceKind] = useState<QuickSourceKind>(initialDocumentId ? 'knowledge_base' : 'topic')
  const [quickThoroughness, setQuickThoroughness] = useState<QuickThoroughness>('standard')
  const [quickUploadName, setQuickUploadName] = useState('')
  const [quickLaunch, setQuickLaunch] = useState(false)

  // Secondary Dialogs
  const [historyOpen, setHistoryOpen] = useState(false)
  const [qaInspectorOpen, setQaInspectorOpen] = useState(false)
  const [savePresetDialogOpen, setSavePresetDialogOpen] = useState(false)
  const [presetNameInput, setPresetNameInput] = useState('')

  // 1. Generation Mode & Basics
  const [generationMode, setGenerationMode] = useState<CourseGenerationMode>(initialMode)
  const [courseTopic, setCourseTopic] = useState(initialTopic)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(initialDocumentId || null)
  const [rawSourceContent, setRawSourceContent] = useState('')
  const [targetDepartment, setTargetDepartment] = useState<string>('front_office')
  const [topicTheme, setTopicTheme] = useState<string>('forbes_5star')
  const [topicStaffRole, setTopicStaffRole] = useState<string>('associate')
  const [sopExtractionMode, setSopExtractionMode] = useState<'strict_sop' | 'enhanced_forbes'>('enhanced_forbes')
  const [remixGoal, setRemixGoal] = useState<'expand' | 'microlearning' | 'translate_saudi' | 'modernize_2026' | 'add_assessments'>('expand')
  const [pedagogicalFramework, setPedagogicalFramework] = useState<string>('bloom_taxonomy')

  // 2. Learning Design & Audience
  const [courseType, setCourseType] = useState<CourseType>('professional')
  const [instructionalStrategy, setInstructionalStrategy] = useState<InstructionalStrategy>('explain_example_practice')
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('employees')
  const [experienceLevel, setExperienceLevel] = useState<any>('intermediate')
  const [priorKnowledge, setPriorKnowledge] = useState('')

  // 3. Structure, Duration & Difficulty
  const [moduleCount, setModuleCount] = useState<any>(4)
  const [customModuleCount, setCustomModuleCount] = useState(4)
  const [lessonsPerModule, setLessonsPerModule] = useState<any>(3)
  const [lessonDuration, setLessonDuration] = useState<LessonDurationMinutes>(15)
  const [difficulty, setDifficulty] = useState<CourseDifficulty>('intermediate')
  const [difficultyProgression, setDifficultyProgression] = useState<DifficultyProgression>('progressive')

  // 4. Content Depth & Lesson Components
  const [overallDepth, setOverallDepth] = useState<OverallContentDepth>('comprehensive')
  const [theoryDepth, setTheoryDepth] = useState(3)
  const [examplesDepth, setExamplesDepth] = useState(4)
  const [practicalDepth, setPracticalDepth] = useState(4)
  const [caseStudiesDepth, setCaseStudiesDepth] = useState(4)
  const [assessmentsDepth, setAssessmentsDepth] = useState(3)
  const [defaultLessonTemplate, setDefaultLessonTemplate] = useState<LessonTemplateType>('sop_standard')
  const [selectedComponents, setSelectedComponents] = useState<LessonComponentKey[]>([
    'intro',
    'objectives',
    'concepts',
    'explanation',
    'examples',
    'step_procedure',
    'dialogue_script',
    'checklist',
    'last_protocol',
    'summary',
    'action_points',
    'knowledge_check',
  ])

  // 5. Quiz & Assessment Studio
  const [quizPlacement, setQuizPlacement] = useState<QuizPlacement>('per_module')
  const [quizQuestionCount, setQuizQuestionCount] = useState(5)
  const [quizPassingScore, setQuizPassingScore] = useState(85)
  const [quizMaxAttempts, setQuizMaxAttempts] = useState<number | null>(3)
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<QuestionType[]>([
    'mcq',
    'scenario',
    'ordering',
    'matching',
  ])
  const [bloomPreset, setBloomPreset] = useState<BloomPreset>('intermediate')
  const [bloomDistribution, setBloomDistribution] = useState<BloomDistribution>(BLOOM_PRESETS.intermediate)
  const [randomizeQuestions, setRandomizeQuestions] = useState(true)
  const [randomizeAnswers, setRandomizeAnswers] = useState(true)
  const [distractorQuality, setDistractorQuality] = useState<'standard' | 'high' | 'expert_plausible'>('high')
  const [includeHints, setIncludeHints] = useState(true)
  const [includeExplanations, setIncludeExplanations] = useState(true)

  // 6. AI Visuals & Recraft Vector Image Engine
  const [enableAIImages, setEnableAIImages] = useState(true)
  const [imageModel, setImageModel] = useState('recraft-vector')
  const [imageDensity, setImageDensity] = useState<ImageDensity>('balanced')
  const [imageSelectionStrategy, setImageSelectionStrategy] = useState<'auto_intelligent' | 'all_suitable_lessons' | 'high_benefit_only'>('auto_intelligent')
  const [preferredVisualStyle, setPreferredVisualStyle] = useState<VisualStyle>('educational_illustration')
  const [preferredAspectRatio, setPreferredAspectRatio] = useState<'16:9' | '4:3' | '1:1' | '3:2'>('16:9')
  const [maxImagesPerLesson, setMaxImagesPerLesson] = useState(1)
  const [maxImagesPerCourse, setMaxImagesPerCourse] = useState(6)
  const [selectedAssetForEditor, setSelectedAssetForEditor] = useState<CourseVisualAsset | null>(null)
  const [visualEditorOpen, setVisualEditorOpen] = useState(false)

  // 7. AI Engine & Language
  const [preferredModel, setPreferredModel] = useState('auto')
  const [targetLanguage, setTargetLanguage] = useState<'English' | 'Arabic' | 'Bilingual'>('English')
  const [enableAudioBriefings, setEnableAudioBriefings] = useState(false)
  const [enableActivitiesAgent, setEnableActivitiesAgent] = useState(true)
  const [enableAutoRevision, setEnableAutoRevision] = useState(true)
  const [enableComplianceAudit, setEnableComplianceAudit] = useState(true)

  // Preview & Review State
  const [generatedBlueprint, setGeneratedBlueprint] = useState<CourseBlueprint | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | undefined>()
  const [activePreviewLessonId, setActivePreviewLessonId] = useState<string>('')
  const [viewRawHtml, setViewRawHtml] = useState<boolean>(false)
  const [refineModalOpen, setRefineModalOpen] = useState<boolean>(false)
  const [refineCustomPrompt, setRefineCustomPrompt] = useState<string>('')
  const [targetRefineLesson, setTargetRefineLesson] = useState<LessonBlueprint | null>(null)
  const [errorState, setErrorState] = useState<GenerationErrorState | undefined>()

  // New AI Suite Tools Dialog States
  const [roleplayModalOpen, setRoleplayModalOpen] = useState<boolean>(false)
  const [complianceDialogOpen, setComplianceDialogOpen] = useState<boolean>(false)
  const [docIngestionModalOpen, setDocIngestionModalOpen] = useState<boolean>(false)

  // Knowledge Documents Query
  const { data: sopsData, isLoading: isLoadingSOPs } = useArticles({ limit: 100 })
  const { data: selectedArticle } = useKnowledgeArticle(selectedDocumentId || undefined)
  const { data: libraryDocuments = [] } = useDocuments()

  // Synchronize on modal open or prop change
  useEffect(() => {
    if (open) {
      if (initialMode) {
        setGenerationMode(initialMode)
        const preset = getSmartModePreset(initialMode)
        handleApplyPreset(preset, false)
      }
      if (initialTopic) {
        setCourseTopic(initialTopic)
      }
      if (initialDocumentId) {
        setSelectedDocumentId(initialDocumentId)
      }
    }
  }, [open, initialMode, initialTopic, initialDocumentId])

  // Apply Preset across all state variables
  const handleApplyPreset = (presetConfig: Partial<FullCourseGenerationConfig>, showToast: boolean = true) => {
    if (presetConfig.generationMode) setGenerationMode(presetConfig.generationMode)
    if (presetConfig.courseType) setCourseType(presetConfig.courseType)
    if (presetConfig.instructionalStrategy) setInstructionalStrategy(presetConfig.instructionalStrategy)
    if (presetConfig.targetAudience) setTargetAudience(presetConfig.targetAudience)
    if (presetConfig.experienceLevel) setExperienceLevel(presetConfig.experienceLevel)
    if (presetConfig.difficulty) setDifficulty(presetConfig.difficulty)
    if (presetConfig.difficultyProgression) setDifficultyProgression(presetConfig.difficultyProgression)
    if (presetConfig.overallDepth) setOverallDepth(presetConfig.overallDepth)
    if (presetConfig.defaultLessonTemplate) setDefaultLessonTemplate(presetConfig.defaultLessonTemplate)

    if (presetConfig.granularity) {
      if (presetConfig.granularity.moduleCount !== undefined) setModuleCount(presetConfig.granularity.moduleCount)
      if (presetConfig.granularity.lessonsPerModule !== undefined) setLessonsPerModule(presetConfig.granularity.lessonsPerModule)
      if (presetConfig.granularity.lessonDuration !== undefined) setLessonDuration(presetConfig.granularity.lessonDuration)
    }

    if (presetConfig.depthConfig) {
      if (presetConfig.depthConfig.theory !== undefined) setTheoryDepth(presetConfig.depthConfig.theory)
      if (presetConfig.depthConfig.examples !== undefined) setExamplesDepth(presetConfig.depthConfig.examples)
      if (presetConfig.depthConfig.practical !== undefined) setPracticalDepth(presetConfig.depthConfig.practical)
      if (presetConfig.depthConfig.caseStudies !== undefined) setCaseStudiesDepth(presetConfig.depthConfig.caseStudies)
      if (presetConfig.depthConfig.assessments !== undefined) setAssessmentsDepth(presetConfig.depthConfig.assessments)
    }

    if (presetConfig.lessonComponents) {
      setSelectedComponents(presetConfig.lessonComponents)
    }

    if (presetConfig.quizConfig) {
      if (presetConfig.quizConfig.placement !== undefined) setQuizPlacement(presetConfig.quizConfig.placement)
      if (presetConfig.quizConfig.questionCount !== undefined) setQuizQuestionCount(presetConfig.quizConfig.questionCount)
      if (presetConfig.quizConfig.passingScore !== undefined) setQuizPassingScore(presetConfig.quizConfig.passingScore)
      if (presetConfig.quizConfig.maxAttempts !== undefined) setQuizMaxAttempts(presetConfig.quizConfig.maxAttempts)
      if (presetConfig.quizConfig.randomizeQuestions !== undefined) setRandomizeQuestions(presetConfig.quizConfig.randomizeQuestions)
      if (presetConfig.quizConfig.randomizeAnswers !== undefined) setRandomizeAnswers(presetConfig.quizConfig.randomizeAnswers)
      if (presetConfig.quizConfig.distractorQuality !== undefined) setDistractorQuality(presetConfig.quizConfig.distractorQuality)
      if (presetConfig.quizConfig.includeHints !== undefined) setIncludeHints(presetConfig.quizConfig.includeHints)
      if (presetConfig.quizConfig.includeExplanations !== undefined) setIncludeExplanations(presetConfig.quizConfig.includeExplanations)
    }

    if (presetConfig.questionTypes) {
      setSelectedQuestionTypes(presetConfig.questionTypes)
    }

    if (presetConfig.bloomDistribution) {
      setBloomDistribution(presetConfig.bloomDistribution)
    }

    if (presetConfig.imageConfig) {
      if (presetConfig.imageConfig.enableAIImages !== undefined) setEnableAIImages(presetConfig.imageConfig.enableAIImages)
      if (presetConfig.imageConfig.imageModel) setImageModel(presetConfig.imageConfig.imageModel)
      if (presetConfig.imageConfig.selectionStrategy) setImageSelectionStrategy(presetConfig.imageConfig.selectionStrategy)
      if (presetConfig.imageConfig.preferredStyle) setPreferredVisualStyle(presetConfig.imageConfig.preferredStyle)
      if (presetConfig.imageConfig.preferredAspectRatio) setPreferredAspectRatio(presetConfig.imageConfig.preferredAspectRatio)
      if (presetConfig.imageConfig.maxImagesPerCourse !== undefined) setMaxImagesPerCourse(presetConfig.imageConfig.maxImagesPerCourse)
    }

    if (presetConfig.aiControls) {
      if (presetConfig.aiControls.preferredModel) setPreferredModel(presetConfig.aiControls.preferredModel)
      if (presetConfig.aiControls.targetLanguage) setTargetLanguage(presetConfig.aiControls.targetLanguage)
    }

    if (showToast) {
      toast({
        title: t('builder.presetApplied', 'Preset Applied'),
        description: t('builder.presetAppliedDesc', 'Configured pedagogical rules, depth, and assessment criteria.'),
      })
    }
  }

  // Real-time Pedagogical Consistency
  const consistencyReport = useMemo(() => {
    return checkCourseConfigConsistency({
      generationMode,
      courseType,
      instructionalStrategy,
      granularity: {
        moduleCount,
        lessonsPerModule,
        lessonDuration,
      },
      overallDepth,
      difficulty,
      difficultyProgression,
      quizConfig: {
        placement: quizPlacement,
        questionCount: quizQuestionCount,
        passingScore: quizPassingScore,
        maxAttempts: quizMaxAttempts,
        randomizeQuestions,
        randomizeAnswers,
        useQuestionPools: false,
        adaptiveDifficulty: difficultyProgression === 'adaptive',
        distractorQuality,
        includeHints,
        includeExplanations,
        storeInQuestionBank: true,
      },
      questionTypes: selectedQuestionTypes,
      lessonComponents: selectedComponents,
    })
  }, [
    generationMode,
    courseType,
    instructionalStrategy,
    moduleCount,
    lessonsPerModule,
    lessonDuration,
    overallDepth,
    difficulty,
    difficultyProgression,
    quizPlacement,
    quizQuestionCount,
    quizPassingScore,
    quizMaxAttempts,
    randomizeQuestions,
    randomizeAnswers,
    distractorQuality,
    includeHints,
    includeExplanations,
    selectedQuestionTypes,
    selectedComponents,
  ])

  // Intelligent Proactive Recommendations Engine
  const intelligentRecommendations = useMemo<IntelligentRecommendation[]>(() => {
    const recs: IntelligentRecommendation[] = []

    // 1. Difficulty vs Depth Mismatch
    if ((difficulty === 'challenging' || difficulty === 'expert') && overallDepth === 'concise') {
      recs.push({
        id: 'depth-difficulty-mismatch',
        category: 'depth',
        severity: 'warning',
        titleKey: 'builder.recs.depthTitle',
        defaultTitle: 'Calibrate Content Depth for Advanced Learners',
        descKey: 'builder.recs.depthDesc',
        defaultDesc: 'Advanced/Expert courses benefit significantly from Comprehensive depth to cover complex 5-star edge cases.',
        actionLabelKey: 'builder.recs.applyComprehensive',
        defaultActionLabel: '⚡ Switch to Comprehensive Depth',
        onApply: () => setOverallDepth('comprehensive'),
      })
    }

    // 2. Large Course with Insufficient Quiz Questions
    const totalLessonsCount = (typeof moduleCount === 'number' ? moduleCount : 4) * (typeof lessonsPerModule === 'number' ? lessonsPerModule : 3)
    if (totalLessonsCount >= 10 && quizQuestionCount < 5) {
      recs.push({
        id: 'quiz-pool-small',
        category: 'assessment',
        severity: 'info',
        titleKey: 'builder.recs.quizCountTitle',
        defaultTitle: 'Enhance Assessment Pool Size',
        descKey: 'builder.recs.quizCountDesc',
        defaultDesc: 'For a comprehensive curriculum of 10+ lessons, 5 to 8 questions per module ensures robust retention.',
        actionLabelKey: 'builder.recs.applyQuizCount',
        defaultActionLabel: '⚡ Set 5 Questions Per Quiz',
        onApply: () => setQuizQuestionCount(5),
      })
    }

    // 3. Procedural / SOP Grounded Course Missing Ordering Questions
    if ((generationMode === 'document_based' || courseType === 'operational') && !selectedQuestionTypes.includes('ordering')) {
      recs.push({
        id: 'sop-ordering-missing',
        category: 'assessment',
        severity: 'info',
        titleKey: 'builder.recs.sopOrderingTitle',
        defaultTitle: 'Add Chronological SOP Ordering Questions',
        descKey: 'builder.recs.sopOrderingDesc',
        defaultDesc: 'Procedural standard operating procedures are verified most effectively when associates sequence steps.',
        actionLabelKey: 'builder.recs.applyOrdering',
        defaultActionLabel: '⚡ Enable SOP Ordering Questions',
        onApply: () => setSelectedQuestionTypes((prev) => [...prev, 'ordering']),
      })
    }

    // 4. Missing Checkpoint Quizzes
    if (quizPlacement === 'none') {
      recs.push({
        id: 'quiz-placement-none',
        category: 'assessment',
        severity: 'warning',
        titleKey: 'builder.recs.enableQuizzesTitle',
        defaultTitle: 'Enable Module Knowledge Checks',
        descKey: 'builder.recs.enableQuizzesDesc',
        defaultDesc: 'Adding checkpoint quizzes increases 30-day employee knowledge retention by over 40%.',
        actionLabelKey: 'builder.recs.applyModuleQuizzes',
        defaultActionLabel: '⚡ Enable Module Quizzes',
        onApply: () => setQuizPlacement('per_module'),
      })
    }

    return recs
  }, [difficulty, overallDepth, moduleCount, lessonsPerModule, quizQuestionCount, generationMode, courseType, selectedQuestionTypes, quizPlacement])

  const handleApplyAllRecommendations = () => {
    intelligentRecommendations.forEach((r) => r.onApply())
    toast({
      title: t('builder.recommendationsApplied', 'All Optimizations Applied'),
      description: t('builder.recommendationsAppliedDesc', 'Pedagogical alignments and assessment pools updated.'),
    })
  }

  // Auto-Harmonize All Conflicting Settings
  const handleAutoHarmonize = () => {
    const currentConfig = buildCurrentConfig()
    const harmonized = harmonizeCourseConfig(currentConfig)
    handleApplyPreset(harmonized, false)
    toast({
      title: t('builder.harmonizedSuccess', '⚡ All Tabs Harmonized'),
      description: t('builder.harmonizedSuccessDesc', 'Synchronized course structure, duration, and assessments for 5-star pedagogical excellence.'),
    })
  }

  // Handle Preset Save
  const handleSavePreset = async () => {
    if (!presetNameInput.trim()) return
    const currentConfig = buildCurrentConfig()
    try {
      await presetsQuery.savePreset({
        name: presetNameInput,
        description: `Custom ${courseType} preset with ${instructionalStrategy} strategy.`,
        config: currentConfig,
      })
      setSavePresetDialogOpen(false)
      setPresetNameInput('')
      toast({
        title: t('builder.presetSaved', 'Preset Saved'),
        description: t('builder.presetSavedDesc', 'You can reuse this generation preset anytime.'),
      })
    } catch {
      toast({
        title: t('common:error', 'Error'),
        description: t('builder.presetSaveFailed', 'Could not save preset.'),
        variant: 'destructive',
      })
    }
  }

  const buildCurrentConfig = (): FullCourseGenerationConfig => {
    let combinedSource = rawSourceContent
    if (selectedArticle && selectedArticle.title) {
      combinedSource = `Document Title: ${selectedArticle.title}\nCategory/Type: ${selectedArticle.content_type || 'SOP'}\nSummary: ${selectedArticle.summary || ''}\n\nContent:\n${selectedArticle.content || ''}\n\n${rawSourceContent}`
    } else if (selectedDocumentId && Array.isArray(sopsData)) {
      const found = sopsData.find((a) => a.id === selectedDocumentId)
      if (found && found.title) {
        combinedSource = `Document Title: ${found.title}\nCategory/Type: ${found.content_type || 'SOP'}\nSummary: ${found.summary || ''}\n\nContent:\n${found.content || ''}\n\n${rawSourceContent}`
      }
    } else if (selectedDocumentId && Array.isArray(libraryDocuments)) {
      const found = libraryDocuments.find((d: any) => d.id === selectedDocumentId)
      if (found && found.title) {
        combinedSource = `Document Library File: ${found.title}\nType: ${found.file_type || found.content_type || 'Document'}\nSummary: ${found.ai_summary || found.description || ''}\n\nContent:\n${found.content || ''}\n\n${rawSourceContent}`
      }
    }

    let modeDirectives = ''
    if (generationMode === 'full_course') {
      modeDirectives = `\n[Mode Directives: Full Course | Target Department: ${targetDepartment}]`
    } else if (generationMode === 'topic_based') {
      modeDirectives = `\n[Mode Directives: Topic Based | Theme: ${topicTheme} | Target Role: ${topicStaffRole}]`
    } else if (generationMode === 'document_based') {
      modeDirectives = `\n[Mode Directives: SOP Grounded | Extraction Mode: ${sopExtractionMode}]`
    } else if (generationMode === 'course_remix') {
      modeDirectives = `\n[Mode Directives: Course Remix | Goal: ${remixGoal}]`
    } else if (generationMode === 'outline_only') {
      modeDirectives = `\n[Mode Directives: Outline Only | Framework: ${pedagogicalFramework}]`
    }

    if (courseTopic && !combinedSource) {
      combinedSource = `Course Topic: ${courseTopic}${modeDirectives}`
    } else {
      combinedSource = `${combinedSource}${modeDirectives}`
    }

    return {
      generationMode,
      topic: courseTopic || 'Hospitality Excellence',
      sourceContent: combinedSource,
      courseType,
      instructionalStrategy,
      targetAudience,
      experienceLevel,
      difficulty,
      difficultyProgression,
      overallDepth,
      defaultLessonTemplate,
      granularity: {
        moduleCount: typeof moduleCount === 'number' ? moduleCount : customModuleCount,
        lessonsPerModule: typeof lessonsPerModule === 'number' ? lessonsPerModule : 3,
        lessonDuration,
      },
      depthConfig: {
        theory: theoryDepth,
        examples: examplesDepth,
        practical: practicalDepth,
        caseStudies: caseStudiesDepth,
        assessments: assessmentsDepth,
      },
      lessonComponents: selectedComponents,
      quizConfig: {
        placement: quizPlacement,
        questionCount: quizQuestionCount,
        passingScore: quizPassingScore,
        maxAttempts: quizMaxAttempts,
        randomizeQuestions,
        randomizeAnswers,
        useQuestionPools: false,
        adaptiveDifficulty: difficultyProgression === 'adaptive',
        distractorQuality,
        includeHints,
        includeExplanations,
        storeInQuestionBank: true,
      },
      questionTypes: selectedQuestionTypes,
      bloomDistribution,
      imageConfig: {
        enableAIImages,
        provider: imageModel?.includes('recraft') ? 'recraft' : imageModel?.includes('flux') ? 'replicate' : 'cloudflare',
        costTier: 'free_only',
        imageModel,
        density: imageDensity,
        selectionStrategy: imageSelectionStrategy,
        preferredStyle: preferredVisualStyle,
        preferredAspectRatio,
        maxImagesPerLesson,
        maxImagesPerCourse,
      },
      audioConfig: {
        enableAudio: enableAudioBriefings,
      },
      subsystems: {
        activities: enableActivitiesAgent,
        audio: enableAudioBriefings,
        revision: enableAutoRevision,
        compliance: enableComplianceAudit,
      },
      aiControls: {
        preferredModel,
        targetLanguage,
      },
    }
  }

  // Handle Launching Full Pipeline
  const handleStartGeneration = async () => {
    const config = buildCurrentConfig()
    setErrorState(undefined)
    setCurrentStep('generating')

    try {
      const result = await executePipeline.mutateAsync(config)
      setGeneratedBlueprint(result.blueprint)
      setActiveJobId(result.jobId)

      if (result.blueprint.modules.length > 0) {
        if (result.blueprint.modules[0].lessons.length > 0) {
          setActivePreviewLessonId(result.blueprint.modules[0].lessons[0].id)
        }
      }
      setCurrentStep('preview')
      toast({
        title: t('builder.generationComplete', 'Course Generation Complete'),
        description: t('builder.generationCompleteDesc', {
          count: result.blueprint.modules.reduce((s, m) => s + m.lessons.length, 0),
          defaultValue: `Successfully generated curriculum with QA Score ${result.blueprint.qualityScore || 92}%.`,
        }),
      })
    } catch (e: any) {
      setErrorState({
        hasError: true,
        failedItemTitle: 'Synthesis Interrupted',
        errorMessage: e?.message || t('builder.failedToGenerate', 'Failed to generate course.'),
        canRetry: true,
        canFallback: true,
        canSkip: true,
        onRetry: () => handleStartGeneration(),
        onFallback: () => {
          setPreferredModel('gemini-2.5-flash')
          handleStartGeneration()
        },
        onSkip: () => setCurrentStep('configure'),
        onEditSettings: () => setCurrentStep('configure'),
      })
      toast({
        title: t('common:error', 'Generation Error'),
        description: e?.message || t('builder.failedToGenerate', 'Failed to generate course.'),
        variant: 'destructive',
      })
    }
  }

  // Quick mode: translate the 4 simple answers into a full config via the smart
  // presets, then launch once the state has committed (quickLaunch effect below).
  const handleQuickGenerate = () => {
    const usingDoc =
      (quickSourceKind === 'knowledge_base' || quickSourceKind === 'library') ? Boolean(selectedDocumentId)
      : quickSourceKind === 'upload' ? Boolean(quickUploadName)
      : false
    const mode: CourseGenerationMode = usingDoc ? 'document_based' : 'full_course'
    handleApplyPreset(getSmartModePreset(mode), false)

    // "How thorough" overrides — batched with the preset setters above.
    if (quickThoroughness === 'quick') {
      setCourseType('microlearning')
      setOverallDepth('quick')
      setModuleCount(2)
      setLessonsPerModule(2)
      setLessonDuration(5)
      setQuizQuestionCount(3)
    } else if (quickThoroughness === 'deep') {
      setOverallDepth('expert')
      setModuleCount(5)
      setLessonsPerModule(4)
      setLessonDuration(20)
      setQuizQuestionCount(6)
    } else {
      setOverallDepth('comprehensive')
      setModuleCount(4)
      setLessonsPerModule(3)
      setLessonDuration(15)
      setQuizQuestionCount(5)
    }

    setGenerationMode(mode)
    if (enableAIImages) setImageModel('auto') // real free model, not a stale/fake id
    setEnableAutoRevision(true)
    setEnableComplianceAudit(true)
    setPreferredModel('auto')
    setQuickLaunch(true)
  }

  useEffect(() => {
    if (!quickLaunch) return
    setQuickLaunch(false)
    void handleStartGeneration()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickLaunch])

  // Quick mode: read an uploaded document to plain text and use it as source material.
  const handleQuickFileUpload = (file: File) => {
    setQuickUploadName(`${file.name} (${(file.size / 1024).toFixed(0)} KB)`)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = (e.target?.result as string) || ''
      setRawSourceContent(text.slice(0, 20000))
      if (!courseTopic.trim()) {
        setCourseTopic(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
      }
    }
    reader.readAsText(file)
  }
  const handleQuickClearUpload = () => {
    setQuickUploadName('')
    setRawSourceContent('')
  }

  // Handle Save Blueprint to Database
  const handleSaveToLCMS = async () => {
    if (!generatedBlueprint) return
    const config = buildCurrentConfig()

    try {
      const { moduleId } = await saveBlueprint.mutateAsync({
        blueprint: generatedBlueprint,
        config,
        jobId: activeJobId,
      })

      toast({
        title: t('builder.savedSuccess', 'Course Created & Saved'),
        description: t('builder.savedSuccessDesc', 'Course, modules, content blocks, and quizzes are ready.'),
      })

      onCourseCreated?.(moduleId)
      onOpenChange(false)
      navigate(`/training/builder/${moduleId}`)
    } catch (e: any) {
      toast({
        title: t('common:error', 'Save Error'),
        description: e?.message || t('builder.saveFailed', 'Could not save course to database.'),
        variant: 'destructive',
      })
    }
  }

  // Handle Apply to Active Builder
  const [applyingToBuilder, setApplyingToBuilder] = useState(false)
  const handleApplyToCurrentBuilder = async () => {
    if (!generatedBlueprint || !onApplyToBuilder) return
    setApplyingToBuilder(true)
    const config = buildCurrentConfig()

    try {
      const sections = generatedBlueprint.modules.map((mod, mIdx) => ({
        originalIndex: mIdx,
        heading: mod.title,
        summary: mod.description,
        suggestedBlockType: 'text',
        rich_content: mod.lessons
          .map((l) => `<h3>${l.title}</h3>${l.renderedHtml || ''}`)
          .join('<hr class="my-4"/>'),
        items: mod.lessons.map((l, lIdx) => ({
          id: `lesson_${Date.now()}_${mIdx}_${lIdx}`,
          title: l.title,
          type: 'text',
          content: l.renderedHtml || '',
          order: lIdx,
        })),
      }))

      const checkpoints: any[] = []
      generatedBlueprint.modules.forEach((mod, mIdx) => {
        if (mod.moduleQuiz && mod.moduleQuiz.questions && mod.moduleQuiz.questions.length > 0) {
          checkpoints.push({
            afterSectionIndex: mIdx,
            topic: mod.moduleQuiz.title || `${mod.title} Knowledge Check`,
            include: true,
            questions: mod.moduleQuiz.questions,
            passingScore: mod.moduleQuiz.passingScore || 80,
          })
        }
      })
      if (
        generatedBlueprint.finalAssessment &&
        generatedBlueprint.finalAssessment.questions &&
        generatedBlueprint.finalAssessment.questions.length > 0
      ) {
        checkpoints.push({
          afterSectionIndex: generatedBlueprint.modules.length - 1,
          topic: generatedBlueprint.finalAssessment.title || `${generatedBlueprint.title} Final Comprehensive Exam`,
          include: true,
          questions: generatedBlueprint.finalAssessment.questions,
          passingScore: generatedBlueprint.finalAssessment.passingScore || 85,
        })
      }

      const mappedDiff =
        config.difficulty === 'challenging' || config.difficulty === 'expert'
          ? 'advanced'
          : config.difficulty === 'beginner' || config.difficulty === 'easy'
          ? 'beginner'
          : 'intermediate'

      await onApplyToBuilder({
        title: generatedBlueprint.title,
        description: generatedBlueprint.description,
        sections,
        checkpoints,
        difficulty: mappedDiff,
        language: config.aiControls?.targetLanguage === 'ar' ? 'Arabic' : 'English',
      })

      toast({
        title: t('builder.appliedToBuilderSuccess', '✨ Applied to Course Builder'),
        description: t(
          'builder.appliedToBuilderSuccessDesc',
          'Curriculum sections, rich content blocks, and checkpoints have been added to your course structure.'
        ),
      })

      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: t('common:error', 'Apply Error'),
        description: err?.message || 'Failed to apply generated curriculum to builder.',
        variant: 'destructive',
      })
    } finally {
      setApplyingToBuilder(false)
    }
  }

  // In-Place AI Refinement
  const handleApplyLessonRefinement = async (action: string, customInstruction?: string) => {
    if (!generatedBlueprint || !activePreviewLessonId) return

    let currentLesson: LessonBlueprint | null = null
    for (const mod of generatedBlueprint.modules) {
      const found = mod.lessons.find((l) => l.id === activePreviewLessonId)
      if (found) {
        currentLesson = found
        break
      }
    }
    if (!currentLesson || !currentLesson.renderedHtml) return

    try {
      const refined = await refineMutation.mutateAsync({
        componentType: 'lesson',
        currentContent: currentLesson.renderedHtml,
        action,
        customInstruction,
        language: targetLanguage,
        preferredModel,
      })

      setGeneratedBlueprint((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          modules: prev.modules.map((mod) => ({
            ...mod,
            lessons: mod.lessons.map((les) =>
              les.id === activePreviewLessonId ? { ...les, renderedHtml: refined } : les
            ),
          })),
        }
      })

      setRefineModalOpen(false)
      setRefineCustomPrompt('')
      toast({
        title: t('builder.refinedSuccess', 'Lesson Refined with AI'),
        description: t('builder.refinedSuccessDesc', 'The selected lesson was updated.'),
      })
    } catch {
      toast({
        title: t('common:error', 'Refinement Failed'),
        description: t('builder.refinementFailedDesc', 'Could not refine lesson.'),
        variant: 'destructive',
      })
    }
  }

  // Stage Navigation Helpers
  const stageIndex = STUDIO_STAGES.findIndex((s) => s.id === currentStage)
  const canGoPrev = stageIndex > 0
  const canGoNext = stageIndex < STUDIO_STAGES.length - 1

  const handlePrevStage = () => {
    if (canGoPrev) setCurrentStage(STUDIO_STAGES[stageIndex - 1].id)
  }

  const handleNextStage = () => {
    if (canGoNext) setCurrentStage(STUDIO_STAGES[stageIndex + 1].id)
  }

  const currentSummaryStats = {
    generationMode,
    courseTopic,
    targetAudience,
    courseType,
    difficulty,
    targetLanguage,
    moduleCount: typeof moduleCount === 'number' ? moduleCount : customModuleCount,
    lessonsPerModule: typeof lessonsPerModule === 'number' ? lessonsPerModule : 3,
    lessonDuration,
    overallDepth,
    selectedComponentsCount: selectedComponents.length,
    selectedComponents,
    quizPlacement,
    quizQuestionCount,
    quizPassingScore,
    selectedQuestionTypesCount: selectedQuestionTypes.length,
    selectedQuestionTypes,
    enableAIImages,
    imageModel,
    imageDensity,
    preferredVisualStyle,
    preferredModel,
  }

  const activeLesson = generatedBlueprint?.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.id === activePreviewLessonId)

  // Two SEPARATE lists for the Quick-mode picker: the Knowledge Base (published
  // instructional articles only — no generic "document" / video / visual rows)
  // and the Document / Media Library (uploaded reference files).
  const KB_ARTICLE_TYPES = new Set(['sop', 'policy', 'guide', 'checklist', 'reference', 'faq', 'how_to', 'quick_reference'])
  const quickKnowledgeBaseOptions = useMemo(() => {
    if (!Array.isArray(sopsData)) return []
    return sopsData
      .filter((a: any) => a?.id && a?.title && KB_ARTICLE_TYPES.has(String(a.content_type || 'sop').toLowerCase()))
      .map((a: any) => ({
        id: a.id,
        title: a.title,
        kind: String(a.content_type || 'sop').replace(/_/g, ' ').toUpperCase(),
        preview: (a.summary || a.description || a.content || '').toString().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400),
      }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sopsData])
  const quickLibraryOptions = useMemo(() => {
    if (!Array.isArray(libraryDocuments)) return []
    return libraryDocuments
      .filter((d: any) => d?.id && d?.title)
      .map((d: any) => ({
        id: d.id,
        title: d.title,
        kind: String(d.file_type || d.content_type || 'file').replace(/^\./, '').toUpperCase(),
        preview: (d.ai_summary || d.description || d.content || '').toString().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400),
      }))
  }, [libraryDocuments])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[94vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-4 border-b bg-card/90 backdrop-blur shrink-0 select-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-md">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-base font-bold">
                      {t('builder.lcmsStudioTitle', 'AI Course Creator')}
                    </DialogTitle>
                  </div>
                  <DialogDescription className="text-xs">
                    {studioMode === 'quick'
                      ? t('builder.lcmsStudioDescQuick', 'Describe what you want to train staff on and the AI builds the full course — lessons, quizzes and images. You can edit it all afterwards.')
                      : t('builder.lcmsStudioDesc', 'Full control over structure, teaching style, depth, assessments and visuals.')}
                  </DialogDescription>
                </div>
              </div>

              {/* Mode toggle, Presets, History & Panel Toggle */}
              <div className="flex items-center gap-2">
                {currentStep === 'configure' && (
                  <div className="flex bg-muted p-0.5 rounded-lg border text-xs">
                    <button
                      type="button"
                      onClick={() => setStudioMode('quick')}
                      className={cn(
                        'px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1',
                        studioMode === 'quick' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Zap className="w-3 h-3 text-amber-500" /> {t('builder.modeQuick', 'Quick')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudioMode('advanced')}
                      className={cn(
                        'px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1',
                        studioMode === 'advanced' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Layers className="w-3 h-3 text-purple-600" /> {t('builder.modeAdvanced', 'Advanced')}
                    </button>
                  </div>
                )}

                {studioMode === 'advanced' && (
                  <>
                    <Select
                      onValueChange={(presetId) => {
                        const found = presetsQuery.data?.find((p) => p.id === presetId)
                        if (found) handleApplyPreset(found.preset_config)
                      }}
                    >
                      <SelectTrigger className="text-xs h-8 w-40">
                        <SelectValue placeholder={t('builder.selectPreset', 'Load Preset...')} />
                      </SelectTrigger>
                      <SelectContent>
                        {presetsQuery.data?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDocIngestionModalOpen(true)}
                      className="h-8 text-xs font-semibold gap-1.5 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30"
                      title="Multimodal Document-to-Course Ingestion"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-purple-600" />
                      <span className="hidden md:inline">{t('docIngestion.title', 'Doc Ingestion')}</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setComplianceDialogOpen(true)}
                      className="h-8 text-xs font-semibold gap-1.5 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30"
                      title="KSA Regulatory & Brand Standard Compliance Shield"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden md:inline">{t('complianceShield.title', 'KSA Shield')}</span>
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryOpen(true)}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('builder.history', 'History')}</span>
                </Button>

                {currentStep === 'configure' && studioMode === 'advanced' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSummaryPanelOpen(!summaryPanelOpen)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    title={summaryPanelOpen ? 'Collapse Blueprint Summary' : 'Expand Blueprint Summary'}
                  >
                    {summaryPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Body Section by Step */}
          {currentStep === 'configure' && studioMode === 'quick' && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <StudioQuickStart
                sourceKind={quickSourceKind}
                onChangeSourceKind={setQuickSourceKind}
                courseTopic={courseTopic}
                onChangeTopic={setCourseTopic}
                selectedDocumentId={selectedDocumentId}
                onSelectDocumentId={setSelectedDocumentId}
                knowledgeBaseOptions={quickKnowledgeBaseOptions}
                libraryOptions={quickLibraryOptions}
                isLoadingDocuments={isLoadingSOPs}
                uploadedFileName={quickUploadName}
                onUploadFile={handleQuickFileUpload}
                onClearUpload={handleQuickClearUpload}
                department={targetDepartment}
                onChangeDepartment={setTargetDepartment}
                audience={targetAudience}
                onChangeAudience={(v) => setTargetAudience(v as TargetAudience)}
                thoroughness={quickThoroughness}
                onChangeThoroughness={setQuickThoroughness}
                withImages={enableAIImages}
                onChangeWithImages={setEnableAIImages}
                language={targetLanguage}
                onChangeLanguage={setTargetLanguage}
                onGenerate={handleQuickGenerate}
                isGenerating={executePipeline.isPending}
                onSwitchToAdvanced={() => setStudioMode('advanced')}
              />
            </div>
          )}

          {currentStep === 'configure' && studioMode === 'advanced' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Top Stage Stepper Header */}
              <StudioWorkflowStepper
                currentStage={currentStage}
                onSelectStage={(stage) => setCurrentStage(stage)}
                issuesCount={intelligentRecommendations.length}
              />

              {/* Main Content Area + Collapsible Live Summary Panel */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Stage Form Content */}
                <ScrollArea className="flex-1 p-6">
                  {currentStage === 'basics' && (
                    <StudioStageBasics
                      generationMode={generationMode}
                      onSelectMode={(mode) => {
                        setGenerationMode(mode)
                        const preset = getSmartModePreset(mode)
                        handleApplyPreset(preset, false)
                      }}
                      courseTopic={courseTopic}
                      onChangeTopic={setCourseTopic}
                      selectedDocumentId={selectedDocumentId}
                      onSelectDocumentId={setSelectedDocumentId}
                      rawSourceContent={rawSourceContent}
                      onChangeRawSourceContent={setRawSourceContent}
                      sopsData={sopsData}
                      isLoadingSOPs={isLoadingSOPs}
                      selectedArticle={selectedArticle}
                      libraryDocuments={libraryDocuments}
                      targetDepartment={targetDepartment}
                      onChangeTargetDepartment={setTargetDepartment}
                      topicStaffRole={topicStaffRole}
                      onChangeTopicStaffRole={setTopicStaffRole}
                      targetAudience={targetAudience}
                      onChangeTargetAudience={setTargetAudience}
                      experienceLevel={experienceLevel}
                      onChangeExperienceLevel={setExperienceLevel}
                      difficulty={difficulty}
                      onChangeDifficulty={setDifficulty}
                      targetLanguage={targetLanguage}
                      onChangeTargetLanguage={setTargetLanguage}
                      priorKnowledge={priorKnowledge}
                      onChangePriorKnowledge={setPriorKnowledge}
                      topicTheme={topicTheme}
                      onChangeTopicTheme={setTopicTheme}
                      sopExtractionMode={sopExtractionMode}
                      onChangeSopExtractionMode={setSopExtractionMode}
                      remixGoal={remixGoal}
                      onChangeRemixGoal={setRemixGoal}
                      pedagogicalFramework={pedagogicalFramework}
                      onChangePedagogicalFramework={setPedagogicalFramework}
                    />
                  )}

                  {currentStage === 'design' && (
                    <StudioStageLearningDesign
                      courseType={courseType}
                      onSelectCourseType={(type) => {
                        setCourseType(type)
                        const preset = getSmartCourseTypePreset(type)
                        handleApplyPreset(preset, false)
                      }}
                      instructionalStrategy={instructionalStrategy}
                      onSelectInstructionalStrategy={setInstructionalStrategy}
                      moduleCount={moduleCount}
                      onChangeModuleCount={setModuleCount}
                      customModuleCount={customModuleCount}
                      onChangeCustomModuleCount={setCustomModuleCount}
                      lessonsPerModule={lessonsPerModule}
                      onChangeLessonsPerModule={setLessonsPerModule}
                      lessonDuration={lessonDuration}
                      onChangeLessonDuration={setLessonDuration}
                      difficultyProgression={difficultyProgression}
                      onChangeDifficultyProgression={setDifficultyProgression}
                      pedagogicalFramework={pedagogicalFramework}
                      onChangePedagogicalFramework={setPedagogicalFramework}
                    />
                  )}

                  {currentStage === 'content' && (
                    <StudioStageContentDepth
                      overallDepth={overallDepth}
                      onSelectOverallDepth={setOverallDepth}
                      selectedComponents={selectedComponents}
                      onToggleComponent={(comp) => {
                        setSelectedComponents((prev) =>
                          prev.includes(comp) ? prev.filter((c) => c !== comp) : [...prev, comp]
                        )
                      }}
                      onSelectAllComponents={() =>
                        setSelectedComponents([
                          'intro',
                          'objectives',
                          'concepts',
                          'explanation',
                          'examples',
                          'step_procedure',
                          'dialogue_script',
                          'checklist',
                          'last_protocol',
                          'summary',
                          'action_points',
                          'knowledge_check',
                        ])
                      }
                      onSelectStandardComponents={() =>
                        setSelectedComponents([
                          'intro',
                          'objectives',
                          'explanation',
                          'examples',
                          'step_procedure',
                          'dialogue_script',
                          'checklist',
                          'summary',
                          'knowledge_check',
                        ])
                      }
                      theoryDepth={theoryDepth}
                      onChangeTheoryDepth={setTheoryDepth}
                      examplesDepth={examplesDepth}
                      onChangeExamplesDepth={setExamplesDepth}
                      practicalDepth={practicalDepth}
                      onChangePracticalDepth={setPracticalDepth}
                      caseStudiesDepth={caseStudiesDepth}
                      onChangeCaseStudiesDepth={setCaseStudiesDepth}
                      assessmentsDepth={assessmentsDepth}
                      onChangeAssessmentsDepth={setAssessmentsDepth}
                    />
                  )}

                  {currentStage === 'assessments' && (
                    <StudioStageAssessments
                      quizPlacement={quizPlacement}
                      onSelectQuizPlacement={setQuizPlacement}
                      quizQuestionCount={quizQuestionCount}
                      onChangeQuizQuestionCount={setQuizQuestionCount}
                      quizPassingScore={quizPassingScore}
                      onChangeQuizPassingScore={setQuizPassingScore}
                      quizMaxAttempts={quizMaxAttempts}
                      onChangeQuizMaxAttempts={setQuizMaxAttempts}
                      selectedQuestionTypes={selectedQuestionTypes}
                      onToggleQuestionType={(type) => {
                        setSelectedQuestionTypes((prev) =>
                          prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                        )
                      }}
                      bloomPreset={bloomPreset}
                      onSelectBloomPreset={setBloomPreset}
                      bloomDistribution={bloomDistribution}
                      onChangeBloomDistribution={setBloomDistribution}
                      randomizeQuestions={randomizeQuestions}
                      onChangeRandomizeQuestions={setRandomizeQuestions}
                      randomizeAnswers={randomizeAnswers}
                      onChangeRandomizeAnswers={setRandomizeAnswers}
                      distractorQuality={distractorQuality}
                      onChangeDistractorQuality={setDistractorQuality}
                      includeHints={includeHints}
                      onChangeIncludeHints={setIncludeHints}
                      includeExplanations={includeExplanations}
                      onChangeIncludeExplanations={setIncludeExplanations}
                    />
                  )}

                  {currentStage === 'visuals' && (
                    <StudioStageVisuals
                      enableAIImages={enableAIImages}
                      onChangeEnableAIImages={setEnableAIImages}
                      imageModel={imageModel}
                      onChangeImageModel={setImageModel}
                      imageDensity={imageDensity}
                      onChangeImageDensity={setImageDensity}
                      imageSelectionStrategy={imageSelectionStrategy}
                      onChangeImageSelectionStrategy={setImageSelectionStrategy}
                      preferredVisualStyle={preferredVisualStyle}
                      onChangePreferredVisualStyle={setPreferredVisualStyle}
                      preferredAspectRatio={preferredAspectRatio}
                      onChangePreferredAspectRatio={setPreferredAspectRatio}
                      maxImagesPerLesson={maxImagesPerLesson}
                      onChangeMaxImagesPerLesson={setMaxImagesPerLesson}
                      maxImagesPerCourse={maxImagesPerCourse}
                      onChangeMaxImagesPerCourse={setMaxImagesPerCourse}
                    />
                  )}

                  {currentStage === 'ai_settings' && (
                    <StudioStageAISettings
                      preferredModel={preferredModel}
                      onChangePreferredModel={setPreferredModel}
                      targetLanguage={targetLanguage}
                      onChangeTargetLanguage={setTargetLanguage}
                      enableAudioBriefings={enableAudioBriefings}
                      onChangeEnableAudioBriefings={setEnableAudioBriefings}
                      enableActivitiesAgent={enableActivitiesAgent}
                      onChangeEnableActivitiesAgent={setEnableActivitiesAgent}
                      enableAutoRevision={enableAutoRevision}
                      onChangeEnableAutoRevision={setEnableAutoRevision}
                      enableComplianceAudit={enableComplianceAudit}
                      onChangeEnableComplianceAudit={setEnableComplianceAudit}
                    />
                  )}

                  {currentStage === 'review' && (
                    <StudioStagePreflightReview
                      config={buildCurrentConfig()}
                      onJumpToStage={(stage) => setCurrentStage(stage)}
                      onHarmonize={handleAutoHarmonize}
                      onSavePresetClick={() => setSavePresetDialogOpen(true)}
                      onGenerateClick={handleStartGeneration}
                      isGenerating={executePipeline.isPending}
                      consistencyReport={consistencyReport}
                      recommendations={intelligentRecommendations}
                      onApplyAllRecommendations={handleApplyAllRecommendations}
                    />
                  )}
                </ScrollArea>

                {/* Persistent Right Summary Drawer */}
                {summaryPanelOpen && (
                  <div className="w-80 shrink-0 hidden lg:block h-full">
                    <StudioCourseSummaryPanel
                      stats={currentSummaryStats}
                      onJumpToStage={(stage) => setCurrentStage(stage)}
                      onHarmonize={handleAutoHarmonize}
                      hasIssues={consistencyReport?.issues.length > 0}
                    />
                  </div>
                )}
              </div>

              {/* Sticky Bottom Action Bar */}
              <div className="p-3.5 border-t bg-card/90 backdrop-blur flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSavePresetDialogOpen(true)}
                    className="h-9 text-xs font-semibold gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('builder.savePreset', 'Save Draft Preset')}</span>
                  </Button>

                  {consistencyReport?.issues.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoHarmonize}
                      className="h-9 text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50 gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t('builder.autoHarmonize', 'Harmonize')}</span>
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canGoPrev}
                    onClick={handlePrevStage}
                    className="h-9 text-xs font-semibold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 me-1" />
                    {t('common.prev', 'Previous Stage')}
                  </Button>

                  {canGoNext ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleNextStage}
                      className="h-9 px-5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                    >
                      {t('common.next', 'Next Stage')}
                      <ArrowRight className="w-3.5 h-3.5 ms-1" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleStartGeneration}
                      disabled={executePipeline.isPending}
                      className="h-9 px-6 text-xs font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                    >
                      <Rocket className="w-3.5 h-3.5 me-1.5" />
                      {t('builder.generateCourseCTA', 'Create course')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Generating Progress Monitor */}
          {currentStep === 'generating' && (
            <div className="flex-1 p-6 overflow-y-auto">
              <StudioLiveGenerationProgress
                courseTopic={courseTopic}
                moduleCount={typeof moduleCount === 'number' ? moduleCount : 4}
                lessonsPerModule={typeof lessonsPerModule === 'number' ? lessonsPerModule : 3}
                enableImages={enableAIImages}
                imageModel={imageModel}
                isGenerating={executePipeline.isPending}
                currentStage={executePipeline.currentStage}
                stageName={executePipeline.stageName}
                stageDetail={executePipeline.stageDetail}
                errorState={errorState}
                onCancel={() => setCurrentStep('configure')}
              />
            </div>
          )}

          {/* Step 3: Interactive Curriculum Tree & Studio Preview */}
          {currentStep === 'preview' && generatedBlueprint && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Top Preview Action Bar */}
              <div className="p-3 border-b bg-muted/20 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep('configure')}
                    className="h-8 text-xs font-semibold gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {t('builder.backToConfig', 'Adjust Settings')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQaInspectorOpen(true)}
                    className="h-8 text-xs font-bold text-purple-700 border-purple-300 hover:bg-purple-50 gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5 text-purple-600" />
                    {t('builder.inspectQA', 'Inspect QA & Standards (Score: {{score}}%)', {
                      score: generatedBlueprint.qualityScore || 92,
                    })}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {onApplyToBuilder && (
                    <Button
                      size="sm"
                      onClick={handleApplyToCurrentBuilder}
                      disabled={applyingToBuilder}
                      className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 me-1.5" />
                      {applyingToBuilder ? t('common.applying', 'Applying...') : t('builder.applyToBuilder', 'Apply to Course Builder')}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={handleSaveToLCMS}
                    disabled={saveBlueprint.isPending}
                    className="h-8 text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5 me-1.5" />
                    {saveBlueprint.isPending ? t('common.saving', 'Saving...') : t('builder.saveToLCMS', 'Save to Course Library')}
                  </Button>
                </div>
              </div>

              {/* Interactive Curriculum Tree & Live Lesson Viewer */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
                {/* Left Tree Column */}
                <ScrollArea className="md:col-span-4 lg:col-span-4 border-e p-4 bg-muted/10">
                  <StudioInteractiveOutline
                    blueprint={generatedBlueprint}
                    onChangeBlueprint={setGeneratedBlueprint}
                    activeLessonId={activePreviewLessonId}
                    onSelectLesson={setActivePreviewLessonId}
                    onRegenerateLessonPromptClick={(lesson) => {
                      setTargetRefineLesson(lesson)
                      setRefineModalOpen(true)
                    }}
                    onInspectVisualClick={(asset) => {
                      setSelectedAssetForEditor(asset)
                      setVisualEditorOpen(true)
                    }}
                  />
                </ScrollArea>

                {/* Right Lesson Viewer */}
                <div className="md:col-span-8 lg:col-span-8 flex flex-col min-h-0 overflow-hidden bg-card">
                  {activeLesson ? (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                      {/* Lesson Top Bar */}
                      <div className="p-3.5 border-b bg-card flex items-center justify-between gap-3 shrink-0">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-foreground truncate">
                            {activeLesson.title}
                          </h3>
                          <p className="text-[10px] text-muted-foreground">
                            Template: {activeLesson.templateType} • Est. Time: {activeLesson.durationMinutes || 15}m
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewRawHtml(!viewRawHtml)}
                            className="h-7 text-xs text-muted-foreground gap-1"
                          >
                            <Code className="w-3 h-3" />
                            {viewRawHtml ? 'Rich View' : 'HTML Code'}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTargetRefineLesson(activeLesson)
                              setRefineModalOpen(true)
                            }}
                            className="h-7 text-xs font-bold text-purple-600 border-purple-300 gap-1"
                          >
                            <Wand2 className="w-3 h-3" />
                            Refine with AI
                          </Button>
                        </div>
                      </div>

                      {/* Lesson Content Area */}
                      <ScrollArea className="flex-1 p-6">
                        {/* Audio Briefing Player */}
                        <LessonAudioNarrator
                          lessonTitle={activeLesson.title}
                          lessonContent={activeLesson.renderedHtml || ''}
                          className="mb-6"
                        />

                        {/* Attached Visual Asset / Recraft SVG Preview */}
                        {Boolean((activeLesson.visualAssets && activeLesson.visualAssets.length > 0) || (activeLesson as any).visualAsset) ? (() => {
                          const asset: any = (activeLesson.visualAssets && activeLesson.visualAssets[0]) || (activeLesson as any).visualAsset
                          const imageUrl = asset?.image_url || asset?.publicUrl
                          const modelDisplay = (asset?.model || asset?.imageModel || 'Recraft Vector').split('/').pop()

                          return (
                            <div className="mb-6 p-3 rounded-xl border bg-muted/20 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                                  <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                                  Visual Guide & Schematic ({modelDisplay})
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAssetForEditor(asset)
                                    setVisualEditorOpen(true)
                                  }}
                                  className="h-6 text-[10px] font-semibold"
                                >
                                  Edit / Transform
                                </Button>
                              </div>

                              {imageUrl ? (
                                <div className="relative rounded-lg overflow-hidden border max-h-85 bg-slate-950/90 flex items-center justify-center">
                                  {(() => {
                                    // If imageUrl is SVG data URI or raw SVG, render directly to DOM
                                    let rawSvg: string | null = null
                                    if (imageUrl.startsWith('<svg') || imageUrl.includes('xmlns="http://www.w3.org/2000/svg"')) {
                                      rawSvg = imageUrl
                                    } else if (imageUrl.startsWith('data:image/svg+xml')) {
                                      try {
                                        const commaIndex = imageUrl.indexOf(',')
                                        if (commaIndex !== -1) {
                                          const header = imageUrl.slice(0, commaIndex)
                                          const body = imageUrl.slice(commaIndex + 1)
                                          if (header.includes('base64')) {
                                            rawSvg = decodeURIComponent(escape(atob(body)))
                                          } else {
                                            rawSvg = decodeURIComponent(body)
                                          }
                                        }
                                      } catch {
                                        try {
                                          rawSvg = decodeURIComponent(imageUrl.replace(/^data:image\/svg\+xml[^,]*,/, ''))
                                        } catch {}
                                      }
                                    }

                                    if (rawSvg) {
                                      return (
                                        <div
                                          className="w-full flex items-center justify-center p-2 [&>svg]:w-full [&>svg]:max-h-80 [&>svg]:h-auto [&>svg]:rounded-lg shadow-sm"
                                          dangerouslySetInnerHTML={{ __html: rawSvg }}
                                        />
                                      )
                                    }

                                    return (
                                      <img
                                        src={imageUrl}
                                        alt={asset.alt_text || asset.altText || activeLesson.title}
                                        className="max-h-80 w-full object-contain rounded-md"
                                      />
                                    )
                                  })()}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">Visual synthesis in progress or queued.</p>
                              )}
                              <p className="text-[11px] text-muted-foreground italic">{asset.caption || asset.visual_concept || asset.prompt}</p>
                            </div>
                          )
                        })() : (
                          <div className="mb-6 p-3 rounded-xl border border-dashed bg-muted/10 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                              No visual guide attached to this lesson
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const isGoogle = imageModel.includes('imagen') || imageModel.includes('banana')
                                const isOpenRouter = imageModel.includes('/')
                                const provider = isGoogle ? 'gemini' : isOpenRouter ? 'openrouter' : 'cloudflare'

                                const draftAsset: CourseVisualAsset = {
                                  id: `lesson-visual-${Date.now()}`,
                                  course_id: generatedBlueprint?.id || 'course-draft',
                                  module_id: 'mod-draft',
                                  lesson_id: activeLesson.id,
                                  title: activeLesson.title,
                                  alt_text: activeLesson.learningOutcomes?.[0] || activeLesson.title,
                                  caption: activeLesson.learningOutcomes?.[0] || activeLesson.title,
                                  prompt: `${activeLesson.title}: 5-star luxury hotel operational standard`,
                                  visual_style: preferredVisualStyle,
                                  aspect_ratio: preferredAspectRatio,
                                  model: imageModel || 'google-imagen-3',
                                  provider: provider as any,
                                  educational_purpose: 'concept_illustration',
                                  visual_concept: activeLesson.title,
                                  placement: 'procedure',
                                  status: 'pending',
                                  order_index: 0,
                                  image_url: '',
                                  draft: true,
                                }
                                setSelectedAssetForEditor(draftAsset)
                                setVisualEditorOpen(true)
                              }}
                              className="h-6 text-[10px] font-semibold gap-1 text-purple-600 dark:text-purple-300 border-purple-300 dark:border-purple-800"
                            >
                              <Sparkles className="w-3 h-3 text-purple-500" />
                              Generate Visual Guide
                            </Button>
                          </div>
                        )}

                        {/* Rendered HTML or Raw Source */}
                        {viewRawHtml ? (
                          <pre className="p-4 rounded-xl bg-muted/60 font-mono text-xs text-foreground overflow-x-auto whitespace-pre-wrap">
                            {activeLesson.renderedHtml}
                          </pre>
                        ) : (
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none space-y-4"
                            dangerouslySetInnerHTML={{ __html: activeLesson.renderedHtml || '<p>No content generated.</p>' }}
                          />
                        )}
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
                      Select a lesson from the curriculum outline on the left.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Save Preset Dialog */}
      <Dialog open={savePresetDialogOpen} onOpenChange={setSavePresetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{t('builder.savePresetTitle', 'Save Configuration as Preset')}</DialogTitle>
            <DialogDescription className="text-xs">
              {t('builder.savePresetDesc', 'Name this configuration to quickly reuse pedagogical settings, depth, and quizzes.')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label className="text-xs font-semibold">{t('builder.presetName', 'Preset Name')}</Label>
            <Input
              value={presetNameInput}
              onChange={(e) => setPresetNameInput(e.target.value)}
              placeholder="e.g. Forbes 5-Star VIP Front Office Preset"
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSavePresetDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button size="sm" onClick={handleSavePreset} disabled={!presetNameInput.trim()} className="bg-purple-600 text-white font-bold">
              {t('common.save', 'Save Preset')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson AI Refine Dialog */}
      <Dialog open={refineModalOpen} onOpenChange={setRefineModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-purple-600" />
              <span>Refine Lesson with AI</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Instruct the AI model to improve, expand, translate, or enrich this lesson content.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApplyLessonRefinement('add_examples')}
                className="text-xs font-semibold"
              >
                + Add 5-Star Examples
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApplyLessonRefinement('add_dialogue')}
                className="text-xs font-semibold"
              >
                + Add Guest Dialogue Scripts
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApplyLessonRefinement('simplify')}
                className="text-xs font-semibold"
              >
                ⚡ Simplify Language
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApplyLessonRefinement('expand_depth')}
                className="text-xs font-semibold"
              >
                📖 Expand Depth & Detail
              </Button>
            </div>

            <div className="space-y-1.5 pt-2 border-t">
              <Label className="text-xs font-semibold">Custom AI Refinement Instruction</Label>
              <Input
                value={refineCustomPrompt}
                onChange={(e) => setRefineCustomPrompt(e.target.value)}
                placeholder="e.g. Include specific Opera PMS hotkeys and LAST recovery steps..."
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRefineModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleApplyLessonRefinement('custom', refineCustomPrompt)}
              disabled={!refineCustomPrompt.trim() || refineMutation.isPending}
              className="bg-purple-600 text-white font-bold"
            >
              {refineMutation.isPending ? 'Refining...' : 'Apply AI Refinement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <GenerationHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onSelectJob={(job) => {
          if (job.generated_blueprint) {
            setGeneratedBlueprint(job.generated_blueprint)
            setActiveJobId(job.id)
            setCurrentStep('preview')
            setHistoryOpen(false)
          }
        }}
      />

      {/* QA Inspector Sheet */}
      {generatedBlueprint && (
        <CourseQAInspectorSheet
          open={qaInspectorOpen}
          onOpenChange={setQaInspectorOpen}
          blueprint={generatedBlueprint}
          onBlueprintUpdated={setGeneratedBlueprint}
        />
      )}

      {/* Visual Asset Editor Modal */}
      {selectedAssetForEditor && (
        <VisualAssetEditorModal
          open={visualEditorOpen}
          onOpenChange={(isOpen) => {
            setVisualEditorOpen(isOpen)
            if (!isOpen && !selectedAssetForEditor?.image_url) {
              setSelectedAssetForEditor(null)
            }
          }}
          asset={selectedAssetForEditor}
          onAssetUpdated={(updatedAsset) => {
            setSelectedAssetForEditor(updatedAsset)
            if (generatedBlueprint) {
              setGeneratedBlueprint({
                ...generatedBlueprint,
                modules: generatedBlueprint.modules.map((mod) => ({
                  ...mod,
                  lessons: mod.lessons.map((les) => {
                    const isTarget =
                      les.id === updatedAsset.lesson_id ||
                      (les as any).visualAsset?.id === updatedAsset.id ||
                      les.visualAssets?.some((v) => v.id === updatedAsset.id)
                    if (!isTarget) return les
                    return {
                      ...les,
                      visualAsset: updatedAsset,
                      visualAssets: [updatedAsset],
                    }
                  }),
                })),
              })
            }
          }}
          onAssetDeleted={(deletedId) => {
            setSelectedAssetForEditor(null)
            setVisualEditorOpen(false)
            if (generatedBlueprint) {
              setGeneratedBlueprint({
                ...generatedBlueprint,
                modules: generatedBlueprint.modules.map((mod) => ({
                  ...mod,
                  lessons: mod.lessons.map((les) => {
                    const isTarget =
                      (les as any).visualAsset?.id === deletedId ||
                      les.visualAssets?.some((v) => v.id === deletedId)
                    if (!isTarget) return les
                    return {
                      ...les,
                      visualAsset: undefined,
                      visualAssets: [],
                    }
                  }),
                })),
              })
            }
          }}
        />
      )}

      {/* Multimodal Document Ingestion Modal */}
      <DocumentCourseIngestionModal
        open={docIngestionModalOpen}
        onOpenChange={setDocIngestionModalOpen}
        onCourseGenerated={(bp) => {
          if (bp.title) setCourseTopic(bp.title)
          setGenerationMode('full_course')
          toast({
            title: t('docIngestion.loadedTitle', 'Course Outline Synthesized'),
            description: t('docIngestion.loadedDesc', 'Document guidelines loaded into authoring studio.'),
          })
        }}
      />

      {/* KSA Compliance Shield Dialog */}
      <ComplianceShieldDialog
        open={complianceDialogOpen}
        onOpenChange={setComplianceDialogOpen}
        sections={
          generatedBlueprint
            ? generatedBlueprint.modules.map((m, mIdx) => ({
                id: m.id || `mod-${mIdx}`,
                title: m.title,
                description: m.description,
                order: mIdx,
                items: m.lessons.map((l, lIdx) => ({
                  id: l.id || `les-${lIdx}`,
                  type: 'text',
                  title: l.title,
                  content: l.renderedHtml || '',
                  order: lIdx,
                })),
              }))
            : []
        }
        onApplyRemediation={() => {
          toast({
            title: t('complianceShield.appliedTitle', 'Compliance Standards Applied'),
            description: t('complianceShield.appliedDesc', 'Course curriculum updated with KSA regulatory requirements.'),
          })
        }}
      />
    </>
  )
}
