import { AIQuestionGenerator } from '@/components/questions/AIQuestionGenerator'
import { DocumentPicker } from '@/components/documents/DocumentPicker'
import { MediaPicker } from '@/components/media/MediaPicker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { MediaAsset } from '@/lib/types/media'
import type { Document } from '@/lib/types'
import type { LearningQuiz } from '@/types/learning'
import { HOTEL_ROLEPLAY_SCENARIOS } from '@/lib/ai/roleplayEngine'
import { AlertTriangle, BookOpen, CheckCircle2, MessageSquare, Search, Upload, X } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { deriveTitleFromUrl } from './trainingBuilderUtils'
import type { ContentBlockForm, RecentUpload } from './trainingBuilderTypes'

const RichTextEditor = lazy(() => import('@/components/ui/RichTextEditor'))

interface ContentBlockDialogProps {
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

export function ContentBlockDialog({
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
}: ContentBlockDialogProps) {
  const { t } = useTranslation('training')
  const [showImageMediaPicker, setShowImageMediaPicker] = useState(false)
  const [sopSearchTerm, setSopSearchTerm] = useState('')

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={isRTL ? 'text-right' : ''}>
              {selectedContent ? t('builder.editContent') : t('builder.addContent')}
            </DialogTitle>
            <DialogDescription className={isRTL ? 'text-right' : ''}>
              {t('builder.contentDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-xs",
            blockValidation.ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
            isRTL ? "flex-row-reverse" : ""
          )}>
            {blockValidation.ok ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <span>{blockValidation.message}</span>
          </div>
          <div className="space-y-5 py-4">
            {(currentBlock.type === 'text' || showTitleField) && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('title')}</Label>
                <Input
                  value={currentBlock.title}
                  onChange={(e) => setCurrentBlock({ ...currentBlock, title: e.target.value })}
                  placeholder={currentBlock.type === 'text' ? t('title') : t('builder.labelOptionalHint', 'Optional display label')}
                  className={isRTL ? 'text-right' : ''}
                />
                {currentBlock.type !== 'text' && (
                  <p className="text-xs text-gray-500 mt-1">{t('builder.labelOptionalHint', 'Optional display label')}</p>
                )}
              </div>
            )}
            {currentBlock.type !== 'text' && !showTitleField && (
              <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
                <span className="text-xs text-gray-500">{t('builder.labelOptionalHint', 'Optional display label')}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTitleField(true)}
                  className={cn("h-8 px-3 text-xs", isRTL ? "flex-row-reverse" : "")}
                >
                  {currentBlock.title?.trim() ? t('builder.editLabel', 'Edit label') : t('builder.addLabel', 'Add label')}
                </Button>
              </div>
            )}

            {/* Type: Quiz */}
            {currentBlock.type === 'quiz' && (
              <div className={cn("bg-purple-50 p-4 rounded-md border border-purple-100", isRTL ? 'text-right' : '')}>
                <Label className="text-purple-900">{t('builder.selectQuiz')}</Label>
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
                    <SelectTrigger className={cn("bg-white border-purple-200", isRTL ? "flex-row-reverse" : "")}>
                      <SelectValue placeholder={t('builder.selectQuizPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {quizOptions.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500 text-center">{t('builder.noQuizzesFound')}</div>
                      ) : (
                        quizOptions.map(q => (
                          <SelectItem key={q.id} value={q.id} className={isRTL ? "flex-row-reverse" : ""}>
                            <span className="font-medium">{q.title}</span>
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

            {/* Type: SOP Reference */}
            {currentBlock.type === 'sop_reference' && (() => {
              const selectedSopId = (currentBlock.content_data?.sop_id as string) || ''
              const selectedSop = availableSOPs?.find(s => s.id === selectedSopId)
              const filteredSops = sopSearchTerm.trim()
                ? sopOptions.filter(s => s.title.toLowerCase().includes(sopSearchTerm.toLowerCase()))
                : sopOptions

              return (
                <div className={cn("bg-emerald-50/70 p-4 rounded-xl border border-emerald-100 space-y-3", isRTL ? 'text-right' : '')}>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-emerald-600" />
                      <span>{t('builder.selectSop', 'Link SOP Document')}</span>
                    </Label>
                    {selectedSop && (
                      <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 border-emerald-300">
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
                        "h-8 text-xs bg-white border-emerald-200 shadow-xs",
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
                      <SelectTrigger className={cn("bg-white border-emerald-200 text-xs h-9", isRTL ? "flex-row-reverse" : "")}>
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
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{selectedSop.title}</p>
                        <p className="text-[10px] text-emerald-600">ID: {selectedSop.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-emerald-600 mt-2">
                    {t('builder.sopEmbedHint')}
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
                <div className={cn("bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3", isRTL ? 'text-right' : '')}>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-amber-600" />
                      <span>{t('builder.roleplayConfig', 'AI Guest Roleplay Configuration')}</span>
                    </Label>
                    <Badge variant="outline" className="text-[10px] font-semibold bg-amber-100 text-amber-800 border-amber-300">
                      {selectedScenario.department.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {/* Scenario Selector */}
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[11px] font-semibold text-slate-700">
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
                      <SelectTrigger className="bg-white border-amber-200 text-xs h-9">
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
                  <div className="p-2.5 rounded-lg bg-white border border-amber-200/80 text-xs space-y-1 text-left">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-foreground">Guest: {selectedScenario.guestName}</span>
                      <span className="text-muted-foreground">Temperament: <strong className="text-amber-700">{selectedScenario.guestTemperament}</strong></span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {selectedScenario.scenarioContext}
                    </p>
                  </div>

                  {/* Thresholds */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-left">
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-700">Passing Score (%)</Label>
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
                        <SelectTrigger className="bg-white border-amber-200 text-xs h-8 mt-1">
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
                      <Label className="text-[11px] font-semibold text-slate-700">Max Dialogue Turns</Label>
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
                        <SelectTrigger className="bg-white border-amber-200 text-xs h-8 mt-1">
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

                  <p className="text-[11px] text-amber-800">
                    Trainees will engage in a live roleplay in the Course Player and must score &ge; {passingScore}% on Forbes & Saudi Karam rubrics to complete this block.
                  </p>
                </div>
              )
            })()}

            {currentBlock.type === 'text' && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('content')}</Label>
                <Suspense fallback={<div className="h-48 border rounded animate-pulse bg-slate-50" />}>
                  <RichTextEditor
                    value={currentBlock.content}
                    onChange={(val) => setCurrentBlock({ ...currentBlock, content: val })}
                    placeholder={t('content')}
                    className="mt-2 text-left"
                    minHeight={300}
                    direction={isRTL ? 'rtl' : 'ltr'}
                  />
                </Suspense>
                <p className="text-xs text-gray-500 mt-1">{t('builder.contentHint')}</p>
              </div>
            )}

            {currentBlock.type === 'video' && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('builder.videoUrl', 'Video URL')}</Label>
                <div className="space-y-3">
                  <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                    <Button type="button" size="sm" variant={mediaInputMode === 'upload' ? 'default' : 'outline'} onClick={() => setMediaInputMode('upload')}>
                      {t('builder.uploadFile', 'Upload file')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={mediaInputMode === 'library' ? 'default' : 'outline'}
                      onClick={() => { setMediaInputMode('library'); setShowVideoMediaPicker(true) }}
                    >
                      {t('builder.mediaLibrary', 'Media Library')}
                    </Button>
                    <Button type="button" size="sm" variant={mediaInputMode === 'link' ? 'default' : 'outline'} onClick={() => setMediaInputMode('link')}>
                      {t('builder.useLink', 'Use link')}
                    </Button>
                  </div>
                  {mediaInputMode === 'link' && (
                    <Input
                      value={currentBlock.content_url}
                      onChange={(e) => setCurrentBlock({ ...currentBlock, content_url: e.target.value })}
                      onBlur={(e) => {
                        const derived = deriveTitleFromUrl(e.target.value)
                        if (!currentBlock.title?.trim() && derived) setCurrentBlock({ ...currentBlock, title: derived })
                      }}
                      placeholder="https://youtube.com/watch?v=..."
                      className={isRTL ? 'text-right' : ''}
                    />
                  )}
                  {mediaInputMode === 'upload' && (
                    <div className={`flex items-center gap-2 ${isRTL ? 'justify-end' : ''}`}>
                      <div className="relative">
                        <Input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} disabled={uploading} className="hidden" id="video-upload" />
                        <label htmlFor="video-upload" className={`flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Upload className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{uploading ? t('uploading') : t('builder.uploadVideo', 'Upload Video')}</span>
                        </label>
                      </div>
                    </div>
                  )}
                  {recentUploadsForType.length > 0 && (
                    <div className="rounded-md border border-slate-200 bg-white/80 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.recentUploads', 'Recent uploads')}</div>
                      <div className="mt-2 space-y-2">
                        {recentUploadsForType.map(item => (
                          <button key={item.url} type="button" onClick={() => setCurrentBlock({ ...currentBlock, content_url: item.url, title: currentBlock.title?.trim() ? currentBlock.title : item.name })} className={cn("w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 hover:border-hotel-gold", isRTL ? "text-right" : "text-left")}>
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentBlock.type === 'audio' && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('builder.audioUrl', 'Audio URL')}</Label>
                <div className="space-y-3">
                  <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                    <Button type="button" size="sm" variant={mediaInputMode === 'upload' ? 'default' : 'outline'} onClick={() => setMediaInputMode('upload')}>
                      {t('builder.uploadFile', 'Upload file')}
                    </Button>
                    <Button type="button" size="sm" variant={mediaInputMode === 'link' ? 'default' : 'outline'} onClick={() => setMediaInputMode('link')}>
                      {t('builder.useLink', 'Use link')}
                    </Button>
                  </div>
                  {mediaInputMode === 'link' && (
                    <Input
                      value={currentBlock.content_url}
                      onChange={(e) => setCurrentBlock({ ...currentBlock, content_url: e.target.value })}
                      onBlur={(e) => {
                        const derived = deriveTitleFromUrl(e.target.value)
                        if (!currentBlock.title?.trim() && derived) setCurrentBlock({ ...currentBlock, title: derived })
                      }}
                      placeholder="https://example.com/audio.mp3"
                      className={isRTL ? 'text-right' : ''}
                    />
                  )}
                  {mediaInputMode === 'upload' && (
                    <div className={`flex items-center gap-2 ${isRTL ? 'justify-end' : ''}`}>
                      <div className="relative">
                        <Input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio')} disabled={uploading} className="hidden" id="audio-upload" />
                        <label htmlFor="audio-upload" className={`flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Upload className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{uploading ? t('uploading') : t('builder.uploadAudio', 'Upload Audio')}</span>
                        </label>
                      </div>
                    </div>
                  )}
                  {recentUploadsForType.length > 0 && (
                    <div className="rounded-md border border-slate-200 bg-white/80 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.recentUploads', 'Recent uploads')}</div>
                      <div className="mt-2 space-y-2">
                        {recentUploadsForType.map(item => (
                          <button key={item.url} type="button" onClick={() => setCurrentBlock({ ...currentBlock, content_url: item.url, title: currentBlock.title?.trim() ? currentBlock.title : item.name })} className={cn("w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 hover:border-hotel-gold", isRTL ? "text-right" : "text-left")}>
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentBlock.type === 'interactive' && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('builder.interactiveUrl', 'Interactive URL')}</Label>
                <Input
                  value={currentBlock.content_url}
                  onChange={(e) => setCurrentBlock({ ...currentBlock, content_url: e.target.value })}
                  onBlur={(e) => {
                    const derived = deriveTitleFromUrl(e.target.value)
                    if (!currentBlock.title?.trim() && derived) setCurrentBlock({ ...currentBlock, title: derived })
                  }}
                  placeholder="https://example.com/interactive"
                  className={isRTL ? 'text-right' : ''}
                />
              </div>
            )}

            {currentBlock.type === 'image' && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('builder.imageUrl')}</Label>
                <div className="space-y-3">
                  <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                    <Button type="button" size="sm" variant={mediaInputMode === 'upload' ? 'default' : 'outline'} onClick={() => setMediaInputMode('upload')}>
                      {t('builder.uploadFile', 'Upload file')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={mediaInputMode === 'library' ? 'default' : 'outline'}
                      onClick={() => { setMediaInputMode('library'); setShowImageMediaPicker(true) }}
                    >
                      {t('builder.mediaLibrary', 'Media Library')}
                    </Button>
                    <Button type="button" size="sm" variant={mediaInputMode === 'link' ? 'default' : 'outline'} onClick={() => setMediaInputMode('link')}>
                      {t('builder.useLink', 'Use link')}
                    </Button>
                  </div>
                  {mediaInputMode === 'link' && (
                    <Input
                      value={currentBlock.content_url}
                      onChange={(e) => setCurrentBlock({ ...currentBlock, content_url: e.target.value })}
                      onBlur={(e) => {
                        const derived = deriveTitleFromUrl(e.target.value)
                        if (!currentBlock.title?.trim() && derived) setCurrentBlock({ ...currentBlock, title: derived })
                      }}
                      placeholder="https://example.com/image.jpg"
                      className={isRTL ? 'text-right' : ''}
                    />
                  )}
                  {mediaInputMode === 'upload' && (
                    <div className={`flex items-center gap-2 ${isRTL ? 'justify-end' : ''}`}>
                      <div className="relative">
                        <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} disabled={uploading} className="hidden" id="image-upload" />
                        <label htmlFor="image-upload" className={`flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Upload className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{uploading ? t('uploading') : t('uploadImage')}</span>
                        </label>
                      </div>
                    </div>
                  )}
                  {recentUploadsForType.length > 0 && (
                    <div className="rounded-md border border-slate-200 bg-white/80 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.recentUploads', 'Recent uploads')}</div>
                      <div className="mt-2 space-y-2">
                        {recentUploadsForType.map(item => (
                          <button key={item.url} type="button" onClick={() => setCurrentBlock({ ...currentBlock, content_url: item.url, title: currentBlock.title?.trim() ? currentBlock.title : item.name })} className={cn("w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 hover:border-hotel-gold", isRTL ? "text-right" : "text-left")}>
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentBlock.type === 'document_link' && (
              <div className={isRTL ? 'text-right' : ''}>
                <Label>{t('builder.documentUrl')}</Label>
                <div className="space-y-3">
                  <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                    <Button type="button" size="sm" variant={mediaInputMode === 'upload' ? 'default' : 'outline'} onClick={() => setMediaInputMode('upload')}>
                      {t('builder.uploadFile', 'Upload file')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={mediaInputMode === 'library' ? 'default' : 'outline'}
                      onClick={() => { setMediaInputMode('library'); setShowDocumentPicker(true) }}
                    >
                      {t('builder.documentLibrary', 'Document Library')}
                    </Button>
                    <Button type="button" size="sm" variant={mediaInputMode === 'link' ? 'default' : 'outline'} onClick={() => setMediaInputMode('link')}>
                      {t('builder.useLink', 'Use link')}
                    </Button>
                  </div>
                  {mediaInputMode === 'link' && (
                    <Input
                      value={currentBlock.content_url}
                      onChange={(e) => setCurrentBlock({ ...currentBlock, content_url: e.target.value })}
                      onBlur={(e) => {
                        const derived = deriveTitleFromUrl(e.target.value)
                        if (!currentBlock.title?.trim() && derived) setCurrentBlock({ ...currentBlock, title: derived })
                      }}
                      placeholder="https://example.com/document.pdf"
                      className={isRTL ? 'text-right' : ''}
                    />
                  )}
                  {mediaInputMode === 'upload' && (
                    <div className={`flex items-center gap-2 ${isRTL ? 'justify-end' : ''}`}>
                      <div className="relative">
                        <Input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(e) => handleFileUpload(e, 'document')} disabled={uploading} className="hidden" id="doc-upload" />
                        <label htmlFor="doc-upload" className={`flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Upload className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{uploading ? t('uploading') : t('uploadDocument')}</span>
                        </label>
                      </div>
                    </div>
                  )}
                  {recentUploadsForType.length > 0 && (
                    <div className="rounded-md border border-slate-200 bg-white/80 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.recentUploads', 'Recent uploads')}</div>
                      <div className="mt-2 space-y-2">
                        {recentUploadsForType.map(item => (
                          <button key={item.url} type="button" onClick={() => setCurrentBlock({ ...currentBlock, content_url: item.url, title: currentBlock.title?.trim() ? currentBlock.title : item.name })} className={cn("w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 hover:border-hotel-gold", isRTL ? "text-right" : "text-left")}>
                            {item.name}
                          </button>
                        ))}
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

            <div className="rounded-lg border border-slate-200 bg-slate-50/40">
              <button
                type="button"
                onClick={() => setShowAdvancedBlockOptions(!showAdvancedBlockOptions)}
                className={cn(
                  "w-full px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center justify-between",
                  isRTL ? "flex-row-reverse text-right" : "text-left"
                )}
              >
                <span>{t('builder.optionalSettings', 'Optional settings')}</span>
                <span className="text-[11px] text-slate-400">
                  {showAdvancedBlockOptions ? t('builder.hideOptionalSettings', 'Hide') : t('builder.showOptionalSettings', 'Show')}
                </span>
              </button>
              {showAdvancedBlockOptions && (
                <div className={`grid grid-cols-2 gap-6 px-4 pb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={isRTL ? 'text-right' : ''}>
                    <Label>{t('duration')}</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={currentBlock.duration || ''}
                        onChange={(e) => setCurrentBlock({ ...currentBlock, duration: parseInt(e.target.value) })}
                        placeholder="10"
                        className={cn(isRTL ? "ps-8 text-right" : "pe-8")}
                      />
                      <span className={cn("absolute top-2.5 text-gray-400 text-sm", isRTL ? "start-3" : "end-3")}>{t('min')}</span>
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
                        className={cn(isRTL ? "ps-8 text-right" : "pe-8")}
                      />
                      <span className={cn("absolute top-2.5 text-gray-400 text-sm", isRTL ? "start-3" : "end-3")}>{t('pts')}</span>
                    </div>
                  </div>
                  {currentBlock.type !== 'text' && currentBlock.type !== 'quiz' && currentBlock.type !== 'sop_reference' && (
                    <div className={`col-span-2 ${isRTL ? 'text-right' : ''}`}>
                      <Label>{t('builder.optionalNotes', 'Optional notes')}</Label>
                      <Textarea
                        value={currentBlock.content}
                        onChange={(e) => setCurrentBlock({ ...currentBlock, content: e.target.value })}
                        placeholder={t('builder.optionalNotesHint', 'Add short guidance if needed')}
                        rows={3}
                        className={cn("mt-2 bg-white", isRTL ? 'text-right' : '')}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={cn("flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3", isRTL ? "flex-row-reverse" : "")}>
              <div>
                <div className="text-sm font-semibold text-slate-700">{t('builder.mandatory')}</div>
                <div className="text-xs text-slate-500">{t('builder.mandatoryHint', 'Require completion before proceeding.')}</div>
              </div>
              <Switch checked={currentBlock.is_mandatory} onCheckedChange={(checked) => setCurrentBlock({ ...currentBlock, is_mandatory: checked })} />
            </div>

            <div className={`flex items-center justify-between gap-3 pt-4 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button variant="ghost" size="sm" onClick={handleSaveBlockToLibrary}>
                {t('builder.saveToLibrary', 'Save to library')}
              </Button>
              <div className={cn("flex items-center gap-3", isRTL ? "flex-row-reverse" : "")}>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t('cancel')}
                </Button>
                <Button onClick={saveContent} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                  {selectedContent ? t('save') : t('builder.addContent')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
