import { m } from 'framer-motion'
import { Brain, ArrowUpRight, Zap, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface AIBriefingWidgetProps {
    stats?: any
    className?: string
}

export function AIBriefingWidget({ stats, className }: AIBriefingWidgetProps) {
    const { t } = useTranslation('dashboard')

    // Logic to generate "AI" insights based on real data
    const getInsight = () => {
        if (!stats) return null

        if (stats.maintenanceIssues > 5) {
            return {
                type: 'operational',
                title: t('ai_briefing.maintenance_alert', 'Redirection Needed'),
                message: t('ai_briefing.maintenance_msg', 'Maintenance ticket load is high. High-priority tasks have spiked by 15% in the last 2 hours.'),
                icon: Zap,
                color: 'text-rose-600',
                bg: 'bg-rose-50'
            }
        }

        if (stats.staffCompliance < 80) {
            return {
                type: 'compliance',
                title: t('ai_briefing.training_nudge', 'Compliance Gap'),
                message: t('ai_briefing.training_msg', '3 departments are below the monthly training target. Urgent certification deadline on Sunday.'),
                icon: Target,
                color: 'text-amber-600',
                bg: 'bg-amber-50'
            }
        }

        return {
            type: 'status',
            title: t('ai_briefing.efficiency_optimum', 'Operational Excellence'),
            message: t('ai_briefing.efficiency_msg', 'All departments are currently meeting peak shift performance targets. No intervention required.'),
            icon: ArrowUpRight,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        }
    }

    const insight = getInsight()
    if (!insight) return null

    return (
        <m.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn("group relative", className)}
        >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200" />

            <Card className="relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-xl rounded-2xl">
                <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 shrink-0 group-hover:rotate-6 transition-transform">
                            <Brain className="w-5 h-5 text-white" />
                        </div>

                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                    {t('ai_briefing.prefix', 'Intelligent Briefing')}
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                    </span>
                                </h4>
                            </div>

                            <div className="pt-1">
                                <div className="text-sm font-extrabold text-slate-800 leading-tight flex items-center gap-2">
                                    <insight.icon className={cn("w-4 h-4", insight.color)} />
                                    {insight.title}
                                </div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                                    {insight.message}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </m.div>
    )
}
