import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  FileQuestion,
  FileText,
  Gamepad2,
  GripVertical,
  Headphones,
  Image,
  Layers,
  Link,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Video
} from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

type ContentType = 'text' | 'image' | 'video' | 'document_link' | 'audio' | 'quiz' | 'interactive' | 'sop_reference'

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

interface TrainingSection {
  id: string
  title: string
  description?: string
  items: ContentBlockForm[]
  order: number
}

interface BuilderCanvasProps {
  sections: TrainingSection[]
  activeSection: string | null
  onSectionClick: (id: string | null) => void
  onAddSection: () => void
  onDeleteSection: (id: string) => void
  onAddContent: (type: ContentType, sectionId: string) => void
  onEditContent: (sectionId: string, contentId: string) => void
  onDeleteContent: (sectionId: string, contentId: string) => void
  onReorderSection: (dragIndex: number, hoverIndex: number) => void
  onReorderContent: (sectionId: string, dragIndex: number, hoverIndex: number) => void
  onGenerateQuizFromSection?: (sectionId: string) => void
  onOpenAICreator?: () => void
  onOpenTemplateSelector?: () => void
  onRenameSection?: (sectionId: string, newTitle: string) => void
  onDuplicateSection?: (sectionId: string) => void
  onDeepExpandLesson?: (sectionId: string, contentId: string) => Promise<void>
}

const CONTENT_TYPES_CONFIG: Array<{ type: ContentType; label: string; icon: any; color: string; desc: string }> = [
  { type: 'text', label: 'Rich Text / SOP', icon: FileText, color: 'text-blue-600 bg-blue-50 border-blue-200', desc: 'Standard operating procedures, guidebooks, and written modules' },
  { type: 'video', label: 'Video Lesson', icon: Video, color: 'text-rose-600 bg-rose-50 border-rose-200', desc: 'Embed video walk-throughs, hospitality demos, and streams' },
  { type: 'quiz', label: 'Interactive Quiz', icon: FileQuestion, color: 'text-purple-600 bg-purple-50 border-purple-200', desc: 'Single & multiple-choice knowledge checkpoints with pass requirements' },
  { type: 'document_link', label: 'Document / Policy', icon: Link, color: 'text-amber-600 bg-amber-50 border-amber-200', desc: 'Attach PDF manuals, forms, and compliance documents' },
  { type: 'sop_reference', label: 'Knowledge Base SOP', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', desc: 'Link live hotel standard operating procedures from the intranet' }
]

export const BuilderCanvas = ({
  sections,
  activeSection,
  onSectionClick,
  onAddSection,
  onDeleteSection,
  onAddContent,
  onEditContent,
  onDeleteContent,
  onReorderSection,
  onReorderContent,
  onGenerateQuizFromSection,
  onOpenAICreator,
  onOpenTemplateSelector,
  onRenameSection,
  onDuplicateSection,
  onDeepExpandLesson
}: BuilderCanvasProps) => {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [previewingBlock, setPreviewingBlock] = useState<ContentBlockForm | null>(null)
  const [expandingLessonId, setExpandingLessonId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  const totalLessons = sections.reduce((acc, s) => acc + s.items.length, 0)
  const totalQuizzes = sections.reduce((acc, s) => acc + s.items.filter((i) => i.type === 'quiz').length, 0)
  const estimatedTotalMins = sections.reduce((acc, s) => acc + s.items.reduce((sum, item) => sum + (item.duration || 5), 0), 0)

  const getContentIcon = (type: ContentType) => {
    switch (type) {
      case 'text':
        return <FileText className="w-4 h-4 text-blue-600" />
      case 'video':
        return <Video className="w-4 h-4 text-rose-600" />
      case 'audio':
        return <Headphones className="w-4 h-4 text-cyan-600" />
      case 'interactive':
        return <Gamepad2 className="w-4 h-4 text-indigo-600" />
      case 'document_link':
        return <Link className="w-4 h-4 text-amber-600" />
      case 'quiz':
        return <FileQuestion className="w-4 h-4 text-purple-600" />
      case 'sop_reference':
        return <BookOpen className="w-4 h-4 text-emerald-600" />
      default:
        return <FileText className="w-4 h-4 text-slate-600" />
    }
  }

  const handleDragStartSection = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('type', 'section')
    e.dataTransfer.setData('index', index.toString())
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragStartContent = (e: React.DragEvent, sectionId: string, index: number) => {
    e.stopPropagation()
    e.dataTransfer.setData('type', 'content')
    e.dataTransfer.setData('sectionId', sectionId)
    e.dataTransfer.setData('index', index.toString())
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDropSection = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('type')
    if (type !== 'section') return
    const dragIndex = parseInt(e.dataTransfer.getData('index'))
    if (isNaN(dragIndex) || dragIndex === dropIndex) return
    onReorderSection(dragIndex, dropIndex)
  }

  const handleDropContent = (e: React.DragEvent, dropSectionId: string, dropIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    const type = e.dataTransfer.getData('type')
    if (type !== 'content') return
    const dragSectionId = e.dataTransfer.getData('sectionId')
    const dragIndex = parseInt(e.dataTransfer.getData('index'))
    if (isNaN(dragIndex) || dragSectionId !== dropSectionId) return
    onReorderContent(dropSectionId, dragIndex, dropIndex)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const startRenaming = (sectionId: string, currentTitle: string) => {
    setEditingSectionId(sectionId)
    setEditingTitle(currentTitle)
  }

  const saveRenaming = (sectionId: string) => {
    if (editingTitle.trim() && onRenameSection) {
      onRenameSection(sectionId, editingTitle.trim())
    }
    setEditingSectionId(null)
  }

  return (
    <div className="flex-1 p-6 md:p-8 bg-slate-50/60 dark:bg-slate-950/40 min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Action & Metrics Bar */}
        <div className={cn('flex flex-col md:flex-row md:items-center justify-between gap-4', isRTL ? 'md:flex-row-reverse' : '')}>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>{t('builder.courseStructure', 'Course Curriculum & Lessons')}</span>
              {sections.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="font-bold text-xs bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    {sections.length} {sections.length === 1 ? 'Section' : 'Sections'}
                  </Badge>
                  <Badge variant="outline" className="font-semibold text-xs bg-white dark:bg-slate-900">
                    {totalLessons} Lessons
                  </Badge>
                  {totalQuizzes > 0 && (
                    <Badge variant="outline" className="font-semibold text-xs text-purple-700 bg-purple-50 dark:bg-purple-950 border-purple-200">
                      {totalQuizzes} Quizzes
                    </Badge>
                  )}
                  <Badge variant="secondary" className="font-semibold text-xs text-slate-600 bg-slate-200/60">
                    ~{estimatedTotalMins} mins
                  </Badge>
                </div>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t('builder.curriculumSub', 'Organize learning modules, rich lesson blocks, and interactive knowledge checkpoints.')}
            </p>
          </div>

          <div className={cn('flex items-center gap-2 shrink-0', isRTL ? 'flex-row-reverse' : '')}>
            {onOpenAICreator && (
              <Button
                onClick={onOpenAICreator}
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold shadow-sm border-none"
              >
                <Sparkles className="w-4 h-4 me-1.5" />
                {t('builder.aiDraft', 'Draft with AI')}
              </Button>
            )}
            <Button
              onClick={onAddSection}
              size="sm"
              variant="outline"
              className="font-semibold bg-white dark:bg-slate-900 shadow-sm hover:border-amber-400"
            >
              <Plus className="w-4 h-4 me-1.5 text-amber-600" />
              {t('builder.addSection', 'Add Section')}
            </Button>
          </div>
        </div>

        {/* Empty State: 3 Fast Action Launchers */}
        {sections.length === 0 ? (
          <div className="space-y-6 pt-4">
            <div className="text-center space-y-2 py-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-400/20 border border-amber-300/40 flex items-center justify-center mx-auto text-amber-600 shadow-inner">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('builder.startCreating', 'How would you like to build your course?')}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {t('builder.chooseMethod', 'Choose a fast creation method to get started in seconds.')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: AI Creator */}
              <div
                onClick={onOpenAICreator}
                className="group relative p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-300/70 hover:border-amber-500 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                      Smart AI Creator
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Generate full curriculum, rich lesson text, and verified quizzes from any topic or hotel SOP in 10 seconds.
                    </p>
                  </div>
                </div>
                <div className="pt-4 flex items-center gap-1 text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform">
                  <span>Generate with AI</span>
                  <span>&rarr;</span>
                </div>
              </div>

              {/* Option 2: Template Selector */}
              <div
                onClick={onOpenTemplateSelector}
                className="group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      Hotel SOP Templates
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Start from pre-built 5-star hotel operational courses (Front Desk, Housekeeping, Food & Beverage, Safety).
                    </p>
                  </div>
                </div>
                <div className="pt-4 flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                  <span>Browse Templates</span>
                  <span>&rarr;</span>
                </div>
              </div>

              {/* Option 3: Start from Scratch */}
              <div
                onClick={onAddSection}
                className="group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-slate-800 transition-colors">
                      Blank Canvas
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create a custom course structure from scratch with full manual control over every section and block.
                    </p>
                  </div>
                </div>
                <div className="pt-4 flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:translate-x-1 transition-transform">
                  <span>Add First Section</span>
                  <span>&rarr;</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Active Sections List */
          <div className="space-y-4">
            {sections.map((section, sectionIndex) => {
              const isExpanded = activeSection === null || activeSection === section.id
              const filteredItems = section.items.filter((item) => {
                if (filterType === 'all') return true
                if (filterType === 'quiz') return item.type === 'quiz'
                if (filterType === 'text') return item.type === 'text' || item.type === 'sop_reference'
                if (filterType === 'video') return item.type === 'video'
                return true
              })

              return (
                <Card
                  key={section.id}
                  draggable
                  onDragStart={(e) => handleDragStartSection(e, sectionIndex)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropSection(e, sectionIndex)}
                  className={cn(
                    'overflow-hidden transition-all duration-200 border bg-white dark:bg-slate-900 shadow-sm',
                    isExpanded ? 'border-slate-300 dark:border-slate-700 shadow-md' : 'border-slate-200 opacity-95'
                  )}
                >
                  {/* Section Header */}
                  <CardHeader
                    className="py-3.5 px-5 bg-slate-50/80 dark:bg-slate-900/90 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none"
                    onClick={() => onSectionClick(activeSection === section.id ? null : section.id)}
                  >
                    <div className={cn('flex items-center justify-between gap-3', isRTL ? 'flex-row-reverse' : '')}>
                      <div className={cn('flex items-center gap-3 flex-1 min-w-0', isRTL ? 'flex-row-reverse' : '')}>
                        <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 rounded">
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {sectionIndex + 1}
                        </span>

                        {editingSectionId === section.id ? (
                          <div className="flex items-center gap-2 flex-1 max-w-sm" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editingTitle}
                              autoFocus
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={() => saveRenaming(section.id)}
                              onKeyDown={(e) => e.key === 'Enter' && saveRenaming(section.id)}
                              className="h-8 text-sm font-bold bg-white dark:bg-slate-950"
                            />
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-2 group/title cursor-text flex-1 min-w-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              startRenaming(section.id, section.title)
                            }}
                          >
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {section.title}
                            </h3>
                            <span className="text-[11px] text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity">
                              (Click to rename)
                            </span>
                          </div>
                        )}

                        <Badge variant="secondary" className="text-[11px] font-semibold bg-slate-200/70 text-slate-700 shrink-0">
                          {section.items.length} {section.items.length === 1 ? 'Lesson' : 'Lessons'}
                        </Badge>
                      </div>

                      <div className={cn('flex items-center gap-1', isRTL ? 'flex-row-reverse' : '')} onClick={(e) => e.stopPropagation()}>
                        {/* Move Up/Down Controls */}
                        <div className="flex items-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-400 hover:text-slate-700"
                            disabled={sectionIndex === 0}
                            onClick={() => onReorderSection(sectionIndex, sectionIndex - 1)}
                            title="Move section up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-400 hover:text-slate-700"
                            disabled={sectionIndex === sections.length - 1}
                            onClick={() => onReorderSection(sectionIndex, sectionIndex + 1)}
                            title="Move section down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {onGenerateQuizFromSection && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-purple-700 hover:text-purple-800 hover:bg-purple-50"
                            onClick={() => onGenerateQuizFromSection(section.id)}
                          >
                            <Sparkles className="w-3.5 h-3.5 me-1 text-purple-600" />
                            <span>AI Quiz</span>
                          </Button>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => onDeleteSection(section.id)}
                          title="Delete section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>

                        <div className="h-7 w-7 flex items-center justify-center text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Section Content & Lesson Blocks */}
                  {isExpanded && (
                    <CardContent className="p-5 space-y-4 bg-white dark:bg-slate-900">
                      {/* Lesson Items */}
                      {section.items.length === 0 ? (
                        <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <p className="text-xs font-semibold text-slate-500 mb-3">
                            This section has no lessons yet. Choose a content type below to add your first lesson:
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {CONTENT_TYPES_CONFIG.map((config) => {
                              const IconComponent = config.icon
                              return (
                                <Button
                                  key={config.type}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onAddContent(config.type, section.id)}
                                  className="h-8 text-xs font-semibold bg-white hover:border-amber-400 hover:bg-amber-50/50"
                                >
                                  <IconComponent className="w-3.5 h-3.5 me-1.5 text-amber-600" />
                                  {config.label}
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredItems.map((item, itemIndex) => (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={(e) => handleDragStartContent(e, section.id, itemIndex)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDropContent(e, section.id, itemIndex)}
                              onClick={() => onEditContent(section.id, item.id)}
                              className={cn(
                                'group flex items-center gap-3 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-sm transition-all cursor-pointer',
                                isRTL ? 'flex-row-reverse' : ''
                              )}
                            >
                              <div className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-500">
                                <GripVertical className="w-4 h-4" />
                              </div>

                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                {getContentIcon(item.type)}
                              </div>

                              <div className={cn('flex-1 min-w-0', isRTL ? 'text-right' : 'text-left')}>
                                <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {item.title || 'Untitled Lesson Block'}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate capitalize">
                                  {item.type.replace('_', ' ')} • {item.is_mandatory ? 'Mandatory' : 'Optional'}
                                  {item.duration ? ` • ${item.duration} min` : ''}
                                </p>
                              </div>

                              <div
                                className={cn('flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity', isRTL ? 'flex-row-reverse' : '')}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {item.content && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                                    onClick={() => setPreviewingBlock(item)}
                                    title="Quick Preview SOP Content"
                                  >
                                    <Eye className="w-3.5 h-3.5 me-1" />
                                    <span>Preview</span>
                                  </Button>
                                )}
                                {item.type === 'text' && onDeepExpandLesson && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={expandingLessonId === item.id}
                                    className="h-7 px-2 text-xs font-semibold text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
                                    onClick={async () => {
                                      setExpandingLessonId(item.id)
                                      try {
                                        await onDeepExpandLesson(section.id, item.id)
                                      } finally {
                                        setExpandingLessonId(null)
                                      }
                                    }}
                                    title="Deep Expand into 600-word 5-Star Operational SOP"
                                  >
                                    {expandingLessonId === item.id ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />
                                        <span>Expanding...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3.5 h-3.5 me-1 text-indigo-600" />
                                        <span>Deep Expand</span>
                                      </>
                                    )}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2.5 text-xs font-semibold text-slate-700 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={() => onEditContent(section.id, item.id)}
                                >
                                  Edit Lesson
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => onDeleteContent(section.id, item.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          {/* Fast Add Inline Toolbar */}
                          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[11px] font-semibold text-slate-400">Add Lesson to this section:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {CONTENT_TYPES_CONFIG.map((config) => {
                                const IconComponent = config.icon
                                return (
                                  <Button
                                    key={config.type}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onAddContent(config.type, section.id)}
                                    className="h-7 px-2 text-[11px] font-medium text-slate-600 hover:text-amber-700 hover:bg-amber-50/70"
                                  >
                                    <IconComponent className="w-3 h-3 me-1" />
                                    {config.label.split(' ')[0]}
                                  </Button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )
            })}

            {/* Bottom Add Section Card */}
            <div
              onClick={onAddSection}
              className="p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 transition-all text-center cursor-pointer flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:text-amber-800"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>Add Another Section to Course</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Lesson SOP Preview Dialog */}
      <Dialog open={!!previewingBlock} onOpenChange={(open) => !open && setPreviewingBlock(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>{previewingBlock?.title || 'Lesson SOP Preview'}</span>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[60vh] pe-4 py-4">
            {previewingBlock?.content ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: previewingBlock.content }}
              />
            ) : (
              <p className="text-xs text-muted-foreground italic">No SOP text content available for this lesson block.</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
