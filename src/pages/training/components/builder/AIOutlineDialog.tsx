import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useGenerateModuleOutline } from '@/hooks/useAIModuleOutline'
import { AVAILABLE_COURSE_AI_MODELS, COURSE_ARCHETYPES, type CourseArchetype, type ModuleOutlineSection } from '@/lib/gemini'
import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUp, Cpu, FileQuestion, Loader2, RefreshCw, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ContentBlockForm, ContentType, TrainingSection } from './trainingBuilderTypes'

interface AIOutlineDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  setSections: React.Dispatch<React.SetStateAction<TrainingSection[]>>
  setActiveSection: (v: string | null) => void
  isRTL: boolean
}

// Local editable draft shape -- an AI-suggested section plus a stable local
// id, an `include` toggle so the author can drop sections before inserting,
// and the section's original position in the AI response (kept stable even
// if the author reorders/removes sections, so quiz checkpoint suggestions
// still line up with the right section).
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

const BLOCK_TYPE_OPTIONS: { value: ModuleOutlineSection['suggestedBlockType']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'video', label: 'Video' },
  { value: 'document_link', label: 'Document' }
]

export function AIOutlineDialog({
  open,
  onOpenChange,
  title,
  setTitle,
  description,
  setDescription,
  setSections,
  setActiveSection,
  isRTL
}: AIOutlineDialogProps) {
  const { t } = useTranslation('training')
  const { toast } = useToast()
  const generateOutline = useGenerateModuleOutline()

  const [sourceContent, setSourceContent] = useState('')
  const [targetLanguage, setTargetLanguage] = useState('English')
  const [courseArchetype, setCourseArchetype] = useState<CourseArchetype>('sop')
  const [preferredModel, setPreferredModel] = useState('auto')
  const [activeModelUsed, setActiveModelUsed] = useState('')
  const [fallbackTriggered, setFallbackTriggered] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftSections, setDraftSections] = useState<DraftSection[]>([])
  const [draftCheckpoints, setDraftCheckpoints] = useState<DraftCheckpoint[]>([])
  const [hasResult, setHasResult] = useState(false)

  const resetDraft = () => {
    setDraftTitle('')
    setDraftDescription('')
    setDraftSections([])
    setDraftCheckpoints([])
    setHasResult(false)
    setFallbackTriggered(false)
    setActiveModelUsed('')
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetDraft()
      setSourceContent('')
    }
    onOpenChange(next)
  }

  const handleGenerate = async () => {
    if (!sourceContent.trim()) {
      toast({
        title: t('common:error', 'Error'),
        description: t('builder.outlineNeedsContent', 'Paste some source content first.'),
        variant: 'destructive'
      })
      return
    }

    try {
      setFallbackTriggered(false)
      const outline = await generateOutline.mutateAsync({
        sourceContent,
        targetLanguage,
        archetype: courseArchetype,
        preferredModel,
        onFallbackModelEngaged: (failedModel, nextModel) => {
          setFallbackTriggered(true)
          toast({
            title: t('builder.modelFailoverActive', 'AI Fallback Engaged'),
            description: t('builder.modelFailoverDesc', {
              failed: failedModel.split('/')[1] || failedModel,
              next: nextModel.split('/')[1] || nextModel,
              defaultValue: `Primary model was busy. Automatically switched to fallback model (${nextModel.split('/')[1] || nextModel}).`
            })
          })
        }
      })
      const timestamp = Date.now()

      setActiveModelUsed(outline.meta?.modelUsed || (preferredModel === 'auto' ? 'Gemini 2.0 Flash' : preferredModel))
      if (outline.meta?.fallbackOccurred) {
        setFallbackTriggered(true)
      }

      setDraftTitle(outline.title)
      setDraftDescription(outline.description)
      setDraftSections(outline.sections.map((section, index) => ({
        ...section,
        id: `draft-section-${timestamp}-${index}`,
        include: true,
        originalIndex: index
      })))
      setDraftCheckpoints(outline.suggestedQuizCheckpoints.map((checkpoint, index) => ({
        ...checkpoint,
        id: `draft-checkpoint-${timestamp}-${index}`,
        include: false
      })))
      setHasResult(true)
    } catch {
      // useGenerateModuleOutline already surfaces a toast on error
    }
  }

  const updateSection = (id: string, patch: Partial<DraftSection>) => {
    setDraftSections(prev => prev.map(section => (section.id === id ? { ...section, ...patch } : section)))
  }

  const removeSection = (id: string) => {
    setDraftSections(prev => prev.filter(section => section.id !== id))
  }

  const moveSection = (index: number, direction: number) => {
    setDraftSections(prev => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      next.splice(target, 0, removed)
      return next
    })
  }

  const toggleCheckpoint = (id: string, include: boolean) => {
    setDraftCheckpoints(prev => prev.map(checkpoint => (checkpoint.id === id ? { ...checkpoint, include } : checkpoint)))
  }

  const handleInsert = () => {
    const includedSections = draftSections.filter(section => section.include)
    if (includedSections.length === 0) {
      toast({
        title: t('common:error', 'Error'),
        description: t('builder.outlineNoSections', 'Include at least one section to insert.'),
        variant: 'destructive'
      })
      return
    }

    const timestamp = Date.now()
    const newSections: TrainingSection[] = includedSections.map((section, index) => {
      const blockType: ContentType = (section.suggestedBlockType === 'scenario' || !section.suggestedBlockType)
        ? 'text'
        : (section.suggestedBlockType as ContentType)

      const primaryBlock: ContentBlockForm = {
        id: `content-${timestamp}-${index}`,
        type: blockType,
        title: section.heading,
        content: (section as unknown as { rich_content?: string }).rich_content || section.summary || '',
        content_url: '',
        content_data: {},
        is_mandatory: true,
        order: 0
      }

      const items: ContentBlockForm[] = [primaryBlock]

      // Any included quiz checkpoints suggested to follow this section become
      // an empty "quiz" placeholder block -- the author attaches a real quiz
      // to it afterwards via the normal content block editor. This keeps the
      // feature structural (a skeleton to flesh out) rather than generating
      // an actual quiz behind the scenes.
      draftCheckpoints
        .filter(checkpoint => checkpoint.include && checkpoint.afterSectionIndex === section.originalIndex)
        .forEach((checkpoint, checkpointIndex) => {
          items.push({
            id: `content-${timestamp}-${index}-quiz-${checkpointIndex}`,
            type: 'quiz',
            title: `${t('builder.quizCheckpoint', 'Quiz Checkpoint')}: ${checkpoint.topic}`,
            content: '',
            content_url: '',
            content_data: {},
            is_mandatory: false,
            order: items.length
          })
        })

      return {
        id: `section-${timestamp}-${index}`,
        title: section.heading,
        description: section.summary || '',
        items: items.map((item, itemIndex) => ({ ...item, order: itemIndex })),
        order: 0
      }
    })

    setSections(prev => [
      ...prev,
      ...newSections.map((section, index) => ({ ...section, order: prev.length + index }))
    ])
    setActiveSection(newSections[0]?.id || null)

    if (!title.trim() && draftTitle.trim()) {
      setTitle(draftTitle.trim())
    }
    if (!description.trim() && draftDescription.trim()) {
      setDescription(draftDescription.trim())
    }

    toast({
      title: t('builder.outlineInserted', 'Outline inserted'),
      description: t('builder.outlineInsertedDesc', {
        count: includedSections.length,
        defaultValue: `Added ${includedSections.length} section(s) to the structure. Review and flesh out the content.`
      })
    })

    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={cn('flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
            <Sparkles className="w-5 h-5 text-purple-600" />
            {t('builder.aiOutlineTitle', 'AI Draft Outline')}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('builder.aiOutlineDescription', "Paste an SOP excerpt, meeting notes, or raw text. AI proposes a structure -- title, description, and section headings -- for you to edit and insert. It does not write the finished training copy.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('builder.outlineSourceLabel', 'Source content')}</Label>
            <Textarea
              value={sourceContent}
              onChange={(e) => setSourceContent(e.target.value)}
              placeholder={t('builder.outlineSourcePlaceholder', 'Paste SOP text, meeting notes, or any raw source material here...')}
              rows={8}
              className={isRTL ? 'text-right' : ''}
            />
          </div>

          <div className={cn('grid grid-cols-1 sm:grid-cols-3 gap-3', isRTL ? 'flex-row-reverse' : '')}>
            <div className="space-y-2">
              <Label>{t('builder.outlineLanguageLabel', 'Target language')}</Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">{t('builder.languageEnglish', 'English')}</SelectItem>
                  <SelectItem value="Arabic">{t('builder.languageArabic', 'Arabic')}</SelectItem>
                  <SelectItem value="Bilingual">{t('builder.languageBilingual', 'Bilingual')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('builder.courseArchetype', 'Archetype')}</Label>
              <Select value={courseArchetype} onValueChange={(v: any) => setCourseArchetype(v)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COURSE_ARCHETYPES.map((arch) => (
                    <SelectItem key={arch.id} value={arch.id}>
                      {isRTL ? arch.title_ar : arch.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-600" />
                  <span>{t('builder.aiModelLabel', 'AI Engine')}</span>
                </Label>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{t('builder.failoverActive', 'Active')}</span>
                </span>
              </div>
              <Select value={preferredModel} onValueChange={setPreferredModel}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_COURSE_AI_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{m.name}</span>
                        {m.badge && (
                          <span className="text-[10px] px-1 rounded bg-purple-100 text-purple-800 font-bold">
                            {m.badge}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              onClick={handleGenerate}
              disabled={generateOutline.isPending || !sourceContent.trim()}
              className={cn('bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto', isRTL ? 'flex-row-reverse' : '')}
            >
              {generateOutline.isPending ? (
                <Loader2 className={cn('w-4 h-4 animate-spin', isRTL ? 'ms-2' : 'me-2')} />
              ) : (
                <Sparkles className={cn('w-4 h-4', isRTL ? 'ms-2' : 'me-2')} />
              )}
              {t('builder.generateOutline', 'Generate Outline')}
            </Button>
          </div>

          {hasResult && (
            <div className="space-y-4 border-t pt-4">
              {/* Active Engine Badge */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    <span>Engine: {activeModelUsed ? (activeModelUsed.split('/')[1] || activeModelUsed) : 'Gemini 2.0 Flash'}</span>
                  </Badge>
                  {fallbackTriggered && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-xs font-semibold flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 text-amber-600 animate-pulse" />
                      <span>{t('builder.failoverEngagedBadge', 'Failover Model Engaged')}</span>
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('builder.outlineModuleTitle', 'Suggested module title')}</Label>
                  <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className={isRTL ? 'text-right' : ''} />
                </div>
                <div className="space-y-2">
                  <Label>{t('builder.outlineModuleDescription', 'Suggested module description')}</Label>
                  <Input value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} className={isRTL ? 'text-right' : ''} />
                </div>
              </div>

              <div className="space-y-2">
                <div className={cn('flex items-center justify-between', isRTL ? 'flex-row-reverse' : '')}>
                  <Label className="text-sm font-semibold">{t('builder.outlineSections', 'Sections')}</Label>
                  <Badge variant="secondary">{draftSections.filter(s => s.include).length}/{draftSections.length}</Badge>
                </div>

                {draftSections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('builder.outlineNoSectionsLeft', 'No sections left -- generate again or add sections manually.')}</p>
                ) : (
                  draftSections.map((section, index) => (
                    <Card key={section.id} className={cn('border-slate-200', !section.include && 'opacity-50')}>
                      <CardContent className="py-3">
                        <div className={cn('flex items-start gap-2', isRTL ? 'flex-row-reverse' : '')}>
                          <Checkbox
                            checked={section.include}
                            onCheckedChange={(checked) => updateSection(section.id, { include: !!checked })}
                            className="mt-2"
                          />
                          <div className="flex-1 space-y-2">
                            <div className={cn('flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
                              <Input
                                value={section.heading}
                                onChange={(e) => updateSection(section.id, { heading: e.target.value })}
                                className={cn('flex-1', isRTL ? 'text-right' : '')}
                              />
                              <Select
                                value={section.suggestedBlockType}
                                onValueChange={(value) => updateSection(section.id, { suggestedBlockType: value as ModuleOutlineSection['suggestedBlockType'] })}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {BLOCK_TYPE_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Textarea
                              value={section.summary}
                              onChange={(e) => updateSection(section.id, { summary: e.target.value })}
                              rows={2}
                              className={cn('text-sm', isRTL ? 'text-right' : '')}
                            />
                          </div>
                          <div className={cn('flex flex-col gap-1', isRTL ? 'flex-row-reverse' : '')}>
                            <Button type="button" size="icon" variant="ghost" onClick={() => moveSection(index, -1)} disabled={index === 0} aria-label={t('builder.moveUp')}>
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => moveSection(index, 1)} disabled={index === draftSections.length - 1} aria-label={t('builder.moveDown')}>
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => removeSection(section.id)} aria-label={t('delete')}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {draftCheckpoints.length > 0 && (
                <div className="space-y-2">
                  <Label className={cn('text-sm font-semibold flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
                    <FileQuestion className="w-4 h-4 text-purple-600" />
                    {t('builder.outlineQuizCheckpoints', 'Suggested quiz checkpoints')}
                  </Label>
                  {draftCheckpoints.map(checkpoint => (
                    <div key={checkpoint.id} className={cn('flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2', isRTL ? 'flex-row-reverse' : '')}>
                      <Checkbox
                        checked={checkpoint.include}
                        onCheckedChange={(checked) => toggleCheckpoint(checkpoint.id, !!checked)}
                      />
                      <span className="text-sm text-slate-600">
                        {t('builder.outlineCheckpointLabel', {
                          index: checkpoint.afterSectionIndex + 1,
                          topic: checkpoint.topic,
                          defaultValue: `After section ${checkpoint.afterSectionIndex + 1}: ${checkpoint.topic}`
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('cancel', 'Cancel')}
          </Button>
          {hasResult && (
            <Button onClick={handleInsert} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
              {t('builder.insertIntoBuilder', 'Insert into Builder')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
