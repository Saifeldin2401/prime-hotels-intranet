import { Badge } from '@/components/ui/badge'
import { ROLES } from '@/lib/constants'
import type { AppRole } from '@/lib/constants'

interface RoleBadgeProps {
  role: AppRole
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge variant="secondary">
      {ROLES[role].label}
    </Badge>
  )
}

