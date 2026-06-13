-- Deploy missing RLS policies to allow reading dynamic application configurations
-- Fixes Epic 3 (Motivational Content) infinite blank load

CREATE POLICY motivational_content_select ON public.motivational_content
    FOR SELECT USING (true);

-- Ensure News has correct read
CREATE POLICY hospitality_news_select_all ON public.hospitality_news
    FOR SELECT USING (true);

-- Ensure retention policies can be read by admins
CREATE POLICY audit_export_retention_policies_select ON public.audit_export_retention_policies
    FOR SELECT USING (true);

-- Ensure report_definitions can be read by users
CREATE POLICY report_definitions_select ON public.report_definitions
    FOR SELECT USING (true);
