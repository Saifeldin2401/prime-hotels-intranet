import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { getWorkspaceForPath } from '@/config/navigation'
import type { WorkspaceId } from '@/stores/workspaceStore'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string | ReactNode
  actions?: ReactNode
  className?: string
  backTo?: string
}

const EYEBROW: Record<WorkspaceId, [string, string]> = {
  LEARN: ['workspaceEyebrow.learn', 'Learn'],
  STUDIO: ['workspaceEyebrow.studio', 'Studio'],
  MANAGE: ['workspaceEyebrow.manage', 'Manage'],
  ORGANIZATION: ['workspaceEyebrow.organization', 'Organization'],
  PLATFORM: ['workspaceEyebrow.platform', 'Platform'],
}

/**
 * Legacy page header, kept for pages not yet rebuilt on `WorkspaceHeader`.
 * It renders the same visual language - workspace eyebrow, title, context
 * line, actions on the end - so every page reads as one product.
 */
export function PageHeader({ title, description, actions, className, backTo }: PageHeaderProps) {
  const { t } = useTranslation('nav')
  const { pathname } = useLocation()
  const workspace = getWorkspaceForPath(pathname)
  const eyebrow = workspace ? t(EYEBROW[workspace][0], EYEBROW[workspace][1]) : null

  return (
    <header className={cn('mb-6 space-y-3 border-b border-ds-border pb-6', className)}>
      {backTo && (
        <Link to={backTo} className="inline-flex min-h-[36px] items-center gap-1.5 text-sm text-ds-muted hover:text-ds-ink">
          <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
          {t('back', 'Back')}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-accent">{eyebrow}</p>}
          <h1 className="text-2xl font-semibold tracking-tight text-ds-ink sm:text-[28px]">{title}</h1>
          {description && <div className="max-w-3xl text-sm text-ds-muted">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
