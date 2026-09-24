-- Skills get awarded correctly on module completion (skillsService.awardModuleSkills ->
-- award_module_skills -> user_skills), but nothing ever reports on them, so "who in
-- Housekeeping lacks Chemical Safety" was unanswerable. This RPC returns a full
-- users x skills cross join (has_skill / proficiency / verified) so the frontend can pivot it
-- into a people x skills grid, scoped by department/property, admin/manager only.

CREATE OR REPLACE FUNCTION public.get_skills_matrix(
    p_department_id uuid DEFAULT NULL,
    p_property_id uuid DEFAULT NULL
)
RETURNS TABLE(
    user_id uuid,
    user_name text,
    department_name text,
    skill_id uuid,
    skill_name text,
    skill_category text,
    proficiency_level integer,
    verified boolean,
    has_skill boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH scoped_users AS (
        SELECT DISTINCT ON (p.id)
            p.id,
            p.full_name,
            d.name AS department_name
        FROM public.profiles p
        LEFT JOIN public.user_departments ud ON ud.user_id = p.id
        LEFT JOIN public.departments d ON d.id = ud.department_id
        WHERE p.is_active = true
          AND (p_department_id IS NULL OR ud.department_id = p_department_id)
          AND (p_property_id IS NULL OR EXISTS (
              SELECT 1 FROM public.user_properties up WHERE up.user_id = p.id AND up.property_id = p_property_id))
          AND EXISTS (
              SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = auth.uid()
                AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
          )
        ORDER BY p.id, ud.department_id NULLS LAST
    )
    SELECT
        su.id,
        su.full_name,
        su.department_name,
        s.id,
        s.name,
        s.category,
        us.proficiency_level,
        us.verified,
        (us.id IS NOT NULL) AS has_skill
    FROM scoped_users su
    CROSS JOIN public.skills s
    LEFT JOIN public.user_skills us ON us.user_id = su.id AND us.skill_id = s.id
    ORDER BY su.full_name, s.category, s.name;
$$;

COMMENT ON FUNCTION public.get_skills_matrix IS
    'Users x skills matrix (admin/manager only) for identifying skill coverage and gaps by department/property.';

REVOKE EXECUTE ON FUNCTION public.get_skills_matrix(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_skills_matrix(uuid, uuid) TO authenticated;
