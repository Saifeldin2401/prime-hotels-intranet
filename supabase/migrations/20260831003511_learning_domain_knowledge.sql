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

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['knowledge_documents','knowledge_articles'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_touch ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_touch BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.learning_touch_updated_at()', t);
  END LOOP;
END $$;

CREATE OR REPLACE VIEW public.documents_sop_v AS
  SELECT * FROM public.documents WHERE content_type = 'sop';

CREATE OR REPLACE VIEW public.documents_article_v AS
  SELECT * FROM public.documents WHERE content_type = 'document';

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
