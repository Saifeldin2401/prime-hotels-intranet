import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

type FunctionCheck = {
  name: string
  payload: Record<string, unknown>
}

type CheckResult = {
  name: string
  ok: boolean
  detail: string
}

const checks: FunctionCheck[] = [
  { name: 'admin-account-actions', payload: { action: 'status' } },
  { name: 'ai-translation', payload: { text: 'hello', targetLanguage: 'ar' } },
  { name: 'auto-triage-ticket', payload: { ticketId: '00000000-0000-0000-0000-000000000000' } },
  { name: 'bulk-notification-processor', payload: { action: 'get_status' } },
  { name: 'complete-invite-profile', payload: { token: 'test-token' } },
  { name: 'create-user', payload: { email: 'integration-check@example.com' } },
  { name: 'delete-user', payload: { userId: '00000000-0000-0000-0000-000000000000' } },
  { name: 'process-ai-request', payload: { prompt: 'ping', type: 'integration-check' } },
  { name: 'process-event', payload: { event_type: 'TEST_PING' } },
  { name: 'scan-file', payload: { path: 'integration-check.txt' } },
  { name: 'send-email', payload: { to: ['integration-check@example.com'] } },
  { name: 'workflow-engine', payload: { execution_id: 'integration-check' } }
]

function summarizeError(error: unknown) {
  const typed = error as {
    message?: string
    context?: Response | {
      response?: Response
    }
  }

  const response =
    typed?.context instanceof Response
      ? typed.context
      : typed?.context?.response

  const status = response?.status
  const statusText = response?.statusText
  const message = typed?.message || 'Unknown function invocation error'

  return { status, statusText, message }
}

function classifyError(status?: number, message?: string) {
  const normalized = (message || '').toLowerCase()

  if (normalized.includes('failed to fetch')) {
    return { ok: false, detail: 'unreachable (network/fetch failure)' }
  }

  if (status === 404 || normalized.includes('not found')) {
    return { ok: false, detail: 'missing (404/not found)' }
  }

  if (status) {
    return { ok: true, detail: `reachable (HTTP ${status})` }
  }

  return { ok: false, detail: message || 'unknown failure' }
}

async function verifyEdgeFunction(check: FunctionCheck): Promise<CheckResult> {
  console.log(`\nTesting function: ${check.name}`)

  try {
    const { data, error } = await supabase.functions.invoke(check.name, {
      body: check.payload
    })

    if (error) {
      const { status, statusText, message } = summarizeError(error)
      const classified = classifyError(status, message)
      const detailSuffix = statusText ? ` ${statusText}` : ''

      console.log(`Result: ${classified.detail}${detailSuffix ? ` ${detailSuffix}` : ''}`)
      if (!classified.ok) {
        console.log(`Message: ${message}`)
      }

      return {
        name: check.name,
        ok: classified.ok,
        detail: classified.detail
      }
    }

    console.log('Result: reachable (HTTP 200)')
    if (data !== null && data !== undefined) {
      console.log(`Response preview: ${JSON.stringify(data).substring(0, 120)}`)
    }

    return {
      name: check.name,
      ok: true,
      detail: 'reachable (HTTP 200)'
    }
  } catch (error) {
    const { status, message } = summarizeError(error)
    const classified = classifyError(status, message)

    console.log(`Result: ${classified.detail}`)
    if (!classified.ok) {
      console.log(`Message: ${message}`)
    }

    return {
      name: check.name,
      ok: classified.ok,
      detail: classified.detail
    }
  }
}

async function main() {
  console.log('Starting deployment verification...')
  console.log(`Checking ${checks.length} edge functions used by the app.`)

  const results: CheckResult[] = []
  for (const check of checks) {
    results.push(await verifyEdgeFunction(check))
  }

  const failed = results.filter((result) => !result.ok)

  console.log('\nSummary')
  results.forEach((result) => {
    console.log(`- ${result.name}: ${result.detail}`)
  })

  if (failed.length > 0) {
    console.error(`\nDeployment verification failed for ${failed.length} function(s).`)
    process.exit(1)
  }

  console.log('\nDeployment verification passed.')
}

void main()
