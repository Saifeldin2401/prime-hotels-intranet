
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htsvjfrofcpkfzvjpwvx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c3ZqZnJvZmNwa2Z6dmpwd3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzk1MTQsImV4cCI6MjA4MDk1NTUxNH0.fzBLdH8oSWiFpNEY3g3Nm5kazuRZufbFuANot7z50sE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Querying pii_access_logs...');
    try {
        const { data, error } = await supabase
            .from('pii_access_logs')
            .select('*');

        if (error) {
            console.error('Error:', error);
            process.exit(1);
        }

        console.log('Data count:', data?.length || 0);
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Caught error:', err);
        process.exit(1);
    }
}

test();
