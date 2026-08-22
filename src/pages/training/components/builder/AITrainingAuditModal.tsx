import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  ShieldAlert,
  Sparkles,
  Wand2,
} from 'lucide-react'
import type { TrainingAuditResult, AuditIssue } from '@/lib/trainingBuilderValidator'
import { buildAIImprovementPlan, type AIImprovementPlan } from '@/lib/trainingAICompletionEngine'
import type { TrainingSection } from './trainingBuilderTypes'

interface AITrainingAuditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  auditResult: TrainingAuditResult
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  category?: string
  difficultyLevel?: string
  audience?: string
  sections: TrainingSection[]
  setSections: React.Dispatch<React.SetStateAction<TrainingSection[]>>
  isRTL: boolean
}

export function AITrainingAuditModal({
  open,
  onOpenChange,
  auditResult,
  title,
  setTitle,
  description,
  setDescription,
  category,
  difficultyLevel,
  audience,
  sections,
  setSections,
  isRTL,
}: AITrainingAuditModalProps) {
  const { t } = useTranslation('training')
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [improvementPlan, setImprovementPlan] = useState<AIImprovementPlan | null>(null)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'errors' | 'warnings' | 'ai_plan'>('overview')

  const handleRunAIOptimizer = async () => {
    setIsGeneratingPlan(true)
    setSelectedTab('ai_plan')
    try {
      const plan = await buildAIImprovementPlan({
        title,
        description,
        category,
        difficultyLevel,
        audience,
        sections,
        language: isRTL ? 'Arabic' : 'English',
      })
      setImprovementPlan(plan)
    } catch (e) {
      console.error('Failed to generate AI improvement plan:', e)
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  const handleApplyAllImprovements = () => {
    if (!improvementPlan) return
    if (improvementPlan.improvedTitle && improvementPlan.improvedTitle !== title) {
      setTitle(improvementPlan.improvedTitle)
    }
    if (improvementPlan.improvedDescription && improvementPlan.improvedDescription !== description) {
      setDescription(improvementPlan.improvedDescription)
    }
    if (improvementPlan.improvedSections && improvementPlan.improvedSections.length > 0) {
      setSections(improvementPlan.improvedSections)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
          <div className={cn('flex items-center justify-between', isRTL ? 'flex-row-reverse' : '')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 border border-purple-200">
                <Wand2 className="w-5 h-5" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('builder.auditModalTitle', 'AI Training Audit & Smart Optimizer')}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {t('builder.auditModalDesc', 'Validate instructional structure, fix blockers, and auto-complete missing content.')}
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-semibold px-3 py-1',
                auditResult.isPublishReady
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              )}
            >
              {auditResult.isPublishReady
                ? t('builder.readyToPublish', '✓ Ready to Publish')
                : t('builder.needsReview', '⚠ Action Required')}
            </Badge>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="border-slate-200 bg-slate-50/40 shadow-none">
              <CardContent className="p-3.5 text-center">
                <div className="text-2xl font-black text-slate-800 dark:text-white">{auditResult.healthScore}%</div>
                <div className="text-[11px] font-medium text-slate-500">{t('builder.healthScore', 'Quality Score')}</div>
              </CardContent>
            </Card>

            <Card className={cn('shadow-none', auditResult.errors.length > 0 ? 'border-red-200 bg-red-50/30' : 'border-slate-200')}>
              <CardContent className="p-3.5 text-center">
                <div className={cn('text-2xl font-black', auditResult.errors.length > 0 ? 'text-red-600' : 'text-slate-700')}>
                  {auditResult.errors.length}
                </div>
                <div className="text-[11px] font-medium text-slate-500">{t('builder.criticalErrors', 'Critical Blockers')}</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <CardContent className="p-3.5 text-center">
                <div className="text-2xl font-black text-amber-600">{auditResult.warnings.length}</div>
                <div className="text-[11px] font-medium text-slate-500">{t('builder.warnings', 'Warnings')}</div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50/30 shadow-none">
              <CardContent className="p-3.5 text-center">
                <div className="text-2xl font-black text-purple-700">{auditResult.opportunities.length}</div>
                <div className="text-[11px] font-medium text-purple-700">{t('builder.aiFixable', 'AI Opportunities')}</div>
              </CardContent>
            </Card>
          </div>

          {/* Action Tabs */}
          <Tabs value={selectedTab} onValueChange={(v: any) => setSelectedTab(v)} className="w-full">
            <TabsList className="grid grid-cols-4 w-full bg-slate-100 dark:bg-slate-800 p-1">
              <TabsTrigger value="overview" className="text-xs">
                {t('builder.tabOverview', 'Audit Overview')}
              </TabsTrigger>
              <TabsTrigger value="errors" className="text-xs">
                {t('builder.tabErrors', 'Blockers')} ({auditResult.errors.length})
              </TabsTrigger>
              <TabsTrigger value="warnings" className="text-xs">
                {t('builder.tabWarnings', 'Quality')} ({auditResult.warnings.length})
              </TabsTrigger>
              <TabsTrigger value="ai_plan" className="text-xs text-purple-700 font-bold">
                <Sparkles className="w-3.5 h-3.5 me-1" />
                {t('builder.tabAIPlan', 'AI Auto-Complete')}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-3 pt-3">
              {auditResult.errors.length === 0 && auditResult.warnings.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">{t('builder.noIssuesFound', 'All checks passed!')}</p>
                  <p className="text-xs text-slate-500">{t('builder.readyToLaunch', 'Your course structure and rules meet 5-star standard operating requirements.')}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {auditResult.errors.map((err) => (
                    <div
                      key={err.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50/40 text-xs',
                        isRTL ? 'flex-row-reverse text-right' : 'text-left'
                      )}
                    >
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-bold text-red-900">{err.title}</div>
                        <div className="text-red-700 mt-0.5">{err.description}</div>
                      </div>
                      {err.canAutoFixWithAI && (
                        <Badge variant="outline" className="bg-white text-purple-700 border-purple-200 text-[10px] shrink-0">
                          <Sparkles className="w-3 h-3 me-1" /> AI Fixable
                        </Badge>
                      )}
                    </div>
                  ))}

                  {auditResult.warnings.map((warn) => (
                    <div
                      key={warn.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/40 text-xs',
                        isRTL ? 'flex-row-reverse text-right' : 'text-left'
                      )}
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-bold text-amber-900">{warn.title}</div>
                        <div className="text-amber-700 mt-0.5">{warn.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Blockers Tab */}
            <TabsContent value="errors" className="space-y-2.5 pt-3">
              {auditResult.errors.length === 0 ? (
                <div className="text-center py-6 text-emerald-600 font-medium text-xs">
                  ✓ {t('builder.zeroBlockers', 'Zero critical blockers found.')}
                </div>
              ) : (
                auditResult.errors.map((err) => (
                  <div key={err.id} className="p-3.5 rounded-lg border border-red-200 bg-red-50/50 space-y-1.5 text-xs">
                    <div className="font-bold text-red-900 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      <span>{err.title}</span>
                    </div>
                    <p className="text-red-700">{err.description}</p>
                    {err.suggestedAction && (
                      <div className="pt-1 text-[11px] text-slate-600 font-medium">
                        👉 <strong>Suggested Action:</strong> {err.suggestedAction}
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            {/* Warnings Tab */}
            <TabsContent value="warnings" className="space-y-2.5 pt-3">
              {auditResult.warnings.length === 0 ? (
                <div className="text-center py-6 text-slate-500 font-medium text-xs">
                  {t('builder.noWarnings', 'No pedagogical warnings.')}
                </div>
              ) : (
                auditResult.warnings.map((warn) => (
                  <div key={warn.id} className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/50 space-y-1 text-xs">
                    <div className="font-bold text-amber-900">{warn.title}</div>
                    <p className="text-amber-700">{warn.description}</p>
                  </div>
                ))
              )}
            </TabsContent>

            {/* AI Auto-Complete Plan Tab */}
            <TabsContent value="ai_plan" className="space-y-4 pt-3">
              {!improvementPlan && !isGeneratingPlan && (
                <div className="text-center py-8 px-4 bg-purple-50/50 border border-dashed border-purple-200 rounded-xl space-y-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto text-purple-700">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-purple-950">
                    {t('builder.generateAIOptimizationPlan', 'AI Structural Context Synthesis')}
                  </h4>
                  <p className="text-xs text-purple-800/80 max-w-md mx-auto">
                    {t('builder.aiSynthesizeDesc', 'The AI will analyze surrounding lessons and curriculum to draft missing titles, rich descriptions, and learning objectives without overwriting any manual text.')}
                  </p>
                  <Button
                    onClick={handleRunAIOptimizer}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9 px-4"
                  >
                    <Wand2 className="w-3.5 h-3.5 me-2" />
                    {t('builder.startAISynthesis', 'Scan & Generate Missing Content')}
                  </Button>
                </div>
              )}

              {isGeneratingPlan && (
                <div className="text-center py-12 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    {t('builder.synthesizingAI', 'Analyzing curriculum hierarchy and synthesizing missing fields...')}
                  </p>
                </div>
              )}

              {improvementPlan && !isGeneratingPlan && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs">
                    <span className="font-semibold text-purple-900">
                      ✨ {improvementPlan.totalSuggestions} {t('builder.suggestionsFound', 'AI enhancements generated')}
                    </span>
                    <Button
                      size="sm"
                      onClick={handleApplyAllImprovements}
                      className="bg-purple-600 hover:bg-purple-700 text-white h-7 text-xs font-bold"
                    >
                      {t('builder.applyAllImprovements', 'Apply All Improvements')}
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {improvementPlan.suggestions.map((sug, idx) => (
                      <div key={idx} className="p-3 border rounded-lg bg-white space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 capitalize">
                            {sug.fieldType.replace('_', ' ')}
                          </span>
                          <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                            {sug.confidence} Confidence
                          </Badge>
                        </div>
                        <div className="p-2 bg-slate-50 rounded text-slate-700 font-medium">
                          {sug.suggestedValue}
                        </div>
                        <div className="text-[10px] text-slate-400">{sug.rationale}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            {t('common.close', 'Close')}
          </Button>
          <div className="flex items-center gap-2">
            {!improvementPlan && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunAIOptimizer}
                disabled={isGeneratingPlan}
                className="border-purple-200 text-purple-700 hover:bg-purple-50 text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 me-1.5" />
                {t('builder.autoFixWithAI', 'Auto-Complete with AI')}
              </Button>
            )}
            {improvementPlan && (
              <Button
                size="sm"
                onClick={handleApplyAllImprovements}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
              >
                {t('builder.applyAndClose', 'Apply & Continue')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
