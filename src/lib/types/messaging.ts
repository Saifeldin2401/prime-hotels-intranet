import type { Department, Profile, Property } from './profile'

// Messaging System Interfaces
export interface Message {
  id: string
  sender_id: string
  recipient_id: string | null // null for broadcast messages
  subject: string
  content: string
  message_type: 'direct' | 'broadcast' | 'system'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'archived'
  sent_at: string | null
  read_at: string | null
  parent_message_id: string | null // for replies
  property_id: string | null
  department_id: string | null
  conversation_id?: string | null
  created_at: string
  updated_at: string

  // Relations
  sender?: Profile
  recipient?: Profile
  property?: Property
  department?: Department
  parent_message?: Message
  replies?: Message[]
  attachments?: MessageAttachment[]
}

export interface MessageAttachment {
  id: string
  message_id: string
  uploaded_by_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  description: string | null
  created_at: string

  // Relations
  message?: Message
  uploaded_by?: Profile
}

export interface Comment {
  id: string
  entity_type: 'task' | 'maintenance_ticket' | 'document' | 'training'
  entity_id: string
  author_id: string
  content: string
  parent_comment_id: string | null // for replies
  is_internal: boolean // only visible to staff
  is_edited: boolean
  edited_at: string | null
  created_at: string
  updated_at: string

  // Relations
  author?: Profile
  parent_comment?: Comment
  replies?: Comment[]
  mentions?: Profile[]
}

export interface Conversation {
  id: string
  participant_ids: string[]
  last_message_at: string
  last_message_preview: string
  is_archived: boolean
  created_at: string
  updated_at: string

  // Relations
  participants?: Profile[]
  messages?: Message[]
}
