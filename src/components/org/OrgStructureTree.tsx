import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { platformService } from '@/services/platformService'
import {
  Building2,
  Hotel,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Search,
  Users,
  MapPin,
  RefreshCw,
  FolderTree,
  ShieldAlert
} from 'lucide-react'

interface OrgStructureTreeProps {
  orgId: string
  className?: string
}

export function OrgStructureTree({ orgId, className = '' }: OrgStructureTreeProps) {
  const { t, i18n } = useTranslation(['admin', 'common'])
  const isRTL = i18n.dir() === 'rtl'
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']))

  const { data: structure, isLoading, refetch, error } = useQuery({
    queryKey: ['org-structure-tree', orgId],
    queryFn: () => platformService.getOrgStructure(orgId),
    enabled: !!orgId,
  })

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => {
    if (!structure) return
    const all = new Set<string>(['root'])
    structure.brands?.forEach((b) => {
      all.add(`brand-${b.id}`)
      b.hotels?.forEach((h) => all.add(`hotel-${h.id}`))
    })
    structure.hotels?.forEach((h) => all.add(`hotel-${h.id}`))
    setExpandedNodes(all)
  }

  const collapseAll = () => {
    setExpandedNodes(new Set(['root']))
  }

  // Filter hotels / departments based on search term
  const filteredHotels = useMemo(() => {
    if (!structure?.hotels) return []
    if (!searchTerm.trim()) return structure.hotels
    const q = searchTerm.toLowerCase()
    return structure.hotels.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.city && h.city.toLowerCase().includes(q)) ||
        h.departments?.some((d) => d.name.toLowerCase().includes(q))
    )
  }, [structure, searchTerm])

  const totalHotels = (structure?.hotels?.length || 0) + (structure?.brands?.reduce((acc, b) => acc + (b.hotels?.length || 0), 0) || 0)
  const totalDepts = (structure?.hotels?.reduce((acc, h) => acc + (h.departments?.length || 0), 0) || 0)

  if (isLoading) {
    return (
      <Card className={`border shadow-sm p-8 text-center ${className}`}>
        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-500 mb-2" />
        <p className="text-xs text-muted-foreground">{t('common.loading', 'Loading organizational hierarchy...')}</p>
      </Card>
    )
  }

  if (error || !structure) {
    return (
      <Card className={`border border-rose-500/30 bg-rose-500/5 p-6 ${className}`}>
        <div className="flex items-center gap-3 text-rose-700 dark:text-rose-300">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div className="text-xs font-semibold">
            {t('admin.org_structure_failed', 'Failed to load organization hierarchy structure.')}
          </div>
        </div>
      </Card>
    )
  }

  const org = structure.organization

  return (
    <Card className={`border shadow-sm overflow-hidden ${className}`}>
      <CardHeader className="p-5 pb-3 bg-card border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <FolderTree className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>{t('admin.org_structure_title', 'Organizational Hierarchy Tree')}</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {totalHotels} Hotels • {totalDepts} Departments
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                {t('admin.org_structure_subtitle', 'Interactive multi-tier map of brands, hotel properties, and operational units.')}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={expandAll} className="h-8 text-xs">
              {t('common.expand_all', 'Expand All')}
            </Button>
            <Button size="sm" variant="ghost" onClick={collapseAll} className="h-8 text-xs">
              {t('common.collapse_all', 'Collapse All')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="h-8 text-xs">
              <RefreshCw className="h-3 w-3 me-1" />
              {t('common.refresh', 'Refresh')}
            </Button>
          </div>
        </div>

        <div className="mt-3 relative">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground ${isRTL ? 'end-3' : 'start-3'}`} />
          <Input
            placeholder={t('admin.search_structure', 'Filter properties or departments...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`h-8 text-xs ${isRTL ? 'pe-8' : 'ps-8'}`}
          />
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Root Organization Node */}
        <div className="rounded-2xl border bg-slate-500/5 p-4 space-y-3">
          <div
            onClick={() => toggleNode('root')}
            className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity select-none"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-foreground flex items-center gap-2">
                  <span>{org.name}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] capitalize ${
                      org.lifecycle_status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                    }`}
                  >
                    {org.lifecycle_status}
                  </Badge>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">ID: {org.id}</div>
              </div>
            </div>

            <Button variant="ghost" size="icon" className="h-7 w-7">
              {expandedNodes.has('root') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>

          {/* Children Hotels */}
          {expandedNodes.has('root') && (
            <div className="ps-4 sm:ps-6 space-y-3 border-s-2 border-amber-500/20 ms-3 mt-3">
              {filteredHotels.length === 0 ? (
                <div className="py-4 text-xs text-muted-foreground italic">
                  {searchTerm ? 'No properties matching search filter.' : 'No active properties mapped.'}
                </div>
              ) : (
                filteredHotels.map((hotel) => {
                  const isHotelExpanded = expandedNodes.has(`hotel-${hotel.id}`)
                  return (
                    <div key={hotel.id} className="rounded-xl border bg-card p-3.5 space-y-2 shadow-xs">
                      <div
                        onClick={() => toggleNode(`hotel-${hotel.id}`)}
                        className="flex items-center justify-between cursor-pointer hover:opacity-80 select-none"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                            <Hotel className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground flex items-center gap-2">
                              <span>{hotel.name}</span>
                              {hotel.city && (
                                <Badge variant="secondary" className="text-[9px] font-normal gap-0.5">
                                  <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                                  {hotel.city}
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span>{hotel.departments?.length || 0} Departments</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Users className="h-2.5 w-2.5" />
                                {hotel.member_count} Staff
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {isHotelExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </Button>
                      </div>

                      {/* Hotel Departments */}
                      {isHotelExpanded && (
                        <div className="pt-2 border-t mt-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                            Departments ({hotel.departments?.length || 0})
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {hotel.departments?.map((dept) => (
                              <div
                                key={dept.id}
                                className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border text-xs"
                              >
                                <Briefcase className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                <span className="truncate font-medium text-foreground text-[11px]">{dept.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
