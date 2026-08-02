import React from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lightbulb, CheckCircle2, ArrowRight, Sprout } from 'lucide-react'

export function QuickTipsWidget() {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'

  const tips = [
    t('quick_tips.stay_organized', 'Stay organized and focused'),
    t('quick_tips.complete_priority', 'Complete high-priority tasks'),
    t('quick_tips.keep_team_updated', 'Keep your team updated')
  ]

  return (
    <Card className="border border-emerald-200/60 dark:border-emerald-900/40 shadow-md rounded-[24px] bg-gradient-to-br from-emerald-50/80 via-emerald-50/40 to-teal-50/60 dark:from-emerald-950/40 dark:via-emerald-950/20 dark:to-teal-950/30 backdrop-blur-md overflow-hidden relative h-full flex flex-col justify-between">
      {/* Subtle lighting */}
      <div className="absolute -end-10 -bottom-10 w-36 h-36 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

      <div>
        <CardHeader className="pb-3 px-6 pt-6 flex flex-row items-center justify-between border-b border-emerald-100/50 dark:border-emerald-900/30">
          <CardTitle className="text-xs font-bold text-emerald-800 dark:text-emerald-300 tracking-wider uppercase flex items-center gap-2 font-sans">
            <Lightbulb className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {t('widgets.quick_tips', 'Quick Tips')}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 space-y-3">
          {tips.map((tip, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 text-start">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{tip}</span>
            </div>
          ))}
        </CardContent>
      </div>

      <div className="p-6 pt-0 flex items-center justify-between">
        <button className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1.5 transition-colors">
          <span>{t('actions.view_all_tips', 'View all tips')}</span>
          <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
        </button>

        <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <Sprout className="w-6 h-6 animate-bounce" />
        </div>
      </div>
    </Card>
  )
}
export default QuickTipsWidget
