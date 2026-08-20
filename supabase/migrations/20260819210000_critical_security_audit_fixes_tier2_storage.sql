-- Tier 2: storage.objects policies scoped by bucket_id alone, with no
-- owner/entity check, on buckets holding real or realistically-imminent
-- sensitive content. Path conventions below were confirmed against the
-- actual upload call sites, not assumed.

-- ============================================================================
-- documents bucket: table-level RLS on public.documents has an 8-branch
-- visibility policy; storage.objects for the same bucket had none at all
-- (bucket_id = 'documents' only). Verified live: a staff session could list
-- and download all 42 objects vs. only 6 of the 21 documents with a
-- file_url that the table policy actually grants them. file_url is stored
-- in two formats live (bare path, and a full /object/public/ URL that
-- doesn't even work against a private bucket) - match both.
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated to read documents bucket objects" ON storage.objects;
CREATE POLICY "Allow authenticated to read documents bucket objects" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents' AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE (d.file_url = storage.objects.name OR d.file_url LIKE '%/' || storage.objects.name)
        AND public.can_view_document(d.id)
    )
  );

-- Training content is authored by a small set of roles and read by
-- everyone via the documents table policy above; write access should not
-- be granted to any authenticated user on folder name alone.
DROP POLICY IF EXISTS "Allow authenticated deletes to training folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to training folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to training folder" ON storage.objects;

CREATE POLICY "Allow authenticated uploads to training folder" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND (storage.foldername(name))[1] = 'training'
    AND has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','regional_hr','property_manager']::public.app_role[])
  );

CREATE POLICY "Allow authenticated updates to training folder" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'documents' AND (storage.foldername(name))[1] = 'training'
    AND has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','regional_hr','property_manager']::public.app_role[])
  )
  WITH CHECK (
    bucket_id = 'documents' AND (storage.foldername(name))[1] = 'training'
    AND has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','regional_hr','property_manager']::public.app_role[])
  );

CREATE POLICY "Allow authenticated deletes to training folder" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'documents' AND (storage.foldername(name))[1] = 'training'
    AND has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','regional_hr','property_manager']::public.app_role[])
  );

-- ============================================================================
-- payslips: path is `${employee_id}/${year}-${month}-...}`, uploaded by HR
-- on the employee's behalf (PayslipsAdmin.tsx), read by the employee
-- themselves (MyPayslips.tsx). Only HR/admin roles legitimately upload.
-- ============================================================================
DROP POLICY IF EXISTS payslips_objects_select ON storage.objects;
CREATE POLICY payslips_objects_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payslips' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','regional_hr','property_hr','property_manager']::public.app_role[])
    )
  );

DROP POLICY IF EXISTS payslips_objects_insert ON storage.objects;
CREATE POLICY payslips_objects_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payslips'
    AND has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','regional_hr','property_hr','property_manager']::public.app_role[])
  );

-- ============================================================================
-- employee-documents: path is `${ownerId}/${ts}.${ext}` (ownerId may be an
-- HR-selected target employee, per useEmployeeDocuments.ts). Owner-delete
-- policy (whoever uploaded can retract) is left as-is - separate, smaller
-- concern from the select/insert bucket-wide grant.
-- ============================================================================
DROP POLICY IF EXISTS employee_documents_authenticated_select ON storage.objects;
CREATE POLICY employee_documents_authenticated_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'employee-documents' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR public.can_view_employee_document((storage.foldername(name))[1]::uuid)
    )
  );

DROP POLICY IF EXISTS employee_documents_authenticated_insert ON storage.objects;
CREATE POLICY employee_documents_authenticated_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'employee-documents' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR public.can_manage_employee_document((storage.foldername(name))[1]::uuid)
    )
  );

-- ============================================================================
-- expense-receipts: path is `${claim_id}/${ts}-${filename}` (useExpenseClaims.ts).
-- ============================================================================
DROP POLICY IF EXISTS expense_receipts_select ON storage.objects;
CREATE POLICY expense_receipts_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'expense-receipts' AND EXISTS (
      SELECT 1 FROM public.expense_claims ec
      WHERE ec.id::text = (storage.foldername(name))[1]
        AND (ec.requester_id = (SELECT auth.uid()) OR is_hr_or_admin((SELECT auth.uid())))
    )
  );

DROP POLICY IF EXISTS expense_receipts_insert ON storage.objects;
CREATE POLICY expense_receipts_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'expense-receipts' AND EXISTS (
      SELECT 1 FROM public.expense_claims ec
      WHERE ec.id::text = (storage.foldername(name))[1] AND ec.requester_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- maintenance-attachments: path is `${ticket_id}/${ts}-${filename}`
-- (useMaintenanceTickets.ts). Mirror the ticket's own SELECT scoping.
-- ============================================================================
DROP POLICY IF EXISTS maintenance_attachments_select ON storage.objects;
CREATE POLICY maintenance_attachments_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'maintenance-attachments' AND EXISTS (
      SELECT 1 FROM public.maintenance_tickets mt
      WHERE mt.id::text = (storage.foldername(name))[1]
        AND (mt.is_deleted IS NOT TRUE)
        AND (has_property_access((SELECT auth.uid()), mt.property_id) OR mt.reported_by_id = (SELECT auth.uid()) OR mt.assigned_to_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS maintenance_attachments_insert ON storage.objects;
CREATE POLICY maintenance_attachments_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'maintenance-attachments' AND EXISTS (
      SELECT 1 FROM public.maintenance_tickets mt
      WHERE mt.id::text = (storage.foldername(name))[1]
        AND (mt.is_deleted IS NOT TRUE)
        AND (has_property_access((SELECT auth.uid()), mt.property_id) OR mt.reported_by_id = (SELECT auth.uid()) OR mt.assigned_to_id = (SELECT auth.uid()))
    )
  );

-- ============================================================================
-- announcement-attachments: path is a flat `announcements/${ts}-${uuid}.ext`
-- folder (no per-entity scoping possible from the path). Announcements are
-- broadly-visible content by design, so leave SELECT as-is; restrict who
-- may upload to roles that can actually author announcements. Owner-delete
-- policy already exists and is unaffected.
-- ============================================================================
DROP POLICY IF EXISTS announcement_attachments_authenticated_insert ON storage.objects;
CREATE POLICY announcement_attachments_authenticated_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'announcement-attachments'
    AND has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','regional_hr','property_manager','property_hr','department_head']::public.app_role[])
  );

-- ============================================================================
-- resumes / task-attachments / sop-attachments / reports-exports: no client
-- upload call site found anywhere in src/ for these buckets (reports-exports
-- is populated by the scheduled-reports edge function under service_role,
-- which is unaffected by these policies). Gate to admin/HR-ish roles rather
-- than leaving them open to any authenticated user for content that, if
-- ever populated, would be resumes/exported-report/attachment data.
-- ============================================================================
DROP POLICY IF EXISTS resumes_select ON storage.objects;
CREATE POLICY resumes_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resumes'
    AND has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','regional_hr','property_hr','property_manager']::public.app_role[])
  );

DROP POLICY IF EXISTS reports_exports_select ON storage.objects;
CREATE POLICY reports_exports_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reports-exports'
    AND has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','regional_hr','property_manager']::public.app_role[])
  );

DROP POLICY IF EXISTS task_attachments_storage_select ON storage.objects;
CREATE POLICY task_attachments_storage_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS sop_attachments_select ON storage.objects;
CREATE POLICY sop_attachments_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'sop-attachments'
    AND has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','regional_hr','property_manager','property_hr','department_head']::public.app_role[])
  );
