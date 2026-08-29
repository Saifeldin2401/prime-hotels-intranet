import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowRight,
  BookOpen,
  FileText,
  FolderOpen,
  GraduationCap,
  ImageIcon,
  Layers,
  Loader2,
  Rocket,
  Settings2,
  Sparkles,
  Type as TypeIcon,
  UploadCloud,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { StudioSourcePicker, type SourceOption } from './StudioSourcePicker'
import { cn } from '@/lib/utils'

export type QuickThoroughness = 'quick' | 'standard' | 'deep'

/** Department options — kept in sync with StudioStageBasics. */
export const QUICK_DEPARTMENTS: Array<{ value: string; label: string }> = [
  { value: 'front_office', label: 'Front Office & Concierge' },
  { value: 'housekeeping', label: 'Housekeeping & Laundry' },
  { value: 'food_beverage', label: 'Food & Beverage (F&B)' },
  { value: 'kitchen_culinary', label: 'Culinary & Kitchen' },
  { value: 'security_safety', label: 'Security & Safety' },
  { value: 'engineering', label: 'Engineering & Maintenance' },
  { value: 'human_resources', label: 'Human Resources & Talent' },
  { value: 'finance_procurement', label: 'Finance & Procurement' },
  { value: 'sales_marketing', label: 'Sales & Revenue' },
]

/** Audience options — values match the TargetAudience union used by the pipeline. */
export const QUICK_AUDIENCES: Array<{ value: string; label: string }> = [
  { value: 'employees', label: 'Frontline associates' },
  { value: 'managers', label: 'Supervisors & managers' },
  { value: 'executives', label: 'Executive leadership' },
  { value: 'mixed', label: 'All hotel staff' },
]

const THOROUGHNESS_CARDS: Array<{
  id: QuickThoroughness
  title: string
  blurb: string
  meta: string
  icon: React.ElementType
  recommended?: boolean
}> = [
  {
    id: 'quick',
    title: 'Quick refresher',
    blurb: 'Short and focused — a reminder of the key steps.',
    meta: '≈ 15 min · 2 short modules · 1 quiz each',
    icon: Sparkles,
  },
  {
    id: 'standard',
    title: 'Standard course',
    blurb: 'A complete course with lessons, examples and knowledge checks.',
    meta: '≈ 1 hour · 4 modules · quiz per module',
    icon: GraduationCap,
    recommended: true,
  },
  {
    id: 'deep',
    title: 'In-depth program',
    blurb: 'Thorough training with deep practice, scenarios and a final exam.',
    meta: '2+ hours · 5 modules · scenarios + final exam',
    icon: Layers,
  },
]

export type QuickSourceKind = 'topic' | 'knowledge_base' | 'library' | 'upload'

interface StudioQuickStartProps {
  /** where the course content comes from */
  sourceKind: QuickSourceKind
  onChangeSourceKind: (k: QuickSourceKind) => void

  courseTopic: string
  onChangeTopic: (v: string) => void

  selectedDocumentId: string | null
  onSelectDocumentId: (v: string | null) => void
  /** published SOPs / policies / articles from the Knowledge Base */
  knowledgeBaseOptions: SourceOption[]
  /** files from the Document / Media Library */
  libraryOptions: SourceOption[]
  isLoadingDocuments?: boolean

  /** Uploaded file → plain text pushed into the source material */
  uploadedFileName?: string
  onUploadFile: (file: File) => void
  onClearUpload: () => void

  department: string
  onChangeDepartment: (v: string) => void

  audience: string
  onChangeAudience: (v: string) => void

  thoroughness: QuickThoroughness
  onChangeThoroughness: (v: QuickThoroughness) => void

  withImages: boolean
  onChangeWithImages: (v: boolean) => void

  language: 'English' | 'Arabic' | 'Bilingual'
  onChangeLanguage: (v: 'English' | 'Arabic' | 'Bilingual') => void

  onGenerate: () => void
  isGenerating: boolean
  onSwitchToAdvanced: () => void
}

export function StudioQuickStart({
  sourceKind,
  onChangeSourceKind,
  courseTopic,
  onChangeTopic,
  selectedDocumentId,
  onSelectDocumentId,
  knowledgeBaseOptions,
  libraryOptions,
  isLoadingDocuments,
  uploadedFileName,
  onUploadFile,
  onClearUpload,
  department,
  onChangeDepartment,
  audience,
  onChangeAudience,
  thoroughness,
  onChangeThoroughness,
  withImages,
  onChangeWithImages,
  language,
  onChangeLanguage,
  onGenerate,
  isGenerating,
  onSwitchToAdvanced,
}: StudioQuickStartProps) {
  const { t } = useTranslation('training')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const canGenerate =
    !isGenerating &&
    (sourceKind === 'topic'
      ? courseTopic.trim().length > 2
      : sourceKind === 'upload'
        ? Boolean(uploadedFileName)
        : Boolean(selectedDocumentId))

  const docPickerOptions = sourceKind === 'library' ? libraryOptions : knowledgeBaseOptions

  const languageOptions: Array<{ value: 'English' | 'Arabic' | 'Bilingual'; label: string }> = [
    { value: 'English', label: 'English' },
    { value: 'Arabic', label: 'العربية' },
    { value: 'Bilingual', label: t('builder.quick.bothLangs', 'Both') },
  ]

  return (
    <div className="mx-auto w-full max-w-2xl space-y-7 py-2">
      <div className="text-center space-y-1.5">
        <div className="mx-auto w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-md">
          <Rocket className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {t('builder.quick.heading', 'Create a training course')}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t('builder.quick.subheading', 'Answer a few questions and the AI writes the full course. You can edit everything afterwards.')}
        </p>
      </div>

      {/* 1. What to teach */}
      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('builder.quick.step1', '1. What should this course teach?')}
        </Label>

        {/* Source selector — 4 distinct choices */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
          {([
            { k: 'topic' as const, icon: TypeIcon, label: t('builder.quick.srcTopic', 'Describe a topic') },
            { k: 'knowledge_base' as const, icon: BookOpen, label: t('builder.quick.srcKb', 'Knowledge Base') },
            { k: 'library' as const, icon: FolderOpen, label: t('builder.quick.srcLibrary', 'Document Library') },
            { k: 'upload' as const, icon: UploadCloud, label: t('builder.quick.srcUpload', 'Upload a file') },
          ]).map(({ k, icon: Icon, label }) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                onChangeSourceKind(k)
                onSelectDocumentId(null)
                if (k !== 'upload') onClearUpload()
              }}
              className={cn(
                'px-2 py-2 rounded-lg border font-semibold transition-all flex flex-col items-center gap-1 text-center',
                sourceKind === k
                  ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500'
                  : 'bg-card text-muted-foreground hover:border-purple-300 hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[11px] leading-tight">{label}</span>
            </button>
          ))}
        </div>

        {sourceKind === 'topic' && (
          <Textarea
            value={courseTopic}
            onChange={(e) => onChangeTopic(e.target.value)}
            placeholder={t(
              'builder.quick.topicPlaceholder',
              'e.g. Handling VIP guest complaints at the front desk, or Safe food handling for the breakfast team'
            )}
            className="min-h-[84px] text-sm"
          />
        )}

        {(sourceKind === 'knowledge_base' || sourceKind === 'library') && (
          <StudioSourcePicker
            options={docPickerOptions}
            selectedId={selectedDocumentId}
            onSelect={onSelectDocumentId}
            isLoading={isLoadingDocuments}
            placeholder={
              sourceKind === 'library'
                ? t('builder.quick.searchLibrary', 'Search the Document Library…')
                : t('builder.quick.searchKb', 'Search the Knowledge Base…')
            }
            emptyText={
              sourceKind === 'library'
                ? t('builder.quick.noLibrary', 'No documents in the library yet.')
                : t('builder.quick.noKb', 'No articles published yet.')
            }
          />
        )}

        {sourceKind === 'upload' && (
          <div className="space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onUploadFile(f)
              }}
              accept=".pdf,.docx,.doc,.txt,.md,.json,.csv"
              className="hidden"
            />
            {uploadedFileName ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
                <span className="text-xs font-medium text-foreground flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 shrink-0 text-purple-600" />
                  <span className="truncate">{uploadedFileName}</span>
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={onClearUpload} className="h-6 text-[11px] text-red-500 hover:text-red-600">
                  {t('common.remove', 'Remove')}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-10 text-xs font-medium gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5 text-purple-600" />
                {t('builder.quick.upload', 'Choose a file (PDF, Word, text, CSV)')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 2. Who is it for */}
      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('builder.quick.step2', '2. Who is it for?')}
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground">
              {t('builder.quick.department', 'Department')}
            </Label>
            <Select value={department} onValueChange={onChangeDepartment}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUICK_DEPARTMENTS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground">
              {t('builder.quick.audience', 'Who will take it')}
            </Label>
            <Select value={audience} onValueChange={onChangeAudience}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUICK_AUDIENCES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 3. How thorough */}
      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('builder.quick.step3', '3. How thorough should it be?')}
        </Label>
        <div className="grid grid-cols-1 gap-2.5">
          {THOROUGHNESS_CARDS.map((card) => {
            const Icon = card.icon
            const selected = thoroughness === card.id
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onChangeThoroughness(card.id)}
                className={cn(
                  'w-full text-start p-3.5 rounded-xl border transition-all flex items-start gap-3',
                  selected
                    ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 ring-1 ring-purple-500 shadow-xs'
                    : 'bg-card hover:border-purple-300 hover:bg-purple-50/30 dark:hover:bg-purple-950/20'
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-lg shrink-0',
                    selected ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{card.title}</p>
                    {card.recommended && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {t('builder.quick.recommended', 'RECOMMENDED')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.blurb}</p>
                  <p className="text-[11px] text-muted-foreground/80 mt-1 font-mono">{card.meta}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. Images */}
      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('builder.quick.step4', '4. Illustrations')}
        </Label>
        <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                {t('builder.quick.withImagesTitle', 'Add AI images to lessons')}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t('builder.quick.withImagesDesc', 'Generates a matching luxury-hotel photo or diagram for each lesson. Off = faster, text only.')}
              </p>
            </div>
          </div>
          <Switch checked={withImages} onCheckedChange={onChangeWithImages} />
        </div>
      </div>

      {/* 5. Language */}
      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('builder.quick.step5', '5. Language')}
        </Label>
        <div className="flex bg-muted p-0.5 rounded-lg border w-full text-xs">
          {languageOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChangeLanguage(opt.value)}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-md font-semibold transition-all',
                language === opt.value ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-1">
        <Button
          type="button"
          size="lg"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="w-full h-11 text-sm font-bold gap-2 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('builder.quick.generating', 'Creating your course…')}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {t('builder.quick.generate', 'Generate course')}
            </>
          )}
        </Button>

        <button
          type="button"
          onClick={onSwitchToAdvanced}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-purple-600 transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" />
          {t('builder.quick.advanced', 'Need more control? Open advanced setup')}
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
