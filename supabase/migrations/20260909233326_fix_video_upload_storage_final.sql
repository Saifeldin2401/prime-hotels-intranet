INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('media', 'media', true, 524288000, ARRAY['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','video/mp4','video/webm','video/quicktime','video/x-matroska','video/ogg','video/avi','video/x-msvideo','video/3gpp','audio/mpeg','audio/wav','audio/ogg','audio/webm','audio/mp4','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain']) ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 524288000, allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('content-media', 'content-media', true, 524288000, ARRAY['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','video/mp4','video/webm','video/quicktime','video/x-matroska','video/ogg','video/avi','video/x-msvideo','video/3gpp','audio/mpeg','audio/wav','audio/ogg','audio/webm','audio/mp4','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain']) ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 524288000, allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('training-content', 'training-content', true, 524288000, ARRAY['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','video/mp4','video/webm','video/quicktime','video/x-matroska','video/ogg','video/avi','video/x-msvideo','video/3gpp','audio/mpeg','audio/wav','audio/ogg','audio/webm','audio/mp4','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain']) ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 524288000, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS content_media_select ON storage.objects;
CREATE POLICY content_media_select ON storage.objects FOR SELECT USING (bucket_id = 'content-media');

DROP POLICY IF EXISTS content_media_insert ON storage.objects;
CREATE POLICY content_media_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'content-media' AND (public.is_platform_operator() OR (storage.foldername(name))[1] = (auth.uid())::text OR ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids()))));

DROP POLICY IF EXISTS content_media_update ON storage.objects;
CREATE POLICY content_media_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'content-media' AND (public.is_platform_operator() OR owner = auth.uid() OR (storage.foldername(name))[1] = (auth.uid())::text OR ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids()))));

DROP POLICY IF EXISTS content_media_delete ON storage.objects;
CREATE POLICY content_media_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'content-media' AND (public.is_platform_operator() OR owner = auth.uid() OR (storage.foldername(name))[1] = (auth.uid())::text OR ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids()))));

DROP POLICY IF EXISTS training_content_select ON storage.objects;
CREATE POLICY training_content_select ON storage.objects FOR SELECT USING (bucket_id = 'training-content');

DROP POLICY IF EXISTS training_content_insert ON storage.objects;
CREATE POLICY training_content_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'training-content' AND (public.is_platform_operator() OR (storage.foldername(name))[1] = 'training' OR (storage.foldername(name))[1] = (auth.uid())::text OR ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids()))));

DROP POLICY IF EXISTS training_content_update ON storage.objects;
CREATE POLICY training_content_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'training-content' AND (public.is_platform_operator() OR owner = auth.uid() OR (storage.foldername(name))[1] = 'training' OR (storage.foldername(name))[1] = (auth.uid())::text OR ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids()))));

DROP POLICY IF EXISTS training_content_delete ON storage.objects;
CREATE POLICY training_content_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'training-content' AND (public.is_platform_operator() OR owner = auth.uid() OR (storage.foldername(name))[1] = 'training' OR (storage.foldername(name))[1] = (auth.uid())::text OR ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids()))));

DROP POLICY IF EXISTS "Media bucket select policy" ON storage.objects;
CREATE POLICY "Media bucket select policy" ON storage.objects FOR SELECT USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Media bucket insert policy" ON storage.objects;
CREATE POLICY "Media bucket insert policy" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.is_platform_operator() OR ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids()))));

DROP POLICY IF EXISTS "Media bucket update policy" ON storage.objects;
CREATE POLICY "Media bucket update policy" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND (owner = auth.uid() OR (storage.foldername(name))[1] = (auth.uid())::text OR public.is_platform_operator()));

DROP POLICY IF EXISTS "Media bucket delete policy" ON storage.objects;
CREATE POLICY "Media bucket delete policy" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND (owner = auth.uid() OR (storage.foldername(name))[1] = (auth.uid())::text OR public.is_platform_operator()));

DROP POLICY IF EXISTS media_assets_insert ON public.media_assets;
DROP POLICY IF EXISTS media_assets_insert_multi_tenant ON public.media_assets;
CREATE POLICY media_assets_insert ON public.media_assets FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() OR has_tenant_access(organization_id) OR public.is_platform_operator());
