import { Activity, CheckCircle2, XCircle, Mail, Loader2, ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format, subDays, startOfDay } from 'date-fns'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartViewport } from '@/components/ui/ChartViewport'
import { supabase } from '@/lib/supabase'

interface AnalyticsState {
  totalSent: number
  delivered: number
  failed: number
  timeline: { date: string; sent: number; failed: number }[]
  byTemplate: { template_key: string; sent: number; delivered: number; failed: number }[]
  isLoading: boolean
}

export default function EmailAnalytics() {
  const { t } = useTranslation(['admin', 'common'])
  const [state, setState] = useState<AnalyticsState>({
    totalSent: 0,
    delivered: 0,
    failed: 0,
    timeline: [],
    byTemplate: [],
    isLoading: true
  })

  const loadAnalytics = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      // We want the last 30 days of events
      const thirtyDaysAgo = startOfDay(subDays(new Date(), 30)).toISOString()

      const { data, error } = await supabase
        .from('notification_delivery_events')
        .select('template_key, status, sent_at')
        .gte('created_at', thirtyDaysAgo)

      if (error) throw error

      let totalSent = 0
      let delivered = 0
      let failed = 0

      // Map for timeline
      const timelineMap = new Map<string, { sent: number, failed: number }>()
      for (let i = 29; i >= 0; i--) {
        const d = format(subDays(new Date(), i), 'MMM dd')
        timelineMap.set(d, { sent: 0, failed: 0 })
      }

      // Map for templates
      const templateMap = new Map<string, { sent: number, delivered: number, failed: number }>()

      for (const event of (data || [])) {
        if (!event.template_key) continue

        const status = event.status
        const isSent = status !== 'failed'
        const isDelivered = status === 'delivered'
        const isFailed = status === 'failed'

        if (isSent) totalSent++
        if (isDelivered) delivered++
        if (isFailed) failed++

        // Timeline processing
        if (event.sent_at) {
          const day = format(new Date(event.sent_at), 'MMM dd')
          if (timelineMap.has(day)) {
            const entry = timelineMap.get(day)!
            if (isSent) entry.sent++
            if (isFailed) entry.failed++
          }
        }

        // Template processing
        if (!templateMap.has(event.template_key)) {
          templateMap.set(event.template_key, { sent: 0, delivered: 0, failed: 0 })
        }
        const tmpl = templateMap.get(event.template_key)!
        if (isSent) tmpl.sent++
        if (isDelivered) tmpl.delivered++
        if (isFailed) tmpl.failed++
      }

      setState({
        totalSent,
        delivered,
        failed,
        timeline: Array.from(timelineMap.entries()).map(([date, counts]) => ({
          date,
          sent: counts.sent,
          failed: counts.failed
        })),
        byTemplate: Array.from(templateMap.entries())
          .map(([template_key, counts]) => ({ template_key, ...counts }))
          .sort((a, b) => b.sent - a.sent),
        isLoading: false
      })
    } catch (err) {
      console.error('Failed to load email analytics', err)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const deliveryRate = state.totalSent > 0 ? Math.round((state.delivered / state.totalSent) * 100) : 0
  const failureRate = state.totalSent > 0 ? Math.round((state.failed / state.totalSent) * 100) : 0

  return (
    <div className="container mx-auto py-6 max-w-[1200px] space-y-6">
      <PageHeader
        title="Email Analytics"
        description="Monitor email delivery performance and template usage over the last 30 days."
        backTo="/admin"
      />

      {state.isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{state.totalSent.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Emails processed in 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{deliveryRate}%</div>
                <p className="text-xs text-muted-foreground">{state.delivered.toLocaleString()} delivered</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failure Rate</CardTitle>
                <XCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{failureRate}%</div>
                <p className="text-xs text-muted-foreground">{state.failed.toLocaleString()} bounced or failed</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Timeline (30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartViewport minHeight={300}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={state.timeline}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="sent" name="Processed" fill="#0B1C3E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartViewport>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template Breakdown</CardTitle>
            </CardHeader>
            <div className="p-0 border-t">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3 font-medium">Template Key</th>
                    <th className="px-6 py-3 font-medium text-right">Processed</th>
                    <th className="px-6 py-3 font-medium text-right">Delivered</th>
                    <th className="px-6 py-3 font-medium text-right">Failed</th>
                    <th className="px-6 py-3 font-medium text-right">Delivery Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {state.byTemplate.map((tmpl) => {
                    const rate = tmpl.sent > 0 ? Math.round((tmpl.delivered / tmpl.sent) * 100) : 0
                    return (
                      <tr key={tmpl.template_key} className="hover:bg-muted/30">
                        <td className="px-6 py-4 font-medium text-primary">{tmpl.template_key}</td>
                        <td className="px-6 py-4 text-right">{tmpl.sent.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-green-600">{tmpl.delivered.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-destructive">{tmpl.failed.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={rate >= 90 ? 'text-green-600' : rate >= 75 ? 'text-amber-500' : 'text-destructive'}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {state.byTemplate.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        No email activity found in the last 30 days.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
