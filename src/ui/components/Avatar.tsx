import React, { useState } from 'react'

export interface AvatarProps {
  src?: string | null
  alt?: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  statusIndicator?: 'online' | 'away' | 'busy' | 'offline'
  className?: string
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-14 w-14 text-lg',
}

const statusColorMap = {
  online: 'bg-ds-success',
  away: 'bg-ds-warning',
  busy: 'bg-ds-danger',
  offline: 'bg-ds-muted',
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'User avatar',
  fallback,
  size = 'md',
  statusIndicator,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false)

  const initials = fallback
    ? fallback.substring(0, 2).toUpperCase()
    : alt
      ? alt
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase()
      : 'U'

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`relative flex items-center justify-center rounded-[6px] overflow-hidden border border-ds-border bg-ds-surface-subtle text-ds-ink font-semibold select-none ${sizeMap[size]}`}
      >
        {src && !hasError ? (
          <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {statusIndicator && (
        <span
          className={`absolute bottom-0 end-0 block h-2.5 w-2.5 rounded-full ring-2 ring-ds-surface ${statusColorMap[statusIndicator]}`}
          aria-label={statusIndicator}
        />
      )}
    </div>
  )
}
