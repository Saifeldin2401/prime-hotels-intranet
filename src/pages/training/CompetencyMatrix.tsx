import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useCompetencies, useDepartmentCompetencyGaps } from '@/hooks/useCompetencies'
import { useDepartments } from '@/hooks/useDepartments'
import { useProperties } from '@/hooks/useProperties'
import { useTenant } from '@/contexts/TenantContext'
import {
  Award,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Building,
  Users,
  Search,
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CompetencyMatrix() {
  const { t, i18n } = useTranslation('common')
  const isAr = i18n.language === 'ar'
  const { activeHotelId, activeOrgId } = useTenant()

  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: competencies = [], isLoading: compLoading } = useCompetencies(activeOrgId || undefined)
  const { data: gaps = [], isLoading: gapsLoading } = useDepartmentCompetencyGaps(selectedDeptId, activeHotelId || undefined)
  const { data: departments = [] } = useDepartments()
  const { data: hotels = [] } = useProperties()

  const filteredGaps = gaps.filter((g) => {
    const name = isAr && g.competency_name_ar ? g.competency_name_ar : g.competency_name
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const avgCompliance = gaps.length > 0
    ? Math.round(gaps.reduce((acc, g) => acc + g.compliance_percentage, 0) / gaps.length)
    : 0

  const highRiskCount = gaps.filter((g) => g.gap >= 1.0).length

  return (
    <div className=\"space-y-6 pb-12\">
      {/* Header */}
      <div className=\"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5\">
        <div>
          <div className=\"flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1\">
            <Award className=\"h-4 w-4\" />
            <span>{isAr ? 'إطار الكفاءات والجدارات الفندقية' : 'Hospitality Competency Framework'}</span>
          </div>
          <h1 className=\"text-2xl sm:text-3xl font-display font-bold text-foreground\">
            {isAr ? 'مصفوفة الكفاءات وتحليل الفجوات' : 'Competency Matrix & Skills Gap Analysis'}
          </h1>
          <p className=\"text-sm text-muted-foreground mt-1\">
            {isAr
              ? 'مقارنة مستوى الكفاءة المستهدف بالمستوى الفعلي لفرق العمل عبر الفنادق والأقسام مع توصيات التطوير'
              : 'Benchmark required vs actual staff proficiency across hotels and departments with AI gap remediation'}
          </p>
        </div>

        <div className=\"flex items-center gap-3\">
          <Badge variant=\"outline\" className=\"px-3 py-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10\">
            <Sparkles className=\"h-3.5 w-3.5 mr-1.5\" />
            {isAr ? 'معايير 5 نجوم' : '5-Star Benchmark Model'}
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
        <Card className=\"border border-border/50 bg-card/60 backdrop-blur-sm\">
          <CardHeader className=\"pb-2\">
            <CardDescription>{isAr ? 'متوسط الامتثال للكفاءات' : 'Average Competency Proficiency'}</CardDescription>
            <CardTitle className=\"text-3xl font-bold text-foreground flex items-baseline gap-2\">
              {avgCompliance}%
              <span className=\"text-xs font-normal text-emerald-500 flex items-center\">
                <TrendingUp className=\"h-3.5 w-3.5 mr-1\" /> +4.2% {isAr ? 'هذا الربع' : 'this quarter'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={avgCompliance} className=\"h-2 bg-muted\" />
          </CardContent>
        </Card>

        <Card className=\"border border-border/50 bg-card/60 backdrop-blur-sm\">
          <CardHeader className=\"pb-2\">
            <CardDescription>{isAr ? 'الكفاءات المسجلة' : 'Tracked Competencies'}</CardDescription>
            <CardTitle className=\"text-3xl font-bold text-foreground\">
              {competencies.length}
            </CardTitle>
          </CardHeader>
          <CardContent className=\"text-xs text-muted-foreground flex items-center gap-2\">
            <CheckCircle2 className=\"h-4 w-4 text-emerald-500\" />
            {isAr ? 'تغطي خدمة النزلاء، الأنظمة، والسلامة' : 'Covering Guest Experience, PMS & Safety'}
          </CardContent>
        </Card>

        <Card className=\"border border-border/50 bg-card/60 backdrop-blur-sm\">
          <CardHeader className=\"pb-2\">
            <CardDescription>{isAr ? 'فجوات تتطلب تدريب' : 'High Priority Skill Gaps'}</CardDescription>
            <CardTitle className=\"text-3xl font-bold text-amber-600 dark:text-amber-400\">
              {highRiskCount}
            </CardTitle>
          </CardHeader>
          <CardContent className=\"text-xs text-muted-foreground flex items-center gap-2\">
            <AlertTriangle className=\"h-4 w-4 text-amber-500\" />
            {isAr ? 'فجوة كفاءة >= 1.0 مستوى عن المستهدف' : 'Competency gap >= 1.0 level below target'}
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className=\"flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/40 p-4 rounded-xl border border-border/40\">
        <div className=\"flex items-center gap-3 w-full sm:w-auto\">
          <div className=\"relative w-full sm:w-64\">
            <Search className=\"absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground\" />
            <input
              type=\"text\"
              placeholder={isAr ? 'بحث في الكفاءات...' : 'Search competencies...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className=\"w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-amber-500/20\"
            />
          </div>

          <select
            value={selectedDeptId || ''}
            onChange={(e) => setSelectedDeptId(e.target.value || undefined)}
            className=\"text-sm rounded-lg border border-border/60 bg-background px-3 py-1.5 focus:outline-none\"
          >
            <option value=\"\">{isAr ? 'جميع الأقسام' : 'All Departments'}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className=\"text-xs text-muted-foreground flex items-center gap-1.5\">
          <Users className=\"h-4 w-4\" />
          <span>{isAr ? 'المستوى المستهدف: 3.0 (محترف)' : 'Target Baseline: Level 3.0 (Proficient)'}</span>
        </div>
      </div>

      {/* Competency Gap Grid */}
      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-5\">
        {filteredGaps.map((item) => {
          const isAtRisk = item.gap >= 1.0
          const isTargetMet = item.gap === 0
          const name = isAr && item.competency_name_ar ? item.competency_name_ar : item.competency_name

          return (
            <Card
              key={item.competency_id}
              className={cn(
                \"border transition-all duration-200 hover:shadow-md\",
                isAtRisk ? \"border-amber-500/40 bg-amber-500/5\" : \"border-border/60 bg-card/80\"
              )}
            >
              <CardHeader className=\"pb-3\">
                <div className=\"flex items-start justify-between gap-2\">
                  <div>
                    <Badge variant=\"secondary\" className=\"text-xs font-mono mb-1.5 uppercase\">
                      {item.category.replace('_', ' ')}
                    </Badge>
                    <CardTitle className=\"text-base font-bold text-foreground\">
                      {name}
                    </CardTitle>
                  </div>

                  <Badge
                    variant={isTargetMet ? 'default' : isAtRisk ? 'destructive' : 'outline'}
                    className=\"shrink-0 font-mono text-xs\"
                  >
                    {isTargetMet ? (isAr ? 'مكتمل' : 'On Target') : ${item.compliance_percentage}% }
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className=\"space-y-4\">
                {/* Level Comparison */}
                <div className=\"space-y-2\">
                  <div className=\"flex justify-between text-xs font-medium text-muted-foreground\">
                    <span>{isAr ? 'المستوى الفعلي' : 'Actual Level'}: <strong className=\"text-foreground\">{item.average_actual_level} / 5.0</strong></span>
                    <span>{isAr ? 'المستهدف' : 'Target'}: <strong className=\"text-foreground\">{item.required_level}.0</strong></span>
                  </div>
                  <Progress
                    value={(item.average_actual_level / 5.0) * 100}
                    className={cn(\"h-2.5\", isAtRisk ? \"bg-amber-500/20\" : \"bg-muted\")}
                  />
                </div>

                {/* Meta details & Recommendation */}
                <div className=\"pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground\">
                  <span>
                    {isAr ? 'تم تقييمهم' : 'Evaluated'}: <strong>{item.total_evaluated_count}</strong> {isAr ? 'موظف' : 'staff'}
                  </span>

                  {isAtRisk && (
                    <span className=\"text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium\">
                      <Sparkles className=\"h-3.5 w-3.5\" />
                      {isAr ? 'يوصى بتدريب تصحيحي' : 'Training Recommended'}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
