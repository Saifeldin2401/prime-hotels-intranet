/**
 * Multi-Agent Knowledge Base & SOP Engine - Types
 * 
 * Capability-based architecture for Standard Operating Procedures (SOPs),
 * Corporate Policies, Operational Checklists, Guides, and FAQs.
 */

import type { KnowledgeContentType, KnowledgeVisibility } from '@/types/knowledge'
import type { ModelProvider, ModelCostTier } from '../types'

export interface KnowledgeArticleGenerationConfig {
  title: string
  contentType: KnowledgeContentType
  department?: string
  propertyId?: string
  targetAudience?: string
  visibilityScope?: KnowledgeVisibility
  sourceDocumentText?: string
  keyRequirements?: string[]
  languagePreference?: 'en' | 'ar' | 'bilingual'
  preferredModel?: string
  includeChecklist?: boolean
  includeFaq?: boolean
}

export interface GeneratedChecklistItem {
  id: string
  text: string
  text_ar: string
  category?: string
  required: boolean
}

export interface GeneratedFAQItem {
  id: string
  question: string
  question_ar: string
  answer: string
  answer_ar: string
}

export interface GeneratedKnowledgeArticle {
  title: string
  title_ar: string
  description: string
  description_ar: string
  summary: string
  summary_ar: string
  content_html: string
  content_html_ar: string
  content_type: KnowledgeContentType
  sop_code?: string
  estimated_read_time_minutes: number
  suggested_tags: string[]
  checklist_items?: GeneratedChecklistItem[]
  faq_items?: GeneratedFAQItem[]
  compliance_score: number
  compliance_notes: string[]
  model_used: string
  provider_used: ModelProvider
  cost_tier: ModelCostTier
  total_duration_ms: number
}

export interface KnowledgePipelineProgressEvent {
  pipelineRunId: string
  phase: 'discovery' | 'synthesis' | 'translation' | 'qa_compliance' | 'completed'
  agentName: string
  agentNameAr: string
  progressPercentage: number
  detail: string
  detailAr: string
  timestamp: string
}

export type KnowledgePipelineEventListener = (event: KnowledgePipelineProgressEvent) => void
