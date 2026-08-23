import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ModuleSkillsEditor } from '@/components/training/ModuleSkillsEditor'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileQuestion,
  FileText,
  Headphones,
  HelpCircle,
  Layers,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Target,
  Video,
  Zap
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BuilderStep, TrainingSection } from './trainingBuilderTypes'
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
  setShowKBSidebar?: (v: boolean) => void
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
  setShowKBSidebar,
  isRTL,
  activeSection,
}: RightPanelProps) {
  const { t } = useTranslation('training')

  const totalQuizzes = sections.reduce(
    (acc, s) => acc + s.items.filter((i) => i.type === 'quiz').length,
    0
  )

  const passedChecksCount = validationChecklist.filter((c) => c.ok).length
  const totalChecksCount = validationChecklist.length
  const remainingChecksCount = Math.max(0, totalChecksCount - passedChecksCount)
  const healthPercentage = Math.round((passedChecksCount / (totalChecksCount || 1)) * 100)

  // -------------------------------------------------------------------------
  // Content Step (Course Editor) Sidebar
  // -------------------------------------------------------------------------
  if (builderStep === 'content') {
    return (
      <div className={cn("p-3 space-y-3 w-full max-w-full box-border", isRTL ? "text-right" : "text-left")}>
        {/* Course Health & Readiness Card */}
        <Card className="w-full shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-3">
            <div className={cn("flex items-center justify-between gap-1.5", isRTL ? "flex-row-reverse" : "")}>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
                <Target className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{t('builder.courseReadiness', 'Course Health')}</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-bold text-slate-800 dark:text-slate-200 shrink-0 px-1.5 py-0.5">
                {passedChecksCount}/{totalChecksCount}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1.5">
            <Progress value={healthPercentage} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
            <p className="text-[11px] text-muted-foreground">
              {healthPercentage === 100
                ? t('builder.readyToPublish', 'Ready for review & publishing')
                : t('builder.incompleteReadiness', {
                    count: remainingChecksCount,
                    defaultValue: `${remainingChecksCount} required items remaining`,
                  })}
            </p>
          </CardContent>
        </Card>

        {/* Course Curriculum Snapshot */}
        <Card className="w-full shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className={cn("text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5", isRTL ? 'flex-row-reverse' : '')}>
              <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{t('builder.courseSnapshot', 'Curriculum Stats')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2 text-xs">
            <div className={cn("flex items-center justify-between gap-1.5", isRTL ? "flex-row-reverse" : "")}>
              <span className="text-muted-foreground text-[11px]">{t('builder.sectionsCount', 'Sections')}</span>
              <Badge variant="secondary" className="font-semibold text-[11px] h-5 px-1.5 bg-slate-100 dark:bg-slate-800">
                {sections.length}
              </Badge>
            </div>
            <div className={cn("flex items-center justify-between gap-1.5", isRTL ? "flex-row-reverse" : "")}>
              <span className="text-muted-foreground text-[11px]">{t('builder.lessonsCount', 'Lesson Items')}</span>
              <Badge variant="secondary" className="font-semibold text-[11px] h-5 px-1.5 bg-slate-100 dark:bg-slate-800">
                {totalItems}
              </Badge>
            </div>
            <div className={cn("flex items-center justify-between gap-1.5", isRTL ? "flex-row-reverse" : "")}>
              <span className="text-muted-foreground text-[11px]">{t('builder.quizzesCount', 'Quiz Checkpoints')}</span>
              <Badge variant="outline" className="font-semibold text-[11px] h-5 px-1.5 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border-purple-200">
                {totalQuizzes}
              </Badge>
            </div>
            <div className={cn("flex items-center justify-between gap-1.5", isRTL ? "flex-row-reverse" : "")}>
              <span className="text-muted-foreground text-[11px]">{t('builder.estimatedTime', 'Est. Duration')}</span>
              <Badge variant="secondary" className="font-semibold text-[11px] h-5 px-1.5 flex items-center gap-1 bg-slate-100 dark:bg-slate-800">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{displayDuration || calculatedDuration || 0}m</span>
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* AI Quick Actions Card */}
        <Card className="w-full shadow-xs border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className={cn("text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5", isRTL ? 'flex-row-reverse' : '')}>
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{t('builder.smartAiAssistant', 'Smart AI Assistant')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            <Button
              className={cn("w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-xs shadow-xs border-none h-8 px-2 flex items-center justify-center gap-1.5", isRTL ? "flex-row-reverse" : "")}
              onClick={() => setShowSmartWizard(true)}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-slate-950" />
              <span className="truncate">{t('builder.openSmartAiModal', 'AI Course Generator')}</span>
            </Button>
            {setShowKBSidebar && (
              <Button
                variant="outline"
                className={cn("w-full border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold h-8 px-2 flex items-center justify-center gap-1.5", isRTL ? "flex-row-reverse" : "")}
                onClick={() => setShowKBSidebar(true)}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">{t('builder.browseKnowledgeBase', 'Knowledge Base Bank')}</span>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Live Section Preview Card */}
        {(() => {
          const currentSection = sections.find((s) => s.id === activeSection) || sections[0]
          if (!currentSection || currentSection.items.length === 0) return null

          return (
            <Card className="w-full shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className={cn(
                  'text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5',
                  isRTL ? 'flex-row-reverse' : ''
                )}>
                  <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{t('builder.inlinePreview.livePreview', 'Active Section Preview')}</span>
                </CardTitle>
                <p className="text-[11px] text-muted-foreground truncate">
                  {currentSection.title}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[220px] px-2.5 pb-2.5">
                  <div className="space-y-1.5">
                    {currentSection.items.slice(0, 5).map((item) => {
                      const iconMap: Record<string, React.ReactNode> = {
                        text: <FileText className="w-3 h-3 text-blue-600" />,
                        video: <Video className="w-3 h-3 text-rose-600" />,
                        quiz: <FileQuestion className="w-3 h-3 text-purple-600" />,
                        audio: <Headphones className="w-3 h-3 text-cyan-600" />,
                        sop_reference: <BookOpen className="w-3 h-3 text-emerald-600" />,
                        assignment: <FileCheck className="w-3 h-3 text-amber-600" />,
                        practical: <FileCheck className="w-3 h-3 text-amber-600" />,
                      }

                      return (
                        <div key={item.id} className="flex items-start gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                          <div className="w-5 h-5 rounded bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 mt-0.5">
                            {iconMap[item.type] || <FileText className="w-3 h-3 text-slate-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {item.title || t('builder.untitledBlock', 'Untitled')}
                            </p>
                            {item.type === 'text' && item.content && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                {item.content.replace(/<[^>]*>/g, '').slice(0, 60)}
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
                      <p className="text-[10px] text-center text-muted-foreground pt-1">
                        +{currentSection.items.length - 5} {t('builder.inlinePreview.moreItems', 'more items')}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )
        })()}

        {/* Hotel Skills Mapping */}
        <Card className="w-full shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <CardContent className="p-3">
            <ModuleSkillsEditor moduleId={moduleId || ''} />
          </CardContent>
        </Card>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Rules Step Sidebar
  // -------------------------------------------------------------------------
  if (builderStep === 'rules') {
    return (
      <div className={cn("p-3 space-y-3 w-full max-w-full box-border", isRTL ? "text-right" : "text-left")}>
        <Card className="w-full shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className={cn("text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5", isRTL ? 'flex-row-reverse' : '')}>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{t('builder.rulesSummary', 'Configured Rules Summary')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Award className={cn("w-4 h-4 shrink-0", certificateEnabled ? "text-amber-500" : "text-slate-400")} />
              <span>{certificateEnabled ? t('builder.certEnabled', 'Official Certificate Enabled') : t('builder.certDisabled', 'Certificate Disabled')}</span>
            </div>
            {certificateEnabled && (
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{t('builder.passScoreSummary', { score: passingScore || '80' })}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 shrink-0 text-blue-500" />
              <span>{t('builder.retakeSummary', { count: allowRetake ? Number(maxAttempts || 3) : 0 })}</span>
            </div>
          </CardContent>
        </Card>

        {/* 5-Star Hotel Training Recommendations */}
        <Card className="w-full shadow-xs border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className={cn("text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5", isRTL ? 'flex-row-reverse' : '')}>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{t('builder.bestPractices', 'ALTUS Guidelines')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2 text-[11px] text-muted-foreground leading-relaxed">
            <p>• Mandatory compliance courses require an 80%+ passing score.</p>
            <p>• Department SOPs should provide at least 3 retry attempts for optimal retention.</p>
            <p>• Annual validity (365 days) is recommended for safety & hygiene.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Publish Step Sidebar
  // -------------------------------------------------------------------------
  if (builderStep === 'preview' || builderStep === 'publish') {
    return (
      <div className={cn("p-3 space-y-3 w-full max-w-full box-border", isRTL ? "text-right" : "text-left")}>
        <Card className="w-full shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className={cn("text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5", isRTL ? "flex-row-reverse" : "")}>
              <ListChecks className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{t('builder.publishChecklist', 'Pre-Flight Checklist')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2 text-xs">
            {validationChecklist.map((item) => (
              <div key={item.key} className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                {item.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                )}
                <span className={item.ok ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-amber-800 dark:text-amber-400 font-medium'}>
                  {item.label}
                </span>
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
