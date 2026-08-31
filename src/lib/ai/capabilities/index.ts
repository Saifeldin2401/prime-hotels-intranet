/**
 * AI Capability Layer — public index
 * ===========================================================================
 * The platform's AI surface is exactly SIX named capabilities. Every feature
 * that touches the model gateway goes through one of these so grounding, schema
 * validation and guardrails live in one place.
 *
 *   ingestion            parse / classify / tag / chunk / embed KB documents
 *   courseGeneration     multi-agent course pipeline (thin re-export)
 *   assessmentAuthoring  psychometric quiz authoring (thin wrapper)
 *   knowledgeQA          retrieval-augmented Q&A over knowledge_chunks   [NEW]
 *   recommendations      rule + signal course recommendation            [NEW, stub]
 *   gapAnalysis          failing objectives / misleading questions       [NEW, stub]
 *
 * See docs/ai-architecture.md.
 */

import type { CapabilityId, CapabilityMeta } from './types'

import { ingestDocument, ingestionGroundingPolicy } from './ingestion'
import { generateCourse, courseGenerationGroundingPolicy } from './courseGeneration'
import { authorAssessment, assessmentAuthoringGroundingPolicy } from './assessmentAuthoring'
import { askKnowledgeBase, knowledgeQAGroundingPolicy } from './knowledgeQA'
import { recommendCourses, recommendationsGroundingPolicy } from './recommendations'
import { analyzeAssessmentGaps, gapAnalysisGroundingPolicy } from './gapAnalysis'

export * from './types'
export * from './schemas'

export {
  ingestDocument,
  chunkDocument,
  embedChunks,
  persistChunks,
  classifyAndTagDocument,
  ingestionGroundingPolicy,
} from './ingestion'
export {
  generateCourse,
  aiCourseOrchestrator,
  courseGenerationGroundingPolicy,
} from './courseGeneration'
export {
  authorAssessment,
  assessmentAuthoringGroundingPolicy,
  type AssessmentAuthoringInput,
  type AssessmentAuthoringResult,
} from './assessmentAuthoring'
export {
  askKnowledgeBase,
  knowledgeQAGroundingPolicy,
  type KnowledgeQAInput,
} from './knowledgeQA'
export {
  recommendCourses,
  recommendationsGroundingPolicy,
  type RecommendationsInput,
  type CandidateSignal,
} from './recommendations'
export {
  analyzeAssessmentGaps,
  gapAnalysisGroundingPolicy,
  type GapAnalysisInput,
  type AttemptAggregate,
} from './gapAnalysis'

/**
 * Registry — metadata + grounding policy for each capability. Useful for an
 * admin surface and for asserting the contract in tests.
 */
export const AI_CAPABILITIES: Record<CapabilityId, CapabilityMeta> = {
  ingestion: {
    id: 'ingestion',
    title: 'Document Ingestion',
    description: 'Parse, classify, tag, chunk and embed knowledge documents for retrieval.',
    status: 'beta',
    grounding: ingestionGroundingPolicy,
  },
  courseGeneration: {
    id: 'courseGeneration',
    title: 'Course Generation',
    description: 'Multi-agent generation of a full training course from a topic or source document.',
    status: 'stable',
    grounding: courseGenerationGroundingPolicy,
  },
  assessmentAuthoring: {
    id: 'assessmentAuthoring',
    title: 'Assessment Authoring',
    description: 'Psychometric quiz question generation from a lesson or SOP passage.',
    status: 'stable',
    grounding: assessmentAuthoringGroundingPolicy,
  },
  knowledgeQA: {
    id: 'knowledgeQA',
    title: 'Knowledge Base Q&A',
    description: 'Retrieval-augmented answers with citations, strictly grounded in the knowledge base.',
    status: 'beta',
    grounding: knowledgeQAGroundingPolicy,
  },
  recommendations: {
    id: 'recommendations',
    title: 'Course Recommendations',
    description: 'Rule + signal based ranking of courses for a learner (role, skill gaps, path).',
    status: 'stub',
    grounding: recommendationsGroundingPolicy,
  },
  gapAnalysis: {
    id: 'gapAnalysis',
    title: 'Assessment Gap Analysis',
    description: 'Summarise failing objectives and misleading questions from attempt data.',
    status: 'stub',
    grounding: gapAnalysisGroundingPolicy,
  },
}

/** Thin dispatch table — same names, one call surface. */
export const aiCapabilities = {
  ingestion: ingestDocument,
  courseGeneration: generateCourse,
  assessmentAuthoring: authorAssessment,
  knowledgeQA: askKnowledgeBase,
  recommendations: recommendCourses,
  gapAnalysis: analyzeAssessmentGaps,
} as const
