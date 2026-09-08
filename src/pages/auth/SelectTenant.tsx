import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTenant } from '@/contexts/TenantContext'
import { useAccountContext } from '@/hooks/useAccountContext'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageSkeleton } from '@/components/ui/loading-skeleton'
import { Building2, Crown, Check, ArrowRight, ArrowLeft, Shield } from 'lucide-react'

export default function SelectTenant() {
  const { 
    currentOrganization, 
    organizations, 
    switchOrganization, 
    isLoading, 
    isPlatformAdmin, 
    exitImpersonation 
  } = useTenant()
  const account = useAccountContext()
  const { t, i18n } = useTranslation(['admin', 'common', 'nav'])
  const isRtl = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const location = useLocation()
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  const handleSelectTenant = async (orgId: string) => {
    await switchOrganization(orgId)
    const destination = account.recommendedDestination && account.recommendedDestination !== '/platform'
      ? account.recommendedDestination
      : '/dashboard'
    navigate(destination)
  }

  const handleGoToPlatform = async () => {
    await exitImpersonation()
    navigate('/platform')
  }

  if (isLoading) {
    return <PageSkeleton />
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-hotel-gold/15 border border-hotel-gold/30 mb-3 shadow-sm">
            <Building2 className="h-8 w-8 text-hotel-gold" />
          </div>
          <h1 className="text-2xl font-bold font-serif tracking-tight text-foreground sm:text-3xl">
            {t('admin:select_organization', 'Select Your Organization')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {t('admin:select_organization_subtitle', 'Choose the organization environment you wish to operate in.')}
          </p>
        </div>

        <Card className="border-border/80 shadow-2xl bg-card/95 backdrop-blur-xl">
          <CardContent className="p-4 sm:p-6 space-y-3">
            {isPlatformAdmin && (
              <button
                onClick={handleGoToPlatform}
                className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 transition-all text-start group shadow-xs mb-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-300">
                        {t('admin:platform_control_plane', 'Platform Control Center')}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase border-amber-400/40 text-amber-500 bg-amber-500/10">
                        {t('admin:global_saas_scope', 'Global Scope')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {t('admin:operate_at_platform_level', 'Manage overall SaaS platform, tenants, and master templates')}
                    </p>
                  </div>
                </div>
                <ArrowIcon className={cn("h-4 w-4 text-amber-500 transition-transform shrink-0", isRtl ? "group-hover:-translate-x-1" : "group-hover:translate-x-1")} />
              </button>
            )}

            {organizations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                {t('admin:no_organizations_available', 'No active organizations found for your account.')}
              </div>
            ) : (
              organizations.map((org) => {
                const isSelected = currentOrganization?.id === org.id
                return (
                  <button
                    key={org.id}
                    onClick={() => handleSelectTenant(org.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-start group ${
                      isSelected
                        ? 'border-hotel-gold bg-hotel-gold/10 shadow-sm'
                        : 'border-border/70 hover:border-hotel-gold/50 bg-background/60 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                        isSelected
                          ? 'bg-hotel-gold text-hotel-navy shadow-xs'
                          : 'bg-hotel-gold/15 border border-hotel-gold/30 text-hotel-gold'
                      }`}>
                        {org.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground group-hover:text-hotel-gold transition-colors">
                            {org.name}
                          </span>
                          {isSelected && (
                            <Badge className="bg-hotel-gold text-hotel-navy text-[10px] font-bold">
                              {t('common:active', 'Current')}
                            </Badge>
                          )}
                        </div>
                        {org.industry && (
                          <p className="text-xs text-muted-foreground capitalize mt-0.5">
                            {org.industry}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <Check className="h-4 w-4 text-hotel-gold shrink-0" />
                      ) : (
                        <ArrowIcon className={cn("h-4 w-4 text-muted-foreground group-hover:text-hotel-gold transition-all shrink-0", isRtl ? "group-hover:-translate-x-1" : "group-hover:translate-x-1")} />
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
