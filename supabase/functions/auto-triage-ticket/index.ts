/**
 * Auto-Triage Maintenance Ticket
 * 
 * Edge function triggered when a new maintenance ticket is created.
 * Automatically analyzes the description and applies AI suggestions.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const HF_TOKEN = Deno.env.get('HUGGINGFACE_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface TriageResult {
    priority: 'low' | 'medium' | 'high' | 'critical';
    suggested_category: string;
    estimated_hours: number;
    ai_notes: string;
}

async function analyzeTicket(title: string, description: string): Promise<TriageResult | null> {
    if (!HF_TOKEN) {
        console.error('Missing HF_TOKEN');
        return null;
    }

    const prompt = `You are a hotel maintenance manager. Analyze this maintenance ticket and provide triage information.

TICKET TITLE: ${title}
DESCRIPTION: ${description}

Respond with valid JSON only:
{
  "priority": "low|medium|high|critical",
  "suggested_category": "Plumbing|Electrical|HVAC|Carpentry|General|Safety",
  "estimated_hours": 1,
  "ai_notes": "Brief note about approach"
}

RULES:
- critical: Safety hazards, water leaks, no power
- high: Guest-impacting issues, broken equipment
- medium: Maintenance needs affecting operations
- low: Cosmetic, preventive, non-urgent

Return ONLY valid JSON.`;

    try {
        const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'Qwen/Qwen2.5-72B-Instruct',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 500,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            console.error('AI API error:', await response.text());
            return null;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as TriageResult;
        }
    } catch (err) {
        console.error('AI analysis failed:', err);
    }

    return null;
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'authorization, content-type'
            }
        });
    }

    try {
        const { ticket_id } = await req.json();

        if (!ticket_id) {
            return new Response(JSON.stringify({ error: 'Missing ticket_id' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Fetch the ticket
        const { data: ticket, error: fetchError } = await supabase
            .from('maintenance_tickets')
            .select('id, title, description, priority, category')
            .eq('id', ticket_id)
            .single();

        if (fetchError || !ticket) {
            console.error('Failed to fetch ticket:', fetchError);
            return new Response(JSON.stringify({ error: 'Ticket not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Skip if already triaged (has AI notes or explicit category)
        if (ticket.category && ticket.priority !== 'medium') {
            return new Response(JSON.stringify({
                success: true,
                message: 'Ticket already triaged',
                skipped: true
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Analyze with AI
        const triage = await analyzeTicket(ticket.title, ticket.description);

        if (!triage) {
            return new Response(JSON.stringify({
                success: false,
                message: 'AI analysis failed'
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Update the ticket with AI suggestions
        const { error: updateError } = await supabase
            .from('maintenance_tickets')
            .update({
                priority: triage.priority,
                category: triage.suggested_category,
                estimated_hours: triage.estimated_hours,
                ai_triage_notes: triage.ai_notes,
                ai_triaged_at: new Date().toISOString()
            })
            .eq('id', ticket_id);

        if (updateError) {
            console.error('Failed to update ticket:', updateError);
            return new Response(JSON.stringify({
                error: 'Failed to update ticket',
                details: updateError.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`✅ Auto-triaged ticket ${ticket_id}: ${triage.priority} - ${triage.suggested_category}`);

        return new Response(JSON.stringify({
            success: true,
            triage
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('Auto-triage error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
