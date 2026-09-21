import type { Department, Profile, Property } from './profile'

// SOP System Interfaces
type SOPStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'archived'
type QuizQuestionType = 'mcq' | 'true_false' | 'fill_blank'

interface SOPDocument {
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

interface SOPQuizQuestion {
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
