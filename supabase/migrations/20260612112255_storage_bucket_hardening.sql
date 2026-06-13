-- =============================================================================
-- MIGRATION: storage_bucket_hardening
-- =============================================================================
-- NOTICE — resumes and referral-cvs merge
-- -----------------------------------------
-- The `resumes` and `referral-cvs` buckets serve the same purpose (candidate
-- CV/résumé storage). They should be consolidated into a single bucket.
-- This merge is NOT performed here because it requires a data-movement step
-- (copying existing objects and updating all foreign-key / path references in
-- the application). A dedicated migration should handle that once a cutover
-- plan is agreed upon.
-- =============================================================================

-- Set file_size_limit and allowed_mime_types for all buckets that currently
-- have nulls. Buckets that already have values (employee-documents, media,
-- payslips, expense-receipts, reports-exports, requests) are left untouched.

UPDATE storage.buckets
SET
  file_size_limit    = 5242880,  -- 5 MB
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'avatars';

UPDATE storage.buckets
SET
  file_size_limit    = 52428800,  -- 50 MB
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
WHERE id = 'documents';

UPDATE storage.buckets
SET
  file_size_limit    = 20971520,  -- 20 MB
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf']
WHERE id = 'maintenance-attachments';

UPDATE storage.buckets
SET
  file_size_limit    = 52428800,  -- 50 MB
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE id = 'sop-attachments';

UPDATE storage.buckets
SET
  file_size_limit    = 20971520,  -- 20 MB
  allowed_mime_types = ARRAY['image/jpeg','image/png','application/pdf','image/webp']
WHERE id = 'task-attachments';

UPDATE storage.buckets
SET
  file_size_limit    = 10485760,  -- 10 MB
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE id = 'referral-cvs';

UPDATE storage.buckets
SET
  file_size_limit    = 10485760,  -- 10 MB
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE id = 'resumes';

UPDATE storage.buckets
SET
  file_size_limit    = 524288000,  -- 500 MB
  allowed_mime_types = ARRAY[
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp4',
    'application/pdf',
    'image/jpeg',
    'image/png'
  ]
WHERE id = 'training-content';

-- =============================================================================
-- Drop the excessively broad public listing access on the avatars bucket.
--
-- The `avatars` bucket was created with `public = true`, which grants the
-- Storage API anonymous/unauthenticated role the ability to list and read
-- every avatar file without any access check. This leaks internal employee
-- profile picture URLs to unauthenticated callers.
--
-- Fix: mark the bucket private. Authenticated reads are covered by signed URLs
-- generated server-side. The existing per-user DELETE and UPDATE policies on
-- storage.objects remain in place. A SELECT policy scoped to authenticated
-- users should be added separately if direct URL access is required.
-- =============================================================================
UPDATE storage.buckets
SET public = false
WHERE id = 'avatars';
