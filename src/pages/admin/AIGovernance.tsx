import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

type PolicySet = {
  id: string
  name: string
  domain: string
  active_version_id: string | null
  created_at: string
}

type Proposal = {
  id: string
  proposal_type: string
  status: string
  risk_score: number | null
  created_at: string
  proposal_json: Record<string, unknown>
}

type AuditLog = {
  id: string
  event_type: string
  entity_type: string
  created_at: string
  details: Record<string, unknown> | null
}



type MetricsSnapshot = {
  id: string
  window_start: string
  window_end: string
  metrics_json: Record<string, unknown>
}

export default function AIGovernance() {
  const { t } = useTranslation('admin')
  const [policySets, setPolicySets] = useState<PolicySet[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])

  const [latestMetrics, setLatestMetrics] = useState<MetricsSnapshot | null>(null)
  const [loading, setLoading] = useState(false)


  const loadData = useCallback(async () => {
    const [
      policySetsRes,
      proposalsRes,
      auditRes,

      metricsRes,
    ] = await Promise.all([
      supabase.from('ai_policy_sets').select('*').order('created_at', { ascending: false }),
      supabase.from('ai_proposals').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('ai_audit_logs').select('*').order('created_at', { ascending: false }).limit(20),

      supabase.from('ai_metrics_snapshots').select('*').order('window_end', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (policySetsRes.data) setPolicySets(policySetsRes.data as PolicySet[])
    if (proposalsRes.data) setProposals(proposalsRes.data as Proposal[])
    if (auditRes.data) setAuditLogs(auditRes.data as AuditLog[])

    if (metricsRes.data) setLatestMetrics(metricsRes.data as MetricsSnapshot)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const runAction = async (action: string) => {
    setLoading(true)
    const toastId = toast.loading(t('ai_governance.toast_running', { action }))
    const { data, error } = await supabase.rpc('ai_admin_execute', {
      p_action: action,
      p_proposal_id: null,
      p_optimizer_body: null,
    })
    if (error) {
      const details = error.details ? ` ${error.details}` : ''
      const hint = error.hint ? ` ${error.hint}` : ''
      toast.error(`${error.message}${details}${hint}`, { id: toastId })
    } else if (data?.status === 'SUCCESS') {
      toast.success(t('ai_governance.toast_completed', { action }), { id: toastId })
    } else {
      toast.error(data?.message || t('ai_governance.toast_failed', { action }), { id: toastId })
    }
    await loadData()
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('ai_governance.title')}</h1>
          <p className="text-sm text-slate-500">
            {t('ai_governance.description')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => runAction('full_cycle')} disabled={loading}>{t('ai_governance.actions.full_cycle')}</Button>
          <Button variant="outline" onClick={() => runAction('metrics_only')} disabled={loading}>{t('ai_governance.actions.metrics_only')}</Button>
          <Button variant="outline" onClick={() => runAction('optimizer_only')} disabled={loading}>{t('ai_governance.actions.optimizer_only')}</Button>
          <Button variant="outline" onClick={() => runAction('validate_pending')} disabled={loading}>{t('ai_governance.actions.validate_pending')}</Button>
          <Button variant="outline" onClick={() => runAction('apply_pending')} disabled={loading}>{t('ai_governance.actions.apply_pending')}</Button>

        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('ai_governance.metrics.title')}</CardTitle>
            <CardDescription>{t('ai_governance.metrics.description')}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            {latestMetrics ? (
              <>
                <div>{t('ai_governance.metrics.window', { start: latestMetrics.window_start, end: latestMetrics.window_end })}</div>
                <div className="mt-2 text-xs text-slate-500">
                  {t('ai_governance.metrics.tracked', { count: Object.keys(latestMetrics.metrics_json || {}).length })}
                </div>
              </>
            ) : (
              <div>{t('ai_governance.metrics.empty')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('ai_governance.policy_sets.title')}</CardTitle>
            <CardDescription>{t('ai_governance.policy_sets.description')}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            {policySets.length === 0 ? (
              <div>{t('ai_governance.policy_sets.empty')}</div>
            ) : (
              <ul className="space-y-2">
                {policySets.map((set) => (
                  <li key={set.id} className="flex items-center justify-between">
                    <span>{set.name}</span>
                    <span className="text-xs text-slate-500">{set.domain}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>


      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('ai_governance.proposals.title')}</CardTitle>
            <CardDescription>{t('ai_governance.proposals.description')}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            {proposals.length === 0 ? (
              <div>{t('ai_governance.proposals.empty')}</div>
            ) : (
              <ul className="space-y-3">
                {proposals.map((proposal) => (
                  <li key={proposal.id} className="rounded border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{proposal.proposal_type}</span>
                      <span className="text-xs text-slate-500">{proposal.status}</span>
                    </div>
                    <div className="text-xs text-slate-500">{t('ai_governance.proposals.risk', { value: proposal.risk_score ?? 'n/a' })}</div>
                    <div className="text-xs text-slate-500">{t('ai_governance.proposals.created', { value: new Date(proposal.created_at).toLocaleString() })}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('ai_governance.audit.title')}</CardTitle>
            <CardDescription>{t('ai_governance.audit.description')}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            {auditLogs.length === 0 ? (
              <div>{t('ai_governance.audit.empty')}</div>
            ) : (
              <ul className="space-y-3">
                {auditLogs.map((log) => (
                  <li key={log.id} className="rounded border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{log.event_type}</span>
                      <span className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-slate-500">{t('ai_governance.audit.entity', { value: log.entity_type })}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>


    </div>
  )
}
