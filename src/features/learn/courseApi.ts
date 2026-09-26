import { supabase } from '@/lib/supabase'

export interface CourseSummary {
  id: string
  title: string
  description: string | null
  estimated_duration_minutes: number | null
  difficulty_level: string | null
  certificate_enabled: boolean | null
  validity_period_days: number | null
  passing_score_percentage: number | null
  max_attempts: number | null
  target_audience: string | null
  status: string
  updated_at: string | null
  /** From the course blueprint, when the course was designed with one. */
  objectives: string[]
  prerequisites: string[]
}

export interface CourseLesson {
  id: string
  title: string
  block_type: string
  block_order: number
  duration_seconds: number | null
  is_mandatory: boolean | null
}

export interface CourseProgress {
  status: string
  progress_percentage: number | null
  completed_at: string | null
  score_percentage: number | null
  /** Lesson index the learner was last on, for Resume. */
  last_block_index: number | null
  completed_blocks: string[]
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0) : []

export async function fetchCourse(courseId: string): Promise<CourseSummary | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, description, estimated_duration_minutes, difficulty_level, certificate_enabled, validity_period_days, passing_score_percentage, max_attempts, target_audience, status, updated_at, blueprint')
    .eq('id', courseId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const blueprint = (data.blueprint ?? {}) as Record<string, unknown>
  const blueprintAudience = typeof blueprint.targetAudience === 'string' ? blueprint.targetAudience : null
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    estimated_duration_minutes: data.estimated_duration_minutes,
    difficulty_level: data.difficulty_level,
    certificate_enabled: data.certificate_enabled,
    validity_period_days: data.validity_period_days,
    passing_score_percentage: data.passing_score_percentage,
    max_attempts: data.max_attempts,
    target_audience: data.target_audience ?? blueprintAudience,
    status: data.status,
    updated_at: data.updated_at,
    objectives: strings(blueprint.terminalObjectives),
    prerequisites: strings(blueprint.prerequisites),
  }
}

export async function fetchCourseLessons(courseId: string): Promise<CourseLesson[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title, block_type, block_order, duration_seconds, is_mandatory')
    .eq('training_module_id', courseId)
    .order('block_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as CourseLesson[]
}

export async function fetchMyCourseProgress(courseId: string, userId: string): Promise<CourseProgress | null> {
  const { data, error } = await supabase
    .from('training_progress')
    .select('status, progress_percentage, completed_at, score_percentage, last_block_index, metadata')
    .eq('training_id', courseId)
    .eq('user_id', userId)
    .eq('lp_content_type', 'module')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const metadata = (data.metadata ?? {}) as { completed_blocks?: unknown }
  return {
    status: String(data.status),
    progress_percentage: data.progress_percentage,
    completed_at: data.completed_at,
    score_percentage: data.score_percentage,
    last_block_index: data.last_block_index,
    completed_blocks: strings(metadata.completed_blocks),
  }
}
