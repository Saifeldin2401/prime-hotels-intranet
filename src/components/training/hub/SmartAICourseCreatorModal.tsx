import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useGenerateModuleOutline } from '@/hooks/useAIModuleOutline'
import { aiService, type ModuleOutlineSection } from '@/lib/gemini'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  FileQuestion,
  FileText,
  HelpCircle,
  Lightbulb,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  Wand2
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface SmartAICourseCreatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCourseCreated?: (moduleId: string) => void
  /** Optional existing section updater if invoked from inside the builder */
  onApplyToBuilder?: (data: {
    title: string
    description: string
    sections: any[]
    checkpoints?: any[]
  }) => void
  initialTopic?: string
}

interface DraftSection extends ModuleOutlineSection {
  id: string
  include: boolean
  originalIndex: number
}

interface DraftCheckpoint {
  id: string
  afterSectionIndex: number
  topic: string
  include: boolean
}

const HOTEL_SUGGESTIONS = [
  '5-Star Front Desk Check-in & Guest Welcome Standards',
  'Luxury Suite Housekeeping & Room Turnover Checklist',
  'Fine Dining Food & Beverage Table Service Etiquette',
  'Hotel Emergency Evacuation & Fire Safety Response',
  'Handling Difficult Guest Complaints & Service Recovery',
  'Concierge VIP Guest Care & Special Handling Procedures'
]

export function SmartAICourseCreatorModal({
  open,
  onOpenChange,
  onCourseCreated,
  onApplyToBuilder,
  initialTopic = ''
}: SmartAICourseCreatorModalProps) {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const generateOutline = useGenerateModuleOutline()

  // Wizard state: 'prompt' | 'preview'
  const [activeStep, setActiveStep] = useState<'prompt' | 'preview'>('prompt')

  // Step 1: Input state
  const [topic, setTopic] = useState(initialTopic)
  const [sourceType, setSourceType] = useState<'scratch' | 'kb_doc' | 'paste'>('scratch')
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [docSearch, setDocSearch] = useState('')
  const [pastedContent, setPastedContent] = useState('')
  const [department, setDepartment] = useState('general')
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [language, setLanguage] = useState<'English' | 'Arabic'>('English')
  const [sectionCount, setSectionCount] = useState<number>(4)
  const [includeQuizzes, setIncludeQuizzes] = useState(true)
  const [autoDeepExpand, setAutoDeepExpand] = useState(true)

  // Step 2: Generated results state
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftSections, setDraftSections] = useState<DraftSection[]>([])
  const [draftCheckpoints, setDraftCheckpoints] = useState<DraftCheckpoint[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [previewSectionId, setPreviewSectionId] = useState<string | null>(null)
  const [expandingSectionId, setExpandingSectionId] = useState<string | null>(null)
  const [isExpandingAll, setIsExpandingAll] = useState(false)

  // Fetch Knowledge Base SOPs for selection
  const { data: availableSOPs = [] } = useQuery({
    queryKey: ['kb-sops-selector', docSearch],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('id, title, description, content')
        .eq('is_archived', false)
        .order('title')
        .limit(20)

      if (docSearch.trim()) {
        query = query.ilike('title', `%${docSearch.trim()}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: open && sourceType === 'kb_doc'
  })

  // Synchronize initial topic
  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic)
    }
  }, [initialTopic])

  // Reset modal state on close
  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setActiveStep('prompt')
      setDraftTitle('')
      setDraftDescription('')
      setDraftSections([])
      setDraftCheckpoints([])
    }
    onOpenChange(nextOpen)
  }

  // Construct context and call AI generation
  const handleGenerate = async () => {
    let sourceContentForAI = ''

    if (sourceType === 'scratch') {
      if (!topic.trim()) {
        toast({
          title: t('common:error', 'Required Field'),
          description: t('builder.enterTopicPrompt', 'Please enter a course topic or title.'),
          variant: 'destructive'
        })
        return
      }
      sourceContentForAI = `Course Topic: ${topic.trim()}\nTarget Department: ${department}\nTarget Audience Level: ${difficulty}\nContext: Luxury hotel operations and hospitality standard operating procedures.`
    } else if (sourceType === 'kb_doc') {
      const doc = availableSOPs.find((d) => d.id === selectedDocId)
      if (!doc) {
        toast({
          title: t('common:error', 'Required Field'),
          description: t('builder.selectDocumentPrompt', 'Please select an SOP document from the list.'),
          variant: 'destructive'
        })
        return
      }
      sourceContentForAI = `SOP Document Title: ${doc.title}\nDescription: ${doc.description || ''}\nContent:\n${doc.content || ''}\nTarget Department: ${department}`
    } else if (sourceType === 'paste') {
      if (!pastedContent.trim()) {
        toast({
          title: t('common:error', 'Required Field'),
          description: t('builder.pasteContentPrompt', 'Please paste the SOP or training text.'),
          variant: 'destructive'
        })
        return
      }
      sourceContentForAI = pastedContent.trim()
    }

    try {
      const result = await generateOutline.mutateAsync({
        sourceContent: sourceContentForAI,
        targetLanguage: language,
        sectionCount: sectionCount
      })

      setDraftTitle(result.title || topic || 'Luxury Hospitality Standard')
      setDraftDescription(result.description || '')
      
      let baseSections = (result.sections || []).map((sec, idx) => ({
        ...sec,
        id: `draft_${Date.now()}_${idx}`,
        include: true,
        originalIndex: idx
      }))

      setDraftSections(baseSections)
      setDraftCheckpoints(
        includeQuizzes
          ? (result.suggestedQuizCheckpoints || []).map((chk, idx) => ({
              id: `chk_${Date.now()}_${idx}`,
              afterSectionIndex: chk.afterSectionIndex,
              topic: chk.topic,
              include: true
            }))
          : []
      )

      setActiveStep('preview')

      // If auto deep expand is selected, progressively expand all lessons in background
      if (autoDeepExpand && baseSections.length > 0) {
        setIsExpandingAll(true)
        try {
          const updated = [...baseSections]
          for (let i = 0; i < updated.length; i++) {
            setExpandingSectionId(updated[i].id)
            const expanded = await aiService.expandLessonContent({
              courseTitle: result.title || topic,
              sectionHeading: updated[i].heading,
              sectionSummary: updated[i].summary,
              department: department,
              language: language
            })
            updated[i] = { ...updated[i], rich_content: expanded }
            setDraftSections([...updated])
          }
        } catch (expErr) {
          console.warn('Auto expansion encountered error, keeping baseline:', expErr)
        } finally {
          setIsExpandingAll(false)
          setExpandingSectionId(null)
        }
      }
    } catch (err: any) {
      console.error('Failed to generate course:', err)
    }
  }

  const handleDeepExpandSection = async (sectionId: string) => {
    const sec = draftSections.find((s) => s.id === sectionId)
    if (!sec) return
    setExpandingSectionId(sectionId)
    try {
      const expandedHtml = await aiService.expandLessonContent({
        courseTitle: draftTitle,
        sectionHeading: sec.heading,
        sectionSummary: sec.summary,
        department: department,
        language: language
      })
      setDraftSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, rich_content: expandedHtml } : s))
      )
      setPreviewSectionId(sectionId)
      toast({
        title: '✨ Deep SOP Expanded',
        description: `Generated comprehensive 5-star manual for: ${sec.heading}`
      })
    } catch (e) {
      console.error('Failed to expand section:', e)
    } finally {
      setExpandingSectionId(null)
    }
  }

  const handleDeepExpandAll = async () => {
    setIsExpandingAll(true)
    try {
      const updated = [...draftSections]
      for (let i = 0; i < updated.length; i++) {
        if (!updated[i].include) continue
        setExpandingSectionId(updated[i].id)
        const expandedHtml = await aiService.expandLessonContent({
          courseTitle: draftTitle,
          sectionHeading: updated[i].heading,
          sectionSummary: updated[i].summary,
          department: department,
          language: language
        })
        updated[i] = { ...updated[i], rich_content: expandedHtml }
        setDraftSections([...updated])
      }
      toast({
        title: '🚀 All Lessons Expanded',
        description: 'All active sections now contain full 5-star standard operating procedures.'
      })
    } catch (e) {
      console.error('Failed to expand all sections:', e)
    } finally {
      setIsExpandingAll(false)
      setExpandingSectionId(null)
    }
  }

  // Create Course in Database & Open Builder
  const handleSaveAndOpen = async (shouldPublish: boolean = false) => {
    const includedSections = draftSections.filter((s) => s.include)
    if (includedSections.length === 0) {
      toast({
        title: t('common:error', 'No Sections'),
        description: t('builder.atLeastOneSection', 'Please select at least one section to include.'),
        variant: 'destructive'
      })
      return
    }

    // If caller is the builder, update in-memory builder state directly
    if (onApplyToBuilder) {
      onApplyToBuilder({
        title: draftTitle,
        description: draftDescription,
        sections: includedSections,
        checkpoints: draftCheckpoints.filter((c) => c.include)
      })
      handleClose(false)
      toast({
        title: t('builder.outlineApplied', 'Course Structure Applied'),
        description: t('builder.outlineAppliedDesc', 'Sections, SOP lessons, and quiz checkpoints have been added to your course.')
      })
      return
    }

    setIsSaving(true)
    try {
      // 1. Create module
      const { data: newModule, error: moduleError } = await supabase
        .from('training_modules')
        .insert({
          title: draftTitle || topic || 'New Training Course',
          description: draftDescription,
          category: department,
          difficulty_level: difficulty,
          estimated_duration_minutes: includedSections.length * 10,
          validity_period_days: 365,
          certificate_enabled: true,
          passing_score_percentage: 80,
          created_by: profile?.id,
          status: shouldPublish ? 'published' : 'draft'
        })
        .select()
        .single()

      if (moduleError) throw moduleError

      // 2. Prepare doc rows and quizzes
      const docRows: any[] = []
      let blockOrder = 0

      for (let sIdx = 0; sIdx < includedSections.length; sIdx++) {
        const sec = includedSections[sIdx]
        const cleanContent = sec.rich_content || `<h3>${sec.heading}</h3><p>${sec.summary}</p>`

        // Lesson block
        docRows.push({
          training_module_id: newModule.id,
          content_type: 'training_block',
          block_type: sec.suggestedBlockType === 'scenario' ? 'text' : sec.suggestedBlockType,
          block_order: blockOrder++,
          title: sec.heading || `Lesson ${sIdx + 1}`,
          content: cleanContent,
          content_data: { summary: sec.summary },
          is_mandatory: true,
          ai_generated: true
        })

        // Check if there is an active quiz checkpoint
        const chk = draftCheckpoints.find((c) => c.afterSectionIndex === sec.originalIndex && c.include)
        if (chk) {
          try {
            const { data: createdQuiz } = await supabase
              .from('learning_quizzes')
              .insert({
                title: `Checkpoint: ${chk.topic || sec.heading}`,
                description: `Verification quiz for ${sec.heading}`,
                training_module_id: newModule.id,
                passing_score_percentage: 80,
                time_limit_minutes: 10,
                max_attempts: 3,
                status: 'published',
                created_by: profile?.id
              })
              .select()
              .single()

            if (createdQuiz) {
              const quizQuestions = await aiService.generateQuiz({
                sopContent: `${sec.heading}\n${sec.summary}\n${cleanContent}`,
                count: 3,
                difficulty: difficulty,
                language: language
              })

              for (let qIdx = 0; qIdx < quizQuestions.length; qIdx++) {
                const q = quizQuestions[qIdx]
                const { data: newQ } = await supabase
                  .from('unified_questions')
                  .insert({
                    question_text: q.question_text,
                    question_type: q.question_type || 'mcq',
                    options: q.options.map((opt) => ({
                      text: typeof opt === 'string' ? opt : (opt as any).text,
                      is_correct: (typeof opt === 'string' ? opt : (opt as any).text) === q.correct_answer
                    })),
                    correct_answer: q.correct_answer,
                    explanation: q.explanation,
                    hint: q.hint,
                    points: 10,
                    department: department,
                    difficulty_level: difficulty,
                    status: 'active'
                  } as any)
                  .select()
                  .single()

                if (newQ) {
                  await supabase.from('unified_quiz_questions').insert({
                    quiz_id: createdQuiz.id,
                    question_id: newQ.id,
                    question_order: qIdx + 1
                  })
                }
              }

              // Push Quiz block into documents
              docRows.push({
                training_module_id: newModule.id,
                content_type: 'training_block',
                block_type: 'quiz',
                block_order: blockOrder++,
                title: `Checkpoint Quiz: ${chk.topic || sec.heading}`,
                content: '',
                content_data: {
                  quiz_id: createdQuiz.id,
                  passing_score: 80,
                  is_checkpoint: true
                },
                is_mandatory: true,
                ai_generated: true
              })
            }
          } catch (qErr) {
            console.warn('Could not generate quiz checkpoint for section:', qErr)
          }
        }
      }

      const { error: blockError } = await supabase
        .from('documents')
        .insert(docRows)

      if (blockError) throw blockError

      await queryClient.invalidateQueries({ queryKey: ['training-modules'] })

      toast({
        title: shouldPublish ? t('builder.coursePublished', 'Course Published!') : t('builder.courseCreated', 'Course Created!'),
        description: t('builder.courseCreatedDesc', 'Opening course builder canvas...')
      })

      handleClose(false)

      if (onCourseCreated) {
        onCourseCreated(newModule.id)
      } else {
        navigate(`/training/hub/${newModule.id}?view=builder`)
      }
    } catch (err: any) {
      console.error('Error creating course:', err)
      toast({
        title: t('common:error', 'Creation Failed'),
        description: err.message || t('builder.createError', 'Could not create training course.'),
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b bg-white dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {t('builder.smartAiCreatorTitle', 'Smart AI Course Creator')}
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                  2-STEP GENIUS
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {activeStep === 'prompt'
                  ? t('builder.smartAiStep1Desc', 'Define your topic, audience, and source material to generate a complete interactive course.')
                  : t('builder.smartAiStep2Desc', 'Review generated modules, rich lesson content, and quizzes before saving.')}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                'px-3 py-1 text-xs font-semibold',
                activeStep === 'prompt' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
              )}
            >
              1. Setup
            </Badge>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <Badge
              variant="secondary"
              className={cn(
                'px-3 py-1 text-xs font-semibold',
                activeStep === 'preview' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
              )}
            >
              2. Review & Build
            </Badge>
          </div>
        </div>

        {/* Modal Body */}
        <ScrollArea className="flex-1 p-6">
          {activeStep === 'prompt' ? (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Source Material Tabs */}
              <div className="space-y-3">
                <Label className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  {t('builder.sourceMaterial', 'Course Source & Topic')}
                </Label>

                <Tabs value={sourceType} onValueChange={(v: any) => setSourceType(v)}>
                  <TabsList className="grid grid-cols-3 w-full bg-slate-200/70 p-1">
                    <TabsTrigger value="scratch" className="text-xs font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate from Scratch
                    </TabsTrigger>
                    <TabsTrigger value="kb_doc" className="text-xs font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      From Hotel SOP
                    </TabsTrigger>
                    <TabsTrigger value="paste" className="text-xs font-semibold flex items-center gap-1.5">
                      <FileQuestion className="w-3.5 h-3.5" />
                      Paste Custom Text
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Scratch Topic */}
                  <TabsContent value="scratch" className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <Input
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. 5-Star Front Desk Check-in Standards..."
                        className="text-base py-3 bg-white dark:bg-slate-950 font-medium"
                      />
                    </div>

                    {/* Fast Suggestions */}
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        Popular Hotel SOP Prompts:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {HOTEL_SUGGESTIONS.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setTopic(sug)}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-slate-700 dark:text-slate-300 transition-all text-left"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab 2: Knowledge Base Document */}
                  <TabsContent value="kb_doc" className="mt-4 space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <Input
                        value={docSearch}
                        onChange={(e) => setDocSearch(e.target.value)}
                        placeholder="Search Knowledge Base SOPs & manuals..."
                        className="pl-9 bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                      {availableSOPs.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDocId(doc.id)}
                          className={cn(
                            'p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between',
                            selectedDocId === doc.id
                              ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          )}
                        >
                          <p className="text-xs font-bold text-slate-900 line-clamp-1">{doc.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                            {doc.description || 'Standard Operating Procedure'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Tab 3: Custom Text */}
                  <TabsContent value="paste" className="mt-4 space-y-2">
                    <Textarea
                      rows={5}
                      value={pastedContent}
                      onChange={(e) => setPastedContent(e.target.value)}
                      placeholder="Paste your standard operating procedures, policies, or lesson notes here..."
                      className="bg-white dark:bg-slate-950 text-xs font-mono"
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Course Configuration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Department */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Target Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="bg-white dark:bg-slate-950 text-xs font-medium">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="front_office">Front Office & Concierge</SelectItem>
                      <SelectItem value="housekeeping">Housekeeping & Rooms</SelectItem>
                      <SelectItem value="fb">Food & Beverage</SelectItem>
                      <SelectItem value="maintenance">Maintenance & Engineering</SelectItem>
                      <SelectItem value="security">Security & Safety</SelectItem>
                      <SelectItem value="management">Management & Leadership</SelectItem>
                      <SelectItem value="general">General All-Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Difficulty */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Difficulty Level</Label>
                  <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                    <SelectTrigger className="bg-white dark:bg-slate-950 text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner (Foundational)</SelectItem>
                      <SelectItem value="intermediate">Intermediate (Standard)</SelectItem>
                      <SelectItem value="advanced">Advanced (Mastery)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Content Language</Label>
                  <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                    <SelectTrigger className="bg-white dark:bg-slate-950 text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English (EN)</SelectItem>
                      <SelectItem value="Arabic">Arabic (العربية)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Course Options & Section Count */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Lesson Structure Density</p>
                    <p className="text-[11px] text-muted-foreground">Choose the number of interactive lesson modules to generate</p>
                  </div>
                  <Select value={String(sectionCount)} onValueChange={(v) => setSectionCount(Number(v))}>
                    <SelectTrigger className="w-36 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Quick Lessons</SelectItem>
                      <SelectItem value="4">4 Standard Modules</SelectItem>
                      <SelectItem value="6">6 Deep-Dive Lessons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Auto Deep-Expand All Lessons (Comprehensive SOPs)</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">Generates full 600-word 5-star operational manuals with procedures, dialogue scripts, and checklists</p>
                  </div>
                  <Checkbox
                    checked={autoDeepExpand}
                    onCheckedChange={(c) => setAutoDeepExpand(Boolean(c))}
                    className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                </div>

                <div className="border-t pt-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Auto-Generate Knowledge Quizzes</p>
                    <p className="text-[11px] text-muted-foreground">Includes verified single & multiple-choice questions per checkpoint</p>
                  </div>
                  <Checkbox
                    checked={includeQuizzes}
                    onCheckedChange={(c) => setIncludeQuizzes(Boolean(c))}
                    className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Generated Course Preview */
            <div className="space-y-5 max-w-3xl mx-auto">
              {/* Editable Title & Description */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Generated Course Title</Label>
                  <Input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="text-base font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Course Summary</Label>
                  <Textarea
                    rows={2}
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Sections List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Generated Lesson Sections ({draftSections.filter((s) => s.include).length} Active)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isExpandingAll}
                      className="h-7 text-xs font-semibold border-amber-300 text-amber-800 bg-amber-50/50 hover:bg-amber-100"
                      onClick={handleDeepExpandAll}
                    >
                      {isExpandingAll ? (
                        <>
                          <Loader2 className="w-3 h-3 me-1.5 animate-spin" />
                          <span>Expanding All Lessons...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 me-1.5 text-amber-600" />
                          <span>🚀 Deep Expand All Lessons</span>
                        </>
                      )}
                    </Button>
                    <Badge variant="outline" className="text-[10px]">
                      Click checkbox to toggle
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {draftSections.map((section, idx) => (
                    <Card
                      key={section.id}
                      className={cn(
                        'transition-all border',
                        section.include
                          ? 'border-slate-200 bg-white dark:bg-slate-950 shadow-sm'
                          : 'opacity-50 border-dashed border-slate-200 bg-slate-100/50'
                      )}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <Checkbox
                              checked={section.include}
                              onCheckedChange={(chk) => {
                                setDraftSections((prev) =>
                                  prev.map((s) => (s.id === section.id ? { ...s, include: Boolean(chk) } : s))
                                )
                              }}
                              className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 mt-0.5"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>Lesson {idx + 1}:</span>
                                {section.heading}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{section.summary}</p>
                            </div>
                          </div>

                          <Badge variant="secondary" className="text-[10px] uppercase font-mono shrink-0">
                            {section.suggestedBlockType}
                          </Badge>
                        </div>

                        {/* Action buttons on card */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            {section.rich_content && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                                onClick={() => setPreviewSectionId(previewSectionId === section.id ? null : section.id)}
                              >
                                <Eye className="w-3 h-3 me-1" />
                                <span>{previewSectionId === section.id ? 'Hide Full SOP' : '👁️ Preview Full SOP'}</span>
                              </Button>
                            )}

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={expandingSectionId === section.id || isExpandingAll}
                              className="h-6 px-2 text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
                              onClick={() => handleDeepExpandSection(section.id)}
                            >
                              {expandingSectionId === section.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 me-1 animate-spin" />
                                  <span>Writing Deep SOP...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 me-1 text-indigo-600" />
                                  <span>✨ Deep Expand SOP with AI</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {previewSectionId === section.id && section.rich_content && (
                          <div className="mt-2 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 text-xs text-slate-800 dark:text-slate-200 prose prose-xs max-w-none leading-relaxed">
                            <div dangerouslySetInnerHTML={{ __html: section.rich_content }} />
                          </div>
                        )}

                        {/* Associated quiz checkpoint if any */}
                        {draftCheckpoints.some((c) => c.afterSectionIndex === section.originalIndex && c.include) && (
                          <div className="mt-2 pt-2 border-t flex items-center gap-2 text-xs text-purple-700 bg-purple-50/50 p-2 rounded-lg">
                            <FileQuestion className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-semibold">Knowledge Checkpoint:</span>
                            <span className="truncate">
                              {draftCheckpoints.find((c) => c.afterSectionIndex === section.originalIndex)?.topic}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer Buttons */}
        <div className="px-6 py-4 border-t bg-white dark:bg-slate-950 flex items-center justify-between">
          {activeStep === 'prompt' ? (
            <>
              <Button variant="ghost" onClick={() => handleClose(false)}>
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generateOutline.isPending}
                className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold px-6 shadow-md border-none"
              >
                {generateOutline.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                    Generating Course with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 me-2" />
                    Generate Course Content
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveStep('prompt')}>
                  <ArrowLeft className="w-4 h-4 me-1.5" />
                  Edit Prompt
                </Button>
                <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={generateOutline.isPending}>
                  <RefreshCw className={cn('w-4 h-4 me-1.5', generateOutline.isPending && 'animate-spin')} />
                  Regenerate
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSaveAndOpen(false)}
                  disabled={isSaving}
                  className="font-semibold"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin me-1.5" /> : null}
                  {onApplyToBuilder ? 'Apply to Builder' : 'Save as Draft & Open'}
                </Button>
                {!onApplyToBuilder && (
                  <Button
                    onClick={() => handleSaveAndOpen(true)}
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin me-1.5" /> : null}
                    Create & Publish
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
