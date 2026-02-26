import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getServiceRoleToken } from '../_shared/auth.ts'
import { buildCorsHeaders } from "../_shared/cors.ts";

const callFunction = async (
  baseUrl: string,
  name: string,
  token: string,
  body?: Record<string, unknown>,
) => {
  const response = await fetch(`${baseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  })
  const data = await response.json().catch(() => ({}))
  return { status: response.status, ok: response.ok, data }
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
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

    const baseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    if (!baseUrl) throw new Error('SUPABASE_URL is not set')

    const body = await req.json().catch(() => ({}))
    const action = body.action ?? 'full_cycle'

    const results: Record<string, unknown> = {}

    if (action === 'metrics_only' || action === 'full_cycle') {
      results.metrics = await callFunction(baseUrl, 'ai-metrics-collector', serviceRoleToken)
    }

    if (action === 'optimizer_only' || action === 'full_cycle') {
      results.optimizer = await callFunction(
        baseUrl,
        'ai-optimizer',
        serviceRoleToken,
        body.optimizer_body as Record<string, unknown> | undefined,
      )
    }

    const proposalId =
      (results.optimizer as any)?.data?.proposal?.id ??
      body.proposal_id ??
      null

    if (action === 'validate_pending') {
      results.validation = await callFunction(baseUrl, 'ai-safety-validator', serviceRoleToken, {})
    } else if (action === 'full_cycle' && proposalId) {
      results.validation = await callFunction(baseUrl, 'ai-safety-validator', serviceRoleToken, {
        proposal_id: proposalId,
      })
    }

    const validationStatus = (results.validation as any)?.data?.decision?.status
    if (action === 'apply_pending') {
      results.applier = await callFunction(baseUrl, 'ai-policy-applier', serviceRoleToken, {
        apply_all: true,
      })
    } else if (action === 'full_cycle' && proposalId && validationStatus === 'validated') {
      results.applier = await callFunction(baseUrl, 'ai-policy-applier', serviceRoleToken, {
        proposal_id: proposalId,
      })
    }

    if (action === 'daily_report' || action === 'full_cycle') {
      results.report = await callFunction(baseUrl, 'ai-daily-report', serviceRoleToken)
    }

    if (action === 'rollback_check' || action === 'full_cycle') {
      results.rollback = await callFunction(baseUrl, 'ai-rollback-engine', serviceRoleToken)
    }

    return new Response(JSON.stringify({ success: true, action, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('ai-admin error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})



