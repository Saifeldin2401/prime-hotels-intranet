/**
 * Knowledge Base Types
 * 
 * Type definitions for the Knowledge Base system.
 */

import type { AppRole } from '@/lib/constants'

// ============================================================================
// ENUMS
// ============================================================================

export type KnowledgeContentType =
    | 'sop'
    | 'policy'
    | 'guide'
    | 'checklist'
    | 'reference'
    | 'faq'
    | 'video'
    | 'visual'
    | 'document'

export type KnowledgeVisibility =
    | 'all_properties'
    | 'property'
    | 'department'
    | 'role'

export type KnowledgeStatus =
    | 'draft'
    | 'under_review'
    | 'approved'
    | 'obsolete'

// ============================================================================
// CORE TYPES
// ============================================================================

export interface KnowledgeArticle {
    id: string
    code: string
    title: string
    title_ar?: string
    description?: string
    description_ar?: string
    summary?: string             // TL;DR summary for quick reading
    summary_ar?: string          // Arabic TL;DR summary
    content?: string
    content_type: KnowledgeContentType
    status: KnowledgeStatus
    version: number
    visibility_scope: KnowledgeVisibility

    // Relations
    property_id?: string
    department_id?: string
    category_id?: string

    // Content Type Specific
    video_url?: string                    // For video content
    checklist_items?: ChecklistItem[]     // For checklist content
    faq_items?: FAQItem[]                 // For FAQ content
    images?: { id: string; url: string; caption: string; order: number }[]  // For visual content
    linked_quiz_id?: string               // Linked assessment
    linked_training_id?: string           // Linked training module
    file_url?: string                     // Attached file

    // Metadata
    featured: boolean
    requires_acknowledgment: boolean
    view_count: number
    estimated_read_time?: number

    // Timestamps
    created_at: string
    updated_at: string
    published_at?: string
    next_review_date?: string

    // Author info (joined)
    author?: {
        id: string
        full_name: string
        avatar_url?: string
    }

    // Related data (joined)
    department?: {
        id: string
        name: string
    }
    category?: {
        id: string
        name: string
        name_ar?: string
    }
    tags?: KnowledgeTag[]
    related_articles?: RelatedArticle[]
}

// Checklist item for interactive checklists
export interface ChecklistItem {
    id: string
    text: string
    text_ar?: string
    is_required: boolean
    order: number
}

// FAQ item for Q&A content
export interface FAQItem {
    id: string
    question: string
    question_ar?: string
    answer: string
    answer_ar?: string
    order: number
}

// Related article reference
export interface RelatedArticle {
    id: string
    title: string
    content_type: KnowledgeContentType
    relation_type: 'see_also' | 'prerequisite' | 'supersedes' | 'updated_by'
}

export interface KnowledgeTag {
    id: string
    name: string
    name_ar?: string
    color: string
}

export interface KnowledgeCategory {
    id: string
    name: string
    name_ar?: string
    description?: string
    description_ar?: string
    department_id?: string
    parent_id?: string
    children?: KnowledgeCategory[]
    article_count?: number
}

export interface KnowledgeComment {
    id: string
    document_id: string
    parent_id?: string
    user_id: string
    content: string
    is_question: boolean
    is_resolved: boolean
    is_pinned: boolean
    upvotes: number
    created_at: string
    updated_at: string

    // Joined
    user?: {
        id: string
        full_name: string
        avatar_url?: string
        job_title?: string
    }
    replies?: KnowledgeComment[]
    user_vote?: 'up' | 'down' | null
}

export interface KnowledgeAcknowledgment {
    id: string
    document_id: string
    version_id: string
    user_id: string
    acknowledged_at: string
}

export interface KnowledgeBookmark {
    user_id: string
    document_id: string
    created_at: string
    article?: KnowledgeArticle
}

export interface KnowledgeContextTrigger {
    id: string
    document_id: string
    trigger_type: 'task' | 'checklist' | 'training' | 'page' | 'maintenance' | 'onboarding'
    trigger_value: string
    priority: number
    show_as: 'link' | 'tooltip' | 'modal' | 'inline'
}

export interface KnowledgeRoleAssignment {
    id: string
    document_id: string
    role: AppRole
    property_id?: string
    department_id?: string
    is_required: boolean
    due_days_after_assignment?: number
}

export interface KnowledgeFeedback {
    id: string
    document_id: string
    user_id: string
    helpful: boolean
    feedback_text?: string
    created_at: string
}

// ============================================================================
// API TYPES
// ============================================================================

export interface KnowledgeSearchFilters {
    query?: string
    content_type?: KnowledgeContentType
    status?: KnowledgeStatus
    department_id?: string
    category_id?: string
    property_id?: string
    visibility_scope?: KnowledgeVisibility
    featured?: boolean
    requires_acknowledgment?: boolean
    tags?: string[]
}

export interface KnowledgeSearchResult {
    articles: KnowledgeArticle[]
    total: number
    page: number
    page_size: number
}

export interface RequiredReading {
    document_id: string
    title: string
    content_type: KnowledgeContentType
    is_acknowledged: boolean
    due_date?: string
}

export interface ContextualHelp {
    document_id: string
    title: string
    description?: string
    content_type: KnowledgeContentType
    show_as: 'link' | 'tooltip' | 'modal' | 'inline'
}

// ============================================================================
// UI TYPES
// ============================================================================

export interface ContentTypeConfig {
    type: KnowledgeContentType
    label: string
    icon: string
    color: string
    description: string
}

export const CONTENT_TYPE_CONFIG: ContentTypeConfig[] = [
    { type: 'sop', label: 'SOP', icon: 'ClipboardList', color: 'blue', description: 'Standard Operating Procedure' },
    { type: 'policy', label: 'Policy', icon: 'FileText', color: 'purple', description: 'Policy document' },
    { type: 'guide', label: 'Guide', icon: 'BookOpen', color: 'green', description: 'How-to guide' },
    { type: 'checklist', label: 'Checklist', icon: 'CheckSquare', color: 'orange', description: 'Interactive checklist' },
    { type: 'reference', label: 'Reference', icon: 'FileSearch', color: 'gray', description: 'Quick reference' },
    { type: 'faq', label: 'FAQ', icon: 'HelpCircle', color: 'yellow', description: 'Frequently asked questions' },
    { type: 'video', label: 'Video', icon: 'Video', color: 'red', description: 'Video tutorial' },
    { type: 'visual', label: 'Visual', icon: 'Image', color: 'pink', description: 'Diagram/infographic' },
    { type: 'document', label: 'Document', icon: 'File', color: 'gray', description: 'General document' }
]

export const STATUS_CONFIG = {
    draft: { label: 'Draft', color: 'gray' },
    under_review: { label: 'Under Review', color: 'yellow' },
    approved: { label: 'Published', color: 'green' },
    obsolete: { label: 'Archived', color: 'red' }
} as const

export const VISIBILITY_CONFIG = {
    global: { label: 'All Properties', icon: 'Globe' },
    property: { label: 'Specific Property', icon: 'Building' },
    department: { label: 'Department Only', icon: 'Users' },
    role: { label: 'Role Specific', icon: 'Shield' },
    property_department: { label: 'Property + Department', icon: 'Layers' },
    custom: { label: 'Custom Rules', icon: 'Settings' }
} as const
