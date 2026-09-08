import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface ReadinessCheckItem {
  id: string
  label: string
  description: string
  passed: boolean
  importance: 'critical' | 'recommended' | 'optional'
  tabTarget?: 'content' | 'protocols' | 'preview'
  inspectorTab?: 'publishing' | 'media' | 'governance'
}

interface ArticleReadinessDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  readinessScore: number
  items: ReadinessCheckItem[]
  onNavigateToItem?: (item: ReadinessCheckItem) => void
}

export function ArticleReadinessDrawer({
  open,
  onOpenChange,
  readinessScore,
  items,
  onNavigateToItem,
}: ArticleReadinessDrawerProps) {
  const { t } = useTranslation(['knowledge', 'common'])

  const criticalItems = items.filter((i) => i.importance === 'critical')
  const criticalPassed = criticalItems.every((i) => i.passed)
  const passedCount = items.filter((i) => i.passed).length

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 60) return 'text-amber-600 dark:text-amber-400'
    return 'text-rose-600 dark:text-rose-400'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 85) return { label: t('editor.readiness_ready', 'Publication Ready'), variant: 'default' as const, bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' }
    if (score >= 60) return { label: t('editor.readiness_needs_review', 'Good Progress'), variant: 'outline' as const, bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30' }
    return { label: t('editor.readiness_draft', 'Incomplete Draft'), variant: 'outline' as const, bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30' }
  }

  const badgeInfo = getScoreBadge(readinessScore)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-hotel-gold" />
              <span>{t('editor.article_readiness', 'Article Quality & Readiness')}</span>
            </SheetTitle>
            <Badge variant="outline" className={`text-xs px-2 py-0.5 font-medium ${badgeInfo.bg}`}>
              {badgeInfo.label}
            </Badge>
          </div>
          <SheetDescription className="text-xs">
            {t('editor.readiness_desc', 'Interactive checklist tracking compliance with hotel five-star SOP publication standards.')}
          </SheetDescription>
        </SheetHeader>

        {/* Score Overview */}
        <div className="py-5 space-y-3 border-b">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('editor.quality_score', 'Quality Score')}
              </span>
              <div className={`text-3xl font-extrabold tracking-tight ${getScoreColor(readinessScore)}`}>
                {readinessScore}%
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              {passedCount} of {items.length} checks completed
            </span>
          </div>
          <Progress value={readinessScore} className="h-2" />
        </div>

        {/* Checklist */}
        <div className="py-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('editor.standard_checklist', 'Standard SOP Checklist')}
          </h4>

          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigateToItem?.(item)}
                className={`p-3 rounded-lg border transition-all text-xs flex items-start justify-between gap-3 ${
                  item.passed
                    ? 'border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/10'
                    : item.importance === 'critical'
                    ? 'border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/15 cursor-pointer hover:border-rose-500/50'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-2.5 overflow-hidden">
                  {item.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        item.importance === 'critical'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    />
                  )}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`font-semibold ${item.passed ? 'text-foreground' : 'text-foreground'}`}>
                        {item.label}
                      </span>
                      {item.importance === 'critical' && !item.passed && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                          Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {item.description}
                    </p>
                  </div>
                </div>

                {!item.passed && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                    title="Fix this item"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t mt-4 space-y-2">
          {!criticalPassed && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
              ⚠️ Critical requirements must be completed before submitting for review.
            </p>
          )}
          <Button
            type="button"
            className="w-full text-xs h-9"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('common.close', 'Close')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default ArticleReadinessDrawer
