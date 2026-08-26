import { AIQuestionGenerator } from '@/components/questions/AIQuestionGenerator'
import { DocumentPicker } from '@/components/documents/DocumentPicker'
import { MediaPicker } from '@/components/media/MediaPicker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import type { MediaAsset } from '@/lib/types/media'
import type { Document } from '@/lib/types'
import type { LearningQuiz } from '@/types/learning'
import { aiService } from '@/lib/gemini'
import { HOTEL_ROLEPLAY_SCENARIOS, type RoleplayScenario } from '@/lib/ai/roleplayEngine'
import { AlertTriangle, BookOpen, CheckCircle2, FileText, Loader2, MessageSquare, Search, Sparkles, Upload, X } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { deriveTitleFromUrl } from './trainingBuilderUtils'
import type { ContentBlockForm, RecentUpload } from './trainingBuilderTypes'

const RichTextEditor = lazy(() => import('@/components/ui/RichTextEditor'))

interface ContentBlockSlideOverProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  currentBlock: ContentBlockForm
  setCurrentBlock: (block: ContentBlockForm) => void
  selectedContent: ContentBlockForm | null
  showTitleField: boolean
  setShowTitleField: (v: boolean) => void
  showAdvancedBlockOptions: boolean
  setShowAdvancedBlockOptions: (v: boolean) => void
  mediaInputMode: 'upload' | 'link' | 'library'
  setMediaInputMode: (v: 'upload' | 'link' | 'library') => void
  blockValidation: { ok: boolean; message: string }
  recentUploadsForType: RecentUpload[]
  availableQuizzes: LearningQuiz[] | undefined
  quizOptions: LearningQuiz[]
  availableSOPs: { id: string; title: string }[] | undefined
  sopOptions: { id: string; title: string }[]
  uploading: boolean
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document' | 'audio' | 'video') => void
  showVideoMediaPicker: boolean
  setShowVideoMediaPicker: (v: boolean) => void
  showDocumentPicker: boolean
  setShowDocumentPicker: (v: boolean) => void
  handleSaveBlockToLibrary: () => void
  saveContent: () => void
  isRTL: boolean
}

export function ContentBlockSlideOver({
  open,
  onOpenChange,
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
  availableQuizzes,
  quizOptions,
  availableSOPs,
  sopOptions,
  uploading,
  handleFileUpload,
  showVideoMediaPicker,
  setShowVideoMediaPicker,
  showDocumentPicker,
  setShowDocumentPicker,
  handleSaveBlockToLibrary,
  saveContent,
  isRTL,
}: ContentBlockSlideOverProps) {
  const { t } = useTranslation('training')
  const { toast } = useToast()
  const [showImageMediaPicker, setShowImageMediaPicker] = useState(false)
  const [sopSearchTerm, setSopSearchTerm] = useState('')
  const [isGeneratingContent, setIsGeneratingContent] = useState(false)

  const handleAIGenerateLessonContent = async () => {
    setIsGeneratingContent(true)
    try {
      const heading = currentBlock.title?.trim() || '5-Star Hotel Standard Operating Procedure'
      const generated = await aiService.expandLessonContent({
        courseTitle: heading,
        sectionHeading: heading,
        department: 'Hotel Operations',
        language: isRTL ? 'Arabic' : 'English',
      })
      if (generated) {
        setCurrentBlock({
          ...currentBlock,
          content: generated,
          duration: currentBlock.duration || 5,
        })
        toast({
          title: '✨ Lesson Content Generated',
          description: 'Synthesized complete 5-star operating guidelines.',
        })
      }
    } catch (e) {
      console.error('Failed to generate lesson content:', e)
      toast({
        title: 'Error',
        description: 'Failed to generate lesson content. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingContent(false)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isRTL ? 'left' : 'right'}
          className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-6 flex flex-col justify-between"
        >
          <div>
            <SheetHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <SheetTitle className={cn("text-base font-bold", isRTL ? 'text-right' : 'text-left')}>
                {selectedContent ? t('builder.editContent', 'Edit Content Block') : t('builder.addContent', 'Add Content Block')}
              </SheetTitle>
              <SheetDescription className={cn("text-xs text-muted-foreground", isRTL ? 'text-right' : 'text-left')}>
                {t('builder.contentDialogDescription', 'Configure lesson content, quizzes, and attachments for this section')}
              </SheetDescription>
            </SheetHeader>

            {/* Validation Banner */}
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs my-4 font-medium",
              blockValidation.ok ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
              isRTL ? "flex-row-reverse" : ""
            )}>
              {blockValidation.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              )}
              <span>{blockValidation.message}</span>
            </div>

            {/* Form Fields */}
            <div className="space-y-5">
              {(currentBlock.type === 'text' || showTitleField) && (
                <div className={isRTL ? 'text-right' : ''}>
                  <Label className="text-xs font-semibold">{t('title', 'Title')}</Label>
                  <Input
                    value={currentBlock.title}
                    onChange={(e) => setCurrentBlock({ ...currentBlock, title: e.target.value })}
                    placeholder={currentBlock.type === 'text' ? t('title', 'Lesson Title') : t('builder.labelOptionalHint', 'Optional display label')}
                    className={cn("mt-1", isRTL ? 'text-right' : '')}
                  />
                  {currentBlock.type !== 'text' && (
                    <p className="text-[11px] text-muted-foreground mt-1">{t('builder.labelOptionalHint', 'Optional display label')}</p>
                  )}
                </div>
              )}

              {currentBlock.type !== 'text' && !showTitleField && (
                <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
                  <span className="text-xs text-muted-foreground">{t('builder.labelOptionalHint', 'Optional display label')}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTitleField(true)}
                    className={cn("h-7 px-2.5 text-xs font-semibold", isRTL ? "flex-row-reverse" : "")}
                  >
                    {currentBlock.title?.trim() ? t('builder.editLabel', 'Edit label') : t('builder.addLabel', 'Add label')}
                  </Button>
                </div>
              )}

              {/* Type: Quiz */}
              {currentBlock.type === 'quiz' && (
                <div className={cn("bg-purple-50/70 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-100 dark:border-purple-900/50 space-y-2", isRTL ? 'text-right' : '')}>
                  <Label className="text-xs font-bold text-purple-900 dark:text-purple-300">{t('builder.selectQuiz', 'Link Knowledge Quiz')}</Label>
                  <div className="mt-1.5 text-left">
                    <Select
                      value={(currentBlock.content_data?.quiz_id as string) || ''}
                      onValueChange={(val) => {
                        const quiz = availableQuizzes?.find(q => q.id === val)
                        setCurrentBlock({
                          ...currentBlock,
                          title: (!currentBlock.title || currentBlock.title === 'Quiz') ? (quiz?.title || '') : currentBlock.title,
                          content_data: { ...currentBlock.content_data, quiz_id: val }
                        })
                      }}
                    >
                      <SelectTrigger className={cn("bg-white dark:bg-slate-950 border-purple-200 dark:border-purple-800 text-xs", isRTL ? "flex-row-reverse" : "")}>
                        <SelectValue placeholder={t('builder.selectQuizPlaceholder', 'Choose a published quiz...')} />
                      </SelectTrigger>
                      <SelectContent>
                        {quizOptions.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground text-center">{t('builder.noQuizzesFound', 'No published quizzes found')}</div>
                        ) : (
                          quizOptions.map(q => (
                            <SelectItem key={q.id} value={q.id} className={isRTL ? "flex-row-reverse" : ""}>
                              <span className="font-medium text-xs">{q.title}</span>
                              <span className={cn("text-[11px] text-slate-500", isRTL ? "me-2" : "ms-2")}>
                                ({(q as unknown as { question_count?: number }).question_count ?? 0} {(q as unknown as { question_count?: number }).question_count === 1 ? t('builder.question', { defaultValue: 'question' }) : t('builder.questions', { defaultValue: 'questions' })})
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[11px] text-purple-700 dark:text-purple-400">
                    {t('builder.quizEmbedHint', 'Select a quiz from the Knowledge Bank to embed in this training module.')}
                  </p>
                </div>
              )}

              {/* Type: SOP Reference */}
              {currentBlock.type === 'sop_reference' && (() => {
                const selectedSopId = (currentBlock.content_data?.sop_id as string) || ''
                const selectedSop = availableSOPs?.find(s => s.id === selectedSopId)
                const filteredSops = sopSearchTerm.trim()
                  ? sopOptions.filter(s => s.title.toLowerCase().includes(sopSearchTerm.toLowerCase()))
                  : sopOptions

                return (
                  <div className={cn("bg-emerald-50/70 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 space-y-3", isRTL ? 'text-right' : '')}>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4 text-emerald-600" />
                        <span>{t('builder.selectSop', 'Link SOP Document')}</span>
                      </Label>
                      {selectedSop && (
                        <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                          {t('builder.sopLinked', 'SOP Selected')}
                        </Badge>
                      )}
                    </div>

                    {/* Search SOP Filter */}
                    <div className="relative">
                      <Search className={cn("absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-600/70 pointer-events-none", isRTL ? "end-2.5" : "start-2.5")} />
                      <Input
                        placeholder={t('knowledgeBase.searchResources', 'Search SOPs by title...')}
                        value={sopSearchTerm}
                        onChange={(e) => setSopSearchTerm(e.target.value)}
                        className={cn(
                          "h-8 text-xs bg-white dark:bg-slate-950 border-emerald-200 dark:border-emerald-800 shadow-xs",
                          isRTL ? "pe-8 ps-7 text-right" : "ps-8 pe-7 text-left"
                        )}
                      />
                      {sopSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setSopSearchTerm('')}
                          className={cn("absolute top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600", isRTL ? "start-2" : "end-2")}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* SOP Dropdown */}
                    <div className="text-left">
                      <Select
                        value={selectedSopId}
                        onValueChange={(val) => {
                          const sop = availableSOPs?.find(s => s.id === val)
                          setCurrentBlock({
                            ...currentBlock,
                            title: (!currentBlock.title || currentBlock.title === 'SOP Reference') ? (sop?.title || '') : currentBlock.title,
                            content_data: { ...currentBlock.content_data, sop_id: val }
                          })
                        }}
                      >
                        <SelectTrigger className={cn("bg-white dark:bg-slate-950 border-emerald-200 dark:border-emerald-800 text-xs h-9", isRTL ? "flex-row-reverse" : "")}>
                          <SelectValue placeholder={t('builder.selectSopPlaceholder', 'Choose a published SOP...')} />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {filteredSops.length === 0 ? (
                            <div className="p-3 text-xs text-muted-foreground text-center">
                              {sopSearchTerm ? t('knowledgeBase.noResultsFilter', 'No SOPs match your search') : t('builder.noSopsFound', 'No published SOPs found')}
                            </div>
                          ) : (
                            filteredSops.map(s => (
                              <SelectItem key={s.id} value={s.id} className={isRTL ? "flex-row-reverse" : ""}>
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span className="font-medium text-xs truncate">{s.title}</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedSop && (
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{selectedSop.title}</p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400">ID: {selectedSop.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      {t('builder.sopEmbedHint', 'Select a published SOP to reference. Trainees will see the live content from the SOP.')}
                    </p>
                  </div>
                )
              })()}

              {/* Type: Roleplay Simulation */}
              {currentBlock.type === 'roleplay' && (() => {
                const selectedScenarioId = (currentBlock.content_data?.scenario_id as string) || HOTEL_ROLEPLAY_SCENARIOS[0].id
                const selectedScenario = HOTEL_ROLEPLAY_SCENARIOS.find(s => s.id === selectedScenarioId) || HOTEL_ROLEPLAY_SCENARIOS[0]
                const passingScore = Number(currentBlock.content_data?.passing_score ?? 80)
                const maxTurns = Number(currentBlock.content_data?.max_turns ?? 5)

                return (
                  <div className={cn("bg-amber-50/70 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-3", isRTL ? 'text-right' : '')}>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-amber-600" />
                        <span>{t('builder.roleplayConfig', 'AI Guest Roleplay Configuration')}</span>
                      </Label>
                      <Badge variant="outline" className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300">
                        {selectedScenario.department.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    {/* Scenario Selector */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {t('builder.selectScenario', 'Hotel Dilemma Scenario')}
                      </Label>
                      <Select
                        value={selectedScenarioId}
                        onValueChange={(val) => {
                          const scen = HOTEL_ROLEPLAY_SCENARIOS.find(s => s.id === val)
                          setCurrentBlock({
                            ...currentBlock,
                            title: (!currentBlock.title || currentBlock.title === 'AI Roleplay' || currentBlock.title === 'Roleplay Simulation') ? (scen?.title || '') : currentBlock.title,
                            content_data: {
                              ...currentBlock.content_data,
                              scenario_id: val,
                              department: scen?.department,
                              passing_score: passingScore,
                              max_turns: maxTurns,
                            }
                          })
                        }}
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-950 border-amber-200 dark:border-amber-800 text-xs h-9">
                          <SelectValue placeholder="Choose a hotel scenario..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {HOTEL_ROLEPLAY_SCENARIOS.map((scen) => (
                            <SelectItem key={scen.id} value={scen.id}>
                              <span className="font-medium">{scen.title}</span>
                              <span className="text-[10px] text-muted-foreground ms-2">({scen.department.replace(/_/g, ' ')})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Scenario Briefing Preview */}
                    <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-800/40 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-foreground">Guest: {selectedScenario.guestName}</span>
                        <span className="text-muted-foreground">Temperament: <strong className="text-amber-700 dark:text-amber-300">{selectedScenario.guestTemperament}</strong></span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {selectedScenario.scenarioContext}
                      </p>
                    </div>

                    {/* Thresholds: Passing Score & Max Turns */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Passing Score (%)</Label>
                        <Select
                          value={String(passingScore)}
                          onValueChange={(val) => {
                            setCurrentBlock({
                              ...currentBlock,
                              content_data: {
                                ...currentBlock.content_data,
                                scenario_id: selectedScenarioId,
                                passing_score: Number(val),
                              }
                            })
                          }}
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-950 border-amber-200 dark:border-amber-800 text-xs h-8 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="70">70% (Standard)</SelectItem>
                            <SelectItem value="75">75% (Proficient)</SelectItem>
                            <SelectItem value="80">80% (Forbes 5-Star Benchmark)</SelectItem>
                            <SelectItem value="85">85% (Luxury Mastery)</SelectItem>
                            <SelectItem value="90">90% (Executive Excellence)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Max Dialogue Turns</Label>
                        <Select
                          value={String(maxTurns)}
                          onValueChange={(val) => {
                            setCurrentBlock({
                              ...currentBlock,
                              content_data: {
                                ...currentBlock.content_data,
                                scenario_id: selectedScenarioId,
                                max_turns: Number(val),
                              }
                            })
                          }}
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-950 border-amber-200 dark:border-amber-800 text-xs h-8 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 Turns (Rapid De-escalation)</SelectItem>
                            <SelectItem value="5">5 Turns (Standard Assessment)</SelectItem>
                            <SelectItem value="8">8 Turns (Comprehensive Case)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      Trainees will engage in a live roleplay in the Course Player and must score &ge; {passingScore}% on Forbes & Saudi Karam rubrics to complete this block.
                    </p>
                  </div>
                )
              })()}

              {/* Type: Rich Text */}
              {currentBlock.type === 'text' && (
                <div className={isRTL ? 'text-right' : ''}>
                  <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
                    <Label className="text-xs font-semibold">{t('content', 'Content')}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isGeneratingContent}
                      onClick={handleAIGenerateLessonContent}
                      className="h-6 text-[11px] px-2 text-purple-700 hover:bg-purple-50"
                    >
                      {isGeneratingContent ? (
                        <Loader2 className="w-3 h-3 animate-spin me-1" />
                      ) : (
                        <Sparkles className="w-3 h-3 me-1" />
                      )}
                      {t('builder.aiGenerateContent', 'AI Generate Lesson / SOP')}
                    </Button>
                  </div>
                  <Suspense fallback={<div className="h-48 border rounded-lg animate-pulse bg-slate-50 mt-2" />}>
                    <RichTextEditor
                      value={currentBlock.content}
                      onChange={(val) => setCurrentBlock({ ...currentBlock, content: val })}
                      placeholder={t('content', 'Write lesson guidelines, SOP steps, or instructions...')}
                      className="mt-2 text-left"
                      minHeight={260}
                      direction={isRTL ? 'rtl' : 'ltr'}
                    />
                  </Suspense>
                  <p className="text-[11px] text-muted-foreground mt-1.5">{t('builder.contentHint', 'Supports smart headings, bullet points, callouts, and Arabic text.')}</p>
                </div>
              )}

              {/* Type: Video */}
              {currentBlock.type === 'video' && (
                <div className={isRTL ? 'text-right' : ''}>
                  <Label className="text-xs font-semibold">{t('builder.videoUrl', 'Video URL')}</Label>
                  <div className="space-y-3 mt-1.5">
                    <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                      <Button type="button" size="sm" variant={mediaInputMode === 'upload' ? 'default' : 'outline'} onClick={() => setMediaInputMode('upload')} className="h-7 text-xs font-semibold">
                        {t('builder.uploadFile', 'Upload file')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={mediaInputMode === 'library' ? 'default' : 'outline'}
                        onClick={() => { setMediaInputMode('library'); setShowVideoMediaPicker(true) }}
                        className="h-7 text-xs font-semibold"
                      >
                        {t('builder.mediaLibrary', 'Media Library')}
                      </Button>
                      <Button type="button" size="sm" variant={mediaInputMode === 'link' ? 'default' : 'outline'} onClick={() => setMediaInputMode('link')} className="h-7 text-xs font-semibold">
                        {t('builder.useLink', 'Use link')}
                      </Button>
                    </div>

                    {mediaInputMode === 'link' ? (
                      <Input
                        value={currentBlock.content_url}
                        onChange={(e) => {
                          const url = e.target.value
                          const nextTitle = currentBlock.title?.trim() ? currentBlock.title : deriveTitleFromUrl(url)
                          setCurrentBlock({ ...currentBlock, content_url: url, title: nextTitle })
                        }}
                        placeholder="https://..."
                        className={isRTL ? "text-right" : ""}
                      />
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <Input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} disabled={uploading} className="hidden" id="slideover-video-upload" />
                          <label htmlFor="slideover-video-upload" className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Upload className="w-4 h-4 text-slate-500" />
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{uploading ? t('uploading') : t('uploadVideo', 'Upload Video File')}</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Type: Image */}
              {currentBlock.type === 'image' && (
                <div className={isRTL ? 'text-right' : ''}>
                  <Label className="text-xs font-semibold">{t('builder.imageUrl', 'Image URL')}</Label>
                  <div className="space-y-3 mt-1.5">
                    <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                      <Button type="button" size="sm" variant={mediaInputMode === 'upload' ? 'default' : 'outline'} onClick={() => setMediaInputMode('upload')} className="h-7 text-xs font-semibold">
                        {t('builder.uploadFile', 'Upload file')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={mediaInputMode === 'library' ? 'default' : 'outline'}
                        onClick={() => { setMediaInputMode('library'); setShowImageMediaPicker(true) }}
                        className="h-7 text-xs font-semibold"
                      >
                        {t('builder.mediaLibrary', 'Media Library')}
                      </Button>
                      <Button type="button" size="sm" variant={mediaInputMode === 'link' ? 'default' : 'outline'} onClick={() => setMediaInputMode('link')} className="h-7 text-xs font-semibold">
                        {t('builder.useLink', 'Use link')}
                      </Button>
                    </div>

                    {mediaInputMode === 'link' ? (
                      <Input
                        value={currentBlock.content_url}
                        onChange={(e) => {
                          const url = e.target.value
                          const nextTitle = currentBlock.title?.trim() ? currentBlock.title : deriveTitleFromUrl(url)
                          setCurrentBlock({ ...currentBlock, content_url: url, title: nextTitle })
                        }}
                        placeholder="https://..."
                        className={isRTL ? "text-right" : ""}
                      />
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} disabled={uploading} className="hidden" id="slideover-image-upload" />
                          <label htmlFor="slideover-image-upload" className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Upload className="w-4 h-4 text-slate-500" />
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{uploading ? t('uploading') : t('uploadImage', 'Upload Image File')}</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Type: Document Link */}
              {currentBlock.type === 'document_link' && (
                <div className={isRTL ? 'text-right' : ''}>
                  <Label className="text-xs font-semibold">{t('builder.documentUrl', 'Document URL')}</Label>
                  <div className="space-y-3 mt-1.5">
                    <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                      <Button type="button" size="sm" variant={mediaInputMode === 'upload' ? 'default' : 'outline'} onClick={() => setMediaInputMode('upload')} className="h-7 text-xs font-semibold">
                        {t('builder.uploadFile', 'Upload file')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={mediaInputMode === 'library' ? 'default' : 'outline'}
                        onClick={() => { setMediaInputMode('library'); setShowDocumentPicker(true) }}
                        className="h-7 text-xs font-semibold"
                      >
                        {t('builder.documentLibrary', 'Document Library')}
                      </Button>
                      <Button type="button" size="sm" variant={mediaInputMode === 'link' ? 'default' : 'outline'} onClick={() => setMediaInputMode('link')} className="h-7 text-xs font-semibold">
                        {t('builder.useLink', 'Use link')}
                      </Button>
                    </div>

                    {mediaInputMode === 'link' ? (
                      <Input
                        value={currentBlock.content_url}
                        onChange={(e) => {
                          const url = e.target.value
                          const nextTitle = currentBlock.title?.trim() ? currentBlock.title : deriveTitleFromUrl(url)
                          setCurrentBlock({ ...currentBlock, content_url: url, title: nextTitle })
                        }}
                        placeholder="https://..."
                        className={isRTL ? "text-right" : ""}
                      />
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <Input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(e) => handleFileUpload(e, 'document')} disabled={uploading} className="hidden" id="slideover-doc-upload" />
                          <label htmlFor="slideover-doc-upload" className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Upload className="w-4 h-4 text-slate-500" />
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{uploading ? t('uploading') : t('uploadDocument', 'Upload Document File')}</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Type: Assignment / Practical */}
              {(currentBlock.type === 'assignment' || currentBlock.type === 'practical') && (
                <div className={cn("space-y-4 bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200/70 dark:border-amber-900/50", isRTL ? 'text-right' : '')}>
                  <div>
                    <Label className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      {t('builder.assignmentPrompt', 'Assignment Instructions & Prompt')}
                    </Label>
                    <Textarea
                      value={(currentBlock.content_data?.instructions as string) || currentBlock.content}
                      onChange={(e) => setCurrentBlock({
                        ...currentBlock,
                        content: e.target.value,
                        content_data: {
                          ...currentBlock.content_data,
                          instructions: e.target.value,
                          is_assignment: true
                        }
                      })}
                      placeholder={t('builder.assignmentPromptPlaceholder', 'Describe what the learner must produce, submit, or demonstrate...')}
                      className="mt-1.5 min-h-[100px] text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t('builder.evaluationRubric', 'Evaluation Rubric / Criteria')}
                    </Label>
                    <Textarea
                      value={(currentBlock.content_data?.rubric as string) || ''}
                      onChange={(e) => setCurrentBlock({
                        ...currentBlock,
                        content_data: {
                          ...currentBlock.content_data,
                          rubric: e.target.value
                        }
                      })}
                      placeholder={t('builder.rubricPlaceholder', 'Criteria used by instructor to grade this assignment...')}
                      className="mt-1 min-h-[70px] text-xs"
                    />
                  </div>

                  <div className={cn("flex items-center justify-between pt-2 border-t border-amber-200/50", isRTL ? "flex-row-reverse" : "")}>
                    <div>
                      <p className="text-xs font-semibold text-hotel-navy">
                        {t('builder.requiresInstructorApproval', 'Requires Trainer Approval')}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t('builder.requiresApprovalHint', 'Module completion will pause until an instructor grades & approves the submission.')}
                      </p>
                    </div>
                    <Switch
                      checked={(currentBlock.content_data?.requires_instructor_approval as boolean) !== false}
                      onCheckedChange={(checked) => setCurrentBlock({
                        ...currentBlock,
                        content_data: {
                          ...currentBlock.content_data,
                          requires_instructor_approval: checked
                        }
                      })}
                    />
                  </div>
                </div>
              )}

              {/* Optional Settings Collapsible */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvancedBlockOptions(!showAdvancedBlockOptions)}
                  className={cn(
                    "w-full px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center justify-between hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors",
                    isRTL ? "flex-row-reverse text-right" : "text-left"
                  )}
                >
                  <span>{t('builder.optionalSettings', 'Duration & Scoring Settings')}</span>
                  <span className="text-[11px] font-semibold text-hotel-gold">
                    {showAdvancedBlockOptions ? t('builder.hideOptionalSettings', 'Hide') : t('builder.showOptionalSettings', 'Configure')}
                  </span>
                </button>

                {showAdvancedBlockOptions && (
                  <div className={cn("p-4 space-y-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950", isRTL ? 'text-right' : '')}>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={isRTL ? 'text-right' : ''}>
                        <Label className="text-xs font-semibold">{t('duration', 'Duration')}</Label>
                        <div className="relative mt-1">
                          <Input
                            type="number"
                            value={currentBlock.duration || ''}
                            onChange={(e) => setCurrentBlock({ ...currentBlock, duration: parseInt(e.target.value) || 0 })}
                            placeholder="10"
                            className={cn(isRTL ? "ps-8 text-right" : "pe-8")}
                          />
                          <span className={cn("absolute top-2.5 text-slate-400 text-xs", isRTL ? "start-3" : "end-3")}>{t('min', 'min')}</span>
                        </div>
                      </div>
                      <div className={isRTL ? 'text-right' : ''}>
                        <Label className="text-xs font-semibold">{t('points', 'Points')}</Label>
                        <div className="relative mt-1">
                          <Input
                            type="number"
                            value={currentBlock.points || ''}
                            onChange={(e) => setCurrentBlock({ ...currentBlock, points: parseInt(e.target.value) || 0 })}
                            placeholder="1"
                            className={cn(isRTL ? "ps-8 text-right" : "pe-8")}
                          />
                          <span className={cn("absolute top-2.5 text-slate-400 text-xs", isRTL ? "start-3" : "end-3")}>{t('pts', 'pts')}</span>
                        </div>
                      </div>
                    </div>

                    {currentBlock.type !== 'text' && currentBlock.type !== 'quiz' && currentBlock.type !== 'sop_reference' && (
                      <div>
                        <Label className="text-xs font-semibold">{t('builder.optionalNotes', 'Optional notes')}</Label>
                        <Textarea
                          value={currentBlock.content}
                          onChange={(e) => setCurrentBlock({ ...currentBlock, content: e.target.value })}
                          placeholder={t('builder.optionalNotesHint', 'Add short guidance if needed')}
                          rows={2}
                          className={cn("mt-1.5 text-xs bg-white dark:bg-slate-950", isRTL ? 'text-right' : '')}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mandatory Switch */}
              <div className={cn("flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3", isRTL ? "flex-row-reverse" : "")}>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{t('builder.mandatory', 'Mandatory Lesson')}</div>
                  <div className="text-[11px] text-muted-foreground">{t('builder.mandatoryHint', 'Require completion before proceeding.')}</div>
                </div>
                <Switch checked={currentBlock.is_mandatory} onCheckedChange={(checked) => setCurrentBlock({ ...currentBlock, is_mandatory: checked })} />
              </div>
            </div>
          </div>

          {/* Bottom Sticky Action Bar */}
          <div className={cn("flex items-center justify-between gap-3 pt-4 mt-6 border-t border-slate-100 dark:border-slate-800", isRTL ? 'flex-row-reverse' : '')}>
            <Button variant="ghost" size="sm" onClick={handleSaveBlockToLibrary} className="text-xs text-slate-600 hover:text-slate-900">
              {t('builder.saveToLibrary', 'Save to library')}
            </Button>
            <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs font-semibold">
                {t('cancel', 'Cancel')}
              </Button>
              <Button onClick={saveContent} size="sm" className="text-xs font-bold bg-hotel-gold hover:bg-hotel-gold/90 text-hotel-navy">
                {selectedContent ? t('save', 'Save Changes') : t('builder.addContent', 'Add to Section')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <MediaPicker
        open={showVideoMediaPicker}
        onOpenChange={setShowVideoMediaPicker}
        onSelect={(assets: MediaAsset[]) => {
          if (assets.length > 0 && currentBlock) {
            setCurrentBlock({ ...currentBlock, content_url: assets[0].public_url })
          }
        }}
        config={{ allowedTypes: ['video'], multiple: false, category: 'training' }}
        title={t('builder.selectVideo', 'Select Video from Library')}
      />

      <MediaPicker
        open={showImageMediaPicker}
        onOpenChange={setShowImageMediaPicker}
        onSelect={(assets: MediaAsset[]) => {
          if (assets.length > 0 && currentBlock) {
            const chosen = assets[0]
            setCurrentBlock({
              ...currentBlock,
              content_url: chosen.storage_path || chosen.public_url,
              title: currentBlock.title?.trim() ? currentBlock.title : chosen.title
            })
          }
        }}
        config={{ allowedTypes: ['image'], multiple: false, category: 'training' }}
        title={t('builder.selectImage', 'Select Image from Library')}
      />

      <DocumentPicker
        open={showDocumentPicker}
        onOpenChange={setShowDocumentPicker}
        onSelect={(docs: Document[]) => {
          if (docs.length > 0 && currentBlock) {
            setCurrentBlock({ ...currentBlock, content_url: docs[0].file_url, title: docs[0].title })
          }
        }}
        config={{ allowedTypes: ['pdf', 'doc', 'docx'], multiple: false }}
        title={t('builder.selectDocument', 'Select Document from Library')}
      />
    </>
  )
}
