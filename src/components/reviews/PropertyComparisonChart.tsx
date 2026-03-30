import { useMemo, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, Star, MessageSquare, TrendingUp } from 'lucide-react'
import type { GuestReview } from '@/lib/types'

interface PropertyComparisonChartProps {
  reviews: GuestReview[]
  properties: { id: string; name: string }[]
}

type ViewMode = 'chart' | 'table'

const getRatingColor = (value: number) => {
  if (value >= 4.5) return '#22c55e'
  if (value >= 4.0) return '#84cc16'
  if (value >= 3.5) return '#eab308'
  if (value >= 3.0) return '#f97316'
  return '#ef4444'
}

const getRatingLabel = (value: number) => {
  if (value >= 4.5) return { text: 'Excellent', cls: 'bg-green-100 text-green-700' }
  if (value >= 4.0) return { text: 'Good', cls: 'bg-lime-100 text-lime-700' }
  if (value >= 3.5) return { text: 'Average', cls: 'bg-yellow-100 text-yellow-700' }
  if (value >= 3.0) return { text: 'Below Avg', cls: 'bg-orange-100 text-orange-700' }
  return { text: 'Poor', cls: 'bg-red-100 text-red-700' }
}

export function PropertyComparisonChart({ reviews, properties }: PropertyComparisonChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const [sortBy, setSortBy] = useState<'rating' | 'volume' | 'sentiment'>('rating')

  const data = useMemo(() => {
    const propertyStats: Record<
      string,
      {
        id: string
        name: string
        total: number
        ratings: number[]
        positive: number
        negative: number
        neutral: number
        responded: number
        critical: number
        escalated: number
        pending: number
      }
    > = {}

    properties.forEach((p) => {
      propertyStats[p.id] = {
        id: p.id,
        name: p.name,
        total: 0,
        ratings: [],
        positive: 0,
        negative: 0,
        neutral: 0,
        responded: 0,
        critical: 0,
        escalated: 0,
        pending: 0,
      }
    })

    reviews.forEach((review) => {
      if (!review.property_id || !propertyStats[review.property_id]) return
      const s = propertyStats[review.property_id]
      s.total++

      if (review.rating_normalized_5 != null) s.ratings.push(review.rating_normalized_5)

      const sentiment = review.sentiment?.toLowerCase()
      if (sentiment === 'positive') s.positive++
      else if (sentiment === 'negative') s.negative++
      else s.neutral++

      if (['responded', 'closed'].includes(review.status)) s.responded++
      if (review.severity === 'critical' || review.critical_flag) s.critical++
      if (review.status === 'escalated') s.escalated++
      if (
        ['collected', 'analyzed', 'assigned', 'acknowledged', 'response_pending'].includes(
          review.status,
        )
      )
        s.pending++
    })

    const rows = Object.values(propertyStats)
      .filter((p) => p.total > 0)
      .map((p) => {
        const avgRating =
          p.ratings.length > 0
            ? Number(
                (p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length).toFixed(1),
              )
            : null
        const sentimentScore =
          p.total > 0 ? Math.round((p.positive / p.total) * 100) : 0
        const responseRate =
          p.total > 0 ? Math.round((p.responded / p.total) * 100) : 0
        return {
          ...p,
          avgRating,
          sentimentScore,
          responseRate,
          // Short name for chart
          shortName: p.name.length > 14 ? p.name.slice(0, 12) + '…' : p.name,
        }
      })

    const sorted = [...rows].sort((a, b) => {
      if (sortBy === 'rating') return (b.avgRating ?? 0) - (a.avgRating ?? 0)
      if (sortBy === 'volume') return b.total - a.total
      return b.sentimentScore - a.sentimentScore
    })

    return sorted.slice(0, 8)
  }, [reviews, properties, sortBy])

  const totalReviews = data.reduce((s, d) => s + d.total, 0)

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Property-by-Property Comparison
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Multi-metric performance across all properties
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'chart' ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-[10px] font-bold"
                onClick={() => setViewMode('chart')}
              >
                Chart
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-[10px] font-bold"
                onClick={() => setViewMode('table')}
              >
                Table
              </Button>
            </div>
          </div>
        </div>
        {/* Sort controls */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-muted-foreground font-semibold">Sort by:</span>
          {[
            { key: 'rating', label: 'Rating' },
            { key: 'volume', label: 'Volume' },
            { key: 'sentiment', label: 'Sentiment' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key as typeof sortBy)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                sortBy === opt.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'chart' ? (
          <>
            {/* Avg rating bar chart */}
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 9 }}
                    angle={-35}
                    textAnchor="end"
                    height={50}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 9 }} domain={[0, 5]} width={24} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'avgRating') return [`${value} ★`, 'Avg Rating']
                      return [value, name]
                    }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar dataKey="avgRating" name="avgRating" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.avgRating != null ? getRatingColor(entry.avgRating) : '#94a3b8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Metric bars per property */}
            <div className="mt-4 space-y-3">
              {data.map((p) => (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate max-w-[140px]">{p.name}</span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-muted-foreground">{p.total} reviews</span>
                      {p.critical > 0 && (
                        <span className="text-red-600 font-bold">{p.critical} critical</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 h-2">
                    <div
                      className="h-full bg-green-500 rounded-l"
                      style={{ width: `${p.sentimentScore}%` }}
                      title={`${p.sentimentScore}% positive`}
                    />
                    <div
                      className="h-full bg-red-400 rounded-r"
                      style={{
                        width: `${p.total > 0 ? Math.round((p.negative / p.total) * 100) : 0}%`,
                      }}
                      title={`${p.total > 0 ? Math.round((p.negative / p.total) * 100) : 0}% negative`}
                    />
                    <div className="h-full bg-muted flex-1 rounded-r" />
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-500" />
                <span>Excellent (4.5+)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-lime-500" />
                <span>Good (4.0–4.5)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-yellow-500" />
                <span>Average (3.5–4.0)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-orange-500" />
                <span>Below Avg (3.0–3.5)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500" />
                <span>Poor (&lt;3.0)</span>
              </div>
            </div>
          </>
        ) : (
          /* Table view */
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="pb-2 text-left">Property</th>
                  <th className="pb-2 text-right">Reviews</th>
                  <th className="pb-2 text-right">Avg ★</th>
                  <th className="pb-2 text-right">Positive</th>
                  <th className="pb-2 text-right">Response</th>
                  <th className="pb-2 text-right">Critical</th>
                  <th className="pb-2 text-right">Pending</th>
                  <th className="pb-2 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/40">
                {data.map((p, idx) => {
                  const label = p.avgRating != null ? getRatingLabel(p.avgRating) : null
                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2 font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-4">#{idx + 1}</span>
                          <span className="truncate max-w-[120px]">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-2 text-right font-bold">
                        {p.total}
                        <span className="text-muted-foreground font-normal ml-1">
                          ({Math.round((p.total / Math.max(totalReviews, 1)) * 100)}%)
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {p.avgRating != null ? (
                          <span
                            className="font-bold"
                            style={{ color: getRatingColor(p.avgRating) }}
                          >
                            {p.avgRating}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={
                            p.sentimentScore >= 70
                              ? 'text-green-600 font-semibold'
                              : p.sentimentScore >= 50
                              ? 'text-yellow-600 font-semibold'
                              : 'text-red-600 font-semibold'
                          }
                        >
                          {p.sentimentScore}%
                        </span>
                      </td>
                      <td className="py-2 text-right">
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
                      <td className="py-2 text-right">
                        {p.critical > 0 ? (
                          <span className="text-red-600 font-bold">{p.critical}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {p.pending > 0 ? (
                          <span className="text-orange-600 font-semibold">{p.pending}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-2 text-center">
                        {label ? (
                          <Badge className={`${label.cls} text-[9px] font-bold`}>
                            {label.text}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px]">N/A</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
