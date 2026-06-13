begin;

create or replace function ai_admin_execute(
  p_action text,
  p_proposal_id uuid default null,
  p_optimizer_body jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  v_uid uuid := auth.uid();
  v_allowed boolean;
  v_token text;
  v_request_id bigint;
  v_status text;
  v_message text;
  v_response text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select exists(
    select 1 from public.user_roles
    where user_id = v_uid
      and role in ('corporate_admin','regional_admin','regional_hr','property_manager','property_hr')
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
    url:='https://dhbfaclkfysqwfppuxxa.supabase.co/functions/v1/ai-admin',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_token
    ),
    body:=jsonb_build_object(
      'action', p_action,
      'proposal_id', p_proposal_id,
      'optimizer_body', p_optimizer_body
    )
  ) into v_request_id;

  select status, message, response
    into v_status, v_message, v_response
  from net._http_collect_response(v_request_id, true);

  return jsonb_build_object(
    'request_id', v_request_id,
    'status', v_status,
    'message', v_message,
    'response', v_response
  );
end;
$$;

grant execute on function ai_admin_execute(text, uuid, jsonb) to authenticated;

commit;
