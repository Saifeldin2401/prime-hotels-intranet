import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { coverUrl, type CourseCoverTarget } from '../covers'

interface CourseCoverProps {
  course: CourseCoverTarget
  className?: string
  /** Overlaid in the bottom corner (status, progress). */
  children?: ReactNode
}

/** A course's cover photograph; decorative, so it carries no alt text. */
export function CourseCover({ course, className, children }: CourseCoverProps) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={cn('relative shrink-0 overflow-hidden rounded-md bg-ds-accent-soft', className)}>
      {!failed && (
        <img
          src={coverUrl(course)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
      {children}
    </div>
  )
}
