-- Knowledge view-count + related-article behavioral tracking + announcement
-- compliance breakdown RPCs expected by knowledgeService / AnnouncementAnalytics.

CREATE OR REPLACE FUNCTION public.increment_article_view_count(doc_id uuid)
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  UPDATE public.documents SET view_count = COALESCE(view_count, 0) + 1 WHERE id = doc_id;
$$;

CREATE OR REPLACE FUNCTION public.track_related_article_click(
  p_source_doc_id uuid, p_clicked_doc_id uuid, p_user_id uuid DEFAULT NULL, p_position integer DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.analytics_events (event_name, category, user_id, "timestamp", properties)
  VALUES ('related_article_click', 'knowledge', COALESCE(p_user_id, (SELECT auth.uid())), now(),
          jsonb_build_object('source_doc_id', p_source_doc_id, 'clicked_doc_id', p_clicked_doc_id, 'position', p_position));
END;
$$;

CREATE OR REPLACE FUNCTION public.track_related_article_impression(
  p_source_doc_id uuid, p_related_doc_ids uuid[])
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.analytics_events (event_name, category, user_id, "timestamp", properties)
  VALUES ('related_article_impression', 'knowledge', (SELECT auth.uid()), now(),
          jsonb_build_object('source_doc_id', p_source_doc_id, 'related_doc_ids', to_jsonb(p_related_doc_ids)));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_announcement_compliance_breakdown(p_announcement_id uuid)
 RETURNS TABLE(scope_type text, scope_id uuid, scope_name text, total_users bigint, read_users bigint, acknowledged_users bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_any_role((SELECT auth.uid()),
       ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_manager','property_hr','department_head']::app_role[]) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 'property'::text, p.id, p.name,
    (SELECT count(*) FROM user_properties up WHERE up.property_id = p.id),
    (SELECT count(DISTINCT ar.user_id) FROM announcement_reads ar
       JOIN user_properties up ON up.user_id = ar.user_id
       WHERE ar.announcement_id = p_announcement_id AND up.property_id = p.id),
    (SELECT count(DISTINCT aa.user_id) FROM announcement_acknowledgments aa
       JOIN user_properties up ON up.user_id = aa.user_id
       WHERE aa.announcement_id = p_announcement_id AND up.property_id = p.id)
  FROM announcement_targets t
  JOIN properties p ON p.id = ANY(t.target_properties)
  WHERE t.announcement_id = p_announcement_id
  UNION ALL
  SELECT 'department'::text, d.id, d.name,
    (SELECT count(*) FROM user_departments ud WHERE ud.department_id = d.id),
    (SELECT count(DISTINCT ar.user_id) FROM announcement_reads ar
       JOIN user_departments ud ON ud.user_id = ar.user_id
       WHERE ar.announcement_id = p_announcement_id AND ud.department_id = d.id),
    (SELECT count(DISTINCT aa.user_id) FROM announcement_acknowledgments aa
       JOIN user_departments ud ON ud.user_id = aa.user_id
       WHERE aa.announcement_id = p_announcement_id AND ud.department_id = d.id)
  FROM announcement_targets t
  JOIN departments d ON d.id = ANY(t.target_departments)
  WHERE t.announcement_id = p_announcement_id;
END;
$$;
