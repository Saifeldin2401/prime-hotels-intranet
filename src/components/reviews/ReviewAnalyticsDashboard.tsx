import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Star,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ThumbsUp,
  Zap,
  Globe,
  ShieldAlert,
  BarChart3,
} from 'lucide-react'
import type { GuestReview } from '@/lib/types'

interface ReviewAnalyticsDashboardProps {
  reviews: GuestReview[]
  propertyNameById: Map<string, string>
  properties: { id: string; name: string }[]
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22c55e',
  neutral: '#94a3b8',
  negative: '#ef4444',
  mixed: '#f97316',
}

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google',
  booking: 'Booking.com',
  expedia: 'Expedia',
  tripadvisor: 'TripAdvisor',
  agoda: 'Agoda',
  hotels_com: 'Hotels.com',
  airbnb: 'Airbnb',
  manual_import: 'Manual',
}

export function ReviewAnalyticsDashboard({
  reviews,
  propertyNameById,
}: ReviewAnalyticsDashboardProps) {
  // ── Core metrics ──────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = reviews.length
    if (total === 0) return null

    // Rating on 5-star scale
    const rated = reviews.filter((r) => r.rating_normalized_5 != null)
    const avgRating =
      rated.length > 0
        ? rated.reduce((s, r) => s + (r.rating_normalized_5 ?? 0), 0) / rated.length
        : 0

    // NPS (5-star scale: promoters 4-5, passives 3, detractors 1-2)
    const promoters = rated.filter((r) => (r.rating_normalized_5 ?? 0) >= 4).length
    const detractors = rated.filter((r) => (r.rating_normalized_5 ?? 0) <= 2).length
    const nps =
      rated.length > 0
        ? Math.round(((promoters - detractors) / rated.length) * 100)
        : 0

    // Sentiment counts
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0, mixed: 0 }
    reviews.forEach((r) => {
      const s = r.sentiment ?? 'neutral'
      sentimentCounts[s as keyof typeof sentimentCounts] =
        (sentimentCounts[s as keyof typeof sentimentCounts] || 0) + 1
    })
    const positivePct =
      total > 0 ? Math.round((sentimentCounts.positive / total) * 100) : 0

    // Response rate: responded + closed vs total
    const responded = reviews.filter((r) =>
      ['responded', 'closed'].includes(r.status),
    ).length
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0

    // SLA compliance: responded before SLA due
    const withSla = reviews.filter((r) => r.response_sla_due_at != null)
    const slaCompliant = withSla.filter(
      (r) =>
        r.responded_at != null &&
        new Date(r.responded_at) <= new Date(r.response_sla_due_at!),
    ).length
    const slaRate =
      withSla.length > 0 ? Math.round((slaCompliant / withSla.length) * 100) : null

    // Critical & escalated
    const critical = reviews.filter(
      (r) => r.severity === 'critical' || r.critical_flag,
    ).length
    const escalated = reviews.filter((r) => r.status === 'escalated').length
    const pending = reviews.filter((r) =>
      ['collected', 'analyzed', 'assigned', 'acknowledged', 'response_pending'].includes(
        r.status,
      ),
    ).length

    return {
      total,
      avgRating,
      nps,
      positivePct,
      responseRate,
      slaRate,
      critical,
      escalated,
      pending,
      responded,
      sentimentCounts,
    }
  }, [reviews])

  // ── Rating distribution ───────────────────────────────────────────────────
  const ratingDist = useMemo(() => {
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach((r) => {
      if (r.rating_normalized_5 != null) {
        const bucket = Math.round(r.rating_normalized_5)
        if (bucket >= 1 && bucket <= 5) dist[bucket]++
      }
    })
    const total = Object.values(dist).reduce((a, b) => a + b, 0)
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: dist[star],
      pct: total > 0 ? Math.round((dist[star] / total) * 100) : 0,
    }))
  }, [reviews])

  // ── Platform performance ──────────────────────────────────────────────────
  const platformStats = useMemo(() => {
    const map: Record<
      string,
      { total: number; ratings: number[]; positive: number; responded: number }
    > = {}

    reviews.forEach((r) => {
      const p = r.platform || 'unknown'
      if (!map[p]) map[p] = { total: 0, ratings: [], positive: 0, responded: 0 }
      map[p].total++
      if (r.rating_normalized_5 != null) map[p].ratings.push(r.rating_normalized_5)
      if (r.sentiment === 'positive') map[p].positive++
      if (['responded', 'closed'].includes(r.status)) map[p].responded++
    })

    return Object.entries(map)
      .map(([platform, s]) => ({
        platform,
        label: PLATFORM_LABELS[platform] ?? platform,
        total: s.total,
        avgRating:
          s.ratings.length > 0
            ? Number(
                (s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length).toFixed(1),
              )
            : null,
        sentimentPct:
          s.total > 0 ? Math.round((s.positive / s.total) * 100) : 0,
        responseRate:
          s.total > 0 ? Math.round((s.responded / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [reviews])

  // ── Sentiment donut data ──────────────────────────────────────────────────
  const sentimentDonut = useMemo(() => {
    if (!metrics) return []
    return Object.entries(metrics.sentimentCounts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value,
        color: SENTIMENT_COLORS[key] ?? '#94a3b8',
      }))
  }, [metrics])

  // ── Property-level overview ───────────────────────────────────────────────
  const propertyOverview = useMemo(() => {
    const map: Record<string, { total: number; ratings: number[]; critical: number }> = {}
    reviews.forEach((r) => {
      if (!r.property_id) return
      if (!map[r.property_id])
        map[r.property_id] = { total: 0, ratings: [], critical: 0 }
      map[r.property_id].total++
      if (r.rating_normalized_5 != null)
        map[r.property_id].ratings.push(r.rating_normalized_5)
      if (r.severity === 'critical' || r.critical_flag)
        map[r.property_id].critical++
    })

    return Object.entries(map)
      .map(([id, s]) => ({
        name: propertyNameById.get(id) ?? id,
        total: s.total,
        avgRating:
          s.ratings.length > 0
            ? Number(
                (s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length).toFixed(1),
              )
            : null,
        critical: s.critical,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [reviews, propertyNameById])

  if (!metrics) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No review data available</p>
          <p className="text-xs mt-1">
            Connect your OTA sources to start generating intelligence
          </p>
        </CardContent>
      </Card>
    )
  }

  const npsColor =
    metrics.nps >= 50
      ? 'text-green-600'
      : metrics.nps >= 0
      ? 'text-yellow-600'
      : 'text-red-600'

  const ratingColor = (r: number) =>
    r >= 4.5
      ? 'text-green-600'
      : r >= 4.0
      ? 'text-lime-600'
      : r >= 3.5
      ? 'text-yellow-600'
      : r >= 3.0
      ? 'text-orange-600'
      : 'text-red-600'

  const ratingBarColor = (star: number) => {
    if (star >= 4) return 'bg-green-500'
    if (star === 3) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      {/* ── Section header ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-[0.15em] text-muted-foreground mb-1">
          Executive Intelligence Summary
        </h2>
        <p className="text-xs text-muted-foreground">
          Aggregated from {metrics.total} review{metrics.total !== 1 ? 's' : ''} across all filtered properties
        </p>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* NPS */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                NPS
              </p>
              <Zap className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <p className={`text-3xl font-black ${npsColor}`}>{metrics.nps}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {metrics.nps >= 50
                ? 'Excellent'
                : metrics.nps >= 0
                ? 'Acceptable'
                : 'Needs Attention'}
            </p>
          </CardContent>
        </Card>

        {/* Avg Rating */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Avg Rating
              </p>
              <Star className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <p className={`text-3xl font-black ${ratingColor(metrics.avgRating)}`}>
              {metrics.avgRating.toFixed(1)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">out of 5.0</p>
          </CardContent>
        </Card>

        {/* Positive Sentiment */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Positive
              </p>
              <ThumbsUp className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <p
              className={`text-3xl font-black ${
                metrics.positivePct >= 70
                  ? 'text-green-600'
                  : metrics.positivePct >= 50
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              {metrics.positivePct}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {metrics.sentimentCounts.positive} reviews
            </p>
          </CardContent>
        </Card>

        {/* Response Rate */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Response Rate
              </p>
              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <p
              className={`text-3xl font-black ${
                metrics.responseRate >= 80
                  ? 'text-green-600'
                  : metrics.responseRate >= 50
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              {metrics.responseRate}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {metrics.responded} / {metrics.total}
            </p>
          </CardContent>
        </Card>

        {/* SLA Compliance */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                SLA Rate
              </p>
              <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            {metrics.slaRate != null ? (
              <>
                <p
                  className={`text-3xl font-black ${
                    metrics.slaRate >= 90
                      ? 'text-green-600'
                      : metrics.slaRate >= 70
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  {metrics.slaRate}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">on-time responses</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-black text-muted-foreground/40">—</p>
                <p className="text-[10px] text-muted-foreground mt-1">no SLA data</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Critical */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Critical
              </p>
              <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <p
              className={`text-3xl font-black ${
                metrics.critical === 0
                  ? 'text-green-600'
                  : metrics.critical <= 3
                  ? 'text-orange-600'
                  : 'text-red-600'
              }`}
            >
              {metrics.critical}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {metrics.escalated > 0 ? `${metrics.escalated} escalated` : 'none escalated'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Status pipeline ──────────────────────────────────────────────── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Review Pipeline Status
          </CardTitle>
          <CardDescription className="text-xs">
            Current distribution of reviews across workflow stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const stages = [
              { key: 'collected', label: 'Collected', color: 'bg-slate-400' },
              { key: 'analyzed', label: 'Analyzed', color: 'bg-blue-400' },
              { key: 'assigned', label: 'Assigned', color: 'bg-indigo-500' },
              { key: 'acknowledged', label: 'Acknowledged', color: 'bg-purple-500' },
              { key: 'response_pending', label: 'Pending Response', color: 'bg-yellow-500' },
              { key: 'responded', label: 'Responded', color: 'bg-green-500' },
              { key: 'closed', label: 'Closed', color: 'bg-green-700' },
              { key: 'escalated', label: 'Escalated', color: 'bg-red-500' },
            ]
            const statusCounts: Record<string, number> = {}
            reviews.forEach((r) => {
              statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
            })
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {stages.map((stage) => {
                  const count = statusCounts[stage.key] ?? 0
                  const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0
                  return (
                    <div key={stage.key} className="text-center">
                      <div className="text-2xl font-black">{count}</div>
                      <div className={`h-1 rounded-full my-1 ${stage.color} opacity-80`} style={{ width: `${Math.max(pct, 4)}%`, minWidth: '100%' }} />
                      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
                        {stage.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground/70">{pct}%</div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* ── Middle row: sentiment donut + rating distribution ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sentiment donut */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Sentiment Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              AI-classified sentiment across all reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="h-[160px] w-[160px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentDonut}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {sentimentDonut.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => [
                        `${value} (${Math.round((value / metrics.total) * 100)}%)`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2.5">
                {sentimentDonut.map((s) => (
                  <div key={s.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{s.value}</span>
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {Math.round((s.value / metrics.total) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rating distribution */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              Rating Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of all normalized star ratings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ratingDist.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="w-12 text-sm font-semibold shrink-0">
                    {star}★
                  </span>
                  <div className="flex-1 h-5 bg-muted rounded-md overflow-hidden relative">
                    <div
                      className={`h-full ${ratingBarColor(star)} rounded-md transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                    {pct > 10 && (
                      <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white">
                        {pct}%
                      </span>
                    )}
                  </div>
                  <span className="w-10 text-sm text-right text-muted-foreground shrink-0">
                    {count}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{metrics.total}</span> total reviews
              </span>
              <span>
                Avg:{' '}
                <span className={`font-bold ${ratingColor(metrics.avgRating)}`}>
                  {metrics.avgRating.toFixed(2)} / 5.00
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Platform performance table ────────────────────────────────────── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Platform Performance Breakdown
          </CardTitle>
          <CardDescription className="text-xs">
            Review volume, quality, and response metrics per OTA source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="pb-2 text-left">Platform</th>
                  <th className="pb-2 text-right">Reviews</th>
                  <th className="pb-2 text-right">Avg Rating</th>
                  <th className="pb-2 text-right">Positive</th>
                  <th className="pb-2 text-right">Response Rate</th>
                  <th className="pb-2 text-center">Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/50">
                {platformStats.map((p) => (
                  <tr key={p.platform} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 font-semibold">{p.label}</td>
                    <td className="py-2.5 text-right">
                      <span className="font-bold">{p.total}</span>
                      <span className="text-muted-foreground text-xs ml-1">
                        ({Math.round((p.total / metrics.total) * 100)}%)
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {p.avgRating != null ? (
                        <span className={`font-bold ${ratingColor(p.avgRating)}`}>
                          {p.avgRating}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={
                          p.sentimentPct >= 70
                            ? 'text-green-600 font-semibold'
                            : p.sentimentPct >= 50
                            ? 'text-yellow-600 font-semibold'
                            : 'text-red-600 font-semibold'
                        }
                      >
                        {p.sentimentPct}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={
                          p.responseRate >= 80
                            ? 'text-green-600 font-semibold'
                            : p.responseRate >= 50
                            ? 'text-yellow-600 font-semibold'
                            : 'text-red-600 font-semibold'
                        }
                      >
                        {p.responseRate}%
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      {p.avgRating == null ? (
                        <Badge variant="secondary" className="text-[9px]">N/A</Badge>
                      ) : p.avgRating >= 4.5 ? (
                        <Badge className="bg-green-100 text-green-700 text-[9px]">Excellent</Badge>
                      ) : p.avgRating >= 4.0 ? (
                        <Badge className="bg-lime-100 text-lime-700 text-[9px]">Good</Badge>
                      ) : p.avgRating >= 3.5 ? (
                        <Badge className="bg-yellow-100 text-yellow-700 text-[9px]">Average</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 text-[9px]">Poor</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Property-level chart ─────────────────────────────────────────── */}
      {propertyOverview.length > 1 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Property Intelligence Snapshot
            </CardTitle>
            <CardDescription className="text-xs">
              Average rating and critical flag count per property
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={propertyOverview}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'avgRating') return [value, 'Avg Rating']
                      if (name === 'critical') return [value, 'Critical']
                      return [value, name]
                    }}
                  />
                  <Bar dataKey="avgRating" name="avgRating" radius={[4, 4, 0, 0]} fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <th className="pb-1.5 text-left">Property</th>
                    <th className="pb-1.5 text-right">Reviews</th>
                    <th className="pb-1.5 text-right">Avg Rating</th>
                    <th className="pb-1.5 text-right">Critical</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/40">
                  {propertyOverview.map((p) => (
                    <tr key={p.name} className="hover:bg-muted/20 transition-colors">
                      <td className="py-1.5 font-medium truncate max-w-[160px]">{p.name}</td>
                      <td className="py-1.5 text-right">{p.total}</td>
                      <td className="py-1.5 text-right">
                        {p.avgRating != null ? (
                          <span className={`font-bold ${ratingColor(p.avgRating)}`}>
                            {p.avgRating}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-1.5 text-right">
                        {p.critical > 0 ? (
                          <span className="text-red-600 font-bold">{p.critical}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

