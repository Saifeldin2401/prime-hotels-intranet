CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text, entity_id uuid, property_id uuid, department_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}', ip_address inet, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_events_type_created ON public.system_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_actor_created ON public.system_events (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_entity ON public.system_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_system_events_created ON public.system_events (created_at DESC);

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_events_admin_read" ON public.system_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.role IN ('corporate_admin','regional_admin','regional_hr')));
CREATE POLICY "system_events_own_read" ON public.system_events FOR SELECT TO authenticated USING (actor_id=auth.uid());
CREATE POLICY "system_events_insert_own" ON public.system_events FOR INSERT TO authenticated WITH CHECK (actor_id=auth.uid() OR actor_id IS NULL);

INSERT INTO public.system_events (id, event_type, actor_id, entity_type, entity_id, ip_address, user_agent, metadata, created_at)
SELECT id,'audit',user_id,entity_type,entity_id,CASE WHEN ip_address IS NOT NULL THEN ip_address::inet ELSE NULL END,user_agent,jsonb_build_object('action',action,'details',COALESCE(details,'{}'::jsonb)),COALESCE(created_at,now()) FROM public.audit_logs ON CONFLICT (id) DO NOTHING;

INSERT INTO public.system_events (id, event_type, actor_id, entity_type, entity_id, ip_address, user_agent, metadata, created_at)
SELECT id,'security',user_id,table_name,record_id,ip_address,user_agent,jsonb_build_object('security_event_type',event_type,'user_role',user_role,'action',action,'old_data',COALESCE(old_data,'{}'),'new_data',COALESCE(new_data,'{}'),'severity',severity,'extra',COALESCE(metadata,'{}')),COALESCE(created_at,now()) FROM public.security_audit_logs ON CONFLICT (id) DO NOTHING;

INSERT INTO public.system_events (id, event_type, actor_id, entity_type, entity_id, metadata, created_at)
SELECT id,'pii_access',actor_id,'user',target_user_id,jsonb_build_object('fields_accessed',fields_accessed,'reason',reason),COALESCE(created_at,now()) FROM public.pii_access_logs ON CONFLICT (id) DO NOTHING;

INSERT INTO public.system_events (id, event_type, actor_id, entity_type, entity_id, property_id, department_id, metadata, created_at)
SELECT id,'activity',user_id,target_type,target_id,property_id,department_id,jsonb_build_object('action_type',action_type,'target_name',target_name,'extra',COALESCE(metadata,'{}')),COALESCE(created_at,now()) FROM public.activity_log ON CONFLICT (id) DO NOTHING;

INSERT INTO public.system_events (id, event_type, actor_id, entity_type, entity_id, ip_address, user_agent, metadata, created_at)
SELECT id,'sop_access',user_id,'sop',document_id,CASE WHEN ip_address IS NOT NULL THEN ip_address::inet ELSE NULL END,user_agent,jsonb_build_object('action',action,'version_id',version_id,'extra',COALESCE(metadata,'{}')),created_at FROM public.sop_access_logs ON CONFLICT (id) DO NOTHING;

INSERT INTO public.system_events (id, event_type, actor_id, entity_type, entity_id, metadata, created_at)
SELECT id,'sop_view',user_id,'sop',document_id,jsonb_build_object('view_duration_seconds',view_duration_seconds,'scroll_depth_percent',scroll_depth_percent),viewed_at FROM public.sop_view_history ON CONFLICT (id) DO NOTHING;

INSERT INTO public.system_events (id, event_type, actor_id, entity_type, entity_id, ip_address, user_agent, metadata, created_at)
SELECT id,'media_access',accessed_by,'media',media_asset_id,ip_address,user_agent,jsonb_build_object('access_type',access_type,'request_id',request_id,'extra',COALESCE(metadata,'{}')),accessed_at FROM public.media_access_logs ON CONFLICT (id) DO NOTHING;

INSERT INTO public.system_events (id, event_type, actor_id, entity_type, entity_id, metadata, created_at)
SELECT id,'doc_view',user_id,'document',document_id,'{}',viewed_at FROM public.document_views ON CONFLICT (id) DO NOTHING;

INSERT INTO public.system_events (id, event_type, actor_id, entity_type, entity_id, ip_address, metadata, created_at)
SELECT id,'doc_download',user_id,'document',document_id,ip_address,'{}',downloaded_at FROM public.document_download_logs ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE VIEW public.audit_logs_v WITH (security_invoker=true) AS SELECT id,(metadata->>'action')::text AS action,entity_type,entity_id,actor_id AS user_id,ip_address::text AS ip_address,user_agent,(metadata->'details') AS details,created_at FROM public.system_events WHERE event_type='audit';
CREATE OR REPLACE VIEW public.security_audit_logs_v WITH (security_invoker=true) AS SELECT id,(metadata->>'security_event_type')::text AS event_type,actor_id AS user_id,(metadata->>'user_role')::text AS user_role,ip_address,user_agent,entity_type AS table_name,entity_id AS record_id,(metadata->>'action')::text AS action,(metadata->'old_data') AS old_data,(metadata->'new_data') AS new_data,(metadata->>'severity')::text AS severity,(metadata->'extra') AS metadata,created_at FROM public.system_events WHERE event_type='security';
CREATE OR REPLACE VIEW public.pii_access_logs_v WITH (security_invoker=true) AS SELECT id,actor_id,entity_id AS target_user_id,ARRAY(SELECT jsonb_array_elements_text(metadata->'fields_accessed')) AS fields_accessed,(metadata->>'reason')::text AS reason,created_at FROM public.system_events WHERE event_type='pii_access';
CREATE OR REPLACE VIEW public.activity_log_v WITH (security_invoker=true) AS SELECT id,actor_id AS user_id,(metadata->>'action_type')::text AS action_type,entity_type AS target_type,entity_id AS target_id,(metadata->>'target_name')::text AS target_name,(metadata->'extra') AS metadata,property_id,department_id,created_at FROM public.system_events WHERE event_type='activity';
CREATE OR REPLACE VIEW public.sop_access_logs_v WITH (security_invoker=true) AS SELECT id,entity_id AS document_id,(metadata->>'version_id')::uuid AS version_id,actor_id AS user_id,(metadata->>'action')::text AS action,ip_address::text AS ip_address,user_agent,(metadata->'extra') AS metadata,created_at FROM public.system_events WHERE event_type='sop_access';
CREATE OR REPLACE VIEW public.sop_view_history_v WITH (security_invoker=true) AS SELECT id,actor_id AS user_id,entity_id AS document_id,(metadata->>'view_duration_seconds')::integer AS view_duration_seconds,(metadata->>'scroll_depth_percent')::integer AS scroll_depth_percent,created_at AS viewed_at FROM public.system_events WHERE event_type='sop_view';
CREATE OR REPLACE VIEW public.media_access_logs_v WITH (security_invoker=true) AS SELECT id,entity_id AS media_asset_id,actor_id AS accessed_by,created_at AS accessed_at,(metadata->>'access_type')::text AS access_type,ip_address,user_agent,(metadata->>'request_id')::text AS request_id,(metadata->'extra') AS metadata FROM public.system_events WHERE event_type='media_access';
CREATE OR REPLACE VIEW public.document_views_v WITH (security_invoker=true) AS SELECT id,entity_id AS document_id,actor_id AS user_id,created_at AS viewed_at FROM public.system_events WHERE event_type='doc_view';
CREATE OR REPLACE VIEW public.document_download_logs_v WITH (security_invoker=true) AS SELECT id,entity_id AS document_id,actor_id AS user_id,created_at AS downloaded_at,ip_address FROM public.system_events WHERE event_type='doc_download';

DROP FUNCTION IF EXISTS public.log_audit_event(text,text,uuid,jsonb,jsonb);
DROP FUNCTION IF EXISTS public.log_audit_event_trigger();
DROP FUNCTION IF EXISTS public.log_security_event(text,text,uuid,text,jsonb,jsonb,text,jsonb);
DROP FUNCTION IF EXISTS public.log_activity(text,text,uuid,text,jsonb);
DROP FUNCTION IF EXISTS public.log_document_view(uuid,uuid);
DROP FUNCTION IF EXISTS public.log_document_download(uuid,uuid,inet);
DROP FUNCTION IF EXISTS public.log_pii_access(uuid,text[],text,text,uuid,text);
DROP FUNCTION IF EXISTS public.cleanup_old_audit_logs();
DROP FUNCTION IF EXISTS public.cleanup_old_pii_access_logs();
DROP FUNCTION IF EXISTS public.get_document_viewers_by_department(uuid);

CREATE OR REPLACE FUNCTION public.log_audit_event(p_action text, p_entity_type text, p_entity_id uuid, p_old_values jsonb DEFAULT NULL, p_new_values jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN INSERT INTO public.system_events(event_type,actor_id,entity_type,entity_id,metadata) VALUES('audit',auth.uid(),p_entity_type,p_entity_id,jsonb_build_object('action',p_action,'details',jsonb_build_object('old',p_old_values,'new',p_new_values))); END; $$;

CREATE FUNCTION public.log_audit_event_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor_id uuid:=auth.uid(); v_action text; v_changes jsonb; v_record_id uuid;
BEGIN
  IF TG_OP='INSERT' THEN v_action:='create'; v_changes:=to_jsonb(NEW); v_record_id:=NEW.id;
  ELSIF TG_OP='UPDATE' THEN v_action:='update'; v_changes:=jsonb_build_object('old',to_jsonb(OLD),'new',to_jsonb(NEW)); v_record_id:=NEW.id;
  ELSIF TG_OP='DELETE' THEN v_action:='delete'; v_changes:=to_jsonb(OLD); v_record_id:=OLD.id; END IF;
  IF v_record_id IS NOT NULL THEN INSERT INTO public.system_events(event_type,actor_id,entity_type,entity_id,metadata) VALUES('audit',v_actor_id,TG_TABLE_NAME,v_record_id,jsonb_build_object('action',v_action,'details',v_changes)); END IF;
  RETURN NULL; END; $$;

CREATE FUNCTION public.log_security_event(p_event_type text, p_table_name text DEFAULT NULL, p_record_id uuid DEFAULT NULL, p_action text DEFAULT NULL, p_old_data jsonb DEFAULT NULL, p_new_data jsonb DEFAULT NULL, p_severity text DEFAULT 'info', p_metadata jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN INSERT INTO public.system_events(event_type,actor_id,entity_type,entity_id,ip_address,user_agent,metadata) VALUES('security',auth.uid(),p_table_name,p_record_id,NULL,NULL,jsonb_build_object('security_event_type',p_event_type,'user_role',(SELECT role::text FROM public.user_roles WHERE user_id=auth.uid() LIMIT 1),'action',p_action,'old_data',COALESCE(p_old_data,'{}'),'new_data',COALESCE(p_new_data,'{}'),'severity',p_severity,'extra',COALESCE(p_metadata,'{}'))); END; $$;

CREATE FUNCTION public.log_activity(action text, target_type text DEFAULT NULL, target_id uuid DEFAULT NULL, target_name text DEFAULT NULL, meta jsonb DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE new_id uuid; user_property uuid; user_dept uuid;
BEGIN
  SELECT property_id INTO user_property FROM public.user_properties WHERE user_id=auth.uid() LIMIT 1;
  SELECT department_id INTO user_dept FROM public.user_departments WHERE user_id=auth.uid() LIMIT 1;
  INSERT INTO public.system_events(event_type,actor_id,entity_type,entity_id,property_id,department_id,metadata) VALUES('activity',auth.uid(),target_type,target_id,user_property,user_dept,jsonb_build_object('action_type',action,'target_name',target_name,'extra',COALESCE(meta,'{}'))) RETURNING id INTO new_id;
  RETURN new_id; END; $$;

CREATE FUNCTION public.log_document_view(p_document_id uuid, p_user_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_view_id uuid; BEGIN INSERT INTO public.system_events(event_type,actor_id,entity_type,entity_id,metadata) VALUES('doc_view',p_user_id,'document',p_document_id,'{}') RETURNING id INTO v_view_id; RETURN v_view_id; END; $$;

CREATE FUNCTION public.log_document_download(p_document_id uuid, p_user_id uuid, p_ip_address inet DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_log_id uuid; BEGIN INSERT INTO public.system_events(event_type,actor_id,entity_type,entity_id,ip_address,metadata) VALUES('doc_download',p_user_id,'document',p_document_id,p_ip_address,'{}') RETURNING id INTO v_log_id; PERFORM public.increment_document_download_count(p_document_id); RETURN v_log_id; END; $$;

CREATE FUNCTION public.log_pii_access(p_target_user_id uuid, p_fields_accessed text[], p_reason text DEFAULT NULL, p_resource_type text DEFAULT 'profile', p_resource_id uuid DEFAULT NULL, p_access_type text DEFAULT 'read')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN INSERT INTO public.system_events(event_type,actor_id,entity_type,entity_id,metadata) VALUES('pii_access',auth.uid(),'user',p_target_user_id,jsonb_build_object('fields_accessed',to_jsonb(p_fields_accessed),'reason',p_reason,'resource_type',p_resource_type,'resource_id',p_resource_id,'access_type',p_access_type)); END; $$;

CREATE FUNCTION public.cleanup_old_audit_logs() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN DELETE FROM public.system_events WHERE event_type='audit' AND created_at<now()-INTERVAL '3 years'; END; $$;
CREATE FUNCTION public.cleanup_old_pii_access_logs() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN DELETE FROM public.system_events WHERE event_type='pii_access' AND created_at<now()-INTERVAL '7 years'; END; $$;

CREATE FUNCTION public.get_document_viewers_by_department(p_document_id uuid) RETURNS TABLE(department_name text, count bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(d.name,'Unknown'),COUNT(DISTINCT se.actor_id) FROM public.system_events se LEFT JOIN public.user_departments ud ON ud.user_id=se.actor_id LEFT JOIN public.departments d ON d.id=ud.department_id WHERE se.event_type='doc_view' AND se.entity_id=p_document_id GROUP BY d.name ORDER BY count DESC LIMIT 20; $$;

DROP TABLE IF EXISTS public.pii_access_logs CASCADE;
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.sop_access_logs CASCADE;
DROP TABLE IF EXISTS public.sop_view_history CASCADE;
DROP TABLE IF EXISTS public.media_access_logs CASCADE;
DROP TABLE IF EXISTS public.document_views CASCADE;
DROP TABLE IF EXISTS public.document_download_logs CASCADE;
