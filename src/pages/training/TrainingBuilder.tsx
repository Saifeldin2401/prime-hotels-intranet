import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Plus,
  Save,
  Eye,
  Trash2,
  GripVertical,
  FileText,
  Video,
  Image,
  Link,
  Clock,
  Award,
  Upload,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  BookOpen,
  Sparkles
} from 'lucide-react'
import type { TrainingModule } from '@/lib/types'
import type { LearningQuiz } from '@/types/learning'
import { useTranslation } from 'react-i18next'
import { AIQuestionGenerator } from '@/components/questions/AIQuestionGenerator'

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
  const { profile } = useAuth()
  const { t, i18n } = useTranslation('training')
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
        .from('sop_documents')
        .select('id, title, category, department_id')
        .eq('status', 'published')
        .order('title')

      if (error) throw error
      return data as { id: string; title: string; category?: string; department_id?: string }[]
    }
  })

  // Module state
  const [moduleId, setModuleId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedDuration] = useState('')
  const [passingScore, setPassingScore] = useState('80')
  const [maxAttempts, setMaxAttempts] = useState('3')
  const [allowRetake, setAllowRetake] = useState(true)
  const [isPublished] = useState(false)

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
      title: `${t('sections')} ${sections.length + 1}`,
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
        estimated_duration_minutes: totalDuration || null,
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
            throw blocksError
          }
        }
      }

      alert(t('moduleSaved'))
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
      if (!title.trim()) throw new Error('Title is required')

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        estimated_duration_minutes: estimatedDuration ? Number(estimatedDuration) : null,
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
    mutationFn: async () => {
      if (!moduleId) return

      // Delete existing blocks
      await supabase
        .from('training_content_blocks')
        .delete()
        .eq('training_module_id', moduleId)

      // Insert new blocks
      if (contentBlocks.length > 0) {
        const blocksToInsert = contentBlocks.map((block, index) => ({
          training_module_id: moduleId,
          type: block.type,
          content: block.content,
          content_url: block.content_url || null,
          content_data: block.content_data,
          order: index,
          is_mandatory: block.is_mandatory
        }))

        const { error } = await supabase
          .from('training_content_blocks')
          .insert(blocksToInsert)
        if (error) throw error
      }
    }
  })

  // Save quiz questions mutation
  const saveQuestionsMutation = useMutation({
    mutationFn: async () => {
      if (!moduleId) return

      // Delete existing questions
      await supabase
        .from('training_quizzes')
        .delete()
        .eq('training_module_id', moduleId)

      // Insert new questions
      if (questions.length > 0) {
        const questionsToInsert = questions.map((question, index) => ({
          training_module_id: moduleId,
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
      await saveModuleMutation.mutateAsync()

      // Then save content blocks
      // NOTE: saveQuestionsMutation is deprecated. Questions should now be added via Quiz blocks referencing the Knowledge Bank.
      await saveContentBlocksMutation.mutateAsync()

      alert(t('moduleSaved'))
    } catch (error: any) {
      console.error('Save failed:', error)
      alert(t('error'))
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

  const getContentIcon = (type: ContentType) => {
    switch (type) {
      case 'text': return <FileText className="w-4 h-4" />
      case 'image': return <Image className="w-4 h-4" />
      case 'video': return <Video className="w-4 h-4" />
      case 'document_link': return <Link className="w-4 h-4" />
      case 'quiz': return <FileQuestion className="w-4 h-4" />
      case 'sop_reference': return <BookOpen className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en'
    i18n.changeLanguage(newLang)
  }

  return (
    <div className={`space-y-6 animate-fade-in ${isRTL ? 'text-right' : 'text-left'}`}>
      <PageHeader
        title={t('trainingBuilder')}
        description={isRTL ? 'إنشاء محتوى تدريب تفاعلي' : 'Create interactive training content'} // fallback logic, technically description can be key too
        actions={
          <div className="flex items-center gap-2">
            <Button
              className="bg-hotel-navy text-white hover:bg-hotel-navy-light border border-hotel-navy rounded-md transition-colors hover-lift"
              size="sm"
              onClick={toggleLanguage}
            >
              {i18n.language === 'en' ? 'العربية' : 'English'}
            </Button>
            <Button
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors hover-lift"
              size="sm"
              onClick={() => setViewMode(viewMode === 'builder' ? 'preview' : 'builder')}
            >
              {viewMode === 'builder' ? <Eye className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              {viewMode === 'builder' ? t('preview') : t('builderMode')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIDialog(true)}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              {t('aiSuggest', 'AI Suggest')}
            </Button>
            <Button onClick={saveTraining} className="bg-primary hover:bg-hotel-navy shadow-sm transition-all duration-200">
              <Save className="w-4 h-4 mr-1" />
              {t('save')}
            </Button>
            <Button onClick={publishTraining} variant="default" className="bg-primary hover:bg-hotel-navy shadow-sm transition-all duration-200">
              <Upload className="w-4 h-4 mr-1" />
              {t('publish')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Module Info */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>{t('title')} & {t('description')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('title')}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('title')}
                  className={isRTL ? 'text-right' : ''}
                />
              </div>
              <div>
                <Label>{t('description')}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('description')}
                  rows={3}
                  className={isRTL ? 'text-right' : ''}
                />
              </div>
            </CardContent>
          </Card>

          {/* Knowledge Integration Callout */}
          <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900 mb-1">{t('knowledgeBankIntegration')}</h3>
                  <p className="text-sm text-purple-700 mb-3">
                    {t('knowledgeBankDescription')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                      onClick={() => {
                        addSection()
                        setTimeout(() => addContent('quiz'), 100)
                      }}
                    >
                      <FileQuestion className="w-4 h-4 mr-1" />
                      {t('addQuizBlock')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      onClick={() => {
                        addSection()
                        setTimeout(() => addContent('sop_reference'), 100)
                      }}
                    >
                      <BookOpen className="w-4 h-4 mr-1" />
                      {t('addSopReference')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                      onClick={() => setShowAIDialog(true)}
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      {t('aiGenerateQuestions')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          {viewMode === 'builder' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">{t('sections')}</h3>
                <Button onClick={addSection} size="sm" className="bg-hotel-gold text-white hover:bg-hotel-gold-dark transition-colors">
                  <Plus className="w-4 h-4 mr-1" />
                  {t('addSection')}
                </Button>
              </div>

              {sections.length === 0 ? (
                <Card className="border-dashed border-2 bg-gray-50">
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500 mb-4">{t('noContent')}</p>
                    <Button onClick={addSection} variant="outline" className="border-dashed">
                      <Plus className="w-4 h-4 mr-1" />
                      {t('addSection')}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                sections.map((section) => (
                  <Card key={section.id} className="overflow-hidden card-hover border-l-4 border-l-hotel-navy">
                    <CardHeader
                      className="cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors py-3"
                      onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-5 h-5 text-gray-400" />
                          <h4 className="font-semibold text-gray-800">{section.title}</h4>
                          <Badge variant="secondary" className="bg-white">{section.items.length} items</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => {
                            e.stopPropagation()
                            deleteSection(section.id)
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          {activeSection === section.id ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {activeSection === section.id && (
                      <CardContent className="pt-4 bg-white">
                        {/* Content Items */}
                        <div className="space-y-3 mb-4">
                          {section.items.length === 0 ? (
                            <div className="text-center py-8 border border-dashed rounded-lg bg-gray-50">
                              <p className="text-sm text-gray-500 mb-4">{t('noContent')}</p>
                              <div className="flex flex-wrap gap-2 justify-center">
                                {/* Basic content types */}
                                {(['text', 'video', 'image', 'document_link'] as ContentType[]).map((type) => (
                                  <Button
                                    key={type}
                                    size="sm"
                                    variant="outline"
                                    className="bg-white hover:bg-gray-50"
                                    onClick={() => addContent(type)}
                                  >
                                    {getContentIcon(type)}
                                    <span className="ml-2">
                                      {type === 'text' ? t('textContent') :
                                        type === 'video' ? t('videoContent') :
                                          type === 'image' ? t('imageContent') :
                                            t('documentContent')}
                                    </span>
                                  </Button>
                                ))}
                                {/* Knowledge Bank Integration - Highlighted */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                  onClick={() => addContent('quiz')}
                                >
                                  <FileQuestion className="w-4 h-4" />
                                  <span className="ml-2">Quiz from Bank</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                  onClick={() => addContent('sop_reference')}
                                >
                                  <BookOpen className="w-4 h-4" />
                                  <span className="ml-2">SOP Reference</span>
                                </Button>
                              </div>
                            </div>
                          ) : (
                            section.items.map((item, itemIndex) => (
                              <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, section, itemIndex)}
                                className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-sm hover:border-hotel-gold/30 transition-all cursor-move bg-white group"
                              >
                                <GripVertical className="w-5 h-5 text-gray-300 group-hover:text-gray-500" />
                                <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                                  {getContentIcon(item.type)}
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900">{item.title}</h5>
                                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                    {item.duration && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {item.duration}m
                                      </span>
                                    )}
                                    {item.points && (
                                      <span className="flex items-center gap-1">
                                        <Award className="w-3 h-3" />
                                        {item.points} pts
                                      </span>
                                    )}
                                    <Badge variant={item.is_mandatory ? 'default' : 'secondary'} className="text-[10px] h-5">
                                      {item.is_mandatory ? t('mandatory') : t('optional')}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button size="sm" variant="ghost" className="hover:bg-gray-100" onClick={() => {
                                    setSelectedContent(item)
                                    setContentType(item.type)
                                    setCurrentBlock({
                                      ...item,
                                      title: item.title,
                                      content: item.content,
                                      content_url: item.content_url,
                                      content_data: item.content_data,
                                      is_mandatory: item.is_mandatory,
                                      order: item.order
                                    })
                                    setShowContentDialog(true)
                                  }}>
                                    <Plus className="w-4 h-4 text-gray-600" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="hover:bg-red-50" onClick={() => deleteContent(section.id, item.id)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add Content Button */}
                        {section.items.length > 0 && (
                          <div className="flex justify-center">
                            <Select value="" onValueChange={(value: ContentType) => addContent(value)}>
                              <SelectTrigger className="w-[200px] border-dashed hover:border-solid hover:border-hotel-gold transition-colors">
                                <SelectValue placeholder={t('addContent')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    {t('textContent')}
                                  </div>
                                </SelectItem>
                                <SelectItem value="video">
                                  <div className="flex items-center gap-2">
                                    <Video className="w-4 h-4" />
                                    {t('videoContent')}
                                  </div>
                                </SelectItem>
                                <SelectItem value="image">
                                  <div className="flex items-center gap-2">
                                    <Image className="w-4 h-4" />
                                    {t('imageContent')}
                                  </div>
                                </SelectItem>
                                <SelectItem value="document_link">
                                  <div className="flex items-center gap-2">
                                    <Link className="w-4 h-4" />
                                    {t('documentContent')}
                                  </div>
                                </SelectItem>
                                <SelectItem value="quiz">
                                  <div className="flex items-center gap-2">
                                    <FileQuestion className="w-4 h-4" />
                                    {t('quizContent', 'Quiz')}
                                  </div>
                                </SelectItem>
                                <SelectItem value="sop_reference">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" />
                                    {t('sopReferenceContent', 'SOP Reference')}
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          ) : (
            /* Preview Mode */
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>{t('preview')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none dark:prose-invert">
                  <h1>{title}</h1>
                  <p>{description}</p>

                  {sections.map((section) => (
                    <div key={section.id} className="mb-8 p-6 bg-gray-50 rounded-lg">
                      <h2 className="text-xl font-bold mb-4 text-hotel-navy">{section.title}</h2>
                      {section.description && <p className="text-gray-600 mb-4">{section.description}</p>}

                      <div className="space-y-6">
                        {section.items.map((item) => (
                          <div key={item.id} className="bg-white p-6 rounded-lg shadow-sm border">
                            <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                            {item.content && <div dangerouslySetInnerHTML={{ __html: item.content }} className="mb-4" />}

                            {item.type === 'video' && item.content_url && (
                              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                                <iframe
                                  src={item.content_url}
                                  className="w-full h-full"
                                  allowFullScreen
                                />
                              </div>
                            )}

                            {item.type === 'image' && item.content_url && (
                              <img src={item.content_url} alt={item.title} className="max-w-full rounded-lg shadow-md" />
                            )}

                            {item.type === 'document_link' && item.content_url && (
                              <a href={item.content_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                                <Link className="w-4 h-4" />
                                {t('documentContent')}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          {/* Stats */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500">{t('statistics')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('sections')}</span>
                <Badge variant="outline">{sections.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('totalPoints')}</span>
                <Badge variant="outline">{totalItems}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('estimatedTime')}</span>
                <Badge variant="outline">{totalDuration}m</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('totalPoints')}</span>
                <Badge variant="outline">{totalPoints}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500">{t('settings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">{t('passScore')}</Label>
                <Input
                  type="number"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  min="0"
                  max="100"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">{t('maxAttempts')}</Label>
                <Input
                  type="number"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                  min="1"
                  className="mt-1"
                />
              </div>
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowRetake}
                    onChange={(e) => setAllowRetake(e.target.checked)}
                    className="rounded border-gray-300 text-hotel-gold focus:ring-hotel-gold"
                  />
                  <span className="text-sm text-gray-700">{t('allowRetake')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={certificateOnCompletion}
                    onChange={(e) => setCertificateOnCompletion(e.target.checked)}
                    className="rounded border-gray-300 text-hotel-gold focus:ring-hotel-gold"
                  />
                  <span className="text-sm text-gray-700">{t('certificateOnCompletion')}</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content Dialog */}
      <Dialog open={showContentDialog} onOpenChange={setShowContentDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedContent ? t('editContent') : t('addContent')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div>
              <Label>{t('title')}</Label>
              <Input
                value={currentBlock.title}
                onChange={(e) => setCurrentBlock({ ...currentBlock, title: e.target.value })}
                placeholder={t('title')}
                className={isRTL ? 'text-right' : ''}
              />
            </div>

            {currentBlock.type === 'quiz' && (
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <Label className="text-blue-900">{t('selectQuiz', 'Link Knowledge Quiz')}</Label>
                <div className="mt-1.5">
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
                    <SelectTrigger className="bg-white border-blue-200">
                      <SelectValue placeholder={t('selectQuizPlaceholder', 'Choose a published quiz...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableQuizzes?.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500 text-center">No published quizzes found</div>
                      ) : (
                        availableQuizzes?.map(q => (
                          <SelectItem key={q.id} value={q.id}>
                            <span className="font-medium">{q.title}</span>
                            <span className="ml-2 text-xs text-gray-400">({q.question_count || 0} qs)</span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Select a quiz from the Knowledge Bank to embed in this training module.
                </p>
              </div>
            )}

            {currentBlock.type === 'sop_reference' && (
              <div className="bg-emerald-50 p-4 rounded-md border border-emerald-100">
                <Label className="text-emerald-900">{t('selectSop', 'Link SOP Document')}</Label>
                <div className="mt-1.5">
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
                    <SelectTrigger className="bg-white border-emerald-200">
                      <SelectValue placeholder={t('selectSopPlaceholder', 'Choose a published SOP...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSOPs?.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500 text-center">No published SOPs found</div>
                      ) : (
                        availableSOPs?.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            <span className="font-medium">{s.title}</span>
                            {s.category && <span className="ml-2 text-xs text-gray-400">({s.category})</span>}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-emerald-600 mt-2">
                  Select a published SOP to reference. Trainees will see the live content from the SOP.
                </p>
              </div>
            )}

            <div>
              <Label>{t('content')}</Label>
              <Textarea
                value={currentBlock.content}
                onChange={(e) => setCurrentBlock({ ...currentBlock, content: e.target.value })}
                placeholder={t('content')}
                rows={8}
                className={`font-mono text-sm ${isRTL ? 'text-right' : ''}`}
              />
              <p className="text-xs text-gray-500 mt-1">Supports HTML and basic formatting.</p>
            </div>

            {currentBlock.type === 'video' && (
              <div>
                <Label>{t('embedUrl')}</Label>
                <Input
                  value={currentBlock.content_url}
                  onChange={(e) => setCurrentBlock({ ...currentBlock, content_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            )}

            {currentBlock.type === 'document_link' && (
              <div>
                <Label>{t('enterUrl')}</Label>
                <Input
                  value={currentBlock.content_url}
                  onChange={(e) => setCurrentBlock({ ...currentBlock, content_url: e.target.value })}
                  placeholder="https://example.com/document.pdf"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label>{t('duration')}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={currentBlock.duration || ''}
                    onChange={(e) => setCurrentBlock({ ...currentBlock, duration: parseInt(e.target.value) })}
                    placeholder="10"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-gray-400 text-sm">min</span>
                </div>
              </div>
              <div>
                <Label>{t('points')}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={currentBlock.points || ''}
                    onChange={(e) => setCurrentBlock({ ...currentBlock, points: parseInt(e.target.value) })}
                    placeholder="1"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-gray-400 text-sm">pts</span>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={currentBlock.is_mandatory}
                onChange={(e) => setCurrentBlock({ ...currentBlock, is_mandatory: e.target.checked })}
                className="rounded border-gray-300 text-hotel-gold focus:ring-hotel-gold h-4 w-4"
              />
              <span className="font-medium text-gray-700">{t('mandatory')}</span>
            </label>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowContentDialog(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={saveContent} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                {selectedContent ? t('save') : t('addContent')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Question Generator Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              {t('aiQuestionGenerator', 'AI Question Generator')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {/* 
              The AIQuestionGenerator uses sopContent. 
              For Training Builder, we allow "general" mode where user pastes content.
              In Phase 2.5, we could auto-extract from linked SOPs.
            */}
            <AIQuestionGenerator
              sopId="general"
              sopTitle={title || 'Training Module'}
              sopContent=""
              onQuestionsCreated={(count) => {
                setShowAIDialog(false)
                // Show toast or feedback
                alert(`${count} questions saved to Knowledge Bank!`)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
