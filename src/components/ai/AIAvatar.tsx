import { cn } from '@/lib/utils'
import * as React from 'react'

interface AIAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showStatus?: boolean
  isThinking?: boolean
}

export function AIAvatar({
  size = 'md',
  className,
  showStatus = true,
  isThinking = false,
}: AIAvatarProps) {
  const sizeClasses = {
    sm: 'w-7 h-7 rounded-xl',
    md: 'w-9 h-9 rounded-2xl',
    lg: 'w-10 h-10 rounded-2xl',
    xl: 'w-12 h-12 rounded-3xl',
  }

  const statusSize = {
    sm: 'h-2 w-2 -bottom-0.5 -end-0.5',
    md: 'h-2.5 w-2.5 -bottom-0.5 -end-0.5',
    lg: 'h-3 w-3 -bottom-0.5 -end-0.5',
    xl: 'h-3.5 w-3.5 -bottom-0.5 -end-0.5',
  }

  return (
    <div className={cn('relative select-none shrink-0 group', className)}>
      {/* Outer ambient glow */}
      <div className={cn(
        'absolute inset-0 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-indigo-500/20 to-purple-500/20 blur-sm transition-opacity duration-300',
        isThinking ? 'opacity-100 animate-pulse' : 'opacity-40 group-hover:opacity-100'
      )} />

      {/* Main Luxury Avatar Vessel */}
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white shadow-md border border-white/15 dark:border-white/10 transition-transform duration-300 group-hover:scale-105',
          sizeClasses[size]
        )}
      >
        {/* Iridescent Dynamic Mesh Highlight */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(245,158,11,0.35),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(99,102,241,0.35),transparent_60%)]" />

        {/* Modern Minimalist Geometric Nexus Symbol (Clean & Sleek) */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            'text-amber-200 transition-all duration-300 relative z-10',
            size === 'sm' && 'w-3.5 h-3.5',
            size === 'md' && 'w-4.5 h-4.5',
            size === 'lg' && 'w-5 h-5',
            size === 'xl' && 'w-6 h-6',
            isThinking && 'animate-spin'
          )}
        >
          {/* Refined Luxury Compass / AI Core Cross */}
          <circle cx="12" cy="12" r="3" className="fill-amber-400/30 stroke-amber-300" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" className="stroke-amber-200/90" />
          <path d="m4.93 4.93 2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" className="stroke-indigo-300/60" />
        </svg>
      </div>

      {/* Live Status Beacon */}
      {showStatus && (
        <span className={cn('absolute flex', statusSize[size])}>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
        </span>
      )}
    </div>
  )
}
