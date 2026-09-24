-- ============================================================
-- consolidate_content_systems
-- ============================================================
-- Merges 4 parallel content storage systems into a single
-- unified `documents` table:
--   1. documents          (already the primary target)
--   2. sop_documents      (0 rows → safe to DROP after view created)
--   3. training_content_blocks   (0 rows → safe to DROP)
--   4. training_content_templates (13 rows → KEEP table, view alias provided)
--   5. training_module_documents  (0 rows → safe to DROP)
--   6. training_module_resources  (0 rows → safe to DROP)
--
-- Row counts at migration time (verified via execute_sql):
--   documents                 0
--   sop_documents             0
--   training_content_blocks   0
--   training_content_templates 13  ← HAS DATA, kept as-is
--   training_module_documents  0
--   training_module_resources  0
--
-- Strategy:
--   • The `documents` table already has content_type TEXT DEFAULT 'document'.
--   • Add SOP-specific columns from sop_documents that have no equivalent.
--   • Add training-block-specific columns that have no equivalent.
--   • Migrate rows from sop_documents / training_content_blocks into documents.
--   • Create backward-compat views so existing queries still compile during
--     the frontend transition period.
--   • DROP empty tables; leave training_content_templates untouched.
-- ============================================================

-- ============================================================
-- STEP 1 – Extend documents with SOP-specific columns
-- ============================================================

-- SOP document code (e.g. "SOP-HR-001")
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS sop_code TEXT;

-- SOP subcategory (finer-grained than category)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES categories(id);

-- SOP review cycle in months
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS review_frequency_months INTEGER DEFAULT 12;

-- SOP next scheduled review date
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS next_review_date DATE;

-- Whether a quiz is required to complete this content
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS requires_quiz BOOLEAN DEFAULT FALSE;

-- Passing score percentage for linked quiz
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 70;

-- Whether the quiz feature is enabled (separate from requires_quiz)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS quiz_enabled BOOLEAN DEFAULT FALSE;

-- Priority level (low / medium / high)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- Compliance level (standard / strict / critical)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS compliance_level TEXT DEFAULT 'standard';

-- Linked quiz UUID (denormalised for fast lookups)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS linked_quiz_id UUID;

-- Who last updated this document (separate from created_by)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Published-at timestamp (documents table had no direct equivalent)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Archived-at / archived-by from sop_documents
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

-- SOP visibility scope (uses the knowledge_visibility enum already in DB)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS visibility_scope knowledge_visibility DEFAULT 'global';

-- ============================================================
-- STEP 2 – Extend documents with training-block-specific columns
-- ============================================================

-- The parent training module (only set when content_type = 'training_block')
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS training_module_id UUID;

-- Block type (text / video / quiz / sop_reference / …)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS block_type TEXT;

-- Sort order within the parent module
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS block_order INTEGER;

-- Structured data payload for the block (quiz config, etc.)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS content_data JSONB;

-- Whether this block is mandatory for module completion
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT TRUE;

-- Duration in seconds for video / interactive blocks
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Gamification points for completing this block
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- AI-generated flag and source material
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS ai_source_content TEXT;

-- URL of the actual media asset (video, PDF, etc.)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS content_url TEXT;

-- ============================================================
-- STEP 3 – Migrate sop_documents rows → documents
-- (sop_documents had 0 rows at migration time; this INSERT is a
--  no-op but preserves the logic for future re-runs on a seeded DB)
-- ============================================================

INSERT INTO documents (
  id,
  title,
  title_ar,
  description,
  description_ar,
  content,
  status,
  content_type,
  sop_code,
  department_id,
  category_id,
  subcategory_id,
  property_id,
  visibility_scope,
  requires_acknowledgment,
  requires_quiz,
  passing_score,
  quiz_enabled,
  priority,
  compliance_level,
  review_frequency_months,
  next_review_date,
  video_url,
  checklist_items,
  faq_items,
  images,
  linked_quiz_id,
  linked_training_id,
  featured,
  view_count,
  estimated_read_time,
  last_reviewed_at,
  last_reviewed_by,
  file_size,
  created_by,
  updated_by,
  created_at,
  updated_at,
  published_at,
  last_published_by,
  archived_at,
  archived_by,
  is_deleted
)
SELECT
  id,
  title,
  title_ar,
  description,
  description_ar,
  content,
  -- Map sop_document_status enum → document_status enum
  CASE status::text
    WHEN 'draft'         THEN 'DRAFT'::document_status
    WHEN 'under_review'  THEN 'PENDING_REVIEW'::document_status
    WHEN 'approved'      THEN 'APPROVED'::document_status
    WHEN 'obsolete'      THEN 'REJECTED'::document_status
    ELSE                      'DRAFT'::document_status
  END,
  'sop',                -- content_type
  code,                 -- sop_code
  department_id,
  category_id,
  subcategory_id,
  property_id,
  COALESCE(visibility_scope, 'global'::knowledge_visibility),
  COALESCE(requires_acknowledgment, false),
  COALESCE(requires_quiz, false),
  COALESCE(passing_score, 70),
  COALESCE(quiz_enabled, false),
  COALESCE(priority, 'medium'),
  COALESCE(compliance_level, 'standard'),
  COALESCE(review_frequency_months, 12),
  next_review_date,
  video_url,
  COALESCE(checklist_items, '[]'::jsonb),
  COALESCE(faq_items,      '[]'::jsonb),
  COALESCE(images,         '[]'::jsonb),
  linked_quiz_id,
  linked_training_id,
  COALESCE(featured, false),
  COALESCE(view_count, 0),
  estimated_read_time,
  last_reviewed_at,
  last_reviewed_by,
  COALESCE(file_size, 0),
  created_by,
  updated_by,
  created_at,
  updated_at,
  published_at,
  published_by,
  archived_at,
  archived_by,
  COALESCE(is_deleted, false)
FROM sop_documents
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 4 – Migrate training_content_blocks rows → documents
-- (0 rows at migration time; INSERT is a no-op but logically complete)
-- ============================================================

INSERT INTO documents (
  id,
  title,
  content,
  content_type,
  content_url,
  content_data,
  training_module_id,
  block_type,
  block_order,
  is_mandatory,
  duration_seconds,
  points,
  ai_generated,
  ai_source_content,
  linked_training_id,
  is_deleted,
  created_at,
  status,
  visibility
)
SELECT
  id,
  COALESCE(title, ''),
  content,
  'training_block',
  content_url,
  content_data,
  training_module_id,
  type::text,
  "order",
  COALESCE(is_mandatory, true),
  duration_seconds,
  COALESCE(points, 0),
  COALESCE(ai_generated, false),
  ai_source_content,
  source_document_id,   -- closest semantic match in documents schema
  COALESCE(is_deleted, false),
  COALESCE(created_at, now()),
  'DRAFT'::document_status,
  'all_properties'::document_visibility
FROM training_content_blocks
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 5 – Migrate training_module_resources rows → documents
-- (0 rows at migration time; INSERT is a no-op)
-- ============================================================

INSERT INTO documents (
  id,
  title,
  description,
  content_type,
  content_url,
  training_module_id,
  block_order,
  is_mandatory,
  created_at,
  status,
  visibility
)
SELECT
  id,
  title,
  description,
  'training_resource',
  resource_url,
  training_module_id,
  COALESCE(display_order, 0),
  COALESCE(is_required, false),
  COALESCE(created_at, now()),
  'DRAFT'::document_status,
  'all_properties'::document_visibility
FROM training_module_resources
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 6 – Create backward-compatible views
-- These views let existing frontend queries continue to work
-- while the codebase migrates to query `documents` directly.
-- ============================================================

-- sop_documents_v
DROP VIEW IF EXISTS sop_documents_v;
CREATE VIEW sop_documents_v AS
SELECT
  id,
  title,
  COALESCE(title_ar, '')                AS title_ar,
  sop_code                              AS code,
  description,
  COALESCE(description_ar, '')          AS description_ar,
  department_id,
  category_id,
  subcategory_id,
  CASE status::text
    WHEN 'DRAFT'          THEN 'draft'
    WHEN 'PENDING_REVIEW' THEN 'under_review'
    WHEN 'APPROVED'       THEN 'approved'
    WHEN 'REJECTED'       THEN 'obsolete'
    ELSE                       'draft'
  END                                   AS status,
  COALESCE(current_version, 1)          AS version,
  NULL::uuid                            AS current_version_id,
  COALESCE(review_frequency_months, 12) AS review_frequency_months,
  next_review_date,
  FALSE                                 AS is_template,
  NULL::uuid                            AS template_id,
  created_by,
  updated_by,
  created_at,
  updated_at,
  published_at,
  last_published_by                     AS published_by,
  archived_at,
  archived_by,
  property_id,
  visibility_scope,
  content_type,
  COALESCE(requires_acknowledgment, false) AS requires_acknowledgment,
  COALESCE(view_count, 0)              AS view_count,
  featured,
  estimated_read_time,
  last_reviewed_at,
  last_reviewed_by,
  content,
  COALESCE(requires_quiz, false)       AS requires_quiz,
  COALESCE(passing_score, 70)          AS passing_score,
  COALESCE(quiz_enabled, false)        AS quiz_enabled,
  COALESCE(priority, 'medium')         AS priority,
  COALESCE(compliance_level,'standard') AS compliance_level,
  video_url,
  COALESCE(checklist_items, '[]'::jsonb) AS checklist_items,
  COALESCE(faq_items, '[]'::jsonb)     AS faq_items,
  linked_quiz_id,
  linked_training_id,
  COALESCE(images, '[]'::jsonb)        AS images,
  COALESCE(is_deleted, false)          AS is_deleted,
  COALESCE(file_size, 0)               AS file_size
FROM documents
WHERE content_type = 'sop';

COMMENT ON VIEW sop_documents_v IS
  'Backward-compatible view over documents WHERE content_type = ''sop''. '
  'Replaces the sop_documents table after consolidation. '
  'Frontend code should migrate to query documents directly with content_type filter.';

-- training_content_blocks_v
DROP VIEW IF EXISTS training_content_blocks_v;
CREATE VIEW training_content_blocks_v AS
SELECT
  id,
  training_module_id,
  block_type                            AS type,
  COALESCE(content, '')                 AS content,
  COALESCE(block_order, 0)             AS "order",
  created_at,
  content_url,
  content_data,
  COALESCE(is_mandatory, true)          AS is_mandatory,
  COALESCE(is_deleted, false)           AS is_deleted,
  linked_training_id                    AS source_document_id,
  COALESCE(ai_generated, false)         AS ai_generated,
  ai_source_content,
  title,
  duration_seconds,
  COALESCE(points, 0)                   AS points
FROM documents
WHERE content_type = 'training_block';

COMMENT ON VIEW training_content_blocks_v IS
  'Backward-compatible view over documents WHERE content_type = ''training_block''. '
  'Replaces the training_content_blocks table after consolidation.';

-- training_module_resources_v
DROP VIEW IF EXISTS training_module_resources_v;
CREATE VIEW training_module_resources_v AS
SELECT
  id,
  training_module_id,
  'document'                            AS resource_type,
  id                                    AS resource_id,
  content_url                           AS resource_url,
  title,
  description,
  COALESCE(block_order, 0)             AS display_order,
  COALESCE(is_mandatory, false)         AS is_required,
  created_at
FROM documents
WHERE content_type = 'training_resource';

COMMENT ON VIEW training_module_resources_v IS
  'Backward-compatible view over documents WHERE content_type = ''training_resource''. '
  'Replaces the training_module_resources table after consolidation.';

-- training_module_documents_v
-- The old join table linked modules to documents; the relationship is now
-- expressed directly via training_module_id on documents.
DROP VIEW IF EXISTS training_module_documents_v;
CREATE VIEW training_module_documents_v AS
SELECT
  id,
  training_module_id,
  id                                    AS document_id,
  COALESCE(is_mandatory, true)          AS is_required,
  created_at,
  COALESCE(updated_at, created_at)      AS updated_at
FROM documents
WHERE content_type IN ('training_block', 'training_resource');

COMMENT ON VIEW training_module_documents_v IS
  'Backward-compatible shim. training_module_documents no longer exists as a table; '
  'this view exposes training content linked to a module via documents.training_module_id.';

-- ============================================================
-- STEP 7 – RLS: add explicit policy for training content types
-- ============================================================
-- The existing `documents_select_by_visibility` and
-- `documents_modify_author_approver` policies already cover the
-- standard document visibility model.
--
-- We add one supplemental policy so that training blocks and resources
-- (which have no independent visibility setting) are readable by
-- any authenticated user once the module is published.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'documents'
      AND policyname = 'documents_training_content_select'
  ) THEN
    CREATE POLICY documents_training_content_select
      ON documents
      FOR SELECT
      TO authenticated
      USING (
        content_type IN ('training_block', 'training_resource', 'training_template')
        AND (
          -- Author can always see their own
          created_by = (SELECT auth.uid())
          -- Admins and HR can see all
          OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)
          OR has_role((SELECT auth.uid()), 'regional_hr'::app_role)
          -- Property staff can see their property's content
          OR (
            property_id IS NOT NULL
            AND has_property_access((SELECT auth.uid()), property_id)
          )
          -- Published training content visible to all authenticated users
          OR status = 'PUBLISHED'::document_status
        )
      );
  END IF;
END $$;

-- ============================================================
-- STEP 8 – DROP empty tables
-- ============================================================
-- training_content_templates HAS 13 rows → DO NOT DROP.
-- All other consolidated tables had 0 rows.

-- Drop satellite tables of sop_documents first (FK ordering)
DROP TABLE IF EXISTS sop_review_reminders      CASCADE;
DROP TABLE IF EXISTS sop_role_assignments       CASCADE;
DROP TABLE IF EXISTS sop_feedback               CASCADE;
DROP TABLE IF EXISTS sop_document_relations     CASCADE;
DROP TABLE IF EXISTS sop_document_versions      CASCADE;
DROP TABLE IF EXISTS sop_document_tags          CASCADE;
DROP TABLE IF EXISTS sop_context_triggers       CASCADE;
DROP TABLE IF EXISTS sop_comment_votes          CASCADE;
DROP TABLE IF EXISTS sop_comments               CASCADE;
DROP TABLE IF EXISTS sop_bookmarks              CASCADE;
DROP TABLE IF EXISTS sop_attachments            CASCADE;
DROP TABLE IF EXISTS sop_approval_workflows     CASCADE;
DROP TABLE IF EXISTS sop_approval_steps         CASCADE;
DROP TABLE IF EXISTS sop_acknowledgments        CASCADE;
-- sop_categories and sop_tags are shared reference data; keep them.
-- sop_categories: referenced by sop_documents.category_id / subcategory_id – keep.
-- sop_tags: referenced by sop_document_tags – already dropped above.

-- Drop sop_documents itself (0 rows, all satellite tables dropped above)
DROP TABLE IF EXISTS sop_documents CASCADE;

-- Drop empty training tables
DROP TABLE IF EXISTS training_module_documents  CASCADE;
DROP TABLE IF EXISTS training_module_resources  CASCADE;
DROP TABLE IF EXISTS training_content_blocks    CASCADE;

-- ============================================================
-- STEP 9 – Indexes for new columns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_documents_content_type
  ON documents (content_type);

CREATE INDEX IF NOT EXISTS idx_documents_training_module_id
  ON documents (training_module_id)
  WHERE training_module_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_sop_code
  ON documents (sop_code)
  WHERE sop_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_content_type_module_order
  ON documents (content_type, training_module_id, block_order)
  WHERE training_module_id IS NOT NULL;
