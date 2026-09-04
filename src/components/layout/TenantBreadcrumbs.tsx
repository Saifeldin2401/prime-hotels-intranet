import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTenant } from '@/contexts/TenantContext'
import { ROUTES, getGroupConfig, type NavigationGroup } from '@/config/navigation'
import { Building2, Building, Crown, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TenantBreadcrumbs() {
  const location = useLocation()
  const { t } = useTranslation(['nav', 'common', 'admin'])
  const {
    currentOrganization,
    currentHotel,
    availableHotels,
    setHotelScope,
    isPlatformScope,
    isImpersonating,
  } = useTenant()

  // Identify matching route configuration
  const activeRoute = React.useMemo(() => {
    // 1. Exact match
    const exact = ROUTES.find((r) => r.path === location.pathname)
    if (exact) return exact

    // 2. Child routes check
    for (const r of ROUTES) {
      if (r.children) {
        const childMatch = r.children.find((c) => c.path === location.pathname)
        if (childMatch) {
          return {
            ...childMatch,
            group: r.group,
          }
        }
      }
    }

    // 3. Prefix match (longest path wins)
    const prefixes = ROUTES.filter(
      (r) => r.path !== '/' && location.pathname.startsWith(r.path)
    ).sort((a, b) => b.path.length - a.path.length)

    return prefixes[0] || null
  }, [location.pathname])

  // Get active domain group config
  const groupConfig = React.useMemo(() => {
    if (!activeRoute?.group) return null
    return getGroupConfig(activeRoute.group as NavigationGroup)
  }, [activeRoute])

  // Don't display empty breadcrumb on root landing or missing context
  if (location.pathname === '/' && !currentOrganization && !isPlatformScope) {
    return null
  }

  const GroupIcon = groupConfig?.icon

  return (
    <nav
      aria-label="Hierarchy Breadcrumb"
      className="mb-4 flex items-center justify-between rounded-lg border border-border/50 bg-card/60 px-3 py-2 text-xs backdrop-blur-sm shadow-xs"
    >
      <Breadcrumb>
        <BreadcrumbList className="gap-1 sm:gap-1.5 text-xs">
          {/* Level 1: Organization / Platform Global Scope */}
          <BreadcrumbItem>
            {isPlatformScope ? (
              <BreadcrumbLink asChild>
                <Link
                  to="/platform"
                  className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700"
                >
                  <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>{t('nav:groups.platform_operations', 'Platform Control Center')}</span>
                </Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbLink asChild>
                <Link
                  to="/dashboard"
                  className={cn(
                    'flex items-center gap-1.5 font-semibold transition-colors hover:text-hotel-gold',
                    isImpersonating
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-foreground'
                  )}
                >
                  <Building2 className="h-3.5 w-3.5 text-hotel-gold shrink-0" />
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">
                    {currentOrganization?.name || t('nav:breadcrumbs.organization_scope', 'Organization')}
                  </span>
                </Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>

          {/* Level 2: Property Context (when not in platform scope) */}
          {!isPlatformScope && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {availableHotels && availableHotels.length > 1 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted/60"
                        title={t('nav:hierarchy_scope', 'Hierarchy Scope')}
                      >
                        <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[120px] sm:max-w-[180px]">
                          {currentHotel?.name || t('nav:breadcrumbs.all_properties', 'All Properties')}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 text-xs">
                      <DropdownMenuItem
                        onClick={() => setHotelScope(null)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{t('nav:breadcrumbs.all_properties', 'All Properties')}</span>
                        </div>
                        {!currentHotel && <Check className="h-3.5 w-3.5 text-hotel-gold" />}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {availableHotels.map((hotel) => (
                        <DropdownMenuItem
                          key={hotel.id}
                          onClick={() => setHotelScope(hotel.id)}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate">{hotel.name}</span>
                          {currentHotel?.id === hotel.id && (
                            <Check className="h-3.5 w-3.5 text-hotel-gold" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[140px] sm:max-w-[200px]">
                      {currentHotel?.name || t('nav:breadcrumbs.all_properties', 'All Properties')}
                    </span>
                  </span>
                )}
              </BreadcrumbItem>
            </>
          )}

          {/* Level 3: SaaS Domain / Section Group */}
          {groupConfig && groupConfig.id !== 'home_workspace' && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                  {GroupIcon && <GroupIcon className="h-3.5 w-3.5 shrink-0 opacity-75" />}
                  <span className="truncate max-w-[120px] sm:max-w-[160px]">
                    {t(groupConfig.title)}
                  </span>
                </span>
              </BreadcrumbItem>
            </>
          )}

          {/* Level 4: Active Page Leaf */}
          {activeRoute && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-foreground truncate max-w-[140px] sm:max-w-[220px]">
                  {t(activeRoute.title)}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </nav>
  )
}
