-- ============================================================================
-- KNOWLEDGE CHUNKS + PGVECTOR  (RAG retrieval spine for the AI capability layer)
-- ----------------------------------------------------------------------------
-- Backing store for `knowledgeQA` (retrieval-augmented Q&A) and any future
-- semantic search over the knowledge base. One row = one embedded passage of a
-- published knowledge document (and, later, a dedicated knowledge_articles row).
--
--   public.knowledge_chunks           — id, article_id?, document_id?, section,
--                                       content, token_count, embedding vector(1536)
--   ivfflat index on embedding        — cosine distance ANN
--   RLS                               — SELECT mirrors the parent document's
--                                       visibility via public.can_view_document();
--                                       writes are service-role / admin only.
--
-- ----------------------------------------------------------------------------
-- !! DEPLOYMENT NOTE — APPLY ON STAGING FIRST !!
-- ----------------------------------------------------------------------------
-- This migration enables the `vector` extension and creates an ANN index. On a
-- large `documents` corpus the initial backfill + `CREATE INDEX` can be slow and
-- memory-hungry. Steps:
--   1. Apply this file to a STAGING branch (`supabase db push` against staging).
--   2. Backfill embeddings out-of-band (edge function / batch job) — the
--      `embedding` column is nullable precisely so rows can land before their
--      vector is computed.
--   3. Once row count is known, tune `lists` on the ivfflat index
--      (rule of thumb: rows / 1000, min 10) or switch to HNSW.
--   4. Only then promote to production.
-- Do NOT hand-apply against production without the staging rehearsal.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1. TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id           uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  -- Exactly one parent. `document_id` is live today (knowledge base lives in
  -- public.documents). `article_id` is reserved for a future dedicated
  -- public.knowledge_articles table — TODO: add the FK when that table exists.
  article_id   uuid,
  document_id  uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  section      text,
  content      text NOT NULL,
  token_count  integer NOT NULL DEFAULT 0,
  embedding    extensions.vector(1536),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_chunks_has_parent
    CHECK (article_id IS NOT NULL OR document_id IS NOT NULL)
);

COMMENT ON TABLE public.knowledge_chunks IS
  'Embedded passages of published knowledge documents for retrieval-augmented Q&A. RLS mirrors parent document visibility.';
COMMENT ON COLUMN public.knowledge_chunks.embedding IS
  'vector(1536) — OpenAI text-embedding-3-small dimensionality. Nullable so rows can be inserted before the embedding job runs.';

CREATE INDEX IF NOT EXISTS knowledge_chunks_document_id_idx
  ON public.knowledge_chunks (document_id);
CREATE INDEX IF NOT EXISTS knowledge_chunks_article_id_idx
  ON public.knowledge_chunks (article_id);

-- Keyword half of hybrid retrieval (vector + keyword).
CREATE INDEX IF NOT EXISTS knowledge_chunks_content_fts_idx
  ON public.knowledge_chunks
  USING gin (to_tsvector('simple', content));

-- ANN index for the vector half. `lists` deliberately conservative — retune on
-- staging once the real row count is known (see deployment note above).
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_ivfflat_idx
  ON public.knowledge_chunks
  USING ivfflat (embedding extensions.vector_cosine_ops)
  WITH (lists = 100);

-- ---------------------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- SELECT: a caller may read a chunk iff they can see its parent document. The
-- retrieval RPC below is SECURITY INVOKER so this policy is enforced BEFORE
-- ranking, exactly as the capability's grounding policy requires.
-- TODO: OR-in an article visibility check once public.knowledge_articles lands.
DROP POLICY IF EXISTS knowledge_chunks_select ON public.knowledge_chunks;
CREATE POLICY knowledge_chunks_select ON public.knowledge_chunks
  FOR SELECT TO authenticated
  USING (
    document_id IS NOT NULL
    AND public.can_view_document(document_id)
  );

-- WRITE: service role (batch embedding jobs / edge functions) + knowledge
-- managers (corporate_admin / regional_admin). No client-side writes.
DROP POLICY IF EXISTS knowledge_chunks_write ON public.knowledge_chunks;
CREATE POLICY knowledge_chunks_write ON public.knowledge_chunks
  FOR ALL TO authenticated
  USING (
    public.has_role_optimized('super_admin'::public.app_role)
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role_optimized('super_admin'::public.app_role)
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
  );

GRANT SELECT ON public.knowledge_chunks TO authenticated;
GRANT ALL ON public.knowledge_chunks TO service_role;

-- ---------------------------------------------------------------------------
-- 3. HYBRID RETRIEVAL RPC
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER: RLS above filters the candidate set to what the caller may
-- see BEFORE similarity / keyword ranking. Returns the parent title so the
-- capability can build citations without a second round-trip.
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  p_query_embedding extensions.vector(1536),
  p_query_text      text DEFAULT NULL,
  p_match_count     integer DEFAULT 8,
  p_min_similarity  double precision DEFAULT 0.0
)
RETURNS TABLE (
  id           uuid,
  document_id  uuid,
  article_id   uuid,
  title        text,
  section      text,
  content      text,
  similarity   double precision,
  keyword_rank double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT
    kc.id,
    kc.document_id,
    kc.article_id,
    d.title,
    kc.section,
    kc.content,
    CASE
      WHEN kc.embedding IS NULL OR p_query_embedding IS NULL THEN 0.0
      ELSE 1 - (kc.embedding OPERATOR(extensions.<=>) p_query_embedding)
    END AS similarity,
    CASE
      WHEN p_query_text IS NULL OR p_query_text = '' THEN 0.0
      ELSE ts_rank(
             to_tsvector('simple', kc.content),
             plainto_tsquery('simple', p_query_text)
           )::double precision
    END AS keyword_rank
  FROM public.knowledge_chunks kc
  LEFT JOIN public.documents d ON d.id = kc.document_id
  WHERE
    (
      (kc.embedding IS NOT NULL AND p_query_embedding IS NOT NULL
        AND 1 - (kc.embedding OPERATOR(extensions.<=>) p_query_embedding) >= p_min_similarity)
      OR
      (p_query_text IS NOT NULL AND p_query_text <> ''
        AND to_tsvector('simple', kc.content) @@ plainto_tsquery('simple', p_query_text))
    )
  ORDER BY
    -- weighted hybrid score: 70% vector, 30% keyword
    (0.7 * CASE
             WHEN kc.embedding IS NULL OR p_query_embedding IS NULL THEN 0.0
             ELSE 1 - (kc.embedding OPERATOR(extensions.<=>) p_query_embedding)
           END)
    + (0.3 * CASE
               WHEN p_query_text IS NULL OR p_query_text = '' THEN 0.0
               ELSE least(
                      ts_rank(
                        to_tsvector('simple', kc.content),
                        plainto_tsquery('simple', p_query_text)
                      )::double precision,
                      1.0)
             END) DESC
  LIMIT greatest(p_match_count, 1);
$function$;

REVOKE ALL ON FUNCTION public.match_knowledge_chunks(extensions.vector, text, integer, double precision) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(extensions.vector, text, integer, double precision) TO authenticated, service_role;

COMMENT ON FUNCTION public.match_knowledge_chunks IS
  'Hybrid (vector + keyword) retrieval over knowledge_chunks. SECURITY INVOKER so RLS pre-filters to caller-visible chunks before ranking.';
