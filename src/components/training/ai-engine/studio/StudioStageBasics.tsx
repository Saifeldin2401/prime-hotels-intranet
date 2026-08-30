import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertCircle,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck,
  FileCode,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  FileUp,
  Flame,
  FolderOpen,
  Globe,
  GraduationCap,
  Layers,
  ListOrdered,
  Loader2,
  RotateCw,
  Search,
  Sparkles,
  Target,
  UploadCloud,
  Wand2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CourseDifficulty, CourseGenerationMode, TargetAudience } from '@/types/aiCourseEngine'

export interface UploadedDocumentInfo {
  name: string
  size: number
  type: string
  extractedText: string
  wordCount: number
}

interface StudioStageBasicsProps {
  generationMode: CourseGenerationMode
  onSelectMode: (mode: CourseGenerationMode) => void
  courseTopic: string
  onChangeTopic: (topic: string) => void
  selectedDocumentId: string | null
  onSelectDocumentId: (docId: string | null) => void
  rawSourceContent: string
  onChangeRawSourceContent: (content: string) => void
  sopsData?: any[]
  isLoadingSOPs?: boolean
  selectedArticle?: any
  libraryDocuments?: any[]
  targetDepartment: string
  onChangeTargetDepartment: (dept: string) => void
  topicStaffRole: string
  onChangeTopicStaffRole: (role: string) => void
  targetAudience: TargetAudience
  onChangeTargetAudience: (aud: TargetAudience) => void
  experienceLevel: string
  onChangeExperienceLevel: (lvl: string) => void
  difficulty: CourseDifficulty
  onChangeDifficulty: (diff: CourseDifficulty) => void
  targetLanguage: 'English' | 'Arabic' | 'Bilingual'
  onChangeTargetLanguage: (lang: 'English' | 'Arabic' | 'Bilingual') => void
  priorKnowledge: string
  onChangePriorKnowledge: (pk: string) => void
  // Mode-Specific Advanced Options
  topicTheme: string
  onChangeTopicTheme: (t: string) => void
  sopExtractionMode: 'strict_sop' | 'enhanced_luxury'
  onChangeSopExtractionMode: (m: 'strict_sop' | 'enhanced_luxury') => void
  remixGoal: 'expand' | 'microlearning' | 'translate_saudi' | 'modernize_2026' | 'add_assessments'
  onChangeRemixGoal: (g: any) => void
  pedagogicalFramework: string
  onChangePedagogicalFramework: (f: string) => void
}

export function StudioStageBasics({
  generationMode,
  onSelectMode,
  courseTopic,
  onChangeTopic,
  selectedDocumentId,
  onSelectDocumentId,
  rawSourceContent,
  onChangeRawSourceContent,
  sopsData = [],
  isLoadingSOPs = false,
  selectedArticle,
  libraryDocuments = [],
  targetDepartment,
  onChangeTargetDepartment,
  topicStaffRole,
  onChangeTopicStaffRole,
  targetAudience,
  onChangeTargetAudience,
  experienceLevel,
  onChangeExperienceLevel,
  difficulty,
  onChangeDifficulty,
  targetLanguage,
  onChangeTargetLanguage,
  priorKnowledge,
  onChangePriorKnowledge,
  topicTheme,
  onChangeTopicTheme,
  sopExtractionMode,
  onChangeSopExtractionMode,
  remixGoal,
  onChangeRemixGoal,
  pedagogicalFramework,
  onChangePedagogicalFramework,
}: StudioStageBasicsProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [groundingTab, setGroundingTab] = useState<'knowledge_base' | 'document_library' | 'upload_file' | 'paste_text'>('knowledge_base')

  // Search queries
  const [docSearchQuery, setDocSearchQuery] = useState('')
  const [libSearchQuery, setLibSearchQuery] = useState('')

  // File Upload State
  const [uploadedFileInfo, setUploadedFileInfo] = useState<UploadedDocumentInfo | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [fileReadError, setFileReadError] = useState<string | null>(null)
  const [isExtractingFile, setIsExtractingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MODES: Array<{
    id: CourseGenerationMode
    title: string
    title_ar: string
    desc: string
    desc_ar: string
    icon: React.ElementType
    badge?: string
    color: string
  }> = [
    {
      id: 'full_course',
      title: 'Full Course Curriculum',
      title_ar: 'منهج تدريبي كامل',
      desc: 'Complete multi-module course with lessons, interactive procedures, activities, and quizzes.',
      desc_ar: 'دورة تدريبية متكاملة متعددة الوحدات مع دروس تفاعلية واختبارات تقييمية.',
      icon: Layers,
      badge: 'Popular',
      color: 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-600',
    },
    {
      id: 'document_based',
      title: 'SOP Grounded Course',
      title_ar: 'دورة مبنية على معايير SOP',
      desc: 'Transform company SOPs, manuals, or policies into high-retention instructional modules.',
      desc_ar: 'تحويل السياسات وإجراءات العمل إلى وحدات تدريبية واضحة.',
      icon: FileText,
      badge: 'Grounded',
      color: 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600',
    },
    {
      id: 'topic_based',
      title: 'Topic & Role Targeted',
      title_ar: 'موضوع محدد للدور الوظيفي',
      desc: 'Fast tailored microlearning tailored to specific hotel department roles & luxury standards.',
      desc_ar: 'تدريب سريع ومخصص لأدوار فندقية محددة.',
      icon: Target,
      color: 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600',
    },
    {
      id: 'outline_only',
      title: 'Curriculum Blueprint Only',
      title_ar: 'مخطط المنهج فقط',
      desc: 'High-speed synthesis of terminal objectives, lesson roadmaps, and Bloom tags.',
      desc_ar: 'توليد سريع لخطة الدورة والأهداف دون محتوى الدروس التفصيلي.',
      icon: ListOrdered,
      color: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600',
    },
    {
      id: 'single_module',
      title: 'Single Module Expansion',
      title_ar: 'وحدة تدريبية واحدة',
      desc: 'Generate a focused multi-lesson module ready to attach to an existing course.',
      desc_ar: 'توليد وحدة تدريبية مركزة متعددة الدروس.',
      icon: FileCheck,
      color: 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600',
    },
    {
      id: 'single_lesson',
      title: 'Individual Lesson',
      title_ar: 'درس تدريبي فردي',
      desc: 'Create an in-depth lesson with step procedures, scripts, and checkpoints.',
      desc_ar: 'إنشاء درس تفصيلي مع الإجراءات والسيناريوهات.',
      icon: BookOpen,
      color: 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 text-cyan-600',
    },
    {
      id: 'assessment_only',
      title: 'Certification Exam Studio',
      title_ar: 'اختبارات وشهادات معتمدة',
      desc: 'Standalone quiz pools, scenario dilemmas, and final exams with scoring rubrics.',
      desc_ar: 'توليد بنك أسئلة واختبارات نهائية متقدمة.',
      icon: FileQuestion,
      color: 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600',
    },
    {
      id: 'course_remix',
      title: 'Course Remix & Upgrade',
      title_ar: 'تطوير وتحديث دورة',
      desc: 'Upgrade existing material, expand depth, add KSA localization, or modernize.',
      desc_ar: 'تحديث المحتوى الحالي وإعادة صياغته لمعايير أحدث.',
      icon: RotateCw,
      color: 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 text-teal-600',
    },
  ]

  // Filtered Knowledge Base Articles
  const filteredDocs = (sopsData || []).filter((doc: any) =>
    (doc.title || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    (doc.summary || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    (doc.content_type || '').toLowerCase().includes(docSearchQuery.toLowerCase())
  )

  // Filtered Library Documents
  const filteredLibDocs = (libraryDocuments || []).filter((doc: any) =>
    (doc.title || '').toLowerCase().includes(libSearchQuery.toLowerCase()) ||
    (doc.description || '').toLowerCase().includes(libSearchQuery.toLowerCase()) ||
    (doc.file_type || '').toLowerCase().includes(libSearchQuery.toLowerCase())
  )

  // Find currently selected document across both collections
  const selectedDocObj =
    selectedArticle ||
    (sopsData || []).find((d: any) => d.id === selectedDocumentId) ||
    (libraryDocuments || []).find((d: any) => d.id === selectedDocumentId)

  // Handle File Upload and Text Extraction — real PDF (pdfjs) / DOCX (mammoth)
  // parsing, not readAsText (which returns binary garbage for those formats).
  const handleProcessFile = async (file: File) => {
    setFileReadError(null)
    setIsExtractingFile(true)
    try {
      const { extractTextFromFile } = await import('@/lib/documentText')
      const { text, wordCount, truncated } = await extractTextFromFile(file, 40000)

      setUploadedFileInfo({
        name: file.name,
        size: file.size,
        type: file.type || file.name.split('.').pop() || 'document',
        extractedText: text,
        wordCount,
      })
      onChangeRawSourceContent(
        `[Uploaded Document: ${file.name} | ${wordCount.toLocaleString()} words${truncated ? ', truncated' : ''}]\n\n${text}`
      )

      if (!courseTopic.trim()) {
        onChangeTopic(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
      }
    } catch (err: any) {
      setUploadedFileInfo(null)
      onChangeRawSourceContent('')
      setFileReadError(err?.message || 'Could not extract text from this document.')
    } finally {
      setIsExtractingFile(false)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0])
    }
  }

  const handleClearGrounding = () => {
    onSelectDocumentId(null)
    setUploadedFileInfo(null)
    onChangeRawSourceContent('')
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* 1. Mode Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>{t('builder.selectGenerationMode', 'Choose Authoring Mode')}</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('builder.selectGenerationModeDesc', 'Select the pedagogical objective for this AI generation session.')}
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200">
            {MODES.find((m) => m.id === generationMode)?.title}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {MODES.map((mode) => {
            const Icon = mode.icon
            const isSelected = generationMode === mode.id

            return (
              <Card
                key={mode.id}
                onClick={() => onSelectMode(mode.id)}
                className={cn(
                  'cursor-pointer transition-all duration-200 border text-start relative overflow-hidden group hover:shadow-md',
                  isSelected
                    ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 ring-1 ring-purple-500 shadow-sm'
                    : 'bg-card hover:border-purple-300'
                )}
              >
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-1">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110',
                        isSelected ? 'bg-purple-600 text-white' : 'bg-muted text-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {mode.badge && (
                      <Badge className="bg-purple-600 text-white text-[9px] px-1.5 py-0 h-4">
                        {mode.badge}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-foreground leading-snug">
                      {isRTL ? mode.title_ar : mode.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-1 line-clamp-2">
                      {isRTL ? mode.desc_ar : mode.desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 2. Course Topic & Grounding Source Hub */}
      <div className="space-y-4 p-4 rounded-xl border bg-card/80 backdrop-blur-sm shadow-sm">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            <span>{t('builder.courseTopic', 'Course Title or Core Subject')} <span className="text-rose-500">*</span></span>
          </Label>
          <Input
            value={courseTopic}
            onChange={(e) => onChangeTopic(e.target.value)}
            placeholder={t('builder.courseTopicPlaceholder', 'e.g. 5-Star VIP Arrival & Concierge Protocol, Front Desk Opera PMS Check-in...')}
            className="text-sm font-medium focus-visible:ring-purple-500"
          />
        </div>

        {/* SOP Grounding Hub (Knowledge Base, Document Library, File Upload, or Raw Text) */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>{t('builder.groundingHub', 'Grounding SOP Source & Documentation')}</span>
                <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200">
                  {selectedDocObj || uploadedFileInfo ? 'Grounded ✓' : 'Optional Grounding'}
                </Badge>
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t('builder.groundingHubDesc', 'Ground the AI curriculum in verified hotel standard operating procedures, uploaded manuals, or document library files.')}
              </p>
            </div>

            {(selectedDocumentId || uploadedFileInfo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearGrounding}
                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                ✕ {t('common.clearSelection', 'Clear Grounding')}
              </Button>
            )}
          </div>

          {/* Hero Card if a Knowledge Base Article or Library Document is selected */}
          {selectedDocObj && !uploadedFileInfo ? (
            <div className="p-3.5 rounded-xl border border-blue-300/80 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-purple-50/60 dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-purple-950/30 space-y-2 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-foreground truncate">
                        {selectedDocObj.title}
                      </p>
                      <Badge className="bg-blue-600 text-white text-[9px] h-4">
                        {selectedDocObj.content_type || selectedDocObj.file_type || 'SOP Document'}
                      </Badge>
                      {selectedDocObj.department?.name && (
                        <Badge variant="outline" className="text-[9px] h-4">
                          {selectedDocObj.department.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {selectedDocObj.summary || selectedDocObj.ai_summary || selectedDocObj.description || 'Grounding course generation in this standard operating procedure.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onChangeTopic(selectedDocObj.title)}
                    className="h-7 text-xs font-semibold text-blue-700 dark:text-blue-300 border-blue-300 hover:bg-blue-100/50"
                  >
                    ⚡ Set as Title
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearGrounding}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    title="Remove Grounding"
                  >
                    ✕
                  </Button>
                </div>
              </div>
            </div>
          ) : uploadedFileInfo ? (
            /* Hero Card if a File was Uploaded */
            <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30 space-y-2 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                    <FileUp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-foreground truncate">
                        {uploadedFileInfo.name}
                      </p>
                      <Badge className="bg-emerald-600 text-white text-[9px] h-4">
                        Uploaded Document ({(uploadedFileInfo.size / 1024).toFixed(1)} KB)
                      </Badge>
                      <Badge variant="outline" className="text-[9px] h-4 border-emerald-300 text-emerald-700 dark:text-emerald-300">
                        {uploadedFileInfo.wordCount} words extracted
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 font-mono">
                      {uploadedFileInfo.extractedText.slice(0, 160)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onChangeTopic(uploadedFileInfo.name.replace(/\.[^/.]+$/, ''))}
                    className="h-7 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-100/50"
                  >
                    ⚡ Set as Title
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearGrounding}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Multi-Tab Grounding Interface */
            <Tabs
              value={groundingTab}
              onValueChange={(val: any) => setGroundingTab(val)}
              className="w-full space-y-3"
            >
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-9 p-1 bg-muted/60">
                <TabsTrigger value="knowledge_base" className="text-xs gap-1.5">
                  <BookOpen className="w-3 h-3" />
                  <span>Knowledge Base</span>
                </TabsTrigger>
                <TabsTrigger value="document_library" className="text-xs gap-1.5">
                  <FolderOpen className="w-3 h-3" />
                  <span>Document Library</span>
                </TabsTrigger>
                <TabsTrigger value="upload_file" className="text-xs gap-1.5">
                  <UploadCloud className="w-3 h-3" />
                  <span>Upload Document</span>
                </TabsTrigger>
                <TabsTrigger value="paste_text" className="text-xs gap-1.5">
                  <FileCode className="w-3 h-3" />
                  <span>Paste SOP Text</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Knowledge Base SOP Articles */}
              <TabsContent value="knowledge_base" className="space-y-3 pt-1">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute start-3 top-3 text-muted-foreground" />
                  <Input
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    placeholder={t('builder.searchSOPs', 'Search 100+ hotel SOP articles by title, policy, department, or procedure...')}
                    className="ps-9 text-xs h-9 bg-card focus-visible:ring-purple-500"
                  />
                  {docSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDocSearchQuery('')}
                      className="absolute end-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Instant Search Results Dropdown Overlay / List */}
                {docSearchQuery.trim().length > 0 && (
                  <div className="rounded-xl border bg-card/95 backdrop-blur shadow-md max-h-56 overflow-y-auto divide-y divide-border/60">
                    {filteredDocs.length > 0 ? (
                      filteredDocs.slice(0, 10).map((doc: any) => (
                        <div
                          key={doc.id}
                          onClick={() => {
                            onSelectDocumentId(doc.id)
                            if (!courseTopic.trim()) onChangeTopic(doc.title)
                            setDocSearchQuery('')
                          }}
                          className="p-2.5 hover:bg-purple-50/70 dark:hover:bg-purple-950/40 cursor-pointer flex items-center justify-between gap-2 transition-colors group"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate group-hover:text-purple-600">
                                {doc.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {doc.summary || doc.description || `${doc.content_type || 'SOP'} Document`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="outline" className="text-[9px] uppercase">
                              {doc.content_type || 'SOP'}
                            </Badge>
                            <span className="text-[10px] text-purple-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                              Select →
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No matching SOP documents found for &quot;{docSearchQuery}&quot;.
                      </div>
                    )}
                  </div>
                )}

                {/* Quick-Select SOP Chips */}
                {!docSearchQuery && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{t('builder.popularSOPs', '⚡ Popular SOP Grounding Presets:')}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { title: 'Front Office VIP Arrival & Check-In Protocol', icon: '🛎️', dept: 'front_office' },
                        { title: 'Housekeeping Five-Star Turndown Service', icon: '🧹', dept: 'housekeeping' },
                        { title: 'F&B Fine Dining Sequence of Service', icon: '🍽️', dept: 'food_beverage' },
                        { title: 'Guest Complaint Resolution (LAST Protocol)', icon: '💬', dept: 'front_office' },
                        { title: 'Hotel Fire Safety & Emergency Evacuation', icon: '🚨', dept: 'security_safety' },
                        { title: 'Culinary Food Safety & HACCP Standard', icon: '🍳', dept: 'kitchen_culinary' },
                      ].map((preset) => {
                        const matched = (sopsData || []).find((d: any) =>
                          (d.title || '').toLowerCase().includes(preset.title.slice(0, 15).toLowerCase())
                        )

                        return (
                          <button
                            key={preset.title}
                            type="button"
                            onClick={() => {
                              if (matched) onSelectDocumentId(matched.id)
                              onChangeTopic(preset.title)
                              onChangeTargetDepartment(preset.dept)
                            }}
                            className="px-2.5 py-1 rounded-lg border bg-card hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950/30 text-[11px] font-medium text-foreground transition-all flex items-center gap-1.5 group"
                          >
                            <span>{preset.icon}</span>
                            <span className="group-hover:text-purple-600">{preset.title}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: Hotel Document Library */}
              <TabsContent value="document_library" className="space-y-3 pt-1">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute start-3 top-3 text-muted-foreground" />
                  <Input
                    value={libSearchQuery}
                    onChange={(e) => setLibSearchQuery(e.target.value)}
                    placeholder="Search documents from hotel library by title, folder, or file type..."
                    className="ps-9 text-xs h-9 bg-card focus-visible:ring-purple-500"
                  />
                  {libSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setLibSearchQuery('')}
                      className="absolute end-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="rounded-xl border bg-card max-h-56 overflow-y-auto divide-y divide-border/60">
                  {filteredLibDocs.length > 0 ? (
                    filteredLibDocs.slice(0, 15).map((doc: any) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          onSelectDocumentId(doc.id)
                          if (!courseTopic.trim()) onChangeTopic(doc.title)
                          setLibSearchQuery('')
                        }}
                        className="p-2.5 hover:bg-purple-50/70 dark:hover:bg-purple-950/40 cursor-pointer flex items-center justify-between gap-2 transition-colors group"
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <FolderOpen className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate group-hover:text-purple-600">
                              {doc.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {doc.folder?.name ? `Folder: ${doc.folder.name} • ` : ''}
                              {doc.file_type || doc.content_type || 'Document'}
                              {doc.file_size ? ` • ${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className="text-[9px]">
                            {doc.file_extension || 'PDF'}
                          </Badge>
                          <span className="text-[10px] text-purple-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            Select →
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      {libraryDocuments.length === 0 ? 'No documents found in Document Library.' : `No documents matching "${libSearchQuery}".`}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab 3: Upload Document File */}
              <TabsContent value="upload_file" className="space-y-3 pt-1">
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDraggingFile(true)
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200',
                    isDraggingFile
                      ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 scale-[0.99]'
                      : 'border-border/80 hover:border-purple-400 bg-card/60 hover:bg-muted/20'
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.md,.json,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-xl bg-purple-600/15 text-purple-600 flex items-center justify-center font-bold mb-2">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-foreground">
                    Click to browse or drag and drop your document here
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Supports SOP Manuals, Policy PDFs, Word (.docx), Markdown (.md), and TXT files up to 25MB
                  </p>
                </div>

                {isExtractingFile && (
                  <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                    <span>Extracting text from the document…</span>
                  </div>
                )}

                {fileReadError && (
                  <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{fileReadError}</span>
                  </div>
                )}
              </TabsContent>

              {/* Tab 4: Direct Raw SOP Content Textarea */}
              <TabsContent value="paste_text" className="space-y-2 pt-1">
                <Textarea
                  value={rawSourceContent}
                  onChange={(e) => onChangeRawSourceContent(e.target.value)}
                  placeholder={t('builder.pasteSOPPlaceholder', 'Paste raw SOP steps, policies, manuals, or training notes here to ground the AI generation...')}
                  rows={4}
                  className="text-xs font-mono"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Supports markdown, numbered procedural steps, and tables</span>
                  <span>{rawSourceContent.split(/\s+/).filter(Boolean).length} words</span>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* 3. Target Audience, Language & Hotel Operational Department */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Language */}
        <div className="space-y-1.5 p-3 rounded-xl border bg-card">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-purple-600" />
            <span>{t('builder.targetLanguage', 'Target Language')}</span>
          </Label>
          <Select value={targetLanguage} onValueChange={(v: any) => onChangeTargetLanguage(v)}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="English">🇬🇧 English (International)</SelectItem>
              <SelectItem value="Arabic">🇸🇦 Arabic (العربية - KSA Standard)</SelectItem>
              <SelectItem value="Bilingual">🌐 Bilingual (Arabic & English)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Experience Level / Difficulty */}
        <div className="space-y-1.5 p-3 rounded-xl border bg-card">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('builder.difficultyLevel', 'Learner Level')}</span>
          </Label>
          <Select value={difficulty} onValueChange={(v: any) => onChangeDifficulty(v)}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner (Foundational)</SelectItem>
              <SelectItem value="intermediate">Intermediate (Standard)</SelectItem>
              <SelectItem value="challenging">Advanced (Experienced)</SelectItem>
              <SelectItem value="expert">Executive / Expert Mastery</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Target Audience */}
        <div className="space-y-1.5 p-3 rounded-xl border bg-card">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-amber-600" />
            <span>{t('builder.targetAudience', 'Target Audience')}</span>
          </Label>
          <Select value={targetAudience} onValueChange={(v: any) => onChangeTargetAudience(v)}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employees">Frontline Associates</SelectItem>
              <SelectItem value="managers">Supervisors & Managers</SelectItem>
              <SelectItem value="executives">Executive Leadership</SelectItem>
              <SelectItem value="mixed">All Hotel Staff (Chain-Wide)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Hotel Department */}
        <div className="space-y-1.5 p-3 rounded-xl border bg-card">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('builder.targetDepartment', 'Hotel Department')}</span>
          </Label>
          <Select value={targetDepartment} onValueChange={onChangeTargetDepartment}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="front_office">Front Office & Concierge</SelectItem>
              <SelectItem value="housekeeping">Housekeeping & Laundry</SelectItem>
              <SelectItem value="food_beverage">Food & Beverage (F&B)</SelectItem>
              <SelectItem value="kitchen_culinary">Culinary & Kitchen</SelectItem>
              <SelectItem value="security_safety">Security & Safety</SelectItem>
              <SelectItem value="engineering">Engineering & Maintenance</SelectItem>
              <SelectItem value="human_resources">Human Resources & Talent</SelectItem>
              <SelectItem value="finance_procurement">Finance & Procurement</SelectItem>
              <SelectItem value="sales_marketing">Sales & Revenue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. Progressive Disclosure: Advanced Pedagogical Directives */}
      <div className="border rounded-xl bg-muted/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>{t('builder.advancedBasics', 'Advanced Course Directives & Localization')}</span>
            <Badge variant="outline" className="text-[9px]">Optional</Badge>
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="p-4 pt-1 border-t space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('builder.hotelTheme', 'Hospitality Standard')}</Label>
                <Select value={topicTheme} onValueChange={onChangeTopicTheme}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="five_star_comprehensive">five-star Luxury Standards</SelectItem>
                    <SelectItem value="saudi_hospitality">Saudi Cultural Hospitality & Etiquette</SelectItem>
                    <SelectItem value="standard_sop">Operational Compliance Standard</SelectItem>
                    <SelectItem value="rapid_onboarding">Rapid New Hire Onboarding</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('builder.staffRole', 'Specific Staff Role')}</Label>
                <Input
                  value={topicStaffRole}
                  onChange={(e) => onChangeTopicStaffRole(e.target.value)}
                  placeholder="e.g. Head Concierge, Butler, Night Auditor, Duty Manager"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t('builder.priorKnowledge', 'Assumed Prior Knowledge (Prerequisites)')}</Label>
              <Input
                value={priorKnowledge}
                onChange={(e) => onChangePriorKnowledge(e.target.value)}
                placeholder="e.g. Basic Opera PMS navigation, guest service orientation..."
                className="text-xs"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
