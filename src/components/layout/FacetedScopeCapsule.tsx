import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Input } from '@/components/ui/input'
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
import { ScopePaletteModal } from '@/components/common/ScopePaletteModal'
import type { Organization } from '@/lib/types/tenant'
import { cn } from '@/lib/utils'
import {
  Building,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Crown,
  Globe,
  Layers,
  Search,
  ShieldAlert,
  Sparkles,
  Command,
} from 'lucide-react'

interface FacetedScopeCapsuleProps {
  className?: string
}

export function FacetedScopeCapsule({ className }: FacetedScopeCapsuleProps) {
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

  const { t, i18n } = useTranslation(['nav', 'admin', 'common'])
  const isRtl = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const { toast } = useToast()

  // Quick Scope Palette modal open state
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)

  // Local search filter for hotels dropdown
  const [hotelSearch, setHotelSearch] = useState('')

  // Audited break-glass entry state for platform operators
  const [selectedOrgForEnter, setSelectedOrgForEnter] = useState<Organization | null>(null)
  const [enterReason, setEnterReason] = useState('')
  const [actingRole, setActingRole] = useState('organization_admin')
  const [isEntering, setIsEntering] = useState(false)

  // Filter hotels by current brand and local search
  const filteredHotels = useMemo(() => {
    return availableHotels.filter((hotel) => {
      const matchesBrand = !currentBrand || hotel.brand_id === currentBrand.id
      if (!matchesBrand) return false
      if (!hotelSearch.trim()) return true
      const term = hotelSearch.toLowerCase()
      return (
        hotel.name.toLowerCase().includes(term) ||
        (hotel.name_ar && hotel.name_ar.toLowerCase().includes(term)) ||
        (hotel.hotel_code && hotel.hotel_code.toLowerCase().includes(term)) ||
        (hotel.city && hotel.city.toLowerCase().includes(term))
      )
    })
  }, [availableHotels, currentBrand, hotelSearch])

  const handleSelectPlatformPlane = async () => {
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

  const handleOrgClick = async (org: Organization) => {
    if (currentOrganization?.id === org.id) return
    try {
      await switchOrganization(org.id)
      navigate('/dashboard')
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
        description: error?.message || 'Failed to enter organization',
        variant: 'destructive',
      })
    } finally {
      setIsEntering(false)
    }
  }

  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight

  return (
    <>
      {/* Faceted Context Capsule Container */}
      <div
        className={cn(
          "flex items-center rounded-full bg-hotel-navy-dark/95 border border-hotel-gold/30 shadow-inner px-1.5 py-1 text-xs text-white backdrop-blur-md transition-all hover:border-hotel-gold/60",
          className
        )}
      >
        {/* CASE A: PLATFORM OPERATOR IN GLOBAL SCOPE */}
        {isPlatformScope ? (
          <div className="flex items-center gap-1.5 px-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 text-amber-300 font-semibold tracking-wide border border-amber-500/40 transition-all active:scale-[0.98]"
                >
                  <Crown className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                  <span className="font-serif font-bold text-xs">
                    {t('admin:platform_control_plane', 'Platform Control Plane')}
                  </span>
                  <Badge variant="outline" className="text-[9px] border-amber-400/40 text-amber-300 bg-amber-500/10 px-1 py-0 uppercase">
                    {t('admin:global_saas_scope', 'Global Scope')}
                  </Badge>
                  <ChevronDown className="h-3 w-3 text-amber-400/80 ms-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="w-72 bg-hotel-navy-dark border-hotel-gold/30 text-white shadow-2xl p-1"
              >
                <DropdownMenuLabel className="text-xs text-amber-400 font-serif">
                  {t('admin:platform_control_plane', 'Platform Control Plane')}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigate('/platform')}
                  className="cursor-pointer text-slate-100 hover:text-white focus:bg-white/10 focus:text-white text-xs py-2"
                >
                  <Crown className="me-2 h-4 w-4 text-amber-400" />
                  <span>{t('admin:platform_control_plane', 'Go to Platform Hub')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsPaletteOpen(true)}
                  className="cursor-pointer text-slate-100 hover:text-white focus:bg-white/10 focus:text-white text-xs py-2 flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Search className="me-2 h-4 w-4 text-hotel-gold" />
                    <span>{t('nav:search_scope_placeholder', 'Quick Scope Switcher')}</span>
                  </div>
                  <kbd className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-hotel-gold">Ctrl+O</kbd>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuLabel className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
                  {t('admin:customer_tenants', 'Customer Environments (Audited)')}
                </DropdownMenuLabel>
                {organizations.slice(0, 6).map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => handleOrgClick(org)}
                    className="cursor-pointer text-slate-100 hover:text-white focus:bg-white/10 focus:text-white text-xs py-2 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-hotel-gold" />
                      <span className="truncate max-w-[170px] text-slate-100 font-medium">{org.name}</span>
                    </div>
                    <ShieldAlert className="h-3 w-3 text-amber-400 shrink-0" />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          /* CASE B: CUSTOMER TENANT SCOPE (ORG › BRAND › HOTEL) */
          <div className="flex items-center gap-1">
            {/* SEGMENT 1: ORGANIZATION */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Building2 className="h-3.5 w-3.5 text-hotel-gold shrink-0" />
                  <span className="truncate max-w-[85px] sm:max-w-[110px] xl:max-w-[160px]">
                    {currentOrganization?.name || t('nav:organization_wide', 'Organization')}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-400 ms-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="w-72 bg-hotel-navy-dark border-hotel-gold/30 text-white shadow-2xl p-1"
              >
                <DropdownMenuLabel className="text-xs text-hotel-gold font-serif">
                  {t('nav:hierarchy_scope', 'Tenant Organization')}
                </DropdownMenuLabel>
                {isPlatformAdmin && (
                  <>
                    <DropdownMenuItem
                      onClick={handleSelectPlatformPlane}
                      className="cursor-pointer text-amber-300 hover:text-amber-200 focus:bg-white/10 focus:text-amber-200 text-xs py-2 font-semibold"
                    >
                      <Crown className="me-2 h-4 w-4 text-amber-400" />
                      <span>{t('admin:return_to_platform', 'Return to Platform Control Plane')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                  </>
                )}
                {organizations.map((org) => {
                  const isCurrent = currentOrganization?.id === org.id
                  return (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => handleOrgClick(org)}
                      className={cn(
                        "cursor-pointer text-slate-100 hover:text-white focus:bg-white/10 focus:text-white text-xs py-2 flex items-center justify-between",
                        isCurrent && "bg-white/10 text-hotel-gold focus:text-hotel-gold font-semibold"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-hotel-gold" />
                        <span className={cn("truncate max-w-[180px]", isCurrent ? "text-hotel-gold" : "text-slate-100")}>{org.name}</span>
                      </div>
                      {isCurrent ? (
                        <Check className="h-3.5 w-3.5 text-hotel-gold shrink-0" />
                      ) : isPlatformAdmin ? (
                        <ShieldAlert className="h-3 w-3 text-amber-400 shrink-0" />
                      ) : null}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* BREADCRUMB SEPARATOR */}
            <ChevronIcon className="h-3 w-3 text-hotel-gold/40 shrink-0" />

            {/* SEGMENT 2: BRAND */}
            <div className="hidden md:flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors",
                      currentBrand
                        ? "text-blue-300 font-semibold hover:bg-blue-900/30"
                        : "text-slate-300 font-normal hover:bg-white/10"
                    )}
                  >
                    <Layers className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span className="truncate max-w-[70px] sm:max-w-[95px] xl:max-w-[130px]">
                      {currentBrand ? currentBrand.name : t('nav:all_brands', 'All Brands')}
                    </span>
                    <ChevronDown className="h-3 w-3 text-slate-400 ms-0.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  className="w-56 bg-hotel-navy-dark border-hotel-gold/30 text-white shadow-2xl p-1"
                >
                  <DropdownMenuLabel className="text-xs text-blue-300 font-semibold">
                    {t('admin:tab_brands', 'Brand Divisions')}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => {
                      setBrandScope(null)
                    }}
                    className={cn(
                      "cursor-pointer text-slate-100 hover:text-white focus:bg-white/10 focus:text-white text-xs py-2 flex items-center justify-between",
                      !currentBrand && "bg-white/10 text-blue-300 focus:text-blue-300 font-semibold"
                    )}
                  >
                    <span className={cn(!currentBrand ? "text-blue-300" : "text-slate-100")}>{t('nav:all_brands', 'All Brands (Consolidated)')}</span>
                    {!currentBrand && <Check className="h-3.5 w-3.5 text-blue-300" />}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {availableBrands.map((brand) => {
                    const isCurrent = currentBrand?.id === brand.id
                    return (
                      <DropdownMenuItem
                        key={brand.id}
                        onClick={() => setBrandScope(brand.id)}
                        className={cn(
                          "cursor-pointer text-slate-100 hover:text-white focus:bg-white/10 focus:text-white text-xs py-2 flex items-center justify-between",
                          isCurrent && "bg-white/10 text-blue-300 focus:text-blue-300 font-semibold"
                        )}
                      >
                        <span className={cn("truncate", isCurrent ? "text-blue-300" : "text-slate-100")}>{brand.name}</span>
                        {isCurrent && <Check className="h-3.5 w-3.5 text-blue-300" />}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* BREADCRUMB SEPARATOR */}
              <ChevronIcon className="h-3 w-3 text-hotel-gold/40 shrink-0" />
            </div>

            {/* SEGMENT 3: HOTEL / PROPERTY */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors",
                    currentHotel
                      ? "text-emerald-300 font-semibold hover:bg-emerald-900/30"
                      : "text-slate-300 font-normal hover:bg-white/10"
                  )}
                >
                  <Building className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[85px] sm:max-w-[110px] xl:max-w-[160px]">
                    {currentHotel
                      ? (isRtl && currentHotel.name_ar ? currentHotel.name_ar : currentHotel.name)
                      : t('nav:all_hotels', 'All Hotels')}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-400 ms-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-72 bg-hotel-navy-dark border-hotel-gold/30 text-white shadow-2xl p-1"
              >
                <DropdownMenuLabel className="text-xs text-emerald-400 flex items-center justify-between font-semibold">
                  <span>{t('admin:tab_hotels', 'Hotels & Properties')}</span>
                  <span className="text-[10px] text-slate-300 font-mono">
                    {filteredHotels.length} {t('dashboard:widgets.properties', 'properties')}
                  </span>
                </DropdownMenuLabel>

                {availableHotels.length > 5 && (
                  <div className="px-2 py-1.5">
                    <Input
                      value={hotelSearch}
                      onChange={(e) => setHotelSearch(e.target.value)}
                      placeholder={t('admin:search_placeholder', 'Filter hotels...')}
                      className="h-7 text-xs bg-slate-900 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-hotel-gold"
                    />
                  </div>
                )}

                <DropdownMenuItem
                  onClick={() => setHotelScope(null)}
                  className={cn(
                    "cursor-pointer text-slate-100 hover:text-white focus:bg-white/10 focus:text-white text-xs py-2 flex items-center justify-between",
                    !currentHotel && "bg-white/10 text-emerald-400 focus:text-emerald-400 font-semibold"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-hotel-gold" />
                    <span className={cn(!currentHotel ? "text-emerald-400 font-medium" : "text-slate-100")}>
                      {t('nav:all_hotels_portfolio', 'All Hotels (Consolidated View)')}
                    </span>
                  </div>
                  {!currentHotel && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-white/10" />

                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {filteredHotels.map((hotel) => {
                    const isCurrent = currentHotel?.id === hotel.id
                    return (
                      <DropdownMenuItem
                        key={hotel.id}
                        onClick={() => setHotelScope(hotel.id)}
                        className={cn(
                          "cursor-pointer text-slate-100 hover:text-white focus:bg-white/10 focus:text-white text-xs py-2 flex items-center justify-between",
                          isCurrent && "bg-white/10 text-emerald-400 focus:text-emerald-400 font-semibold"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Building className="h-3.5 w-3.5 text-hotel-gold shrink-0" />
                          <div className="flex flex-col truncate">
                            <span className={cn("truncate font-medium", isCurrent ? "text-emerald-400" : "text-slate-100")}>
                              {isRtl && hotel.name_ar ? hotel.name_ar : hotel.name}
                            </span>
                            <span className="text-[10px] text-slate-300 truncate">
                              {hotel.city || hotel.country || ''} {hotel.hotel_code ? `• ${hotel.hotel_code}` : ''}
                            </span>
                          </div>
                        </div>
                        {isCurrent && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                      </DropdownMenuItem>
                    )
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* QUICK SEARCH PALETTE ICON (Ctrl+O) */}
        <button
          type="button"
          onClick={() => setIsPaletteOpen(true)}
          title={t('nav:search_scope_placeholder', 'Quick Scope Switcher (Ctrl+O)')}
          className="ms-1 flex h-6 w-6 items-center justify-center rounded-full text-hotel-gold/70 hover:text-hotel-gold hover:bg-white/10 transition-colors"
          aria-label="Open scope palette"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Scope Palette Modal */}
      <ScopePaletteModal open={isPaletteOpen} onOpenChange={setIsPaletteOpen} />

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
                <Label htmlFor="capsule-acting-role" className="text-xs text-slate-200">
                  {t('admin:acting_role', 'Acting Role')}
                </Label>
                <Select value={actingRole} onValueChange={setActingRole}>
                  <SelectTrigger id="capsule-acting-role" className="bg-slate-900 border-white/10 text-white text-xs">
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
                <Label htmlFor="capsule-enter-reason" className="text-xs text-slate-200">
                  {t('admin:access_reason', 'Access Justification / Reason')} *
                </Label>
                <Textarea
                  id="capsule-enter-reason"
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
export default FacetedScopeCapsule
