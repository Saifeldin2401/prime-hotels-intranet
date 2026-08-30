/**
 * Multi-Agent AI Course & Simulation Engine - Core Types
 * 
 * Dynamic Capability-Based Architecture for Enterprise Hospitality Training
 */

import type { CourseDifficulty, CourseType, InstructionalStrategy, LessonTemplateType } from '@/types/aiCourseEngine'
import type { QuestionDifficulty, QuestionType } from '@/types/questions'

// ============================================================================
// AGENT ROLES & PIPELINE PHASES
// ============================================================================

export type AgentRole =
  | 'research'          // Researches hospitality standards, SOPs, and topic benchmarks
  | 'curriculum'        // Synthesizes instructional design, module progression, and pacing
  | 'knowledge'         // RAG agent that searches and retrieves grounding context from hotel knowledge base
  | 'content_writer'    // Generates semantic lesson markdown/HTML, procedures, and scripts
  | 'activities'        // Generates interactive workplace drills, role cards, and checklists
  | 'scenarios'         // Generates realistic guest dilemmas, escalations, and roleplay simulations
  | 'assessments'       // Generates rigorous psychometric quizzes across 16+ question types
  | 'image_ai'          // Synthesizes educational diagrams, vector SVGs, or photographic visuals
  | 'video_ai'          // Placeholder for future video briefing synthesis
  | 'audio_ai'          // Synthesizes bilingual speech narrations (Saudi Arabic & English)
  | 'qa_critic'         // Independent pedagogical & operational quality auditor
  | 'revision'          // Performs surgical corrections based on QA findings
  | 'compliance'        // Audits against Saudi Ministry of Tourism, Balady, Civil Defense, Labor Law
  | 'translator'        // Multilingual 5-star translation preserving HTML tags

export type PipelinePhase =
  | 'discovery_and_research'
  | 'curriculum_architecture'
  | 'content_synthesis'
  | 'assessment_generation'
  | 'multimedia_generation'
  | 'quality_assurance'
  | 'revision_cycle'
  | 'final_scoring'
  | 'persistence'

// ============================================================================
// CAPABILITY REQUIREMENTS & MODEL INTELLIGENCE
// ============================================================================

export type ModelProvider = 
  | 'gemini' 
  | 'groq' 
  | 'huggingface' 
  | 'cloudflare' 
  | 'openrouter' 
  | 'recraft'

export type ModelCostTier = 'free' | 'low_cost' | 'premium'

/**
 * Coarse modality classification used by the router to guarantee that an
 * image model can never be dispatched to a text/chat endpoint and vice-versa.
 * This is derived centrally from the registry — never from string matching.
 */
export type ModelModality = 'text' | 'image' | 'embedding'

/** Wire protocol a model expects. Text = chat/completions, image = images endpoint. */
export type ModelEndpointType = 'chat_completions' | 'image_generation' | 'embeddings' | 'native_svg'

/**
 * Platform-wide routing strategy. Controls how the registry scores candidates:
 *  - free_first    : only escalate to paid when no free model can do the job
 *  - balanced      : weigh quality / reliability / latency / cost evenly (default)
 *  - quality_first : prefer the highest-quality model, free or paid
 *  - premium       : always pick the best model regardless of cost
 */
export type RoutingMode = 'free_first' | 'balanced' | 'quality_first' | 'premium'

export type LatencyTier = 'realtime' | 'fast' | 'standard' | 'slow'
export type QualityTier = 'basic' | 'standard' | 'high' | 'flagship'

export type AIModelCapability =
  | 'deep_reasoning'        // Complex logical planning, blueprint structuring, deep analysis
  | 'structured_json'       // Flawless schema adherence without json markdown hallucinations
  | 'high_speed'            // Ultra-low latency (< 500ms) for real-time interactive tasks
  | 'arabic_native'         // Exceptional fluency in Saudi dialect & formal Arabic
  | 'creative_narrative'    // High-empathy dialogue, guest conflict scenarios
  | 'long_context'          // > 32k tokens context window for document ingestion
  | 'vector_svg'            // Ability to output crisp SVG graphics / structured diagrams
  | 'photorealistic_image'  // High-fidelity diffusion image generation
  | 'luxury_photography'    // Premium 5-star photographic realism (image models)
  | 'fast_generation'       // Low-latency image generation (few-step diffusion)
  | 'audio_speech'          // Text-to-speech synthesis

export interface TaskCapabilityRequirement {
  primaryCapability: AIModelCapability
  secondaryCapabilities?: AIModelCapability[]
  requiresJsonMode?: boolean
  requiresArabic?: boolean
  costPreference?: 'free_first' | 'quality_first' | 'speed_first'
  maxLatencyMs?: number
  minContextTokens?: number
}

export interface ModelMetadata {
  id: string
  name: string
  provider: ModelProvider
  costTier: ModelCostTier
  capabilities: AIModelCapability[]
  contextWindowTokens: number
  qualityScore: number      // 0 - 100 rating based on benchmarks
  speedScore: number        // 0 - 100 rating
  supportsJsonMode: boolean
  isDeprecated?: boolean
  /**
   * Modality of the model. When omitted it is inferred from `capabilities`
   * (any of photorealistic_image / vector_svg => 'image'). Prefer setting it
   * explicitly so the router never has to guess.
   */
  modality?: ModelModality
  /** Endpoint/protocol this model must be called through. */
  endpointType?: ModelEndpointType
  pricingPerMillionTokensUSD?: {
    prompt: number
    completion: number
  }
  /** Flat cost per generated image (image models). 0 = genuinely free. */
  pricingPerImageUSD?: number

  // ── Operational metadata (all optional; sensible defaults are derived) ──
  /** Master on/off switch. `false` => never selected by the router. Default true. */
  enabled?: boolean
  /** Admin hard override, wins over `enabled` and health checks. */
  adminOverride?: 'force_enable' | 'force_disable' | null
  /** Lower = tried earlier within the same tier. Default derived from scores. */
  priority?: number
  latencyTier?: LatencyTier
  qualityTier?: QualityTier
  /** 0-100 empirical success rate. Default 90. */
  reliabilityScore?: number
  /** May this model be used as an automatic fallback? Default true. */
  fallbackEligible?: boolean
  /** Per-agent-role suitability 0-100 overrides (sparse). */
  taskSuitability?: Partial<Record<AgentRole, number>>
  /** Last health-check result. */
  lastHealthCheckAt?: string
  lastHealthCheckOk?: boolean
  /**
   * `true` => the model id and/or its pricing have NOT been verified against
   * the live provider. Such models are excluded from automatic routing until
   * an admin verifies and enables them. Prevents "free by name only" bugs.
   */
  unverified?: boolean
}

// ============================================================================
// PIPELINE EVENT & PROGRESS TRACKING
// ============================================================================

export interface PipelineProgressEvent {
  pipelineRunId: string
  phase: PipelinePhase
  agentRole: AgentRole
  status: 'queued' | 'running' | 'completed' | 'failed' | 'retrying' | 'skipped'
  progressPercentage: number // 0 - 100
  title: string
  titleAr: string
  detail: string
  detailAr: string
  modelUsed?: string
  providerUsed?: ModelProvider
  latencyMs?: number
  timestamp: string
}

export type PipelineEventListener = (event: PipelineProgressEvent) => void

// ============================================================================
// AGENT RESULTS & RUN METRICS
// ============================================================================

export interface AgentExecutionResult<T = unknown> {
  agentRole: AgentRole
  success: boolean
  data: T
  rawOutput: string
  modelUsed: string
  providerUsed: ModelProvider
  costTier: ModelCostTier
  estimatedCostUSD: number
  latencyMs: number
  warnings?: string[]
  error?: string
}

// ============================================================================
// QA AUDIT & ADAPTIVE THRESHOLDS
// ============================================================================

export type QAScoreCategory = 'major_revision' | 'targeted_revision' | 'acceptable' | 'production_ready'

export interface QAThresholdConfig {
  minimumProductionReady: number // Default: 92
  minimumAcceptable: number       // Default: 80
  minimumTargetedRevision: number // Default: 68
  maxRevisionCycles: number       // Default: 2
  enforceComplianceHardStop: boolean
}

export const DEFAULT_QA_THRESHOLDS: Record<CourseType, QAThresholdConfig> = {
  compliance: {
    minimumProductionReady: 95,
    minimumAcceptable: 88,
    minimumTargetedRevision: 75,
    maxRevisionCycles: 3,
    enforceComplianceHardStop: true,
  },
  cert_prep: {
    minimumProductionReady: 95,
    minimumAcceptable: 88,
    minimumTargetedRevision: 75,
    maxRevisionCycles: 3,
    enforceComplianceHardStop: true,
  },
  exam_prep: {
    minimumProductionReady: 95,
    minimumAcceptable: 88,
    minimumTargetedRevision: 75,
    maxRevisionCycles: 3,
    enforceComplianceHardStop: true,
  },
  professional: {
    minimumProductionReady: 90,
    minimumAcceptable: 80,
    minimumTargetedRevision: 65,
    maxRevisionCycles: 2,
    enforceComplianceHardStop: false,
  },
  management: {
    minimumProductionReady: 90,
    minimumAcceptable: 82,
    minimumTargetedRevision: 68,
    maxRevisionCycles: 2,
    enforceComplianceHardStop: false,
  },
  simulation: {
    minimumProductionReady: 90,
    minimumAcceptable: 80,
    minimumTargetedRevision: 65,
    maxRevisionCycles: 2,
    enforceComplianceHardStop: false,
  },
  onboarding: {
    minimumProductionReady: 85,
    minimumAcceptable: 75,
    minimumTargetedRevision: 60,
    maxRevisionCycles: 2,
    enforceComplianceHardStop: false,
  },
  orientation: {
    minimumProductionReady: 85,
    minimumAcceptable: 75,
    minimumTargetedRevision: 60,
    maxRevisionCycles: 2,
    enforceComplianceHardStop: false,
  },
  microlearning: {
    minimumProductionReady: 85,
    minimumAcceptable: 75,
    minimumTargetedRevision: 60,
    maxRevisionCycles: 1,
    enforceComplianceHardStop: false,
  },
  sales: {
    minimumProductionReady: 88,
    minimumAcceptable: 78,
    minimumTargetedRevision: 65,
    maxRevisionCycles: 2,
    enforceComplianceHardStop: false,
  },
  soft_skills: {
    minimumProductionReady: 88,
    minimumAcceptable: 78,
    minimumTargetedRevision: 65,
    maxRevisionCycles: 2,
    enforceComplianceHardStop: false,
  },
  product: {
    minimumProductionReady: 88,
    minimumAcceptable: 78,
    minimumTargetedRevision: 65,
    maxRevisionCycles: 2,
    enforceComplianceHardStop: false,
  },
  workshop: {
    minimumProductionReady: 88,
    minimumAcceptable: 78,
    minimumTargetedRevision: 65,
    maxRevisionCycles: 2,
    enforceComplianceHardStop: false,
  },
  corporate: {
    minimumProductionReady: 90,
    minimumAcceptable: 80,
    minimumTargetedRevision: 68,
    maxRevisionCycles: 2,
    enforceComplianceHardStop: false,
  },
  technical: {
    minimumProductionReady: 92,
    minimumAcceptable: 82,
    minimumTargetedRevision: 70,
    maxRevisionCycles: 2,
    enforceComplianceHardStop: true,
  },
  academic: {
    minimumProductionReady: 90,
    minimumAcceptable: 80,
    minimumTargetedRevision: 68,
    maxRevisionCycles: 2,
    enforceComplianceHardStop: false,
  },
  ilt: {
    minimumProductionReady: 88,
    minimumAcceptable: 78,
    minimumTargetedRevision: 65,
    maxRevisionCycles: 2,
    enforceComplianceHardStop: false,
  },
  self_paced: {
    minimumProductionReady: 88,
    minimumAcceptable: 78,
    minimumTargetedRevision: 65,
    maxRevisionCycles: 2,
    enforceComplianceHardStop: false,
  },
  blended: {
    minimumProductionReady: 90,
    minimumAcceptable: 80,
    minimumTargetedRevision: 68,
    maxRevisionCycles: 2,
    enforceComplianceHardStop: false,
  },
}

export interface QAFindingItem {
  id: string
  dimension: 'pedagogy' | 'operational_accuracy' | 'blooms_alignment' | 'cultural_fit' | 'service_standards' | 'clarity' | 'safety_compliance'
  severity: 'critical' | 'major' | 'minor' | 'polish'
  moduleIndex?: number
  lessonIndex?: number
  itemTitle?: string
  description: string
  descriptionAr: string
  remediationSuggestion: string
  remediationSuggestionAr: string
  canAutoFix: boolean
}

export interface ComprehensiveQAReport {
  overallScore: number // 0 - 100
  scoreCategory: QAScoreCategory
  dimensionScores: {
    pedagogy: number
    operationalAccuracy: number
    bloomsAlignment: number
    culturalFit: number
    serviceStandards: number
    completeness: number
    compliance: number
  }
  findings: QAFindingItem[]
  recommendation: 'accept' | 'minor_polish' | 'targeted_revision' | 'full_rebuild'
  evaluatedByModel: string
  evaluatedAt: string
}

// ============================================================================
// OBJECTIVE-DRIVEN PSYCHOMETRIC ASSESSMENTS
// ============================================================================

export interface ObjectiveAssessmentContext {
  targetObjective: string
  targetObjectiveAr?: string
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
  difficulty: QuestionDifficulty
  questionType: QuestionType
  distractorStrategy?: 'plausible_common_error' | 'misconception_trap' | 'procedural_skip' | 'subtle_nuance'
  remediationPath?: string
  targetMasteryScore: number // e.g. 85
  points: number
}

// ============================================================================
// MULTIMEDIA STRATEGY & DECISION
// ============================================================================

export type VisualStrategyType = 
  | 'none'
  | 'vector_svg_diagram'    // Recraft Vector / Clean SVG
  | 'educational_illustration' // Recraft / Realistic
  | 'process_flowchart'       // Technical schematic
  | 'photorealistic_luxury'   // High-end 5-star photo
  | 'workplace_scenario'      // Dilemma visual

export interface VisualAssetDecision {
  shouldGenerate: boolean
  justification: string
  strategy: VisualStrategyType
  recommendedProvider: 'recraft' | 'cloudflare' | 'openrouter'
  prompt: string
  negativePrompt?: string
  aspectRatio: '16:9' | '4:3' | '1:1'
  educationalObjective: string
  placement: 'header' | 'inline_procedure' | 'scenario_dilemma' | 'summary'
}
