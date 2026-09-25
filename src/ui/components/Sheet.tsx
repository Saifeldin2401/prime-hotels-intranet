import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export interface SheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  side?: 'end' | 'start' | 'bottom'
  size?: 'sm' | 'md' | 'lg' | 'full'
  className?: string
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-full',
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'end',
  size = 'md',
  className = '',
}) => {
  const sheetRef = useRef<HTMLDivElement>(null)

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

  const sideStyles = {
    end: 'inset-y-0 end-0 rounded-s-[12px]',
    start: 'inset-y-0 start-0 rounded-e-[12px]',
    bottom: 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-[12px]',
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden font-sans"
    >
      {/* Solid backdrop - NO backdrop-blur per Section 13 */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity duration-200 motion-reduce:transition-none"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={`fixed z-10 w-full ${sizeMap[size]} ${sideStyles[side]} bg-ds-surface border-ds-border border shadow-2xl shadow-black/20 dark:shadow-black/60 flex flex-col overflow-hidden transition-transform duration-200 motion-reduce:transition-none ${className}`}
      >
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
            aria-label="Close sheet"
            className="p-1 rounded-[4px] text-ds-muted hover:text-ds-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="px-5 py-3 bg-ds-background/50 border-t border-ds-border/60 flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
