/**
 * Slack Client Library
 * 
 * Client-side helpers for Slack integration
 */

import { supabase } from './supabase';
import type { SlackIntegration, SlackTestResponse, SlackUserMapping } from '@/types/slack';

/**
 * Get all Slack integrations
 */
export async function getSlackIntegrations(): Promise<SlackIntegration[]> {
  const { data, error } = await supabase
    .from('slack_integrations')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as SlackIntegration[];
}

/**
 * Get Slack integration for a specific property
 */
export async function getSlackIntegrationForProperty(propertyId: string): Promise<SlackIntegration | null> {
  const { data, error } = await supabase
    .from('slack_integrations')
    .select('*')
    .eq('property_id', propertyId)
    .eq('is_active', true)
    .maybeSingle();
  
  if (error) throw error;
  return data as SlackIntegration | null;
}

/**
 * Test a Slack webhook URL
 */
export async function testSlackWebhook(webhookUrl: string, message?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message || 'Test message from PHG Connect',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*PHG Connect*: Testing Slack webhook connection.',
            },
          },
        ],
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Test a Slack edge function endpoint
 */
export async function testSlackEndpoint(
  endpoint: 'slack-events' | 'slack-commands' | 'slack-interactive' | 'slack-training'
): Promise<SlackTestResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ test_mode: true }),
    }
  );
  
  const data = await response.json();
  return data as SlackTestResponse;
}

/**
 * Get Slack user mapping for current user
 */
export async function getMySlackMapping(): Promise<SlackUserMapping | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('slack_user_mappings')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  
  if (error) throw error;
  return data as SlackUserMapping | null;
}

/**
 * Link Slack account to PHG account
 * Note: This would typically be done via OAuth flow
 */
export async function linkSlackAccount(slackUserId: string, slackTeamId: string): Promise<SlackUserMapping> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('slack_user_mappings')
    .upsert({
      user_id: user.id,
      slack_user_id: slackUserId,
      slack_team_id: slackTeamId,
      is_active: true,
    }, {
      onConflict: 'user_id,slack_team_id',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as SlackUserMapping;
}

/**
 * Unlink Slack account
 */
export async function unlinkSlackAccount(teamId?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');
  
  let query = supabase
    .from('slack_user_mappings')
    .update({ is_active: false })
    .eq('user_id', user.id);
  
  if (teamId) {
    query = query.eq('slack_team_id', teamId);
  }
  
  const { error } = await query;
  if (error) throw error;
}

/**
 * Send training digest via Slack
 */
export async function sendSlackTrainingDigest(): Promise<{ success: boolean; digest_sent?: number; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-training`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'send_digest' }),
    }
  );
  
  const data = await response.json();
  return data as { success: boolean; digest_sent?: number; error?: string };
}



/**
 * Get webhook URLs for configuration
 */
export function getSlackWebhookUrls(): {
  events: string;
  commands: string;
  interactive: string;
} {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  return {
    events: `${baseUrl}/functions/v1/slack-events`,
    commands: `${baseUrl}/functions/v1/slack-commands`,
    interactive: `${baseUrl}/functions/v1/slack-interactive`,
  };
}

/**
 * Validate Slack webhook URL format
 */
export function isValidSlackWebhookUrl(url: string): boolean {
  // Slack webhook URLs follow this pattern:
  // https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
  const slackWebhookPattern = /^https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[a-zA-Z0-9]+$/;
  return slackWebhookPattern.test(url);
}
