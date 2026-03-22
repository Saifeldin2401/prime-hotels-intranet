/**
 * FORGE X: Enterprise Audit & Compliance Export System
 * Export Status Card Component
 */

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { AuditExportStatus } from '@/types/audit'
import { CheckCircle, Clock, LucideIcon, XCircle } from 'lucide-react'

interface ExportStatusCardProps {
  status: AuditExportStatus
  count: number
  label: string
  isLoading?: boolean
}

const statusConfig: Record<
  AuditExportStatus,
  { icon: LucideIcon; color: string; bgColor: string }
> = {
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
  },
  pending: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
  },
  generating: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
  },
  expired: {
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-950/20',
  },
  downloaded: {
    icon: CheckCircle,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
  },
}

export function ExportStatusCard({ status, count, label, isLoading = false }: ExportStatusCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Card className={cn('transition-colors', config.bgColor)}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={cn('p-3 rounded-full bg-white dark:bg-gray-900', config.color)}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className={cn('text-3xl font-bold', config.color)}>{count.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  )
}
