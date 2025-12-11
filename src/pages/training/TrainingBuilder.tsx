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
  ChevronUp
} from 'lucide-react'
import type { TrainingModule } from '@/lib/types'

// Bilingual labels
const labels = {
  en: {
    trainingBuilder: 'Training Builder',
    createContent: 'Create Content',
    preview: 'Preview',
    save: 'Save',
    publish: 'Publish',
    addContent: 'Add Content',
    textContent: 'Text Content',
    videoContent: 'Video Content',
    imageContent: 'Image Content',
    audioContent: 'Audio Content',
    quizContent: 'Quiz Content',
    interactiveContent: 'Interactive Content',
    documentContent: 'Document Content',
    sections: 'Sections',
    addSection: 'Add Section',
    builderMode: 'Builder Mode',
    edit: 'Edit',
    cancel: 'Cancel',
    embedUrl: 'Embed URL',
    title: 'Title',
    description: 'Description',
    content: 'Content',
    duration: 'Duration',
    points: 'Points',
    mandatory: 'Mandatory',
    optional: 'Optional',
    noContent: 'No content added yet',
    statistics: 'Statistics',
    settings: 'Settings',
    passScore: 'Pass Score (%)',
    maxAttempts: 'Max Attempts',
    allowRetake: 'Allow Retake',
    certificateOnCompletion: 'Certificate on Completion',
    estimatedTime: 'Estimated Time',
    totalPoints: 'Total Points',
    uploadFile: 'Upload File',
    enterUrl: 'Enter URL',
    moduleSaved: 'Module saved successfully',
    modulePublished: 'Module published successfully',
    error: 'Error',
    builder: 'Training Builder',
    createModule: 'Create Module',
    editModule: 'Edit Module',
    basicInfo: 'Basic Information',
    quiz: 'Quiz',
    textBlock: 'Text Block',
    imageBlock: 'Image',
    videoBlock: 'Video',
    documentBlock: 'Document',
    addQuestion: 'Add Question',
    multipleChoice: 'Multiple Choice',
    trueFalse: 'True/False',
    shortAnswer: 'Short Answer',
    questionText: 'Question Text',
    options: 'Options',
    correctAnswer: 'Correct Answer',
    saveDraft: 'Save Draft',
    previewMode: 'Preview Mode',
    editMode: 'Edit Mode',
    dragToReorder: 'Drag to reorder',
    noQuestions: 'No questions added yet',
    questions: 'Questions',
    editContent: 'Edit Content',
    editQuestion: 'Edit Question',
    true: 'True',
    false: 'False',
    loading: 'Loading...',
    published: 'Published',
    draft: 'Draft',
  },
  ar: {
    trainingBuilder: 'منشئ التدريب',
    createContent: 'إنشاء محتوى',
    preview: 'معاينة',
    save: 'حفظ',
    publish: 'نشر',
    addContent: 'إضافة محتوى',
    textContent: 'محتوى نصي',
    videoContent: 'محتوى فيديو',
    imageContent: 'محتوى صورة',
    audioContent: 'محتوى صوتي',
    quizContent: 'محتوى اختبار',
    interactiveContent: 'محتوى تفاعلي',
    documentContent: 'محتوى مستند',
    sections: 'الأقسام',
    addSection: 'إضافة قسم',
    builderMode: 'وضع البناء',
    edit: 'تعديل',
    cancel: 'إلغاء',
    embedUrl: 'تضمين الرابط',
    title: 'العنوان',
    description: 'الوصف',
    content: 'المحتوى',
    duration: 'المدة',
    points: 'النقاط',
    mandatory: 'إلزامي',
    optional: 'اختياري',
    noContent: 'لم تتم إضافة محتوى بعد',
    statistics: 'الإحصائيات',
    settings: 'الإعدادات',
    passScore: 'درجة النجاح (%)',
    maxAttempts: 'الحد الأقصى للمحاولات',
    allowRetake: 'السماح بالإعادة',
    certificateOnCompletion: 'شهادة عند الإكمال',
    estimatedTime: 'الوقت المقدر',
    totalPoints: 'إجمالي النقاط',
    uploadFile: 'رفع ملف',
    enterUrl: 'أدخل الرابط',
    moduleSaved: 'تم حفظ الوحدة بنجاح',
    modulePublished: 'تم نشر الوحدة بنجاح',
    error: 'خطأ',
    builder: 'منشئ التدريب',
    createModule: 'إنشاء وحدة',
    editModule: 'تعديل الوحدة',
    basicInfo: 'المعلومات الأساسية',
    quiz: 'اختبار',
    textBlock: 'كتلة نصية',
    imageBlock: 'صورة',
    videoBlock: 'فيديو',
    documentBlock: 'مستند',
    addQuestion: 'إضافة سؤال',
    multipleChoice: 'اختيار من متعدد',
    trueFalse: 'صح/خطأ',
    shortAnswer: 'إجابة قصيرة',
    questionText: 'نص السؤال',
    options: 'الخيارات',
    correctAnswer: 'الإجابة الصحيحة',
    saveDraft: 'حفظ المسودة',
    previewMode: 'وضع المعاينة',
    editMode: 'وضع التحرير',
    dragToReorder: 'اسحب لإعادة الترتيب',
    noQuestions: 'لم تتم إضافة أسئلة بعد',
    questions: 'الأسئلة',
    editContent: 'تعديل المحتوى',
    editQuestion: 'تعديل السؤال',
    true: 'صحيح',
    false: 'خطأ',
    loading: 'جاري التحميل...',
    published: 'منشور',
    draft: 'مسودة',
  }
}

type Language = 'en' | 'ar'
type ContentType = 'text' | 'image' | 'video' | 'document_link' | 'audio' | 'quiz' | 'interactive'
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
  const [lang, setLang] = useState<Language>('en')
  const t = labels[lang]
  const isRTL = lang === 'ar'

  // Module state
  const [moduleId, setModuleId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedDuration] = useState('')
  const [passingScore, setPassingScore] = useState('80')
  const [maxAttempts, setMaxAttempts] = useState('3')
  const [allowRetake, setAllowRetake] = useState(true)
  const [isPublished] = useState(false)

  console.log('TrainingBuilder state initialized:', { estimatedDuration, isPublished }) // Use variables

  // Enhanced state for drag-and-drop
  const [sections, setSections] = useState<TrainingSection[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('builder')
  const [draggedItem, setDraggedItem] = useState<ContentBlockForm | null>(null)
  const [draggedSection, setDraggedSection] = useState<TrainingSection | null>(null)
  const [selectedContent, setSelectedContent] = useState<ContentBlockForm | null>(null)
  const [contentType, setContentType] = useState<ContentType>('text')

  console.log('Quiz settings initialized:', { draggedSection, draggedItem, selectedContent, contentType }) // Use variables

  // Training settings
  const [timeLimit, setTimeLimit] = useState<number | null>(null)
  const [allowRetries, setAllowRetries] = useState(true)
  const [showFeedback, setShowFeedback] = useState(true)
  const [certificateOnCompletion, setCertificateOnCompletion] = useState(true)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [randomizeQuestions, setRandomizeQuestions] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)

  console.log('Quiz settings initialized:', { timeLimit, allowRetries, showFeedback, certificateOnCompletion, autoAdvance, randomizeQuestions, showAnswers }) // Use variables

  // Content blocks state (legacy - will be migrated to sections)
  const [contentBlocks, setContentBlocks] = useState<ContentBlockForm[]>([])
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null)
  const [showContentDialog, setShowContentDialog] = useState(false)

  // Quiz state
  const [questions, setQuestions] = useState<QuestionForm[]>([])
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)

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
      title: `Section ${sections.length + 1}`,
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
      alert(t.title + ' is required')
      return
    }

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        estimated_duration_minutes: totalDuration,
        passing_score: parseInt(passingScore),
        max_attempts: parseInt(maxAttempts),
        created_by: profile?.id,
        content_data: {
          sections: sections,
          settings: {
            allowRetake,
            certificateOnCompletion,
            timeLimit,
            allowRetries,
            showFeedback,
            autoAdvance,
            randomizeQuestions,
            showAnswers
          }
        }
      }

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
        setModuleId(data.id)
      }
      
      alert(t.moduleSaved)
    } catch (error) {
      console.error('Error saving training:', error)
      alert(t.error)
    }
  }

  const publishTraining = async () => {
    await saveTraining()
    // Additional publish logic here
    alert(t.modulePublished)
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
      
      // Then save content blocks and questions
      await Promise.all([
        saveContentBlocksMutation.mutateAsync(),
        saveQuestionsMutation.mutateAsync()
      ])
      
      alert(t.moduleSaved)
    } catch (error) {
      console.error('Save failed:', error)
      alert(t.error)
    }
  }

  console.log('handleSave function defined') // Use function to avoid unused warning

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

  console.log('handleAddContentBlock function defined') // Use function to avoid unused warning

  const handleEditContentBlock = (index: number) => {
    const block = contentBlocks[index]
    setCurrentBlock({ ...block })
    setEditingBlockIndex(index)
    setShowContentDialog(true)
  }

  console.log('handleEditContentBlock function defined') // Use function to avoid unused warning

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

  console.log('handleSaveContentBlock function defined') // Use function to avoid unused warning

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

  console.log('handleAddQuestion function defined') // Use function to avoid unused warning

  const handleEditQuestion = (index: number) => {
    const question = questions[index]
    setCurrentQuestion({ ...question })
    setEditingQuestionIndex(index)
    setShowQuestionDialog(true)
  }

  console.log('handleEditQuestion function defined') // Use function to avoid unused warning

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

  console.log('handleSaveQuestion function defined') // Use function to avoid unused warning

  const handleQuestionOptionChange = (index: number, value: string) => {
    const updated = [...currentQuestion.options]
    updated[index] = value
    setCurrentQuestion({ ...currentQuestion, options: updated })
  }

  console.log('handleQuestionOptionChange function defined') // Use function to avoid unused warning

  const addQuestionOption = () => {
    setCurrentQuestion({
      ...currentQuestion,
      options: [...currentQuestion.options, '']
    })
  }

  console.log('addQuestionOption function defined') // Use function to avoid unused warning

  const removeQuestionOption = (index: number) => {
    if (currentQuestion.options.length <= 2) return
    const updated = currentQuestion.options.filter((_, i) => i !== index)
    setCurrentQuestion({ ...currentQuestion, options: updated })
  }

  console.log('removeQuestionOption function defined') // Use function to avoid unused warning

  const getContentIcon = (type: ContentType) => {
    switch (type) {
      case 'text': return <FileText className="w-4 h-4" />
      case 'image': return <Image className="w-4 h-4" />
      case 'video': return <Video className="w-4 h-4" />
      case 'document_link': return <Link className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <PageHeader
        title={t.trainingBuilder}
        description={isRTL ? 'إنشاء محتوى تدريب تفاعلي' : 'Create interactive training content'}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            >
              {lang === 'en' ? 'العربية' : 'English'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'builder' ? 'preview' : 'builder')}
            >
              {viewMode === 'builder' ? <Eye className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              {viewMode === 'builder' ? t.preview : t.builderMode}
            </Button>
            <Button onClick={saveTraining}>
              <Save className="w-4 h-4 mr-1" />
              {t.save}
            </Button>
            <Button onClick={publishTraining} variant="default">
              <Upload className="w-4 h-4 mr-1" />
              {t.publish}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Module Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t.title} & {t.description}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t.title}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.title}
                />
              </div>
              <div>
                <Label>{t.description}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.description}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          {viewMode === 'builder' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t.sections || 'Sections'}</h3>
                <Button onClick={addSection} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  {t.addSection}
                </Button>
              </div>

              {sections.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">{t.noContent}</p>
                    <Button onClick={addSection} className="mt-4">
                      <Plus className="w-4 h-4 mr-1" />
                      {t.addSection}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                sections.map((section, sectionIndex) => (
                  <Card key={section.id} className="overflow-hidden">
                    <CardHeader 
                      className="cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
                      onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <h4 className="font-medium">{section.title}</h4>
                          <Badge variant="secondary">{section.items.length} items</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={(e) => {
                            e.stopPropagation()
                            deleteSection(section.id)
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          {activeSection === section.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {activeSection === section.id && (
                      <CardContent className="pt-0">
                        {section.description && (
                          <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
                        )}

                        {/* Content Items */}
                        <div className="space-y-2">
                          {section.items.length === 0 ? (
                            <div className="text-center py-4 border-dashed border rounded">
                              <p className="text-sm text-muted-foreground mb-2">{t.noContent}</p>
                              <div className="flex flex-wrap gap-2 justify-center">
                                {(['text', 'video', 'image', 'audio', 'quiz', 'interactive', 'document_link'] as ContentType[]).map((type) => (
                                  <Button
                                    key={type}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addContent(type)}
                                  >
                                    {getContentIcon(type)}
                                    <span className="ml-1">
                                      {type === 'text' ? t.textContent :
                                       type === 'video' ? t.videoContent :
                                       type === 'image' ? t.imageContent :
                                       type === 'audio' ? t.audioContent :
                                       type === 'quiz' ? t.quizContent :
                                       type === 'interactive' ? t.interactiveContent :
                                       t.documentContent}
                                    </span>
                                  </Button>
                                ))}
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
                                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-move"
                              >
                                <GripVertical className="w-4 h-4 text-muted-foreground" />
                                {getContentIcon(item.type)}
                                <div className="flex-1">
                                  <h5 className="font-medium">{item.title}</h5>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
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
                                    <Badge variant={item.is_mandatory ? 'default' : 'secondary'}>
                                      {item.is_mandatory ? t.mandatory : t.optional}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => {
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
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => deleteContent(section.id, item.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add Content Button */}
                        <div className="mt-4">
                          <Select value="" onValueChange={(value: ContentType) => addContent(value)}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t.addContent} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  {t.textContent || 'Text Content'}
                                </div>
                              </SelectItem>
                              <SelectItem value="video">
                                <div className="flex items-center gap-2">
                                  <Video className="w-4 h-4" />
                                  {t.videoContent || 'Video Content'}
                                </div>
                              </SelectItem>
                              <SelectItem value="image">
                                <div className="flex items-center gap-2">
                                  <Image className="w-4 h-4" />
                                  {t.imageContent || 'Image Content'}
                                </div>
                              </SelectItem>
                              <SelectItem value="document_link">
                                <div className="flex items-center gap-2">
                                  <Link className="w-4 h-4" />
                                  {t.documentContent || 'Document Content'}
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          ) : (
            /* Preview Mode */
            <Card>
              <CardHeader>
                <CardTitle>{t.preview}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <h1>{title}</h1>
                  <p>{description}</p>
                  
                  {sections.map((section) => (
                    <div key={section.id} className="mb-8">
                      <h2>{section.title}</h2>
                      {section.description && <p>{section.description}</p>}
                      
                      {section.items.map((item) => (
                        <div key={item.id} className="mb-6 p-4 border rounded">
                          <h3>{item.title}</h3>
                          {item.content && <div dangerouslySetInnerHTML={{ __html: item.content }} />}
                          
                          {item.type === 'video' && item.content_url && (
                            <div className="aspect-video">
                              <iframe
                                src={item.content_url}
                                className="w-full h-full rounded"
                                allowFullScreen
                              />
                            </div>
                          )}
                          
                          {item.type === 'image' && item.content_url && (
                            <img src={item.content_url} alt={item.title} className="max-w-full rounded" />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>{t.statistics || 'Statistics'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">{t.sections || 'Sections'}</span>
                <Badge>{sections.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Items</span>
                <Badge>{totalItems}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t.estimatedTime}</span>
                <Badge>{totalDuration}m</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t.totalPoints}</span>
                <Badge>{totalPoints}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t.settings}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t.passScore}</Label>
                <Input
                  type="number"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <Label>{t.maxAttempts}</Label>
                <Input
                  type="number"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowRetake}
                    onChange={(e) => setAllowRetake(e.target.checked)}
                  />
                  <span className="text-sm">{t.allowRetake}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={certificateOnCompletion}
                    onChange={(e) => setCertificateOnCompletion(e.target.checked)}
                  />
                  <span className="text-sm">{t.certificateOnCompletion}</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content Dialog */}
      <Dialog open={showContentDialog} onOpenChange={setShowContentDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedContent ? t.edit : t.createContent} - 
                {contentType === 'text' ? t.textContent :
                 contentType === 'video' ? t.videoContent :
                 contentType === 'image' ? t.imageContent :
                 contentType === 'audio' ? t.audioContent :
                 contentType === 'quiz' ? t.quizContent :
                 contentType === 'interactive' ? t.interactiveContent :
                 contentType === 'document_link' ? t.documentContent :
                 contentType}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.title}</Label>
              <Input
                value={currentBlock.title}
                onChange={(e) => setCurrentBlock({...currentBlock, title: e.target.value})}
                placeholder={t.title}
              />
            </div>
            
            <div>
              <Label>{t.content}</Label>
              <Textarea
                value={currentBlock.content}
                onChange={(e) => setCurrentBlock({...currentBlock, content: e.target.value})}
                placeholder={t.content}
                rows={6}
              />
            </div>

            {currentBlock.type === 'video' && (
              <div>
                <Label>{t.embedUrl}</Label>
                <Input
                  value={currentBlock.content_url}
                  onChange={(e) => setCurrentBlock({...currentBlock, content_url: e.target.value})}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            )}

            {currentBlock.type === 'image' && (
              <div>
                <Label>{t.uploadFile}</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setCurrentBlock({
                        ...currentBlock,
                        content_url: URL.createObjectURL(file),
                        content: file.name
                      })
                    }
                  }}
                />
              </div>
            )}

            {currentBlock.type === 'document_link' && (
              <div>
                <Label>{t.enterUrl}</Label>
                <Input
                  value={currentBlock.content_url}
                  onChange={(e) => setCurrentBlock({...currentBlock, content_url: e.target.value})}
                  placeholder="https://example.com/document.pdf"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.duration}</Label>
                <Input
                  type="number"
                  value={currentBlock.duration || ''}
                  onChange={(e) => setCurrentBlock({...currentBlock, duration: parseInt(e.target.value)})}
                  placeholder="10"
                />
              </div>
              <div>
                <Label>{t.points}</Label>
                <Input
                  type="number"
                  value={currentBlock.points || ''}
                  onChange={(e) => setCurrentBlock({...currentBlock, points: parseInt(e.target.value)})}
                  placeholder="1"
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={currentBlock.is_mandatory}
                onChange={(e) => setCurrentBlock({...currentBlock, is_mandatory: e.target.checked})}
              />
              <span>{t.mandatory}</span>
            </label>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowContentDialog(false)}>
                {t.cancel}
              </Button>
              <Button onClick={saveContent}>
                {selectedContent ? t.save : t.addContent}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
                    
