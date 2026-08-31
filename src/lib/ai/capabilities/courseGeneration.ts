/**
 * Capability: courseGeneration
 * ---------------------------------------------------------------------------
 * THIN WRAPPER ONLY. The multi-agent course pipeline is owned elsewhere
 * (src/lib/ai/agents/orchestrator.ts, src/services/aiCourseEngineService.ts).
 * This module exists so course generation is addressable through the same
 * capability registry as everything else — it must not add logic.
 *
 * Grounding policy: grounded-generative. The orchestrator's Research + Knowledge
 * (RAG) agents inject retrieved KB context; the content agents may also use
 * general instructional knowledge. Source documents are attached to the
 * generated course (course_source_documents).
 */

import {
  aiCourseOrchestrator,
  type OrchestratorOptions,
} from '@/lib/ai/agents/orchestrator'
import type { FullCourseGenerationConfig } from '@/types/aiCourseEngine'
import type { GroundingPolicy } from './types'

export const courseGenerationGroundingPolicy: GroundingPolicy = {
  mode: 'grounded-generative',
  retrievalSource: 'documents_fts',
  rlsEnforcedBy:
    'Knowledge Agent retrieval runs under the caller session (searchHotelKnowledge / search_knowledge_articles RPC).',
  fallbackBehaviour:
    'If no KB context is retrieved the pipeline still generates from the prompt + research agent, flagged lower-confidence by QA.',
  notes: 'Owned by the course-gen concern. Do not fork pipeline behaviour here.',
}

export type { OrchestratorOptions, FullCourseGenerationConfig }

/** Re-export of the orchestrator entrypoint. No behaviour added. */
export function generateCourse(
  config: FullCourseGenerationConfig,
  options?: OrchestratorOptions,
) {
  return aiCourseOrchestrator.orchestrate(config, options)
}

export { aiCourseOrchestrator }
