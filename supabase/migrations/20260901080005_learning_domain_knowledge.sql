-- ============================================================================
-- APPLY ON STAGING FIRST
-- ----------------------------------------------------------------------------
-- Learning domain model, part 5 of 6: KNOWLEDGE BASE SPLIT
--
-- public.documents is an 88-column god-table with a `content_type` discriminator
-- ('training_block' | 'document' | 'sop'). Parts 1-2 pull 'training_block' out
-- into lesson_blocks. This migration adds the two Knowledge Base halves:
--
--   knowledge_documents  file/SOP records  (content_type = 'sop', and
--                        content_type = 'document' rows that carry a file_url)
--   knowledge_articles   rich-text pages   (content_type = 'document' rows with
--                        inline `content` and no file_url)
--
-- public.documents IS LEFT IN PLACE and remains the write path until the app is
-- repointed. Two backward-compat VIEWS expose the discriminator slices:
--   documents_sop_v, documents_article_v
--
-- Idempotent. RLS enabled on the new tables; views run SECURITY INVOKER so the
-- caller's `documents` RLS still applies.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- knowledge_documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id     UUID UNIQUE REFERENCES public.documents(id) ON DELETE SET NULL,
  title                  TEXT NOT NULL,
  title_ar               TEXT,
  description            TEXT,
  summary                TEXT,
  summary_ar             TEXT,
  file_url               TEXT,
  file_type              TEXT,
  file_extension         TEXT,
  file_size              BIGINT DEFAULT 0,
  sop_code               TEXT,
  document_number        TEXT,
  category_id            UUID,
  subcategory_id         UUID,
  department_id          UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  property_id            UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  visibility_scope       public.knowledge_visibility NOT NULL DEFAULT 'global',
  confidentiality_level  public.document_confidentiality DEFAULT 'internal',
  status                 public.document_status NOT NULL DEFAULT 'DRAFT',
  current_version        INTEGER NOT NULL DEFAULT 1,
  requires_acknowledgment BOOLEAN NOT NULL DEFAULT false,
  review_frequency_months INTEGER DEFAULT 12,
  next_review_date       DATE,
  owner_id               UUID,
  created_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archived            BOOLEAN NOT NULL DEFAULT false,
  is_deleted             BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS knowledge_documents_status_idx     ON public.knowledge_documents (status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS knowledge_documents_department_idx ON public.knowledge_documents (department_id);
CREATE INDEX IF NOT EXISTS knowledge_documents_property_idx   ON public.knowledge_documents (property_id);
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_documents_sop_code_key
  ON public.knowledge_documents (sop_code) WHERE sop_code IS NOT NULL;

COMMENT ON TABLE public.knowledge_documents IS 'Knowledge Base file / SOP record. Split from public.documents (content_type sop / file-backed document).';

-- ---------------------------------------------------------------------------
-- knowledge_articles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_articles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id    UUID UNIQUE REFERENCES public.documents(id) ON DELETE SET NULL,
  title                 TEXT NOT NULL,
  title_ar              TEXT,
  slug                  TEXT,
  content               TEXT,
  content_ar            TEXT,
  summary               TEXT,
  summary_ar            TEXT,
  category_id           UUID,
  subcategory_id        UUID,
  tags                  TEXT[],
  department_id         UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  property_id           UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  visibility_scope      public.knowledge_visibility NOT NULL DEFAULT 'global',
  confidentiality_level public.document_confidentiality DEFAULT 'internal',
  status                public.document_status NOT NULL DEFAULT 'DRAFT',
  featured              BOOLEAN NOT NULL DEFAULT false,
  view_count            INTEGER NOT NULL DEFAULT 0,
  estimated_read_time   INTEGER,
  owner_id              UUID,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at          TIMESTAMPTZ,
  last_reviewed_at      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted            BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS knowledge_articles_status_idx ON public.knowledge_articles (status) WHERE is_deleted = false;
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_articles_slug_key
  ON public.knowledge_articles (lower(slug)) WHERE slug IS NOT NULL;

COMMENT ON TABLE public.knowledge_articles IS 'Knowledge Base rich-text page. Split from public.documents (content_type document with inline content).';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['knowledge_documents','knowledge_articles'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_touch ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_touch BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.learning_touch_updated_at()', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Backward-compat views over the still-authoritative public.documents.
-- SECURITY INVOKER (default): documents RLS continues to gate every row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.documents_sop_v AS
  SELECT * FROM public.documents WHERE content_type = 'sop';

CREATE OR REPLACE VIEW public.documents_article_v AS
  SELECT * FROM public.documents WHERE content_type = 'document';

COMMENT ON VIEW public.documents_sop_v     IS 'Compat slice: documents.content_type = ''sop''. Read-only projection.';
COMMENT ON VIEW public.documents_article_v IS 'Compat slice: documents.content_type = ''document''. Read-only projection.';

-- ---------------------------------------------------------------------------
-- RLS
--   read : published + not deleted for everyone; editors see all.
--   write: editors only.
-- (Fine-grained visibility_scope / department filtering is layered by the app
--  query and can be tightened here once documents is fully retired.)
-- ---------------------------------------------------------------------------
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_articles  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS knowledge_documents_select ON public.knowledge_documents;
CREATE POLICY knowledge_documents_select ON public.knowledge_documents
  FOR SELECT TO authenticated
  USING ((status = 'PUBLISHED' AND is_deleted = false AND is_archived = false) OR public.is_learning_editor());

DROP POLICY IF EXISTS knowledge_documents_write ON public.knowledge_documents;
CREATE POLICY knowledge_documents_write ON public.knowledge_documents
  FOR ALL TO authenticated
  USING (public.is_learning_editor())
  WITH CHECK (public.is_learning_editor());

DROP POLICY IF EXISTS knowledge_articles_select ON public.knowledge_articles;
CREATE POLICY knowledge_articles_select ON public.knowledge_articles
  FOR SELECT TO authenticated
  USING ((status = 'PUBLISHED' AND is_deleted = false) OR public.is_learning_editor());

DROP POLICY IF EXISTS knowledge_articles_write ON public.knowledge_articles;
CREATE POLICY knowledge_articles_write ON public.knowledge_articles
  FOR ALL TO authenticated
  USING (public.is_learning_editor())
  WITH CHECK (public.is_learning_editor());
