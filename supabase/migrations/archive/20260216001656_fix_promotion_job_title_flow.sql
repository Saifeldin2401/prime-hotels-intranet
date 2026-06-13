-- Fix promotion workflow compatibility with profiles.job_title FK:
-- - Ensure custom promotion titles are available in public.job_titles.
-- - Keep both submit_promotion_request overloads aligned.
-- - Harden process_due_promotions against legacy rows with custom titles.

CREATE OR REPLACE FUNCTION public.submit_promotion_request(
  p_employee_id uuid,
  p_new_role app_role,
  p_new_job_title text,
  p_new_department_id uuid,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  return public.submit_promotion_request(
    p_employee_id,
    p_new_role,
    p_new_job_title,
    p_new_department_id,
    current_date,
    p_notes
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_promotion_request(
  p_employee_id uuid,
  p_new_role app_role,
  p_new_job_title text,
  p_new_department_id uuid,
  p_effective_date date,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
    v_promotion_id uuid;
    v_request_id uuid;
    v_request_no bigint;
    v_requester_id uuid := auth.uid();
    v_old_role public.app_role;
    v_old_job_title text;
    v_old_department_id uuid;
    v_property_id uuid;
    v_hr_assignee uuid;
    v_hr_role public.app_role;
    v_routing_meta jsonb;
begin
    select p.job_title into v_old_job_title from public.profiles p where p.id = p_employee_id;
    select ur.role into v_old_role from public.user_roles ur where ur.user_id = p_employee_id limit 1;
    select ud.department_id into v_old_department_id from public.user_departments ud where ud.user_id = p_employee_id limit 1;
    select up.property_id into v_property_id from public.user_properties up where up.user_id = p_employee_id limit 1;

    if p_new_job_title is not null and length(trim(p_new_job_title)) > 0 then
      insert into public.job_titles (title, category, default_role, department_id)
      values (
        trim(p_new_job_title),
        coalesce((select d.name from public.departments d where d.id = p_new_department_id), 'General'),
        coalesce(p_new_role, 'staff'::public.app_role),
        p_new_department_id
      )
      on conflict (title) do nothing;
    end if;

    insert into public.promotions (
        employee_id, promoted_by, old_role, new_role,
        old_job_title, new_job_title, old_department_id, new_department_id,
        effective_date, notes, status
    ) values (
        p_employee_id, v_requester_id, v_old_role, p_new_role,
        v_old_job_title, p_new_job_title, v_old_department_id, p_new_department_id,
        p_effective_date, p_notes, 'pending'
    ) returning id into v_promotion_id;

    v_hr_assignee := public.find_hr_assignee(v_property_id);

    select ur.role into v_hr_role
    from public.user_roles ur
    where ur.user_id = v_hr_assignee
      and ur.role in ('property_hr', 'regional_hr', 'regional_admin', 'corporate_admin')
    order by case ur.role
      when 'property_hr' then 1
      when 'regional_hr' then 2
      when 'regional_admin' then 3
      when 'corporate_admin' then 4
      else 100
    end
    limit 1;

    if v_hr_role is null then
        v_hr_role := 'regional_hr'::public.app_role;
    end if;

    v_routing_meta := jsonb_build_object('missing_hr_assignee', v_hr_assignee is null);

    insert into public.requests (
        entity_type, entity_id, requester_id, current_assignee_id, status, metadata,
        property_id, department_id
    ) values (
        'promotion',
        v_promotion_id,
        v_requester_id,
        v_hr_assignee,
        'pending_hr_review',
        jsonb_build_object(
            'employee_name', (select p.full_name from public.profiles p where p.id = p_employee_id),
            'new_role', p_new_role,
            'effective_date', p_effective_date,
            'routing_warning', v_routing_meta
        ),
        v_property_id,
        coalesce(p_new_department_id, v_old_department_id)
    ) returning id, request_no into v_request_id, v_request_no;

    insert into public.request_steps (
        request_id, step_order, assignee_id, assignee_role, status
    ) values (
        v_request_id, 1, v_hr_assignee, v_hr_role, 'pending'
    );

    if v_hr_assignee is null then
      insert into public.notifications (user_id, type, title, message, metadata)
      select ur.user_id,
             'escalation_alert',
             'Routing issue: Missing HR assignee',
             format('Promotion request #%s requires HR assignment.', v_request_no),
             jsonb_build_object('request_id', v_request_id, 'entity_type', 'promotion', 'reason', 'missing_hr_assignee')
      from public.user_roles ur
      where ur.role in ('regional_admin', 'regional_hr', 'corporate_admin');
    end if;

    return jsonb_build_object('success', true, 'request_id', v_request_id, 'request_no', v_request_no);
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_due_promotions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_promo record;
  v_count integer := 0;
begin
  for v_promo in
    select *
    from public.promotions
    where status = 'pending'
      and effective_date <= current_date
  loop
    if v_promo.new_job_title is not null and length(trim(v_promo.new_job_title)) > 0 then
      insert into public.job_titles (title, category, default_role, department_id)
      values (
        trim(v_promo.new_job_title),
        coalesce((select d.name from public.departments d where d.id = v_promo.new_department_id), 'General'),
        coalesce(v_promo.new_role, 'staff'::public.app_role),
        v_promo.new_department_id
      )
      on conflict (title) do nothing;
    end if;

    update public.profiles
    set job_title = v_promo.new_job_title,
        updated_at = now()
    where id = v_promo.employee_id;

    if v_promo.new_role is not null then
      delete from public.user_roles
      where user_id = v_promo.employee_id;

      insert into public.user_roles (user_id, role)
      values (v_promo.employee_id, v_promo.new_role)
      on conflict (user_id, role) do nothing;
    end if;

    delete from public.user_departments
    where user_id = v_promo.employee_id;

    if v_promo.new_department_id is not null then
      insert into public.user_departments (user_id, department_id)
      values (v_promo.employee_id, v_promo.new_department_id)
      on conflict (user_id, department_id) do nothing;
    end if;

    update public.promotions
    set status = 'completed',
        updated_at = now()
    where id = v_promo.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$;;
