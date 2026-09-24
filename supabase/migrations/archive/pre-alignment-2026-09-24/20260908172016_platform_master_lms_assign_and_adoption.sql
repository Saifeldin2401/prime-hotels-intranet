-- Master LMS at the platform level: assign a master course to one or more
-- tenants (deploying the content first if needed) and read cross-tenant
-- adoption/progress. Reuses the existing tenant assignment engine
-- (create_scoped_training_assignment) and content deployer (deploy_master_content).

CREATE OR REPLACE FUNCTION public.platform_assign_master_content(
  p_master_id uuid,
  p_org_ids uuid[],
  p_content_type text DEFAULT 'course',
  p_scope_type text DEFAULT 'organization',
  p_target_role text DEFAULT NULL,
  p_target_user_ids uuid[] DEFAULT NULL,
  p_due_date timestamptz DEFAULT NULL,
  p_priority text DEFAULT 'normal',
  p_instructions text DEFAULT NULL,
  p_auto_deploy boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid; v_deployed uuid; v_assign jsonb;
  v_results jsonb := '[]'::jsonb; v_org_name text;
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.manage')) THEN
    RAISE EXCEPTION 'Permission denied: platform operator with tenant.manage required' USING ERRCODE = '42501';
  END IF;
  IF p_org_ids IS NULL OR array_length(p_org_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one target organization is required' USING ERRCODE = '22023';
  END IF;

  FOREACH v_org IN ARRAY p_org_ids LOOP
    SELECT name INTO v_org_name FROM public.organizations WHERE id = v_org;
    v_deployed := NULL;
    BEGIN
      SELECT target_content_id INTO v_deployed
      FROM public.master_content_deployments
      WHERE master_content_id = p_master_id AND content_type = p_content_type
        AND target_organization_id = v_org;

      IF v_deployed IS NULL THEN
        IF p_auto_deploy THEN
          v_deployed := public.deploy_master_content(p_master_id, p_content_type, v_org);
        ELSE
          v_results := v_results || jsonb_build_object('org_id', v_org, 'org_name', v_org_name,
            'assigned', false, 'error', 'not deployed to this tenant');
          CONTINUE;
        END IF;
      END IF;

      v_assign := public.create_scoped_training_assignment(
        p_course_id => v_deployed, p_scope_type => p_scope_type, p_organization_id => v_org,
        p_target_role => p_target_role, p_target_user_ids => p_target_user_ids,
        p_due_date => p_due_date, p_priority => p_priority, p_instructions => p_instructions);

      v_results := v_results || jsonb_build_object('org_id', v_org, 'org_name', v_org_name,
        'deployed_content_id', v_deployed, 'assigned', COALESCE((v_assign->>'success')::boolean, false),
        'rule_id', v_assign->>'rule_id', 'recipient_count', COALESCE((v_assign->>'recipient_count')::int, 0));
    EXCEPTION WHEN OTHERS THEN
      v_results := v_results || jsonb_build_object('org_id', v_org, 'org_name', v_org_name,
        'deployed_content_id', v_deployed, 'assigned', false, 'error', SQLERRM);
    END;
  END LOOP;

  INSERT INTO public.platform_audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'master_content.assigned', p_content_type, p_master_id::text,
          jsonb_build_object('org_ids', to_jsonb(p_org_ids), 'scope_type', p_scope_type,
                             'due_date', p_due_date, 'results', v_results));

  RETURN jsonb_build_object('master_id', p_master_id, 'results', v_results);
END;
$function$;

REVOKE ALL ON FUNCTION public.platform_assign_master_content(uuid, uuid[], text, text, text, uuid[], timestamptz, text, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.platform_assign_master_content(uuid, uuid[], text, text, text, uuid[], timestamptz, text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_master_content_adoption(p_master_id uuid, p_content_type text DEFAULT 'course')
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_rows jsonb;
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.read')) THEN
    RAISE EXCEPTION 'Permission denied: platform operator with tenant.read required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.organization_name), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT d.target_organization_id AS organization_id, o.name AS organization_name, o.lifecycle_status,
      d.target_content_id AS deployed_content_id, d.deployed_at, d.has_update_available,
      (SELECT count(*) FROM public.training_assignment_rules ar WHERE ar.training_module_id = d.target_content_id AND ar.is_active = true) AS assignment_rules,
      (SELECT count(*) FROM public.training_progress tp WHERE tp.training_id = d.target_content_id) AS learners,
      (SELECT count(*) FROM public.training_progress tp WHERE tp.training_id = d.target_content_id AND tp.status = 'in_progress') AS in_progress,
      (SELECT count(*) FROM public.training_progress tp WHERE tp.training_id = d.target_content_id AND tp.status = 'completed') AS completed,
      (SELECT round(avg(tp.score_percentage)::numeric, 1) FROM public.training_progress tp
         WHERE tp.training_id = d.target_content_id AND tp.status = 'completed' AND tp.score_percentage IS NOT NULL) AS avg_score,
      (SELECT count(*) FROM public.training_certificates tc JOIN public.training_progress tp ON tp.id = tc.training_progress_id
         WHERE tp.training_id = d.target_content_id) AS certificates_issued
    FROM public.master_content_deployments d
    JOIN public.organizations o ON o.id = d.target_organization_id
    WHERE d.master_content_id = p_master_id AND d.content_type = p_content_type
  ) r;

  RETURN jsonb_build_object('master_id', p_master_id, 'tenants', v_rows);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_master_content_adoption(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_master_content_adoption(uuid, text) TO authenticated;
