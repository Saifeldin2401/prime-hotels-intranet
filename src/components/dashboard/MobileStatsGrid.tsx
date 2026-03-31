/**
 * MobileStatsGrid Component
 * 
 * Mobile-optimized stats grid with horizontal scrolling
 * and touch-friendly stat cards.
 */

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'

interface StatItem {
  /** Label for the stat */
  label: string
  /** Value to display */
  value: string | number
  /** Optional subtitle or previous value */
  subtitle?: string
  /** Icon component */
  icon: LucideIcon
  /** Trend direction */
  trend?: 'up' | 'down' | 'neutral'
  /** Trend value (e.g., "+12%") */
  trendValue?: string
  /** Click handler */
  onClick?: () => void
  /** Custom color class */
  colorClass?: string
}

interface MobileStatsGridProps {
  /** Stats to display */
  stats: StatItem[]
  /** Loading state */
  isLoading?: boolean
  /** Number of skeleton items */
  skeletonCount?: number
  /** Custom class */
  className?: string
  /** Layout variant */
  variant?: 'scroll' | 'grid' | 'compact'
}

/**
 * MobileStatsGrid - Responsive stats display for mobile
 * 
 * Usage:
 * ```tsx
 * <MobileStatsGrid
 *   stats={[
 *     { label: 'Revenue', value: '$12.5k', icon: DollarSign, trend: 'up', trendValue: '+12%' },
 *     { label: 'Orders', value: '156', icon: ShoppingCart, trend: 'down', trendValue: '-3%' },
 *   ]}
 * />
 * ```
 */
export function MobileStatsGrid({
  stats,
  isLoading = false,
  skeletonCount = 4,
  className,
  variant = 'scroll',
}: MobileStatsGridProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide',
          variant === 'grid' && 'grid grid-cols-2 gap-3',
          className
        )}
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Card key={i} className="flex-shrink-0 w-36">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const containerClasses = {
    scroll: 'flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x',
    grid: 'grid grid-cols-2 gap-3',
    compact: 'flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide',
  }

  const cardClasses = {
    scroll: 'flex-shrink-0 w-36 snap-start',
    grid: '',
    compact: 'flex-shrink-0 w-28 snap-start',
  }

  return (
    <div className={cn(containerClasses[variant], className)}>
      {stats.map((stat, index) => {
        const Icon = stat.icon
        const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight

        return (
          <Card
            key={index}
            className={cn(
              cardClasses[variant],
              stat.onClick && 'cursor-pointer active:scale-[0.98] transition-transform',
              'touch-target'
            )}
            onClick={stat.onClick}
          >
            <CardContent className={cn('p-4', variant === 'compact' && 'p-3')}>
              {/* Icon */}
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center mb-3',
                  stat.colorClass || 'bg-primary/10 text-primary',
                  variant === 'compact' && 'w-7 h-7 mb-2'
                )}
              >
                <Icon className={cn('w-4 h-4', variant === 'compact' && 'w-3.5 h-3.5')} />
              </div>

              {/* Value */}
              <div className="space-y-1">
                <p
                  className={cn(
                    'font-semibold text-foreground',
                    variant === 'compact' ? 'text-lg' : 'text-2xl'
                  )}
                >
                  {stat.value}
                </p>

                {/* Label */}
                <p
                  className={cn(
                    'text-muted-foreground',
                    variant === 'compact' ? 'text-xs' : 'text-sm'
                  )}
                >
                  {stat.label}
                </p>

                {/* Trend */}
                {stat.trend && stat.trendValue && (
                  <div className="flex items-center gap-1">
                    <TrendIcon
                      className={cn(
                        'w-3 h-3',
                        stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                      )}
                    />
                    <span
                      className={cn(
                        'text-xs font-medium',
                        stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                      )}
                    >
                      {stat.trendValue}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

/**
 * MobileStatCard - Single stat card for mobile
 */
interface MobileStatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  onClick?: () => void
  className?: string
}

export function MobileStatCard({
  label,
  value,
  icon: Icon,
  subtitle,
  trend,
  onClick,
  className,
}: MobileStatCardProps) {
  return (
    <Card
      className={cn(
        onClick && 'cursor-pointer active:scale-[0.98] transition-transform',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
          {subtitle && (
            <p
              className={cn(
                'text-xs',
                trend === 'up' && 'text-green-500',
                trend === 'down' && 'text-red-500',
                trend === 'neutral' && 'text-muted-foreground'
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
