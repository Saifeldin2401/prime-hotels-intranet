/**
 * Capability: knowledgeQA  (NEW — retrieval-augmented Q&A)
 * ---------------------------------------------------------------------------
 * Flow:
 *   1. embed the query               (TODO: gateway embedding capability class)
 *   2. hybrid retrieve from knowledge_chunks (vector + keyword), RLS-filtered
 *      BEFORE ranking via SECURITY INVOKER RPC match_knowledge_chunks
 *   3. build a grounded prompt from the retrieved passages
 *   4. call the gateway (process-ai-request via AltusAIClient)
 *   5. return { answer, citations, groundedness }
 *
 * If retrieval returns nothing, we DO NOT call the model — we return an explicit
 * "not in the knowledge base" answer with outOfScope: true.
 *
 * Grounding policy: strict-rag.
 */

import { altusAI } from '@/lib/ai/client'
import { capabilityDb } from './db'
import type { CapabilityCallContext, GroundingPolicy } from './types'
import {
  KnowledgeQAResultSchema,
  type KnowledgeQAResult,
  type KnowledgeQACitation,
} from './schemas'

export const knowledgeQAGroundingPolicy: GroundingPolicy = {
  mode: 'strict-rag',
  retrievalSource: 'knowledge_chunks',
  rlsEnforcedBy:
    'match_knowledge_chunks() is SECURITY INVOKER; knowledge_chunks RLS (can_view_document) filters candidates to the caller BEFORE similarity/keyword ranking.',
  fallbackBehaviour:
    'Zero retrieved chunks => return the explicit "not in the knowledge base" answer with outOfScope=true. The model is not called.',
  notes:
    'groundedness is currently a heuristic (share of cited chunks referenced in the answer). Replace with an NLI check when available.',
}

const OUT_OF_SCOPE_EN =
  "I could not find anything about this in the knowledge base. Please check with your manager or add the relevant SOP."
const OUT_OF_SCOPE_AR =
  'لم أتمكن من العثور على معلومات حول هذا الموضوع في قاعدة المعرفة. يُرجى مراجعة مديرك أو إضافة الإجراء المعياري المناسب.'

interface MatchRow {
  id: string
  document_id: string | null
  article_id: string | null
  title: string | null
  section: string | null
  content: string
  similarity: number
  keyword_rank: number
}

export interface KnowledgeQAInput {
  query: string
  ctx?: CapabilityCallContext
  /** Max passages to retrieve. */
  matchCount?: number
  /** Minimum cosine similarity for a vector hit (0..1). */
  minSimilarity?: number
}

/**
 * Embed the query text.
 *
 * TODO(gateway-embedding-capability): process-ai-request has no embeddings
 * branch yet (see migration 20260901090100_ai_embedding_capability.sql).
 * When it does, replace this with a real call:
 *   const vec = await altusAI.embed(query)   // number[] length 1536
 * Until then we return null and retrieval falls back to keyword-only, which the
 * RPC handles (p_query_embedding NULL => keyword branch only).
 */
async function embedQuery(_query: string, _ctx: CapabilityCallContext): Promise<number[] | null> {
  return null
}

function buildGroundedPrompt(query: string, rows: MatchRow[], locale: 'en' | 'ar'): string {
  const blocks = rows
    .map(
      (r, i) =>
        `[PASSAGE ${i + 1}] (document ${r.document_id ?? r.article_id}, "${r.title ?? 'Untitled'}"${
          r.section ? `, section: ${r.section}` : ''
        })\n${r.content}`,
    )
    .join('\n\n')

  return `You answer strictly from the passages below. If the passages do not contain the answer, say so — do not use outside knowledge.
Cite passages inline as [PASSAGE n]. Answer in ${locale === 'ar' ? 'Arabic' : 'English'}.

QUESTION: ${query}

KNOWLEDGE BASE PASSAGES:
${blocks}

Answer:`
}

/** Heuristic groundedness: fraction of cited passages actually referenced. */
function estimateGroundedness(answer: string, rows: MatchRow[]): { groundedness: number; citedIdx: Set<number> } {
  const citedIdx = new Set<number>()
  rows.forEach((_, i) => {
    if (answer.includes(`[PASSAGE ${i + 1}]`)) citedIdx.add(i)
  })
  if (rows.length === 0) return { groundedness: 0, citedIdx }
  // reward citing, cap at 1
  const ratio = citedIdx.size / Math.min(rows.length, 3)
  return { groundedness: Math.max(0, Math.min(1, ratio)), citedIdx }
}

export async function askKnowledgeBase(input: KnowledgeQAInput): Promise<KnowledgeQAResult> {
  const ctx = input.ctx ?? {}
  const locale = ctx.locale ?? 'en'
  const matchCount = input.matchCount ?? 8
  const minSimilarity = input.minSimilarity ?? 0.15

  const outOfScope = (): KnowledgeQAResult =>
    KnowledgeQAResultSchema.parse({
      answer: locale === 'ar' ? OUT_OF_SCOPE_AR : OUT_OF_SCOPE_EN,
      citations: [],
      groundedness: 0,
      outOfScope: true,
    })

  if (!input.query.trim()) return outOfScope()

  // 1. embed
  const embedding = await embedQuery(input.query, ctx)

  // 2. hybrid retrieve (RLS enforced inside the RPC)
  const { data, error } = await capabilityDb.rpc<MatchRow[]>('match_knowledge_chunks', {
    p_query_embedding: embedding,
    p_query_text: input.query,
    p_match_count: matchCount,
    p_min_similarity: minSimilarity,
  })

  if (error) {
    // Retrieval failure is treated as "no grounding" — never fall through to an
    // ungrounded model answer.
    return outOfScope()
  }

  const rows = (data ?? []).filter((r) => r.content?.trim())
  if (rows.length === 0) return outOfScope()

  // 3. grounded prompt
  const prompt = buildGroundedPrompt(input.query, rows, locale)

  // 4. gateway call
  const result = await altusAI.executePrompt(prompt, {
    systemPrompt:
      'You are a hotel knowledge base assistant. Answer only from provided passages. Never fabricate procedures.',
    temperature: 0.1,
    task: 'chat',
    signal: ctx.signal,
  })
  const answer = (result.data ?? '').trim()
  if (!answer) return outOfScope()

  // 5. citations + groundedness
  const { groundedness, citedIdx } = estimateGroundedness(answer, rows)

  const citations: KnowledgeQACitation[] = rows
    .map((r, i) => ({ r, i }))
    .filter(({ i }) => citedIdx.size === 0 || citedIdx.has(i))
    .slice(0, 5)
    .map(({ r, i }) => ({
      documentId: r.document_id ?? r.article_id ?? '',
      title: r.title ?? 'Untitled',
      passage: r.content.slice(0, 500),
      confidence: Math.max(
        0,
        Math.min(1, 0.6 * (r.similarity || 0) + 0.4 * Math.min(r.keyword_rank || 0, 1) + (citedIdx.has(i) ? 0.2 : 0)),
      ),
    }))

  return KnowledgeQAResultSchema.parse({
    answer,
    citations,
    groundedness,
    outOfScope: false,
  })
}
