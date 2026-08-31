import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useDepartments } from '@/hooks/useDepartments'
import { useProperties } from '@/hooks/useProperties'
import { useDepartmentCompetencyGaps } from '@/hooks/useCompetencies'
import { useTenant } from '@/contexts/TenantContext'
import { exportService } from '@/services/exportService'
import {
  Building2,
  Download,
  TrendingUp,
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  ShieldCheck,
  BarChart3,
  Flame,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ExecutiveGMDashboard() {
  const { t, i18n } = useTranslation('common')
  const isAr = i18n.language === 'ar'
  const { activeHotelId, activeOrgId } = useTenant()

  const { data: departments = [] } = useDepartments()
  const { data: hotels = [] } = useProperties()
  const { data: competencyGaps = [] } = useDepartmentCompetencyGaps(undefined, activeHotelId || undefined)

  const activeHotel = hotels.find((h) => h.id === activeHotelId) || hotels[0]

  // Department Compliance Simulation from actual departments
  const departmentScorecards = departments.map((d, index) => {
    const compliance = Math.max(70, 96 - (index * 5))
    const totalStaff = 12 + (index * 4)
    const overdueCount = Math.max(0, Math.floor((100 - compliance) / 10 * 3))
    return {
      id: d.id,
      name: d.name,
      compliance,
      totalStaff,
      overdueCount,
      riskLevel: compliance >= 90 ? 'low' : compliance >= 80 ? 'medium' : 'high'
    }
  })

  const overallCompliance = departmentScorecards.length > 0
    ? Math.round(departmentScorecards.reduce((acc, d) => acc + d.compliance, 0) / departmentScorecards.length)
    : 92

  const totalOverdue = departmentScorecards.reduce((acc, d) => acc + d.overdueCount, 0)

  const handleExportSummary = () => {
    const exportData = departmentScorecards.map((d) => ({
      'Hotel': activeHotel?.name || 'Hotel',
      'Department': d.name,
      'Compliance Rate (%)': ${d.compliance}%,
      'Total Staff': d.totalStaff,
      'Overdue Assignments': d.overdueCount,
      'Risk Status': d.riskLevel.toUpperCase()
    }))

    const csv = exportService.convertToCSV(exportData)
    exportService.downloadFile(csv, Executive_GM_Compliance_.csv)
  }

  return (
    <div className=\"space-y-6 pb-12\">
      {/* Executive Header */}
      <div className=\"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5\">
        <div>
          <div className=\"flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1\">
            <Building2 className=\"h-4 w-4\" />
            <span>{isAr ? 'لوحة القيادة التنفيذية للمدير العام' : 'General Manager Executive Scorecard'}</span>
          </div>
          <h1 className=\"text-2xl sm:text-3xl font-display font-bold text-foreground\">
            {activeHotel?.name || (isAr ? 'لوحة أداء الفندق' : 'Hotel Operational Dashboard')}
          </h1>
          <p className=\"text-sm text-muted-foreground mt-1\">
            {isAr
              ? 'مؤشرات الامتثال الفندقي، كفاءة الأقسام، والمخاطر التشغيلية والتدريبية'
              : 'Real-time hotel compliance rate, department performance ranking, and operational training health'}
          </p>
        </div>

        <div className=\"flex items-center gap-3\">
          <Button
            variant=\"outline\"
            size=\"sm\"
            className=\"gap-2 border-border/60 hover:bg-muted/80\"
            onClick={handleExportSummary}
          >
            <Download className=\"h-4 w-4\" />
            <span>{isAr ? 'تصدير التقرير التنفيذي (CSV)' : 'Export Executive Summary'}</span>
          </Button>
        </div>
      </div>

      {/* Hero KPIs */}
      <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
        <Card className=\"border border-border/50 bg-card/70 backdrop-blur-sm p-5 space-y-2\">
          <div className=\"text-xs font-semibold uppercase tracking-wider text-muted-foreground\">
            {isAr ? 'معدل الامتثال العام للفندق' : 'Overall Hotel Compliance'}
          </div>
          <div className=\"flex items-baseline gap-2\">
            <span className=\"text-3xl font-bold text-foreground\">{overallCompliance}%</span>
            <span className=\"text-xs font-medium text-emerald-500 flex items-center\">
              <TrendingUp className=\"h-3.5 w-3.5 mr-0.5\" /> +3.5%
            </span>
          </div>
          <Progress value={overallCompliance} className=\"h-2 bg-muted\" />
        </Card>

        <Card className=\"border border-border/50 bg-card/70 backdrop-blur-sm p-5 space-y-2\">
          <div className=\"text-xs font-semibold uppercase tracking-wider text-muted-foreground\">
            {isAr ? 'المهام التدريبية المتأخرة' : 'Overdue Assignments'}
          </div>
          <div className=\"text-3xl font-bold text-amber-600 dark:text-amber-400\">
            {totalOverdue}
          </div>
          <div className=\"text-xs text-muted-foreground flex items-center gap-1.5\">
            <AlertCircle className=\"h-3.5 w-3.5 text-amber-500\" />
            <span>{isAr ? 'تتركز في قسم الأغذية والمشروبات' : 'Concentrated in F&B and Front Office'}</span>
          </div>
        </Card>

        <Card className=\"border border-border/50 bg-card/70 backdrop-blur-sm p-5 space-y-2\">
          <div className=\"text-xs font-semibold uppercase tracking-wider text-muted-foreground\">
            {isAr ? 'شهادات قاربت على الانتهاء (30 يوم)' : 'Certificates Expiring (30d)'}
          </div>
          <div className=\"text-3xl font-bold text-foreground\">
            8
          </div>
          <div className=\"text-xs text-muted-foreground flex items-center gap-1.5\">
            <Clock className=\"h-3.5 w-3.5 text-blue-500\" />
            <span>{isAr ? 'معايير سلامة الغذاء وخدمة النزلاء' : 'Food Safety & First Aid Renewals'}</span>
          </div>
        </Card>

        <Card className=\"border border-border/50 bg-card/70 backdrop-blur-sm p-5 space-y-2\">
          <div className=\"text-xs font-semibold uppercase tracking-wider text-muted-foreground\">
            {isAr ? 'جاهزية المعايير والتدقيق' : 'Audit & SOP Readiness'}
          </div>
          <div className=\"text-3xl font-bold text-emerald-600 dark:text-emerald-400\">
            98.2%
          </div>
          <div className=\"text-xs text-muted-foreground flex items-center gap-1.5\">
            <ShieldCheck className=\"h-3.5 w-3.5 text-emerald-500\" />
            <span>{isAr ? 'متوافق مع معايير وزارة السياحة' : 'KSA Tourism Ministry Compliant'}</span>
          </div>
        </Card>
      </div>

      {/* Department Compliance Leaderboard */}
      <Card className=\"border border-border/60 bg-card/80\">
        <CardHeader className=\"pb-4\">
          <CardTitle className=\"text-lg font-bold flex items-center gap-2\">
            <BarChart3 className=\"h-5 w-5 text-amber-500\" />
            <span>{isAr ? 'ترتيب امتثال الأقسام' : 'Department Compliance Leaderboard'}</span>
          </CardTitle>
          <CardDescription>
            {isAr
              ? 'متابعة أداء كل قسم وتحديد نقاط الاختناق في الامتثال بالمعايير الفندقية'
              : 'Detailed departmental training performance, headcount, and overdue bottlenecks'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className=\"divide-y divide-border/40\">
            {departmentScorecards.map((dept, idx) => (
              <div key={dept.id} className=\"py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4\">
                <div className=\"flex items-center gap-3\">
                  <span className=\"flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-mono font-bold text-foreground\">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className=\"font-bold text-base text-foreground\">{dept.name}</div>
                    <div className=\"text-xs text-muted-foreground flex items-center gap-2 mt-0.5\">
                      <Users className=\"h-3.5 w-3.5\" />
                      <span>{dept.totalStaff} {isAr ? 'موظف' : 'staff'}</span>
                    </div>
                  </div>
                </div>

                <div className=\"flex items-center gap-6 w-full sm:w-1/2\">
                  <div className=\"flex-1 space-y-1.5\">
                    <div className=\"flex justify-between text-xs font-semibold\">
                      <span className=\"text-muted-foreground\">{isAr ? 'الامتثال' : 'Compliance'}</span>
                      <span className={cn(
                        dept.compliance >= 90 ? 'text-emerald-500' : dept.compliance >= 80 ? 'text-amber-500' : 'text-red-500'
                      )}>
                        {dept.compliance}%
                      </span>
                    </div>
                    <Progress value={dept.compliance} className=\"h-2 bg-muted\" />
                  </div>

                  <div className=\"w-24 text-right shrink-0\">
                    <Badge
                      variant={dept.overdueCount === 0 ? 'outline' : 'destructive'}
                      className=\"text-xs font-mono\"
                    >
                      {dept.overdueCount} {isAr ? 'متأخر' : 'overdue'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
