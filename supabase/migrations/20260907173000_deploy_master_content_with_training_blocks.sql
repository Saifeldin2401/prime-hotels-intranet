-- Migration: 20260907173000_deploy_master_content_with_training_blocks.sql
-- Description: Updates deploy_master_content RPC to clone training_modules and child content blocks from documents,
--              and backfills master course c0000000-0000-0000-0000-000000000001 into training_modules.

-- 1. Ensure master course c0000000-0000-0000-0000-000000000001 is in training_modules
INSERT INTO public.training_modules (
  id,
  title,
  description,
  category,
  difficulty_level,
  estimated_duration_minutes,
  passing_score_percentage,
  certificate_enabled,
  allow_retake,
  max_attempts,
  status,
  organization_id,
  scope_type,
  is_master_template,
  blueprint,
  created_at,
  updated_at,
  is_deleted
)
SELECT
  'c0000000-0000-0000-0000-000000000001',
  title,
  description,
  COALESCE(category, 'hospitality'),
  COALESCE(difficulty_level, 'intermediate'),
  COALESCE(estimated_duration_minutes, 45),
  COALESCE(passing_score_percentage, 80),
  COALESCE(certificate_enabled, true),
  COALESCE(allow_retake, true),
  COALESCE(max_attempts, 3),
  'published',
  'e0000000-0000-0000-0000-000000000001',
  'global',
  true,
  COALESCE(blueprint, '{"version": 1, "sections": []}'::jsonb),
  now(),
  now(),
  false
FROM public.courses
WHERE id = 'c0000000-0000-0000-0000-000000000001'
ON CONFLICT (id) DO UPDATE SET
  is_master_template = true,
  scope_type = 'global';

-- 2. Update deploy_master_content function to clone training_modules and child blocks
CREATE OR REPLACE FUNCTION public.deploy_master_content(
  p_master_id uuid,
  p_content_type text,
  p_org_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_id uuid := gen_random_uuid();
  v_exists boolean;
  v_from_tm boolean := false;
BEGIN
  -- 1. Capability check
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.manage')) THEN
    RAISE EXCEPTION 'Permission denied: caller must be a platform operator with tenant.manage capability'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Verify target organization
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id AND is_active = true) THEN
    RAISE EXCEPTION 'Target organization % does not exist or is inactive', p_org_id;
  END IF;

  -- 3. Clone content by type
  IF p_content_type = 'course' OR p_content_type = 'training_module' THEN
    -- Check if it exists in training_modules
    SELECT EXISTS (
      SELECT 1 FROM public.training_modules WHERE id = p_master_id AND is_master_template = true
    ) INTO v_from_tm;

    IF v_from_tm THEN
      -- Clone training module
      INSERT INTO public.training_modules (
        id, title, description, category, difficulty_level, estimated_duration_minutes, validity_period_days,
        certificate_enabled, passing_score_percentage, allow_retake, max_attempts, auto_advance, show_feedback,
        randomize_questions, show_answers, time_limit_minutes, audience, content_language, template_id, status,
        organization_id, scope_type, is_master_template, master_source_id, blueprint, created_by, created_at, updated_at, is_deleted
      )
      SELECT
        v_new_id, title, description, category, difficulty_level, estimated_duration_minutes, validity_period_days,
        certificate_enabled, passing_score_percentage, allow_retake, max_attempts, auto_advance, show_feedback,
        randomize_questions, show_answers, time_limit_minutes, audience, content_language, template_id, status,
        p_org_id, 'organization', false, p_master_id, blueprint, auth.uid(), now(), now(), false
      FROM public.training_modules WHERE id = p_master_id;

      -- Clone all lesson blocks from documents (content_type='training_block')
      INSERT INTO public.documents (
        id, training_module_id, content_type, block_type, block_order, title, content, content_ar, content_url,
        content_data, is_mandatory, duration_seconds, points, organization_id, scope_type, is_master_template,
        master_source_id, created_by, created_at, updated_at, is_deleted
      )
      SELECT
        gen_random_uuid(), v_new_id, 'training_block', block_type, block_order, title, content, content_ar, content_url,
        content_data, is_mandatory, duration_seconds, points, p_org_id, 'organization', false,
        id, auth.uid(), now(), now(), false
      FROM public.documents
      WHERE content_type = 'training_block' AND training_module_id = p_master_id AND COALESCE(is_deleted, false) = false;

    ELSIF EXISTS (SELECT 1 FROM public.courses WHERE id = p_master_id AND is_master_template = true) THEN
      -- Fallback clone courses
      INSERT INTO public.courses (
        id, title, slug, description, summary, status, difficulty_level, category, content_language,
        estimated_duration_minutes, passing_score_percentage, certificate_enabled, allow_retake, max_attempts,
        blueprint, quality_score, organization_id, scope_type, is_master_template, master_source_id,
        created_by, updated_by, created_at, updated_at, is_deleted
      )
      SELECT
        v_new_id, title, COALESCE(slug, 'course') || '-' || substr(p_org_id::text, 1, 8), description, summary, status, difficulty_level, category, content_language,
        estimated_duration_minutes, passing_score_percentage, certificate_enabled, allow_retake, max_attempts,
        blueprint, quality_score, p_org_id, 'organization', false, p_master_id,
        auth.uid(), auth.uid(), now(), now(), false
      FROM public.courses WHERE id = p_master_id;

      INSERT INTO public.course_modules (course_id, title, description, position, legacy_section_key, created_at, updated_at)
      SELECT v_new_id, title, description, position, legacy_section_key, now(), now()
      FROM public.course_modules WHERE course_id = p_master_id;

      -- Also create corresponding training_modules row so it's accessible in training hub
      INSERT INTO public.training_modules (
        id, title, description, category, difficulty_level, estimated_duration_minutes,
        certificate_enabled, passing_score_percentage, allow_retake, max_attempts, status,
        organization_id, scope_type, is_master_template, master_source_id, blueprint,
        created_by, created_at, updated_at, is_deleted
      )
      SELECT
        v_new_id, title, description, category, difficulty_level, estimated_duration_minutes,
        certificate_enabled, passing_score_percentage, allow_retake, max_attempts, status,
        p_org_id, 'organization', false, p_master_id, blueprint,
        auth.uid(), now(), now(), false
      FROM public.courses WHERE id = p_master_id
      ON CONFLICT (id) DO NOTHING;
    ELSE
      RAISE EXCEPTION 'Master course % not found in training modules or courses', p_master_id;
    END IF;

  ELSIF p_content_type = 'document' THEN
    IF NOT EXISTS (SELECT 1 FROM public.documents WHERE id = p_master_id AND is_master_template = true) THEN
      RAISE EXCEPTION 'Master document % not found', p_master_id;
    END IF;

    INSERT INTO public.documents (
      id, title, description, file_url, visibility, role, status, requires_acknowledgment,
      created_by, current_version, created_at, updated_at, summary, summary_ar, is_deleted,
      file_size, category_id, content, content_type, checklist_items, faq_items, video_url,
      images, featured, estimated_read_time, title_ar, description_ar, content_ar,
      confidentiality_level, file_extension, watermark_text, file_type, sop_code,
      review_frequency_months, requires_quiz, passing_score, quiz_enabled, priority,
      compliance_level, lifecycle_status, organization_id, scope_type, is_master_template, master_source_id
    )
    SELECT
      v_new_id, title, description, file_url, visibility, role, status, requires_acknowledgment,
      auth.uid(), current_version, now(), now(), summary, summary_ar, false,
      file_size, category_id, content, content_type, checklist_items, faq_items, video_url,
      images, featured, estimated_read_time, title_ar, description_ar, content_ar,
      confidentiality_level, file_extension, watermark_text, file_type, sop_code,
      review_frequency_months, requires_quiz, passing_score, quiz_enabled, priority,
      compliance_level, lifecycle_status, p_org_id, 'organization', false, p_master_id
    FROM public.documents WHERE id = p_master_id;

  ELSIF p_content_type = 'assessment' THEN
    IF NOT EXISTS (SELECT 1 FROM public.assessments WHERE id = p_master_id AND is_master_template = true) THEN
      RAISE EXCEPTION 'Master assessment % not found', p_master_id;
    END IF;

    INSERT INTO public.assessments (
      id, title, description, assessment_type, placement, placement_ref_id, time_limit_minutes,
      max_attempts, passing_score, randomization, question_bank_id, pool_draw_count,
      show_feedback, status, created_by, created_at, updated_at, is_deleted,
      organization_id, scope_type, is_master_template, master_source_id
    )
    SELECT
      v_new_id, title, description, assessment_type, placement, placement_ref_id, time_limit_minutes,
      max_attempts, passing_score, randomization, question_bank_id, pool_draw_count,
      show_feedback, status, auth.uid(), now(), now(), false,
      p_org_id, 'organization', false, p_master_id
    FROM public.assessments WHERE id = p_master_id;

    INSERT INTO public.assessment_questions (assessment_id, question_id, display_order, points_override, is_required, created_at)
    SELECT v_new_id, question_id, display_order, points_override, is_required, now()
    FROM public.assessment_questions WHERE assessment_id = p_master_id;

  ELSIF p_content_type = 'question_bank' THEN
    IF NOT EXISTS (SELECT 1 FROM public.question_banks WHERE id = p_master_id AND is_master_template = true) THEN
      RAISE EXCEPTION 'Master question bank % not found', p_master_id;
    END IF;

    INSERT INTO public.question_banks (
      id, name, name_ar, description, tags, is_active, created_by, created_at, updated_at,
      organization_id, is_master_template, master_source_id
    )
    SELECT
      v_new_id, name, name_ar, description, tags, is_active, auth.uid(), now(), now(),
      p_org_id, false, p_master_id
    FROM public.question_banks WHERE id = p_master_id;

  ELSE
    RAISE EXCEPTION 'Unsupported content type %', p_content_type;
  END IF;

  -- 4. Record deployment tracking
  INSERT INTO public.master_content_deployments (
    content_type, master_content_id, target_organization_id, target_content_id,
    deployed_version, current_master_version, has_update_available, deployed_by, deployed_at, last_synced_at
  ) VALUES (
    p_content_type, p_master_id, p_org_id, v_new_id,
    1, 1, false, auth.uid(), now(), now()
  )
  ON CONFLICT (content_type, master_content_id, target_organization_id)
  DO UPDATE SET
    target_content_id = EXCLUDED.target_content_id,
    deployed_version = EXCLUDED.deployed_version,
    current_master_version = EXCLUDED.current_master_version,
    has_update_available = false,
    deployed_by = EXCLUDED.deployed_by,
    deployed_at = now(),
    last_synced_at = now();

  -- 5. Audit log
  INSERT INTO public.platform_audit_logs (
    actor_id, target_organization_id, action, resource_type, resource_id, metadata, created_at
  ) VALUES (
    auth.uid(), p_org_id, 'master_content.deployed', p_content_type, v_new_id::text,
    jsonb_build_object('master_content_id', p_master_id, 'target_content_id', v_new_id, 'content_type', p_content_type),
    now()
  );

  RETURN v_new_id;
END;
$$;
