import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLens, type SystemLens } from '@/contexts/LensContext'
import { useTenant } from '@/contexts/TenantContext'
import { cn } from '@/lib/utils'
import {
  Crown,
  Building2,
  Building,
  GraduationCap,
  Sparkles,
  Check,
} from 'lucide-react'

export function DashboardLensBar() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation(['nav', 'admin', 'common'])
  const isRtl = i18n.dir() === 'rtl'
  const { activeLens, availableLenses, switchLens } = useLens()
  const { currentOrganization, currentHotel, availableHotels } = useTenant()

  const validLenses = availableLenses.filter((l) => l.isAvailable)

  // If the user only has 1 operational lens, no need to show the switcher bar
  if (validLenses.length <= 1) {
    return null
  }

  const getLensIcon = (id: SystemLens) => {
    switch (id) {
      case 'platform':
        return <Crown className="h-4 w-4 text-amber-400" />
      case 'corporate':
        return <Building2 className="h-4 w-4 text-hotel-gold" />
      case 'property':
        return <Building className="h-4 w-4 text-emerald-400" />
      case 'learner':
        return <GraduationCap className="h-4 w-4 text-blue-400" />
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-card/80 border border-border/60 shadow-sm backdrop-blur-xl">
      <div className="flex items-center gap-2 ps-2">
        <Sparkles className="h-4 w-4 text-hotel-gold animate-pulse" />
        <span className="text-xs font-semibold text-foreground tracking-wide font-serif">
          {t('nav:operational_lens', 'Operational Perspective')}:
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {validLenses.map((lens) => {
          const isActive = activeLens === lens.id
          return (
            <button
              key={lens.id}
              type="button"
              onClick={() => void switchLens(lens.id, navigate)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-[0.98]",
                isActive
                  ? "bg-hotel-navy text-white shadow-md border border-hotel-gold/60 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent"
              )}
            >
              {getLensIcon(lens.id)}
              <span>{isRtl ? lens.labelAr : lens.labelEn}</span>
              {isActive && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-hotel-gold shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
export default DashboardLensBar
