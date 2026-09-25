import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'

import { useCapabilities, type Capability } from '@/hooks/useCapabilities'

interface CapabilityGateProps {
  /** Capability, or any of several, the user needs in the current organization. */
  required: Capability | Capability[]
  fallbackPath: string
  children: ReactNode
}

/**
 * Renders children only when the user holds the capability in the current
 * organization (database capability matrix). Navigation convenience only -
 * the database enforces the same capability on every read and write.
 */
export function CapabilityGate({ required, fallbackPath, children }: CapabilityGateProps) {
  const { t } = useTranslation('common')
  const { canAny, isLoading, isError } = useCapabilities()
  const wanted = Array.isArray(required) ? required : [required]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('status_options.verifying_access')}</p>
        </div>
      </div>
    )
  }

  // A failed lookup is not a denial: the database still enforces every read and
  // write, so render the page rather than bouncing the member away.
  if (isError) return <>{children}</>

  if (!canAny(...wanted)) {
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}
