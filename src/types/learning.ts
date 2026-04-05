/**
 * Learning System Types
 * Exported interfaces for Quizzes, Assignments, and Microlearning.
 */

import type { KnowledgeQuestion, QuestionStatus } from './questions'

export type LearningTargetType = 'user' | 'department' | 'role' | 'property' | 'everyone'
export type LearningContentType = 'quiz' | 'sop' | 'video' | 'external_link' | 'module' | 'microlearning'
export type LearningAssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'excused'


export interface LearningQuiz {
    id: string
    title: string
    description?: string
    category_id?: string
    linked_sop_id?: string // For SOP -> Quiz integration

    // Settings
    time_limit_minutes?: number | null
    passing_score_percentage: number
    max_attempts?: number | null
    randomize_questions: boolean
    show_feedback_during: boolean

    // Status
    status: QuestionStatus

    // Audit
    created_by?: string
    created_at: string
    updated_at: string

    // Joined data
    questions?: LearningQuizQuestion[]
    question_count?: number
}

export interface MicrolearningContent {
    id: string
    title: string
    description?: string
    video_url: string
    duration_seconds?: number
    thumbnail_url?: string
    category?: string
    created_by?: string
    created_at: string
    updated_at: string
}

export interface LearningQuizQuestion {
    id: string
    quiz_id: string
    question_id: string
    display_order: number
    points_override?: number
    // Joined property
    question?: KnowledgeQuestion
}

export interface LearningAssignment {
    id: string

    // Target
    target_type: LearningTargetType
    target_id: string

    // Content
    content_type: LearningContentType
    content_id: string

    // Rules
    due_date?: string
    valid_from: string
    expires_at?: string

    // Meta
    priority: 'normal' | 'high' | 'compliance'
    assigned_by?: string
    created_at: string

    // Onboarding Links
    onboarding_process_id?: string
    onboarding_task_id?: string

    // Joined data
    content_title?: string
    content_metadata?: {
        description?: string
        duration?: number
        question_count?: number
    }
    progress?: LearningProgress
    microlearning?: MicrolearningContent // If content_type is microlearning
}

export interface LearningProgress {
    id: string
    assignment_id?: string
    user_id: string

    content_type: LearningContentType
    content_id: string
    training_module_id?: string

    status: LearningAssignmentStatus
    progress_percentage: number

    score_percentage?: number
    passed?: boolean
    completed_at?: string
    last_accessed_at: string
    last_session_id?: string
    last_block_index?: number | null
    last_block_id?: string | null
    time_spent_seconds?: number | null
    last_activity_at?: string | null
    metadata?: Record<string, unknown> // flexible for now to store answers/attempt details
    user?: {
        id: string
        full_name?: string | null
        job_title?: string | null
        first_name?: string | null
        last_name?: string | null
        department?: { name?: string | null } | Array<{ name?: string | null }> | null
    }
    quiz?: {
        title?: string | null
    }

    created_at: string
    updated_at: string
}

export interface LearningAssignmentExemption {
    id: string
    user_id: string
    content_type: LearningContentType
    content_id: string
    reason?: string | null
    created_by?: string | null
    created_at: string
    updated_at: string
}

export interface LearningAssignmentUserOverride {
    id: string
    user_id: string
    content_type: LearningContentType
    content_id: string
    due_date?: string | null
    priority?: 'normal' | 'high' | 'compliance' | null
    instructions?: string | null
    created_by?: string | null
    updated_by?: string | null
    created_at: string
    updated_at: string
}

export interface ModuleAssigneeSource {
    assignment_id: string
    target_type: LearningTargetType
    target_id?: string | null
    label: string
    meta?: string
    due_date?: string | null
    priority?: string | null
    valid_from?: string | null
    expires_at?: string | null
    instructions?: string | null
    created_at?: string | null
}

export interface ModuleAssigneeRosterEntry {
    user_id: string
    full_name: string
    email?: string | null
    avatar_url?: string | null
    department_name?: string | null
    property_name?: string | null
    status: LearningAssignmentStatus | 'not_started'
    progress_percentage: number
    score_percentage?: number | null
    passed?: boolean | null
    last_accessed_at?: string | null
    assignment_id?: string | null
    effective_due_date?: string | null
    effective_priority?: 'normal' | 'high' | 'compliance' | null
    effective_instructions?: string | null
    has_override: boolean
    override?: LearningAssignmentUserOverride | null
    sources: ModuleAssigneeSource[]
    exemption?: LearningAssignmentExemption | null
}

export interface ModuleAssignmentRoster {
    module_id: string
    active: ModuleAssigneeRosterEntry[]
    exempted: ModuleAssigneeRosterEntry[]
}

export interface CreateQuizDTO {
    title: string
    description?: string
    category_id?: string
    linked_sop_id?: string
    time_limit_minutes?: number
    passing_score_percentage?: number
    randomize_questions?: boolean
    show_feedback_during?: boolean
    status?: QuestionStatus
    created_by?: string
}

export interface CreateAssignmentDTO {
    target_type: LearningTargetType
    target_id: string
    content_type: LearningContentType
    content_id: string
    due_date?: string
    priority?: string
}

