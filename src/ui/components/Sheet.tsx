import React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
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
  /** Accessible name for the close control. */
  closeLabel?: string
  className?: string
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-full',
}

const sideStyles = {
  end: 'inset-y-0 end-0 h-full border-s data-[state=open]:animate-in data-[state=open]:slide-in-from-right rtl:data-[state=open]:slide-in-from-left',
  start: 'inset-y-0 start-0 h-full border-e data-[state=open]:animate-in data-[state=open]:slide-in-from-left rtl:data-[state=open]:slide-in-from-right',
  bottom: 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-[8px] border-t data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
}

/**
 * Side sheet for work that keeps the page in view (context switching, a
 * record's details, filters on mobile). Built on Radix Dialog, so focus is
 * trapped while open and returned to the trigger on close.
 */
export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'end',
  size = 'md',
  closeLabel = 'Close',
  className = '',
}) => (
  <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ds-ink/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
      <DialogPrimitive.Content
        className={`fixed z-50 flex w-full flex-col overflow-hidden border-ds-border bg-ds-surface font-sans shadow-xl shadow-black/10 duration-200 motion-reduce:animate-none ${sizeMap[size]} ${sideStyles[side]} ${className}`}
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ds-border px-5 py-4">
          <div className="min-w-0 space-y-1">
            {title ? (
              <DialogPrimitive.Title className="text-base font-semibold text-ds-ink">{title}</DialogPrimitive.Title>
            ) : (
              <DialogPrimitive.Title className="sr-only">{closeLabel}</DialogPrimitive.Title>
            )}
            {description && (
              <DialogPrimitive.Description className="text-xs text-ds-muted">{description}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="-me-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] text-ds-muted transition-colors hover:bg-ds-surface-subtle hover:text-ds-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-ds-border bg-ds-background/60 px-5 py-3">
            {footer}
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
)
