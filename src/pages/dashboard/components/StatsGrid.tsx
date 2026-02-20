import { motion } from 'framer-motion'
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
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

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

const colorClasses: Record<string, string> = {
  primary: 'from-blue-500 to-blue-600',
  emerald: 'from-emerald-500 to-emerald-600',
  gold: 'from-amber-500 to-amber-600',
  purple: 'from-purple-500 to-purple-600',
  red: 'from-red-500 to-red-600',
  navy: 'from-slate-700 to-slate-800',
  violet: 'from-violet-500 to-violet-600',
  orange: 'from-orange-500 to-orange-600',
  teal: 'from-teal-500 to-teal-600'
}

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-12 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {stats.map((stat) => {
        const Icon = stat.icon
        const content = (
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="h-full"
          >
            <Card className={cn(
              "relative overflow-hidden cursor-pointer h-full group",
              "hover:shadow-xl transition-all duration-300",
              "border-0 shadow-lg"
            )}>
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-10 group-hover:opacity-15 transition-opacity",
                colorClasses[stat.color]
              )} />
              
              <div className={cn(
                "absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20",
                "bg-gradient-to-br",
                colorClasses[stat.color]
              )} />
              
              <CardContent className="relative p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                    <h3 className="text-3xl font-bold tracking-tight">{stat.value}</h3>
                    {stat.subtitle && (
                      <p className="text-sm text-muted-foreground mt-1">{stat.subtitle}</p>
                    )}
                    {stat.trend && (
                      <div className={cn(
                        "flex items-center gap-1 mt-2 text-sm font-medium",
                        stat.trendUp ? "text-emerald-600" : "text-red-600"
                      )}>
                        {stat.trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {stat.trend}
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "p-3 rounded-xl bg-gradient-to-br text-white shadow-lg",
                    colorClasses[stat.color]
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )

        if (stat.href) {
          return <Link key={stat.title} to={stat.href} className="block h-full">{content}</Link>
        }
        return content
      })}
    </motion.div>
  )
}
