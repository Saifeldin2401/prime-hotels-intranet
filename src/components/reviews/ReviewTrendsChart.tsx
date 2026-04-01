import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format, subDays, parseISO } from 'date-fns'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { GuestReview } from '@/lib/types'
import { useTranslation } from 'react-i18next'

interface ReviewTrendsChartProps {
  reviews: GuestReview[]
  days?: number
}

export function ReviewTrendsChart({ reviews, days: defaultDays = 30 }: ReviewTrendsChartProps) {
  const { t } = useTranslation('reviews')
  const [days, setDays] = useState(defaultDays)

  const periodOptions = [
    { label: t('analytics.timeRange.7d'), value: 7 },
    { label: t('analytics.timeRange.30d'), value: 30 },
    { label: t('analytics.timeRange.90d'), value: 90 },
  ]

  const data = useMemo(() => {
    const endDate = new Date()

    const dateBuckets: Record<
      string,
      {
        date: string
        count: number
        avgRating: number
        ratings: number[]
        positive: number
        negative: number
        neutral: number
        mixed: number
        critical: number
      }
    > = {}

    for (let i = 0; i <= days; i++) {
      const date = format(subDays(endDate, i), 'yyyy-MM-dd')
      dateBuckets[date] = {
        date,
        count: 0,
        avgRating: 0,
        ratings: [],
        positive: 0,
        negative: 0,
        neutral: 0,
        mixed: 0,
        critical: 0,
      }
    }

    reviews.forEach((review) => {
      if (!review.collected_at) return
      let reviewDate: string
      try {
        reviewDate = format(parseISO(review.collected_at), 'yyyy-MM-dd')
      } catch {
        return
      }
      if (!dateBuckets[reviewDate]) return

      dateBuckets[reviewDate].count++
      if (review.rating_normalized_5 != null) {
        dateBuckets[reviewDate].ratings.push(review.rating_normalized_5)
      }

      const s = review.sentiment ?? 'neutral'
      if (s === 'positive') dateBuckets[reviewDate].positive++
      else if (s === 'negative') dateBuckets[reviewDate].negative++
      else if (s === 'mixed') dateBuckets[reviewDate].mixed++
      else dateBuckets[reviewDate].neutral++

      if (review.severity === 'critical' || review.critical_flag) {
        dateBuckets[reviewDate].critical++
      }
    })

    return Object.values(dateBuckets)
      .reverse()
      .map((bucket) => ({
        ...bucket,
        avgRating:
          bucket.ratings.length > 0
            ? Number(
                (bucket.ratings.reduce((a, b) => a + b, 0) / bucket.ratings.length).toFixed(1),
              )
            : null,
        displayDate: format(parseISO(bucket.date), days <= 14 ? 'MMM dd' : days <= 30 ? 'MMM dd' : 'MMM dd'),
        positivePct:
          bucket.count > 0 ? Math.round((bucket.positive / bucket.count) * 100) : null,
      }))
  }, [reviews, days])

  const stats = useMemo(() => {
    const inWindow = reviews.filter((r) => {
      if (!r.collected_at) return false
      try {
        const d = parseISO(r.collected_at)
        return d >= subDays(new Date(), days)
      } catch {
        return false
      }
    })

    const total = inWindow.length
    const rated = inWindow.filter((r) => r.rating_normalized_5 != null)
    const avgRating =
      rated.length > 0
        ? (rated.reduce((s, r) => s + (r.rating_normalized_5 ?? 0), 0) / rated.length).toFixed(1)
        : '—'

    const positive = inWindow.filter((r) => r.sentiment === 'positive').length
    const negative = inWindow.filter((r) => r.sentiment === 'negative').length
    const positivePct = total > 0 ? Math.round((positive / total) * 100) : 0

    // Volume trend: compare second half vs first half
    const midPoint = Math.floor(data.length / 2)
    const firstHalf = data.slice(0, midPoint).reduce((a, b) => a + b.count, 0)
    const secondHalf = data.slice(midPoint).reduce((a, b) => a + b.count, 0)
    const trend =
      secondHalf > firstHalf * 1.1
        ? 'up'
        : secondHalf < firstHalf * 0.9
        ? 'down'
        : 'stable'

    // Rating trend
    const firstHalfRatings = data
      .slice(0, midPoint)
      .flatMap((d) => d.ratings)
    const secondHalfRatings = data
      .slice(midPoint)
      .flatMap((d) => d.ratings)
    const firstAvg =
      firstHalfRatings.length > 0
        ? firstHalfRatings.reduce((a, b) => a + b, 0) / firstHalfRatings.length
        : 0
    const secondAvg =
      secondHalfRatings.length > 0
        ? secondHalfRatings.reduce((a, b) => a + b, 0) / secondHalfRatings.length
        : 0
    const ratingTrend =
      secondAvg > firstAvg + 0.1
        ? 'up'
        : secondAvg < firstAvg - 0.1
        ? 'down'
        : 'stable'

    return {
      total,
      avgRating,
      positivePct,
      positive,
      negative,
      trend,
      ratingTrend,
    }
  }, [reviews, days, data])

  const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'stable' }) => {
    if (direction === 'up')
      return <TrendingUp className="h-3.5 w-3.5 text-green-500" />
    if (direction === 'down')
      return <TrendingDown className="h-3.5 w-3.5 text-red-500" />
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
  }

  const avgRatingNum = parseFloat(String(stats.avgRating))

  const getTrendLabel = () => {
    if (stats.trend === 'up') return t('analytics.volumeGrowing')
    if (stats.trend === 'down') return t('analytics.volumeDeclining')
    return t('analytics.volumeStable')
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t('analytics.volumeTrends')}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {t('analytics.volumeTrendsDesc')}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {periodOptions.map((opt) => (
              <Button
                key={opt.value}
                variant={days === opt.value ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-[10px] font-bold"
                onClick={() => setDays(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Volume chart */}
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 9 }}
                interval={days <= 14 ? 0 : days <= 30 ? 4 : 9}
                tickMargin={6}
              />
              <YAxis tick={{ fontSize: 9 }} width={24} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'count') return [value, t('analytics.totalVolume')]
                  if (name === 'positive') return [value, t('analytics.positive')]
                  if (name === 'negative') return [value, t('analytics.negative')]
                  return [value, name]
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="count"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#colorVolume)"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Area
                type="monotone"
                dataKey="positive"
                name="positive"
                stroke="#22c55e"
                strokeWidth={1.5}
                fill="url(#colorPositive)"
                dot={false}
                activeDot={{ r: 3 }}
                strokeDasharray="4 2"
              />
              <Area
                type="monotone"
                dataKey="negative"
                name="negative"
                stroke="#ef4444"
                strokeWidth={1.5}
                fill="url(#colorNegative)"
                dot={false}
                activeDot={{ r: 3 }}
                strokeDasharray="4 2"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Rating trend chart */}
        <div className="h-[100px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 2, right: 20, left: 0, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="displayDate" tick={false} />
              <YAxis domain={[1, 5]} tick={{ fontSize: 9 }} width={24} />
              <ReferenceLine yAxisId={0} y={4} stroke="#e5e7eb" strokeDasharray="4 2" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(value: number | null) =>
                  value != null ? [`${value} ★`, t('analytics.avgRating')] : ['—', t('analytics.avgRating')]
                }
              />
              <Line
                type="monotone"
                dataKey="avgRating"
                name="avgRating"
                stroke="#eab308"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 bg-indigo-500 rounded-full" />
            {t('analytics.totalVolume')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-px border-t-2 border-dashed border-green-500" />
            {t('analytics.positive')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-px border-t-2 border-dashed border-red-500" />
            {t('analytics.negative')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 bg-yellow-500 rounded-full" />
            {t('analytics.avgRating')} ({t('analytics.belowAvg')})
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-xl font-black">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">{t('analytics.reviews')}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <p
                className={`text-xl font-black ${
                  !isNaN(avgRatingNum)
                    ? avgRatingNum >= 4
                      ? 'text-green-600'
                      : avgRatingNum >= 3
                      ? 'text-yellow-600'
                      : 'text-red-600'
                    : ''
                }`}
              >
                {stats.avgRating}
              </p>
              <TrendIcon direction={stats.ratingTrend as 'up' | 'down' | 'stable'} />
            </div>
            <p className="text-[10px] text-muted-foreground">{t('analytics.avgRating')}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <p
                className={`text-xl font-black ${
                  stats.positivePct >= 70
                    ? 'text-green-600'
                    : stats.positivePct >= 50
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {stats.positivePct}%
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">{t('analytics.positive')}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <p
                className={`text-xl font-black ${
                  stats.trend === 'up'
                    ? 'text-green-600'
                    : stats.trend === 'down'
                    ? 'text-red-600'
                    : ''
                }`}
              >
                {stats.trend === 'up' ? '↑' : stats.trend === 'down' ? '↓' : '→'}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {getTrendLabel()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
