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
  Layers,
  Calendar,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useProperty } from '@/contexts/PropertyContext'
import { useTenant } from '@/contexts/TenantContext'
import { useQueryClient } from '@tanstack/react-query'

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
  const { currentOrganization } = useTenant()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

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
    // Generate simple client-side CSV trigger based on active tab
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `Altus_Analytics_${active}_${dateStr}.csv`
    const csvContent = `data:text/csv;charset=utf-8,Report,${active}\nGenerated,${new Date().toISOString()}\nProperty,${currentProperty?.name || 'All Locations'}\n`
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
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-card/95 via-card/75 to-card/40 p-6 sm:p-8 backdrop-blur-2xl shadow-lg">
        <div className="pointer-events-none absolute -top-20 -end-20 h-64 w-64 rounded-full bg-amber-500/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -start-20 h-64 w-64 rounded-full bg-emerald-500/[0.06] blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-0.5">
                <Sparkles className="me-1.5 h-3.5 w-3.5" />
                {isRTL ? 'مركز ذكاء الأداء والتحليلات' : 'Executive Intelligence & Analytics'}
              </Badge>

              {currentOrganization && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-0.5 text-xs font-medium text-muted-foreground">
                  <Building2 className="h-3 w-3 text-amber-500" />
                  {currentOrganization.name}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl font-serif">
              {isRTL ? 'تحليلات التعلم وكفاءة العمليات' : 'Learning & Operational Analytics'}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm font-normal max-w-2xl leading-relaxed">
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
              className="h-9 rounded-2xl border-border/60 bg-background/60 px-3 text-xs font-semibold hover:border-amber-500/40 hover:bg-background/90 shadow-xs"
            >
              <RefreshCw className={`me-1.5 h-3.5 w-3.5 text-amber-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRTL ? 'تحديث البيانات' : 'Refresh'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 rounded-2xl border-border/60 bg-background/60 px-3 text-xs font-semibold hover:border-amber-500/40 hover:bg-background/90 shadow-xs"
            >
              <Printer className="me-1.5 h-3.5 w-3.5 text-blue-500" />
              <span>{isRTL ? 'طباعة التقرير' : 'Print Briefing'}</span>
            </Button>

            <Button
              size="sm"
              onClick={handleExportCSV}
              className="h-9 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/15 hover:from-amber-400 hover:to-amber-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="me-1.5 h-3.5 w-3.5" />
              <span>{isRTL ? 'تصدير التقرير' : 'Export CSV'}</span>
            </Button>
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
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto gap-2 bg-card/60 p-1.5 rounded-2xl border border-border/60 backdrop-blur-xl shadow-xs">
          <TabsTrigger 
            value="learners" 
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-slate-950 transition-all shadow-xs"
          >
            <Users className="h-4 w-4" />
            <span>{isRTL ? 'أداء المتعلمين' : 'Learners'}</span>
          </TabsTrigger>

          <TabsTrigger 
            value="courses" 
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-slate-950 transition-all shadow-xs"
          >
            <BookOpen className="h-4 w-4" />
            <span>{isRTL ? 'الدورات والمسارات' : 'Courses & Funnels'}</span>
          </TabsTrigger>

          <TabsTrigger 
            value="knowledge" 
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-slate-950 transition-all shadow-xs"
          >
            <FileText className="h-4 w-4" />
            <span>{isRTL ? 'استخدام الأدلة والمعرفة' : 'Knowledge & SOPs'}</span>
          </TabsTrigger>

          <TabsTrigger 
            value="assessments" 
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-slate-950 transition-all shadow-xs"
          >
            <Target className="h-4 w-4" />
            <span>{isRTL ? 'التقييمات وصعوبة الأسئلة' : 'Assessments'}</span>
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<Skeleton className="h-96 w-full rounded-3xl" />}>
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

