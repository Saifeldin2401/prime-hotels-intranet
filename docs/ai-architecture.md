# AI Architecture — Capability Layer

The platform's AI surface is **exactly six named capabilities**. Every feature
that calls the model gateway goes through one of them, so grounding, schema
validation, and guardrails are enforced in one place.

Code: `src/lib/ai/capabilities/` — `index.ts` exposes `AI_CAPABILITIES`
(metadata + grounding policy) and `aiCapabilities` (dispatch table).
Gateway (unchanged): `supabase/functions/process-ai-request/`.

## The six capabilities

| Capability | Status | What it does | Grounding mode |
|---|---|---|---|
| `ingestion` | beta | parse → classify/tag → chunk → embed a KB document | `structured-input-only` |
| `courseGeneration` | stable | multi-agent course pipeline (thin re-export of the orchestrator) | `grounded-generative` |
| `assessmentAuthoring` | stable | psychometric quiz authoring from a lesson/SOP passage | `grounded-generative` |
| `knowledgeQA` | beta | retrieval-augmented Q&A with citations | `strict-rag` |
| `recommendations` | stub | rule + signal course ranking (role, skill gap, path) | `structured-input-only` |
| `gapAnalysis` | stub | failing objectives / misleading questions from attempt data | `rules-with-llm-narration` |

### Real vs stubbed

- **Real:** `ingestion` (chunking is real and deterministic; tagging wraps the
  live `ai-document-tagger` edge function; persistence writes real rows),
  `courseGeneration` (delegates to the existing orchestrator), `assessmentAuthoring`
  (delegates to the existing assessment agent), `knowledgeQA` (real hybrid
  retrieval RPC, real grounded prompt, real gateway call, real citation
  extraction).
- **Stubbed inputs, real interface + real LLM call:** `recommendations` (scoring
  and ranking are real; the caller passes pre-computed signals — the signal
  SQL is TODO), `gapAnalysis` (stats logic and the LLM summary call are real;
  the caller passes an already-aggregated `AttemptAggregate` — the aggregation
  SQL is TODO).
- **Not yet wired:** query/chunk embedding. The gateway has no `embedding`
  dispatch path. `embedChunks` and `knowledgeQA.embedQuery` are no-ops that
  return `null`; retrieval degrades to keyword-only until the gateway gains an
  embeddings branch (see migrations below).

## Grounding policies

| Mode | Meaning |
|---|---|
| `strict-rag` | Output must trace to retrieved KB passages. If retrieval is empty, return the explicit "not in the knowledge base" answer — **the model is not called**. |
| `grounded-generative` | Retrieved passages are injected as context and cited when used; the model may also use general instructional knowledge. Lower QA confidence when nothing was retrieved. |
| `structured-input-only` | No retrieval, no generative model call in the default path. Operates on caller-supplied structured data. |
| `rules-with-llm-narration` | Deterministic rules decide the findings; the model only writes the human-readable summary from those findings. |

RLS is always enforced. Each capability's `grounding.rlsEnforcedBy` field names
exactly where.

## Retrieval design (`knowledgeQA`)

1. **Embed the query.** TODO: gateway `embedding` capability class. Until then
   `embedQuery` returns `null` and retrieval is keyword-only.
2. **Hybrid retrieve** via `public.match_knowledge_chunks(p_query_embedding,
   p_query_text, p_match_count, p_min_similarity)`:
   - vector half: cosine distance on `knowledge_chunks.embedding` (ivfflat index)
   - keyword half: `to_tsvector('simple', content) @@ plainto_tsquery(...)`
   - combined score: `0.7 * cosine_similarity + 0.3 * min(ts_rank, 1)`
   - The RPC is **`SECURITY INVOKER`**, so `knowledge_chunks` RLS
     (`can_view_document(document_id)`) filters candidates to what the caller
     may see **before** ranking.
3. **Build a grounded prompt** — passages numbered `[PASSAGE n]`, instruction to
   answer only from them and cite inline, answer language from `ctx.locale`.
4. **Call the gateway** (`AltusAIClient.executePrompt`, temperature 0.1).
5. **Return** `{ answer, citations: [{ documentId, title, passage, confidence }],
   groundedness, outOfScope }`. `groundedness` is currently a heuristic
   (fraction of top passages actually cited); replace with an NLI check later.

### Storage

`public.knowledge_chunks` — `id, article_id?, document_id?, section, content,
token_count, embedding vector(1536), created_at`.
- `document_id` → `public.documents(id) ON DELETE CASCADE` (KB lives in
  `documents` today).
- `article_id` reserved for a future `public.knowledge_articles` table (no FK
  yet).
- `CHECK (article_id IS NOT NULL OR document_id IS NOT NULL)`.
- Indexes: ivfflat cosine on `embedding`, GIN FTS on `content`, btree on FKs.
- RLS: SELECT mirrors parent document visibility; INSERT/UPDATE/DELETE
  restricted to `service_role` + knowledge managers (`super_admin`,
  `corporate_admin`, `regional_admin`).

Migrations (**author-only — apply on staging first, not committed to prod DB by
this change**):
- `20260901090000_knowledge_chunks_pgvector.sql`
- `20260901090100_ai_embedding_capability.sql` — registers `embedding` model
  rows + `ai_platform_config.embedding_model_priority`. `get_ai_routing_plan`
  already understands `p_capability = 'embedding'`. Open TODOs: gateway
  embeddings dispatch; dimension reconciliation (free CF BGE models are
  768/1024-dim vs the 1536-dim column).

## Guardrails

- **Single surface.** Features must call `aiCapabilities.*` / the capability
  modules, never the gateway or agents directly.
- **Strict-rag never falls through.** Retrieval error or empty result ⇒ explicit
  out-of-scope answer, model not invoked.
- **RLS before ranking.** Retrieval RPC is `SECURITY INVOKER`; no
  `SECURITY DEFINER` shortcut around chunk visibility.
- **Schema-validated outputs.** Every capability result is parsed with a Zod
  schema from `src/lib/ai/capabilities/schemas.ts` (reusing
  `src/lib/ai/schemas/` where possible).
- **Writes are privileged.** `knowledge_chunks` writes are service-role /
  knowledge-manager only; a normal user call is rejected by the database.
- **Embeddings are gated.** Only 1536-dim models can be `verified`; unverified
  embedding rows are `enabled = false` and filtered out of every routing plan.
- **Course generation is not forked here.** `courseGeneration` is a thin
  re-export; pipeline behaviour stays with its owning concern.
