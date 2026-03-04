import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');
const env = {};
for (const line of lines) {
    const [key, ...values] = line.split('=');
    if (key) {
        env[key.trim()] = values.join('=').trim();
    }
}

const SUPABASE_URL = env['VITE_SUPABASE_URL'] || 'https://htsvjfrofcpkfzvjpwvx.supabase.co';
const SUPABASE_KEY = env['VITE_SUPABASE_SERVICE_ROLE_KEY'];

console.log('Fetching...');
fetch(`${SUPABASE_URL}/rest/v1/pii_access_logs?select=*,accessed_by_profile:profiles!pii_access_logs_actor_id_fkey(full_name,email),user:profiles!pii_access_logs_target_user_id_fkey(full_name,email),approved_by_profile:profiles!pii_access_logs_approved_by_fkey(full_name,email)`, {
    headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
    }
}).then(res => res.json()).then(data => {
    console.log('Response:', data);
}).catch(console.error);
