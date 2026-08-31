/**
 * learningAnalyticsService
 *
 * Read-only reporting layer for the four learning-analytics lenses
 * (Learner / Course / Knowledge / Assessment). Every function here maps 1:1 to a
 * SECURITY DEFINER RPC created in
 * supabase/migrations/20260901100000_learning_analytics_lenses.sql and returns
 * only real, database-computed rows -- there are no fabricated or placeholder
 * numbers anywhere in this file.
 *
 * NOTE: the unrelated `src/services/analyticsService.ts` is a client-side event
 * *tracking* buffer (page views / session events), not a reporting service, and
 * is deliberately left untouched.
 */

import { supabase } from '@/lib/supabase'

interface RpcResult<T> {
    data: T | null
    error: { message: string } | null
}

/**
 * The Supabase client is generated-typed and does not know about RPCs added in a
 * migration that has not been applied to the type snapshot yet. This cast keeps
 * that single unavoidable gap contained to this module.
 */
function callRpc<T>(fn: string, args?: Record<string, unknown>): Promise<RpcResult<T>> {
    const rpc = supabase.rpc as unknown as (
        name: string,
        params?: Record<string, unknown>,
    ) => Promise<RpcResult<T>>
    return rpc(fn, args)
}

async function rows<T>(fn: string, args?: Record<string, unknown>): Promise<T[]> {
    const { data, error } = await callRpc<T[]>(fn, args)
    if (error) throw new Error(error.message)
    return data ?? []
}

// ---------------------------------------------------------------------------
// 1. Learner analytics
// ---------------------------------------------------------------------------
export interface LearnerAnalyticsRow {
    user_id: string
    full_name: string | null
    job_title: string | null
    enrolled_count: number
    completed_count: number
    in_progress_count: number
    not_started_count: number
    avg_progress: number
    total_time_seconds: number
    quiz_sessions: number
    avg_quiz_score: number | null
    pass_rate: number | null
    last_activity_at: string | null
}

export interface LearnerTopicRow {
    training_module_id: string | null
    module_title: string
    attempts: number
    correct: number
    accuracy: number | null
}

export const getLearnerAnalytics = (userId?: string) =>
    rows<LearnerAnalyticsRow>('get_learner_analytics', { p_user_id: userId ?? null })

export const getLearnerTopicBreakdown = (userId: string) =>
    rows<LearnerTopicRow>('get_learner_topic_breakdown', { p_user_id: userId })

// ---------------------------------------------------------------------------
// 2. Course analytics
// ---------------------------------------------------------------------------
export interface CourseAnalyticsRow {
    module_id: string
    title: string
    status: string | null
    category: string | null
    enrolled_count: number
    completed_count: number
    in_progress_count: number
    completion_rate: number
    avg_progress: number
    avg_time_seconds: number | null
    avg_score: number | null
    quiz_pass_rate: number | null
    last_activity_at: string | null
}

export interface CourseFunnelRow {
    block_id: string
    block_title: string | null
    block_type: string | null
    block_order: number
    completed_count: number
    completion_rate: number | null
}

export const getCourseAnalytics = () =>
    rows<CourseAnalyticsRow>('get_course_analytics')

export const getCourseFunnel = (moduleId: string) =>
    rows<CourseFunnelRow>('get_training_module_funnel', { p_module_id: moduleId })

// ---------------------------------------------------------------------------
// 3. Knowledge analytics
// ---------------------------------------------------------------------------
export interface KnowledgeDocumentRow {
    document_id: string
    title: string
    content_type: string | null
    lifetime_views: number
    recent_views: number
    distinct_recent_viewers: number
    last_viewed_at: string | null
}

export interface SearchTermRow {
    term: string
    searches: number
    distinct_users: number
    avg_result_count: number
    zero_result_searches: number
    last_searched_at: string | null
}

export interface ZeroResultSearchRow {
    term: string
    searches: number
    distinct_users: number
    last_searched_at: string | null
}

export const getTopDocuments = (days = 30, limit = 25) =>
    rows<KnowledgeDocumentRow>('get_knowledge_analytics_top_documents', {
        p_days: days,
        p_limit: limit,
    })

export const getSearchTerms = (days = 30, limit = 50) =>
    rows<SearchTermRow>('get_knowledge_analytics_search_terms', {
        p_days: days,
        p_limit: limit,
    })

export const getZeroResultSearches = (days = 90, limit = 50) =>
    rows<ZeroResultSearchRow>('get_knowledge_analytics_zero_result_searches', {
        p_days: days,
        p_limit: limit,
    })

// ---------------------------------------------------------------------------
// 4. Assessment analytics
// ---------------------------------------------------------------------------
export interface AssessmentQuestionRow {
    question_id: string
    question_text: string
    question_type: string | null
    difficulty: string | null
    training_module_id: string | null
    module_title: string | null
    attempts: number
    distinct_learners: number
    pct_correct: number | null
    discrimination: number | null
    avg_time_seconds: number | null
    hint_used_rate: number | null
}

export interface WrongAnswerRow {
    answer_value: string
    answer_label: string
    is_correct: boolean
    times_chosen: number
    pct_of_attempts: number | null
}

export interface PassRateRow {
    quiz_type: string
    quiz_entity_id: string | null
    quiz_title: string
    completed_sessions: number
    distinct_learners: number
    passed: number
    failed: number
    pass_rate: number | null
    avg_score: number | null
}

export const getAssessmentQuestions = (moduleId?: string, minAttempts = 1) =>
    rows<AssessmentQuestionRow>('get_assessment_analytics_questions', {
        p_module_id: moduleId ?? null,
        p_min_attempts: minAttempts,
    })

export const getWrongAnswers = (questionId: string) =>
    rows<WrongAnswerRow>('get_assessment_analytics_wrong_answers', {
        p_question_id: questionId,
    })

export const getPassRates = (days = 90) =>
    rows<PassRateRow>('get_assessment_analytics_pass_rates', { p_days: days })
