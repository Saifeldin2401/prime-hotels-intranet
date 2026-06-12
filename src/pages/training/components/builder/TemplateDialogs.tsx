import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { AlertTriangle, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TrainingTemplate } from './trainingBuilderTypes'

interface TemplatePreviewDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  selectedTemplate: TrainingTemplate | null
  templatePreset: string
  templateStats: {
    sectionsCount: number
    itemsCount: number
    sections: Array<{ title: string; count: number }>
  }
  requestApplyTemplate: (template: TrainingTemplate | null) => void
  isRTL: boolean
}

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  selectedTemplate,
  templatePreset,
  templateStats,
  requestApplyTemplate,
  isRTL,
}: TemplatePreviewDialogProps) {
  const { t } = useTranslation('training')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
            <Layers className="w-5 h-5 text-hotel-gold" />
            {t('builder.templatePreviewTitle', { name: selectedTemplate?.name || t('builder.template') })}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {selectedTemplate?.description || t('builder.templatePreviewDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">{t('builder.templateSections', { count: templateStats.sectionsCount })}</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">{templateStats.sectionsCount}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">{t('builder.templateItems', { count: templateStats.itemsCount })}</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">{templateStats.itemsCount}</div>
            </div>
          </div>
          <div className="space-y-2">
            {templateStats.sections.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">
                {t('builder.templateEmptyDesc')}
              </div>
            ) : (
              templateStats.sections.map((section) => (
                <div
                  key={`${section.title}-${section.count}`}
                  className={cn("flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700", isRTL ? "flex-row-reverse text-right" : "")}
                >
                  <span className="font-medium">{section.title}</span>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal">
                    {section.count} {t('builder.items')}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
        <div className={cn("flex items-center justify-between pt-4", isRTL ? "flex-row-reverse" : "")}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            onClick={() => requestApplyTemplate(selectedTemplate)}
            disabled={!selectedTemplate || templatePreset === 'none'}
            className="bg-hotel-gold hover:bg-hotel-gold-dark text-white"
          >
            {t('builder.applyTemplate', 'Apply template')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface TemplateApplyConfirmDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  confirmApplyTemplate: () => void
  isRTL: boolean
}

export function TemplateApplyConfirmDialog({
  open,
  onOpenChange,
  confirmApplyTemplate,
  isRTL,
}: TemplateApplyConfirmDialogProps) {
  const { t } = useTranslation('training')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {t('builder.templateReplaceTitle', 'Replace current structure?')}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('builder.templateReplaceDesc', 'Applying this template will clear your existing sections and content.')}
          </DialogDescription>
        </DialogHeader>
        <div className={cn("flex items-center justify-end gap-3 pt-4", isRTL ? "flex-row-reverse" : "")}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('builder.keepExisting', 'Keep existing')}
          </Button>
          <Button onClick={confirmApplyTemplate} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
            {t('builder.applyTemplate', 'Apply template')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
