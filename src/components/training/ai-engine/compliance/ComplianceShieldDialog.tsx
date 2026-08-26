import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Wand2,
  Building2,
  FileCheck,
} from 'lucide-react'
import { complianceShield, type ComplianceAuditReport, type ComplianceFinding } from '@/lib/ai/complianceShield'
import type { TrainingSection } from '@/pages/training/components/builder/trainingBuilderTypes'
import { cn } from '@/lib/utils'

interface ComplianceShieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sections: TrainingSection[]
  onApplyRemediation: (updatedSections: TrainingSection[]) => void
}

export function ComplianceShieldDialog({
  open,
  onOpenChange,
  sections,
  onApplyRemediation,
}: ComplianceShieldDialogProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'

  const [auditReport, setAuditReport] = useState<ComplianceAuditReport>(() =>
    complianceShield.auditModule(sections)
  )
  const [remediatingId, setRemediatingId] = useState<string | null>(null)

  // Re-run audit whenever dialog opens or sections change
  const runAudit = () => {
    const fresh = complianceShield.auditModule(sections)
    setAuditReport(fresh)
  }

  const handleFixFinding = async (finding: ComplianceFinding) => {
    setRemediatingId(finding.id)
    try {
      const targetSec = sections[finding.sectionIndex]
      if (!targetSec) return

      const updatedSec = await complianceShield.autoRemediateSection(
        targetSec,
        finding,
        isRTL ? 'ar' : 'en'
      )

      const updatedAll = sections.map((s, idx) =>
        idx === finding.sectionIndex ? updatedSec : s
      )

      onApplyRemediation(updatedAll)
      setAuditReport(complianceShield.auditModule(updatedAll))
    } finally {
      setRemediatingId(null)
    }
  }

  const handleFixAll = async () => {
    setRemediatingId('all')
    try {
      let currentSections = [...sections]
      for (const finding of auditReport.findings) {
        if (finding.canAutoFix && currentSections[finding.sectionIndex]) {
          const updatedSec = await complianceShield.autoRemediateSection(
            currentSections[finding.sectionIndex],
            finding,
            isRTL ? 'ar' : 'en'
          )
          currentSections = currentSections.map((s, idx) =>
            idx === finding.sectionIndex ? updatedSec : s
          )
        }
      }
      onApplyRemediation(currentSections)
      setAuditReport(complianceShield.auditModule(currentSections))
    } finally {
      setRemediatingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-950">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span>{t('complianceShield.title', 'KSA Hospitality & Regulatory Compliance Shield')}</span>
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200">
                    KSA Vision 2030 Ready
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {t('complianceShield.desc', 'Audits training SOPs against Ministry of Tourism (MT), Balady Municipal HACCP, and Civil Defense fire safety standards.')}
                </DialogDescription>
              </div>
            </div>

            <Button size="sm" variant="outline" onClick={runAudit} className="text-xs h-8">
              {t('complianceShield.recheck', 'Re-Audit')}
            </Button>
          </div>
        </DialogHeader>

        {/* Score & Metrics Bar */}
        <div className="p-6 py-4 bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-4">
          <div className="col-span-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {t('complianceShield.complianceHealth', 'Regulatory Compliance Score')}
              </span>
              <span
                className={cn(
                  'font-bold text-sm',
                  auditReport.score >= 90
                    ? 'text-emerald-600'
                    : auditReport.score >= 70
                    ? 'text-amber-600'
                    : 'text-rose-600'
                )}
              >
                {auditReport.score}%
              </span>
            </div>
            <Progress
              value={auditReport.score}
              className={cn(
                'h-2',
                auditReport.score >= 90
                  ? '[&>div]:bg-emerald-500'
                  : auditReport.score >= 70
                  ? '[&>div]:bg-amber-500'
                  : '[&>div]:bg-rose-500'
              )}
            />
          </div>

          <div className="flex flex-col justify-center border-s ps-4 border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-muted-foreground">{t('complianceShield.criticalIssues', 'Critical Violations')}</span>
            <span className="text-sm font-bold text-rose-600">{auditReport.criticalCount}</span>
          </div>

          <div className="flex flex-col justify-center border-s ps-4 border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-muted-foreground">{t('complianceShield.passedCount', 'Rules Passed')}</span>
            <span className="text-sm font-bold text-emerald-600">
              {auditReport.passedCount} / {auditReport.totalRulesChecked}
            </span>
          </div>
        </div>

        {/* Findings List */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {auditReport.findings.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">
                  {t('complianceShield.allClearTitle', '100% KSA Regulatory Compliance')}
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {t(
                    'complianceShield.allClearDesc',
                    'All modules and lesson SOPs strictly satisfy Ministry of Tourism 5-star guidelines, Balady HACCP temperature benchmarks, and Saudi Labor laws.'
                  )}
                </p>
              </div>
            ) : (
              auditReport.findings.map((finding) => (
                <div
                  key={finding.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      {finding.severity === 'CRITICAL' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {isRTL ? finding.titleAr : finding.title}
                          </h4>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-semibold uppercase',
                              finding.severity === 'CRITICAL'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            )}
                          >
                            {finding.severity}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{finding.authorityName}</span>
                          <span>•</span>
                          <span>Section: {finding.sectionTitle}</span>
                        </p>
                      </div>
                    </div>

                    {finding.canAutoFix && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        disabled={remediatingId !== null}
                        onClick={() => handleFixFinding(finding)}
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>{t('complianceShield.autoFix', 'Auto-Remediate')}</span>
                      </Button>
                    )}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">
                      💡 {t('complianceShield.standardDirective', 'Mandatory KSA Standard')}:
                    </span>
                    <p className="leading-relaxed">{isRTL ? finding.recommendationAr : finding.recommendation}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer with 1-Click Fix All */}
        {auditReport.findings.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {t('complianceShield.foundViolations', '{{count}} compliance alignment(s) detected', {
                count: auditReport.findings.length,
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
                {t('common:actions.cancel', 'Close')}
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                disabled={remediatingId !== null}
                onClick={handleFixAll}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('complianceShield.autoFixAll', 'Auto-Fix All Non-Compliances')}</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
