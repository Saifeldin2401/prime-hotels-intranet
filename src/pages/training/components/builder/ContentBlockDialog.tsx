import { AIQuestionGenerator } from '@/components/questions/AIQuestionGenerator'
import { DocumentPicker } from '@/components/documents/DocumentPicker'
import { MediaPicker } from '@/components/media/MediaPicker'
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
import { AlertTriangle, CheckCircle2, Upload } from 'lucide-react'
import { lazy, Suspense } from 'react'
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
                        title: (!currentBlock.title || currentBlock.title === 'Quiz') ? (quiz?.title || '') : currentBlock.title,
                        content_data: { ...currentBlock.content_data, quiz_id: val }
                      })
                    }}
                  >
                    <SelectTrigger className={cn("bg-white border-blue-200", isRTL ? "flex-row-reverse" : "")}>
                      <SelectValue placeholder={t('builder.selectQuizPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {quizOptions.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500 text-center">{t('builder.noQuizzesFound')}</div>
                      ) : (
                        quizOptions.map(q => (
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
                      {sopOptions.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500 text-center">{t('builder.noSopsFound')}</div>
                      ) : (
                        sopOptions.map(s => (
                          <SelectItem key={s.id} value={s.id} className={isRTL ? "flex-row-reverse" : ""}>
                            <span className="font-medium">{s.title}</span>
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
