/**
 * Capability: ingestion
 * ---------------------------------------------------------------------------
 * Parse -> classify/tag -> chunk -> embed a knowledge document so it can be
 * retrieved by `knowledgeQA` and used to ground `courseGeneration`.
 *
 * Grounding policy: structured-input-only. This capability PRODUCES grounding
 * material; it does not consume the model generatively beyond the existing
 * `ai-document-tagger` classification pass.
 */

import { supabase } from '@/lib/supabase'
import { capabilityDb } from './db'
import type { CapabilityCallContext, GroundingPolicy } from './types'
import { KnowledgeChunkSchema, type KnowledgeChunk } from './schemas'

export const ingestionGroundingPolicy: GroundingPolicy = {
  mode: 'structured-input-only',
  retrievalSource: 'none',
  rlsEnforcedBy:
    'ai-document-tagger edge function (user JWT: may only tag own documents; service role: any). knowledge_chunks INSERT gated to service role / knowledge managers.',
  fallbackBehaviour:
    'Tagging is fire-and-forget — a failure never blocks the upload. Chunks are still inserted (embedding NULL) so a later batch job can backfill vectors.',
  notes:
    'Chunking is deterministic and offline. Embedding requires the gateway embedding path (see embedChunks TODO).',
}

// ---------------------------------------------------------------------------
// 1. classify / tag  — thin wrapper over the existing edge function
// ---------------------------------------------------------------------------
export interface TagDocumentResult {
  ok: boolean
  error?: string
}

/**
 * Fire the server-side auto-tagger for a document. The edge function reads the
 * document itself (RLS-checked) and writes ai_tags / ai_category / ai_summary.
 * Intentionally forgiving: returns `{ ok: false }` rather than throwing.
 */
export async function classifyAndTagDocument(documentId: string): Promise<TagDocumentResult> {
  try {
    const { error } = await supabase.functions.invoke('ai-document-tagger', {
      body: { documentId },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ---------------------------------------------------------------------------
// 2. chunk  — deterministic, offline
// ---------------------------------------------------------------------------
export interface ChunkOptions {
  /** Target chunk size in approximate tokens (~4 chars/token heuristic). */
  targetTokens?: number
  /** Overlap between consecutive chunks, in approximate tokens. */
  overlapTokens?: number
}

const CHARS_PER_TOKEN = 4

/** Cheap token estimate — good enough for chunk sizing, not for billing. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.trim().length / CHARS_PER_TOKEN)
}

/**
 * Split document text into overlapping, section-aware chunks. Splits on markdown
 * / HTML headings first, then packs paragraphs up to `targetTokens`.
 */
export function chunkDocument(
  rawText: string,
  options: ChunkOptions = {},
): KnowledgeChunk[] {
  const { targetTokens = 320, overlapTokens = 48 } = options
  const text = (rawText || '').replace(/\r\n/g, '\n').trim()
  if (!text) return []

  const targetChars = targetTokens * CHARS_PER_TOKEN
  const overlapChars = overlapTokens * CHARS_PER_TOKEN

  // Section markers: markdown headings or <h1..h4>.
  const sections = text
    .split(/\n(?=#{1,4}\s)|(?=<h[1-4][^>]*>)/i)
    .map((s) => s.trim())
    .filter(Boolean)

  const chunks: KnowledgeChunk[] = []

  for (const section of sections) {
    const headingMatch = section.match(/^(?:#{1,4}\s*(.+)|<h[1-4][^>]*>(.*?)<\/h[1-4]>)/i)
    const sectionTitle = (headingMatch?.[1] || headingMatch?.[2] || '').trim() || null

    const paragraphs = section.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    let buffer = ''

    const flush = () => {
      const content = buffer.trim()
      if (!content) return
      chunks.push(
        KnowledgeChunkSchema.parse({
          section: sectionTitle,
          content,
          tokenCount: estimateTokens(content),
          embedding: null,
        }),
      )
      // carry the tail as overlap
      buffer = overlapChars > 0 ? content.slice(-overlapChars) : ''
    }

    for (const para of paragraphs) {
      if ((buffer + '\n\n' + para).length > targetChars && buffer) flush()
      buffer = buffer ? `${buffer}\n\n${para}` : para
    }
    flush()
  }

  return chunks
}

// ---------------------------------------------------------------------------
// 3. embed  — needs the gateway embedding path
// ---------------------------------------------------------------------------
/**
 * Attach embedding vectors to chunks.
 *
 * TODO(gateway-embedding-capability): process-ai-request has no embeddings
 * dispatch. It must gain an `embedding` branch that:
 *   - reads public.get_ai_routing_plan('embedding')
 *   - POSTs each chunk's `content` to the chosen provider's embeddings endpoint
 *   - returns `number[]` of length 1536 (see migration 20260901090100)
 * Until then this returns the chunks unchanged (embedding: null) and callers
 * should persist them anyway for later backfill.
 */
export async function embedChunks(
  chunks: KnowledgeChunk[],
  _ctx: CapabilityCallContext = {},
): Promise<KnowledgeChunk[]> {
  // Intentionally a no-op passthrough until the gateway embedding path exists.
  return chunks
}

// ---------------------------------------------------------------------------
// 4. persist
// ---------------------------------------------------------------------------
export interface PersistChunksInput {
  documentId?: string
  articleId?: string
  chunks: KnowledgeChunk[]
  /** Replace any existing chunks for this parent first. */
  replaceExisting?: boolean
}

/**
 * Insert chunks into public.knowledge_chunks. Write RLS restricts this to
 * service role / knowledge managers, so a normal user call will (correctly) be
 * rejected by the database.
 */
export async function persistChunks(input: PersistChunksInput): Promise<{ inserted: number; error?: string }> {
  const { documentId, articleId, chunks, replaceExisting } = input
  if (!documentId && !articleId) return { inserted: 0, error: 'documentId or articleId required' }
  if (chunks.length === 0) return { inserted: 0 }

  try {
    if (replaceExisting) {
      const del = capabilityDb.from('knowledge_chunks').delete()
      const { error: delErr } = documentId
        ? await del.eq('document_id', documentId)
        : await del.eq('article_id', articleId as string)
      if (delErr) return { inserted: 0, error: delErr.message }
    }

    const rows = chunks.map((c) => ({
      document_id: documentId ?? null,
      article_id: articleId ?? null,
      section: c.section,
      content: c.content,
      token_count: c.tokenCount,
      embedding: c.embedding as number[] | null,
    }))

    const { error } = await capabilityDb.from('knowledge_chunks').insert(rows)
    if (error) return { inserted: 0, error: error.message }
    return { inserted: rows.length }
  } catch (err) {
    return { inserted: 0, error: err instanceof Error ? err.message : String(err) }
  }
}

// ---------------------------------------------------------------------------
// orchestrated entry
// ---------------------------------------------------------------------------
export interface IngestDocumentInput {
  documentId: string
  text: string
  chunkOptions?: ChunkOptions
  ctx?: CapabilityCallContext
}

export interface IngestDocumentOutput {
  tagged: TagDocumentResult
  chunkCount: number
  embedded: boolean
  persisted: { inserted: number; error?: string }
}

export async function ingestDocument(input: IngestDocumentInput): Promise<IngestDocumentOutput> {
  const tagged = await classifyAndTagDocument(input.documentId)
  const chunks = chunkDocument(input.text, input.chunkOptions)
  const embedded = await embedChunks(chunks, input.ctx)
  const anyEmbedded = embedded.some((c) => Array.isArray(c.embedding))
  const persisted = await persistChunks({
    documentId: input.documentId,
    chunks: embedded,
    replaceExisting: true,
  })
  return { tagged, chunkCount: chunks.length, embedded: anyEmbedded, persisted }
}
