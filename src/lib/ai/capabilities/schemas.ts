/**
 * AI Capability Layer — output schemas
 * ---------------------------------------------------------------------------
 * Reuses the shared course/quiz schemas from ../schemas where they already
 * exist, and adds the three NEW capability outputs (knowledgeQA, recommendations,
 * gapAnalysis).
 */

import { z } from 'zod'

// Re-export the existing shared schemas so callers have a single import surface.
export {
  ModuleOutlineSchema,
  ModuleOutlineSectionSchema,
  AIQuizQuestionSchema,
  AIQuizGenerationSchema,
} from '../schemas'

// ---------------------------------------------------------------------------
// knowledgeQA
// ---------------------------------------------------------------------------
export const KnowledgeQACitationSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  passage: z.string(),
  /** Model/heuristic confidence that this citation supports the answer (0..1). */
  confidence: z.number().min(0).max(1),
})

export const KnowledgeQAResultSchema = z.object({
  answer: z.string(),
  citations: z.array(KnowledgeQACitationSchema),
  /** 0..1 — share of the answer that is supported by cited passages. */
  groundedness: z.number().min(0).max(1),
  /** True when retrieval returned nothing and the answer is the explicit
   *  "not in the knowledge base" response. */
  outOfScope: z.boolean().default(false),
})

export type KnowledgeQACitation = z.infer<typeof KnowledgeQACitationSchema>
export type KnowledgeQAResult = z.infer<typeof KnowledgeQAResultSchema>

// ---------------------------------------------------------------------------
// recommendations
// ---------------------------------------------------------------------------
export const CourseRecommendationSchema = z.object({
  courseId: z.string(),
  /** Higher = stronger recommendation. */
  score: z.number(),
  rationale: z.string(),
  /** Which signals fired for this recommendation. */
  signals: z.array(
    z.enum(['role_match', 'skill_gap', 'path_membership', 'popularity', 'manual_boost']),
  ),
})

export const RecommendationsResultSchema = z.object({
  userId: z.string(),
  recommendations: z.array(CourseRecommendationSchema),
  generatedAt: z.string(),
})

export type CourseRecommendation = z.infer<typeof CourseRecommendationSchema>
export type RecommendationsResult = z.infer<typeof RecommendationsResultSchema>

// ---------------------------------------------------------------------------
// gapAnalysis
// ---------------------------------------------------------------------------
export const FailingObjectiveSchema = z.object({
  objective: z.string(),
  attemptCount: z.number(),
  failureRate: z.number().min(0).max(1),
  exampleQuestionIds: z.array(z.string()),
})

export const MisleadingQuestionSchema = z.object({
  questionId: z.string(),
  questionText: z.string(),
  /** e.g. high-performers miss it, or all distractors chosen evenly. */
  reason: z.string(),
  discriminationIndex: z.number().nullable(),
})

export const GapAnalysisResultSchema = z.object({
  quizId: z.string(),
  summary: z.string(),
  failingObjectives: z.array(FailingObjectiveSchema),
  misleadingQuestions: z.array(MisleadingQuestionSchema),
  recommendedActions: z.array(z.string()),
})

export type GapAnalysisResult = z.infer<typeof GapAnalysisResultSchema>

// ---------------------------------------------------------------------------
// ingestion (chunk/embed helpers)
// ---------------------------------------------------------------------------
export const KnowledgeChunkSchema = z.object({
  section: z.string().nullable(),
  content: z.string(),
  tokenCount: z.number(),
  /** Populated once the embedding job runs; null on first insert. */
  embedding: z.array(z.number()).nullable(),
})

export type KnowledgeChunk = z.infer<typeof KnowledgeChunkSchema>
