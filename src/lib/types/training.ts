import type { TrainingProgressStatus } from '../constants'

export interface TrainingModule {
  id: string
  title: string
  description: string | null
  estimated_duration_minutes: number | null
  created_by: string
  created_at: string
  updated_at: string
  category?: string | null
  status?: string
  difficulty_level: string | null
  estimated_duration?: string | null
  is_active?: boolean
  views_count?: number
  property_id: string | null
  updated_by?: string | null
  validity_period_days: number | null
  certificate_enabled: boolean
  passing_score_percentage: number | null
  allow_retake?: boolean | null
  max_attempts?: number | null
  auto_advance?: boolean | null
  show_feedback?: boolean | null
  randomize_questions?: boolean | null
  show_answers?: boolean | null
  time_limit_minutes?: number | null
  audience?: string | null
  content_language?: string | null
  template_id?: string | null
}

export interface TrainingContentBlock {
  id: string
  training_module_id: string
  type: 'text' | 'image' | 'video' | 'audio' | 'interactive' | 'document_link' | 'quiz' | 'sop_reference' | 'inline_quiz' | 'ai_generated'
  title: string | null
  content: string
  content_url: string | null
  content_data: Record<string, unknown> | null
  source_document_id?: string | null
  order: number
  is_mandatory: boolean
  created_at: string
}

/**
 * @deprecated Use LearningQuiz and KnowledgeQuestion system instead.
 * Legacy inline questions are no longer created via TrainingBuilder.
 * Existing data may still be read for backwards compatibility.
 */
export interface TrainingQuiz {
  id: string
  training_module_id: string
  question: string
  type: 'mcq' | 'true_false' | 'fill_blank'
  options: string[] | null
  correct_answer: string
  order: number
  created_at: string
}

export interface TrainingAssignment {
  id: string
  training_module_id: string
  assigned_to_user_id: string | null
  assigned_to_department_id: string | null
  assigned_to_property_id: string | null
  assigned_to_all: boolean
  deadline: string | null
  reminder_sent: boolean
  auto_enroll: boolean
  recurring_type: 'none' | 'monthly' | 'quarterly'
  created_by_role: string | null
  assigned_by: string
  created_at: string
}

export interface TrainingProgress {
  id: string
  user_id: string
  training_id: string
  assignment_id: string | null
  status: TrainingProgressStatus
  progress_percentage?: number | null
  score_percentage?: number | null
  started_at?: string | null
  completed_at: string | null
  quiz_score?: number | null
  certificate_url?: string | null
  created_at: string
  updated_at: string
}

export interface TrainingQuizAttempt {
  id: string
  user_id: string
  module_id: string
  score: number
  max_score: number
  passed: boolean
  attempt_number: number
  started_at: string
  completed_at: string | null
  answers: Record<string, unknown> | null
}

export interface TrainingCertificate {
  id: string
  training_progress_id: string | null
  certificate_url: string
  verification_code: string | null
  attempt_id: string | null
  issued_at: string
  expires_at: string | null
}

export interface TrainingPath {
  id: string
  title: string
  description: string
  path_type: 'new_hire' | 'department' | 'leadership' | 'compliance' | 'skills'
  estimated_duration_hours: number
  is_mandatory: boolean
  certificate_enabled: boolean
  target_role?: string | null
  target_department_id?: string | null
  target_property_id?: string | null
  target_user_ids?: string[]
  is_published: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface TrainingPathModule {
  id: string
  path_id: string
  module_id: string
  order_index: number
  is_mandatory: boolean
}

export interface UserPathEnrollment {
  id: string
  user_id: string
  path_id: string
  enrolled_at: string
  completed_at: string | null
}
