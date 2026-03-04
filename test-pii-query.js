import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://htsvjfrofcpkfzvjpwvx.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Need a way to get the admin key or a test user token to query
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function testQuery() {
    console.log('Running query...');
    const { data, error, count } = await supabase
        .from('pii_access_logs')
        .select(`
      *,
      accessed_by_profile:profiles!pii_access_logs_actor_id_fkey(full_name, email),
      user:profiles!pii_access_logs_target_user_id_fkey(full_name, email),
      approved_by_profile:profiles!pii_access_logs_approved_by_fkey(full_name, email)
    `);

    console.log('Error:', error);
    console.log('Data count:', data?.length);
    if (data && data.length > 0) {
        console.log('First row:', data[0]);
    }
}

testQuery();
