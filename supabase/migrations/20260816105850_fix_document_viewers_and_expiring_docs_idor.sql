-- SEC-08 (continued): get_document_viewers_by_department exposed per-department view-count
-- analytics for any document_id to any authenticated caller (used today by
-- useDocumentAnalytics.ts, which is only ever shown for a document the viewer already has
-- analytics access to - restrict to the document's creator/owner or HR/admin, matching that
-- actual usage). get_expiring_documents has no frontend caller but is reachable directly via
-- RPC and leaked title/expiry/owner email/name across every document org-wide with no scoping
-- or role check - restrict to HR/admin (a compliance-report-shaped query, not a per-user one).
CREATE OR REPLACE FUNCTION public.get_document_viewers_by_department(p_document_id uuid)
 RETURNS TABLE(department_name text, count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(d.name,'Unknown'), COUNT(DISTINCT se.actor_id)
  FROM public.system_events se
  LEFT JOIN public.user_departments ud ON ud.user_id = se.actor_id
  LEFT JOIN public.departments d ON d.id = ud.department_id
  WHERE se.event_type = 'doc_view'
    AND se.entity_id = p_document_id
    AND EXISTS (
      SELECT 1 FROM public.documents doc
      WHERE doc.id = p_document_id
        AND (
          doc.created_by = (select auth.uid())
          OR doc.owner_id = (select auth.uid())
          OR public.is_hr_or_admin((select auth.uid()))
        )
    )
  GROUP BY d.name
  ORDER BY count DESC
  LIMIT 20;
$function$;

CREATE OR REPLACE FUNCTION public.get_expiring_documents(p_days_ahead integer DEFAULT 30)
 RETURNS TABLE(document_id uuid, title text, expires_at timestamp with time zone, days_until_expiry integer, owner_email text, owner_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT public.is_hr_or_admin((select auth.uid())) THEN
        RAISE EXCEPTION 'Unauthorized: expiring-document reports require HR/admin access';
    END IF;

    RETURN QUERY
    SELECT
        d.id AS document_id,
        d.title,
        d.expires_at,
        EXTRACT(DAY FROM d.expires_at - NOW())::INTEGER AS days_until_expiry,
        p.email AS owner_email,
        p.full_name AS owner_name
    FROM documents d
    LEFT JOIN profiles p ON d.owner_id = p.id
    WHERE d.expires_at IS NOT NULL
    AND d.expires_at <= NOW() + (p_days_ahead || ' days')::INTERVAL
    AND d.expires_at >= NOW()
    AND d.is_archived = FALSE
    ORDER BY d.expires_at ASC;
END;
$function$;
