// Announcements System
import type { Profile } from './types'

export type AnnouncementPriority = 'normal' | 'important' | 'critical'

export interface Announcement {
    id: string
    title: string
    content: string
    priority: AnnouncementPriority
    pinned: boolean
    scheduled_at: string | null
    expires_at: string | null
    created_by: string | null
    created_at: string
    updated_at: string

    // Relations
    created_by_profile?: Profile
    targets?: AnnouncementTarget
    attachments?: AnnouncementAttachment[]
    read_status?: AnnouncementRead
}

export interface AnnouncementTarget {
    id: string
    announcement_id: string
    target_properties: string[] | null
    target_departments: string[] | null
    target_roles: string[] | null // Changed from AppRole[] to string[]
}

export interface AnnouncementAttachment {
    id: string
    announcement_id: string
    file_url: string
    file_name: string | null
    file_type: string | null
    created_at: string
}

export interface AnnouncementRead {
    id: string
    announcement_id: string
    user_id: string
    read_at: string
}
