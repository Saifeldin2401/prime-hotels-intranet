import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getServiceRoleToken } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const serviceRoleToken = getServiceRoleToken(authHeader)
    if (!serviceRoleToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleToken,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const now = new Date()
    const reportDate = now.toISOString().slice(0, 10)
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    const [
      metricsSnapshotRes,
      proposalsRes,
      decisionsRes,
      changesRes,
      auditRes,
    ] = await Promise.all([
      supabase.from('ai_metrics_snapshots')
        .select('*')
        .order('window_end', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('ai_proposals')
        .select('id, proposal_type, status, risk_score, created_at')
        .gte('created_at', since),
      supabase.from('ai_decisions')
        .select('id, status, created_at')
        .gte('created_at', since),
      supabase.from('ai_policy_changes')
        .select('id, policy_set_id, from_version_id, to_version_id, applied_at')
        .gte('applied_at', since),
      supabase.from('ai_audit_logs')
        .select('id, event_type, created_at')
        .gte('created_at', since),
    ])

    const summary = {
      report_date: reportDate,
      generated_at: now.toISOString(),
      metrics_snapshot: metricsSnapshotRes.data ?? null,
      proposal_count: proposalsRes.data?.length ?? 0,
      decision_count: decisionsRes.data?.length ?? 0,
      change_count: changesRes.data?.length ?? 0,
      audit_events: auditRes.data?.length ?? 0,
      recent_proposals: proposalsRes.data ?? [],
      recent_changes: changesRes.data ?? [],
    }

    const { data: existingReport } = await supabase
      .from('ai_daily_reports')
      .select('id')
      .eq('report_date', reportDate)
      .maybeSingle()

    if (existingReport?.id) {
      await supabase.from('ai_daily_reports')
        .update({ summary_json: summary })
        .eq('id', existingReport.id)
    } else {
      await supabase.from('ai_daily_reports')
        .insert({ report_date: reportDate, summary_json: summary })
    }

    await supabase.from('ai_audit_logs').insert({
      event_type: 'daily_report_generated',
      actor_type: 'system',
      entity_type: 'ai_daily_reports',
      details: { report_date: reportDate },
    })

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('ai-daily-report error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
