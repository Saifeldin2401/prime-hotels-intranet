import { useState, Suspense, lazy } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Users, 
  BookOpen, 
  FileText, 
  Target, 
  Download, 
  Printer, 
  RefreshCw, 
  Sparkles, 
  Building2,
  Filter,
  Briefcase
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useProperty } from '@/contexts/PropertyContext'
import { useTenant } from '@/contexts/TenantContext'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const LearnerAnalyticsPanel = lazy(() => import('./LearnerAnalyticsPanel'))
const CourseAnalyticsPanel = lazy(() => import('./CourseAnalyticsPanel'))
const KnowledgeAnalyticsPanel = lazy(() => import('./KnowledgeAnalyticsPanel'))
const AssessmentAnalyticsPanel = lazy(() => import('./AssessmentAnalyticsPanel'))

const TABS = ['learners', 'courses', 'knowledge', 'assessments'] as const
type TabKey = (typeof TABS)[number]

export default function LearningAnalyticsHub() {
  const { t, i18n } = useTranslation(['admin', 'common', 'dashboard'])
  const [params, setParams] = useSearchParams()
  const raw = params.get('lens')
  const active: TabKey = (TABS as readonly string[]).includes(raw ?? '') ? (raw as TabKey) : 'learners'
  
  const { currentProperty } = useProperty()
  const { currentOrganization, availableHotels } = useTenant()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedHotelFilter, setSelectedHotelFilter] = useState<string>('all')
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all')
  const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

  // Fetch departments for filtering
  const { data: departmentOptions = [] } = useQuery({
    queryKey: ['analytics_filter_departments', currentOrganization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (error) return []
      return data || []
    },
    staleTime: 1000 * 60 * 10,
  })

  const handleRefreshAll = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['learner-analytics'] })
    await queryClient.invalidateQueries({ queryKey: ['course-analytics'] })
    await queryClient.invalidateQueries({ queryKey: ['knowledge-top-documents'] })
    await queryClient.invalidateQueries({ queryKey: ['assessment-pass-rates'] })
    await queryClient.invalidateQueries({ queryKey: ['assessment-questions'] })
    setTimeout(() => setIsRefreshing(false), 600)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `Altus_Analytics_${active}_${dateStr}.csv`
    const csvContent = `data:text/csv;charset=utf-8,Report,${active}\nGenerated,${new Date().toISOString()}\nOrganization,${currentOrganization?.name || 'All'}\nLocation,${selectedHotelFilter === 'all' ? 'All Locations' : selectedHotelFilter}\nDepartment,${selectedDeptFilter === 'all' ? 'All Departments' : selectedDeptFilter}\n`
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-6 max-w-7xl animate-in fade-in duration-300">
      {/* Executive Intelligence Header Banner */}
      <div className="relative overflow-hidden rounded-[8px] border border-[#DDDBD4] dark:border-[#30404D] bg-[#15212E] p-6 sm:p-8 text-[#F4F2EC] shadow-none">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#86672C]/20 text-[#D4AF37] border border-[#86672C]/40 text-xs font-semibold px-2.5 py-0.5 rounded-[4px]">
                <Sparkles className="me-1.5 h-3.5 w-3.5" />
                {isRTL ? 'مركز ذكاء الأداء والتحليلات' : 'Executive Intelligence & Analytics'}
              </Badge>

              {currentOrganization && (
                <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#30404D] bg-[#1E2D3D] px-2.5 py-0.5 text-xs font-medium text-[#929CA5]">
                  <Building2 className="h-3 w-3 text-[#B79A62]" />
                  {currentOrganization.name}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#F4F2EC] sm:text-3xl lg:text-4xl font-serif">
              {isRTL ? 'تحليلات التعلم وكفاءة العمليات' : 'Learning & Operational Analytics'}
            </h1>
            <p className="text-xs text-[#929CA5] sm:text-sm font-normal max-w-2xl leading-relaxed">
              {isRTL
                ? 'لوحات قياس استراتيجية متعددة المحاور — تقدم المتعلمين، مسارات تسرب الدورات، استخدام أدلة SOP، وتمييز التقييمات مستخرجة بالكامل من الأداء الفعلي.'
                : 'Multi-dimensional telemetry — learner progression, course drop-off funnels, SOP utilization, and assessment discrimination computed from verified database activity.'}
            </p>
          </div>

          {/* Export Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="h-9 rounded-[6px] border-[#30404D] bg-[#1E2D3D] px-3 text-xs font-medium text-[#F4F2EC] hover:bg-[#25384D] shadow-none"
            >
              <RefreshCw className={`me-1.5 h-3.5 w-3.5 text-[#B79A62] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRTL ? 'تحديث البيانات' : 'Refresh'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 rounded-[6px] border-[#30404D] bg-[#1E2D3D] px-3 text-xs font-medium text-[#F4F2EC] hover:bg-[#25384D] shadow-none"
            >
              <Printer className="me-1.5 h-3.5 w-3.5 text-[#6BA8E5]" />
              <span>{isRTL ? 'طباعة التقرير' : 'Print Briefing'}</span>
            </Button>

            <Button
              size="sm"
              onClick={handleExportCSV}
              className="h-9 rounded-[6px] bg-[#86672C] hover:bg-[#6D5322] px-3.5 text-xs font-medium text-[#FFFFFF] shadow-none transition-colors"
            >
              <Download className="me-1.5 h-3.5 w-3.5" />
              <span>{isRTL ? 'تصدير التقرير' : 'Export CSV'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Scope Breakdown Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-[8px] border border-border bg-card p-3 shadow-none">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Filter className="h-4 w-4 text-amber-500" />
          <span>{isRTL ? 'تصفية النطاق والتحليل:' : 'Scope & Filter Lens:'}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Location / Hotel Filter */}
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={selectedHotelFilter} onValueChange={setSelectedHotelFilter}>
              <SelectTrigger className="h-8 w-44 rounded-[6px] text-xs bg-background border-border">
                <SelectValue placeholder={isRTL ? 'كافة الفنادق' : 'All Hotels'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">{isRTL ? 'كافة الفنادق والمواقع' : 'Consolidated (All Locations)'}</SelectItem>
                {(availableHotels || []).map((h) => (
                  <SelectItem key={h.id} value={h.id} className="text-xs">{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={selectedDeptFilter} onValueChange={setSelectedDeptFilter}>
              <SelectTrigger className="h-8 w-44 rounded-[6px] text-xs bg-background border-border">
                <SelectValue placeholder={isRTL ? 'كافة الأقسام' : 'All Departments'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">{isRTL ? 'كافة الأقسام والقطاعات' : 'All Departments'}</SelectItem>
                {departmentOptions.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Lenses Tabs Navigation */}
      <Tabs
        value={active}
        onValueChange={value => setParams(prev => {
          prev.set('lens', value)
          return prev
        }, { replace: true })}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto gap-1 bg-muted/40 p-1 rounded-[8px] border border-border shadow-none">
          <TabsTrigger 
            value="learners" 
            className="flex items-center justify-center gap-2 py-2 rounded-[6px] text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-colors"
          >
            <Users className="h-4 w-4" />
            <span>{isRTL ? 'أداء المتعلمين' : 'Learners'}</span>
          </TabsTrigger>

          <TabsTrigger 
            value="courses" 
            className="flex items-center justify-center gap-2 py-2 rounded-[6px] text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span>{isRTL ? 'الدورات والمسارات' : 'Courses & Funnels'}</span>
          </TabsTrigger>

          <TabsTrigger 
            value="knowledge" 
            className="flex items-center justify-center gap-2 py-2 rounded-[6px] text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span>{isRTL ? 'استخدام الأدلة والمعرفة' : 'Knowledge & SOPs'}</span>
          </TabsTrigger>

          <TabsTrigger 
            value="assessments" 
            className="flex items-center justify-center gap-2 py-2 rounded-[6px] text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-colors"
          >
            <Target className="h-4 w-4" />
            <span>{isRTL ? 'التقييمات وصعوبة الأسئلة' : 'Assessments'}</span>
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<Skeleton className="h-96 w-full rounded-[8px]" />}>
          <TabsContent value="learners" className="mt-0 outline-none">
            <LearnerAnalyticsPanel />
          </TabsContent>
          <TabsContent value="courses" className="mt-0 outline-none">
            <CourseAnalyticsPanel />
          </TabsContent>
          <TabsContent value="knowledge" className="mt-0 outline-none">
            <KnowledgeAnalyticsPanel />
          </TabsContent>
          <TabsContent value="assessments" className="mt-0 outline-none">
            <AssessmentAnalyticsPanel />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  )
}


