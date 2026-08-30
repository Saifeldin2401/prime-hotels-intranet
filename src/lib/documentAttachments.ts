/**
 * Course source-document attachment.
 *
 * When a user grounds AI course generation on a document, the original file
 * must automatically become a Source Document of the finished course — part of
 * the workflow, not a manual re-upload.
 *
 *   1. Upload  -> `uploadSourceDocument(file, extractedText)` stores the file
 *      ONCE (a `documents` row + storage object, visibility = property, NOT
 *      public) and returns a `SourceDocumentRef`.
 *   2. Library pick -> `libraryDocRef(doc)` — no upload, references the existing
 *      `documents` row in place.
 *   3. After the course is saved -> `linkSourceDocuments(moduleId, refs, jobId)`
 *      writes `course_source_documents` rows. Idempotent (safe on regeneration).
 *
 * Removing a link later is a plain delete of the `course_source_documents` row
 * — the file in the central repository is never touched.
 */

import { supabase } from '@/lib/supabase'
import type { SourceDocumentRef } from '@/types/aiCourseEngine'

const SOURCE_BUCKET = 'documents'

const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : 'bin')

/**
 * Store an uploaded file once and return a reference. The `documents` row is
 * created with `visibility: 'property'` so it does NOT become learner- or
 * publicly-visible just because it grounded a course.
 */
export async function uploadSourceDocument(
  file: File,
  extractedText: string,
): Promise<SourceDocumentRef> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) throw new Error('Sign in required to attach a source document.')

  let propertyId: string | null = null
  try {
    const { data: profile } = await supabase.from('profiles').select('property_id').eq('id', uid).single()
    propertyId = profile?.property_id ?? null
  } catch { /* property optional */ }

  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(0, 120)
  const path = `course-sources/${uid}/${crypto.randomUUID()}-${safeName}`

  const { error: upErr } = await supabase.storage.from(SOURCE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (upErr) throw new Error(`Could not store the source document: ${upErr.message}`)

  // The `documents` bucket is private. Store the bare object path in `file_url`;
  // `get_secure_document_url` returns it untouched and the client mints a
  // short-lived signed URL from it (see resolveDocumentUrl in secureFileAccess).
  const { data: docRow, error: docErr } = await supabase
    .from('documents')
    .insert({
      title: file.name.replace(/\.[^/.]+$/, ''),
      description: 'Source document used to generate an AI training course.',
      content_type: 'training_document',
      content: extractedText.slice(0, 200_000),
      file_url: path,
      file_type: file.type || extOf(file.name),
      file_extension: extOf(file.name),
      file_size: file.size,
      visibility: 'property',
      status: 'APPROVED',
      property_id: propertyId,
      owner_id: uid,
      created_by: uid,
      content_data: { role: 'course_source', storage_path: path, storage_bucket: SOURCE_BUCKET },
    })
    .select('id')
    .single()

  if (docErr || !docRow) {
    // best-effort cleanup of the just-uploaded object
    void supabase.storage.from(SOURCE_BUCKET).remove([path])
    throw new Error(`Could not register the source document: ${docErr?.message || 'unknown error'}`)
  }

  return {
    documentId: docRow.id,
    originalFilename: file.name,
    fileType: file.type || extOf(file.name),
    fileSize: file.size,
    uploaded: true,
  }
}

/** Reference an existing Knowledge Base / Document Library file — no upload. */
export function libraryDocRef(doc: {
  id: string
  title?: string | null
  file_type?: string | null
  file_extension?: string | null
  file_size?: number | null
  content_type?: string | null
}): SourceDocumentRef {
  return {
    documentId: doc.id,
    originalFilename: doc.title || 'Library document',
    fileType: doc.file_type || doc.file_extension || doc.content_type || undefined,
    fileSize: doc.file_size ?? undefined,
    uploaded: false,
  }
}

/**
 * Link the given source documents to a saved course. Idempotent — a
 * regeneration that reuses the same documents re-affirms the same links
 * (ON CONFLICT DO NOTHING) rather than duplicating.
 */
export async function linkSourceDocuments(
  trainingModuleId: string,
  refs: SourceDocumentRef[],
  generationJobId?: string,
): Promise<number> {
  const seen = new Set<string>()
  const unique = refs.filter((r) => r.documentId && !seen.has(r.documentId) && seen.add(r.documentId))
  if (unique.length === 0) return 0

  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id ?? null

  const rows = unique.map((r, i) => ({
    training_module_id: trainingModuleId,
    document_id: r.documentId,
    relationship: 'source' as const,
    is_primary: r.isPrimary ?? i === 0,
    original_filename: r.originalFilename,
    file_type: r.fileType ?? null,
    file_size: r.fileSize ?? null,
    attached_by: uid,
    generation_job_id: generationJobId ?? null,
  }))

  const { error, count } = await supabase
    .from('course_source_documents')
    .upsert(rows, { onConflict: 'training_module_id,document_id', ignoreDuplicates: true, count: 'exact' })

  if (error) {
    console.warn('[documentAttachments] linkSourceDocuments failed:', error)
    return 0
  }
  return count ?? rows.length
}

export interface CourseSourceDocument {
  id: string
  documentId: string
  relationship: 'source' | 'resource'
  isPrimary: boolean
  originalFilename: string | null
  fileType: string | null
  fileSize: number | null
  attachedAt: string
  docTitle: string | null
  docVisibility: string | null
  docFileUrl: string | null
  callerCanAccess: boolean
}

/** Fetch the source/resource documents linked to a course, filtered by the
 *  caller's own RLS on `documents` (private files a learner can't read come
 *  back with `callerCanAccess: false` and no file URL). */
export async function getCourseSourceDocuments(trainingModuleId: string): Promise<CourseSourceDocument[]> {
  const { data, error } = await supabase.rpc('get_course_source_documents', {
    p_training_module_id: trainingModuleId,
  })
  if (error || !Array.isArray(data)) return []
  return (data as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    documentId: String(r.document_id),
    relationship: (r.relationship as 'source' | 'resource') ?? 'source',
    isPrimary: Boolean(r.is_primary),
    originalFilename: (r.original_filename as string) ?? null,
    fileType: (r.file_type as string) ?? null,
    fileSize: (r.file_size as number) ?? null,
    attachedAt: String(r.attached_at),
    docTitle: (r.doc_title as string) ?? null,
    docVisibility: (r.doc_visibility as string) ?? null,
    docFileUrl: (r.doc_file_url as string) ?? null,
    callerCanAccess: Boolean(r.caller_can_access),
  }))
}

/** Unlink a source document from a course. The file itself is NOT deleted. */
export async function unlinkSourceDocument(linkId: string): Promise<boolean> {
  const { error } = await supabase.from('course_source_documents').delete().eq('id', linkId)
  if (error) {
    console.warn('[documentAttachments] unlink failed:', error)
    return false
  }
  return true
}
