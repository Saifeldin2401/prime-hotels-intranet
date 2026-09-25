import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  className = '',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Restrained solid backdrop - NO backdrop-blur per Section 13 */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity duration-150 motion-reduce:transition-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog container - 10px radius per Section 11, elevation per Section 12 */}
      <div
        ref={dialogRef}
        className={`relative z-10 w-full ${maxWidthMap[maxWidth]} bg-ds-surface border border-ds-border rounded-[10px] shadow-xl shadow-black/15 dark:shadow-black/50 overflow-hidden font-sans transition-all duration-150 motion-reduce:transition-none ${className}`}
      >
        {(title || description) && (
          <div className="flex items-start justify-between p-5 pb-3 border-b border-ds-border/60">
            <div className="space-y-1 pe-6">
              {title && (
                <h2 className="text-base font-semibold text-ds-ink">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-ds-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1 rounded-[4px] text-ds-muted hover:text-ds-ink transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-5">{children}</div>

        {footer && (
          <div className="px-5 py-3 bg-ds-background/50 border-t border-ds-border/60 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
