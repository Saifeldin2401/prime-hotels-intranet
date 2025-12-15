/**
 * Knowledge Questions Types
 * 
 * TypeScript types for the Interactive Knowledge Questions System.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type QuestionType = 'mcq' | 'mcq_multi' | 'true_false' | 'fill_blank' | 'scenario'

export type QuestionDifficulty = 'easy' | 'medium' | 'hard' | 'expert'

export type QuestionStatus = 'draft' | 'pending_review' | 'published' | 'archived'

export type QuestionUsageType =
    | 'sop_inline'
    | 'lesson'
    | 'quiz'
    | 'certification'
    | 'assessment'
    | 'daily_challenge'

// ============================================================================
// CORE TYPES
// ============================================================================

export interface KnowledgeQuestion {
    id: string
    question_text: string
    question_text_ar?: string
    question_type: QuestionType
    difficulty_level: QuestionDifficulty

    // Answers & Feedback
    correct_answer?: string
    explanation?: string
    explanation_ar?: string
    hint?: string
    hint_ar?: string

    // Links
    linked_sop_id?: string
    linked_sop_section?: string
    // category_id removed

    // Metadata
    tags: string[]
    estimated_time_seconds: number
    points: number

    // AI Generation
    ai_generated: boolean
    ai_model_used?: string
    ai_confidence_score?: number
    ai_prompt_used?: string

    // Status
    status: QuestionStatus
    version: number

    // Review
    reviewed_by?: string
    reviewed_at?: string
    review_notes?: string

    // Audit
    created_by?: string
    created_at: string
    updated_at: string

    // Joined data
    options?: QuestionOption[]
    linked_sop?: {
        id: string
        title: string
    }
    // category removed
    created_by_profile?: {
        id: string
        full_name: string
    }
    reviewed_by_profile?: {
        id: string
        full_name: string
    }
}

export interface QuestionOption {
    id: string
    question_id: string
    option_text: string
    option_text_ar?: string
    is_correct: boolean
    display_order: number
    feedback?: string
    feedback_ar?: string
    created_at: string
}

export interface QuestionUsage {
    id: string
    question_id: string
    usage_type: QuestionUsageType
    usage_entity_id: string
    display_order: number
    is_required: boolean
    weight: number
    created_at: string

    // Joined
    question?: KnowledgeQuestion
}

export interface QuestionAttempt {
    id: string
    user_id: string
    question_id: string
    session_id?: string

    selected_answer?: string
    selected_options?: string[]
    is_correct: boolean
    partial_score?: number

    context_type?: QuestionUsageType
    context_entity_id?: string

    time_spent_seconds?: number
    attempt_number: number
    hint_used: boolean

    created_at: string

    // Joined
    question?: KnowledgeQuestion
}

export interface QuestionVersion {
    id: string
    question_id: string
    version_number: number
    data_snapshot: Record<string, any>
    changed_by?: string
    changed_at: string
    change_reason?: string
}

export interface QuizSession {
    id: string
    user_id: string
    quiz_type: QuestionUsageType
    quiz_entity_id?: string

    started_at: string
    completed_at?: string

    total_questions: number
    correct_answers: number
    total_points: number
    earned_points: number
    score_percentage?: number
    passed?: boolean

    time_limit_seconds?: number
    passing_score?: number
}

// ============================================================================
// AI GENERATION TYPES
// ============================================================================

export interface GeneratedQuestionOption {
    text: string
    text_ar?: string
    is_correct: boolean
    feedback?: string
}

export interface GeneratedQuestion {
    question_text: string
    question_text_ar?: string
    question_type: QuestionType
    difficulty_level: QuestionDifficulty
    options?: GeneratedQuestionOption[]
    correct_answer?: string // For fill_blank and true_false
    explanation?: string
    hint?: string
    linked_section?: string
    tags?: string[]
    confidence_score?: number
}

export interface AIQuestionGenerationRequest {
    sop_content: string
    sop_id: string
    sop_title?: string
    count?: number
    types?: QuestionType[]
    difficulty?: QuestionDifficulty
    include_hints?: boolean
    include_explanations?: boolean
    language?: 'en' | 'ar' | 'both'
}

export interface AIQuestionGenerationResponse {
    questions: GeneratedQuestion[]
    model_used: string
    generation_time_ms: number
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface QuestionFormData {
    question_text: string
    question_text_ar?: string
    question_type: QuestionType
    difficulty_level: QuestionDifficulty
    correct_answer?: string
    explanation?: string
    explanation_ar?: string
    hint?: string
    hint_ar?: string
    linked_sop_id?: string
    linked_sop_section?: string
    // category_id removed
    tags: string[]
    estimated_time_seconds: number
    points: number
    options: Array<{
        option_text: string
        option_text_ar?: string
        is_correct: boolean
        feedback?: string
        feedback_ar?: string
    }>
}

export interface AnswerSubmission {
    question_id: string
    selected_answer?: string
    selected_options?: string[]
    time_spent_seconds?: number
    hint_used?: boolean
    context_type?: QuestionUsageType
    context_entity_id?: string
    session_id?: string
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface QuestionAnalytics {
    question_id: string
    total_attempts: number
    correct_attempts: number
    accuracy_rate: number
    avg_time_seconds: number
    hint_usage_rate: number
    difficulty_validation: 'too_easy' | 'accurate' | 'too_hard'
}

export interface UserQuestionStats {
    user_id: string
    total_attempts: number
    correct_answers: number
    accuracy_rate: number
    total_time_spent: number
    questions_by_difficulty: Record<QuestionDifficulty, number>
    recent_streak: number
}

export interface KnowledgeGapAnalysis {
    category_id: string
    category_name: string
    total_questions: number
    accuracy_rate: number
    improvement_trend: number
    recommended_questions: string[]
}

// ============================================================================
// UI CONFIG
// ============================================================================

export const QUESTION_TYPE_CONFIG: Record<QuestionType, {
    label: string
    icon: string
    color: string
    description: string
}> = {
    mcq: {
        label: 'Multiple Choice',
        icon: 'CircleDot',
        color: 'blue',
        description: 'Single correct answer from options'
    },
    mcq_multi: {
        label: 'Multiple Select',
        icon: 'CheckSquare',
        color: 'indigo',
        description: 'Multiple correct answers possible'
    },
    true_false: {
        label: 'True/False',
        icon: 'ToggleLeft',
        color: 'green',
        description: 'Binary true or false answer'
    },
    fill_blank: {
        label: 'Fill in Blank',
        icon: 'TextCursor',
        color: 'purple',
        description: 'Type the correct answer'
    },
    scenario: {
        label: 'Scenario',
        icon: 'GitBranch',
        color: 'orange',
        description: 'Multi-step interactive exercise'
    }
}

export const DIFFICULTY_CONFIG: Record<QuestionDifficulty, {
    label: string
    color: string
    points: number
}> = {
    easy: { label: 'Easy', color: 'green', points: 1 },
    medium: { label: 'Medium', color: 'yellow', points: 2 },
    hard: { label: 'Hard', color: 'orange', points: 3 },
    expert: { label: 'Expert', color: 'red', points: 5 }
}

export const STATUS_CONFIG: Record<QuestionStatus, {
    label: string
    color: string
    icon: string
}> = {
    draft: { label: 'Draft', color: 'gray', icon: 'FileEdit' },
    pending_review: { label: 'Pending Review', color: 'yellow', icon: 'Clock' },
    published: { label: 'Published', color: 'green', icon: 'CheckCircle' },
    archived: { label: 'Archived', color: 'red', icon: 'Archive' }
}
