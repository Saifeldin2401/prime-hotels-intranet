import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useDepartmentKPIs } from '@/hooks/useDepartmentKPIs'
import { useProperties } from '@/hooks/useProperties'
import { useDepartmentCompetencyGaps } from '@/hooks/useCompetencies'
import { useTenant } from '@/contexts/TenantContext'
import { exportService } from '@/services/exportService'
import {
  Building2,
  Download,
  AlertCircle,
  ShieldCheck,
  BarChart3,
  Users,
  GraduationCap
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ExecutiveGMDashboard() {
  const { i18n } = useTranslation('common')
  const isAr = i18n.language === 'ar'
  const { currentOrganization, currentHotel } = useTenant()
  const activeHotelId = currentHotel?.id

  const { data: hotels = [] } = useProperties()
  const { data: kpis = [], isLoading } = useDepartmentKPIs()
  const { data: competencyGaps = [] } = useDepartmentCompetencyGaps(undefined, activeHotelId)

  const activeHotel = hotels.find((h) => h.id === activeHotelId) || hotels[0]

  const ranked = [...kpis].sort((a, b) => b.overall_score - a.overall_score)
  const totalStaff = kpis.reduce((acc, d) => acc + d.staff_count, 0)
  const highRiskCompetencyGaps = competencyGaps.filter((g) => g.gap >= 1.0).length

  const overallCompliance = kpis.length > 0
    ? Math.round(kpis.reduce((acc, d) => acc + d.overall_score, 0) / kpis.length)
    : 0
  const avgTrainingCompletion = kpis.length > 0
    ? Math.round(kpis.reduce((acc, d) => acc + d.metrics.training_completion_rate, 0) / kpis.length)
    : 0
  const laggingDepartments = kpis.filter((d) => d.overall_score < 70).length

  const handleExportSummary = () => {
    const exportData = ranked.map((d) => ({
      Hotel: activeHotel?.name || 'Hotel',
      Department: d.department_name,
      'Department Head': d.head_name || '',
      'Staff Count': d.staff_count,
      'Overall Score (%)': d.overall_score,
      'Training Completion (%)': d.metrics.training_completion_rate,
      'SOP Compliance (%)': d.metrics.sop_compliance_rate,
      'Task Completion (%)': d.metrics.task_completion_rate
    }))

    const csv = exportService.convertToCSV(exportData)
    const stamp = new Date().toISOString().slice(0, 10)
    const slug = (activeHotel?.name || currentOrganization?.name || 'hotel')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
    exportService.downloadFile(csv, `executive-gm-scorecard-${slug}-${stamp}.csv`)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
            <Building2 className="h-4 w-4" />
            <span>{isAr ? 'لوحة القيادة التنفيذية للمدير العام' : 'General Manager Executive Scorecard'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            {activeHotel?.name || (isAr ? 'لوحة أداء الفندق' : 'Hotel Operational Dashboard')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr
              ? 'أداء الأقسام، إتمام التدريب، الامتثال للمعايير، والمخاطر التشغيلية — من البيانات الفعلية'
              : 'Department performance, training completion, SOP compliance and operational risk — from live data'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-border/60 hover:bg-muted/80"
            onClick={handleExportSummary}
            disabled={ranked.length === 0}
          >
            <Download className="h-4 w-4" />
            <span>{isAr ? 'تصدير التقرير التنفيذي (CSV)' : 'Export Executive Summary'}</span>
          </Button>
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-border/50 bg-card/70 backdrop-blur-sm p-5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isAr ? 'متوسط أداء الأقسام' : 'Avg Department Score'}
          </div>
          <span className="text-3xl font-bold text-foreground">{overallCompliance}%</span>
          <Progress value={overallCompliance} className="h-2 bg-muted" />
        </Card>

        <Card className="border border-border/50 bg-card/70 backdrop-blur-sm p-5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isAr ? 'متوسط إتمام التدريب' : 'Avg Training Completion'}
          </div>
          <div className="text-3xl font-bold text-foreground">{avgTrainingCompletion}%</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-blue-500" />
            <span>{isAr ? 'عبر جميع الأقسام' : 'Across all departments'}</span>
          </div>
        </Card>

        <Card className="border border-border/50 bg-card/70 backdrop-blur-sm p-5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isAr ? 'أقسام دون المستوى' : 'Departments At Risk'}
          </div>
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{laggingDepartments}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            <span>{isAr ? 'نتيجة إجمالية أقل من 70%' : 'Overall score below 70%'}</span>
          </div>
        </Card>

        <Card className="border border-border/50 bg-card/70 backdrop-blur-sm p-5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isAr ? 'فجوات كفاءة عالية الخطورة' : 'High-Risk Competency Gaps'}
          </div>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{highRiskCompetencyGaps}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>{isAr ? '1.0 مستوى أو أكثر عن المستهدف' : '1.0+ level below target'}</span>
          </div>
        </Card>
      </div>

      {/* Department Compliance Leaderboard */}
      <Card className="border border-border/60 bg-card/80">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-500" />
            <span>{isAr ? 'ترتيب أداء الأقسام' : 'Department Performance Leaderboard'}</span>
          </CardTitle>
          <CardDescription>
            {isAr
              ? 'نتيجة كل قسم مركّبة من إتمام التدريب، الامتثال للمعايير، وإنجاز المهام'
              : 'Each department score blends training completion, SOP compliance and task completion'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {isAr ? 'جاري تحميل مؤشرات الأقسام...' : 'Loading department metrics...'}
            </div>
          ) : ranked.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {isAr ? 'لا توجد أقسام ضمن نطاق هذا الفندق' : 'No departments in scope for this hotel'}
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {ranked.map((dept, idx) => (
                <div key={dept.department_id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-mono font-bold text-foreground">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-base text-foreground">{dept.department_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>{dept.staff_count} {isAr ? 'موظف' : 'staff'}</span>
                        {dept.head_name && dept.head_name !== 'Not assigned' && (
                          <span className="hidden sm:inline">· {dept.head_name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full sm:w-1/2">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">{isAr ? 'النتيجة الإجمالية' : 'Overall'}</span>
                        <span className={cn(
                          dept.overall_score >= 90 ? 'text-emerald-500' : dept.overall_score >= 70 ? 'text-amber-500' : 'text-red-500'
                        )}>
                          {dept.overall_score}%
                        </span>
                      </div>
                      <Progress value={dept.overall_score} className="h-2 bg-muted" />
                    </div>

                    <div className="w-28 text-right shrink-0 space-y-0.5">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {isAr ? 'تدريب' : 'Train'} {dept.metrics.training_completion_rate}%
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {isAr ? 'معايير' : 'SOP'} {dept.metrics.sop_compliance_rate}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {isAr
          ? `إجمالي الموظفين ضمن النطاق: ${totalStaff}`
          : `Total staff in scope: ${totalStaff}`}
      </p>
    </div>
  )
}
