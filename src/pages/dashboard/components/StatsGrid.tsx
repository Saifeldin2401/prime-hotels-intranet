import { LazyMotion, domAnimation, m } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
}

const skeletonCardKeys = ['stats-skeleton-1', 'stats-skeleton-2', 'stats-skeleton-3', 'stats-skeleton-4']

interface StatItem {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: string
  trendUp?: boolean
  href?: string
  color: string
}

interface StatsGridProps {
  stats: StatItem[]
  isLoading: boolean
}

const colorStyles: Record<string, { bg: string, text: string, iconBg: string, border: string, glow: string }> = {
  primary: { bg: 'bg-white', text: 'text-blue-600', iconBg: 'bg-blue-50', border: 'border-blue-100', glow: 'bg-blue-400' },
  emerald: { bg: 'bg-white', text: 'text-emerald-600', iconBg: 'bg-emerald-50', border: 'border-emerald-100', glow: 'bg-emerald-400' },
  gold: { bg: 'bg-white', text: 'text-amber-600', iconBg: 'bg-amber-50', border: 'border-amber-100', glow: 'bg-amber-400' },
  purple: { bg: 'bg-white', text: 'text-purple-600', iconBg: 'bg-purple-50', border: 'border-purple-100', glow: 'bg-purple-400' },
  red: { bg: 'bg-white', text: 'text-rose-600', iconBg: 'bg-rose-50', border: 'border-rose-100', glow: 'bg-rose-400' },
  navy: { bg: 'bg-white', text: 'text-slate-700', iconBg: 'bg-slate-100', border: 'border-slate-200', glow: 'bg-slate-400' },
  violet: { bg: 'bg-white', text: 'text-violet-600', iconBg: 'bg-violet-50', border: 'border-violet-100', glow: 'bg-violet-400' },
  orange: { bg: 'bg-white', text: 'text-orange-600', iconBg: 'bg-orange-50', border: 'border-orange-100', glow: 'bg-orange-400' },
  teal: { bg: 'bg-white', text: 'text-teal-600', iconBg: 'bg-teal-50', border: 'border-teal-100', glow: 'bg-teal-400' }
}

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {skeletonCardKeys.map((skeletonKey) => (
          <Card key={skeletonKey} className="border-0 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-6">
              <Skeleton className="h-10 w-24 mb-3" />
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6"
      >
        {stats.map((stat) => {
          const Icon = stat.icon
          const style = colorStyles[stat.color] || colorStyles.navy

          const content = (
            <m.div
              variants={itemVariants}
              className="h-full"
            >
              <Card className={cn(
                "relative overflow-hidden cursor-pointer h-full group",
                "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg",
                style.bg,
                "border border-slate-200 hover:border-slate-300 rounded-2xl shadow-sm"
              )}>

                {/* Subtle top glow line */}
                <div className={cn(
                  "absolute top-0 inset-x-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                  style.glow
                )} />

                {/* Subtle ambient corner glow */}
                <div className={cn(
                  "absolute -right-8 -top-8 w-32 h-32 rounded-full blur-[50px] opacity-5 group-hover:opacity-15 transition-opacity duration-700",
                  style.glow
                )} />

                <CardContent className="relative p-3 sm:p-5 h-full flex flex-col">
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-wider uppercase leading-tight line-clamp-2 min-h-[2.5em]">{stat.title}</p>
                    <div className={cn(
                      "p-1.5 sm:p-3 rounded-lg sm:rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-sm border shrink-0",
                      style.iconBg, style.text, style.border
                    )}>
                      <Icon className="w-3.5 h-3.5 sm:w-6 sm:h-6 stroke-[2.5]" />
                    </div>
                  </div>

                  <div className="mt-auto space-y-1">
                    <h3 className="text-xl sm:text-3xl xl:text-4xl font-extrabold tracking-tight text-slate-800 leading-none">{stat.value}</h3>

                    {stat.subtitle && (
                      <p className="text-[10px] sm:text-sm font-medium text-slate-500 leading-snug line-clamp-2">{stat.subtitle}</p>
                    )}

                    {stat.trend && (
                      <div className={cn(
                        "inline-flex items-center gap-1 mt-1 sm:mt-2 px-1.5 py-0.5 rounded text-[10px] font-bold border",
                        stat.trendUp ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                      )}>
                        {stat.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {stat.trend}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </m.div>
          )

          if (stat.href) {
            return <Link key={stat.title} to={stat.href} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-2xl">{content}</Link>
          }
          return <div key={stat.title}>{content}</div>
        })}
      </m.div>
    </LazyMotion>
  )
}
