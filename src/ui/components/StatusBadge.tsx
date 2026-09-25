import React from 'react'
import { StatusPill, type StatusVariant, type StatusPillProps } from '@/ui/primitives/StatusPill'

export type { StatusVariant }
export type StatusBadgeProps = StatusPillProps

export const StatusBadge: React.FC<StatusBadgeProps> = (props) => {
  return <StatusPill {...props} />
}
