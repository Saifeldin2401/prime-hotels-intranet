import { useTranslation } from "react-i18next"
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useProperty } from '@/contexts/PropertyContext'
import { isRealPropertyId } from '@/lib/propertyScope'
import { cn } from '@/lib/utils'
import { m, LazyMotion, domAnimation } from 'framer-motion'
import { Building2, Users, Briefcase, Wrench, Ticket } from 'lucide-react'

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  value: number | string
  badgeText: string
  badgeColor: string
  subtitle: string
  iconColor: string
  delay: number
}

function StatMiniCard({
  icon: Icon,
  title,
  value,
  badgeText,
  badgeColor,
  subtitle,
  iconColor,
  delay
}: StatCardProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/90 dark:bg-slate-900/90 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-xl border shadow-xs", iconColor)}>
          <Icon className="w-4 h-4" />
        </div>
        <span className={cn("text-[10px] font-extrabold px-2 py-0.5 rounded-full border", badgeColor)}>
          {badgeText}
        </span>
      </div>

      <div>
        <div className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">
          {value}
        </div>
        <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
          {subtitle}
        </div>
      </div>
    </m.div>
  )
}

export function BentoStatsRow() {
  const { t } = useTranslation('dashboard')
  const { availableProperties } = useProperty()

  const realProperties = availableProperties.filter(p => isRealPropertyId(p.id))
  const propertyCount = realProperties.length || 4

  const stats = [
    {
      id: 'properties',
      icon: Building2,
      title: t('bento.properties', 'Properties'),
      value: propertyCount,
      badgeText: '+0',
      badgeColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40',
      subtitle: t('bento.total_properties', 'Total Properties'),
      iconColor: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40',
      delay: 0.1
    },
    {
      id: 'total_staff',
      icon: Users,
      title: t('bento.total_staff', 'Total Staff'),
      value: 2,
      badgeText: '+0',
      badgeColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40',
      subtitle: t('bento.active_staff', 'Active Staff'),
      iconColor: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/40',
      delay: 0.15
    },
    {
      id: 'open_vacancies',
      icon: Briefcase,
      title: t('bento.open_vacancies', 'Open Vacancies'),
      value: 0,
      badgeText: '-2',
      badgeColor: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40',
      subtitle: t('bento.positions', 'Positions'),
      iconColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40',
      delay: 0.2
    },
    {
      id: 'maintenance',
      icon: Wrench,
      title: t('bento.maintenance', 'Maintenance'),
      value: 0,
      badgeText: '+0',
      badgeColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40',
      subtitle: t('bento.active_issues', 'Active Issues'),
      iconColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40',
      delay: 0.25
    },
    {
      id: 'tickets',
      icon: Ticket,
      title: t('bento.tickets', 'Tickets'),
      value: 0,
      badgeText: '+0',
      badgeColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40',
      subtitle: t('bento.open_tickets', 'Open Tickets'),
      iconColor: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40',
      delay: 0.3
    }
  ]

  return (
    <LazyMotion features={domAnimation}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
        {stats.map((s) => (
          <StatMiniCard key={s.id} {...s} />
        ))}
      </div>
    </LazyMotion>
  )
}
export default BentoStatsRow
