import type { AppRole } from '../constants'
import type { Profile, Property, Department } from './profile'

// SOP System Interfaces
export type SOPStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'archived'
export type QuizQuestionType = 'mcq' | 'true_false' | 'fill_blank'

export interface SOPDocument {
  id: string
  title: string
  content: string | null
  version: number
  status: SOPStatus
  category: string | null
  property_id: string | null
  department_id: string | null
  created_by: string | null
  approved_by: string | null
  published_at: string | null
  requires_quiz: boolean
  passing_score: number
  quiz_enabled: boolean
  created_at: string
  updated_at: string

  // Relations
  property?: Property
  department?: Department
  created_by_profile?: Profile
  approved_by_profile?: Profile
  quiz_questions?: SOPQuizQuestion[]
}

export interface SOPQuizQuestion {
  id: string
  sop_document_id: string
  question_text: string
  question_type: QuizQuestionType
  options: string[] | null
  correct_answer: string
  points: number
  order_index: number
  created_at: string
  updated_at: string
}

export interface SOPQuizAttempt {
  id: string
  sop_document_id: string
  user_id: string
  score: number
  total_points: number
  percentage: number
  passed: boolean
  answers: Array<{
    question_id: string
    answer: string
    correct: boolean
  }>
  started_at: string
  completed_at: string | null
  certificate_url: string | null
  created_at: string

  // Relations
  sop_document?: SOPDocument
  user?: Profile
}

export interface SOPAssignment {
  id: string
  sop_document_id: string
  assigned_to_user_id: string
  assigned_by: string | null
  due_date: string | null
  completed: boolean
  completed_at: string | null
  created_at: string

  // Relations
  sop_document?: SOPDocument
  assigned_to?: Profile
  assigned_by_profile?: Profile
}

export interface SOPReadingLog {
  id: string
  sop_document_id: string
  user_id: string
  read_at: string
  completed: boolean

  // Relations
  sop_document?: SOPDocument
  user?: Profile
}
