create or replace function public.ai_admin_execute(
  p_action text,
  p_proposal_id uuid default null::uuid,
  p_optimizer_body jsonb default null::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'net', 'vault'
as $$
declare
  v_uid uuid := auth.uid();
  v_allowed boolean;
  v_token text;
  v_request_id bigint;
  v_status text;
  v_message text;
  v_response jsonb;
  v_attempt int := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Security Fix: Restricted roles to only high-level admins
  -- Removed 'property_manager' and 'property_hr' which were too permissive for this function
  select exists(
    select 1 from public.user_roles
    where user_id = v_uid
      and role in ('corporate_admin', 'regional_admin')
  ) into v_allowed;

  if not v_allowed then
    raise exception 'insufficient_role';
  end if;

  select decrypted_secret
    into v_token
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if v_token is null then
    raise exception 'service_role_key not set';
  end if;

  select net.http_post(
    url := 'https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/ai-admin',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_token
    ),
    body := jsonb_build_object(
      'action', p_action,
      'proposal_id', p_proposal_id,
      'optimizer_body', p_optimizer_body,
      'user_id', v_uid -- Added user_id for audit/context in Edge Function
    )
  ) into v_request_id;

  loop
    v_attempt := v_attempt + 1;
    begin
      select r.status::text, r.message, to_jsonb(r.response)
      into v_status, v_message, v_response
      from net._http_collect_response(v_request_id, true) r;
      exit;
    exception when others then
      if v_attempt >= 5 then
        return jsonb_build_object(
          'request_id', v_request_id,
          'status', 'PENDING',
          'message', 'response pending; retry later',
          'response', null
        );
      end if;
      perform pg_sleep(0.5);
    end;
  end loop;

  return jsonb_build_object(
    'request_id', v_request_id,
    'status', v_status,
    'message', v_message,
    'response', v_response
  );
end;
$$;;
