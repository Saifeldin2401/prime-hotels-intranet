/**
 * Card with loading skeleton
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface LoadingCardProps {
  lines?: number
  showHeader?: boolean
  className?: string
}

export function LoadingCard({ lines = 3, showHeader = true, className }: LoadingCardProps) {
  return (
    <Card className={cn(className)}>
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

