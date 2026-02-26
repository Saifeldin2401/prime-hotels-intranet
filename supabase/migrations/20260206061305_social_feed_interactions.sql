-- Persisted social feed interactions (reactions + comments)

-- ============================================================================
-- Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_comments_item ON feed_comments(feed_item_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_author ON feed_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_created_at ON feed_comments(created_at);

CREATE TABLE IF NOT EXISTS feed_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(feed_item_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_feed_reactions_item ON feed_reactions(feed_item_id);
CREATE INDEX IF NOT EXISTS idx_feed_reactions_user ON feed_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_reactions_type ON feed_reactions(reaction_type);

-- Keep updated_at in sync
DROP TRIGGER IF EXISTS update_feed_comments_updated_at ON feed_comments;
CREATE TRIGGER update_feed_comments_updated_at
  BEFORE UPDATE ON feed_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Visibility helper
-- NOTE: feed_item_id values are currently synthetic strings like:
--   ann-<uuid>, doc-<uuid>, task-<uuid>, train-<uuid>, ach-<uuid>, bday-<uuid>
-- This function checks whether the CURRENT authenticated user can view the
-- underlying entity by leveraging existing RLS policies.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_view_feed_item(_feed_item_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = on
AS $$
DECLARE
  _prefix TEXT;
  _id_text TEXT;
  _uuid UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  _prefix := split_part(_feed_item_id, '-', 1);
  _id_text := substring(_feed_item_id from position('-' in _feed_item_id) + 1);

  BEGIN
    _uuid := _id_text::uuid;
  EXCEPTION WHEN others THEN
    _uuid := NULL;
  END;

  IF _prefix = 'ann' AND _uuid IS NOT NULL THEN
    RETURN EXISTS (SELECT 1 FROM announcements WHERE id = _uuid);
  ELSIF _prefix = 'doc' AND _uuid IS NOT NULL THEN
    RETURN EXISTS (SELECT 1 FROM documents WHERE id = _uuid);
  ELSIF _prefix = 'task' AND _uuid IS NOT NULL THEN
    RETURN EXISTS (SELECT 1 FROM tasks WHERE id = _uuid);
  ELSIF _prefix = 'train' AND _uuid IS NOT NULL THEN
    RETURN EXISTS (SELECT 1 FROM learning_assignments WHERE id = _uuid);
  ELSIF _prefix = 'ach' AND _uuid IS NOT NULL THEN
    RETURN EXISTS (SELECT 1 FROM training_progress WHERE id = _uuid);
  ELSIF _prefix = 'bday' AND _uuid IS NOT NULL THEN
    -- birthday is derived from profiles; if the user can view that profile, allow.
    RETURN EXISTS (SELECT 1 FROM profiles WHERE id = _uuid);
  END IF;

  RETURN FALSE;
END;
$$;

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_reactions ENABLE ROW LEVEL SECURITY;

-- Comments
DROP POLICY IF EXISTS "feed_comments_select_visible_items" ON feed_comments;
CREATE POLICY "feed_comments_select_visible_items"
  ON feed_comments FOR SELECT
  TO authenticated
  USING (public.can_view_feed_item(feed_item_id));

DROP POLICY IF EXISTS "feed_comments_insert_own" ON feed_comments;
CREATE POLICY "feed_comments_insert_own"
  ON feed_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    public.can_view_feed_item(feed_item_id)
  );

DROP POLICY IF EXISTS "feed_comments_update_own" ON feed_comments;
CREATE POLICY "feed_comments_update_own"
  ON feed_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "feed_comments_delete_own" ON feed_comments;
CREATE POLICY "feed_comments_delete_own"
  ON feed_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Reactions
DROP POLICY IF EXISTS "feed_reactions_select_visible_items" ON feed_reactions;
CREATE POLICY "feed_reactions_select_visible_items"
  ON feed_reactions FOR SELECT
  TO authenticated
  USING (public.can_view_feed_item(feed_item_id));

DROP POLICY IF EXISTS "feed_reactions_insert_own" ON feed_reactions;
CREATE POLICY "feed_reactions_insert_own"
  ON feed_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    reaction_type IN ('like', 'love', 'clap', 'wow') AND
    public.can_view_feed_item(feed_item_id)
  );

DROP POLICY IF EXISTS "feed_reactions_delete_own" ON feed_reactions;
CREATE POLICY "feed_reactions_delete_own"
  ON feed_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
;
