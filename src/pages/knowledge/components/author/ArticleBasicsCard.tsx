import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Clock, Hash, Sparkles, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface ContentTypeOption {
  type: string
  label: string
  icon?: string
}

interface ArticleBasicsCardProps {
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  sopCode: string
  estimatedReadTime: number | null
  contentType: string
  editLang: 'en' | 'ar'
  contentTypes: ContentTypeOption[]
  onUpdateField: (field: string, value: any) => void
  showDuplicateWarning: boolean
  duplicateCheckResult?: {
    hasDuplicates: boolean
    duplicates: Array<{ id: string; title: string; similarity: number }>
  } | null
  onDismissDuplicateWarning: () => void
  tagSuggestions: Array<{ tag: string; confidence: string }>
  isGeneratingTags: boolean
  onGenerateTagSuggestions: () => void
  onClearTagSuggestions: () => void
}

export function ArticleBasicsCard({
  title,
  titleAr,
  description,
  descriptionAr,
  sopCode,
  estimatedReadTime,
  contentType,
  editLang,
  contentTypes,
  onUpdateField,
  showDuplicateWarning,
  duplicateCheckResult,
  onDismissDuplicateWarning,
  tagSuggestions,
  isGeneratingTags,
  onGenerateTagSuggestions,
  onClearTagSuggestions,
}: ArticleBasicsCardProps) {
  const { t } = useTranslation(['knowledge', 'common'])

  return (
    <Card className="border-border shadow-xs bg-card">
      <CardContent className="p-4 sm:p-5 space-y-4">
        
        {/* Row 1: Title and Code */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 justify-between">
            <div className="flex-1">
              {editLang === 'en' ? (
                <Input
                  value={title}
                  onChange={(e) => onUpdateField('title', e.target.value)}
                  placeholder={t('editor.title_placeholder', 'e.g. VIP Express Arrival & Luggage Delivery Standard')}
                  className="text-base sm:text-lg font-bold border-none shadow-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/60 h-auto py-1"
                />
              ) : (
                <Input
                  value={titleAr}
                  onChange={(e) => onUpdateField('title_ar', e.target.value)}
                  dir="rtl"
                  placeholder={t('editor.title_placeholder_ar', 'مثال: إجراءات وصول كبار الضيوف وتسليم الأمتعة السريع')}
                  className="text-base sm:text-lg font-bold border-none shadow-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/60 h-auto py-1"
                />
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-muted/30">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={sopCode}
                  onChange={(e) => onUpdateField('sop_code', e.target.value.toUpperCase())}
                  placeholder="SOP-XX-000"
                  className="w-24 text-xs font-mono font-semibold bg-transparent border-none outline-hidden p-0 focus:ring-0"
                />
              </div>

              <div className="flex items-center gap-1 px-2 py-1 rounded-md border bg-muted/30 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{estimatedReadTime || 2} min</span>
              </div>
            </div>
          </div>

          {/* Subtitle / Description */}
          <div>
            {editLang === 'en' ? (
              <Input
                value={description}
                onChange={(e) => onUpdateField('description', e.target.value)}
                placeholder={t('editor.description_placeholder', 'Add a short subtitle or operational purpose (10-15 words)...')}
                className="text-xs text-muted-foreground border-none px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 h-auto py-0.5"
              />
            ) : (
              <Input
                value={descriptionAr}
                onChange={(e) => onUpdateField('description_ar', e.target.value)}
                dir="rtl"
                placeholder={t('editor.description_placeholder_ar', 'أضف عنوانًا فرعيًا موجزًا بالعربية يوضح الغرض التشغيلي...')}
                className="text-xs text-muted-foreground border-none px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 h-auto py-0.5"
              />
            )}
          </div>
        </div>

        {/* Content Format Pills */}
        <div className="space-y-1.5 pt-2 border-t">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Document Format
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {contentTypes.map((cfg) => {
              const isSelected = contentType === cfg.type
              return (
                <button
                  key={cfg.type}
                  type="button"
                  onClick={() => onUpdateField('content_type', cfg.type)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all duration-150 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-hotel-navy text-white shadow-xs border border-hotel-navy dark:bg-hotel-gold dark:text-hotel-navy'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent'
                  }`}
                >
                  <span>{cfg.icon || '📄'}</span>
                  <span>{t(`content_types.${cfg.type}`, cfg.label)}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Duplicate Detection Warning */}
        {showDuplicateWarning && duplicateCheckResult?.hasDuplicates && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 text-xs">
                <p className="font-bold text-amber-800 dark:text-amber-300">
                  {t('editor.duplicate_warning', 'Similar articles already exist')}
                </p>
                <ul className="mt-1 space-y-1">
                  {duplicateCheckResult.duplicates.slice(0, 2).map((dup) => (
                    <li key={dup.id} className="text-amber-700 dark:text-amber-400 flex items-center justify-between">
                      <span className="truncate flex-1">• {dup.title}</span>
                      <Badge variant="outline" className="ms-2 text-[10px]">
                        {dup.similarity}% match
                      </Badge>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-5 text-[11px] text-amber-700 hover:text-amber-900 px-2"
                  onClick={onDismissDuplicateWarning}
                >
                  {t('editor.dismiss_warning', 'Dismiss')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* AI Tag Suggestions */}
        {tagSuggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-muted-foreground font-medium">
              {t('editor.suggested_tags', 'Suggested Tags:')}
            </span>
            {tagSuggestions.map((suggestion) => (
              <Badge
                key={`${suggestion.tag}-${suggestion.confidence}`}
                variant="outline"
                className={`text-[10px] cursor-pointer hover:bg-primary/10 ${
                  suggestion.confidence === 'high' ? 'border-emerald-300 text-emerald-700' : 'border-slate-300 text-slate-600'
                }`}
              >
                #{suggestion.tag}
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onClearTagSuggestions}>
              <X className="w-3 h-3 text-muted-foreground" />
            </Button>
          </div>
        )}

      </CardContent>
    </Card>
  )
}

export default ArticleBasicsCard
