export type ContentType = 'text' | 'image' | 'video' | 'document_link' | 'audio' | 'quiz' | 'interactive' | 'sop_reference' | 'assignment' | 'practical'
export type QuestionType = 'mcq' | 'true_false' | 'fill_blank'
export type BuilderStep = 'setup' | 'structure' | 'content' | 'rules' | 'preview' | 'publish'
export type RecentUpload = { url: string; name: string; type: 'image' | 'audio' | 'document' | 'video' }

export interface ContentBlockForm {
  id: string
  type: ContentType
  content: string
  content_url: string
  content_data: Record<string, unknown>
  is_mandatory: boolean
  title: string
  duration?: number
  points?: number
  order: number
}

export interface QuestionForm {
  question: string
  type: QuestionType
  options: string[]
  correct_answer: string
  points: number
  explanation?: string
}

export interface TrainingSection {
  id: string
  title: string
  description?: string
  items: ContentBlockForm[]
  order: number
}

export interface TrainingTemplate {
  id: string
  name: string
  description?: string | null
  category?: string | null
  template_structure?: unknown
}

export interface TemplateStructureItem {
  type?: ContentType | string
  title?: string
  content?: string
  content_url?: string
  content_data?: Record<string, unknown>
  is_mandatory?: boolean
  duration?: number
  duration_seconds?: number
  points?: number
}

export interface TemplateStructureSection {
  title?: string
  description?: string
  items?: TemplateStructureItem[]
  content?: TemplateStructureItem[]
  blocks?: TemplateStructureItem[]
}

export interface TemplateStructure {
  sections?: TemplateStructureSection[]
  blocks?: TemplateStructureItem[]
}

export interface BuilderDraftPayload {
  title?: string
  description?: string
  category?: string
  difficultyLevel?: string
  estimatedDuration?: string | number
  useEstimatedDuration?: boolean
  validityPeriod?: string | number
  passingScore?: string | number
  certificateEnabled?: boolean
  audience?: string
  contentLanguage?: string
  templatePreset?: string
  sections?: TrainingSection[]
  activeSection?: string | null
}

export interface TrainingContentBlockInsert {
  training_module_id: string
  type: ContentType
  title?: string | null
  content: string
  content_url: string | null
  content_data: Record<string, unknown>
  source_document_id?: string | null
  order: number
  is_mandatory: boolean
  duration_seconds: number | null
  points?: number
}
