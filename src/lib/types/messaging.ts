import type { Department, Profile } from './profile'

// Messaging System Interfaces
interface Message {
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
  department_id: string | null
  conversation_id?: string | null
  created_at: string
  updated_at: string

  // Relations
  sender?: Profile
  recipient?: Profile
  department?: Department
  parent_message?: Message
  replies?: Message[]
  attachments?: MessageAttachment[]
}

interface MessageAttachment {
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
