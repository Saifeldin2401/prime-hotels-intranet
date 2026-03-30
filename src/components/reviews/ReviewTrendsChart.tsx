import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format, subDays, parseISO } from 'date-fns'
import { TrendingUp } from 'lucide-react'

interface GuestReview {
  id: string
  rating?: number
  collected_at?: string
  sentiment?: string
  property_id?: string
}

interface ReviewTrendsChartProps {
  reviews: GuestReview[]
  days?: number
}

export function ReviewTrendsChart({ reviews, days = 30 }: ReviewTrendsChartProps) {
  const data = useMemo(() => {
    const endDate = new Date()
    const startDate = subDays(endDate, days)
    
    // Create date buckets
    const dateBuckets: Record<string, { date: string; count: number; avgRating: number; ratings: number[]; positive: number; negative: number; neutral: number }> = {}
    
    // Initialize all dates with zero
    for (let i = 0; i <= days; i++) {
      const date = format(subDays(endDate, i), 'yyyy-MM-dd')
      dateBuckets[date] = { 
        date, 
        count: 0, 
        avgRating: 0, 
        ratings: [],
        positive: 0,
        negative: 0,
        neutral: 0
      }
    }
    
    // Fill with review data
    reviews.forEach((review) => {
      if (!review.collected_at) return
      const reviewDate = format(parseISO(review.collected_at), 'yyyy-MM-dd')
      if (dateBuckets[reviewDate]) {
        dateBuckets[reviewDate].count++
        if (review.rating) {
          dateBuckets[reviewDate].ratings.push(review.rating)
        }
        
        // Sentiment tracking
        const sentiment = review.sentiment?.toLowerCase()
        if (sentiment === 'positive') dateBuckets[reviewDate].positive++
        else if (sentiment === 'negative') dateBuckets[reviewDate].negative++
        else dateBuckets[reviewDate].neutral++
      }
    })
    
    // Calculate averages and format for chart
    return Object.values(dateBuckets)
      .reverse()
      .map((bucket) => ({
        ...bucket,
        avgRating: bucket.ratings.length > 0 
          ? Number((bucket.ratings.reduce((a, b) => a + b, 0) / bucket.ratings.length).toFixed(1))
          : 0,
        displayDate: format(parseISO(bucket.date), 'MMM dd'),
      }))
  }, [reviews, days])

  const stats = useMemo(() => {
    const totalReviews = reviews.length
    const avgRating = totalReviews > 0 
      ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviews).toFixed(1)
      : '0'
    
    // Calculate trend (compare first half vs second half)
    const midPoint = Math.floor(data.length / 2)
    const firstHalf = data.slice(0, midPoint).reduce((a, b) => a + b.count, 0)
    const secondHalf = data.slice(midPoint).reduce((a, b) => a + b.count, 0)
    const trend = secondHalf > firstHalf ? 'up' : secondHalf < firstHalf ? 'down' : 'stable'
    
    return { totalReviews, avgRating, trend, firstHalf, secondHalf }
  }, [reviews, data])

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Review Trends (Last {days} Days)
          </CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Volume
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              Avg Rating
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                tickMargin={8}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                domain={[0, 5]} 
                tick={{ fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'Volume') return [value, 'Reviews']
                  if (name === 'Avg Rating') return [value, 'Rating']
                  return [value, name]
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="count"
                name="Volume"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgRating"
                name="Avg Rating"
                stroke="#eab308"
                strokeWidth={2}
                dot={{ fill: '#eab308', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.totalReviews}</p>
            <p className="text-xs text-muted-foreground">Total Reviews</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.avgRating}</p>
            <p className="text-xs text-muted-foreground">Avg Rating</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${stats.trend === 'up' ? 'text-green-600' : stats.trend === 'down' ? 'text-red-600' : ''}`}>
              {stats.trend === 'up' ? '↑' : stats.trend === 'down' ? '↓' : '→'}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.trend === 'up' ? 'Increasing' : stats.trend === 'down' ? 'Decreasing' : 'Stable'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
