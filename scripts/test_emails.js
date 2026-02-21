
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials in .env.development');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEmails() {
    const email = 'saifeldinislam@gmail.com';

    const templates = [
        {
            key: 'hr_employee_update',
            subject: 'Review: Premium HR Template',
            data: {
                title: 'HR Profile Updated',
                message: 'The HR department has updated your employee records in the new premium layout.',
                action_url: '/profile',
                action_label: 'View Profile'
            }
        },
        {
            key: 'learning_assignment_new',
            subject: 'Review: Premium Learning Template',
            data: {
                title: 'New Mandatory Training',
                message: 'Guest Excellence Standard training has been assigned to you. Amber theme test.',
                action_url: '/learning/training/123',
                action_label: 'Start Training'
            }
        },
        {
            key: 'ai_daily_briefing',
            subject: 'Review: Premium AI Template',
            data: {
                title: 'Morning Intelligence',
                message: 'Daily AI brief test with special intelligence layout.',
                action_url: '/dashboard',
                date: 'Oct 24, 2026',
                ai_insights: 'Optimization complete. Regional occupancy is trending upwards.',
                health_score: '96',
                pending_count: '3',
                closing_remarks: 'Have a productive day at the hotel.'
            }
        }
    ];

    console.log(`🚀 Sending ${templates.length} test emails to ${email}...`);

    for (const t of templates) {
        console.log(`Sending ${t.key}...`);
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                to: email,
                subject: t.subject,
                templateKey: t.key,
                title: t.data.title,
                message: t.data.message,
                actionUrl: t.data.action_url,
                actionLabel: t.data.action_label, // Some use actionLabel in body
                variables: t.data
            }
        });

        if (error) {
            console.error(`❌ Failed to send ${t.key}:`, error);
        } else {
            console.log(`✅ ${t.key} sent successfully!`, data);
        }
    }
}

testEmails();
