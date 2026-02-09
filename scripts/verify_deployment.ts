
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

async function verifyEdgeFunction(name: string, payload: Record<string, unknown>) {
    console.log(`\nTesting Function: ${name}...`)
    const { data, error } = await supabase.functions.invoke(name, {
        body: payload
    })

    if (error) {
        console.error(`❌ Check failed:`, error.message)
        // 401/403 is "Success" for this test because it proves the function is deployed and checking auth
        if (error.code === '401' || error.message.includes('Unauthorized') || error.message.includes('Missing Authorization')) {
            console.log(`✅ Function is deployed and enforcing auth (Expected 401/403)`)
        } else if (error.message.includes('Failed to fetch')) {
            console.error(`❌ Function likely NOT deployed or unreachable`)
        }
    } else {
        console.log(`✅ Function responded successfully`)
        console.log(`Response preview:`, JSON.stringify(data).substring(0, 100))
    }
}

async function main() {
    console.log('🔍 Starting Deployment Verification...\n')

    // 1. Check process-event (Deployed)
    await verifyEdgeFunction('process-event', { event_type: 'TEST_PING' })

    // 2. Check workflow-engine (Deployed)
    await verifyEdgeFunction('workflow-engine', { execution_id: 'test-id' })

    // 3. Check bulk-notification-processor (Refactored)
    await verifyEdgeFunction('bulk-notification-processor', { action: 'get_status' })

    console.log('\nVerification Complete.')
}

main()
