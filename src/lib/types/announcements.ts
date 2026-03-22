import type { AnnouncementPriority, AppRole } from '../constants'
import type { Profile } from './profile'

export interface Announcement {
  id: string
  title: string
  content: string
  priority: AnnouncementPriority
  pinned: boolean
  scheduled_at: string | null
  expires_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  target_audience: {
    type: 'all' | 'role' | 'department' | 'property' | 'individual'
    values: string[]
  } | null
  attachments: {
    id: string
    type: 'image' | 'video' | 'document'
    url: string
    name: string
    size?: number
  }[] | null
  created_by_profile?: Profile
}

export interface AnnouncementTarget {
  id: string
  announcement_id: string
  target_properties: string[] | null
  target_departments: string[] | null
  target_roles: AppRole[] | null
}

export interface AnnouncementRead {
  id: string
  announcement_id: string
  user_id: string
  read_at: string
}
