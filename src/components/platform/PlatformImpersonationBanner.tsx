import { useTenant } from '@/contexts/TenantContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert, LogOut, ArrowRight, Building, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function PlatformImpersonationBanner() {
  const { isImpersonating, impersonationSession, currentOrganization, exitImpersonation } = useTenant()
  const navigate = useNavigate()
  const { t } = useTranslation(['admin', 'common'])

  if (!isImpersonating || !impersonationSession) return null

  const handleExit = async () => {
    await exitImpersonation()
    navigate('/platform')
  }

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
              {t('admin:managing_tenant', 'Currently Operating in:')}{' '}
              <strong className="text-white underline decoration-amber-300 underline-offset-2">
                {currentOrganization?.name || 'Customer Organization'}
              </strong>
            </span>
            <Badge variant="outline" className="bg-black/20 text-amber-100 border-amber-400/40 text-[10px] uppercase font-mono">
              {impersonationSession.acting_role}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-amber-100/70 hidden md:inline truncate max-w-xs" title={impersonationSession.access_reason}>
            Reason: {impersonationSession.access_reason}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExit}
            className="h-7 text-xs bg-white text-amber-900 hover:bg-amber-50 font-semibold shadow-sm border-0 gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t('admin:exit_to_platform_hub', 'Exit to Platform Hub')}
          </Button>
        </div>
      </div>
    </div>
  )
}
