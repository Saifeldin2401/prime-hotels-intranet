import { Badge } from '@/components/ui/badge'
import { ANNOUNCEMENT_PRIORITIES } from '@/lib/constants'
import type { AnnouncementPriority } from '@/lib/constants'

interface PriorityBadgeProps {
  priority: AnnouncementPriority
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const priorityConfig = ANNOUNCEMENT_PRIORITIES[priority]
  
  const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    blue: 'default',
    orange: 'outline',
    red: 'destructive',
  }

  return (
    <Badge variant={variantMap[priorityConfig.color] || 'default'}>
      {priorityConfig.label}
    </Badge>
  )
}

