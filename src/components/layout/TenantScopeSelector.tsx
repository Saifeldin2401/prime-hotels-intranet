import React, { useState, useMemo } from 'react'
import { useTenant } from '@/contexts/TenantContext'
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Building,
  Building2,
  Check,
  ChevronDown,
  Crown,
  Globe,
  Layers,
  MapPin,
  Search,
  Sparkles,
  X
} from 'lucide-react'

interface TenantScopeSelectorProps {
  className?: string
}

export function TenantScopeSelector({ className }: TenantScopeSelectorProps) {
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
    isPlatformAdmin,
    isImpersonating,
  } = useTenant()

  const { t, i18n } = useTranslation(['nav', 'admin', 'common'])
  const isRtl = i18n.dir() === 'rtl'
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Scope status determination
  const isConsolidated = !currentHotel && !currentBrand
  const isBrandScoped = !!currentBrand && !currentHotel
  const isHotelScoped = !!currentHotel

  // Filtered hotels based on search and brand selection
  const filteredHotels = useMemo(() => {
    return availableHotels.filter(hotel => {
      // If brand is selected, optionally prioritize or filter
      const matchesBrand = !currentBrand || hotel.brand_id === currentBrand.id
      if (!matchesBrand) return false

      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      return (
        hotel.name.toLowerCase().includes(term) ||
        (hotel.name_ar && hotel.name_ar.toLowerCase().includes(term)) ||
        (hotel.hotel_code && hotel.hotel_code.toLowerCase().includes(term)) ||
        (hotel.city && hotel.city.toLowerCase().includes(term))
      )
    })
  }, [availableHotels, currentBrand, searchTerm])

  const canSwitchOrgs = organizations.length > 1 || isPlatformAdmin

  const activeScopeTitle = useMemo(() => {
    if (isHotelScoped && currentHotel) {
      return isRtl && currentHotel.name_ar ? currentHotel.name_ar : currentHotel.name
    }
    if (isBrandScoped && currentBrand) {
      return isRtl && currentBrand.name_ar ? currentBrand.name_ar : currentBrand.name
    }
    return currentOrganization ? `${currentOrganization.name} (${t('nav:all_hotels', 'All Hotels')})` : t('nav:organization_wide', 'Organization Scope')
  }, [isHotelScoped, currentHotel, isBrandScoped, currentBrand, currentOrganization, isRtl, t])

  const activeScopeSubtitle = useMemo(() => {
    if (isHotelScoped && currentHotel) {
      const city = currentHotel.city || currentHotel.country || ''
      const brand = availableBrands.find(b => b.id === currentHotel.brand_id)
      return brand ? `${brand.name} • ${city}` : city || currentOrganization?.name
    }
    if (isBrandScoped && currentBrand) {
      return `${t('admin:brand_division', 'Brand Division')} • ${currentOrganization?.name || ''}`
    }
    return currentOrganization?.name ? `${t('admin:tenant_scope', 'Tenant Scope')} • ${currentOrganization.name}` : t('nav:organization_wide', 'Organization Scope')
  }, [isHotelScoped, currentHotel, isBrandScoped, currentBrand, availableBrands, currentOrganization, t])

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-13 min-w-[240px] max-w-[320px] bg-hotel-navy-dark border border-hotel-gold/30 text-white hover:bg-hotel-navy-light focus:ring-hotel-gold/50 focus:ring-2 transition-all duration-300 rounded-xl shadow-lg relative group overflow-hidden px-3.5 py-2",
            isConsolidated && "border-hotel-gold/60 bg-gradient-to-r from-hotel-navy-dark via-hotel-navy to-hotel-navy-light shadow-[0_0_15px_rgba(212,175,55,0.15)]",
            className
          )}
          aria-label={t('nav:select_working_context', 'Select working context')}
        >
          {isConsolidated && (
            <div className="absolute inset-0 bg-hotel-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          )}

          <div className="flex items-center gap-3 w-full text-start">
            {/* Scope Type Icon Avatar */}
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300",
              isHotelScoped
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 group-hover:bg-amber-500/30"
                : isBrandScoped
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 group-hover:bg-blue-500/30"
                  : "bg-gradient-to-br from-hotel-gold via-yellow-500 to-yellow-600 text-hotel-navy shadow-md group-hover:brightness-110"
            )}>
              {isHotelScoped ? (
                <Building className="h-4 w-4" />
              ) : isBrandScoped ? (
                <Crown className="h-4 w-4" />
              ) : (
                <Globe className="h-4 w-4 stroke-[2.5]" />
              )}
            </div>

            {/* Scope Title & Hierarchy Label */}
            <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5 leading-none mb-1">
                <span className={cn(
                  "text-[9.5px] uppercase tracking-[0.1em] font-bold truncate",
                  isConsolidated ? "text-hotel-gold" : "text-white/70"
                )}>
                  {isHotelScoped
                    ? t('admin:hotel_location', 'Hotel Property')
                    : isBrandScoped
                      ? t('admin:brand_division', 'Brand Division')
                      : t('admin:tenant_scope', 'Tenant Organization')}
                </span>

                {isImpersonating && (
                  <Badge className="bg-amber-500 text-hotel-navy text-[9px] font-bold px-1 py-0 h-3.5 leading-none">
                    {t('admin:acting_as', 'Acting As')}
                  </Badge>
                )}
              </div>

              <span className="text-[13px] font-semibold text-white/95 truncate tracking-wide leading-tight">
                {activeScopeTitle}
              </span>
            </div>

            <ChevronDown className="h-4 w-4 text-hotel-gold/80 shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180" />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-[340px] max-h-[560px] border border-hotel-gold/20 bg-hotel-navy shadow-2xl shadow-black/50 rounded-xl p-0 overflow-hidden text-white"
        align="start"
        side="bottom"
        sideOffset={8}
      >
        {/* Header Summary */}
        <div className="p-4 bg-gradient-to-br from-hotel-navy-dark via-hotel-navy to-hotel-navy-light border-b border-hotel-gold/20 relative overflow-hidden">
          <div className="absolute top-0 end-0 w-32 h-32 bg-hotel-gold/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-hotel-gold uppercase tracking-[0.12em]">
                {t('admin:organizational_scope', 'Organizational Scope')}
              </p>
              <p className="text-[11px] text-white/60 mt-0.5 font-medium">
                {currentOrganization?.name || t('nav:switch_scope_desc', 'Select organization or property')}
              </p>
            </div>
            {isPlatformAdmin && (
              <Badge className="bg-hotel-gold/20 text-hotel-gold border border-hotel-gold/40 text-[10px] font-bold">
                <Sparkles className="h-2.5 w-2.5 me-1" />
                Super Admin
              </Badge>
            )}
          </div>

          {/* Quick Search Input */}
          <div className="mt-3 relative">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('nav:search_hotels_brands', 'Search hotels, brands...')}
              className="h-8 ps-8 pe-8 text-xs bg-hotel-navy-dark/70 border-hotel-gold/30 text-white placeholder:text-white/40 rounded-lg focus-visible:ring-hotel-gold/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Scope Options */}
        <div className="overflow-y-auto max-h-[420px] p-2 space-y-3 custom-scrollbar">
          {/* 1. ORGANIZATIONS (Multi-Tenant Switcher) */}
          {canSwitchOrgs && (
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-hotel-gold/80 flex items-center gap-1.5">
                <Building className="h-3 w-3" />
                <span>{t('admin:organizations', 'Organizations (Tenants)')}</span>
              </DropdownMenuLabel>
              {organizations.map(org => {
                const isSelectedOrg = currentOrganization?.id === org.id
                return (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => switchOrganization(org.id)}
                    className={cn(
                      "cursor-pointer rounded-lg px-2.5 py-2 text-xs transition-colors flex items-center justify-between border",
                      isSelectedOrg
                        ? "bg-hotel-navy-light text-white border-hotel-gold/40 shadow-sm"
                        : "text-white/80 hover:bg-hotel-navy-light/50 border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-hotel-navy flex items-center justify-center text-[10px] font-bold text-hotel-gold border border-hotel-gold/30 shrink-0">
                        {org.name.charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-white truncate">{org.name}</span>
                        {org.name_ar && <span className="text-[10px] text-white/50 truncate font-arabic">{org.name_ar}</span>}
                      </div>
                    </div>
                    {isSelectedOrg && <Check className="h-4 w-4 text-hotel-gold shrink-0 ms-2" />}
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator className="bg-hotel-gold/15 my-2" />
            </DropdownMenuGroup>
          )}

          {/* 2. TENANT ORGANIZATION SCOPE (ALL HOTELS IN TENANT) */}
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                setBrandScope(null)
                setHotelScope(null)
              }}
              className={cn(
                "cursor-pointer rounded-xl px-3 py-2.5 text-xs transition-all flex items-center justify-between border",
                isConsolidated
                  ? "bg-gradient-to-r from-hotel-navy to-hotel-navy-light text-white border-hotel-gold shadow-[0_2px_12px_rgba(212,175,55,0.15)]"
                  : "text-white/80 hover:bg-hotel-navy-light/40 border-hotel-gold/10"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                  isConsolidated ? "bg-gradient-to-br from-hotel-gold to-yellow-600 text-hotel-navy" : "bg-white/10 text-hotel-gold"
                )}>
                  <Globe className="h-4 w-4 stroke-[2.5]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-white text-[13px] truncate">
                    {currentOrganization ? `${currentOrganization.name} (${t('nav:all_hotels', 'All Hotels')})` : t('nav:organization_wide', 'Organization Scope')}
                  </span>
                  <span className="text-[10px] text-hotel-gold/90 truncate">
                    {t('nav:tenant_wide_scope', 'Tenant-wide unified learning & knowledge view')}
                  </span>
                </div>
              </div>
              {isConsolidated && (
                <div className="w-5 h-5 rounded-full bg-hotel-gold text-hotel-navy flex items-center justify-center shadow">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          {/* 3. BRANDS FILTER SECTION (If brands exist) */}
          {availableBrands.length > 0 && (
            <DropdownMenuGroup>
              <div className="flex items-center justify-between px-2 pt-1 pb-1">
                <DropdownMenuLabel className="p-0 text-[10px] font-bold uppercase tracking-wider text-hotel-gold/80 flex items-center gap-1.5">
                  <Crown className="h-3 w-3" />
                  <span>{t('admin:brand_divisions', 'Brand Divisions')}</span>
                </DropdownMenuLabel>
                {currentBrand && (
                  <button
                    onClick={() => setBrandScope(null)}
                    className="text-[10px] text-hotel-gold/80 hover:text-hotel-gold underline"
                  >
                    {t('common:clear', 'Clear')}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {availableBrands.map(brand => {
                  const isSelectedBrand = currentBrand?.id === brand.id
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => {
                        if (isSelectedBrand) {
                          setBrandScope(null)
                        } else {
                          setBrandScope(brand.id)
                        }
                      }}
                      className={cn(
                        "rounded-lg p-2 text-start transition-all border flex flex-col justify-between",
                        isSelectedBrand
                          ? "bg-hotel-gold/15 border-hotel-gold text-white font-semibold"
                          : "bg-hotel-navy-light/20 hover:bg-hotel-navy-light/40 border-hotel-gold/10 text-white/70"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-medium truncate">{brand.name}</span>
                        {isSelectedBrand && <Check className="h-3 w-3 text-hotel-gold shrink-0" />}
                      </div>
                      {brand.code && (
                        <span className="text-[9px] font-mono text-hotel-gold/70 mt-1">{brand.code}</span>
                      )}
                    </button>
                  )
                })}
              </div>
              <DropdownMenuSeparator className="bg-hotel-gold/15 my-2" />
            </DropdownMenuGroup>
          )}

          {/* 4. HOTELS & LOCATIONS LIST */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-hotel-gold/80 flex items-center gap-1.5">
              <Building2 className="h-3 w-3" />
              <span>{t('admin:hotels_locations', 'Hotels & Locations')} ({filteredHotels.length})</span>
            </DropdownMenuLabel>

            {filteredHotels.length === 0 ? (
              <div className="text-center py-4 text-xs text-white/50">
                {t('admin:no_hotels_match', 'No hotels match the selected filter.')}
              </div>
            ) : (
              filteredHotels.map(hotel => {
                const isSelectedHotel = currentHotel?.id === hotel.id
                const brand = availableBrands.find(b => b.id === hotel.brand_id)

                return (
                  <DropdownMenuItem
                    key={hotel.id}
                    onClick={() => setHotelScope(hotel.id)}
                    className={cn(
                      "cursor-pointer rounded-lg px-2.5 py-2.5 text-xs transition-colors flex items-center justify-between border my-1",
                      isSelectedHotel
                        ? "bg-hotel-navy-light text-white border-hotel-gold/50 shadow-sm"
                        : "text-white/80 hover:bg-hotel-navy-light/50 border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors",
                        isSelectedHotel ? "bg-hotel-gold/25 text-hotel-gold border border-hotel-gold/40" : "bg-white/5 text-white/60"
                      )}>
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white text-xs truncate">{hotel.name}</span>
                          {hotel.hotel_code && (
                            <Badge variant="outline" className="h-3.5 px-1 text-[8px] font-mono border-hotel-gold/30 text-hotel-gold/90">
                              {hotel.hotel_code}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-white/50 truncate mt-0.5">
                          {hotel.city && <span>{hotel.city}</span>}
                          {brand && <span>• {brand.name}</span>}
                          {hotel.name_ar && <span className="font-arabic">({hotel.name_ar})</span>}
                        </div>
                      </div>
                    </div>
                    {isSelectedHotel && (
                      <div className="w-4 h-4 rounded-full bg-hotel-gold text-hotel-navy flex items-center justify-center shrink-0 ms-2">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </DropdownMenuItem>
                )
              })
            )}
          </DropdownMenuGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
