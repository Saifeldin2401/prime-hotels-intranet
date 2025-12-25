/**
 * Learning System Types
 * Exported interfaces for Quizzes, Assignments, and Microlearning.
 */

import type { QuestionStatus, KnowledgeQuestion } from './questions'

export type LearningTargetType = 'user' | 'department' | 'role' | 'property' | 'everyone'
export type LearningContentType = 'quiz' | 'sop' | 'video' | 'external_link' | 'module'
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

    status: LearningAssignmentStatus
    progress_percentage: number

    score_percentage?: number
    passed?: boolean
    completed_at?: string
    last_accessed_at: string
    last_session_id?: string
    metadata?: any // flexible for now to store answers/attempt details

    created_at: string
    updated_at: string
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

