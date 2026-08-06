import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ModuleSkillsEditor } from '@/components/training/ModuleSkillsEditor'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle2, FileQuestion, Layers, ListChecks, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BuilderStep } from './trainingBuilderTypes'
import { VersionHistoryCard } from './VersionHistoryCard'

interface RightPanelProps {
  builderStep: BuilderStep
  sections: { length: number }
  totalItems: number
  totalPoints: number
  displayDuration: number
  overrideDuration: number | null
  calculatedDuration: number
  certificateEnabled: boolean
  passingScore: string
  allowRetake: boolean
  maxAttempts: string
  validationChecklist: Array<{ key: string; label: string; ok: boolean }>
  moduleId: string | null
  openAIGeneratorForModule: () => void
  setShowSmartWizard: (v: boolean) => void
  isRTL: boolean
}

export function RightPanel({
  builderStep,
  sections,
  totalItems,
  totalPoints,
  displayDuration,
  overrideDuration,
  calculatedDuration,
  certificateEnabled,
  passingScore,
  allowRetake,
  maxAttempts,
  validationChecklist,
  moduleId,
  openAIGeneratorForModule,
  setShowSmartWizard,
  isRTL,
}: RightPanelProps) {
  const { t } = useTranslation('training')

  if (builderStep === 'setup') {
    return (
      <div className="p-4 space-y-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className={cn("text-sm font-semibold flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
              <ListChecks className="w-4 h-4 text-slate-500" />
              {t('builder.setupChecklist')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {validationChecklist.slice(0, 2).map(item => (
              <div key={item.key} className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                {item.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span>{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-dashed border-2 bg-slate-50/50">
          <CardContent className="text-xs text-slate-600 space-y-2">
            <div>{t('builder.tipOne')}</div>
            <div>{t('builder.tipTwo')}</div>
            <div>{t('builder.tipThree')}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (builderStep === 'structure') {
    return (
      <div className="p-4 space-y-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className={cn("text-sm font-semibold", isRTL ? 'text-right' : 'text-left')}>{t('builder.structureGuide')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <div>{t('builder.structureTipOne')}</div>
            <div>{t('builder.structureTipTwo')}</div>
            <div>{t('builder.structureTipThree')}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="text-sm text-slate-600 space-y-2">
            <div>{t('builder.summarySections', { count: sections.length })}</div>
            <div>{t('builder.summaryItems', { count: totalItems })}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (builderStep === 'content') {
    return (
      <div className="p-4 space-y-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className={cn("text-sm font-semibold", isRTL ? 'text-right' : 'text-left')}>{t('builder.courseSnapshot')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <div>{t('builder.summarySections', { count: sections.length })}</div>
            <div>{t('builder.summaryItems', { count: totalItems })}</div>
            <div>{t('builder.summaryDuration', { count: displayDuration || 0 })}</div>
            {overrideDuration !== null && Math.round(overrideDuration) !== Math.round(calculatedDuration) && (
              <div className="text-xs text-slate-500">{t('builder.calculatedDuration', { count: calculatedDuration })}</div>
            )}
            <div>{t('builder.summaryPoints', { count: totalPoints })}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-purple-100 bg-purple-50/50">
          <CardHeader className="pb-3">
            <CardTitle className={cn("text-sm font-medium uppercase tracking-wider text-purple-600 flex items-center gap-2", isRTL ? 'flex-row-reverse' : '')}>
              <Sparkles className="w-4 h-4" />
              {t('builder.aiTools')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className={cn("w-full justify-start bg-white border-purple-200 text-purple-700 hover:bg-purple-100", isRTL ? "flex-row-reverse" : "")}
              onClick={openAIGeneratorForModule}
            >
              <FileQuestion className={cn("w-4 h-4", isRTL ? "ms-2" : "me-2")} />
              {t('builder.generateQuiz')}
            </Button>
            <Button
              variant="outline"
              className={cn("w-full justify-start bg-white border-purple-200 text-purple-700 hover:bg-purple-100", isRTL ? "flex-row-reverse" : "")}
              onClick={() => setShowSmartWizard(true)}
            >
              <Layers className={cn("w-4 h-4", isRTL ? "ms-2" : "me-2")} />
              {t('builder.smartWizard')}
            </Button>
          </CardContent>
        </Card>
        <ModuleSkillsEditor moduleId={moduleId || ''} />
      </div>
    )
  }

  if (builderStep === 'rules') {
    return (
      <div className="p-4 space-y-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className={cn("text-sm font-semibold", isRTL ? 'text-right' : 'text-left')}>{t('builder.rulesSummary')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <div>{certificateEnabled ? t('builder.certEnabled') : t('builder.certDisabled')}</div>
            <div>{t('builder.passScoreSummary', { score: passingScore || 80 })}</div>
            <div>{t('builder.retakeSummary', { count: allowRetake ? Number(maxAttempts) : 0 })}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (builderStep === 'preview' || builderStep === 'publish') {
    return (
      <div className="p-4 space-y-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className={cn("text-sm font-semibold flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
              <ListChecks className="w-4 h-4 text-slate-500" />
              {t('builder.publishChecklist')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {validationChecklist.map(item => (
              <div key={item.key} className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                {item.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span className={item.ok ? 'text-slate-700' : 'text-amber-700'}>{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <VersionHistoryCard moduleId={moduleId} isRTL={isRTL} />
      </div>
    )
  }

  return null
}
