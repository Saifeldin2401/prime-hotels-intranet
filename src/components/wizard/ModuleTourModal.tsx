import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ModuleTourModalProps {
  isOpen: boolean
  onClose: () => void
  moduleTitle: string
  moduleDescription: string
  highlights: string[]
  onStartTour?: () => void
}

export const ModuleTourModal: React.FC<ModuleTourModalProps> = ({
  isOpen,
  onClose,
  moduleTitle,
  moduleDescription,
  highlights,
  onStartTour
}) => {
  const { t } = useTranslation('wizard')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Sparkles className="h-5 w-5" />
          </div>
          <DialogTitle className="text-lg font-bold">
            {t('module_tour.new_feature', 'New Feature Available')}: {moduleTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            {moduleDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 py-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
            {t('module_tour.whats_included', "What's Included")}:
          </p>
          <ul className="space-y-2">
            {highlights.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                <div className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-2.5 w-2.5" />
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-muted-foreground">
            {t('actions.dismiss', 'Dismiss')}
          </Button>

          {onStartTour ? (
            <Button size="sm" onClick={() => { onClose(); onStartTour(); }} className="gap-1.5 text-xs">
              {t('module_tour.start_tour', 'Take 2-Min Tour')}
              <ArrowRight className="h-3 w-3" />
            </Button>
          ) : (
            <Button size="sm" onClick={onClose} className="text-xs">
              {t('actions.got_it', 'Got It')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
