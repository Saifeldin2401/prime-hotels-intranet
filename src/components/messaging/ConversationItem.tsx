import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { PriorityBadge } from '@/components/messaging/PriorityBadge'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import * as React from 'react'

export interface ConversationParticipant {
  id: string
  full_name?: string | null
  email?: string | null
  avatar_url?: string | null
  job_title?: string | null
  property_name?: string | null
  department_name?: string | null
}

export interface ConversationItemProps {
  id: string
  isActive?: boolean
  otherParticipant?: ConversationParticipant | null
  lastMessagePreview?: string | null
  lastMessageAt?: string | null
  lastMessagePriority?: string | null
  unreadCount?: number
  isOnline?: boolean
  onClick: () => void
}

function getInitials(name?: string | null, email?: string | null) {
  return (name || email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join('')
}

export function ConversationItem({
  isActive = false,
  otherParticipant,
  lastMessagePreview,
  lastMessageAt,
  lastMessagePriority,
  unreadCount = 0,
  isOnline = false,
  onClick
}: ConversationItemProps) {
  const initials = getInitials(otherParticipant?.full_name, otherParticipant?.email)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-start transition-all group relative border',
        isActive
          ? 'bg-gradient-to-r from-blue-50/90 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/20 border-blue-200/80 dark:border-blue-800/80 shadow-xs'
          : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/50 border-transparent text-slate-800 dark:text-slate-200'
      )}
    >
      {/* Avatar with Presence Ring */}
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11 ring-2 ring-background shadow-xs">
          <AvatarImage src={otherParticipant?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-gradient-to-br from-hotel-navy to-indigo-700 text-white font-semibold">
            {initials || 'U'}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-2xs" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1.5 mb-0.5">
          <span className={cn(
            'text-sm font-semibold truncate',
            isActive ? 'text-blue-950 dark:text-blue-200' : 'text-slate-900 dark:text-slate-100'
          )}>
            {otherParticipant?.full_name || otherParticipant?.email || 'Staff Member'}
          </span>
          {lastMessageAt && (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
              {formatDistanceToNow(new Date(lastMessageAt), { addSuffix: false })}
            </span>
          )}
        </div>

        {/* Property & Department Subtitle */}
        <div className="text-[11px] text-muted-foreground truncate mb-1">
          {otherParticipant?.job_title || ''}
          {otherParticipant?.property_name ? ` • ${otherParticipant.property_name}` : ''}
        </div>

        {/* Message Snippet & Badges */}
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            'text-xs truncate flex-1 leading-relaxed',
            unreadCount > 0 
              ? 'font-medium text-slate-900 dark:text-slate-100' 
              : 'text-muted-foreground'
          )}>
            {lastMessagePreview || 'No messages yet'}
          </p>

          <div className="flex items-center gap-1.5 shrink-0">
            {lastMessagePriority && (lastMessagePriority === 'urgent' || lastMessagePriority === 'high') && (
              <PriorityBadge priority={lastMessagePriority} showIcon={false} className="text-[9px] px-1.5 py-0" />
            )}
            {unreadCount > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
