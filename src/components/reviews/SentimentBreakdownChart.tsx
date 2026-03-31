import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Layers } from 'lucide-react'
import type { GuestReview } from '@/lib/types'
import { useTranslation } from 'react-i18next'

interface ReviewWithIssues extends GuestReview {
  issues?: Array<{
    category: string
    severity?: string
    confidence?: number
    issue_summary_en?: string | null
  }>
}

interface SentimentBreakdownChartProps {
  reviews: ReviewWithIssues[]
}

const CATEGORY_LABELS: Record<string, string> = {
  cleanliness: 'Cleanliness',
  staff_behavior: 'Staff Behavior',
  room_issues: 'Room Issues',
  maintenance: 'Maintenance',
  food_beverage: 'Food & Beverage',
  wifi: 'Wi-Fi / Internet',
  check_in_out: 'Check-in / Check-out',
  billing: 'Billing',
  noise: 'Noise',
  safety: 'Safety',
  amenities: 'Amenities',
  location: 'Location',
  value: 'Value for Money',
  service: 'Service Quality',
  pool: 'Pool / Spa',
  parking: 'Parking',
  other: 'Other',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
}

export function SentimentBreakdownChart({ reviews }: SentimentBreakdownChartProps) {
  const { t } = useTranslation('reviews')

  // ── Issue category analysis ───────────────────────────────────────────────
  const categoryStats = useMemo(() => {
    const map: Record<
      string,
      { total: number; critical: number; high: number; medium: number; low: number }
    > = {}

    reviews.forEach((review) => {
      if (!review.issues?.length) return
      review.issues.forEach((issue) => {
        const cat = issue.category || 'other'
        if (!map[cat]) map[cat] = { total: 0, critical: 0, high: 0, medium: 0, low: 0 }
        map[cat].total++
        const sev = issue.severity?.toLowerCase() ?? 'low'
        if (sev === 'critical') map[cat].critical++
        else if (sev === 'high') map[cat].high++
        else if (sev === 'medium') map[cat].medium++
        else map[cat].low++
      })
    })

    return Object.entries(map)
      .map(([cat, s]) => ({
        category: cat,
        label: t(`categories.${cat}`, { defaultValue: CATEGORY_LABELS[cat] ?? cat.replace(/_/g, ' ') }),
        shortLabel:
          (CATEGORY_LABELS[cat] ?? cat.replace(/_/g, ' ')).length > 16
            ? (CATEGORY_LABELS[cat] ?? cat.replace(/_/g, ' ')).slice(0, 14) + '…'
            : CATEGORY_LABELS[cat] ?? cat.replace(/_/g, ' '),
        ...s,
        criticalWeight: s.critical * 4 + s.high * 3 + s.medium * 2 + s.low,
      }))
      .sort((a, b) => b.criticalWeight - a.criticalWeight)
      .slice(0, 10)
  }, [reviews, t])

  // ── Severity distribution across all issues ───────────────────────────────
  const severityTotals = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }
    reviews.forEach((r) => {
      r.issues?.forEach((issue) => {
        const sev = issue.severity?.toLowerCase() ?? 'low'
        if (sev in counts) counts[sev as keyof typeof counts]++
      })
    })
    return counts
  }, [reviews])

  const totalIssues = Object.values(severityTotals).reduce((a, b) => a + b, 0)

  // ── Reviews without issues ────────────────────────────────────────────────
  const withIssues = reviews.filter((r) => (r.issues?.length ?? 0) > 0).length
  const withoutIssues = reviews.length - withIssues

  if (categoryStats.length === 0) {
    return (
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            {t('analytics.issueAnalysis')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t('analytics.noIssueData')}</p>
            <p className="text-xs mt-1">
              {t('analytics.runAIAnalysis')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getRiskBadge = (cat: typeof categoryStats[0]) => {
    if (cat.critical > 0) {
      return { text: t('table.highRisk'), cls: 'bg-red-100 text-red-700' }
    }
    if (cat.high > 2) {
      return { text: t('table.elevated'), cls: 'bg-orange-100 text-orange-700' }
    }
    if (cat.medium > 3) {
      return { text: t('table.moderate'), cls: 'bg-yellow-100 text-yellow-700' }
    }
    return { text: t('severity.low'), cls: 'bg-green-100 text-green-700' }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          {t('analytics.issueAnalysis')}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('analytics.issueAnalysisDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Severity summary */}
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(severityTotals).map(([sev, count]) => (
            <div
              key={sev}
              className="text-center p-2 rounded-lg"
              style={{ backgroundColor: `${SEVERITY_COLORS[sev]}18` }}
            >
              <p
                className="text-xl font-black"
                style={{ color: SEVERITY_COLORS[sev] }}
              >
                {count}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t(`severity.${sev}`)}
              </p>
            </div>
          ))}
        </div>

        {/* Coverage note */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-semibold text-foreground">{withIssues}</span> {t('analytics.outOf', { total: '' })}{' '}
            <span className="font-semibold text-foreground">{reviews.length}</span> {t('analytics.reviewsCount', { count: reviews.length })} {t('analytics.haveAIDetectedIssues')}
            ({reviews.length > 0 ? Math.round((withIssues / reviews.length) * 100) : 0}%).{' '}
            <span className="text-green-600">{withoutIssues} {t('analytics.reviewsNoIssues')}</span>
          </span>
        </div>

        {/* Stacked bar chart */}
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryStats}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              barSize={14}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9 }} />
              <YAxis
                type="category"
                dataKey="shortLabel"
                tick={{ fontSize: 10 }}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(value: number, name: string) => {
                  return [value, t(`severity.${name}`)]
                }}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="critical" name="critical" stackId="a" fill={SEVERITY_COLORS.critical} radius={[0, 0, 0, 0]} />
              <Bar dataKey="high" name="high" stackId="a" fill={SEVERITY_COLORS.high} />
              <Bar dataKey="medium" name="medium" stackId="a" fill={SEVERITY_COLORS.medium} />
              <Bar dataKey="low" name="low" stackId="a" fill={SEVERITY_COLORS.low} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top issues table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <th className="pb-1.5 text-left">{t('table.category')}</th>
                <th className="pb-1.5 text-right">{t('table.total')}</th>
                <th className="pb-1.5 text-right">{t('severity.critical')}</th>
                <th className="pb-1.5 text-right">{t('severity.high')}</th>
                <th className="pb-1.5 text-right">{t('severity.medium')}</th>
                <th className="pb-1.5 text-center">{t('table.risk')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/40">
              {categoryStats.map((cat) => {
                const riskLevel = getRiskBadge(cat)
                return (
                  <tr key={cat.category} className="hover:bg-muted/20 transition-colors">
                    <td className="py-1.5 font-semibold">{cat.label}</td>
                    <td className="py-1.5 text-right font-bold">{cat.total}</td>
                    <td className="py-1.5 text-right">
                      {cat.critical > 0 ? (
                        <span className="text-red-600 font-bold">{cat.critical}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right">
                      {cat.high > 0 ? (
                        <span className="text-orange-600 font-semibold">{cat.high}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right">
                      {cat.medium > 0 ? (
                        <span className="text-yellow-600">{cat.medium}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-1.5 text-center">
                      <Badge className={`${riskLevel.cls} text-[9px] font-bold`}>
                        {riskLevel.text}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 pt-2 border-t text-[10px] text-muted-foreground">
          {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
            <div key={sev} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: color }} />
              <span className="capitalize">{t(`severity.${sev}`)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
