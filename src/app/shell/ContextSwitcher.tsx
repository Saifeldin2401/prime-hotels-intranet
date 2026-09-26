import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Building, Building2, Check, Crown, UserRound, Users } from 'lucide-react'
import { toast } from 'sonner'

import { useTenant } from '@/contexts/TenantContext'
import { useAccountContext } from '@/hooks/useAccountContext'
import { cn } from '@/lib/utils'
import { Button, Sheet } from '@/ui'

import { useShellContext } from './useShellContext'

interface ContextSwitcherProps {
  isOpen: boolean
  onClose: () => void
}

function Row({ icon: Icon, label, value }: { icon: typeof Building; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ds-muted" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ds-muted">{label}</p>
        <p className="truncate text-sm text-ds-ink">{value ?? '—'}</p>
      </div>
    </div>
  )
}

function Option({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex min-h-[44px] w-full items-center gap-3 rounded-[6px] border px-3 text-start text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent',
        selected ? 'border-ds-accent bg-ds-accent-soft text-ds-ink' : 'border-ds-border bg-ds-surface text-ds-ink hover:border-ds-border-strong'
      )}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {selected && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-ds-accent" />}
    </button>
  )
}

/**
 * Where am I working? Shows the full context (organization,
 * department, role) and lets a member change what they are allowed to change.
 * Switching organization is explicit and confirmed: it replaces navigation,
 * data, search, notifications and branding in one step.
 */
export function ContextSwitcher({ isOpen, onClose }: ContextSwitcherProps) {
  const { t, i18n } = useTranslation('nav')
  const navigate = useNavigate()
  const account = useAccountContext()
  const ctx = useShellContext()
  const {
    currentOrganization, switchOrganization, isPlatformAdmin, returnToPlatformScope,
  } = useTenant()
  const [pendingOrg, setPendingOrg] = useState<{ id: string; name: string } | null>(null)
  const [switching, setSwitching] = useState(false)

  const memberships = Array.from(
    new Map(account.tenantMemberships.filter((m) => m.is_active).map((m) => [m.organization_id, m])).values()
  )

  const confirmSwitch = async () => {
    if (!pendingOrg) return
    setSwitching(true)
    try {
      await switchOrganization(pendingOrg.id)
      toast.success(t('shell.switchedTo', 'Now working in {{name}}', { name: pendingOrg.name }))
      setPendingOrg(null)
      onClose()
      navigate('/dashboard')
    } catch {
      toast.error(t('shell.switchFailed', 'Could not switch organization. Try again.'))
    } finally {
      setSwitching(false)
    }
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={() => { setPendingOrg(null); onClose() }}
      title={t('shell.contextTitle', 'Where you are working')}
      description={t('shell.contextHint', 'Everything you see - navigation, data, search and notifications - follows this context.')}
      closeLabel={t('shell.close', 'Close')}
    >
      <div className="space-y-6">
        {/* Current context, top to bottom of the hierarchy */}
        <section aria-label={t('shell.currentContext', 'Current context')} className="divide-y divide-ds-border rounded-[6px] border border-ds-border px-4">
          {ctx.isPlatformPlane ? (
            <Row icon={Crown} label={t('shell.plane', 'Plane')} value={t('shell.platformPlane', 'Altus platform (all organizations)')} />
          ) : (
            <>
              <Row icon={Building2} label={t('shell.organization', 'Organization')} value={ctx.organizationName} />
              <Row icon={Users} label={t('shell.department', 'Department')} value={ctx.departmentName} />
            </>
          )}
          <Row icon={UserRound} label={t('shell.role', 'Your role')} value={ctx.roleLabel} />
        </section>

        {/* Organization */}
        {memberships.length > 1 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-ds-muted">{t('shell.organization', 'Organization')}</h3>
            {memberships.map((m) => (
              <Option
                key={m.organization_id}
                selected={m.organization_id === currentOrganization?.id}
                onSelect={() => {
                  if (m.organization_id !== currentOrganization?.id) setPendingOrg({ id: m.organization_id, name: m.organization_name })
                }}
              >
                <span className="block truncate font-medium">{m.organization_name}</span>
                <span className="block truncate text-xs text-ds-muted">
                  {[t(`shell.roles.${m.role}`, m.role.replace(/_/g, ' ')), m.department_name].filter(Boolean).join(' · ')}
                </span>
              </Option>
            ))}
            {pendingOrg && (
              <div role="alertdialog" aria-labelledby="switch-org-title" className="rounded-[6px] border border-ds-warning/40 bg-ds-warning-soft p-3">
                <p id="switch-org-title" className="text-sm font-medium text-ds-ink">
                  {t('shell.confirmSwitch', 'Switch to {{name}}?', { name: pendingOrg.name })}
                </p>
                <p className="mt-1 text-xs text-ds-ink-secondary">
                  {t('shell.confirmSwitchHint', 'Unsaved changes on this page will be lost. You will return to that organization’s home.')}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={confirmSwitch} disabled={switching}>
                    {switching ? t('shell.switching', 'Switching…') : t('shell.switch', 'Switch organization')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPendingOrg(null)}>
                    {t('shell.cancel', 'Cancel')}
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {isPlatformAdmin && !ctx.isPlatformPlane && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={async () => {
              await returnToPlatformScope()
              onClose()
              navigate('/platform')
            }}
          >
            <Crown aria-hidden="true" className="me-2 h-4 w-4" />
            {t('shell.returnToPlatform', 'Return to the Altus platform')}
          </Button>
        )}
      </div>
    </Sheet>
  )
}
