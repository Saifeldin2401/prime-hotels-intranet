import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format, subDays, startOfDay } from 'date-fns'

import { PageHeader } from '@/components/layout/PageHeader'
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
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Email delivery"
        description="Were emails delivered in the last 30 days, and which templates fail?"
      />

      {state.isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-[6px] border border-ds-border bg-ds-border sm:grid-cols-3">
            {[
              { label: 'Sent', value: state.totalSent.toLocaleString(), note: 'last 30 days' },
              { label: 'Delivered', value: `${deliveryRate}%`, note: `${state.delivered.toLocaleString()} emails` },
              { label: 'Failed or bounced', value: `${failureRate}%`, note: `${state.failed.toLocaleString()} emails`, danger: state.failed > 0 },
            ].map((f) => (
              <div key={f.label} className="bg-ds-surface px-4 py-4">
                <dt className="text-xs text-ds-muted">{f.label}</dt>
                <dd className={`mt-1 font-mono text-2xl tabular-nums ${f.danger ? 'text-ds-danger' : 'text-ds-ink'}`}>{f.value}</dd>
                <dd className="text-xs text-ds-muted">{f.note}</dd>
              </div>
            ))}
          </dl>

          <section aria-labelledby="email-timeline" className="space-y-3">
            <h2 id="email-timeline" className="text-lg font-semibold text-ds-ink">Sent per day</h2>
            <div className="rounded-[6px] border border-ds-border bg-ds-surface p-4">
              <ChartViewport minHeight={300}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={state.timeline}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4DF" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7580' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7580' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '6px', border: '1px solid #E4E4DF', boxShadow: 'none' }}
                    />
                    <Bar dataKey="sent" name="Processed" fill="#15212E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="failed" name="Failed" fill="#A5302A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartViewport>
            </div>
          </section>

          <section aria-labelledby="email-templates" className="space-y-3">
            <h2 id="email-templates" className="text-lg font-semibold text-ds-ink">By template</h2>
            <div className="overflow-x-auto rounded-[6px] border border-ds-border bg-ds-surface">
              <table className="w-full text-sm text-start">
                <thead className="border-b border-ds-border text-xs text-ds-muted">
                  <tr>
                    <th className="px-6 py-3 font-medium">Template Key</th>
                    <th className="px-6 py-3 font-medium text-end">Processed</th>
                    <th className="px-6 py-3 font-medium text-end">Delivered</th>
                    <th className="px-6 py-3 font-medium text-end">Failed</th>
                    <th className="px-6 py-3 font-medium text-end">Delivery Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {state.byTemplate.map((tmpl) => {
                    const rate = tmpl.sent > 0 ? Math.round((tmpl.delivered / tmpl.sent) * 100) : 0
                    return (
                      <tr key={tmpl.template_key} className="hover:bg-muted/30">
                        <td className="px-6 py-4 font-mono text-xs text-ds-ink">{tmpl.template_key}</td>
                        <td className="px-6 py-4 text-end">{tmpl.sent.toLocaleString()}</td>
                        <td className="px-6 py-4 text-end text-ds-success">{tmpl.delivered.toLocaleString()}</td>
                        <td className="px-6 py-4 text-end text-destructive">{tmpl.failed.toLocaleString()}</td>
                        <td className="px-6 py-4 text-end">
                          <span className={rate >= 90 ? 'text-ds-success' : rate >= 75 ? 'text-ds-warning' : 'text-destructive'}>
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
          </section>
        </>
      )}
    </div>
  )
}
