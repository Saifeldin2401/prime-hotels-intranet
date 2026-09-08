import { useEffect, useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { useAccountContext } from '@/hooks/useAccountContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert, LogOut, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0:00'
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Persistent context banner shown whenever a platform operator is operating
 * inside a customer tenant.
 *
 * - Normal case: an audited break-glass session (start_platform_session). Shows
 *   the tenant, the acting role, the access reason, and a live TTL countdown.
 * - Safety net: an operator who somehow has a tenant context WITHOUT a session
 *   (should not happen after the TenantContext bootstrap fix) still gets an
 *   unmistakable way back to the platform plane.
 */
export function PlatformImpersonationBanner() {
  const {
    isImpersonating,
    impersonationSession,
    currentOrganization,
    exitImpersonation,
    returnToPlatformScope,
  } = useTenant()
  const account = useAccountContext()
  const navigate = useNavigate()
  const { t } = useTranslation(['admin', 'common'])
  const [now, setNow] = useState(() => Date.now())

  const expiresAt = impersonationSession?.expires_at
    ? new Date(impersonationSession.expires_at).getTime()
    : null

  useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const operatorInStrayTenant =
    account.isPlatformOperator && !isImpersonating && !!currentOrganization

  if (!isImpersonating && !operatorInStrayTenant) return null

  const handleExit = async () => {
    if (isImpersonating) {
      await exitImpersonation()
    } else {
      await returnToPlatformScope()
    }
    navigate('/platform')
  }

  const remaining = expiresAt ? formatRemaining(expiresAt - now) : null
  const expiringSoon = expiresAt ? expiresAt - now < 5 * 60 * 1000 : false

  return (
    <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white px-4 py-2 text-xs shadow-md border-b border-amber-500/30 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center p-1 bg-black/20 rounded-md">
            <ShieldAlert className="h-4 w-4 text-amber-200 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold uppercase tracking-wider text-amber-200">
              {t('admin:platform_operator_mode', 'Platform Operator Mode')}
            </span>
            <span className="text-white/60">•</span>
            <span className="text-white/90">
              {t('admin:managing_tenant', 'Current context:')}{' '}
              <strong className="text-white underline decoration-amber-300 underline-offset-2">
                {currentOrganization?.name || 'Customer Organization'}
              </strong>
            </span>
            {isImpersonating && impersonationSession?.acting_role && (
              <Badge variant="outline" className="bg-black/20 text-amber-100 border-amber-400/40 text-[10px] uppercase font-mono">
                {impersonationSession.acting_role}
              </Badge>
            )}
            {remaining && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-mono rounded px-1.5 py-0.5 ${
                  expiringSoon ? 'bg-red-500/30 text-red-50' : 'bg-black/20 text-amber-100'
                }`}
                title={t('admin:session_expires_in', 'Break-glass session expires in')}
              >
                <Clock className="h-3 w-3" />
                {remaining}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isImpersonating && impersonationSession?.access_reason && (
            <span className="text-[11px] text-amber-100/70 hidden md:inline truncate max-w-xs" title={impersonationSession.access_reason}>
              {t('admin:access_reason_label', 'Reason:')} {impersonationSession.access_reason}
            </span>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExit}
            className="h-7 text-xs bg-white text-amber-900 hover:bg-amber-50 font-semibold shadow-sm border-0 gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t('admin:exit_to_platform_hub', 'Return to Platform')}
          </Button>
        </div>
      </div>
    </div>
  )
}
