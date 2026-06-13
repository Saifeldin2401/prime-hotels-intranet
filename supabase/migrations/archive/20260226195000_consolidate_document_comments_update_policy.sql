-- Consolidate duplicate permissive UPDATE policies on document_comments.
-- Keeps prior intent: own-comment edits OR resolver/owner/admin/property-manager updates.

BEGIN;

DROP POLICY IF EXISTS document_comments_resolve ON public.document_comments;
DROP POLICY IF EXISTS document_comments_update_own ON public.document_comments;
DROP POLICY IF EXISTS document_comments_update_access ON public.document_comments;

CREATE POLICY document_comments_update_access
ON public.document_comments
FOR UPDATE
TO public
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM documents d
    WHERE d.id = document_comments.document_id
      AND (
        d.created_by = (SELECT auth.uid())
        OR d.owner_id = (SELECT auth.uid())
        OR has_role((SELECT auth.uid()), 'regional_admin'::text)
        OR (
          has_role((SELECT auth.uid()), 'property_manager'::text)
          AND has_property_access((SELECT auth.uid()), d.property_id)
        )
      )
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM documents d
    WHERE d.id = document_comments.document_id
      AND (
        d.created_by = (SELECT auth.uid())
        OR d.owner_id = (SELECT auth.uid())
        OR has_role((SELECT auth.uid()), 'regional_admin'::text)
        OR (
          has_role((SELECT auth.uid()), 'property_manager'::text)
          AND has_property_access((SELECT auth.uid()), d.property_id)
        )
      )
  )
);

COMMIT;
