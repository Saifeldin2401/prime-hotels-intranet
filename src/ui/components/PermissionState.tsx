import React from 'react'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/ui/primitives/Button'

export interface PermissionStateProps {
  title?: string
  message?: string
  requiredRole?: string
  onAction?: () => void
  actionLabel?: string
  className?: string
}

export const PermissionState: React.FC<PermissionStateProps> = ({
  title = 'Access Restricted',
  message = 'You do not have authorization to view this operational area.',
  requiredRole,
  onAction,
  actionLabel = 'Return to Home',
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-[8px] bg-ds-surface border border-ds-border space-y-4 font-sans max-w-lg mx-auto ${className}`}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-[6px] bg-ds-warning-soft text-ds-warning">
        <ShieldAlert className="w-6 h-6" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-semibold text-ds-ink">{title}</h3>
        <p className="text-xs text-ds-muted leading-relaxed">{message}</p>
        {requiredRole && (
          <p className="text-[11px] font-mono text-ds-brass pt-1">
            Required access: {requiredRole}
          </p>
        )}
      </div>

      {onAction && (
        <div className="pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onAction}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
