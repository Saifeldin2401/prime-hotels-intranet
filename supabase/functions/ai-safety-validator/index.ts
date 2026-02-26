import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Ajv from 'https://esm.sh/ajv@8.12.0?bundle'
import { getServiceRoleToken } from '../_shared/auth.ts'
import { buildCorsHeaders } from "../_shared/cors.ts";

const schemaNameForProposal = (proposalType: string) => {
  switch (proposalType) {
    case 'optimization':
      return 'optimization_proposal'
    case 'routing':
      return 'routing_proposal'
    case 'task':
      return 'task_proposal'
    case 'delegation':
      return 'delegation_proposal'
    default:
      return null
  }
}

const safeNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const validateProposal = async (supabase: any, proposal: any) => {
  const schemaName = schemaNameForProposal(proposal.proposal_type)
  if (!schemaName) {
    throw new Error(`Unsupported proposal_type: ${proposal.proposal_type}`)
  }

  const { data: schemaRow, error: schemaError } = await supabase
    .from('ai_schema_registry')
    .select('schema_json')
    .eq('name', schemaName)
    .eq('is_active', true)
    .maybeSingle()

  if (schemaError || !schemaRow?.schema_json) {
    throw new Error(`Schema not found for ${schemaName}`)
  }

  const ajv = new Ajv({ allErrors: true, strict: false })
  const validate = ajv.compile(schemaRow.schema_json)
  const isSchemaValid = validate(proposal.proposal_json)

  const validationErrors = isSchemaValid ? null : validate.errors

  const { data: optimizationPolicyRows } = await supabase.rpc('get_active_policy', {
    p_domain: 'optimization',
  })
  const optimizationPolicy = optimizationPolicyRows?.[0]?.policy_json ?? {}
  const allowedChanges = proposal.proposal_type === 'optimization' && Array.isArray(optimizationPolicy.allowed_changes)
    ? optimizationPolicy.allowed_changes
    : []

  const { data: constraints } = await supabase
    .from('ai_constraints')
    .select('constraint_json')
    .eq('is_active', true)

  const blockedActions = new Set<string>()
  for (const row of constraints || []) {
    const items = row?.constraint_json?.blocked_actions
    if (Array.isArray(items)) {
      for (const item of items) blockedActions.add(String(item))
    }
  }

  const changes = Array.isArray(proposal.proposal_json?.changes)
    ? proposal.proposal_json.changes
    : []
  const disallowedActions = changes
    .map((change: Record<string, unknown>) => String(change?.action ?? ''))
    .filter((action: string) =>
      action.length === 0 ||
      blockedActions.has(action) ||
      (allowedChanges.length > 0 && !allowedChanges.includes(action))
    )

  const { data: thresholds } = await supabase
    .from('ai_risk_thresholds')
    .select('*')
    .eq('is_active', true)
    .maybeSingle()

  const riskScore = safeNumber(
    proposal.proposal_json?.risk_score ?? proposal.risk_score,
    0.5,
  )

  const autoApplyMax = safeNumber(thresholds?.auto_apply_max, 0.2)
  const blockedMin = safeNumber(thresholds?.blocked_min, 0.4)

  let status = 'validated'
  if (!isSchemaValid || disallowedActions.length > 0) {
    status = 'rejected'
  } else if (riskScore >= blockedMin) {
    status = 'rejected'
  } else if (riskScore > autoApplyMax) {
    status = 'needs_review'
  }

  const decisionPayload = {
    proposal_id: proposal.id,
    schema_valid: isSchemaValid,
    validation_errors: validationErrors,
    disallowed_actions: disallowedActions,
    risk_score: riskScore,
    status,
  }

  await supabase.from('ai_proposals').update({
    status,
    risk_score: riskScore,
    validation_errors: validationErrors,
    updated_at: new Date().toISOString(),
  }).eq('id', proposal.id)

  await supabase.from('ai_decisions').insert({
    proposal_id: proposal.id,
    decision_json: decisionPayload,
    status,
  })

  await supabase.from('ai_audit_logs').insert({
    event_type: 'proposal_validated',
    actor_type: 'system',
    entity_type: 'ai_proposals',
    entity_id: proposal.id,
    details: decisionPayload,
  })

  return decisionPayload
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleToken,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const { proposal_id } = await req.json().catch(() => ({}))

    if (!proposal_id) {
      const { data: proposals } = await supabase
        .from('ai_proposals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      const results = []
      for (const proposal of proposals || []) {
        try {
          const decision = await validateProposal(supabase, proposal)
          results.push({ proposal_id: proposal.id, success: true, decision })
        } catch (err) {
          results.push({
            proposal_id: proposal.id,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: proposal, error: proposalError } = await supabase
      .from('ai_proposals')
      .select('*')
      .eq('id', proposal_id)
      .single()

    if (proposalError || !proposal) {
      throw new Error(proposalError?.message || 'Proposal not found')
    }

    const decisionPayload = await validateProposal(supabase, proposal)

    return new Response(JSON.stringify({ success: true, decision: decisionPayload }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('ai-safety-validator error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})



