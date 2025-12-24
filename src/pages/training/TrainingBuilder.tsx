import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  Plus,
  Save,
  Eye,
  Trash2,
  FileText,
  Video,
  Image,
  Link,
  Clock,
  Award,
  Upload,
  FileQuestion,
  BookOpen,
  Sparkles,
  Wand2,
  Layers
} from 'lucide-react'
import type { TrainingModule } from '@/lib/types'
import type { LearningQuiz } from '@/types/learning'
import { useTranslation } from 'react-i18next'
import { AIQuestionGenerator } from '@/components/questions/AIQuestionGenerator'
import { KnowledgeBaseSidebar, SmartModuleWizard } from '@/components/training'
import { ModuleSkillsEditor } from '@/components/training/ModuleSkillsEditor'
import { BuilderHeader } from '@/components/training/builder/BuilderHeader'
import { BuilderSidebar } from '@/components/training/builder/BuilderSidebar'
import { BuilderCanvas } from '@/components/training/builder/BuilderCanvas'
import { BuilderPreview } from '@/components/training/builder/BuilderPreview'

type ContentType = 'text' | 'image' | 'video' | 'document_link' | 'audio' | 'quiz' | 'interactive' | 'sop_reference'
type QuestionType = 'mcq' | 'true_false' | 'fill_blank'
type ViewMode = 'builder' | 'preview'

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

export default function TrainingBuilder() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { t, i18n } = useTranslation('training')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isRTL = i18n.dir() === 'rtl'

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

  // Module state
  const [moduleId, setModuleId] = useState<string | null>(id || null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [validityPeriod, setValidityPeriod] = useState('')
  const [passingScore, setPassingScore] = useState('80')
  const [maxAttempts, setMaxAttempts] = useState('3')
  const [allowRetake, setAllowRetake] = useState(true)
  const [category, setCategory] = useState('')
  const [certificateEnabled, setCertificateEnabled] = useState(true)
  const [isPublished] = useState(false)

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
      setEstimatedDuration(moduleData.estimated_duration_minutes?.toString() || '')
      setValidityPeriod(moduleData.validity_period_days?.toString() || '')
      setCategory(moduleData.category || '')
      setCertificateEnabled(moduleData.certificate_enabled ?? true)
      setPassingScore(moduleData.passing_score_percentage?.toString() || '80')
    }
  }, [moduleData])

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
        duration: block.duration_seconds,
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
  const [viewMode, setViewMode] = useState<ViewMode>('builder')
  const [draggedItem, setDraggedItem] = useState<ContentBlockForm | null>(null)
  const [selectedContent, setSelectedContent] = useState<ContentBlockForm | null>(null)
  const [contentType, setContentType] = useState<ContentType>('text')

  // Training settings
  const [timeLimit, setTimeLimit] = useState<number | null>(null)
  const [allowRetries, setAllowRetries] = useState(true)
  const [showFeedback, setShowFeedback] = useState(true)
  const [certificateOnCompletion, setCertificateOnCompletion] = useState(true)
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
  const totalDuration = sections.reduce((acc, section) =>
    acc + section.items.reduce((itemAcc, item) => itemAcc + (item.duration || 0), 0), 0
  )

  const totalPoints = sections.reduce((acc, section) =>
    acc + section.items.reduce((itemAcc, item) => itemAcc + (item.points || 0), 0), 0
  )

  const totalItems = sections.reduce((acc, section) => acc + section.items.length, 0)

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: ContentBlockForm) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetSection: TrainingSection, targetIndex?: number) => {
    e.preventDefault()
    if (!draggedItem) return

    const updatedSections = sections.map(section => {
      if (section.id === targetSection.id) {
        const filteredItems = section.items.filter(item => item !== draggedItem)
        const newItems = [...filteredItems]

        if (targetIndex !== undefined) {
          newItems.splice(targetIndex, 0, draggedItem)
        } else {
          newItems.push(draggedItem)
        }

        return { ...section, items: newItems }
      }
      return section
    })

    setSections(updatedSections)
    setDraggedItem(null)
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
  }

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId))
    if (activeSection === sectionId) {
      setActiveSection(null)
    }
  }

  const addContent = (type: ContentType) => {
    if (!activeSection) {
      addSection()
      return
    }

    setContentType(type)
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
    setShowContentDialog(true)
  }

  const saveContent = () => {
    if (!currentBlock.title.trim() || !activeSection) return

    const newContent: ContentBlockForm = {
      ...currentBlock,
      id: selectedContent?.id || `content-${Date.now()}`,
      title: currentBlock.title.trim(),
      content: currentBlock.content.trim(),
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `training/${type}s/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type // Explicitly set content type
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('documents').getPublicUrl(filePath)

      setCurrentBlock(prev => ({
        ...prev,
        content_url: data.publicUrl
      }))

      toast({
        title: t('uploadSuccessful'),
        description: type === 'image' ? t('imageUploaded') : t('documentUploaded')
      })
    } catch (error) {
      console.error('Upload failed:', error)
      toast({
        title: t('uploadFailed'),
        description: t('tryAgain'),
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
        estimated_duration_minutes: estimatedDuration ? Number(estimatedDuration) : (totalDuration || null),
        validity_period_days: validityPeriod ? Number(validityPeriod) : null,
        category: category || null,
        certificate_enabled: certificateEnabled,
        passing_score_percentage: passingScore ? Number(passingScore) : 80,
        created_by: profile?.id
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
        setModuleId(data.id)
      }

      // Save content blocks from sections
      if (currentModuleId) {
        // Delete existing blocks
        await supabase
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
              is_mandatory: item.is_mandatory ?? true
            })
          }
        }

        // Also include any standalone content blocks
        for (const block of contentBlocks) {
          allBlocks.push({
            training_module_id: currentModuleId,
            type: block.type,
            content: block.content || block.title || '',
            content_url: block.content_url || null,
            content_data: block.content_data || {},
            order: orderIndex++,
            is_mandatory: block.is_mandatory ?? true
          })
        }

        if (allBlocks.length > 0) {
          const { error: blocksError } = await supabase
            .from('training_content_blocks')
            .insert(allBlocks)
          if (blocksError) {
            console.error('Error saving blocks:', blocksError)
            alert(`Error saving blocks: ${blocksError.message}`)
            throw blocksError
          }
        }

        // VERIFY PERSISTENCE
        const { count, error: verifyError } = await supabase
          .from('training_content_blocks')
          .select('*', { count: 'exact', head: true })
          .eq('training_module_id', currentModuleId)

        if (verifyError) console.error('Verification failed:', verifyError)
        console.log('VERIFIED SAVED BLOCKS COUNT:', count)
        alert(t('moduleSaved') + ` (${count} items saved)`)
      } else {
        alert(t('moduleSaved'))
      }
    } catch (error: any) {
      console.error('Error saving training:', error)
      alert(t('error'))
    }
  }

  const publishTraining = async () => {
    await saveTraining()
    // Additional publish logic here
    alert(t('modulePublished'))
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
        estimated_duration_minutes: estimatedDuration ? Number(estimatedDuration) : null,
        validity_period_days: validityPeriod ? Number(validityPeriod) : null,
        created_by: profile?.id,
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
      setModuleId(newModuleId)
    }
  })

  // Save content blocks mutation
  const saveContentBlocksMutation = useMutation({
    mutationFn: async (idToUse?: string) => {
      const targetId = idToUse || moduleId
      if (!targetId) return

      // Delete existing blocks
      await supabase
        .from('training_content_blocks')
        .delete()
        .eq('training_module_id', targetId)

      // Insert new blocks
      // Use sections to build the blocks list to ensure we capture the current UI state
      const blocksToInsert: any[] = []
      let orderIndex = 0

      for (const section of sections) {
        for (const item of section.items) {
          blocksToInsert.push({
            training_module_id: targetId,
            type: item.type,
            content: item.content || item.title || '',
            content_url: item.content_url || null,
            content_data: item.content_data || {},
            order: orderIndex++,
            is_mandatory: item.is_mandatory ?? true,
            duration_seconds: item.duration,
            points: item.points
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
      console.log('Starting save process...')
      // First save the module
      const savedModuleId = await saveModuleMutation.mutateAsync()

      console.log('Module saved:', savedModuleId)

      // Then save content blocks using the NEW ID
      await saveContentBlocksMutation.mutateAsync(savedModuleId)

      // Then save questions using the NEW ID
      await saveQuestionsMutation.mutateAsync(savedModuleId)

      alert(t('moduleSaved'))
    } catch (error: any) {
      console.error('Save failed:', error)
      alert(t('error') + ': ' + error.message)
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

  return (
    <div className={`min-h-screen bg-background flex flex-col ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Header */}
      <BuilderHeader
        title={title}
        isSaving={saveModuleMutation.isPending || saveContentBlocksMutation.isPending}
        hasUnsavedChanges={saveModuleMutation.isPending || saveContentBlocksMutation.isPending}
        onSave={handleSave}
        onPreview={() => setViewMode('preview')}
        onMagic={() => setShowSmartWizard(true)}
        onTitleChange={setTitle}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main Canvas */}
        {/* Main Canvas */}
        <main className="flex-1 overflow-y-auto">
          {viewMode === 'builder' ? (
            <BuilderCanvas
              sections={sections}
              activeSection={activeSection}
              onSectionClick={(id) => setActiveSection(id)}
              onAddSection={addSection}
              onDeleteSection={deleteSection}
              onAddContent={(type) => addContent(type)}
              onEditContent={(sectionId, contentId) => {
                const contentIndex = contentBlocks.findIndex(c => c.id === contentId)
                if (contentIndex !== -1) handleEditContentBlock(contentIndex)
                // Note: Logic needs adaptation for sections
                // For now finding by ID in flat list or section list
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
            />
          ) : (
            <BuilderPreview
              title={title}
              description={description}
              sections={sections}
            />
          )}
        </main>

        {/* Right Sidebar */}
        <BuilderSidebar className="hidden lg:flex w-[350px] border-l bg-slate-50/50">
          <div className="p-4 space-y-6">
            {/* Module Settings */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className={cn("text-sm font-medium uppercase tracking-wider text-slate-500", isRTL ? 'text-right' : 'text-left')}>{t('builder.moduleSettings')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block w-full" : "")}>{t('title')}</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('title')}
                    className={cn("bg-white border-slate-200 focus:ring-hotel-gold focus:border-hotel-gold", isRTL ? "text-right" : "")}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block w-full" : "")}>{t('description')}</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('description')}
                    rows={2}
                    className={cn("bg-white border-slate-200 focus:ring-hotel-gold focus:border-hotel-gold resize-none", isRTL ? "text-right" : "")}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block w-full" : "")}>{t('category')}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "flex-row-reverse" : "")}>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block w-full" : "")}>{t('duration')} (min)</Label>
                    <Input
                      type="number"
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(e.target.value)}
                      placeholder="30"
                      className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block w-full" : "")}>{t('builder.validity')} (days)</Label>
                    <Input
                      type="number"
                      value={validityPeriod}
                      onChange={(e) => setValidityPeriod(e.target.value)}
                      placeholder="365"
                      className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                    />
                  </div>
                </div>

                <div className={`flex items-center justify-between pt-2 border-t border-slate-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-slate-700">{t('certificateEnabled')}</Label>
                    <p className="text-[10px] text-muted-foreground">{t('builder.issueCertDesc')}</p>
                  </div>
                  <Button
                    variant={certificateEnabled ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 px-3 text-[10px] uppercase tracking-wider font-bold",
                      certificateEnabled ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "text-slate-500"
                    )}
                    onClick={() => setCertificateEnabled(!certificateEnabled)}
                  >
                    {certificateEnabled ? t('common:status.enabled') : t('common:status.disabled')}
                  </Button>
                </div>

                {/* Passing Score - shown when certificate is enabled */}
                {certificateEnabled && (
                  <div className={`flex items-center justify-between pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold text-slate-700">{t('builder.passingScore')}</Label>
                      <p className="text-[10px] text-muted-foreground">{t('builder.passingScoreDesc')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={passingScore}
                        onChange={(e) => setPassingScore(e.target.value)}
                        className="w-16 h-8 text-center text-sm font-medium"
                      />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Tools */}
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
                  onClick={() => setShowAIDialog(true)}
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

            {/* Module Skills */}
            <ModuleSkillsEditor moduleId={moduleId || ''} />
          </div>
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
          <div className="space-y-5 py-4">
            <div className={isRTL ? 'text-right' : ''}>
              <Label>{t('title')}</Label>
              <Input
                value={currentBlock.title}
                onChange={(e) => setCurrentBlock({ ...currentBlock, title: e.target.value })}
                placeholder={t('title')}
                className={isRTL ? 'text-right' : ''}
              />
            </div>

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
                      {availableQuizzes?.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500 text-center">{t('builder.noQuizzesFound')}</div>
                      ) : (
                        availableQuizzes?.map(q => (
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
                      {availableSOPs?.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500 text-center">{t('builder.noSopsFound')}</div>
                      ) : (
                        availableSOPs?.map(s => (
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

            {currentBlock.type === 'video' && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('builder.embedUrl')}</Label>
                <Input
                  value={currentBlock.content_url}
                  onChange={(e) => setCurrentBlock({ ...currentBlock, content_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className={isRTL ? 'text-right' : ''}
                />
              </div>
            )}

            {/* Image Support */}
            {currentBlock.type === 'image' && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('builder.imageUrl')}</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={currentBlock.content_url}
                      onChange={(e) => setCurrentBlock({ ...currentBlock, content_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className={isRTL ? 'text-right' : ''}
                    />
                  </div>
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
                </div>
              </div>
            )}

            {currentBlock.type === 'document_link' && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('builder.documentUrl')}</Label>
                <div className="space-y-3">
                  <Input
                    value={currentBlock.content_url}
                    onChange={(e) => setCurrentBlock({ ...currentBlock, content_url: e.target.value })}
                    placeholder="https://example.com/document.pdf"
                    className={isRTL ? 'text-right' : ''}
                  />
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
                </div>
              </div>
            )}

            <div className={`grid grid-cols-2 gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
            </div>

            <label className={`flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
              <input
                type="checkbox"
                checked={currentBlock.is_mandatory}
                onChange={(e) => setCurrentBlock({ ...currentBlock, is_mandatory: e.target.checked })}
                className="rounded border-gray-300 text-hotel-gold focus:ring-hotel-gold h-4 w-4"
              />
              <span className="font-medium text-gray-700">{t('builder.mandatory')}</span>
            </label>

            <div className={`flex justify-end gap-3 pt-4 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button variant="outline" onClick={() => setShowContentDialog(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={saveContent} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                {selectedContent ? t('save') : t('builder.addContent')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog >

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
              sopTitle={title || t('builder.untitledModule')}
              sopContent=""
              onQuestionsCreated={async (count, ids) => {
                setShowAIDialog(false)

                // Add quiz block to the active section (or first section) with the generated question IDs
                if (ids && ids.length > 0) {
                  // Check if module is saved (has ID)
                  if (!moduleId) {
                    toast({
                      title: t('common:error'),
                      description: 'Please save the module first before generating a quiz.',
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
                      console.error('Error creating quiz:', quizError)
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
                    const targetSectionId = activeSection || sections[0]?.id

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
                    console.error('Error creating quiz block:', error)
                    toast({
                      title: t('common:error'),
                      description: 'Failed to create quiz block',
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
          setModuleId(newId)
        }}
      />

      {/* Knowledge Base Floating Sidebar */}
      {
        showKBSidebar && (
          <div className="fixed right-0 top-16 bottom-0 w-80 z-40 shadow-xl border-l bg-white">
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
                // Link document
                console.log('Link document:', docId)
              }}
              onLinkQuiz={(quizId) => {
                // Link quiz
                console.log('Link quiz:', quizId)
              }}
              onAddQuestions={(questionIds) => {
                console.log('Add questions:', questionIds)
              }}
              className="h-full"
            />
          </div>
        )
      }
    </div >
  )
}
