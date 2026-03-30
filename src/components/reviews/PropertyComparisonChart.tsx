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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2 } from 'lucide-react'

interface GuestReview {
  id: string
  rating?: number
  sentiment?: string
  property_id?: string
}

interface PropertyComparisonChartProps {
  reviews: GuestReview[]
  properties: { id: string; name: string }[]
}

export function PropertyComparisonChart({ reviews, properties }: PropertyComparisonChartProps) {
  const data = useMemo(() => {
    const propertyStats: Record<string, { 
      id: string
      name: string
      total: number
      avgRating: number
      ratings: number[]
      positive: number
      negative: number
      responseRate: number
      responded: number
    }> = {}
    
    // Initialize with all properties
    properties.forEach((p) => {
      propertyStats[p.id] = {
        id: p.id,
        name: p.name,
        total: 0,
        avgRating: 0,
        ratings: [],
        positive: 0,
        negative: 0,
        responseRate: 0,
        responded: 0,
      }
    })
    
    // Aggregate review data
    reviews.forEach((review) => {
      if (!review.property_id || !propertyStats[review.property_id]) return
      
      const stats = propertyStats[review.property_id]
      stats.total++
      
      if (review.rating) {
        stats.ratings.push(review.rating)
      }
      
      if (review.sentiment?.toLowerCase() === 'positive') {
        stats.positive++
      } else if (review.sentiment?.toLowerCase() === 'negative') {
        stats.negative++
      }
    })
    
    // Calculate averages and sort by total reviews
    return Object.values(propertyStats)
      .map((p) => ({
        ...p,
        avgRating: p.ratings.length > 0
          ? Number((p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length).toFixed(1))
          : 0,
        sentimentScore: p.total > 0 ? Math.round((p.positive / p.total) * 100) : 0,
      }))
      .filter((p) => p.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8) // Show top 8 properties
  }, [reviews, properties])

  const getBarColor = (value: number) => {
    if (value >= 4.5) return '#22c55e' // green
    if (value >= 4.0) return '#84cc16' // lime
    if (value >= 3.5) return '#eab308' // yellow
    if (value >= 3.0) return '#f97316' // orange
    return '#ef4444' // red
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Property Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 5]} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string, props: any) => {
                  if (name === 'avgRating') return [value, 'Avg Rating']
                  return [value, name]
                }}
                labelFormatter={(label: string) => `${label}`}
              />
              <Bar dataKey="avgRating" name="avgRating" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.avgRating)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-500" />
            <span>Excellent (4.5+)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-lime-500" />
            <span>Good (4.0-4.5)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-yellow-500" />
            <span>Average (3.5-4.0)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-orange-500" />
            <span>Below Avg (3.0-3.5)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-500" />
            <span>Poor (&lt;3.0)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
