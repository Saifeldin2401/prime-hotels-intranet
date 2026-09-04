import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTenant } from '@/contexts/TenantContext'
import { useProperty } from '@/contexts/PropertyContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ActiveLearningsWidget,
  RecentKnowledgeWidget,
  TasksWidget,
  ReviewQueueWidget,
  AICopilotAssistantWidget,
  CertificationsAndSkillsWidget,
  DashboardMetricsDeck,
} from './index'
import {
  Building,
  Layers,
  MapPin,
  ClipboardList,
  AlertTriangle,
  Wrench,
  BedDouble,
  ArrowRight,
  BookOpen,
} from 'lucide-react'

export function PropertyOperationsBento() {
  const { t, i18n } = useTranslation(['admin', 'dashboard', 'common', 'nav'])
  const isRtl = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const { currentHotel, currentBrand, currentOrganization } = useTenant()
  const { currentProperty } = useProperty()

  const hotel = currentHotel || currentProperty

  return (
    <div className="space-y-6">
      {/* Property Operations Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/40 p-6 sm:p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                <Building className="h-3.5 w-3.5" />
                {isRtl && hotel?.name_ar ? hotel.name_ar : (hotel?.name || 'Hotel Property')}
              </span>
              {currentBrand && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-medium">
                  <Layers className="h-3 w-3" />
                  {currentBrand.name}
                </span>
              )}
              <Badge variant="outline" className="text-[11px] text-emerald-400 border-emerald-500/40 bg-emerald-500/10">
                Property General Manager Scope
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">
              Hotel Shift & Operations Cockpit
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time daily shift coordination, local SOP adherence, staff certifications, and guest service execution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => navigate('/operations')}
              className="border-emerald-500/30 text-white bg-white/5 hover:bg-white/10 text-xs"
            >
              <ClipboardList className="h-3.5 w-3.5 me-1.5 text-emerald-400" />
              <span>Operations Hub</span>
            </Button>
            <Button
              onClick={() => navigate('/knowledge')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md"
            >
              <BookOpen className="h-3.5 w-3.5 me-1.5" />
              <span>Hotel SOPs</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Property Metrics Deck */}
      <DashboardMetricsDeck />

      {/* 2/3 and 1/3 Operational Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2/3): Primary Workflows & Operational Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Active Training & Knowledge Library */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ActiveLearningsWidget />
            <RecentKnowledgeWidget />
          </div>

          {/* Action Items / Tasks & Quality Review Queue */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <TasksWidget focusMode="my_work" />
            <ReviewQueueWidget />
          </div>
        </div>

        {/* Right Column (1/3): AI Copilot & Verified Digital Credentials */}
        <div className="space-y-6">
          <AICopilotAssistantWidget />
          <CertificationsAndSkillsWidget />
        </div>
      </div>
    </div>
  )
}
export default PropertyOperationsBento
