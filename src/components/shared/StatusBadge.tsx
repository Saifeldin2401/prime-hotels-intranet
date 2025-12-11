import { Badge } from '@/components/ui/badge'
import { DOCUMENT_STATUSES } from '@/lib/constants'
import type { DocumentStatus } from '@/lib/constants'

interface StatusBadgeProps {
  status: DocumentStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = DOCUMENT_STATUSES[status]
  
  const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    gray: 'secondary',
    yellow: 'outline',
    blue: 'default',
    green: 'default',
    red: 'destructive',
  }

  return (
    <Badge variant={variantMap[statusConfig.color] || 'secondary'}>
      {statusConfig.label}
    </Badge>
  )
}

