import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { safeLocalStorage } from '@/lib/storage'
import type { Organization } from '@/lib/types/tenant'
import {
  Building,
  Building2,
  Check,
  Crown,
  Globe,
  Layers,
  MapPin,
  Search,
  ShieldAlert,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

interface ScopePaletteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScopePaletteModal({ open, onOpenChange }: ScopePaletteModalProps) {
  const { t, i18n } = useTranslation(['nav', 'admin', 'common'])
  const isRtl = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const { toast } = useToast()

  const {
    currentOrganization,
    organizations,
    availableBrands,
    availableHotels,
    currentBrand,
    currentHotel,
    switchOrganization,
    setBrandScope,
    setHotelScope,
    refreshTenantData,
    isPlatformAdmin,
    isPlatformScope,
    isImpersonating,
    enterOrganization,
    exitImpersonation,
  } = useTenant()

  // Audited break-glass entry state for platform operators
  const [selectedOrgForEnter, setSelectedOrgForEnter] = useState<Organization | null>(null)
  const [enterReason, setEnterReason] = useState('')
  const [actingRole, setActingRole] = useState('organization_admin')
  const [isEntering, setIsEntering] = useState(false)

  // Listen for Ctrl+O or Cmd+O
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Only ignore if inside an input other than the command dialog itself
        if (!target.closest('[cmdk-root]')) return
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  const handleSelectPlatformPlane = async () => {
    onOpenChange(false)
    if (isImpersonating) {
      try {
        await exitImpersonation()
        toast({
          title: t('admin:return_to_platform', 'Return to Platform Control Plane'),
          description: t('admin:global_saas_scope', 'Global SaaS Scope restored.'),
        })
      } catch (err: unknown) {
        const error = err as { message?: string }
        toast({
          title: t('common:error', 'Error'),
          description: error?.message || 'Failed to exit session',
          variant: 'destructive',
        })
      }
    }
    safeLocalStorage.setItem('altus_active_tenant_id', '__platform__')
    await refreshTenantData()
    navigate('/platform')
  }

  const handleOrgSelect = async (org: Organization) => {
    if (currentOrganization?.id === org.id) {
      onOpenChange(false)
      return
    }
    onOpenChange(false)
    try {
      await switchOrganization(org.id)
      toast({
        title: t('nav:organization_wide', 'Organization Scope'),
        description: `${org.name}`,
      })
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to switch organization',
        variant: 'destructive',
      })
    }
  }

  const handleConfirmEnterOrg = async () => {
    if (!selectedOrgForEnter) return
    if (!enterReason || enterReason.trim().length < 10) {
      toast({
        title: t('common:error', 'Error'),
        description: t('admin:reason_min_chars', 'At least 10 characters required for the immutable audit log'),
        variant: 'destructive',
      })
      return
    }

    try {
      setIsEntering(true)
      await enterOrganization(selectedOrgForEnter.id, enterReason.trim(), actingRole)
      toast({
        title: t('admin:entering', 'Customer Environment Entered'),
        description: `${selectedOrgForEnter.name} (${actingRole})`,
      })
      setSelectedOrgForEnter(null)
      navigate('/dashboard')
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to start session',
        variant: 'destructive',
      })
    } finally {
      setIsEntering(false)
    }
  }

  return (
    <>
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput
          placeholder={t('nav:search_scope_placeholder', 'Search hotels, brands, organizations... (Ctrl+O)')}
        />
        <CommandList className="max-h-[380px]">
          <CommandEmpty>{t('common:no_results', 'No scopes found.')}</CommandEmpty>

          {/* Platform Plane Shortcut for Operators */}
          {isPlatformAdmin && (
            <CommandGroup heading={t('admin:platform_control_plane', 'Platform Control Plane')}>
              <CommandItem
                onSelect={handleSelectPlatformPlane}
                className="flex items-center justify-between py-2.5 cursor-pointer aria-selected:bg-amber-500/10 aria-selected:text-amber-500"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span>{t('admin:global_saas_scope', 'Global SaaS Scope')}</span>
                      {isPlatformScope && (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px] px-1.5 py-0">
                          {t('admin:active_session', 'Active Scope')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-sans">
                      {t('admin:platform_control_plane_desc', 'Executive SaaS control, multi-tenant governance, and global operations')}
                    </p>
                  </div>
                </div>
                {isPlatformScope && <Check className="h-4 w-4 text-amber-500" />}
              </CommandItem>
            </CommandGroup>
          )}

          {/* Quick Consolidated Views */}
          {currentOrganization && (
            <CommandGroup heading={t('nav:quickActions', 'Quick Scope Actions')}>
              <CommandItem
                onSelect={() => {
                  setBrandScope(null)
                  setHotelScope(null)
                  onOpenChange(false)
                }}
                className="flex items-center justify-between py-2 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="h-4 w-4 text-hotel-gold" />
                  <span className="font-medium text-sm">
                    {t('nav:all_hotels_portfolio', 'Organization Scope (All Hotels)')}
                  </span>
                </div>
                {!currentHotel && !currentBrand && <Check className="h-4 w-4 text-hotel-gold" />}
              </CommandItem>

              {currentBrand && (
                <CommandItem
                  onSelect={() => {
                    setBrandScope(null)
                    onOpenChange(false)
                  }}
                  className="flex items-center justify-between py-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="h-4 w-4 text-blue-400" />
                    <span className="font-medium text-sm">
                      {t('nav:all_brands', 'All Brands')} (Clear Brand Filter)
                    </span>
                  </div>
                </CommandItem>
              )}
            </CommandGroup>
          )}

          {/* Organizations Group */}
          {organizations.length > 0 && (
            <CommandGroup heading={t('admin:customer_tenants', 'Customer Organizations')}>
              {organizations.map((org) => {
                const isCurrent = currentOrganization?.id === org.id
                return (
                  <CommandItem
                    key={org.id}
                    onSelect={() => handleOrgSelect(org)}
                    className="flex items-center justify-between py-2.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-hotel-navy-light text-hotel-gold border border-hotel-gold/30">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          <span>{org.name}</span>
                          {org.name_ar && isRtl && <span className="text-muted-foreground text-xs font-normal">({org.name_ar})</span>}
                          {isCurrent && (
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] px-1.5 py-0">
                              {t('admin:active_session', 'Active')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {org.organization_code} • {org.tier_plan || 'Enterprise'}
                        </p>
                      </div>
                    </div>
                    {isCurrent ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : isPlatformAdmin ? (
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-500/70" />
                    ) : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}

          {/* Brands Group within Active Org */}
          {availableBrands.length > 0 && (
            <CommandGroup heading={t('admin:tab_brands', 'Brands & Divisions')}>
              {availableBrands.map((brand) => {
                const isCurrent = currentBrand?.id === brand.id
                return (
                  <CommandItem
                    key={brand.id}
                    onSelect={() => {
                      setBrandScope(brand.id)
                      onOpenChange(false)
                    }}
                    className="flex items-center justify-between py-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="h-4 w-4 text-blue-400" />
                      <span className="font-medium text-sm">{brand.name}</span>
                      {brand.name_ar && isRtl && <span className="text-muted-foreground text-xs">({brand.name_ar})</span>}
                    </div>
                    {isCurrent && <Check className="h-4 w-4 text-blue-400" />}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}

          {/* Hotels Group within Active Org */}
          {availableHotels.length > 0 && (
            <CommandGroup heading={t('admin:tab_hotels', 'Hotels & Properties')}>
              {availableHotels.map((hotel) => {
                const isCurrent = currentHotel?.id === hotel.id
                const brand = availableBrands.find((b) => b.id === hotel.brand_id)
                return (
                  <CommandItem
                    key={hotel.id}
                    onSelect={() => {
                      setHotelScope(hotel.id)
                      onOpenChange(false)
                    }}
                    className="flex items-center justify-between py-2.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/60 text-foreground border border-border/40">
                        <Building className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          <span>{isRtl && hotel.name_ar ? hotel.name_ar : hotel.name}</span>
                          {hotel.hotel_code && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
                              {hotel.hotel_code}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {brand ? `${brand.name} • ` : ''}{hotel.city || hotel.country || ''}
                        </p>
                      </div>
                    </div>
                    {isCurrent && <Check className="h-4 w-4 text-emerald-500" />}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      {/* Platform Operator Audited Break-Glass Entry Modal */}
      <Dialog open={!!selectedOrgForEnter} onOpenChange={(open) => !open && setSelectedOrgForEnter(null)}>
        <DialogContent className="max-w-lg bg-hotel-navy-dark text-white border-hotel-gold/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-hotel-gold text-lg">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              {t('admin:enter_tenant_audited', 'Enter Customer Environment (Audited)')}
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs">
              {t('admin:enter_tenant_dialog_desc', 'Accessing a customer environment starts an audited break-glass session with mandatory security logging and TTL expiration.')}
            </DialogDescription>
          </DialogHeader>

          {selectedOrgForEnter && (
            <div className="space-y-4 py-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 text-hotel-gold" />
                  <span className="font-semibold text-sm">{selectedOrgForEnter.name}</span>
                </div>
                <Badge variant="outline" className="text-hotel-gold border-hotel-gold/30">
                  {selectedOrgForEnter.tier_plan || 'Enterprise'}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scope-acting-role" className="text-xs text-slate-200">
                  {t('admin:acting_role', 'Acting Role')}
                </Label>
                <Select value={actingRole} onValueChange={setActingRole}>
                  <SelectTrigger id="scope-acting-role" className="bg-slate-900 border-white/10 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-hotel-navy-dark border-white/20 text-white">
                    <SelectItem value="organization_admin">Organization Administrator (Full Tenant Admin)</SelectItem>
                    <SelectItem value="training_manager">Training & L&D Director</SelectItem>
                    <SelectItem value="property_gm">Hotel General Manager</SelectItem>
                    <SelectItem value="auditor">Compliance Auditor (Read-Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scope-enter-reason" className="text-xs text-slate-200">
                  {t('admin:access_reason', 'Access Justification / Reason')} *
                </Label>
                <Textarea
                  id="scope-enter-reason"
                  value={enterReason}
                  onChange={(e) => setEnterReason(e.target.value)}
                  placeholder={t('admin:access_reason_placeholder', 'State substantive business or support justification (min 10 characters)...')}
                  rows={3}
                  className="bg-slate-900 border-white/10 text-white text-xs placeholder:text-slate-500 focus-visible:ring-hotel-gold"
                />
                <p className="text-[11px] text-amber-300/80">
                  {t('admin:reason_min_chars', 'At least 10 characters required for the immutable audit log')}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedOrgForEnter(null)}
              className="text-slate-300 hover:text-white hover:bg-white/10 text-xs"
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              disabled={isEntering || enterReason.trim().length < 10}
              onClick={handleConfirmEnterOrg}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
            >
              {isEntering ? t('admin:entering', 'Starting Audited Session...') : t('admin:enter_environment', 'Enter Customer Environment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
export default ScopePaletteModal
