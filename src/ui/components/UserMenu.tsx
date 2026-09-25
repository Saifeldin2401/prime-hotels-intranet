import React from 'react'
import { useAuth } from '@/hooks/useAuth'

export interface UserMenuProps {
  className?: string
}

export const UserMenu: React.FC<UserMenuProps> = ({ className = '' }) => {
  const { user, profile, primaryRole } = useAuth()

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <div className={`relative flex items-center gap-3 font-sans ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-ds-ink text-white text-xs font-semibold shrink-0">
          {initials}
        </div>

        <div className="hidden sm:flex flex-col text-start leading-tight">
          <span className="text-xs font-semibold text-ds-ink truncate max-w-[120px]">
            {displayName}
          </span>
          <span className="text-[10px] text-ds-muted capitalize truncate max-w-[120px]">
            {primaryRole ? primaryRole.replace('_', ' ') : 'Associate'}
          </span>
        </div>
      </div>
    </div>
  )
}
