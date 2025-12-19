import { Badge } from '@/components/ui/badge'
import { DOCUMENT_STATUSES } from '@/lib/constants'
import type { DocumentStatus } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: DocumentStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = DOCUMENT_STATUSES[status]

  // Explicit high-contrast colors to ensure visibility
  // Using specific Tailwind classes bypassing Badge variants to avoid conflicts
  const colorMap: Record<string, string> = {
    gray: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100/80",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100/80",
    blue: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100/80",
    green: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100/80",
    orange: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100/80",
    red: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100/80",
  }

  // Fallback to gray if color is not found
  const colorClasses = colorMap[statusConfig.color] || colorMap.gray

  return (
    <Badge
      variant="outline"
      className={cn(
        "border px-2.5 py-0.5 font-medium",
        colorClasses,
        className
      )}
    >
      {statusConfig.label}
    </Badge>
  )
}
