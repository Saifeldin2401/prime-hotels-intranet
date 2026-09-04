/**
 * AI Capability Layer — shared types
 * ---------------------------------------------------------------------------
 * The platform exposes exactly six named AI capabilities. Every feature that
 * calls the model gateway does so through one of these, so that grounding,
 * schema validation and guardrails are enforced in one place instead of being
 * re-invented per screen.
 *
 * See docs/ai-architecture.md for the prose version of this contract.
 */

export type CapabilityId =
  | 'ingestion'
  | 'courseGeneration'
  | 'assessmentAuthoring'
  | 'knowledgeQA'
  | 'recommendations'
  | 'gapAnalysis'

/**
 * How a capability is allowed to use the language model relative to
 * verified knowledge-base content.
 */
export type GroundingMode =
  /** Output MUST be traceable to retrieved KB passages; refuse if nothing retrieved. */
  | 'strict-rag'
  /** Retrieved KB passages are injected as context and cited when used, but the
   *  model may also draw on general instructional knowledge. */
  | 'grounded-generative'
  /** No retrieval. Operates purely on caller-supplied structured data. */
  | 'structured-input-only'
  /** Deterministic rules first; the model only writes the human-readable rationale. */
  | 'rules-with-llm-narration'

export interface GroundingPolicy {
  mode: GroundingMode
  /** Which store the capability retrieves from, if any. */
  retrievalSource?: 'knowledge_chunks' | 'documents_fts' | 'none'
  /** RLS is always enforced; this documents *where*. */
  rlsEnforcedBy: string
  /** What the capability does when it has no grounding material. */
  fallbackBehaviour: string
  notes?: string
}

export interface CapabilityMeta {
  id: CapabilityId
  title: string
  description: string
  status: 'stable' | 'beta' | 'stub'
  grounding: GroundingPolicy
}

/** Common execution options threaded into every capability call. */
export interface CapabilityCallContext {
  /** Preferred model id (falls through the gateway router if unavailable). */
  preferredModel?: string
  /** Property scope for RLS-aware retrieval. */
  propertyId?: string | null
  /** Department scope for RLS-aware retrieval. */
  departmentId?: string | null
  /** Organization scope for multi-tenant isolation. */
  organizationId?: string | null
  /** Caller locale — drives answer language. */
  locale?: 'en' | 'ar'
  signal?: AbortSignal
}
