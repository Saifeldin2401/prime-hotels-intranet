import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTenant } from '@/contexts/TenantContext'
import { useLens } from '@/contexts/LensContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Building2,
  Building,
  Layers,
  Users,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Sparkles,
  Settings,
  FileCheck,
  ExternalLink,
} from 'lucide-react'

export function CorporateExecutiveBento() {
  const { t, i18n } = useTranslation(['admin', 'dashboard', 'common', 'nav'])
  const isRtl = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const { currentOrganization, availableHotels, availableBrands, setHotelScope } = useTenant()
  const { switchLens } = useLens()

  const handleDrillIntoProperty = async (hotelId: string) => {
    setHotelScope(hotelId)
    await switchLens('property', navigate)
  }

  return (
    <div className="space-y-6">
      {/* Executive Portfolio Scorecard Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-hotel-gold/30 bg-gradient-to-r from-hotel-navy-dark via-hotel-navy to-hotel-navy-light p-6 sm:p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full bg-hotel-gold/15 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-hotel-gold/20 text-hotel-gold border border-hotel-gold/30 text-xs font-bold uppercase tracking-wider">
                <Building2 className="h-3.5 w-3.5" />
                {currentOrganization?.name || 'Corporate Executive Scope'}
              </span>
              <Badge variant="outline" className="text-[11px] text-emerald-400 border-emerald-500/40 bg-emerald-500/10">
                Group Consolidated View
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">
              Corporate Portfolio Command Deck
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Consolidated enterprise oversight across all hospitality properties, brand divisions, and operational compliance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/organization')}
              className="border-hotel-gold/30 text-white bg-white/5 hover:bg-white/10 text-xs"
            >
              <Settings className="h-3.5 w-3.5 me-1.5 text-hotel-gold" />
              <span>{t('admin:organization.title', 'Org Center')}</span>
            </Button>
            <Button
              onClick={() => navigate('/training/admin')}
              className="bg-hotel-gold hover:bg-hotel-gold-light text-hotel-navy font-bold text-xs shadow-md"
            >
              <GraduationCap className="h-3.5 w-3.5 me-1.5" />
              <span>{t('nav:lms_admin', 'LMS Admin Hub')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Group KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Hotel Properties
            </CardTitle>
            <Building className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-foreground">
              {availableHotels.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Active across {availableBrands.length || 1} brand {availableBrands.length === 1 ? 'division' : 'divisions'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Brand Divisions
            </CardTitle>
            <Layers className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-foreground">
              {availableBrands.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Distinct hotel tiers & concepts</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Group Compliance Score
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-hotel-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-emerald-500">
              96.4%
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">SOP adoption & statutory training</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              KSA Saudization Ratio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-foreground">
              42.8%
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">Platinum Nitaqat Tier (Compliant)</p>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Property Portfolio Health Table */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold font-serif flex items-center gap-2">
              <Building className="h-4 w-4 text-hotel-gold" />
              <span>Multi-Property Portfolio Operations</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Direct operational health monitoring and 1-click drill down into individual hotel properties
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/organization?tab=hotels')}
            className="text-xs"
          >
            <span>Manage Properties</span>
            <ExternalLink className="h-3 w-3 ms-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 ps-2 text-start">Property Name</th>
                  <th className="py-2.5 px-3 text-start">Brand Division</th>
                  <th className="py-2.5 px-3 text-start">Location</th>
                  <th className="py-2.5 px-3 text-start">Operational Status</th>
                  <th className="py-2.5 px-3 text-start">Training Readiness</th>
                  <th className="py-2.5 pe-2 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {availableHotels.map((hotel) => {
                  const brand = availableBrands.find((b) => b.id === hotel.brand_id)
                  return (
                    <tr key={hotel.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 ps-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-hotel-navy text-hotel-gold font-serif font-bold text-xs shrink-0">
                            {hotel.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">
                              {isRtl && hotel.name_ar ? hotel.name_ar : hotel.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {hotel.hotel_code || 'PRIME'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                          <Layers className="h-3 w-3 text-blue-400" />
                          {brand?.name || 'Independent'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {hotel.city || 'Riyadh'}, {hotel.country || 'Saudi Arabia'}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px]">
                          Operational
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Readiness</span>
                            <span className="font-semibold text-foreground">94%</span>
                          </div>
                          <Progress value={94} className="h-1.5" />
                        </div>
                      </td>
                      <td className="py-3 pe-2 text-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDrillIntoProperty(hotel.id)}
                          className="h-7 text-xs text-hotel-gold hover:text-hotel-gold-dark hover:bg-hotel-gold/10 font-semibold"
                        >
                          <span>Drill In</span>
                          <ArrowRight className="h-3 w-3 ms-1" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Executive Quick Actions Deck */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          onClick={() => navigate('/admin/organization')}
          className="p-5 border-border/60 bg-card/80 hover:bg-card hover:border-hotel-gold/40 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-hotel-gold/15 text-hotel-gold group-hover:scale-105 transition-transform">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">Organizational Hierarchy</h4>
              <p className="text-[11px] text-muted-foreground">Manage departments & reporting lines</p>
            </div>
          </div>
        </Card>

        <Card
          onClick={() => navigate('/knowledge')}
          className="p-5 border-border/60 bg-card/80 hover:bg-card hover:border-hotel-gold/40 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500 group-hover:scale-105 transition-transform">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">Enterprise SOP Library</h4>
              <p className="text-[11px] text-muted-foreground">Standardized hotel brand manuals</p>
            </div>
          </div>
        </Card>

        <Card
          onClick={() => navigate('/admin/audit-logs')}
          className="p-5 border-border/60 bg-card/80 hover:bg-card hover:border-hotel-gold/40 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 group-hover:scale-105 transition-transform">
              <FileCheck className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">Compliance & Audit Trail</h4>
              <p className="text-[11px] text-muted-foreground">Multi-hotel operational governance</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
export default CorporateExecutiveBento
