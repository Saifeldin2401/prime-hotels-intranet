import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { generateMissingField } from '@/lib/trainingAICompletionEngine'
import type { TrainingTemplate } from './trainingBuilderTypes'

interface StepSetupProps {
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  audience: string
  setAudience: (v: string) => void
  category: string
  setCategory: (v: string) => void
  difficultyLevel: string
  setDifficultyLevel: (v: string) => void
  contentLanguage: string
  setContentLanguage: (v: string) => void
  estimatedDuration: string
  setEstimatedDuration: (v: string) => void
  useEstimatedDuration: boolean
  setUseEstimatedDuration: (v: boolean) => void
  calculatedDuration: number
  validityPeriod: string
  setValidityPeriod: (v: string) => void
  templatePreset: string
  handleTemplateSelection: (v: string) => void
  selectedTemplate: TrainingTemplate | null
  templateStats: { sectionsCount: number; itemsCount: number; sections: Array<{ title: string; count: number }> }
  isTemplatesLoading: boolean
  isTemplatesError: boolean
  templateOptions: TrainingTemplate[]
  setShowTemplatePreview: (v: boolean) => void
  validationChecklist: Array<{ key: string; label: string; ok: boolean }>
  isRTL: boolean
}

export function StepSetup({
  title,
  setTitle,
  description,
  setDescription,
  audience,
  setAudience,
  category,
  setCategory,
  difficultyLevel,
  setDifficultyLevel,
  contentLanguage,
  setContentLanguage,
  estimatedDuration,
  setEstimatedDuration,
  useEstimatedDuration,
  setUseEstimatedDuration,
  calculatedDuration,
  validityPeriod,
  setValidityPeriod,
  templatePreset,
  handleTemplateSelection,
  selectedTemplate,
  templateStats,
  isTemplatesLoading,
  isTemplatesError,
  templateOptions,
  setShowTemplatePreview,
  validationChecklist,
  isRTL,
}: StepSetupProps) {
  const { t } = useTranslation('training')
  const { toast } = useToast()
  const [isSuggestingTitle, setIsSuggestingTitle] = useState(false)
  const [isSuggestingDescription, setIsSuggestingDescription] = useState(false)

  const handleAISuggestTitle = async () => {
    setIsSuggestingTitle(true)
    try {
      const res = await generateMissingField('module_title', {
        department: category || 'Hotel Operations',
        audience: audience || 'all',
        language: isRTL ? 'Arabic' : 'English',
      })
      if (res?.text) {
        setTitle(res.text)
        toast({
          title: '✨ AI Title Generated',
          description: `Set title: "${res.text}"`,
        })
      }
    } catch (e) {
      console.error('Failed to generate title:', e)
    } finally {
      setIsSuggestingTitle(false)
    }
  }

  const handleAISuggestDescription = async () => {
    setIsSuggestingDescription(true)
    try {
      const res = await generateMissingField('module_description', {
        courseTitle: title || 'Hospitality Operational Excellence',
        department: category || 'Hotel Operations',
        audience: audience || 'all',
        language: isRTL ? 'Arabic' : 'English',
      })
      if (res?.text) {
        setDescription(res.text)
        toast({
          title: '✨ AI Description Generated',
          description: 'Added 5-star course description.',
        })
      }
    } catch (e) {
      console.error('Failed to generate description:', e)
    } finally {
      setIsSuggestingDescription(false)
    }
  }

  const durationPresets = ['10', '15', '30', '45', '60', '90']
  const validityPresets = ['30', '90', '180', '365']

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className={cn("text-lg font-semibold", isRTL ? 'text-right' : 'text-left')}>{t('builder.courseSetup')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
                  <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('title')}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSuggestingTitle}
                    onClick={handleAISuggestTitle}
                    className="h-6 text-[11px] px-2 text-purple-700 hover:bg-purple-50"
                  >
                    {isSuggestingTitle ? (
                      <Loader2 className="w-3 h-3 animate-spin me-1" />
                    ) : (
                      <Sparkles className="w-3 h-3 me-1" />
                    )}
                    {t('builder.aiSuggestTitle', 'AI Suggest Title')}
                  </Button>
                </div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('builder.untitledModule')}
                  className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                />
              </div>
              <div className="space-y-2">
                <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.audience')}</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger className={cn("bg-white border-slate-200", isRTL ? "flex-row-reverse" : "")}>
                    <SelectValue placeholder={t('builder.audiencePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.audienceAll')}</SelectItem>
                    <SelectItem value="new_hires" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.audienceNew')}</SelectItem>
                    <SelectItem value="front_desk" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.audienceFrontDesk')}</SelectItem>
                    <SelectItem value="housekeeping" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.audienceHousekeeping')}</SelectItem>
                    <SelectItem value="food_beverage" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.audienceFood')}</SelectItem>
                    <SelectItem value="maintenance" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.audienceMaintenance')}</SelectItem>
                    <SelectItem value="management" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.audienceManagement')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
                <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('description')}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSuggestingDescription}
                  onClick={handleAISuggestDescription}
                  className="h-6 text-[11px] px-2 text-purple-700 hover:bg-purple-50"
                >
                  {isSuggestingDescription ? (
                    <Loader2 className="w-3 h-3 animate-spin me-1" />
                  ) : (
                    <Sparkles className="w-3 h-3 me-1" />
                  )}
                  {t('builder.aiSuggestDescription', 'AI Suggest Description')}
                </Button>
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('builder.descriptionHint')}
                rows={3}
                className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('category')}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className={cn("bg-white border-slate-200", isRTL ? "flex-row-reverse" : "")}>
                    <SelectValue placeholder={t('builder.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onboarding" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.onboarding')}</SelectItem>
                    <SelectItem value="compliance" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.compliance')}</SelectItem>
                    <SelectItem value="skills" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.skills')}</SelectItem>
                    <SelectItem value="operations" className={isRTL ? "flex-row-reverse" : ""}>{t('operations')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.difficulty')}</Label>
                <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                  <SelectTrigger className={cn("bg-white border-slate-200", isRTL ? "flex-row-reverse" : "")}>
                    <SelectValue placeholder={t('builder.difficultyPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner" className={isRTL ? "flex-row-reverse" : ""}>{t('beginner')}</SelectItem>
                    <SelectItem value="intermediate" className={isRTL ? "flex-row-reverse" : ""}>{t('intermediate')}</SelectItem>
                    <SelectItem value="advanced" className={isRTL ? "flex-row-reverse" : ""}>{t('advanced')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.contentLanguage')}</Label>
                <Select value={contentLanguage} onValueChange={setContentLanguage}>
                  <SelectTrigger className={cn("bg-white border-slate-200", isRTL ? "flex-row-reverse" : "")}>
                    <SelectValue placeholder={t('wizard.selectLanguage')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english" className={isRTL ? "flex-row-reverse" : ""}>{t('wizard.englishOnly')}</SelectItem>
                    <SelectItem value="arabic" className={isRTL ? "flex-row-reverse" : ""}>{t('wizard.arabicOnly')}</SelectItem>
                    <SelectItem value="bilingual" className={isRTL ? "flex-row-reverse" : ""}>{t('wizard.bilingual')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
                  <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('duration')} ({t('min')})</Label>
                  <div className={cn("flex items-center gap-2 text-xs text-slate-500", isRTL ? "flex-row-reverse" : "")}>
                    <span>{t('builder.overrideDuration', 'Override')}</span>
                    <Switch checked={useEstimatedDuration} onCheckedChange={setUseEstimatedDuration} />
                  </div>
                </div>
                <Input
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => {
                    setEstimatedDuration(e.target.value)
                    setUseEstimatedDuration(!!e.target.value)
                  }}
                  placeholder="30"
                  disabled={!useEstimatedDuration}
                  className={cn(
                    "bg-white border-slate-200 focus:ring-hotel-gold",
                    !useEstimatedDuration && "opacity-60",
                    isRTL ? "text-right" : ""
                  )}
                />
                <div className={cn("flex flex-wrap gap-2", isRTL ? "flex-row-reverse" : "")}>
                  {durationPresets.map(preset => (
                    <Button
                      key={preset}
                      type="button"
                      size="sm"
                      variant={estimatedDuration === preset && useEstimatedDuration ? 'default' : 'outline'}
                      onClick={() => {
                        setEstimatedDuration(preset)
                        setUseEstimatedDuration(true)
                      }}
                      className="h-7 text-xs"
                      disabled={!useEstimatedDuration}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">{t('builder.calculatedDuration', { count: calculatedDuration })}</p>
              </div>
              <div className="space-y-3">
                <Label className={cn("text-xs font-semibold text-slate-700", isRTL ? "text-right block" : "")}>{t('builder.validity')} ({t('builder.days')})</Label>
                <Input
                  type="number"
                  value={validityPeriod}
                  onChange={(e) => setValidityPeriod(e.target.value)}
                  placeholder="365"
                  className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                />
                <div className={cn("flex flex-wrap gap-2", isRTL ? "flex-row-reverse" : "")}>
                  {validityPresets.map(preset => (
                    <Button
                      key={preset}
                      type="button"
                      size="sm"
                      variant={validityPeriod === preset ? 'default' : 'outline'}
                      onClick={() => setValidityPeriod(preset)}
                      className="h-7 text-xs"
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 bg-white/60">
          <CardHeader>
            <CardTitle className={cn("text-sm font-semibold text-slate-700", isRTL ? 'text-right' : 'text-left')}>{t('builder.smartDefaults')}</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4 text-sm text-slate-600">
            <div className="space-y-3">
              <Label className={cn("text-xs font-semibold text-slate-500", isRTL ? "text-right block" : "")}>{t('builder.template')}</Label>
              <Select value={templatePreset} onValueChange={handleTemplateSelection}>
                <SelectTrigger className={cn("bg-white border-slate-200", isRTL ? "flex-row-reverse" : "")}>
                  <SelectValue placeholder={t('builder.templatePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className={isRTL ? "flex-row-reverse" : ""}>{t('builder.templateNone')}</SelectItem>
                  {isTemplatesLoading ? (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      {t('builder.templatesLoading', 'Loading templates...')}
                    </div>
                  ) : isTemplatesError ? (
                    <div className="p-2 text-xs text-red-500 text-center">
                      {t('builder.templatesError', 'Failed to load templates')}
                    </div>
                  ) : templateOptions.length > 0 ? (
                    templateOptions.map((template) => (
                      <SelectItem key={template.id} value={template.id} className={isRTL ? "flex-row-reverse" : ""}>
                        {template.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      {t('builder.noTemplates')}
                    </div>
                  )}
                </SelectContent>
              </Select>
              {selectedTemplate && templatePreset !== 'none' && (
                <div className="rounded-lg border bg-white/70 p-3">
                  <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
                    <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.templatePreview', 'Template preview')}</div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowTemplatePreview(true)}
                    >
                      {t('preview')}
                    </Button>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <div>{t('builder.templateSections', { count: templateStats.sectionsCount })}</div>
                    <div>{t('builder.templateItems', { count: templateStats.itemsCount })}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-lg border bg-slate-50/70 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.recommendations')}</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div>{t('builder.recommendationOne')}</div>
                <div>{t('builder.recommendationTwo')}</div>
                <div>{t('builder.recommendationThree')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
