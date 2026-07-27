/**
 * Slack Integration Types
 * 
 * TypeScript interfaces for Slack bot integration
 */

// ============================================================================
// Slack API Types
// ============================================================================

export interface SlackBlock {
  type: 'header' | 'section' | 'divider' | 'context' | 'actions' | 'image' | 'input';
  text?: {
    type: 'plain_text' | 'mrkdwn';
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: 'mrkdwn';
    text: string;
  }>;
  elements?: Array<Record<string, unknown>>;
  block_id?: string;
  [key: string]: unknown;
}

export interface SlackCommandResponse {
  response_type: 'ephemeral' | 'in_channel';
  text: string;
  blocks?: SlackBlock[];
  replace_original?: boolean;
  delete_original?: boolean;
}

export interface SlackEvent {
  type: string;
  user?: string;
  channel?: string;
  text?: string;
  ts?: string;
  team?: string;
  [key: string]: unknown;
}

export interface SlackCommandRequest {
  command: string;
  text: string;
  user_id: string;
  user_name: string;
  team_id: string;
  channel_id: string;
  channel_name: string;
  response_url: string;
  trigger_id: string;
}

// ============================================================================
// Database Types
// ============================================================================

export interface SlackIntegration {
  id: string;
  property_id: string;
  workspace_name: string;
  workspace_id: string;
  bot_token_encrypted?: string;
  signing_secret_encrypted?: string;
  webhook_url_encrypted?: string;
  channel_mappings: Record<string, string>;
  bot_user_id?: string;
  app_id?: string;
  is_active: boolean;
  connection_status: 'pending' | 'connected' | 'error' | 'disabled';
  last_connected_at: string | null;
  last_error_message: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SlackUserMapping {
  id: string;
  user_id: string;
  slack_user_id: string;
  slack_team_id: string;
  slack_email?: string;
  slack_username?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlackInteraction {
  id: string;
  slack_user_id: string;
  slack_team_id: string;
  action_id: string;
  action_type: 'button' | 'select' | 'modal' | 'reaction';
  channel_id?: string;
  message_ts?: string;
  payload: Record<string, unknown>;
  phg_user_id?: string;
  processed: boolean;
  processed_at?: string;
  result?: Record<string, unknown>;
  created_at: string;
}

export interface SlackCommandLog {
  id: string;
  command: string;
  slack_user_id: string;
  slack_team_id: string;
  channel_id?: string;
  text?: string;
  response_type?: string;
  phg_user_id?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

// ============================================================================
// UI Types
// ============================================================================

export interface SlackIntegrationFormData {
  property_id: string;
  workspace_name: string;
  webhook_url?: string;
  bot_token?: string;
  signing_secret?: string;
  channel_mappings: Record<string, string>;
}

export interface SlackChannelMapping {
  channel_type: string;
  channel_name: string;
  channel_id?: string;
  description?: string;
}

export const DEFAULT_CHANNEL_MAPPINGS: SlackChannelMapping[] = [
  { channel_type: 'general', channel_name: '#general', description: 'General notifications' },
  { channel_type: 'training-hub', channel_name: '#training-hub', description: 'Training updates and reminders' },
  { channel_type: 'operations', channel_name: '#operations', description: 'Operations alerts and incidents' },
  { channel_type: 'escalations', channel_name: '#escalations', description: 'Escalated issues requiring attention' },
  { channel_type: 'maintenance', channel_name: '#maintenance', description: 'Maintenance requests and updates' },
  { channel_type: 'approvals', channel_name: '#approvals', description: 'Approval requests' },
];

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface SlackTestResponse {
  success: boolean;
  test?: boolean;
  message?: string;
  error?: string;
}

export interface SlackDigestResponse {
  success: boolean;
  digest_sent?: number;
  total_assignments?: number;
  error?: string;
}



// ============================================================================
// Command Types
// ============================================================================

export interface SlackCommandDefinition {
  command: string;
  description: string;
  usage?: string;
  access: 'all' | 'dept_head' | 'manager' | 'regional';
  examples?: string[];
}

export const SLACK_COMMANDS: SlackCommandDefinition[] = [
  {
    command: '/training',
    description: 'View your current training assignments',
    usage: '/training [@user]',
    access: 'all',
    examples: ['/training', '/training @john.doe'],
  },

  {
    command: '/ops',
    description: 'Operations dashboard quick links',
    usage: '/ops [alert message]',
    access: 'all',
    examples: ['/ops', '/ops alert Elevator out of service'],
  },
  {
    command: '/phg-help',
    description: 'Show available commands',
    access: 'all',
  },
  {
    command: '/whoami',
    description: 'Show your linked REMAL profile',
    access: 'all',
  },
];
