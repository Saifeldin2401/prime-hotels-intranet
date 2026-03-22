/**
 * FORGE X: Enterprise Audit & Compliance Export System
 * Compliance Metric Card Component
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface ComplianceMetricCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  description?: string
  trend?: string
  trendUp?: boolean
  secondaryValue?: number | string
  secondaryLabel?: string
  variant?: 'default' | 'warning' | 'error'
  isLoading?: boolean
}

export function ComplianceMetricCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendUp,
  secondaryValue,
  secondaryLabel,
  variant = 'default',
  isLoading = false,
}: ComplianceMetricCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  const variantStyles = {
    default: 'text-foreground',
    warning: 'text-amber-600',
    error: 'text-destructive',
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn('h-4 w-4 text-muted-foreground', variantStyles[variant])} />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold', variantStyles[variant])}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {trend && (
            <span
              className={cn(
                'text-xs font-medium',
                trendUp ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trendUp ? '↑' : '↓'} {trend}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {secondaryValue !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            {secondaryLabel}: {typeof secondaryValue === 'number' ? secondaryValue.toLocaleString() : secondaryValue}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
