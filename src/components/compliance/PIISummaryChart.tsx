/**
 * FORGE X: Enterprise Audit & Compliance Export System
 * PII Summary Chart Component
 */

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import type { PIIAccessSummary } from '@/types/audit'
import { AlertTriangle } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface PIISummaryChartProps {
  data: PIIAccessSummary[]
  isLoading?: boolean
  detailed?: boolean
}

export function PIISummaryChart({ data, isLoading = false, detailed = false }: PIISummaryChartProps) {
  if (isLoading) {
    return <Skeleton className="h-[200px] w-full" />
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No PII access data available</p>
      </div>
    )
  }

  // Take last 7 days for chart
  const chartData = data.slice(0, 7).map((item) => ({
    date: new Date(item.access_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    accesses: item.access_count,
    accessors: item.unique_accessors,
    risk: item.risk_score,
  }))

  const highRiskDays = data.filter((d) => d.risk_score >= 7).length

  return (
    <div className="space-y-4">
      {highRiskDays > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {highRiskDays} day(s) with elevated PII access risk detected in the last week
          </AlertDescription>
        </Alert>
      )}

      <div className={detailed ? 'h-[300px]' : 'h-[200px]'}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="accesses" fill="#3b82f6" name="PII Accesses" />
            <Bar dataKey="accessors" fill="#10b981" name="Unique Users" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {detailed && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {data.reduce((sum, d) => sum + d.access_count, 0).toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Total Accesses</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {Math.max(...data.map((d) => d.unique_accessors))}
            </p>
            <p className="text-sm text-muted-foreground">Peak Daily Users</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{highRiskDays}</p>
            <p className="text-sm text-muted-foreground">High Risk Days</p>
          </div>
        </div>
      )}
    </div>
  )
}
