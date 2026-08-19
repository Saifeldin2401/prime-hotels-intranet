import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { InlineBlockPreview } from '@/components/training/builder/InlineBlockPreview'
import { ModuleSkillsEditor } from '@/components/training/ModuleSkillsEditor'
import { sanitizeHtml } from '@/lib/sanitize'
import { cn } from '@/lib/utils'
import { AlertTriangle, BookOpen, CheckCircle2, Eye, FileQuestion, FileText, Headphones, Layers, ListChecks, Sparkles, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BuilderStep, ContentBlockForm, TrainingSection } from './trainingBuilderTypes'
import { VersionHistoryCard } from './VersionHistoryCard'

interface RightPanelProps {
  builderStep: BuilderStep
  sections: TrainingSection[]
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
  activeSection?: string | null
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
  activeSection,
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
        <Card className="shadow-sm border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className={cn("text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-2", isRTL ? 'flex-row-reverse' : '')}>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              {t('builder.smartAiAssistant', 'Smart AI Assistant')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className={cn("w-full justify-center bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-xs shadow-sm border-none", isRTL ? "flex-row-reverse" : "")}
              onClick={() => setShowSmartWizard(true)}
            >
              <Sparkles className={cn("w-3.5 h-3.5", isRTL ? "ms-1.5" : "me-1.5")} />
              {t('builder.openSmartAiModal', 'Generate Course with AI')}
            </Button>
          </CardContent>
        </Card>
        <ModuleSkillsEditor moduleId={moduleId || ''} />

        {/* Live Section Preview */}
        {(() => {
          const currentSection = sections.find(s => s.id === activeSection) || sections[0]
          if (!currentSection || currentSection.items.length === 0) return null

          return (
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className={cn(
                  'text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2',
                  isRTL ? 'flex-row-reverse' : ''
                )}>
                  <Eye className="w-3.5 h-3.5" />
                  {t('builder.inlinePreview.livePreview', 'Live Preview')}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground truncate">
                  {currentSection.title}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[300px] px-3 pb-3">
                  <div className="space-y-2">
                    {currentSection.items.slice(0, 5).map((item) => {
                      const iconMap: Record<string, React.ReactNode> = {
                        text: <FileText className="w-3 h-3 text-blue-600" />,
                        video: <Video className="w-3 h-3 text-rose-600" />,
                        quiz: <FileQuestion className="w-3 h-3 text-purple-600" />,
                        audio: <Headphones className="w-3 h-3 text-cyan-600" />,
                        sop_reference: <BookOpen className="w-3 h-3 text-emerald-600" />,
                      }

                      return (
                        <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <div className="w-5 h-5 rounded bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 mt-0.5">
                            {iconMap[item.type] || <FileText className="w-3 h-3 text-slate-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {item.title || t('builder.untitledBlock', 'Untitled')}
                            </p>
                            {item.type === 'text' && item.content && (
                              <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                                {item.content.replace(/<[^>]*>/g, '').slice(0, 120)}
                              </p>
                            )}
                            {item.type === 'quiz' && (
                              <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">
                                {t('builder.inlinePreview.quizCheckpoint', 'Quiz checkpoint')}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {currentSection.items.length > 5 && (
                      <p className="text-[10px] text-center text-muted-foreground">
                        +{currentSection.items.length - 5} {t('builder.inlinePreview.moreItems', 'more items')}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )
        })()}
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
