import React, { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './Button'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  /** String the user must type to confirm, e.g. "DELETE" or the course title */
  confirmString?: string
  confirmButtonText?: string
  isDestructive?: boolean
  isLoading?: boolean
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmString,
  confirmButtonText = 'Confirm',
  isDestructive = true,
  isLoading = false,
}) => {
  const [typedValue, setTypedValue] = useState('')

  if (!isOpen) return null

  const isConfirmed = confirmString ? typedValue.trim() === confirmString : true

  const handleConfirm = async () => {
    if (!isConfirmed) return
    await onConfirm()
    setTypedValue('')
  }

  const handleClose = () => {
    setTypedValue('')
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity"
    >
      <div className="relative w-full max-w-md bg-ds-surface dark:bg-ds-surface border border-ds-border dark:border-ds-border rounded-[8px] shadow-lg shadow-black/15 p-6 animate-in fade-in-0 zoom-in-95 duration-150">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close dialog"
          className="absolute top-4 end-4 p-2 text-ds-muted hover:text-ds-ink dark:hover:text-ds-ink rounded-[6px]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3">
          {isDestructive && (
            <div className="p-2 rounded-full bg-ds-danger/10 text-ds-danger dark:text-ds-danger shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1">
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-ds-ink dark:text-ds-ink"
            >
              {title}
            </h2>
            <p className="text-sm text-ds-ink-secondary dark:text-ds-ink-secondary mt-1.5 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {confirmString && (
          <div className="mt-4 pt-3 border-t border-ds-border dark:border-ds-border">
            <label
              htmlFor="typed-confirmation-input"
              className="block text-xs font-semibold text-ds-muted dark:text-ds-muted uppercase tracking-wider mb-1.5"
            >
              Type <strong className="font-mono text-ds-ink dark:text-ds-ink">{confirmString}</strong> to confirm:
            </label>
            <input
              id="typed-confirmation-input"
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={confirmString}
              className="w-full px-3 py-2 text-sm bg-ds-background dark:bg-ds-background border border-ds-border dark:border-ds-border rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent dark:focus-visible:ring-ds-brass"
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'primary'}
            onClick={handleConfirm}
            disabled={!isConfirmed || isLoading}
            isLoading={isLoading}
          >
            {confirmButtonText}
          </Button>
        </div>
      </div>
    </div>
  )
}
