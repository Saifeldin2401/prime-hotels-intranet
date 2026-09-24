CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id           uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
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

CREATE INDEX IF NOT EXISTS knowledge_chunks_document_id_idx
  ON public.knowledge_chunks (document_id);
CREATE INDEX IF NOT EXISTS knowledge_chunks_article_id_idx
  ON public.knowledge_chunks (article_id);

CREATE INDEX IF NOT EXISTS knowledge_chunks_content_fts_idx
  ON public.knowledge_chunks
  USING gin (to_tsvector('simple', content));

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_ivfflat_idx
  ON public.knowledge_chunks
  USING ivfflat (embedding extensions.vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS knowledge_chunks_select ON public.knowledge_chunks;
CREATE POLICY knowledge_chunks_select ON public.knowledge_chunks
  FOR SELECT TO authenticated
  USING (
    document_id IS NOT NULL
    AND public.can_view_document(document_id)
  );

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
